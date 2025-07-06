/**
 * 提示词翻译系统
 * 确保发送给API的提示词始终是英语，但根据用户语言返回相应语言的内容
 */

// 提示词模板 - 多语言版本
const PROMPT_TEMPLATES = {
  'zh-CN': {
    storyTypes: {
      'adventure': '冒险故事',
      'growth': '成长故事', 
      'friendship': '友情故事',
      'life-skills': '生活技能'
    },
    systemPrompt: `你是一位顶级的自闭症儿童教育专家和专业绘本创作师。你的任务是创作既生动有趣又适合自闭症儿童的高质量教学绘本。

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

**重要要求**：请用中文创作故事内容，但插画描述必须用英文。`,
    
    userPrompt: (params) => `请为自闭症儿童创作一个既生动有趣又具有深度教育意义的绘本故事。这个故事将被用于特殊教育教学，需要平衡趣味性和教育性。

【角色设定】
- 主角：${params.characterName}
- 角色描述：${params.characterDescription}
- 年龄：${params.age}岁
- 性格特点：${params.personality}

【故事要求】
- 故事类型：${params.storyType}
- 教学主题：${params.educationalTopic}
- 故事背景：${params.setting}
- 页数要求：${params.pageCount}页
- 语言风格：简单易懂但充满感染力

【教育目标】
${params.educationalGoals}

【特殊要求】
1. 语言必须简单直白，适合自闭症儿童理解
2. 情节要有起承转合，但不能太复杂
3. 要有明确的教育价值和行为示范
4. 每页都需要详细的英文插画描述
5. 主角外貌特征在所有页面中必须保持一致
6. 第一页不要介绍角色，直接开始故事情节${params.contentModeNote}

请严格按照以下JSON格式返回：

\`\`\`json
{
  "title": "故事标题",
  "educationalTheme": "${params.educationalTopic}",
  "targetAge": "${params.age}岁",
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
  ],
  "educationalValue": "这个故事的教育意义和价值",
  "teachingPoints": ["教学要点1", "教学要点2", "教学要点3"],
  "discussionQuestions": ["讨论问题1", "讨论问题2", "讨论问题3"]
}
\`\`\``
  },
  
  'zh-TW': {
    storyTypes: {
      'adventure': '冒險故事',
      'growth': '成長故事', 
      'friendship': '友情故事',
      'life-skills': '生活技能'
    },
    systemPrompt: `你是一位頂級的自閉症兒童教育專家和專業繪本創作師。你的任務是創作既生動有趣又適合自閉症兒童的高質量教學繪本。

**核心創作理念**：
- 語言簡單但故事生動：用最簡單的詞彙講述最有趣的故事
- 深度教育意義：每個故事都要有明確的教學價值，適合課堂使用
- 完美圖文對應：插畫描述必須精確反映故事內容，確保圖文一致
- 絕對角色一致性：主角外貌特徵在整個故事中不得有任何變化

**特殊教育專業要求**：
1. 語言特點：簡單直白但富有感染力，避免抽象概念
2. 情節設計：生動有趣且貼近生活，有適度戲劇張力但結局積極
3. 教育價值：深刻的品德教育和技能培養，適合老師教學討論
4. 角色塑造：鮮明的人物形象，行為示範明確具體
5. 場景描述：詳細準確的英文插畫描述，確保視覺呈現完美

**重要要求**：請用繁體中文創作故事內容，但插畫描述必須用英文。`,
    
    userPrompt: (params) => `請為自閉症兒童創作一個既生動有趣又具有深度教育意義的繪本故事。這個故事將被用於特殊教育教學，需要平衡趣味性和教育性。

【角色設定】
- 主角：${params.characterName}
- 角色描述：${params.characterDescription}
- 年齡：${params.age}歲
- 性格特點：${params.personality}

【故事要求】
- 故事類型：${params.storyType}
- 教學主題：${params.educationalTopic}
- 故事背景：${params.setting}
- 頁數要求：${params.pageCount}頁
- 語言風格：簡單易懂但充滿感染力

【教育目標】
${params.educationalGoals}

【特殊要求】
1. 語言必須簡單直白，適合自閉症兒童理解
2. 情節要有起承轉合，但不能太複雜
3. 要有明確的教育價值和行為示範
4. 每頁都需要詳細的英文插畫描述
5. 主角外貌特徵在所有頁面中必須保持一致
6. 第一頁不要介紹角色，直接開始故事情節${params.contentModeNote}

請嚴格按照以下JSON格式返回：

\`\`\`json
{
  "title": "故事標題",
  "educationalTheme": "${params.educationalTopic}",
  "targetAge": "${params.age}歲",
  "pages": [
    {
      "pageNumber": 1,
      "text": "第一頁的故事文本",
      "imagePrompt": "詳細的英文插畫描述，包含主角外貌、動作、表情、場景等"
    },
    {
      "pageNumber": 2,
      "text": "第二頁的故事文本",
      "imagePrompt": "詳細的英文插畫描述"
    }
  ],
  "educationalValue": "這個故事的教育意義和價值",
  "teachingPoints": ["教學要點1", "教學要點2", "教學要點3"],
  "discussionQuestions": ["討論問題1", "討論問題2", "討論問題3"]
}
\`\`\``
  },
  
  'en': {
    storyTypes: {
      'adventure': 'Adventure Story',
      'growth': 'Growth Story', 
      'friendship': 'Friendship Story',
      'life-skills': 'Life Skills'
    },
    systemPrompt: `You are a top-tier autism education specialist and professional picture book creator. Your task is to create high-quality educational picture books that are both engaging and suitable for children with autism.

**Core Creative Principles**:
- Simple language but vivid storytelling: Use the simplest vocabulary to tell the most interesting stories
- Deep educational value: Every story must have clear teaching value, suitable for classroom use
- Perfect text-image correspondence: Illustration descriptions must accurately reflect story content, ensuring text-image consistency
- Absolute character consistency: The protagonist's appearance must not change throughout the entire story

**Special Education Professional Requirements**:
1. Language characteristics: Simple and direct but emotionally engaging, avoiding abstract concepts
2. Plot design: Vivid and interesting, close to life, with appropriate dramatic tension but positive endings
3. Educational value: Profound moral education and skill development, suitable for teacher-led discussions
4. Character development: Distinctive character images with clear and specific behavioral examples
5. Scene descriptions: Detailed and accurate English illustration descriptions to ensure perfect visual presentation

**Important requirement**: Please create story content in English, and illustration descriptions must also be in English.`,
    
    userPrompt: (params) => `Please create a picture book story for children with autism that is both engaging and has profound educational significance. This story will be used for special education teaching and needs to balance entertainment and education.

【Character Setup】
- Protagonist: ${params.characterName}
- Character Description: ${params.characterDescription}
- Age: ${params.age} years old
- Personality: ${params.personality}

【Story Requirements】
- Story Type: ${params.storyType}
- Educational Theme: ${params.educationalTopic}
- Story Setting: ${params.setting}
- Page Requirement: ${params.pageCount} pages
- Language Style: Simple and easy to understand but full of appeal

【Educational Goals】
${params.educationalGoals}

【Special Requirements】
1. Language must be simple and direct, suitable for children with autism to understand
2. Plot should have beginning, development, climax, and resolution, but not too complex
3. Must have clear educational value and behavioral examples
4. Each page needs detailed English illustration descriptions
5. Protagonist's appearance must remain consistent across all pages
6. First page should not introduce characters, start directly with the story plot${params.contentModeNote}

Please return strictly in the following JSON format:

\`\`\`json
{
  "title": "Story Title",
  "educationalTheme": "${params.educationalTopic}",
  "targetAge": "${params.age} years old",
  "pages": [
    {
      "pageNumber": 1,
      "text": "First page story text",
      "imagePrompt": "Detailed English illustration description, including protagonist's appearance, actions, expressions, scenes, etc."
    },
    {
      "pageNumber": 2,
      "text": "Second page story text",
      "imagePrompt": "Detailed English illustration description"
    }
  ],
  "educationalValue": "The educational meaning and value of this story",
  "teachingPoints": ["Teaching point 1", "Teaching point 2", "Teaching point 3"],
  "discussionQuestions": ["Discussion question 1", "Discussion question 2", "Discussion question 3"]
}
\`\`\``
  }
};

