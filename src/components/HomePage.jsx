import { Button } from '@/components/ui/button.jsx'
import { BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext.jsx'
import LanguageSelector from './LanguageSelector.jsx'

export default function HomePage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const handleCreateBook = () => {
    navigate('/character-setup')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
      {/* 语言选择器 - 右上角 */}
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>

      {/* Logo和项目名称 */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center mb-4">
          <BookOpen className="w-12 h-12 text-blue-500 mr-3" />
          <h1 className="text-4xl font-light text-gray-800">{t('home.title')}</h1>
        </div>
        <div className="w-24 h-1 bg-blue-500 mx-auto rounded-full"></div>
      </div>

      {/* 主功能按钮 */}
      <div className="mb-16">
        <Button 
          onClick={handleCreateBook}
          className="bg-blue-500 hover:bg-blue-600 text-white px-12 py-6 text-xl font-medium rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <BookOpen className="w-6 h-6 mr-3" />
          {t('home.createBook')}
        </Button>
      </div>

      {/* 底部说明 */}
      <div className="text-center">
        <p className="text-gray-500 text-sm">{t('home.subtitle')}</p>
        <p className="text-gray-400 text-xs mt-2">{t('home.description')}</p>
      </div>
    </div>
  )
}

