import { cva } from 'class-variance-authority'
import {
  BadgeCheck,
  Check,
  CircleHelp,
  Clock3,
  FileText,
  Heart,
  Image as ImageIcon,
  Play,
  ScanSearch,
  Thermometer,
  TriangleAlert,
  UserCheck,
  Video,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  ContentDisplay,
  EvidenceState,
  Ingredient,
  Platform,
  Recipe,
  RecipeStep,
} from '../../data/types'
import {
  activeLocale,
  displayLocalizedValue,
  formatClock,
  formatShortDate,
} from '../../i18n'
import { cn } from '../../lib/cn'
import { useMiseStore } from '../../store/use-mise-store'
import { Badge, Button, Card, Checkbox } from '../ui/primitives'

const platformStyles: Record<Platform, string> = {
  xiaohongshu: 'border-destructive/20 bg-destructive/8 text-foreground',
  douyin: 'border-foreground/15 bg-foreground/8 text-foreground',
  bilibili: 'border-info/20 bg-info/8 text-foreground',
  tiktok: 'border-foreground/15 bg-foreground/8 text-foreground',
  youtube: 'border-destructive/20 bg-destructive/8 text-foreground',
  upload: 'border-success/20 bg-success/8 text-foreground',
  manual: 'border-border bg-muted text-foreground',
}

export const SourceBadge = ({
  platform,
  contentType = 'video',
  compact = false,
}: {
  platform: Platform
  contentType?: 'video' | 'images' | 'text'
  compact?: boolean
}) => {
  const { t } = useTranslation()
  const Icon =
    contentType === 'video'
      ? Video
      : contentType === 'images'
        ? ImageIcon
        : FileText
  return (
    <Badge className={platformStyles[platform]} variant="outline">
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{t(`source.${platform}`)}</span>
      {!compact && (
        <span className="font-normal text-muted-foreground">
          · {t(`source.${contentType}`)}
        </span>
      )}
    </Badge>
  )
}

const evidenceConfig: Record<
  EvidenceState,
  {
    icon: typeof Check
    className: string
  }
> = {
  explicit: {
    icon: Check,
    className: 'border-success/25 bg-success/10 text-success',
  },
  corroborated: {
    icon: BadgeCheck,
    className: 'border-info/25 bg-info/10 text-info',
  },
  inferred: {
    icon: ScanSearch,
    className: 'border-warning/35 bg-warning/15 text-warning-foreground',
  },
  missing: {
    icon: CircleHelp,
    className: 'border-border bg-muted text-muted-foreground',
  },
  conflict: {
    icon: TriangleAlert,
    className: 'border-destructive/25 bg-destructive/10 text-destructive',
  },
  user_confirmed: {
    icon: UserCheck,
    className: 'border-primary/25 bg-primary/10 text-primary',
  },
}

export const EvidenceBadge = ({
  state,
  compact = false,
  showLabel = true,
}: {
  state: EvidenceState
  compact?: boolean
  showLabel?: boolean
}) => {
  const { t } = useTranslation()
  const config = evidenceConfig[state]
  const Icon = config.icon
  const label = t(`evidence.${state}`)
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        config.className,
        compact && 'px-1.5',
      )}
      aria-label={label}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </span>
  )
}

export const LocalizedContent = ({
  value,
  display,
  className,
  secondaryClassName,
}: {
  value: Recipe['title']
  display: ContentDisplay
  className?: string
  secondaryClassName?: string
}) => {
  const { t } = useTranslation()
  const content = displayLocalizedValue(value, activeLocale(), display)
  return (
    <span className={className}>
      <span>{content.primary}</span>
      {content.secondary && (
        <span
          className={cn(
            'mt-1 block text-[0.88em] font-normal leading-relaxed text-muted-foreground',
            secondaryClassName,
          )}
        >
          {content.secondary}
        </span>
      )}
      {content.usedFallback && (
        <span className="sr-only">{t('content.translationFallback')}</span>
      )}
    </span>
  )
}

export const BilingualToggle = ({
  value,
  onChange,
  className,
}: {
  value: ContentDisplay
  onChange: (value: ContentDisplay) => void
  className?: string
}) => {
  const { t } = useTranslation()
  const options: ContentDisplay[] = ['translated', 'original', 'bilingual']
  return (
    <div
      className={cn(
        'inline-flex min-h-11 items-center gap-1 rounded-lg border border-border bg-muted p-1',
        className,
      )}
      role="group"
      aria-label={t('content.displayLabel')}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          className="min-h-9 rounded-md px-3 text-xs font-semibold text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
          onClick={() => onChange(option)}
        >
          {t(`content.${option}`)}
        </button>
      ))}
    </div>
  )
}

