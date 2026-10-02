import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against a real stack (PostgreSQL, Keycloak, Eqty.Api, Eqty.Worker): see README "Kiểm thử".
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.EQTY_PORTAL_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    launchOptions: {
      executablePath: process.env.EQTY_CHROMIUM_PATH || undefined,
      args: ['--proxy-bypass-list=<-loopback>'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
