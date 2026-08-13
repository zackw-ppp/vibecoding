import { useEffect, type ReactNode } from 'react'
import i18n, { getSystemLocale } from '../i18n'
import { useMiseStore } from '../store/use-mise-store'

export const AppRuntime = ({ children }: { children: ReactNode }) => {
  const themePreference = useMiseStore((state) => state.themePreference)
  const localePreference = useMiseStore((state) => state.localePreference)
  const hasActiveImport = useMiseStore((state) =>
    state.jobs.some((job) => job.status === 'processing' && job.autoAdvance),
  )
  const advanceImportJobs = useMiseStore((state) => state.advanceImportJobs)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const resolved =
        themePreference === 'system'
          ? media.matches
            ? 'midnight-cook'
            : 'warm-kitchen'
          : themePreference
      document.documentElement.dataset.theme = resolved
    }
    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [themePreference])

  useEffect(() => {
    const locale =
      localePreference === 'system' ? getSystemLocale() : localePreference
    void i18n.changeLanguage(locale)
    document.documentElement.lang = locale
  }, [localePreference])

  useEffect(() => {
    if (!hasActiveImport) {
      return
    }
    const timer = window.setInterval(advanceImportJobs, 700)
    return () => window.clearInterval(timer)
  }, [advanceImportJobs, hasActiveImport])

  return children
}
