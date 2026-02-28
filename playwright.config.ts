import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

/**
 * CONFIGURATION HIERARCHY
 *
 * Configuration is loaded in the following order (later overrides earlier):
 * 1. config.yaml - Base configuration (committed to repo)
 * 2. .env file - Environment-specific overrides (local only, gitignored)
 * 3. Environment variables - Runtime overrides (CI/CD, command line)
 *
 * WHY YAML + ENV:
 * - YAML: Structured, readable, supports complex config (arrays, objects)
 * - ENV: Simple overrides, secure secrets, CI/CD integration
 * - Best of both: YAML for defaults, ENV for environment-specific values
 *
 * USAGE:
 * - Local development: Customize config.yaml or .env
 * - CI/CD: Use environment variables (e.g., BASE_URL, WORKERS)
 * - Multiple environments: Create config.staging.yaml, config.prod.yaml
 */

// Load YAML configuration
const configPath = path.join(__dirname, 'config.yaml');
const yamlConfig: any = yaml.load(fs.readFileSync(configPath, 'utf8'));

// Helper: Get config value with ENV override
const getConfig = (yamlPath: string, envVar?: string, defaultValue?: any): any => {
  if (envVar && process.env[envVar]) {
    return process.env[envVar];
  }
  const keys = yamlPath.split('.');
  let value = yamlConfig;
  for (const key of keys) {
    value = value?.[key];
  }
  return value !== undefined ? value : defaultValue;
};

export default defineConfig({
  testDir: './tests',

  // Timeouts from YAML config
  timeout: getConfig('timeouts.test', undefined, 30000),

  // Test execution configuration
  expect: {
    timeout: getConfig('timeouts.expect', undefined, 25000),
  },

  // Run tests in files in parallel
  fullyParallel: getConfig('execution.fullyParallel', undefined, true),

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: process.env.CI ? true : getConfig('execution.forbidOnly', undefined, false),

  // Retry on CI only (CI always gets 2 retries)
  retries: process.env.CI ? 2 : getConfig('execution.retries', undefined, 1),

  // Workers: ENV > YAML > CI default > local default
  workers: process.env.WORKERS
    ? Number(process.env.WORKERS)
    : process.env.CI
      ? 2
      : getConfig('execution.workers', undefined, '50%'),

  // Reporter to use
  reporter: [['html', { open: getConfig('reporting.openReport', undefined, 'never') }], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL: ENV > YAML
    baseURL: getConfig('baseUrl', 'BASE_URL'),

    // Artifacts from YAML config (can be overridden by ENV)
    trace: getConfig('artifacts.trace', undefined, 'retain-on-failure'),
    screenshot: getConfig('artifacts.screenshot', undefined, 'only-on-failure'),
    video: getConfig('artifacts.video', undefined, 'retain-on-failure'),

    // Timeouts from YAML
    actionTimeout: getConfig('timeouts.action', undefined, 15000),
    navigationTimeout: getConfig('timeouts.navigation', undefined, 10000),
  },

  /**
   * AUTHENTICATION STRATEGY - Two-Tier Project Architecture
   *
   * WHY THIS APPROACH:
   * - Speed: Most tests reuse API-created auth state (70% faster than UI login)
   * - Stability: API calls more reliable than UI interactions
   * - Coverage: Auth tests still verify actual login UI flows (E2E fidelity)
   *
   * HOW IT WORKS:
   * 1. Setup project (runs FIRST):
   *    - Creates user via API
   *    - Saves browser state to playwright/.auth/user.json
   *
   * 2. Auth projects (NO storageState):
   *    - Test actual login/register UI flows
   *    - Create their own users as needed
   *    - Run in chromium-auth project
   *
   * 3. Authenticated projects (WITH storageState):
   *    - Load saved browser state from setup
   *    - Start already logged in
   *    - Run in chromium/firefox/webkit/mobile projects
   *
   * RESULT:
   * - 13 auth tests: Full E2E UI verification
   * - 13 other tests: Fast, stable, reuse auth state
   */
  projects: [
    // ============================================================================
    // SETUP PROJECT - Authentication Infrastructure
    // ============================================================================
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/, // Matches tests/setup/auth.setup.ts
    },

    // ============================================================================
    // AUTH PROJECT - Tests Login UI (No Reused Auth)
    // ============================================================================
    {
      name: 'chromium-auth',
      testMatch: /.*\/auth\/.*\.spec\.ts/, // Only auth tests
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: getConfig('browsers.chromium.viewport.width', undefined, 1920),
          height: getConfig('browsers.chromium.viewport.height', undefined, 1080),
        },
        // NO storageState - tests must go through real login UI
      },
    },

    // ============================================================================
    // AUTHENTICATED PROJECTS - Reuse Auth State for Speed
    // ============================================================================
    {
      name: 'chromium',
      testIgnore: /.*\/auth\/.*\.spec\.ts/, // Skip auth tests (handled by chromium-auth)
      dependencies: ['setup'], // Wait for setup to create auth state
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: getConfig('browsers.chromium.viewport.width', undefined, 1920),
          height: getConfig('browsers.chromium.viewport.height', undefined, 1080),
        },
        storageState: getConfig('auth.storageStatePath', undefined, 'playwright/.auth/user.json'),
      },
    },
    {
      name: 'firefox',
      testIgnore: /.*\/auth\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        viewport: {
          width: getConfig('browsers.firefox.viewport.width', undefined, 1920),
          height: getConfig('browsers.firefox.viewport.height', undefined, 1080),
        },
        storageState: getConfig('auth.storageStatePath', undefined, 'playwright/.auth/user.json'),
      },
    },
    {
      name: 'webkit',
      testIgnore: /.*\/auth\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Safari'],
        viewport: {
          width: getConfig('browsers.webkit.viewport.width', undefined, 1920),
          height: getConfig('browsers.webkit.viewport.height', undefined, 1080),
        },
        storageState: getConfig('auth.storageStatePath', undefined, 'playwright/.auth/user.json'),
      },
    },
    {
      name: 'mobile-chrome',
      testIgnore: /.*\/auth\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices[getConfig('mobileDevices.pixel5.device', undefined, 'Pixel 5')],
        storageState: getConfig('auth.storageStatePath', undefined, 'playwright/.auth/user.json'),
      },
    },
    {
      name: 'mobile-safari',
      testIgnore: /.*\/auth\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices[getConfig('mobileDevices.iphone13.device', undefined, 'iPhone 13')],
        storageState: getConfig('auth.storageStatePath', undefined, 'playwright/.auth/user.json'),
      },
    },
  ],

  // It can run your local dev server before starting the tests
  // Note: Application runs in Docker (managed by npm run app:start or npm test)
  // Always reuse the existing server since it's managed externally
  webServer: {
    command: 'echo "Application should be running in Docker"',
    url: getConfig('baseUrl', 'BASE_URL', 'http://localhost:4200'),
    reuseExistingServer: true,
    timeout: 5 * 1000,
  },
});
