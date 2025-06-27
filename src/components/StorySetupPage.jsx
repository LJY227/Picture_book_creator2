import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function StorySetupPage() {
  const navigate = useNavigate()
  const [storyData, setStoryData] = useState({
    type: '',
    pages: 6
  })

  useEffect(() => {
    // 检查是否有角色数据，如果没有则返回首页
    const characterData = localStorage.getItem('characterData')
    if (!characterData) {
      navigate('/')
    }
  }, [navigate])

  const storyTypes = [
    { value: 'adventure', label: '冒险故事' },
    { value: 'growth', label: '成长故事' },
    { value: 'friendship', label: '友情故事' },
    { value: 'life-skills', label: '生活技能' }
  ]

  const handleNext = () => {
    // 如果没有选择故事类型，随机选择一个
    let finalStoryData = { ...storyData }
    if (!finalStoryData.type) {
      const randomType = storyTypes[Math.floor(Math.random() * storyTypes.length)]
      finalStoryData.type = randomType.value
    }
    
    // 保存数据到localStorage
    localStorage.setItem('storyData', JSON.stringify(finalStoryData))
    navigate('/content-setup')
  }

  const handleBack = () => {
    navigate('/character-setup')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="w-6 h-6 text-blue-500 mr-3" />
            <h1 className="text-xl font-medium text-gray-800">故事设定</h1>
          </div>
          <div className="text-sm text-gray-500">步骤 2/3</div>
        </div>
        
        {/* 进度条 */}
        <div className="max-w-2xl mx-auto mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full w-2/3 transition-all duration-300"></div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="space-y-10">
          {/* 故事类型 */}
          <div className="space-y-4">
            <Label className="text-base font-medium text-gray-700">
              故事类型
            </Label>
            <Select
              value={storyData.type}
              onValueChange={(value) => setStoryData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="w-full text-base py-3 rounded-xl border-gray-200 focus:border-blue-500">
                <SelectValue placeholder="请选择故事类型（可选，留空将随机选择）" />
              </SelectTrigger>
              <SelectContent>
                {storyTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-base">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">选择适合的故事主题，帮助孩子学习和成长</p>
          </div>

          {/* 故事页数 */}
          <div className="space-y-6">
            <Label className="text-base font-medium text-gray-700">
              故事页数：{storyData.pages} 页
            </Label>
            <div className="px-4">
              <Slider
                value={[storyData.pages]}
                onValueChange={(value) => setStoryData(prev => ({ ...prev, pages: value[0] }))}
                max={10}
                min={4}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>4页</span>
                <span>7页</span>
                <span>10页</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">推荐6-8页，适合孩子的注意力时长</p>
          </div>

          {/* 预览卡片 */}
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-medium text-blue-800 mb-3">故事预览</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• 故事类型：{storyData.type ? storyTypes.find(t => t.value === storyData.type)?.label : '随机选择'}</p>
              <p>• 故事长度：{storyData.pages} 页</p>
              <p>• 预计阅读时间：{Math.ceil(storyData.pages * 1.5)} 分钟</p>
            </div>
          </div>
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
            onClick={handleNext}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl"
          >
            下一步
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

