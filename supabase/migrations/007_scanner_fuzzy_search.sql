-- Scanner: busca fuzzy por nome (pg_trgm) + coluna name_compact
-- Execute no Supabase SQL Editor após as migrations anteriores.

create extension if not exists pg_trgm;

-- Nome sem espaços (ex.: THEWINGEDDRAGONOFRA) para match de OCR colado
alter table public.cards
  add column if not exists name_compact text
  generated always as (lower(regexp_replace(name, '\s+', '', 'g'))) stored;

create index if not exists cards_name_trgm_idx
  on public.cards using gin (name gin_trgm_ops);

create index if not exists cards_name_compact_trgm_idx
  on public.cards using gin (name_compact gin_trgm_ops);

create index if not exists cards_name_compact_btree_idx
  on public.cards (name_compact);

-- Busca fuzzy para o scanner (erros de OCR, nomes parciais, sem espaços)
create or replace function public.search_cards_fuzzy(
  p_language text,
  p_query text,
  p_limit int default 24
)
returns setof public.cards
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select
      trim(p_query) as raw,
      lower(trim(p_query)) as lowered,
      lower(regexp_replace(trim(p_query), '\s+', '', 'g')) as compact
  )
  select c.*
  from public.cards c
  cross join q
  where c.language = p_language
    and length(q.raw) >= 2
    and (
      c.name ilike '%' || q.raw || '%'
      or similarity(c.name, q.raw) > 0.25
      or (
        length(q.compact) >= 4
        and (
          c.name_compact % q.compact
          or c.name_compact ilike '%' || q.compact || '%'
        )
      )
    )
  order by
    greatest(
      similarity(c.name, q.raw),
      case
        when length(q.compact) >= 4 then similarity(c.name_compact, q.compact)
        else 0
      end
    ) desc,
    length(c.name) asc
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.search_cards_fuzzy(text, text, int) to authenticated;
