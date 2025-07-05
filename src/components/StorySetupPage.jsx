import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext.jsx'

export default function StorySetupPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
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
    { value: 'adventure', label: t('story.type.adventure') },
    { value: 'growth', label: t('story.type.growth') },
    { value: 'friendship', label: t('story.type.friendship') },
    { value: 'life-skills', label: t('story.type.lifeSkills') }
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
            <h1 className="text-xl font-medium text-gray-800">{t('story.title')}</h1>
          </div>
          <div className="text-sm text-gray-500">{t('story.step')}</div>
        </div>
        
        {/* 进度条 */}
        <div className="max-w-2xl mx-auto mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full w-2/3 transition-all duration-300"></div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12 pb-24 sm:pb-32">
        <div className="space-y-8 sm:space-y-10">
          {/* 故事类型 */}
          <div className="space-y-4">
            <Label className="text-base font-medium text-gray-700">
              {t('story.type')}
            </Label>
            <Select
              value={storyData.type}
              onValueChange={(value) => setStoryData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="w-full text-base py-3 rounded-xl border-gray-200 focus:border-blue-500">
                <SelectValue placeholder={t('story.type.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {storyTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-base">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">{t('story.type.description')}</p>
          </div>

          {/* 故事页数 */}
          <div className="space-y-6">
            <Label className="text-base font-medium text-gray-700">
              {t('story.pages.count', { count: storyData.pages })}
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
                <span>{t('story.pages.min')}</span>
                <span>{t('story.pages.mid')}</span>
                <span>{t('story.pages.max')}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">{t('story.pages.description')}</p>
          </div>

          {/* 预览卡片 */}
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-medium text-blue-800 mb-3">{t('story.preview')}</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• {t('story.preview.type', { type: storyData.type ? storyTypes.find(t => t.value === storyData.type)?.label : t('story.preview.random') })}</p>
              <p>• {t('story.preview.length', { pages: storyData.pages })}</p>
              <p>• {t('story.preview.duration', { minutes: Math.ceil(storyData.pages * 1.5) })}</p>
            </div>
          </div>
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
            {t('story.back')}
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

