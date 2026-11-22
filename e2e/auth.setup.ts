import fs from 'node:fs'
import path from 'node:path'
import { test as setup } from '@playwright/test'
import { STORAGE_STATE } from '../playwright.config'
import { E2E_EMAIL, E2E_PASSWORD, hasCredentials } from './helpers'

// Faz login pela UI uma vez e reaproveita a sessão (storageState) nos demais testes.
setup('login', async ({ page }) => {
  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true })
  if (!hasCredentials) {
    // Estado vazio para que os projetos dependentes possam iniciar; os testes se auto-ignoram.
    fs.writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: [], origins: [] }))
    setup.skip(true, 'Defina E2E_EMAIL e E2E_PASSWORD para rodar o login')
  }
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: false }).fill(E2E_EMAIL as string)
  await page.getByLabel('Senha', { exact: false }).fill(E2E_PASSWORD as string)
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  await page.context().storageState({ path: STORAGE_STATE })
})
