# Card Storage Collection

Aplicação React (Vite + Tailwind) para gerenciar um catálogo Yu-Gi-Oh!
alimentado pelo Supabase, com sincronização manual via Edge Function a partir
da [YGOPRODeck API](https://ygoprodeck.com/api-guide/).

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Supabase Auth (e-mail/senha)
- Supabase Edge Function `sync-cards`

## Setup local

1. Copie `.env.example` para `.env.local` e preencha URL + anon key
2. Execute o SQL em `supabase/migrations/001_initial.sql` no SQL Editor
3. Faça o deploy da Edge Function (veja `supabase/README.md`)
4. Instale e rode:

```bash
npm install
npm run dev
```

## Rotas

- `/login` — autenticação (e-mail/senha; usuários criados no painel Supabase)
- `/` — início (contagem de cards no banco)
- `/settings` — idioma (EN/PT) + sincronizar cards

## Segurança

- `.env.local` está no `.gitignore`
- A `service_role` **nunca** deve ir no frontend
