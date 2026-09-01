-- Hashes perceptuais (pHash) da arte das cartas para reconhecimento visual no scanner

create table if not exists public.card_art_hashes (
  card_id bigint primary key,
  phash text not null check (char_length(phash) = 16),
  synced_at timestamptz not null default now()
);

create index if not exists card_art_hashes_phash_idx
  on public.card_art_hashes (phash);

alter table public.card_art_hashes enable row level security;

drop policy if exists "Authenticated users can read card art hashes" on public.card_art_hashes;
create policy "Authenticated users can read card art hashes"
  on public.card_art_hashes
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert card art hashes" on public.card_art_hashes;
create policy "Authenticated users can insert card art hashes"
  on public.card_art_hashes
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update card art hashes" on public.card_art_hashes;
create policy "Authenticated users can update card art hashes"
  on public.card_art_hashes
  for update
  to authenticated
  using (true)
  with check (true);
