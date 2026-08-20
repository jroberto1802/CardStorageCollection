const USD_BRL_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL'
const CACHE_KEY = 'csc-usd-brl-rate'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1h
/** Fallback se a API de cotação falhar */
const FALLBACK_USD_BRL = 5.5

interface CachedRate {
  rate: number
  fetchedAt: number
}

let memoryCache: CachedRate | null = null
let inflight: Promise<number> | null = null

function readLocalCache(): CachedRate | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedRate
    if (
      typeof parsed.rate === 'number' &&
      Number.isFinite(parsed.rate) &&
      parsed.rate > 0 &&
      typeof parsed.fetchedAt === 'number'
    ) {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}

function writeLocalCache(entry: CachedRate) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore
  }
}

function isFresh(entry: CachedRate): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS
}

async function fetchUsdBrlRate(): Promise<number> {
  const response = await fetch(USD_BRL_URL)
  if (!response.ok) {
    throw new Error(`Cotação USD-BRL falhou (${response.status})`)
  }
  const data = (await response.json()) as {
    USDBRL?: { bid?: string; ask?: string }
  }
  const bid = Number.parseFloat(data.USDBRL?.bid ?? '')
  const ask = Number.parseFloat(data.USDBRL?.ask ?? '')
  const rate = Number.isFinite(bid) && bid > 0 ? bid : ask
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('Cotação USD-BRL inválida')
  }
  return rate
}

/**
 * Retorna a cotação USD → BRL (bid), com cache em memória + localStorage.
 */
export async function getUsdBrlRate(): Promise<number> {
  if (memoryCache && isFresh(memoryCache)) {
    return memoryCache.rate
  }

  const local = readLocalCache()
  if (local && isFresh(local)) {
    memoryCache = local
    return local.rate
  }

  if (inflight) return inflight

  inflight = (async () => {
    try {
      const rate = await fetchUsdBrlRate()
      const entry: CachedRate = { rate, fetchedAt: Date.now() }
      memoryCache = entry
      writeLocalCache(entry)
      return rate
    } catch {
      if (local?.rate) {
        memoryCache = local
        return local.rate
      }
      if (memoryCache?.rate) return memoryCache.rate
      return FALLBACK_USD_BRL
    } finally {
      inflight = null
    }
  })()

  return inflight
}
