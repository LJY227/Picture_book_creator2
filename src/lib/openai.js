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

// 🔗 双账户负载均衡系统 - 解决频率限制问题
const DUAL_ACCOUNT_CONFIG = {
  // 主账户（原有的付费账户）
  PRIMARY: {
    id: 'primary',
    name: '主账户(付费)',
    priority: 1,
    limits: {
      'gpt-4': 500,     // 500 RPM
      'gpt-4o': 5000,   // 5000 RPM
      'gpt-3.5-turbo': 3500  // 3500 RPM
    }
  },
  
  // 副账户（新的免费账户）
  SECONDARY: {
    id: 'secondary',
    name: '副账户(免费)',
    priority: 2,
    limits: {
      'gpt-4': 3,       // 3 RPM (免费限制)
      'gpt-4o': 3,      // 3 RPM (免费限制)
      'gpt-3.5-turbo': 3  // 3 RPM (免费限制)
    }
  },
  
  // 任务分配策略
  TASK_DISTRIBUTION: {
    // 故事生成：使用主账户（需要高质量）
    STORY_GENERATION: 'primary',
    
    // 角色优化：轮流使用（分散负载）
    CHARACTER_OPTIMIZATION: 'rotate',
    
    // 翻译任务：优先副账户（任务简单）
    TRANSLATION: 'secondary',
    
    // 快速处理：优先副账户
    FAST_PROCESSING: 'secondary',
    
    // 高质量创作：主账户
    HIGH_QUALITY: 'primary'
  }
};

// 🎯 智能双账户负载均衡器
class DualAccountBalancer {
  constructor() {
    this.accounts = {
      primary: {
        id: 'primary',
        callCount: 0,
        lastResetTime: Date.now(),
        isRateLimited: false,
        rateLimitUntil: 0,
        modelUsage: new Map() // 追踪每个模型的使用
      },
      secondary: {
        id: 'secondary',
        callCount: 0,
        lastResetTime: Date.now(),
        isRateLimited: false,
        rateLimitUntil: 0,
        modelUsage: new Map()
      }
    };
    
    this.rotationIndex = 0; // 用于轮流分配
  }
  
  // 选择最佳账户
  selectAccount(taskType, modelName) {
    const strategy = DUAL_ACCOUNT_CONFIG.TASK_DISTRIBUTION[taskType];
    const now = Date.now();
    
    // 检查账户是否从频率限制中恢复
    this.checkRateLimitRecovery();
    
    let selectedAccount = null;
    
    switch (strategy) {
      case 'primary':
        selectedAccount = this.accounts.primary.isRateLimited ? 
          this.accounts.secondary : this.accounts.primary;
        break;
        
      case 'secondary':
        selectedAccount = this.accounts.secondary.isRateLimited ? 
          this.accounts.primary : this.accounts.secondary;
        break;
        
      case 'rotate':
        // 轮流使用，但跳过被限频的账户
        const accountIds = ['primary', 'secondary'];
        for (let i = 0; i < accountIds.length; i++) {
          const accountId = accountIds[(this.rotationIndex + i) % accountIds.length];
          if (!this.accounts[accountId].isRateLimited) {
            selectedAccount = this.accounts[accountId];
            this.rotationIndex = (this.rotationIndex + 1) % accountIds.length;
            break;
          }
        }
        break;
        
      default:
        // 默认选择可用的账户
        selectedAccount = !this.accounts.primary.isRateLimited ? 
          this.accounts.primary : this.accounts.secondary;
    }
    
    // 如果所有账户都被限频，选择恢复时间最早的
    if (!selectedAccount || selectedAccount.isRateLimited) {
      selectedAccount = this.accounts.primary.rateLimitUntil < this.accounts.secondary.rateLimitUntil ?
        this.accounts.primary : this.accounts.secondary;
    }
    
    const accountConfig = selectedAccount.id === 'primary' ? 
      DUAL_ACCOUNT_CONFIG.PRIMARY : DUAL_ACCOUNT_CONFIG.SECONDARY;
    
    console.log(`🎯 任务"${taskType}"选择${accountConfig.name} (${selectedAccount.id})`);
    console.log(`📊 账户状态: 主账户=${this.accounts.primary.callCount}次调用, 副账户=${this.accounts.secondary.callCount}次调用`);
    
    return selectedAccount;
  }
  
