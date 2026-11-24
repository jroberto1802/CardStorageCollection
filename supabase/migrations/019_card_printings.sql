-- 019_card_printings.sql
-- Tabela DERIVADA de cards.card_sets (jsonb) com uma linha por impressão (carta + idioma + set_code + raridade).
-- Objetivo: resolver "set + número" (ex.: LIOV-EN001) com índice, sem varrer jsonb com @> / ilike.
--
-- Como aplicar: SQL Editor -> New query -> cole TUDO -> Run (um único Run).
-- É IDEMPOTENTE: reaplicar é seguro (create if not exists / or replace / backfill com upsert).
-- A tabela é só um cache derivado: nunca edite à mão. Um trigger em public.cards refaz as linhas da carta
-- sempre que card_sets muda, então o sync-cards atual (sem deploy) mantém tudo em dia.
--
-- AVISO (statement timeout): o backfill (Parte C) é um único INSERT..SELECT sobre todas as cartas
-- (~100 mil linhas no total). Costuma levar poucos segundos, mas se o SQL Editor estourar o timeout
-- o Run inteiro é revertido. Nesse caso: rode as Partes A e B sozinhas e depois repita a Parte C em
-- faixas de id (veja o bloco "FALLBACK" no fim do arquivo).
-- Colunas usadas conferidas em 001_initial.sql: cards(id, language, card_sets jsonb, card_images jsonb).

-- =========================================================
-- Parte A — tabela, índices, RLS
-- =========================================================
create table if not exists public.card_printings (
  card_id         bigint  not null,
  language        text    not null,
  set_code        text    not null,
  set_prefix      text,            -- 'LIOV' (null se o código fugir do padrão)
  set_region      text,            -- 'EN' (null se o código não tiver região)
  set_number      text,            -- '001', 'A08', 'K01' (null se fora do padrão)
  set_name        text    not null default '',
  set_rarity      text    not null default '',
  set_rarity_code text,
  set_price       numeric,
  primary key (card_id, language, set_code, set_rarity),
  constraint card_printings_card_fk
    foreign key (card_id, language) references public.cards (id, language) on delete cascade
);

comment on table public.card_printings is
  'DERIVADA de cards.card_sets (trigger cards_refresh_printings). Não editar à mão; reaplicar a migration 019 é seguro.';

create index if not exists card_printings_prefix_region_number_idx
  on public.card_printings (set_prefix, set_region, set_number);
create index if not exists card_printings_prefix_pattern_idx
  on public.card_printings (set_prefix text_pattern_ops);  -- autocompletar por prefixo (LIKE 'LI%')
create index if not exists card_printings_set_code_idx
  on public.card_printings (set_code);
-- (índice só por card_id seria redundante: a PK (card_id, language, ...) já começa por card_id)
drop index if exists public.card_printings_card_id_idx;

alter table public.card_printings enable row level security;

drop policy if exists "Authenticated users can read card printings" on public.card_printings;
create policy "Authenticated users can read card printings"
  on public.card_printings
  for select
  to authenticated
  using (true);

-- Clientes só leem. Escrita apenas pelo trigger (SECURITY DEFINER) / service_role.
revoke all on public.card_printings from anon, authenticated;
grant select on public.card_printings to authenticated;

-- =========================================================
-- Parte B — função de construção, refresh por carta e triggers
-- =========================================================

-- Converte o jsonb de card_sets em linhas. Regex do set_code (maiúsculas):
--   ^<prefixo>-<região?><número>$
--   prefixo = [A-Z0-9]+                         LIOV, LOB, MP22, RA01, SS01, YSDJ, LDK2
--   região  = EN|FR|DE|IT|PT|SP|ES|JP|JA|KR|SC|TC|AE|AS|NA|EU|E  (opcional; 'E' = antigo 'LOB-E001')
--   número  = [A-Z]?[0-9]+                      001, 100, A08 (SS01-ENA08), K01 (LDK2-ENK01), 1000
-- Fora do padrão => prefix/region/number nulos (a linha continua existindo por set_code).
create or replace function public.build_card_printings(
  p_card_id bigint,
  p_language text,
  p_card_sets jsonb
)
returns table (
  card_id bigint, language text, set_code text, set_prefix text, set_region text,
  set_number text, set_name text, set_rarity text, set_rarity_code text, set_price numeric
)
language sql
immutable
set search_path = public
as $$
  select distinct on (parsed.set_code, parsed.set_rarity)
    p_card_id, p_language, parsed.set_code,
    parsed.m[1], parsed.m[2], parsed.m[3],
    parsed.set_name, parsed.set_rarity, parsed.set_rarity_code, parsed.set_price
  from (
    select
      btrim(e->>'set_code') as set_code,
      coalesce(btrim(e->>'set_name'), '') as set_name,
      coalesce(btrim(e->>'set_rarity'), '') as set_rarity,
      nullif(btrim(e->>'set_rarity_code'), '') as set_rarity_code,
      case when (e->>'set_price') ~ '^[0-9]+(\.[0-9]+)?$' then (e->>'set_price')::numeric end as set_price,
      regexp_match(
        upper(btrim(e->>'set_code')),
        '^([A-Z0-9]+)-(EN|FR|DE|IT|PT|SP|ES|JP|JA|KR|SC|TC|AE|AS|NA|EU|E)?([A-Z]?[0-9]+)$'
      ) as m
    from jsonb_array_elements(
      case when jsonb_typeof(p_card_sets) = 'array' then p_card_sets else '[]'::jsonb end
    ) as e
    where jsonb_typeof(e) = 'object' and btrim(coalesce(e->>'set_code', '')) <> ''
  ) parsed
  order by parsed.set_code, parsed.set_rarity
