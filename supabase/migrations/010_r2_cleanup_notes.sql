-- Limpeza pós-migração para Cloudflare R2
-- Execute no SQL Editor DEPOIS que:
-- 1) Secrets R2 estiverem configurados na Edge Function sync-card-images
-- 2) Você tiver rodado "Sincronizar miniaturas" (PT e EN) até esvaziar a fila
-- 3) Amostragem abaixo mostrar poucas/nenhuma URL ainda no Storage Supabase

-- A) Contar cartas ainda apontando para Storage Supabase
select
  language,
  count(*) as cards_with_supabase_storage_url
from public.cards
where card_images::text like '%/storage/v1/object/public/card-images/%'
group by language
order by language;

-- B) Contar cartas ainda no YGOPRODeck (pendentes de mirror)
select
  language,
  count(*) as cards_with_ygo_url
from public.cards
where card_images::text like '%images.ygoprodeck.com%'
group by language
order by language;

-- C) Amostra de URLs ainda no Storage (para inspeção)
select id, language, card_images
from public.cards
where card_images::text like '%/storage/v1/object/public/card-images/%'
order by id
limit 20;

-- D) Esvaziar o bucket Storage do Supabase
-- O SQL não apaga arquivos do Storage com segurança em massa.
-- Faça no Dashboard:
--   Storage → card-images → Empty bucket  (ou delete pasta small/ e full/)
-- Ou via CLI / API com service_role.
--
-- Depois de empty, o uso de Storage no Free deve cair para ~0.
-- NÃO delete a migration 004 se ainda quiser o bucket vazio; pode manter
-- o bucket público vazio ou apagar o bucket no Dashboard se não for mais usado.

comment on schema public is 'Após migração R2: limpe o bucket card-images no Storage Dashboard.';
