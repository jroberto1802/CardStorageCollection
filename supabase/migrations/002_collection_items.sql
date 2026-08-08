-- Inventário / Minha coleção do usuário (impressão específica)

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id bigint not null,
  language text not null check (language in ('en', 'pt')),
  set_code text not null,
  set_name text not null default '',
  set_rarity text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collection_items_card_fk
    foreign key (card_id, language) references public.cards (id, language) on delete cascade,
  constraint collection_items_unique_impression
    unique (user_id, card_id, language, set_code, set_rarity)
);

create index if not exists collection_items_user_id_idx
  on public.collection_items (user_id);

create index if not exists collection_items_user_set_name_idx
  on public.collection_items (user_id, set_name);

create index if not exists collection_items_user_set_code_idx
  on public.collection_items (user_id, set_code);

alter table public.collection_items enable row level security;

drop policy if exists "Users can read own collection items" on public.collection_items;
create policy "Users can read own collection items"
  on public.collection_items
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own collection items" on public.collection_items;
create policy "Users can insert own collection items"
  on public.collection_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own collection items" on public.collection_items;
create policy "Users can update own collection items"
  on public.collection_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own collection items" on public.collection_items;
create policy "Users can delete own collection items"
  on public.collection_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.collection_items to authenticated;

comment on table public.collection_items is 'Cartas que o usuário possui (por impressão: card + set_code + raridade)';
