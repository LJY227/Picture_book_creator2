import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx'
import { ArrowLeft, Sparkles, GraduationCap, Loader2, Zap, Palette, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generatePictureBook } from '@/lib/openai.js'

export default function ContentSetupPage() {
  const navigate = useNavigate()
  const [contentData, setContentData] = useState({
    isCustom: false,
    customContent: '',
    imageEngine: 'liblibai', // 默认使用LiblibAI
    useCharacterConsistency: true // 默认启用角色一致性
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const [generationProgress, setGenerationProgress] = useState(0)

  useEffect(() => {
    // 检查是否有前面的数据，如果没有则返回首页
    const characterData = localStorage.getItem('characterData')
    const storyData = localStorage.getItem('storyData')
    if (!characterData || !storyData) {
      navigate('/')
    }
  }, [navigate])

  const randomEducationalTopics = [
    '学会分享与合作',
    '培养勇敢和自信',
    '理解友谊的重要性',
    '学习解决问题的方法',
    '培养责任感',
    '学会感恩和善良',
    '理解诚实的价值',
    '学习时间管理',
    '培养创造力和想象力',
    '学会尊重他人'
  ]

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenerationStatus('正在准备生成参数...')

    try {
      // 获取之前保存的数据
      const characterDataRaw = JSON.parse(localStorage.getItem('characterData') || '{}')
      const storyData = JSON.parse(localStorage.getItem('storyData') || '{}')
      
      // 确保角色数据有默认值，防止空对象导致错误的角色类型
      const characterData = {
        name: '小朋友',
        age: 6,
        identity: 'human', // 默认为人类角色
        gender: 'any',
        customDescription: '',
        strategy: 'predefined',
        ...characterDataRaw // 用实际数据覆盖默认值
      }

      // 准备教学内容数据
      const finalContentData = {
        ...contentData,
        randomTopic: contentData.isCustom ? null : randomEducationalTopics[Math.floor(Math.random() * randomEducationalTopics.length)]
      }

      setGenerationStatus('正在调用GPT-4生成故事内容...')
      setGenerationProgress(20)

      // 调用API生成绘本内容
      const generatedBook = await generatePictureBook({
        character: characterData,
        story: storyData,
        content: finalContentData,
        imageEngine: finalContentData.imageEngine,
        useCharacterConsistency: finalContentData.useCharacterConsistency,
        onProgress: (status, progress) => {
          setGenerationStatus(status)
          setGenerationProgress(progress)
        }
      })

      setGenerationStatus('正在保存生成的内容...')

      // 调试信息
      console.log('ContentSetupPage - 生成的绘本数据:', generatedBook);
      console.log('ContentSetupPage - 最终内容数据:', finalContentData);

      // 保存所有数据
      localStorage.setItem('contentData', JSON.stringify(finalContentData))
      localStorage.setItem('generatedBook', JSON.stringify(generatedBook))

      // 验证保存
      const savedBook = localStorage.getItem('generatedBook');
      console.log('ContentSetupPage - 保存到localStorage的数据:', savedBook);

      setGenerationStatus('生成完成！')

      // 短暂延迟后跳转
      setTimeout(() => {
        console.log('ContentSetupPage - 准备跳转到预览页面');
        setIsGenerating(false)
        navigate('/preview')
      }, 1500)

    } catch (error) {
      console.error('生成绘本失败:', error)
      setGenerationStatus('生成失败，请检查网络连接或API配置')

      // 3秒后重置状态
      setTimeout(() => {
        setIsGenerating(false)
        setGenerationStatus('')
      }, 3000)
    }
  }

  const handleBack = () => {
    navigate('/story-setup')
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-medium text-gray-800 mb-4">正在生成您的专属绘本...</h2>
          <p className="text-gray-500 mb-6">{generationStatus || '请稍候，我们正在为您创造一个精彩的故事'}</p>

          {/* 进度条 */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{width: `${generationProgress}%`}}
            ></div>
          </div>
          <div className="text-sm text-gray-600 mb-6">{generationProgress}% 完成</div>

          {/* 生成步骤指示 */}
          <div className="space-y-2 text-left">
            <div className={`flex items-center space-x-2 ${generationProgress >= 20 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${generationProgress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">GPT-4 故事创作</span>
            </div>
            <div className={`flex items-center space-x-2 ${generationProgress >= 60 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${generationProgress >= 60 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">
                {contentData.imageEngine === 'liblibai' ? 'LiblibAI' : 'DALL-E 3'} 插画生成
              </span>
            </div>
            <div className={`flex items-center space-x-2 ${generationProgress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${generationProgress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm">内容整合完成</span>
            </div>
          </div>

          {generationStatus.includes('失败') && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-600 text-sm font-medium mb-2">生成失败</div>
              <div className="text-red-500 text-xs">
                请检查您的OpenAI API密钥配置和网络连接
              </div>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-400">
            ⚡ 使用 GPT-4 + {contentData.imageEngine === 'liblibai' ? 'LiblibAI Kontext' : 'DALL-E 3'} 技术驱动
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <GraduationCap className="w-6 h-6 text-blue-500 mr-3" />
            <h1 className="text-xl font-medium text-gray-800">教学内容</h1>
          </div>
          <div className="text-sm text-gray-500">步骤 3/3</div>
        </div>
        
        {/* 进度条 */}
        <div className="max-w-2xl mx-auto mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full w-full transition-all duration-300"></div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* 默认随机生成说明 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-start">
              <Sparkles className="w-6 h-6 text-blue-500 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">智能教学内容生成</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  系统将根据您设定的角色和故事类型，自动生成适合的教学内容。
                  我们的AI会确保内容既有趣又富有教育意义，帮助孩子在阅读中学习和成长。
                </p>
              </div>
            </div>
          </div>

          {/* 图像生成引擎选择 */}
          <div className="space-y-4">
            <Label className="text-base font-medium text-gray-700">图像生成引擎</Label>
            <RadioGroup
              value={contentData.imageEngine}
              onValueChange={(value) => setContentData(prev => ({ ...prev, imageEngine: value }))}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="liblibai" id="liblibai" />
                <div className="flex-1">
                  <Label htmlFor="liblibai" className="text-base font-medium cursor-pointer flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-blue-500" />
                    LiblibAI Kontext
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">推荐</span>
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    专业的中文AI绘画模型，生成速度快，成本更低，特别适合儿童插画
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="dalle3" id="dalle3" />
                <div className="flex-1">
                  <Label htmlFor="dalle3" className="text-base font-medium cursor-pointer flex items-center">
                    <Palette className="w-4 h-4 mr-2 text-purple-500" />
                    DALL-E 3
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">高质量</span>
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    OpenAI的顶级图像生成模型，画质精美，细节丰富
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 角色一致性选项 */}
          {contentData.imageEngine === 'liblibai' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-100">
                <div className="flex items-start">
                  <Users className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">角色一致性功能</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      启用后，系统将基于您提供的风格参考图，先生成标准化的主角形象，
                      然后使用这个主角形象来生成所有绘本插画，确保角色在整本书中保持一致的外观。
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium text-gray-700">启用角色一致性</Label>
                        <p className="text-sm text-gray-500 mt-1">
                          使用风格参考图生成标准主角，确保全书角色一致
                        </p>
                      </div>
                      <Switch
                        checked={contentData.useCharacterConsistency}
                        onCheckedChange={(checked) => setContentData(prev => ({ ...prev, useCharacterConsistency: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {contentData.useCharacterConsistency && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="text-sm text-blue-800">
                    <div className="flex items-center mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <span className="font-medium">角色一致性流程：</span>
                    </div>
                    <div className="space-y-1 ml-4 text-blue-700">
                      <div>1. 使用风格参考图生成标准化主角形象</div>
                      <div>2. 基于主角形象生成每页插画</div>
                      <div>3. 确保角色外观在全书中保持一致</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 自定义开关 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <Label className="text-base font-medium text-gray-700">自定义教学内容</Label>
              <p className="text-sm text-gray-500 mt-1">如需特定的教学主题，请开启此选项</p>
            </div>
            <Switch
              checked={contentData.isCustom}
              onCheckedChange={(checked) => setContentData(prev => ({ ...prev, isCustom: checked }))}
            />
          </div>

          {/* 自定义内容输入 */}
          {contentData.isCustom && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              <Label htmlFor="customContent" className="text-base font-medium text-gray-700">
                教学内容描述
              </Label>
              <Textarea
                id="customContent"
                placeholder="请描述您希望绘本传达的教学内容或价值观，例如：学会分享、培养勇气、理解友谊等..."
                value={contentData.customContent}
                onChange={(e) => setContentData(prev => ({ ...prev, customContent: e.target.value }))}
                className="min-h-[120px] text-base rounded-xl border-gray-200 focus:border-blue-500 resize-none"
              />
              <p className="text-sm text-gray-500">
                提示：简单描述即可，AI会根据您的描述创造完整的故事情节
              </p>
            </div>
          )}

          {/* 示例教学主题 */}
          {!contentData.isCustom && (
            <div className="space-y-4">
              <Label className="text-base font-medium text-gray-700">随机教学主题示例</Label>
              <div className="grid grid-cols-2 gap-3">
                {randomEducationalTopics.slice(0, 6).map((topic, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-600 text-center">
                    {topic}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 text-center">
                系统将从这些主题中随机选择，或生成其他适合的教学内容
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between">
          <Button
            onClick={handleBack}
            variant="outline"
            className="px-6 py-3 rounded-xl border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            上一步
          </Button>
          <Button
            onClick={handleGenerate}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            立即生成绘本
          </Button>
        </div>
      </div>
    </div>
  )
}

