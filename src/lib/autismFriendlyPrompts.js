/**
 * 自闭症儿童友好的DALL-E 3图像生成关键词模块
 * 基于自闭症儿童视觉偏好和认知特征设计的标准化关键词模板
 */

/**
 * 基础视觉风格关键词（所有图像通用）
 */
const BASE_VISUAL_STYLE = [
  "A clean, soft, 2D cartoon-style illustration for a children's picture book.",
  "Simple composition with minimal background details, using flat colors and clear outlines.",
  "Soft pastel palette (light blue, soft yellow, lavender, mint green).",
  "Avoid clutter. Only 1-2 characters per image. Clear facial expressions and gestures.",
  "No text in the image. Bright but gentle lighting. Consistent drawing style across all pages."
].join(" ");

/**
 * 背景与颜色关键词
 */
const BACKGROUND_KEYWORDS = [
  "Background uses low-stimulation colors (pastel yellow, sky blue, pale green, soft peach).",
  "Keep the background very simple: a soft gradient or a lightly detailed indoor room or playground setting.",
  "Avoid bright reds, flashing lights, or high-contrast patterns."
].join(" ");

/**
 * 动作清晰度关键词
 */
const ACTION_CLARITY_KEYWORDS = [
  "Character actions are easy to read with clear posture and gesture.",
  "Include bold cartoon motion lines or visual cues (like small stars, wavy lines, etc.) to emphasize emotional states or physical actions."
].join(" ");

/**
 * 艺术风格参考
 */
const ART_STYLE_REFERENCE = "In the style of Flavia Sorrentino, with lively ink outlines and soft watercolor fills. Gentle, expressive, and emotionally warm.";

/**
 * 标准化角色描述模板
 */
const CHARACTER_TEMPLATES = {
  // 人类角色模板
  human: {
    boy: {
      age5: "a small boy around 5 years old, with messy brown hair, big round eyes, wearing a purple shirt, teal backpack, blue jeans, and white sneakers",
      age6: "a 6-year-old boy with short brown hair, bright eyes, wearing a blue t-shirt, dark jeans, and colorful sneakers",
      age7: "a 7-year-old boy with neat hair, friendly smile, wearing a green hoodie, khaki pants, and comfortable shoes"
    },
    girl: {
      age5: "a small girl around 5 years old, with shoulder-length brown hair, big round eyes, wearing a pink dress, white cardigan, and small white shoes",
      age6: "a 6-year-old girl with ponytail hair, gentle smile, wearing a yellow t-shirt, purple skirt, and pink sneakers",
      age7: "a 7-year-old girl with braided hair, bright expression, wearing a light blue blouse, denim overalls, and comfortable sandals"
    },
    child: {
      age5: "a small child around 5 years old, with soft hair, kind eyes, wearing a colorful striped shirt, comfortable pants, and sneakers",
      age6: "a 6-year-old child with friendly appearance, wearing a simple t-shirt, jeans, and comfortable shoes",
      age7: "a 7-year-old child with cheerful expression, wearing casual clothes and a warm smile"
    }
  },
  
  // 动物角色模板
  animal: {
    bear: "a small brown bear with soft fur, wearing a red T-shirt, big round eyes, and a gentle expression",
    rabbit: "a cute white rabbit with long ears, wearing a pink dress, bright eyes, and a friendly smile",
    cat: "a small orange cat with soft fur, wearing a green vest, big eyes, and a curious expression",
    dog: "a friendly brown and white dog with floppy ears, wearing a yellow jacket, bright eyes, and a happy expression",
    bird: "a small blue bird with colorful feathers, wearing a tiny scarf, bright eyes, and a cheerful expression"
  }
};

/**
 * 情绪表达关键词
 */
