const { defineConfig } = require('@playwright/test');

// Use TEST_URL from environment, fallback to production
const BASE_URL = process.env.TEST_URL || 'https://coinhubx.net';

module.exports = defineConfig({
  testDir: './',
  timeout: 45000,
  retries: 2,
  workers: 1, // Run tests sequentially to avoid rate limiting
  use: {
    headless: true,
    baseURL: BASE_URL,
    viewport: { width: 390, height: 844 },
    actionTimeout: 10000,
    navigationTimeout: 30000,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: '../test-reports', open: 'never' }],
    ['json', { outputFile: '../test-reports/results.json' }]
  ],
  projects: [
    {
      name: 'Mobile Chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],
  // Only run desktop tests locally, skip in CI for speed
  // {
  //   name: 'Desktop Chrome',
  //   use: {
  //     browserName: 'chromium',
  //     viewport: { width: 1920, height: 1080 },
  //   },
  // },
});
