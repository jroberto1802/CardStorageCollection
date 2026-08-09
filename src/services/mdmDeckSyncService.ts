import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AppLanguage, DeckSyncRun, MdmDeckSyncResponse } from '@/types'

async function extractInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body && typeof body === 'object') {
        const msg =
          (body as { error?: string; message?: string }).error ??
          (body as { message?: string }).message
        if (msg) return msg
      }
    } catch {
      try {
        const text = await error.context.text()
        if (text) return text.slice(0, 500)
      } catch {
        // ignore
      }
    }
  }

  if (error instanceof Error && error.message) return error.message
  return 'Edge Function retornou erro'
}

async function invokeMdmDeckSync(
  body: Record<string, unknown>,
): Promise<MdmDeckSyncResponse> {
  const { data, error } = await supabase.functions.invoke<MdmDeckSyncResponse>(
    'sync-mdm-decks',
    { body },
  )

  if (error) {
    const detail = await extractInvokeError(error)
    // Se o body JSON veio em data mesmo com status não-2xx, preferir
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      return {
        ...data,
        success: false,
        error: String(data.error),
        retryable: Boolean((data as MdmDeckSyncResponse).retryable),
      }
    }
    return { success: false, error: detail }
  }

  return data ?? { success: false, error: 'Resposta vazia da Edge Function' }
}

export async function startMdmDeckSync(params: {
  language: AppLanguage
  batchSize?: number
  forceRestart?: boolean
}): Promise<MdmDeckSyncResponse> {
  return invokeMdmDeckSync({
    mode: 'start',
    language: params.language,
    batch_size: params.batchSize ?? 25,
    force_restart: params.forceRestart ?? false,
  })
}

export async function processMdmDeckSyncBatch(params: {
  runId: string
}): Promise<MdmDeckSyncResponse> {
  return invokeMdmDeckSync({
    mode: 'process',
    run_id: params.runId,
  })
}

export async function cancelMdmDeckSync(params: {
  runId?: string
}): Promise<MdmDeckSyncResponse> {
  return invokeMdmDeckSync({
    mode: 'cancel',
    run_id: params.runId,
  })
}

export async function fetchMdmDeckSyncStatus(params?: {
  runId?: string
}): Promise<MdmDeckSyncResponse> {
  return invokeMdmDeckSync({
    mode: 'status',
    run_id: params?.runId,
  })
}

export async function fetchMdmDeckSyncHistory(
  limit = 10,
): Promise<MdmDeckSyncResponse> {
  return invokeMdmDeckSync({
    mode: 'history',
    history_limit: limit,
  })
}

export function deckSyncProgressPercent(run: DeckSyncRun | null | undefined): number {
  if (!run) return 0
  const total = run.total_estimated && run.total_estimated > 0
    ? run.total_estimated
    : run.processed > 0
      ? run.processed
      : 0
  if (total <= 0) return run.status === 'COMPLETED' ? 100 : 0
  return Math.min(100, Math.round((run.processed / total) * 100))
}
