import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookmarkPlus, Check, Loader2, Package } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { getCardById } from '@/services/catalogService'
import {
  addToCollection,
  findCollectionItem,
  removeFromCollection,
} from '@/services/collectionService'
import {
  invokeMirrorCardFull,
  isYgoHostedUrl,
} from '@/services/imageSyncService'
import type { AppLanguage, Card, CardImage, CardSet, CollectionItem } from '@/types'
import {
  detectRegion,
  getCardCategory,
  getPrimaryImage,
  languageLabel,
  parseBanlistInfo,
  parseCardSets,
} from '@/utils/cardHelpers'

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

  const [card, setCard] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [ownedItem, setOwnedItem] = useState<CollectionItem | null>(null)
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [collectionBusy, setCollectionBusy] = useState(false)
  const [collectionMessage, setCollectionMessage] = useState<string | null>(null)

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
        let data = await getCardById(id, language)
        if (!mounted) return
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
              const refreshed = await getCardById(data.id, data.language)
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

  const sets = useMemo(() => (card ? parseCardSets(card.card_sets) : []), [card])
  const selectedSet: CardSet | null = useMemo(() => {
    if (!sets.length) return null
    return (
      sets.find((set) => set.set_code.toLowerCase() === selectedSetCode.toLowerCase()) ??
      sets[0]
    )
  }, [sets, selectedSetCode])

  useEffect(() => {
    let mounted = true

    async function loadOwned() {
      if (!card || !selectedSet) {
        setOwnedItem(null)
        return
      }

      setCollectionLoading(true)
      setCollectionMessage(null)
      try {
        const item = await findCollectionItem({
          cardId: card.id,
          setCode: selectedSet.set_code,
          setRarity: selectedSet.set_rarity || '',
        })
        if (mounted) setOwnedItem(item)
      } catch {
        if (mounted) setOwnedItem(null)
      } finally {
        if (mounted) setCollectionLoading(false)
      }
    }

    void loadOwned()
    return () => {
      mounted = false
    }
  }, [card, selectedSet, language])

  const images = card ? getPrimaryImage(card) : { full: null, small: null }
  const banlist = card ? parseBanlistInfo(card.banlist_info) : null
  const region = selectedSet
    ? detectRegion(selectedSet.set_code, banlist)
    : 'Unknown'
  const category = card ? getCardCategory(card.type) : null

  async function handleAddToCollection() {
    if (!card || !selectedSet) return

    setCollectionBusy(true)
    setCollectionMessage(null)
    try {
      const item = await addToCollection({
        card_id: card.id,
        language: card.language,
        set_code: selectedSet.set_code,
        set_name: selectedSet.set_name,
        set_rarity: selectedSet.set_rarity || '',
        quantity: 1,
      })
      setOwnedItem(item)
      setCollectionMessage(
        item.quantity > 1
          ? `Quantidade atualizada para ${item.quantity}.`
          : 'Carta adicionada à coleção!',
      )
    } catch (err) {
      setCollectionMessage(
        err instanceof Error ? err.message : 'Falha ao adicionar à coleção',
      )
    } finally {
      setCollectionBusy(false)
    }
  }

  async function handleRemoveFromCollection() {
    if (!ownedItem) return
    if (!window.confirm('Remover esta impressão da coleção?')) return

    setCollectionBusy(true)
    setCollectionMessage(null)
    try {
      await removeFromCollection(ownedItem.id)
      setOwnedItem(null)
      setCollectionMessage('Removida da coleção.')
    } catch (err) {
      setCollectionMessage(
        err instanceof Error ? err.message : 'Falha ao remover',
      )
    } finally {
      setCollectionBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-[var(--color-muted)]">Carregando detalhes da carta...</div>
    )
  }

  if (error || !card) {
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

  return (
    <div className="space-y-6">
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
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/30">
            {images.full ? (
              <img
                src={images.full}
                alt={card.name}
                className="w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[59/86] items-center justify-center text-sm text-[var(--color-muted)]">
                Sem imagem
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <BookmarkPlus className="h-4 w-4 text-[var(--color-accent)]" />
              Minha coleção
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Impressão:{' '}
              <span className="font-mono text-[var(--color-text)]">
                {selectedSet?.set_code ?? '—'}
              </span>
              {selectedSet?.set_rarity ? ` · ${selectedSet.set_rarity}` : ''}
            </p>

            {collectionLoading ? (
              <p className="mt-3 text-xs text-[var(--color-muted)]">Verificando coleção...</p>
            ) : ownedItem ? (
              <div className="mt-3 space-y-2">
                <p className="inline-flex items-center gap-1.5 text-sm text-[var(--color-success)]">
                  <Check className="h-4 w-4" />
                  Na coleção
                  {ownedItem.quantity > 1 ? ` (×${ownedItem.quantity})` : ''}
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={collectionBusy || !selectedSet}
                    onClick={() => void handleAddToCollection()}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface-2)] disabled:opacity-50"
                  >
                    {collectionBusy ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : (
                      'Adicionar mais uma'
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={collectionBusy}
                    onClick={() => void handleRemoveFromCollection()}
                    className="w-full rounded-lg border border-[var(--color-danger)]/40 px-3 py-2 text-sm text-red-300 transition hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
                  >
                    Remover da coleção
                  </button>
                  <Link
                    to="/collection"
                    className="text-center text-xs text-[var(--color-accent)] hover:underline"
                  >
                    Ver minha coleção
                  </Link>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={collectionBusy || !selectedSet}
                onClick={() => void handleAddToCollection()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {collectionBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
                Adicionar à coleção
              </button>
            )}

            {collectionMessage && (
              <p className="mt-2 text-xs text-[var(--color-muted)]">{collectionMessage}</p>
            )}
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
              <DetailRow label="Raridade" value={selectedSet?.set_rarity ?? '—'} />
              <DetailRow label="Idioma" value={languageLabel(card.language)} />
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
                    return (
                      <Link
                        key={`${set.set_code}-${set.set_rarity}-${set.set_name}`}
                        to={`/cards/${card.id}?set=${encodeURIComponent(set.set_code)}&lang=${language}`}
                        className={[
                          'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition',
                          active
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-text)]'
                            : 'border-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
                        ].join(' ')}
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
                      </Link>
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
