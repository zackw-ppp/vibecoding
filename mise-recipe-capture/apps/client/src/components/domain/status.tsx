import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CloudOff,
  FileWarning,
  LoaderCircle,
  RotateCcw,
  Save,
  Sparkles,
  TriangleAlert,
  WifiOff,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  ImportJob,
  ReviewIssue,
  ThemePreference,
} from '../../data/types'
import {
  activeLocale,
  displayLocalizedValue,
  formatClock,
  formatShortDate,
} from '../../i18n'
import { cn } from '../../lib/cn'
import { Badge, Button, Card, Progress } from '../ui/primitives'
import { SourceBadge } from './recipe'

export const SyncStatus = ({
  status,
  className,
}: {
  status: 'saved' | 'saving' | 'offline' | 'conflict' | 'error'
  className?: string
}) => {
  const { t } = useTranslation()
  const Icon =
    status === 'saved'
      ? Save
      : status === 'saving'
        ? LoaderCircle
        : status === 'offline'
          ? CloudOff
          : status === 'conflict'
            ? TriangleAlert
            : AlertCircle
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-muted-foreground',
        (status === 'conflict' || status === 'error') && 'text-destructive',
        className,
      )}
      role="status"
    >
      <Icon
        className={cn('size-3.5', status === 'saving' && 'animate-spin motion-reduce:animate-none')}
        aria-hidden="true"
      />
      {t(`sync.${status}`)}
    </span>
  )
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon: typeof Circle
  title: string
  description: string
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
}) => (
  <div
    className={cn(
      'flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/35 px-6 py-12 text-center',
      className,
    )}
  >
    <div className="mb-4 grid size-12 place-items-center rounded-lg bg-secondary text-secondary-foreground">
      <Icon className="size-6" aria-hidden="true" />
    </div>
    <h2 className="font-display text-2xl font-semibold">{title}</h2>
    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
      {description}
    </p>
    {(action || secondaryAction) && (
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {action}
        {secondaryAction}
      </div>
    )}
  </div>
)

