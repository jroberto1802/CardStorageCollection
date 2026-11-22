import { describe, expect, it } from 'vitest'
import type { CreateUserDeckResult } from '@/types'
import { describeImportResult } from './importResult'

const base: CreateUserDeckResult = {
  deckId: 'd1',
  deckName: 'Deck',
  inserted: 40,
  skippedUnresolved: 0,
  cappedCopies: 0,
  truncatedByLimit: 0,
  failedAtChunk: null,
  plannedRows: 40,
}

describe('describeImportResult', () => {
  it('sucesso: resume com notas', () => {
    const out = describeImportResult({ ...base, skippedUnresolved: 2, cappedCopies: 1 })
    expect(out.partial).toBe(false)
    expect(out.message).toBe('Importado: 40 cartas (2 sem catálogo; 1 cópias limitadas a 3)')
  })

  it('falha parcial: avisa quantas entraram e manda completar no editor', () => {
    const out = describeImportResult({ ...base, inserted: 25, failedAtChunk: 2 })
    expect(out.partial).toBe(true)
    expect(out.message).toBe(
      'Só 25 de 40 cartas entraram (falha no lote 2). O deck foi mantido; complete no editor.',
    )
  })
})