export const IngredientRow = ({
  ingredient,
  mode = 'view',
  checked = false,
  onCheckedChange,
}: {
  ingredient: Ingredient
  mode?: 'view' | 'edit' | 'cook'
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) => {
  const { t } = useTranslation()
  const contentDisplay = useMiseStore((state) => state.contentDisplay)
  const units = useMiseStore((state) => state.units)
  const name = displayLocalizedValue(
    ingredient.name,
    activeLocale(),
    contentDisplay,
  )
  const preparation = ingredient.preparation
    ? displayLocalizedValue(
        ingredient.preparation,
        activeLocale(),
        contentDisplay,
      )
    : null
  return (
    <div
      className={cn(
        'grid min-h-14 grid-cols-[1fr_auto] items-center gap-x-4 border-b border-border/70 py-3 last:border-b-0',
        mode === 'cook' && 'grid-cols-[auto_1fr_auto] gap-x-3',
      )}
    >
      {mode === 'cook' && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange?.(value === true)}
          aria-label={
            checked ? t('ingredient.checked') : t('ingredient.unchecked')
          }
        />
      )}
      <div className="min-w-0">
        <div className={cn('font-medium', checked && 'text-muted-foreground line-through')}>
          {name.primary}
        </div>
        {name.secondary && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {name.secondary}
          </div>
        )}
        {preparation && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {preparation.primary}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="max-w-32 text-right text-sm font-semibold tabular-nums">
          {ingredient.quantity[units]}
        </span>
        {ingredient.optional && (
          <Badge variant="neutral">{t('common.optional')}</Badge>
        )}
        {mode !== 'cook' &&
          ingredient.evidenceState !== 'explicit' &&
          ingredient.evidenceState !== 'corroborated' && (
            <EvidenceBadge
              state={ingredient.evidenceState}
              compact
              showLabel={false}
            />
          )}
      </div>
    </div>
  )
}

