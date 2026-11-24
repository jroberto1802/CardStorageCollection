import { beforeEach, describe, expect, it } from 'vitest'
import {
  batchReducer,
  buildOwnedMap,
  clearDraft,
  collectionKey,
  initialBatchState,
  lineHint,
  loadDraft,
  numberKey,
  parseQuickEntry,
  pickHeuristicRarity,
  resolveEntry,
  restoreDraft,
  saveDraft,
  serializeDraft,
  summarizeBatch,
  type BatchState,
  type SetPrinting,
} from './quickEntry'

const LIOV = { prefix: 'LIOV', region: 'EN' }
const nums = (text: string, set = LIOV) => parseQuickEntry(text, set).entries.map((e) => [e.number, e.qty])

describe('parseQuickEntry', () => {
  it('lista simples com espaço, vírgula e ponto e vírgula', () => {
    expect(nums('1 5, 12; 40')).toEqual([['1', 1], ['5', 1], ['12', 1], ['40', 1]])
    expect(nums('1\n2')).toEqual([['1', 1], ['2', 1]])
  })

  it('aceita as variações de código', () => {
    const forms = ['1', '001', 'en001', 'liov001', 'LIOV-EN001', 'liov-en1', 'LIOVEN001', 'liov-001']
    for (const form of forms) {
      const { entries, errors } = parseQuickEntry(form, LIOV)
      expect(errors, form).toEqual([])
      expect(numberKey(entries[0].number), form).toBe('1')
    }
    expect(parseQuickEntry('LIOV-EN001', LIOV).entries[0]).toMatchObject({ prefix: 'LIOV', region: 'EN' })
    expect(parseQuickEntry('en001', LIOV).entries[0]).toMatchObject({ region: 'EN' })
  })

  it('quantidade com x, com e sem espaços', () => {
    expect(nums('12x3')).toEqual([['12', 3]])
    expect(nums('12 x 3')).toEqual([['12', 3]])
    expect(nums('12 X 3 5')).toEqual([['12', 3], ['5', 1]])
    expect(nums('liov-en012x2')).toEqual([['012', 2]])
  })

  it('erros de quantidade', () => {
    expect(parseQuickEntry('12x0', LIOV).errors[0].reason).toMatch(/pelo menos 1/)
    expect(parseQuickEntry('12x', LIOV).errors[0].reason).toMatch(/ausente/)
    expect(parseQuickEntry('12x1000', LIOV).errors[0].reason).toMatch(/999/)
  })

  it('intervalo expande e aplica a quantidade a cada número', () => {
    expect(nums('40-43')).toEqual([['40', 1], ['41', 1], ['42', 1], ['43', 1]])
    expect(nums('1-2x2')).toEqual([['1', 2], ['2', 2]])
    expect(nums('7-7')).toEqual([['7', 1]])
  })

  it('intervalo preserva preenchimento e letra', () => {
    expect(nums('001-003')).toEqual([['001', 1], ['002', 1], ['003', 1]])
    expect(nums('A08-A10').map((n) => n[0])).toEqual(['A08', 'A09', 'A10'])
    expect(parseQuickEntry('A01-B03', LIOV).errors[0].reason).toMatch(/letras/)
  })

  it('intervalo invertido é ERRO (não normaliza) com dica', () => {
    const { entries, errors } = parseQuickEntry('45-40', LIOV)
    expect(entries).toEqual([])
    expect(errors[0].reason).toMatch(/invertido.*40-45/)
  })

  it('limite de 60: intervalo e quantidade pedem confirmação; allowLarge libera', () => {
    const big = parseQuickEntry('1-61', LIOV)
    expect(big.entries).toEqual([])
    expect(big.errors[0]).toMatchObject({ needsConfirmation: true })
    expect(parseQuickEntry('1-60', LIOV).entries).toHaveLength(60)
    const qty = parseQuickEntry('5x61', LIOV)
    expect(qty.errors[0]).toMatchObject({ needsConfirmation: true })
    expect(parseQuickEntry('1-61', LIOV, { allowLarge: true }).entries).toHaveLength(61)
    expect(parseQuickEntry('5x61', LIOV, { allowLarge: true }).entries[0].qty).toBe(61)
  })

  it('rejeita prefixo de outro set e região diferente', () => {
    expect(parseQuickEntry('lob001', LIOV).errors[0].reason).toMatch(/outro set/)
    expect(parseQuickEntry('LOB-EN001', LIOV).errors[0].reason).toMatch(/outro set/)
    expect(parseQuickEntry('liov-fr001', LIOV).errors[0].reason).toMatch(/região FR/)
    expect(parseQuickEntry('fr001', LIOV).errors[0].reason).toMatch(/região FR/)
  })

  it('set sem região ativa aceita qualquer região e a mantém na entrada', () => {
    const r = parseQuickEntry('fr001', { prefix: 'LIOV', region: null })
    expect(r.errors).toEqual([])
    expect(r.entries[0].region).toBe('FR')
  })

  it('prefixos com dígitos (MP22, RA01, SS01) usam o prefixo ativo para separar o número', () => {
    const mp = { prefix: 'MP22', region: 'EN' }
    expect(parseQuickEntry('mp22001', mp).entries[0]).toMatchObject({ prefix: 'MP22', number: '001' })
    expect(parseQuickEntry('MP22-EN100', mp).entries[0]).toMatchObject({ number: '100', region: 'EN' })
    const ss = { prefix: 'SS01', region: 'EN' }
    expect(parseQuickEntry('ss01-ena08', ss).entries[0]).toMatchObject({ number: 'A08', region: 'EN' })
    expect(parseQuickEntry('ena08', ss).entries[0]).toMatchObject({ number: 'A08', region: 'EN' })
    expect(parseQuickEntry('A08', ss).entries[0].number).toBe('A08')
    expect(parseQuickEntry('ra01001', mp).errors[0].reason).toMatch(/outro set/)
  })

  it('lixo e vazio', () => {
    expect(parseQuickEntry('', LIOV)).toEqual({ entries: [], errors: [] })
    expect(parseQuickEntry('   ,; ', LIOV)).toEqual({ entries: [], errors: [] })
    expect(parseQuickEntry('abc !!', LIOV).errors.map((e) => e.raw)).toEqual(['abc', '!!'])
  })

  it('teto duro MAX_RANGE=2000 mesmo com allowLarge', () => {
    const r = parseQuickEntry('1-2001', LIOV, { allowLarge: true })
    expect(r.entries).toEqual([])
    expect(r.errors[0].reason).toBe('intervalo acima do máximo de 2000')
    expect(r.errors[0].needsConfirmation).toBeUndefined()
    expect(parseQuickEntry('1-2000', LIOV, { allowLarge: true }).entries).toHaveLength(2000)
    expect(parseQuickEntry('1-2000', LIOV).errors[0].needsConfirmation).toBe(true)
  })

  it('aceita o formato antigo com região E (LOB-E001), coerente com o banco', () => {
    const lob = { prefix: 'LOB', region: 'E' }
    expect(parseQuickEntry('LOB-E001', lob).entries[0]).toMatchObject({ prefix: 'LOB', region: 'E', number: '001' })
    expect(parseQuickEntry('lob-e12x2', lob).entries[0]).toMatchObject({ region: 'E', number: '12', qty: 2 })
    // região E não casa com o set de região EN
    expect(parseQuickEntry('LOB-E001', { prefix: 'LOB', region: 'EN' }).errors[0].reason).toMatch(/região E/)
    // 'ENA08' continua sendo região EN + número A08 (não E + NA08)
    expect(parseQuickEntry('ss01-ena08', { prefix: 'SS01', region: 'EN' }).entries[0]).toMatchObject({ region: 'EN', number: 'A08' })
  })

  it('a tokenização do x preserva prefixos com x/X e dígitos (A2X3, SDX1)', () => {
    const odd = { prefix: 'A2X3', region: 'EN' }
    expect(parseQuickEntry('a2x3-en001', odd).entries[0]).toMatchObject({ prefix: 'A2X3', number: '001', qty: 1 })
    expect(parseQuickEntry('A2X3001x2', odd).entries[0]).toMatchObject({ prefix: 'A2X3', number: '001', qty: 2 })
    expect(parseQuickEntry('a2x3-en001x4', odd).entries[0]).toMatchObject({ number: '001', qty: 4 })
    const sdx = { prefix: 'SDX1', region: 'EN' }
    expect(parseQuickEntry('sdx1005x3', sdx).entries[0]).toMatchObject({ number: '005', qty: 3 })
    expect(parseQuickEntry('5 x 2', odd).entries[0]).toMatchObject({ number: '5', qty: 2 })
  })

  it('mistura completa do exemplo', () => {
    const r = parseQuickEntry('1 5 12x3 40-42', LIOV)
    expect(r.errors).toEqual([])
    expect(r.entries.map((e) => [e.number, e.qty])).toEqual([['1', 1], ['5', 1], ['12', 3], ['40', 1], ['41', 1], ['42', 1]])
  })
})

