const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  timeout: 60000,
  retries: 1,
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
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
    {
      name: 'Desktop Chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