  // 记录API调用
  recordAPICall(accountId, modelName, success = true) {
    const account = this.accounts[accountId];
    if (!account) return;
    
    account.callCount++;
    
    // 记录模型使用情况
    const modelCount = account.modelUsage.get(modelName) || 0;
    account.modelUsage.set(modelName, modelCount + 1);
    
    if (success) {
      console.log(`✅ ${accountId}账户调用成功: ${modelName} (总计: ${account.callCount}次)`);
    } else {
      console.log(`❌ ${accountId}账户调用失败: ${modelName}`);
    }
  }
  
  // 记录账户被限频
  recordRateLimit(accountId, modelName, rateLimitDuration = 60000) {
    const account = this.accounts[accountId];
    if (!account) return;
    
    account.isRateLimited = true;
    account.rateLimitUntil = Date.now() + rateLimitDuration;
    
    const accountConfig = accountId === 'primary' ? 
      DUAL_ACCOUNT_CONFIG.PRIMARY : DUAL_ACCOUNT_CONFIG.SECONDARY;
    
    console.log(`⚠️ ${accountConfig.name}被限频: ${modelName}，${rateLimitDuration/1000}秒后恢复`);
    console.log(`🔄 自动切换到${accountId === 'primary' ? '副账户' : '主账户'}`);
  }
  
  // 检查限频恢复
  checkRateLimitRecovery() {
    const now = Date.now();
    
    for (const [accountId, account] of Object.entries(this.accounts)) {
      if (account.isRateLimited && now > account.rateLimitUntil) {
        account.isRateLimited = false;
        account.rateLimitUntil = 0;
        
        const accountConfig = accountId === 'primary' ? 
          DUAL_ACCOUNT_CONFIG.PRIMARY : DUAL_ACCOUNT_CONFIG.SECONDARY;
        
        console.log(`🎉 ${accountConfig.name}已从频率限制中恢复！`);
      }
    }
  }
  
  // 获取负载状态
  getLoadStatus() {
    return {
      primary: {
        calls: this.accounts.primary.callCount,
        rateLimited: this.accounts.primary.isRateLimited,
        models: Object.fromEntries(this.accounts.primary.modelUsage)
      },
      secondary: {
        calls: this.accounts.secondary.callCount,
        rateLimited: this.accounts.secondary.isRateLimited,
        models: Object.fromEntries(this.accounts.secondary.modelUsage)
      }
    };
  }
  
  // 重置计数器（每小时重置）
  resetCounters() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const account of Object.values(this.accounts)) {
      if (now - account.lastResetTime > oneHour) {
        account.callCount = 0;
        account.modelUsage.clear();
        account.lastResetTime = now;
        console.log(`🔄 重置账户调用计数器`);
      }
    }
  }
}

// 创建全局双账户负载均衡器
const dualAccountBalancer = new DualAccountBalancer();

