import { supabase } from '@/lib/supabase'
import {
  computeArtPHash,
  cropArtCanvas,
  rankVisualMatches,
  type FrameRect,
  type PHashHex,
  type VisualMatchCandidate,
} from '@/utils/cardArtHash'
import type { AppLanguage } from '@/types'

const PAGE_SIZE = 1000
const DEFAULT_BATCH_SIZE = 30

let hashIndex: Map<number, PHashHex> | null = null
let loadPromise: Promise<Map<number, PHashHex>> | null = null

export interface CardArtHashSyncResult {
  success: boolean
  processed: number
  synced: number
  failed: number
  skipped: number
  hasMore: boolean
  lastCardId: number
  totalHashes?: number
  error?: string
}

export interface CardArtHashStatus {
  totalHashes: number
  loadedInMemory: boolean
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`))
    img.src = url
  })
}

function hashFromCardImage(img: HTMLImageElement): PHashHex {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, img.naturalWidth)
  canvas.height = Math.max(1, img.naturalHeight)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return '0'.repeat(16)

  ctx.drawImage(img, 0, 0)
  const frame: FrameRect = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
  }
  return computeArtPHash(canvas, frame)
}

async function fetchHashPage(from: number): Promise<{ card_id: number; phash: string }[]> {
  const { data, error } = await supabase
    .from('card_art_hashes')
    .select('card_id, phash')
    .order('card_id', { ascending: true })
    .range(from, from + PAGE_SIZE - 1)

  if (error) throw new Error(error.message)
  return (data ?? []) as { card_id: number; phash: string }[]
}

async function loadHashIndexFromDb(): Promise<Map<number, PHashHex>> {
  const index = new Map<number, PHashHex>()
  let from = 0

  for (;;) {
    const page = await fetchHashPage(from)
    if (page.length === 0) break

    for (const row of page) {
      if (row.phash?.length === 16) {
        index.set(row.card_id, row.phash)
      }
    }

    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return index
}

/** Pré-carrega índice de hashes em background (scanner). */
export function preloadArtHashIndex(): void {
  void ensureHashIndexLoaded().catch(() => {
    // Falha silenciosa — OCR/set code continuam funcionando
  })
}

export function invalidateArtHashIndex(): void {
  hashIndex = null
  loadPromise = null
}

export async function ensureHashIndexLoaded(): Promise<Map<number, PHashHex>> {
  if (hashIndex) return hashIndex
  if (!loadPromise) {
    loadPromise = loadHashIndexFromDb()
      .then((index) => {
        hashIndex = index
        return index
      })
      .catch((err) => {
        loadPromise = null
        throw err
      })
  }
  return loadPromise
}

export async function fetchCardArtHashStatus(): Promise<CardArtHashStatus> {
  const { count, error } = await supabase
    .from('card_art_hashes')
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(error.message)

  return {
    totalHashes: count ?? 0,
    loadedInMemory: Boolean(hashIndex),
  }
}

export async function findVisualMatchesFromFrame(
  source: HTMLCanvasElement,
  frame: FrameRect,
): Promise<{
  visualMatches: VisualMatchCandidate[]
  artPHash: PHashHex | null
  artPreviewUrl: string
}> {
  try {
    const index = await ensureHashIndexLoaded()
    if (index.size === 0) {
      return { visualMatches: [], artPHash: null, artPreviewUrl: '' }
    }

    const artPHash = computeArtPHash(source, frame)
    const artCanvas = cropArtCanvas(source, frame)
    const visualMatches = rankVisualMatches(artPHash, index)

    return {
      visualMatches,
      artPHash,
      artPreviewUrl: artCanvas.toDataURL('image/jpeg', 0.85),
    }
  } catch {
    return { visualMatches: [], artPHash: null, artPreviewUrl: '' }
  }
}

export async function syncCardArtHashesBatch(params: {
  language?: AppLanguage
  afterCardId?: number
  batchSize?: number
}): Promise<CardArtHashSyncResult> {
  const language = params.language ?? 'en'
  const afterCardId = params.afterCardId ?? 0
  const batchSize = params.batchSize ?? DEFAULT_BATCH_SIZE

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, image_url_small')
    .eq('language', language)
    .gt('id', afterCardId)
    .not('image_url_small', 'is', null)
    .order('id', { ascending: true })
    .limit(batchSize)

  if (cardsError) {
    return {
      success: false,
      processed: 0,
      synced: 0,
      failed: 0,
      skipped: 0,
      hasMore: false,
      lastCardId: afterCardId,
      error: cardsError.message,
    }
  }

  const rows = (cards ?? []) as { id: number; image_url_small: string | null }[]
  if (rows.length === 0) {
    const status = await fetchCardArtHashStatus()
    return {
      success: true,
      processed: 0,
      synced: 0,
      failed: 0,
      skipped: 0,
      hasMore: false,
      lastCardId: afterCardId,
      totalHashes: status.totalHashes,
    }
  }

  const cardIds = rows.map((row) => row.id)
  const { data: existingRows, error: existingError } = await supabase
    .from('card_art_hashes')
    .select('card_id')
    .in('card_id', cardIds)

  if (existingError) {
    return {
      success: false,
      processed: 0,
      synced: 0,
      failed: 0,
      skipped: 0,
      hasMore: false,
      lastCardId: afterCardId,
      error: existingError.message,
    }
  }

  const existing = new Set(
    ((existingRows ?? []) as { card_id: number }[]).map((row) => row.card_id),
  )

  let synced = 0
  let failed = 0
  let skipped = 0
  let lastCardId = afterCardId

  for (const row of rows) {
    lastCardId = row.id

    if (existing.has(row.id)) {
      skipped += 1
      continue
    }

    const imageUrl = row.image_url_small?.trim()
    if (!imageUrl) {
      skipped += 1
      continue
    }

    try {
      const img = await loadImage(imageUrl)
      const phash = hashFromCardImage(img)

      const { error: upsertError } = await supabase
        .from('card_art_hashes')
        .upsert({ card_id: row.id, phash, synced_at: new Date().toISOString() })

      if (upsertError) {
        failed += 1
        continue
      }

      synced += 1
      if (hashIndex) {
        hashIndex.set(row.id, phash)
      }
    } catch {
      failed += 1
    }
  }

  const status = await fetchCardArtHashStatus()

  return {
    success: true,
    processed: rows.length,
    synced,
    failed,
    skipped,
    hasMore: rows.length >= batchSize,
    lastCardId,
    totalHashes: status.totalHashes,
  }
}