const printing = (over: Partial<SetPrinting>): SetPrinting => ({
  cardId: 1,
  language: 'en',
  name: 'Card',
  type: 'Effect Monster',
  setCode: 'LIOV-EN001',
  setPrefix: 'LIOV',
  setRegion: 'EN',
  setNumber: '001',
  setName: 'Lord of the Ravens',
  setRarity: 'Rare',
  setRarityCode: '(R)',
  setPrice: null,
  imageUrlSmall: null,
  ...over,
})

describe('resolveEntry', () => {
  const set = [
    printing({ cardId: 1, setNumber: '001', setCode: 'LIOV-EN001', setRarity: 'Super Rare' }),
    printing({ cardId: 2, setNumber: '012', setCode: 'LIOV-EN012', setRarity: 'Common' }),
    printing({ cardId: 2, setNumber: '012', setCode: 'LIOV-EN012', setRarity: 'Ultra Rare' }),
    printing({ cardId: 3, setNumber: 'A08', setCode: 'LIOV-ENA08', setRarity: 'Rare' }),
    printing({ cardId: 4, setNumber: '1000', setCode: 'LIOV-EN1000', setRarity: 'Rare' }),
  ]

  it('casa por número ignorando o preenchimento (1, 01, 001)', () => {
    for (const n of ['1', '01', '001']) {
      expect(resolveEntry({ number: n }, set).chosen?.cardId, n).toBe(1)
    }
    expect(resolveEntry({ number: '1000' }, set).chosen?.cardId).toBe(4)
    expect(resolveEntry({ number: 'a8' }, set).chosen?.cardId).toBe(3)
    expect(resolveEntry({ number: 'A08' }, set).chosen?.cardId).toBe(3)
  })

  it('1 não confunde com 1000 nem com A1', () => {
    expect(resolveEntry({ number: '1' }, set).candidates.map((c) => c.cardId)).toEqual([1])
  })

  it('raridade única => ok automático', () => {
    expect(resolveEntry({ number: '1' }, set)).toMatchObject({ status: 'ok', defaultReason: 'single' })
  })

  it('várias raridades sem histórico => ambiguous com heurística Common', () => {
    const r = resolveEntry({ number: '12' }, set)
    expect(r.status).toBe('ambiguous')
    expect(r.candidates).toHaveLength(2)
    expect(r.chosen?.setRarity).toBe('Common')
    expect(r.defaultReason).toBe('heuristic')
  })

  it('última raridade usada no set vira padrão e resolve ok', () => {
    const r = resolveEntry({ number: '12' }, set, { lastRarity: 'ultra rare' })
    expect(r).toMatchObject({ status: 'ok', defaultReason: 'lastUsed' })
    expect(r.chosen?.setRarity).toBe('Ultra Rare')
    // última raridade inexistente nesta carta => volta à heurística
    expect(resolveEntry({ number: '12' }, set, { lastRarity: 'Secret Rare' }).status).toBe('ambiguous')
  })

  it('não encontrado', () => {
    expect(resolveEntry({ number: '999' }, set)).toEqual({ status: 'notFound', candidates: [] })
  })

  it('filtra por região/prefixo quando informados e fica ambíguo sem região (EN vs FR)', () => {
    const multi = [
      printing({ cardId: 9, setCode: 'LIOV-EN005', setRegion: 'EN', setNumber: '005' }),
      printing({ cardId: 9, setCode: 'LIOV-FR005', setRegion: 'FR', setNumber: '005' }),
    ]
    expect(resolveEntry({ number: '5' }, multi).status).toBe('ambiguous')
    expect(resolveEntry({ number: '5', region: 'FR' }, multi).chosen?.setCode).toBe('LIOV-FR005')
    expect(resolveEntry({ number: '5', prefix: 'LOB' }, multi).status).toBe('notFound')
  })

  it('ignora linhas sem número (códigos fora do padrão) e duplicatas de idioma', () => {
    const odd = [
      printing({ setNumber: null, setCode: 'WEIRD' }),
      printing({ cardId: 5, setNumber: '002', setCode: 'LIOV-EN002', language: 'pt' }),
      printing({ cardId: 5, setNumber: '002', setCode: 'LIOV-EN002', language: 'en' }),
    ]
    const r = resolveEntry({ number: '2' }, odd)
    expect(r.candidates).toHaveLength(1)
    expect(r.status).toBe('ok')
  })

  it('heurística: Common > Short Print > Rare > Super Rare e desconhecida por último', () => {
    const rarities = ['Ultra Rare', 'Rare', 'Short Print', 'Quarter Century Secret Rare', 'Common']
    const list = rarities.map((r) => printing({ setRarity: r }))
    expect(pickHeuristicRarity(list).setRarity).toBe('Common')
    expect(pickHeuristicRarity(list.slice(0, 4)).setRarity).toBe('Short Print')
    expect(pickHeuristicRarity([list[0], list[3]]).setRarity).toBe('Ultra Rare')
  })
})