// 🎯 本地化处理策略 - 大幅减少API调用依赖
const LOCAL_PROCESSING = {
  // 缓存机制
  cache: new Map(),
  
  // 本地角色描述优化规则
  CHARACTER_RULES: {
    // 基础特征补充
    age_features: {
      '3-5': ['圆脸', '大眼睛', '可爱', '天真'],
      '6-8': ['活泼', '好奇', '明亮眼神', '灿烂笑容'],
      '9-12': ['聪明', '自信', '友善', '阳光']
    },
    
    // 服装建议
    clothing: ['T恤', '毛衣', '连衣裙', '牛仔裤', '运动服', '校服'],
    
    // 发型建议
    hairstyles: ['短发', '长发', '马尾辫', '双马尾', '卷发', '直发'],
    
    // 表情建议
    expressions: ['微笑', '开心', '好奇', '专注', '友善', '活泼']
  },
  
  // 本地翻译词典
  TRANSLATION_DICT: {
    // 常用儿童描述词汇
    '男孩': 'boy', '女孩': 'girl', '孩子': 'child',
    '可爱': 'cute', '活泼': 'lively', '聪明': 'smart',
    '短发': 'short hair', '长发': 'long hair', '卷发': 'curly hair',
    '大眼睛': 'big eyes', '小脸': 'small face', '圆脸': 'round face',
    '微笑': 'smiling', '开心': 'happy', '友善': 'friendly',
    '蓝色': 'blue', '红色': 'red', '绿色': 'green', '黄色': 'yellow',
    '毛衣': 'sweater', 'T恤': 't-shirt', '连衣裙': 'dress',
    '眼镜': 'glasses', '帽子': 'hat', '书包': 'backpack'
  },
  
  // 预设故事模板
  STORY_TEMPLATES: {
    '学会分享与合作': {
      title: '{name}学会分享',
      pages: [
        { title: '发现问题', content: '{name}看到朋友没有玩具。{name}想要帮助。', scene: 'character with toys, friend looking sad' },
        { title: '思考解决', content: '{name}想起妈妈说过要分享。{name}决定分享玩具。', scene: 'character thinking, lightbulb moment' },
        { title: '行动实践', content: '{name}把玩具给朋友。朋友很开心。', scene: 'character sharing toys with friend' },
        { title: '收获快乐', content: '{name}和朋友一起玩。分享让人快乐。', scene: 'character and friend playing together happily' }
      ]
    },
    
    '培养勇敢和自信': {
      title: '{name}变勇敢',
      pages: [
        { title: '遇到挑战', content: '{name}遇到困难。{name}有点害怕。', scene: 'character facing a challenge, looking worried' },
        { title: '寻找勇气', content: '{name}深呼吸。{name}告诉自己要勇敢。', scene: 'character taking deep breath, self-encouraging' },
        { title: '勇敢尝试', content: '{name}鼓起勇气尝试。{name}做得很好。', scene: 'character bravely taking action' },
        { title: '获得自信', content: '{name}成功了。{name}变得更自信了。', scene: 'character feeling proud and confident' }
      ]
    },
    
    '理解友谊的重要性': {
      title: '{name}的好朋友',
      pages: [
        { title: '认识朋友', content: '{name}遇到新朋友。{name}主动打招呼。', scene: 'character meeting new friend, waving hello' },
        { title: '一起玩耍', content: '{name}和朋友一起玩游戏。他们玩得很开心。', scene: 'character playing games with friend' },
        { title: '互相帮助', content: '朋友需要帮助。{name}马上过去帮忙。', scene: 'character helping friend in need' },
        { title: '珍惜友谊', content: '{name}明白了友谊很珍贵。{name}要好好珍惜。', scene: 'character and friend together, very happy' }
      ]
    }
  }
};

// 🎯 优化的OpenAI模型策略配置（专注GPT-4o和GPT-4）
const MODEL_STRATEGY = {
  // 不同任务使用不同模型以分散负载
  TASKS: {
    // 故事生成：使用GPT-4（高质量创作）
    STORY_GENERATION: {
      model: 'gpt-4',
      maxTokens: 3000,
      temperature: 0.8,
      description: '故事创作 - 使用GPT-4保证质量'
    },
    
    // 角色描述优化：使用GPT-4o（优化任务的最佳选择）
    CHARACTER_OPTIMIZATION: {
      model: 'gpt-4o',
      maxTokens: 150,
      temperature: 0.7,
      description: '角色描述优化 - 使用GPT-4o精准优化'
    },
    
    // 翻译任务：使用GPT-4o（快速准确翻译）
    TRANSLATION: {
      model: 'gpt-4o',
      maxTokens: 150,
      temperature: 0.3,
      description: '文本翻译 - 使用GPT-4o确保准确'
    },
    
    // 高质量创作：使用GPT-4
    HIGH_QUALITY: {
      model: 'gpt-4',
      maxTokens: 3000,
      temperature: 0.8,
      description: '高质量创作 - GPT-4顶级质量'
    },
    
    // 快速处理：使用GPT-4o
    FAST_PROCESSING: {
      model: 'gpt-4o',
      maxTokens: 500,
      temperature: 0.5,
      description: '快速处理 - GPT-4o高效响应'
    }
  },
  
  // 图像生成策略：仅使用LiblibAI（移除DALL-E 3）
  IMAGE_STRATEGY: {
    primary: 'liblibai',   // 主要使用LiblibAI
    fallback: 'liblibai',  // 备用也是LiblibAI（移除DALL-E 3）
    description: '图像生成 - 专用LiblibAI，移除DALL-E 3依赖'
  }
};

/**
 * 🧠 智能模型选择器
 * 根据任务类型和当前负载状况选择最佳模型
 */
