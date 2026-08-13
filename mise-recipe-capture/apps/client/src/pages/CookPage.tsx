import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  ChevronLeft,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { CookStep } from '../components/domain/CookStep'
import { EmptyState } from '../components/domain/status'
import { Badge, Button } from '../components/ui/primitives'
import { activeLocale, displayLocalizedValue } from '../i18n'
import { cn } from '../lib/cn'
import { useMiseStore } from '../store/use-mise-store'

const emptyCompletedSteps: string[] = []

export const CookPage = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const recipe = useMiseStore((state) =>
    state.recipes.find((item) => item.id === id),
  )
  const display = useMiseStore((state) => state.contentDisplay)
  const completedStepsByRecipe = useMiseStore((state) => state.completedSteps)
  const completedSteps =
    completedStepsByRecipe[id ?? ''] ?? emptyCompletedSteps
  const toggleCompletedStep = useMiseStore(
    (state) => state.toggleCompletedStep,
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [checkedByStep, setCheckedByStep] = useState<Record<string, string[]>>({})
  const [runningStepId, setRunningStepId] = useState<string | null>(null)
  const initialTimers = useMemo(
    () =>
      Object.fromEntries(
        (recipe?.steps ?? []).map((step) => [
          step.id,
          step.durationSeconds ?? 0,
        ]),
      ),
    [recipe],
  )
  const [timers, setTimers] = useState<Record<string, number>>(initialTimers)

  useEffect(() => {
    setTimers(initialTimers)
  }, [initialTimers])

  useEffect(() => {
    if (!runningStepId) {
      return
    }
    const timer = window.setInterval(() => {
      setTimers((current) => {
        const remaining = current[runningStepId] ?? 0
        if (remaining <= 1) {
          setRunningStepId(null)
          return { ...current, [runningStepId]: 0 }
        }
        return { ...current, [runningStepId]: remaining - 1 }
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [runningStepId])

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null
    if ('wakeLock' in navigator && navigator.wakeLock) {
      void navigator.wakeLock
        .request('screen')
        .then((lock) => {
          sentinel = lock
        })
        .catch(() => undefined)
    }
    return () => {
      if (sentinel) {
        void sentinel.release()
      }
    }
  }, [])

  const goPrevious = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1))
  }, [])

  const goNext = useCallback(() => {
    if (!recipe) {
      return
    }
    setCurrentIndex((index) => Math.min(recipe.steps.length - 1, index + 1))
  }, [recipe])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goPrevious()
      }
      if (event.key === 'ArrowRight') {
        goNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrevious])

  if (!recipe || recipe.steps.length === 0) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-4 text-foreground">
        <EmptyState
          icon={ChefHat}
          title={t('recipe.notFoundTitle')}
          description={t('recipe.notFoundDescription')}
          action={
            <Button type="button" onClick={() => navigate('/recipes')}>
              {t('recipe.backToLibrary')}
            </Button>
          }
        />
      </main>
    )
  }

  const step = recipe.steps[currentIndex]
  if (!step) {
    return null
  }
  const isLast = currentIndex === recipe.steps.length - 1
  const title = displayLocalizedValue(recipe.title, activeLocale(), display)
  const checkedIngredients = checkedByStep[step.id] ?? []
  const timerSeconds = timers[step.id] ?? 0
  const completed = completedSteps.includes(step.id)

  const toggleIngredient = (ingredientId: string) => {
    setCheckedByStep((current) => {
      const checked = current[step.id] ?? []
      return {
        ...current,
        [step.id]: checked.includes(ingredientId)
          ? checked.filter((item) => item !== ingredientId)
          : [...checked, ingredientId],
      }
    })
  }

  return (
    <main className="min-h-svh bg-background pb-28 text-foreground">
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(`/recipes/${recipe.id}`)}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('cook.exit')}</span>
          </Button>
          <div className="min-w-0 text-center">
            <div className="truncate text-sm font-semibold">{title.primary}</div>
            <div className="mt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {t('cook.stepProgress', {
                current: currentIndex + 1,
                total: recipe.steps.length,
              })}
            </div>
          </div>
          <Badge variant="primary">
            <ChefHat className="size-3.5" aria-hidden="true" />
            {t('cook.title')}
          </Badge>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-base motion-reduce:transition-none"
            style={{
              width: `${((currentIndex + 1) / recipe.steps.length) * 100}%`,
            }}
          />
        </div>
      </header>

      <div className="px-4 py-6 sm:px-6 lg:py-8">
        <CookStep
          step={step}
          number={currentIndex + 1}
          total={recipe.steps.length}
          ingredients={recipe.ingredients}
          completed={completed}
          checkedIngredientIds={checkedIngredients}
          timerSeconds={timerSeconds}
          timerRunning={runningStepId === step.id}
          onToggleComplete={() => toggleCompletedStep(recipe.id, step.id)}
          onToggleIngredient={toggleIngredient}
          onStartTimer={() => setRunningStepId(step.id)}
          onPauseTimer={() => setRunningStepId(null)}
          onResetTimer={() => {
            setRunningStepId(null)
            setTimers((current) => ({
              ...current,
              [step.id]: step.durationSeconds ?? 0,
            }))
          }}
          onAddMinute={() =>
            setTimers((current) => ({
              ...current,
              [step.id]: (current[step.id] ?? 0) + 60,
            }))
          }
        />
      </div>

      <footer className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 shadow-sheet backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={goPrevious}
            disabled={currentIndex === 0}
            className="justify-self-start"
            aria-label={t('cook.previousStep')}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('cook.previousStep')}</span>
          </Button>
          <div className="flex gap-1.5" aria-hidden="true">
            {recipe.steps.map((item, index) => (
              <span
                key={item.id}
                className={cn(
                  'h-1.5 w-5 rounded-full bg-muted',
                  index === currentIndex && 'bg-primary',
                  completedSteps.includes(item.id) && 'bg-success',
                )}
              />
            ))}
          </div>
          {isLast ? (
            <Button
              type="button"
              size="lg"
              className="justify-self-end"
              onClick={() => {
                if (!completed) {
                  toggleCompletedStep(recipe.id, step.id)
                }
                navigate(`/recipes/${recipe.id}`)
              }}
            >
              <Check className="size-5" aria-hidden="true" />
              {t('cook.finish')}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="justify-self-end"
              onClick={goNext}
              aria-label={t('cook.nextStep')}
            >
              <span className="hidden sm:inline">{t('cook.nextStep')}</span>
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </footer>
    </main>
  )
}
