/**
 * 高级插画描述生成模块
 * 基于绘本插画人物形象一致性策略和场景描述关键词策略
 * 确保插画与绘本内容的完美匹配和角色形象一致性
 */

/**
 * 分析主角类型，用于确定配角的物种设定
 */
function analyzeCharacterType(character) {
  const description = (character.description || '').toLowerCase();
  const identity = (character.identity || '').toLowerCase();
  const customIdentity = (character.customIdentity || '').toLowerCase();
  
  // 合并所有描述文本进行分析
  const allText = `${description} ${identity} ${customIdentity}`.toLowerCase();
  
  // 动物类型检测
  const animalKeywords = {
    dog: ['狗', '小狗', '狗狗', 'dog', 'puppy', 'canine'],
    cat: ['猫', '小猫', '猫咪', 'cat', 'kitten', 'feline'],
    bear: ['熊', '小熊', 'bear', 'teddy'],
    rabbit: ['兔', '兔子', '小兔', 'rabbit', 'bunny'],
    bird: ['鸟', '小鸟', '鸟儿', 'bird'],
    fox: ['狐狸', '小狐狸', 'fox'],
    elephant: ['大象', '小象', 'elephant'],
    lion: ['狮子', 'lion'],
    tiger: ['老虎', 'tiger'],
    panda: ['熊猫', '大熊猫', 'panda'],
    monkey: ['猴子', '小猴', 'monkey'],
    pig: ['猪', '小猪', 'pig'],
    mouse: ['鼠', '老鼠', '小鼠', 'mouse', 'rat'],
    sheep: ['羊', '小羊', 'sheep', 'lamb'],
    cow: ['牛', '奶牛', 'cow'],
    horse: ['马', '小马', 'horse', 'pony']
  };
  
  // 检测具体动物类型
  for (const [animalType, keywords] of Object.entries(animalKeywords)) {
    if (keywords.some(keyword => allText.includes(keyword))) {
      return { type: 'animal', species: animalType, isAnthropomorphic: true };
    }
  }
  
  // 检测是否为一般动物
  const generalAnimalKeywords = ['动物', 'animal', '兽人', 'anthropomorphic'];
  if (generalAnimalKeywords.some(keyword => allText.includes(keyword))) {
    return { type: 'animal', species: 'generic', isAnthropomorphic: true };
  }
  
  // 机器人类型检测
  const robotKeywords = ['机器人', '机器', '机甲', 'robot', 'android', 'mech'];
  if (robotKeywords.some(keyword => allText.includes(keyword))) {
    return { type: 'robot', species: 'robot', isAnthropomorphic: false };
  }
  
  // 车辆类型检测
  const vehicleKeywords = ['车', '汽车', '摩托', '飞机', '火车', '船', 'car', 'vehicle', 'plane', 'train', 'boat'];
  if (vehicleKeywords.some(keyword => allText.includes(keyword))) {
    return { type: 'vehicle', species: 'vehicle', isAnthropomorphic: false };
  }
  
  // 玩具类型检测
  const toyKeywords = ['玩具', '娃娃', '公仔', 'toy', 'doll', 'plush'];
  if (toyKeywords.some(keyword => allText.includes(keyword))) {
    return { type: 'toy', species: 'toy', isAnthropomorphic: false };
  }
  
  // 食物类型检测
  const foodKeywords = ['巧克力', '蛋糕', '面包', '饼干', 'chocolate', 'cake', 'bread', 'cookie'];
  if (foodKeywords.some(keyword => allText.includes(keyword))) {
    return { type: 'food', species: 'food', isAnthropomorphic: true };
  }
  
  // 默认为人类
  return { type: 'human', species: 'human', isAnthropomorphic: false };
}

/**
 * 生成固定的角色形象描述（基于用户预设）
 */
