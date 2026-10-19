import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4628' },
  // tests run against the production build, so the CSP and the real server are covered
  webServer: { command: 'npm run build && node bin/openfinder.mjs --port 4628', url: 'http://localhost:4628', reuseExistingServer: false },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
