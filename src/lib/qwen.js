import { generateAutismFriendlyPrompt, extractSceneInfo, generateCharacterDescription } from './autismFriendlyPrompts.js';
import { generateTextToImageComplete, generateImageToImageComplete } from './liblibai.js';
import { 
  generateMasterCharacterImage, 
  generateStoryIllustrationWithMaster,
  getStandardCharacterDefinition,
  getEnhancedCharacterDefinition
} from './characterConsistency.js';
import { buildMultilingualPrompt, translateCharacterDescriptionToEnglish } from './promptTranslator.js';

// 获取后端API地址 - 使用相对路径
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 专门的JSON清理函数，处理通义千问返回的各种格式问题
 * @param {string} jsonString - 需要清理的JSON字符串
 * @returns {string} 清理后的JSON字符串
 */
export function cleanJsonString(jsonString) {
  console.log('🧹 开始清理JSON字符串，原始长度:', jsonString.length);
  
  // 首先移除markdown代码块
  let cleaned = jsonString
    .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
    .replace(/^```\s*/, '').replace(/\s*```$/, '')
    .trim();
  
  console.log('🧹 移除markdown后长度:', cleaned.length);
  
  // 定义中文引号字符 (使用Unicode编码确保兼容性)
  const chineseLeftQuote = String.fromCharCode(8220);   // " (U+201C)
  const chineseRightQuote = String.fromCharCode(8221);  // " (U+201D)
  const chineseLeftSingle = String.fromCharCode(8216);  // ' (U+2018)
  const chineseRightSingle = String.fromCharCode(8217); // ' (U+2019)
  
  // 首先清理所有不可见字符和特殊字符，但保留必要的JSON字符
  cleaned = cleaned
    // 清理各种隐藏的Unicode字符
    .replace(/[\u200B-\u200D\uFEFF]/g, '')      // 零宽字符
    .replace(/[\u2028\u2029]/g, ' ')            // 行分隔符和段分隔符
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 控制字符（但保留\n, \r, \t）
    .replace(/\r\n/g, '\n')                      // 统一换行符
    .replace(/\r/g, '\n')                        // 统一换行符
    .replace(/\t/g, ' ')                         // 制表符替换为空格
    .trim();
  
  // 简单但有效的字符串值清理
  cleaned = cleaned.replace(/"([^"]*?)":\s*"((?:[^"\\]|\\.)*)"/g, (match, key, value) => {
    console.log(`🔧 处理键值对: "${key}": "${value}"`);
    
    // 简单清理字符串值
    let fixedValue = value
      // 处理中文引号
      .replace(new RegExp(chineseLeftSingle, 'g'), "'")    
      .replace(new RegExp(chineseRightSingle, 'g'), "'")   
      .replace(new RegExp(chineseLeftQuote, 'g'), "'")     // 改为普通单引号
      .replace(new RegExp(chineseRightQuote, 'g'), "'")    // 改为普通单引号
      // 处理其他特殊引号
      .replace(/[""]/g, "'")                              // 智能引号改为普通单引号
      .replace(/['']/g, "'")                              // 智能单引号
      // 清理换行符
      .replace(/\n/g, ' ')                                
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ');
    
    console.log(`✅ 修复后: "${key}": "${fixedValue}"`);
    return `"${key}": "${fixedValue}"`;
  });
  
  // 处理数组字符串值
  cleaned = cleaned.replace(/\[\s*"([^"]*?)"\s*,?\s*\]/g, (match, items) => {
    const cleanItems = items.split('",').map(item => {
      const cleanItem = item.replace(/^"/, '').replace(/"$/, '')
        .replace(/[""]/g, '\\"')
        .replace(/['']/g, "'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
      return `"${cleanItem}"`;
    });
    return `[${cleanItems.join(', ')}]`;
  });
  
  // 处理其他常见的JSON格式问题
  cleaned = cleaned
    // 清理多余的逗号
    .replace(/,\s*}/g, '}')                // 清理结尾多余逗号
    .replace(/,\s*]/g, ']')                // 清理数组结尾多余逗号
    // 标准化空格
    .replace(/\s+/g, ' ')                  // 多个空格替换为单个空格
    .replace(/\s*:\s*/g, ': ')             // 标准化冒号后空格
    .replace(/\s*,\s*/g, ', ')             // 标准化逗号后空格
    .trim();
  
  console.log('🧹 最终清理后长度:', cleaned.length);
  console.log('🧹 清理后的JSON前200字符:', cleaned.substring(0, 200));
  
  return cleaned;
}

/**
 * 高级JSON解析函数，能够处理各种格式问题
 * @param {string} content - 要解析的内容
 * @returns {Object} 解析后的JSON对象
 */
