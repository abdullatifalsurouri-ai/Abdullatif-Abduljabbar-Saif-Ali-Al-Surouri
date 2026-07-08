import locales from '../locales.json';

export type LanguageType = 'ar' | 'en';

export function getTranslation(lang: LanguageType) {
  return locales[lang] || locales.ar;
}

/**
 * Access nested JSON paths safely using a dot-notated key.
 * Example: t('dashboardStats.totalItems')
 */
export function t(key: string, lang: LanguageType): string {
  if (!key || typeof key !== 'string') return '';
  const dictionary = locales[lang] || locales.ar;
  const parts = key.split('.');
  
  let current: any = dictionary;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to English if not found in language, or return key itself
      if (lang === 'ar') {
        const enDictionary = locales.en;
        let enCurrent: any = enDictionary;
        for (const enPart of parts) {
          if (enCurrent && typeof enCurrent === 'object' && enPart in enCurrent) {
            enCurrent = enCurrent[enPart];
          } else {
            return key;
          }
        }
        return enCurrent;
      }
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}
