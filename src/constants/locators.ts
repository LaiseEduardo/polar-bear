export const LOCATORS = {
  // Navigation bar
  HOME_LINK: 'a.nav-link[href="#/"]:has-text("Home")',
  SIGN_IN_LINK: 'a.nav-link[href="#/login"]:has-text("Sign in")',
  SIGN_UP_LINK: 'a.nav-link[href="#/register"]:has-text("Sign up")',
  NEW_ARTICLE_LINK: 'a[href="#/editor"]',
  SETTINGS_LINK: 'a[href="#/settings"]',
  MY_PROFILE_LINK: 'a[href="#/my-profile"]',

  // Auth forms
  SIGN_UP_BUTTON: 'button:has-text("Sign up")',
  SIGN_IN_BUTTON: 'button:has-text("Sign in")',
  LOGOUT_BUTTON: 'button:has-text("logout")',
  USERNAME_INPUT: 'input[placeholder="Username"]',
  EMAIL_INPUT: 'input[placeholder="Email"]',
  PASSWORD_INPUT: 'input[placeholder="Password"]',
  ERROR_MESSAGES: '.error-messages',
  ERROR_MESSAGES_LIST: '.error-messages li',
  SUCCESS_MESSAGES: '.success-messages',
  SIGN_UP_HEADER: 'h1:has-text("Sign up")',
  SIGN_IN_HEADER: 'h1:has-text("Sign in")',

  // Feed tabs
  GLOBAL_FEED_TAB: 'a.nav-link:has-text("Global Feed")',
  MY_FEED_TAB: 'a.nav-link:has-text("My Feed")',

  // Article list
  ARTICLE_PREVIEW: '.article-preview',
  ARTICLE_PREVIEW_TITLE: '.article-preview h1',
  ARTICLE_PREVIEW_AUTHOR: '.article-preview .author',
  ARTICLE_PREVIEW_FAVORITE_BTN: 'button.btn-outline-primary',
  POPULAR_TAGS: '.tag-list a',

  // Article editor
  ARTICLE_TITLE_INPUT: 'input[placeholder="Article Title"]',
  ARTICLE_DESCRIPTION_INPUT: 'input[placeholder="What\'s this article about?"]',
  ARTICLE_BODY_TEXTAREA: 'textarea[placeholder="Write your article (in markdown)"]',
  ARTICLE_TAGS_INPUT: 'input[placeholder="Enter tags"]',
  PUBLISH_ARTICLE_BUTTON: 'button:has-text("Publish Article")',
  DELETE_ARTICLE_BUTTON: 'button:has-text("Delete Article")',

  // Article detail
  ARTICLE_PAGE_TITLE: '.article-page h1',
  ARTICLE_CONTENT: '.article-content',
  ARTICLE_META_AUTHOR: '.article-meta a.author',
  ARTICLE_TAGS: '.tag-list li',

  // Comments
  COMMENT_TEXTAREA: 'textarea[placeholder="Write a comment..."]',
  POST_COMMENT_BUTTON: 'button:has-text("Post Comment")',
  COMMENT_TEXT: '.card-text',
  DELETE_COMMENT_BUTTON: '.mod-options',

  // Profile / follow
  FOLLOW_BUTTON: 'button:has-text("Follow")',
  UNFOLLOW_BUTTON: 'button:has-text("Unfollow")',

  // Articles toggle (My Articles / Favorited Articles tabs on profile)
  ARTICLES_TOGGLE: '.articles-toggle',
} as const;
