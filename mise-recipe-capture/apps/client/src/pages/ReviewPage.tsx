import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Film,
  ListChecks,
  Play,
  Save,
  ScanSearch,
  ScrollText,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  EvidenceBadge,
  LocalizedContent,
} from '../components/domain/recipe'
import {
  EmptyState,
  ReviewIssueCard,
  SyncStatus,
} from '../components/domain/status'
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '../components/ui/primitives'
import type { Recipe, ReviewIssue } from '../data/types'
import {
  activeLocale,
  displayLocalizedValue,
  formatClock,
  localizedValue,
} from '../i18n'
import { cn } from '../lib/cn'
import { useMiseStore } from '../store/use-mise-store'

export const ReviewPage = () => {
  const { t } = useTranslation()
  const { jobId } = useParams()
  const navigate = useNavigate()
  const job = useMiseStore((state) =>
    state.jobs.find((item) => item.id === jobId),
  )
  const recipe = useMiseStore((state) =>
    state.recipes.find((item) => item.id === job?.resultRecipeId),
  )
  const reviewIssues = useMiseStore((state) => state.reviewIssues)
  const updateRecipeTitle = useMiseStore((state) => state.updateRecipeTitle)
  const updateIngredientName = useMiseStore(
    (state) => state.updateIngredientName,
  )
  const updateStepInstruction = useMiseStore(
    (state) => state.updateStepInstruction,
  )
  const setIssueStatus = useMiseStore((state) => state.setIssueStatus)
  const saveReviewedRecipe = useMiseStore(
    (state) => state.saveReviewedRecipe,
  )
  const [syncState, setSyncState] = useState<'saved' | 'saving'>('saved')
  const [selectedTime, setSelectedTime] = useState(48)
  const [mobileTab, setMobileTab] = useState('recipe')
  const saveTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
      }
    },
    [],
  )

  if (!job || !recipe) {
    return (
      <div className="mx-auto max-w-3xl pt-12">
        <EmptyState
          icon={ListChecks}
          title={t('review.notFoundTitle')}
          description={t('review.notFoundDescription')}
          action={
            <Button type="button" onClick={() => navigate('/import')}>
              {t('nav.import')}
            </Button>
          }
        />
      </div>
    )
  }

  const issues = reviewIssues.filter((issue) => issue.recipeId === recipe.id)
  const openIssues = issues.filter((issue) => issue.status === 'open')

  const markSaving = () => {
    setSyncState('saving')
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
    }
    saveTimer.current = window.setTimeout(() => setSyncState('saved'), 650)
  }

  const goToEvidence = (issue: ReviewIssue) => {
    if (issue.evidenceTime !== null) {
      setSelectedTime(issue.evidenceTime)
      setMobileTab('source')
    }
  }

  const handleSave = () => {
    saveReviewedRecipe(recipe.id)
    navigate(`/recipes/${recipe.id}`)
  }

  const sourcePanel = (
    <SourceReviewPanel
      recipe={recipe}
      selectedTime={selectedTime}
      onSelectTime={setSelectedTime}
    />
  )

  const editorPanel = (
    <RecipeEditorPanel
      recipe={recipe}
      onTitleChange={(value) => {
        updateRecipeTitle(recipe.id, value, activeLocale())
        markSaving()
      }}
      onIngredientChange={(ingredientId, value) => {
        updateIngredientName(recipe.id, ingredientId, value, activeLocale())
        markSaving()
      }}
      onStepChange={(stepId, value) => {
        updateStepInstruction(recipe.id, stepId, value, activeLocale())
        markSaving()
      }}
    />
  )

  const issuesPanel = (
    <IssuesPanel
      issues={issues}
      onResolve={(issue) => setIssueStatus(issue.id, 'resolved')}
      onIgnore={(issue) => setIssueStatus(issue.id, 'ignored')}
      onEvidence={goToEvidence}
    />
  )

  return (
    <div className="review-page mx-auto max-w-[1680px]">
      <header className="sticky top-14 z-20 -mx-4 -mt-6 mb-5 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:-mt-8 lg:px-8">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => navigate('/import')}
              aria-label={t('common.back')}
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                  {t('review.eyebrow')}
                </span>
                <Badge variant="warning">
                  {t('review.issueCount', { count: openIssues.length })}
                </Badge>
              </div>
              <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">
                {t('review.title')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatus status={syncState} />
            <div className="review-sheet-trigger">
              <Sheet>
                <SheetTrigger asChild>
                  <Button type="button" variant="soft">
                    <ListChecks className="size-4" aria-hidden="true" />
                    {t('review.openIssues')}
                    <Badge variant="warning">{openIssues.length}</Badge>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetTitle>{t('review.issuesTitle')}</SheetTitle>
                  <SheetDescription>
                    {t('review.issueCount', { count: openIssues.length })}
                  </SheetDescription>
                  <div className="mt-6">{issuesPanel}</div>
                </SheetContent>
              </Sheet>
            </div>
            <Button type="button" onClick={handleSave}>
              <Save className="size-4" aria-hidden="true" />
              {t('review.saveRecipe')}
            </Button>
          </div>
        </div>
      </header>

      <div className="review-desktop">
        <section className="review-source-column">{sourcePanel}</section>
        <section className="review-recipe-column">{editorPanel}</section>
        <aside className="review-issues-column">{issuesPanel}</aside>
      </div>

      <div className="review-mobile">
        <Tabs value={mobileTab} onValueChange={setMobileTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="source">{t('review.sourceTab')}</TabsTrigger>
            <TabsTrigger value="recipe">{t('review.recipeTab')}</TabsTrigger>
            <TabsTrigger value="issues">
              {t('review.issuesTab')}
              {openIssues.length > 0 && (
                <span className="ml-1 rounded-full bg-warning/20 px-1.5 text-warning-foreground">
                  {openIssues.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="source">{sourcePanel}</TabsContent>
          <TabsContent value="recipe">{editorPanel}</TabsContent>
          <TabsContent value="issues">{issuesPanel}</TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

const SectionHeading = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Film
  title: string
  description: string
}) => (
  <div className="mb-4 flex items-start gap-3">
    <div className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
      <Icon className="size-4" aria-hidden="true" />
    </div>
    <div>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  </div>
)

const SourceReviewPanel = ({
  recipe,
  selectedTime,
  onSelectTime,
}: {
  recipe: Recipe
  selectedTime: number
  onSelectTime: (seconds: number) => void
}) => {
  const { t } = useTranslation()
  const display = useMiseStore((state) => state.contentDisplay)
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <SectionHeading
        icon={Film}
        title={t('review.sourceTitle')}
        description={t('review.sourceDescription')}
      />
      <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-media">
        <img
          src={recipe.cover}
          alt={t('recipe.coverAlt', {
            title: localizedValue(recipe.title, activeLocale()),
          })}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/25 bg-surface-media/80 text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('review.issue.jumpEvidence')}
        >
          <Play className="ml-0.5 size-5" fill="currentColor" aria-hidden="true" />
        </button>
        <Badge className="absolute bottom-3 left-3 border-card/20 bg-surface-media/80 text-primary-foreground">
          <Clock3 className="size-3" aria-hidden="true" />
          {formatClock(selectedTime)}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">{t('review.captionTrack')}</span>
          <span className="tabular-nums text-muted-foreground">
            {formatClock(selectedTime)}
          </span>
        </div>
        <div
          className="relative mt-3 h-14 overflow-hidden rounded-md border border-border bg-surface-sunken"
          role="group"
          aria-label={t('review.captionTrack')}
        >
          <div
            className="absolute inset-y-0 w-0.5 bg-primary"
            style={{ left: `${Math.min(96, (selectedTime / 90) * 100)}%` }}
          />
          {recipe.script.map((segment) => (
            <button
              key={segment.id}
              type="button"
              className="absolute top-3 h-8 rounded-sm border border-info/25 bg-info/15 outline-none hover:bg-info/20 focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                left: `${((segment.startSeconds ?? 0) / 90) * 100}%`,
                width: `${Math.max(
                  9,
                  (((segment.endSeconds ?? 0) - (segment.startSeconds ?? 0)) /
                    90) *
                    100,
                )}%`,
              }}
              onClick={() => onSelectTime(segment.startSeconds ?? 0)}
              aria-label={displayLocalizedValue(
                segment.text,
                activeLocale(),
                display,
              ).primary}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('review.timelineHelp')}
        </p>
      </div>

      <div className="mt-5 space-y-2">
        {recipe.script.map((segment) => (
          <button
            key={segment.id}
            type="button"
            className={cn(
              'grid w-full grid-cols-[3.5rem_1fr] gap-3 rounded-md border border-border p-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
              segment.startSeconds !== null &&
                selectedTime === segment.startSeconds &&
                'border-primary bg-primary/8',
            )}
            onClick={() => onSelectTime(segment.startSeconds ?? 0)}
          >
            <span className="text-xs font-bold tabular-nums text-primary">
              {formatClock(segment.startSeconds ?? 0)}
            </span>
            <span>
              <LocalizedContent
                value={segment.text}
                display={display}
                className="text-sm leading-relaxed"
              />
              <span className="mt-2 block">
                <Badge variant="neutral">{t(`evidence.${segment.type}`)}</Badge>
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

const RecipeEditorPanel = ({
  recipe,
  onTitleChange,
  onIngredientChange,
  onStepChange,
}: {
  recipe: Recipe
  onTitleChange: (value: string) => void
  onIngredientChange: (ingredientId: string, value: string) => void
  onStepChange: (stepId: string, value: string) => void
}) => {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <SectionHeading
        icon={ScrollText}
        title={t('review.recipeTitle')}
        description={t('review.recipeDescription')}
      />
      <div>
        <Label htmlFor="review-title">{t('review.titleLabel')}</Label>
        <Input
          id="review-title"
          value={localizedValue(recipe.title, activeLocale())}
          onChange={(event) => onTitleChange(event.target.value)}
          className="mt-2 font-display text-lg font-semibold"
        />
      </div>

      <section className="mt-6">
        <h3 className="font-display text-lg font-semibold">
          {t('recipe.ingredients')}
        </h3>
        <div className="mt-3 space-y-2">
          {recipe.ingredients.map((ingredient) => (
            <div
              key={ingredient.id}
              className="grid items-center gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <Label
                  htmlFor={`ingredient-${ingredient.id}`}
                  className="sr-only"
                >
                  {t('review.ingredientNameLabel')}
                </Label>
                <Input
                  id={`ingredient-${ingredient.id}`}
                  value={localizedValue(ingredient.name, activeLocale())}
                  onChange={(event) =>
                    onIngredientChange(ingredient.id, event.target.value)
                  }
                  className="min-h-10"
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-sm font-semibold tabular-nums">
                  {ingredient.quantity.source}
                </span>
                <EvidenceBadge
                  state={ingredient.evidenceState}
                  compact
                  showLabel={false}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="font-display text-lg font-semibold">
          {t('recipe.storyboard')}
        </h3>
        <div className="mt-3 space-y-3">
          {recipe.steps.map((step, index) => (
            <Card key={step.id} className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/45 px-3 py-2">
                <span className="text-xs font-bold text-primary">
                  {t('recipe.step', { count: index + 1 })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatClock(step.sourceStartSeconds)}–
                    {formatClock(step.sourceEndSeconds)}
                  </span>
                  <EvidenceBadge
                    state={step.evidenceState}
                    compact
                    showLabel={false}
                  />
                </div>
              </div>
              <div className="p-3">
                <Label htmlFor={`step-${step.id}`} className="sr-only">
                  {t('review.stepInstructionLabel')}
                </Label>
                <Textarea
                  id={`step-${step.id}`}
                  value={localizedValue(step.instruction, activeLocale())}
                  onChange={(event) =>
                    onStepChange(step.id, event.target.value)
                  }
                />
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

const IssuesPanel = ({
  issues,
  onResolve,
  onIgnore,
  onEvidence,
}: {
  issues: ReviewIssue[]
  onResolve: (issue: ReviewIssue) => void
  onIgnore: (issue: ReviewIssue) => void
  onEvidence: (issue: ReviewIssue) => void
}) => {
  const { t } = useTranslation()
  const openCount = issues.filter((issue) => issue.status === 'open').length
  return (
    <div className="rounded-lg border border-border bg-surface-sunken p-4">
      <SectionHeading
        icon={ScanSearch}
        title={t('review.issuesTitle')}
        description={t('review.issueCount', { count: openCount })}
      />
      {openCount === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t('review.noIssuesTitle')}
          description={t('review.noIssuesDescription')}
          className="min-h-56 bg-card"
        />
      ) : null}
      <div className="space-y-3">
        {issues.map((issue) => (
          <ReviewIssueCard
            key={issue.id}
            issue={issue}
            onResolve={() => onResolve(issue)}
            onIgnore={() => onIgnore(issue)}
            onEvidence={() => onEvidence(issue)}
          />
        ))}
      </div>
    </div>
  )
}
