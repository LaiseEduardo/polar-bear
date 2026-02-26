import { expect, Page } from '@playwright/test';
import { navigateToLogin, navigateToRegister, waitForPageLoad } from '@helpers/index';
import { generateUser } from '@utils/testDataGenerator';
import { API_PATHS, LOCATORS } from '@constants/index';

/**
 * Perform user login
 */
export const login = async (
  page: Page,
  email: string,
  password: string,
  statusCode: number = 200
): Promise<void> => {
  await page.fill(LOCATORS.EMAIL_INPUT, email);
  await page.fill(LOCATORS.PASSWORD_INPUT, password);
  await expect(page.locator(LOCATORS.SIGN_IN_BUTTON)).toBeEnabled();
  
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.LOGIN) &&
      response.request().method() === 'POST' &&
      response.status() === statusCode
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
  await page.click(LOCATORS.SETTINGS_LINK);
  await page.waitForSelector(LOCATORS.LOGOUT_BUTTON, { state: 'visible' });
  await page.click(LOCATORS.LOGOUT_BUTTON);
  await waitForPageLoad(page);
  await page.waitForSelector(LOCATORS.LOGOUT_BUTTON, { state: 'hidden' });
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
    await page.waitForSelector(LOCATORS.SETTINGS_LINK, { state: 'visible' });
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
  return registeredUser;
};
