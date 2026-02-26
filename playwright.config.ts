import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Test execution configuration
  expect: {
    timeout: 25000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 1,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 2 : '50%',

  // Reporter to use
  reporter: [['html', { open: 'never' }], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL for the application under test
    baseURL: process.env.BASE_URL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Maximum time each action can take
    actionTimeout: 15 * 1000,

    // Navigation timeout
    navigationTimeout: 10 * 1000,
  },

  // Configure projects for major browsers
  // run only on Chromium desktop to speed up
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Run your local dev server before starting the tests
  // Note: Application runs in Docker (managed by npm run app:start or run-tests.sh)
  // Always reuse the existing server since it's managed externally
  webServer: {
    command: 'echo "Application should be running in Docker"',
    url: process.env.BASE_URL || 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 5 * 1000,
  },
});
