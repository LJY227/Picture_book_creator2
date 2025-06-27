import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'

export default function DebugPage() {
  const [debugData, setDebugData] = useState({})

  useEffect(() => {
    // 获取所有localStorage数据
    const characterData = localStorage.getItem('characterData')
    const storyData = localStorage.getItem('storyData')
    const contentData = localStorage.getItem('contentData')
    const generatedBook = localStorage.getItem('generatedBook')

    setDebugData({
      characterData: characterData ? JSON.parse(characterData) : null,
      storyData: storyData ? JSON.parse(storyData) : null,
      contentData: contentData ? JSON.parse(contentData) : null,
      generatedBook: generatedBook ? JSON.parse(generatedBook) : null,
      raw: {
        characterData,
        storyData,
        contentData,
        generatedBook
      }
    })
  }, [])

  const clearStorage = () => {
    localStorage.clear()
    window.location.reload()
  }

  const createTestData = () => {
    // 创建测试数据
    const testCharacterData = {
      name: '小明',
      age: 6,
      identity: 'human',
      gender: 'boy'
    }

    const testStoryData = {
      type: 'friendship',
      pages: 4
    }

    const testContentData = {
      isCustom: false,
      randomTopic: '学会分享与合作'
    }

    const testGeneratedBook = {
      title: '小明的分享之旅',
      pages: [
        {
          pageNumber: 1,
          title: '新的一天',
          content: '小明今天带了很多玩具到学校，他想要和朋友们一起玩。',
          sceneDescription: '小明在教室里，手里拿着玩具',
          imageUrl: 'https://example.com/test-image-1.jpg',
          localImageUrl: null
        },
        {
          pageNumber: 2,
          title: '学会分享',
          content: '当朋友们想要玩他的玩具时，小明学会了分享的快乐。',
          sceneDescription: '小明和朋友们一起玩玩具',
          imageUrl: 'https://example.com/test-image-2.jpg',
          localImageUrl: null
        }
      ],
      educationalMessage: '通过分享，我们可以获得更多的快乐和友谊。'
    }

    // 保存到localStorage
    localStorage.setItem('characterData', JSON.stringify(testCharacterData))
    localStorage.setItem('storyData', JSON.stringify(testStoryData))
    localStorage.setItem('contentData', JSON.stringify(testContentData))
    localStorage.setItem('generatedBook', JSON.stringify(testGeneratedBook))

    alert('测试数据已创建！现在可以访问预览页面了。')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">调试页面 - LocalStorage 数据</h1>
          <div className="space-x-2">
            <Button onClick={createTestData} variant="outline">
              创建测试数据
            </Button>
            <Button onClick={clearStorage} variant="destructive">
              清空所有数据
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* 角色数据 */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">角色数据 (characterData)</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugData.characterData, null, 2)}
            </pre>
          </div>

          {/* 故事数据 */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">故事数据 (storyData)</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugData.storyData, null, 2)}
            </pre>
          </div>

          {/* 内容数据 */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">内容数据 (contentData)</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugData.contentData, null, 2)}
            </pre>
          </div>

          {/* 生成的绘本数据 */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">生成的绘本数据 (generatedBook)</h2>
            {debugData.generatedBook ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">标题: {debugData.generatedBook.title}</h3>
                  <p className="text-sm text-gray-600">页数: {debugData.generatedBook.pages?.length || 0}</p>
                </div>
                
                {debugData.generatedBook.pages && debugData.generatedBook.pages.map((page, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">第{page.pageNumber}页: {page.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{page.content?.substring(0, 100)}...</p>
                    {page.imageUrl && (
                      <div className="mb-2">
                        <p className="text-xs text-green-600">✅ 有图像URL</p>
                        <img 
                          src={page.imageUrl} 
                          alt={page.title}
                          className="w-32 h-32 object-cover rounded border"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="text-xs text-red-500 hidden">图像加载失败</div>
                      </div>
                    )}
                    {page.fallbackEmoji && (
                      <p className="text-xs text-orange-600">🔄 备用emoji: {page.fallbackEmoji}</p>
                    )}
                  </div>
                ))}
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600">查看完整JSON数据</summary>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(debugData.generatedBook, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="text-gray-500">没有生成的绘本数据</p>
            )}
          </div>

          {/* 原始数据 */}
          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">原始字符串数据</h2>
            <div className="space-y-2 text-xs">
              <div>
                <strong>characterData:</strong> {debugData.raw.characterData ? '✅ 存在' : '❌ 不存在'}
              </div>
              <div>
                <strong>storyData:</strong> {debugData.raw.storyData ? '✅ 存在' : '❌ 不存在'}
              </div>
              <div>
                <strong>contentData:</strong> {debugData.raw.contentData ? '✅ 存在' : '❌ 不存在'}
              </div>
              <div>
                <strong>generatedBook:</strong> {debugData.raw.generatedBook ? '✅ 存在' : '❌ 不存在'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
