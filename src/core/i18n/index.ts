import { Language, TranslationKeys } from './types';
import { ru } from './translations/ru';
import { en } from './translations/en';

const translations: Record<Language, TranslationKeys> = {
  ru,
  en,
};

class I18nService {
  private currentLanguage: Language = 'ru'; // По умолчанию русский
  private listeners: ((language: Language) => void)[] = [];

  constructor() {
    // Загружаем сохраненный язык из localStorage
    const savedLanguage = localStorage.getItem('influo_language') as Language;
    if (savedLanguage && translations[savedLanguage]) {
      this.currentLanguage = savedLanguage;
    }
  }

  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  setLanguage(language: Language): void {
    if (translations[language]) {
      this.currentLanguage = language;
      localStorage.setItem('influo_language', language);
      this.notifyListeners();
    }
  }

  subscribe(callback: (language: Language) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentLanguage));
  }

  // Основная функция для получения переводов
  t(key: string, params?: Record<string, string | number>): string {
    const translation = this.getNestedValue(translations[this.currentLanguage], key);
    
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }

    // Заменяем параметры в строке
    if (params) {
      return Object.entries(params).reduce((str, [param, value]) => {
        return str.replace(new RegExp(`{${param}}`, 'g'), String(value));
      }, translation);
    }

    return translation;
  }

  // Получение вложенного значения по ключу (например, 'common.loading')
  private getNestedValue(obj: any, key: string): string {
    return key.split('.').reduce((current, keyPart) => {
      return current && current[keyPart] !== undefined ? current[keyPart] : undefined;
    }, obj);
  }

  // Проверка доступности языка
  isLanguageAvailable(language: string): boolean {
    return language in translations;
  }

  // Получение списка доступных языков
  getAvailableLanguages(): Language[] {
    return Object.keys(translations) as Language[];
  }

  // Получение информации о языке
  getLanguageInfo(language: Language): { code: Language; name: string; nativeName: string } {
    const languageInfo = {
      ru: { code: 'ru' as Language, name: 'Russian', nativeName: 'Русский' },
      en: { code: 'en' as Language, name: 'English', nativeName: 'English' },
    };

    return languageInfo[language];
  }
}

export const i18n = new I18nService();

// Хук для использования в React компонентах
export { useTranslation } from '../../hooks/useTranslation';