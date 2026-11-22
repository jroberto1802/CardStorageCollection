import { expect, test } from '@playwright/test'
import { E2E_PREFIX, deleteE2EDeck, failCollection, firstCharacter, openFirstDeck, requireAuth } from './helpers'

// Personagem e deck (critérios S1-S9: página do personagem, deck, "O que falta" e "Criar meu deck").
test.describe('Personagem e deck', () => {
  requireAuth()

  test('S1 personagem: avatar grande com alt e exatamente 2 cards de deck', async ({ page }) => {
    const character = await firstCharacter(page)
    await page.goto(character.href)
    await expect(page.getByRole('img', { name: `Avatar de ${character.name}` })).toBeVisible({ timeout: 20_000 })
    const decks = page.locator('a[href*="/decks/"]')
    await expect(decks).toHaveCount(2)
    await expect(decks.nth(0)).toContainText('Deck A')
    await expect(decks.nth(1)).toContainText('Deck B')
    await expect(decks.nth(0)).toContainText(/Main \d+ · Extra \d+ · Side \d+/)
  })

  test('S2 deck: breadcrumb, h1 e alternador A/B atualiza a URL sem skeleton completo', async ({ page }) => {
    await openFirstDeck(page)
    await expect(page.getByRole('navigation', { name: 'Navegação' })).toBeVisible()
    const first = page.url()
    await page.getByRole('button', { name: 'Deck B' }).click()
    await expect(page).not.toHaveURL(first)
    await expect(page.getByLabel('Carregando deck')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Deck B' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('S3 progresso com progressbar e filtro Todas/Tenho/Faltam', async ({ page }) => {
    await openFirstDeck(page)
    await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 20_000 })
    const group = page.getByRole('group', { name: 'Filtrar cartas' })
    await group.getByRole('button', { name: 'Faltam' }).click()
    await expect(group.getByRole('button', { name: 'Faltam' })).toHaveAttribute('aria-pressed', 'true')
    // o filtro persiste ao alternar o deck
    await page.getByRole('button', { name: 'Deck B' }).click()
    await expect(group.getByRole('button', { name: 'Faltam' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('S4 miniaturas: uma por carta distinta, status com texto e aria-label', async ({ page }) => {
    await openFirstDeck(page)
    const tile = page.locator('section ul li button[aria-label]').first()
    await expect(tile).toBeVisible({ timeout: 20_000 })
    await expect(tile).toHaveAttribute('aria-label', /você tem \d+: (Completo|Parcial|Falta)/)
    await expect(tile).toContainText(/Completo|Parcial|Falta/)
  })

  test('S5 "O que falta": fonte de preço, copiar e baixar .txt', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openFirstDeck(page)
    const open = page.getByRole('button', { name: /O que falta \(\d+\)/ })
    // A coleção carrega depois do deck: espere o botão (ou o estado final) antes de decidir pular.
    await open.or(page.getByRole('button', { name: /Você já tem tudo|Coleção indisponível/ })).first()
      .waitFor({ timeout: 20_000 })
      .catch(() => undefined)
    test.skip((await open.count()) === 0 || (await open.isDisabled()), 'Coleção completa ou indisponível')
    await open.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/Total estimado: US\$/)).toBeVisible()
    await expect(dialog.getByText(/Estimativa com preços de/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Copiar lista' }).click()
    await expect(dialog.getByText('Lista copiada!')).toBeVisible()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toMatch(/^# O que falta - /)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Baixar .txt' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^faltam-.+\.txt$/)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(open).toBeFocused()
  })

  test('S6 criar deck: validação do nome, ESC fecha e foco volta ao botão', async ({ page }) => {
    await openFirstDeck(page)
    const trigger = page.getByRole('button', { name: 'Criar meu deck a partir deste' })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    const name = dialog.getByLabel('Nome do deck')
    await expect(name).toBeFocused()
    await expect(name).not.toHaveValue('')
    await name.fill('   ')
    await dialog.getByRole('button', { name: 'Criar deck' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Informe um nome')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test('S7 criar deck com rede simulada: progresso, sucesso e anti duplo clique', async ({ page }) => {
    let deckInserts = 0
    await page.route('**/rest/v1/decks*', async (route) => {
      if (route.request().method() === 'POST') {
        deckInserts += 1
        await new Promise((r) => setTimeout(r, 600))
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'e2e-mock-deck', user_id: 'u', name: `${E2E_PREFIX} mock`, language: 'en', created_at: '', updated_at: '' }),
        })
      }
      return route.fulfill({ status: 204, body: '' })
    })
    await page.route('**/rest/v1/deck_cards*', (route) => route.fulfill({ status: 201, contentType: 'application/json', body: '[]' }))
    await openFirstDeck(page)
    await page.getByRole('button', { name: 'Criar meu deck a partir deste' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome do deck').fill(`${E2E_PREFIX} mock`)
    const submit = dialog.getByRole('button', { name: 'Criar deck' })
    await submit.dblclick()
    await expect(dialog.getByRole('heading', { name: 'Deck criado!' })).toBeVisible({ timeout: 20_000 })
    expect(deckInserts).toBe(1)
    await expect(dialog.getByRole('link', { name: 'Abrir deck' })).toHaveAttribute('href', '/decks/e2e-mock-deck')
    await dialog.getByRole('button', { name: 'Continuar aqui' }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('S7b criar deck: erro total mostra alerta e permite tentar novamente', async ({ page }) => {
    await page.route('**/rest/v1/decks*', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'falha simulada' }) })
        : route.continue(),
    )
    await openFirstDeck(page)
    await page.getByRole('button', { name: 'Criar meu deck a partir deste' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Criar deck' }).click()
    await expect(dialog.getByRole('alert')).toContainText('Não foi possível criar o deck')
    await expect(dialog.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  })

  test('S8 criar deck de verdade ([E2E]) e remover em seguida', async ({ page }) => {
    await openFirstDeck(page)
    await page.getByRole('button', { name: 'Criar meu deck a partir deste' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome do deck').fill(`${E2E_PREFIX} ${Date.now()}`)
    await dialog.getByRole('button', { name: 'Criar deck' }).click()
    await expect(dialog.getByRole('heading', { name: 'Deck criado!' })).toBeVisible({ timeout: 60_000 })
    const href = (await dialog.getByRole('link', { name: 'Abrir deck' }).getAttribute('href')) as string
    const deckId = href.split('/').pop() as string
    try {
      await dialog.getByRole('link', { name: 'Abrir deck' }).click()
      await expect(page).toHaveURL(new RegExp(`/decks/${deckId}$`))
    } finally {
      // só apaga se o nome começar com [E2E]
      expect(await deleteE2EDeck(page, deckId)).toBe(true)
    }
  })

  test('S9 coleção indisponível: aviso, sem indicadores de posse e "O que falta" desabilitado', async ({ page }) => {
    await failCollection(page)
    await openFirstDeck(page)
    await expect(page.getByRole('status').filter({ hasText: 'não foi possível carregar sua coleção' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/Possui \d+\/\d+/)).toHaveCount(0)
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Coleção indisponível/ })).toBeDisabled()
  })
})
