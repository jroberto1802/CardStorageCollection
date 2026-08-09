-- Permite Side Deck nos decks do usuário (importação da comunidade / construtor)

alter table public.deck_cards
  drop constraint if exists deck_cards_zone_check;

alter table public.deck_cards
  add constraint deck_cards_zone_check
  check (zone in ('main', 'extra', 'side'));

comment on column public.deck_cards.zone is 'Zona: main | extra | side';
