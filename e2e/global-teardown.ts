import fs from 'node:fs'
import { STORAGE_STATE } from '../playwright.config'
import { E2E_PREFIX, viteVar } from './helpers'

/**
 * Limpeza global: remove decks de teste esquecidos. Lista os decks do usuário cujo nome
 * começa com "[E2E]" e apaga SOMENTE esses (nunca outros). Usa o token da sessão salva.
 */
export default async function globalTeardown() {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf8')) as {
      origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }>
    }
    const entry = state.origins
      ?.flatMap((origin) => origin.localStorage ?? [])
      .find((item) => item.name.startsWith('sb-') && item.name.endsWith('-auth-token'))
    const token = entry ? (JSON.parse(entry.value).access_token as string | undefined) : undefined
    const base = viteVar('VITE_SUPABASE_URL')
    const anon = viteVar('VITE_SUPABASE_ANON_KEY')
    if (!token || !base || !anon) return

    const headers = { apikey: anon, Authorization: `Bearer ${token}` }
    const listed = await fetch(
      `${base}/rest/v1/decks?name=like.${encodeURIComponent(`${E2E_PREFIX}*`)}&select=id,name`,
      { headers },
    )
    if (!listed.ok) return
    const decks = (await listed.json()) as Array<{ id: string; name: string }>
    for (const deck of decks) {
      if (!deck.name.startsWith(E2E_PREFIX)) continue // dupla checagem
      const res = await fetch(`${base}/rest/v1/decks?id=eq.${deck.id}`, { method: 'DELETE', headers })
      if (!res.ok) console.warn(`[E2E] não foi possível remover o deck ${deck.id} (${res.status})`)
    }
  } catch (err) {
    console.warn('[E2E] limpeza global ignorada:', err instanceof Error ? err.message : err)
  }
}
