# Card Storage Collection — setup Supabase

## 1. Rodar o SQL

1. Abra o [SQL Editor](https://supabase.com/dashboard/project/ytbnhmqwcrjkglauromc/sql)
2. Cole o conteúdo de `migrations/001_initial.sql`
3. Execute (Run)

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
