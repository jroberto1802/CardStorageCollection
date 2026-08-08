import { supabase } from '@/lib/supabase'
import type {
  AppLanguage,
  SyncCardImagesResponse,
  SyncCardImagesStatus,
} from '@/types'

export async function fetchImageSyncStatus(
  language: AppLanguage,
): Promise<SyncCardImagesStatus> {
  const { data, error } = await supabase.functions.invoke<SyncCardImagesStatus>(
    'sync-card-images',
    {
      body: { mode: 'status', language },
    },
  )

  if (error) {
    return { success: false, error: error.message }
  }

  return data ?? { success: false, error: 'Resposta vazia da Edge Function' }
}

export async function invokeSyncCardImagesSmall(params: {
  language: AppLanguage
  afterId?: number
  batchSize?: number
}): Promise<SyncCardImagesResponse> {
  const { data, error } = await supabase.functions.invoke<SyncCardImagesResponse>(
    'sync-card-images',
    {
      body: {
        mode: 'small',
        language: params.language,
        after_id: params.afterId ?? 0,
        batch_size: params.batchSize ?? 40,
      },
    },
  )

  if (error) {
    return { success: false, error: error.message }
  }

  return data ?? { success: false, error: 'Resposta vazia da Edge Function' }
}

export async function invokeMirrorCardFull(params: {
  language: AppLanguage
  cardId: number
  imageId?: number
}): Promise<SyncCardImagesResponse> {
  const { data, error } = await supabase.functions.invoke<SyncCardImagesResponse>(
    'sync-card-images',
    {
      body: {
        mode: 'full',
        language: params.language,
        card_id: params.cardId,
        image_id: params.imageId,
      },
    },
  )

  if (error) {
    return { success: false, error: error.message }
  }

  return data ?? { success: false, error: 'Resposta vazia da Edge Function' }
}

export function formatBytes(bytes: number | undefined | null): string {
  if (bytes == null || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isYgoHostedUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes('images.ygoprodeck.com')
}