describe('batchReducer', () => {
  const p = (cardId: number, rarity = 'Rare', code = `LIOV-EN${String(cardId).padStart(3, '0')}`) =>
    printing({ cardId, setRarity: rarity, setCode: code, name: `Card ${cardId}` })
  const run = (actions: Parameters<typeof batchReducer>[1][], start: BatchState = initialBatchState) =>
    actions.reduce(batchReducer, start)

  it('adicionar o mesmo código soma a quantidade em uma única linha', () => {
    const s = run([
      { type: 'add', items: [{ printing: p(1), quantity: 1 }] },
      { type: 'add', items: [{ printing: p(1), quantity: 2 }] },
    ])
    expect(s.lines).toHaveLength(1)
    expect(s.lines[0].quantity).toBe(3)
  })

  it('soma dentro da própria ação e limita a 999', () => {
    const s = run([{ type: 'add', items: [{ printing: p(1), quantity: 600 }, { printing: p(1), quantity: 600 }] }])
    expect(s.lines[0].quantity).toBe(999)
  })

  it('expansão de intervalo é UMA ação para o desfazer', () => {
    const s = run([
      { type: 'add', items: [{ printing: p(1), quantity: 1 }] },
      { type: 'add', items: [2, 3, 4].map((id) => ({ printing: p(id), quantity: 1 })) },
    ])
    expect(s.lines).toHaveLength(4)
    const undone = batchReducer(s, { type: 'undo' })
    expect(undone.lines.map((l) => l.cardId)).toEqual([1])
  })

  it('remover, setQuantity (valida limites) e desfazer cada um', () => {
    let s = run([{ type: 'add', items: [{ printing: p(1), quantity: 1 }, { printing: p(2), quantity: 1 }] }])
    const key = s.lines[0].key
    s = batchReducer(s, { type: 'setQuantity', key, quantity: 5 })
    expect(s.lines[0].quantity).toBe(5)
    expect(batchReducer(s, { type: 'setQuantity', key, quantity: 0 })).toBe(s)
    expect(batchReducer(s, { type: 'setQuantity', key, quantity: 1000 })).toBe(s)
    expect(batchReducer(s, { type: 'setQuantity', key, quantity: 5 })).toBe(s)
    s = batchReducer(s, { type: 'remove', key })
    expect(s.lines).toHaveLength(1)
    s = batchReducer(s, { type: 'undo' })
    expect(s.lines).toHaveLength(2)
    s = batchReducer(s, { type: 'undo' })
    expect(s.lines[0].quantity).toBe(1)
  })

  it('trocar a raridade move a linha e mescla com uma já existente', () => {
    let s = run([
      { type: 'add', items: [{ printing: p(1, 'Rare'), quantity: 2 }, { printing: p(1, 'Ultra Rare'), quantity: 1 }] },
    ])
    expect(s.lines).toHaveLength(2)
    const rareKey = s.lines[0].key
    s = batchReducer(s, { type: 'setRarity', key: rareKey, printing: p(1, 'Ultra Rare') })
    expect(s.lines).toHaveLength(1)
    expect(s.lines[0]).toMatchObject({ setRarity: 'Ultra Rare', quantity: 3 })
    s = batchReducer(s, { type: 'undo' })
    expect(s.lines).toHaveLength(2)
  })

  it('trocar para raridade nova mantém a posição e a quantidade', () => {
    let s = run([{ type: 'add', items: [{ printing: p(1, 'Rare'), quantity: 4 }, { printing: p(2), quantity: 1 }] }])
    s = batchReducer(s, { type: 'setRarity', key: s.lines[0].key, printing: p(1, 'Common') })
    expect(s.lines.map((l) => [l.cardId, l.setRarity, l.quantity])).toEqual([[1, 'Common', 4], [2, 'Rare', 1]])
  })

  it('limpar pode ser desfeito; desfazer sem histórico não faz nada', () => {
    let s = run([{ type: 'add', items: [{ printing: p(1), quantity: 1 }] }])
    s = batchReducer(s, { type: 'clear' })
    expect(s.lines).toEqual([])
    s = batchReducer(s, { type: 'undo' })
    expect(s.lines).toHaveLength(1)
    expect(batchReducer(initialBatchState, { type: 'undo' })).toBe(initialBatchState)
    expect(batchReducer(initialBatchState, { type: 'clear' })).toBe(initialBatchState)
    expect(batchReducer(initialBatchState, { type: 'add', items: [] })).toBe(initialBatchState)
  })

  it('normaliza raridade "—" para vazio (mesma chave da coleção)', () => {
    const s = run([{ type: 'add', items: [{ printing: p(1, '—'), quantity: 1 }, { printing: p(1, ''), quantity: 1 }] }])
    expect(s.lines).toHaveLength(1)
    expect(s.lines[0]).toMatchObject({ setRarity: '', quantity: 2 })
  })

  it('o histórico é limitado', () => {
    let s = initialBatchState
    for (let i = 1; i <= 80; i++) s = batchReducer(s, { type: 'add', items: [{ printing: p(i), quantity: 1 }] })
    expect(s.history.length).toBe(50)
  })

  it('restore substitui as linhas e zera o histórico', () => {
    const base = run([{ type: 'add', items: [{ printing: p(1), quantity: 1 }] }])
    const s = batchReducer(initialBatchState, { type: 'restore', lines: base.lines })
    expect(s.lines).toHaveLength(1)
    expect(s.history).toEqual([])
  })
})

