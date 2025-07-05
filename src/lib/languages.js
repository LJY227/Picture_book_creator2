// 多语言配置文件
export const LANGUAGES = {
  'zh-CN': {
    code: 'zh-CN',
    name: '简体中文',
    nativeName: '简体中文'
  },
  'zh-TW': {
    code: 'zh-TW', 
    name: '繁體中文',
    nativeName: '繁體中文'
  },
  'en': {
    code: 'en',
    name: 'English',
    nativeName: 'English'
  }
};

export const translations = {
  'zh-CN': {
    // 首页
    'app.title': '绘本创建器',
    'home.title': '绘本创建器',
    'home.createBook': '📖 创建绘本',
    'home.subtitle': '轻松生成专属教学绘本',
    'home.description': '为老师和家长量身定制',
    'home.language': '语言',
    
    // 角色设置页
    'character.title': '角色设置',
    'character.subtitle': '设计你的绘本主角',
    'character.name': '角色姓名',
    'character.name.placeholder': '请输入角色姓名（可选，留空将随机生成）',
    'character.age': '角色年龄',
    'character.age.placeholder': '请输入年龄',
    'character.age.note': '适合年龄：3-12岁',
    'character.identity': '角色身份',
    'character.identity.human': '人类',
    'character.identity.animal': '动物',
    'character.gender': '角色性别',
    'character.gender.boy': '男孩',
    'character.gender.girl': '女孩',
    'character.gender.any': '不限',
    'character.advanced': '自定义角色形象',
    'character.advanced.expand': '展开',
    'character.advanced.collapse': '收起',
    'character.ai.title': '智能角色形象设计',
    'character.ai.description': '描述您想要的角色特征，AI将帮您完善关键细节。支持中文、英文、繁体输入，会用相同语言回复（约50字/词）',
    'character.ai.input.label': '角色特征描述',
    'character.ai.input.placeholder': '中文：一个穿着蓝色毛衣的小男孩，有着卷曲的棕色头发｜English: A boy with blue sweater and curly hair｜繁體：穿著藍色毛衣的男孩',
    'character.ai.input.note': '💡 支持中文、英文、繁体中文输入，AI会用相同语言回复。您可以描述任何特征，即使不完整也没关系！',
    'character.ai.optimize': '智能完善形象',
    'character.ai.optimizing': 'AI完善中...',
    'character.ai.result.label': '完善后的角色形象',
    'character.ai.result.note': '✨ AI已帮您完善角色形象描述，保持您使用的语言。系统会在生成图像时自动优化为最佳格式',
    'character.ai.clear': '清除重新开始',
    'character.ai.reoptimize': '重新完善',
    'character.ai.reoptimizing': '重新完善中...',
    'character.step': '步骤 1/3',
    'character.next': '下一步',
    'character.back': '返回首页',
    
    // 故事设置页
    'story.title': '故事设置',
    'story.subtitle': '为你的绘本构思情节',
    'story.theme': '故事主题',
    'story.theme.placeholder': '请输入故事主题（如：友谊、勇敢、分享）',
    'story.setting': '故事场景',
    'story.setting.placeholder': '描述故事发生的地点和环境',
    'story.plot': '故事情节',
    'story.plot.placeholder': '简单描述你希望的故事发展（可选）',
    'story.next': '下一步：教学内容',
    'story.back': '上一步',
    
    // 教学内容页
    'content.title': '教学内容设置',
    'content.subtitle': '设置绘本的教育目标',
    'content.mode': '内容模式',
    'content.mode.custom': '自定义主题',
    'content.mode.random': '随机主题',
    'content.topic': '教学主题',
    'content.topic.placeholder': '请输入教学主题（如：学会分享、培养友谊）',
    'content.target': '目标受众',
    'content.target.placeholder': '描述目标读者群体（如：3-6岁儿童）',
    'content.next': '开始生成绘本',
    'content.back': '上一步',
    
    // 预览页
    'preview.title': '绘本预览',
    'preview.generating': '正在生成绘本...',
    'preview.regenerate': '重新生成',
    'preview.download': '下载PDF',
    'preview.back': '返回编辑',
    'preview.page': '第 {page} 页',
    
    // 通用按钮
    'button.confirm': '确认',
    'button.cancel': '取消',
    'button.save': '保存',
    'button.edit': '编辑',
    'button.delete': '删除',
    'button.close': '关闭',
    
    // 错误信息
    'error.required': '此字段为必填项',
    'error.network': '网络连接失败，请重试',
    'error.generation': '生成失败，请重试',
    'error.invalid.age': '请输入有效的年龄',
    
    // 成功信息
    'success.saved': '保存成功',
    'success.generated': '生成成功',
    
    // 加载状态
    'loading.generating': '正在生成...',
    'loading.saving': '正在保存...',
    'loading.loading': '加载中...'
  },
  
  'zh-TW': {
    // 首頁
    'app.title': '繪本創建器',
    'home.title': '繪本創建器', 
    'home.createBook': '📖 創建繪本',
    'home.subtitle': '輕鬆生成專屬教學繪本',
    'home.description': '為老師和家長量身定製',
    'home.language': '語言',
    
    // 角色設置頁
    'character.title': '角色設置',
    'character.subtitle': '設計你的繪本主角',
    'character.name': '角色姓名',
    'character.name.placeholder': '請輸入角色姓名（可選，留空將隨機生成）',
    'character.age': '角色年齡',
    'character.age.placeholder': '請輸入年齡',
    'character.age.note': '適合年齡：3-12歲',
    'character.identity': '角色身份',
    'character.identity.human': '人類',
    'character.identity.animal': '動物',
    'character.gender': '角色性別',
    'character.gender.boy': '男孩',
    'character.gender.girl': '女孩',
    'character.gender.any': '不限',
    'character.advanced': '自定義角色形象',
    'character.advanced.expand': '展開',
    'character.advanced.collapse': '收起',
    'character.ai.title': '智能角色形象設計',
    'character.ai.description': '描述您想要的角色特徵，AI將幫您完善關鍵細節。支持中文、英文、繁體輸入，會用相同語言回覆（約50字/詞）',
    'character.ai.input.label': '角色特徵描述',
    'character.ai.input.placeholder': '中文：一個穿著藍色毛衣的小男孩，有著卷曲的棕色頭髮｜English: A boy with blue sweater and curly hair｜繁體：穿著藍色毛衣的男孩',
    'character.ai.input.note': '💡 支持中文、英文、繁體中文輸入，AI會用相同語言回覆。您可以描述任何特徵，即使不完整也沒關係！',
    'character.ai.optimize': '智能完善形象',
    'character.ai.optimizing': 'AI完善中...',
    'character.ai.result.label': '完善後的角色形象',
    'character.ai.result.note': '✨ AI已幫您完善角色形象描述，保持您使用的語言。系統會在生成圖像時自動優化為最佳格式',
    'character.ai.clear': '清除重新開始',
    'character.ai.reoptimize': '重新完善',
    'character.ai.reoptimizing': '重新完善中...',
    'character.step': '步驟 1/3',
    'character.next': '下一步',
    'character.back': '返回首頁',
    
    // 故事設置頁
    'story.title': '故事設置',
    'story.subtitle': '為你的繪本構思情節',
    'story.theme': '故事主題',
    'story.theme.placeholder': '請輸入故事主題（如：友誼、勇敢、分享）',
    'story.setting': '故事場景',
    'story.setting.placeholder': '描述故事發生的地點和環境',
    'story.plot': '故事情節',
    'story.plot.placeholder': '簡單描述你希望的故事發展（可選）',
    'story.next': '下一步：教學內容',
    'story.back': '上一步',
    
    // 教學內容頁
    'content.title': '教學內容設置',
    'content.subtitle': '設置繪本的教育目標',
    'content.mode': '內容模式',
    'content.mode.custom': '自定義主題',
    'content.mode.random': '隨機主題',
    'content.topic': '教學主題',
    'content.topic.placeholder': '請輸入教學主題（如：學會分享、培養友誼）',
    'content.target': '目標受眾',
    'content.target.placeholder': '描述目標讀者群體（如：3-6歲兒童）',
    'content.next': '開始生成繪本',
    'content.back': '上一步',
    
    // 預覽頁
    'preview.title': '繪本預覽',
    'preview.generating': '正在生成繪本...',
    'preview.regenerate': '重新生成',
    'preview.download': '下載PDF',
    'preview.back': '返回編輯',
    'preview.page': '第 {page} 頁',
    
    // 通用按鈕
    'button.confirm': '確認',
    'button.cancel': '取消',
    'button.save': '保存',
    'button.edit': '編輯',
    'button.delete': '刪除',
    'button.close': '關閉',
    
    // 錯誤信息
    'error.required': '此字段為必填項',
    'error.network': '網絡連接失敗，請重試',
    'error.generation': '生成失敗，請重試',
    'error.invalid.age': '請輸入有效的年齡',
    
    // 成功信息
    'success.saved': '保存成功',
    'success.generated': '生成成功',
    
    // 加載狀態
    'loading.generating': '正在生成...',
    'loading.saving': '正在保存...',
    'loading.loading': '加載中...'
  },
  
  'en': {
    // Home Page
    'app.title': 'Picture Book Creator',
    'home.title': 'Picture Book Creator',
    'home.createBook': '📖 Create Book',
    'home.subtitle': 'Easily generate custom educational picture books',
    'home.description': 'Tailored for teachers and parents',
    'home.language': 'Language',
    
    // Character Setup Page
    'character.title': 'Character Setup',
    'character.subtitle': 'Design your picture book protagonist',
    'character.name': 'Character Name',
    'character.name.placeholder': 'Enter character name (optional, leave blank for random)',
    'character.age': 'Character Age',
    'character.age.placeholder': 'Enter age',
    'character.age.note': 'Suitable age: 3-12 years old',
    'character.identity': 'Character Identity',
    'character.identity.human': 'Human',
    'character.identity.animal': 'Animal',
    'character.gender': 'Character Gender',
    'character.gender.boy': 'Boy',
    'character.gender.girl': 'Girl',
    'character.gender.any': 'Any',
    'character.advanced': 'Custom Character Image',
    'character.advanced.expand': 'Expand',
    'character.advanced.collapse': 'Collapse',
    'character.ai.title': 'AI Character Image Design',
    'character.ai.description': 'Describe your desired character traits, AI will help you refine key details. Supports Chinese, English, Traditional Chinese input, will reply in the same language (about 50 characters/words)',
    'character.ai.input.label': 'Character Features Description',
    'character.ai.input.placeholder': 'Chinese: A boy wearing a blue sweater with curly brown hair | English: A boy with blue sweater and curly hair | Traditional: A boy wearing a blue sweater',
    'character.ai.input.note': '💡 Supports Chinese, English, Traditional Chinese input, AI will reply in the same language. You can describe any features, even if incomplete!',
    'character.ai.optimize': 'AI Enhance Image',
    'character.ai.optimizing': 'AI Enhancing...',
    'character.ai.result.label': 'Enhanced Character Image',
    'character.ai.result.note': '✨ AI has helped you enhance character image description, keeping your language. System will automatically optimize for best format when generating images',
    'character.ai.clear': 'Clear and Restart',
    'character.ai.reoptimize': 'Re-enhance',
    'character.ai.reoptimizing': 'Re-enhancing...',
    'character.step': 'Step 1/3',
    'character.next': 'Next',
    'character.back': 'Back to Home',
    
    // Story Setup Page
    'story.title': 'Story Setup',
    'story.subtitle': 'Create the plot for your picture book',
    'story.theme': 'Story Theme',
    'story.theme.placeholder': 'Enter story theme (e.g., friendship, courage, sharing)',
    'story.setting': 'Story Setting',
    'story.setting.placeholder': 'Describe where and when the story takes place',
    'story.plot': 'Story Plot',
    'story.plot.placeholder': 'Briefly describe your desired story development (optional)',
    'story.next': 'Next: Educational Content',
    'story.back': 'Previous',
    
    // Educational Content Page
    'content.title': 'Educational Content Setup',
    'content.subtitle': 'Set educational goals for your picture book',
    'content.mode': 'Content Mode',
    'content.mode.custom': 'Custom Theme',
    'content.mode.random': 'Random Theme',
    'content.topic': 'Educational Topic',
    'content.topic.placeholder': 'Enter educational topic (e.g., learning to share, building friendship)',
    'content.target': 'Target Audience',
    'content.target.placeholder': 'Describe target readers (e.g., children aged 3-6)',
    'content.next': 'Start Generating Book',
    'content.back': 'Previous',
    
    // Preview Page
    'preview.title': 'Book Preview',
    'preview.generating': 'Generating picture book...',
    'preview.regenerate': 'Regenerate',
    'preview.download': 'Download PDF',
    'preview.back': 'Back to Edit',
    'preview.page': 'Page {page}',
    
    // Common Buttons
    'button.confirm': 'Confirm',
    'button.cancel': 'Cancel',
    'button.save': 'Save',
    'button.edit': 'Edit',
    'button.delete': 'Delete',
    'button.close': 'Close',
    
    // Error Messages
    'error.required': 'This field is required',
    'error.network': 'Network connection failed, please try again',
    'error.generation': 'Generation failed, please try again',
    'error.invalid.age': 'Please enter a valid age',
    
    // Success Messages
    'success.saved': 'Saved successfully',
    'success.generated': 'Generated successfully',
    
    // Loading States
    'loading.generating': 'Generating...',
    'loading.saving': 'Saving...',
    'loading.loading': 'Loading...'
  }
};

// 默认语言
export const DEFAULT_LANGUAGE = 'zh-CN';

// 获取浏览器语言
export const getBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.userLanguage;
  
  // 检查是否有完全匹配的语言
  if (LANGUAGES[browserLang]) {
    return browserLang;
  }
  
  // 检查是否有语言前缀匹配（如 en-US -> en）
  const langPrefix = browserLang.split('-')[0];
  const matchedLang = Object.keys(LANGUAGES).find(lang => lang.startsWith(langPrefix));
  
  return matchedLang || DEFAULT_LANGUAGE;
}; 