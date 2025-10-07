
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import en from '../locales/en';
import zhCN from '../locales/zhCN';
import zhTW from '../locales/zhTW';

export type Language = 'en' | 'zh-CN' | 'zh-TW';

interface LocalizationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, any> = {
  'en': en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getInitialLanguage = (): Language => {
    const browserLang = navigator.language;
    if (browserLang.startsWith('zh-CN')) return 'zh-CN';
    if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-HK')) return 'zh-TW';
    if (browserLang.startsWith('zh')) return 'zh-CN';
    return 'en';
  };
  
  const [language, setLanguage] = useState<Language>(getInitialLanguage());

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let result = translations[language];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found
        let fallbackResult = translations['en'];
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
        }
        return fallbackResult || key;
      }
    }
    return result || key;
  }, [language]);

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};