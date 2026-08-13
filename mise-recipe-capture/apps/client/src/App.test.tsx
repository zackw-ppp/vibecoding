import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './App'
import { AppRuntime } from './components/AppRuntime'
import i18n from './i18n'
import { useMiseStore } from './store/use-mise-store'

const renderRoute = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRuntime>
        <AppRoutes />
      </AppRuntime>
    </MemoryRouter>,
  )

describe('Mise fixture experience', () => {
  beforeEach(async () => {
    useMiseStore.getState().resetFixture()
    useMiseStore.setState({
      localePreference: 'en-US',
      themePreference: 'warm-kitchen',
      contentDisplay: 'translated',
    })
    await i18n.changeLanguage('en-US')
  })

  it('enters the guest fixture from the welcome screen', async () => {
    const user = userEvent.setup()
    renderRoute('/')

    await user.click(
      screen.getByRole('button', { name: 'Enter the sample kitchen' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Recipes', level: 1 }),
    ).toBeInTheDocument()
    expect(useMiseStore.getState().hasEnteredFixture).toBe(true)
  })

  it('searches bilingual recipe and ingredient content', async () => {
    const user = userEvent.setup()
    renderRoute('/recipes')

    await user.type(
      screen.getByRole('searchbox', { name: 'Search recipes' }),
      'ginger',
    )

    expect(
      screen.getByRole('heading', {
        name: 'Ginger & Scallion Steamed Fish',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Jammy Roasted Tomato Pasta' }),
    ).not.toBeInTheDocument()
  })

  it('applies a selected theme through semantic tokens', async () => {
    const user = userEvent.setup()
    renderRoute('/settings')

    await user.click(
      screen.getByRole('button', { name: /Midnight Cook/ }),
    )

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(
        'data-theme',
        'midnight-cook',
      )
    })
  })
})
