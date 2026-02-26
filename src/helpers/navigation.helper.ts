import { Page, expect } from '@playwright/test';
import { LOCATORS, PATHS } from '@constants/index';

/**
 * Navigate to the home page using the URL and wait for the home link to be visible to confirm page load
 */
export const navigateToHome = async (page: Page): Promise<void> => {
  await page.goto(PATHS.HOME);
  await waitForPageLoad(page);
};

/**
 * Click on the Home link in the navigation bar
 */
export const clickHomeLink = async (page: Page): Promise<void> => {
  await page.click(LOCATORS.HOME_LINK);
  await waitForPageLoad(page);
};

/**
 * Navigate to the login page using the URL and wait for the Sign in link to be visible to confirm page load
 */
export const navigateToLogin = async (page: Page): Promise<void> => {
  await navigateToHome(page);
  await expect(page.locator(LOCATORS.SIGN_IN_LINK)).toBeVisible();
  await page.goto(PATHS.LOGIN);
  await waitForPageLoad(page);
};

/**
 * Click on the Sign in link in the navigation bar
 */
export const clickSignInLink = async (page: Page): Promise<void> => {
  await page.click(LOCATORS.SIGN_IN_LINK);
  await waitForPageLoad(page);
};

/**
 * Navigate to the register page using the URL and wait for the Sign up link to be visible to confirm page load
 */
export const navigateToRegister = async (page: Page): Promise<void> => {
  await navigateToHome(page);
  await expect(page.locator(LOCATORS.SIGN_UP_LINK)).toBeVisible();
  await page.goto(PATHS.REGISTER);
  await waitForPageLoad(page);
};

/**
 * Click on the Sign up link in the navigation bar
 */
export const clickSignUpLink = async (page: Page): Promise<void> => {
  await page.click(LOCATORS.SIGN_UP_LINK);
  await waitForPageLoad(page);
};

/**
 * Navigate to article detail page using the URL and wait for the page to be fully loaded
 */
export const navigateToArticle = async (page: Page, slug: string): Promise<void> => {
  await page.goto(`/#/article/${slug}`);
  await waitForPageLoad(page);
};

/**
 * Wait for page to be fully loaded
 */
export const waitForPageLoad = async (page: Page): Promise<void> => {
  await page.waitForLoadState('domcontentloaded');
};

/**
 * Navigate to profile page by clicking on the profile link in the navigation bar and wait for the page to be fully loaded
 */
export const navigateToProfile = async (page: Page, username: string): Promise<void> => {
  await page.click(`a[href="#/profile/${username}"]`);
  await expect(page.locator(`.profile-page h4:has-text("${username}")`)).toBeVisible();
  await waitForPageLoad(page);
};

/**
 * Navigate to new article page using the URL and wait for the page to be fully loaded
 */
export const navigateToNewArticle = async (page: Page): Promise<void> => {
  await page.goto(PATHS.NEW_ARTICLE);
  await waitForPageLoad(page);
};

/**
 * Navigate to settings page using the URL and wait for the page to be fully loaded
 */
export const navigateToSettings = async (page: Page): Promise<void> => {
  await page.goto(PATHS.SETTINGS);
  await waitForPageLoad(page);
};

/**
 * Verify success message is displayed
 */
export const verifySuccessMessage = async (
  page: Page,
  expectedText: string | RegExp
): Promise<void> => {
  await expect(page.locator(LOCATORS.SUCCESS_MESSAGES)).toBeVisible();
  await expect(page.locator(LOCATORS.SUCCESS_MESSAGES)).toHaveText(expectedText);
};
