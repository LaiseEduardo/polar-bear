import { expect, Page } from '@playwright/test';
import { verifySuccessMessage, waitForPageLoad } from '@helpers/index';
import { API_PATHS, LOCATORS } from '@constants/index';

/**
 * Get all article titles from the feed
 */
export const getArticleTitles = async (page: Page): Promise<string[]> => {
  await expect(page.locator(LOCATORS.ARTICLE_PREVIEW_TITLE).first()).toBeVisible();
  await expect(page.locator(LOCATORS.ARTICLE_PREVIEW_TITLE).last()).toBeVisible();
  const titles = await page.locator(LOCATORS.ARTICLE_PREVIEW_TITLE).allTextContents();
  return titles;
};

/**
 * Click on an article by index
 */
export const clickArticleByIndex = async (page: Page, index: number): Promise<void> => {
  await page.locator(LOCATORS.ARTICLE_PREVIEW).nth(index).locator('h1').click();
  await waitForPageLoad(page);
};

/**
 * Switch to global feed
 */
export const switchToGlobalFeed = async (page: Page, statusCode: number = 200): Promise<void> => {

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(API_PATHS.ARTICLES) && response.status() === statusCode
  );

  await expect(page.locator(LOCATORS.GLOBAL_FEED_TAB)).toBeVisible();
  await expect(page.locator(LOCATORS.GLOBAL_FEED_TAB)).toBeEnabled();
  await page.click(LOCATORS.GLOBAL_FEED_TAB);
  await responsePromise;
};

/**
 * Switch to my feed (authenticated users)
 */
export const switchToMyFeed = async (page: Page, statusCode: number = 200): Promise<void> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.ARTICLES_FEED) &&
      response.status() === statusCode &&
      response.request().method() === 'GET'
  );

  // Wait for any loading state to complete before switching feeds
  await expect(page.locator(LOCATORS.LOADING_ARTICLES)).toBeHidden();
  await expect(page.locator(LOCATORS.MY_FEED_TAB)).toBeEnabled();
  await page.click(LOCATORS.MY_FEED_TAB);
  await responsePromise;
  await expect(page.locator(LOCATORS.GLOBAL_FEED_TAB)).toBeVisible();
};

/**
 * Get all popular tags
 */
export const getPopularTags = async (page: Page): Promise<string[]> => {
  await expect(page.locator(LOCATORS.POPULAR_TAGS).last()).toBeVisible();
  const tags = await page.locator(LOCATORS.POPULAR_TAGS).allTextContents();
  return tags;
};

/**
 * Filter articles by tag
 */
export const filterByTag = async (page: Page, tag: string): Promise<void> => {
  await page.click(`.tag-list a:has-text("${tag}")`);
  await waitForPageLoad(page);
};

/**
 * Favorite an article in the feed
 */
export const favoriteArticleInFeed = async (
  page: Page,
  options?: {
    index?: number;
    statusCode?: number;
    method?: 'POST' | 'DELETE';
  }
): Promise<void> => {
  const { index = 0, statusCode = 200, method = 'POST' } = options || {};

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.FAVORITE_ARTICLE) &&
      response.request().method() === method &&
      response.status() === statusCode
  );

  const articlePreview = page.locator(LOCATORS.ARTICLE_PREVIEW).nth(index);
  const favoriteButton = articlePreview.locator('button.btn.btn-sm.pull-xs-right');
  await expect(favoriteButton).toBeVisible();
  await expect(favoriteButton).toBeEnabled();
  await favoriteButton.click();
  await responsePromise;
};

/**
 * Get favorite count for an article in the feed
 */
export const getFavoriteArticleInFeedCounter = async (
  page: Page,
  index: number
): Promise<number> => {
  const countText = await page
    .locator(LOCATORS.ARTICLE_PREVIEW)
    .nth(index)
    .locator('button')
    .textContent();
  const countMatch = countText?.match(/\d+/);
  return countMatch ? parseInt(countMatch[0], 10) : 0;
};

/**
 * Create new article
 */
