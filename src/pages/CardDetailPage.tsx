import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Minus,
  Package,
  Plus,
} from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import {
  findNeighborCardBySetCode,
  getAvailableCardLanguages,
  getCardById,
} from '@/services/catalogService'
import {
  addToCollection,
  listCollectionItemsByCardId,
  updateCollectionImpression,
  updateCollectionQuantity,
} from '@/services/collectionService'
import {
  invokeMirrorCardFull,
  isYgoHostedUrl,
} from '@/services/imageSyncService'
import type { AppLanguage, Card, CardImage, CardSet, CollectionItem } from '@/types'
import { getUsdBrlRate } from '@/services/currencyService'
import {
  buildCardDetailPath,
  convertUsdToBrl,
  detectRegion,
  formatBrl,
  formatUsd,
  getCardCategory,
  getPrimaryImage,
  languageLabel,
  parseBanlistInfo,
  parseCardSets,
  parseSetPriceUsd,
  parseYgoSetCode,
  resolveCardSet,
} from '@/utils/cardHelpers'

type SetNeighbor = {
  cardId: number
  language: AppLanguage
  setCode: string
  setRarity: string
  setName: string
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 border-b border-[var(--color-border)]/60 py-2 text-sm last:border-b-0">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--color-text)]">{value}</dd>
    </div>
  )
}

