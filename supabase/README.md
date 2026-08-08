# Card Storage Collection — setup Supabase

## 1. Rodar o SQL

1. Abra o [SQL Editor](https://supabase.com/dashboard/project/ytbnhmqwcrjkglauromc/sql)
2. Cole o conteúdo de `migrations/001_initial.sql` e execute (Run)
3. Cole o conteúdo de `migrations/002_collection_items.sql` e execute (necessário para **Minha coleção**)
4. Cole o conteúdo de `migrations/003_decks.sql` e execute (necessário para **Decks**)

A migration `002` cria a tabela `collection_items` (inventário por impressão: card + set_code + raridade) com RLS por usuário.
A migration `003` cria `decks` e `deck_cards` (construção de deck; 1 linha = 1 cópia).

## 2. Deploy da Edge Function `sync-cards`

Pré-requisito: [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado.

```bash
supabase login
supabase link --project-ref ytbnhmqwcrjkglauromc
supabase functions deploy sync-cards
```

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
já são injetadas automaticamente no runtime das Edge Functions hospedadas.

A `service_role` **não** deve ir no frontend nem no `.env.local`.

## 3. Auth

- Provider **Email** habilitado
- Para desenvolvimento, em Authentication → Providers → Email, desative
  "Confirm email" se quiser login imediato após o cadastro

## 4. Frontend

```bash
npm install
npm run dev
```

Credenciais do app ficam em `.env.local` (já no `.gitignore`).
