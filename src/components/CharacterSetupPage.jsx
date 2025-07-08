import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { ArrowLeft, ArrowRight, User, Sparkles, Loader2, Eye, RefreshCw, Image, Palette } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext.jsx'
import { CHARACTER_STRATEGY } from '@/lib/characterConsistency.js'
import { callQwenChat } from '@/lib/qwen.js'
import { generateTextToImageComplete } from '@/lib/liblibai.js'

// 预设角色关键词（移除风格和场景描述）
const PRESET_KEYWORDS = {
  human: "20-25岁的亚洲女性，拥有苗条中等身材，黑色长直发，大而明亮的深棕色眼睛，小巧挺拔的鼻子和樱桃小嘴，皮肤白皙细腻，表情温柔自信。她的着装风格为时尚休闲，包括白色宽松T恤、浅蓝色高腰牛仔裤和白色运动鞋，并搭配银色项链、耳钉和黑色双肩包。姿态自然，眼神专注，充满积极、乐观的氛围。",
  animal: "一只幼年雄性柴犬，体型小巧毛茸茸，毛色为棕黄色，腹部和胸部为白色。它拥有一双圆而黑亮的眼睛，黑色湿润的小鼻子，微张的嘴巴露出粉色舌头，以及直立的三角形耳朵，表情活泼天真。身体特征包括卷曲蓬松的尾巴和粉嫩的小爪子。它坐立着，歪头专注，营造出宁静、温馨、快乐和治愈的氛围。"
}

// 风格选项
const STYLE_OPTIONS = {
  watercolor: {
    name: "水彩插画风格",
    keywords: "watercolor illustration style, soft colors, gentle brushstrokes, artistic, painted texture"
  },
  papercut: {
    name: "剪纸拼贴风格", 
    keywords: "paper cut collage style, layered paper art, geometric shapes, textured paper, craft style"
  },
  cartoon: {
    name: "卡通涂鸦风格",
    keywords: "cartoon doodle style, playful lines, bright colors, hand-drawn, whimsical, fun"
  },
  vintage: {
    name: "复古手绘风格",
    keywords: "vintage hand-drawn style, classic illustration, retro colors, traditional art, nostalgic"
  },
  minimal: {
    name: "极简主义风格",
    keywords: "minimalist style, clean lines, simple shapes, modern, geometric, elegant"
  },
  custom: {
    name: "自定义风格",
    keywords: ""
  }
}

