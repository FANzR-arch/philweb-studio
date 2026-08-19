/**
 * [INPUT]   : 中文与英文翻译对象
 * [OUTPUT]  : LanguageContext 与 useLanguage hook
 * [POS]     : i18n 数据层入口
 * [DECISION]: 使用 React Context 提供轻量级国际化能力，避免为站点引入重型 i18n 框架
 */

import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { readLocalStorage, writeLocalStorage } from '../safeStorage';
import { en } from './en';
import { zh, Translations } from './zh';

export type Language = 'zh' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  lang?: Language;
  persist?: boolean;
  onLangChange?: (lang: Language) => void;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  lang: controlledLang,
  persist = true,
  onLangChange,
}) => {
  const [innerLang, setInnerLang] = useState<Language>(() => {
    if (controlledLang) return controlledLang;
    if (typeof window === 'undefined') {
      return 'zh';
    }

    const queryLang = new URLSearchParams(window.location.search).get('lang');
    if (queryLang === 'zh' || queryLang === 'en') {
      return queryLang;
    }

    const storedLang = readLocalStorage('lang');
    if (storedLang === 'zh' || storedLang === 'en') {
      return storedLang;
    }

    return 'zh';
  });

  const lang = controlledLang ?? innerLang;
  const translations: Record<Language, Translations> = { zh, en };
  const t = translations[lang];

  const setLang = (next: Language) => {
    if (!controlledLang) setInnerLang(next);
    onLangChange?.(next);
  };

  useEffect(() => {
    if (persist && !controlledLang) {
      writeLocalStorage('lang', lang);
    }
  }, [lang, persist, controlledLang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export { zh, en };
export type { Translations };
