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

/**
 * 通过后端代理调用OpenAI Chat API
 * @param {Object} options - 调用选项
 * @returns {Promise<Object>} API响应
 */
async function callOpenAIChat(options) {
  try {
    const response = await fetch(`${API_BASE_URL}/openai/chat`, {
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
    console.error('OpenAI Chat API代理调用失败:', error);
    throw error;
  }
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

请严格按照用户输入的语言来回复！`;

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
    onProgress && onProgress('正在构建故事提示词...', 10);
    
    const response = await callOpenAIChat({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "你是一个专为自闭症儿童创作绘本的专家。请根据以下要求生成一个适合3-7岁自闭症儿童阅读的绘本故事：\n\n- 使用简洁明了的句子，每页不超过2-3句；\n- 故事结构简单清晰，有明确的开始、发展和结尾；\n- 包含积极的情绪引导，如情绪表达、规则学习或社交技能；\n- 加入重复的句型与角色行为，便于理解和记忆；\n- 避免使用比喻、讽刺、复杂隐喻等表达；\n- 每页为插画师提供一段简短的英文插图描述；\n\n请严格按照用户要求的格式返回JSON数据。"
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
      masterImageUrl: imageResult.masterImageUrl || null // 添加主角形象图URL
    };
    
  } catch (error) {
    console.error('生成绘本失败:', error);
    
    // 如果API调用失败，返回默认内容
    return generateFallbackContent({ character, story });
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

  const educationalTopic = content.isCustom 
    ? content.customContent 
    : content.randomTopic || '学会分享与合作';

  // 标准化角色描述
  const characterDescription = generateCharacterDescription(character);
  const characterName = character.name || '主角';

  return `请为自闭症儿童创作一个绘本故事，要求如下：

角色设定：
- 主角：${characterName}
- 外貌：${characterDescription}
- 年龄：${character.age}岁

故事设定：
- 故事类型：${storyTypes[story.type] || '成长故事'}
- 故事页数：${story.pages}页
- 教育主题：${educationalTopic}

特殊要求（针对自闭症儿童）：
1. 每页文字不超过2-3句话，每句话不超过15个字
2. 使用简单、直接的表达，避免比喻和隐喻
3. 重复使用相同的句型结构，如"${characterName}看到了..."、"${characterName}感到..."
4. 故事要包含明确的情绪表达和社交技能学习
5. 每页场景描述必须用英文，便于生成插图

请创作一个完整的绘本故事，包含以下内容：
1. 一个简单明了的故事标题
2. ${story.pages}页的故事内容，每页包含：
   - 页面标题（简短明了）
   - 故事文本（2-3句话，语言简洁直白）
   - 英文场景描述（用于DALL-E 3生成插图）

要求：
- 故事要体现"${educationalTopic}"这个教育主题
- 语言要极其简单，适合自闭症儿童理解
- 情节要积极向上，有明确的行为示范
- 每页的故事要有重复的模式，便于记忆

请严格按照以下JSON格式返回：
{
  "title": "故事标题",
  "pages": [
    {
      "pageNumber": 1,
      "title": "第一页标题",
      "content": "第一页的故事内容（2-3句话）...",
      "sceneDescription": "English scene description for illustration generation"
    },
    {
      "pageNumber": 2,
      "title": "第二页标题",
      "content": "第二页的故事内容（2-3句话）...",
      "sceneDescription": "English scene description for illustration generation"
    }
    // ... 继续到第${story.pages}页
  ],
  "educationalMessage": "这个故事传达的教育意义总结"
}`;
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

  // 使用专业的自闭症友好关键词模块生成提示词
  const prompt = generateAutismFriendlyPrompt({
    character: character,
    sceneDescription: page.sceneDescription || 'A simple scene',
    emotion: sceneInfo.emotion,
    action: sceneInfo.action,
    environment: sceneInfo.environment
  });

  return prompt;
}

/**
 * 构建LiblibAI图像生成提示词
 * @param {Object} page - 页面数据
 * @param {Object} character - 角色信息
 * @returns {string} 图像生成提示词
 */
function buildLiblibImagePrompt(page, character) {
  const characterDescription = generateCharacterDescription(character);
  const sceneDescription = page.sceneDescription || `${character.name} in a children's book scene`;
  
  // LiblibAI适用的提示词格式
  return `Children's book illustration, ${characterDescription}, ${sceneDescription}, cute cartoon style, simple 2D art, bright colors, child-friendly, educational, wholesome, appropriate for children aged 3-7, clean background, storybook style`;
}

/**
 * 生成备用内容（当API调用失败时使用）
 */
function generateFallbackContent({ character, story }) {
  const characterName = character.name || '主角';
  const pages = [];

  // 为自闭症儿童设计的简单故事模板
  const simpleStoryTemplates = [
    {
      title: "认识自己",
      content: `${characterName}看着镜子。${characterName}很开心。`,
      sceneDescription: "character looking at mirror and smiling"
    },
    {
      title: "学会问好",
      content: `${characterName}见到朋友。${characterName}说："你好！"`,
      sceneDescription: "character waving hello to a friend"
    },
    {
      title: "分享玩具",
      content: `${characterName}有一个玩具。${characterName}和朋友一起玩。`,
      sceneDescription: "character sharing a toy with a friend"
    },
    {
      title: "表达感受",
      content: `${characterName}感到开心。${characterName}笑了。`,
      sceneDescription: "character expressing happiness with a big smile"
    }
  ];

  for (let i = 1; i <= story.pages; i++) {
    const template = simpleStoryTemplates[(i - 1) % simpleStoryTemplates.length];
    pages.push({
      pageNumber: i,
      title: template.title,
      content: template.content,
      sceneDescription: template.sceneDescription
    });
  }

  return {
    title: `${characterName}的成长故事`,
    pages: pages,
    educationalMessage: `通过这个简单的故事，孩子们可以学习基本的社交技能和情绪表达。`
  };
}
