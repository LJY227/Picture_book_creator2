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

// 通义千问模型配置 (符合API限制 max_tokens: [1, 16384])
const QWEN_MODELS = {
  'qwen-turbo': {
    name: 'qwen-turbo',
    description: '通义千问-Turbo',
    maxTokens: 8000,
    temperature: 0.7,
    costPer1KTokens: 0.002,
    rpmLimit: 1000
  },
  'qwen-plus': {
    name: 'qwen-plus', 
    description: '通义千问-Plus',
    maxTokens: 16384,  // 修正: 符合API限制 [1, 16384]
    temperature: 0.7,
    costPer1KTokens: 0.004,
    rpmLimit: 500
  },
  'qwen-max': {
    name: 'qwen-max',
    description: '通义千问-Max',
    maxTokens: 8000,
    temperature: 0.7,
    costPer1KTokens: 0.02,
    rpmLimit: 100
  }
};

// 任务类型与模型映射
const TASK_MODEL_MAPPING = {
  'STORY_GENERATION': 'qwen-plus',      // 故事生成使用Plus模型
  'CHARACTER_OPTIMIZATION': 'qwen-turbo', // 角色优化使用Turbo
  'TRANSLATION': 'qwen-turbo',          // 翻译使用Turbo
  'FAST_PROCESSING': 'qwen-turbo',      // 快速处理使用Turbo
  'HIGH_QUALITY': 'qwen-max'            // 高质量任务使用Max
};

// 本地处理缓存
const LOCAL_PROCESSING = {
  cache: new Map(),
  maxCacheSize: 100,
  cleanupThreshold: 120
};

// API使用控制器
class APIUsageController {
  constructor() {
    this.maxCallsPerHour = 50;
    this.callHistory = [];
    this.resetTime = Date.now() + 3600000; // 1小时后重置
  }
  
  canCallAPI() {
    this.cleanup();
    return this.callHistory.length < this.maxCallsPerHour;
  }
  
  recordAPICall() {
    this.callHistory.push(Date.now());
  }
  
  cleanup() {
    const now = Date.now();
    if (now > this.resetTime) {
      this.callHistory = [];
      this.resetTime = now + 3600000;
    }
    this.callHistory = this.callHistory.filter(time => now - time < 3600000);
  }
  
  getStatus() {
    this.cleanup();
    return {
      remainingCalls: this.maxCallsPerHour - this.callHistory.length,
      totalCalls: this.callHistory.length,
      resetTime: new Date(this.resetTime).toLocaleTimeString()
    };
  }
}

// 全局API控制器实例
const apiController = new APIUsageController(); 

/**
 * 调用通义千问API进行对话
 * @param {Object} options - 调用参数
 * @param {string} taskType - 任务类型
 * @param {number} retryCount - 重试次数
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<Object>} API响应
 */
