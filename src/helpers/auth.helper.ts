import { expect, Page } from '@playwright/test';
import { navigateToLogin, navigateToRegister, waitForPageLoad } from '@helpers/index';
import { generateUser } from '@utils/testDataGenerator';
import { API_PATHS, LOCATORS } from '@constants/index';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get authenticated user credentials from setup project
 *
 * PURPOSE:
 * Retrieves user info (username, email, password) created by the auth.setup.ts project.
 * Used by tests that run with storageState to access the authenticated user's details.
 *
 * WHY THIS IS NEEDED:
 * - Tests using storageState start already logged in via saved browser state
 * - But they still need user details for assertions (e.g., navigating to "My Articles")
 * - This function reads the credentials from the file saved during setup
 *
 * USAGE:
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   const user = getAuthenticatedUser();
 *   await navigateToMyArticles(page, user.username);
 * });
 * ```
 *
 * NOTE:
 * - Only works in tests using storageState (chromium, firefox, webkit projects)
 * - Auth tests (chromium-auth) don't use this - they create their own users
 * - Throws error if setup project hasn't run yet
 */
export const getAuthenticatedUser = (): {
  username: string;
  email: string;
  password: string;
} => {
  const userInfoPath = path.join(process.cwd(), 'playwright/.auth/user-info.json');
  if (!fs.existsSync(userInfoPath)) {
    throw new Error(
      'User info file not found. Ensure setup project has run to create authenticated state.'
    );
  }
  const userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf-8'));
  return userInfo;
};

/**
 * Perform user login
 */
export const login = async (
  page: Page,
  email: string,
  password: string,
  statusCode: number | number[] = 200
): Promise<void> => {
  await page.fill(LOCATORS.EMAIL_INPUT, email);
  await page.fill(LOCATORS.PASSWORD_INPUT, password);
  await expect(page.locator(LOCATORS.SIGN_IN_BUTTON)).toBeEnabled();

  const expectedCodes = Array.isArray(statusCode) ? statusCode : [statusCode];
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.LOGIN) &&
      response.request().method() === 'POST' &&
      expectedCodes.includes(response.status())
  );

  await page.click(LOCATORS.SIGN_IN_BUTTON);
  await responsePromise;
  await waitForPageLoad(page);
};

/**
 * Fill user registration form
 */
export const initiateUserSignup = async (
  page: Page,
  username: string,
  email: string,
  password: string
): Promise<void> => {
  await page.fill(LOCATORS.USERNAME_INPUT, username);
  await page.fill(LOCATORS.EMAIL_INPUT, email);
  await page.fill(LOCATORS.PASSWORD_INPUT, password);
};

/**
 * Click Sign up button and confirm user creation via API response
 */
export const clickSignUpAndConfirm = async (
  page: Page,
  statusCode: number = 201
): Promise<void> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.REGISTER) &&
      response.request().method() === 'POST' &&
      response.status() === statusCode
  );

  await expect(page.locator(LOCATORS.SIGN_UP_BUTTON)).toBeEnabled();
  await page.click(LOCATORS.SIGN_UP_BUTTON);
  await responsePromise;
  await waitForPageLoad(page);
};

/**
 * Get error messages from the form
 */
export const getErrorMessages = async (page: Page): Promise<string[]> => {
  const errorElements = await page.locator(LOCATORS.ERROR_MESSAGES_LIST).all();
  return Promise.all(errorElements.map((el) => el.textContent().then((text) => text || '')));
};

/**
 * Logout user
 */
export const logout = async (page: Page): Promise<void> => {
  await expect(page.locator(LOCATORS.SETTINGS_LINK)).toBeVisible();
  await page.click(LOCATORS.SETTINGS_LINK);
  await expect(page.locator(LOCATORS.LOGOUT_BUTTON)).toBeVisible();
  await page.click(LOCATORS.LOGOUT_BUTTON);
  await waitForPageLoad(page);
  await expect(page.locator(LOCATORS.SETTINGS_LINK)).toBeHidden();
};

/**
 * Verify if user is logged in by checking auth token and UI elements
 */
export const verifyLoggedIn = async (page: Page): Promise<boolean> => {
  try {
    const token = await page.evaluate(() => (globalThis as any).localStorage.getItem('token'));
    if (token === null || token.length === 0) {
      return false;
    }
    await expect(page.locator(LOCATORS.SETTINGS_LINK)).toBeVisible();
    return true;
  } catch {
    return false;
  }
};

/**
 * Register a new user and login with the credentials
 */
export const registerAndLogin = async (
  page: Page
): Promise<{ username: string; email: string; password: string }> => {
  const registeredUser = generateUser();
  await navigateToRegister(page);
  await initiateUserSignup(
    page,
    registeredUser.username,
    registeredUser.email,
    registeredUser.password
  );
  await clickSignUpAndConfirm(page);
  await navigateToLogin(page);
  await login(page, registeredUser.email, registeredUser.password);
  await verifyLoggedIn(page);
  return registeredUser;
};
