-- 020_quick_entry_rpcs.sql
-- RPCs do cadastro rápido: impressões de um set, autocompletar de sets e inserção em lote na coleção.
-- Requer a migration 019 (public.card_printings). Aplique no SQL Editor em um único Run; é idempotente
-- (create or replace + grants), reaplicar é seguro.
-- Colunas conferidas em 001_initial.sql (cards), 002_collection_items.sql (collection_items) e 019.

-- =========================================================
-- (a) get_set_printings — uma linha por impressão do set
-- =========================================================
-- Dedupe por (card_id, set_code, set_rarity): prefere p_language; se a carta só existir no outro idioma, usa esse.
-- Ordenada por letras do set_number, depois pela parte numérica (1 < 2 < 10 < 100; 'A08' fica após os numéricos puros),
-- depois set_code, nome.
create or replace function public.get_set_printings(
  p_prefix text,
  p_region text default null,
  p_language text default null
)
returns table (
  card_id bigint, language text, name text, type text,
  set_code text, set_prefix text, set_region text, set_number text,
  set_name text, set_rarity text, set_rarity_code text, set_price numeric,
  image_url_small text
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.card_id, r.language, r.name, r.type, r.set_code, r.set_prefix, r.set_region, r.set_number,
         r.set_name, r.set_rarity, r.set_rarity_code, r.set_price, r.image_url_small
  from (
    select distinct on (p.card_id, p.set_code, p.set_rarity)
      p.card_id, p.language, c.name, c.type, p.set_code, p.set_prefix, p.set_region, p.set_number,
      p.set_name, p.set_rarity, p.set_rarity_code, p.set_price,
      case when jsonb_typeof(c.card_images) = 'array'
           then coalesce(c.card_images -> 0 ->> 'image_url_small', c.card_images -> 0 ->> 'image_url')
      end as image_url_small
    from public.card_printings p
    join public.cards c on c.id = p.card_id and c.language = p.language
    where p.set_prefix = upper(btrim(p_prefix))
      and (p_region is null or p.set_region = upper(btrim(p_region)))
    order by p.card_id, p.set_code, p.set_rarity,
             (p.language = coalesce(p_language, '')) desc, p.language
  ) r
  order by regexp_replace(coalesce(r.set_number, ''), '[0-9]+', '', 'g'),
           nullif(regexp_replace(coalesce(r.set_number, ''), '[^0-9]', '', 'g'), '')::numeric nulls last,
           r.set_number nulls last, r.set_code, r.name, r.set_rarity
$$;

-- =========================================================
-- (b) list_set_prefixes — autocompletar de sets
-- =========================================================
-- Filtra por prefixo (começa com) OU nome do set (contém), sem diferenciar maiúsculas. p_query nulo = todos.
-- Obs.: a busca por nome usa varredura (sem pg_trgm); o filtro por prefixo usa o índice text_pattern_ops.
create or replace function public.list_set_prefixes(
  p_query text default null,
  p_limit int default 20
)
returns table (set_prefix text, regions text[], set_name text, total_cards bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') as t
  )
  select p.set_prefix,
         array_agg(distinct p.set_region) filter (where p.set_region is not null) as regions,
         mode() within group (order by p.set_name) filter (where p.set_name <> '') as set_name,
         count(distinct p.card_id) as total_cards
  from public.card_printings p, q
  where p.set_prefix is not null
    and (q.t = '' or p.set_prefix like upper(q.t) || '%' or p.set_name ilike '%' || q.t || '%')
  group by p.set_prefix, q.t
  order by (case when q.t <> '' and p.set_prefix = upper(q.t) then 0 else 1 end),
           p.set_prefix
  limit greatest(1, least(coalesce(p_limit, 20), 100))
$$;

-- =========================================================
-- (c) add_collection_items_batch — inserção/soma em lote (transacional)
-- =========================================================
-- p_items: [{card_id, language, set_code, set_name, set_rarity, quantity}, ...]
-- - user_id = auth.uid() (SECURITY INVOKER: RLS vale; qualquer user_id vindo do cliente é ignorado).
-- - quantity 1..999, até 500 itens por chamada; duplicatas do lote (mesma carta+set_code+raridade) são somadas.
-- - set_rarity: trim e '—' => ''.
-- - language: reusa o de uma linha já existente da mesma impressão (qualquer idioma), senão o informado,
--   senão o outro idioma em que a carta exista no catálogo.
-- - ON CONFLICT soma a quantidade. Retorna {inserted, updated, total_quantity}. Erro => nada é salvo.
create or replace function public.add_collection_items_batch(p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inserted int := 0;
  v_updated int := 0;
  v_total bigint := 0;
  v_error text;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado' using errcode = '28000';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items deve ser um array JSON';
  end if;
  if jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('inserted', 0, 'updated', 0, 'total_quantity', 0);
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception 'Máximo de 500 itens por lote (recebido: %)', jsonb_array_length(p_items);
  end if;

  -- validação (campos lidos como texto e checados antes de converter => mensagens claras)
  select case
           when bool_or(coalesce(e->>'card_id', '') !~ '^[0-9]{1,18}$') then 'Item com card_id inválido'
           when bool_or(btrim(coalesce(e->>'set_code', '')) = '') then 'Item sem set_code'
           when bool_or(lower(btrim(coalesce(e->>'language', ''))) not in ('en', 'pt')) then 'language deve ser en ou pt'
           when bool_or(case when coalesce(e->>'quantity', '') !~ '^[0-9]{1,4}$'
                             then true
                             else (e->>'quantity')::int not between 1 and 999 end)
             then 'quantity deve estar entre 1 e 999'
         end
    into v_error
    from jsonb_array_elements(p_items) as t(e);
  if v_error is not null then
    raise exception '%', v_error;
  end if;

  -- cartas inexistentes no catálogo (em qualquer idioma)
  select string_agg(distinct (t.e->>'card_id'), ', ') into v_error
    from jsonb_array_elements(p_items) as t(e)
   where not exists (select 1 from public.cards c where c.id = (t.e->>'card_id')::bigint);
  if v_error is not null then
    raise exception 'Carta(s) inexistente(s) no catálogo: %', v_error;
  end if;

  with b as (
    select t.ord,
           (t.e->>'card_id')::bigint as card_id,
           lower(btrim(t.e->>'language')) as language,
           btrim(t.e->>'set_code') as set_code,
           coalesce(btrim(t.e->>'set_name'), '') as set_name,
           case when btrim(coalesce(t.e->>'set_rarity', '')) = '—' then ''
                else btrim(coalesce(t.e->>'set_rarity', '')) end as set_rarity,
           (t.e->>'quantity')::int as quantity
      from jsonb_array_elements(p_items) with ordinality as t(e, ord)
  ),
  agg as (
    select b.card_id, b.set_code, b.set_rarity,
           sum(b.quantity)::int as quantity,
           (array_agg(b.language order by b.ord))[1] as language,
           coalesce((array_agg(b.set_name order by b.ord) filter (where b.set_name <> ''))[1], '') as set_name
      from b
     group by b.card_id, b.set_code, b.set_rarity
  ),
  resolved as (
    select a.card_id, a.set_code, a.set_rarity, a.quantity, a.set_name,
           coalesce(
             -- 1) idioma de uma linha já existente da mesma impressão
             (select ci.language from public.collection_items ci
               where ci.user_id = v_uid and ci.card_id = a.card_id
                 and ci.set_code = a.set_code and ci.set_rarity = a.set_rarity
               order by ci.quantity desc, ci.language limit 1),
             -- 2) idioma informado, se a carta existir nele
             (select c.language from public.cards c where c.id = a.card_id and c.language = a.language),
             -- 3) o outro idioma do catálogo
             (select c.language from public.cards c where c.id = a.card_id order by c.language limit 1)
           ) as language
      from agg a
  ),
  ins as (
    insert into public.collection_items as ci
      (user_id, card_id, language, set_code, set_name, set_rarity, quantity)
    select v_uid, r.card_id, r.language, r.set_code, r.set_name, r.set_rarity, r.quantity
      from resolved r
    on conflict (user_id, card_id, language, set_code, set_rarity) do update
      set quantity = ci.quantity + excluded.quantity,
          updated_at = now()
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted)
    into v_inserted, v_updated
    from ins;

  select coalesce(sum((t.e->>'quantity')::int), 0) into v_total
    from jsonb_array_elements(p_items) as t(e);

  return jsonb_build_object('inserted', v_inserted, 'updated', v_updated, 'total_quantity', v_total);
