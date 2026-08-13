import {
  Apple,
  ArrowRight,
  BadgeCheck,
  ChefHat,
  Film,
  Globe2,
  ScanSearch,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppLogo } from '../components/layout/AppShell'
import { Badge, Button, Card } from '../components/ui/primitives'
import { useMiseStore } from '../store/use-mise-store'

export const WelcomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const enterFixture = useMiseStore((state) => state.enterFixture)
  const [authMessage, setAuthMessage] = useState(false)

  const handleEnter = () => {
    enterFixture()
    navigate('/recipes')
  }

  return (
    <main className="min-h-svh bg-background px-4 py-4 text-foreground sm:px-6 sm:py-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-[1440px] overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:min-h-[calc(100svh-3rem)] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex flex-col p-6 sm:p-10 lg:p-14">
          <AppLogo />
          <div className="my-auto py-12">
            <Badge variant="primary">
              <ScanSearch className="size-3.5" aria-hidden="true" />
              {t('welcome.eyebrow')}
            </Badge>
            <h1 className="mt-5 max-w-xl font-display text-4xl font-semibold leading-[1.08] tracking-[-0.025em] sm:text-5xl">
              {t('welcome.title')}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('welcome.description')}
            </p>

            <Card className="mt-8 max-w-md p-2">
              <Button
                type="button"
                size="lg"
                className="w-full justify-between"
                onClick={handleEnter}
              >
                <span className="inline-flex items-center gap-2">
                  <ChefHat className="size-5" aria-hidden="true" />
                  {t('welcome.trySample')}
                </span>
                <ArrowRight className="size-5" aria-hidden="true" />
              </Button>
              <div className="grid gap-2 p-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAuthMessage(true)}
                >
                  <Apple className="size-4" aria-hidden="true" />
                  {t('welcome.continueApple')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAuthMessage(true)}
                >
                  <Globe2 className="size-4" aria-hidden="true" />
                  {t('welcome.continueGoogle')}
                </Button>
              </div>
            </Card>
            <div className="mt-3 min-h-10 max-w-md" aria-live="polite">
              {authMessage ? (
                <div className="rounded-md border border-info/25 bg-info/10 px-3 py-2 text-sm text-foreground">
                  {t('welcome.signInUnavailable')}
                </div>
              ) : (
                <p className="px-2 text-xs text-muted-foreground">
                  {t('welcome.noAccount')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <BadgeCheck className="size-4 text-success" aria-hidden="true" />
            {t('fixture.offline')}
          </div>
        </section>

        <section className="relative hidden overflow-hidden border-l border-border bg-surface-sunken p-8 lg:flex lg:flex-col lg:justify-center xl:p-14">
          <div className="absolute left-10 top-10 size-24 rounded-full border border-primary/15" />
          <div className="absolute bottom-14 right-12 size-40 rounded-full border border-accent/40" />
          <div className="relative mx-auto w-full max-w-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  {t('fixture.label')}
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold">
                  {t('welcome.storyboard')}
                </h2>
              </div>
              <Badge variant="success">{t('fixture.offline')}</Badge>
            </div>

            <Card className="overflow-hidden">
              <div className="relative aspect-[16/8] overflow-hidden">
                <img
                  src="/media/scallion-noodles.svg"
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-surface-media/90 to-transparent p-5 pt-16 text-primary-foreground">
                  <div>
                    <p className="font-display text-2xl font-semibold">
                      {t('welcome.storyboard')}
                    </p>
                  </div>
                  <Film className="size-6" aria-hidden="true" />
                </div>
              </div>
              <div className="grid gap-px bg-border sm:grid-cols-3">
                {[
                  {
                    key: 'welcome.storyboardStep1',
                    icon: ScanSearch,
                  },
                  {
                    key: 'welcome.storyboardStep2',
                    icon: Film,
                  },
                  {
                    key: 'welcome.storyboardStep3',
                    icon: ChefHat,
                  },
                ].map((item, index) => (
                  <div
                    key={item.key}
                    className="bg-card p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="grid size-8 place-items-center rounded-md bg-secondary text-secondary-foreground">
                        <item.icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-bold tabular-nums text-muted-foreground">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-snug">
                      {t(item.key)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}
