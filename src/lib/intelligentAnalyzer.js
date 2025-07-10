/**
 * 智能分析模块
 * 通过调用通义千问API深度理解用户自定义内容
 * 确保生成的插画描述完全符合用户的想法和意图
 */

import { callQwenChat } from './qwen.js';

/**
 * 用户意图智能分析系统
 */
class UserIntentAnalyzer {
  constructor() {
    this.cache = new Map(); // 缓存分析结果
    this.analysisHistory = []; // 分析历史
  }

  /**
   * 全面分析用户的角色设定意图
   */
  async analyzeCharacterIntent(characterData) {
    console.log('🧠 开始智能分析用户角色设定意图...');
    
    const cacheKey = `character_${JSON.stringify(characterData)}`;
    if (this.cache.has(cacheKey)) {
      console.log('📋 使用缓存的角色分析结果');
      return this.cache.get(cacheKey);
    }

    const analysisPrompt = `作为专业的儿童心理学家和教育专家，请深度分析以下用户的角色设定，理解其真正的创作意图：

用户角色设定：
- 角色名称：${characterData.name || '未设定'}
- 角色身份：${characterData.identity || '未设定'}
- 自定义身份：${characterData.customIdentity || '未设定'}
- 角色描述：${characterData.description || '未设定'}
- 年龄：${characterData.age || '未设定'}
- 性格特点：${characterData.personality || '未设定'}
- 选择的艺术风格：${characterData.artStyle || '未设定'}

请进行以下深度分析并以JSON格式返回：

{
  "characterType": {
    "category": "角色类别（如：动物、人类、机器人、食物等）",
    "species": "具体物种（如：狗、猫、熊等）",
    "isAnthropomorphic": "是否拟人化",
    "confidence": "分析置信度(0-100)"
  },
  "userIntent": {
    "emotionalTone": "用户期望的情感基调（如：温馨、活泼、勇敢等）",
    "educationalGoal": "推测的教育目标",
    "targetAudience": "目标受众特征",
    "culturalContext": "文化背景考虑"
  },
  "visualCharacteristics": {
    "keyFeatures": ["核心视觉特征1", "核心视觉特征2", "核心视觉特征3"],
    "preferredStyle": "推荐的视觉风格描述",
    "colorScheme": "建议的色彩方案",
    "personalityTraits": ["从描述中提取的性格特征1", "特征2"]
  },
  "consistencyGuidelines": {
    "mustHaveFeatures": ["必须保持的特征1", "特征2"],
    "flexibleElements": ["可以变化的元素1", "元素2"],
    "avoidElements": ["应该避免的元素1", "元素2"]
  },
  "recommendedEnhancements": {
    "characterDescription": "优化后的角色描述",
    "sceneSettings": ["推荐的场景设置1", "设置2"],
    "interactionStyles": ["推荐的互动方式1", "方式2"]
  }
}

请确保分析深度理解用户的创作意图，考虑儿童心理学和教育价值。`;

    try {
      const response = await callQwenChat({
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3
      }, 'CHARACTER_ANALYSIS');

      if (response?.choices?.[0]?.message?.content) {
        const analysisText = response.choices[0].message.content.trim();
        console.log('🧠 通义千问角色分析结果:', analysisText);
        
        // 解析JSON结果
        const analysisResult = this.parseAnalysisResult(analysisText);
        
        // 缓存结果
        this.cache.set(cacheKey, analysisResult);
        this.analysisHistory.push({
          type: 'character',
          timestamp: Date.now(),
          input: characterData,
          result: analysisResult
        });
        
        console.log('✅ 角色意图分析完成');
        return analysisResult;
      }
    } catch (error) {
      console.error('❌ 角色意图分析失败:', error);
      return this.generateFallbackCharacterAnalysis(characterData);
    }
  }

