import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, Loader2, Package, X } from 'lucide-react'
import {
  getAvailableCardLanguages,
  getCardById,
} from '@/services/catalogService'
import { listCollectionItemsByCardId } from '@/services/collectionService'
import type { AppLanguage, Card, CardSet, CollectionItem } from '@/types'
import {
  getPrimaryImage,
  languageLabel,
  parseCardSets,
} from '@/utils/cardHelpers'

interface DeckCardPreviewModalProps {
  open: boolean
  cardId: number | null
  language: AppLanguage
  onClose: () => void
}

export function DeckCardPreviewModal({
  open,
  cardId,
  language,
  onClose,
}: DeckCardPreviewModalProps) {
  const [viewLanguage, setViewLanguage] = useState<AppLanguage>(language)
  const [availableLanguages, setAvailableLanguages] = useState<AppLanguage[]>([])
  const [card, setCard] = useState<Card | null>(null)
  const [ownedItems, setOwnedItems] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSources, setShowSources] = useState(false)

  useEffect(() => {
    if (!open || cardId == null) {
      setCard(null)
      setOwnedItems([])
      setError(null)
      setShowSources(false)
      setAvailableLanguages([])
      setViewLanguage(language)
      return
    }

    setViewLanguage(language)
  }, [open, cardId, language])

  useEffect(() => {
    if (!open || cardId == null) return

    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      setShowSources(false)
      try {
        const [langs, cardData, owned] = await Promise.all([
          getAvailableCardLanguages(cardId!),
          getCardById(cardId!, viewLanguage, { fallbackToEn: false }).then(
            async (exact) => exact ?? getCardById(cardId!, viewLanguage),
          ),
          listCollectionItemsByCardId(cardId!),
        ])
        if (!mounted) return

        setAvailableLanguages(langs)
        setOwnedItems(owned)

        if (!cardData) {
          setError('Carta não encontrada.')
          setCard(null)
        } else {
          setCard(cardData)
          // Se o idioma pedido não existe, alinha o toggle ao idioma carregado.
          if (
            !langs.includes(viewLanguage) &&
            cardData.language !== viewLanguage
          ) {
            setViewLanguage(cardData.language)
          }
        }
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar carta')
        setCard(null)
        setOwnedItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [open, cardId, viewLanguage])

  const sets = useMemo(
    () => (card ? parseCardSets(card.card_sets) : []),
    [card],
  )

  const ownedKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const item of ownedItems) {
      keys.add(`${item.set_code.toLowerCase()}||${(item.set_rarity || '').toLowerCase()}`)
    }
    return keys
  }, [ownedItems])

  const images = card ? getPrimaryImage(card) : { full: null, small: null }
  const detailLang = card?.language ?? viewLanguage

  if (!open || cardId == null) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-card-preview-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <h2 id="deck-card-preview-title" className="text-base font-semibold">
            Detalhe rápido
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--color-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {!loading && card && (
            <>
              <div className="flex gap-4">
                <div className="w-28 shrink-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                  {images.small || images.full ? (
                    <img
                      src={images.full ?? images.small ?? undefined}
                      alt={card.name}
                      className="w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[59/86] items-center justify-center p-2 text-center text-xs text-[var(--color-muted)]">
                      Sem imagem
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className="text-lg font-semibold leading-snug">{card.name}</h3>
                  <p className="text-sm text-[var(--color-muted)]">
                    {card.type ?? '—'}
                    {card.race ? ` · ${card.race}` : ''}
                  </p>
                  {(card.atk != null || card.def != null) && (
                    <p className="text-sm">
                      {card.atk != null ? `ATK ${card.atk}` : null}
                      {card.atk != null && card.def != null ? ' / ' : null}
                      {card.def != null ? `DEF ${card.def}` : null}
                    </p>
                  )}
                  {card.level != null && (
                    <p className="text-xs text-[var(--color-muted)]">
                      Nível/Rank {card.level}
                      {card.attribute ? ` · ${card.attribute}` : ''}
                    </p>
                  )}
                  {card.linkval != null && (
                    <p className="text-xs text-[var(--color-muted)]">
                      Link {card.linkval}
                    </p>
                  )}

                  {availableLanguages.length > 1 ? (
                    <div className="pt-0.5">
                      <p className="mb-1 text-xs text-[var(--color-muted)]">Idioma</p>
                      <div className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5">
                        {availableLanguages.map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => setViewLanguage(lang)}
                            className={[
                              'rounded-md px-2.5 py-1 text-xs font-medium transition',
                              viewLanguage === lang
                                ? 'bg-[var(--color-accent)] text-white'
                                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
                            ].join(' ')}
                          >
                            {languageLabel(lang)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--color-muted)]">
                      Idioma: {languageLabel(card.language)}
                    </p>
                  )}

                  {ownedItems.length > 0 ? (
                    <p className="inline-flex items-center gap-1 text-xs text-[var(--color-success)]">
                      <Check className="h-3.5 w-3.5" />
                      {ownedItems.reduce((sum, item) => sum + item.quantity, 0)} na
                      coleção ({ownedItems.length}{' '}
                      {ownedItems.length === 1 ? 'impressão' : 'impressões'})
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--color-muted)]">
                      Você não possui esta carta
                    </p>
                  )}
                </div>
              </div>

              {card.description && (
                <p className="line-clamp-4 text-xs leading-relaxed text-[var(--color-muted)]">
                  {card.description}
                </p>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowSources((v) => !v)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm transition hover:bg-[var(--color-surface-2)]"
                >
                  <Package className="h-4 w-4 text-[var(--color-accent)]" />
                  {showSources ? 'Ocultar onde obtê-la' : 'Onde obtê-la'}
                  <span className="text-xs text-[var(--color-muted)]">
                    ({sets.length})
                  </span>
                </button>

                {showSources && (
                  <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 p-2">
                    {sets.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-[var(--color-muted)]">
                        Nenhuma coleção/set listada para esta carta.
                      </p>
                    ) : (
                      sets.map((set: CardSet) => {
                        const owned = ownedKeys.has(
                          `${set.set_code.toLowerCase()}||${(set.set_rarity || '').toLowerCase()}`,
                        )
                        const albumUrl = `/collection?view=album&set=${encodeURIComponent(set.set_name)}`
                        return (
                          <Link
                            key={`${set.set_code}-${set.set_rarity}-${set.set_name}`}
                            to={albumUrl}
                            onClick={onClose}
                            className={[
                              'block rounded-lg border px-3 py-2 text-sm transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10',
                              owned
                                ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/10'
                                : 'border-transparent bg-transparent',
                            ].join(' ')}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-mono text-sm font-semibold text-[var(--color-accent)]">
                                {set.set_code}
                              </span>
                              {owned && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-success)]">
                                  <Check className="h-3 w-3" />
                                  Na coleção
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                              {set.set_name}
                              {set.set_rarity ? ` · ${set.set_rarity}` : ''}
                            </p>
                          </Link>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              <Link
                to={`/cards/${card.id}?lang=${detailLang}`}
                onClick={onClose}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-hover)]"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir detalhamento completo
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