export default function CharacterSetupPage() {
  const navigate = useNavigate()
  const { t, currentLanguage } = useLanguage()
  const [characterData, setCharacterData] = useState({
    name: '',
    age: 6,
    identity: 'human',
    customIdentity: '', // 自定义身份
    style: 'watercolor', // 默认水彩风格
    customStyle: '', // 自定义风格
    description: PRESET_KEYWORDS.human, // 使用description替代复杂的参数
    strategy: CHARACTER_STRATEGY.HYBRID
  })

  const [isGeneratingIdentity, setIsGeneratingIdentity] = useState(false) // 生成身份描述状态
  const [previewImage, setPreviewImage] = useState(null) // 预览图片
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false) // 生成预览状态

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
    
    // 构建最终的角色身份描述
    let finalIdentity = characterData.identity
    if (characterData.identity === 'other' && characterData.customIdentity) {
      finalIdentity = characterData.customIdentity
    }
    
    // 构建最终数据，包含风格信息和预览图片
    const finalData = {
      ...characterData,
      identity: finalIdentity,
      customDescription: characterData.description,
      artStyle: characterData.style === 'custom' ? characterData.customStyle : STYLE_OPTIONS[characterData.style]?.keywords || '',
      strategy: CHARACTER_STRATEGY.HYBRID,
      previewImage: previewImage // 保存角色预览图片
    }
    
    // 保存数据到localStorage
    localStorage.setItem('characterData', JSON.stringify(finalData))
    navigate('/story-setup')
  }

  // 根据自定义身份生成关键词（优化为kontext模型）
  const handleGenerateFromCustomIdentity = async (customIdentity) => {
    if (!customIdentity.trim()) return
    
    setIsGeneratingIdentity(true)
    try {
      const prompt = `请为"${customIdentity}"这个角色身份生成适合Kontext图像模型的详细关键词描述。

要求：
1. 生成一段完整的、适合图像生成的关键词描述
2. 包含外貌特征、服装风格、表情姿态等
3. 确保内容积极正面，适合儿童绘本
4. 风格要生动有趣，富有想象力
5. 不要包含场景描述（如背景、环境等），统一使用白底
6. 不要包含艺术风格描述（如水彩、卡通等），这将单独处理
7. 直接返回中文关键词描述，不需要分类标题

示例格式：一个/一只...的${customIdentity}，拥有...特征，穿着...，表情...，充满...氛围。

请直接生成关键词描述：`

      const result = await callQwenChat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8
      }, 'CHARACTER_GENERATION')

      console.log('通义千问返回结果:', result)

      // 修复：正确解析OpenAI格式的响应 - 添加详细的调试日志
      let generatedContent = null
      
      console.log('🔍 开始解析响应内容...')
      console.log('🔍 result.choices 存在吗?', !!result?.choices)
      console.log('🔍 result.choices 长度:', result?.choices?.length)
      
      if (result?.choices && result.choices.length > 0) {
        console.log('🔍 第一个choice:', result.choices[0])
        console.log('🔍 message 存在吗?', !!result.choices[0]?.message)
        console.log('🔍 message:', result.choices[0]?.message)
        
        if (result.choices[0]?.message?.content) {
          const rawContent = result.choices[0].message.content
          console.log('🔍 原始内容:', JSON.stringify(rawContent))
          console.log('🔍 原始内容类型:', typeof rawContent)
          console.log('🔍 原始内容长度:', rawContent.length)
          
          // 处理可能的格式问题
          generatedContent = rawContent
            .replace(/[\r\n\t]/g, ' ')  // 替换换行符和制表符
            .replace(/\s+/g, ' ')       // 合并多个空格
            .trim()                     // 去除首尾空白
          
          console.log('🔍 处理后内容:', JSON.stringify(generatedContent))
          console.log('🔍 处理后内容长度:', generatedContent.length)
          
          if (generatedContent.length > 0) {
            console.log('✅ 成功从 choices[0].message.content 提取内容:', generatedContent)
          } else {
            console.log('❌ 处理后内容为空')
            generatedContent = null
          }
        } else {
          console.log('❌ choices[0].message.content 不存在或为空')
          // 尝试其他可能的字段
          if (result.choices[0]?.text) {
            generatedContent = result.choices[0].text.trim()
            console.log('✅ 从 choices[0].text 提取内容:', generatedContent)
          } else if (result.choices[0]?.message) {
            // 检查message对象的所有字段
            console.log('🔍 message对象的所有字段:', Object.keys(result.choices[0].message))
            const messageContent = result.choices[0].message.content || result.choices[0].message.text || result.choices[0].message.response
            if (messageContent) {
              generatedContent = messageContent.trim()
              console.log('✅ 从message其他字段提取内容:', generatedContent)
            }
          }
        }
      } else if (result?.content) {
        generatedContent = result.content.trim()
        console.log('✅ 从 result.content 提取内容:', generatedContent)
      } else {
        console.log('❌ 无法从任何字段提取内容')
        console.log('🔍 完整的result对象:', JSON.stringify(result, null, 2))
      }

      if (generatedContent && generatedContent.length > 0) {
        setCharacterData(prev => ({ 
          ...prev, 
          description: generatedContent
        }))
        console.log('✅ 已更新角色描述:', generatedContent)
      } else {
        console.error('❌ 通义千问未返回有效内容 - 内容为空或不存在')
        console.error('🔍 调试信息 - result:', result)
        console.error('🔍 调试信息 - generatedContent:', generatedContent)
        alert(t('character.identity.generation.failed'))
      }
    } catch (error) {
      console.error('生成角色描述失败:', error)
      alert(t('character.identity.generation.failed'))
    } finally {
      setIsGeneratingIdentity(false)
    }
  }

  // 生成角色预览
  const handleGeneratePreview = async () => {
    if (!characterData.description.trim()) {
      alert(t('character.preview.no.description'))
      return
    }

    setIsGeneratingPreview(true)
    try {
      // 获取当前选择的风格（确保风格是英文）
      let currentStyle = ''
      if (characterData.style === 'custom') {
        currentStyle = characterData.customStyle || ''
      } else {
        currentStyle = STYLE_OPTIONS[characterData.style]?.keywords || ''
      }
      
      console.log('🎨 选择的风格:', characterData.style)
      console.log('🎨 风格关键词:', currentStyle)
      
      // 先将中文描述翻译为英文（确保图片生成使用英文关键词）
      let englishDescription = characterData.description
      
      // 如果描述包含中文，则需要翻译为英文
      if (/[\u4e00-\u9fff]/.test(characterData.description)) {
        console.log('🔤 检测到中文描述，开始翻译...')
        try {
          const translatePrompt = `请将以下角色描述翻译为适合图像生成的英文关键词：

${characterData.description}

要求：
1. 翻译为英文关键词描述
2. 保持角色特征的完整性
3. 适合儿童绘本角色
4. 不要添加场景或风格描述
5. 只返回英文翻译结果，不要解释

英文描述：`

          const translateResult = await callQwenChat({
            messages: [{ role: 'user', content: translatePrompt }],
            temperature: 0.3
          }, 'TRANSLATION')

          console.log('翻译结果:', translateResult)

          // 正确解析翻译结果 - 添加详细调试
          let translatedContent = null
          
          if (translateResult?.choices && translateResult.choices.length > 0 && translateResult.choices[0]?.message?.content) {
            const rawContent = translateResult.choices[0].message.content
            console.log('🔍 翻译原始内容:', JSON.stringify(rawContent))
            
            translatedContent = rawContent
              .replace(/[\r\n\t]/g, ' ')  // 替换换行符和制表符
              .replace(/\s+/g, ' ')       // 合并多个空格
              .trim()                     // 去除首尾空白
            
            if (translatedContent.length > 0) {
              englishDescription = translatedContent
              console.log('✅ 成功翻译为英文:', englishDescription)
            } else {
              console.log('❌ 翻译后内容为空')
            }
          } else if (translateResult?.content) {
            englishDescription = translateResult.content.trim()
            console.log('✅ 从content字段获取翻译:', englishDescription)
          } else {
            console.log('❌ 翻译失败，无法提取内容')
            console.log('🔍 翻译结果详情:', translateResult)
          }

          console.log('🔤 最终英文描述:', englishDescription)
        } catch (translateError) {
          console.error('翻译失败，使用原描述:', translateError)
          // 翻译失败时使用原描述
        }
      } else {
        console.log('🔤 描述已是英文，无需翻译')
      }
      
      // 构建适合LiblibAI的英文提示词，包含风格
      let prompt = `children's book character, ${englishDescription}`
      
      // 添加风格（确保风格是英文）
      if (currentStyle) {
        prompt += `, ${currentStyle}`
      }
      
      // 添加其他英文关键词
      prompt += `, white background, friendly, suitable for kids, high quality, detailed`
      
      // 如果有自定义身份，加入到提示词中
      if (characterData.customIdentity) {
        prompt = `${characterData.customIdentity} character, ${prompt}`
      }

      console.log('🖼️ 生成预览的提示词:', prompt)

      const result = await generateTextToImageComplete(prompt, (progress) => {
        console.log('预览生成进度:', progress)
      })

      console.log('LiblibAI返回结果:', result)

      // 修复：正确从result中提取图片URL
      const imageUrl = result?.imageUrl || result?.data?.imgUrl || result?.data?.images?.[0]?.imageUrl || null

      if (imageUrl) {
        setPreviewImage(imageUrl)
        console.log('成功设置预览图片:', imageUrl)
      } else {
        console.error('未找到有效的图片URL:', result)
        alert(t('character.preview.failed'))
      }
    } catch (error) {
      console.error('生成预览失败:', error)
      alert(t('character.preview.failed'))
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // 处理身份选择变化
  const handleIdentityChange = (value) => {
    setCharacterData(prev => ({ 
      ...prev, 
      identity: value,
      description: value === 'other' ? '' : PRESET_KEYWORDS[value] || '',
      customIdentity: value === 'other' ? prev.customIdentity : ''
    }))
    
    // 清除预览图片
    setPreviewImage(null)
  }

  // 处理风格选择变化
  const handleStyleChange = (value) => {
    setCharacterData(prev => ({ 
      ...prev, 
      style: value,
      customStyle: value === 'custom' ? prev.customStyle : ''
    }))
    
    // 清除预览图片，因为风格变化需要重新生成
    setPreviewImage(null)
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
              onValueChange={handleIdentityChange}
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
                      {t('character.identity.generate')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* 风格选择 */}
          <div className="space-y-4">
            <Label className="text-base font-medium text-gray-700 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              {t('character.style')}
            </Label>
            <Select value={characterData.style} onValueChange={handleStyleChange}>
              <SelectTrigger className="text-base py-3 rounded-xl border-gray-200 focus:border-blue-500">
                <SelectValue placeholder={t('character.style.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="watercolor">{t('character.style.watercolor')}</SelectItem>
                <SelectItem value="papercut">{t('character.style.papercut')}</SelectItem>
                <SelectItem value="cartoon">{t('character.style.cartoon')}</SelectItem>
                <SelectItem value="vintage">{t('character.style.vintage')}</SelectItem>
                <SelectItem value="minimal">{t('character.style.minimal')}</SelectItem>
                <SelectItem value="custom">{t('character.style.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 自定义风格输入 */}
          {characterData.style === 'custom' && (
            <div className="space-y-3">
              <Label htmlFor="customStyle" className="text-base font-medium text-gray-700">
                {t('character.style.custom.label')}
              </Label>
              <Input
                id="customStyle"
                type="text"
                placeholder={t('character.style.custom.placeholder')}
                value={characterData.customStyle}
                onChange={(e) => setCharacterData(prev => ({ ...prev, customStyle: e.target.value }))}
                className="text-base py-3 rounded-xl border-gray-200 focus:border-blue-500"
              />
            </div>
          )}

          {/* 角色描述显示区域 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium text-gray-700">{t('character.description')}</Label>
              <Button
                onClick={handleGeneratePreview}
                disabled={isGeneratingPreview || !characterData.description.trim()}
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
            
            <Textarea
              value={characterData.description}
              onChange={(e) => setCharacterData(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-[120px] text-base rounded-xl border-gray-200 focus:border-blue-500"
              placeholder={t('character.description.placeholder')}
            />
            
            {/* 风格提示 */}
            {characterData.style !== 'custom' && (
              <p className="text-sm text-gray-500">
                {t('character.style.current')}: {STYLE_OPTIONS[characterData.style]?.name} - {STYLE_OPTIONS[characterData.style]?.keywords}
              </p>
            )}
          </div>

          {/* 预览图片显示 */}
          {previewImage ? (
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Image className="w-5 h-5 mr-2 text-purple-500" />
                  {t('character.preview.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <img 
                    src={previewImage} 
                    alt={t('character.preview.alt')} 
                    className="max-w-full h-auto rounded-lg mx-auto border border-gray-200"
                    style={{ maxHeight: '400px' }}
                  />
                  <div className="mt-4 flex justify-center space-x-2">
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
              </CardContent>
            </Card>
          ) : (
            // 预览占位框
            characterData.description.trim() && (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Image className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-500 text-center mb-4">
                    {t('character.preview.placeholder')}
                  </p>
                  <Button
                    onClick={handleGeneratePreview}
                    disabled={isGeneratingPreview}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
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
                </CardContent>
              </Card>
            )
          )}
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