$$;

-- Refaz as linhas de UMA carta (idioma). Chamada pelo trigger e pelo fallback.
create or replace function public.refresh_card_printings(p_card_id bigint, p_language text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.card_printings cp
   where cp.card_id = p_card_id and cp.language = p_language;

  insert into public.card_printings
    (card_id, language, set_code, set_prefix, set_region, set_number,
     set_name, set_rarity, set_rarity_code, set_price)
  select b.card_id, b.language, b.set_code, b.set_prefix, b.set_region, b.set_number,
         b.set_name, b.set_rarity, b.set_rarity_code, b.set_price
    from public.cards c
   cross join lateral public.build_card_printings(c.id, c.language, c.card_sets) b
   where c.id = p_card_id and c.language = p_language;
end;
$$;

create or replace function public.cards_refresh_printings_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_card_printings(new.id, new.language);
  return null;
end;
$$;

revoke all on function public.build_card_printings(bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.refresh_card_printings(bigint, text) from public, anon, authenticated;
revoke all on function public.cards_refresh_printings_trg() from public, anon, authenticated;

drop trigger if exists cards_refresh_printings_ins on public.cards;
create trigger cards_refresh_printings_ins
  after insert on public.cards
  for each row execute function public.cards_refresh_printings_trg();

drop trigger if exists cards_refresh_printings_upd on public.cards;
create trigger cards_refresh_printings_upd
  after update of card_sets on public.cards
  for each row
  when (new.card_sets is distinct from old.card_sets)
  execute function public.cards_refresh_printings_trg();

-- =========================================================
-- Parte C — BACKFILL inicial (idempotente: upsert; reaplicar não duplica)
-- =========================================================
set local statement_timeout = '10min';  -- vale só nesta transação (o Editor pode impor um teto próprio)

insert into public.card_printings
  (card_id, language, set_code, set_prefix, set_region, set_number,
   set_name, set_rarity, set_rarity_code, set_price)
select b.card_id, b.language, b.set_code, b.set_prefix, b.set_region, b.set_number,
       b.set_name, b.set_rarity, b.set_rarity_code, b.set_price
  from public.cards c
 cross join lateral public.build_card_printings(c.id, c.language, c.card_sets) b
 where c.card_sets is not null
on conflict (card_id, language, set_code, set_rarity) do update
  set set_prefix = excluded.set_prefix,
      set_region = excluded.set_region,
      set_number = excluded.set_number,
      set_name = excluded.set_name,
      set_rarity_code = excluded.set_rarity_code,
      set_price = excluded.set_price;

-- Conferência rápida (opcional):
--   select count(*) from public.card_printings;
--   select set_prefix, set_region, set_number, set_code, count(*) from public.card_printings
--    where set_prefix is null group by 1,2,3,4 limit 50;   -- códigos fora do padrão

-- =========================================================
-- FALLBACK (só se a Parte C estourar timeout): rode A e B, e depois, em Runs separados, faixas de id:
--
--   insert into public.card_printings
--     (card_id, language, set_code, set_prefix, set_region, set_number, set_name, set_rarity, set_rarity_code, set_price)
--   select b.card_id, b.language, b.set_code, b.set_prefix, b.set_region, b.set_number,
--          b.set_name, b.set_rarity, b.set_rarity_code, b.set_price
--     from public.cards c cross join lateral public.build_card_printings(c.id, c.language, c.card_sets) b
--    where c.card_sets is not null and c.id >= 0 and c.id < 50000000      -- ajuste a faixa
--   on conflict (card_id, language, set_code, set_rarity) do update
--     set set_prefix = excluded.set_prefix, set_region = excluded.set_region, set_number = excluded.set_number,
--         set_name = excluded.set_name, set_rarity_code = excluded.set_rarity_code, set_price = excluded.set_price;
--
--   (próximas faixas: 50000000-100000000, etc. Ids YGOPRODeck vão até ~ 1e8.)
-- =========================================================
