import { defineConfig, devices } from '@playwright/test'

/**
 * E2E contra o app real (Supabase da conta de teste).
 * Credenciais SOMENTE por variáveis de ambiente: E2E_EMAIL e E2E_PASSWORD.
 * Sem elas, os testes que exigem login ficam como "skipped".
 * A sessão é salva em .auth/user.json (ignorado pelo git).
 */
export const STORAGE_STATE = '.auth/user.json'

export default defineConfig({
  testDir: './e2e',
  // Remove decks "[E2E]" esquecidos (só os que começam com [E2E])
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 740 },
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
  ],
})
