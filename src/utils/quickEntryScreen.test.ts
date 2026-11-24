import { describe, expect, it } from 'vitest'
import {
  additionFromImpression,
  batchReducer,
  clearAllDrafts,
  collectionKey,
  describeReconciliation,
  describeSaveError,
  draftKey,
  isNetworkError,
  loadDraft,
  printingFromLine,
  reconcileSave,
  saveDraft,
  describeSaveOutcome,
  initialBatchState,
  partitionForSave,
  processQuickEntry,
  restoreDraft,
  serializeDraft,
  setDisplayName,
  setProgress,
  summarizeBatch,
  toBatchItems,
  buildOwnedMap,
  type SetPrinting,
} from './quickEntry'

const TEST = { prefix: 'TEST', region: 'EN' }
const p = (n: string, rarity: string, cardId = Number(n.replace(/\D/g, '')), over: Partial<SetPrinting> = {}): SetPrinting => ({
  cardId,
  language: 'en',
  name: `Carta ${n}`,
  type: null,
  setCode: `TEST-EN${n}`,
  setPrefix: 'TEST',
  setRegion: 'EN',
  setNumber: n,
  setName: 'Set de Teste',
  setRarity: rarity,
  setRarityCode: null,
  setPrice: null,
  imageUrlSmall: null,
  ...over,
})
const printings = [p('001', 'Common'), p('002', 'Common'), p('002', 'Rare'), p('003', 'Ultra Rare')]

describe('processQuickEntry', () => {
  it('resolve, marca ambíguas como não confirmadas e conta problemas', () => {
    const r = processQuickEntry('1 2x2 3 999 lob5', TEST, printings)
    expect(r.additions.map((a) => [a.printing.setCode, a.quantity, a.unconfirmed])).toEqual([
      ['TEST-EN001', 1, false],
      ['TEST-EN002', 2, true],
      ['TEST-EN003', 1, false],
    ])
    expect(r.ambiguousCount).toBe(1)
    expect(r.problems.map((x) => x.kind)).toEqual(['parse', 'notFound'])
    expect(r.problems[1].reason).toBe('TEST-EN999 não encontrado no catálogo')
    expect(r.problems[1].code).toBe('TEST-EN999')
    expect(r.message).toContain('3 adicionadas')
    expect(r.message).toContain('1 para confirmar a raridade')
    expect(r.message).toContain('2 inválidas')
  })

  it('última raridade usada vira padrão automático e confirmado (badge auto)', () => {
    const r = processQuickEntry('2', TEST, printings, { lastRarity: 'Rare' })
    expect(r.additions[0]).toMatchObject({ unconfirmed: false, auto: true })
    expect(r.additions[0].printing.setRarity).toBe('Rare')
    expect(r.additions[0].rarityOptions).toEqual(['Common', 'Rare'])
  })

  it('intervalo grande só pede confirmação e não adiciona nada até confirmar', () => {
    const r = processQuickEntry('1-61 1', TEST, printings)
    expect(r.needsConfirmation).toHaveLength(1)
    expect(r.additions).toHaveLength(1)
    const again = processQuickEntry(r.needsConfirmation[0].raw, TEST, printings, { allowLarge: true })
    expect(again.additions.length + again.problems.length).toBe(61)
  })

  it('B4: código ausente vira problema e nada é adicionado', () => {
    const r = processQuickEntry('500', TEST, printings)
    expect(r.additions).toEqual([])
    expect(r.problems[0].kind).toBe('notFound')
    expect(r.message).toBe('0 adicionadas, 1 inválida: TEST-EN500 não encontrado no catálogo')
  })

  it('texto vazio não gera nada', () => {
    expect(processQuickEntry('  ', TEST, printings).additions).toEqual([])
  })
})

describe('salvar válidas e manter ambíguas', () => {
  const state = batchReducer(initialBatchState, {
    type: 'add',
    items: processQuickEntry('1 2', TEST, printings).additions,
  })

  it('particiona: confirmadas salvam, ambíguas ficam', () => {
    const { saveable, kept } = partitionForSave(state.lines)
    expect(saveable.map((l) => l.setCode)).toEqual(['TEST-EN001'])
    expect(kept.map((l) => l.setCode)).toEqual(['TEST-EN002'])
  })

  it('confirmar a raridade (chip) libera a linha para salvar', () => {
    const key = state.lines[1].key
    const confirmed = batchReducer(state, { type: 'setRarity', key, printing: printings[2] })
    expect(partitionForSave(confirmed.lines).kept).toEqual([])
    expect(confirmed.lines[1]).toMatchObject({ setRarity: 'Rare', unconfirmed: false, auto: false })
    // clicar na raridade já selecionada também confirma
    const same = batchReducer(state, { type: 'setRarity', key, printing: printings[1] })
    expect(same.lines[1].unconfirmed).toBe(false)
    expect(batchReducer(state, { type: 'confirmRarity', key }).lines[1].unconfirmed).toBe(false)
  })

  it('commit remove só as salvas e zera o histórico (sem ressuscitar o que foi gravado)', () => {
    const { saveable } = partitionForSave(state.lines)
    const after = batchReducer(state, { type: 'commit', keys: saveable.map((l) => l.key) })
    expect(after.lines.map((l) => l.setCode)).toEqual(['TEST-EN002'])
    expect(after.history).toEqual([])
    expect(batchReducer(after, { type: 'undo' })).toBe(after)
  })

  it('itens para a RPC: sem user_id, quantidades por linha', () => {
    const items = toBatchItems(partitionForSave(state.lines).saveable)
    expect(items).toEqual([
      { card_id: 1, language: 'en', set_code: 'TEST-EN001', set_name: 'Set de Teste', set_rarity: 'Common', quantity: 1 },
    ])
    expect(Object.keys(items[0])).not.toContain('user_id')
  })

  it('mensagens de resultado', () => {
    expect(describeSaveOutcome({ inserted: 2, updated: 1 }, 0, 0)).toBe('Salvas 3 cartas: 2 novas, 1 atualizada.')
    expect(describeSaveOutcome({ inserted: 1, updated: 0 }, 2, 1)).toBe(
      'Salvas 1 carta: 1 nova, 0 atualizadas. 2 ficaram no lote aguardando confirmação de raridade; 1 com erro continua listada(s).',
    )
  })
})