const EMOTION_KEYWORDS = {
  happy: "with a bright smile, sparkling eyes, and joyful posture",
  sad: "with downturned mouth, droopy eyes, and slumped shoulders, but still gentle and approachable",
  angry: "with furrowed brow, puffed cheeks, but not scary or threatening, maintaining child-friendly appearance",
  surprised: "with wide eyes, open mouth, and raised eyebrows, showing wonder and curiosity",
  calm: "with peaceful expression, relaxed posture, and gentle smile",
  excited: "with big smile, bright eyes, and energetic posture, maybe with small motion lines",
  confused: "with tilted head, questioning expression, and one finger near chin",
  proud: "with chest out, big smile, and confident posture"
};

/**
 * 常见动作关键词
 */
const ACTION_KEYWORDS = {
  sitting: "sitting comfortably",
  standing: "standing confidently",
  walking: "walking forward with clear steps",
  running: "running with clear motion lines",
  playing: "playing happily",
  reading: "reading a book carefully",
  eating: "eating food politely",
  sleeping: "sleeping peacefully",
  talking: "talking with clear gestures",
  listening: "listening attentively",
  helping: "helping others kindly",
  sharing: "sharing with friends",
  learning: "learning something new with interest",
  thinking: "thinking with finger near chin"
};

/**
 * 场景环境关键词
 */
const SCENE_ENVIRONMENTS = {
  home: "in a cozy home setting with soft furniture and warm colors",
  school: "in a simple classroom with basic furniture and educational items",
  playground: "in a clean playground with simple equipment and soft ground",
  park: "in a peaceful park with trees, grass, and gentle pathways",
  library: "in a quiet library with books and comfortable seating",
  bedroom: "in a tidy bedroom with bed, toys, and soft lighting",
  kitchen: "in a clean kitchen with simple appliances and dining table",
  garden: "in a beautiful garden with flowers, plants, and gentle paths"
};

/**
 * 生成标准化角色描述
 * @param {Object} character - 角色信息
 * @returns {string} 标准化的英文角色描述
 */
export function generateCharacterDescription(character) {
  const { identity, gender, age, name } = character;
  
  if (identity === 'human') {
    const genderKey = gender === 'any' ? 'child' : gender;
    const ageKey = `age${age}`;
    
    if (CHARACTER_TEMPLATES.human[genderKey] && CHARACTER_TEMPLATES.human[genderKey][ageKey]) {
      return CHARACTER_TEMPLATES.human[genderKey][ageKey];
    }
    
    // 默认人类角色描述
    return CHARACTER_TEMPLATES.human.child.age6;
  } else {
    // 动物角色，根据名字或随机选择
    const animalTypes = Object.keys(CHARACTER_TEMPLATES.animal);
    let animalType = 'bear'; // 默认
    
    // 尝试从名字推断动物类型
    if (name) {
      const nameLower = name.toLowerCase();
      for (const type of animalTypes) {
        if (nameLower.includes(type) || nameLower.includes(type.charAt(0).toUpperCase() + type.slice(1))) {
          animalType = type;
          break;
        }
      }
    }
    
    return CHARACTER_TEMPLATES.animal[animalType];
  }
}

/**
 * 生成完整的DALL-E 3提示词
 * @param {Object} params - 参数对象
 * @param {Object} params.character - 角色信息
 * @param {string} params.sceneDescription - 场景描述
 * @param {string} params.emotion - 情绪状态
 * @param {string} params.action - 动作
 * @param {string} params.environment - 环境
 * @returns {string} 完整的DALL-E 3提示词
 */
export function generateAutismFriendlyPrompt({ character, sceneDescription, emotion = 'calm', action = 'standing', environment = 'home' }) {
  // 获取角色描述
  const characterDesc = generateCharacterDescription(character);
  
  // 获取情绪描述
  const emotionDesc = EMOTION_KEYWORDS[emotion] || EMOTION_KEYWORDS.calm;
  
  // 获取动作描述
  const actionDesc = ACTION_KEYWORDS[action] || ACTION_KEYWORDS.standing;
  
  // 获取环境描述
  const environmentDesc = SCENE_ENVIRONMENTS[environment] || SCENE_ENVIRONMENTS.home;
  
  // 构建完整提示词
  const promptParts = [
    BASE_VISUAL_STYLE,
    `The main character is ${characterDesc}.`,
    `The character is ${actionDesc} ${emotionDesc}.`,
    `Scene: ${sceneDescription}`,
    environmentDesc,
    BACKGROUND_KEYWORDS,
    ACTION_CLARITY_KEYWORDS,
    ART_STYLE_REFERENCE,
    "Consistent style with previous pages."
  ];
  
  return promptParts.join(" ");
}

