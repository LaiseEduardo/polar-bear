import { expect, test } from '@playwright/test';
import { LOCATORS } from '@constants/index';
import {
  addComment,
  clickArticleByIndex,
  createArticle,
  deleteComment,
  getComments,
  getMyArticles,
  navigateToHome,
  navigateToMyArticles,
  navigateToNewArticle,
  registerAndLogin,
  switchToGlobalFeed,
  verifyLoggedIn,
  verifySuccessMessage,
} from '@helpers/index';
import { generateArticle, generateComment } from '@utils/testDataGenerator';

test.describe('Write Article - Core User Journey #2 @articles', () => {
  let registeredUser: { username: string; email: string; password: string };

  test.beforeEach(async ({ page }) => {
    // Register and login a user
    registeredUser = await registerAndLogin(page);
    await verifyLoggedIn(page);
  });

  test('should create an article and display in My Articles List @core', async ({
    page,
  }) => {
    // Generate article data
    const articleData = generateArticle();

    // Navigate to new article page
    await navigateToNewArticle(page);

    // Verify we're on the editor page
    await expect(page.locator(LOCATORS.NEW_ARTICLE_LINK)).toBeVisible();

    // Create the article
    await createArticle(
      page,
      articleData.title,
      articleData.description,
      articleData.body,
      articleData.tags
    );

    // Should show success confirmation message that article was created
    await verifySuccessMessage(page, /Published successfully!/i);

    // Navigate to My Articles
    await navigateToMyArticles(page, registeredUser.username);

    // Verify article appears in My Articles list
    const myArticles = await getMyArticles(page);
    expect(myArticles).toContain(articleData.title);
  });

  test.describe('Additional Tests @articles', () => {
    test('should create article with multiple tags', async ({
      page,
    }) => {
      const articleData = generateArticle();
      const tags = ['testing', 'automation', 'playwright'];

      await navigateToNewArticle(page);
      await createArticle(page, articleData.title, articleData.description, articleData.body, tags);

      // Should show success confirmation message that article was created
      await verifySuccessMessage(page, /Published successfully!/i);

      await navigateToMyArticles(page, registeredUser.username);

      // Verify tags are displayed
      for (const tag of tags) {
        await expect(page.locator(`.tag-list li:has-text("${tag}")`)).toBeVisible();
      }
    });

    test('should create article without tags', async ({ page }) => {
      const articleData = generateArticle();

      await navigateToNewArticle(page);
      await createArticle(page, articleData.title, articleData.description, articleData.body, []);

      // Should show success confirmation message that article was created
      await verifySuccessMessage(page, /Published successfully!/i);

      // Navigate to My Articles and verify
      await navigateToMyArticles(page, registeredUser.username);
      const myArticles = await getMyArticles(page);
      expect(myArticles).toContain(articleData.title);
    });

    test('should show New Article button when logged in', async ({ page }) => {
      // Verify New Article link is visible when authenticated
      await expect(page.locator(LOCATORS.NEW_ARTICLE_LINK)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await navigateToNewArticle(page);

      // Try to submit without filling fields
      await page.waitForSelector(LOCATORS.PUBLISH_ARTICLE_BUTTON);
      expect(await page.locator(LOCATORS.PUBLISH_ARTICLE_BUTTON).isDisabled()).toBe(true);
    });
  });
});

test.describe('Comments - Additional Tests #5 @articles', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login a user
    await registerAndLogin(page);
  });

  test('should allow user to add and delete a comment', async ({ page }) => {
    const commentText = generateComment();

    await navigateToHome(page);
    await switchToGlobalFeed(page);
    await clickArticleByIndex(page, 0);

    // Add a comment
    await addComment(page, commentText);

    // Verify comment is added and displayed
    const comments = await getComments(page);
    expect(comments.some((c) => c.includes(commentText))).toBeTruthy();

    // Delete the comment
    await deleteComment(page);
    // Verify comment is deleted
    const updatedComments = await getComments(page);
    expect(updatedComments.some((c) => c.includes(commentText))).toBeFalsy();
  });
});

