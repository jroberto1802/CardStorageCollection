-- Decks do usuário (construção de deck — não exige posse)

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Novo deck',
  language text not null check (language in ('en', 'pt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists decks_user_id_idx on public.decks (user_id);
create index if not exists decks_user_updated_idx on public.decks (user_id, updated_at desc);

-- Cada cópia da carta é uma linha (até 3 iguais = 3 linhas)
create table if not exists public.deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  card_id bigint not null,
  language text not null check (language in ('en', 'pt')),
  zone text not null check (zone in ('main', 'extra')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint deck_cards_card_fk
    foreign key (card_id, language) references public.cards (id, language) on delete cascade
);

create index if not exists deck_cards_deck_id_idx on public.deck_cards (deck_id);
create index if not exists deck_cards_deck_zone_idx on public.deck_cards (deck_id, zone, position);

alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;

drop policy if exists "Users can read own decks" on public.decks;
create policy "Users can read own decks"
  on public.decks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own decks" on public.decks;
create policy "Users can insert own decks"
  on public.decks for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own decks" on public.decks;
create policy "Users can update own decks"
  on public.decks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own decks" on public.decks;
create policy "Users can delete own decks"
  on public.decks for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own deck cards" on public.deck_cards;
create policy "Users can read own deck cards"
  on public.deck_cards for select to authenticated
  using (
    exists (
      select 1 from public.decks d
      where d.id = deck_cards.deck_id and d.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own deck cards" on public.deck_cards;
create policy "Users can insert own deck cards"
  on public.deck_cards for insert to authenticated
  with check (
    exists (
      select 1 from public.decks d
      where d.id = deck_cards.deck_id and d.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own deck cards" on public.deck_cards;
create policy "Users can update own deck cards"
  on public.deck_cards for update to authenticated
  using (
    exists (
      select 1 from public.decks d
      where d.id = deck_cards.deck_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks d
      where d.id = deck_cards.deck_id and d.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own deck cards" on public.deck_cards;
create policy "Users can delete own deck cards"
  on public.deck_cards for delete to authenticated
  using (
    exists (
      select 1 from public.decks d
      where d.id = deck_cards.deck_id and d.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.decks to authenticated;
grant select, insert, update, delete on public.deck_cards to authenticated;

comment on table public.decks is 'Decks montados pelo usuário';
comment on table public.deck_cards is 'Cartas do deck (1 linha = 1 cópia; zone main|extra)';
