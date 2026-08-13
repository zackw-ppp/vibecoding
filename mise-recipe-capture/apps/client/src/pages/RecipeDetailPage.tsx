import {
  ArrowLeft,
  ChefHat,
  Clock3,
  ExternalLink,
  Heart,
  Link2,
  ScrollText,
  Soup,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  BilingualToggle,
  IngredientRow,
  LocalizedContent,
  SourceBadge,
  StepCard,
} from '../components/domain/recipe'
import { EmptyState } from '../components/domain/status'
import { Badge, Button, Card } from '../components/ui/primitives'
import {
  activeLocale,
  displayLocalizedValue,
  formatClock,
} from '../i18n'
import { cn } from '../lib/cn'
import { useMiseStore } from '../store/use-mise-store'

export const RecipeDetailPage = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const recipe = useMiseStore((state) =>
    state.recipes.find((item) => item.id === id),
  )
  const jobs = useMiseStore((state) => state.jobs)
  const toggleFavorite = useMiseStore((state) => state.toggleFavorite)
  const display = useMiseStore((state) => state.contentDisplay)
  const setDisplay = useMiseStore((state) => state.setContentDisplay)

  if (!recipe) {
    return (
      <div className="mx-auto max-w-3xl pt-12">
        <EmptyState
          icon={Soup}
          title={t('recipe.notFoundTitle')}
          description={t('recipe.notFoundDescription')}
          action={
            <Button type="button" onClick={() => navigate('/recipes')}>
              {t('recipe.backToLibrary')}
            </Button>
          }
        />
      </div>
    )
  }

  const reviewJob = jobs.find(
    (job) =>
      job.resultRecipeId === recipe.id &&
      (job.status === 'needs_review' || job.status === 'complete'),
  )
  const title = displayLocalizedValue(recipe.title, activeLocale(), display)
  const description = displayLocalizedValue(
    recipe.description,
    activeLocale(),
    display,
  )

  return (
    <article className="mx-auto max-w-[1280px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/recipes')}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('recipe.backToLibrary')}
        </Button>
        <BilingualToggle value={display} onChange={setDisplay} />
      </div>

      <header className="grid overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative min-h-72 overflow-hidden bg-surface-media sm:min-h-96 lg:min-h-[31rem]">
          <img
            src={recipe.cover}
            alt={t('recipe.coverAlt', { title: title.primary })}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute left-4 top-4">
            <SourceBadge
              platform={recipe.platform}
              contentType={recipe.contentType}
            />
          </div>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={recipe.status === 'ready' ? 'success' : 'warning'}
            >
              {t(`status.${recipe.status}`)}
            </Badge>
            {recipe.tags.slice(0, 2).map((tag) => (
              <Badge key={tag.original} variant="neutral">
                {displayLocalizedValue(tag, activeLocale(), display).primary}
              </Badge>
            ))}
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.025em] sm:text-5xl">
            {title.primary}
            {title.secondary && (
              <span className="mt-3 block font-sans text-lg font-normal leading-relaxed text-muted-foreground">
                {title.secondary}
              </span>
            )}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            {description.primary}
          </p>
          {description.secondary && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description.secondary}
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-muted p-3">
            <div className="text-center">
              <Clock3 className="mx-auto size-4 text-primary" aria-hidden="true" />
              <div className="mt-1 text-xs text-muted-foreground">
                {t('recipe.prepTime')}
              </div>
              <div className="mt-0.5 text-sm font-bold tabular-nums">
                {t('common.minutesShort', { count: recipe.prepMinutes })}
              </div>
            </div>
            <div className="border-x border-border text-center">
              <ChefHat className="mx-auto size-4 text-primary" aria-hidden="true" />
              <div className="mt-1 text-xs text-muted-foreground">
                {t('recipe.cookTime')}
              </div>
              <div className="mt-0.5 text-sm font-bold tabular-nums">
                {t('common.minutesShort', { count: recipe.cookMinutes })}
              </div>
            </div>
            <div className="text-center">
              <Users className="mx-auto size-4 text-primary" aria-hidden="true" />
              <div className="mt-1 text-xs text-muted-foreground">
                {t('recipe.servings', { count: recipe.servings })}
              </div>
              <div className="mt-0.5 text-sm font-bold tabular-nums">
                {recipe.servings}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              onClick={() => navigate(`/recipes/${recipe.id}/cook`)}
            >
              <ChefHat className="size-5" aria-hidden="true" />
              {t('recipe.startCooking')}
            </Button>
            {recipe.status === 'needs_review' && reviewJob && (
              <Button
                type="button"
                size="lg"
                variant="soft"
                onClick={() => navigate(`/import/${reviewJob.id}/review`)}
              >
                {t('recipe.reviewDraft')}
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => toggleFavorite(recipe.id)}
              aria-label={
                recipe.favorite ? t('recipe.unfavorite') : t('recipe.favorite')
              }
              aria-pressed={recipe.favorite}
            >
              <Heart
                className={cn(
                  'size-5',
                  recipe.favorite && 'fill-primary text-primary',
                )}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(18rem,0.34fr)_minmax(0,0.66fr)]">
        <aside className="space-y-6 lg:sticky lg:top-8">
          <Card className="p-5">
            <h2 className="font-display text-2xl font-semibold">
              {t('recipe.ingredients')}
            </h2>
            <div className="mt-4">
              {recipe.ingredients.map((ingredient) => (
                <IngredientRow key={ingredient.id} ingredient={ingredient} />
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                <Link2 className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold">{t('recipe.sourceAttribution')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {recipe.author}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {t('recipe.sourceFixtureHint')}
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                {t('recipe.openSource')}
              </a>
            </Button>
          </Card>
        </aside>

        <section>
          <div className="mb-5">
            <h2 className="font-display text-3xl font-semibold">
              {t('recipe.storyboard')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('recipe.storyboardDescription')}
            </p>
          </div>
          <div className="space-y-6">
            {recipe.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                number={index + 1}
                ingredients={recipe.ingredients}
              />
            ))}
          </div>

          <Card className="mt-8 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                <ScrollText className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  {t('recipe.sourceScript')}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t('recipe.sourceScriptDescription')}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {recipe.script.map((segment) => (
                <div
                  key={segment.id}
                  className="grid gap-2 rounded-md border border-border bg-muted/35 p-3 sm:grid-cols-[5rem_1fr]"
                >
                  <div className="text-xs font-bold tabular-nums text-primary">
                    {segment.startSeconds !== null
                      ? formatClock(segment.startSeconds)
                      : null}
                  </div>
                  <div>
                    <LocalizedContent
                      value={segment.text}
                      display={display}
                      className="text-sm leading-relaxed"
                    />
                    <Badge variant="neutral" className="mt-2">
                      {t(`evidence.${segment.type}`)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </article>
  )
}
