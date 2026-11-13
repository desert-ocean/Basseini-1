const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: 'list',
  outputDir: '.test-artifacts/playwright-results',
  use: { baseURL: 'http://127.0.0.1:4179', channel: 'msedge', headless: true, trace: 'retain-on-failure' },
  globalSetup: require.resolve('./tests/e2e-server.cjs')
});
