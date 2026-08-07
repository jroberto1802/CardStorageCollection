import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookmarkPlus, Package } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { getCardById } from '@/services/catalogService'
import type { AppLanguage, Card, CardSet } from '@/types'
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
        const data = await getCardById(id, language)
        if (!mounted) return
        if (!data) {
          setError('Carta não encontrada neste idioma.')
          setCard(null)
        } else {
          setCard(data)
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

  const images = card ? getPrimaryImage(card) : { full: null, small: null }
  const banlist = card ? parseBanlistInfo(card.banlist_info) : null
  const region = selectedSet
    ? detectRegion(selectedSet.set_code, banlist)
    : 'Unknown'
  const category = card ? getCardCategory(card.type) : null

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

          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <BookmarkPlus className="h-4 w-4 text-[var(--color-accent)]" />
              Minha coleção
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Em breve você poderá registrar a posse desta impressão específica (
              <span className="font-mono text-[var(--color-text)]">
                {selectedSet?.set_code ?? '—'}
              </span>
              ).
            </p>
            <button
              type="button"
              disabled
              className="mt-3 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-muted)] opacity-60"
            >
              Adicionar à coleção (em breve)
            </button>
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
              <DetailRow label="Idioma" value={languageLabel(language)} />
              <DetailRow
                label="Região"
                value={region === 'Unknown' ? 'Não identificado' : region}
              />
            </dl>

            {sets.length > 1 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-[var(--color-muted)]">
                  Outras impressões desta carta ({sets.length})
                </p>
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {sets.map((set) => {
                    const active =
                      selectedSet?.set_code.toLowerCase() === set.set_code.toLowerCase()
                    return (
                      <Link
                        key={`${set.set_code}-${set.set_rarity}-${set.set_name}`}
                        to={`/cards/${card.id}?set=${encodeURIComponent(set.set_code)}&lang=${language}`}
                        className={[
                          'rounded-lg border px-2.5 py-1.5 font-mono text-xs transition',
                          active
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                            : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]',
                        ].join(' ')}
                      >
                        {set.set_code}
                        <span className="ml-1 font-sans opacity-80">
                          · {set.set_rarity}
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
