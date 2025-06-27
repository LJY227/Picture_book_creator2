/**
 * 安全提示词模板和过滤器
 * 专门用于儿童绘本内容生成，确保所有内容都适合儿童观看
 */

// 儿童友好的安全前缀
export const SAFE_PREFIXES = [
  "A cute, friendly, and innocent",
  "A wholesome and cheerful",
  "A gentle and kind",
  "A happy and colorful",
  "A sweet and adorable",
  "A peaceful and joyful"
];

// 儿童友好的安全后缀
export const SAFE_SUFFIXES = [
  "perfect for a children's picture book",
  "appropriate for young children aged 3-7",
  "in a gentle cartoon style for kids",
  "with bright, cheerful colors",
  "completely safe and family-friendly",
  "educational and wholesome content"
];

// 需要过滤的敏感词汇
export const SENSITIVE_WORDS = [
  // 暴力相关
  'violence', 'violent', 'fight', 'fighting', 'weapon', 'gun', 'knife', 'sword',
  'blood', 'bleeding', 'hurt', 'pain', 'injury', 'wound', 'attack', 'kill',
  'death', 'dead', 'die', 'dying', 'murder', 'war', 'battle', 'explosion',
  
  // 恐怖相关
  'scary', 'frightening', 'horror', 'terrifying', 'nightmare', 'ghost',
  'monster', 'demon', 'evil', 'dark', 'darkness', 'shadow', 'creepy',
  'spooky', 'haunted', 'zombie', 'vampire', 'witch', 'devil',
  
  // 成人内容
  'sexy', 'sexual', 'adult', 'mature', 'inappropriate', 'nude', 'naked',
  'romance', 'romantic', 'kiss', 'kissing', 'love', 'dating',
  
  // 负面情绪
  'sad', 'crying', 'angry', 'mad', 'upset', 'worried', 'anxious',
  'depressed', 'lonely', 'afraid', 'scared', 'fearful',
  
  // 危险行为
  'dangerous', 'risk', 'risky', 'unsafe', 'hazard', 'poison', 'toxic',
  'fire', 'burning', 'smoke', 'accident', 'crash', 'fall', 'falling'
];

// 替换词汇映射
export const WORD_REPLACEMENTS = {
  'scary': 'friendly',
  'frightening': 'cheerful',
  'dark': 'bright',
  'evil': 'kind',
  'monster': 'friendly creature',
  'angry': 'happy',
  'sad': 'cheerful',
  'dangerous': 'safe',
  'fight': 'play',
  'weapon': 'toy',
  'fire': 'warm light'
};

// 儿童绘本专用的安全主题
export const SAFE_THEMES = [
  'animals playing in nature',
  'children learning and exploring',
  'family activities and togetherness',
  'colorful gardens and flowers',
  'friendly farm animals',
  'magical fairy tale characters',
  'educational adventures',
  'seasonal celebrations',
  'helping and sharing',
  'creative arts and crafts'
];

/**
 * 获取随机的安全前缀
 */
export function getRandomSafePrefix() {
  return SAFE_PREFIXES[Math.floor(Math.random() * SAFE_PREFIXES.length)];
}

/**
 * 获取随机的安全后缀
 */
export function getRandomSafeSuffix() {
  return SAFE_SUFFIXES[Math.floor(Math.random() * SAFE_SUFFIXES.length)];
}

/**
 * 获取随机的安全主题
 */
export function getRandomSafeTheme() {
  return SAFE_THEMES[Math.floor(Math.random() * SAFE_THEMES.length)];
}

/**
 * 高级提示词过滤和优化
 * @param {string} prompt - 原始提示词
 * @param {boolean} isRetry - 是否为重试（重试时会更加保守）
 * @returns {string} 过滤后的安全提示词
 */
export function createSafePrompt(prompt, isRetry = false) {
  let safePrompt = prompt.toLowerCase().trim();
  
  // 替换敏感词汇
  Object.entries(WORD_REPLACEMENTS).forEach(([bad, good]) => {
    const regex = new RegExp(`\\b${bad}\\b`, 'gi');
    safePrompt = safePrompt.replace(regex, good);
  });
  
  // 移除其他敏感词汇
  SENSITIVE_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    safePrompt = safePrompt.replace(regex, '');
  });
  
  // 清理多余的空格
  safePrompt = safePrompt.replace(/\s+/g, ' ').trim();
  
  // 如果提示词太短或为空，使用默认安全主题
  if (safePrompt.length < 5) {
    safePrompt = getRandomSafeTheme();
  }
  
  // 构建最终的安全提示词
  const prefix = getRandomSafePrefix();
  const suffix = getRandomSafeSuffix();
  
  let finalPrompt = `${prefix} ${safePrompt}, ${suffix}`;
  
  // 如果是重试，添加额外的安全保障
  if (isRetry) {
    finalPrompt = `Extra safe and innocent: ${finalPrompt}, absolutely no controversial or inappropriate content, designed specifically for very young children`;
  }
  
  return finalPrompt;
}

/**
 * 检查提示词是否包含敏感内容
 * @param {string} prompt - 要检查的提示词
 * @returns {boolean} 是否包含敏感内容
 */
export function containsSensitiveContent(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  return SENSITIVE_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerPrompt);
  });
}
