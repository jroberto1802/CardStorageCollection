# Card Storage Collection — setup Supabase

## 1. Rodar o SQL

1. Abra o [SQL Editor](https://supabase.com/dashboard/project/ytbnhmqwcrjkglauromc/sql)
2. Cole o conteúdo de `migrations/001_initial.sql` e execute (Run)
3. Cole o conteúdo de `migrations/002_collection_items.sql` e execute (necessário para **Minha coleção**)
4. Cole o conteúdo de `migrations/003_decks.sql` e execute (necessário para **Decks**)
5. Cole o conteúdo de `migrations/004_card_images_storage.sql` e execute (bucket **card-images** + leitura pública)

A migration `002` cria a tabela `collection_items` (inventário por impressão: card + set_code + raridade) com RLS por usuário.
A migration `003` cria `decks` e `deck_cards` (construção de deck; 1 linha = 1 cópia).
A migration `004` cria o bucket `card-images` no Storage (miniaturas do catálogo + full sob demanda).

## 2. Deploy das Edge Functions

Pré-requisito: [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado.

```bash
npx supabase login

# Evite `supabase link` na CLI 2.112.0 (bug SchemaError em inserted_at).
# Deploy direto com --project-ref e --use-api (não precisa de Docker):
npx supabase functions deploy sync-cards --project-ref ytbnhmqwcrjkglauromc --use-api
npx supabase functions deploy sync-card-images --project-ref ytbnhmqwcrjkglauromc --use-api

# Alternativa: pin da CLI estável
# npx supabase@2.111.0 link --project-ref ytbnhmqwcrjkglauromc
```

- `sync-cards` — metadados do catálogo (preserva URLs já espelhadas no Storage)
- `sync-card-images` — espelha `image_url_small` em lotes; `mode=full` no detalhe da carta

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

Em **Configurações**, use:
1. **Sincronizar cards** (metadados)
2. **Sincronizar miniaturas** (Storage; respeita limite soft ~900 MB no Free)

Credenciais do app ficam em `.env.local` (já no `.gitignore`).
