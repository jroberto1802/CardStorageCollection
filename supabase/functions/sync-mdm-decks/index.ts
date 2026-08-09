import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  buildDeckUpsertPayload,
  buildNameLookup,
  collectUniqueCardNames,
  computeBatchOutcome,
  fetchWithRetry,
  mdmTopDecksUrl,
  normalizeMdmDeckList,
  resolveDeckCards,
  type MdmDeck,
} from './logic.ts'

type AppLanguage = 'en' | 'pt'
type Mode = 'start' | 'process' | 'status' | 'cancel' | 'history'

interface RequestBody {
  mode?: Mode
  language?: AppLanguage
  run_id?: string
  batch_size?: number
  force_restart?: boolean
  history_limit?: number
}

interface DeckSyncRunRow {
  id: string
  user_id: string
  status: string
  language: AppLanguage
  started_at: string
  finished_at: string | null
  total_estimated: number | null
  processed: number
  created_count: number
  updated_count: number
  error_count: number
  missing_card_events: number
  last_skip: number
  batch_size: number
  cancel_requested: boolean
  error_message: string | null
  last_errors: unknown
}

const DEFAULT_BATCH_SIZE = 25
const MAX_BATCH_SIZE = 50
const MDM_DELAY_MS = 200
const NAME_PAGE_SIZE = 1000

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

function clampBatchSize(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_BATCH_SIZE
  return Math.min(MAX_BATCH_SIZE, Math.max(1, Math.floor(n)))
}

function mapRun(row: DeckSyncRunRow) {
  return {
    id: row.id,
    status: row.status,
    language: row.language,
    started_at: row.started_at,
    finished_at: row.finished_at,
    total_estimated: row.total_estimated,
    processed: row.processed,
    created_count: row.created_count,
    updated_count: row.updated_count,
    error_count: row.error_count,
    missing_card_events: row.missing_card_events,
    last_skip: row.last_skip,
    batch_size: row.batch_size,
    cancel_requested: row.cancel_requested,
    error_message: row.error_message,
    last_errors: row.last_errors,
  }
}

async function loadCardNameLookup(
  admin: SupabaseClient,
  preferredLanguage: AppLanguage,
) {
  const rows: Array<{ id: number; name: string; language: AppLanguage }> = []

  for (const lang of ['en', 'pt'] as const) {
    for (let from = 0; ; from += NAME_PAGE_SIZE) {
      const to = from + NAME_PAGE_SIZE - 1
      const { data, error } = await admin
        .from('cards')
        .select('id, name, language')
        .eq('language', lang)
        .order('id', { ascending: true })
        .range(from, to)

      if (error) throw new Error(error.message)
      const page = (data ?? []) as Array<{
        id: number
        name: string
        language: AppLanguage
      }>
      rows.push(...page)
      if (page.length < NAME_PAGE_SIZE) break
    }
  }

  return buildNameLookup(rows, preferredLanguage)
}

function formatDbError(message: string): string {
  if (/relation .* does not exist/i.test(message) || /deck_sync_runs/i.test(message)) {
    return `${message} — aplique a migration 005_mdm_deck_sync.sql no SQL Editor do Supabase.`
  }
  return message
}

async function findActiveRun(
  admin: SupabaseClient,
  userId: string,
): Promise<DeckSyncRunRow | null> {
  const { data, error } = await admin
    .from('deck_sync_runs')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['PENDING', 'RUNNING'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as DeckSyncRunRow | null) ?? null
}

async function getRun(
  admin: SupabaseClient,
  userId: string,
  runId?: string,
): Promise<DeckSyncRunRow | null> {
  if (runId) {
    const { data, error } = await admin
      .from('deck_sync_runs')
      .select('*')
      .eq('id', runId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data as DeckSyncRunRow | null) ?? null
  }

  const { data, error } = await admin
    .from('deck_sync_runs')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as DeckSyncRunRow | null) ?? null
}