export function CardDetailPage() {
  const { cardId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { language: settingsLanguage } = useSettings()

  const language = (searchParams.get('lang') as AppLanguage | null) ?? settingsLanguage
  const selectedSetCode = searchParams.get('set') ?? ''
  const selectedRarity = searchParams.get('rarity') ?? ''
  const selectedSetName = searchParams.get('setName') ?? ''

  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [ownedItems, setOwnedItems] = useState<CollectionItem[]>([])
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [collectionBusyId, setCollectionBusyId] = useState<string | null>(null)
  const [collectionMessage, setCollectionMessage] = useState<string | null>(null)
  const [availableLanguages, setAvailableLanguages] = useState<AppLanguage[]>([])
  const [usdBrlRate, setUsdBrlRate] = useState<number | null>(null)
  const [prevNeighbor, setPrevNeighbor] = useState<SetNeighbor | null>(null)
  const [nextNeighbor, setNextNeighbor] = useState<SetNeighbor | null>(null)
  const [neighborLoading, setNeighborLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const id = Number(cardId)

    async function load() {
      if (!Number.isFinite(id)) {
        setError('ID de carta inválido')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const [langs, loaded] = await Promise.all([
          getAvailableCardLanguages(id),
          getCardById(id, language, { fallbackToEn: false }).then(async (exact) => {
            if (exact) return exact
            return getCardById(id, language)
          }),
        ])
        if (!mounted) return

        setAvailableLanguages(langs)

        let data = loaded
        if (!data) {
          setError('Carta não encontrada neste idioma.')
          setCard(null)
        } else {
          // Full sob demanda: se ainda aponta para YGOPRODeck, espelha no Storage
          const primary = getPrimaryImage(data)
          if (isYgoHostedUrl(primary.full)) {
            const mirror = await invokeMirrorCardFull({
              language: data.language,
              cardId: data.id,
            })
            if (mirror.success && mirror.card_images) {
              data = {
                ...data,
                card_images: mirror.card_images as CardImage[],
              }
            } else if (mirror.success) {
              const refreshed = await getCardById(data.id, data.language, {
                fallbackToEn: false,
              })
              if (refreshed) data = refreshed
            }
          }

          if (!mounted) return
          setCard(data)
          // Se caiu no fallback EN, reflete na URL para links/coleção
          if (data.language !== language && searchParams.get('lang') !== data.language) {
            const next = new URLSearchParams(searchParams)
            next.set('lang', data.language)
            navigate(`/cards/${id}?${next.toString()}`, { replace: true })
          }
        }
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar carta')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [cardId, language])

  function switchLanguage(nextLang: AppLanguage) {
    if (nextLang === language) return
    const next = new URLSearchParams(searchParams)
    next.set('lang', nextLang)
    navigate(`/cards/${cardId}?${next.toString()}`)
  }

  const sets = useMemo(() => (card ? parseCardSets(card.card_sets) : []), [card])
  const selectedSet: CardSet | null = useMemo(
    () =>
      resolveCardSet(sets, {
        setCode: selectedSetCode,
        setRarity: selectedRarity,
        setName: selectedSetName,
      }),
    [sets, selectedSetCode, selectedRarity, selectedSetName],
  )

  // Completa set/rarity na URL quando a impressão resolvida ainda não está pinada
  useEffect(() => {
    if (!card || !selectedSet) return

    const next = new URLSearchParams(searchParams)
    let changed = false

    if (!selectedSetCode) {
      next.set('set', selectedSet.set_code)
      changed = true
    }

    // Só completa rarity/name se o set da URL é o mesmo resolvido
    if (
      selectedSetCode &&
      selectedSet.set_code.toLowerCase() !== selectedSetCode.toLowerCase()
    ) {
      return
    }

    if (
      selectedSet.set_rarity &&
      selectedRarity.toLowerCase() !== selectedSet.set_rarity.toLowerCase()
    ) {
      next.set('rarity', selectedSet.set_rarity)
      changed = true
    }

    const sameCodeRarity = sets.filter(
      (s) =>
        s.set_code.toLowerCase() === selectedSet.set_code.toLowerCase() &&
        (s.set_rarity || '').toLowerCase() ===
          (selectedSet.set_rarity || '').toLowerCase(),
    )
    if (
      sameCodeRarity.length > 1 &&
      selectedSet.set_name &&
      selectedSetName.toLowerCase() !== selectedSet.set_name.toLowerCase()
    ) {
      next.set('setName', selectedSet.set_name)
      changed = true
    }

    if (!changed) return
    if (card.language) next.set('lang', card.language)
    navigate(`/cards/${card.id}?${next.toString()}`, { replace: true })
  }, [
    card,
    selectedSet,
    selectedSetCode,
    selectedRarity,
    selectedSetName,
    sets,
    searchParams,
    navigate,
  ])

  useEffect(() => {
    let mounted = true

    async function loadRate() {
      try {
        const rate = await getUsdBrlRate()
        if (mounted) setUsdBrlRate(rate)
      } catch {
        if (mounted) setUsdBrlRate(null)
      }
    }

    void loadRate()
    return () => {
      mounted = false
    }
  }, [])

  const selectedPriceUsd = useMemo(
    () => parseSetPriceUsd(selectedSet?.set_price),
    [selectedSet],
  )
  const selectedPriceBrl =
    selectedPriceUsd != null && usdBrlRate != null
      ? convertUsdToBrl(selectedPriceUsd, usdBrlRate)
      : null

  useEffect(() => {
    let mounted = true

    async function loadOwned() {
      if (!card) {
        setOwnedItems([])
        return
      }

      setCollectionLoading(true)
      setCollectionMessage(null)
      try {
        const items = await listCollectionItemsByCardId(card.id)
        if (mounted) setOwnedItems(items)
      } catch {
        if (mounted) setOwnedItems([])
      } finally {
        if (mounted) setCollectionLoading(false)
      }
    }

    void loadOwned()
    return () => {
      mounted = false
    }
  }, [card])

  const images = card ? getPrimaryImage(card) : { full: null, small: null }
  const banlist = card ? parseBanlistInfo(card.banlist_info) : null
  const region = selectedSet
    ? detectRegion(selectedSet.set_code, banlist)
    : 'Unknown'
  const category = card ? getCardCategory(card.type) : null

  const selectedOwnedItem = useMemo(() => {
    if (!selectedSet) return null
    return (
      ownedItems.find(
        (item) =>
          item.set_code.toLowerCase() === selectedSet.set_code.toLowerCase() &&
          (item.set_rarity || '') === (selectedSet.set_rarity || ''),
      ) ?? null
    )
  }, [ownedItems, selectedSet])

  function upsertOwnedItem(item: CollectionItem) {
    setOwnedItems((prev) => {
      const without = prev.filter((row) => row.id !== item.id)
      return [...without, item].sort((a, b) =>
        a.set_code.localeCompare(b.set_code, 'en'),
      )
    })
  }

  function removeOwnedItem(id: string) {
    setOwnedItems((prev) => prev.filter((row) => row.id !== id))
  }

  async function handleAddImpression(set: CardSet) {
    if (!card) return

    const busyKey = `add:${set.set_code}|${set.set_rarity || ''}`
    setCollectionBusyId(busyKey)
    setCollectionMessage(null)
    try {
      const item = await addToCollection({
        card_id: card.id,
        language: card.language,
        set_code: set.set_code,
        set_name: set.set_name,
        set_rarity: set.set_rarity || '',
        quantity: 1,
      })
      upsertOwnedItem(item)
      setCollectionMessage(
        item.quantity > 1
          ? `${set.set_code}: quantidade ${item.quantity}.`
          : `${set.set_code}: adicionada à coleção!`,
      )
    } catch (err) {
      setCollectionMessage(
        err instanceof Error ? err.message : 'Falha ao adicionar à coleção',
      )
    } finally {
      setCollectionBusyId(null)
    }
  }

  async function handleIncrementOwned(item: CollectionItem) {
    setCollectionBusyId(item.id)
    setCollectionMessage(null)
    try {
      const updated = await updateCollectionQuantity(item.id, item.quantity + 1)
      if (updated) {
        upsertOwnedItem(updated)
        setCollectionMessage(
          `${updated.set_code}: quantidade ${updated.quantity}.`,
        )
      }
    } catch (err) {
      setCollectionMessage(
        err instanceof Error ? err.message : 'Falha ao atualizar quantidade',
      )
    } finally {
      setCollectionBusyId(null)
    }
  }

  async function handleDecrementOwned(item: CollectionItem) {
    setCollectionBusyId(item.id)
    setCollectionMessage(null)
    try {
      const updated = await updateCollectionQuantity(item.id, item.quantity - 1)
      if (updated) {
        upsertOwnedItem(updated)
        setCollectionMessage(
          `${updated.set_code}: quantidade ${updated.quantity}.`,
        )
      } else {
        removeOwnedItem(item.id)
        setCollectionMessage(`${item.set_code}: removida da coleção.`)
      }
    } catch (err) {
      setCollectionMessage(
        err instanceof Error ? err.message : 'Falha ao atualizar quantidade',
      )
    } finally {
      setCollectionBusyId(null)
    }
  }

  function setKey(set: CardSet): string {
    return `${set.set_code}||${set.set_rarity || ''}||${set.set_name}`
  }

  function impressionOptionsForItem(item: CollectionItem): CardSet[] {
    return sets.filter(
      (set) => set.set_code.toLowerCase() === item.set_code.toLowerCase(),
    )
  }

  async function handleChangeOwnedImpression(
    item: CollectionItem,
    nextKey: string,
  ) {
    const [setCode, setRarity = '', setName = ''] = nextKey.split('||')
    if (!setCode) return
    if (
      item.set_code.toLowerCase() === setCode.toLowerCase() &&
      (item.set_rarity || '') === setRarity &&
      (item.set_name || '') === setName
    ) {
      return
    }

    setCollectionBusyId(item.id)
    setCollectionMessage(null)
    try {
      const updated = await updateCollectionImpression(item.id, {
        set_code: setCode,
        set_rarity: setRarity,
        set_name: setName,
      })

      setOwnedItems((prev) => {
        const without = prev.filter(
          (row) => row.id !== item.id && row.id !== updated.id,
        )
        return [...without, updated].sort((a, b) =>
          a.set_code.localeCompare(b.set_code, 'en'),
        )
      })

      setCollectionMessage(
        `Impressão corrigida: ${updated.set_code}${
          updated.set_rarity ? ` · ${updated.set_rarity}` : ''
        }.`,
      )

      navigate(
        buildCardDetailPath(card!.id, {
          lang: card!.language,
          setCode: updated.set_code,
          setRarity: updated.set_rarity,
          setName: updated.set_name,
        }),
        { replace: true },
      )
    } catch (err) {
      setCollectionMessage(
        err instanceof Error ? err.message : 'Falha ao trocar raridade',
      )
    } finally {
      setCollectionBusyId(null)
    }
  }

  function handleSelectRarityView(nextKey: string) {
    const [setCode, setRarity = '', setName = ''] = nextKey.split('||')
    if (!card || !setCode) return
    navigate(
      buildCardDetailPath(card.id, {
        lang: card.language,
        setCode,
        setRarity,
        setName,
      }),
    )
  }

  const rarityChoicesForSelected = useMemo(() => {
    if (!selectedSet) return []
    const sameCode = sets.filter(
      (set) =>
        set.set_code.toLowerCase() === selectedSet.set_code.toLowerCase(),
    )
    return sameCode.length > 1 ? sameCode : []
  }, [sets, selectedSet])

  const canNavigateSet = Boolean(
    selectedSet?.set_code && parseYgoSetCode(selectedSet.set_code),
  )

  useEffect(() => {
    let mounted = true
    const code = selectedSet?.set_code ?? ''

    if (!code || !parseYgoSetCode(code)) {
      setPrevNeighbor(null)
      setNextNeighbor(null)
      setNeighborLoading(false)
      return
    }

    setNeighborLoading(true)
    const currentId = Number(cardId)
    void Promise.all([
      findNeighborCardBySetCode({
        setCode: code,
        direction: 'prev',
        language,
        maxSkip: 1,
        excludeCardId: Number.isFinite(currentId) ? currentId : undefined,
      }),
      findNeighborCardBySetCode({
        setCode: code,
        direction: 'next',
        language,
        maxSkip: 1,
        excludeCardId: Number.isFinite(currentId) ? currentId : undefined,
      }),
    ])
      .then(([prev, next]) => {
        if (!mounted) return
        setPrevNeighbor(
          prev
            ? {
                cardId: prev.card.id,
                language: prev.card.language,
                setCode: prev.setCode,
                setRarity: prev.matchedSet.set_rarity || '',
                setName: prev.matchedSet.set_name,
              }
            : null,
        )
        setNextNeighbor(
          next
            ? {
                cardId: next.card.id,
                language: next.card.language,
                setCode: next.setCode,
                setRarity: next.matchedSet.set_rarity || '',
                setName: next.matchedSet.set_name,
              }
            : null,
        )
      })
      .catch(() => {
        if (!mounted) return
        setPrevNeighbor(null)
        setNextNeighbor(null)
      })
      .finally(() => {
        if (mounted) setNeighborLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedSet?.set_code, language, cardId])

  function goToSetNeighbor(neighbor: SetNeighbor) {
    navigate(
      buildCardDetailPath(neighbor.cardId, {
        lang: neighbor.language,
        setCode: neighbor.setCode,
        setRarity: neighbor.setRarity,
        setName: neighbor.setName,
      }),
    )
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === 'ArrowLeft' && prevNeighbor) {
        event.preventDefault()
        goToSetNeighbor(prevNeighbor)
      } else if (event.key === 'ArrowRight' && nextNeighbor) {
        event.preventDefault()
        goToSetNeighbor(nextNeighbor)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [prevNeighbor, nextNeighbor])

  if (!card) {
    if (loading) {
      return (
        <div className="text-sm text-[var(--color-muted)]">
          Carregando detalhes da carta...
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
          {error ?? 'Carta não encontrada'}
        </p>
      </div>
    )
  }

  const detailCard = card

  return (
    <div className="relative space-y-6">
      {loading && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)] shadow">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Carregando impressão...
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </button>
        <Link to="/" className="text-sm text-[var(--color-accent)] hover:underline">
          Nova busca
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/30">
            {images.full ? (
              <img
                src={images.full}
                alt={detailCard.name}
                className="w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[59/86] items-center justify-center text-sm text-[var(--color-muted)]">
                Sem imagem
              </div>
            )}

            {!neighborLoading && prevNeighbor && (
              <button
                type="button"
                aria-label={`Impressão anterior (${prevNeighbor.setCode})`}
                title={prevNeighbor.setCode}
                onClick={() => goToSetNeighbor(prevNeighbor)}
                className="absolute top-1/2 left-2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/75"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {!neighborLoading && nextNeighbor && (
              <button
                type="button"
                aria-label={`Próxima impressão (${nextNeighbor.setCode})`}
                title={nextNeighbor.setCode}
                onClick={() => goToSetNeighbor(nextNeighbor)}
                className="absolute top-1/2 right-2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/75"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {canNavigateSet &&
            !neighborLoading &&
            (prevNeighbor || nextNeighbor) && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-3 py-2">
              {prevNeighbor ? (
                <button
                  type="button"
                  onClick={() => goToSetNeighbor(prevNeighbor)}
                  className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-lg px-2 py-1.5 text-left text-xs text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate font-mono">{prevNeighbor.setCode}</span>
                </button>
              ) : (
                <span className="min-w-0 flex-1" />
              )}
              <span className="shrink-0 font-mono text-xs font-semibold text-[var(--color-accent)]">
                {selectedSet?.set_code}
              </span>
              {nextNeighbor ? (
                <button
                  type="button"
                  onClick={() => goToSetNeighbor(nextNeighbor)}
                  className="inline-flex min-w-0 flex-1 items-center justify-end gap-1 rounded-lg px-2 py-1.5 text-right text-xs text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
                >
                  <span className="truncate font-mono">{nextNeighbor.setCode}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              ) : (
                <span className="min-w-0 flex-1" />
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BookmarkPlus className="h-4 w-4 text-[var(--color-accent)]" />
              Minha coleção
            </div>

            {collectionLoading ? (
              <p className="text-xs text-[var(--color-muted)]">Verificando coleção...</p>
            ) : (
              <>
                {ownedItems.map((item) => {
                  const busy = collectionBusyId === item.id
                  const options = impressionOptionsForItem(item)
                  const currentKey = `${item.set_code}||${item.set_rarity || ''}||${item.set_name}`
                  const canFixRarity = options.length > 1
                  const matchesSelectedSet =
                    Boolean(selectedSet) &&
                    item.set_code.toLowerCase() ===
                      selectedSet!.set_code.toLowerCase()
                  return (
                    <div
                      key={item.id}
                      className={[
                        'rounded-2xl border p-4 transition',
                        matchesSelectedSet
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 ring-2 ring-[var(--color-accent)]/45 shadow-[0_0_24px_-8px_var(--color-accent)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)]/60',
                      ].join(' ')}
                    >
                      {matchesSelectedSet ? (
                        <p className="mb-2 text-[10px] font-semibold tracking-wide text-[var(--color-accent)] uppercase">
                          Impressão selecionada · na coleção
                        </p>
                      ) : null}
                      <p className="text-xs text-[var(--color-muted)]">
                        Impressão:{' '}
                        <span
                          className={[
                            'font-mono',
                            matchesSelectedSet
                              ? 'font-semibold text-[var(--color-accent)]'
                              : 'text-[var(--color-text)]',
                          ].join(' ')}
                        >
                          {item.set_code}
                        </span>
                        {item.set_rarity ? ` · ${item.set_rarity}` : ''}
                      </p>
                      {item.set_name ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-muted)]">
                          {item.set_name}
                        </p>
                      ) : null}
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--color-success)]">
                        <Check className="h-4 w-4" />
                        Na coleção
                      </p>

                      {canFixRarity ? (
                        <div className="mt-3">
                          <label className="mb-1 block text-[11px] text-[var(--color-muted)]">
                            Trocar raridade
                          </label>
                          <select
                            value={
                              options.some((set) => setKey(set) === currentKey)
                                ? currentKey
                                : setKey(options[0])
                            }
                            disabled={Boolean(collectionBusyId)}
                            onChange={(e) =>
                              void handleChangeOwnedImpression(
                                item,
                                e.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs outline-none ring-[var(--color-accent)] focus:ring-2 disabled:opacity-50"
                          >
                            {options.map((set) => (
                              <option key={setKey(set)} value={setKey(set)}>
                                {set.set_rarity || '—'}
                                {set.set_name ? ` · ${set.set_name}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="mt-3 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          title="Remover 1"
                          disabled={Boolean(collectionBusyId)}
                          onClick={() => void handleDecrementOwned(item)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] transition hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-red-300 disabled:opacity-50"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Minus className="h-4 w-4" />
                          )}
                        </button>
                        <span
                          className="min-w-10 text-center text-lg font-semibold tabular-nums"
                          aria-live="polite"
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          title="Adicionar 1"
                          disabled={Boolean(collectionBusyId)}
                          onClick={() => void handleIncrementOwned(item)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {selectedSet && !selectedOwnedItem && (
                  <div className="rounded-2xl border border-[var(--color-accent)] bg-[var(--color-accent)]/15 p-4 ring-2 ring-[var(--color-accent)]/45 shadow-[0_0_24px_-8px_var(--color-accent)]">
                    <p className="mb-2 text-[10px] font-semibold tracking-wide text-[var(--color-accent)] uppercase">
                      Impressão selecionada · ainda não na coleção
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      Impressão selecionada:{' '}
                      <span className="font-mono font-semibold text-[var(--color-accent)]">
                        {selectedSet.set_code}
                      </span>
                      {selectedSet.set_rarity ? ` · ${selectedSet.set_rarity}` : ''}
                    </p>
                    <button
                      type="button"
                      disabled={Boolean(collectionBusyId)}
                      onClick={() => void handleAddImpression(selectedSet)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {collectionBusyId?.startsWith('add:') ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BookmarkPlus className="h-4 w-4" />
                      )}
                      Adicionar esta impressão
                    </button>
                  </div>
                )}

                {!collectionLoading && ownedItems.length === 0 && !selectedSet && (
                  <p className="text-xs text-[var(--color-muted)]">
                    Selecione uma versão para adicionar à coleção.
                  </p>
                )}
              </>
            )}

            {collectionMessage && (
              <p className="text-xs text-[var(--color-muted)]">{collectionMessage}</p>
            )}

            <Link
              to="/collection"
              className="block text-center text-xs text-[var(--color-accent)] hover:underline"
            >
              Ver minha coleção
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs tracking-wide text-[var(--color-muted)] uppercase">
              Carta
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{card.name}</h1>
            {card.archetype && (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Arquétipo: {card.archetype}
              </p>
            )}
          </div>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-[var(--color-accent)]" />
              <h2 className="text-sm font-semibold tracking-wide uppercase">
                Impressão / Colecionismo
              </h2>
            </div>

            <dl>
              <DetailRow label="Carta" value={card.name} />
              <DetailRow
                label="Impressão"
                value={
                  <span className="font-mono text-base font-bold text-[var(--color-accent)]">
                    {selectedSet?.set_code ?? '—'}
                  </span>
                }
              />
              <DetailRow label="Edição" value={selectedSet?.set_name ?? '—'} />
              <DetailRow
                label="Raridade"
                value={
                  rarityChoicesForSelected.length > 1 && selectedSet ? (
                    <div className="space-y-1">
                      <select
                        value={setKey(selectedSet)}
                        onChange={(e) => handleSelectRarityView(e.target.value)}
                        className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
                      >
                        {rarityChoicesForSelected.map((set) => (
                          <option key={setKey(set)} value={setKey(set)}>
                            {set.set_rarity || '—'}
                            {set.set_price
                              ? ` · ${parseSetPriceUsd(set.set_price) != null ? formatUsd(parseSetPriceUsd(set.set_price)!) : set.set_price}`
                              : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] font-normal text-[var(--color-muted)]">
                        Mesmo set code com raridades diferentes — escolha a correta.
                      </p>
                    </div>
                  ) : (
                    (selectedSet?.set_rarity ?? '—')
                  )
                }
              />
              <DetailRow
                label="Preço"
                value={
                  selectedPriceUsd != null ? (
                    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-base font-semibold text-[var(--color-accent)]">
                        {selectedPriceBrl != null
                          ? formatBrl(selectedPriceBrl)
                          : 'Calculando…'}
                      </span>
                      <span className="text-xs font-normal text-[var(--color-muted)]">
                        ({formatUsd(selectedPriceUsd)}
                        {usdBrlRate != null
                          ? ` · cotação ${usdBrlRate.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}`
                          : ''}
                        )
                      </span>
                    </span>
                  ) : (
                    'Indisponível'
                  )
                }
              />
              <DetailRow
                label="Idioma"
                value={
                  availableLanguages.length > 1 ? (
                    <div className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5">
                      {availableLanguages.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => switchLanguage(lang)}
                          className={[
                            'rounded-md px-2.5 py-1 text-xs font-medium transition',
                            card.language === lang
                              ? 'bg-[var(--color-accent)] text-white'
                              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
                          ].join(' ')}
                        >
                          {languageLabel(lang)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    languageLabel(card.language)
                  )
                }
              />
              <DetailRow
                label="Região"
                value={region === 'Unknown' ? 'Não identificado' : region}
              />
            </dl>

            {sets.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">
                  Versões / set codes ({sets.length})
                </p>
                <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-surface-2)]/40 p-2">
                  {sets.map((set) => {
                    const active =
                      selectedSet?.set_code.toLowerCase() ===
                        set.set_code.toLowerCase() &&
                      selectedSet?.set_rarity === set.set_rarity &&
                      selectedSet?.set_name === set.set_name
                    const albumUrl = `/collection?view=album&set=${encodeURIComponent(set.set_name)}`
                    const versionPriceUsd = parseSetPriceUsd(set.set_price)
                    const versionPriceBrl =
                      versionPriceUsd != null && usdBrlRate != null
                        ? convertUsdToBrl(versionPriceUsd, usdBrlRate)
                        : null
                    return (
                      <div
                        key={`${set.set_code}-${set.set_rarity}-${set.set_name}`}
                        className={[
                          'flex items-center gap-1 rounded-lg border pr-1 transition',
                          active
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-text)]'
                            : 'border-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
                        ].join(' ')}
                      >
                        <Link
                          to={buildCardDetailPath(card.id, {
                            lang: card.language,
                            setCode: set.set_code,
                            setRarity: set.set_rarity,
                            setName: set.set_name,
                          })}
                          className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <span className="font-mono text-xs font-semibold text-[var(--color-accent)]">
                            {set.set_code}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs">
                            {set.set_name}
                          </span>
                          <span className="shrink-0 text-xs opacity-80">
                            {set.set_rarity || '—'}
                          </span>
                          <span className="w-full shrink-0 text-right text-[11px] tabular-nums opacity-90 sm:w-auto">
                            {versionPriceBrl != null
                              ? formatBrl(versionPriceBrl)
                              : versionPriceUsd != null
                                ? formatUsd(versionPriceUsd)
                                : '—'}
                          </span>
                        </Link>
                        <Link
                          to={albumUrl}
                          title={`Ver álbum: ${set.set_name}`}
                          aria-label={`Ver álbum da coleção ${set.set_name}`}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--color-muted)] transition hover:bg-[var(--color-accent)]/15 hover:text-[var(--color-accent)]"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">
              Informações da carta
            </h2>
            <dl>
              <DetailRow label="Tipo" value={card.type} />
              <DetailRow label="Frame" value={card.frame_type} />
              {category === 'monster' && (
                <>
                  <DetailRow label="Atributo" value={card.attribute} />
                  <DetailRow label="Raça / Tipo" value={card.race} />
                  <DetailRow
                    label={card.linkval != null ? 'Link' : 'Nível / Rank'}
                    value={card.linkval ?? card.level}
                  />
                  <DetailRow label="ATK" value={card.atk} />
                  <DetailRow label="DEF" value={card.def} />
                  <DetailRow label="Escala Pêndulo" value={card.scale} />
                  <DetailRow
                    label="Link Markers"
                    value={card.linkmarkers?.join(', ')}
                  />
                </>
              )}
              {(category === 'spell' || category === 'trap') && (
                <DetailRow label="Subtipo" value={card.race} />
              )}
            </dl>

            {card.description && (
              <div className="mt-4 rounded-xl bg-[var(--color-surface-2)] p-4">
                <p className="mb-2 text-xs tracking-wide text-[var(--color-muted)] uppercase">
                  Texto / Efeito
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
