/**
 * Authentication Setup Project
 *
 * PURPOSE:
 * This setup project creates a reusable authenticated state that can be shared across
 * all test projects. It runs ONCE before any tests execute, creating a logged-in user
 * via API (not UI) and saving the browser state to disk.
 *
 * WHY THIS APPROACH:
 * 1. SPEED: Avoid UI login for every test - API login is ~10x faster
 * 2. STABILITY: API calls are more reliable than UI interactions
 * 3. BEST PRACTICE: Keep E2E UI tests for auth flows, use API for everything else
 * 4. EFFICIENCY: One authentication shared across all workers/tests
 *
 * HOW IT WORKS:
 * 1. Setup project runs first (configured in playwright.config.ts)
 * 2. Registers a user via API and receives auth token
 * 3. Injects token into browser localStorage
 * 4. Saves browser state (cookies, localStorage) to file
 * 5. Other test projects load this saved state via storageState config
 * 6. Tests start already authenticated - no login UI needed
 *
 * USAGE:
 * - Auth tests: Use chromium-auth project (NO storageState - test real login UI)
 * - Other tests: Use chromium/firefox/etc projects (WITH storageState - fast)
 */
import { test as setup, expect } from '@playwright/test';
import { generateUser } from '@utils/testDataGenerator';
import { API_PATHS } from '@constants/index';
import * as fs from 'fs';
import * as path from 'path';

// Paths where authentication state will be saved
const authFile = 'playwright/.auth/user.json'; // Browser state (cookies, localStorage)
const userInfoFile = 'playwright/.auth/user-info.json'; // User credentials for tests

setup('authenticate via API', async ({ page, request, baseURL }) => {
  // ============================================================================
  // STEP 1: Generate Test User
  // ============================================================================
  // Create a unique user for this test run to avoid conflicts
  const user = generateUser();

  // ============================================================================
  // STEP 2: Register User via API (Not UI)
  // ============================================================================
  // Backend API runs on port 8000, frontend on port 4200
  // Replace port in baseURL to target the API directly
  const apiBaseURL = baseURL?.replace(':4200', ':8000') || 'http://localhost:8000';

  // Call registration endpoint directly - bypassing UI entirely
  const registerResponse = await request.post(`${apiBaseURL}${API_PATHS.REGISTER}`, {
    data: {
      user: {
        username: user.username,
        email: user.email,
        password: user.password,
      },
    },
  });

  // Debug logging if registration fails (helps diagnose CI/environment issues)
  if (!registerResponse.ok()) {
    const errorBody = await registerResponse.text();
    console.error(`Registration failed with status ${registerResponse.status()}`);
    console.error(`Response body: ${errorBody}`);
  }

  expect(registerResponse.ok()).toBeTruthy();
  const registerData = await registerResponse.json();
  const token = registerData.user.token; // JWT token for authentication

  expect(token).toBeTruthy();

  // ============================================================================
  // STEP 3: Save User Info for Tests
  // ============================================================================
  // Tests need access to username/email (e.g., for "My Articles" page)
  // Store credentials in a separate file that tests can read via getAuthenticatedUser()
  const userInfo = {
    username: user.username,
    email: user.email,
    password: user.password,
  };
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  fs.writeFileSync(userInfoFile, JSON.stringify(userInfo, null, 2));

  // ============================================================================
  // STEP 4: Inject Auth Token into Browser
  // ============================================================================
  // Navigate to the frontend app so we have a valid browser context
  await page.goto(baseURL || 'http://localhost:4200');

  // Inject the JWT token into localStorage (where the app expects it)
  // This simulates the state after a successful UI login
  await page.evaluate((authToken) => {
    (globalThis as any).localStorage.setItem('token', authToken);
  }, token);

  // ============================================================================
  // STEP 5: Verify Authentication State
  // ============================================================================
  // The app might refresh the token on page load, so we just verify a token exists
  // Not checking exact match - just ensuring authentication was successful
  const storedToken = await page.evaluate(() => (globalThis as any).localStorage.getItem('token'));
  expect(storedToken).toBeTruthy();
  expect(storedToken).toContain('eyJ'); // JWT tokens always start with 'eyJ' (base64 header)

  // ============================================================================
  // STEP 6: Save Browser State to Disk
  // ============================================================================
  // This is the KEY step - saves entire browser state (localStorage, cookies, etc.)
  // Other test projects configured with storageState will load this file
  // Result: Tests start with browser already in authenticated state
  await page.context().storageState({ path: authFile });
});
