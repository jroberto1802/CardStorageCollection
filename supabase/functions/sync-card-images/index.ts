import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const BUCKET = 'card-images'
const YGO_HOST = 'images.ygoprodeck.com'
const STORAGE_SOFT_LIMIT_BYTES = 900 * 1024 * 1024 // ~900 MB — margem no Free (1 GB)
const DEFAULT_BATCH_SIZE = 40
const MAX_BATCH_SIZE = 80
const DOWNLOAD_DELAY_MS = 120
const SCAN_PAGE_SIZE = 200

type AppLanguage = 'en' | 'pt'
type MirrorMode = 'small' | 'full' | 'status'

interface CardImage {
  id: number
  image_url?: string
  image_url_small?: string
  image_url_cropped?: string
  [key: string]: unknown
}

interface CardRow {
  id: number
  language: AppLanguage
  card_images: CardImage[] | null
}

interface RequestBody {
  mode?: MirrorMode
  language?: AppLanguage
  batch_size?: number
  card_id?: number
  image_id?: number
  after_id?: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isYgoUrl(url: string | undefined | null): boolean {
  if (!url) return false
  return url.includes(YGO_HOST)
}

function publicObjectUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeImages(value: unknown): CardImage[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is CardImage =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as CardImage).id === 'number',
  )
}

function cardNeedsSmallMirror(card: CardRow): boolean {
  return normalizeImages(card.card_images).some((img) => isYgoUrl(img.image_url_small))
}

async function estimateStorageBytes(admin: SupabaseClient): Promise<number> {
  let total = 0
  for (const folder of ['small', 'full'] as const) {
    let offset = 0
    for (;;) {
      const { data, error } = await admin.storage.from(BUCKET).list(folder, {
        limit: 1000,
        offset,
      })
      if (error || !data || data.length === 0) break
      for (const item of data) {
        total += item.metadata?.size ?? 0
      }
      if (data.length < 1000) break
      offset += 1000
    }
  }
  return total
}

async function objectExists(
  admin: SupabaseClient,
  folder: 'small' | 'full',
  fileName: string,
): Promise<boolean> {
  const { data, error } = await admin.storage.from(BUCKET).list(folder, {
    search: fileName,
    limit: 20,
  })
  if (error || !data) return false
  return data.some((item) => item.name === fileName)
}

