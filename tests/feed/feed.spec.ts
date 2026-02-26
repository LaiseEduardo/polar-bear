import { expect, test } from '@playwright/test';
import { LOCATORS } from '@constants/index';
import {
  clickHomeLink,
  clickSignUpAndConfirm,
  createArticle,
  favoriteArticleInFeed,
  filterByTag,
  followUserFromProfile,
  getArticleTitles,
  getFavoriteArticleInFeedCounter,
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
  waitForPageLoad,
} from '@helpers/index';
import { generateArticle, generateUser } from '@utils/testDataGenerator';
import type { User } from '../../src/types';

test.describe('Follow Feed - Core User Journey #3 @feed @core', () => {
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
    await createArticle(
      page,
      `Article by ${userB.username}`,
      articleData.description,
      articleData.body,
      ['test', 'follow-feed']
    );
    await verifySuccessMessage(page, /Published successfully!/i);
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
    await verifySuccessMessage(page, /Published successfully!/i);

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
    const feedArticles = await getArticleTitles(page);
    expect(feedArticles).toContain(articleData.title);

    await expect(page.locator(LOCATORS.ARTICLE_PREVIEW).first()).toBeVisible();
    // Verify the author is User B
    const firstArticleAuthor = await page
      .locator(LOCATORS.ARTICLE_PREVIEW_AUTHOR)
      .first()
      .textContent();
    expect(firstArticleAuthor?.trim()).toBe(userB.username);
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

      // My Feed might be empty or show "No articles are here... yet"
      const noArticlesMessage = page.locator('text=No articles are here... yet');
      const articlesExist = await page.locator(LOCATORS.ARTICLE_PREVIEW).count();

      if (articlesExist === 0) {
        await expect(noArticlesMessage).toBeVisible();
      } else {
        // If there are articles, verify none are from User B
        const feedArticles = await page.locator(LOCATORS.ARTICLE_PREVIEW_AUTHOR).allTextContents();
        expect(feedArticles.every((author) => author.trim() !== userB.username)).toBeTruthy();
      }
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

      // Check My Feed - article should not be there
      await clickHomeLink(page);
      await switchToMyFeed(page);

      // My Feed might be empty or show "No articles are here... yet"
      const noArticlesMessage = page.locator('text=No articles are here... yet');
      const articlesExist = await page.locator(LOCATORS.ARTICLE_PREVIEW).count();

      if (articlesExist === 0) {
        await expect(noArticlesMessage).toBeVisible();
      } else {
        // If there are articles, verify none are from User B
        await expect(page.locator(LOCATORS.ARTICLE_PREVIEW).last()).toBeVisible();
        const feedArticles = await page.locator(LOCATORS.ARTICLE_PREVIEW_AUTHOR).allTextContents();
        expect(feedArticles.every((author) => author.trim() !== userB.username)).toBeTruthy();
      }
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
  test.beforeEach(async ({ page }) => {
    // Register and login a user
    await registerAndLogin(page);
  });

  test('should favorite an article', async ({ page }) => {
    await navigateToHome(page);
    await switchToGlobalFeed(page);

    // Get initial favorite count, favorite the article, then get updated count to verify increment
    const initialFavoriteCount = await getFavoriteArticleInFeedCounter(page, 0);
    await favoriteArticleInFeed(page);
    const updatedFavoriteCount = await getFavoriteArticleInFeedCounter(page, 0);

    // Verify counter has changed
    expect(updatedFavoriteCount).not.toBe(initialFavoriteCount);
  });

  test('should unfavorite an article', async ({ page }) => {
    await navigateToHome(page);
    await switchToGlobalFeed(page);

    // Favorite first
    await favoriteArticleInFeed(page);

    // Then unfavorite the same article
    const initialFavoriteCount = await getFavoriteArticleInFeedCounter(page, 0);
    await favoriteArticleInFeed(page, { method: 'DELETE' });

    // Verify counter has changed
    const updatedFavoriteCount = await getFavoriteArticleInFeedCounter(page, 0);
    expect(updatedFavoriteCount).not.toBe(initialFavoriteCount);
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
