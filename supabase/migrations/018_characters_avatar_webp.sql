-- 018: avatares de personagens passam de .png para .webp (otimizados por scripts/optimize-avatars.mjs).
-- Idempotente: só troca a extensão em /characters/... que ainda termina em .png.
-- Escopo: apenas characters.image e characters.image_small.

update public.characters
set image = regexp_replace(image, '\.png$', '.webp', 'i'),
    updated_at = now()
where image like '/characters/%' and image ~* '\.png$';

update public.characters
set image_small = regexp_replace(image_small, '\.png$', '.webp', 'i'),
    updated_at = now()
where image_small like '/characters/%' and image_small ~* '\.png$';
