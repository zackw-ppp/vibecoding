import {
  CheckCircle2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Ingredient, RecipeStep } from '../../data/types'
import { formatClock } from '../../i18n'
import { Button, Card } from '../ui/primitives'
import { IngredientRow, StepCard } from './recipe'

export const CookStep = ({
  step,
  number,
  total,
  ingredients,
  completed,
  checkedIngredientIds,
  timerSeconds,
  timerRunning,
  onToggleComplete,
  onToggleIngredient,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onAddMinute,
}: {
  step: RecipeStep
  number: number
  total: number
  ingredients: Ingredient[]
  completed: boolean
  checkedIngredientIds: string[]
  timerSeconds: number
  timerRunning: boolean
  onToggleComplete: () => void
  onToggleIngredient: (ingredientId: string) => void
  onStartTimer: () => void
  onPauseTimer: () => void
  onResetTimer: () => void
  onAddMinute: () => void
}) => {
  const { t } = useTranslation()
  const currentIngredients = ingredients.filter((ingredient) =>
    step.ingredientIds.includes(ingredient.id),
  )
  return (
    <div
      className="mx-auto grid w-full max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)]"
      aria-label={t('cook.stepProgress', { current: number, total })}
    >
      <StepCard
        step={step}
        number={number}
        ingredients={ingredients}
        variant="cook"
        active
        completed={completed}
      />

      <aside className="space-y-4 lg:sticky lg:top-24">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                {t('cook.timer')}
              </p>
              <div
                className="mt-1 font-display text-4xl font-semibold tabular-nums"
                role="timer"
                aria-live={timerSeconds === 0 ? 'assertive' : 'off'}
              >
                {formatClock(timerSeconds)}
              </div>
            </div>
            <div className="grid size-12 place-items-center rounded-lg bg-secondary text-secondary-foreground">
              <Timer className="size-6" aria-hidden="true" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
            {timerSeconds === 0
              ? t('cook.timerFinished')
              : t('cook.timerRemaining', { time: formatClock(timerSeconds) })}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {timerRunning ? (
              <Button type="button" onClick={onPauseTimer}>
                <Pause className="size-4" aria-hidden="true" />
                {t('cook.pauseTimer')}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onStartTimer}
                disabled={timerSeconds === 0}
              >
                <Play className="size-4" aria-hidden="true" />
                {t('cook.startTimer')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onAddMinute}>
              <Plus className="size-4" aria-hidden="true" />
              {t('cook.addMinute')}
            </Button>
            <Button type="button" variant="ghost" onClick={onResetTimer}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {t('cook.resetTimer')}
            </Button>
            <Button
              type="button"
              variant={completed ? 'soft' : 'outline'}
              onClick={onToggleComplete}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {completed ? t('cook.completedStep') : t('cook.completeStep')}
            </Button>
          </div>
        </Card>

        {currentIngredients.length > 0 && (
          <Card className="p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">
              {t('recipe.currentIngredients')}
            </h2>
            <div className="mt-2">
              {currentIngredients.map((ingredient) => (
                <IngredientRow
                  key={ingredient.id}
                  ingredient={ingredient}
                  mode="cook"
                  checked={checkedIngredientIds.includes(ingredient.id)}
                  onCheckedChange={() => onToggleIngredient(ingredient.id)}
                />
              ))}
            </div>
          </Card>
        )}
        <p className="px-2 text-center text-xs text-muted-foreground">
          {t('cook.keyboardHint')}
        </p>
      </aside>
    </div>
  )
}
