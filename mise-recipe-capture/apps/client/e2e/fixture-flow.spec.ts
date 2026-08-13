import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('mise-e2e-ready')) {
      localStorage.clear()
      sessionStorage.setItem('mise-e2e-ready', 'true')
    }
  })
})

test('guest fixture import, review, and save flow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter the sample kitchen' }).click()
  await expect(page.getByRole('heading', { name: 'Recipes', level: 1 })).toBeVisible()

  await page.getByRole('link', { name: 'Import' }).first().click()
  await page.getByRole('button', { name: 'Import the sample source' }).click()
  await expect(page.getByText('Sample import started')).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'Review draft' }).first(),
  ).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Review draft' }).first().click()

  const title = page.locator('#review-title:visible')
  await title.fill('My reviewed scallion noodles')

  const openQueue = page.getByRole('button', { name: /Open review queue/ })
  if (await openQueue.isVisible()) {
    await openQueue.click()
  } else {
    await page.getByRole('tab', { name: 'Review' }).click()
  }
  await page
    .locator('button:visible')
    .filter({ hasText: 'Accept suggestion' })
    .first()
    .click()
  const closeSheet = page.getByRole('button', { name: 'Close' })
  if (await closeSheet.isVisible()) {
    await closeSheet.click()
  }
  await page.getByRole('button', { name: 'Save recipe' }).click()

  await expect(
    page.getByRole('heading', { name: 'My reviewed scallion noodles', level: 1 }),
  ).toBeVisible()
})

test('theme preference persists across reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter the sample kitchen' }).click()
  await page.getByRole('link', { name: 'Settings' }).first().click()
  await page.getByRole('button', { name: /Midnight Cook/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight-cook')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight-cook')
})

test('cook mode supports timers, completion, and step navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter the sample kitchen' }).click()
  await page
    .getByRole('heading', { name: 'Scallion Oil Noodles' })
    .first()
    .click()
  await page.getByRole('button', { name: 'Start cooking' }).click()

  await expect(page.locator('header').getByText('Step 1 of 4')).toBeVisible()
  await page.getByRole('button', { name: 'Start timer' }).click()
  await expect(page.getByRole('timer')).not.toHaveText('2:00', {
    timeout: 3_000,
  })
  await page.getByRole('button', { name: 'Mark step complete' }).click()
  await expect(page.getByRole('button', { name: 'Step completed' })).toBeVisible()
  await page.getByRole('button', { name: 'Next step' }).click()
  await expect(page.locator('header').getByText('Step 2 of 4')).toBeVisible()
})
