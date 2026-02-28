import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
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
const yamlConfig = yaml.load(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>;

/** Read a single ENV variable (undefined if unset or empty) */
const env = (k?: string): string | undefined => (k ? process.env[k] : undefined);

/** Walk a dot-separated path into the YAML object */
const getByPath = (yamlPath: string): unknown => {
  const keys = yamlPath.split('.');
  let value: unknown = yamlConfig;
  for (const key of keys) {
    value = (value as Record<string, unknown>)?.[key];
  }
  return value;
};

/** String: ENV wins, then YAML, then default */
function getStr(yamlPath: string, envVar: string | undefined, def: string): string;
function getStr(yamlPath: string, envVar?: string, def?: string): string | undefined;
function getStr(yamlPath: string, envVar?: string, def?: string): string | undefined {
  return env(envVar) ?? (getByPath(yamlPath) as string | undefined) ?? def;
}

/** Number: ENV wins (cast to number), then YAML, then default */
function getNum(yamlPath: string, envVar: string | undefined, def: number): number;
function getNum(yamlPath: string, envVar?: string, def?: number): number | undefined;
function getNum(yamlPath: string, envVar?: string, def?: number): number | undefined {
  const v = env(envVar) ?? getByPath(yamlPath);
  if (v === undefined) return def;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Invalid number for ${envVar ?? yamlPath}: "${v}"`);
  return n;
}

/** Boolean: ENV wins ('1','true','yes','on' → true), then YAML, then default */
function getBool(yamlPath: string, envVar: string | undefined, def: boolean): boolean;
function getBool(yamlPath: string, envVar?: string, def?: boolean): boolean | undefined;
function getBool(yamlPath: string, envVar?: string, def?: boolean): boolean | undefined {
  const v = env(envVar) ?? getByPath(yamlPath);
  if (v === undefined) return def;
  if (typeof v === 'boolean') return v;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

// Resolve storageState path relative to repo root — avoids cwd-relative path issues
const storageStatePath = path.resolve(
  __dirname,
  getStr('auth.storageStatePath', 'STORAGE_STATE_PATH', 'playwright/.auth/user.json')
);

// Build reporter list from YAML flags — allows disabling reporters without touching TS
const reporters: ReporterDescription[] = [];
if (getBool('reporting.htmlReport', undefined, true)) {
  reporters.push(['html', { open: getStr('reporting.openReport', undefined, 'never') }]);
}
if (getBool('reporting.listReporter', undefined, true)) {
  reporters.push(['list']);
}

export default defineConfig({
  testDir: './tests',

  // Timeouts from YAML config
  timeout: getNum('timeouts.test', 'TEST_TIMEOUT', 30000),

  // Test execution configuration
  expect: {
    timeout: getNum('timeouts.expect', 'EXPECT_TIMEOUT', 25000),
  },

  // Run tests in files in parallel
  fullyParallel: getBool('execution.fullyParallel', undefined, true),

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: true,

  // Retry: CI uses ci.retries from YAML, local uses execution.retries (ENV: RETRIES)
  retries: process.env.CI
    ? getNum('ci.retries', undefined, 2)
    : getNum('execution.retries', 'RETRIES', 1),

  // Workers: CI uses ci.workers from YAML, local uses execution.workers (ENV: WORKERS)
  workers: process.env.CI
    ? getNum('ci.workers', undefined, 2)
    : getNum('execution.workers', 'WORKERS', 3),

  // Reporter list controlled by reporting.htmlReport / reporting.listReporter YAML flags
  reporter: reporters,

  // Shared settings for all projects
  use: {
    // Base URL: ENV > YAML
    baseURL: getStr('baseUrl', 'BASE_URL'),

    // Artifacts — ENV: TRACE / SCREENSHOT / VIDEO
    trace: getStr('artifacts.trace', 'TRACE', 'retain-on-failure') as
      | 'off'
      | 'on'
      | 'retain-on-failure',
    screenshot: getStr('artifacts.screenshot', 'SCREENSHOT', 'only-on-failure') as
      | 'off'
      | 'on'
      | 'only-on-failure',
    video: getStr('artifacts.video', 'VIDEO', 'retain-on-failure') as
      | 'off'
      | 'on'
      | 'retain-on-failure',

    // Timeouts — ENV: ACTION_TIMEOUT / NAV_TIMEOUT
    actionTimeout: getNum('timeouts.action', 'ACTION_TIMEOUT', 15000),
    navigationTimeout: getNum('timeouts.navigation', 'NAV_TIMEOUT', 10000),
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
   * - Auth tests run against the real login/register UI (full E2E fidelity)
   * - All other tests start already logged in via reused auth state (fast + stable)
   */
  projects: [
    // ============================================================================
    // SETUP PROJECT - Authentication Infrastructure
    // ============================================================================
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/, // Matches tests/setup/auth.setup.ts
      fullyParallel: false, // Auth state must be generated once, deterministically
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
          width: getNum('browsers.chromium.viewport.width', undefined, 1920),
          height: getNum('browsers.chromium.viewport.height', undefined, 1080),
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
          width: getNum('browsers.chromium.viewport.width', undefined, 1920),
          height: getNum('browsers.chromium.viewport.height', undefined, 1080),
        },
        storageState: storageStatePath,
      },
    },
    {
      name: 'firefox',
      testIgnore: /.*\/auth\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        viewport: {
          width: getNum('browsers.firefox.viewport.width', undefined, 1920),
          height: getNum('browsers.firefox.viewport.height', undefined, 1080),
        },
        storageState: storageStatePath,
      },
    },
    {
      name: 'webkit',
      testIgnore: /.*\/auth\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Safari'],
        viewport: {
          width: getNum('browsers.webkit.viewport.width', undefined, 1920),
          height: getNum('browsers.webkit.viewport.height', undefined, 1080),
        },
        storageState: storageStatePath,
      },
    },
    {
      name: 'mobile-chrome',
      testIgnore: /.*\/auth\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices[getStr('mobileDevices.pixel5.device', undefined, 'Pixel 5') as string],
        storageState: storageStatePath,
      },
    },
    {
      name: 'mobile-safari',
      testIgnore: /.*\/auth\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices[getStr('mobileDevices.iphone13.device', undefined, 'iPhone 13') as string],
        storageState: storageStatePath,
      },
    },
  ],

  // Wait until Docker app is reachable before running tests.
  // Fails fast with a clear error if Docker isn't running — no misleading echo.
  webServer: {
    command: 'npx wait-on http://localhost:4200',
    url: getStr('baseUrl', 'BASE_URL', 'http://localhost:4200'),
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});
