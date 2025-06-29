import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx'
import { ChevronLeft, ChevronRight, Home, RotateCcw, BookOpen, Sparkles, RefreshCw, Edit3, Download, Loader2, Edit2, Save, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateLocalImage, loadImageWithTimeout } from '@/lib/imageUtils.js'
import { generateImageToImageComplete } from '@/lib/liblibai.js'
import { regeneratePageIllustration, regenerateIllustrationWithNewContent } from '@/lib/illustrationRegeneration.js'
import { exportBookToPDF } from '@/lib/pdfExport.js'
import { exportStoryAsHTML, exportStoryAsPDF, exportStoryAsImages } from '../lib/storyExport'
import { saveCompleteStory } from '../lib/storyExport'

export default function PreviewPage() {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(0)
  const [bookData, setBookData] = useState(null)
  const [imageLoadStates, setImageLoadStates] = useState({})
  const [optimizingImage, setOptimizingImage] = useState(null)
  
  // 新功能状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPageIndex, setEditingPageIndex] = useState(null)
  const [editedContent, setEditedContent] = useState('')
  const [regeneratingImage, setRegeneratingImage] = useState(null)
  const [savingStory, setSavingStory] = useState(false)
  const [saveProgress, setSaveProgress] = useState(0)

  useEffect(() => {
    // 获取所有设置数据
    const characterData = JSON.parse(localStorage.getItem('characterData') || '{}')
    const storyData = JSON.parse(localStorage.getItem('storyData') || '{}')
    const contentData = JSON.parse(localStorage.getItem('contentData') || '{}')
    const generatedBook = JSON.parse(localStorage.getItem('generatedBook') || 'null')

    if (!characterData.name && !generatedBook) {
      console.warn('PreviewPage - 没有角色数据和生成的绘本，跳转到首页');
      navigate('/')
      return
    }

    // 调试信息
    console.log('PreviewPage - 检查生成的绘本数据:', generatedBook);
    console.log('PreviewPage - 角色数据:', characterData);
    console.log('PreviewPage - 故事数据:', storyData);
    console.log('PreviewPage - 内容数据:', contentData);

    // 如果有AI生成的内容，优先使用
    if (generatedBook && generatedBook.pages) {
      console.log('PreviewPage - 使用AI生成的内容，页数:', generatedBook.pages.length);
      const pages = [
        // 封面
        {
          type: 'cover',
          title: generatedBook.title,
          subtitle: contentData.isCustom ? contentData.customContent : contentData.randomTopic,
          image: '🌟'
        },
        // AI生成的内容页
        ...generatedBook.pages.map(page => ({
          type: 'content',
          pageNumber: page.pageNumber,
          title: page.title,
          content: page.text || page.content, // 修复字段映射：text -> content
          sceneDescription: page.sceneDescription,
          imageUrl: page.imageUrl, // LiblibAI生成的图像URL
          imagePrompt: page.imagePrompt, // 图像生成提示词
          fallbackEmoji: page.fallbackEmoji, // 备用emoji
          localImageUrl: generateLocalImage(page, characterData), // 本地生成的图像
          image: page.fallbackEmoji || ['🌈', '🦋', '🌸', '🌺', '🍀', '⭐', '🌙', '☀️', '🌻', '🎈'][page.pageNumber % 10]
        })),
        // 结尾页
        {
          type: 'ending',
          title: '故事结束',
          content: generatedBook.educationalMessage || `${characterData.name}通过这次经历学会了很多，变得更加勇敢和智慧。`,
          image: '🎉'
        }
      ]

      setBookData({
        character: characterData,
        story: storyData,
        content: contentData,
        pages: pages,
        isAIGenerated: true
      })
      return
    }

    // 如果没有AI生成的内容，使用默认示例内容
    const storyTypes = {
      'adventure': '冒险故事',
      'growth': '成长故事',
      'friendship': '友情故事',
      'life-skills': '生活技能'
    }

    const pages = []
    const totalPages = storyData.pages || 6
    
    // 封面
    pages.push({
      type: 'cover',
      title: `${characterData.name}的${storyTypes[storyData.type] || '奇妙'}之旅`,
      subtitle: contentData.isCustom ? contentData.customContent : contentData.randomTopic,
      image: '🌟'
    })

    // 内容页
    for (let i = 1; i < totalPages; i++) {
      pages.push({
        type: 'content',
        pageNumber: i,
        title: `第${i}页`,
        content: `这是${characterData.name}的故事第${i}页。在这一页中，${characterData.name}遇到了新的挑战和机会，学习了重要的人生道理...`,
        image: ['🌈', '🦋', '🌸', '🌺', '🍀', '⭐'][i % 6]
      })
    }

    // 结尾页
    pages.push({
      type: 'ending',
      title: '故事结束',
      content: `${characterData.name}通过这次经历学会了很多，变得更加勇敢和智慧。`,
      image: '🎉'
    })

    setBookData({
      character: characterData,
      story: storyData,
      content: contentData,
      pages: pages,
      isAIGenerated: false
    })
  }, [navigate])

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (bookData && currentPage < bookData.pages.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleBackHome = () => {
    navigate('/')
  }

  const handleRecreate = () => {
    localStorage.clear()
    navigate('/')
  }

  // 编辑页面内容
  const handleEditPage = (pageIndex) => {
    const pageData = bookData.pages[pageIndex];
    setEditingPageIndex(pageIndex);
    setEditedContent(pageData.content);
    setEditDialogOpen(true);
  };

  // 保存编辑的内容
  const handleSaveEdit = async () => {
    if (editingPageIndex === null) return;

    try {
      const pageData = bookData.pages[editingPageIndex];
      const updatedPageData = {
        ...pageData,
        content: editedContent
      };

      // 更新bookData
      const newBookData = { ...bookData };
      newBookData.pages[editingPageIndex] = updatedPageData;
      setBookData(newBookData);

      // 更新localStorage
      const generatedBook = JSON.parse(localStorage.getItem('generatedBook') || '{}');
      if (generatedBook.pages && generatedBook.pages[editingPageIndex - 1]) {
        generatedBook.pages[editingPageIndex - 1].text = editedContent; // 修复：使用text字段
        generatedBook.pages[editingPageIndex - 1].content = editedContent; // 兼容性保留
        localStorage.setItem('generatedBook', JSON.stringify(generatedBook));
      }

      setEditDialogOpen(false);
      setEditingPageIndex(null);
      setEditedContent('');

    } catch (error) {
      console.error('保存编辑失败:', error);
    }
  };

  // 重新生成插画（不改变内容）
  const handleRegenerateImage = async (pageIndex) => {
    const pageData = bookData.pages[pageIndex];
    if (pageData.type !== 'content') return;

    setRegeneratingImage(pageIndex);

    try {
      const contentData = JSON.parse(localStorage.getItem('contentData') || '{}');
      const generatedBook = JSON.parse(localStorage.getItem('generatedBook') || '{}');
      
      const options = {
        imageEngine: contentData.imageEngine || 'liblibai',
        useCharacterConsistency: contentData.useCharacterConsistency || true,
        masterImageUrl: generatedBook.masterImageUrl || null,
        enhancedPrompt: true
      };

      const result = await regeneratePageIllustration(
        pageData,
        bookData.character,
        options,
        (status, progress) => {
          console.log(`重新生成进度: ${status} - ${progress}%`);
        }
      );

      if (result.success) {
        // 更新页面数据
        const newBookData = { ...bookData };
        const updatedPageData = {
          ...pageData,
          regenerated: true,
          regenerationMethod: result.method
        };
        
        // 如果有图片URL，使用图片；否则使用emoji回退
        if (result.imageUrl) {
          updatedPageData.imageUrl = result.imageUrl;
          // 确保删除任何旧的fallback数据
          delete updatedPageData.fallbackEmoji;
          delete updatedPageData.regenerationNote;
        } else if (result.fallbackEmoji) {
          updatedPageData.fallbackEmoji = result.fallbackEmoji;
          updatedPageData.image = result.fallbackEmoji; // 更新显示用的emoji
          updatedPageData.regenerationNote = result.note;
          // 保留原有的imageUrl，让ImageDisplay组件处理fallback
        }
        
        newBookData.pages[pageIndex] = updatedPageData;
        setBookData(newBookData);

        // 更新localStorage
        const generatedBook = JSON.parse(localStorage.getItem('generatedBook') || '{}');
        if (generatedBook.pages && generatedBook.pages[pageIndex - 1]) {
          const storedPage = generatedBook.pages[pageIndex - 1];
          if (result.imageUrl) {
            storedPage.imageUrl = result.imageUrl;
            // 删除旧的fallback数据
            delete storedPage.fallbackEmoji;
          } else if (result.fallbackEmoji) {
            storedPage.fallbackEmoji = result.fallbackEmoji;
          }
          if (result.newSceneDescription) {
            storedPage.sceneDescription = result.newSceneDescription;
          }
          storedPage.text = updatedPageData.content; // 更新文本内容
          storedPage.content = updatedPageData.content; // 兼容性保留
          storedPage.regenerated = true;
          storedPage.regenerationMethod = result.method;
          localStorage.setItem('generatedBook', JSON.stringify(generatedBook));
        }

        if (result.method === 'emoji_fallback') {
          console.log('插画重新生成使用emoji回退:', result.fallbackEmoji);
        } else {
          console.log('插画重新生成成功，新图片URL:', result.imageUrl);
        }
      } else {
        console.error('插画重新生成失败:', result.error);
      }
    } catch (error) {
      console.error('重新生成插画失败:', error);
    } finally {
      setRegeneratingImage(null);
    }
  };

  // 根据新内容重新生成插画
  const handleRegenerateWithNewContent = async (pageIndex) => {
    const pageData = bookData.pages[pageIndex];
    if (pageData.type !== 'content') return;

    setRegeneratingImage(pageIndex);

    try {
      const contentData = JSON.parse(localStorage.getItem('contentData') || '{}');
      const generatedBook = JSON.parse(localStorage.getItem('generatedBook') || '{}');
      
      const options = {
        imageEngine: contentData.imageEngine || 'liblibai',
        useCharacterConsistency: contentData.useCharacterConsistency || true,
        masterImageUrl: generatedBook.masterImageUrl || null,
        enhancedPrompt: true
      };

      const result = await regenerateIllustrationWithNewContent(
        pageData,
        bookData.character,
        options,
        (status, progress) => {
          console.log(`根据新内容重新生成进度: ${status} - ${progress}%`);
        }
      );

      if (result.success) {
        // 更新页面数据
        const newBookData = { ...bookData };
        const updatedPageData = {
          ...result.updatedPageData,
          regenerated: true,
          regenerationMethod: result.method
        };
        
        // 如果有图片URL，使用图片；否则使用emoji回退
        if (result.imageUrl) {
          updatedPageData.imageUrl = result.imageUrl;
          // 确保删除任何旧的fallback数据
          delete updatedPageData.fallbackEmoji;
          delete updatedPageData.regenerationNote;
        } else if (result.fallbackEmoji) {
          updatedPageData.fallbackEmoji = result.fallbackEmoji;
          updatedPageData.image = result.fallbackEmoji; // 更新显示用的emoji
          updatedPageData.regenerationNote = result.note;
        }
        
        newBookData.pages[pageIndex] = updatedPageData;
        setBookData(newBookData);

        // 更新localStorage
        const generatedBook = JSON.parse(localStorage.getItem('generatedBook') || '{}');
        if (generatedBook.pages && generatedBook.pages[pageIndex - 1]) {
          const storedPage = generatedBook.pages[pageIndex - 1];
          if (result.imageUrl) {
            storedPage.imageUrl = result.imageUrl;
            // 删除旧的fallback数据
            delete storedPage.fallbackEmoji;
          } else if (result.fallbackEmoji) {
            storedPage.fallbackEmoji = result.fallbackEmoji;
          }
          if (result.newSceneDescription) {
            storedPage.sceneDescription = result.newSceneDescription;
          }
          storedPage.text = updatedPageData.content; // 更新文本内容
          storedPage.content = updatedPageData.content; // 兼容性保留
          storedPage.regenerated = true;
          storedPage.regenerationMethod = result.method;
          localStorage.setItem('generatedBook', JSON.stringify(generatedBook));
        }

        if (result.method === 'emoji_fallback') {
          console.log('根据新内容重新生成插画使用emoji回退:', result.fallbackEmoji);
        } else {
          console.log('根据新内容重新生成插画成功，新图片URL:', result.imageUrl);
        }
      } else {
        console.error('根据新内容重新生成插画失败:', result.error);
      }
    } catch (error) {
      console.error('根据新内容重新生成插画失败:', error);
    } finally {
      setRegeneratingImage(null);
    }
  };

  // 保存完整故事（图片+PDF）
  const handleSaveCompleteStory = async () => {
    if (!bookData) return;

    setSavingStory(true);
    setSaveProgress(0);

    try {
      console.log('开始保存完整故事...');
      
      const storyData = {
        title: bookData.pages[0].title,
        subtitle: bookData.pages[0].subtitle,
        pages: bookData.pages.filter(page => page.type === 'content'),
        coverImage: bookData.pages[0].imageUrl
      };

      const result = await saveCompleteStory(
        storyData,
        (status, progress) => {
          setSaveProgress(progress);
          console.log(`完整故事保存进度: ${status} - ${progress}%`);
        }
      );

      if (result.success) {
        console.log('完整故事保存成功:', result.message);
        console.log('生成的文件:', result.files);
        // 可以添加成功提示
      } else {
        console.error('完整故事保存失败:', result.error);
      }
    } catch (error) {
      console.error('完整故事保存失败:', error);
      // 可以添加错误提示
    } finally {
      setSavingStory(false);
      setSaveProgress(0);
    }
  };

  // 保存故事为HTML文档（保留原有功能作为备选）
  const handleSaveStoryHTML = async () => {
    if (!bookData) return;

    setSavingStory(true);
    setSaveProgress(0);

    try {
      console.log('开始保存HTML故事...');
      
      const success = await exportStoryAsHTML(
        bookData,
        (status, progress) => {
          setSaveProgress(progress);
          console.log(`HTML故事保存进度: ${status} - ${progress}%`);
        }
      );

      if (success) {
        console.log('HTML故事保存成功');
      }
    } catch (error) {
      console.error('HTML故事保存失败:', error);
    } finally {
      setSavingStory(false);
      setSaveProgress(0);
    }
  };

  // 图生图优化功能
  const handleOptimizeImage = async (pageIndex) => {
    const pageData = bookData.pages[pageIndex]
    if (!pageData.imageUrl || !pageData.imagePrompt) return

    setOptimizingImage(pageIndex)
    
    try {
      console.log('开始图生图优化，页面:', pageIndex)
      const optimizedResult = await generateImageToImageComplete(
        `${pageData.imagePrompt}, enhanced quality, more detailed, better composition`,
        pageData.imageUrl,
        (status, progress) => {
          console.log(`图生图优化进度: ${status} - ${progress}%`)
        },
        {
          aspectRatio: "3:4",
          guidance_scale: 4.0, // 稍高的引导系数以获得更好效果
          imgCount: 1,
          model: "pro"
        }
      )

      console.log('图生图优化结果:', optimizedResult);
      
      let optimizedImageUrl = null;
      if (optimizedResult && optimizedResult.status === 'success' && optimizedResult.imageUrl) {
        optimizedImageUrl = optimizedResult.imageUrl;
      } else if (optimizedResult && optimizedResult.images && optimizedResult.images.length > 0) {
        optimizedImageUrl = optimizedResult.images[0].imageUrl || optimizedResult.images[0];
      }
      
      if (optimizedImageUrl) {
        // 更新页面数据
        const newBookData = { ...bookData }
        newBookData.pages[pageIndex] = {
          ...pageData,
          imageUrl: optimizedImageUrl,
          optimized: true
        }
        setBookData(newBookData)
        
        // 更新localStorage
        localStorage.setItem('generatedBook', JSON.stringify({
          ...JSON.parse(localStorage.getItem('generatedBook') || '{}'),
          pages: newBookData.pages.slice(1, -1) // 移除封面和结尾页
        }))
        
        console.log('图生图优化成功')
      }
    } catch (error) {
      console.error('图生图优化失败:', error)
    } finally {
      setOptimizingImage(null)
    }
  }

  if (!bookData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  const currentPageData = bookData.pages[currentPage]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* 顶部导航 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 mr-2 sm:mr-3" />
            <h1 className="text-lg sm:text-xl font-medium text-gray-800">绘本预览</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <span className="text-sm text-gray-500 mb-2 sm:mb-0">
              {currentPage + 1} / {bookData.pages.length}
            </span>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <Button onClick={handleBackHome} variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Home className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">返回首页</span>
                <span className="sm:hidden">首页</span>
              </Button>
              <Button onClick={handleRecreate} variant="outline" size="sm" className="flex-1 sm:flex-none">
                <RotateCcw className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">重新创建</span>
                <span className="sm:hidden">重建</span>
              </Button>
              {/* 综合保存故事按钮 */}
              <Button 
                onClick={handleSaveCompleteStory} 
                variant="default" 
                size="sm"
                disabled={savingStory}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
              >
                {savingStory ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">保存中 {saveProgress}%</span>
                    <span className="sm:hidden">{saveProgress}%</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">保存完整故事</span>
                    <span className="sm:hidden">保存</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 绘本内容 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl overflow-hidden">
          {/* 页面内容 */}
          <div className="aspect-[4/3] p-6 sm:p-12 flex flex-col items-center justify-center text-center">
            {currentPageData.type === 'cover' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">{currentPageData.image}</div>
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-3 sm:mb-4 px-4">
                  {currentPageData.title}
                </h1>
                <p className="text-base sm:text-xl text-gray-600 max-w-sm sm:max-w-md px-4">
                  {currentPageData.subtitle}
                </p>
              </div>
            )}

            {currentPageData.type === 'content' && (
              <div className="space-y-6 sm:space-y-8 max-w-full sm:max-w-2xl px-4 sm:px-0">
                {/* 智能图像显示 */}
                <ImageDisplay
                  pageData={currentPageData}
                  pageIndex={currentPage}
                  isOptimizing={optimizingImage === currentPage}
                  onImageLoad={(success) => {
                    setImageLoadStates(prev => ({
                      ...prev,
                      [currentPageData.pageNumber]: success
                    }));
                  }}
                  onOptimize={() => handleOptimizeImage(currentPage)}
                />

                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                  {currentPageData.title}
                </h2>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                  {currentPageData.content}
                </p>

                {/* 重新生成提示 */}
                {currentPageData.regenerationNote && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center text-yellow-800 text-sm">
                      <span className="mr-2">⚠️</span>
                      {currentPageData.regenerationNote}
                    </div>
                    <div className="text-yellow-700 text-xs mt-1">
                      您可以再次点击"重新生成插画"尝试生成真实图片
                    </div>
                  </div>
                )}

                {/* 页面操作按钮 */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center w-full sm:w-auto">
                  <Button
                    onClick={() => handleEditPage(currentPage)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center w-full sm:w-auto"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    编辑内容
                  </Button>

                  <Button
                    onClick={() => handleRegenerateImage(currentPage)}
                    variant="outline"
                    size="sm"
                    disabled={regeneratingImage === currentPage}
                    className="flex items-center justify-center w-full sm:w-auto"
                  >
                    {regeneratingImage === currentPage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">重新生成中...</span>
                        <span className="sm:hidden">生成中...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">重新生成插画</span>
                        <span className="sm:hidden">重新生成</span>
                      </>
                    )}
                  </Button>

                </div>

              </div>
            )}

            {currentPageData.type === 'ending' && (
              <div className="space-y-4 sm:space-y-6 w-full max-w-4xl">
                <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">{currentPageData.image}</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-4 px-4">
                  {currentPageData.title}
                </h2>
                <p className="text-base sm:text-xl text-gray-600 max-w-sm sm:max-w-md px-4 mx-auto">
                  {currentPageData.content}
                </p>

                {/* 教育价值总结 */}
                {(() => {
                  const generatedBook = JSON.parse(localStorage.getItem('generatedBook') || '{}');
                  if (!generatedBook.educationalValue) return null;
                  
                  return (
                    <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mx-4 text-left">
                      <div className="mb-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 flex items-center">
                          <span className="text-2xl mr-2">🎓</span>
                          教育价值
                        </h3>
                        <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                          {generatedBook.educationalValue}
                        </p>
                      </div>

                      {generatedBook.teachingPoints && generatedBook.teachingPoints.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                            <span className="text-xl mr-2">💡</span>
                            学习要点
                          </h4>
                          <ul className="space-y-2">
                            {generatedBook.teachingPoints.map((point, index) => (
                              <li key={index} className="flex items-start text-sm sm:text-base text-gray-700">
                                <span className="text-blue-500 mr-2 mt-1 flex-shrink-0">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {generatedBook.discussionQuestions && generatedBook.discussionQuestions.length > 0 && (
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center">
                            <span className="text-xl mr-2">❓</span>
                            讨论问题
                          </h4>
                          <ul className="space-y-3">
                            {generatedBook.discussionQuestions.map((question, index) => (
                              <li key={index} className="flex items-start text-sm sm:text-base text-gray-700">
                                <span className="text-purple-500 mr-2 mt-1 flex-shrink-0 font-semibold">{index + 1}.</span>
                                <span>{question}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 翻页控制 */}
          <div className="bg-gray-50 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between">
            <Button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">上一页</span>
              <span className="sm:hidden">上页</span>
            </Button>

            <div className="flex space-x-1 sm:space-x-2 overflow-x-auto max-w-48 sm:max-w-none">
              {bookData.pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors flex-shrink-0 ${
                    index === currentPage ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNextPage}
              disabled={currentPage === bookData.pages.length - 1}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <span className="hidden sm:inline">下一页</span>
              <span className="sm:hidden">下页</span>
              <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
            </Button>
          </div>
        </div>

        {/* 绘本信息 */}
        <div className="mt-6 sm:mt-8 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">绘本信息</h3>
            {bookData.isAIGenerated && (
              <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
                <Sparkles className="w-3 h-3" />
                <span>AI生成</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm mb-3 sm:mb-4">
            <div>
              <span className="text-gray-500">主角姓名：</span>
              <span className="font-medium">{bookData.character.name}</span>
            </div>
            <div>
              <span className="text-gray-500">主角年龄：</span>
              <span className="font-medium">{bookData.character.age}岁</span>
            </div>
            <div>
              <span className="text-gray-500">角色身份：</span>
              <span className="font-medium">{bookData.character.identity === 'human' ? '人类' : '动物'}</span>
            </div>
            <div>
              <span className="text-gray-500">故事页数：</span>
              <span className="font-medium">{bookData.pages.length}页</span>
            </div>
          </div>

          {/* 角色生成信息 */}
          {bookData.character.strategy && (
            <div className="border-t pt-4">
              <div className="text-sm text-gray-600 mb-2 font-medium">角色生成策略</div>
              <div className="flex flex-wrap gap-2 mb-3">
                <div className={`px-2 py-1 rounded text-xs ${
                  bookData.character.strategy === 'predefined' 
                    ? 'bg-green-100 text-green-800' 
                    : bookData.character.strategy === 'ai_generated'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {bookData.character.strategy === 'predefined' && '预设角色'}
                  {bookData.character.strategy === 'ai_generated' && 'AI完全自定义'}
                  {bookData.character.strategy === 'hybrid' && '智能混合'}
                </div>
                
                {bookData.character.isCustomGenerated && (
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    AI生成描述
                  </div>
                )}
                
                {bookData.character.validationPassed && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    身份验证通过
                  </div>
                )}
                
                {bookData.character.isFallback && (
                  <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                    自动回退
                  </div>
                )}
              </div>
              
              {/* 回退原因显示 */}
              {bookData.character.isFallback && bookData.character.fallbackReason && (
                <div className="mb-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="text-xs text-yellow-800">
                    <strong>回退原因：</strong>{bookData.character.fallbackReason}
                  </div>
                  <div className="text-xs text-yellow-700 mt-1">
                    系统已自动使用预设角色确保身份正确性
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI技术信息 */}
          {bookData.isAIGenerated && (
            <div className="border-t pt-4">
              <div className="text-sm text-gray-600 mb-2 font-medium">AI技术栈</div>
              <div className="flex flex-wrap gap-2">
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  通义千问 故事创作
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  bookData.pages[0]?.imageEngine === 'liblibai' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {bookData.pages[0]?.imageEngine === 'liblibai' ? 'LiblibAI Kontext' : 'DALL-E 3'} 插画生成
                </div>
                {bookData.pages[0]?.characterConsistency && (
                  <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                    角色一致性
                  </div>
                )}
                <div className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                  个性化定制
                </div>
              </div>
              
              {/* 角色一致性详细信息 */}
              {bookData.pages[0]?.characterConsistency && bookData.pages[0]?.masterImageUrl && (
                <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-sm text-orange-800 mb-2 font-medium">角色一致性详情</div>
                  <div className="flex items-start space-x-3">
                    <img 
                      src={bookData.pages[0].masterImageUrl} 
                      alt="主角标准形象" 
                      className="w-16 h-16 rounded-lg object-cover border border-orange-300"
                    />
                    <div className="flex-1 text-xs text-orange-700">
                      <div className="mb-1">✓ 使用风格参考图生成标准主角形象</div>
                      <div className="mb-1">✓ 基于主角形象生成{bookData.pages.filter(p => p.type === 'content').length}页插画</div>
                      <div>✓ 确保角色外观在全书中保持一致</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 编辑内容对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑页面内容</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                页面内容
              </label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="请输入新的页面内容..."
                className="min-h-[120px]"
              />
            </div>
            <div className="text-sm text-gray-500">
              提示：修改内容后，您可以选择重新生成插画以匹配新内容。
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editedContent.trim()}
            >
              保存内容
            </Button>
            <Button
              onClick={async () => {
                await handleSaveEdit();
                if (editingPageIndex !== null) {
                  handleRegenerateWithNewContent(editingPageIndex);
                }
              }}
              disabled={!editedContent.trim() || regeneratingImage !== null}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {regeneratingImage !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                '保存并重新生成插画'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 智能图像显示组件
function ImageDisplay({ pageData, pageIndex, isOptimizing, onImageLoad, onOptimize }) {
  const [imageState, setImageState] = useState('loading') // loading, success, failed, fallback
  const [currentImageSrc, setCurrentImageSrc] = useState('')

  useEffect(() => {
    const loadImage = async () => {
      // 首先尝试DALL-E 3生成的图像
      if (pageData.imageUrl) {
        setImageState('loading')
        setCurrentImageSrc(pageData.imageUrl)

        // 对于DALL-E图像，我们直接尝试显示，让浏览器处理加载
        // 如果加载失败，onError会被触发
        setImageState('success')
        onImageLoad && onImageLoad(true)
        return
      }

      // 如果没有DALL-E图像，使用本地生成的图像
      if (pageData.localImageUrl) {
        setImageState('fallback')
        setCurrentImageSrc(pageData.localImageUrl)
        onImageLoad && onImageLoad(false)
        return
      }

      // 最后使用emoji备用方案
      setImageState('failed')
      onImageLoad && onImageLoad(false)
    }

    loadImage()
  }, [pageData.imageUrl, pageData.localImageUrl, pageData.pageNumber])

  return (
    <div className="mb-6">
      {imageState === 'loading' && (
        <div className="w-full max-w-md mx-auto h-64 bg-gray-100 rounded-2xl flex items-center justify-center">
          <div className="text-gray-500">加载中...</div>
        </div>
      )}

      {(imageState === 'success' || imageState === 'fallback') && (
        <div className="relative">
          <img
            src={currentImageSrc}
            alt={pageData.sceneDescription || pageData.title}
            className="w-full max-w-md mx-auto rounded-2xl shadow-lg block"
            onError={() => {
              // 如果DALL-E图像失败，尝试本地图像
              if (pageData.localImageUrl && currentImageSrc !== pageData.localImageUrl) {
                setCurrentImageSrc(pageData.localImageUrl)
                setImageState('fallback')
              } else {
                setImageState('failed')
              }
            }}
          />
          
          {/* 图像优化按钮 - 只对LiblibAI生成的图像显示 */}
          {imageState === 'success' && pageData.imageEngine === 'liblibai' && pageData.imageUrl && onOptimize && (
            <div className="absolute top-2 right-2">
              <Button
                onClick={onOptimize}
                disabled={isOptimizing}
                size="sm"
                className="bg-white/90 hover:bg-white text-gray-700 shadow-md"
              >
                {isOptimizing ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>
          )}

        </div>
      )}

      {imageState === 'failed' && (
        <div className="mb-6">
          <div className="text-6xl text-center">{pageData.fallbackEmoji || pageData.image}</div>

        </div>
      )}

    </div>
  )
}

