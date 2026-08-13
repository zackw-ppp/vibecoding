import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  cloneFixtureJobs,
  cloneFixtureRecipes,
  cloneFixtureReviewIssues,
  createFixtureImportJob,
  fixtureCollections,
} from '../data/fixtures'
import type {
  ContentDisplay,
  ImportJob,
  Locale,
  LocalePreference,
  Recipe,
  RecipeCollection,
  ReviewIssue,
  ReviewIssueStatus,
  ThemePreference,
  UnitSystem,
} from '../data/types'

interface MiseState {
  hasEnteredFixture: boolean
  localePreference: LocalePreference
  themePreference: ThemePreference
  units: UnitSystem
  contentDisplay: ContentDisplay
  recipes: Recipe[]
  jobs: ImportJob[]
  reviewIssues: ReviewIssue[]
  collections: RecipeCollection[]
  completedSteps: Record<string, string[]>
  cacheClearedAt: string | null
  enterFixture: () => void
  setLocalePreference: (locale: LocalePreference) => void
  setThemePreference: (theme: ThemePreference) => void
  setUnits: (units: UnitSystem) => void
  setContentDisplay: (display: ContentDisplay) => void
  toggleFavorite: (recipeId: string) => void
  createImport: () => string
  advanceImportJobs: () => void
  cancelImport: (jobId: string) => void
  retryImport: (jobId: string) => void
  updateRecipeTitle: (recipeId: string, value: string, locale: Locale) => void
  updateIngredientName: (
    recipeId: string,
    ingredientId: string,
    value: string,
    locale: Locale,
  ) => void
  updateStepInstruction: (
    recipeId: string,
    stepId: string,
    value: string,
    locale: Locale,
  ) => void
  setIssueStatus: (issueId: string, status: ReviewIssueStatus) => void
  saveReviewedRecipe: (recipeId: string) => void
  toggleCompletedStep: (recipeId: string, stepId: string) => void
  clearMediaCache: () => void
  resetFixture: () => void
}

const updateLocalizedField = (
  field: Recipe['title'],
  value: string,
  locale: Locale,
): Recipe['title'] => ({
  ...field,
  ...(locale === 'zh-CN' ? { zhCN: value } : { enUS: value }),
  ...(field.originalLocale === locale ? { original: value } : {}),
})

const initialData = () => ({
  recipes: cloneFixtureRecipes(),
  jobs: cloneFixtureJobs(),
  reviewIssues: cloneFixtureReviewIssues(),
  collections: structuredClone(fixtureCollections),
})