// 英文提示词模板（发送给API）
const ENGLISH_PROMPT_TEMPLATE = {
  systemPrompt: `You are a top-tier autism education specialist and professional picture book creator. Your task is to create high-quality educational picture books that are both engaging and suitable for children with autism.

**Core Creative Principles**:
- Simple language but vivid storytelling: Use the simplest vocabulary to tell the most interesting stories
- Deep educational value: Every story must have clear teaching value, suitable for classroom use
- Perfect text-image correspondence: Illustration descriptions must accurately reflect story content, ensuring text-image consistency
- Absolute character consistency: The protagonist's appearance must not change throughout the entire story

**Special Education Professional Requirements**:
1. Language characteristics: Simple and direct but emotionally engaging, avoiding abstract concepts
2. Plot design: Vivid and interesting, close to life, with appropriate dramatic tension but positive endings
3. Educational value: Profound moral education and skill development, suitable for teacher-led discussions
4. Character development: Distinctive character images with clear and specific behavioral examples
5. Scene descriptions: Detailed and accurate English illustration descriptions to ensure perfect visual presentation

**IMPORTANT**: Please create story content in the user's requested language, but illustration descriptions must always be in English.`,
  
  userPrompt: (params) => `Please create a picture book story for children with autism that is both engaging and has profound educational significance. This story will be used for special education teaching and needs to balance entertainment and education.

**Target Language**: ${params.targetLanguage}

【Character Setup】
- Protagonist: ${params.characterName}
- Character Description: ${params.characterDescription}
- Age: ${params.age} years old
- Personality: ${params.personality}

【Story Requirements】
- Story Type: ${params.storyType}
- Educational Theme: ${params.educationalTopic}
- Story Setting: ${params.setting}
- Page Requirement: ${params.pageCount} pages
- Language Style: Simple and easy to understand but full of appeal

【Educational Goals】
${params.educationalGoals}

【Special Requirements】
1. Language must be simple and direct, suitable for children with autism to understand
2. Plot should have beginning, development, climax, and resolution, but not too complex
3. Must have clear educational value and behavioral examples
4. Each page needs detailed English illustration descriptions
5. Protagonist's appearance must remain consistent across all pages
6. First page should not introduce characters, start directly with the story plot${params.contentModeNote}

Please return strictly in the following JSON format:

\`\`\`json
{
  "title": "Story Title in ${params.targetLanguage}",
  "educationalTheme": "${params.educationalTopic}",
  "targetAge": "${params.age} years old",
  "pages": [
    {
      "pageNumber": 1,
      "text": "First page story text in ${params.targetLanguage}",
      "imagePrompt": "Detailed English illustration description, including protagonist's appearance, actions, expressions, scenes, etc."
    },
    {
      "pageNumber": 2,
      "text": "Second page story text in ${params.targetLanguage}",
      "imagePrompt": "Detailed English illustration description"
    }
  ],
  "educationalValue": "The educational meaning and value of this story in ${params.targetLanguage}",
  "teachingPoints": ["Teaching point 1 in ${params.targetLanguage}", "Teaching point 2 in ${params.targetLanguage}", "Teaching point 3 in ${params.targetLanguage}"],
  "discussionQuestions": ["Discussion question 1 in ${params.targetLanguage}", "Discussion question 2 in ${params.targetLanguage}", "Discussion question 3 in ${params.targetLanguage}"]
}
\`\`\``
};

