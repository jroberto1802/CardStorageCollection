import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const YGO_API_BASE = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'
const PAGE_SIZE = 500
const UPSERT_BATCH_SIZE = 200

type AppLanguage = 'en' | 'pt'

interface YgoCard {
  id: number
  name: string
  type?: string
  frameType?: string
  desc?: string
  atk?: number
  def?: number
  level?: number
  race?: string
  attribute?: string
  archetype?: string
  scale?: number
  linkval?: number
  linkmarkers?: string[]
  ygoprodeck_url?: string
  card_images?: unknown
  card_sets?: unknown
  card_prices?: unknown
  banlist_info?: unknown
}

interface YgoResponse {
  data?: YgoCard[]
  error?: string
  meta?: {
    rows_remaining?: number
    next_page_offset?: number
    total_rows?: number
  }
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

const STORAGE_PUBLIC_MARKER = '/storage/v1/object/public/card-images/'

interface CardImageRow {
  id?: number
  image_url?: string
  image_url_small?: string
  image_url_cropped?: string
  [key: string]: unknown
}

function isHostedImageUrl(url: string | undefined | null): boolean {
  if (!url) return false
  return url.includes(STORAGE_PUBLIC_MARKER)
}

/** Preserva URLs já espelhadas no Storage para não reintroduzir hotlink YGO. */
function mergeCardImages(incoming: unknown, existing: unknown): unknown {
  if (!Array.isArray(incoming)) return existing ?? incoming
  if (!Array.isArray(existing)) return incoming

  const existingById = new Map<number, CardImageRow>()
  for (const item of existing) {
    if (item && typeof item === 'object' && typeof (item as CardImageRow).id === 'number') {
      existingById.set((item as CardImageRow).id!, item as CardImageRow)
    }
  }

  return (incoming as CardImageRow[]).map((img) => {
    const prev = typeof img.id === 'number' ? existingById.get(img.id) : undefined
    if (!prev) return img
    return {
      ...img,
      image_url: isHostedImageUrl(prev.image_url) ? prev.image_url : img.image_url,
      image_url_small: isHostedImageUrl(prev.image_url_small)
        ? prev.image_url_small
        : img.image_url_small,
      image_url_cropped: isHostedImageUrl(prev.image_url_cropped)
        ? prev.image_url_cropped
        : img.image_url_cropped,
    }
  })
}

function mapCard(card: YgoCard, language: AppLanguage, existingImages?: unknown) {
  const now = new Date().toISOString()
  return {
    id: card.id,
    language,
    name: card.name,
    type: card.type ?? null,
    frame_type: card.frameType ?? null,
    description: card.desc ?? null,
    atk: card.atk ?? null,
    def: card.def ?? null,
    level: card.level ?? null,
    race: card.race ?? null,
    attribute: card.attribute ?? null,
    archetype: card.archetype ?? null,
    scale: card.scale ?? null,
    linkval: card.linkval ?? null,
    linkmarkers: card.linkmarkers ?? null,
    ygoprodeck_url: card.ygoprodeck_url ?? null,
    card_images: mergeCardImages(card.card_images ?? null, existingImages),
    card_sets: card.card_sets ?? null,
    card_prices: card.card_prices ?? null,
    banlist_info: card.banlist_info ?? null,
    synced_at: now,
    updated_at: now,
  }
}

function buildPageUrl(language: AppLanguage, offset: number) {
  const params = new URLSearchParams({
    num: String(PAGE_SIZE),
    offset: String(offset),
  })
  if (language === 'pt') {
    params.set('language', 'pt')
  }
  return `${YGO_API_BASE}?${params.toString()}`
}

async function markSyncError(
  admin: ReturnType<typeof createClient>,
  syncLogId: string,
  message: string,
  cardsSynced: number,
) {
  await admin
    .from('sync_logs')
    .update({
      status: 'error',
      finished_at: new Date().toISOString(),
      error_message: message,
      cards_synced: cardsSynced,
    })
    .eq('id', syncLogId)
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

    let language: AppLanguage = 'en'
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (body?.language === 'pt' || body?.language === 'en') {
        language = body.language
      }
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: syncLog, error: syncLogError } = await admin
      .from('sync_logs')
      .insert({
        user_id: user.id,
        status: 'running',
        language,
      })
      .select('id')
      .single()

    if (syncLogError || !syncLog) {
      return jsonResponse(
        {
          success: false,
          error: syncLogError?.message ?? 'Falha ao criar sync_log',
        },
        500,
      )
    }

    let offset = 0
    let upserted = 0
    let hasMore = true

    while (hasMore) {
      const apiResponse = await fetch(buildPageUrl(language, offset), {
        headers: { Accept: 'application/json' },
      })

      if (!apiResponse.ok) {
        const message = `YGOPRODeck HTTP ${apiResponse.status} (offset ${offset})`
        await markSyncError(admin, syncLog.id, message, upserted)
        return jsonResponse(
          { success: false, error: message, sync_log_id: syncLog.id, cards_synced: upserted },
          502,
        )
      }

      const payload = (await apiResponse.json()) as YgoResponse

      if (payload.error) {
        await markSyncError(admin, syncLog.id, payload.error, upserted)
        return jsonResponse(
          {
            success: false,
            error: payload.error,
            sync_log_id: syncLog.id,
            cards_synced: upserted,
          },
          502,
        )
      }

      const page = payload.data ?? []
      if (page.length === 0) {
        hasMore = false
        break
      }

      const pageIds = page.map((card) => card.id)
      const existingImageByKey = new Map<string, unknown>()
      if (pageIds.length > 0) {
        const { data: existingRows } = await admin
          .from('cards')
          .select('id, language, card_images')
          .eq('language', language)
          .in('id', pageIds)

        for (const row of existingRows ?? []) {
          existingImageByKey.set(`${row.id}:${row.language}`, row.card_images)
        }
      }

      const rows = page.map((card) =>
        mapCard(card, language, existingImageByKey.get(`${card.id}:${language}`)),
      )

      for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
        const batch = rows.slice(i, i + UPSERT_BATCH_SIZE)
        const { error: upsertError } = await admin.from('cards').upsert(batch, {
          onConflict: 'id,language',
        })

        if (upsertError) {
          await markSyncError(admin, syncLog.id, upsertError.message, upserted)
          return jsonResponse(
            {
              success: false,
              error: upsertError.message,
              sync_log_id: syncLog.id,
              cards_synced: upserted,
            },
            500,
          )
        }

        upserted += batch.length
      }

      const remaining = payload.meta?.rows_remaining ?? 0
      if (remaining <= 0 || page.length < PAGE_SIZE) {
        hasMore = false
      } else {
        offset = payload.meta?.next_page_offset ?? offset + PAGE_SIZE
      }

      // Respeita o rate limit da API (20 req/s) com margem segura
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    await admin
      .from('sync_logs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        cards_synced: upserted,
        error_message: null,
      })
      .eq('id', syncLog.id)

    return jsonResponse({
      success: true,
      cards_synced: upserted,
      sync_log_id: syncLog.id,
      language,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado'
    return jsonResponse({ success: false, error: message }, 500)
  }
})
