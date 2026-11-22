import { expect, test } from '@playwright/test'
import { failCollection, requireAuth } from './helpers'

// Lista de personagens (critérios C1-C10, agrupados por funcionalidade do plano de UX).
test.describe('Lista de personagens', () => {
  requireAuth()

  test('C1 abas de série: só séries com personagens, Todos primeiro', async ({ page }) => {
    await page.goto('/characters')
    const tablist = page.getByRole('tablist', { name: 'Série' })
    await expect(tablist).toBeVisible({ timeout: 20_000 })
    const tabs = tablist.getByRole('tab')
    await expect(tabs.first()).toHaveText('Todos')
    expect(await tabs.count()).toBeGreaterThan(1)
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
  })

  test('C2 selecionar uma série atualiza ?serie= e filtra os cards', async ({ page }) => {
    await page.goto('/characters')
    const tabs = page.getByRole('tablist', { name: 'Série' }).getByRole('tab')
    await expect(tabs.nth(1)).toBeVisible({ timeout: 20_000 })
    const total = await page.locator('ul a[href^="/characters/"]').count()
    await tabs.nth(1).click()
    await expect(page).toHaveURL(/serie=/)
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
    expect(await page.locator('ul a[href^="/characters/"]').count()).toBeLessThan(total)
  })

  test('C3 busca vai para ?q= e a contagem é anunciada em aria-live', async ({ page }) => {
    await page.goto('/characters')
    const search = page.getByRole('searchbox', { name: 'Buscar personagem' })
    await search.fill('tea')
    await expect(page).toHaveURL(/q=tea/)
    const live = page.locator('[aria-live="polite"]', { hasText: /personagem/ }).first()
    // singular ("1 personagem") ou plural ("N personagens")
    await expect(live).toHaveText(/^\d+ (personagem|personagens)$/)
  })

  test('C4 busca sem resultado mostra vazio e "Buscar em todas as séries"', async ({ page }) => {
    await page.goto('/characters?serie=gx&q=zzzzzz')
    await expect(page.getByText(/Nenhum personagem encontrado/)).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Buscar em todas as séries' }).click()
    await expect(page).not.toHaveURL(/serie=/)
  })

  test('C5 avatar pequeno com tamanho fixo, lazy e alt vazio', async ({ page }) => {
    await page.goto('/characters')
    const img = page.locator('ul a[href^="/characters/"] img').first()
    await expect(img).toBeVisible({ timeout: 20_000 })
    await expect(img).toHaveAttribute('width', '64')
    await expect(img).toHaveAttribute('height', '64')
    await expect(img).toHaveAttribute('loading', 'lazy')
    await expect(img).toHaveAttribute('alt', '')
    expect(await img.getAttribute('src')).toMatch(/\/characters\/pequeno\/.*\.webp$/)
  })

  test('C6 avatar quebrado cai no ícone de fallback', async ({ page }) => {
    await page.route('**/characters/pequeno/**', (route) => route.abort())
    await page.goto('/characters')
    const card = page.locator('ul a[href^="/characters/"]').first()
    await expect(card).toBeVisible({ timeout: 20_000 })
    await expect(card.locator('img')).toHaveCount(0)
    await expect(card.locator('svg').first()).toBeVisible()
  })

  test('C7 erro de carga: mensagem amigável (sem migration) e Tentar novamente', async ({ page }) => {
    let fail = true
    await page.route('**/rest/v1/characters*', (route) => (fail ? route.abort() : route.continue()))
    await page.goto('/characters')
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Não foi possível carregar os personagens', { timeout: 20_000 })
    await expect(alert).not.toContainText(/migration|011/i)
    fail = false
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.locator('ul a[href^="/characters/"]').first()).toBeVisible({ timeout: 20_000 })
  })

  test('C8 skeleton enquanto carrega', async ({ page }) => {
    await page.route('**/rest/v1/characters*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })
    await page.goto('/characters')
    await expect(page.getByTestId('characters-skeleton')).toBeVisible()
    await expect(page.locator('ul a[href^="/characters/"]').first()).toBeVisible({ timeout: 20_000 })
  })

  test('C9 progresso por deck e ordenação "Mais completos" na URL', async ({ page }) => {
    await page.goto('/characters')
    await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 30_000 })
    const sort = page.getByRole('button', { name: 'Mais completos' })
    await expect(sort).toBeEnabled()
    await sort.click()
    await expect(page).toHaveURL(/ordem=completos/)
    await expect(sort).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Alfabética' }).click()
    await expect(page).not.toHaveURL(/ordem=/)
  })

  test('C10 falha na coleção oculta o progresso e oferece nova tentativa', async ({ page }) => {
    await failCollection(page)
    await page.goto('/characters')
    await expect(page.getByRole('status').filter({ hasText: 'Progresso oculto' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Mais completos' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })
})
