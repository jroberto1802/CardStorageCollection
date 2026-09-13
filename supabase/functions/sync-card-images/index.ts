import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

const YGO_HOST = 'images.ygoprodeck.com'
const SUPABASE_STORAGE_MARKER = '/storage/v1/object/public/card-images/'
/** Soft limit R2 Free (~10 GB) com margem */
const DEFAULT_R2_SOFT_LIMIT_BYTES = 9 * 1024 * 1024 * 1024
const DEFAULT_BATCH_SIZE = 40
const MAX_BATCH_SIZE = 80
const DOWNLOAD_DELAY_MS = 120
const SCAN_PAGE_SIZE = 200

type AppLanguage = 'en' | 'pt'
type MirrorMode = 'small' | 'full' | 'status'
type ImageFolder = 'small' | 'full'

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

interface R2Config {
  client: AwsClient
  endpoint: string
  bucket: string
  publicBaseUrl: string
  softLimitBytes: number
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

function isYgoUrl(url: string | undefined | null): boolean {
  if (!url) return false
  return url.includes(YGO_HOST)
}

function isSupabaseStorageUrl(url: string | undefined | null): boolean {
  if (!url) return false
  return url.includes(SUPABASE_STORAGE_MARKER)
}

function isR2Url(url: string | undefined | null, publicBaseUrl: string): boolean {
  if (!url) return false
  const base = publicBaseUrl.replace(/\/$/, '')
  return url.startsWith(base)
}

/** Precisa espelhar: YGO ou antigo Storage Supabase (migração). */
function needsMirror(url: string | undefined | null, publicBaseUrl: string): boolean {
  if (!url) return false
  if (isR2Url(url, publicBaseUrl)) return false
  return isYgoUrl(url) || isSupabaseStorageUrl(url)
}

function cardNeedsSmallMirror(card: CardRow, publicBaseUrl: string): boolean {
  return normalizeImages(card.card_images).some((img) => {
    const small = img.image_url_small
    const full = img.image_url
    if (!small || needsMirror(small, publicBaseUrl)) return true
    if (!full || needsMirror(full, publicBaseUrl)) return true
    return false
  })
}

function loadR2Config(): R2Config {
  const accountId = Deno.env.get('R2_ACCOUNT_ID')?.trim()
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')?.trim()
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')?.trim()
  const bucket = Deno.env.get('R2_BUCKET')?.trim()
  const publicBaseUrl = Deno.env.get('R2_PUBLIC_BASE_URL')?.trim()?.replace(/\/$/, '')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error(
      'Secrets R2 ausentes. Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET e R2_PUBLIC_BASE_URL.',
    )
  }

  const softLimitRaw = Deno.env.get('R2_SOFT_LIMIT_BYTES')
  const softLimitBytes = softLimitRaw
    ? Number(softLimitRaw)
    : DEFAULT_R2_SOFT_LIMIT_BYTES

  return {
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: 'auto',
    }),
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    bucket,
    publicBaseUrl,
    softLimitBytes: Number.isFinite(softLimitBytes) && softLimitBytes > 0
      ? softLimitBytes
      : DEFAULT_R2_SOFT_LIMIT_BYTES,
  }
}

function publicObjectUrl(r2: R2Config, folder: ImageFolder, imageId: number): string {
  return `${r2.publicBaseUrl}/${folder}/${imageId}.jpg`
}

/** Fonte YGO estável — usada quando Storage antigo foi esvaziado ou a URL original falha. */
function ygoSourceUrl(folder: ImageFolder, imageId: number): string {
  if (folder === 'small') {
    return `https://${YGO_HOST}/images/cards_small/${imageId}.jpg`
  }
  return `https://${YGO_HOST}/images/cards/${imageId}.jpg`
}

async function objectExists(r2: R2Config, folder: ImageFolder, imageId: number): Promise<boolean> {
  const path = `${folder}/${imageId}.jpg`
  const response = await r2.client.fetch(`${r2.endpoint}/${r2.bucket}/${path}`, {
    method: 'HEAD',
  })
  return response.ok
}

