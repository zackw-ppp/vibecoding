import {
  Database,
  Globe2,
  HardDrive,
  Languages,
  Paintbrush,
  RefreshCcw,
  Ruler,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeSwitcher } from '../components/domain/status'
import {
  Badge,
  Button,
  Card,
  Label,
  Select,
} from '../components/ui/primitives'
import type {
  LocalePreference,
  ThemePreference,
  UnitSystem,
} from '../data/types'
import { cn } from '../lib/cn'
import { useMiseStore } from '../store/use-mise-store'

const unitOptions: UnitSystem[] = ['source', 'metric', 'imperial']

export const SettingsPage = () => {
  const { t } = useTranslation()
  const localePreference = useMiseStore((state) => state.localePreference)
  const setLocalePreference = useMiseStore(
    (state) => state.setLocalePreference,
  )
  const themePreference = useMiseStore((state) => state.themePreference)
  const setThemePreference = useMiseStore(
    (state) => state.setThemePreference,
  )
  const units = useMiseStore((state) => state.units)
  const setUnits = useMiseStore((state) => state.setUnits)
  const clearMediaCache = useMiseStore((state) => state.clearMediaCache)
  const resetFixture = useMiseStore((state) => state.resetFixture)
  const cacheClearedAt = useMiseStore((state) => state.cacheClearedAt)
  const [cacheMessage, setCacheMessage] = useState(false)

  const chooseTheme = (theme: ThemePreference) => {
    setThemePreference(theme)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          {t('settings.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          {t('settings.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('settings.description')}
        </p>
      </header>

      <div className="mt-7 divide-y divide-border rounded-xl border border-border bg-card shadow-xs">
        <SettingsSection
          icon={Languages}
          title={t('settings.languageTitle')}
          description={t('settings.languageDescription')}
        >
          <div className="max-w-sm">
            <Label htmlFor="locale-select">{t('settings.languageTitle')}</Label>
            <Select
              id="locale-select"
              className="mt-2 w-full"
              value={localePreference}
              onChange={(event) =>
                setLocalePreference(event.target.value as LocalePreference)
              }
            >
              <option value="system">{t('settings.locale.system')}</option>
              <option value="zh-CN">{t('settings.locale.zh-CN')}</option>
              <option value="en-US">{t('settings.locale.en-US')}</option>
            </Select>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Paintbrush}
          title={t('settings.themeTitle')}
          description={t('settings.themeDescription')}
        >
          <ThemeSwitcher value={themePreference} onChange={chooseTheme} />
        </SettingsSection>

        <SettingsSection
          icon={Ruler}
          title={t('settings.unitTitle')}
          description={t('settings.unitDescription')}
        >
          <div
            className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1"
            role="group"
            aria-label={t('settings.unitTitle')}
          >
            {unitOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  'min-h-10 rounded-md px-4 text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  units === option && 'bg-card text-foreground shadow-xs',
                )}
                aria-pressed={units === option}
                onClick={() => setUnits(option)}
              >
                {t(`settings.units.${option}`)}
              </button>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          icon={HardDrive}
          title={t('settings.storageTitle')}
          description={t('settings.storageDescription')}
        >
          <div className="overflow-hidden rounded-lg border border-border">
            <SettingRow
              icon={Database}
              label={t('settings.localData')}
              value={t('settings.localDataValue')}
            />
            <SettingRow
              icon={Globe2}
              label={t('settings.mediaCache')}
              value={
                cacheClearedAt
                  ? t('settings.cacheCleared')
                  : t('settings.mediaCacheValue')
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearMediaCache()
                setCacheMessage(true)
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t('settings.clearCache')}
            </Button>
            <span className="text-sm text-success" role="status">
              {cacheMessage ? t('settings.cacheCleared') : null}
            </span>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={UserRound}
          title={t('settings.accountTitle')}
          description={t('settings.accountDescription')}
        >
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
                  <UserRound className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-semibold">{t('settings.guestAccount')}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t('settings.linkedAccounts')}: {t('settings.noneLinked')}
                  </div>
                </div>
              </div>
              <Badge variant="primary">{t('fixture.label')}</Badge>
            </div>
          </Card>
          <div className="mt-4 rounded-lg border border-border bg-muted/35 p-4">
            <h3 className="font-semibold">{t('fixture.reset')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t('fixture.resetDescription')}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={resetFixture}
            >
              <RefreshCcw className="size-4" aria-hidden="true" />
              {t('fixture.reset')}
            </Button>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}

const SettingsSection = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Languages
  title: string
  description: string
  children: React.ReactNode
}) => (
  <section className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[15rem_1fr] lg:gap-10">
    <div className="flex items-start gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
    <div>{children}</div>
  </section>
)

const SettingRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database
  label: string
  value: string
}) => (
  <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-4 last:border-b-0">
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      {label}
    </span>
    <span className="text-sm font-semibold tabular-nums">{value}</span>
  </div>
)
