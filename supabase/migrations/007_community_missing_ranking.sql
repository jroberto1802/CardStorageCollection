-- Ranking: cartas mais usadas nos decks da comunidade que o usuário não possui.

create or replace function public.get_community_missing_card_ranking(p_limit integer default 100)
returns table (
  card_id bigint,
  deck_count bigint,
  total_copies bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with owned as (
    select ci.card_id
    from public.collection_items ci
    where ci.user_id = auth.uid()
    group by ci.card_id
    having sum(ci.quantity) > 0
  ),
  agg as (
    select
      sdc.card_id,
      count(distinct sdc.deck_id) as deck_count,
      sum(sdc.quantity)::bigint as total_copies
    from public.synced_deck_cards sdc
    where sdc.card_id is not null
    group by sdc.card_id
  )
  select
    a.card_id,
    a.deck_count,
    a.total_copies
  from agg a
  left join owned o on o.card_id = a.card_id
  where o.card_id is null
  order by a.deck_count desc, a.total_copies desc, a.card_id asc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

comment on function public.get_community_missing_card_ranking(integer) is
  'Top cartas (card_id) nos decks MDM que o usuário autenticado não possui na coleção.';

grant execute on function public.get_community_missing_card_ranking(integer) to authenticated;
