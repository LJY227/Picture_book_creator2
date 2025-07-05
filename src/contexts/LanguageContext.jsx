import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, DEFAULT_LANGUAGE, getBrowserLanguage } from '../lib/languages.js';

// 创建语言上下文
const LanguageContext = createContext();

// 语言Provider组件
export function LanguageProvider({ children }) {
  // 从localStorage获取保存的语言，或使用浏览器语言
  const getInitialLanguage = () => {
    const savedLanguage = localStorage.getItem('app-language');
    if (savedLanguage && translations[savedLanguage]) {
      return savedLanguage;
    }
    return getBrowserLanguage();
  };

  const [currentLanguage, setCurrentLanguage] = useState(getInitialLanguage);

  // 切换语言函数
  const changeLanguage = (langCode) => {
    if (translations[langCode]) {
      setCurrentLanguage(langCode);
      localStorage.setItem('app-language', langCode);
    }
  };

  // 翻译函数
  const t = (key, params = {}) => {
    const translation = translations[currentLanguage]?.[key] || translations[DEFAULT_LANGUAGE]?.[key] || key;
    
    // 处理参数替换（如 "第 {page} 页"）
    return translation.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  };

  // 获取当前语言的所有翻译
  const getCurrentTranslations = () => {
    return translations[currentLanguage] || translations[DEFAULT_LANGUAGE];
  };

  // 检查是否为中文语言
  const isChinese = () => {
    return currentLanguage.startsWith('zh');
  };

  // 检查是否为英文语言
  const isEnglish = () => {
    return currentLanguage === 'en';
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    getCurrentTranslations,
    isChinese,
    isEnglish,
    availableLanguages: Object.keys(translations)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// 自定义Hook使用语言上下文
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// 导出Context以备其他地方使用
export { LanguageContext }; 