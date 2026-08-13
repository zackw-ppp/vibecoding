import { beforeEach, describe, expect, it } from 'vitest'
import { useMiseStore } from './use-mise-store'

describe('fixture store', () => {
  beforeEach(() => {
    useMiseStore.getState().resetFixture()
  })

  it('persists meaningful recipe actions in local state', () => {
    const initial = useMiseStore
      .getState()
      .recipes.find((recipe) => recipe.id === 'scallion-noodles')
    expect(initial?.favorite).toBe(true)

    useMiseStore.getState().toggleFavorite('scallion-noodles')

    const updated = useMiseStore
      .getState()
      .recipes.find((recipe) => recipe.id === 'scallion-noodles')
    expect(updated?.favorite).toBe(false)
  })

  it('advances a simulated import through staged processing', () => {
    const jobId = useMiseStore.getState().createImport()
    for (let index = 0; index < 4; index += 1) {
      useMiseStore.getState().advanceImportJobs()
    }

    const job = useMiseStore
      .getState()
      .jobs.find((item) => item.id === jobId)
    expect(job).toMatchObject({
      status: 'needs_review',
      stage: 6,
      progress: 100,
      autoAdvance: false,
    })
  })

  it('marks a reviewed recipe ready after all issues are handled', () => {
    const issues = useMiseStore
      .getState()
      .reviewIssues.filter((issue) => issue.recipeId === 'scallion-noodles')
    for (const issue of issues) {
      useMiseStore.getState().setIssueStatus(issue.id, 'resolved')
    }
    useMiseStore.getState().saveReviewedRecipe('scallion-noodles')

    const recipe = useMiseStore
      .getState()
      .recipes.find((item) => item.id === 'scallion-noodles')
    expect(recipe?.status).toBe('ready')
    expect(
      useMiseStore
        .getState()
        .jobs.find((job) => job.id === 'job-scallion-review')?.status,
    ).toBe('complete')
  })
})