export const ProcessingTimeline = ({
  stage,
  status,
}: {
  stage: number
  status: ImportJob['status']
}) => {
  const { t } = useTranslation()
  const stages = [0, 1, 2, 3, 4, 5, 6]
  return (
    <ol
      className="space-y-1"
      aria-label={t('processing.timelineLabel')}
    >
      {stages.map((item) => {
        const complete = item < stage || status === 'needs_review' || status === 'complete'
        const current = item === stage && status === 'processing'
        return (
          <li
            key={item}
            className={cn(
              'flex min-h-8 items-center gap-2 text-xs text-muted-foreground',
              (complete || current) && 'text-foreground',
            )}
          >
            {complete ? (
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
            ) : current ? (
              <LoaderCircle
                className="size-4 animate-spin text-primary motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Circle className="size-4" aria-hidden="true" />
            )}
            <span className={cn(current && 'font-semibold')}>
              {t(`processing.stage.${item}`)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export const ImportJobCard = ({
  job,
  onReview,
  onOpenRecipe,
  onCancel,
  onRetry,
}: {
  job: ImportJob
  onReview: () => void
  onOpenRecipe: () => void
  onCancel: () => void
  onRetry: () => void
}) => {
  const { t } = useTranslation()
  const title = displayLocalizedValue(job.title, activeLocale(), 'translated')
  const statusVariant =
    job.status === 'complete'
      ? 'success'
      : job.status === 'needs_review'
        ? 'warning'
        : job.status === 'failed'
          ? 'destructive'
          : job.status === 'cancelled'
            ? 'neutral'
            : 'info'
  return (
    <Card className="overflow-hidden p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-surface-sunken text-primary">
          {job.status === 'failed' ? (
            <FileWarning className="size-6" aria-hidden="true" />
          ) : job.status === 'complete' || job.status === 'needs_review' ? (
            <CheckCircle2 className="size-6" aria-hidden="true" />
          ) : (
            <Sparkles className="size-6" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <SourceBadge platform={job.platform} compact />
                <Badge variant={statusVariant}>{t(`status.${job.status}`)}</Badge>
              </div>
              <h3 className="font-display text-lg font-semibold leading-snug">
                {title.primary}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('import.createdAt', {
                  date: formatShortDate(job.createdAt, activeLocale()),
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.status === 'needs_review' && (
                <Button type="button" size="sm" onClick={onReview}>
                  {t('import.openReview')}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              )}
              {job.status === 'complete' && job.resultRecipeId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onOpenRecipe}
                >
                  {t('import.openRecipe')}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              )}
              {job.status === 'processing' && job.autoAdvance && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onCancel}
                >
                  {t('import.cancelJob')}
                </Button>
              )}
              {job.status === 'failed' && (
                <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  {t('import.retryJob')}
                </Button>
              )}
            </div>
          </div>
          {job.status === 'processing' && (
            <div className="mt-4" aria-live="polite">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold">{t(`processing.stage.${job.stage}`)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {t('import.jobProgress', { progress: job.progress })}
                </span>
              </div>
              <Progress
                value={job.progress}
                aria-label={t(`processing.stage.${job.stage}`)}
              />
              {!job.autoAdvance && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <WifiOff className="size-3.5" aria-hidden="true" />
                  {t('import.processingFrozen')}
                </p>
              )}
            </div>
          )}
          {job.status === 'failed' && (
            <div className="mt-4 rounded-md border border-destructive/25 bg-destructive/8 p-3">
              <div className="flex gap-2">
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold">{t('import.failedTitle')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {job.errorCode
                      ? t(`import.error.${job.errorCode}`)
                      : t('import.failedSafe')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export const ReviewIssueCard = ({
  issue,
  onResolve,
  onIgnore,
  onEvidence,
}: {
  issue: ReviewIssue
  onResolve: () => void
  onIgnore: () => void
  onEvidence: () => void
}) => {
  const { t } = useTranslation()
  const isClosed = issue.status !== 'open'
  const Icon =
    issue.severity === 'blocking'
      ? TriangleAlert
      : issue.severity === 'warning'
        ? AlertCircle
        : Circle
  return (
    <article
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-xs',
        issue.severity === 'blocking' && !isClosed && 'border-destructive/35',
        isClosed && 'bg-muted/45 opacity-75',
      )}
      data-status={issue.status}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground',
            issue.severity === 'warning' && 'bg-warning/15 text-warning-foreground',
            issue.severity === 'blocking' && 'bg-destructive/10 text-destructive',
          )}
        >
          {isClosed ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Icon className="size-4" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-semibold leading-snug">{t(issue.titleKey)}</h3>
            {isClosed && (
              <Badge variant="neutral">
                {t(`review.issue.${issue.status}`)}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(issue.descriptionKey)}
          </p>
          <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs font-medium">
            {t('review.issue.candidate', { value: issue.candidate })}
          </div>
          {!isClosed && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onResolve}>
                {t('review.issue.resolve')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onIgnore}>
                {t('review.issue.keepUnspecified')}
              </Button>
              {issue.evidenceTime !== null && (
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  onClick={onEvidence}
                >
                  {t('review.issue.evidenceAt', {
                    time: formatClock(issue.evidenceTime),
                  })}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export const ThemeSwitcher = ({
  value,
  onChange,
}: {
  value: ThemePreference
  onChange: (theme: ThemePreference) => void
}) => {
  const { t } = useTranslation()
  const themes: ThemePreference[] = [
    'warm-kitchen',
    'fresh-garden',
    'midnight-cook',
    'system',
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {themes.map((theme) => {
        const selected = theme === value
        return (
          <button
            key={theme}
            type="button"
            className={cn(
              'rounded-lg border border-border bg-card p-3 text-left outline-none transition-colors hover:border-primary/35 focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'border-primary ring-1 ring-primary',
            )}
            aria-pressed={selected}
            onClick={() => onChange(theme)}
          >
            <div
              className={cn(
                'theme-preview mb-3 flex h-16 items-end gap-1 overflow-hidden rounded-md border p-2',
                `theme-preview-${theme}`,
              )}
              aria-label={t('a11y.themePreview', {
                theme: t(`settings.theme.${theme}`),
              })}
            >
              <span className="theme-preview-card h-8 flex-1 rounded-sm" />
              <span className="theme-preview-accent h-5 w-8 rounded-sm" />
              <span className="theme-preview-primary h-10 w-5 rounded-sm" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                {t(`settings.theme.${theme}`)}
              </span>
              {selected && (
                <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t(`settings.theme.${theme}.description`)}
            </p>
          </button>
        )
      })}
    </div>
  )
}
