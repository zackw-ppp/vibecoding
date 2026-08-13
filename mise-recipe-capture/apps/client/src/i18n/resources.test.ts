import { describe, expect, it } from 'vitest'
import { fixtureRecipes } from '../data/fixtures'
import { displayLocalizedValue, formatClock } from '.'
import { resources } from './resources'

describe('i18n resources', () => {
  it('keeps English and Chinese key sets identical', () => {
    const english = Object.keys(resources['en-US'].translation).sort()
    const chinese = Object.keys(resources['zh-CN'].translation).sort()
    expect(chinese).toEqual(english)
  })

  it('renders translated, original, and bilingual recipe content', () => {
    const recipe = fixtureRecipes.find(
      (item) => item.id === 'roasted-tomato-pasta',
    )
    expect(recipe).toBeDefined()
    if (!recipe) return

    expect(
      displayLocalizedValue(recipe.title, 'zh-CN', 'translated').primary,
    ).toBe('浓香烤番茄意面')
    expect(
      displayLocalizedValue(recipe.title, 'zh-CN', 'original').primary,
    ).toBe('Jammy Roasted Tomato Pasta')
    expect(
      displayLocalizedValue(recipe.title, 'zh-CN', 'bilingual').secondary,
    ).toBe('Jammy Roasted Tomato Pasta')
  })

  it('formats source time references consistently', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(84)).toBe('1:24')
  })
})
