import {
  Grid2X2,
  Import,
  List,
  Search,
  Soup,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { RecipeCard } from '../components/domain/recipe'
import { EmptyState } from '../components/domain/status'
import { Button, Input, Select } from '../components/ui/primitives'
import type { Platform, RecipeStatus } from '../data/types'
import { activeLocale, localizedValue } from '../i18n'
import { cn } from '../lib/cn'
import { useMiseStore } from '../store/use-mise-store'

type Filter =
  | 'all'
  | 'favorites'
  | RecipeStatus
  | Extract<Platform, 'youtube' | 'xiaohongshu'>

const filters: { value: Filter; key: string }[] = [
  { value: 'all', key: 'filter.all' },
  { value: 'favorites', key: 'filter.favorites' },
  { value: 'needs_review', key: 'filter.needsReview' },
  { value: 'ready', key: 'filter.ready' },
  { value: 'xiaohongshu', key: 'filter.xiaohongshu' },
  { value: 'youtube', key: 'filter.youtube' },
]

export const RecipesPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const recipes = useMiseStore((state) => state.recipes)
  const toggleFavorite = useMiseStore((state) => state.toggleFavorite)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState<'recent' | 'title'>('recent')

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(activeLocale())
    const matches = recipes.filter((recipe) => {
      const searchable = [
        recipe.title.original,
        recipe.title.zhCN,
        recipe.title.enUS,
        recipe.author,
        ...recipe.tags.flatMap((tag) => [tag.original, tag.zhCN, tag.enUS]),
        ...recipe.ingredients.flatMap((ingredient) => [
          ingredient.name.original,
          ingredient.name.zhCN,
          ingredient.name.enUS,
        ]),
      ]
        .join(' ')
        .toLocaleLowerCase(activeLocale())
      const matchesSearch = !query || searchable.includes(query)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'favorites' && recipe.favorite) ||
        recipe.status === filter ||
        recipe.platform === filter
      return matchesSearch && matchesFilter
    })

    return matches.toSorted((a, b) =>
      sort === 'recent'
        ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        : localizedValue(a.title, activeLocale()).localeCompare(
            localizedValue(b.title, activeLocale()),
            activeLocale(),
          ),
    )
  }, [filter, recipes, search, sort])

  const clearFilters = () => {
    setSearch('')
    setFilter('all')
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {t('library.eyebrow')}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            {t('library.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('library.description')}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={() => navigate('/import')}
        >
          <Import className="size-5" aria-hidden="true" />
          {t('library.importAction')}
        </Button>
      </header>

      <section className="py-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor="recipe-search" className="sr-only">
              {t('library.searchLabel')}
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="recipe-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('library.searchPlaceholder')}
              className="pl-10 pr-10"
            />
            {search && (
              <button
                type="button"
                className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setSearch('')}
                aria-label={t('common.clear')}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="recipe-sort" className="sr-only">
              {t('library.sortLabel')}
            </label>
            <Select
              id="recipe-sort"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as 'recent' | 'title')
              }
              className="flex-1 lg:w-48"
            >
              <option value="recent">{t('library.sortRecent')}</option>
              <option value="title">{t('library.sortTitle')}</option>
            </Select>
            <div
              className="inline-flex min-h-11 rounded-md border border-border bg-card p-1"
              role="group"
            >
              <button
                type="button"
                className="grid size-9 place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-muted aria-pressed:text-primary"
                aria-label={t('library.viewGrid')}
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
              >
                <Grid2X2 className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-muted aria-pressed:text-primary"
                aria-label={t('library.viewList')}
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                <List className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div
          className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1"
          aria-label={t('library.filters')}
        >
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                'min-h-10 shrink-0 rounded-full border border-border bg-card px-4 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:border-primary/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                filter === item.value &&
                  'border-primary bg-primary/10 text-primary',
              )}
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {t(item.key)}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span role="status">
            {t('library.results', { count: filteredRecipes.length })}
          </span>
        </div>
      </section>

      {filteredRecipes.length === 0 ? (
        <EmptyState
          icon={Soup}
          title={t('library.noResultsTitle')}
          description={t('library.noResultsDescription')}
          action={
            <Button type="button" onClick={clearFilters}>
              {t('library.clearFilters')}
            </Button>
          }
        />
      ) : (
        <div
          className={cn(
            view === 'grid'
              ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3'
              : 'grid gap-4',
          )}
        >
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              variant={view === 'grid' ? 'visual' : 'compact'}
              onOpen={() => navigate(`/recipes/${recipe.id}`)}
              onToggleFavorite={() => toggleFavorite(recipe.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
