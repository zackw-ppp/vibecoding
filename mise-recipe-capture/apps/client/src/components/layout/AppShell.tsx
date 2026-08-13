import {
  BookOpen,
  FolderHeart,
  Import,
  Settings,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/primitives'
import { SyncStatus } from '../domain/status'

const navItems = [
  { to: '/recipes', key: 'nav.recipes', icon: BookOpen },
  { to: '/import', key: 'nav.import', icon: Import },
  { to: '/collections', key: 'nav.collections', icon: FolderHeart },
  { to: '/settings', key: 'nav.settings', icon: Settings },
] as const

const mobileNavItems = navItems.filter(
  (item) => item.to !== '/collections',
)

export const AppLogo = ({ compact = false }: { compact?: boolean }) => {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-xs">
        <span className="absolute bottom-1.5 h-2 w-6 rounded-full bg-primary-foreground/30" />
        <span className="h-5 w-5 rounded-t-full rounded-br-full border-2 border-primary-foreground" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="font-display text-xl font-semibold leading-none">
            {t('brand.name')}
          </div>
          <div className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
            {t('brand.tagline')}
          </div>
        </div>
      )}
    </div>
  )
}

const NavigationLink = ({
  to,
  labelKey,
  icon: Icon,
  mobile = false,
}: {
  to: string
  labelKey: string
  icon: typeof BookOpen
  mobile?: boolean
}) => {
  const { t } = useTranslation()
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'group flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
          mobile &&
            'min-h-14 flex-1 flex-col justify-center gap-0.5 rounded-lg px-1 text-[11px]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-5 text-muted-foreground transition-colors group-hover:text-sidebar-foreground',
              isActive && 'text-sidebar-primary',
            )}
            aria-hidden="true"
          />
          <span>{t(labelKey)}</span>
        </>
      )}
    </NavLink>
  )
}

export const AppShell = () => {
  const { t } = useTranslation()
  return (
    <div className="min-h-svh bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:translate-y-0"
      >
        {t('a11y.skipToContent')}
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <div className="px-2 py-2">
          <AppLogo />
        </div>
        <div className="mt-5 rounded-lg border border-primary/15 bg-primary/8 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            {t('fixture.label')}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {t('fixture.description')}
          </p>
        </div>
        <nav className="mt-6 space-y-1" aria-label={t('nav.primary')}>
          {navItems.map((item) => (
            <NavigationLink
              key={item.to}
              to={item.to}
              labelKey={item.key}
              icon={item.icon}
            />
          ))}
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-4">
          <SyncStatus status="offline" />
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="safe-top sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md lg:hidden">
          <AppLogo compact />
          <Badge variant="primary">{t('fixture.label')}</Badge>
        </header>
        <main
          id="main-content"
          className="min-h-svh px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8"
        >
          <Outlet />
        </main>
      </div>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-start gap-1 border-t border-sidebar-border bg-sidebar/95 px-2 pt-1.5 text-sidebar-foreground backdrop-blur-md lg:hidden"
        aria-label={t('a11y.mobileNavigation')}
      >
        {mobileNavItems.map((item) => (
          <NavigationLink
            key={item.to}
            to={item.to}
            labelKey={item.key}
            icon={item.icon}
            mobile
          />
        ))}
      </nav>
    </div>
  )
}
