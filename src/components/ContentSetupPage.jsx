import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx'
import { ArrowLeft, Sparkles, GraduationCap, Loader2, Zap, Palette, Settings, Edit3, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generatePictureBook } from '@/lib/qwen.js'

export default function ContentSetupPage() {
  const navigate = useNavigate()
  const [contentData, setContentData] = useState({
    isCustom: false,
    customContent: '',
    selectedTopic: '', // 新增：选中的主题示例
    imageEngine: 'liblibai', // 默认使用LiblibAI
    useCharacterConsistency: true // 默认启用角色一致性（在代码中强制启用，不显示给用户）
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

  // 处理主题示例选择
  const handleTopicSelect = (topic) => {
    if (contentData.selectedTopic === topic) {
      // 如果点击的是已选中的主题，则取消选择
      setContentData(prev => ({ ...prev, selectedTopic: '' }))
    } else {
      // 选择新主题
      setContentData(prev => ({ ...prev, selectedTopic: topic, isCustom: false }))
    }
  }

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

      // 根据用户选择确定教学内容（简化逻辑，不再调用GPT-4o分析）
      let educationalTopic = '';
      let contentMode = 'random'; // random, selected, custom

      if (contentData.isCustom) {
        // 模式3：用户选择自定义教学内容（直接使用用户输入，不再分析）
        contentMode = 'custom';
        educationalTopic = contentData.customContent; // 直接使用用户输入的内容
        setGenerationStatus('正在准备自定义教学内容...')
        setGenerationProgress(10)
      } else if (contentData.selectedTopic) {
        // 模式2：用户选择了主题示例
        contentMode = 'selected';
        educationalTopic = contentData.selectedTopic;
      } else {
        // 模式1：随机生成
        contentMode = 'random';
        educationalTopic = randomEducationalTopics[Math.floor(Math.random() * randomEducationalTopics.length)];
      }

      // 准备教学内容数据，强制启用角色一致性
      const finalContentData = {
        ...contentData,
        useCharacterConsistency: true, // 强制启用角色一致性
        mode: contentMode, // 记录内容生成模式
        finalTopic: educationalTopic // 最终确定的教学主题
      }

      setGenerationStatus('正在调用通义千问生成故事内容...')
      setGenerationProgress(20)

      // 调用API生成绘本内容（现在只有一次API调用）
      const generatedBook = await generatePictureBook({
        character: characterData,
        story: storyData,
        content: {
          ...finalContentData,
          educationalTopic: educationalTopic // 传递确定的教学主题
        },
        imageEngine: finalContentData.imageEngine,
        useCharacterConsistency: true, // 强制启用角色一致性
        onProgress: (status, progress) => {
          setGenerationStatus(status)
          setGenerationProgress(progress)
        }
      })

      setGenerationStatus('正在保存生成的内容...')

      // 调试信息
      console.log('ContentSetupPage - 生成的绘本数据:', generatedBook);
      console.log('ContentSetupPage - 最终内容数据:', finalContentData);
      console.log('ContentSetupPage - 内容生成模式:', contentMode);
      console.log('ContentSetupPage - 最终教学主题:', educationalTopic);

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
      
      // 显示详细的错误信息和解决建议
      const fullErrorMessage = error.message || '未知错误';
      
      // 提取错误的主要部分作为状态显示
      let statusMessage = '生成失败';
      let waitTime = 12000; // 默认12秒
      
      if (fullErrorMessage.includes('频率限制') || fullErrorMessage.includes('429')) {
        statusMessage = '❌ API频率限制：已进行8次重试仍失败，请等待15-30分钟后重试';
        waitTime = 15000; // 15秒显示时间
      } else if (fullErrorMessage.includes('配额') || fullErrorMessage.includes('quota')) {
        statusMessage = '❌ API配额不足：请检查通义千问账户余额并充值';
        waitTime = 12000;
      } else if (fullErrorMessage.includes('网络') || fullErrorMessage.includes('fetch')) {
        statusMessage = '❌ 网络连接异常：请检查网络连接状态';
        waitTime = 10000;
      } else if (fullErrorMessage.includes('unauthorized') || fullErrorMessage.includes('401')) {
        statusMessage = '❌ API密钥无效：请检查API密钥配置';
        waitTime = 12000;
      } else {
        statusMessage = '❌ 生成失败：请稍后重试或检查服务状态';
        waitTime = 10000;
      }
      
      setGenerationStatus(statusMessage)
      
      // 在控制台输出完整的错误信息供调试
      console.log('🔍 完整错误信息:', fullErrorMessage);
      
      // 显示错误信息一段时间后重置
      setTimeout(() => {
        setIsGenerating(false)
        setGenerationStatus('')
        setGenerationProgress(0)
      }, waitTime)
    }
  }

  const handleBack = () => {
    navigate('/story-setup')
  }

  // 获取当前选择状态的描述
  const getSelectionStatus = () => {
    if (contentData.isCustom) {
      return '自定义教学内容模式'
    } else if (contentData.selectedTopic) {
      return `已选择主题：${contentData.selectedTopic}`
    } else {
      return '智能随机生成模式'
    }
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm sm:max-w-md mx-auto w-full">
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
                                  <span className="text-sm">通义千问 故事创作</span>
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

          {(generationStatus.includes('失败') || generationStatus.includes('频率过高') || generationStatus.includes('异常')) && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-600 text-sm font-medium mb-2">
                {generationStatus.includes('频率过高') ? 'API调用限制' : 
                 generationStatus.includes('异常') ? '网络连接问题' : '生成失败'}
              </div>
              <div className="text-red-500 text-xs space-y-1">
                {generationStatus.includes('频率过高') ? (
                  <>
                    <div>• 通义千问API调用频率超出限制</div>
                    <div>• 请等待1-2分钟后重新尝试</div>
                    <div>• 系统会自动重试，请耐心等待</div>
                  </>
                ) : generationStatus.includes('异常') ? (
                  <>
                    <div>• 网络连接不稳定或服务器暂时不可用</div>
                    <div>• 请检查您的网络连接</div>
                    <div>• 稍后重试或刷新页面</div>
                  </>
                ) : generationStatus.includes('密钥无效') ? (
                  <>
                    <div>• 通义千问API密钥无效或已过期</div>
                    <div>• 请检查后台API密钥配置</div>
                    <div>• 确保API密钥有效且有足够权限</div>
                  </>
                ) : generationStatus.includes('配额') ? (
                  <>
                                    <div>• 通义千问API配额已用完</div>
                <div>• 请检查您的通义千问账户余额</div>
                    <div>• 充值后即可继续使用</div>
                  </>
                ) : (
                  <>
                    <div>• 请检查您的通义千问API密钥配置和网络连接</div>
                    <div>• 确保服务器正常运行</div>
                    <div>• 如问题持续，请联系技术支持</div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-400">
            ⚡ 使用 通义千问 + {contentData.imageEngine === 'liblibai' ? 'LiblibAI Kontext' : 'DALL-E 3'} 技术驱动
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12 pb-24 sm:pb-32">
        <div className="space-y-6 sm:space-y-8">
          {/* 默认随机生成说明 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-start">
              <Sparkles className="w-6 h-6 text-blue-500 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">智能教学内容生成</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-3">
                  系统将根据您设定的角色和故事类型，自动生成适合的教学内容。
                  我们的AI会确保内容既有趣又富有教育意义，帮助孩子在阅读中学习和成长。
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-800">{getSelectionStatus()}</span>
                </div>
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
                    OpenAI的图像生成模型，画质精美，细节丰富
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 自定义教学内容开关 - 重新设计为更明显的样式 */}
          <div className={`border-2 rounded-2xl p-6 transition-all duration-300 ${
            contentData.isCustom 
              ? 'border-blue-300 bg-blue-50 shadow-lg' 
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-xl ${
                  contentData.isCustom ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {contentData.isCustom ? (
                    <Edit3 className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Settings className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${
                    contentData.isCustom ? 'text-blue-900' : 'text-gray-800'
                  }`}>
                    自定义教学内容
                  </h3>
                  <p className={`text-sm leading-relaxed ${
                    contentData.isCustom ? 'text-blue-700' : 'text-gray-600'
                  }`}>
                    {contentData.isCustom 
                      ? '您已开启自定义模式，AI将分析您的描述并生成相应的教学内容'
                      : '默认使用AI智能生成教学内容，或从下方主题示例中选择'
                    }
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Switch
                  checked={contentData.isCustom}
                  onCheckedChange={(checked) => {
                    setContentData(prev => ({ 
                      ...prev, 
                      isCustom: checked,
                      selectedTopic: checked ? '' : prev.selectedTopic // 清除选中的主题
                    }))
                  }}
                  className="transform scale-125"
                />
                <span className={`text-xs font-medium ${
                  contentData.isCustom ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {contentData.isCustom ? '开启' : '关闭'}
                </span>
              </div>
            </div>

            {/* 开关状态指示 */}
            <div className={`mt-4 p-3 rounded-lg ${
              contentData.isCustom 
                ? 'bg-blue-100 border border-blue-200' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  contentData.isCustom ? 'bg-blue-500' : 'bg-gray-400'
                }`}></div>
                <span className={`text-sm font-medium ${
                  contentData.isCustom ? 'text-blue-800' : 'text-gray-600'
                }`}>
                  {contentData.isCustom ? '自定义模式已激活' : '智能生成模式'}
                </span>
              </div>
            </div>
          </div>

          {/* 自定义内容输入 */}
          {contentData.isCustom && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <Label htmlFor="customContent" className="text-lg font-semibold text-blue-900 mb-3 block">
                  请描述您希望的教学内容
                </Label>
                <Textarea
                  id="customContent"
                  placeholder="请详细描述您希望绘本传达的教学内容或价值观，例如：&#10;• 学会分享玩具和食物&#10;• 培养面对困难的勇气&#10;• 理解友谊的珍贵和维护&#10;• 学习基本的礼貌用语&#10;• 培养独立自主的能力..."
                  value={contentData.customContent}
                  onChange={(e) => setContentData(prev => ({ ...prev, customContent: e.target.value }))}
                  className="min-h-[140px] text-base rounded-xl border-blue-300 focus:border-blue-500 resize-none bg-white"
                />
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    ✨ <strong>直接使用：</strong>您的教学内容将直接传递给故事生成AI，确保生成的故事紧密围绕您的教育目标展开。简化流程，更快生成！
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 智能生成主题示例 - 现在可以选择 */}
          {!contentData.isCustom && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium text-gray-700">智能生成主题示例</Label>
                {contentData.selectedTopic && (
                  <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    已选择主题
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {randomEducationalTopics.slice(0, 6).map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleTopicSelect(topic)}
                    className={`p-3 text-sm text-center rounded-lg border-2 transition-all duration-200 ${
                      contentData.selectedTopic === topic
                        ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-md transform scale-105'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {contentData.selectedTopic === topic && (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="font-medium">{topic}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  💡 <strong>提示：</strong>
                  {contentData.selectedTopic 
                    ? `已选择"${contentData.selectedTopic}"主题。点击其他主题可以切换，或再次点击取消选择。`
                    : '点击任何主题示例来选择，或保持不选择让系统智能随机生成。'
                  }
                </p>
              </div>
            </div>
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
            上一步
          </Button>
          <Button
            onClick={handleGenerate}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 sm:px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 order-1 sm:order-2"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            立即生成绘本
          </Button>
        </div>
      </div>
    </div>
  )
}