describe('resumo e dicas de posse', () => {
  const lines = batchReducer(initialBatchState, {
    type: 'add',
    items: [
      { printing: printing({ cardId: 1, setRarity: 'Rare' }), quantity: 2 },
      { printing: printing({ cardId: 2, setCode: 'LIOV-EN002', setRarity: 'Common' }), quantity: 4 },
    ],
  }).lines
  const owned = buildOwnedMap([
    { card_id: 1, set_code: 'liov-en001', set_rarity: 'Rare', quantity: 1 },
    { card_id: 1, set_code: 'LIOV-EN001', set_rarity: 'Rare', quantity: 2 }, // outro idioma soma
  ])

  it('resume novas e atualizadas a partir do mapa de posse', () => {
    const s = summarizeBatch(lines, owned)
    expect(s).toMatchObject({ lines: 2, copies: 6, newCount: 1, updatedCount: 1 })
    expect(s.text).toBe('2 cartas (6 cópias): 1 nova(s), 1 atualizada(s)')
    expect(summarizeBatch([], owned).text).toBe('0 cartas (0 cópias): 0 nova(s), 0 atualizada(s)')
  })

  it('"Você tem N → N+q" e alerta de quantidade >= 4', () => {
    expect(lineHint(lines[0], owned)).toEqual({ had: 3, willHave: 5, text: 'Você tem 3 → 5', warn: false })
    expect(lineHint(lines[1], owned)).toMatchObject({ had: 0, willHave: 4, text: 'Nova na coleção', warn: true })
  })

  it('collectionKey ignora caixa do código e trata "—" como vazio', () => {
    expect(collectionKey(1, 'liov-en001', '—')).toBe(collectionKey(1, 'LIOV-EN001', ''))
  })
})

