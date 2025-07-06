import { generatePictureBook } from './qwen.js';
import { generateStoryIllustrationWithMaster, generateMasterCharacterImage } from './characterConsistency.js';
import { generateTextToImageComplete, generateImageToImageComplete } from './liblibai.js';

/**
 * 重新生成单页插画
 * @param {Object} pageData - 页面数据
 * @param {Object} characterData - 角色数据
 * @param {Object} options - 生成选项
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} 生成结果
 */
export async function regeneratePageIllustration(pageData, characterData, options = {}, onProgress = null) {
  try {
    console.log('开始重新生成插画...');
    
    const {
      imageEngine = 'liblibai',
      useCharacterConsistency = true,
      masterImageUrl = null,
      enhancedPrompt: useEnhancedPrompt = false
    } = options;

    if (onProgress) onProgress('正在准备重新生成插画...', 5);

    // 优先使用masterImageUrl作为参考图片
    let referenceImageUrl = masterImageUrl;
    
    // 如果没有提供masterImageUrl，尝试从localStorage获取
    if (!referenceImageUrl) {
      const generatedBook = JSON.parse(localStorage.getItem('generatedBook') || '{}');
      referenceImageUrl = generatedBook.masterImageUrl;
      console.log('从localStorage获取主角形象图:', referenceImageUrl);
    }
    
    // 如果仍然没有主角形象图，才使用当前页面图片作为最后的备选
    if (!referenceImageUrl && pageData.imageUrl) {
      referenceImageUrl = pageData.imageUrl;
      console.log('使用当前页面插画作为备选参考图片:', referenceImageUrl);
    }

    if (onProgress) onProgress('正在分析页面内容...', 10);

    let result = null;

    // 如果有参考图片，优先使用图生图模式
    if (referenceImageUrl) {
      console.log('使用参考图片进行图生图重新生成:', referenceImageUrl);
      if (onProgress) onProgress('使用参考图片生成新插画...', 20);
      
      result = await regenerateWithImageToImage(
        pageData, 
        characterData, 
        referenceImageUrl, 
        useEnhancedPrompt, 
        onProgress
      );
    }

    // 如果图生图失败或没有参考图片，尝试角色一致性模式
    if (!result || !result.success) {
      if (referenceImageUrl && useCharacterConsistency) {
        console.log('图生图失败，尝试角色一致性模式...');
        if (onProgress) onProgress('尝试角色一致性模式...', 40);
        
        result = await regenerateWithCharacterConsistency(
          pageData, 
          characterData, 
          referenceImageUrl, 
          onProgress
        );
      }
    }

    // 如果角色一致性也失败，尝试LiblibAI文生图
    if (!result || !result.success) {
      console.log('角色一致性模式失败，尝试LiblibAI文生图...');
      if (onProgress) onProgress('尝试LiblibAI文生图...', 60);
      
      result = await regenerateWithLiblibAI(pageData, characterData, useEnhancedPrompt, onProgress);
    }

    // 如果LiblibAI也失败，尝试DALL-E 3
    if (!result || !result.success) {
      console.log('LiblibAI失败，尝试DALL-E 3...');
      if (onProgress) onProgress('尝试DALL-E 3...', 80);
      
      result = await regenerateWithDALLE3(pageData, characterData, useEnhancedPrompt, onProgress);
    }

    // 如果所有方法都失败，生成emoji回退
    if (!result || !result.success) {
      console.log('所有AI生成方法失败，使用emoji回退...');
      if (onProgress) onProgress('生成emoji插画...', 90);
      
      const fallbackEmoji = generateFallbackEmoji(pageData, characterData);
      result = {
        success: true,
        method: 'emoji_fallback',
        fallbackEmoji: fallbackEmoji,
        note: '由于AI生成失败，使用emoji作为临时插画'
      };
    }

    if (onProgress) onProgress('插画重新生成完成', 100);
    return result;

  } catch (error) {
    console.error('重新生成插画过程中发生错误:', error);
    
    // 错误情况下也提供emoji回退
    const fallbackEmoji = generateFallbackEmoji(pageData, characterData);
    return {
      success: true,
      method: 'emoji_fallback',
      fallbackEmoji: fallbackEmoji,
      note: `生成过程出错，使用emoji回退: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * 使用图生图模式重新生成（保持角色一致性）
 */
async function regenerateWithImageToImage(pageData, characterData, referenceImageUrl, enhancedPrompt, onProgress) {
  try {
    // 导入LiblibAI图生图功能
    const { generateImageToImageComplete } = await import('./liblibai.js');
    
    // 构建提示词（图生图模式使用简化角色描述，避免与参考图片重复）
    let prompt = buildIllustrationPrompt(pageData, characterData, true);
    
    if (enhancedPrompt) {
      prompt += ', enhanced quality, more detailed, better composition, professional illustration';
    }

    console.log('LiblibAI图生图重新生成提示词:', prompt);
    console.log('参考图片URL:', referenceImageUrl);

    const result = await generateImageToImageComplete(
      prompt,
      referenceImageUrl,
      (status, progress) => {
        const totalProgress = 30 + (progress * 0.4); // 30% - 70%
        onProgress && onProgress(`图生图生成: ${status}`, totalProgress);
      },
      {
        aspectRatio: '3:4',
        guidance_scale: 3.5,
        imgCount: 1,
        model: 'pro'
      }
    );

    // 检查返回值格式
    if (result.status === 'success' && result.imageUrl) {
      return {
        success: true,
        imageUrl: result.imageUrl,
        prompt: prompt,
        referenceImage: referenceImageUrl
      };
    } else {
      throw new Error('LiblibAI图生图返回结果无效');
    }

  } catch (error) {
    console.error('LiblibAI图生图重新生成失败:', error);
    
    // 如果图生图失败，尝试使用简化提示词再试一次
    try {
      console.log('尝试使用简化提示词进行图生图重新生成...');
      onProgress && onProgress('使用简化提示词图生图重试...', 40);
      
      const { generateImageToImageComplete } = await import('./liblibai.js');
      const simplePrompt = buildSimpleIllustrationPrompt(pageData, characterData);
      console.log('简化图生图提示词:', simplePrompt);
      
      const retryResult = await generateImageToImageComplete(
        simplePrompt,
        referenceImageUrl,
        (status, progress) => {
          const totalProgress = 40 + (progress * 0.3); // 40% - 70%
          onProgress && onProgress(`图生图重试: ${status}`, totalProgress);
        },
        {
          aspectRatio: '3:4',
          guidance_scale: 3.0, // 降低引导系数
          imgCount: 1,
          model: 'basic' // 使用基础模型
        }
      );
      
      // 检查重试结果
      if (retryResult.status === 'success' && retryResult.imageUrl) {
        return {
          success: true,
          imageUrl: retryResult.imageUrl,
          prompt: simplePrompt,
          referenceImage: referenceImageUrl
        };
      } else {
        throw new Error('LiblibAI图生图重试结果无效');
      }
      
    } catch (retryError) {
      console.error('LiblibAI图生图重试也失败:', retryError);
      return { success: false, error: error.message };
    }
  }
}

/**
 * 使用角色一致性模式重新生成
 */
async function regenerateWithCharacterConsistency(pageData, characterData, masterImageUrl, onProgress) {
  try {
    // 获取角色定义
    const { getEnhancedCharacterDefinition, getRecommendedStrategy } = await import('./characterConsistency.js');
    const strategy = getRecommendedStrategy(characterData);
    const characterDef = await getEnhancedCharacterDefinition(characterData, strategy);

    // 使用角色一致性生成插画
    const result = await generateStoryIllustrationWithMaster(
      pageData.sceneDescription || pageData.content,
      masterImageUrl,
      characterDef,
      (status, progress) => {
        const totalProgress = 30 + (progress * 0.4); // 30% - 70%
        onProgress && onProgress(`角色一致性生成: ${status}`, totalProgress);
      }
    );

    return result;
  } catch (error) {
    console.error('角色一致性模式重新生成失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 使用LiblibAI文生图重新生成
 */
async function regenerateWithLiblibAI(pageData, characterData, enhancedPrompt, onProgress) {
  try {
    // 构建提示词（文生图模式使用完整角色描述）
    let prompt = buildIllustrationPrompt(pageData, characterData, false);
    
    if (enhancedPrompt) {
      prompt += ', enhanced quality, more detailed, better composition, professional illustration';
    }

    console.log('LiblibAI重新生成提示词:', prompt);

    const result = await generateTextToImageComplete(
      prompt,
      (status, progress) => {
        const totalProgress = 50 + (progress * 0.4); // 50% - 90%
        onProgress && onProgress(`LiblibAI生成: ${status}`, totalProgress);
      },
      {
        aspectRatio: '3:4',
        guidance_scale: 3.5,
        imgCount: 1,
        model: 'pro'
      }
    );

    if (result.status === 'success' && result.imageUrl) {
      return {
        success: true,
        imageUrl: result.imageUrl,
        prompt: prompt
      };
    } else {
      throw new Error('LiblibAI返回结果无效');
    }

  } catch (error) {
    console.error('LiblibAI重新生成失败:', error);
    
    // 尝试使用更简单的提示词重试一次
    try {
      console.log('尝试使用简化提示词重新生成...');
      onProgress && onProgress('使用简化提示词重试...', 60);
      
      const simplePrompt = buildSimpleIllustrationPrompt(pageData, characterData);
      console.log('简化提示词:', simplePrompt);
      
      const retryResult = await generateTextToImageComplete(
        simplePrompt,
        (status, progress) => {
          const totalProgress = 60 + (progress * 0.3); // 60% - 90%
          onProgress && onProgress(`LiblibAI重试: ${status}`, totalProgress);
        },
        {
          aspectRatio: '3:4',
          guidance_scale: 3.0, // 降低引导系数
          imgCount: 1,
          model: 'basic' // 使用基础模型
        }
      );
      
      if (retryResult.status === 'success' && retryResult.imageUrl) {
        return {
          success: true,
          imageUrl: retryResult.imageUrl,
          prompt: simplePrompt
        };
      } else {
        throw new Error('LiblibAI重试结果无效');
      }
      
    } catch (retryError) {
      console.error('LiblibAI重试也失败:', retryError);
      return { success: false, error: error.message };
    }
  }
}

/**
 * 使用DALL-E 3重新生成
 */
async function regenerateWithDALLE3(pageData, characterData, enhancedPrompt, onProgress) {
  try {
    const { generateAutismFriendlyPrompt } = await import('./autismFriendlyPrompts.js');
    
    // 构建DALL-E 3提示词
    let prompt = generateAutismFriendlyPrompt({
      character: characterData,
      sceneDescription: pageData.sceneDescription || pageData.content,
      emotion: 'happy',
      action: 'exploring',
      environment: 'safe'
    });

    if (enhancedPrompt) {
      prompt += ' Enhanced quality, professional children\'s book illustration, detailed and vibrant.';
    }

    console.log('DALL-E 3重新生成提示词:', prompt);

    // 模拟DALL-E 3 API调用（需要实际的OpenAI API）
    const response = await fetch('/api/openai/images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        size: "1024x1024",
        quality: "standard",
        n: 1
      })
    });

    if (!response.ok) {
      throw new Error(`DALL-E 3 API请求失败: ${response.status}`);
    }

    const data = await response.json();
    
    onProgress && onProgress('DALL-E 3生成完成', 90);

    return {
      success: true,
      imageUrl: data.data[0].url,
      prompt: prompt
    };

  } catch (error) {
    console.error('DALL-E 3重新生成失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 根据页面内容更新重新生成插画
 * @param {Object} pageData - 更新后的页面数据
 * @param {Object} characterData - 角色数据
 * @param {Object} options - 生成选项
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} 生成结果
 */
export async function regenerateIllustrationWithNewContent(pageData, characterData, options = {}, onProgress = null) {
  try {
    console.log('根据新内容重新生成插画...');
    
    const {
      imageEngine = 'liblibai',
      useCharacterConsistency = true,
      masterImageUrl = null,
      enhancedPrompt: useEnhancedPrompt = false
    } = options;

    if (onProgress) onProgress('正在分析新内容...', 10);

    // 分析新内容，生成场景描述
    console.log('分析的原始内容:', pageData.content);
    
    let sceneDescription;
    try {
      // 使用通义千问进行智能分析
      sceneDescription = await analyzeContentWithQwen(pageData.content);
      console.log('使用通义千问分析结果:', sceneDescription);
    } catch (error) {
      console.log('通义千问分析失败，使用通用描述作为备用方案');
      // 使用通用描述作为备用
      const characterAge = characterData.age || 6;
      const characterGender = characterData.gender === 'boy' ? 'boy' : characterData.gender === 'girl' ? 'girl' : 'child';
      sceneDescription = `A ${characterAge}-year-old ${characterGender} in a children's book scene, in a safe and friendly environment, cute cartoon style, simple 2D art, bright colors, child-friendly, educational, wholesome, appropriate for children aged 3-7, clean background, storybook style`;
    }

    if (onProgress) onProgress('正在生成新插画...', 30);

    // 优先使用masterImageUrl作为参考图片
    let referenceImageUrl = masterImageUrl;
    
    // 如果没有提供masterImageUrl，尝试从localStorage获取
    if (!referenceImageUrl) {
      const generatedBook = JSON.parse(localStorage.getItem('generatedBook') || '{}');
      referenceImageUrl = generatedBook.masterImageUrl;
      console.log('从localStorage获取主角形象图作为参考:', referenceImageUrl);
    }
    
    // 如果仍然没有主角形象图，才使用当前页面图片作为最后的备选
    if (!referenceImageUrl && pageData.imageUrl) {
      referenceImageUrl = pageData.imageUrl;
      console.log('使用当前页面插画作为备选参考图片:', referenceImageUrl);
    }

    // 创建更新的页面数据
    const updatedPageData = {
      ...pageData,
      sceneDescription: sceneDescription
    };

    let result = null;

    // 如果有参考图片，优先使用图生图模式
    if (referenceImageUrl) {
      console.log('使用主角参考图片进行图生图重新生成:', referenceImageUrl);
      if (onProgress) onProgress('使用主角形象图生成新插画...', 40);
      
      result = await regenerateWithImageToImage(
        updatedPageData, 
        characterData, 
        referenceImageUrl, 
        sceneDescription, 
        onProgress
      );
    }

    // 如果图生图失败或没有参考图片，尝试角色一致性模式
    if (!result || !result.success) {
      if (referenceImageUrl && useCharacterConsistency) {
        console.log('图生图失败，尝试角色一致性模式...');
        if (onProgress) onProgress('尝试角色一致性模式...', 60);
        
        result = await regenerateWithCharacterConsistency(
          updatedPageData, 
          characterData, 
          referenceImageUrl, 
          onProgress
        );
      }
    }

    // 如果角色一致性也失败，尝试LiblibAI文生图
    if (!result || !result.success) {
      console.log('角色一致性模式失败，尝试LiblibAI文生图...');
      if (onProgress) onProgress('尝试LiblibAI文生图...', 80);
      
      result = await regenerateWithLiblibAI(updatedPageData, characterData, sceneDescription, onProgress);
    }

    // 如果LiblibAI也失败，尝试DALL-E 3
    if (!result || !result.success) {
      console.log('LiblibAI失败，尝试DALL-E 3...');
      if (onProgress) onProgress('尝试DALL-E 3...', 90);
      
      result = await regenerateWithDALLE3(updatedPageData, characterData, sceneDescription, onProgress);
    }

    // 如果所有方法都失败，生成emoji回退
    if (!result || !result.success) {
      console.log('所有AI生成方法失败，使用emoji回退...');
      if (onProgress) onProgress('生成emoji插画...', 95);
      
      const fallbackEmoji = generateFallbackEmoji(updatedPageData, characterData);
      result = {
        success: true,
        method: 'emoji_fallback',
        fallbackEmoji: fallbackEmoji,
        note: '由于AI生成失败，使用emoji作为临时插画',
        updatedPageData: updatedPageData,
        newSceneDescription: sceneDescription
      };
    } else {
      // 成功时也要包含更新的页面数据
      result.updatedPageData = updatedPageData;
      result.newSceneDescription = sceneDescription;
    }

    if (onProgress) onProgress('根据新内容重新生成完成', 100);
    return result;

  } catch (error) {
    console.error('根据新内容重新生成插画过程中发生错误:', error);
    
    // 错误情况下也提供emoji回退
    const fallbackEmoji = generateFallbackEmoji(pageData, characterData);
    return {
      success: true,
      method: 'emoji_fallback',
      fallbackEmoji: fallbackEmoji,
      note: `生成过程出错，使用emoji回退: ${error.message}`,
      error: error.message,
      updatedPageData: pageData
    };
  }
}

