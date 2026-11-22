-- 015: ajustes de schema para o novo modelo de personagens (idempotente).
-- Escopo: apenas colunas/índices das tabelas de catálogo de anime. RLS de leitura
-- (authenticated) definida em 011 permanece; nenhuma policy nova é necessária.

-- characters: avatar pequeno além do grande (image) e série (classic, gx, 5ds, zexal, arcv)
alter table public.characters add column if not exists image_small text;
alter table public.characters add column if not exists series text;
create index if not exists characters_series_idx on public.characters (series, sort_order);

-- character_decks: rótulo do deck do personagem (A/B). O nome do deck fica em anime_decks.name.
alter table public.character_decks add column if not exists label text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'character_decks_label_check') then
    alter table public.character_decks
      add constraint character_decks_label_check check (label is null or label in ('A', 'B'));
  end if;
end $$;

create unique index if not exists character_decks_character_label_uidx
  on public.character_decks (character_id, label)
  where label is not null;

-- anime_deck_cards: cartas não catalogadas entram com card_id NULL + card_name.
--  * art_id: id_arte da fonte (rastreio, não é FK)
--  * card_name: nome original do import (sempre preenchido pelo import)
--  * FK composto (card_id, language) -> cards só é verificado quando card_id não é nulo
--    (MATCH SIMPLE), então o FK de 011 continua válido sem alteração.
alter table public.anime_deck_cards add column if not exists art_id integer;
alter table public.anime_deck_cards add column if not exists card_name text;
alter table public.anime_deck_cards alter column card_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'anime_deck_cards_card_or_name_check') then
    alter table public.anime_deck_cards
      add constraint anime_deck_cards_card_or_name_check check (card_id is not null or card_name is not null);
  end if;
end $$;

-- A unique (deck_id, card_id, language, zone) de 011 não protege linhas com card_id NULL
-- (NULLs são distintos). Este índice cobre os dois casos.
create unique index if not exists anime_deck_cards_deck_zone_card_uidx
  on public.anime_deck_cards (deck_id, zone, language, (coalesce(card_id::text, card_name)));

comment on column public.characters.image is 'Avatar grande (caminho em /public, ex.: /characters/grande/...)';
comment on column public.characters.image_small is 'Avatar pequeno (ex.: /characters/pequeno/...)';
comment on column public.characters.series is 'Série: classic | gx | 5ds | zexal | arcv';
comment on column public.character_decks.label is 'Rótulo do deck do personagem: A ou B';
comment on column public.anime_deck_cards.art_id is 'id_arte da fonte do import (rastreio; não é FK)';
comment on column public.anime_deck_cards.card_name is 'Nome original da carta no import; card_id NULL = carta não catalogada em public.cards';