// 语言映射
const LANGUAGE_MAP = {
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  'en': 'English'
};

/**
 * 构建多语言提示词
 * @param {Object} params 参数
 * @param {string} userLanguage 用户选择的语言
 * @returns {Object} 包含system和user提示词的对象
 */
export function buildMultilingualPrompt(params, userLanguage = 'zh-CN') {
  const {
    character,
    story,
    content
  } = params;
  
  // 准备参数
  const storyTypes = PROMPT_TEMPLATES[userLanguage]?.storyTypes || PROMPT_TEMPLATES['zh-CN'].storyTypes;
  const educationalTopic = content.educationalTopic || content.finalTopic || '学会分享与合作';
  const characterName = character.name || '主角';
  const characterDescription = character.customDescription || character.optimizedDescription || '一个可爱的孩子';
  const age = character.age || 6;
  const personality = character.personality || '活泼开朗、善良友好';
  const storyType = storyTypes[story.type] || storyTypes['growth'];
  const setting = story.setting || '日常生活场景';
  const educationalGoals = content.educationalGoals || `通过故事帮助自闭症儿童学习"${educationalTopic}"，培养相关的社交技能和行为习惯`;
  
  // 内容模式说明
  let contentModeNote = '';
  if (content.mode === 'custom') {
    contentModeNote = userLanguage === 'en' ? 
      '\n\n**Special Note**: This story is created based on user\'s custom educational content requirements. Please ensure it closely revolves around the specified educational theme and deeply reflects its educational value.' :
      userLanguage === 'zh-TW' ?
      '\n\n**特別注意**：本故事基於用戶的自定義教學內容需求創作，請確保緊密圍繞指定的教學主題展開，深入體現其教育價值。' :
      '\n\n**特别注意**：本故事基于用户的自定义教学内容需求创作，请确保紧密围绕指定的教学主题展开，深入体现其教育价值。';
  } else if (content.mode === 'selected') {
    contentModeNote = userLanguage === 'en' ? 
      '\n\n**Special Note**: This story is created based on user\'s selected specific theme. Please ensure the story content fully demonstrates the core elements and educational significance of this theme.' :
      userLanguage === 'zh-TW' ?
      '\n\n**特別注意**：本故事基於用戶選擇的特定主題創作，請確保故事內容充分展現該主題的核心要素和教育意義。' :
      '\n\n**特别注意**：本故事基于用户选择的特定主题创作，请确保故事内容充分展现该主题的核心要素和教育意义。';
  } else {
    contentModeNote = userLanguage === 'en' ? 
      '\n\n**Special Note**: This story uses intelligent random generation mode. Please ensure the content is rich, interesting, and full of educational value.' :
      userLanguage === 'zh-TW' ?
      '\n\n**特別注意**：本故事採用智能隨機生成模式，請確保內容豐富有趣，充滿教育價值。' :
      '\n\n**特别注意**：本故事采用智能随机生成模式，请确保内容丰富有趣，充满教育价值。';
  }
  
  const promptParams = {
    characterName,
    characterDescription,
    age,
    personality,
    storyType,
    educationalTopic,
    setting,
    educationalGoals,
    contentModeNote,
    pageCount: story.pages || 6,
    targetLanguage: LANGUAGE_MAP[userLanguage] || 'Simplified Chinese'
  };
  
  // 始终返回英文提示词给API
  return {
    systemPrompt: ENGLISH_PROMPT_TEMPLATE.systemPrompt,
    userPrompt: ENGLISH_PROMPT_TEMPLATE.userPrompt(promptParams),
    targetLanguage: userLanguage
  };
}