const stepCardVariants = cva(
  'overflow-hidden rounded-lg border border-border bg-card text-card-foreground',
  {
    variants: {
      variant: {
        detail: 'shadow-xs',
        review: 'border-border bg-surface-raised',
        cook: 'border-0 bg-transparent shadow-none',
        compact: 'shadow-none',
      },
      active: {
        true: 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        false: '',
      },
      completed: {
        true: 'border-success/35',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'detail',
      active: false,
      completed: false,
    },
  },
)

export const StepCard = ({
  step,
  number,
  ingredients,
  variant = 'detail',
  active = false,
  completed = false,
  onSeekSource,
}: {
  step: RecipeStep
  number: number
  ingredients: Ingredient[]
  variant?: 'detail' | 'review' | 'cook' | 'compact'
  active?: boolean
  completed?: boolean
  onSeekSource?: (seconds: number) => void
}) => {
  const { t } = useTranslation()
  const contentDisplay = useMiseStore((state) => state.contentDisplay)
  const instruction = displayLocalizedValue(
    step.instruction,
    activeLocale(),
    contentDisplay,
  )
  const stepIngredients = ingredients.filter((ingredient) =>
    step.ingredientIds.includes(ingredient.id),
  )
  return (
    <article
      className={stepCardVariants({ variant, active, completed })}
      data-state={completed ? 'completed' : active ? 'active' : 'default'}
    >
      {step.media ? (
        <div className="relative aspect-video overflow-hidden bg-surface-media">
          <img
            src={step.media}
            alt={t('recipe.stepMediaAlt', { count: number })}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <Badge className="border-card/20 bg-surface-media/80 text-primary-foreground">
              <Play className="size-3" fill="currentColor" aria-hidden="true" />
              {formatClock(step.sourceStartSeconds)}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="grid aspect-video place-items-center bg-muted text-muted-foreground">
          <div className="flex flex-col items-center gap-2 text-sm">
            <ImageIcon className="size-7" aria-hidden="true" />
            <span>{t('recipe.noVisual')}</span>
          </div>
        </div>
      )}
      <div className={cn('p-4 sm:p-5', variant === 'cook' && 'px-0')}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground',
              completed && 'bg-success text-success-foreground',
            )}
          >
            {completed ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              number
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                'text-base font-semibold leading-relaxed',
                variant === 'cook' && 'text-xl sm:text-2xl',
              )}
            >
              {instruction.primary}
            </h3>
            {instruction.secondary && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {instruction.secondary}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 pl-12 text-xs">
          {step.durationSeconds && (
            <Badge variant="neutral">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {formatClock(step.durationSeconds)}
            </Badge>
          )}
          {step.temperature && (
            <Badge variant="neutral">
              <Thermometer className="size-3.5" aria-hidden="true" />
              {step.temperature}
            </Badge>
          )}
          <EvidenceBadge state={step.evidenceState} compact />
          {onSeekSource ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => onSeekSource(step.sourceStartSeconds)}
            >
              {t('recipe.timeReference', {
                start: formatClock(step.sourceStartSeconds),
                end: formatClock(step.sourceEndSeconds),
              })}
            </Button>
          ) : (
            <span className="font-medium text-muted-foreground">
              {t('recipe.timeReference', {
                start: formatClock(step.sourceStartSeconds),
                end: formatClock(step.sourceEndSeconds),
              })}
            </span>
          )}
        </div>
        {stepIngredients.length > 0 && variant !== 'compact' && (
          <div className="mt-4 rounded-md bg-muted/70 px-3 py-2.5">
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
              {t('recipe.currentIngredients')}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {stepIngredients.map((ingredient) => (
                <span key={ingredient.id}>
                  {displayLocalizedValue(
                    ingredient.name,
                    activeLocale(),
                    contentDisplay,
                  ).primary}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

const recipeCardVariants = cva(
  'group relative overflow-hidden border bg-card text-card-foreground transition-[box-shadow,transform,border-color] duration-fast hover:border-primary/25 hover:shadow-sm motion-reduce:transition-none',
  {
    variants: {
      variant: {
        visual: 'rounded-lg',
        compact: 'grid grid-cols-[7.5rem_1fr] rounded-lg sm:grid-cols-[11rem_1fr]',
      },
      status: {
        ready: '',
        needs_review: '',
        processing: 'opacity-90',
        failed: 'border-destructive/35',
      },
    },
    defaultVariants: {
      variant: 'visual',
      status: 'ready',
    },
  },
)

export const RecipeCard = ({
  recipe,
  variant = 'visual',
  onOpen,
  onToggleFavorite,
}: {
  recipe: Recipe
  variant?: 'visual' | 'compact'
  onOpen: () => void
  onToggleFavorite: () => void
}) => {
  const { t } = useTranslation()
  const display = useMiseStore((state) => state.contentDisplay)
  const title = displayLocalizedValue(recipe.title, activeLocale(), display)
  const firstTag = recipe.tags[0]
  return (
    <Card
      className={recipeCardVariants({ variant, status: recipe.status })}
      data-status={recipe.status}
    >
      <button
        type="button"
        className={cn(
          'block w-full overflow-hidden bg-surface-sunken text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          variant === 'visual' ? 'aspect-[4/3]' : 'h-full min-h-36',
        )}
        onClick={onOpen}
        aria-label={t('recipe.viewRecipe')}
      >
        <img
          src={recipe.cover}
          alt={t('recipe.coverAlt', { title: title.primary })}
          className="h-full w-full object-cover transition-transform duration-base group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          loading="lazy"
        />
      </button>
      <div className={cn('p-4', variant === 'compact' && 'min-w-0 sm:p-5')}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <SourceBadge
            platform={recipe.platform}
            contentType={recipe.contentType}
            compact
          />
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={
              recipe.favorite ? t('recipe.unfavorite') : t('recipe.favorite')
            }
            aria-pressed={recipe.favorite}
            onClick={onToggleFavorite}
          >
            <Heart
              className={cn(
                'size-5',
                recipe.favorite && 'fill-primary text-primary',
              )}
              aria-hidden="true"
            />
          </button>
        </div>
        <button
          type="button"
          className="block w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onOpen}
        >
          <h2 className="line-clamp-2 font-display text-xl font-semibold leading-snug">
            {title.primary}
          </h2>
          {title.secondary && (
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
              {title.secondary}
            </p>
          )}
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {t('recipe.totalTime', {
              count: recipe.prepMinutes + recipe.cookMinutes,
            })}
          </span>
          {firstTag && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {displayLocalizedValue(firstTag, activeLocale(), display).primary}
              </span>
            </>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <Badge
            variant={
              recipe.status === 'ready'
                ? 'success'
                : recipe.status === 'needs_review'
                  ? 'warning'
                  : recipe.status === 'failed'
                    ? 'destructive'
                    : 'info'
            }
          >
            {t(`status.${recipe.status}`)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {t('recipe.updated', {
              date: formatShortDate(recipe.updatedAt, activeLocale()),
            })}
          </span>
        </div>
      </div>
    </Card>
  )
}
