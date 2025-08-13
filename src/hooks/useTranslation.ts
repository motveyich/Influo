import { useState, useEffect } from 'react';
import { i18n } from '../core/i18n';
import { Language } from '../core/i18n/types';

export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(i18n.getCurrentLanguage());

  useEffect(() => {
    const unsubscribe = i18n.subscribe(setCurrentLanguage);
    return unsubscribe;
  }, []);

  return {
    t: i18n.t.bind(i18n),
    language: currentLanguage,
    setLanguage: i18n.setLanguage.bind(i18n),
    availableLanguages: i18n.getAvailableLanguages(),
    getLanguageInfo: i18n.getLanguageInfo.bind(i18n),
  };
}