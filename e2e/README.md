# E2E (Playwright)

Credenciais SOMENTE por variáveis de ambiente (nunca em arquivo):

```powershell
$env:E2E_EMAIL="..."; $env:E2E_PASSWORD="..."
npx playwright install chromium   # uma vez
npm run test:e2e                  # projetos desktop e mobile (360x740)
```

- Sem as variáveis, os testes autenticados ficam `skipped`; só G7/G8 (sem sessão) rodam.
- A sessão é salva em `.auth/user.json` (no `.gitignore`).
- Testes que criam decks usam o prefixo `[E2E]` e removem o deck ao final; `deleteE2EDeck`
  só apaga se o nome começar com `[E2E]`. Nenhum teste altera a coleção (falhas são simuladas com `page.route`).
- Numeração: C = lista de personagens, S = personagem/deck/"O que falta"/"Criar meu deck", G = gerais.
