import { generateAutismFriendlyPrompt, extractSceneInfo, generateCharacterDescription } from './autismFriendlyPrompts.js';
import { generateTextToImageComplete, generateImageToImageComplete } from './liblibai.js';
import { 
  generateMasterCharacterImage, 
  generateStoryIllustrationWithMaster,
  getStandardCharacterDefinition,
  getEnhancedCharacterDefinition
} from './characterConsistency.js';

// 获取后端API地址 - 使用相对路径
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 付费账户专用的智能请求队列
class PayloadRateLimiter {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.lastRequestTime = 0;
    this.minInterval = 100; // 付费账户：最小间隔100ms
  }

  async addRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { requestFn, resolve, reject } = this.queue.shift();
      
      try {
        // 智能间隔控制
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minInterval) {
          await new Promise(r => setTimeout(r, this.minInterval - timeSinceLastRequest));
        }
        
        const result = await requestFn();
        this.lastRequestTime = Date.now();
        resolve(result);
        
        // 付费账户：短暂间隔
        await new Promise(r => setTimeout(r, 50));
        
      } catch (error) {
        reject(error);
      }
    }
    
    this.processing = false;
  }
}

// 创建全局的请求限制器
const rateLimiter = new PayloadRateLimiter();

/**
 * 通过后端代理调用OpenAI Chat API（使用智能队列）
 * @param {Object} options - 调用选项
 * @returns {Promise<Object>} API响应
 */
