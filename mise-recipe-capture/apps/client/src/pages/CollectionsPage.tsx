import { ArrowRight, FolderHeart, Layers3 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { RecipeCard } from '../components/domain/recipe'
import { Badge, Button, Card } from '../components/ui/primitives'
import { useMiseStore } from '../store/use-mise-store'

export const CollectionsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const collections = useMiseStore((state) => state.collections)
  const recipes = useMiseStore((state) => state.recipes)
  const toggleFavorite = useMiseStore((state) => state.toggleFavorite)
  const [selectedId, setSelectedId] = useState(collections[0]?.id ?? '')
  const selected = collections.find((collection) => collection.id === selectedId)
  const selectedRecipes = recipes.filter((recipe) =>
    selected?.recipeIds.includes(recipe.id),
  )

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          {t('collections.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          {t('collections.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('collections.description')}
        </p>
      </header>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {collections.map((collection) => {
          const selectedCollection = collection.id === selectedId
          return (
            <Card
              key={collection.id}
              className={selectedCollection ? 'border-primary' : undefined}
            >
              <button
                type="button"
                className="grid w-full overflow-hidden rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[10rem_1fr]"
                aria-pressed={selectedCollection}
                onClick={() => setSelectedId(collection.id)}
              >
                <div className="aspect-[4/3] overflow-hidden bg-surface-sunken sm:aspect-auto">
                  <img
                    src={collection.cover}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-md bg-secondary text-secondary-foreground">
                      <FolderHeart className="size-4" aria-hidden="true" />
                    </span>
                    <Badge variant="neutral">
                      {t('common.recipeCount', {
                        count: collection.recipeIds.length,
                      })}
                    </Badge>
                  </div>
                  <h2 className="mt-4 font-display text-xl font-semibold">
                    {t(collection.nameKey)}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {t(collection.descriptionKey)}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {t('collections.open')}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </button>
            </Card>
          )
        })}
      </div>

      {selected && (
        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                <Layers3 className="size-4" aria-hidden="true" />
                {t('collections.title')}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                {t(selected.nameKey)}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/recipes')}
            >
              {t('common.viewAll')}
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {selectedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onOpen={() => navigate(`/recipes/${recipe.id}`)}
                onToggleFavorite={() => toggleFavorite(recipe.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
