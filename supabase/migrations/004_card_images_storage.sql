-- Bucket público para imagens espelhadas da YGOPRODeck (plano Free: small + full sob demanda)
--
-- Se o INSERT em storage.buckets falhar por permissão, crie o bucket pelo Dashboard:
-- Storage → New bucket → nome: card-images → Public bucket: ON
-- File size limit: 5 MB · Allowed MIME: image/jpeg, image/png, image/webp
-- Depois rode só a policy abaixo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  5242880, -- 5 MB por arquivo
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Leitura pública (URL /object/public/...)
-- (escrita fica com a Edge Function via service_role, que bypassa RLS)
drop policy if exists "Public read card-images" on storage.objects;
create policy "Public read card-images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'card-images');
