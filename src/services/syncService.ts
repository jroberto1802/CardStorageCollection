import { supabase } from '@/lib/supabase'
import type { AppLanguage, SyncCardsResponse, SyncLog } from '@/types'

export async function invokeSyncCards(
  language: AppLanguage,
): Promise<SyncCardsResponse> {
  const { data, error } = await supabase.functions.invoke<SyncCardsResponse>(
    'sync-cards',
    {
      body: { language },
    },
  )

  if (error) {
    return { success: false, error: error.message }
  }

  return data ?? { success: false, error: 'Resposta vazia da Edge Function' }
}

export async function fetchLatestSyncLog(): Promise<SyncLog | null> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as SyncLog | null
}

export async function countCards(language: AppLanguage): Promise<number> {
  const { count, error } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('language', language)

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}