async function callQwenChat(options, taskType = 'FAST_PROCESSING', retryCount = 0, maxRetries = 3) {
  try {
    // 选择合适的模型
    const modelName = TASK_MODEL_MAPPING[taskType] || 'qwen-turbo';
    const modelConfig = QWEN_MODELS[modelName];
    
    if (retryCount > 0) {
      const delay = Math.min(5000 * retryCount, 30000); // 5, 10, 15秒延迟
      console.log(`⏱️ 通义千问重试延迟${delay/1000}秒 (第${retryCount}次重试)...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log(`🤖 调用通义千问API: ${modelName} (${taskType}) [OpenAI兼容模式]`);
    
    // 构建OpenAI兼容格式请求体 (确保max_tokens在[1, 16384]范围内)
    const maxTokens = Math.min(
      options.max_tokens || modelConfig.maxTokens, 
      modelConfig.maxTokens,
      16384  // 通义千问API硬限制
    );
    
    const requestBody = {
      model: modelName,
      messages: options.messages,
      temperature: options.temperature || modelConfig.temperature,
      max_tokens: Math.max(1, maxTokens)  // 确保至少为1
    };

    console.log('📤 发送请求 (OpenAI格式):', {
      model: requestBody.model,
      messages_count: requestBody.messages?.length,
      temperature: requestBody.temperature,
      max_tokens: requestBody.max_tokens
    });

    // 通过后端代理调用通义千问API
    const response = await fetch(`${API_BASE_URL}/qwen/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      
      console.error('❌ 后端API错误响应:', error);
      
      // 处理429错误（频率限制）
      if (response.status === 429) {
        console.warn(`⚠️ 通义千问API频率限制，第${retryCount + 1}次重试...`);
        
        if (retryCount < maxRetries) {
          return callQwenChat(options, taskType, retryCount + 1, maxRetries);
        } else {
          throw new Error(`通义千问API频率限制：经过${maxRetries}次重试仍失败。请稍后再试。`);
        }
      }
      
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ 通义千问API调用成功 (${modelName})`);
    console.log('📥 收到响应:', {
      has_choices: !!result.choices,
      choices_count: result.choices?.length,
      has_message: !!(result.choices?.[0]?.message),
      content_length: result.choices?.[0]?.message?.content?.length
    });
    
    // OpenAI兼容模式返回的就是标准OpenAI格式，无需转换
    return result;
    
  } catch (error) {
    console.error(`通义千问API调用失败 (${taskType}):`, error);
    
    // 网络错误重试
    if (retryCount < maxRetries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
      console.warn(`🌐 网络错误，第${retryCount + 1}/${maxRetries}次重试...`);
      const waitTime = 3000 * (retryCount + 1); // 3, 6, 9秒
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callQwenChat(options, taskType, retryCount + 1, maxRetries);
    }
    
    throw error;
  }
}

/**
 * 使用通义千问优化角色描述
 * @param {string} userDescription - 用户输入的角色描述
 * @param {Object} basicInfo - 基础角色信息
 * @returns {Promise<string>} 优化后的角色描述
 */
export async function optimizeCharacterDescription(userDescription, basicInfo = {}) {
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 优先使用本地优化逻辑
  try {
    const localOptimized = optimizeCharacterLocally(userDescription, basicInfo);
    if (localOptimized) {
      console.log('🏠 使用本地角色优化:', { 
        original: userDescription, 
        enhanced: localOptimized 
      });
      return localOptimized;
    }
  } catch (error) {
    console.warn('本地优化失败，尝试API优化:', error);
  }
  
  if (!apiController.canCallAPI()) {
    console.log('⚠️ API调用已达限制，使用简化本地处理');
    return generateFallbackCharacterDescription(userDescription, basicInfo);
  }

  try {
    console.log('🤖 使用通义千问进行角色优化...');
    apiController.recordAPICall();
    
    const response = await callQwenChat({
      messages: [
        {
          role: "user",
          content: `请优化角色描述："${userDescription}"，${age}岁${gender === 'boy' ? '男孩' : gender === 'girl' ? '女孩' : '孩子'}，补充外貌、服装、表情，50字内：`
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    }, 'CHARACTER_OPTIMIZATION');

    const optimizedDescription = response.choices[0].message.content.trim();
    console.log('✅ 通义千问角色优化完成:', { 
      original: userDescription, 
      enhanced: optimizedDescription 
    });
    
    return optimizedDescription;
    
  } catch (error) {
    console.error('通义千问角色优化失败，使用本地备用方案:', error);
    return generateFallbackCharacterDescription(userDescription, basicInfo);
  }
}

/**
 * 使用通义千问翻译描述为英文
 * @param {string} description - 中文描述
 * @param {Object} basicInfo - 基础信息
 * @returns {Promise<string>} 英文翻译
 */
export async function translateDescriptionToEnglish(description, basicInfo = {}) {
  // 优先使用本地翻译逻辑
  try {
    const localTranslated = translateLocally(description, basicInfo);
    if (localTranslated) {
      console.log('🏠 使用本地翻译:', { 
        original: description, 
        translated: localTranslated 
      });
      return localTranslated;
    }
  } catch (error) {
    console.warn('本地翻译失败，尝试API翻译:', error);
  }
  
  if (!apiController.canCallAPI()) {
    console.log('⚠️ API调用已达限制，使用简化本地翻译');
    return generateFallbackTranslation(description, basicInfo);
  }

  try {
    console.log('🤖 使用通义千问进行翻译...');
    apiController.recordAPICall();
    
    const response = await callQwenChat({
      messages: [
        {
          role: "user",
          content: `请将以下中文描述翻译为英文，保持原意和细节：\n"${description}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    }, 'TRANSLATION');

    const translatedText = response.choices[0].message.content.trim();
    // 清理可能的引号和多余内容
    const cleanTranslation = translatedText.replace(/^["']|["']$/g, '').trim();
    
    console.log('✅ 通义千问翻译完成:', { 
      original: description, 
      translated: cleanTranslation 
    });
    
    return cleanTranslation;
    
  } catch (error) {
    console.error('通义千问翻译失败，使用本地备用方案:', error);
    return generateFallbackTranslation(description, basicInfo);
  }
}

// 本地角色描述优化函数
function optimizeCharacterLocally(userDescription, basicInfo) {
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 检查缓存
  const cacheKey = `char_${userDescription}_${age}_${gender}_${identity}`;
  if (LOCAL_PROCESSING.cache.has(cacheKey)) {
    console.log('💾 使用缓存的角色描述');
    return LOCAL_PROCESSING.cache.get(cacheKey);
  }

  // 简单的本地优化逻辑
  let optimized = userDescription;
  
  // 添加年龄描述
  if (!optimized.includes('岁') && !optimized.includes('年龄')) {
    optimized = `${age}岁的${optimized}`;
  }
  
  // 添加性别信息
  if (gender === 'boy' && !optimized.includes('男') && !optimized.includes('小男孩')) {
    optimized = optimized.replace(/孩子|小孩/, '小男孩');
  } else if (gender === 'girl' && !optimized.includes('女') && !optimized.includes('小女孩')) {
    optimized = optimized.replace(/孩子|小孩/, '小女孩');
  }
  
  // 添加基本外貌描述
  if (!optimized.includes('眼睛') && !optimized.includes('头发')) {
    const features = ['大眼睛', '黑头发', '可爱的笑容'];
    optimized += `，有着${features.join('和')}`;
  }
  
  // 缓存结果
  if (LOCAL_PROCESSING.cache.size >= LOCAL_PROCESSING.maxCacheSize) {
    const oldestKey = LOCAL_PROCESSING.cache.keys().next().value;
    LOCAL_PROCESSING.cache.delete(oldestKey);
  }
  LOCAL_PROCESSING.cache.set(cacheKey, optimized);
  
  return optimized;
}

// 本地翻译函数
function translateLocally(description, basicInfo) {
  const cacheKey = `trans_${description}`;
  if (LOCAL_PROCESSING.cache.has(cacheKey)) {
    console.log('💾 使用缓存的翻译');
    return LOCAL_PROCESSING.cache.get(cacheKey);
  }

  // 简单的本地翻译映射
  const translations = {
    '小男孩': 'little boy',
    '小女孩': 'little girl',
    '孩子': 'child',
    '头发': 'hair',
    '眼睛': 'eyes',
    '笑容': 'smile',
    '可爱': 'cute',
    '聪明': 'smart',
    '善良': 'kind',
    '活泼': 'lively',
    '黑色': 'black',
    '棕色': 'brown',
    '大': 'big',
    '小': 'small'
  };
  
  let translated = description;
  for (const [chinese, english] of Object.entries(translations)) {
    translated = translated.replace(new RegExp(chinese, 'g'), english);
  }
  
  // 缓存结果
  if (translated !== description) {
    if (LOCAL_PROCESSING.cache.size >= LOCAL_PROCESSING.maxCacheSize) {
      const oldestKey = LOCAL_PROCESSING.cache.keys().next().value;
      LOCAL_PROCESSING.cache.delete(oldestKey);
    }
    LOCAL_PROCESSING.cache.set(cacheKey, translated);
    return translated;
  }
  
  return null; // 无法本地翻译
}

// 生成备用角色描述
function generateFallbackCharacterDescription(userDescription, basicInfo) {
  const { age = 6, gender = 'any' } = basicInfo;
  const genderText = gender === 'boy' ? '小男孩' : gender === 'girl' ? '小女孩' : '孩子';
  
  return `${age}岁的${genderText}，${userDescription}，有着明亮的眼睛和灿烂的笑容`;
}

// 生成备用翻译
function generateFallbackTranslation(description, basicInfo) {
  // 简单的备用翻译
  return `A child character: ${description}`;
}

/**
 * 使用通义千问生成绘本故事
 * @param {Object} params - 生成参数 
 * @returns {Promise<Object>} 生成的绘本内容
 */
export async function generatePictureBook({ character, story, content, onProgress, imageEngine, useCharacterConsistency = true }) {
  try {
    // 选择合适的模型
    const modelName = TASK_MODEL_MAPPING['STORY_GENERATION'];
    const modelConfig = QWEN_MODELS[modelName];
    const defaultImageEngine = imageEngine || 'liblib'; // 默认使用LiblibAI
    
    // 构建提示词
    const prompt = buildPrompt({ character, story, content });

    console.log('🧠 通义千问模型选择结果:');
    console.log('- 故事生成模型:', modelName, '(' + modelConfig.description + ')');
    console.log('- 图像生成引擎:', defaultImageEngine);
    console.log('- 教学内容模式:', content.mode || 'unknown');
    console.log('- 最终教学主题:', content.educationalTopic || content.finalTopic);
    onProgress && onProgress('正在使用通义千问生成故事...', 10);
    
    const response = await callQwenChat({
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
      temperature: modelConfig.temperature,
      max_tokens: Math.min(modelConfig.maxTokens, 16384)  // 确保符合API限制
    }, 'STORY_GENERATION');

    const generatedContent = response.choices[0].message.content;
    console.log('通义千问返回的原始内容:', generatedContent);
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
        throw new Error('无法解析通义千问返回的内容');
      }
    }

    // 为每页生成插画
    console.log('开始生成插画，使用引擎:', imageEngine, '角色一致性:', useCharacterConsistency);
    onProgress && onProgress('正在生成插画...', 60);

    const imageResult = await generateImagesForPages(
      parsedContent.pages,
      character,
      defaultImageEngine,
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
      imageEngine: defaultImageEngine,
      storyModel: modelName,
      characterConsistency: useCharacterConsistency,
      characterDefinition: imageResult.characterDefinition || null,
      masterImageUrl: imageResult.masterImageUrl || null,
      contentMode: content.mode,
      finalEducationalTopic: content.educationalTopic || content.finalTopic
    };
    
  } catch (error) {
    console.error('生成绘本失败:', error);
    
    onProgress && onProgress('生成失败，正在分析错误原因...', 95);
    
    // 分析错误类型并给出精确指导
    if (error.message.includes('频率限制') || error.message.includes('429')) {
      console.log('📋 错误分析: 通义千问API频率限制');
      onProgress && onProgress('❌ API频率限制：建议等待5-10分钟后重试', 100);
      
      throw new Error(`通义千问API频率限制：${error.message}

🔧 解决建议：
1. 等待5-10分钟后再次尝试
2. 检查通义千问账户的API使用配额
3. 考虑升级到更高的使用计划
4. 错开使用高峰时段

💡 系统已进行智能重试，但API服务器持续返回频率限制。`);
      
    } else if (error.message.includes('配额') || error.message.includes('quota')) {
      console.log('📋 错误分析: 通义千问API配额不足');
      onProgress && onProgress('❌ API配额不足：请充值通义千问账户', 100);
      
      throw new Error(`通义千问API配额不足：${error.message}

🔧 解决建议：
1. 登录阿里云控制台检查账户余额
2. 为通义千问服务充值
3. 检查当前的API使用计划
4. 考虑升级到更高的使用计划

💳 这通常意味着您的通义千问账户余额已用完，需要充值后才能继续使用。`);
      
    } else if (error.message.includes('网络') || error.message.includes('fetch')) {
      console.log('📋 错误分析: 网络连接问题');
      onProgress && onProgress('❌ 网络连接异常：请检查网络后重试', 100);
      
      throw new Error(`网络连接异常：${error.message}

🔧 解决建议：
1. 检查您的网络连接状态
2. 尝试刷新页面后重试
3. 如果使用VPN，尝试切换节点
4. 检查防火墙设置是否阻止了API访问

🌐 系统无法连接到通义千问服务器，请确保网络连接正常。`);
      
    } else {
      console.log('📋 错误分析: 其他API错误');
      onProgress && onProgress('❌ API调用失败：请稍后重试', 100);
      
      throw new Error(`通义千问API调用失败：${error.message}

🔧 解决建议：
1. 稍等几分钟后重试
2. 检查通义千问服务状态
3. 确认API密钥配置正确
4. 如果问题持续，请联系技术支持

⚠️ 这是一个未预期的API错误，建议稍后重试或检查服务状态。`);
    }
  }
}

/**
 * 构建发送给通义千问的提示词
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
- 角色描述：${characterDescription}
- 年龄：${character.age || 6}岁
- 性格特点：${character.personality || '活泼开朗、善良友好'}

【故事要求】
- 故事类型：${storyTypes[story.type] || '成长故事'}
- 教学主题：${educationalTopic}
- 故事背景：${story.setting || '日常生活场景'}
- 页数要求：6-8页
- 语言风格：简单易懂但充满感染力

【教育目标】
${content.educationalGoals || `通过故事帮助自闭症儿童学习"${educationalTopic}"，培养相关的社交技能和行为习惯`}

【特殊要求】
1. 语言必须简单直白，适合自闭症儿童理解
2. 情节要有起承转合，但不能太复杂
3. 要有明确的教育价值和行为示范
4. 每页都需要详细的英文插画描述
5. 主角外貌特征在所有页面中必须保持一致${contentModeNote}

请严格按照以下JSON格式返回：

\`\`\`json
{
  "title": "故事标题",
  "educationalTheme": "${educationalTopic}",
  "targetAge": "${character.age || 6}岁",
  "pages": [
    {
      "pageNumber": 1,
      "text": "第一页的故事文本",
      "imagePrompt": "详细的英文插画描述，包含主角外貌、动作、表情、场景等"
    },
    {
      "pageNumber": 2,
      "text": "第二页的故事文本",
      "imagePrompt": "详细的英文插画描述"
    }
    // ... 更多页面
  ],
  "educationalValue": "这个故事的教育意义和价值",
  "teachingPoints": ["教学要点1", "教学要点2", "教学要点3"],
  "discussionQuestions": ["讨论问题1", "讨论问题2", "讨论问题3"]
}
\`\`\`

请确保返回的是纯JSON格式，不要包含任何其他内容。`;
}

/**
 * 为每页生成插画
 */
async function generateImagesForPages(pages, character, imageEngine, onProgress, useCharacterConsistency = false) {
  const results = {
    pages: [],
    characterDefinition: null,
    masterImageUrl: null
  };

  // 如果使用角色一致性，先生成主角形象
  if (useCharacterConsistency) {
    try {
      console.log('🎨 生成主角一致性形象...');
      const masterResult = await generateMasterCharacterImage(character, imageEngine);
      results.characterDefinition = masterResult.characterDefinition;
      results.masterImageUrl = masterResult.imageUrl;
      console.log('✅ 主角形象生成完成');
    } catch (error) {
      console.warn('⚠️ 主角形象生成失败，将使用标准模式:', error);
      useCharacterConsistency = false;
    }
  }

  // 为每页生成插画
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    try {
      onProgress && onProgress(i + 1, pages.length);
      
      console.log(`🎨 生成第${i + 1}页插画...`);
      
      let imageUrl = null;
      
      if (useCharacterConsistency && results.characterDefinition) {
        // 使用角色一致性生成
        const result = await generateStoryIllustrationWithMaster(
          page.imagePrompt,
          results.characterDefinition,
          imageEngine
        );
        imageUrl = result.imageUrl;
      } else {
        // 使用标准方式生成
        const imagePrompt = buildLiblibImagePrompt(page, character);
        
        if (imageEngine === 'liblib') {
          const result = await generateTextToImageComplete(imagePrompt);
          imageUrl = result.imageUrl;
        } else {
          // 其他图像引擎的处理
          console.warn('不支持的图像引擎:', imageEngine);
          imageUrl = null;
        }
      }
      
      results.pages.push({
        ...page,
        imageUrl: imageUrl,
        imageEngine: imageEngine
      });
      
      console.log(`✅ 第${i + 1}页插画生成完成`);
      
    } catch (error) {
      console.error(`❌ 第${i + 1}页插画生成失败:`, error);
      
      // 添加失败的页面，但不包含图片
      results.pages.push({
        ...page,
        imageUrl: null,
        imageError: error.message,
        imageEngine: imageEngine
      });
    }
    
    // 添加延迟避免API限制
    if (i < pages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

/**
 * 构建LiblibAI图像提示词
 */
function buildLiblibImagePrompt(page, character) {
  const characterDescription = generateCharacterDescription(character);
  
  // 组合角色描述和页面描述
  const combinedPrompt = `${page.imagePrompt}, featuring ${characterDescription}`;
  
  // 添加质量和风格描述
  const qualityPrompts = [
    'high quality',
    'detailed illustration',
    'children book style',
    'warm colors',
    'friendly atmosphere'
  ];
  
  return `${combinedPrompt}, ${qualityPrompts.join(', ')}`;
}

// 生成备用绘本内容（当API失败时使用）
function generateFallbackContent({ character, story, content }) {
  const characterName = character.name || '小主角';
  const educationalTopic = content.educationalTopic || content.finalTopic || '学会分享';
  
  return {
    title: `${characterName}的${educationalTopic}故事`,
    educationalTheme: educationalTopic,
    targetAge: `${character.age || 6}岁`,
    pages: [
      {
        pageNumber: 1,
        text: `这是${characterName}，一个可爱的孩子。`,
        imagePrompt: `A cute child character named ${characterName}, smiling happily`
      },
      {
        pageNumber: 2,
        text: `${characterName}今天要学习${educationalTopic}。`,
        imagePrompt: `${characterName} in a learning situation, looking curious and interested`
      },
      {
        pageNumber: 3,
        text: `通过努力，${characterName}学会了很多。`,
        imagePrompt: `${characterName} successfully demonstrating new skills, looking proud`
      },
      {
        pageNumber: 4,
        text: `${characterName}很开心，因为学到了新知识。`,
        imagePrompt: `${characterName} celebrating with joy, surrounded by friends or family`
      }
    ],
    educationalValue: `帮助孩子学习${educationalTopic}的重要性`,
    teachingPoints: [`理解${educationalTopic}的意义`, '学会实际应用', '培养相关习惯'],
    discussionQuestions: [`你觉得${educationalTopic}重要吗？`, `你会怎么做？`, '你学到了什么？']
  };
} 