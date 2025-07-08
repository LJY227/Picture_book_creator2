import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'

import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  BookOpen, 
  Sparkles, 
  Image, 
  Loader2, 
  Save, 
  User, 
  Heart, 
  GraduationCap,
  RefreshCw,
  Trash2,
  Edit3,
  Wand2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext.jsx'
import { generateTextToImageComplete } from '@/lib/liblibai.js'
import { callQwenChat } from '@/lib/qwen.js'

export default function CustomStoryEditPage() {
  const navigate = useNavigate()
  const { t, currentLanguage } = useLanguage()
  
  // 基础数据
  const [characterData, setCharacterData] = useState({})
  const [storyData, setStoryData] = useState({})
  const [contentData, setContentData] = useState({})
  
  // 绘本页面数据
  const [storyPages, setStoryPages] = useState([])
  
  // 状态管理
  const [isGeneratingImage, setIsGeneratingImage] = useState(null)
  const [isGeneratingContent, setIsGeneratingContent] = useState(null) // 改为可以跟踪特定页面的生成状态
  const [isSaving, setIsSaving] = useState(false)

  // 初始化数据
  useEffect(() => {
    const character = JSON.parse(localStorage.getItem('characterData') || '{}')
    const story = JSON.parse(localStorage.getItem('storyData') || '{}')
    const content = JSON.parse(localStorage.getItem('contentData') || '{}')
    
    // 调试信息
    console.log('🔍 CustomStoryEditPage - 检查localStorage数据:')
    console.log('Character data:', character)
    console.log('Story data:', story)
    console.log('Content data:', content)
    
    // 检查是否为测试路径或直接访问
    const isTestPath = window.location.pathname === '/test-custom'
    const isDirectAccess = window.location.pathname === '/custom-story-edit'
    
    // 更宽松的验证逻辑 - 如果是直接访问或数据缺失，提供默认数据
    if (isTestPath || isDirectAccess || !character || Object.keys(character).length === 0 || !story || Object.keys(story).length === 0) {
      console.log('🔄 使用默认数据或测试数据')
      
      // 为缺失的字段提供默认值
      const defaultCharacter = {
        name: '小朋友',
        age: 6,
        identity: 'human',
        description: '一个可爱的小朋友',
        previewImage: character?.previewImage || null,
        ...character
      }
      
      const defaultStory = {
        type: 'adventure',
        pages: 6,
        ...story
      }
      
      const defaultContent = {
        finalTopic: '成长与学习',
        selectedTopic: '成长与学习',
        creationMode: 'custom',
        ...content
      }
      
      console.log('✅ 使用默认数据:')
      console.log('Default character:', defaultCharacter)
      console.log('Default story:', defaultStory)
      
      setCharacterData(defaultCharacter)
      setStoryData(defaultStory)
      setContentData(defaultContent)
    } else {
      // 使用现有数据但确保有默认值
      const safeCharacter = {
        name: '小朋友',
        age: 6,
        identity: 'human',
        ...character
      }
      
      const safeStory = {
        type: 'adventure',
        pages: 6,
        ...story
      }
      
      console.log('✅ 数据验证通过，使用现有数据:')
      console.log('Safe character:', safeCharacter)
      console.log('Safe story:', safeStory)
      
      setCharacterData(safeCharacter)
      setStoryData(safeStory)
      setContentData(content)
    }
    
    // 初始化4页内容
    const initialPages = []
    for (let i = 0; i < 4; i++) {
      initialPages.push({
        id: `page-${i}`,
        pageNumber: i + 1,
        title: `第${i + 1}页`,
        content: '',
        imageUrl: null,
        imagePrompt: '',
        isGenerating: false
      })
    }
    setStoryPages(initialPages)
  }, [navigate])

  // 添加新页面
  const handleAddPage = () => {
    const newPage = {
      id: `page-${storyPages.length}`,
      pageNumber: storyPages.length + 1,
      title: `第${storyPages.length + 1}页`,
      content: '',
      imageUrl: null,
      imagePrompt: '',
      isGenerating: false
    }
    setStoryPages([...storyPages, newPage])
  }

  // 删除页面
  const handleDeletePage = (pageIndex) => {
    if (storyPages.length <= 1) return
    const newPages = storyPages.filter((_, index) => index !== pageIndex)
    // 重新编号
    const renumberedPages = newPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
      title: `第${index + 1}页`
    }))
    setStoryPages(renumberedPages)
  }

  // 更新页面内容
  const handleUpdatePageContent = (pageIndex, content) => {
    const newPages = [...storyPages]
    newPages[pageIndex].content = content
    setStoryPages(newPages)
  }

  // 生成单页插画
  const handleGenerateImage = async (pageIndex) => {
    const page = storyPages[pageIndex]
    if (!page.content.trim()) {
      alert('请先填写页面内容')
      return
    }

    setIsGeneratingImage(pageIndex)
    
    try {
      // 构建图像生成提示词
      const imagePrompt = `${characterData.description || characterData.name}, ${page.content}, children's book illustration style, bright and warm colors, simple and clear composition, suitable for children`
      
      // 调用LiblibAI生成图像
      const imageResult = await generateTextToImageComplete(
        imagePrompt, // 第一个参数：prompt字符串
        null,        // 第二个参数：onProgress回调
        {            // 第三个参数：options对象
          model: 'kontext-v1',
          width: 1024,
          height: 1024,
          guidance_scale: 7.5,
          num_inference_steps: 20,
          scheduler: 'DPM++ 2M Karras'
        }
      )

      // 更新页面数据
      const newPages = [...storyPages]
      newPages[pageIndex].imageUrl = imageResult.imageUrl
      newPages[pageIndex].imagePrompt = imagePrompt
      setStoryPages(newPages)

    } catch (error) {
      console.error('生成图像失败:', error)
      alert('生成图像失败，请稍后重试')
    } finally {
      setIsGeneratingImage(null)
    }
  }

  // 智能生成页面内容
  const handleSmartGeneration = async (pageIndex) => {
    const currentPage = storyPages[pageIndex]
    
    // 如果页面已有内容，询问用户是否确认重新生成
    if (currentPage.content.trim()) {
      const confirmed = window.confirm(
        `第${currentPage.pageNumber}页已有内容，是否重新生成？\n\n当前内容：\n"${currentPage.content}"\n\n点击"确定"将替换为AI生成的新内容。`
      )
      if (!confirmed) {
        return
      }
    }
    
    setIsGeneratingContent(pageIndex)
    
    try {
      
      // 构建已有内容上下文（当前页面之前的内容）
      const previousContent = storyPages
        .slice(0, pageIndex)
        .filter(page => page.content.trim())
        .map(page => `第${page.pageNumber}页: ${page.content}`)
        .join('\n')

      // 构建后续内容上下文（当前页面之后的内容）
      const followingContent = storyPages
        .slice(pageIndex + 1)
        .filter(page => page.content.trim())
        .map(page => `第${page.pageNumber}页: ${page.content}`)
        .join('\n')

      // 构建智能生成的提示词
      const prompt = `
基于以下信息，为儿童绘本故事的第${currentPage.pageNumber}页生成内容：

角色信息：
- 角色名：${characterData.name}
- 年龄：${characterData.age}岁
- 身份：${characterData.identity}
- 角色描述：${characterData.description || '一个可爱的角色'}

故事设定：
- 故事类型：${getStoryTypeLabel(storyData.type)}
- 教学主题：${contentData.finalTopic || contentData.selectedTopic || contentData.customContent || '成长与学习'}
- 总页数：${storyPages.length}页

故事上下文：
${previousContent ? `前面的故事内容：\n${previousContent}` : '这是故事的开始'}

${followingContent ? `后续故事内容：\n${followingContent}` : ''}

请为第${currentPage.pageNumber}页生成合适的故事内容，要求：
1. 内容适合${characterData.age}岁儿童阅读，积极正面
2. 与前后内容保持连贯性和逻辑性
3. 突出教学主题"${contentData.finalTopic || contentData.selectedTopic || contentData.customContent || '成长与学习'}"
4. 控制在50-80字以内
5. 语言生动有趣，富有想象力
6. 确保${characterData.name}是故事的主角
7. 内容要符合"${getStoryTypeLabel(storyData.type)}"的特点

直接返回故事内容，不需要标题或页码：`

      console.log('🔍 智能生成提示词:', prompt)

      const result = await callQwenChat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8
      }, 'SMART_GENERATION')

      let generatedContent = ''
      if (result?.choices && result.choices[0]?.message?.content) {
        generatedContent = result.choices[0].message.content.trim()
        console.log('✅ 智能生成成功:', generatedContent)
      }

      if (generatedContent) {
        // 直接应用到指定页面
        handleUpdatePageContent(pageIndex, generatedContent)
        
        // 显示成功提示和视觉反馈
        setTimeout(() => {
          const pageElement = document.querySelector(`[data-page-id="${currentPage.id}"]`)
          if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // 添加成功生成的高亮效果
            pageElement.style.boxShadow = '0 0 20px rgba(147, 51, 234, 0.4)'
            pageElement.style.transform = 'scale(1.02)'
            pageElement.style.transition = 'all 0.3s ease'
            
            setTimeout(() => {
              pageElement.style.boxShadow = ''
              pageElement.style.transform = ''
            }, 2000)
          }
        }, 100)
        
        console.log(`✅ 第${currentPage.pageNumber}页内容生成完成`)
      } else {
        alert('智能生成失败，请稍后重试')
      }

    } catch (error) {
      console.error('智能生成失败:', error)
      alert('智能生成失败，请稍后重试')
    } finally {
      setIsGeneratingContent(null)
    }
  }



  // 保存并预览
  const handleSaveAndPreview = async () => {
    setIsSaving(true)
    
    try {
      // 构建绘本数据
      const bookData = {
        title: `${characterData.name}的${getStoryTypeLabel(storyData.type)}`,
        pages: storyPages.map(page => ({
          pageNumber: page.pageNumber,
          title: page.title,
          text: page.content,
          content: page.content,
          imageUrl: page.imageUrl,
          imagePrompt: page.imagePrompt,
          sceneDescription: page.content,
          fallbackEmoji: getPageEmoji(page.pageNumber)
        })),
        educationalMessage: `通过这个故事，${characterData.name}学会了${contentData.finalTopic || contentData.selectedTopic || contentData.customContent}的重要性。`,
        isCustomStory: true
      }

      // 保存到localStorage
      localStorage.setItem('generatedBook', JSON.stringify(bookData))
      
      // 跳转到预览页面
      navigate('/preview')

    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 获取故事类型标签
  const getStoryTypeLabel = (type) => {
    const labels = {
      'adventure': '冒险故事',
      'growth': '成长故事',
      'friendship': '友情故事',
      'life-skills': '生活技能故事'
    }
    return labels[type] || '奇妙故事'
  }

  // 获取页面emoji
  const getPageEmoji = (pageNumber) => {
    const emojis = ['🌟', '🦋', '🌈', '🌸', '🍀', '⭐', '🌙', '☀️', '🌺', '🎈']
    return emojis[pageNumber % emojis.length]
  }

  const handleBack = () => {
    navigate('/content-setup')
  }

  // 如果数据还在初始化中，显示加载状态
  if (!characterData.name && storyPages.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="w-6 h-6 text-blue-500 mr-3" />
            <h1 className="text-xl font-medium text-gray-800">自定义绘本编辑</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleSaveAndPreview}
              disabled={isSaving}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存并预览
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧信息面板 */}
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <User className="w-5 h-5 mr-2" />
                  角色信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 角色形象预览 - 优先显示 */}
                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">角色形象</Label>
                  {characterData.previewImage ? (
                    <div className="relative group">
                      <img 
                        src={characterData.previewImage} 
                        alt="角色形象预览" 
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                        角色预览图
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500">
                      <User className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">暂无角色形象</p>
                      <p className="text-xs mt-1">可在角色设置中生成</p>
                    </div>
                  )}
                </div>
                
                {/* 角色基本信息 */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">角色名</Label>
                    <p className="text-base font-medium text-gray-800">{characterData.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">年龄</Label>
                    <p className="text-base text-gray-700">{characterData.age}岁</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">身份</Label>
                    <p className="text-base text-gray-700">{characterData.identity}</p>
                  </div>
                  {characterData.description && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">角色描述</Label>
                      <p className="text-xs text-gray-600 leading-relaxed">{characterData.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Heart className="w-5 h-5 mr-2" />
                  故事设定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600">故事类型</Label>
                  <Badge variant="secondary" className="mt-1">
                    {getStoryTypeLabel(storyData.type)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">教学主题</Label>
                  <p className="text-sm text-gray-700 mt-1">
                    {contentData.finalTopic || contentData.selectedTopic || contentData.customContent || '成长与学习'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">总页数</Label>
                  <p className="text-base">{storyPages.length}页</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧编辑区域 */}
          <div className="lg:col-span-3">
            {/* 页面编辑标题和添加按钮 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-gray-800">页面编辑</h3>
              <Button 
                onClick={handleAddPage}
                variant="outline"
                className="border-green-200 text-green-600 hover:bg-green-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加页面
              </Button>
            </div>
            
            {/* 垂直布局的页面编辑器 */}
            <div className="space-y-8">
              {storyPages.map((page, index) => (
                <div key={page.id} data-page-id={page.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  {/* 页面标题和删除按钮 */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-800 flex items-center">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {page.pageNumber}
                      </div>
                      第{page.pageNumber}页
                    </h4>
                    {storyPages.length > 1 && (
                      <Button
                        onClick={() => handleDeletePage(index)}
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </Button>
                    )}
                  </div>

                  {/* 左右布局：输入框和图片展示 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 左侧：内容输入 */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          页面内容
                        </Label>
                        <Textarea
                          value={page.content}
                          onChange={(e) => handleUpdatePageContent(index, e.target.value)}
                          placeholder="请输入这一页的故事内容..."
                          className="min-h-[120px] resize-none"
                          rows={5}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleGenerateImage(index)}
                              disabled={isGeneratingImage === index || !page.content.trim()}
                              variant="outline"
                              size="sm"
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              {isGeneratingImage === index ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Image className="w-4 h-4 mr-2" />
                              )}
                              生成插画
                            </Button>
                            <Button
                              onClick={() => handleSmartGeneration(index)}
                              disabled={isGeneratingContent === index}
                              variant="outline"
                              size="sm"
                              className="border-purple-200 text-purple-600 hover:bg-purple-50"
                              title={page.content.trim() ? "重新生成此页内容" : "智能生成故事内容"}
                            >
                              {isGeneratingContent === index ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Wand2 className="w-4 h-4 mr-2" />
                              )}
                              {page.content.trim() ? '重新生成' : '智能写作'}
                            </Button>
                          </div>
                          <div className="text-sm text-gray-500">
                            {page.content.length}/100 字
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 右侧：插画展示 */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        插画展示
                      </Label>
                      <div className="relative">
                        {page.imageUrl ? (
                          <div className="group relative">
                            <img 
                              src={page.imageUrl} 
                              alt={`第${page.pageNumber}页插画`}
                              className="w-full h-64 object-cover rounded-lg border border-gray-200"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                              <Button
                                onClick={() => handleGenerateImage(index)}
                                variant="outline"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-white"
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                重新生成
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500">
                            <Image className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-sm">暂无插画</p>
                            <p className="text-xs mt-1">
                              {page.content.trim() ? '点击"生成插画"创建图片' : '请先输入页面内容'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between">
          <Button
            onClick={handleBack}
            variant="outline"
            className="px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>总页数：{storyPages.length}</span>
              <span>已完成：{storyPages.filter(p => p.content.trim()).length}页</span>
              <span>已配图：{storyPages.filter(p => p.imageUrl).length}页</span>
            </div>
            <Button
              onClick={handleSaveAndPreview}
              disabled={isSaving || storyPages.filter(p => p.content.trim()).length === 0}
              className="bg-blue-500 hover:bg-blue-600 px-6"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              完成创作
            </Button>
          </div>
        </div>
      </div>


    </div>
  )
} 