async function upsertOneDeck(
  admin: SupabaseClient,
  deck: MdmDeck,
  language: AppLanguage,
  lookup: Map<string, { id: number; language: AppLanguage }>,
): Promise<{ created: boolean; missing: number }> {
  const { rows, missingCount } = resolveDeckCards(deck, lookup)
  const payload = buildDeckUpsertPayload(deck, language, missingCount)
  if (!payload) throw new Error('Deck MDM sem _id')

  const { data: existing, error: existingError } = await admin
    .from('synced_decks')
    .select('id')
    .eq('source', 'mdm')
    .eq('external_id', payload.external_id)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  let deckId: string
  let created = false

  if (existing?.id) {
    const { data: updated, error: updateError } = await admin
      .from('synced_decks')
      .update({
        name: payload.name,
        author_name: payload.author_name,
        author_external_id: payload.author_external_id,
        deck_type: payload.deck_type,
        ranked_type: payload.ranked_type,
        source_url: payload.source_url,
        source_created_at: payload.source_created_at,
        language: payload.language,
        missing_card_count: payload.missing_card_count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id')
      .single()

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? 'Falha ao atualizar deck')
    }
    deckId = updated.id as string
  } else {
    const { data: inserted, error: insertError } = await admin
      .from('synced_decks')
      .insert(payload)
      .select('id')
      .single()

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? 'Falha ao criar deck')
    }
    deckId = inserted.id as string
    created = true
  }

  const { error: deleteError } = await admin
    .from('synced_deck_cards')
    .delete()
    .eq('deck_id', deckId)

  if (deleteError) throw new Error(deleteError.message)

  if (rows.length > 0) {
    const cardRows = rows.map((row) => ({
      deck_id: deckId,
      card_id: row.card_id,
      language: row.language,
      zone: row.zone,
      quantity: row.quantity,
      mdm_card_id: row.mdm_card_id,
      mdm_card_name: row.mdm_card_name,
      mdm_rarity: row.mdm_rarity,
    }))

    const { error: cardsError } = await admin
      .from('synced_deck_cards')
      .insert(cardRows)

    if (cardsError) throw new Error(cardsError.message)
  }

  return { created, missing: missingCount }
}

async function handleStart(
  admin: SupabaseClient,
  userId: string,
  language: AppLanguage,
  batchSize: number,
  forceRestart: boolean,
) {
  const active = await findActiveRun(admin, userId)

  if (active && !forceRestart) {
    if (active.cancel_requested) {
      await admin
        .from('deck_sync_runs')
        .update({ cancel_requested: false, status: 'RUNNING' })
        .eq('id', active.id)
      active.cancel_requested = false
      active.status = 'RUNNING'
    }

    return jsonResponse({
      success: true,
      mode: 'start',
      resumed: true,
      run: mapRun(active),
      has_more: true,
    })
  }

  if (active && forceRestart) {
    await admin
      .from('deck_sync_runs')
      .update({
        status: 'CANCELLED',
        finished_at: new Date().toISOString(),
        cancel_requested: true,
        error_message: 'Substituído por nova sincronização',
      })
      .eq('id', active.id)
  }

  const { data, error } = await admin
    .from('deck_sync_runs')
    .insert({
      user_id: userId,
      status: 'RUNNING',
      language,
      batch_size: batchSize,
      last_skip: 0,
      processed: 0,
      created_count: 0,
      updated_count: 0,
      error_count: 0,
      missing_card_events: 0,
      cancel_requested: false,
      last_errors: [],
    })
    .select('*')
    .single()

  if (error || !data) {
    return jsonResponse({
      success: false,
      error: formatDbError(error?.message ?? 'Falha ao criar run'),
    })
  }

  return jsonResponse({
    success: true,
    mode: 'start',
    resumed: false,
    run: mapRun(data as DeckSyncRunRow),
    has_more: true,
  })
}