// 添加错误位置分析工具
function analyzeJsonError(jsonString, error) {
  const positionMatch = error.message.match(/position (\d+)/);
  if (positionMatch) {
    const position = parseInt(positionMatch[1]);
    console.log(`🔍 JSON解析错误位置: ${position}`);
    
    // 显示错误位置前后的内容
    const start = Math.max(0, position - 50);
    const end = Math.min(jsonString.length, position + 50);
    const context = jsonString.substring(start, end);
    console.log('🔍 错误位置前后内容:', context);
    console.log('🔍 错误位置字符:', jsonString.charAt(position));
    console.log('🔍 错误位置字符代码:', jsonString.charCodeAt(position));
    
    // 分析错误类型
    if (error.message.includes('Expected property name')) {
      console.log('🔍 错误类型: 期望属性名 - 可能是多余的逗号或缺少属性名');
    } else if (error.message.includes('Expected')) {
      console.log('🔍 错误类型: 期望特定字符 - 可能是格式问题');
    }
  }
}

// 强化JSON修复方法
function aggressiveJsonFix(jsonString) {
  console.log('🔧 开始强化JSON修复...');
  
  let fixed = jsonString;
  
  // 1. 清理各种空白字符和不可见字符
  fixed = fixed
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // 清理控制字符
    .replace(/[\u200B-\u200D\uFEFF]/g, '')  // 清理零宽字符
    .replace(/[\u2028\u2029]/g, ' ')        // 行分隔符
    .replace(/\r\n/g, '\n')                 // 统一换行符
    .replace(/\r/g, '\n')                   // 统一换行符
    .replace(/\t/g, ' ')                    // 制表符
    .replace(/\n/g, ' ')                    // 换行符替换为空格
    .replace(/\s+/g, ' ')                   // 多个空格合并
    .trim();
  
  // 2. 修复常见的JSON格式问题
  fixed = fixed
    // 清理多余的逗号（这是最常见的"Expected property name"错误原因）
    .replace(/,\s*,/g, ',')                 // 双重逗号
    .replace(/,\s*}/g, '}')                 // 对象结尾的逗号
    .replace(/,\s*]/g, ']')                 // 数组结尾的逗号
    // 修复缺少引号的属性名
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
    // 标准化冒号和逗号
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*,\s*/g, ',')
    // 确保字符串值用双引号包围
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    // 处理空值
    .replace(/:\s*null\s*,/g, ':"",')
    .replace(/:\s*undefined\s*,/g, ':"",');
  
  // 3. 特殊修复：处理可能的编码问题
  fixed = fixed
    .replace(/"/g, '"')                     // 智能引号
    .replace(/"/g, '"')                     // 智能引号
    .replace(/'/g, "'")                     // 智能单引号
    .replace(/'/g, "'");                    // 智能单引号
  
  // 4. 最后的清理
  fixed = fixed
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*\[\s*/g, '[')
    .replace(/\s*\]\s*/g, ']')
    .trim();
  
  console.log('🔧 强化修复完成，原长度:', jsonString.length, '修复后长度:', fixed.length);
  return fixed;
}

export function parseJsonContent(content) {
  console.log('🔍 开始解析JSON内容，原始长度:', content.length);
  
  // 首先尝试直接解析清理后的内容
  let cleanedContent;
  try {
    cleanedContent = cleanJsonString(content);
    console.log('🔍 尝试解析清理后的内容...');
    return JSON.parse(cleanedContent);
  } catch (error) {
    console.log('直接解析失败，错误:', error.message);
    analyzeJsonError(cleanedContent, error);
  }

  // 方法1：寻找最完整的JSON结构
  console.log('🔍 方法1: 寻找JSON结构...');
  const jsonMatches = content.match(/\{[\s\S]*\}/g);
  if (jsonMatches && jsonMatches.length > 0) {
    for (const match of jsonMatches.sort((a, b) => b.length - a.length)) {
      try {
        const cleanedMatch = cleanJsonString(match);
        console.log('🔍 尝试解析匹配项，长度:', match.length);
        return JSON.parse(cleanedMatch);
      } catch (error) {
        console.log(`匹配项解析失败，尝试下一个: ${error.message}`);
        analyzeJsonError(cleanedMatch, error);
        continue;
      }
    }
  }

  // 方法2：强化修复（针对"Expected property name"错误）
  console.log('🔍 方法2: 强化修复...');
  let fixedContent2;
  try {
    fixedContent2 = content;
    
    // 移除markdown包装
    fixedContent2 = fixedContent2
      .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
      .replace(/^```\s*/, '').replace(/\s*```$/, '')
      .trim();
    
    // 找到JSON开始和结束
    const startIdx = fixedContent2.indexOf('{');
    const endIdx = fixedContent2.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      fixedContent2 = fixedContent2.substring(startIdx, endIdx + 1);
      
      // 使用强化修复方法
      fixedContent2 = aggressiveJsonFix(fixedContent2);
      
      console.log('🔍 强化修复后的JSON前200字符:', fixedContent2.substring(0, 200));
      return JSON.parse(fixedContent2);
    }
  } catch (error) {
    console.log(`强化修复失败: ${error.message}`);
    if (fixedContent2) {
      analyzeJsonError(fixedContent2, error);
    }
  }

  // 方法3：智能修复常见问题
  console.log('🔍 方法3: 智能修复...');
  let fixedContent3;
  try {
    fixedContent3 = content;
    
    // 移除markdown包装
    fixedContent3 = fixedContent3
      .replace(/^```json\s*/i, '').replace(/\s*```$/, '')
      .replace(/^```\s*/, '').replace(/\s*```$/, '')
      .trim();
    
    // 找到JSON开始和结束
    const startIdx = fixedContent3.indexOf('{');
    const endIdx = fixedContent3.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      fixedContent3 = fixedContent3.substring(startIdx, endIdx + 1);
      
      // 特殊修复：处理类似 "6 years old" 的值
      fixedContent3 = fixedContent3.replace(/"([^"]*)":\s*"([^"]*\s+[^"]*)"/g, (match, key, value) => {
        // 简单清理包含空格的值
        const cleanValue = value.replace(/\s+/g, ' ').trim();
        return `"${key}": "${cleanValue}"`;
      });
      
      // 修复常见的JSON问题
      fixedContent3 = fixedContent3
        .replace(/,\s*}/g, '}')                 // 移除尾随逗号
        .replace(/,\s*]/g, ']')                 // 移除数组尾随逗号
        .replace(/\n/g, ' ')                    // 换行符替换为空格
        .replace(/\r/g, ' ')                    // 回车符替换为空格
        .replace(/\t/g, ' ')                    // 制表符替换为空格
        .replace(/\s+/g, ' ')                   // 多个空格合并
        .replace(/\s*:\s*/g, ':')               // 标准化冒号
        .replace(/\s*,\s*/g, ',');              // 标准化逗号
      
      console.log('🔍 智能修复后的JSON前200字符:', fixedContent3.substring(0, 200));
      return JSON.parse(fixedContent3);
    }
  } catch (error) {
    console.log(`智能修复失败: ${error.message}`);
    if (fixedContent3) {
      analyzeJsonError(fixedContent3, error);
    }
  }

  // 方法4：最后的括号匹配尝试
  console.log('🔍 方法4: 括号匹配...');
  let fixedContent4;
  try {
    fixedContent4 = content;
    const jsonStart = fixedContent4.search(/\{[\s\S]*"[^"]*"[\s\S]*:/);
    if (jsonStart !== -1) {
      fixedContent4 = fixedContent4.substring(jsonStart);
      
      // 找到匹配的结束括号
      let braceCount = 0;
      let endPos = -1;
      
      for (let i = 0; i < fixedContent4.length; i++) {
        if (fixedContent4[i] === '{') braceCount++;
        else if (fixedContent4[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endPos = i;
            break;
          }
        }
      }
      
      if (endPos !== -1) {
        fixedContent4 = fixedContent4.substring(0, endPos + 1);
        const cleanedFixed = cleanJsonString(fixedContent4);
        return JSON.parse(cleanedFixed);
      }
    }
  } catch (error) {
    console.log(`括号匹配失败: ${error.message}`);
    if (fixedContent4) {
      analyzeJsonError(fixedContent4, error);
    }
  }

  console.error('❌ 所有JSON解析方法都失败了');
  throw new Error('无法解析JSON内容，所有方法都失败了');
}

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
export async function callQwenChat(options, taskType = 'FAST_PROCESSING', retryCount = 0, maxRetries = 3) {
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
      max_tokens: Math.max(1, maxTokens),  // 确保至少为1
      top_p: options.top_p || 0.95,        // 核采样参数，提高输出稳定性
      stream: false                        // 明确设置为非流式输出
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
 * @param {boolean} forceAPI - 是否强制使用API（自定义角色时为true）
 * @returns {Promise<string>} 优化后的角色描述
 */
export async function optimizeCharacterDescription(userDescription, basicInfo = {}, forceAPI = false) {
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 检查是否强制使用API（自定义角色功能）
  if (forceAPI) {
    console.log('🚀 自定义角色模式 - 强制使用通义千问API进行角色优化');
  } else {
    // 非自定义角色时，优先使用本地优化逻辑
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
  }
  
  if (!apiController.canCallAPI() && !forceAPI) {
    console.log('⚠️ API调用已达限制，使用简化本地处理');
    return generateFallbackCharacterDescription(userDescription, basicInfo);
  }

  try {
    console.log('🤖 使用通义千问进行角色优化...');
    apiController.recordAPICall();
    
    // 针对自定义角色构建更详细的提示词
    const promptContent = forceAPI 
      ? `请谨慎优化这个角色描述，严格保持用户的核心特征：

原始描述："${userDescription}"
角色信息：${age}岁${gender === 'boy' ? '男孩' : gender === 'girl' ? '女孩' : '孩子'}

【重要规则】：
1. 绝对保持用户指定的核心特征：
   - 如果用户说是动物（如小狗、小猫），必须保持动物身份，不能变成人类
   - 如果用户指定了颜色（如黄色、蓝色），必须保持这些颜色
   - 如果用户指定了基本特征（如大眼睛、黑头发），必须保持这些特征
   - 如果用户指定了服装（如蓝色衣服），必须保持服装描述

2. 只可以适当补充细节，不可以改变核心特征：
   - 可以稍微丰富外貌描述（如眼睛的形状、头发的质感）
   - 可以稍微丰富服装描述（如衣服的款式）
   - 可以添加简单的表情或神态
   - 绝对不能改变动物类型、基本颜色、核心特征

3. 控制在60字内，语言生动但保守
4. 适合儿童绘本风格
5. 中文回复

请基于上述规则优化描述：`
      : `请优化角色描述："${userDescription}"，${age}岁${gender === 'boy' ? '男孩' : gender === 'girl' ? '女孩' : '孩子'}，补充外貌、服装、表情，50字内：`;
    
    const response = await callQwenChat({
      messages: [
        {
          role: "user",
          content: promptContent
        }
      ],
      temperature: 0.7,
      max_tokens: forceAPI ? 150 : 100
    }, 'CHARACTER_OPTIMIZATION');

    const optimizedDescription = response.choices[0].message.content.trim();
    console.log('✅ 通义千问角色优化完成:', { 
      original: userDescription, 
      enhanced: optimizedDescription,
      mode: forceAPI ? 'API强制模式' : '标准模式'
    });
    
    return optimizedDescription;
    
  } catch (error) {
    console.error('通义千问角色优化失败，使用本地备用方案:', error);
    if (forceAPI) {
      console.warn('⚠️ 自定义角色API优化失败，降级到增强本地处理');
      // 自定义角色时，即使API失败也使用增强的本地处理
      return optimizeCharacterLocally(userDescription, basicInfo, true); // true表示增强模式
    }
    return generateFallbackCharacterDescription(userDescription, basicInfo);
  }
}

/**
 * 使用通义千问翻译描述为英文
 * @param {string} description - 中文描述
 * @param {Object} basicInfo - 基础信息
 * @param {boolean} forceAPI - 是否强制使用API（自定义角色时为true）
 * @returns {Promise<string>} 英文翻译
 */
export async function translateDescriptionToEnglish(description, basicInfo = {}, forceAPI = false) {
  // 检查是否强制使用API（自定义角色功能）
  if (forceAPI) {
    console.log('🚀 自定义角色模式 - 强制使用通义千问API进行翻译');
  } else {
    // 非自定义角色时，优先使用本地翻译逻辑
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
  }
  
  if (!apiController.canCallAPI() && !forceAPI) {
    console.log('⚠️ API调用已达限制，使用简化本地翻译');
    return generateFallbackTranslation(description, basicInfo);
  }

  try {
    console.log('🤖 使用通义千问进行翻译...');
    apiController.recordAPICall();
    
    // 针对自定义角色构建更详细的翻译提示词
    const promptContent = forceAPI 
      ? `请将以下中文角色描述精确翻译为英文，适用于图像生成AI：

原中文描述："${description}"

翻译要求：
1. 保持所有细节完整（颜色、服装、发型、表情等）
2. 使用适合图像生成的英文描述格式
3. 确保描述生动具体，便于AI理解
4. 语法正确，词汇精准
5. 保持儿童绘本风格的用词
6. 只返回翻译结果，不要额外说明

请直接返回英文翻译：`
      : `请将以下中文描述翻译为英文，保持原意和细节：\n"${description}"`;
    
    const response = await callQwenChat({
      messages: [
        {
          role: "user",
          content: promptContent
        }
      ],
      temperature: 0.3,
      max_tokens: forceAPI ? 250 : 200
    }, 'TRANSLATION');

    const translatedText = response.choices[0].message.content.trim();
    // 清理可能的引号和多余内容
    const cleanTranslation = translatedText.replace(/^["']|["']$/g, '').trim();
    
    console.log('✅ 通义千问翻译完成:', { 
      original: description, 
      translated: cleanTranslation,
      mode: forceAPI ? 'API强制模式' : '标准模式'
    });
    
    return cleanTranslation;
    
  } catch (error) {
    console.error('通义千问翻译失败，使用本地备用方案:', error);
    if (forceAPI) {
      console.warn('⚠️ 自定义角色API翻译失败，降级到增强本地处理');
      // 自定义角色时，即使API失败也尝试更好的本地翻译
      return translateLocally(description, basicInfo) || generateFallbackTranslation(description, basicInfo);
    }
    return generateFallbackTranslation(description, basicInfo);
  }
}

// 本地角色描述优化函数
function optimizeCharacterLocally(userDescription, basicInfo, enhanced = false) {
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 检查缓存（增强模式使用不同的缓存键）
  const cacheKey = `char_${userDescription}_${age}_${gender}_${identity}_${enhanced}`;
  if (LOCAL_PROCESSING.cache.has(cacheKey)) {
    console.log('💾 使用缓存的角色描述');
    return LOCAL_PROCESSING.cache.get(cacheKey);
  }

  let optimized = userDescription;
  
  if (enhanced) {
    // 增强模式：更详细的本地优化（当API失败时的高质量备用方案）
    console.log('🔧 使用增强本地优化模式');
    
    // 保持原有描述的完整性，只进行必要的补充
    if (!optimized.includes('岁')) {
      optimized = `${age}岁的${optimized}`;
    }
    
    // 智能性别匹配
    if (gender === 'boy' && !optimized.includes('男') && !optimized.includes('小男孩')) {
      optimized = optimized.replace(/(?:孩子|小孩|小朋友)/, '小男孩');
    } else if (gender === 'girl' && !optimized.includes('女') && !optimized.includes('小女孩')) {
      optimized = optimized.replace(/(?:孩子|小孩|小朋友)/, '小女孩');
    }
    
    // 保持原有细节，不过度添加
    if (!optimized.includes('眼睛') && !optimized.includes('头发') && !optimized.includes('脸')) {
      // 只在必要时添加基本特征
      optimized += '，有着天真可爱的表情';
    }
    
  } else {
    // 标准模式：简单的本地优化逻辑
    if (!optimized.includes('岁') && !optimized.includes('年龄')) {
      optimized = `${age}岁的${optimized}`;
    }
    
    if (gender === 'boy' && !optimized.includes('男') && !optimized.includes('小男孩')) {
      optimized = optimized.replace(/孩子|小孩/, '小男孩');
    } else if (gender === 'girl' && !optimized.includes('女') && !optimized.includes('小女孩')) {
      optimized = optimized.replace(/孩子|小孩/, '小女孩');
    }
    
    if (!optimized.includes('眼睛') && !optimized.includes('头发')) {
      const features = ['大眼睛', '黑头发', '可爱的笑容'];
      optimized += `，有着${features.join('和')}`;
    }
  }
  
  // 缓存结果
  if (LOCAL_PROCESSING.cache.size >= LOCAL_PROCESSING.maxCacheSize) {
    const oldestKey = LOCAL_PROCESSING.cache.keys().next().value;
    LOCAL_PROCESSING.cache.delete(oldestKey);
  }
  LOCAL_PROCESSING.cache.set(cacheKey, optimized);
  
  return optimized;
}

// 本地翻译函数 - 改进版，避免中英文混杂
function translateLocally(description, basicInfo) {
  const cacheKey = `trans_${description}`;
  if (LOCAL_PROCESSING.cache.has(cacheKey)) {
    console.log('💾 使用缓存的翻译');
    return LOCAL_PROCESSING.cache.get(cacheKey);
  }

  // 尝试使用智能模板匹配进行完整翻译
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 检查是否是常见的角色描述模式
  const patterns = [
    {
      // 匹配：一只6岁的小熊，穿着红色的上衣，蓝色的裤子，有着大眼睛和黑头发和可爱的笑容
      regex: /^一只(\d+)岁的([^，]+)，(.+)$/,
      template: (match) => {
        const age = match[1];
        const animal = match[2];
        const details = match[3];
        
        // 动物类型映射
        const animalMap = {
          '小熊': 'little bear',
          '小兔': 'little rabbit', 
          '小猫': 'little cat',
          '小狗': 'little dog',
          '熊': 'bear',
          '兔子': 'rabbit',
          '猫': 'cat',
          '狗': 'dog'
        };
        
        const englishAnimal = animalMap[animal] || 'cute animal';
        
        // 简化细节描述，使用通用模板
        return `A ${age}-year-old ${englishAnimal} with friendly appearance and cute characteristics`;
      }
    },
    {
      // 匹配：6岁的小男孩/小女孩
      regex: /^(\d+)岁的(小男孩|小女孩|孩子)(.*)$/,
      template: (match) => {
        const age = match[1];
        const gender = match[2] === '小男孩' ? 'boy' : match[2] === '小女孩' ? 'girl' : 'child';
        return `A ${age}-year-old friendly ${gender} with cheerful appearance`;
      }
    }
  ];
  
  // 尝试模式匹配
  for (const pattern of patterns) {
    const match = description.match(pattern.regex);
    if (match) {
      const translated = pattern.template(match);
      
      // 缓存结果
      if (LOCAL_PROCESSING.cache.size >= LOCAL_PROCESSING.maxCacheSize) {
        const oldestKey = LOCAL_PROCESSING.cache.keys().next().value;
        LOCAL_PROCESSING.cache.delete(oldestKey);
      }
      LOCAL_PROCESSING.cache.set(cacheKey, translated);
      
      console.log('🎯 模式匹配翻译成功:', { original: description, translated });
      return translated;
    }
  }
  
  // 如果模式匹配失败，检查是否是简单的角色描述
  if (description.length < 50 && (description.includes('小') || description.includes('岁'))) {
    // 生成基础的英文描述
    const genderText = gender === 'boy' ? 'boy' : gender === 'girl' ? 'girl' : 'child';
    const identityText = identity === 'animal' ? 'cute animal character' : `friendly ${genderText}`;
    const translated = `A ${age}-year-old ${identityText} with charming appearance`;
    
    // 缓存结果
    if (LOCAL_PROCESSING.cache.size >= LOCAL_PROCESSING.maxCacheSize) {
      const oldestKey = LOCAL_PROCESSING.cache.keys().next().value;
      LOCAL_PROCESSING.cache.delete(oldestKey);
    }
    LOCAL_PROCESSING.cache.set(cacheKey, translated);
    
    console.log('🔄 基础模板翻译:', { original: description, translated });
    return translated;
  }
  
  console.log('❌ 本地翻译无法处理，需要API翻译:', description);
  return null; // 无法本地翻译，需要API翻译
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
export async function generatePictureBook({ character, story, content, onProgress, imageEngine, useCharacterConsistency = true, userLanguage = 'zh-CN' }) {
  try {
    // 选择合适的模型
    const modelName = TASK_MODEL_MAPPING['STORY_GENERATION'];
    const modelConfig = QWEN_MODELS[modelName];
    const defaultImageEngine = imageEngine || 'liblibai'; // 默认使用LiblibAI
    
    // 构建多语言提示词（发送给API的始终是英语）
    const promptData = buildMultilingualPrompt({ character, story, content }, userLanguage);

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
          content: promptData.systemPrompt
        },
        {
          role: "user",
          content: promptData.userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: modelConfig.maxTokens
    }, 'STORY_GENERATION');

    console.log('✅ 通义千问API调用成功');
    onProgress && onProgress('解析故事内容...', 40);
    
    // 解析返回的JSON内容
    const rawContent = response.choices[0].message.content;
    console.log('📝 原始API响应:', rawContent);
    
    const storyData = parseJsonContent(rawContent);
    console.log('📖 解析后的故事数据:', storyData);
    
    // 确保stories数组存在
    if (!storyData.pages || !Array.isArray(storyData.pages)) {
      throw new Error('故事数据格式不正确：缺少pages数组');
    }
    
    onProgress && onProgress('故事生成完成，开始生成插画...', 50);
    
    // 生成插画
    const illustrationResult = await generateImagesForPages(
      storyData.pages, 
      character, 
      defaultImageEngine,
      (currentPage, totalPages) => {
        const progress = 50 + (currentPage / totalPages) * 40;
        onProgress && onProgress(`生成第${currentPage}页插画 (${currentPage}/${totalPages})`, progress);
      },
      useCharacterConsistency,
      storyData.secondaryCharacters // 传入次要角色定义
    );
    
    console.log('🎨 所有插画生成完成');
    onProgress && onProgress('绘本创作完成！', 100);
    
    return {
      ...storyData,
      pages: illustrationResult.pages,
      characterDefinition: illustrationResult.characterDefinition,
      masterImageUrl: illustrationResult.masterImageUrl,
      language: userLanguage,
      createdAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ 绘本生成失败:', error);
    
    // 如果是API调用失败，使用备用方案
    if (error.message.includes('API') || error.message.includes('网络')) {
      console.log('🔄 API失败，使用备用生成方案...');
      onProgress && onProgress('使用备用方案生成绘本...', 80);
      
      try {
        const fallbackContent = generateFallbackContent({ character, story, content });
        const illustrationResult = await generateImagesForPages(
          fallbackContent.pages,
          character,
          imageEngine || 'liblibai',
          (currentPage, totalPages) => {
            const progress = 80 + (currentPage / totalPages) * 15;
            onProgress && onProgress(`生成第${currentPage}页插画 (${currentPage}/${totalPages})`, progress);
          },
          useCharacterConsistency,
          null // 备用方案没有次要角色定义
        );
        
        return {
          ...fallbackContent,
          pages: illustrationResult.pages,
          characterDefinition: illustrationResult.characterDefinition,
          masterImageUrl: illustrationResult.masterImageUrl,
          language: userLanguage,
          createdAt: new Date().toISOString(),
          isFallback: true
        };
        
      } catch (fallbackError) {
        console.error('❌ 备用方案也失败了:', fallbackError);
        throw new Error('故事生成失败，请检查网络连接或稍后重试');
      }
    }
    
    throw error;
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

  // 根据主角身份生成其他角色的种族指导
  const getSecondaryCharacterGuidance = (character) => {
    const identity = character.identity || 'human';
    const characterDesc = character.customDescription || character.optimizedDescription || characterDescription;
    
    if (identity === 'animal') {
      // 检测主角是什么动物
      const desc = characterDesc.toLowerCase();
      let animalType = 'animals';
      
      if (desc.includes('dog') || desc.includes('puppy') || desc.includes('狗')) {
        animalType = 'dogs';
      } else if (desc.includes('cat') || desc.includes('kitten') || desc.includes('猫')) {
        animalType = 'cats';
      } else if (desc.includes('rabbit') || desc.includes('bunny') || desc.includes('兔')) {
        animalType = 'rabbits';
      } else if (desc.includes('bear') || desc.includes('熊')) {
        animalType = 'bears';
      } else if (desc.includes('pig') || desc.includes('猪')) {
        animalType = 'pigs';
      } else if (desc.includes('fox') || desc.includes('狐狸')) {
        animalType = 'foxes';
      }
      
      return `
【其他角色指导】
- 家庭成员（如妈妈、爸爸、奶奶、爷爷等）：必须与主角保持同种动物特征，例如主角是小狗，妈妈就是狗妈妈，奶奶就是狗奶奶
- 其他角色：应该是不同的动物朋友，如小猫、小兔子、小熊等，给每个角色一个可爱的名字和简单描述
- 成人角色：如老师、医生、店主等，应该是成年的动物角色，保持友善和专业的形象`;
    } else {
      return `
【其他角色指导】
- 家庭成员（如妈妈、爸爸、奶奶、爷爷等）：应该是人类角色，与主角年龄相适应
- 其他角色：可以是同龄的人类朋友，给每个角色一个名字和简单描述
- 成人角色：如老师、医生、店主等，应该是成年的人类角色，保持友善和专业的形象`;
    }
  };

  const secondaryCharacterGuidance = getSecondaryCharacterGuidance(character);

  return `请为自闭症儿童创作一个既生动有趣又具有深度教育意义的绘本故事。这个故事将被用于特殊教育教学，需要平衡趣味性和教育性。

【角色设定】
- 主角：${characterName}
- 角色描述：${characterDescription}
- 年龄：${character.age || 6}岁
- 性格特点：${character.personality || '活泼开朗、善良友好'}

${secondaryCharacterGuidance}

【故事要求】
- 故事类型：${storyTypes[story.type] || '成长故事'}
- 教学主题：${educationalTopic}
- 故事背景：${story.setting || '日常生活场景'}
- 页数要求：${story.pages || 6}页
- 语言风格：简单易懂但充满感染力

【教育目标】
${content.educationalGoals || `通过故事帮助自闭症儿童学习"${educationalTopic}"，培养相关的社交技能和行为习惯`}

【特殊要求】
1. 语言必须简单直白，适合自闭症儿童理解
2. 情节要有起承转合，但不能太复杂
3. 要有明确的教育价值和行为示范
4. 每页都需要详细的英文插画描述
5. 主角外貌特征在所有页面中必须保持一致
6. 其他角色的物种/身份必须与主角保持一致性（如主角是小狗，家人也应该是狗的形象）
7. 在imagePrompt中明确描述每个角色的具体特征，确保角色识别清晰${contentModeNote}

请严格按照以下JSON格式返回：

\`\`\`json
{
  "title": "故事标题",
  "educationalTheme": "${educationalTopic}",
  "targetAge": "${character.age || 6}岁",
  "secondaryCharacters": [
    {
      "name": "角色名称",
      "description": "简单的中文描述",
      "englishDescription": "详细的英文描述，用于插画生成",
      "relationship": "与主角的关系（如：妈妈、朋友、老师等）"
    }
  ],
  "pages": [
    {
      "pageNumber": 1,
      "text": "第一页的故事文本",
      "imagePrompt": "详细的英文插画描述，包含主角外貌、动作、表情、场景等，如果有其他角色出现，需要明确描述其特征"
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
async function generateImagesForPages(pages, character, imageEngine, onProgress, useCharacterConsistency = false, secondaryCharacters = null) {
  const results = {
    pages: [],
    characterDefinition: null,
    masterImageUrl: null
  };

  // 如果使用角色一致性，直接使用角色设计时生成的图片
  if (useCharacterConsistency) {
    console.log('🎨 使用角色设计时生成的图片...');
    
    // 从角色数据中获取预览图片URL
    const previewImageUrl = character.previewImage;
    
    if (previewImageUrl) {
      console.log('✅ 找到角色预览图片，将用作主角形象:', previewImageUrl);
      results.masterImageUrl = previewImageUrl;
      
      // 获取角色定义
      const { getEnhancedCharacterDefinition, getRecommendedStrategy } = await import('./characterConsistency.js');
      const strategy = getRecommendedStrategy(character);
      results.characterDefinition = await getEnhancedCharacterDefinition(character, strategy);
    } else {
      console.log('⚠️ 未找到角色预览图片，将使用传统模式');
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
      
      if (useCharacterConsistency && results.characterDefinition && results.masterImageUrl) {
        // 使用角色一致性生成
        const result = await generateStoryIllustrationWithMaster(
          page.imagePrompt,
          results.masterImageUrl,
          results.characterDefinition,
          null, // onProgress
          secondaryCharacters
        );
        imageUrl = result.imageUrl;
      } else {
        // 使用标准方式生成
        const imagePrompt = buildLiblibImagePrompt(page, character);
        
        if (imageEngine === 'liblibai') {
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
  
  // 获取用户选择的风格，如果没有则使用默认风格
  let artStyle = 'watercolor illustration style, soft colors, gentle brushstrokes, artistic, painted texture';
  if (character.artStyle && character.artStyle.trim()) {
    artStyle = character.artStyle;
    console.log('🎨 Qwen LiblibAI 使用用户选择的风格:', artStyle);
  } else {
    console.log('🎨 Qwen LiblibAI 使用默认水彩风格:', artStyle);
  }
  
  // 添加质量和风格描述
  const qualityPrompts = [
    'high quality',
    'detailed illustration',
    'children book style',
    'warm colors',
    'friendly atmosphere'
  ];
  
  return `${combinedPrompt}, ${artStyle}, ${qualityPrompts.join(', ')}`;
}

// 生成备用绘本内容（当API失败时使用）
function generateFallbackContent({ character, story, content }) {
  const characterName = character.name || '小主角';
  const educationalTopic = content.educationalTopic || content.finalTopic || '学会分享';
  const pageCount = story.pages || 6; // 使用用户选择的页数
  
  const pages = [];
  
  // 生成用户指定数量的页面
  for (let i = 1; i <= pageCount; i++) {
    let text, imagePrompt;
    
    if (i === 1) {
      text = `${characterName}今天要开始一个新的冒险。`;
      imagePrompt = `A cute child character named ${characterName}, looking excited about starting a new adventure`;
    } else if (i === 2) {
      text = `${characterName}今天要学习${educationalTopic}。`;
      imagePrompt = `${characterName} in a learning situation, looking curious and interested`;
    } else if (i === pageCount) {
      text = `${characterName}很开心，因为学到了新知识。`;
      imagePrompt = `${characterName} celebrating with joy, surrounded by friends or family`;
    } else {
      text = `${characterName}继续学习和成长，第${i}页的故事。`;
      imagePrompt = `${characterName} in a learning and growing situation, page ${i} of the story`;
    }
    
    pages.push({
      pageNumber: i,
      text: text,
      imagePrompt: imagePrompt
    });
  }
  
  return {
    title: `${characterName}的${educationalTopic}故事`,
    educationalTheme: educationalTopic,
    targetAge: `${character.age || 6}岁`,
    pages: pages,
    educationalValue: `帮助孩子学习${educationalTopic}的重要性`,
    teachingPoints: [`理解${educationalTopic}的意义`, '学会实际应用', '培养相关习惯'],
    discussionQuestions: [`你觉得${educationalTopic}重要吗？`, `你会怎么做？`, '你学到了什么？']
  };
} 