  /**
   * 智能分析故事内容和用户期望
   */
  async analyzeStoryContentIntent(storyData, contentData, characterAnalysis) {
    console.log('🧠 开始智能分析用户故事内容意图...');

    const analysisPrompt = `作为专业的儿童文学创作专家，请深度分析用户的故事设定意图：

故事设定：
- 故事类型：${storyData.type || '未设定'}
- 故事页数：${storyData.pages || '未设定'}
- 故事背景：${storyData.setting || '未设定'}

内容设定：
- 教育主题：${contentData.educationalTopic || contentData.finalTopic || contentData.selectedTopic || '未设定'}
- 自定义内容：${contentData.customContent || '未设定'}
- 内容模式：${contentData.mode || '未设定'}
- 教育目标：${contentData.educationalGoals || '未设定'}

角色分析结果：
${JSON.stringify(characterAnalysis, null, 2)}

请分析用户的真正创作意图并以JSON格式返回：

{
  "storyIntent": {
    "mainTheme": "故事主题",
    "emotionalJourney": "情感发展路径",
    "educationalValue": "教育价值分析",
    "narrativeStyle": "叙事风格建议"
  },
  "sceneRequirements": {
    "keyScenes": ["关键场景1", "场景2", "场景3"],
    "emotionalBeats": ["情感节点1", "节点2"],
    "visualMoments": ["重要视觉时刻1", "时刻2"]
  },
  "characterDevelopment": {
    "growthArc": "角色成长弧线",
    "keyMoments": ["关键时刻1", "时刻2"],
    "relationshipDynamics": "人际关系动态"
  },
  "illustrationGuidance": {
    "visualTone": "视觉基调",
    "sceneComposition": "场景构图建议",
    "characterExpressions": ["表情建议1", "建议2"],
    "environmentElements": ["环境元素1", "元素2"]
  }
}`;

    try {
      const response = await callQwenChat({
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3
      }, 'STORY_ANALYSIS');

      if (response?.choices?.[0]?.message?.content) {
        const analysisText = response.choices[0].message.content.trim();
        console.log('🧠 通义千问故事分析结果:', analysisText);
        
        const analysisResult = this.parseAnalysisResult(analysisText);
        console.log('✅ 故事意图分析完成');
        return analysisResult;
      }
    } catch (error) {
      console.error('❌ 故事意图分析失败:', error);
      return this.generateFallbackStoryAnalysis(storyData, contentData);
    }
  }

  /**
   * 智能优化插画描述
   */
  async optimizeIllustrationPrompt(originalPrompt, pageContent, characterAnalysis, storyAnalysis) {
    console.log('🧠 开始智能优化插画描述...');

    const optimizationPrompt = `作为专业的插画师和儿童心理学专家，请根据深度分析结果优化插画描述：

原始插画描述：
${originalPrompt}

页面内容：
${pageContent}

角色分析结果：
${JSON.stringify(characterAnalysis, null, 2)}

故事分析结果：
${JSON.stringify(storyAnalysis, null, 2)}

请优化插画描述，确保：
1. 完全符合用户的创作意图
2. 体现角色的核心特征和一致性
3. 传达正确的情感和教育价值
4. 适合自闭症儿童的视觉需求
5. 确保配角与主角的物种一致性

请返回JSON格式的优化建议：

{
  "optimizedPrompt": "优化后的完整英文插画描述",
  "keyImprovements": ["改进点1", "改进点2", "改进点3"],
  "characterConsistency": "角色一致性要求",
  "emotionalTone": "情感基调描述",
  "educationalElements": ["教育元素1", "元素2"],
  "visualComposition": "视觉构图建议",
  "secondaryCharacters": "配角描述优化",
  "environmentDetails": "环境细节建议"
}`;

    try {
      const response = await callQwenChat({
        messages: [{ role: 'user', content: optimizationPrompt }],
        temperature: 0.3
      }, 'ILLUSTRATION_OPTIMIZATION');

      if (response?.choices?.[0]?.message?.content) {
        const optimizationText = response.choices[0].message.content.trim();
        console.log('🧠 通义千问插画优化结果:', optimizationText);
        
        const optimizationResult = this.parseAnalysisResult(optimizationText);
        console.log('✅ 插画描述优化完成');
        return optimizationResult;
      }
    } catch (error) {
      console.error('❌ 插画描述优化失败:', error);
      return {
        optimizedPrompt: originalPrompt,
        keyImprovements: ['使用原始描述'],
        characterConsistency: '保持基本一致性',
        emotionalTone: '温馨友好',
        educationalElements: ['基础教育价值'],
        visualComposition: '简洁明了',
        secondaryCharacters: '基础描述',
        environmentDetails: '简单环境'
      };
    }
  }

  /**
   * 解析分析结果
   */
  parseAnalysisResult(analysisText) {
    try {
      // 清理文本，提取JSON部分
      let cleanText = analysisText;
      
      // 移除markdown代码块
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // 查找JSON对象
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果找不到JSON，尝试直接解析
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('❌ 解析分析结果失败:', error);
      return null;
    }
  }