describe('resumo, progresso e restauração', () => {
  it('novas x atualizadas a partir do ownedMap', () => {
    const lines = batchReducer(initialBatchState, { type: 'add', items: processQuickEntry('1 3', TEST, printings).additions }).lines
    const owned = buildOwnedMap([{ card_id: 1, set_code: 'TEST-EN001', set_rarity: 'Common', quantity: 2 }])
    expect(summarizeBatch(lines, owned)).toMatchObject({ lines: 2, newCount: 1, updatedCount: 1 })
  })

  it('você tem X/Y por set_code distinto, em qualquer raridade', () => {
    expect(setProgress(printings, [{ set_code: 'test-en002' }, { set_code: 'OUTRO-EN001' }])).toEqual({ total: 3, owned: 1 })
    expect(setProgress([], [])).toEqual({ total: 0, owned: 0 })
    expect(setDisplayName(printings)).toBe('Set de Teste')
  })

  it('o rascunho preserva ambígua/auto/miniatura e restaura ao recarregar', () => {
    const lines = batchReducer(initialBatchState, {
      type: 'add',
      items: processQuickEntry('2', TEST, [p('002', 'Common', 2, { imageUrlSmall: 'x.jpg' }), p('002', 'Rare', 2)]).additions,
    }).lines
    const restored = restoreDraft(serializeDraft({ activeSet: TEST, lines }))
    expect(restored?.lines[0]).toMatchObject({ unconfirmed: true, auto: true, imageUrlSmall: 'x.jpg' })
    expect(restored?.activeSet).toEqual(TEST)
  })
})

describe('scanner -> lote', () => {
  it('impressão exata vira adição direta, sem set ativo', () => {
    const a = additionFromImpression({
      cardId: 7,
      language: 'pt',
      name: 'Mago',
      setCode: 'ss01-ena08',
      setName: 'Starter',
      setRarity: '—',
    })
    expect(a?.printing).toMatchObject({ setCode: 'ss01-ena08', setPrefix: 'SS01', setRegion: 'EN', setNumber: 'A08', setRarity: '' })
    expect(a?.quantity).toBe(1)
  })

  it('sem código de set não entra no lote', () => {
    expect(additionFromImpression({ cardId: 1, language: 'en', name: 'x', setCode: '—', setName: 'Sem set', setRarity: '—' })).toBeNull()
  })

  it('o mesmo código escaneado duas vezes soma +1', () => {
    const add = additionFromImpression({ cardId: 7, language: 'en', name: 'x', setCode: 'LIOV-EN001', setName: 'n', setRarity: 'Rare' })!
    const s = batchReducer(batchReducer(initialBatchState, { type: 'add', items: [add] }), { type: 'add', items: [add] })
    expect(s.lines).toHaveLength(1)
    expect(s.lines[0].quantity).toBe(2)
  })
})

