import { supabase } from '@/lib/supabase'
import type { AppLanguage, SetPrefixOption, SetPrinting } from '@/types'

/** Cache em memória por sessão: o catálogo de impressões só muda em sync (raro). */
const CACHE_TTL_MS = 10 * 60 * 1000
const MAX_CACHE_ENTRIES = 30

interface CacheEntry {
  at: number
  data: SetPrinting[]
}
const printingsCache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<SetPrinting[]>>()

/** Autocompletar: cache curto por consulta (a RPC varre ~200 mil linhas) */
const PREFIX_TTL_MS = 60 * 1000
const prefixCache = new Map<string, { at: number; data: SetPrefixOption[] }>()

export function clearSetPrintingsCache(): void {
  printingsCache.clear()
  inflight.clear()
  prefixCache.clear()
}

/** Cópia: mutar o resultado no chamador não contamina o cache. */
function copyRows<T extends object>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row }))
}

function cacheKey(prefix: string, region: string | null, language: AppLanguage | null): string {
  return `${prefix.toUpperCase()}|${region?.toUpperCase() ?? ''}|${language ?? ''}`
}

function mapPrinting(row: Record<string, unknown>): SetPrinting {
  const price = row.set_price
  return {
    cardId: Number(row.card_id),
    language: row.language as AppLanguage,
    name: String(row.name ?? ''),
    type: (row.type as string | null) ?? null,
    setCode: String(row.set_code),
    setPrefix: (row.set_prefix as string | null) ?? null,
    setRegion: (row.set_region as string | null) ?? null,
    setNumber: (row.set_number as string | null) ?? null,
    setName: String(row.set_name ?? ''),
    setRarity: String(row.set_rarity ?? ''),
    setRarityCode: (row.set_rarity_code as string | null) ?? null,
    setPrice: price == null || price === '' ? null : Number.isFinite(Number(price)) ? Number(price) : null,
    imageUrlSmall: (row.image_url_small as string | null) ?? null,
  }
}

/** Todas as impressões de um set (uma RPC), ordenadas por número. Cacheia por sessão (TTL). */
export async function getSetPrintings(
  prefix: string,
  region: string | null = null,
  language: AppLanguage | null = null,
): Promise<SetPrinting[]> {
  const key = cacheKey(prefix, region, language)
  const hit = printingsCache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return copyRows(hit.data)

  const pending = inflight.get(key)
  if (pending) return pending.then(copyRows)

  const request = (async () => {
    const { data, error } = await supabase.rpc('get_set_printings', {
      p_prefix: prefix.trim(),
      p_region: region,
      p_language: language,
    })
    if (error) throw new Error(error.message)
    const mapped = ((data ?? []) as Record<string, unknown>[]).map(mapPrinting)
    if (printingsCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = printingsCache.keys().next().value
      if (oldest !== undefined) printingsCache.delete(oldest)
    }
    printingsCache.set(key, { at: Date.now(), data: mapped })
    return mapped
  })().finally(() => inflight.delete(key))

  inflight.set(key, request)
  return request.then(copyRows)
}

/** Autocompletar de sets por prefixo ou nome. */
export async function listSetPrefixes(query: string | null, limit = 20): Promise<SetPrefixOption[]> {
  const cleaned = query?.trim() ? query.trim() : null
  const cacheKeyValue = `${(cleaned ?? '').toLowerCase()}|${limit}`
  const cached = prefixCache.get(cacheKeyValue)
  if (cached && Date.now() - cached.at < PREFIX_TTL_MS) return cached.data.map((o) => ({ ...o, regions: [...o.regions] }))
  const { data, error } = await supabase.rpc('list_set_prefixes', {
    p_query: cleaned,
    p_limit: limit,
  })
  if (error) throw new Error(error.message)
  const mapped = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    prefix: String(row.set_prefix),
    regions: (row.regions as string[] | null) ?? [],
    setName: String(row.set_name ?? ''),
    totalCards: Number(row.total_cards ?? 0),
  }))
  if (prefixCache.size >= 100) prefixCache.clear()
  prefixCache.set(cacheKeyValue, { at: Date.now(), data: mapped })
  return mapped.map((o) => ({ ...o, regions: [...o.regions] }))
}