end;
$$;

-- =========================================================
-- Permissões: só usuários autenticados executam
-- =========================================================
revoke all on function public.get_set_printings(text, text, text) from public, anon;
revoke all on function public.list_set_prefixes(text, int) from public, anon;
revoke all on function public.add_collection_items_batch(jsonb) from public, anon;
grant execute on function public.get_set_printings(text, text, text) to authenticated;
grant execute on function public.list_set_prefixes(text, int) to authenticated;
grant execute on function public.add_collection_items_batch(jsonb) to authenticated;

-- =========================================================
-- Como testar (logado, no app/Client; no SQL Editor auth.uid() é nulo — para a (c) simule a sessão):
--   select * from public.get_set_printings('LIOV', 'EN', 'en') limit 20;
--   select * from public.get_set_printings('SS01', null, 'pt') where set_number like 'A%';
--   select * from public.list_set_prefixes('lio');
--   select * from public.list_set_prefixes('legend', 10);
-- (c) no SQL Editor (simulando um usuário; troque o UUID por um auth.users.id seu):
--   begin;
--   select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
--   set local role authenticated;
--   select public.add_collection_items_batch('[{"card_id":1,"language":"en","set_code":"LIOV-EN001","set_name":"Lord of the Ravens","set_rarity":"Ultra Rare","quantity":2}]');
--   rollback;   -- desfaz o teste
-- =========================================================