describe('rascunho', () => {
  const lines = batchReducer(initialBatchState, {
    type: 'add',
    items: [{ printing: printing({ cardId: 7 }), quantity: 3 }],
  }).lines
  const draft = { activeSet: { prefix: 'LIOV', region: 'EN' }, lines }

  it('serializa e restaura', () => {
    expect(restoreDraft(serializeDraft(draft))).toEqual(draft)
  })

  it('rejeita versão diferente, JSON inválido, vazio e linhas corrompidas', () => {
    expect(restoreDraft(JSON.stringify({ version: 99, lines }))).toBeNull()
    expect(restoreDraft('{oops')).toBeNull()
    expect(restoreDraft(null)).toBeNull()
    expect(restoreDraft(JSON.stringify({ version: 1, lines: [{ foo: 1 }] }))).toBeNull()
    const mixed = JSON.stringify({ version: 1, activeSet: null, lines: [...lines, { key: 'x' }] })
    expect(restoreDraft(mixed)?.lines).toHaveLength(1)
    const bad = { ...lines[0], quantity: 5000 }
    expect(restoreDraft(JSON.stringify({ version: 1, lines: [bad] }))).toBeNull()
  })

  describe('localStorage', () => {
    const store = new Map<string, string>()
    beforeEach(() => {
      store.clear()
      const fake = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      }
      ;(globalThis as { localStorage?: unknown }).localStorage = fake
    })

    it('salva, carrega e limpa', () => {
      saveDraft(draft)
      expect(loadDraft()).toEqual(draft)
      clearDraft()
      expect(loadDraft()).toBeNull()
    })

    it('rascunho vazio remove a chave', () => {
      saveDraft(draft)
      saveDraft({ activeSet: draft.activeSet, lines: [] })
      expect(store.size).toBe(0)
    })

    it('storage que lança erro não quebra nada', () => {
      ;(globalThis as { localStorage?: unknown }).localStorage = {
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {
          throw new Error('quota')
        },
        removeItem: () => {
          throw new Error('blocked')
        },
      }
      expect(() => saveDraft(draft)).not.toThrow()
      expect(loadDraft()).toBeNull()
      expect(() => clearDraft()).not.toThrow()
    })
  })
})