async function ensureUploaded(
  admin: SupabaseClient,
  supabaseUrl: string,
  folder: 'small' | 'full',
  imageId: number,
  sourceUrl: string,
): Promise<{ url: string; uploaded: boolean; bytes: number }> {
  const fileName = `${imageId}.jpg`
  const path = `${folder}/${fileName}`
  const publicUrl = publicObjectUrl(supabaseUrl, path)

  if (await objectExists(admin, folder, fileName)) {
    return { url: publicUrl, uploaded: false, bytes: 0 }
  }

  const response = await fetch(sourceUrl, {
    headers: { Accept: 'image/jpeg,image/*,*/*' },
  })
  if (!response.ok) {
    throw new Error(`Download falhou (${response.status}) para ${sourceUrl}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') ?? 'image/jpeg'

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  })

  if (uploadError) {
    if (/already exists/i.test(uploadError.message)) {
      return { url: publicUrl, uploaded: false, bytes: 0 }
    }
    throw new Error(uploadError.message)
  }

  return { url: publicUrl, uploaded: true, bytes: bytes.byteLength }
}

async function mirrorCardImages(
  admin: SupabaseClient,
  supabaseUrl: string,
  card: CardRow,
  mode: 'small' | 'full',
  imageId: number | undefined,
  storageBytes: { value: number },
): Promise<{ mirrored: number; skipped: number; failed: number; updated: boolean; error?: string }> {
  const images = normalizeImages(card.card_images)
  if (images.length === 0) {
    return { mirrored: 0, skipped: 0, failed: 0, updated: false }
  }

  let mirrored = 0
  let skipped = 0
  let failed = 0
  let changed = false
  const nextImages: CardImage[] = []

  for (const img of images) {
    const next = { ...img }

    if (mode === 'small') {
      if (!isYgoUrl(img.image_url_small)) {
        skipped += 1
        nextImages.push(next)
        continue
      }
      if (storageBytes.value >= STORAGE_SOFT_LIMIT_BYTES) {
        nextImages.push(next)
        continue
      }
      try {
        const result = await ensureUploaded(
          admin,
          supabaseUrl,
          'small',
          img.id,
          img.image_url_small!,
        )
        next.image_url_small = result.url
        storageBytes.value += result.bytes
        mirrored += 1
        changed = true
        await sleep(DOWNLOAD_DELAY_MS)
      } catch {
        failed += 1
      }
    } else {
      if (imageId != null && img.id !== imageId) {
        nextImages.push(next)
        continue
      }
      if (!isYgoUrl(img.image_url)) {
        skipped += 1
        nextImages.push(next)
        continue
      }
      if (storageBytes.value >= STORAGE_SOFT_LIMIT_BYTES) {
        nextImages.push(next)
        continue
      }
      try {
        const result = await ensureUploaded(
          admin,
          supabaseUrl,
          'full',
          img.id,
          img.image_url!,
        )
        next.image_url = result.url
        storageBytes.value += result.bytes
        mirrored += 1
        changed = true
        await sleep(DOWNLOAD_DELAY_MS)
      } catch {
        failed += 1
      }
    }

    nextImages.push(next)
  }

  if (changed) {
    const { error } = await admin
      .from('cards')
      .update({
        card_images: nextImages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', card.id)
      .eq('language', card.language)

    if (error) {
      return {
        mirrored,
        skipped,
        failed: failed + 1,
        updated: false,
        error: error.message,
      }
    }
  }

  return { mirrored, skipped, failed, updated: changed }
}

async function collectSmallBatch(
  admin: SupabaseClient,
  language: AppLanguage,
  afterId: number,
  batchSize: number,
): Promise<{ cards: CardRow[]; nextAfterId: number; scanned: number; exhausted: boolean }> {
  const cards: CardRow[] = []
  let cursor = afterId
  let scanned = 0
  let exhausted = false

  while (cards.length < batchSize) {
    const { data, error } = await admin
      .from('cards')
      .select('id, language, card_images')
      .eq('language', language)
      .not('card_images', 'is', null)
      .gt('id', cursor)
      .order('id', { ascending: true })
      .limit(SCAN_PAGE_SIZE)

    if (error) {
      throw new Error(error.message)
    }

    const page = (data ?? []) as CardRow[]
    if (page.length === 0) {
      exhausted = true
      break
    }

    scanned += page.length
    cursor = page[page.length - 1].id

    for (const card of page) {
      if (cardNeedsSmallMirror(card)) {
        cards.push(card)
        if (cards.length >= batchSize) break
      }
    }

    if (page.length < SCAN_PAGE_SIZE) {
      exhausted = true
      break
    }
  }

  const nextAfterId =
    cards.length > 0 ? cards[cards.length - 1].id : cursor

  return { cards, nextAfterId, scanned, exhausted }
}

async function countPendingSmallApproximate(
  admin: SupabaseClient,
  language: AppLanguage,
): Promise<{ pending_small: number | null; sample_scanned: number }> {
  // Amostra as primeiras páginas para dar feedback na UI sem varrer 14k linhas.
  let pending = 0
  let scanned = 0
  let cursor = 0

  for (let i = 0; i < 10; i += 1) {
    const { data, error } = await admin
      .from('cards')
      .select('id, card_images')
      .eq('language', language)
      .not('card_images', 'is', null)
      .gt('id', cursor)
      .order('id', { ascending: true })
      .limit(SCAN_PAGE_SIZE)

    if (error || !data || data.length === 0) break
    scanned += data.length
    cursor = data[data.length - 1].id as number
    for (const row of data as CardRow[]) {
      if (cardNeedsSmallMirror(row)) pending += 1
    }
    if (data.length < SCAN_PAGE_SIZE) {
      return { pending_small: pending, sample_scanned: scanned }
    }
  }

  // Ainda há mais páginas — retorna null para a UI mostrar "muitas pendentes"
  return { pending_small: pending > 0 ? null : 0, sample_scanned: scanned }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse(
        { success: false, error: 'Variáveis de ambiente do Supabase ausentes' },
        500,
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Não autenticado' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ success: false, error: 'Sessão inválida' }, 401)
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody
    const mode: MirrorMode = body.mode ?? 'small'
    const language: AppLanguage =
      body.language === 'pt' || body.language === 'en' ? body.language : 'en'
    const batchSize = Math.min(
      MAX_BATCH_SIZE,
      Math.max(1, body.batch_size ?? DEFAULT_BATCH_SIZE),
    )
    const afterId = typeof body.after_id === 'number' && body.after_id > 0 ? body.after_id : 0

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const storageBytes = { value: await estimateStorageBytes(admin) }
    const nearQuota = storageBytes.value >= STORAGE_SOFT_LIMIT_BYTES

    if (mode === 'status') {
      const approx = await countPendingSmallApproximate(admin, language)
      return jsonResponse({
        success: true,
        mode: 'status',
        language,
        storage_bytes: storageBytes.value,
        storage_soft_limit_bytes: STORAGE_SOFT_LIMIT_BYTES,
        near_quota: nearQuota,
        pending_small: approx.pending_small,
        sample_scanned: approx.sample_scanned,
      })
    }

    if (nearQuota) {
      return jsonResponse({
        success: true,
        mode,
        language,
        mirrored: 0,
        failed: 0,
        skipped: 0,
        cards_processed: 0,
        has_more: false,
        after_id: afterId,
        storage_bytes: storageBytes.value,
        storage_soft_limit_bytes: STORAGE_SOFT_LIMIT_BYTES,
        stopped_for_quota: true,
        message:
          'Limite soft de Storage (~900 MB) atingido. Pare para não estourar o Free (1 GB).',
      })
    }

    let cards: CardRow[] = []
    let nextAfterId = afterId
    let exhausted = false

    if (mode === 'full') {
      if (body.card_id == null) {
        return jsonResponse(
          { success: false, error: 'Para mode=full informe card_id' },
          400,
        )
      }

      const { data, error } = await admin
        .from('cards')
        .select('id, language, card_images')
        .eq('id', body.card_id)
        .eq('language', language)
        .maybeSingle()

      if (error) {
        return jsonResponse({ success: false, error: error.message }, 500)
      }
      if (!data) {
        return jsonResponse({ success: false, error: 'Carta não encontrada' }, 404)
      }
      cards = [data as CardRow]
      nextAfterId = cards[0].id
      exhausted = true
    } else if (mode === 'small') {
      const batch = await collectSmallBatch(admin, language, afterId, batchSize)
      cards = batch.cards
      nextAfterId = batch.nextAfterId
      exhausted = batch.exhausted
    } else {
      return jsonResponse({ success: false, error: 'mode inválido' }, 400)
    }

    let mirrored = 0
    let failed = 0
    let skipped = 0
    let cardsProcessed = 0
    const errors: string[] = []

    for (const card of cards) {
      if (storageBytes.value >= STORAGE_SOFT_LIMIT_BYTES) break

      const result = await mirrorCardImages(
        admin,
        supabaseUrl,
        card,
        mode === 'full' ? 'full' : 'small',
        body.image_id,
        storageBytes,
      )
      mirrored += result.mirrored
      failed += result.failed
      skipped += result.skipped
      cardsProcessed += 1
      if (result.error) errors.push(result.error)
    }

    const stoppedForQuota = storageBytes.value >= STORAGE_SOFT_LIMIT_BYTES
    // Continua enquanto a varredura do catálogo não chegou ao fim e há cota
    const hasMore = mode === 'small' && !stoppedForQuota && !exhausted

    let cardImages: CardImage[] | undefined
    if (mode === 'full' && cards[0]) {
      const { data } = await admin
        .from('cards')
        .select('card_images')
        .eq('id', cards[0].id)
        .eq('language', cards[0].language)
        .maybeSingle()
      cardImages = normalizeImages(data?.card_images)
    }

    return jsonResponse({
      success: true,
      mode,
      language,
      mirrored,
      failed,
      skipped,
      cards_processed: cardsProcessed,
      has_more: hasMore,
      after_id: nextAfterId,
      storage_bytes: storageBytes.value,
      storage_soft_limit_bytes: STORAGE_SOFT_LIMIT_BYTES,
      stopped_for_quota: stoppedForQuota,
      card_images: cardImages,
      errors: errors.length ? errors.slice(0, 5) : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    return jsonResponse({ success: false, error: message }, 500)
  }
})
