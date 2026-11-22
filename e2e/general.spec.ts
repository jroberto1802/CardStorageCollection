import { expect, test } from '@playwright/test'
import { openFirstDeck, requireAuth } from './helpers'

// Gerais (G1-G8): responsividade, bundle por rota, a11y e rotas protegidas.
test.describe('Gerais (autenticado)', () => {
  requireAuth()

  test('G1 sem rolagem horizontal na lista e no deck', async ({ page }) => {
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    await page.goto('/characters')
    await expect(page.locator('ul a[href^="/characters/"]').first()).toBeVisible({ timeout: 20_000 })
    expect(await overflow()).toBe(false)
    await openFirstDeck(page)
    expect(await overflow()).toBe(false)
  })

  test('G2 code-splitting: /characters não baixa o chunk do Scanner', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (req) => requested.push(req.url()))
    await page.goto('/characters')
    await expect(page.locator('ul a[href^="/characters/"]').first()).toBeVisible({ timeout: 20_000 })
    const joined = requested.join('\n')
    expect(joined).toMatch(/CharactersPage/)
    expect(joined).not.toMatch(/CardScannerPage/)
  })

  test('G3 prefers-reduced-motion reduz as transições', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/characters')
    const tab = page.getByRole('tab').first()
    await expect(tab).toBeVisible({ timeout: 20_000 })
    const duration = await tab.evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(parseFloat(duration)).toBeLessThan(0.01)
  })

  test('G4 abas: setas do teclado trocam a série', async ({ page }) => {
    await page.goto('/characters')
    const first = page.getByRole('tab').first()
    await expect(first).toBeVisible({ timeout: 20_000 })
    await first.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/serie=/)
  })

  test('G5 preview de carta: foco inicial, Tab preso e ESC com retorno de foco', async ({ page }) => {
    await openFirstDeck(page)
    const tile = page.locator('section ul li button[aria-label]').first()
    await tile.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(tile).toBeFocused()
  })

  test('G6 alvos de toque >= 44px nos controles principais', async ({ page }) => {
    await page.goto('/characters')
    await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 20_000 })
    const targets = [page.getByRole('tab').first(), page.getByRole('searchbox'), page.getByRole('button', { name: 'Alfabética' })]
    for (const target of targets) {
      const box = await target.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5)
    }
  })
})

test.describe('Gerais (sem sessão)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('G7 rota protegida redireciona para /login', async ({ page }) => {
    await page.goto('/characters')
    await expect(page).toHaveURL(/\/login/)
  })

  test('G8 rota desconhecida não quebra o app', async ({ page }) => {
    await page.goto('/rota-que-nao-existe')
    await expect(page).toHaveURL(/\/(login)?$/)
  })
})
