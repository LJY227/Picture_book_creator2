import React, { useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { LANGUAGES } from '../lib/languages.js';

export default function LanguageSelector() {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* 语言选择按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors duration-200 min-w-[140px]"
      >
        <Globe className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {LANGUAGES[currentLanguage]?.nativeName || t('home.language')}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 下拉选项 */}
          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            {Object.values(LANGUAGES).map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors duration-200 flex items-center gap-3 ${
                  currentLanguage === language.code
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {/* 语言标识 */}
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-mono min-w-[40px] text-center">
                  {language.code === 'zh-CN' ? '简' : 
                   language.code === 'zh-TW' ? '繁' : 
                   language.code === 'en' ? 'EN' : language.code}
                </span>
                
                {/* 语言名称 */}
                <span>{language.nativeName}</span>
                
                {/* 当前选中标识 */}
                {currentLanguage === language.code && (
                  <span className="ml-auto text-blue-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 