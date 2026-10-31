import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // A flaky check is how CI stopped meaning anything, so a failure stays a failure.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `node tests/smoke/serve-static.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/200.html`,
    reuseExistingServer: !process.env.CI,
  },
})