function generateFixedCharacterDescription(character) {
  const characterType = analyzeCharacterType(character);
  const name = character.name || '主角';
  
  // 基于角色类型生成标准化描述
  let baseDescription = '';
  
  if (characterType.type === 'animal') {
    if (characterType.species !== 'generic') {
      baseDescription = `A cute, anthropomorphic ${characterType.species} character named ${name}`;
    } else {
      baseDescription = `A cute, anthropomorphic animal character named ${name}`;
    }
  } else if (characterType.type === 'robot') {
    baseDescription = `A friendly, child-safe robot character named ${name}`;
  } else if (characterType.type === 'vehicle') {
    baseDescription = `A cute, personified vehicle character named ${name}`;
  } else if (characterType.type === 'toy') {
    baseDescription = `A lovable toy character named ${name}`;
  } else if (characterType.type === 'food') {
    baseDescription = `A cute, personified food character named ${name}`;
  } else {
    baseDescription = `A friendly child character named ${name}`;
  }
  
  // 添加用户定义的特征（简化版本，避免冲突）
  if (character.description && character.description.trim()) {
    // 提取关键视觉特征，避免冗余
    const description = character.description.trim();
    // 如果用户描述很长，只取前100个字符的关键特征
    const keyFeatures = description.length > 100 ? description.substring(0, 100) + '...' : description;
    baseDescription += `, with ${keyFeatures}`;
  }
  
  return {
    description: baseDescription,
    characterType: characterType,
    name: name
  };
}

/**
 * 转换配角描述，确保物种一致性
 */
function ensureSecondaryCharacterConsistency(sceneText, mainCharacterType) {
  if (mainCharacterType.type === 'human') {
    return sceneText; // 人类主角不需要特殊处理
  }
  
  // 配角角色映射
  const roleMapping = {
    animal: {
      '妈妈': `${mainCharacterType.species} mother`,
      '爸爸': `${mainCharacterType.species} father`,
      '母亲': `${mainCharacterType.species} mother`,
      '父亲': `${mainCharacterType.species} father`,
      '老师': `${mainCharacterType.species} teacher`,
      '朋友': `${mainCharacterType.species} friend`,
      '同学': `${mainCharacterType.species} classmate`,
      '奶奶': `elderly ${mainCharacterType.species} grandmother`,
      '爷爷': `elderly ${mainCharacterType.species} grandfather`,
      '姐姐': `${mainCharacterType.species} sister`,
      '哥哥': `${mainCharacterType.species} brother`,
      '弟弟': `younger ${mainCharacterType.species} brother`,
      '妹妹': `younger ${mainCharacterType.species} sister`,
      'mother': `${mainCharacterType.species} mother`,
      'father': `${mainCharacterType.species} father`,
      'teacher': `${mainCharacterType.species} teacher`,
      'friend': `${mainCharacterType.species} friend`,
      'classmate': `${mainCharacterType.species} classmate`,
      // 增强的英文通用配角替换
      'mom': `${mainCharacterType.species} mother`,
      'dad': `${mainCharacterType.species} father`,
      'parent': `${mainCharacterType.species} parent`,
      'woman': `${mainCharacterType.species} mother`,
      'man': `${mainCharacterType.species} father`,
      'adult': `adult ${mainCharacterType.species}`,
      'person': `${mainCharacterType.species} character`,
      'human': `${mainCharacterType.species} character`,
      'lady': `${mainCharacterType.species} female`,
      'gentleman': `${mainCharacterType.species} male`
    },
    robot: {
      '妈妈': 'robot mother unit',
      '爸爸': 'robot father unit',
      '老师': 'robot teacher unit',
      '朋友': 'robot friend unit'
    },
    vehicle: {
      '妈妈': 'mother vehicle',
      '爸爸': 'father vehicle',
      '老师': 'teacher vehicle',
      '朋友': 'friend vehicle'
    },
    food: {
      '妈妈': `${mainCharacterType.species} mother`,
      '爸爸': `${mainCharacterType.species} father`,
      '老师': `${mainCharacterType.species} teacher`,
      '朋友': `${mainCharacterType.species} friend`
    }
  };
  
  const mappings = roleMapping[mainCharacterType.type] || {};
  
  let convertedText = sceneText;
  Object.entries(mappings).forEach(([chinese, english]) => {
    const regex = new RegExp(chinese, 'g');
    convertedText = convertedText.replace(regex, english);
  });
  
  return convertedText;
}

