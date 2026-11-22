import type { CreateUserDeckResult } from '@/types'

export interface ImportOutcome {
  /** true quando só parte das cartas entrou (falha parcial) */
  partial: boolean
  message: string
}

/** Texto de resultado da importação de um deck (comunidade/personagem) para o usuário. */
export function describeImportResult(result: CreateUserDeckResult): ImportOutcome {
  if (result.failedAtChunk != null) {
    return {
      partial: true,
      message: `Só ${result.inserted} de ${result.plannedRows} cartas entraram (falha no lote ${result.failedAtChunk}). O deck foi mantido; complete no editor.`,
    }
  }
  const notes: string[] = []
  if (result.skippedUnresolved) notes.push(`${result.skippedUnresolved} sem catálogo`)
  if (result.cappedCopies) notes.push(`${result.cappedCopies} cópias limitadas a 3`)
  if (result.truncatedByLimit) notes.push(`${result.truncatedByLimit} cortadas por limite de zona`)
  return {
    partial: false,
    message: `Importado: ${result.inserted} cartas${notes.length ? ` (${notes.join('; ')})` : ''}`,
  }
}
