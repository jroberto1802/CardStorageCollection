import fs from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// Credenciais só por ambiente — nunca em arquivo.
export const E2E_EMAIL = process.env.E2E_EMAIL
export const E2E_PASSWORD = process.env.E2E_PASSWORD
export const hasCredentials = Boolean(E2E_EMAIL && E2E_PASSWORD)

/** Marca o teste como skipped sem credenciais. */
export function requireAuth() {
  test.skip(!hasCredentials, 'Defina E2E_EMAIL e E2E_PASSWORD')
}

export const E2E_PREFIX = '[E2E]'

/** Lê VITE_* (chaves públicas do cliente) do ambiente ou de .env.local. Nunca lê credenciais de usuário. */
export function viteVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name]
  try {
    const line = fs
      .readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${name}=`))
    return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, '')
  } catch {
    return undefined
  }
}

/** Primeiro personagem da lista (dados reais): devolve nome e href. */
export async function firstCharacter(page: Page) {
  await page.goto('/characters')
  const link = page.locator('ul a[href^="/characters/"]').first()
  await expect(link).toBeVisible({ timeout: 20_000 })
  const href = (await link.getAttribute('href')) as string
  const name = (await link.locator('h2').innerText()).trim()
  return { name, href }
}

/** Abre a página do primeiro deck (A) do primeiro personagem. */
export async function openFirstDeck(page: Page) {
  const character = await firstCharacter(page)
  await page.goto(character.href)
  const deckLink = page.locator('a[href*="/decks/"]').first()
  await expect(deckLink).toBeVisible({ timeout: 20_000 })
  await deckLink.click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
  return character
}

export function failCollection(page: Page) {
  return page.route('**/rest/v1/collection_items*', (route) => route.abort())
}

/** Lê o access token salvo pelo supabase-js no localStorage da página. */
async function accessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) as string
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          return JSON.parse(localStorage.getItem(key) as string).access_token as string
        } catch {
          return null
        }
      }
    }
    return null
  })
}

/**
 * Remove um deck criado pelo teste. SEGURANÇA: só apaga se o nome começar com "[E2E]";
 * qualquer outro deck é ignorado.
 */
export async function deleteE2EDeck(page: Page, deckId: string) {
  const token = await accessToken(page)
  const base = viteVar('VITE_SUPABASE_URL')
  const anon = viteVar('VITE_SUPABASE_ANON_KEY')
  if (!token || !base || !anon) return false
  const headers = { apikey: anon, Authorization: `Bearer ${token}` }
  const found = await page.request.get(`${base}/rest/v1/decks?id=eq.${deckId}&select=id,name`, { headers })
  if (!found.ok()) return false
  const rows = (await found.json()) as Array<{ id: string; name: string }>
  if (!rows[0]?.name?.startsWith(E2E_PREFIX)) return false
  const removed = await page.request.delete(`${base}/rest/v1/decks?id=eq.${deckId}`, { headers })
  return removed.ok()
}

/**
 * SEGURANÇA (specs que mockam): registre ANTES dos mocks específicos. Qualquer chamada ao REST que não seja GET
 * (inclui RPC POST não mockada, insert/update/delete) é ABORTADA; mocks registrados depois têm precedência.
 */
export async function guardWrites(page: Page) {
  await page.route('**/rest/v1/**', (route) =>
    route.request().method() === 'GET' ? route.continue() : route.abort(),
  )
}