/**
 * 将抽象动作转化为具体视觉描述
 */
function visualizeActions(textContent) {
  const actionMappings = {
    // 情感表达
    '高兴': 'with a bright smile and sparkling eyes',
    '开心': 'with a joyful expression and wide grin',
    '兴奋': 'with eyes wide with excitement, bouncing slightly',
    '难过': 'with a sad expression and drooping posture',
    '害怕': 'with worried eyes and slightly trembling',
    '惊讶': 'with wide eyes and mouth slightly open in surprise',
    '生气': 'with furrowed brows and clenched fists',
    '紧张': 'with tense posture and fidgeting hands',
    
    // 动作描述
    '跑': 'running with arms swinging',
    '走': 'walking with confident steps',
    '坐': 'sitting comfortably',
    '站': 'standing upright',
    '跳': 'jumping with both feet off the ground',
    '爬': 'climbing carefully',
    '躺': 'lying down peacefully',
    '蹲': 'crouching down',
    
    // 互动动作
    '拥抱': 'giving a warm hug with arms wrapped around',
    '握手': 'shaking hands in a friendly gesture',
    '挥手': 'waving enthusiastically',
    '点头': 'nodding in agreement',
    '摇头': 'shaking head gently',
    '指向': 'pointing with one finger extended',
    '展示': 'proudly showing with outstretched arms',
    
    // 学习动作
    '读书': 'reading a book with focused attention',
    '写字': 'writing carefully with proper posture',
    '画画': 'drawing with colorful crayons',
    '思考': 'thinking with one hand on chin',
    '观察': 'observing closely with curious eyes',
    
    // 日常动作
    '吃': 'eating happily',
    '喝': 'drinking from a cup',
    '睡觉': 'sleeping peacefully',
    '洗手': 'washing hands thoroughly',
    '刷牙': 'brushing teeth carefully',
    '穿衣': 'getting dressed',
    
    // 抽象动作转具体
    '描述': 'animatedly gesturing while speaking',
    '说话': 'speaking with expressive gestures',
    '倾听': 'listening attentively with head tilted',
    '学习': 'engaging in learning activities',
    '分享': 'sharing with generous hand movements',
    '帮助': 'offering help with outstretched hands'
  };
  
  let visualizedContent = textContent;
  
  Object.entries(actionMappings).forEach(([chinese, english]) => {
    const regex = new RegExp(chinese, 'g');
    if (regex.test(visualizedContent)) {
      visualizedContent = visualizedContent.replace(regex, `${chinese} (${english})`);
    }
  });
  
  return visualizedContent;
}

/**
 * 构建环境和氛围描述
 */
function buildEnvironmentDescription(textContent) {
  const environmentKeywords = {
    '家': 'in a cozy, warm home environment',
    '学校': 'in a bright, welcoming school setting',
    '教室': 'in a cheerful classroom with educational materials',
    '操场': 'on a fun playground with colorful equipment',
    '公园': 'in a beautiful park with green trees and flowers',
    '厨房': 'in a clean, well-organized kitchen',
    '卧室': 'in a comfortable, peaceful bedroom',
    '客厅': 'in a cozy living room with soft furniture',
    '图书馆': 'in a quiet library surrounded by books',
    '花园': 'in a colorful garden with blooming flowers',
    '街道': 'on a safe, friendly neighborhood street',
    '商店': 'in a bright, welcoming shop',
    '医院': 'in a clean, comforting medical facility',
    '餐厅': 'in a warm, family-friendly restaurant'
  };
  
  let environmentDesc = '';
  
  Object.entries(environmentKeywords).forEach(([chinese, english]) => {
    if (textContent.includes(chinese)) {
      environmentDesc = english;
    }
  });
  
  // 如果没有找到特定环境，使用通用描述
  if (!environmentDesc) {
    environmentDesc = 'in a safe, child-friendly environment';
  }
  
  return environmentDesc;
}

/**
 * 强化非人类特征的描述
 */