/**
 * 根据文本内容生成场景描述（优先使用通义千问）
 */
async function generateSceneDescription(content, characterData = {}) {
  try {
    console.log('分析的原始内容:', content);
    
    // 处理不同类型的输入
    let contentText = '';
    
    if (typeof content === 'string') {
      contentText = content;
    } else if (content && typeof content === 'object') {
      contentText = content.content || content.text || JSON.stringify(content);
    } else {
      contentText = String(content || '');
    }
    
    console.log('处理输入内容，内容类型:', typeof content, '内容文本:', contentText);
    
    if (!contentText || contentText.trim().length === 0) {
      return `A child in a children's book scene, in a safe and friendly environment`;
    }

    // 使用通义千问分析
    try {
      const qwenDescription = await analyzeContentWithQwen(contentText);
      if (qwenDescription && qwenDescription.length > 20) {
        console.log('使用通义千问生成的场景描述:', qwenDescription);
        return qwenDescription;
      }
    } catch (error) {
      console.log('通义千问分析失败，使用通用描述:', error);
    }

    // 备用方案：使用通用描述
    console.log('使用通用描述作为备用方案');
    
    const characterAge = characterData.age || 6;
    const characterGender = characterData.gender === 'boy' ? 'boy' : characterData.gender === 'girl' ? 'girl' : 'child';
    
    return `A ${characterAge}-year-old ${characterGender} in a children's book scene, in a safe and friendly environment, cute cartoon style, simple 2D art, bright colors, child-friendly, educational, wholesome, appropriate for children aged 3-7, clean background, storybook style`;

  } catch (error) {
    console.error('场景描述生成失败:', error);
    return `A child in a children's book scene, in a safe and friendly environment`;
  }
}

