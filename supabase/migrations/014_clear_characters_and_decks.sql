-- 014: limpa o catálogo ANTIGO de personagens/decks de anime (seeds 011/012/013).
--
-- ESCOPO (somente estas 4 tabelas, nesta ordem, em transação):
--   1. public.anime_deck_cards
--   2. public.character_decks
--   3. public.anime_decks
--   4. public.characters
--
-- NÃO TOCA em: public.cards, public.collection_items, public.decks,
-- public.deck_cards, public.synced_decks, public.card_art_hashes, public.animes.
--
-- Rode ANTES de 015/016. Não reaplique 011-013 depois (recriariam seeds antigos).

begin;

delete from public.anime_deck_cards;
delete from public.character_decks;
delete from public.anime_decks;
delete from public.characters;

commit;