function enhanceNonHumanFeatures(characterType, sceneDescription) {
  if (characterType.type === 'human') {
    return sceneDescription;
  }
  
  const enhancementMappings = {
    animal: {
      dog: ['with floppy ears', 'wagging tail', 'paws instead of hands', 'wet nose'],
      cat: ['with whiskers', 'swishing tail', 'soft paws', 'bright eyes'],
      bear: ['with round ears', 'fluffy fur', 'gentle paws', 'friendly snout'],
      rabbit: ['with long ears', 'cotton tail', 'soft fur', 'twitching nose'],
      bird: ['with colorful feathers', 'bright beak', 'wing gestures', 'chirpy expression'],
      fox: ['with pointed ears', 'bushy tail', 'alert eyes', 'orange fur'],
      generic: ['with animal features', 'non-human characteristics', 'animal posture']
    },
    robot: ['with metallic features', 'LED indicator lights', 'mechanical joints', 'digital display elements'],
    vehicle: ['with vehicle-like features', 'wheels or treads', 'headlight eyes', 'mechanical details'],
    toy: ['with toy-like texture', 'soft plush appearance', 'button eyes', 'stitched details'],
    food: ['with food-like texture', 'appetizing appearance', 'colorful surface', 'delicious details']
  };
  
  const enhancements = enhancementMappings[characterType.type];
  if (!enhancements) return sceneDescription;
  
  let enhancedDescription = sceneDescription;
  
  if (characterType.type === 'animal' && characterType.species !== 'generic') {
    const speciesFeatures = enhancements[characterType.species] || enhancements.generic;
    const randomFeatures = speciesFeatures.slice(0, 2); // 选择2个特征
    enhancedDescription += `, ${randomFeatures.join(', ')}`;
  } else if (Array.isArray(enhancements)) {
    const randomFeatures = enhancements.slice(0, 2);
    enhancedDescription += `, ${randomFeatures.join(', ')}`;
  }
  
  return enhancedDescription;
}

/**
 * 生成绘本世界观声明
 */
function generateWorldViewStatement(characterType) {
  const worldViewStatements = {
    animal: 'In a charming children\'s book world where all characters are anthropomorphic animals',
    robot: 'In a friendly futuristic world where robot characters live harmoniously',
    vehicle: 'In a magical world where vehicles have personalities and emotions',
    toy: 'In a wonderful toy world where all characters are lovable toys',
    food: 'In a delightful culinary world where food characters come to life',
    human: '' // 人类角色不需要特殊世界观声明
  };
  
  return worldViewStatements[characterType.type] || '';
}

/**
 * 主函数：根据策略生成高级插画描述（支持AI智能分析）
 */