async function downloadImageBytes(
  folder: ImageFolder,
  imageId: number,
  sourceUrl: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const candidates: string[] = []
  const pushUnique = (url: string | undefined | null) => {
    const trimmed = url?.trim()
    if (!trimmed) return
    if (!candidates.includes(trimmed)) candidates.push(trimmed)
  }

  pushUnique(sourceUrl)
  // Storage apagado / URL R2 404 / qualquer falha → cai no YGO
  pushUnique(ygoSourceUrl(folder, imageId))

  let lastError = 'Download falhou'
  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'image/jpeg,image/*,*/*' },
      })
      if (!response.ok) {
        lastError = `Download falhou (${response.status}) para ${url}`
        continue
      }
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (bytes.byteLength < 100) {
        lastError = `Arquivo muito pequeno em ${url}`
        continue
      }
      return {
        bytes,
        contentType: response.headers.get('content-type') ?? 'image/jpeg',
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  throw new Error(lastError)
}

async function ensureUploaded(
  r2: R2Config,
  folder: ImageFolder,
  imageId: number,
  sourceUrl: string,
): Promise<{ url: string; uploaded: boolean; bytes: number }> {
  const publicUrl = publicObjectUrl(r2, folder, imageId)

  if (await objectExists(r2, folder, imageId)) {
    return { url: publicUrl, uploaded: false, bytes: 0 }
  }

  const { bytes, contentType } = await downloadImageBytes(folder, imageId, sourceUrl)
  const path = `${folder}/${imageId}.jpg`

  const upload = await r2.client.fetch(`${r2.endpoint}/${r2.bucket}/${path}`, {
    method: 'PUT',
    body: bytes,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })

  if (!upload.ok) {
    const detail = await upload.text().catch(() => '')
    throw new Error(
      `Upload R2 falhou (${upload.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    )
  }

  return { url: publicUrl, uploaded: true, bytes: bytes.byteLength }
}

/** Precisa subir: sem URL, YGO/Storage, ou URL R2 cujo objeto sumiu do bucket. */
async function shouldUploadImage(
  r2: R2Config,
  folder: ImageFolder,
  imageId: number,
  url: string | undefined | null,
): Promise<boolean> {
  if (!url?.trim()) {
    return !(await objectExists(r2, folder, imageId))
  }
  if (needsMirror(url, r2.publicBaseUrl)) return true
  if (isR2Url(url, r2.publicBaseUrl)) {
    return !(await objectExists(r2, folder, imageId))
  }
  return false
}

async function mirrorCardImages(
  admin: SupabaseClient,
  r2: R2Config,
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
      const source = img.image_url_small || img.image_url || ygoSourceUrl('small', img.id)
      if (!(await shouldUploadImage(r2, 'small', img.id, img.image_url_small))) {
        // Garante URL pública R2 no banco mesmo se o objeto já existia
        if (img.image_url_small && isR2Url(img.image_url_small, r2.publicBaseUrl)) {
          skipped += 1
        } else if (await objectExists(r2, 'small', img.id)) {
          next.image_url_small = publicObjectUrl(r2, 'small', img.id)
          changed = true
          mirrored += 1
        } else {
          skipped += 1
        }
        nextImages.push(next)
        continue
      }
      if (storageBytes.value >= r2.softLimitBytes) {
        nextImages.push(next)
        continue
      }
      try {
        const result = await ensureUploaded(r2, 'small', img.id, source)
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
      if (storageBytes.value >= r2.softLimitBytes) {
        nextImages.push(next)
        continue
      }

      // No detalhe: repara full e small (Storage apagado / objeto R2 ausente)
      try {
        let touched = false
        const fullSource = img.image_url || ygoSourceUrl('full', img.id)
        if (await shouldUploadImage(r2, 'full', img.id, img.image_url)) {
          const result = await ensureUploaded(r2, 'full', img.id, fullSource)
          next.image_url = result.url
          storageBytes.value += result.bytes
          mirrored += 1
          touched = true
          await sleep(DOWNLOAD_DELAY_MS)
        } else if (img.image_url && isR2Url(img.image_url, r2.publicBaseUrl)) {
          skipped += 1
        } else if (await objectExists(r2, 'full', img.id)) {
          next.image_url = publicObjectUrl(r2, 'full', img.id)
          mirrored += 1
          touched = true
        }

        const smallSource =
          img.image_url_small || img.image_url || ygoSourceUrl('small', img.id)
        if (await shouldUploadImage(r2, 'small', img.id, img.image_url_small)) {
          const result = await ensureUploaded(r2, 'small', img.id, smallSource)
          next.image_url_small = result.url
          storageBytes.value += result.bytes
          mirrored += 1
          touched = true
          await sleep(DOWNLOAD_DELAY_MS)
        } else if (
          img.image_url_small &&
          isR2Url(img.image_url_small, r2.publicBaseUrl)
        ) {
          // ok
        } else if (await objectExists(r2, 'small', img.id)) {
          next.image_url_small = publicObjectUrl(r2, 'small', img.id)
          mirrored += 1
          touched = true
        }

        if (touched) changed = true
        else if (!img.image_url || !isR2Url(img.image_url, r2.publicBaseUrl)) {
          // nada a fazer
        }
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
  publicBaseUrl: string,
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
      if (cardNeedsSmallMirror(card, publicBaseUrl)) {
        cards.push(card)
        if (cards.length >= batchSize) break
      }
    }

    if (page.length < SCAN_PAGE_SIZE) {
      exhausted = true
      break
    }
  }

  const nextAfterId = cards.length > 0 ? cards[cards.length - 1].id : cursor

  return { cards, nextAfterId, scanned, exhausted }
}

async function countPendingSmallApproximate(
  admin: SupabaseClient,
  language: AppLanguage,
  publicBaseUrl: string,
): Promise<{ pending_small: number | null; sample_scanned: number }> {
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
      if (cardNeedsSmallMirror(row, publicBaseUrl)) pending += 1
    }
    if (data.length < SCAN_PAGE_SIZE) {
      return { pending_small: pending, sample_scanned: scanned }
    }
  }

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

    let r2: R2Config
    try {
      r2 = loadR2Config()
    } catch (err) {
      return jsonResponse(
        {
          success: false,
          error: err instanceof Error ? err.message : 'Config R2 inválida',
        },
        500,
      )
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
    // Contador da sessão (não lista o bucket inteiro a cada request)
    const storageBytes = { value: 0 }
    const nearQuota = false

    if (mode === 'status') {
      const approx = await countPendingSmallApproximate(
        admin,
        language,
        r2.publicBaseUrl,
      )
      return jsonResponse({
        success: true,
        mode: 'status',
        language,
        storage_provider: 'r2',
        storage_bytes: null,
        storage_soft_limit_bytes: r2.softLimitBytes,
        near_quota: nearQuota,
        pending_small: approx.pending_small,
        sample_scanned: approx.sample_scanned,
        message: `Destino: Cloudflare R2 (${r2.bucket})`,
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
      const batch = await collectSmallBatch(
        admin,
        language,
        afterId,
        batchSize,
        r2.publicBaseUrl,
      )
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
      if (storageBytes.value >= r2.softLimitBytes) break

      // Lote (mode=small) e detalhe (mode=full) espelham small + full
      const result = await mirrorCardImages(
        admin,
        r2,
        card,
        'full',
        mode === 'full' ? body.image_id : undefined,
        storageBytes,
      )
      mirrored += result.mirrored
      failed += result.failed
      skipped += result.skipped
      cardsProcessed += 1
      if (result.error) errors.push(result.error)
    }

    const stoppedForQuota = storageBytes.value >= r2.softLimitBytes
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
      storage_provider: 'r2',
      storage_bytes: storageBytes.value,
      storage_soft_limit_bytes: r2.softLimitBytes,
      stopped_for_quota: stoppedForQuota,
      card_images: cardImages,
      errors: errors.length ? errors.slice(0, 5) : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    return jsonResponse({ success: false, error: message }, 500)
  }
})