  /**
   * 生成备用角色分析
   */
  generateFallbackCharacterAnalysis(characterData) {
    return {
      characterType: {
        category: "通用角色",
        species: "未确定",
        isAnthropomorphic: true,
        confidence: 50
      },
      userIntent: {
        emotionalTone: "温馨友好",
        educationalGoal: "品格教育",
        targetAudience: "自闭症儿童",
        culturalContext: "中文教育环境"
      },
      visualCharacteristics: {
        keyFeatures: ["友好表情", "明亮色彩", "简洁设计"],
        preferredStyle: "儿童插画风格",
        colorScheme: "温暖色调",
        personalityTraits: ["友善", "积极"]
      },
      consistencyGuidelines: {
        mustHaveFeatures: ["一致的外观", "相同的服装"],
        flexibleElements: ["背景", "道具"],
        avoidElements: ["复杂细节", "暗淡色彩"]
      },
      recommendedEnhancements: {
        characterDescription: characterData.description || "可爱的主角",
        sceneSettings: ["日常生活场景"],
        interactionStyles: ["友好互动"]
      }
    };
  }

  /**
   * 生成备用故事分析
   */
  generateFallbackStoryAnalysis(storyData, contentData) {
    return {
      storyIntent: {
        mainTheme: "成长学习",
        emotionalJourney: "从困惑到理解",
        educationalValue: "品格培养",
        narrativeStyle: "简洁明了"
      },
      sceneRequirements: {
        keyScenes: ["开始", "学习", "成长"],
        emotionalBeats: ["好奇", "努力", "成功"],
        visualMoments: ["关键互动", "情感表达"]
      },
      characterDevelopment: {
        growthArc: "逐步成长",
        keyMoments: ["遇到问题", "寻求帮助", "解决问题"],
        relationshipDynamics: "友好合作"
      },
      illustrationGuidance: {
        visualTone: "温馨明亮",
        sceneComposition: "简洁清晰",
        characterExpressions: ["友好", "专注", "开心"],
        environmentElements: ["安全环境", "教育元素"]
      }
    };
  }

  /**
   * 获取分析历史
   */
  getAnalysisHistory() {
    return this.analysisHistory;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
    this.analysisHistory = [];
    console.log('🧹 智能分析缓存已清理');
  }
}

// 创建全局分析器实例
const globalAnalyzer = new UserIntentAnalyzer();

/**
 * 全面的用户意图分析和插画优化
 */
export async function analyzeAndOptimizeUserIntent({
  characterData,
  storyData,
  contentData,
  pageContent,
  originalPrompt
}) {
  console.log('🚀 开始全面的用户意图分析和优化...');

  try {
    // 1. 分析角色设定意图
    const characterAnalysis = await globalAnalyzer.analyzeCharacterIntent(characterData);
    console.log('✅ 角色分析完成:', characterAnalysis);

    // 2. 分析故事内容意图
    const storyAnalysis = await globalAnalyzer.analyzeStoryContentIntent(storyData, contentData, characterAnalysis);
    console.log('✅ 故事分析完成:', storyAnalysis);

    // 3. 优化插画描述
    const illustrationOptimization = await globalAnalyzer.optimizeIllustrationPrompt(
      originalPrompt,
      pageContent,
      characterAnalysis,
      storyAnalysis
    );
    console.log('✅ 插画优化完成:', illustrationOptimization);

    return {
      success: true,
      characterAnalysis,
      storyAnalysis,
      illustrationOptimization,
      finalPrompt: illustrationOptimization.optimizedPrompt,
      metadata: {
        timestamp: Date.now(),
        confidence: characterAnalysis.characterType.confidence,
        analysisVersion: '1.0'
      }
    };

  } catch (error) {
    console.error('❌ 用户意图分析失败:', error);
    return {
      success: false,
      error: error.message,
      fallbackPrompt: originalPrompt,
      metadata: {
        timestamp: Date.now(),
        usedFallback: true
      }
    };
  }
}

/**
 * 快速角色分析（用于实时场景）
 */
export async function quickCharacterAnalysis(characterData) {
  return await globalAnalyzer.analyzeCharacterIntent(characterData);
}

/**
 * 获取智能分析器实例
 */
export function getAnalyzer() {
  return globalAnalyzer;
}

export default {
  analyzeAndOptimizeUserIntent,
  quickCharacterAnalysis,
  getAnalyzer
}; 