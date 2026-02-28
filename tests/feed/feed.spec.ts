import { expect, test } from '@playwright/test';
import { LOCATORS, MESSAGES } from '@constants/index';
import {
  clickHomeLink,
  clickSignUpAndConfirm,
  createArticle,
  favoriteArticleInFeedByTitle,
  filterByTag,
  followUserFromProfile,
  getFavoriteCountByArticleTitle,
  getPopularTags,
  initiateUserSignup,
  login,
  logout,
  navigateToHome,
  navigateToLogin,
  navigateToNewArticle,
  navigateToProfile,
  navigateToRegister,
  registerAndLogin,
  switchToGlobalFeed,
  switchToMyFeed,
  unfollowUserFromProfile,
  verifyLoggedIn,
  verifySuccessMessage,
  waitForArticleInFeed,
  waitForArticlesNotInFeedByAuthor,
  waitForPageLoad,
} from '@helpers/index';
import { generateArticle, generateUser } from '@utils/testDataGenerator';
import type { User } from '@type/index';

test.describe('Follow Feed - Core User Journey #3 @feed @core', () => {
  // These tests need multiple users and test the signup/login flow
  // Override storageState to start with a clean, unauthenticated state
  test.use({ storageState: { cookies: [], origins: [] } });

  let userA: User;
  let userB: User;

  test.beforeEach(async ({ page }) => {
    // Generate follower user
    userA = generateUser('Follower');

    // Register User A
    await navigateToRegister(page);
    await initiateUserSignup(page, userA.username, userA.email, userA.password);
    await clickSignUpAndConfirm(page);

    // Register, login and create article with User B
    userB = await registerAndLogin(page);
    await verifyLoggedIn(page);
    const articleData = generateArticle();
    await navigateToNewArticle(page);
    await createArticle(page, articleData.title, articleData.description, articleData.body, [
      'follow-feed',
      'user-b-article',
    ]);
    await logout(page);
  });

  test('should show articles from followed users in Your Feed', async ({ page }) => {
    // Step 1: User A logs in
    await navigateToLogin(page);
    await login(page, userA.email, userA.password);
    await waitForPageLoad(page);
    await verifyLoggedIn(page);

    // Step 2: User A follows User B
    await navigateToProfile(page, userB.username);
    await followUserFromProfile(page);

    // Verify follow button changed to Unfollow
    await expect(page.locator(LOCATORS.UNFOLLOW_BUTTON)).toBeVisible();

    // Step 3: Logout User A
    await logout(page);

    // Step 4: User B logs in
    await navigateToLogin(page);
    await login(page, userB.email, userB.password);
    await waitForPageLoad(page);

    // Step 5: User B publishes an new article
    const articleData = generateArticle();
    await navigateToNewArticle(page);
    await createArticle(
      page,
      articleData.title,
      articleData.description,
      articleData.body,
      articleData.tags
    );

    // Verify success confirmation message that article was created
    await verifySuccessMessage(page, MESSAGES.ARTICLE_PUBLISHED);

    // Step 6: Logout User B
    await logout(page);

    // Step 7: User A logs in again
    await navigateToLogin(page);
    await login(page, userA.email, userA.password);
    await waitForPageLoad(page);

    // Step 8: Check My Feed
    await navigateToHome(page);
    await switchToMyFeed(page);

    // Step 9: Verify User B's article appears in User A's My Feed
    // Use polling to handle eventual consistency in feed endpoint
    await waitForArticleInFeed(page, articleData.title, {
      authorUsername: userB.username,
      timeout: 15000, // Allow time for feed to update
    });

    // Additional verification: article preview is visible
    await expect(page.locator(LOCATORS.ARTICLE_PREVIEW).first()).toBeVisible();
  });

  test.describe('Follow Feed - Additional Tests @feed', () => {
    test('should not show unfollowed user article in My Feed', async ({ page }) => {
      // User A logs in (without following User B)
      await navigateToLogin(page);
      await login(page, userA.email, userA.password);
      await waitForPageLoad(page);

      // User A checks My Feed (should be empty or not contain User B's articles)
      await navigateToHome(page);

      // Verify My Feed tab is available
      await expect(page.locator(LOCATORS.MY_FEED_TAB)).toBeVisible();

      await switchToMyFeed(page);

      // Wait and verify User B's articles don't appear (with polling for eventual consistency)
      await waitForArticlesNotInFeedByAuthor(page, userB.username, { timeout: 10000 });
    });

    test('should allow unfollow and the article disappears from feed', async ({ page }) => {
      // User A logs in and follows User B
      await navigateToLogin(page);
      await login(page, userA.email, userA.password);
      await waitForPageLoad(page);

      await navigateToProfile(page, userB.username);
      await followUserFromProfile(page);
      await expect(page.locator(LOCATORS.UNFOLLOW_BUTTON)).toBeVisible();

      // Logout user A to prepare for article creation by user B
      await logout(page);

      // User B logs in and creates an article
      await navigateToLogin(page);
      await login(page, userB.email, userB.password);
      await waitForPageLoad(page);

      const articleData = generateArticle();
      await navigateToNewArticle(page);
      await createArticle(
        page,
        articleData.title,
        articleData.description,
        articleData.body,
        articleData.tags
      );

      // Logout User B
      await logout(page);

      // User A logs in and unfollows User B
      await navigateToLogin(page);
      await login(page, userA.email, userA.password);
      await waitForPageLoad(page);

      await navigateToProfile(page, userB.username);
      await unfollowUserFromProfile(page);

      // Verify unfollow successful
      await expect(page.locator(LOCATORS.FOLLOW_BUTTON)).toBeVisible();
      await expect(page.locator(LOCATORS.UNFOLLOW_BUTTON)).toBeHidden();

      // Check My Feed - article should not be there
      await clickHomeLink(page);
      await switchToMyFeed(page);

      // Wait for feed to update (eventual consistency)
      // Verify User B's articles no longer appear in feed
      await waitForArticlesNotInFeedByAuthor(page, userB.username, { timeout: 15000 });
    });

    test('should display My Feed tab only when logged in', async ({ page }) => {
      // When not logged in, My Feed should not be visible
      await navigateToHome(page);

      const myFeedTab = page.locator(LOCATORS.MY_FEED_TAB);
      await expect(myFeedTab).toBeHidden();

      // When logged in, My Feed should be visible
      await navigateToLogin(page);
      await login(page, userA.email, userA.password);
      await waitForPageLoad(page);

      await navigateToHome(page);
      await expect(myFeedTab).toBeVisible();
    });
  });
});