export const createArticle = async (
  page: Page,
  title: string,
  description: string,
  body: string,
  tags: string[] = [],
  statusCode: number = 201
): Promise<void> => {
  await page.fill(LOCATORS.ARTICLE_TITLE_INPUT, title);
  await page.fill(LOCATORS.ARTICLE_DESCRIPTION_INPUT, description);
  await page.fill(LOCATORS.ARTICLE_BODY_TEXTAREA, body);

  for (const tag of tags) {
    await page.fill(LOCATORS.ARTICLE_TAGS_INPUT, tag);
    await page.press(LOCATORS.ARTICLE_TAGS_INPUT, 'Enter');
  }

  if (tags.length > 0) {
    await waitForPageLoad(page);
    await expect(page.locator(LOCATORS.ARTICLE_TAG_LIST_ITEM).last()).toBeVisible();
  }

  await publishArticleAndConfirm(page, statusCode);
};

/**
 * Click Publish Article button and confirm article creation via API response
 */
export const publishArticleAndConfirm = async (
  page: Page,
  statusCode: number = 201
): Promise<void> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.ARTICLES) &&
      !response.url().includes(API_PATHS.ARTICLES_FEED) &&
      response.request().method() === 'POST' &&
      response.status() === statusCode
  );

  await expect(page.locator(LOCATORS.PUBLISH_ARTICLE_BUTTON)).toBeVisible();
  await expect(page.locator(LOCATORS.PUBLISH_ARTICLE_BUTTON)).toBeEnabled();
  await page.click(LOCATORS.PUBLISH_ARTICLE_BUTTON);
  await responsePromise;
  await verifySuccessMessage(page, /Published successfully!/i);
};

/**
 * Navigate to My Articles tab on profile
 */
export const navigateToMyArticles = async (page: Page, username: string): Promise<void> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.ARTICLES) && response.request().method() === 'GET'
  );

  await page.goto(`/#/profile/${username}`);
  await expect(page.locator(LOCATORS.ARTICLES_TOGGLE)).toBeVisible();
  await responsePromise;
  await waitForPageLoad(page);
};

/**
 * Get articles from My Articles tab
 */
export const getMyArticles = async (page: Page): Promise<string[]> => {
  const articles = await page.locator(LOCATORS.ARTICLE_PREVIEW_TITLE).allTextContents();
  return articles;
};

/**
 * Follow a user from their profile page
 */
export const followUserFromProfile = async (
  page: Page,
  statusCode: number = 200
): Promise<void> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.PROFILES) &&
      response.url().includes(API_PATHS.FOLLOW_USER) &&
      response.request().method() === 'POST' &&
      response.status() === statusCode
  );

  await expect(page.locator(LOCATORS.FOLLOW_BUTTON)).toBeVisible();
  await page.click(LOCATORS.FOLLOW_BUTTON);
  await responsePromise;
};

/**
 * Unfollow a user from their profile page
 */
export const unfollowUserFromProfile = async (
  page: Page,
  statusCode: number = 200
): Promise<void> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.PROFILES) &&
      response.url().includes(API_PATHS.FOLLOW_USER) &&
      response.request().method() === 'DELETE' &&
      response.status() === statusCode
  );

  await expect(page.locator(LOCATORS.UNFOLLOW_BUTTON)).toBeVisible();
  await page.click(LOCATORS.UNFOLLOW_BUTTON);
  await responsePromise;
  await expect(page.locator(LOCATORS.UNFOLLOW_BUTTON)).toBeHidden();
};

/**
 * Add comment to article
 */
export const addComment = async (
  page: Page,
  commentText: string,
  statusCode: number = 201
): Promise<void> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.ARTICLES) &&
      response.url().includes(API_PATHS.COMMENTS) &&
      response.request().method() === 'POST' &&
      response.status() === statusCode
  );

  await page.fill(LOCATORS.COMMENT_TEXTAREA, commentText);
  await page.click(LOCATORS.POST_COMMENT_BUTTON);
  await responsePromise;
};

/**
 * Delete comment from an article
 */
export const deleteComment = async (page: Page, statusCode: number = 204): Promise<void> => {
  await expect(page.locator(LOCATORS.DELETE_COMMENT_BUTTON)).toBeVisible();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(API_PATHS.ARTICLES) &&
      response.url().includes(API_PATHS.COMMENTS) &&
      response.request().method() === 'DELETE' &&
      response.status() === statusCode
  );

  await page.click(LOCATORS.DELETE_COMMENT_BUTTON);
  await responsePromise;
};

/**
 * Get all comments
 */
export const getComments = async (page: Page): Promise<string[]> => {
  const comments = await page.locator(LOCATORS.COMMENT_TEXT).allTextContents();
  return comments;
};
