import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { ContentDisplay, Locale, LocalizedText } from '../data/types'
import { resources } from './resources'

export const getSystemLocale = (): Locale =>
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
    ? 'zh-CN'
    : 'en-US'

export const activeLocale = (): Locale =>
  i18n.resolvedLanguage === 'zh-CN' || i18n.language === 'zh-CN'
    ? 'zh-CN'
    : 'en-US'

export const localizedValue = (value: LocalizedText, locale: Locale): string =>
  locale === 'zh-CN' ? value.zhCN || value.original : value.enUS || value.original

export interface DisplayedLocalizedValue {
  primary: string
  secondary: string | null
  usedFallback: boolean
}

export const displayLocalizedValue = (
  value: LocalizedText,
  locale: Locale,
  display: ContentDisplay,
): DisplayedLocalizedValue => {
  const translated = localizedValue(value, locale)
  const usedFallback = translated === value.original && value.originalLocale !== locale

  if (display === 'original') {
    return { primary: value.original, secondary: null, usedFallback: false }
  }

  if (
    display === 'bilingual' &&
    value.originalLocale !== locale &&
    translated !== value.original
  ) {
    return {
      primary: translated,
      secondary: value.original,
      usedFallback: false,
    }
  }

  return { primary: translated, secondary: null, usedFallback }
}

export const formatClock = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.max(0, seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const formatShortDate = (iso: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))

void i18n.use(initReactI18next).init({
  resources,
  lng: getSystemLocale(),
  fallbackLng: 'en-US',
  supportedLngs: ['zh-CN', 'en-US'],
  keySeparator: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

export default i18n