test.describe('Favourite Toggle - Additional Tests #6 @feed', () => {
  // Configure tests to run serially to avoid race conditions with favorite counts
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // User is already logged in via storageState (API authentication)
    // Just navigate to home to ensure page is loaded
    await page.goto('/');
  });

  test('should favorite an article', async ({ page }) => {
    // Create a unique article for this test to avoid conflicts with other parallel tests
    const uniqueTitle = `Test Article ${Date.now()}`;
    await navigateToNewArticle(page);
    await createArticle(page, uniqueTitle, 'Test description', 'Test body');

    await navigateToHome(page);
    await switchToGlobalFeed(page);

    // Wait for the article to appear in the feed
    await waitForArticleInFeed(page, uniqueTitle);

    // Get initial favorite count from the specific article
    const initialFavoriteCount = await getFavoriteCountByArticleTitle(page, uniqueTitle);

    // Favorite the article by title (more reliable than by index)
    await favoriteArticleInFeedByTitle(page, uniqueTitle);

    // Get updated count from the same article (by title, not index, to handle feed reordering)
    const updatedFavoriteCount = await getFavoriteCountByArticleTitle(page, uniqueTitle);

    // Verify counter incremented by exactly 1
    expect(updatedFavoriteCount).toBe(initialFavoriteCount + 1);
  });

  test('should unfavorite an article', async ({ page }) => {
    // Create a unique article for this test to avoid conflicts with other parallel tests
    const uniqueTitle = `Test Article ${Date.now()}`;
    await navigateToNewArticle(page);
    await createArticle(page, uniqueTitle, 'Test description', 'Test body');

    await navigateToHome(page);
    await switchToGlobalFeed(page);

    // Wait for the article to appear in the feed
    await waitForArticleInFeed(page, uniqueTitle);

    // Favorite first (by title)
    await favoriteArticleInFeedByTitle(page, uniqueTitle);

    // Get the favorite count after favoriting
    const initialFavoriteCount = await getFavoriteCountByArticleTitle(page, uniqueTitle);

    // Then unfavorite the same article (by title)
    await favoriteArticleInFeedByTitle(page, uniqueTitle, { method: 'DELETE' });

    // Get updated count from the same article (by title)
    const updatedFavoriteCount = await getFavoriteCountByArticleTitle(page, uniqueTitle);

    // Verify counter decremented by exactly 1
    expect(updatedFavoriteCount).toBe(initialFavoriteCount - 1);
  });
});

test.describe('Tag filter - Additional Tests #7 @feed', () => {
  test('should filter articles by tag on the Global Feed', async ({ page }) => {
    await navigateToHome(page);

    const tags = await getPopularTags(page);
    expect(tags.length).toBeGreaterThan(0);

    const firstTag = tags[0];
    await filterByTag(page, firstTag);

    // Verify tag is displayed in the feed
    await expect(page.locator(`a.nav-link:has-text("${firstTag}")`)).toBeVisible();
  });
});
