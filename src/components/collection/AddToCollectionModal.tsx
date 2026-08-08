import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useSettings } from '@/contexts/SettingsContext'
import { searchCatalog } from '@/services/catalogService'
import { addToCollection } from '@/services/collectionService'
import type { AppLanguage, CardImpression, CardSet } from '@/types'
import { DEFAULT_CATALOG_FILTERS } from '@/types'
import { getCardById } from '@/services/catalogService'
import { parseCardSets } from '@/utils/cardHelpers'

interface AddToCollectionModalProps {
  open: boolean
  onClose: () => void
  onAdded: () => void
  /** Pré-seleção ao abrir a partir do detalhe / lista */
  preset?: {
    cardId: number
    language?: AppLanguage
    setCode: string
    setName: string
    setRarity: string
  } | null
}

export function AddToCollectionModal({
  open,
  onClose,
  onAdded,
  preset = null,
}: AddToCollectionModalProps) {
  const { language } = useSettings()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 350)
  const [results, setResults] = useState<CardImpression[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  const [selectedCardLanguage, setSelectedCardLanguage] = useState<AppLanguage>(language)
  const [selectedName, setSelectedName] = useState('')
  const [sets, setSets] = useState<CardSet[]>([])
  const [selectedSetKey, setSelectedSetKey] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setError(null)
    setSuccess(null)
    setQuantity(1)

    if (preset) {
      const presetLang = preset.language ?? language
      setSelectedCardId(preset.cardId)
      setSelectedCardLanguage(presetLang)
      setSelectedSetKey(
        `${preset.setCode}||${preset.setRarity}||${preset.setName}`,
      )
      setSets([
        {
          set_code: preset.setCode,
          set_name: preset.setName,
          set_rarity: preset.setRarity,
        },
      ])
      setQuery('')
      setResults([])
      void (async () => {
        const card = await getCardById(preset.cardId, presetLang)
        if (card) {
          setSelectedName(card.name)
          setSelectedCardLanguage(card.language)
          setSets(parseCardSets(card.card_sets))
          // Mantém a versão pré-selecionada se ainda existir; senão primeira
          const setsList = parseCardSets(card.card_sets)
          const match = setsList.find(
            (set) =>
              set.set_code.toLowerCase() === preset.setCode.toLowerCase() &&
              (set.set_rarity || '') === (preset.setRarity || ''),
          )
          const chosen = match ?? setsList[0]
          if (chosen) {
            setSelectedSetKey(
              `${chosen.set_code}||${chosen.set_rarity || ''}||${chosen.set_name}`,
            )
          }
        }
      })()
      return
    }

    setSelectedCardId(null)
    setSelectedCardLanguage(language)
    setSelectedName('')
    setSets([])
    setSelectedSetKey('')
    setQuery('')
    setResults([])
  }, [open, preset, language])

  useEffect(() => {
    if (!open || preset || !debouncedQuery.trim()) {
      if (!debouncedQuery.trim()) setResults([])
      return
    }

    let mounted = true

    async function search() {
      setSearching(true)
      setError(null)
      try {
        const result = await searchCatalog({
          language,
          query: debouncedQuery,
          filters: DEFAULT_CATALOG_FILTERS,
          sort: 'name_asc',
          page: 0,
          pageSize: 12,
        })
        if (mounted) setResults(result.items)
      } catch (err) {
        if (mounted) {
          setResults([])
          setError(err instanceof Error ? err.message : 'Falha na busca')
        }
      } finally {
        if (mounted) setSearching(false)
      }
    }

    void search()
    return () => {
      mounted = false
    }
  }, [open, preset, debouncedQuery, language])

  const selectedSet = useMemo(() => {
    if (!selectedSetKey) return null
    return (
      sets.find(
        (set) =>
          `${set.set_code}||${set.set_rarity || ''}||${set.set_name}` ===
          selectedSetKey,
      ) ?? null
    )
  }, [sets, selectedSetKey])

  async function handleSelectCard(item: CardImpression) {
    setSelectedCardId(item.cardId)
    setSelectedCardLanguage(item.language)
    setSelectedName(item.name)
    setError(null)
    setSuccess(null)

    try {
      const card = await getCardById(item.cardId, item.language)
      if (card) setSelectedCardLanguage(card.language)
      const cardSets = card ? parseCardSets(card.card_sets) : []
      setSets(cardSets)

      if (cardSets.length === 1) {
        const only = cardSets[0]
        setSelectedSetKey(
          `${only.set_code}||${only.set_rarity || ''}||${only.set_name}`,
        )
      } else if (item.setCode && item.setCode !== '—') {
        const match =
          cardSets.find(
            (set) => set.set_code.toLowerCase() === item.setCode.toLowerCase(),
          ) ?? cardSets[0]
        if (match) {
          setSelectedSetKey(
            `${match.set_code}||${match.set_rarity || ''}||${match.set_name}`,
          )
        } else {
          setSelectedSetKey('')
        }
      } else {
        setSelectedSetKey('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar versões')
    }
  }

  async function handleSave() {
    if (!selectedCardId || !selectedSet) {
      setError('Selecione a carta e a versão (set code).')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await addToCollection({
        card_id: selectedCardId,
        language: selectedCardLanguage,
        set_code: selectedSet.set_code,
        set_name: selectedSet.set_name,
        set_rarity: selectedSet.set_rarity || '',
        quantity,
      })
      setSuccess('Carta adicionada à coleção!')
      onAdded()
      setTimeout(() => onClose(), 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-collection-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <h2 id="add-collection-title" className="text-base font-semibold">
            Adicionar à coleção
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
          {!preset && (
            <div>
              <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
                Buscar carta
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nome ou set code..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2.5 pr-3 pl-9 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
                />
              </div>

              {searching && (
                <p className="mt-2 text-xs text-[var(--color-muted)]">Buscando...</p>
              )}

              {results.length > 0 && (
                <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border)]">
                  {results.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => void handleSelectCard(item)}
                        className={[
                          'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-[var(--color-surface-2)]',
                          selectedCardId === item.cardId
                            ? 'bg-[var(--color-accent)]/15'
                            : '',
                        ].join(' ')}
                      >
                        {item.imageUrlSmall ? (
                          <img
                            src={item.imageUrlSmall}
                            alt=""
                            className="h-12 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-12 w-8 rounded bg-[var(--color-surface-2)]" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.name}</span>
                          <span className="font-mono text-xs text-[var(--color-accent)]">
                            {item.setCode}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {selectedCardId && (
            <>
              <div>
                <p className="text-xs text-[var(--color-muted)]">Carta selecionada</p>
                <p className="font-medium">{selectedName || `#${selectedCardId}`}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
                  Versão / set code
                </label>
                <select
                  value={selectedSetKey}
                  onChange={(e) => setSelectedSetKey(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
                >
                  <option value="">Selecione a versão...</option>
                  {sets.map((set) => (
                    <option
                      key={`${set.set_code}-${set.set_rarity}-${set.set_name}`}
                      value={`${set.set_code}||${set.set_rarity || ''}||${set.set_name}`}
                    >
                      {set.set_code} · {set.set_rarity || '—'} · {set.set_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
                  Quantidade
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none ring-[var(--color-accent)] focus:ring-2"
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-green-300">
              {success}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || !selectedCardId || !selectedSet}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
