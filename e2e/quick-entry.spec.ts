import { expect, test, type Page, type Route } from '@playwright/test'
import { guardWrites, requireAuth } from './helpers'

// Entrada rápida (B1-*), Scanner -> lote (B3-1), catálogo ausente (B4-1) e lacunas do Probe (P-*).
// SEGURANÇA: guardWrites() aborta qualquer escrita REST não mockada; as RPCs get_set_printings /
// list_set_prefixes / add_collection_items_batch e a leitura de collection_items usam fixtures de sets
// inventados (TEST, TST2, BIG). Nada chega ao banco real.
test.describe('Entrada rápida (autenticado, tudo mockado)', () => {
  requireAuth()

  type Row = Record<string, unknown>
  const makeSet = (prefix: string, count: number, cardBase: number, ambiguousAt: number[] = []): Row[] =>
    Array.from({ length: count }, (_, i) => i + 1).flatMap((n) => {
      const num = String(n).padStart(3, '0')
      const row = (rarity: string): Row => ({
        card_id: cardBase + n,
        language: 'en',
        name: `Carta ${prefix} ${num}`,
        type: 'Normal Monster',
        set_code: `${prefix}-EN${num}`,
        set_prefix: prefix,
        set_region: 'EN',
        set_number: num,
        set_name: `Set ${prefix}`,
        set_rarity: rarity,
        set_rarity_code: null,
        set_price: null,
        image_url_small: null,
      })
      return ambiguousAt.includes(n) ? [row('Common'), row('Rare')] : [row('Common')]
    })

  /** TEST: 80 cartas (a 002 tem Common + Rare). TST2: 5 cartas (a 002 também). BIG: 700. */
  const SETS: Record<string, Row[]> = {
    TEST: makeSet('TEST', 80, 9000, [2]),
    TST2: makeSet('TST2', 5, 9500, [2]),
    BIG: makeSet('BIG', 700, 20000),
  }
  const fixture = SETS.TEST

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  interface Opts {
    printingsDelayMs?: number
    printingsFail?: () => boolean
    emptyPrintings?: boolean
    saveDelayMs?: number
    /** decide a resposta de cada chamada de escrita (1ª, 2ª...) */
    saveBehavior?: (call: number) => 'ok' | 'server-error' | 'network'
    saveBody?: unknown
    owned?: unknown[]
  }

  interface Probes {
    writes: Array<{ p_items: Array<Record<string, unknown>> }>
    printingsCalls: () => number
  }

  /** Limpa rascunhos do usuário (após o 1º goto) e opcionalmente semeia um. */
  async function prepare(page: Page, draft?: unknown) {
    await page.goto('/')
    await page.evaluate((seed) => {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i) as string
        if (k.startsWith('quickEntry')) keys.push(k)
      }
      keys.forEach((k) => localStorage.removeItem(k))
      if (seed !== undefined) {
        let uid = 'anon'
        for (let i = 0; i < localStorage.length; i += 1) {
          const k = localStorage.key(i) as string
          if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
            try {
              uid = JSON.parse(localStorage.getItem(k) as string).user?.id ?? 'anon'
            } catch {
              /* ignore */
            }
          }
        }
        localStorage.setItem(`quickEntryDraft:${uid}`, typeof seed === 'string' ? seed : JSON.stringify(seed))
      }
    }, draft)
  }

  async function setup(page: Page, opts: Opts = {}): Promise<Probes> {
    const writes: Probes['writes'] = []
    let printingsCalls = 0
    let writeCalls = 0
    await guardWrites(page) // PRIMEIRO: aborta escritas não mockadas

    await page.route('**/rest/v1/rpc/list_set_prefixes*', (route) =>
      json(route, [
        { set_prefix: 'TEST', regions: ['EN'], set_name: 'Set de Teste', total_cards: 80 },
        { set_prefix: 'TST2', regions: ['EN'], set_name: 'Set Dois', total_cards: 5 },
        { set_prefix: 'BIG', regions: ['EN'], set_name: 'Set Grande', total_cards: 700 },
      ]),
    )
    await page.route('**/rest/v1/rpc/get_set_printings*', async (route) => {
      printingsCalls += 1
      if (opts.printingsDelayMs) await new Promise((r) => setTimeout(r, opts.printingsDelayMs))
      if (opts.printingsFail?.()) return json(route, { message: 'x' }, 500)
      const body = route.request().postDataJSON() as { p_prefix?: string }
      return json(route, opts.emptyPrintings ? [] : (SETS[(body.p_prefix ?? 'TEST').toUpperCase()] ?? []))
    })
    await page.route('**/rest/v1/rpc/add_collection_items_batch*', async (route) => {
      writeCalls += 1
      writes.push(route.request().postDataJSON())
      if (opts.saveDelayMs) await new Promise((r) => setTimeout(r, opts.saveDelayMs))
      const behavior = opts.saveBehavior?.(writeCalls) ?? 'ok'
      if (behavior === 'network') return route.abort('connectionreset')
      if (behavior === 'server-error') return json(route, { message: 'falha simulada' }, 500)
      return json(route, opts.saveBody ?? { inserted: 1, updated: 1, total_quantity: 4 })
    })
    await page.route('**/rest/v1/collection_items*', (route) => {
      if (route.request().method() !== 'GET') return route.abort() // nunca escreve na coleção real
      return json(route, opts.owned ?? [])
    })
    return { writes, printingsCalls: () => printingsCalls }
  }

  const owned = (n: number, quantity = 1) => ({
    id: `mock-${n}`,
    user_id: 'mock',
    card_id: 9000 + n,
    language: 'en',
    set_code: `TEST-EN${String(n).padStart(3, '0')}`,
    set_name: 'Set TEST',
    set_rarity: 'Common',
    quantity,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  })

  const codes = (page: Page) => page.getByLabel('Números das cartas')
  const lines = (page: Page) => page.getByTestId('batch-line')
  const errorList = (page: Page) => page.getByRole('list', { name: 'Códigos com erro' })

  async function pickSet(page: Page, prefix = 'TEST', expectCards = '80 cartas', navigate = true) {
    if (navigate) await page.goto('/collection/rapido')
    const combo = page.getByRole('combobox', { name: /Set/ })
    await combo.fill(prefix.slice(0, 2))
    await page.getByRole('option', { name: new RegExp(prefix) }).click()
    await expect(page.getByTestId('set-summary')).toContainText(expectCards, { timeout: 15_000 })
    await expect(codes(page)).toBeEnabled()
  }

  async function typeCodes(page: Page, value: string) {
    await codes(page).fill(value)
    await codes(page).press('Enter')
  }

  test('B1-1 "Entrada rápida" na coleção leva a /collection/rapido (rota protegida, lazy)', async ({ page }) => {
    await setup(page)
    await page.goto('/collection')
    await page.getByRole('link', { name: 'Entrada rápida' }).click()
    await expect(page).toHaveURL(/\/collection\/rapido$/)
    await expect(page.getByRole('heading', { name: 'Entrada rápida por lote' })).toBeVisible()
  })

  test('B1-2 deep link abre a tela e o modal de busca por nome continua existindo', async ({ page }) => {
    await setup(page)
    await page.goto('/collection/rapido')
    await expect(page.getByRole('heading', { name: 'Entrada rápida por lote' })).toBeVisible({ timeout: 20_000 })
    await page.goto('/collection')
    await expect(page.getByRole('button', { name: 'Adicionar carta' })).toBeVisible()
  })

  test('B1-3 combobox de set: autocompletar, resumo com "você tem X/Y" e skeleton de carregamento', async ({ page }) => {
    await setup(page, { printingsDelayMs: 800, owned: [owned(1), owned(3)] })
    await page.goto('/collection/rapido')
    await page.getByRole('combobox', { name: /Set/ }).fill('lord')
    await page.getByRole('option', { name: /TEST/ }).click()
    await expect(page.getByText(/Carregando 80 cartas do set/)).toBeVisible()
    await expect(page.getByTestId('set-summary')).toContainText('TEST - Set TEST - 80 cartas - você tem 2/80')
  })

  test('B1-4 erro ao carregar o set mostra "Tentar novamente" e recupera', async ({ page }) => {
    let fail = true
    await setup(page, { printingsFail: () => fail })
    await page.goto('/collection/rapido')
    await page.getByRole('combobox', { name: /Set/ }).fill('TE')
    await page.getByRole('option', { name: /TEST/ }).click()
    await expect(page.getByText('Não foi possível carregar o set.')).toBeVisible({ timeout: 15_000 })
    fail = false
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('set-summary')).toContainText('80 cartas')
  })

  test('B1-5 set sem cartas mostra mensagem e dica de sincronização', async ({ page }) => {
    await setup(page, { emptyPrintings: true })
    await page.goto('/collection/rapido')
    await page.getByRole('combobox', { name: /Set/ }).fill('TE')
    await page.getByRole('option', { name: /TEST/ }).click()
    await expect(page.getByTestId('empty-set')).toContainText('Nenhuma carta encontrada')
    await expect(page.getByTestId('empty-set')).toContainText('sincronização do catálogo')
  })

  test('B1-6 campo de códigos: label visível, "1 5 12x3 40-45", anúncio e foco de volta ao campo', async ({ page }) => {
    await setup(page)
    await prepare(page)
    await pickSet(page)
    await expect(codes(page)).toHaveAttribute('aria-describedby', /.+/)
    await expect(codes(page)).toHaveAttribute('placeholder', '1 5 12x3 40-45 ou LIOV-EN001')
    await typeCodes(page, '1 5 12x3 40-45')
    await expect(lines(page)).toHaveCount(9)
    await expect(page.getByTestId('announce')).toContainText('9 adicionadas')
    await expect(codes(page)).toBeFocused()
    await expect(codes(page)).toHaveValue('')
    await expect(lines(page).first()).toContainText('TEST-EN045') // mais recente no topo
    await expect(page.getByRole('listitem', { name: /TEST-EN012, Carta TEST 012, Common, quantidade 3/ })).toBeVisible()
  })

  test('B1-7 raridade ambígua: chips, aviso, e só confirmada pode ser salva', async ({ page }) => {
    await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '2')
    const row = lines(page).first()
    await expect(row.getByRole('radiogroup')).toBeVisible()
    await expect(row).toContainText('Confirme a raridade')
    await expect(page.getByRole('button', { name: /Salvar tudo \(0\)/ })).toBeDisabled()
    await row.getByRole('radio', { name: 'Rare' }).click()
    await expect(page.getByRole('button', { name: /Salvar tudo \(1\)/ })).toBeEnabled()
    await row.getByRole('radio', { name: 'Rare' }).focus()
    await page.keyboard.press('ArrowLeft')
    await expect(row.getByRole('radio', { name: 'Common' })).toBeFocused()
  })

  test('B1-8 código inexistente: erro por linha com ícone+texto, sem travar o resto', async ({ page }) => {
    await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '1 999 lob5')
    await expect(lines(page)).toHaveCount(1)
    // o texto também vai ao aria-live (anúncio): a verificação é escopada à lista de erros
    await expect(errorList(page).getByText('TEST-EN999 não encontrado no catálogo')).toBeVisible()
    await expect(errorList(page).getByText(/lob5: prefixo LOB é de outro set/)).toBeVisible()
    await typeCodes(page, '5')
    await expect(lines(page)).toHaveCount(2)
  })

  test('B1-9 quantidade: -/+ (44px), alerta >= 4, "Você tem N → N+q" e remover', async ({ page }) => {
    await setup(page, { owned: [owned(1, 2)] })
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '1')
    const row = lines(page).first()
    await expect(row).toContainText('Você tem 2 → 3')
    const plus = row.getByRole('button', { name: /Aumentar a quantidade/ })
    const box = await plus.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
    await plus.click()
    await plus.click()
    await expect(row).toContainText('Você tem 2 → 5') // quantidade 3: ainda sem alerta
    await expect(row.getByText(/Quantidade alta/)).toHaveCount(0)
    await plus.click() // quantidade 4
    await expect(row.getByText('Quantidade alta (4): confira se está certo.')).toBeVisible()
    await expect(row).toContainText('Você tem 2 → 6')
    await row.getByRole('button', { name: /Diminuir a quantidade/ }).click()
    await expect(row.getByText(/Quantidade alta/)).toHaveCount(0)
    await row.getByRole('button', { name: /Remover Carta TEST 001/ }).click()
    await expect(lines(page)).toHaveCount(0)
  })

  test('B1-10 desfazer última, Ctrl+Z, Limpar com confirmação (ESC cancela)', async ({ page }) => {
    await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '1')
    await typeCodes(page, '10-12')
    await expect(lines(page)).toHaveCount(4)
    await page.getByRole('button', { name: 'Desfazer última' }).click() // intervalo = 1 ação
    await expect(lines(page)).toHaveCount(1)
    await codes(page).focus()
    await page.keyboard.press('Control+z')
    await expect(lines(page)).toHaveCount(0)
    await typeCodes(page, '1 5')
    await page.getByRole('button', { name: 'Limpar', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Limpar', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Limpar', exact: true }).click()
    await page.getByRole('button', { name: 'Limpar lote' }).click()
    await expect(lines(page)).toHaveCount(0)
  })

  test('B1-11 Salvar tudo dispara EXATAMENTE 1 escrita com itens somados; duplo clique não duplica', async ({ page }) => {
    const { writes } = await setup(page, { saveDelayMs: 600, saveBody: { inserted: 1, updated: 1, total_quantity: 4 } })
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '1 1 5x2')
    await expect(page.getByTestId('batch-summary')).toContainText('2 cartas - 2 novas - 0 atualizadas')
    await page.getByRole('button', { name: /Salvar tudo \(2\)/ }).dblclick()
    await expect(page.getByTestId('save-result')).toContainText('Salvas 2 cartas: 1 nova, 1 atualizada', { timeout: 10_000 })
    expect(writes).toHaveLength(1)
    expect(writes[0].p_items).toEqual([
      { card_id: 9001, language: 'en', set_code: 'TEST-EN001', set_name: 'Set TEST', set_rarity: 'Common', quantity: 2 },
      { card_id: 9005, language: 'en', set_code: 'TEST-EN005', set_name: 'Set TEST', set_rarity: 'Common', quantity: 2 },
    ])
    expect(JSON.stringify(writes[0])).not.toContain('user_id')
    await expect(lines(page)).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ver set no álbum' })).toHaveAttribute('href', '/collection?view=album&set=Set%20TEST')
    await page.getByRole('button', { name: 'Continuar (novo lote)' }).click()
    await expect(page.getByTestId('save-result')).toHaveCount(0)
    await expect(codes(page)).toBeFocused()
  })

  test('B1-12 salvar válidas e MANTER as ambíguas, com aviso; erro do servidor preserva o lote', async ({ page }) => {
    const { writes } = await setup(page, { saveBehavior: (n) => (n === 1 ? 'server-error' : 'ok'), saveBody: { inserted: 1, updated: 0, total_quantity: 1 } })
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '1 2')
    await expect(page.getByTestId('kept-warning')).toContainText('1 carta ficará no lote')
    await page.getByRole('button', { name: /Salvar tudo \(1\)/ }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Nada foi salvo' })).toBeVisible()
    await expect(lines(page)).toHaveCount(2) // lote preservado
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('save-result')).toContainText('1 ficou no lote aguardando confirmação')
    await expect(lines(page)).toHaveCount(1)
    await expect(lines(page).first()).toContainText('TEST-EN002')
    expect(writes.at(-1)?.p_items).toHaveLength(1)
  })

  test('B1-13 rascunho restaurado ao recarregar; 360px sem rolagem horizontal e rodapé visível', async ({ page }) => {
    await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '3 4x2')
    await expect(lines(page)).toHaveCount(2)
    await page.reload()
    await expect(lines(page)).toHaveCount(2, { timeout: 15_000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const footer = page.getByRole('button', { name: /Salvar tudo/ })
    await expect(footer).toBeInViewport()
    expect((await footer.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  })

  test('B1-14 erro de rede ao salvar: confere a coleção e NUNCA diz "Nada foi salvo"', async ({ page }) => {
    const { writes } = await setup(page, { saveBehavior: () => 'network' })
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '1')
    await page.getByRole('button', { name: /Salvar tudo \(1\)/ }).click()
    const alert = page.getByRole('alert').filter({ hasText: 'Sem conexão estável' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await expect(alert).not.toContainText('Nada foi salvo')
    await expect(alert).not.toContainText('Failed to fetch')
    await expect(alert).toContainText('nenhuma carta do lote entrou')
    await expect(lines(page)).toHaveCount(1)
    expect(writes).toHaveLength(1)
  })

  test('B3-1 Scanner: contador flutuante "Lote (N)" abre a revisão com o mesmo estado', async ({ page }) => {
    await setup(page)
    await prepare(page, {
      version: 1,
      activeSet: null,
      lines: [
        {
          key: '9001|TEST-EN001|Common',
          cardId: 9001,
          language: 'en',
          name: 'Carta TEST 001',
          setCode: 'TEST-EN001',
          setName: 'Set TEST',
          setRarity: 'Common',
          quantity: 1,
          rarityOptions: ['Common'],
        },
      ],
    })
    await page.goto('/scanner')
    const counter = page.getByRole('link', { name: 'Revisar lote com 1 cartas' })
    await expect(counter).toBeVisible({ timeout: 20_000 })
    await expect(counter).toHaveText('Lote (1)')
    await counter.click()
    await expect(page).toHaveURL(/\/collection\/rapido$/)
    await expect(lines(page)).toHaveCount(1)
    await expect(page.getByRole('button', { name: /Salvar tudo \(1\)/ })).toBeEnabled()
  })

  test('B4-1 código ausente do catálogo: erro, dica e "Copiar códigos não encontrados" (nada é criado)', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined)
    const { writes } = await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '500')
    await expect(errorList(page).getByText('TEST-EN500 não encontrado no catálogo')).toBeVisible()
    await expect(page.getByText(/cartas muito novas podem demorar a aparecer/i)).toBeVisible()
    await page.getByRole('button', { name: 'Copiar códigos não encontrados' }).click()
    await expect(page.getByTestId('announce')).toContainText(/copiado|Não foi possível copiar/)
    expect(writes).toHaveLength(0)
  })

  // ---------------- Lacunas do Probe ----------------

  test('P-1 normalizações na UI: 001, en001, test001, TEST-EN001, test-en1 e "12 x 3"', async ({ page }) => {
    await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '001 en001 test001 TEST-EN001 test-en1 12 x 3')
    await expect(page.getByTestId('announce')).toContainText('6 adicionadas')
    await expect(lines(page)).toHaveCount(2)
    await expect(page.getByRole('listitem', { name: /TEST-EN001, .*quantidade 5/ })).toBeVisible()
    await expect(page.getByRole('listitem', { name: /TEST-EN012, .*quantidade 3/ })).toBeVisible()
  })

  test('P-2 resolução local: 20 códigos digitados não fazem nova consulta ao catálogo', async ({ page }) => {
    const probes = await setup(page)
    await prepare(page)
    await pickSet(page)
    const before = probes.printingsCalls()
    for (let n = 3; n < 23; n += 1) await typeCodes(page, String(n))
    await expect(lines(page)).toHaveCount(20)
    expect(probes.printingsCalls()).toBe(before)
  })

  test('P-3 intervalo > 60 pede confirmação (confirmar/cancelar) e acima de 2000 é erro duro', async ({ page }) => {
    await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '1-70')
    const alert = page.getByRole('alert').filter({ hasText: 'Confirmação necessária' })
    await expect(alert).toBeVisible()
    await expect(lines(page)).toHaveCount(0)
    await alert.getByRole('button', { name: 'Cancelar' }).click()
    await expect(lines(page)).toHaveCount(0)
    await typeCodes(page, '1-70')
    await page.getByRole('button', { name: 'Confirmar' }).click()
    // 70 números: 1-70 existem (002 ambígua entra como linha não confirmada)
    await expect(lines(page)).toHaveCount(70)
    await typeCodes(page, '1-2001')
    await expect(errorList(page).getByText(/intervalo acima do máximo de 2000/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar' })).toHaveCount(0)
  })

  test('P-4 trocar de set com ambígua pendente: ainda dá para confirmar a raridade', async ({ page }) => {
    await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '2')
    await pickSet(page, 'TST2', '5 cartas', false)
    const row = lines(page).first()
    await expect(row).toContainText('TEST-EN002')
    await row.getByRole('radio', { name: 'Rare' }).click()
    await expect(row.getByText('Confirme a raridade')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Salvar tudo \(1\)/ })).toBeEnabled()
  })

  test('P-5 atalhos: Ctrl+Z/Ctrl+Enter/Esc só no campo de códigos ou fora de campos; nunca em diálogo', async ({ page }) => {
    const { writes } = await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '1 5')
    await expect(lines(page)).toHaveCount(2)
    // foco no campo de Região (outro input): atalhos ignorados
    const region = page.getByLabel('Região')
    await region.focus()
    await page.keyboard.press('Control+z')
    await expect(lines(page)).toHaveCount(2)
    await page.keyboard.press('Control+Enter')
    expect(writes).toHaveLength(0)
    // foco em um botão (fora de campos de texto): Ctrl+Z desfaz
    await page.getByRole('button', { name: 'Desfazer última' }).focus()
    await page.keyboard.press('Control+z')
    await expect(lines(page)).toHaveCount(1)
    // Esc com foco fora do campo não sai da tela
    await page.getByRole('button', { name: 'Desfazer última' }).focus()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/collection\/rapido$/)
    // diálogo aberto: Ctrl+Enter e Ctrl+Z não agem no lote por baixo
    await page.getByRole('button', { name: 'Limpar', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Control+Enter')
    await page.keyboard.press('Control+z')
    expect(writes).toHaveLength(0)
    await page.keyboard.press('Escape')
    await expect(lines(page)).toHaveCount(1)
  })

  test('P-6 falha parcial por chunk (700 linhas): reenvia só o restante, sem duplicar', async ({ page }) => {
    const { writes } = await setup(page, {
      saveBehavior: (n) => (n === 2 ? 'server-error' : 'ok'),
      saveBody: { inserted: 500, updated: 0, total_quantity: 500 },
    })
    await prepare(page)
    await pickSet(page, 'BIG', '700 cartas')
    await typeCodes(page, '1-700')
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(lines(page)).toHaveCount(700)
    await page.getByRole('button', { name: /Salvar tudo \(700\)/ }).click()
    const alert = page.getByRole('alert').filter({ hasText: '1 de 2 partes' })
    await expect(alert).toBeVisible({ timeout: 20_000 })
    expect(writes).toHaveLength(2)
    expect(writes[0].p_items).toHaveLength(500)
    await expect(lines(page)).toHaveCount(200) // só o restante ficou
    await page.unroute('**/rest/v1/rpc/add_collection_items_batch*')
    await page.route('**/rest/v1/rpc/add_collection_items_batch*', (route) => {
      writes.push(route.request().postDataJSON())
      return json(route, { inserted: 200, updated: 0, total_quantity: 200 })
    })
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('save-result')).toBeVisible({ timeout: 20_000 })
    const retry = writes.at(-1)?.p_items as Array<{ card_id: number }>
    expect(retry).toHaveLength(200)
    expect(retry[0].card_id).toBe(20501) // só o restante (501..700)
    expect(retry.at(-1)?.card_id).toBe(20700)
  })

  test('P-7 rascunho corrompido: a tela abre vazia, sem quebrar', async ({ page }) => {
    await setup(page)
    await prepare(page, '{"version":1,"lines":[{"nope":true}')
    await page.goto('/collection/rapido')
    await expect(page.getByRole('heading', { name: 'Entrada rápida por lote' })).toBeVisible({ timeout: 20_000 })
    await expect(lines(page)).toHaveCount(0)
    await prepare(page, { version: 99, lines: [] })
    await page.goto('/collection/rapido')
    await expect(lines(page)).toHaveCount(0)
  })

  test('P-8 modal "Limpar" cabe em 360px (sem rolagem horizontal)', async ({ page }) => {
    await setup(page)
    await prepare(page)
    await pickSet(page)
    await typeCodes(page, '1')
    await page.getByRole('button', { name: 'Limpar', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    const width = page.viewportSize()?.width ?? 360
    expect(box && box.x >= 0 && box.x + box.width <= width + 1).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