class SmartModelSelector {
  constructor() {
    this.modelUsage = new Map(); // 追踪各模型使用情况
    this.lastRateLimitTime = new Map(); // 记录各模型上次限频时间
  }
  
  /**
   * 获取指定任务的最佳模型配置
   * @param {string} taskType - 任务类型
   * @param {Object} options - 额外选项
   * @returns {Object} 模型配置
   */
  getModelConfig(taskType, options = {}) {
    const config = MODEL_STRATEGY.TASKS[taskType] || MODEL_STRATEGY.TASKS.FAST_PROCESSING;
    
    // 检查是否最近被限频
    const lastLimitTime = this.lastRateLimitTime.get(config.model);
    const timeSinceLimit = lastLimitTime ? Date.now() - lastLimitTime : Infinity;
    
    // 如果主模型最近被限频，使用备用策略
    if (timeSinceLimit < 300000) { // 5分钟内被限频
      console.log(`🔄 ${config.model}最近被限频，切换到备用模型...`);
      return this.getFallbackConfig(taskType);
    }
    
    console.log(`🎯 任务"${taskType}"使用模型: ${config.model} (${config.description})`);
    return config;
  }
  
  /**
   * 获取备用模型配置
   */
  getFallbackConfig(taskType) {
    // 对于所有任务，备用方案都是使用GPT-3.5-turbo
    const fallbackConfig = {
      model: 'gpt-3.5-turbo',
      maxTokens: MODEL_STRATEGY.TASKS[taskType]?.maxTokens || 500,
      temperature: 0.7,
      description: '备用模型 - 避免频率限制'
    };
    
    console.log(`🛡️ 使用备用模型: ${fallbackConfig.model}`);
    return fallbackConfig;
  }
  
  /**
   * 记录模型被限频
   */
  recordRateLimit(modelName) {
    this.lastRateLimitTime.set(modelName, Date.now());
    console.log(`⚠️ 记录${modelName}被限频，将在5分钟后重新尝试`);
  }
  
  /**
   * 获取推荐的图像生成引擎
   */
  getImageEngine() {
    const strategy = MODEL_STRATEGY.IMAGE_STRATEGY;
    console.log(`🖼️ 推荐图像引擎: ${strategy.primary} (${strategy.description})`);
    return strategy.primary;
  }
}

// 创建全局的智能模型选择器
const modelSelector = new SmartModelSelector();

// 🛡️ 超保守的智能请求队列 - 专门针对频率限制优化
class PayloadRateLimiter {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.lastRequestTime = 0;
    this.minInterval = 2000; // 超保守：最小间隔2秒
    this.recentErrors = new Map(); // 追踪最近的错误
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
        // 🛡️ 超保守的间隔控制
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const requiredWait = this.minInterval;
        
        if (timeSinceLastRequest < requiredWait) {
          const waitTime = requiredWait - timeSinceLastRequest;
          console.log(`⏱️ 请求队列等待${waitTime/1000}秒以避免频率限制...`);
          await new Promise(r => setTimeout(r, waitTime));
        }
        
        const result = await requestFn();
        this.lastRequestTime = Date.now();
        resolve(result);
        
        // 🛡️ 请求间额外间隔，防止连续请求
        console.log(`✅ 请求完成，额外等待3秒...`);
        await new Promise(r => setTimeout(r, 3000));
        
      } catch (error) {
        // 记录错误，如果是频率限制错误，增加间隔
        if (error.message && error.message.includes('429')) {
          this.minInterval = Math.min(this.minInterval * 1.5, 10000); // 最大10秒
          console.log(`⚠️ 检测到频率限制，增加间隔到${this.minInterval/1000}秒`);
        }
        reject(error);
      }
    }
    
    this.processing = false;
  }
  
  // 重置间隔（在长时间没有错误后调用）
  resetInterval() {
    this.minInterval = 2000;
    console.log(`🔄 重置请求间隔到${this.minInterval/1000}秒`);
  }
}

// 创建全局的请求限制器
const rateLimiter = new PayloadRateLimiter();

/**
 * 通过后端代理调用OpenAI Chat API（支持双账户负载均衡）
 * @param {Object} options - 调用选项
 * @param {string} taskType - 任务类型，用于账户选择
 * @param {number} retryCount - 重试次数
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<Object>} API响应
 */
