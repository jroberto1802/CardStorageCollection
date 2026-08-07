-- Card Storage Collection — schema inicial
-- Execute no Supabase: SQL Editor → New query → Run

create extension if not exists "pgcrypto";

-- Catálogo de cards (alimentado pela sync da YGOPRODeck)
create table if not exists public.cards (
  id bigint not null,
  language text not null check (language in ('en', 'pt')),
  name text not null,
  type text,
  frame_type text,
  description text,
  atk integer,
  def integer,
  level integer,
  race text,
  attribute text,
  archetype text,
  scale integer,
  linkval integer,
  linkmarkers text[],
  ygoprodeck_url text,
  card_images jsonb,
  card_sets jsonb,
  card_prices jsonb,
  banlist_info jsonb,
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, language)
);

create index if not exists cards_name_idx on public.cards using gin (to_tsvector('simple', name));
create index if not exists cards_type_idx on public.cards (type);
create index if not exists cards_archetype_idx on public.cards (archetype);
create index if not exists cards_language_idx on public.cards (language);

-- Histórico de sincronizações
create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('running', 'success', 'error')),
  language text not null check (language in ('en', 'pt')),
  cards_synced integer,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text
);

create index if not exists sync_logs_started_at_idx on public.sync_logs (started_at desc);
create index if not exists sync_logs_user_id_idx on public.sync_logs (user_id);

-- RLS
alter table public.cards enable row level security;
alter table public.sync_logs enable row level security;

-- Cards: leitura para autenticados; escrita apenas via service role (Edge Function)
drop policy if exists "Authenticated users can read cards" on public.cards;
create policy "Authenticated users can read cards"
  on public.cards
  for select
  to authenticated
  using (true);

-- Sync logs: usuário autenticado lê/insere os próprios registros
drop policy if exists "Users can read own sync logs" on public.sync_logs;
create policy "Users can read own sync logs"
  on public.sync_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own sync logs" on public.sync_logs;
create policy "Users can insert own sync logs"
  on public.sync_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Atualização de sync_logs fica a cargo da Edge Function (service_role bypassa RLS)

comment on table public.cards is 'Catálogo Yu-Gi-Oh sincronizado da YGOPRODeck API';
comment on table public.sync_logs is 'Histórico de execuções da sincronização de cards';
