import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: /api\.spec\.ts/,
      use: {
        // Public tile servers reject anonymous clients; identify the check.
        extraHTTPHeaders: { 'User-Agent': 'map-tile-checks/1.0 (nightly QA check)' },
      },
    },
    {
      name: 'ui',
      testMatch: /ui\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL,
        viewport: { width: 1280, height: 720 },
        // Always keep a screenshot as nightly evidence of how the map rendered.
        screenshot: 'on',
      },
    },
  ],
});