async function callOpenAIChat(options, retryCount = 0, maxRetries = 6) {
  // 使用智能请求队列（付费账户优化）
  return rateLimiter.addRequest(async () => {
    try {
      // 智能延迟策略：第一次重试立即进行，后续递增
      if (retryCount > 0) {
        // 付费账户优化的重试延迟：0, 3, 6, 12, 24, 45秒
        const delayTimes = [0, 3000, 6000, 12000, 24000, 45000];
        const delay = delayTimes[retryCount - 1] || 60000;
        
        if (delay > 0) {
          console.log(`⏱️ 智能重试延迟${delay/1000}秒...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      const response = await fetch(`${API_BASE_URL}/openai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        
        // 处理429错误（频率限制）
        if (response.status === 429) {
          console.warn(`⚠️ OpenAI API频率限制 (付费账户)，第${retryCount + 1}次重试...`);
          
          if (retryCount < maxRetries) {
            // 付费账户的智能重试策略
            // 等待时间：5, 10, 20, 40, 80, 120秒
            const waitTimes = [5, 10, 20, 40, 80, 120];
            const waitTime = (waitTimes[retryCount] || 120) * 1000;
            
            console.log(`🔄 付费账户快速重试，等待${waitTime/1000}秒...`);
            console.log(`📊 重试进度: ${retryCount + 1}/${maxRetries}`);
            
            // 检查是否是特定的频率限制类型
            const errorMessage = error.error || '';
            if (errorMessage.includes('rate_limit_exceeded')) {
              console.log(`🎯 检测到速率限制，应用优化策略...`);
            }
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return callOpenAIChat(options, retryCount + 1, maxRetries);
          } else {
            throw new Error(`OpenAI API频率限制：付费账户经过${maxRetries}次快速重试仍失败。

🔍 付费账户频率限制分析：
• 即使是付费账户，短时间内大量请求仍可能触发限制
• 当前限制：GPT-4 (500 RPM), GPT-4o (5000 RPM), DALL-E 3 (7 images/min)
• 系统已进行${maxRetries}次智能重试（总耗时约3-4分钟）

💡 建议解决方案：
1. 立即重试：通常在2-3分钟后恢复正常
2. 检查并发：确保没有多个标签页同时生成
3. 升级限制：联系OpenAI申请更高的频率限制
4. 分批处理：考虑分批生成多页内容

🚀 付费账户优势：
• 更高的基础频率限制
• 更快的恢复速度
• 优先处理权

请稍等2-3分钟后重试，或联系技术支持。`);
          }
        }
        
        // 处理其他错误
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ OpenAI API调用成功 (付费账户, ${retryCount}次重试)`);
      return await response.json();
    } catch (error) {
      console.error('OpenAI Chat API调用失败:', error);
      
      // 网络错误的快速重试（付费账户优化）
      if (retryCount < maxRetries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
        console.warn(`🌐 网络错误，付费账户快速重试 ${retryCount + 1}/${maxRetries}...`);
        const waitTime = Math.min(5000 * (retryCount + 1), 30000); // 5, 10, 15, 20, 25, 30秒
        console.log(`⏱️ 网络重试等待${waitTime/1000}秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callOpenAIChat(options, retryCount + 1, maxRetries);
      }
      
      throw error;
    }
  });
}

/**
 * 通过后端代理调用DALL-E API
 * @param {Object} options - 调用选项
 * @returns {Promise<Object>} API响应
 */
async function callOpenAIImages(options) {
  try {
    const response = await fetch(`${API_BASE_URL}/openai/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('DALL-E API代理调用失败:', error);
    throw error;
  }
}

/**
 * 使用GPT-4o优化角色描述为图像生成关键词
 * @param {string} userDescription - 用户输入的角色描述
 * @param {Object} basicInfo - 基础角色信息（年龄、性别、身份）
 * @returns {Promise<string>} 优化后的角色描述关键词
 */
export async function optimizeCharacterDescription(userDescription, basicInfo = {}) {
  try {
    const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
    
    const systemPrompt = `你是一个专业的角色设计专家，擅长创造简洁但完整的角色形象描述。

**核心任务**：
- 分析用户描述，补充关键视觉元素（发型、眼色、服装、表情）
- 确保角色特征协调统一，符合儿童绘本审美
- 根据用户输入的语言，用相同语言回复

**语言适应规则**：
- 如果用户用简体中文输入，你必须用简体中文回复
- 如果用户用繁体中文输入，你必须用繁体中文回复  
- 如果用户用英语输入，你必须用英语回复
- 保持与用户输入相同的语言风格

**长度约束**：
- 中文描述：控制在50个汉字以内
- 英文描述：控制在50个英文单词以内
- 优先包含最重要的视觉特征：外貌、服装、表情
- 去掉冗余修饰词，保持简洁有力

**描述顺序**：
1. 基本外貌（年龄、性别、发型、眼色）
2. 核心服装（1-2件主要衣物）
3. 关键表情或姿态
4. 1个突出特征（如眼镜、帽子等）

请用与用户输入相同的语言创造角色描述！`;

    const genderText = gender === 'boy' ? '男孩' : gender === 'girl' ? '女孩' : '性别不限';
    const identityText = identity === 'human' ? '人类儿童' : '动物角色';

    const userPrompt = `请帮我完善以下角色的形象描述：

**角色基础信息：**
- 年龄：${age}岁${identityText}
- 性别：${genderText}

**用户提供的描述：**
"${userDescription}"

**要求：**
1. 根据用户输入的语言，用相同语言回复
2. 补充缺失的关键视觉特征
3. 创造完整但简洁的角色形象
4. 中文控制在50个汉字以内，英文控制在50个单词以内

**返回格式示例：**

如果用户用中文输入，返回中文：
"7岁男孩，卷曲棕发，圆框眼镜，蓝色毛衣，灿烂笑容，活泼表情"

如果用户用英文输入，返回英文：
"7-year-old boy with curly brown hair, round glasses, blue sweater, bright smile, playful expression"

如果用户用繁体中文输入，返回繁体中文：
"7歲男孩，卷曲棕髮，圓框眼鏡，藍色毛衣，燦爛笑容，活潑表情"

請严格按照用户输入的语言来回复！`;

    const response = await callOpenAIChat({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const optimizedDescription = response.choices[0].message.content.trim();
    console.log('角色形象智能完善完成:', { 
      original: userDescription, 
      enhanced: optimizedDescription 
    });
    
    return optimizedDescription;
    
  } catch (error) {
    console.error('角色形象完善失败:', error);
    // 如果优化失败，返回原始描述的简单处理版本
    const fallbackDescription = `cute ${basicInfo.identity === 'animal' ? 'animal' : 'child'} character, ${userDescription}, children's book style, friendly appearance, detailed features`;
    return fallbackDescription;
  }
}

/**
 * 将角色描述转换为英文（用于图像生成）
 * @param {string} description - 任何语言的角色描述
 * @param {Object} basicInfo - 基础角色信息
 * @returns {Promise<string>} 英文角色描述
 */
export async function translateDescriptionToEnglish(description, basicInfo = {}) {
  try {
    // 如果描述已经是英文，直接返回
    if (/^[a-zA-Z0-9\s,.-]+$/.test(description)) {
      console.log('🔤 描述已经是英文，直接使用:', description);
      return description;
    }
    
    const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
    
    const systemPrompt = `你是一个专业的翻译专家，专门将各种语言的角色描述翻译成适合AI图像生成的英文关键词。

**核心任务**：
- 将用户的角色描述准确翻译为英文
- 保持所有关键视觉元素不变
- 使用适合图像生成的词汇
- 确保描述简洁但完整

**要求**：
- 必须返回英文描述
- 保持原有的所有视觉细节
- 控制在50个英文单词以内
- 使用准确的英文图像生成关键词`;

    const userPrompt = `请将以下角色描述翻译为英文：

角色信息：
- 年龄：${age}岁
- 性别：${gender === 'boy' ? 'male' : gender === 'girl' ? 'female' : 'any'}
- 身份：${identity}

需要翻译的描述：
"${description}"

要求：
1. 准确翻译所有视觉特征
2. 保持描述的完整性
3. 使用适合图像生成的英文词汇
4. 控制在50个单词以内

请直接返回英文翻译，不需要解释：`;

    const response = await callOpenAIChat({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.3, // 降低随机性，确保翻译准确
      max_tokens: 150
    });

    const englishDescription = response.choices[0].message.content.trim();
    console.log('🔤 描述翻译为英文:', { 
      original: description, 
      english: englishDescription 
    });
    
    return englishDescription;
    
  } catch (error) {
    console.error('描述翻译失败:', error);
    // 如果翻译失败，返回原始描述
    return description;
  }
}

/**
 * 生成绘本故事内容
 * @param {Object} params - 生成参数
 * @param {Object} params.character - 角色信息
 * @param {Object} params.story - 故事设置
 * @param {Object} params.content - 内容设置
 * @param {Function} params.onProgress - 进度回调函数
 * @param {string} params.imageEngine - 图像生成引擎 ('dalle3' | 'liblibai')
 * @param {boolean} params.useCharacterConsistency - 是否使用角色一致性功能
 * @returns {Promise<Object>} 生成的绘本内容
 */
export async function generatePictureBook({ character, story, content, onProgress, imageEngine = 'dalle3', useCharacterConsistency = true }) {
  try {
    // 构建提示词
    const prompt = buildPrompt({ character, story, content });

    console.log('发送到OpenAI的提示词:', prompt);
    console.log('使用的图像生成引擎:', imageEngine);
    console.log('教学内容模式:', content.mode || 'unknown');
    console.log('最终教学主题:', content.educationalTopic || content.finalTopic);
    onProgress && onProgress('正在构建故事提示词...', 10);
    
    const response = await callOpenAIChat({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `你是一位顶级的自闭症儿童教育专家和专业绘本创作师。你的任务是创作既生动有趣又适合自闭症儿童的高质量教学绘本。

**核心创作理念**：
- 语言简单但故事生动：用最简单的词汇讲述最有趣的故事
- 深度教育意义：每个故事都要有明确的教学价值，适合课堂使用
- 完美图文对应：插画描述必须精确反映故事内容，确保图文一致
- 绝对角色一致性：主角外貌特征在整个故事中不得有任何变化

**特殊教育专业要求**：
1. 语言特点：简单直白但富有感染力，避免抽象概念
2. 情节设计：生动有趣且贴近生活，有适度戏剧张力但结局积极
3. 教育价值：深刻的品德教育和技能培养，适合老师教学讨论
4. 角色塑造：鲜明的人物形象，行为示范明确具体
5. 场景描述：详细准确的英文插画描述，确保视觉呈现完美

**质量标准**：
- 故事要让孩子想反复阅读，但理解无障碍
- 教育内容要深入浅出，老师容易展开教学
- 每页插画描述要让插画师能创作出与故事完美匹配的图像
- 角色外貌描述要精确一致，确保整本书的视觉连贯性

请严格按照用户的详细要求创作，确保生成高质量的专业教学绘本内容。`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 3000
    });

    const generatedContent = response.choices[0].message.content;
    console.log('OpenAI返回的原始内容:', generatedContent);
    onProgress && onProgress('故事内容生成完成，正在解析...', 50);
    
    // 解析返回的JSON
    let parsedContent;
    try {
      parsedContent = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('JSON解析错误:', parseError);
      // 如果JSON解析失败，尝试提取JSON部分
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析OpenAI返回的内容');
      }
    }

    // 为每页生成插画
    console.log('开始生成插画，使用引擎:', imageEngine, '角色一致性:', useCharacterConsistency);
    onProgress && onProgress('正在生成插画...', 60);

    const imageResult = await generateImagesForPages(
      parsedContent.pages,
      character,
      imageEngine,
      (current, total) => {
        const imageProgress = 60 + (current / total) * 35; // 60-95%
        onProgress && onProgress(`正在生成第${current}/${total}页插画...`, imageProgress);
      },
      useCharacterConsistency
    );

    onProgress && onProgress('生成完成！', 100);

    return {
      ...parsedContent,
      pages: imageResult.pages,
      imageEngine: imageEngine, // 记录使用的图像引擎
      characterConsistency: useCharacterConsistency, // 记录是否使用角色一致性
      characterDefinition: imageResult.characterDefinition || null,
      masterImageUrl: imageResult.masterImageUrl || null, // 添加主角形象图URL
      contentMode: content.mode, // 记录内容生成模式
      finalEducationalTopic: content.educationalTopic || content.finalTopic // 记录最终教学主题
    };
    
  } catch (error) {
    console.error('生成绘本失败:', error);
    
    // 向用户报告具体的错误情况
    onProgress && onProgress('生成失败，正在分析错误原因...', 95);
    
    // 分析错误类型并给出精确指导
    if (error.message.includes('频率限制') || error.message.includes('429')) {
      console.log('📋 错误分析: OpenAI API频率限制');
      onProgress && onProgress('❌ API频率限制：建议等待15-30分钟后重试', 100);
      
      // 抛出错误，让上层处理，不使用fallback
      throw new Error(`OpenAI API频率限制：${error.message}

🔧 解决建议：
1. 等待15-30分钟后再次尝试
2. 检查OpenAI账户的API使用配额
3. 如果是付费账户，可能需要升级配额限制
4. 错开使用高峰时段

💡 系统已进行8次智能重试，但API服务器持续返回频率限制。这是OpenAI服务端的限制，需要等待后重试。`);
      
    } else if (error.message.includes('配额') || error.message.includes('quota')) {
      console.log('📋 错误分析: OpenAI API配额不足');
      onProgress && onProgress('❌ API配额不足：请充值OpenAI账户', 100);
      
      throw new Error(`OpenAI API配额不足：${error.message}

🔧 解决建议：
1. 登录OpenAI官网检查账户余额
2. 为OpenAI账户充值
3. 检查当前的API使用计划
4. 考虑升级到更高的使用计划

💳 这通常意味着您的OpenAI账户余额已用完，需要充值后才能继续使用。`);
      
    } else if (error.message.includes('网络') || error.message.includes('fetch')) {
      console.log('📋 错误分析: 网络连接问题');
      onProgress && onProgress('❌ 网络连接异常：请检查网络后重试', 100);
      
      throw new Error(`网络连接异常：${error.message}

🔧 解决建议：
1. 检查您的网络连接状态
2. 尝试刷新页面后重试
3. 如果使用VPN，尝试切换节点
4. 检查防火墙设置是否阻止了API访问

🌐 系统无法连接到OpenAI服务器，请确保网络连接正常。`);
      
    } else {
      console.log('📋 错误分析: 其他API错误');
      onProgress && onProgress('❌ API调用失败：请稍后重试', 100);
      
      throw new Error(`OpenAI API调用失败：${error.message}

🔧 解决建议：
1. 稍等几分钟后重试
2. 检查OpenAI服务状态：https://status.openai.com/
3. 确认API密钥配置正确
4. 如果问题持续，请联系技术支持

⚠️ 这是一个未预期的API错误，建议稍后重试或检查服务状态。`);
    }
  }
}

/**
 * 构建发送给OpenAI的提示词
 */
function buildPrompt({ character, story, content }) {
  const storyTypes = {
    'adventure': '冒险故事',
    'growth': '成长故事',
    'friendship': '友情故事',
    'life-skills': '生活技能'
  };

  // 优先使用传递的educationalTopic，然后是finalTopic，最后是默认值
  const educationalTopic = content.educationalTopic || content.finalTopic || '学会分享与合作';

  // 标准化角色描述
  const characterDescription = generateCharacterDescription(character);
  const characterName = character.name || '主角';

  // 根据内容模式生成不同的提示词
  let contentModeNote = '';
  if (content.mode === 'custom') {
    contentModeNote = '\n\n**特别注意**：本故事基于用户的自定义教学内容需求创作，请确保紧密围绕指定的教学主题展开，深入体现其教育价值。';
  } else if (content.mode === 'selected') {
    contentModeNote = '\n\n**特别注意**：本故事基于用户选择的特定主题创作，请确保故事内容充分展现该主题的核心要素和教育意义。';
  } else {
    contentModeNote = '\n\n**特别注意**：本故事采用智能随机生成模式，请确保内容丰富有趣，充满教育价值。';
  }

  return `请为自闭症儿童创作一个既生动有趣又具有深度教育意义的绘本故事。这个故事将被用于特殊教育教学，需要平衡趣味性和教育性。

【角色设定】
- 主角：${characterName}
- 外貌特征：${characterDescription}
- 年龄：${character.age}岁
- ⚠️ 角色一致性要求：在所有页面中，${characterName}的外貌、服装、特征必须完全一致，不得有任何变化

【故事框架】
- 故事类型：${storyTypes[story.type] || '成长故事'}
- 故事页数：${story.pages}页
- 核心教育主题：${educationalTopic}
- 内容生成模式：${content.mode || 'random'} 模式${contentModeNote}

【创作要求 - 针对自闭症儿童特殊需求】

📚 **语言特点**：
1. 每页2-3句话，每句不超过15个字
2. 使用简单、直接、具体的表达
3. 避免抽象概念、比喻、讽刺或复杂隐喻
4. 重复使用相同句型："${characterName}看到..."、"${characterName}感到..."、"${characterName}决定..."
5. 多用动作词和感受词，少用形容词

🎭 **情节设计**：
1. 故事要生动有趣，有明确的起承转合
2. 包含具体的生活场景和真实的互动情况
3. 每页都要有具体的行为示范，便于孩子模仿学习
4. 情节要有适度的戏剧张力，但结局必须积极正面
5. 融入日常生活元素，让孩子有代入感

📖 **教育价值**：
1. 紧密围绕"${educationalTopic}"展开，每页都要体现这个主题
2. 提供明确的道德指导和行为示范
3. 包含情绪识别和表达的学习内容
4. 展示解决问题的具体步骤和方法
5. 适合老师在课堂上使用，有讨论和扩展的空间

🎨 **插画描述要求（极其重要）**：
1. 每页的英文场景描述必须精确对应故事内容
2. 场景描述要包含：${characterName}的具体动作、表情、所在环境、互动对象
3. 确保${characterName}在每页中的外貌特征完全一致：${characterDescription}
4. 场景要生动具体，能够准确传达故事情感和教育主题
5. 环境描述要详细，包括背景、物品、其他角色等

【故事结构指导】
- 第1页：介绍${characterName}和基本情境
- 第2-3页：遇到与"${educationalTopic}"相关的挑战或情况
- 第4-5页：${characterName}的思考过程和尝试解决
- 第6页及以后：积极的结果和明确的教育总结

【特殊创作指导】
1. 故事要富有想象力和创意，但情节必须贴近儿童现实生活
2. 每页要有足够的视觉元素供插画师创作
3. 对话要自然真实，符合${character.age}岁儿童的语言特点
4. 情感表达要明确具体，避免含糊不清的描述
5. 行为示范要积极正面，具有可操作性

⚠️ **严格要求**：
- 角色外貌特征在整个故事中绝对不能改变
- 每页插画描述必须与故事内容完美匹配
- 教育主题必须贯穿始终，不能偏离
- 语言必须简单直白，但情节要生动有趣

请创作一个完整的绘本故事，严格按照以下JSON格式返回：

{
  "title": "引人入胜但简洁的故事标题",
  "pages": [
    {
      "pageNumber": 1,
      "title": "简短有趣的页面标题",
      "content": "生动但简洁的故事内容（2-3句话，用词简单但情节有趣）",
      "sceneDescription": "详细的英文插画描述，必须精确对应故事内容，包含${characterName}的一致外貌特征、具体动作、表情、环境、其他角色等"
    },
    {
      "pageNumber": 2,
      "title": "第二页标题",
      "content": "第二页内容...",
      "sceneDescription": "第二页插画描述（确保${characterName}外貌与第一页完全一致）"
    }
    // ... 继续到第${story.pages}页
  ],
  "educationalMessage": "深度的教育意义总结，适合老师教学使用",
  "teachingTips": "给老师的教学建议和讨论要点"
}

记住：故事要生动有趣但语言简单，教育意义要深刻，插画要完美对应内容，角色外貌要绝对一致！`;
}

/**
 * 为绘本页面生成插画
 * @param {Array} pages - 绘本页面数组
 * @param {Object} character - 角色信息
 * @param {string} imageEngine - 图像生成引擎 ('dalle3' | 'liblibai')
 * @param {Function} onProgress - 进度回调函数
 * @param {boolean} useCharacterConsistency - 是否使用角色一致性功能
 * @returns {Promise<Array>} 包含插画的页面数组
 */
async function generateImagesForPages(pages, character, imageEngine, onProgress, useCharacterConsistency = false) {
  const pagesWithImages = [];
  let masterCharacterData = null;
  let characterDefinition = null;

  // 获取角色定义（无论是否使用角色一致性）
  if (useCharacterConsistency) {
    characterDefinition = await getEnhancedCharacterDefinition(character, character.strategy);
  } else {
    characterDefinition = getStandardCharacterDefinition(character);
  }

  // 如果使用角色一致性且使用LiblibAI引擎，先生成主角标准形象
  if (useCharacterConsistency && imageEngine === 'liblibai') {
    console.log('🎨 启用角色一致性模式，先生成主角标准形象...');
    try {
      masterCharacterData = await generateMasterCharacterImage(
        characterDefinition,
        (status, progress) => {
          console.log(`主角生成: ${status} - ${progress}%`);
        }
      );
      
      if (masterCharacterData.success) {
        console.log('✅ 主角标准形象生成成功:', masterCharacterData.masterImageUrl);
      } else {
        console.log('⚠️ 主角生成失败，将使用传统模式');
        useCharacterConsistency = false;
      }
    } catch (error) {
      console.error('❌ 主角生成失败:', error);
      useCharacterConsistency = false;
    }
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`正在为第${page.pageNumber}页生成插画，使用${imageEngine}${useCharacterConsistency ? '（角色一致性模式）' : ''}...`);

    // 更新进度
    onProgress && onProgress(i + 1, pages.length);

    try {
      let imageUrl = null;
      let imagePrompt = null;

      if (imageEngine === 'liblibai') {
        if (useCharacterConsistency && masterCharacterData && masterCharacterData.success) {
          // 使用角色一致性模式：基于主角形象生成插画
          console.log('🖼️ 使用角色一致性模式生成插画...');
          const illustrationResult = await generateStoryIllustrationWithMaster(
            page.sceneDescription,
            masterCharacterData.masterImageUrl,
            masterCharacterData.characterDefinition,
            (status, progress) => {
              console.log(`插画生成进度: ${status} - ${progress}%`);
            }
          );
          
          if (illustrationResult.success) {
            imageUrl = illustrationResult.imageUrl;
            imagePrompt = illustrationResult.prompt;
          } else {
            console.log('⚠️ 角色一致性插画生成失败，使用传统模式');
            // 降级到传统模式
            imagePrompt = buildLiblibImagePrompt(page, character);
            const liblibResult = await generateTextToImageComplete(imagePrompt);
            if (liblibResult.status === 'success' && liblibResult.imageUrl) {
              imageUrl = liblibResult.imageUrl;
            }
          }
        } else {
          // 传统LiblibAI文生图模式
          imagePrompt = buildLiblibImagePrompt(page, character);
          console.log(`LiblibAI图像提示词:`, imagePrompt);
          
          const liblibResult = await generateTextToImageComplete(
            imagePrompt,
            (status, progress) => {
              console.log(`LiblibAI生成进度: ${status} - ${progress}%`);
            },
            {
              aspectRatio: "3:4",
              guidance_scale: 3.5,
              imgCount: 1,
              model: "pro"
            }
          );

          console.log(`第${page.pageNumber}页LiblibAI生成结果:`, liblibResult);
          
          if (liblibResult && liblibResult.status === 'success' && liblibResult.imageUrl) {
            imageUrl = liblibResult.imageUrl;
            console.log(`第${page.pageNumber}页LiblibAI插画生成成功:`, imageUrl);
          } else if (liblibResult && liblibResult.images && liblibResult.images.length > 0) {
            // 备用检查：直接从images数组获取
            imageUrl = liblibResult.images[0].imageUrl || liblibResult.images[0];
            console.log(`第${page.pageNumber}页LiblibAI插画生成成功（备用方式）:`, imageUrl);
          } else {
            console.warn(`第${page.pageNumber}页LiblibAI插画生成失败，使用备用方案`, liblibResult);
          }
        }
      } else {
        // 使用DALL-E 3生成图像
        imagePrompt = buildImagePrompt(page, character);
        console.log(`DALL-E 3图像提示词:`, imagePrompt);

        const imageResponse = await callOpenAIImages({
          prompt: imagePrompt,
          size: "1024x1024",
          quality: "standard",
          n: 1
        });

        imageUrl = imageResponse.data[0].url;
        console.log(`第${page.pageNumber}页DALL-E 3插画生成成功:`, imageUrl);
      }

      const pageWithImage = {
        ...page,
        imageUrl: imageUrl,
        imagePrompt: imagePrompt,
        imageEngine: imageEngine,
        characterConsistency: useCharacterConsistency,
        masterImageUrl: masterCharacterData?.masterImageUrl || null,
        fallbackEmoji: ['🌈', '🦋', '🌸', '🌺', '🍀', '⭐', '🌙', '☀️', '🌻', '🎈'][page.pageNumber % 10]
      };
      
      console.log(`✅ 第${page.pageNumber}页完成，图像URL:`, imageUrl);
      pagesWithImages.push(pageWithImage);

    } catch (error) {
      console.error(`第${page.pageNumber}页插画生成失败:`, error);

      // 生成失败时使用备用emoji
      pagesWithImages.push({
        ...page,
        imageUrl: null,
        imagePrompt: null,
        imageEngine: imageEngine,
        characterConsistency: useCharacterConsistency,
        fallbackEmoji: ['🌈', '🦋', '🌸', '🌺', '🍀', '⭐', '🌙', '☀️', '🌻', '🎈'][page.pageNumber % 10],
        imageError: error.message
      });
    }
  }

  const result = {
    pages: pagesWithImages,
    masterImageUrl: masterCharacterData?.masterImageUrl || null,
    characterDefinition: characterDefinition
  };
  
  console.log(`🎉 所有插画生成完成！共${pagesWithImages.length}页，主角形象:`, result.masterImageUrl);
  console.log('📚 最终页面数据:', pagesWithImages.map(p => ({
    pageNumber: p.pageNumber,
    hasImage: !!p.imageUrl,
    imageUrl: p.imageUrl?.substring(0, 50) + '...'
  })));
  
  return result;
}

/**
 * 构建DALL-E 3图像生成提示词
 * @param {Object} page - 页面内容
 * @param {Object} character - 角色信息
 * @returns {string} 图像生成提示词
 */
function buildImagePrompt(page, character) {
  // 从场景描述中提取情绪、动作和环境信息
  const sceneInfo = extractSceneInfo(page.sceneDescription || '');
  
  // 获取角色的详细描述，确保一致性
  const characterDescription = generateCharacterDescription(character);
  const characterName = character.name || '主角';

  // 构建强调角色一致性和内容对应的提示词
  const consistencyPrompt = `IMPORTANT: Character consistency - The character ${characterName} must have exactly these features throughout: ${characterDescription}. `;
  
  // 构建内容对应的提示词
  const contentPrompt = `Scene must precisely match this story content: "${page.content || ''}". `;
  
  // 使用专业的自闭症友好关键词模块生成基础提示词
  const basePrompt = generateAutismFriendlyPrompt({
    character: character,
    sceneDescription: page.sceneDescription || 'A simple scene',
    emotion: sceneInfo.emotion,
    action: sceneInfo.action,
    environment: sceneInfo.environment
  });

  // 组合最终提示词，强调一致性和对应性
  const finalPrompt = `${consistencyPrompt}${contentPrompt}${basePrompt}. Children's book illustration style, clear character features, consistent appearance, educational scene, appropriate for autism-friendly design.`;

  console.log(`第${page.pageNumber}页DALL-E 3提示词:`, finalPrompt);
  return finalPrompt;
}

/**
 * 构建LiblibAI图像生成提示词
 * @param {Object} page - 页面数据
 * @param {Object} character - 角色信息
 * @returns {string} 图像生成提示词
 */
function buildLiblibImagePrompt(page, character) {
  const characterDescription = generateCharacterDescription(character);
  const characterName = character.name || '主角';
  const sceneDescription = page.sceneDescription || `${characterName} in a children's book scene`;
  
  // 构建强调角色一致性的描述
  const consistencyNote = `CONSISTENT CHARACTER: ${characterName} with ${characterDescription}`;
  
  // 构建故事内容对应的描述
  const storyContent = page.content ? `, showing exactly this scene: ${page.content}` : '';
  
  // LiblibAI适用的完整提示词格式，强调一致性和准确性
  const prompt = `Children's book illustration, ${consistencyNote}, ${sceneDescription}${storyContent}, cute cartoon style, simple 2D art, bright colors, child-friendly, educational, wholesome, appropriate for children aged 3-7, clean background, storybook style, character must look exactly the same in every image, precise scene matching, autism-friendly design`;
  
  console.log(`第${page.pageNumber}页LiblibAI提示词:`, prompt);
  return prompt;
}

/**
 * 生成备用内容（当API调用失败时使用）
 */
function generateFallbackContent({ character, story, content }) {
  const characterName = character.name || '主角';
  const pages = [];

  // 根据用户的内容选择确定主题
  let educationalTopic = '学会分享与合作';
  let storyTitle = `${characterName}的成长故事`;

  if (content) {
    if (content.educationalTopic || content.finalTopic) {
      educationalTopic = content.educationalTopic || content.finalTopic;
      storyTitle = `${characterName}的${educationalTopic}故事`;
    } else if (content.selectedTopic) {
      educationalTopic = content.selectedTopic;
      storyTitle = `${characterName}的${educationalTopic}故事`;
    } else if (content.customContent && content.customContent.length > 0) {
      const shortContent = content.customContent.length > 10 
        ? content.customContent.substring(0, 10) + '...'
        : content.customContent;
      educationalTopic = shortContent;
      storyTitle = `${characterName}的学习故事`;
    }
  }

  // 为自闭症儿童设计的简单故事模板（根据主题调整）
  const getTemplateByTopic = (topic) => {
    if (topic.includes('分享') || topic.includes('合作')) {
      return [
        {
          title: "认识分享",
          content: `${characterName}有很多玩具。${characterName}想要分享。`,
          sceneDescription: "character with toys, looking happy"
        },
        {
          title: "学会分享",
          content: `${characterName}把玩具给朋友。朋友很开心。`,
          sceneDescription: "character sharing toys with friends"
        },
        {
          title: "一起玩耍",
          content: `${characterName}和朋友一起玩。大家都很快乐。`,
          sceneDescription: "character playing with friends together"
        },
        {
          title: "分享的快乐",
          content: `${characterName}感到很开心。分享让人快乐。`,
          sceneDescription: "character smiling happily with friends"
        }
      ];
    } else if (topic.includes('勇敢') || topic.includes('自信')) {
      return [
        {
          title: "遇到困难",
          content: `${characterName}遇到了困难。${characterName}有点害怕。`,
          sceneDescription: "character facing a challenge, looking worried"
        },
        {
          title: "鼓起勇气",
          content: `${characterName}深呼吸。${characterName}决定试一试。`,
          sceneDescription: "character taking a deep breath, looking determined"
        },
        {
          title: "勇敢尝试",
          content: `${characterName}勇敢地行动了。${characterName}做得很好。`,
          sceneDescription: "character bravely taking action"
        },
        {
          title: "变得自信",
          content: `${characterName}成功了。${characterName}感到很自豪。`,
          sceneDescription: "character feeling proud and confident"
        }
      ];
    } else if (topic.includes('友谊') || topic.includes('朋友')) {
      return [
        {
          title: "寻找朋友",
          content: `${characterName}想要交朋友。${characterName}主动问好。`,
          sceneDescription: "character approaching other children friendly"
        },
        {
          title: "友好相处",
          content: `${characterName}和新朋友聊天。他们聊得很开心。`,
          sceneDescription: "character talking with new friends"
        },
        {
          title: "互相帮助",
          content: `朋友需要帮助。${characterName}主动帮忙。`,
          sceneDescription: "character helping a friend"
        },
        {
          title: "珍贵友谊",
          content: `${characterName}有了好朋友。友谊很珍贵。`,
          sceneDescription: "character with good friends, all smiling"
        }
      ];
    } else {
      // 默认通用模板
      return [
        {
          title: "开始学习",
          content: `${characterName}开始学习新事物。${characterName}很认真。`,
          sceneDescription: "character learning something new"
        },
        {
          title: "努力练习",
          content: `${characterName}认真练习。${characterName}不放弃。`,
          sceneDescription: "character practicing with determination"
        },
        {
          title: "获得进步",
          content: `${characterName}有了进步。${characterName}很高兴。`,
          sceneDescription: "character showing improvement, feeling happy"
        },
        {
          title: "学会成长",
          content: `${characterName}学会了很多。${characterName}变得更棒了。`,
          sceneDescription: "character feeling accomplished and grown"
        }
      ];
    }
  };

  const templates = getTemplateByTopic(educationalTopic);

  for (let i = 1; i <= story.pages; i++) {
    const template = templates[(i - 1) % templates.length];
    pages.push({
      pageNumber: i,
      title: template.title,
      content: template.content,
      sceneDescription: template.sceneDescription,
      fallbackEmoji: ['🌈', '🦋', '🌸', '🌺', '🍀', '⭐', '🌙', '☀️', '🌻', '🎈'][i % 10]
    });
  }

  return {
    title: storyTitle,
    pages: pages,
    educationalMessage: `通过这个关于"${educationalTopic}"的故事，孩子们可以学习重要的品格和技能。`,
    contentMode: content?.mode || 'fallback',
    finalEducationalTopic: educationalTopic
  };
}