async function callOpenAIChat(options, taskType = 'FAST_PROCESSING', retryCount = 0, maxRetries = 8) {
  // 🔗 智能双账户选择
  const selectedAccount = dualAccountBalancer.selectAccount(taskType, options.model);
  const accountConfig = selectedAccount.id === 'primary' ? 
    DUAL_ACCOUNT_CONFIG.PRIMARY : DUAL_ACCOUNT_CONFIG.SECONDARY;
  
  // 使用智能请求队列（双账户优化）
  return rateLimiter.addRequest(async () => {
    try {
      // 🚀 超强重试策略：针对双账户系统的频率限制优化
      if (retryCount > 0) {
        // 双账户重试延迟：根据账户类型调整
        const baseDelayTimes = [10000, 30000, 60000, 120000, 240000, 480000, 600000, 900000];
        const multiplier = selectedAccount.id === 'secondary' ? 0.5 : 1; // 免费账户等待时间减半
        const delay = (baseDelayTimes[retryCount - 1] || 900000) * multiplier;
        
        console.log(`⏱️ ${accountConfig.name}频率限制重试延迟${delay/1000}秒 (第${retryCount}次重试)...`);
        console.log(`🎯 当前使用模型: ${options.model || 'unknown'} @ ${accountConfig.name}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // 🔗 添加账户信息到请求
      const requestBody = {
        ...options,
        accountId: selectedAccount.id,  // 告诉后端使用哪个账户
        accountType: selectedAccount.id === 'primary' ? 'paid' : 'free'
      };

      const response = await fetch(`${API_BASE_URL}/openai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        
        // 处理429错误（频率限制）
        if (response.status === 429) {
          console.warn(`⚠️ ${accountConfig.name}模型频率限制，第${retryCount + 1}次重试...`);
          
          // 🔗 记录账户被限频
          dualAccountBalancer.recordRateLimit(selectedAccount.id, options.model);
          
          if (retryCount < maxRetries) {
            console.log(`🔄 执行第${retryCount + 1}/${maxRetries}次重试...`);
            console.log(`📊 预计等待时间: ${retryCount < 7 ? [10, 30, 60, 120, 240, 480, 600][retryCount] : 900}秒`);
            
            // 检查错误详情
            const errorMessage = String(error.error || error.message || '');
            if (errorMessage.includes('rate_limit_exceeded')) {
              console.log(`🎯 确认为频率限制错误，自动切换账户重试...`);
            }
            
            return callOpenAIChat(options, taskType, retryCount + 1, maxRetries);
          } else {
            // 显示双账户状态
            const loadStatus = dualAccountBalancer.getLoadStatus();
            throw new Error(`双账户系统频率限制：${options.model || 'unknown'}模型经过${maxRetries}次重试仍失败。

🔍 双账户详细状态：
• 主账户(付费): ${loadStatus.primary.calls}次调用, 限频状态: ${loadStatus.primary.rateLimited ? '是' : '否'}
• 副账户(免费): ${loadStatus.secondary.calls}次调用, 限频状态: ${loadStatus.secondary.rateLimited ? '是' : '否'}
• 当前模型：${options.model || 'unknown'}
• 总重试时间：约${Math.round((10+30+60+120+240+480+600+900)/60)}分钟

💡 双账户解决方案：
1. 🕐 等待5-10分钟后重试（双账户恢复更快）
2. 🔄 检查是否有其他标签页在同时生成
3. 📊 免费账户限制：3 RPM，付费账户：GPT-4 (500 RPM), GPT-4o (5000 RPM)
4. ⏰ 错开使用高峰时段

🚀 双账户优势：
• 负载分散，有效避免单账户频率限制
• 自动故障转移，提高系统可用性
• 智能任务分配，优化资源利用

系统将在下次重试时继续优化双账户策略。`);
          }
        }
        
        // 处理其他错误
        dualAccountBalancer.recordAPICall(selectedAccount.id, options.model, false);
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // 🔗 记录成功调用
      dualAccountBalancer.recordAPICall(selectedAccount.id, options.model, true);
      console.log(`✅ ${accountConfig.name}模型调用成功 (经过${retryCount}次重试)`);
      return await response.json();
    } catch (error) {
      console.error(`${accountConfig.name}模型调用失败:`, error);
      
      // 网络错误的重试（更保守策略）
      if (retryCount < maxRetries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
        console.warn(`🌐 网络错误，第${retryCount + 1}/${maxRetries}次重试...`);
        const waitTime = Math.min(10000 * (retryCount + 1), 60000); // 10, 20, 30, 40, 50, 60秒
        console.log(`⏱️ 网络重试等待${waitTime/1000}秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callOpenAIChat(options, taskType, retryCount + 1, maxRetries);
      }
      
      throw error;
    }
  });
}

// 🚫 DALL-E 3功能已移除 - 专注使用LiblibAI进行图像生成

/**
 * 使用GPT-4o优化角色描述为图像生成关键词
 * @param {string} userDescription - 用户输入的角色描述
 * @param {Object} basicInfo - 基础角色信息（年龄、性别、身份）
 * @returns {Promise<string>} 优化后的角色描述关键词
 */
export async function optimizeCharacterDescription(userDescription, basicInfo = {}) {
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 🏠 优先使用本地优化逻辑（避免API调用）
  try {
    const localOptimized = optimizeCharacterLocally(userDescription, basicInfo);
    if (localOptimized) {
      console.log('🏠 使用本地角色优化 (无API调用):', { 
        original: userDescription, 
        enhanced: localOptimized 
      });
      return localOptimized;
    }
  } catch (error) {
    console.warn('本地优化失败，尝试API优化:', error);
  }
  
  // 🤖 仅在本地处理不足且API可用时使用AI优化
  if (!apiController.canCallAPI()) {
    console.log('⚠️ API调用已达限制，使用简化本地处理');
    return generateFallbackCharacterDescription(userDescription, basicInfo);
  }

  try {
    console.log('🤖 使用AI进行角色优化 (API调用)...');
    apiController.recordAPICall();
    
    const modelConfig = modelSelector.getModelConfig('CHARACTER_OPTIMIZATION');
    
    // 简化的AI优化提示词（减少token消耗）
    const response = await callOpenAIChat({
      model: modelConfig.model,
      messages: [
        {
          role: "user",
          content: `请优化角色描述："${userDescription}"，${age}岁${gender === 'boy' ? '男孩' : gender === 'girl' ? '女孩' : '孩子'}，补充外貌、服装、表情，50字内：`
        }
      ],
      temperature: 0.7,
      max_tokens: 100 // 减少token消耗
    }, 'CHARACTER_OPTIMIZATION');

    const optimizedDescription = response.choices[0].message.content.trim();
    console.log('✅ AI角色优化完成:', { 
      original: userDescription, 
      enhanced: optimizedDescription 
    });
    
    return optimizedDescription;
    
  } catch (error) {
    console.error('AI角色优化失败，使用本地备用方案:', error);
    return generateFallbackCharacterDescription(userDescription, basicInfo);
  }
}

// 🏠 本地角色描述优化函数
function optimizeCharacterLocally(userDescription, basicInfo) {
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 检查缓存
  const cacheKey = `char_${userDescription}_${age}_${gender}_${identity}`;
  if (LOCAL_PROCESSING.cache.has(cacheKey)) {
    console.log('💾 使用缓存的角色描述');
    return LOCAL_PROCESSING.cache.get(cacheKey);
  }
  
  // 解析现有描述
  const description = userDescription.toLowerCase();
  const parts = [];
  
  // 1. 基础信息
  const genderText = gender === 'boy' ? '男孩' : gender === 'girl' ? '女孩' : '孩子';
  parts.push(`${age}岁${genderText}`);
  
  // 2. 补充发型（如果没有）
  if (!description.includes('发') && !description.includes('hair')) {
    const ageGroup = age <= 5 ? '3-5' : age <= 8 ? '6-8' : '9-12';
    const hairstyles = LOCAL_PROCESSING.CHARACTER_RULES.hairstyles;
    const randomHair = hairstyles[Math.floor(Math.random() * hairstyles.length)];
    parts.push(randomHair);
  }
  
  // 3. 补充服装（如果没有）
  if (!description.includes('衣') && !description.includes('服') && !description.includes('shirt') && !description.includes('dress')) {
    const clothing = LOCAL_PROCESSING.CHARACTER_RULES.clothing;
    const randomCloth = clothing[Math.floor(Math.random() * clothing.length)];
    parts.push(randomCloth);
  }
  
  // 4. 补充表情
  const ageGroup = age <= 5 ? '3-5' : age <= 8 ? '6-8' : '9-12';
  const ageFeatures = LOCAL_PROCESSING.CHARACTER_RULES.age_features[ageGroup];
  const randomFeature = ageFeatures[Math.floor(Math.random() * ageFeatures.length)];
  parts.push(randomFeature + '的表情');
  
  // 5. 整合原描述
  const result = userDescription + '，' + parts.join('，');
  
  // 缓存结果
  LOCAL_PROCESSING.cache.set(cacheKey, result);
  
  return result;
}

// 🛡️ 备用角色描述生成
function generateFallbackCharacterDescription(userDescription, basicInfo) {
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 简单的本地处理
  const genderText = gender === 'boy' ? '男孩' : gender === 'girl' ? '女孩' : '孩子';
  const basicDesc = `${age}岁${genderText}，${userDescription}，活泼可爱，适合儿童绘本`;
  
  console.log('🛡️ 使用备用角色描述生成');
  return basicDesc;
}

/**
 * 将角色描述转换为英文（用于图像生成）
 * @param {string} description - 任何语言的角色描述
 * @param {Object} basicInfo - 基础角色信息
 * @returns {Promise<string>} 英文角色描述
 */
export async function translateDescriptionToEnglish(description, basicInfo = {}) {
  // 如果描述已经是英文，直接返回
  if (/^[a-zA-Z0-9\s,.-]+$/.test(description)) {
    console.log('🔤 描述已经是英文，直接使用:', description);
    return description;
  }
  
  // 🏠 优先使用本地翻译（避免API调用）
  try {
    const localTranslated = translateLocally(description, basicInfo);
    if (localTranslated && localTranslated !== description) {
      console.log('🏠 使用本地翻译 (无API调用):', { 
        original: description, 
        english: localTranslated 
      });
      return localTranslated;
    }
  } catch (error) {
    console.warn('本地翻译失败，尝试API翻译:', error);
  }
  
  // 🤖 仅在本地翻译不足且API可用时使用AI翻译
  if (!apiController.canCallAPI()) {
    console.log('⚠️ API调用已达限制，使用本地翻译备用方案');
    return generateFallbackTranslation(description, basicInfo);
  }

  try {
    console.log('🤖 使用AI进行翻译 (API调用)...');
    apiController.recordAPICall();
    
    const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
    const modelConfig = modelSelector.getModelConfig('TRANSLATION');
    
    // 简化的翻译提示词
    const response = await callOpenAIChat({
      model: modelConfig.model,
      messages: [
        {
          role: "user",
          content: `翻译为英文："${description}"，${age}岁${gender === 'boy' ? '男孩' : gender === 'girl' ? '女孩' : '孩子'}角色描述，适合图像生成：`
        }
      ],
      temperature: 0.3,
      max_tokens: 80 // 减少token消耗
    }, 'TRANSLATION');

    const englishDescription = response.choices[0].message.content.trim();
    console.log('✅ AI翻译完成:', { 
      original: description, 
      english: englishDescription 
    });
    
    return englishDescription;
    
  } catch (error) {
    console.error('AI翻译失败，使用本地备用方案:', error);
    return generateFallbackTranslation(description, basicInfo);
  }
}

// 🏠 本地翻译函数
function translateLocally(description, basicInfo) {
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 检查缓存
  const cacheKey = `trans_${description}`;
  if (LOCAL_PROCESSING.cache.has(cacheKey)) {
    console.log('💾 使用缓存的翻译');
    return LOCAL_PROCESSING.cache.get(cacheKey);
  }
  
  // 使用本地词典逐词翻译
  const dict = LOCAL_PROCESSING.TRANSLATION_DICT;
  let result = description;
  
  // 替换词典中的词汇
  for (const [chinese, english] of Object.entries(dict)) {
    if (result.includes(chinese)) {
      result = result.replace(new RegExp(chinese, 'g'), english);
    }
  }
  
  // 补充基础信息
  const ageText = `${age}-year-old`;
  const genderText = gender === 'boy' ? 'boy' : gender === 'girl' ? 'girl' : 'child';
  const identityText = identity === 'human' ? 'child' : identity;
  
  // 如果翻译后仍有中文，说明需要AI翻译
  if (/[\u4e00-\u9fff]/.test(result)) {
    return null; // 返回null表示需要AI翻译
  }
  
  // 整理翻译结果
  const finalResult = `${ageText} ${genderText}, ${result}, children's book character, cute and friendly`;
  
  // 缓存结果
  LOCAL_PROCESSING.cache.set(cacheKey, finalResult);
  
  return finalResult;
}

// 🛡️ 备用翻译生成
function generateFallbackTranslation(description, basicInfo) {
  const { age = 6, gender = 'any', identity = 'human' } = basicInfo;
  
  // 简单的本地处理
  const ageText = `${age}-year-old`;
  const genderText = gender === 'boy' ? 'boy' : gender === 'girl' ? 'girl' : 'child';
  const fallbackDesc = `${ageText} ${genderText}, cute character, children's book style, friendly appearance`;
  
  console.log('🛡️ 使用备用翻译生成');
  return fallbackDesc;
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
export async function generatePictureBook({ character, story, content, onProgress, imageEngine, useCharacterConsistency = true }) {
  try {
    // 🎯 智能模型和引擎选择
    const modelConfig = modelSelector.getModelConfig('STORY_GENERATION');
    const defaultImageEngine = imageEngine || modelSelector.getImageEngine(); // 优先使用LiblibAI
    
    // 构建提示词
    const prompt = buildPrompt({ character, story, content });

    console.log('🧠 智能模型选择结果:');
    console.log('- 故事生成模型:', modelConfig.model, '(' + modelConfig.description + ')');
    console.log('- 图像生成引擎:', defaultImageEngine);
    console.log('- 教学内容模式:', content.mode || 'unknown');
    console.log('- 最终教学主题:', content.educationalTopic || content.finalTopic);
    onProgress && onProgress('正在使用智能模型生成故事...', 10);
    
    const response = await callOpenAIChat({
      model: modelConfig.model,
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
      max_tokens: modelConfig.maxTokens
    }, 'STORY_GENERATION');

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
      imageEngine: defaultImageEngine, // 记录使用的图像引擎
      storyModel: modelConfig.model, // 记录使用的故事生成模型
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
        // 🚫 DALL-E 3已移除 - 使用LiblibAI备用方案
        console.log(`🔄 DALL-E 3功能已移除，使用LiblibAI备用方案...`);
        imagePrompt = buildLiblibImagePrompt(page, character);
        
        const liblibResult = await generateTextToImageComplete(
          imagePrompt,
          (status, progress) => {
            console.log(`LiblibAI备用生成进度: ${status} - ${progress}%`);
          },
          {
            aspectRatio: "3:4",
            guidance_scale: 3.5,
            imgCount: 1,
            model: "pro"
          }
        );

        if (liblibResult && liblibResult.status === 'success' && liblibResult.imageUrl) {
          imageUrl = liblibResult.imageUrl;
          console.log(`第${page.pageNumber}页LiblibAI备用插画生成成功:`, imageUrl);
        } else if (liblibResult && liblibResult.images && liblibResult.images.length > 0) {
          imageUrl = liblibResult.images[0].imageUrl || liblibResult.images[0];
          console.log(`第${page.pageNumber}页LiblibAI备用插画生成成功（备用方式）:`, imageUrl);
        } else {
          console.warn(`第${page.pageNumber}页LiblibAI备用插画生成失败，使用emoji替代`, liblibResult);
        }
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

// 🚫 buildImagePrompt函数已移除 - DALL-E 3功能不再使用

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

// 🧠 智能API调用控制器
class APIUsageController {
  constructor() {
    this.callCount = 0;
    this.dailyLimit = 50; // 每日API调用限制
    this.sessionLimit = 10; // 每会话API调用限制
    this.lastResetDate = new Date().toDateString();
    this.enableLocalFirst = true; // 优先使用本地处理
  }
  
  // 检查是否可以调用API
  canCallAPI() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.callCount = 0;
      this.lastResetDate = today;
    }
    
    return this.callCount < this.dailyLimit && this.callCount < this.sessionLimit;
  }
  
  // 记录API调用
  recordAPICall() {
    this.callCount++;
    console.log(`📊 API调用计数: ${this.callCount}/${this.sessionLimit} (今日限制: ${this.dailyLimit})`);
  }
  
  // 获取调用状态
  getStatus() {
    return {
      canCall: this.canCallAPI(),
      remaining: this.sessionLimit - this.callCount,
      dailyRemaining: this.dailyLimit - this.callCount
    };
  }
}

// 创建全局API使用控制器
const apiController = new APIUsageController();