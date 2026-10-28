import { defineConfig, devices } from '@playwright/test';
import { API_TESTE, PORTA_FRONT } from './tests/e2e/helpers/config.ts';

const FRONT = `http://localhost:${PORTA_FRONT}`;

export default defineConfig({
  testDir: './tests/e2e',
  // O servidor de socket de teste é único e guarda estado entre chamadas
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { timeout: 5_000 },
  use: {
    baseURL: FRONT,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node tests/e2e/mock-server/socket-server.ts',
      url: `${API_TESTE}/__test/saude`,
      reuseExistingServer: false,
    },
    {
      command: `npx vite --port ${PORTA_FRONT} --strictPort`,
      url: `${FRONT}/login`,
      reuseExistingServer: false,
      env: { VITE_API_URL: API_TESTE },
    },
  ],
});
