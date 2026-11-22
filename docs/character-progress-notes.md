# Progresso na lista de personagens: custo e opções futuras

A lista (`/characters`) calcula o progresso de cada personagem no cliente:
`listDeckProgressRows()` (consulta agregada paginada de `anime_deck_cards`, embutindo
`character_decks`) + `listCollectionItems()` em paralelo, depois da lista renderizada.

**Custo atual:** ~6 mil linhas de deck (≈ 2 mil cartas únicas por série × decks, só `language='en'`)
por visita, em páginas de 1000 (a 1ª com `count`, as demais em paralelo), mais a coleção inteira.

## Opção A — RPC/view agregada (recomendada se o custo incomodar)

Uma função SQL (ou view) devolve, por personagem e deck, só os totais já agregados:

```sql
-- esboço (não aplicado): total de cópias por deck e cópias possuídas pelo usuário
create or replace function public.character_deck_progress()
returns table (character_id uuid, label text, total int, owned int)
language sql stable security invoker as $$
  select cd.character_id, cd.label,
         sum(c.quantity)::int as total,
         sum(least(c.quantity, coalesce(o.qty, 0)))::int as owned
  from public.anime_deck_cards c
  join public.character_decks cd on cd.deck_id = c.deck_id
  left join (
    select card_id, sum(quantity) as qty from public.collection_items group by card_id
  ) o on o.card_id = c.card_id
  group by cd.character_id, cd.label;
$$;
```

Reduz o tráfego de ~6 mil linhas + coleção para ~200 linhas. Atenção: o cliente hoje usa
`computeOwnership` (soma por carta entre zonas); a RPC deve reproduzir o mesmo critério
(`least(required_total_da_carta, possuído)`), senão o % da lista diverge do % da página do deck.
Exige migration nova (não criada nesta entrega).

## Opção B — cache no cliente (staleTime)

Guardar o resultado (linhas de deck, que só mudam em novos imports) em memória/`sessionStorage`
com TTL de alguns minutos e recalcular apenas a posse a partir da coleção. Em React Query seria
`staleTime` ~5 min para `deck-progress-rows`; hoje o app não usa React Query, então bastaria um
cache de módulo com timestamp (como o `getUsdBrlRate`). Invalidar após aplicar novas migrations de import.

## Quando adotar

Se a lista ficar lenta em redes móveis ou o número de séries/decks crescer, começar pela B (barata,
sem banco) e migrar para A se ainda for necessário.
