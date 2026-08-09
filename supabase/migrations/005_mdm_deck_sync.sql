-- Decks sincronizados do Master Duel Meta (separados dos decks do usuário)

create table if not exists public.synced_decks (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'mdm' check (source in ('mdm')),
  external_id text not null,
  name text not null,
  author_name text,
  author_external_id text,
  deck_type text,
  ranked_type text,
  source_url text,
  source_created_at timestamptz,
  language text not null check (language in ('en', 'pt')),
  missing_card_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists synced_decks_source_idx on public.synced_decks (source);
create index if not exists synced_decks_deck_type_idx on public.synced_decks (deck_type);
create index if not exists synced_decks_updated_at_idx on public.synced_decks (updated_at desc);

create table if not exists public.synced_deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.synced_decks (id) on delete cascade,
  card_id bigint,
  language text check (language is null or language in ('en', 'pt')),
  zone text not null check (zone in ('main', 'extra', 'side')),
  quantity integer not null check (quantity > 0),
  mdm_card_id text,
  mdm_card_name text not null,
  mdm_rarity text,
  created_at timestamptz not null default now(),
  constraint synced_deck_cards_card_fk
    foreign key (card_id, language)
    references public.cards (id, language)
    on delete set null
);

create unique index if not exists synced_deck_cards_resolved_uidx
  on public.synced_deck_cards (deck_id, zone, card_id)
  where card_id is not null;

create unique index if not exists synced_deck_cards_unresolved_uidx
  on public.synced_deck_cards (deck_id, zone, mdm_card_name)
  where card_id is null;

create index if not exists synced_deck_cards_deck_id_idx on public.synced_deck_cards (deck_id);
create index if not exists synced_deck_cards_card_id_idx on public.synced_deck_cards (card_id);

create table if not exists public.deck_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (
    status in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')
  ),
  language text not null check (language in ('en', 'pt')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total_estimated integer,
  processed integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  error_count integer not null default 0,
  missing_card_events integer not null default 0,
  last_skip integer not null default 0,
  batch_size integer not null default 25,
  cancel_requested boolean not null default false,
  error_message text,
  last_errors jsonb not null default '[]'::jsonb
);

create index if not exists deck_sync_runs_user_started_idx
  on public.deck_sync_runs (user_id, started_at desc);
create index if not exists deck_sync_runs_status_idx
  on public.deck_sync_runs (status);

alter table public.synced_decks enable row level security;
alter table public.synced_deck_cards enable row level security;
alter table public.deck_sync_runs enable row level security;

drop policy if exists "Authenticated users can read synced decks" on public.synced_decks;
create policy "Authenticated users can read synced decks"
  on public.synced_decks for select to authenticated
  using (true);

drop policy if exists "Authenticated users can read synced deck cards" on public.synced_deck_cards;
create policy "Authenticated users can read synced deck cards"
  on public.synced_deck_cards for select to authenticated
  using (true);

drop policy if exists "Users can read own deck sync runs" on public.deck_sync_runs;
create policy "Users can read own deck sync runs"
  on public.deck_sync_runs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own deck sync runs" on public.deck_sync_runs;
create policy "Users can insert own deck sync runs"
  on public.deck_sync_runs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own deck sync runs" on public.deck_sync_runs;
create policy "Users can update own deck sync runs"
  on public.deck_sync_runs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.synced_decks to authenticated;
grant select on public.synced_deck_cards to authenticated;
grant select, insert, update on public.deck_sync_runs to authenticated;

comment on table public.synced_decks is 'Decks públicos sincronizados (Master Duel Meta); separados dos decks do usuário';
comment on table public.synced_deck_cards is 'Cartas do deck sincronizado; card_id aponta ao catálogo local quando resolvido';
comment on table public.deck_sync_runs is 'Progresso retomável da sincronização de decks MDM';
