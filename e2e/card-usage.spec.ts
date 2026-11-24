import { expect, test, type Page, type Route } from '@playwright/test'
import { guardWrites, requireAuth, viteVar } from './helpers'

// A2-1..A2-8: seção "Usada por personagens" na página da carta.
// Tudo é mockado com page.route (somente leitura): nada altera a coleção nem cria decks.
test.describe('Usada por personagens (autenticado, dados mockados)', () => {
  requireAuth()

  /** Primeiro id de carta do catálogo (GET de leitura com o token da sessão). */
  async function anyCardId(page: Page): Promise<number> {
    await page.goto('/')
    const token = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i) as string
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          return JSON.parse(localStorage.getItem(key) as string).access_token as string
        }
      }
      return null
    })
    const base = viteVar('VITE_SUPABASE_URL')
    const anon = viteVar('VITE_SUPABASE_ANON_KEY')
    expect(token && base && anon).toBeTruthy()
    const res = await page.request.get(`${base}/rest/v1/cards?select=id&limit=1`, {
      headers: { apikey: anon as string, Authorization: `Bearer ${token}` },
    })
    const rows = (await res.json()) as Array<{ id: number }>
    return rows[0].id
  }

  const usageRow = (i: number, quantity = 3, zone = 'main') => ({
    zone,
    quantity,
    language: 'en',
    anime_decks: {
      id: `deck-${i}`,
      slug: `deck-slug-${i}`,
      name: `Deck ${i}`,
      character_decks: [
        {
          label: 'A',
          characters: {
            slug: `char-${i}`,
            name: `Personagem ${String(i).padStart(2, '0')}`,
            series: 'classic', // slug cru: a tela deve mostrar o nome do anime (Clássico)
            image_small: '/characters/pequeno/nao-existe.webp',
            animes: { name: 'Clássico', sort_order: 1 },
          },
        },
      ],
    },
  })

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  async function mockUsage(page: Page, rows: unknown[], opts: { delayMs?: number } = {}) {
    let calls = 0
    await guardWrites(page) // PRIMEIRO: aborta qualquer escrita não mockada
    await page.route('**/rest/v1/anime_deck_cards*', async (route) => {
      calls += 1
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs))
      await json(route, rows)
    })
    return () => calls
  }

  // <section aria-labelledby> com o h2: localizado pelo título (não depende do cálculo do role region)
  const section = (page: Page) =>
    page.locator('section').filter({ has: page.getByRole('heading', { name: 'Usada por personagens' }) })

  /** O carregamento é lazy (IntersectionObserver real): rola até o fim para a seção entrar na tela. */
  async function revealSection(page: Page) {
    await expect(page.getByRole('heading', { name: 'Informações da carta' })).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  }

  test('A2-1 carrega só quando a seção fica visível (lazy)', async ({ page }) => {
    // IntersectionObserver controlado: só dispara quando o teste mandar
    await page.addInitScript(() => {
      const observers: Array<(entries: unknown[]) => void> = []
      const w = window as unknown as { __fireIO: () => void; IntersectionObserver: unknown }
      w.__fireIO = () => observers.forEach((cb) => cb([{ isIntersecting: true }]))
      w.IntersectionObserver = class {
        constructor(cb: (entries: unknown[]) => void) {
          observers.push(cb)
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    })
    const cardId = await anyCardId(page)
    const calls = await mockUsage(page, [usageRow(1)])
    await page.goto(`/cards/${cardId}`)
    await expect(page.getByRole('heading', { name: 'Informações da carta' })).toBeVisible({ timeout: 20_000 })
    expect(calls()).toBe(0)
    await page.evaluate(() => (window as unknown as { __fireIO: () => void }).__fireIO())
    await expect(section(page).getByText('Personagem 01')).toBeVisible()
    expect(calls()).toBe(1)
  })

  test('A2-2 skeleton enquanto carrega, depois resumo; a seção vem após "Informações da carta"', async ({ page }) => {
    const cardId = await anyCardId(page)
    await mockUsage(page, [usageRow(1), usageRow(2)], { delayMs: 1200 })
    await page.goto(`/cards/${cardId}`)
    await revealSection(page)
    await expect(section(page).getByRole('status')).toBeVisible({ timeout: 20_000 })
    await expect(section(page).getByText('Usada em 2 decks de 2 personagens')).toBeVisible()
    const order = await page.evaluate(() => {
      const headings = [...document.querySelectorAll('h2')].map((h) => h.textContent?.trim())
      return headings.indexOf('Usada por personagens') - headings.indexOf('Informações da carta')
    })
    expect(order).toBeGreaterThan(0)
  })

  test('A2-3 sem uso: a seção some e a página continua inteira', async ({ page }) => {
    const cardId = await anyCardId(page)
    const calls = await mockUsage(page, [])
    await page.goto(`/cards/${cardId}`)
    await revealSection(page)
    await expect.poll(calls, { timeout: 15_000 }).toBe(1) // a consulta aconteceu de fato (lazy disparou)
    await expect(page.getByRole('heading', { name: 'Usada por personagens' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Informações da carta' })).toBeVisible()
  })

  test('A2-4 mostra 8 personagens e "Ver todos (N)" expande (aria-expanded)', async ({ page }) => {
    const cardId = await anyCardId(page)
    await mockUsage(page, Array.from({ length: 10 }, (_, i) => usageRow(i + 1)))
    await page.goto(`/cards/${cardId}`)
    await revealSection(page)
    const sec = section(page)
    await expect(sec.getByText('Personagem 01')).toBeVisible({ timeout: 20_000 })
    await expect(sec.getByText(/^Personagem \d\d$/)).toHaveCount(8)
    const toggle = sec.getByRole('button', { name: 'Ver todos (10)' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(sec.getByText(/^Personagem \d\d$/)).toHaveCount(10)
    await expect(sec.getByRole('button', { name: 'Ver menos' })).toHaveAttribute('aria-expanded', 'true')
  })

  test('A2-5 links descritivos para o deck e avatares decorativos (alt vazio)', async ({ page }) => {
    const cardId = await anyCardId(page)
    await mockUsage(page, [usageRow(1)])
    await page.goto(`/cards/${cardId}`)
    await revealSection(page)
    const link = section(page).getByRole('link', { name: 'Ver o deck Deck 1 de Personagem 01' })
    await expect(link).toHaveAttribute('href', '/characters/char-1/decks/deck-slug-1')
    // a série mostra o NOME do anime, não o slug cru
    await expect(section(page).getByText('Clássico', { exact: true })).toBeVisible()
    await expect(section(page).getByText('classic', { exact: true })).toHaveCount(0)
    await expect(section(page).locator('img:not([alt=""])')).toHaveCount(0)
  })

  test('A2-6 erro discreto com "Tentar novamente", sem quebrar a página', async ({ page }) => {
    const cardId = await anyCardId(page)
    let fail = true
    await guardWrites(page)
    await page.route('**/rest/v1/anime_deck_cards*', (route) =>
      fail ? json(route, { message: 'boom' }, 500) : json(route, [usageRow(1)]),
    )
    await page.goto(`/cards/${cardId}`)
    await revealSection(page)
    await expect(section(page).getByText(/Não foi possível carregar/)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Informações da carta' })).toBeVisible()
    fail = false
    await section(page).getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(section(page).getByText('Personagem 01')).toBeVisible()
  })

  test('A2-7 posse indisponível: lista aparece sem indicador Completo/Parcial/Falta', async ({ page }) => {
    const cardId = await anyCardId(page)
    await mockUsage(page, [usageRow(1)])
    await page.route('**/rest/v1/collection_items*', (route) => route.abort())
    await page.goto(`/cards/${cardId}`)
    await revealSection(page)
    await expect(section(page).getByText('Personagem 01')).toBeVisible({ timeout: 20_000 })
    await expect(section(page).getByText(/^(Completo|Parcial|Falta)$/)).toHaveCount(0)
  })

  test('A2-8 indicador de posse por deck com ícone + texto (Parcial: tenho 1 de 3)', async ({ page }) => {
    const cardId = await anyCardId(page)
    await mockUsage(page, [usageRow(1, 3)])
    await page.route('**/rest/v1/collection_items*', (route) => {
      if (route.request().method() !== 'GET') return route.abort() // nunca altera a coleção
      return json(route, [
        {
          id: 'e2e-mock',
          user_id: 'e2e-mock',
          card_id: cardId,
          language: 'en',
          set_code: 'MOCK-EN001',
          set_name: 'Mock',
          set_rarity: 'Common',
          quantity: 1,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
    })
    await page.goto(`/cards/${cardId}`)
    await revealSection(page)
    await expect(section(page).getByText('Parcial')).toBeVisible({ timeout: 20_000 })
  })
})