export async function generateAdvancedIllustrationPrompt({
  pageContent,
  characterData,
  storyData = null,
  contentData = null,
  useReferenceImage = false,
  artStyle = null,
  useAIAnalysis = true
}) {
  console.log('🎨 开始生成高级插画描述...');
  
  // 如果启用AI分析且有完整数据，使用智能分析器
  if (useAIAnalysis && storyData && contentData) {
    try {
      console.log('🧠 启用AI智能分析模式...');
      const { analyzeAndOptimizeUserIntent } = await import('./intelligentAnalyzer.js');
      
      // 构建临时基础提示词
      const fixedCharacter = generateFixedCharacterDescription(characterData);
      let basePrompt = fixedCharacter.description;
      if (pageContent && pageContent.trim()) {
        basePrompt += `, ${pageContent}`;
      }
      
      // 调用智能分析器
      const analysisResult = await analyzeAndOptimizeUserIntent({
        characterData,
        storyData,
        contentData,
        pageContent,
        originalPrompt: basePrompt
      });
      
      if (analysisResult.success) {
        console.log('✅ AI智能分析完成，使用优化后的提示词');
        
        // 应用配角一致性检查，确保即使AI分析结果也符合物种一致性
        let finalOptimizedPrompt = analysisResult.finalPrompt;
        
        // 检查并强化配角物种一致性
        if (fixedCharacter.characterType.type !== 'human') {
          console.log('🔍 检查AI分析结果中的配角一致性...');
          
          // 确保提示词中的配角都是同样的物种
          const speciesName = fixedCharacter.characterType.species || fixedCharacter.characterType.type;
          
          // 强化配角描述的物种一致性
          const roleReplacements = {
            'mother': `${speciesName} mother`,
            'mom': `${speciesName} mother`, 
            'father': `${speciesName} father`,
            'dad': `${speciesName} father`,
            'parent': `${speciesName} parent`,
            'teacher': `${speciesName} teacher`,
            'friend': `${speciesName} friend`,
            'classmate': `${speciesName} classmate`,
            'similarly styled': `similarly styled ${speciesName}`,
            'human mother': `${speciesName} mother`,
            'human father': `${speciesName} father`,
            'woman': `${speciesName} mother`,
            'man': `${speciesName} father`,
            'adult': `adult ${speciesName}`,
            'person': `${speciesName} character`
          };
          
          Object.entries(roleReplacements).forEach(([human, animal]) => {
            const regex = new RegExp(`\\b${human}\\b`, 'gi');
            finalOptimizedPrompt = finalOptimizedPrompt.replace(regex, animal);
          });
          
          // 额外强化：确保"who is a"句式中的物种一致性
          finalOptimizedPrompt = finalOptimizedPrompt.replace(
            /who is a ([^,]*?)(mother|father|parent|teacher|friend)/gi, 
            `who is a ${speciesName} $2`
          );
          
          console.log('🔄 配角一致性检查完成，已应用物种强化');
        }
        
        return {
          prompt: finalOptimizedPrompt,
          characterType: fixedCharacter.characterType,
          worldView: analysisResult.characterAnalysis?.characterType?.category || 'unknown',
          environment: analysisResult.illustrationOptimization?.environmentDetails || 'children book scene',
          artStyle: characterData.artStyle || 'watercolor illustration style',
          metadata: {
            useReferenceImage,
            useAIAnalysis: true,
            confidence: analysisResult.metadata.confidence,
            analysisVersion: analysisResult.metadata.analysisVersion,
            characterAnalysis: analysisResult.characterAnalysis,
            storyAnalysis: analysisResult.storyAnalysis,
            illustrationOptimization: analysisResult.illustrationOptimization,
            secondaryCharacterConsistencyApplied: fixedCharacter.characterType.type !== 'human'
          }
        };
      } else {
        console.warn('⚠️ AI智能分析失败，回退到基础模式');
      }
    } catch (error) {
      console.error('❌ AI智能分析出错，回退到基础模式:', error);
    }
  }
  
  // 基础模式（原有逻辑）
  console.log('📝 使用基础模式生成插画描述...');
  
  // 1. 分析主角类型和生成固定描述
  const fixedCharacter = generateFixedCharacterDescription(characterData);
  console.log('🎭 主角分析结果:', fixedCharacter);
  
  // 2. 根据是否有参考图选择角色描述策略
  let characterDescription;
  if (useReferenceImage) {
    // 图生图模式：使用简化描述，让参考图承担外观信息
    characterDescription = `the main character ${fixedCharacter.name}`;
    console.log('🖼️ 使用图生图模式：简化角色描述');
  } else {
    // 文生图模式：使用完整描述
    characterDescription = fixedCharacter.description;
    console.log('📝 使用文生图模式：完整角色描述');
  }
  
  // 3. 转换配角描述，确保物种一致性
  const consistentContent = ensureSecondaryCharacterConsistency(pageContent, fixedCharacter.characterType);
  console.log('👥 配角一致性转换:', consistentContent !== pageContent ? '已转换' : '无需转换');
  
  // 4. 将抽象动作转化为具体视觉描述
  const visualizedContent = visualizeActions(consistentContent);
  console.log('🎬 动作视觉化:', visualizedContent !== consistentContent ? '已转换' : '无需转换');
  
  // 5. 构建环境描述
  const environmentDesc = buildEnvironmentDescription(pageContent);
  console.log('🏠 环境描述:', environmentDesc);
  
  // 6. 强化非人类特征
  let enhancedCharacterDesc = enhanceNonHumanFeatures(fixedCharacter.characterType, characterDescription);
  console.log('🦄 非人类特征强化:', enhancedCharacterDesc !== characterDescription ? '已强化' : '无需强化');
  
  // 7. 生成世界观声明
  const worldViewStatement = generateWorldViewStatement(fixedCharacter.characterType);
  console.log('🌍 世界观声明:', worldViewStatement || '无需声明');
  
  // 8. 获取艺术风格
  let finalArtStyle = artStyle;
  if (!finalArtStyle && characterData.artStyle && characterData.artStyle.trim()) {
    finalArtStyle = characterData.artStyle;
  } else if (!finalArtStyle) {
    finalArtStyle = 'watercolor illustration style, soft colors, gentle brushstrokes, artistic, painted texture';
  }
  console.log('🎨 使用艺术风格:', finalArtStyle);
  
  // 9. 构建最终提示词（按照策略框架）
  const promptParts = [];
  
  // 世界观声明（如果有）
  if (worldViewStatement) {
    promptParts.push(worldViewStatement + ':');
  }
  
  // 主角描述
  promptParts.push(enhancedCharacterDesc);
  
  // 场景和动作描述
  if (visualizedContent && visualizedContent.trim()) {
    promptParts.push(visualizedContent);
  }
  
  // 环境描述
  promptParts.push(environmentDesc);
  
  // 艺术风格和质量描述
  promptParts.push(finalArtStyle);
  promptParts.push('child-friendly, educational, wholesome, appropriate for children aged 3-7');
  promptParts.push('clean background, bright lighting');
  
  // 一致性和无文字要求
  promptParts.push('character must look exactly the same as in previous images');
  promptParts.push('NO TEXT, NO WORDS, NO LETTERS, NO CHINESE CHARACTERS, NO WRITING in the image');
  promptParts.push('illustration only, pure visual storytelling');
  
  const finalPrompt = promptParts.filter(part => part && part.trim()).join(', ');
  
  console.log('✅ 高级插画描述生成完成');
  console.log('📝 最终提示词长度:', finalPrompt.length);
  
  return {
    prompt: finalPrompt,
    characterType: fixedCharacter.characterType,
    worldView: worldViewStatement,
    environment: environmentDesc,
    artStyle: finalArtStyle,
    metadata: {
      useReferenceImage,
      useAIAnalysis: false,
      hasSecondaryCharacters: consistentContent !== pageContent,
      hasActionVisualization: visualizedContent !== consistentContent,
      hasNonHumanEnhancement: enhancedCharacterDesc !== characterDescription
    }
  };
}