async function handleProcess(
  admin: SupabaseClient,
  userId: string,
  runId: string | undefined,
) {
  const run = runId
    ? await getRun(admin, userId, runId)
    : await findActiveRun(admin, userId)

  if (!run) {
    return jsonResponse({ success: false, error: 'Nenhuma sincronização ativa' })
  }

  if (run.status === 'CANCELLED' || run.cancel_requested) {
    const finished = {
      status: 'CANCELLED',
      finished_at: new Date().toISOString(),
      cancel_requested: true,
    }
    await admin.from('deck_sync_runs').update(finished).eq('id', run.id)
    return jsonResponse({
      success: true,
      mode: 'process',
      has_more: false,
      run: mapRun({ ...run, ...finished }),
      message: 'Sincronização cancelada',
    })
  }

  if (run.status === 'COMPLETED' || run.status === 'FAILED') {
    return jsonResponse({
      success: true,
      mode: 'process',
      has_more: false,
      run: mapRun(run),
    })
  }

  await sleep(MDM_DELAY_MS)

  const url = mdmTopDecksUrl(run.last_skip, run.batch_size)
  let decks: MdmDeck[] = []

  try {
    const response = await fetchWithRetry(url, {
      maxAttempts: 3,
      baseDelayMs: 500,
      sleepImpl: sleep,
    })

    if (!response.ok) {
      const message = `MDM HTTP ${response.status}`
      if (response.status === 429 || response.status >= 500) {
        await admin
          .from('deck_sync_runs')
          .update({
            error_count: run.error_count + 1,
            last_errors: [
              ...((Array.isArray(run.last_errors) ? run.last_errors : []) as unknown[]),
              message,
            ].slice(-20),
          })
          .eq('id', run.id)

        return jsonResponse({
          success: false,
          retryable: true,
          error: message,
          run: mapRun(run),
        })
      }

      await admin
        .from('deck_sync_runs')
        .update({
          status: 'FAILED',
          finished_at: new Date().toISOString(),
          error_message: message,
        })
        .eq('id', run.id)

      return jsonResponse({ success: false, error: message })
    }

    const payload = await response.json()
    decks = normalizeMdmDeckList(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha de rede MDM'
    await admin
      .from('deck_sync_runs')
      .update({
        error_count: run.error_count + 1,
        last_errors: [
          ...((Array.isArray(run.last_errors) ? run.last_errors : []) as unknown[]),
          message,
        ].slice(-20),
      })
      .eq('id', run.id)

    return jsonResponse({
      success: false,
      retryable: true,
      error: message,
      run: mapRun(run),
    })
  }

  // Re-check cancel after network
  const fresh = await getRun(admin, userId, run.id)
  if (fresh?.cancel_requested) {
    const finished = {
      status: 'CANCELLED' as const,
      finished_at: new Date().toISOString(),
      cancel_requested: true,
    }
    await admin.from('deck_sync_runs').update(finished).eq('id', run.id)
    return jsonResponse({
      success: true,
      mode: 'process',
      has_more: false,
      run: mapRun({ ...run, ...finished }),
      message: 'Sincronização cancelada',
    })
  }

  let created = 0
  let updated = 0
  let errors = 0
  let missingEvents = 0
  const batchErrors: string[] = []

  if (decks.length > 0) {
    collectUniqueCardNames(decks)
    const lookup = await loadCardNameLookup(admin, run.language)

    for (const deck of decks) {
      try {
        const result = await upsertOneDeck(admin, deck, run.language, lookup)
        if (result.created) created += 1
        else updated += 1
        missingEvents += result.missing
      } catch (err) {
        errors += 1
        batchErrors.push(
          `${deck._id ?? '?'}: ${err instanceof Error ? err.message : 'erro'}`,
        )
      }
    }
  }

  const outcome = computeBatchOutcome({
    created,
    updated,
    errors,
    missingCardEvents: missingEvents,
    processedDelta: decks.length,
    previousProcessed: run.processed,
    previousCreated: run.created_count,
    previousUpdated: run.updated_count,
    previousErrors: run.error_count,
    previousMissing: run.missing_card_events,
    previousSkip: run.last_skip,
    batchSize: run.batch_size,
    fetchedCount: decks.length,
    cancelRequested: false,
  })

  const totalEstimated = outcome.has_more
    ? Math.max(run.total_estimated ?? 0, outcome.processed + run.batch_size)
    : outcome.processed

  const patch = {
    status: outcome.status,
    processed: outcome.processed,
    created_count: outcome.created_count,
    updated_count: outcome.updated_count,
    error_count: outcome.error_count,
    missing_card_events: outcome.missing_card_events,
    last_skip: outcome.last_skip,
    total_estimated: totalEstimated,
    finished_at:
      outcome.status === 'RUNNING' ? null : new Date().toISOString(),
    last_errors: [
      ...((Array.isArray(run.last_errors) ? run.last_errors : []) as unknown[]),
      ...batchErrors,
    ].slice(-30),
  }

  const { data: saved, error: saveError } = await admin
    .from('deck_sync_runs')
    .update(patch)
    .eq('id', run.id)
    .select('*')
    .single()

  if (saveError || !saved) {
    return jsonResponse({
      success: false,
      error: formatDbError(saveError?.message ?? 'Falha ao salvar progresso'),
    })
  }

  return jsonResponse({
    success: true,
    mode: 'process',
    has_more: outcome.has_more,
    batch: {
      fetched: decks.length,
      created,
      updated,
      errors,
      missing_card_events: missingEvents,
    },
    run: mapRun(saved as DeckSyncRunRow),
  })
}

async function handleCancel(
  admin: SupabaseClient,
  userId: string,
  runId?: string,
) {
  const run = runId
    ? await getRun(admin, userId, runId)
    : await findActiveRun(admin, userId)

  if (!run) {
    return jsonResponse({ success: false, error: 'Nenhuma sincronização ativa' })
  }

  const { data, error } = await admin
    .from('deck_sync_runs')
    .update({ cancel_requested: true })
    .eq('id', run.id)
    .select('*')
    .single()

  if (error || !data) {
    return jsonResponse({
      success: false,
      error: formatDbError(error?.message ?? 'Falha ao cancelar'),
    })
  }

  return jsonResponse({
    success: true,
    mode: 'cancel',
    run: mapRun(data as DeckSyncRunRow),
    message: 'Cancelamento solicitado; encerra no próximo lote',
  })
}

async function handleHistory(
  admin: SupabaseClient,
  userId: string,
  limit: number,
) {
  const { data, error } = await admin
    .from('deck_sync_runs')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)))

  if (error) {
    return jsonResponse({
      success: false,
      error: formatDbError(error.message),
    })
  }

  return jsonResponse({
    success: true,
    mode: 'history',
    runs: ((data ?? []) as DeckSyncRunRow[]).map(mapRun),
  })
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
    const mode: Mode = body.mode ?? 'status'
    const language: AppLanguage =
      body.language === 'pt' || body.language === 'en' ? body.language : 'en'
    const batchSize = clampBatchSize(body.batch_size)
    const admin = createClient(supabaseUrl, serviceRoleKey)

    if (mode === 'start') {
      return await handleStart(
        admin,
        user.id,
        language,
        batchSize,
        Boolean(body.force_restart),
      )
    }

    if (mode === 'process') {
      return await handleProcess(admin, user.id, body.run_id)
    }

    if (mode === 'cancel') {
      return await handleCancel(admin, user.id, body.run_id)
    }

    if (mode === 'history') {
      return await handleHistory(admin, user.id, body.history_limit ?? 10)
    }

    const run = await getRun(admin, user.id, body.run_id)
    return jsonResponse({
      success: true,
      mode: 'status',
      run: run ? mapRun(run) : null,
    })
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Erro interno'
    return jsonResponse({
      success: false,
      error: formatDbError(raw),
    })
  }
})