/**
 * 使用通义千问分析内容并生成场景描述
 */
async function analyzeContentWithQwen(content) {
  try {
    console.log('使用通义千问分析内容:', content);
    
    // 检查内容是否为字符串
    if (typeof content !== 'string') {
      console.warn('内容不是字符串，使用通用描述:', content);
      return 'A child in a children\'s book scene, in a safe and friendly environment, cute cartoon style, simple 2D art, bright colors, child-friendly, educational, wholesome, appropriate for children aged 3-7, clean background, storybook style';
    }
    
    // 动态导入通义千问API函数
    const { callQwenChat } = await import('./qwen.js');
    
    // 构建专门的提示词用于分析绘本内容并生成场景描述
    const prompt = `你是一个专业的儿童绘本插画描述生成器。请将以下中文绘本内容转换为详细的英文插画描述，用于AI图像生成。

【内容分析要求】
1. 仔细分析绘本内容中的场景、人物、动作、情感和环境
2. 生成适合6岁儿童观看的插画描述
3. 风格要求：可爱卡通风格，明亮色彩，简单2D艺术
4. 必须包含具体的动作、表情、环境、物品等细节
5. 强调无文字要求：NO TEXT, NO WORDS, NO LETTERS, NO CHINESE CHARACTERS, NO WRITING

【输出格式】
请直接返回英文插画描述，不要添加任何解释或说明。

【输入内容】
${content}

【输出示例】
A 6-year-old child walking through a peaceful forest, surrounded by tall green trees and colorful flowers, the child's face showing curiosity and wonder, warm sunlight filtering through the leaves, cute cartoon style, simple 2D art, bright colors, child-friendly, educational, wholesome, appropriate for children aged 3-7, clean background, storybook style, NO TEXT, NO WORDS, NO LETTERS, NO CHINESE CHARACTERS, NO WRITING in the image.

请生成插画描述：`;

    console.log('🤖 通义千问分析内容提示词:', prompt);
    
    // 调用通义千问API
    const response = await callQwenChat({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 400
    }, 'CONTENT_ANALYSIS');

    let sceneDescription = response.choices[0].message.content.trim();
    
    // 清理可能的多余内容
    sceneDescription = sceneDescription.replace(/^["']|["']$/g, '').trim();
    
         // 验证生成的描述是否有效
     if (sceneDescription.length < 20 || sceneDescription.includes('无法') || sceneDescription.includes('抱歉')) {
       console.warn('通义千问返回的描述无效，使用通用描述:', sceneDescription);
       return 'A child in a children\'s book scene, in a safe and friendly environment, cute cartoon style, simple 2D art, bright colors, child-friendly, educational, wholesome, appropriate for children aged 3-7, clean background, storybook style';
     }
    
    console.log('✅ 通义千问生成的场景描述:', sceneDescription);
    return sceneDescription;
    
  } catch (error) {
    console.error('通义千问分析失败，使用通用描述:', error);
    return 'A child in a children\'s book scene, in a safe and friendly environment, cute cartoon style, simple 2D art, bright colors, child-friendly, educational, wholesome, appropriate for children aged 3-7, clean background, storybook style';
  }
}



/**
 * 深度分析内容关键词（备用方案）
 */
function analyzeContentKeywords(content) {
  const analysis = {
    actions: [],
    emotions: [],
    environments: [],
    objects: [],
    people: [],
    activities: []
  };
  
  const contentLower = content.toLowerCase();
  console.log('开始分析内容:', contentLower);
  
  // 动作关键词映射（增强版）
  const actionMap = {
    '种树': 'planting trees carefully',
    '种植': 'planting and gardening',
    '浇水': 'watering plants',
    '挖土': 'digging in the soil',
    '播种': 'sowing seeds',
    '收获': 'harvesting crops',
    '画画': 'drawing and painting',
    '写字': 'writing and practicing',
    '阅读': 'reading attentively',
    '唱歌': 'singing happily',
    '跳舞': 'dancing joyfully',
    '跑步': 'running energetically',
    '骑车': 'riding a bicycle',
    '游泳': 'swimming',
    '爬山': 'climbing mountains',
    '做饭': 'cooking together',
    '打扫': 'cleaning and organizing',
    '搭积木': 'building with blocks',
    '踢球': 'playing soccer',
    '打球': 'playing ball games',
    '打篮球': 'playing basketball together',
    '打乒乓球': 'playing ping pong',
    '打羽毛球': 'playing badminton',
    '荡秋千': 'swinging on a swing',
    '滑滑梯': 'sliding down a slide',
    '跳绳': 'jumping rope',
    '做游戏': 'playing fun games',
    '一起玩': 'playing together',
    '分享': 'sharing happily',
    '帮忙': 'helping others',
    '合作': 'cooperating together',
    '交流': 'communicating and talking',
    '拥抱': 'hugging warmly',
    '握手': 'shaking hands',
    '微笑': 'smiling brightly',
    '大笑': 'laughing joyfully',
    '看到': 'looking at and observing',
    '观看': 'watching carefully',
    '仰望': 'looking up at',
    '凝视': 'gazing at',
    '欣赏': 'admiring and appreciating',
    '发现': 'discovering and finding',
    '注意到': 'noticing and paying attention to',
    '感受': 'feeling and experiencing'
  };
  
  // 情感关键词映射（增强版）
  const emotionMap = {
    '开心': 'happy and cheerful',
    '高兴': 'joyful and delighted',
    '快乐': 'filled with happiness and joy',
    '兴奋': 'excited and enthusiastic',
    '激动': 'thrilled and animated',
    '满足': 'satisfied and content',
    '自豪': 'proud and accomplished',
    '感激': 'grateful and thankful',
    '温暖': 'feeling warm and loved',
    '安全': 'feeling safe and secure',
    '好奇': 'curious and interested',
    '专注': 'focused and concentrated',
    '认真': 'serious and dedicated',
    '勇敢': 'brave and courageous',
    '友好': 'friendly and kind',
    '善良': 'kind and gentle',
    '耐心': 'patient and understanding',
    '非常快乐': 'extremely happy and joyful',
    '很开心': 'very happy and excited'
  };
  
  // 环境关键词映射（增强版）
  const environmentMap = {
    '公园': 'in a beautiful park with green lawns and shade trees',
    '花园': 'in a colorful garden with blooming flowers and butterflies',
    '森林': 'in a peaceful forest with tall trees and dappled sunlight',
    '学校': 'at school in a bright and welcoming learning environment',
    '教室': 'in a cheerful classroom with educational materials',
    '操场': 'on a fun playground with colorful play equipment',
    '篮球场': 'on a basketball court with hoops and lines',
    '足球场': 'on a soccer field with green grass',
    '体育馆': 'in a spacious gymnasium',
    '图书馆': 'in a quiet library surrounded by books',
    '家里': 'at home in a cozy and comfortable living space',
    '厨房': 'in a warm kitchen filled with cooking aromas',
    '卧室': 'in a peaceful bedroom with soft lighting',
    '客厅': 'in a welcoming living room with family atmosphere',
    '户外': 'in a beautiful outdoor natural setting',
    '海边': 'at a sunny beach with gentle waves',
    '山上': 'on a mountain with fresh air and scenic views',
    '田野': 'in open fields with crops and farmland',
    '游乐场': 'at a fun amusement park',
    '社区': 'in a friendly neighborhood community',
    '天空': 'under a beautiful open sky',
    '星空': 'under a magical starry night sky',
    '夜晚': 'in a peaceful nighttime setting',
    '晚上': 'during a calm evening time',
    '月亮': 'under the gentle moonlight',
    '夕阳': 'during a beautiful sunset',
    '日出': 'during a magnificent sunrise',
    '雨天': 'on a gentle rainy day',
    '雪天': 'in a winter wonderland with snow',
    '春天': 'in a vibrant spring setting',
    '夏天': 'in a warm summer environment',
    '秋天': 'in a colorful autumn scene',
    '冬天': 'in a cozy winter atmosphere'
  };
  
  // 物品关键词映射（增强版）
  const objectMap = {
    '树': 'beautiful green trees',
    '花': 'colorful blooming flowers',
    '草': 'soft green grass',
    '书': 'interesting books and stories',
    '玩具': 'fun and educational toys',
    '积木': 'colorful building blocks',
    '球': 'bouncy balls for playing',
    '篮球': 'orange basketballs',
    '足球': 'soccer balls',
    '乒乓球': 'ping pong balls and paddles',
    '羽毛球': 'badminton rackets and shuttlecocks',
    '自行车': 'a shiny bicycle',
    '画笔': 'art supplies and paintbrushes',
    '音乐': 'musical instruments',
    '食物': 'delicious and healthy food',
    '水果': 'fresh and colorful fruits',
    '蔬菜': 'nutritious vegetables',
    '动物': 'friendly and gentle animals',
    '小狗': 'a playful puppy',
    '小猫': 'a cute kitten',
    '鸟': 'cheerful singing birds',
    '蝴蝶': 'beautiful colorful butterflies',
    '跳绳': 'colorful jump ropes',
    '秋千': 'fun playground swings',
    '滑梯': 'colorful playground slides',
    '星星': 'twinkling stars in the sky',
    '月亮': 'a gentle crescent moon',
    '太阳': 'a warm bright sun',
    '云朵': 'fluffy white clouds',
    '彩虹': 'a beautiful colorful rainbow',
    '花朵': 'beautiful blooming flowers',
    '叶子': 'green leaves on trees',
    '石头': 'smooth natural stones',
    '小路': 'a winding garden path',
    '桥': 'a charming little bridge'
  };
  
  // 人物关键词映射（增强版）
  const peopleMap = {
    '妈妈': 'loving mother',
    '爸爸': 'caring father',
    '父母': 'supportive parents',
    '朋友': 'good friends',
    '同学': 'friendly classmates',
    '老师': 'kind teacher',
    '爷爷': 'wise grandfather',
    '奶奶': 'gentle grandmother',
    '哥哥': 'helpful older brother',
    '姐姐': 'caring older sister',
    '弟弟': 'playful younger brother',
    '妹妹': 'sweet younger sister',
    '小明': 'friend Xiao Ming',
    '小红': 'friend Xiao Hong',
    '小李': 'friend Xiao Li',
    '小王': 'friend Xiao Wang',
    '小张': 'friend Xiao Zhang',
    '同伴': 'companions and playmates',
    '伙伴': 'good buddies and partners',
    '队友': 'teammates'
  };
  
  // 活动关键词映射（增强版）
  const activityMap = {
    '学习': 'educational learning activities',
    '游戏': 'fun and engaging games',
    '运动': 'healthy physical activities and sports',
    '创作': 'creative artistic projects',
    '探索': 'exciting exploration and discovery',
    '实验': 'hands-on science experiments',
    '表演': 'entertaining performances',
    '合作': 'teamwork and collaboration',
    '分享': 'sharing and caring activities',
    '帮助': 'helpful community service',
    '体育': 'sports and physical education',
    '比赛': 'friendly competitions and games',
    '训练': 'practice and skill development',
    '娱乐': 'entertainment and fun activities',
    '社交': 'social interaction and friendship building'
  };
  
  // 增强的分析逻辑 - 使用更智能的匹配
  console.log('开始关键词匹配...');
  
  // 分析各类关键词 - 使用includes进行部分匹配
  for (const [chinese, english] of Object.entries(actionMap)) {
    if (contentLower.includes(chinese)) {
      analysis.actions.push(english);
      console.log(`匹配到动作: ${chinese} -> ${english}`);
    }
  }
  
  for (const [chinese, english] of Object.entries(emotionMap)) {
    if (contentLower.includes(chinese)) {
      analysis.emotions.push(english);
      console.log(`匹配到情感: ${chinese} -> ${english}`);
    }
  }
  
  for (const [chinese, english] of Object.entries(environmentMap)) {
    if (contentLower.includes(chinese)) {
      analysis.environments.push(english);
      console.log(`匹配到环境: ${chinese} -> ${english}`);
    }
  }
  
  for (const [chinese, english] of Object.entries(objectMap)) {
    if (contentLower.includes(chinese)) {
      analysis.objects.push(english);
      console.log(`匹配到物品: ${chinese} -> ${english}`);
    }
  }
  
  for (const [chinese, english] of Object.entries(peopleMap)) {
    if (contentLower.includes(chinese)) {
      analysis.people.push(english);
      console.log(`匹配到人物: ${chinese} -> ${english}`);
    }
  }
  
  for (const [chinese, english] of Object.entries(activityMap)) {
    if (contentLower.includes(chinese)) {
      analysis.activities.push(english);
      console.log(`匹配到活动: ${chinese} -> ${english}`);
    }
  }
  
  // 特殊组合识别
  if (contentLower.includes('一起') && contentLower.includes('打篮球')) {
    analysis.actions.push('playing basketball together');
    analysis.activities.push('team sports and cooperation');
    console.log('识别到特殊组合: 一起打篮球');
  }
  
  if (contentLower.includes('学会了') && contentLower.includes('分享')) {
    analysis.activities.push('learning about sharing and kindness');
    console.log('识别到特殊组合: 学会分享');
  }
  
  if (contentLower.includes('看到') && contentLower.includes('星空')) {
    analysis.actions.push('looking up at and observing');
    analysis.environments.push('under a magical starry night sky');
    analysis.objects.push('twinkling stars in the sky');
    console.log('识别到特殊组合: 看到星空');
  }
  
  if (contentLower.includes('天空') && contentLower.includes('星')) {
    analysis.environments.push('under a beautiful starry sky');
    analysis.objects.push('twinkling stars in the night sky');
    console.log('识别到特殊组合: 天空中的星');
  }
  
  console.log('最终分析结果:', analysis);
  return analysis;
}

/**
 * 构建插画生成提示词
 */
function buildIllustrationPrompt(pageData, characterData, useMinimalCharacterDescription = false) {
  // 根据模式选择角色描述级别
  let characterDescription;
  if (useMinimalCharacterDescription) {
    // 最小化角色描述（用于图生图模式，因为已经有参考图片）
    characterDescription = `the main character`;
  } else {
    // 完整角色描述（用于文生图模式）
    characterDescription = generateCharacterDescription(characterData);
  }
  
  // 优先使用sceneDescription，如果没有则基于页面内容生成
  let sceneDescription = pageData.sceneDescription;
  
  if (!sceneDescription) {
    // 如果没有场景描述，尝试从页面内容生成
    const pageContent = pageData.content || pageData.text || '';
    if (pageContent.trim().length > 0) {
      console.log('从页面内容生成场景描述:', pageContent);
      // 使用本地分析生成场景描述
      const analysis = analyzeContentKeywords(pageContent);
      sceneDescription = generateSceneFromAnalysis(analysis, characterData);
    } else {
      sceneDescription = 'in a safe and friendly children\'s book scene';
    }
  }
  
  console.log('最终场景描述:', sceneDescription);
  console.log('角色描述模式:', useMinimalCharacterDescription ? '简化模式' : '完整模式');
  
  // 确保提示词完全是英文，避免图片中出现文字，强化无文字指令
  return `Children's book illustration, ${characterDescription} ${sceneDescription}, cute cartoon style, simple 2D art, bright colors, child-friendly, educational, wholesome, appropriate for children aged 3-7, clean background, storybook style by Flavia Sorrentino, NO TEXT, NO WORDS, NO LETTERS, NO CHINESE CHARACTERS, NO WRITING, illustration only, pure visual storytelling, text-free artwork`;
}

/**
 * 根据分析结果生成场景描述
 */
function generateSceneFromAnalysis(analysis, characterData) {
  const characterAge = characterData.age || 6;
  const characterGender = characterData.gender === 'boy' ? 'boy' : characterData.gender === 'girl' ? 'girl' : 'child';
  
  let sceneDescription = `A ${characterAge}-year-old ${characterGender}`;
  
  // 添加动作
  if (analysis.actions.length > 0) {
    sceneDescription += ` ${analysis.actions[0]}`;
  }
  
  // 添加环境
  if (analysis.environments.length > 0) {
    sceneDescription += ` ${analysis.environments[0]}`;
  } else {
    sceneDescription += ' in a safe and friendly environment';
  }
  
  // 添加情感
  if (analysis.emotions.length > 0) {
    sceneDescription += `, ${analysis.emotions[0]}`;
  }
  
  // 添加物品
  if (analysis.objects.length > 0) {
    sceneDescription += `, with ${analysis.objects[0]}`;
  }
  
  return sceneDescription;
}

/**
 * 构建简化的插画生成提示词（用于重试）
 */
function buildSimpleIllustrationPrompt(pageData, characterData) {
  const characterDescription = generateCharacterDescription(characterData);
  
  // 简化场景描述，只保留核心内容
  const content = pageData.content || pageData.sceneDescription || '';
  const simpleScene = content.length > 50 ? content.substring(0, 50) + '...' : content;
  
  return `${characterDescription} in a children's book scene, ${simpleScene}, cartoon style, bright colors, safe for children`;
}

/**
 * 生成角色描述
 */
function generateCharacterDescription(character) {
  if (character.identity === 'human') {
    const genderDesc = character.gender === 'boy' ? 'boy' : character.gender === 'girl' ? 'girl' : 'child';
    return `a friendly ${character.age || 6}-year-old ${genderDesc} named ${character.name}`;
  } else {
    return `a cute cartoon ${character.name || 'character'}`;
  }
}

/**
 * 生成回退emoji
 */
function generateFallbackEmoji(pageData, characterData) {
  // 根据内容生成相关emoji
  const content = (pageData.content || '').toLowerCase();
  
  // 场景相关的emoji
  if (content.includes('公园') || content.includes('park')) return '🌳';
  if (content.includes('学校') || content.includes('school')) return '🏫';
  if (content.includes('家') || content.includes('home')) return '🏠';
  if (content.includes('朋友') || content.includes('friend')) return '👫';
  if (content.includes('玩') || content.includes('play')) return '🎈';
  if (content.includes('学习') || content.includes('learn')) return '📚';
  if (content.includes('吃') || content.includes('eat')) return '🍎';
  if (content.includes('睡觉') || content.includes('sleep')) return '😴';
  if (content.includes('开心') || content.includes('happy')) return '😊';
  if (content.includes('动物') || content.includes('animal')) return '🐾';
  if (content.includes('花') || content.includes('flower')) return '🌸';
  if (content.includes('太阳') || content.includes('sun')) return '☀️';
  if (content.includes('月亮') || content.includes('moon')) return '🌙';
  if (content.includes('星星') || content.includes('star')) return '⭐';
  
  // 角色相关的emoji
  if (characterData.identity === 'human') {
    if (characterData.gender === 'boy') return '👦';
    if (characterData.gender === 'girl') return '👧';
    return '🧒';
  }
  
  // 默认emoji
  const defaultEmojis = ['🌈', '🦋', '🌺', '🍀', '🎨', '📖', '🎭', '🎪', '🎯', '🎪'];
  const pageNumber = pageData.pageNumber || 1;
  return defaultEmojis[pageNumber % defaultEmojis.length];
} 