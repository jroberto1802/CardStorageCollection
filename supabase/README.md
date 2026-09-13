# Card Storage Collection — setup Supabase

## 1. Rodar o SQL

1. Abra o [SQL Editor](https://supabase.com/dashboard/project/ytbnhmqwcrjkglauromc/sql)
2. Cole o conteúdo de `migrations/001_initial.sql` e execute (Run)
3. Cole o conteúdo de `migrations/002_collection_items.sql` e execute (necessário para **Minha coleção**)
4. Cole o conteúdo de `migrations/003_decks.sql` e execute (necessário para **Decks**)
5. Cole o conteúdo de `migrations/004_card_images_storage.sql` e execute (bucket **card-images** + leitura pública)
6. Cole o conteúdo de `migrations/005_mdm_deck_sync.sql` e execute (decks sincronizados MDM + progresso retomável)
7. Cole o conteúdo de `migrations/006_deck_side_zone.sql` e execute (zona **side** em `deck_cards`)
8. Cole o conteúdo de `migrations/007_scanner_fuzzy_search.sql` e execute (busca fuzzy **pg_trgm** para o scanner)
9. Cole o conteúdo de `migrations/008_card_art_hashes.sql` e execute (hashes **pHash** da arte para match visual no scanner)
10. Cole o conteúdo de `migrations/009_community_missing_ranking.sql` e execute (ranking de staples faltando na comunidade)
11. (Opcional, pós-R2) Use `migrations/010_r2_cleanup_notes.sql` só como checklist SQL antes de esvaziar o Storage

A migration `002` cria a tabela `collection_items` (inventário por impressão: card + set_code + raridade) com RLS por usuário.
A migration `003` cria `decks` e `deck_cards` (construção de deck; 1 linha = 1 cópia).
A migration `004` cria o bucket `card-images` no Storage (legado; imagens migraram para Cloudflare R2).
A migration `005` cria `synced_decks`, `synced_deck_cards` e `deck_sync_runs` (top decks Master Duel Meta).
A migration `006` amplia `deck_cards.zone` para incluir `side` (Side Deck até 15).
A migration `007` adiciona `name_compact`, índices **pg_trgm** e a função `search_cards_fuzzy` (busca tolerante a erros de OCR no scanner).
A migration `008` cria `card_art_hashes` (pHash 64-bit da arte por `card_id` para reconhecimento visual no scanner).
A migration `009` cria a função `get_community_missing_card_ranking` (top cartas do meta que você não possui).
A migration `010` documenta a limpeza do Storage após migração para R2.

## 2. Deploy das Edge Functions

Pré-requisito: [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e logado.

```bash
npx supabase login

# Evite `supabase link` na CLI 2.112.0 (bug SchemaError em inserted_at).
# Deploy direto com --project-ref e --use-api (não precisa de Docker):
npx supabase functions deploy sync-cards --project-ref ytbnhmqwcrjkglauromc --use-api
npx supabase functions deploy sync-card-images --project-ref ytbnhmqwcrjkglauromc --use-api
npx supabase functions deploy sync-mdm-decks --project-ref ytbnhmqwcrjkglauromc --use-api

# Alternativa: pin da CLI estável
# npx supabase@2.111.0 link --project-ref ytbnhmqwcrjkglauromc
```

- `sync-cards` — metadados do catálogo (preserva URLs já espelhadas no R2/Storage)
- `sync-card-images` — espelha `image_url_small` + `image_url` (full) no **Cloudflare R2**; `mode=full` também no detalhe
- `sync-mdm-decks` — sincroniza top decks do Master Duel Meta em lotes retomáveis

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
já são injetadas automaticamente no runtime das Edge Functions hospedadas.

### Secrets Cloudflare R2 (obrigatórios para `sync-card-images`)

No Dashboard: **Project → Edge Functions → sync-card-images → Secrets** (ou CLI
`supabase secrets set`):

| Secret | Onde achar |
|--------|------------|
| `R2_ACCOUNT_ID` | Cloudflare → R2 → Overview (Account ID) |
| `R2_ACCESS_KEY_ID` | R2 → Manage R2 API Tokens → Create API token |
| `R2_SECRET_ACCESS_KEY` | gerado junto com o token (só aparece uma vez) |
| `R2_BUCKET` | nome do bucket (ex.: `card-images`) |
| `R2_PUBLIC_BASE_URL` | URL pública sem barra final (ex.: `https://pub-xxxx.r2.dev` ou domínio custom) |
| `R2_SOFT_LIMIT_BYTES` | opcional (default ~9 GB) |

No bucket R2: habilite **Public access** (r2.dev) ou conecte um **Custom Domain**.

### CORS no R2 (obrigatório para hashes / canvas no navegador)

Sem CORS, a sync de hashes falha 100% (`crossOrigin=anonymous`). No Dashboard:

**R2 → bucket `card-images` → Settings → CORS Policy → Add CORS policy** e cole:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 86400
  }
]
```

Inclua também a origem do deploy de produção (ex.: `https://seu-app.vercel.app`).
Salve e rode de novo **Sincronizar hashes visuais**.

Permissões do API token: Object Read & Write no bucket (ou Admin no account R2).

```bash
npx supabase secrets set \
  R2_ACCOUNT_ID=... \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_BUCKET=card-images \
  R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev \
  --project-ref ytbnhmqwcrjkglauromc

npx supabase functions deploy sync-card-images --project-ref ytbnhmqwcrjkglauromc --use-api
npx supabase functions deploy sync-cards --project-ref ytbnhmqwcrjkglauromc --use-api
```

Depois: Configurações → **Sincronizar imagens (small + full)** (PT e EN). Ao terminar, rode as
queries de `010_r2_cleanup_notes.sql` e **Empty bucket** em Storage → `card-images`.

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
2. **Sincronizar imagens** (small + full no R2)
3. **Sincronizar hashes visuais** (pHash da arte; necessário para match visual no scanner)
4. **Sincronizar decks** (Master Duel Meta top-decks; retomável)

Credenciais do app ficam em `.env.local` (já no `.gitignore`).