/**
 * 从中文场景描述中提取关键信息
 * @param {string} chineseDescription - 中文场景描述
 * @returns {Object} 提取的关键信息
 */
export function extractSceneInfo(chineseDescription) {
  const description = chineseDescription.toLowerCase();
  
  // 提取情绪
  let emotion = 'calm';
  if (description.includes('开心') || description.includes('高兴') || description.includes('快乐')) {
    emotion = 'happy';
  } else if (description.includes('难过') || description.includes('伤心')) {
    emotion = 'sad';
  } else if (description.includes('生气') || description.includes('愤怒')) {
    emotion = 'angry';
  } else if (description.includes('惊讶') || description.includes('吃惊')) {
    emotion = 'surprised';
  } else if (description.includes('兴奋')) {
    emotion = 'excited';
  } else if (description.includes('困惑') || description.includes('疑惑')) {
    emotion = 'confused';
  } else if (description.includes('自豪') || description.includes('骄傲')) {
    emotion = 'proud';
  }
  
  // 提取动作
  let action = 'standing';
  if (description.includes('坐') || description.includes('坐着')) {
    action = 'sitting';
  } else if (description.includes('走') || description.includes('行走')) {
    action = 'walking';
  } else if (description.includes('跑') || description.includes('奔跑')) {
    action = 'running';
  } else if (description.includes('玩') || description.includes('游戏')) {
    action = 'playing';
  } else if (description.includes('读') || description.includes('看书')) {
    action = 'reading';
  } else if (description.includes('吃') || description.includes('用餐')) {
    action = 'eating';
  } else if (description.includes('睡') || description.includes('休息')) {
    action = 'sleeping';
  } else if (description.includes('说话') || description.includes('交谈')) {
    action = 'talking';
  } else if (description.includes('听') || description.includes('倾听')) {
    action = 'listening';
  } else if (description.includes('帮助') || description.includes('帮忙')) {
    action = 'helping';
  } else if (description.includes('分享')) {
    action = 'sharing';
  } else if (description.includes('学习') || description.includes('学')) {
    action = 'learning';
  } else if (description.includes('思考') || description.includes('想')) {
    action = 'thinking';
  }
  
  // 提取环境
  let environment = 'home';
  if (description.includes('学校') || description.includes('教室')) {
    environment = 'school';
  } else if (description.includes('操场') || description.includes('游乐场')) {
    environment = 'playground';
  } else if (description.includes('公园')) {
    environment = 'park';
  } else if (description.includes('图书馆')) {
    environment = 'library';
  } else if (description.includes('卧室') || description.includes('房间')) {
    environment = 'bedroom';
  } else if (description.includes('厨房')) {
    environment = 'kitchen';
  } else if (description.includes('花园')) {
    environment = 'garden';
  }
  
  return { emotion, action, environment };
}

/**
 * 获取所有可用的情绪选项
 * @returns {Array} 情绪选项数组
 */
export function getAvailableEmotions() {
  return Object.keys(EMOTION_KEYWORDS);
}

/**
 * 获取所有可用的动作选项
 * @returns {Array} 动作选项数组
 */
export function getAvailableActions() {
  return Object.keys(ACTION_KEYWORDS);
}

/**
 * 获取所有可用的环境选项
 * @returns {Array} 环境选项数组
 */
export function getAvailableEnvironments() {
  return Object.keys(SCENE_ENVIRONMENTS);
}