/**
 * 翻译角色描述为英文（用于图像生成）
 * @param {string} description 角色描述
 * @param {string} language 原始语言
 * @returns {string} 英文描述
 */
export function translateCharacterDescriptionToEnglish(description, language = 'zh-CN') {
  if (language === 'en') {
    return description;
  }
  
  // 简单的翻译映射
  const translations = {
    // 中文到英文
    '小男孩': 'little boy',
    '小女孩': 'little girl',
    '孩子': 'child',
    '男孩': 'boy',
    '女孩': 'girl',
    '头发': 'hair',
    '眼睛': 'eyes',
    '笑容': 'smile',
    '可爱': 'cute',
    '聪明': 'smart',
    '善良': 'kind',
    '活泼': 'lively',
    '黑色': 'black',
    '棕色': 'brown',
    '金色': 'golden',
    '蓝色': 'blue',
    '红色': 'red',
    '绿色': 'green',
    '大': 'big',
    '小': 'small',
    '高': 'tall',
    '矮': 'short',
    '胖': 'chubby',
    '瘦': 'thin',
    '穿着': 'wearing',
    '衣服': 'clothes',
    '裙子': 'dress',
    '帽子': 'hat',
    '鞋子': 'shoes',
    '背包': 'backpack',
    '书包': 'school bag',
    '眼镜': 'glasses',
    '短': 'short',
    '长': 'long',
    '卷曲': 'curly',
    '直': 'straight',
    '亮': 'bright',
    '暗': 'dark',
    '年': 'years',
    '岁': 'years old',
    '个': 'a',
    '的': '',
    '有': 'has',
    '是': 'is',
    '很': 'very',
    '非常': 'very',
    '特别': 'especially',
    '喜欢': 'likes',
    '爱': 'loves'
  };
  
  let translated = description;
  
  // 按长度排序，优先替换长词组
  const sortedTranslations = Object.entries(translations)
    .sort(([a], [b]) => b.length - a.length);
  
  for (const [chinese, english] of sortedTranslations) {
    if (chinese) {
      translated = translated.replace(new RegExp(chinese, 'g'), english);
    }
  }
  
  // 清理多余的空格
  translated = translated.replace(/\s+/g, ' ').trim();
  
  return translated || 'a cute child';
}

export default {
  buildMultilingualPrompt,
  translateCharacterDescriptionToEnglish
}; 