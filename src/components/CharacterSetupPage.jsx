import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { ArrowLeft, ArrowRight, User, Sparkles, Settings, Loader2, Palette, Camera, Shirt, Heart, Wand2, Eye, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext.jsx'
import { CHARACTER_STRATEGY } from '@/lib/characterConsistency.js'
import { optimizeCharacterDescription, callQwenChat } from '@/lib/qwen.js'
import { generateTextToImageComplete } from '@/lib/liblibai.js'

export default function CharacterSetupPage() {
  const navigate = useNavigate()
  const { t, currentLanguage } = useLanguage()
  const [characterData, setCharacterData] = useState({
    name: '',
    age: 6,
    identity: 'human',
    customIdentity: '', // 新增：自定义身份
    customDescription: '',
    optimizedDescription: '',
    strategy: CHARACTER_STRATEGY.HYBRID,
    // 详细参数模板
    coreFeatures: '',
    clothingAndAccessories: '',
    sceneAndEnvironment: '',
    emotionsAndPose: '',
    artStyle: ''
  })

  const [showAdvanced, setShowAdvanced] = useState(true) // 默认展开
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [activeTab, setActiveTab] = useState('detailed') // 默认详细参数模式
  const [isGeneratingIdentity, setIsGeneratingIdentity] = useState(false) // 新增：生成身份描述状态
  const [previewImage, setPreviewImage] = useState(null) // 新增：预览图片
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false) // 新增：生成预览状态

  // 参数模板示例
  const parameterExamples = {
    coreFeatures: {
      'zh-CN': '例如：女性，年轻成年人，亚洲人，苗条身材，长直黑发，棕色眼睛',
      'zh-TW': '例如：女性，年輕成年人，亞洲人，苗條身材，長直黑髮，棕色眼睛',
      'en': 'e.g., female, young adult, asian, slim body, long straight black hair, brown eyes'
    },
    clothingAndAccessories: {
      'zh-CN': '例如：商务套装，白色衬衫，黑色西装外套，铅笔裙，高跟鞋，简单项链，手表',
      'zh-TW': '例如：商務套裝，白色襯衫，黑色西裝外套，鉛筆裙，高跟鞋，簡單項鍊，手錶',
      'en': 'e.g., business suit, white shirt, black blazer, pencil skirt, high heels, simple necklace, watch'
    },
    sceneAndEnvironment: {
      'zh-CN': '例如：现代办公室，明亮的自然光，白天，室内，窗外城市景观',
      'zh-TW': '例如：現代辦公室，明亮的自然光，白天，室內，窗外城市景觀',
      'en': 'e.g., modern office, bright natural light, daytime, indoors, city view through window'
    },
    emotionsAndPose: {
      'zh-CN': '例如：自信的表情，专注，站立，双臂交叉，微笑',
      'zh-TW': '例如：自信的表情，專注，站立，雙臂交叉，微笑',
      'en': 'e.g., confident expression, focused, standing, arms crossed, slight smile'
    },
    artStyle: {
      'zh-CN': '例如：写实风格，超现实，8K，高细节，杰作，详细皮肤，专业摄影',
      'zh-TW': '例如：寫實風格，超現實，8K，高細節，傑作，詳細皮膚，專業攝影',
      'en': 'e.g., photorealistic, ultra realistic, 8k, high detail, masterpiece, detailed skin, professional photography'
    }
  }

  const handleNext = () => {
    // 如果姓名为空，生成随机姓名
    if (!characterData.name.trim()) {
      const randomNames = {
        'zh-CN': ['小明', '小红', '小华', '小丽', '小强', '小美', '小杰', '小雨'],
        'zh-TW': ['小明', '小紅', '小華', '小麗', '小強', '小美', '小傑', '小雨'],
        'en': ['Alex', 'Sam', 'Jamie', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jordan']
      }
      const names = randomNames[currentLanguage] || randomNames['zh-CN']
      const randomName = names[Math.floor(Math.random() * names.length)]
      setCharacterData(prev => ({ ...prev, name: randomName }))
    }
    
    // 合并详细参数到自定义描述中
    const detailedDescription = combineDetailedParameters(characterData)
    
    // 构建最终的角色身份描述
    let finalIdentity = characterData.identity
    if (characterData.identity === 'other' && characterData.customIdentity) {
      finalIdentity = characterData.customIdentity
    }
    
    // 如果有优化后的描述，使用优化后的描述作为customDescription
    const finalData = {
      ...characterData,
      identity: finalIdentity,
      customDescription: detailedDescription || characterData.optimizedDescription || characterData.customDescription,
      strategy: (detailedDescription || characterData.customDescription || characterData.optimizedDescription) 
        ? CHARACTER_STRATEGY.HYBRID 
        : CHARACTER_STRATEGY.PREDEFINED
    }
    
    // 保存数据到localStorage
    localStorage.setItem('characterData', JSON.stringify(finalData))
    navigate('/story-setup')
  }

  // 合并详细参数为完整描述
  const combineDetailedParameters = (data) => {
    const parts = []
    if (data.coreFeatures) parts.push(data.coreFeatures)
    if (data.clothingAndAccessories) parts.push(data.clothingAndAccessories)
    if (data.sceneAndEnvironment) parts.push(data.sceneAndEnvironment)
    if (data.emotionsAndPose) parts.push(data.emotionsAndPose)
    if (data.artStyle) parts.push(data.artStyle)
    
    return parts.length > 0 ? parts.join(', ') : ''
  }

  const handleOptimizeDescription = async () => {
    const descriptionToOptimize = activeTab === 'detailed' 
      ? combineDetailedParameters(characterData)
      : characterData.customDescription

    if (!descriptionToOptimize.trim()) {
      return
    }

    setIsOptimizing(true)
    try {
      const basicInfo = {
        age: characterData.age,
        gender: characterData.gender,
        identity: characterData.identity
      }
      
      const optimizedResult = await optimizeCharacterDescription(
        descriptionToOptimize, 
        basicInfo
      )
      
      setCharacterData(prev => ({
        ...prev,
        optimizedDescription: optimizedResult
      }))
    } catch (error) {
      console.error('Optimize character description failed:', error)
      // 可以添加错误提示
    } finally {
      setIsOptimizing(false)
    }
  }

  // 新增：根据自定义身份生成角色描述
  const handleGenerateFromCustomIdentity = async (customIdentity) => {
    if (!customIdentity.trim()) return
    
    setIsGeneratingIdentity(true)
    try {
      const prompt = `请为"${customIdentity}"这个角色身份生成详细的人物形象描述。请用以下格式回复：

核心人物特征：[外貌特征，如：年龄外观、身材、发型、面容特点等]
服装与配饰：[服装风格、颜色、配饰等]
情绪与姿态：[常见表情、姿态、性格特点等]
艺术风格与质量：[适合的艺术风格、画面质量要求等]

请确保描述适合儿童绘本，积极正面，富有想象力。`

      const result = await callQwenChat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      }, 'CHARACTER_GENERATION')

      if (result?.content) {
        // 解析返回的内容并填入相应字段
        parseAndFillCharacterDescription(result.content)
      }
    } catch (error) {
      console.error('生成角色描述失败:', error)
    } finally {
      setIsGeneratingIdentity(false)
    }
  }

  // 解析并填充角色描述
  const parseAndFillCharacterDescription = (content) => {
    const lines = content.split('\n').filter(line => line.trim())
    const newData = { ...characterData }

    for (const line of lines) {
      if (line.includes('核心人物特征：') || line.includes('核心人物特征:')) {
        newData.coreFeatures = line.split('：')[1] || line.split(':')[1] || ''
      } else if (line.includes('服装与配饰：') || line.includes('服装与配饰:')) {
        newData.clothingAndAccessories = line.split('：')[1] || line.split(':')[1] || ''
      } else if (line.includes('情绪与姿态：') || line.includes('情绪与姿态:')) {
        newData.emotionsAndPose = line.split('：')[1] || line.split(':')[1] || ''
      } else if (line.includes('艺术风格与质量：') || line.includes('艺术风格与质量:')) {
        newData.artStyle = line.split('：')[1] || line.split(':')[1] || ''
      }
    }

    // 如果没有场景环境，添加默认的
    if (!newData.sceneAndEnvironment) {
      newData.sceneAndEnvironment = '简洁的背景，适合儿童绘本的温馨场景'
    }

    setCharacterData(newData)
  }

  // 新增：生成角色预览
  const handleGeneratePreview = async () => {
    const combinedDescription = combineDetailedParameters(characterData)
    if (!combinedDescription.trim()) {
      alert('请先填写角色描述信息')
      return
    }

    setIsGeneratingPreview(true)
    try {
      // 构建适合LiblibAI的英文提示词
      let prompt = `children's book character, ${combinedDescription}, cartoon style, friendly, suitable for kids, high quality, detailed`
      
      // 如果有自定义身份，加入到提示词中
      if (characterData.customIdentity) {
        prompt = `${characterData.customIdentity} character, ${prompt}`
      }

      const result = await generateTextToImageComplete(prompt, (progress) => {
        console.log('预览生成进度:', progress)
      })

      if (result?.data?.imgUrl) {
        setPreviewImage(result.data.imgUrl)
      }
    } catch (error) {
      console.error('生成预览失败:', error)
      alert('预览生成失败，请稍后重试')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <User className="w-6 h-6 text-blue-500 mr-3" />
            <h1 className="text-xl font-medium text-gray-800">{t('character.title')}</h1>
          </div>
          <div className="text-sm text-gray-500">{t('character.step')}</div>
        </div>
        
        {/* 进度条 */}
        <div className="max-w-2xl mx-auto mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full w-1/3 transition-all duration-300"></div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12 pb-24 sm:pb-32">
        <div className="space-y-6 sm:space-y-8">
          {/* 角色姓名 */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-base font-medium text-gray-700">
              {t('character.name')}
            </Label>
            <Input
              id="name"
              type="text"
              placeholder={t('character.name.placeholder')}
              value={characterData.name}
              onChange={(e) => setCharacterData(prev => ({ ...prev, name: e.target.value }))}
              className="text-base py-3 rounded-xl border-gray-200 focus:border-blue-500"
            />
          </div>

          {/* 角色年龄 */}
          <div className="space-y-3">
            <Label htmlFor="age" className="text-base font-medium text-gray-700">
              {t('character.age')}
            </Label>
            <Input
              id="age"
              type="number"
              min="3"
              max="12"
              value={characterData.age}
              onChange={(e) => setCharacterData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
              className="text-base py-3 rounded-xl border-gray-200 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500">{t('character.age.note')}</p>
          </div>

          {/* 角色身份 */}
          <div className="space-y-4">
            <Label className="text-base font-medium text-gray-700">{t('character.identity')}</Label>
            <RadioGroup
              value={characterData.identity}
              onValueChange={(value) => {
                setCharacterData(prev => ({ ...prev, identity: value }))
                // 当选择非"其他"选项时，清空自定义身份
                if (value !== 'other') {
                  setCharacterData(prev => ({ ...prev, customIdentity: '' }))
                }
              }}
              className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="human" id="human" />
                <Label htmlFor="human" className="text-base cursor-pointer">{t('character.identity.human')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="animal" id="animal" />
                <Label htmlFor="animal" className="text-base cursor-pointer">{t('character.identity.animal')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="text-base cursor-pointer">{t('character.identity.other')}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 自定义角色身份输入 */}
          {characterData.identity === 'other' && (
            <div className="space-y-3">
              <Label htmlFor="customIdentity" className="text-base font-medium text-gray-700">
                {t('character.identity.custom')}
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="customIdentity"
                  type="text"
                  placeholder={t('character.identity.custom.placeholder')}
                  value={characterData.customIdentity}
                  onChange={(e) => setCharacterData(prev => ({ ...prev, customIdentity: e.target.value }))}
                  className="flex-1 text-base py-3 rounded-xl border-gray-200 focus:border-blue-500"
                />
                <Button
                  onClick={() => handleGenerateFromCustomIdentity(characterData.customIdentity)}
                  disabled={!characterData.customIdentity.trim() || isGeneratingIdentity}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl"
                >
                  {isGeneratingIdentity ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('character.identity.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* 角色形象设计 */}
          <div className="border-t border-gray-100 pt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Settings className="w-5 h-5 mr-3 text-gray-500" />
                <span className="text-base font-medium text-gray-700">{t('character.advanced')}</span>
              </div>
              <Button
                onClick={handleGeneratePreview}
                disabled={isGeneratingPreview || !combineDetailedParameters(characterData).trim()}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
              >
                {isGeneratingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('character.preview.generating')}
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    {t('character.preview')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 预览图片显示 */}
          {previewImage && (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-center">
                  <img 
                    src={previewImage} 
                    alt="角色预览" 
                    className="max-w-full h-auto rounded-lg mx-auto"
                    style={{ maxHeight: '300px' }}
                  />
                  <div className="mt-2 flex justify-center space-x-2">
                    <Button
                      onClick={handleGeneratePreview}
                      disabled={isGeneratingPreview}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {t('character.preview.retry')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 角色形象设计内容 */}
          <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
                  {t('character.ai.title')}
                </CardTitle>
                <CardDescription>
                  {t('character.ai.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 描述输入模式选择 */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="simple" className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      简单描述
                    </TabsTrigger>
                    <TabsTrigger value="detailed" className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      详细参数
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* 简单描述模式 */}
                  <TabsContent value="simple" className="space-y-4">
                    <div className="space-y-3">
                      <Label htmlFor="customDescription" className="text-base font-medium text-gray-700">
                        {t('character.ai.input.label')}
                      </Label>
                      <Textarea
                        id="customDescription"
                        placeholder={t('character.ai.input.placeholder')}
                        value={characterData.customDescription}
                        onChange={(e) => setCharacterData(prev => ({ ...prev, customDescription: e.target.value }))}
                        className="min-h-[100px] text-base rounded-xl border-gray-200 focus:border-blue-500"
                      />
                      <p className="text-sm text-gray-500">
                        {t('character.ai.input.note')}
                      </p>
                    </div>
                  </TabsContent>
                  
                  {/* 详细参数模式 */}
                  <TabsContent value="detailed" className="space-y-6">
                    <div className="space-y-6">
                      {/* 核心人物特征 */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          核心人物特征
                        </Label>
                        <Textarea
                          placeholder={parameterExamples.coreFeatures[currentLanguage] || parameterExamples.coreFeatures['en']}
                          value={characterData.coreFeatures}
                          onChange={(e) => setCharacterData(prev => ({ ...prev, coreFeatures: e.target.value }))}
                          className="min-h-[80px] text-base rounded-xl border-gray-200 focus:border-blue-500"
                        />
                      </div>

                      {/* 服装与配饰 */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                          <Shirt className="w-4 h-4" />
                          服装与配饰
                        </Label>
                        <Textarea
                          placeholder={parameterExamples.clothingAndAccessories[currentLanguage] || parameterExamples.clothingAndAccessories['en']}
                          value={characterData.clothingAndAccessories}
                          onChange={(e) => setCharacterData(prev => ({ ...prev, clothingAndAccessories: e.target.value }))}
                          className="min-h-[80px] text-base rounded-xl border-gray-200 focus:border-blue-500"
                        />
                      </div>

                      {/* 场景与环境 */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          场景与环境
                        </Label>
                        <Textarea
                          placeholder={parameterExamples.sceneAndEnvironment[currentLanguage] || parameterExamples.sceneAndEnvironment['en']}
                          value={characterData.sceneAndEnvironment}
                          onChange={(e) => setCharacterData(prev => ({ ...prev, sceneAndEnvironment: e.target.value }))}
                          className="min-h-[80px] text-base rounded-xl border-gray-200 focus:border-blue-500"
                        />
                      </div>

                      {/* 情绪与姿态 */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                          <Heart className="w-4 h-4" />
                          情绪与姿态
                        </Label>
                        <Textarea
                          placeholder={parameterExamples.emotionsAndPose[currentLanguage] || parameterExamples.emotionsAndPose['en']}
                          value={characterData.emotionsAndPose}
                          onChange={(e) => setCharacterData(prev => ({ ...prev, emotionsAndPose: e.target.value }))}
                          className="min-h-[80px] text-base rounded-xl border-gray-200 focus:border-blue-500"
                        />
                      </div>

                      {/* 艺术风格与质量 */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          艺术风格与质量
                        </Label>
                        <Textarea
                          placeholder={parameterExamples.artStyle[currentLanguage] || parameterExamples.artStyle['en']}
                          value={characterData.artStyle}
                          onChange={(e) => setCharacterData(prev => ({ ...prev, artStyle: e.target.value }))}
                          className="min-h-[80px] text-base rounded-xl border-gray-200 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* 优化按钮 */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleOptimizeDescription}
                    disabled={
                      (activeTab === 'simple' && !characterData.customDescription.trim()) ||
                      (activeTab === 'detailed' && !combineDetailedParameters(characterData).trim()) ||
                      isOptimizing
                    }
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('character.ai.optimizing')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {t('character.ai.optimize')}
                      </>
                    )}
                  </Button>
                </div>

                {/* 优化结果显示 */}
                {characterData.optimizedDescription && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium text-gray-700">
                      {t('character.ai.result.label')}
                    </Label>
                    <Textarea
                      value={characterData.optimizedDescription}
                      onChange={(e) => setCharacterData(prev => ({ ...prev, optimizedDescription: e.target.value }))}
                      className="min-h-[120px] text-base rounded-xl border-green-200 focus:border-green-500 bg-green-50"
                      placeholder={t('character.ai.result.label')}
                    />
                    <p className="text-sm text-gray-500">
                      {t('character.ai.result.note')}
                    </p>
                    
                    {/* 操作按钮 */}
                    <div className="flex justify-center space-x-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setCharacterData(prev => ({ ...prev, optimizedDescription: '' }))}
                        className="text-sm px-4 py-2"
                      >
                        {t('character.ai.clear')}
                      </Button>
                      <Button
                        onClick={handleOptimizeDescription}
                        disabled={
                          (activeTab === 'simple' && !characterData.customDescription.trim()) ||
                          (activeTab === 'detailed' && !combineDetailedParameters(characterData).trim()) ||
                          isOptimizing
                        }
                        variant="outline"
                        className="text-sm px-4 py-2"
                      >
                        {isOptimizing ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            {t('character.ai.reoptimizing')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            {t('character.ai.reoptimize')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-4 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 sm:justify-between">
          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full sm:w-auto px-4 sm:px-6 py-3 rounded-xl border-gray-200 hover:bg-gray-50 order-2 sm:order-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('character.back')}
          </Button>
          <Button
            onClick={handleNext}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-xl order-1 sm:order-2"
          >
            {t('character.next')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