describe('reconciliação após erro de rede (a RPC soma: nunca reenviar às cegas)', () => {
  const lines = batchReducer(initialBatchState, { type: 'add', items: processQuickEntry('1 3', TEST, printings).additions }).lines
  const before = buildOwnedMap([{ card_id: 1, set_code: 'TEST-EN001', set_rarity: 'Common', quantity: 1 }])

  it('posse subiu => a linha foi gravada (commit só dessa)', () => {
    const after = buildOwnedMap([
      { card_id: 1, set_code: 'TEST-EN001', set_rarity: 'Common', quantity: 2 },
    ])
    const r = reconcileSave(lines, before, after)
    expect(r.status).toBe('partial')
    expect(r.savedKeys).toEqual([lines[0].key])
  })

  it('todas subiram => saved; nenhuma subiu => unsaved; sem posse nova => unknown', () => {
    const all = buildOwnedMap([
      { card_id: 1, set_code: 'TEST-EN001', set_rarity: 'Common', quantity: 2 },
      { card_id: 3, set_code: 'TEST-EN003', set_rarity: 'Ultra Rare', quantity: 1 },
    ])
    expect(reconcileSave(lines, before, all).status).toBe('saved')
    expect(reconcileSave(lines, before, before).status).toBe('unsaved')
    expect(reconcileSave(lines, before, null)).toEqual({ status: 'unknown', savedKeys: [] })
  })

  it('mensagens: nunca "Nada foi salvo" em erro de rede; traduz Failed to fetch', () => {
    expect(isNetworkError('TypeError: Failed to fetch')).toBe(true)
    expect(isNetworkError('quantity deve estar entre 1 e 999')).toBe(false)
    expect(describeSaveError('Failed to fetch')).toBe('Sem conexão estável com o servidor.')
    const unknown = describeReconciliation({ status: 'unknown', savedKeys: [] }, 'Failed to fetch')
    expect(unknown).toContain('Não foi possível confirmar se foi salvo. Confira sua coleção antes de tentar de novo.')
    expect(unknown).not.toContain('Failed to fetch')
    expect(unknown).not.toContain('Nada foi salvo')
    expect(describeReconciliation({ status: 'unsaved', savedKeys: [] }, 'timeout')).toContain('nenhuma carta do lote entrou')
  })
})

describe('chips fora do set ativo e soma ambígua', () => {
  it('a raridade de uma linha ambígua pode ser confirmada sem o set em printings (printingFromLine)', () => {
    const add = processQuickEntry('2', TEST, printings).additions
    let s = batchReducer(initialBatchState, { type: 'add', items: add })
    const line = s.lines[0]
    expect(line.unconfirmed).toBe(true)
    const rare = printingFromLine(line, 'Rare')
    expect(rare).toMatchObject({ cardId: line.cardId, setCode: line.setCode, setRarity: 'Rare', setName: line.setName })
    s = batchReducer(s, { type: 'setRarity', key: line.key, printing: rare })
    expect(s.lines[0]).toMatchObject({ setRarity: 'Rare', unconfirmed: false })
    // mesma raridade (confirmar sem trocar)
    const again = batchReducer(batchReducer(initialBatchState, { type: 'add', items: add }), {
      type: 'setRarity',
      key: line.key,
      printing: printingFromLine(line, line.setRarity),
    })
    expect(again.lines[0].unconfirmed).toBe(false)
  })

  it('adição ambígua somada numa linha CONFIRMADA volta a exigir revisão (nunca silenciosa)', () => {
    const confirmed = batchReducer(initialBatchState, {
      type: 'add',
      items: [{ printing: printings[1], quantity: 1 }], // 002 Common, confirmada
    })
    expect(confirmed.lines[0].unconfirmed).toBe(false)
    const ambiguous = processQuickEntry('2', TEST, printings).additions[0] // heurística => Common, unconfirmed
    expect(ambiguous.unconfirmed).toBe(true)
    const merged = batchReducer(confirmed, { type: 'add', items: [ambiguous] })
    expect(merged.lines).toHaveLength(1)
    expect(merged.lines[0]).toMatchObject({ quantity: 2, unconfirmed: true })
    expect(partitionForSave(merged.lines).saveable).toEqual([])
  })
})

describe('rascunho: chave por usuário, recálculo da chave e logout', () => {
  const lines = batchReducer(initialBatchState, { type: 'add', items: processQuickEntry('1', TEST, printings).additions }).lines

  it('recalcula line.key ao restaurar e funde colisões', () => {
    const tampered = JSON.stringify({
      version: 1,
      activeSet: TEST,
      lines: [
        { ...lines[0], key: 'adulterada-1' },
        { ...lines[0], key: 'adulterada-2', quantity: 2 },
      ],
    })
    const r = restoreDraft(tampered)
    expect(r?.lines).toHaveLength(1)
    expect(r?.lines[0].key).toBe(collectionKey(lines[0].cardId, lines[0].setCode, lines[0].setRarity))
    expect(r?.lines[0].quantity).toBe(lines[0].quantity + 2)
  })

  it('rascunho corrompido não restaura (sem lançar)', () => {
    expect(restoreDraft('{"version":1,"lines":"x"}')).toBeNull()
    expect(restoreDraft('lixo')).toBeNull()
  })

  it('cada usuário tem a sua chave e o logout apaga todas', () => {
    const store = new Map<string, string>()
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size
      },
    }
    expect(draftKey('u1')).not.toBe(draftKey('u2'))
    saveDraft({ activeSet: TEST, lines }, 'u1')
    expect(loadDraft('u1')?.lines).toHaveLength(1)
    expect(loadDraft('u2')).toBeNull() // outro login não vê o lote do primeiro
    saveDraft({ activeSet: TEST, lines }, 'u2')
    store.set('outraChave', 'x')
    clearAllDrafts()
    expect(loadDraft('u1')).toBeNull()
    expect(loadDraft('u2')).toBeNull()
    expect(store.get('outraChave')).toBe('x')
  })
})
