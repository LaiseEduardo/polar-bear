import { expect, test } from '@playwright/test';
import { LOCATORS } from '@constants/index';
import {
  clickSignUpAndConfirm,
  getErrorMessages,
  initiateUserSignup,
  login,
  logout,
  navigateToHome,
  navigateToLogin,
  navigateToRegister,
  registerAndLogin,
  verifyLoggedIn,
  waitForPageLoad,
} from '@helpers/index';
import { generateUser } from '@utils/testDataGenerator';

test.describe('Sign-up & Login - Core User Journey #1 @auth', () => {
  test.describe('User Registration @core', () => {
    test('should successfully register a new user with valid credentials', async ({ page }) => {
      await navigateToRegister(page);
      const userData = generateUser();
      await initiateUserSignup(page, userData.username, userData.email, userData.password);
      await clickSignUpAndConfirm(page);
    });
  });

  test.describe('User Login @core', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      // create a new user and login
      const registeredUser = await registerAndLogin(page);

      // Logout and login again to verify login flow
      await logout(page);
      await navigateToLogin(page);
      await login(page, registeredUser.email, registeredUser.password);

      await verifyLoggedIn(page);
    });

    test('should not be able to login with wrong password', async ({ page }) => {
      // create a new user and login
      const registeredUser = await registerAndLogin(page);
      // Logout and login again to verify login flow
      await logout(page);
      await navigateToLogin(page);
      // Attempt login with correct email but wrong password, expecting 422 Unprocessable Entity
      await login(page, registeredUser.email, 'wrongpassword', 422);

      expect(await verifyLoggedIn(page)).toBeFalsy();
    });
  });

  test.describe('Additional Tests @auth', () => {
    test('should not allow duplicate username registration', async ({ page }) => {
      const userData = generateUser();

      // Register first time
      await navigateToRegister(page);
      await initiateUserSignup(page, userData.username, userData.email, userData.password);
      await clickSignUpAndConfirm(page);

      // Try to register again with same username
      await navigateToRegister(page);
      const newEmail = `new_${userData.email}`;
      await initiateUserSignup(page, userData.username, newEmail, userData.password);
      await clickSignUpAndConfirm(page, 422);

      const errors = await getErrorMessages(page);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.toLowerCase().includes('username'))).toBeTruthy();
    });

    test('should not allow duplicate email registration', async ({ page }) => {
      const userData = generateUser();

      // Register first time
      await navigateToRegister(page);
      await initiateUserSignup(page, userData.username, userData.email, userData.password);
      await clickSignUpAndConfirm(page);

      // Try to register again with same email
      await navigateToRegister(page);
      const newUsername = `new_${userData.username}`;
      await initiateUserSignup(page, newUsername, userData.email, userData.password);
      await clickSignUpAndConfirm(page, 422);
    });

    test('should validate required registration fields', async ({ page }) => {
      await navigateToRegister(page);
      await expect(page.locator(LOCATORS.SIGN_UP_BUTTON)).toBeVisible();
      await expect(page.locator(LOCATORS.SIGN_UP_BUTTON)).toBeDisabled();
    });

    test('should validate email format', async ({ page }) => {
      const userData = generateUser();

      await navigateToRegister(page);
      await initiateUserSignup(page, userData.username, 'invalidEmail', userData.password);
      // if fields are not correct the button should be disabled and form should not submit
      await expect(page.locator(LOCATORS.SIGN_UP_BUTTON)).toBeDisabled();
    });

    test('should navigate to login from register page', async ({ page }) => {
      await navigateToRegister(page);
      await page.click(LOCATORS.SIGN_IN_LINK);

      await expect(page).toHaveURL(/.*login/);
      await expect(page.locator(LOCATORS.SIGN_IN_HEADER)).toBeVisible();
    });

    test('should display login link when not authenticated', async ({ page }) => {
      await navigateToHome(page);

      await expect(page.locator(LOCATORS.SIGN_IN_LINK)).toBeVisible();
      await expect(page.locator(LOCATORS.SIGN_UP_LINK)).toBeVisible();
    });

    test('should display user menu when authenticated', async ({ page }) => {
      await registerAndLogin(page);

      await expect(page.locator(LOCATORS.SETTINGS_LINK)).toBeVisible();
      await expect(page.locator(LOCATORS.MY_PROFILE_LINK)).toBeVisible();
      await expect(page.locator(LOCATORS.NEW_ARTICLE_LINK)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await navigateToLogin(page);

      await expect(page.locator(LOCATORS.SIGN_IN_BUTTON)).toBeVisible();
      await expect(page.locator(LOCATORS.SIGN_IN_BUTTON)).toBeDisabled();
    });

    test('should persist session after page reload', async ({ page }) => {
      // Register a user and login
      await registerAndLogin(page);

      // Reload page
      await page.reload();
      await waitForPageLoad(page);

      // Should still be logged in
      expect(await verifyLoggedIn(page)).toBeTruthy();
    });

    test('should navigate to register from login page', async ({ page }) => {
      await navigateToLogin(page);
      await page.click(LOCATORS.SIGN_UP_LINK);

      await expect(page).toHaveURL(/.*register/);
      await expect(page.locator(LOCATORS.SIGN_UP_HEADER)).toBeVisible();
    });
  });
});