/**
 * 为AI故事生成优化imagePrompt（支持智能分析）
 */
export async function optimizeStoryImagePrompt(originalImagePrompt, characterData, options = {}) {
  console.log('🔧 优化AI故事生成的imagePrompt...');
  
  const {
    storyData = null,
    contentData = null,
    pageContent = null,
    useAIAnalysis = true
  } = options;
  
  // 如果启用AI分析且有完整数据，使用智能分析器
  if (useAIAnalysis && storyData && contentData) {
    try {
      console.log('🧠 使用AI智能分析优化imagePrompt...');
      const { analyzeAndOptimizeUserIntent } = await import('./intelligentAnalyzer.js');
      
      const analysisResult = await analyzeAndOptimizeUserIntent({
        characterData,
        storyData,
        contentData,
        pageContent: pageContent || originalImagePrompt,
        originalPrompt: originalImagePrompt
      });
      
      if (analysisResult.success) {
        console.log('✅ AI智能优化完成');
        
        // 对AI分析结果也应用配角一致性检查
        const fixedCharacter = generateFixedCharacterDescription(characterData);
        let finalOptimizedPrompt = analysisResult.finalPrompt;
        
        if (fixedCharacter.characterType.type !== 'human') {
          console.log('🔍 对AI优化结果应用配角一致性检查...');
          
          const speciesName = fixedCharacter.characterType.species || fixedCharacter.characterType.type;
          
          const roleReplacements = {
            'mother': `${speciesName} mother`,
            'mom': `${speciesName} mother`, 
            'father': `${speciesName} father`,
            'dad': `${speciesName} father`,
            'parent': `${speciesName} parent`,
            'teacher': `${speciesName} teacher`,
            'friend': `${speciesName} friend`,
            'classmate': `${speciesName} classmate`,
            'similarly styled': `similarly styled ${speciesName}`,
            'human mother': `${speciesName} mother`,
            'human father': `${speciesName} father`,
            'woman': `${speciesName} mother`,
            'man': `${speciesName} father`,
            'adult': `adult ${speciesName}`,
            'person': `${speciesName} character`
          };
          
          Object.entries(roleReplacements).forEach(([human, animal]) => {
            const regex = new RegExp(`\\b${human}\\b`, 'gi');
            finalOptimizedPrompt = finalOptimizedPrompt.replace(regex, animal);
          });
          
          console.log('🔄 AI分析结果配角一致性检查完成');
        }
        
        return finalOptimizedPrompt;
      } else {
        console.warn('⚠️ AI智能优化失败，使用基础优化');
      }
    } catch (error) {
      console.error('❌ AI智能优化出错，使用基础优化:', error);
    }
  }
  
  // 基础优化模式（原有逻辑）
  console.log('📝 使用基础模式优化imagePrompt...');
  
  const fixedCharacter = generateFixedCharacterDescription(characterData);
  const characterType = fixedCharacter.characterType;
  
  // 分析原始imagePrompt中的角色和场景
  let optimizedPrompt = originalImagePrompt;
  
  // 1. 确保配角物种一致性
  optimizedPrompt = ensureSecondaryCharacterConsistency(optimizedPrompt, characterType);
  
  // 2. 强化非人类特征
  if (characterType.type !== 'human') {
    // 为非人类角色添加强调声明
    const emphasisStatements = {
      animal: 'All characters are anthropomorphic animals, not humans',
      robot: 'All characters are robots with mechanical features',
      vehicle: 'All characters are personified vehicles',
      toy: 'All characters are toy-like with toy characteristics',
      food: 'All characters are personified food items'
    };
    
    const emphasis = emphasisStatements[characterType.type];
    if (emphasis) {
      optimizedPrompt = `${emphasis}. ${optimizedPrompt}`;
    }
  }
  
  // 3. 添加世界观声明
  const worldViewStatement = generateWorldViewStatement(characterType);
  if (worldViewStatement) {
    optimizedPrompt = `${worldViewStatement}: ${optimizedPrompt}`;
  }
  
  // 4. 获取用户选择的风格
  let artStyle = 'watercolor illustration style, soft colors, gentle brushstrokes, artistic, painted texture';
  if (characterData.artStyle && characterData.artStyle.trim()) {
    artStyle = characterData.artStyle;
  }
  
  // 5. 确保包含艺术风格和一致性要求
  if (!optimizedPrompt.includes(artStyle)) {
    optimizedPrompt += `, ${artStyle}`;
  }
  
  // 确保包含一致性要求
  const consistencyKeywords = ['character consistency', 'same appearance', 'consistent style'];
  const hasConsistency = consistencyKeywords.some(keyword => 
    optimizedPrompt.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (!hasConsistency) {
    optimizedPrompt += ', character must look exactly the same as in previous images, consistent art style';
  }
  
  // 确保包含无文字要求
  if (!optimizedPrompt.includes('NO TEXT')) {
    optimizedPrompt += ', NO TEXT, NO WORDS, NO LETTERS, NO CHINESE CHARACTERS, NO WRITING in the image';
  }
  
  console.log('✅ imagePrompt基础优化完成');
  console.log('📊 优化效果:', {
    hasWorldView: !!worldViewStatement,
    hasSpeciesConsistency: optimizedPrompt !== originalImagePrompt,
    characterType: characterType.type,
    species: characterType.species
  });
  
  return optimizedPrompt;
}

/**
 * 导出角色类型分析功能（供其他模块使用）
 */
export { analyzeCharacterType, generateFixedCharacterDescription }; 