export const useMiseStore = create<MiseState>()(
  persist(
    (set) => ({
      hasEnteredFixture: false,
      localePreference: 'system',
      themePreference: 'warm-kitchen',
      units: 'source',
      contentDisplay: 'translated',
      ...initialData(),
      completedSteps: {},
      cacheClearedAt: null,
      enterFixture: () => set({ hasEnteredFixture: true }),
      setLocalePreference: (localePreference) => set({ localePreference }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setUnits: (units) => set({ units }),
      setContentDisplay: (contentDisplay) => set({ contentDisplay }),
      toggleFavorite: (recipeId) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === recipeId
              ? { ...recipe, favorite: !recipe.favorite, updatedAt: new Date().toISOString() }
              : recipe,
          ),
        })),
      createImport: () => {
        const id = `fixture-${Date.now()}`
        set((state) => ({
          jobs: [createFixtureImportJob(id), ...state.jobs],
        }))
        return id
      },
      advanceImportJobs: () =>
        set((state) => ({
          jobs: state.jobs.map((job) => {
            if (job.status !== 'processing' || !job.autoAdvance) {
              return job
            }
            const progress = Math.min(100, job.progress + 24)
            if (progress === 100) {
              return {
                ...job,
                progress,
                stage: 6,
                status: 'needs_review',
                autoAdvance: false,
              }
            }
            return {
              ...job,
              progress,
              stage: Math.min(5, Math.floor(progress / 17)),
            }
          }),
        })),
      cancelImport: (jobId) =>
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? { ...job, status: 'cancelled', autoAdvance: false }
              : job,
          ),
        })),
      retryImport: (jobId) =>
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: 'processing',
                  progress: 4,
                  stage: 0,
                  errorCode: null,
                  autoAdvance: true,
                  resultRecipeId: 'scallion-noodles',
                }
              : job,
          ),
        })),
      updateRecipeTitle: (recipeId, value, locale) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === recipeId
              ? {
                  ...recipe,
                  title: updateLocalizedField(recipe.title, value, locale),
                  updatedAt: new Date().toISOString(),
                }
              : recipe,
          ),
        })),
      updateIngredientName: (recipeId, ingredientId, value, locale) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === recipeId
              ? {
                  ...recipe,
                  ingredients: recipe.ingredients.map((ingredient) =>
                    ingredient.id === ingredientId
                      ? {
                          ...ingredient,
                          name: updateLocalizedField(ingredient.name, value, locale),
                          evidenceState: 'user_confirmed',
                        }
                      : ingredient,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : recipe,
          ),
        })),
      updateStepInstruction: (recipeId, stepId, value, locale) =>
        set((state) => ({
          recipes: state.recipes.map((recipe) =>
            recipe.id === recipeId
              ? {
                  ...recipe,
                  steps: recipe.steps.map((step) =>
                    step.id === stepId
                      ? {
                          ...step,
                          instruction: updateLocalizedField(step.instruction, value, locale),
                          evidenceState: 'user_confirmed',
                        }
                      : step,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : recipe,
          ),
        })),
      setIssueStatus: (issueId, status) =>
        set((state) => {
          const issue = state.reviewIssues.find((item) => item.id === issueId)
          if (!issue) {
            return state
          }
          return {
            reviewIssues: state.reviewIssues.map((item) =>
              item.id === issueId ? { ...item, status } : item,
            ),
            recipes: state.recipes.map((recipe) => {
              if (recipe.id !== issue.recipeId || status !== 'resolved') {
                return recipe
              }
              return {
                ...recipe,
                ingredients: recipe.ingredients.map((ingredient) =>
                  ingredient.id === issue.targetId
                    ? { ...ingredient, evidenceState: 'user_confirmed' }
                    : ingredient,
                ),
                steps: recipe.steps.map((step) =>
                  step.id === issue.targetId
                    ? { ...step, evidenceState: 'user_confirmed' }
                    : step,
                ),
                updatedAt: new Date().toISOString(),
              }
            }),
          }
        }),
      saveReviewedRecipe: (recipeId) =>
        set((state) => {
          const stillOpen = state.reviewIssues.some(
            (issue) => issue.recipeId === recipeId && issue.status === 'open',
          )
          return {
            recipes: state.recipes.map((recipe) =>
              recipe.id === recipeId
                ? {
                    ...recipe,
                    status: stillOpen ? 'needs_review' : 'ready',
                    updatedAt: new Date().toISOString(),
                  }
                : recipe,
            ),
            jobs: state.jobs.map((job) =>
              job.resultRecipeId === recipeId && job.status === 'needs_review'
                ? { ...job, status: 'complete', progress: 100, stage: 6 }
                : job,
            ),
          }
        }),
      toggleCompletedStep: (recipeId, stepId) =>
        set((state) => {
          const completed = state.completedSteps[recipeId] ?? []
          const next = completed.includes(stepId)
            ? completed.filter((id) => id !== stepId)
            : [...completed, stepId]
          return {
            completedSteps: {
              ...state.completedSteps,
              [recipeId]: next,
            },
          }
        }),
      clearMediaCache: () => set({ cacheClearedAt: new Date().toISOString() }),
      resetFixture: () =>
        set((state) => ({
          ...initialData(),
          completedSteps: {},
          cacheClearedAt: null,
          hasEnteredFixture: state.hasEnteredFixture,
        })),
    }),
    {
      name: 'mise-fixture-v1',
      version: 1,
    },
  ),
)
