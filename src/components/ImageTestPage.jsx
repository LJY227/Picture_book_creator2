import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'

export default function ImageTestPage() {
  const [testImageUrl, setTestImageUrl] = useState('')
  const [imageStatus, setImageStatus] = useState('')
  const [networkStatus, setNetworkStatus] = useState('检测中...')

  // 检测网络状态
  useEffect(() => {
    const checkNetwork = async () => {
      try {
        // 尝试访问一个简单的API
        const response = await fetch('https://httpbin.org/get', {
          method: 'GET',
          mode: 'cors'
        });
        if (response.ok) {
          setNetworkStatus('✅ 网络连接正常')
        } else {
          setNetworkStatus('⚠️ 网络连接异常')
        }
      } catch (error) {
        setNetworkStatus('❌ 网络连接失败: ' + error.message)
      }
    }

    checkNetwork()
  }, [])

  // 测试用的示例图像URL和Base64图像
  const testUrls = [
    // 简单的SVG图像（内联）
    'data:image/svg+xml;base64,' + btoa(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#4F46E5"/>
        <text x="200" y="150" text-anchor="middle" fill="white" font-size="24" font-family="Arial">
          测试图像 1
        </text>
        <circle cx="100" cy="100" r="30" fill="#F59E0B"/>
        <circle cx="300" cy="200" r="25" fill="#10B981"/>
      </svg>
    `),
    // 另一个SVG图像
    'data:image/svg+xml;base64,' + btoa(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="300" fill="#059669"/>
        <text x="200" y="150" text-anchor="middle" fill="white" font-size="24" font-family="Arial">
          测试图像 2
        </text>
        <polygon points="200,50 250,150 150,150" fill="#F97316"/>
        <rect x="150" y="200" width="100" height="50" fill="#8B5CF6"/>
      </svg>
    `),
    // 简单的Canvas生成图像
    generateCanvasImage()
  ]

  // 生成Canvas图像的函数
  function generateCanvasImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // 绘制背景
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(0, 0, 400, 300);

    // 绘制文字
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('测试图像 3', 200, 150);

    // 绘制一些形状
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(100, 100, 30, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#34D399';
    ctx.fillRect(250, 180, 60, 40);

    return canvas.toDataURL();
  }

  const testImage = (url) => {
    setTestImageUrl(url)
    setImageStatus('加载中...')
  }

  const handleImageLoad = () => {
    setImageStatus('✅ 图像加载成功')
  }

  const handleImageError = (event) => {
    console.error('图像加载失败:', event)
    setImageStatus('❌ 图像加载失败 - 可能是网络问题或URL无效')
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">图像显示测试页面</h1>
        
        <div className="space-y-6">
          {/* 网络状态 */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <strong>网络状态:</strong> {networkStatus}
          </div>

          {/* 测试按钮 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">测试图像URL</h2>
            {testUrls.map((url, index) => (
              <Button 
                key={index}
                onClick={() => testImage(url)}
                variant="outline"
                className="mr-2 mb-2"
              >
                测试图像 {index + 1}
              </Button>
            ))}
          </div>

          {/* 自定义URL测试 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">自定义URL测试</h2>
            <div className="flex space-x-2">
              <input
                type="url"
                placeholder="输入图像URL"
                className="flex-1 px-3 py-2 border rounded"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    testImage(e.target.value)
                  }
                }}
              />
              <Button onClick={() => {
                const input = document.querySelector('input[type="url"]')
                testImage(input.value)
              }}>
                测试
              </Button>
            </div>
          </div>

          {/* 状态显示 */}
          {imageStatus && (
            <div className="p-3 bg-gray-100 rounded">
              <strong>状态:</strong> {imageStatus}
            </div>
          )}

          {/* 图像显示区域 */}
          {testImageUrl && (
            <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
              <h3 className="text-md font-medium mb-4">图像显示测试</h3>
              <div className="text-center">
                <img
                  src={testImageUrl}
                  alt="测试图像"
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </div>
              <div className="mt-4 text-xs text-gray-600 break-all">
                <strong>URL:</strong> {testImageUrl}
              </div>
            </div>
          )}

          {/* 模拟绘本页面结构 */}
          <div className="border-2 border-blue-300 p-4 rounded-lg">
            <h3 className="text-md font-medium mb-4">模拟绘本页面结构</h3>
            <div className="space-y-4">
              {/* 模拟AI生成的图像 */}
              <div className="mb-6">
                <div className="relative">
                  {testImageUrl ? (
                    <img 
                      src={testImageUrl}
                      alt="模拟AI生成的插画"
                      className="w-full max-w-md mx-auto rounded-2xl shadow-lg block"
                      onLoad={() => console.log('模拟绘本图像加载成功')}
                      onError={() => console.error('模拟绘本图像加载失败')}
                    />
                  ) : (
                    <div className="text-6xl text-center">🌟</div>
                  )}
                </div>
                <div className="text-center mt-2 text-xs text-gray-500">
                  {testImageUrl ? 'AI生成的插画' : '默认插图'}
                </div>
              </div>

              {/* 模拟故事内容 */}
              <h2 className="text-2xl font-semibold text-gray-800">
                测试故事标题
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                这是一个测试故事的内容。我们正在测试图像是否能够正确显示在绘本页面中。
              </p>
            </div>
          </div>

          {/* 浏览器信息 */}
          <div className="bg-gray-50 p-4 rounded text-sm">
            <h3 className="font-medium mb-2">浏览器信息</h3>
            <div>User Agent: {navigator.userAgent}</div>
            <div>支持的图像格式: JPEG, PNG, GIF, WebP, SVG</div>
          </div>
        </div>
      </div>
    </div>
  )
}
