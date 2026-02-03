import az from '@/locales/az.json';
import en from '@/locales/en.json';
import ru from '@/locales/ru.json';

export type Locale = 'az' | 'en' | 'ru';

export const locales: Locale[] = ['az', 'en', 'ru'];
export const defaultLocale: Locale = 'az';

const translations = { az, en, ru } as const;

type TranslationKeys = typeof az;

export function getLocaleFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split('/');
  if (locales.includes(lang as Locale)) {
    return lang as Locale;
  }
  return defaultLocale;
}

export function getLocaleFromCookie(cookies: any): Locale {
  const lang = cookies.get('lang')?.value;
  if (lang && locales.includes(lang as Locale)) {
    return lang as Locale;
  }
  return defaultLocale;
}

export function t(locale: Locale = defaultLocale): TranslationKeys {
  return translations[locale] || translations[defaultLocale];
}

export function useTranslations(locale: Locale = defaultLocale) {
  return t(locale);
}

export function getLocalePath(path: string, locale: Locale): string {
  if (locale === defaultLocale) {
    return path;
  }
  return `/${locale}${path}`;
}

export function switchLocale(currentPath: string, newLocale: Locale): string {
  const pathParts = currentPath.split('/').filter(Boolean);

  if (locales.includes(pathParts[0] as Locale)) {
    pathParts.shift();
  }

  const cleanPath = '/' + pathParts.join('/');

  if (newLocale === defaultLocale) {
    return cleanPath || '/';
  }

  return `/${newLocale}${cleanPath}`;
}
