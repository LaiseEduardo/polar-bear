/**
 * Timeout values (in milliseconds) used across helpers and tests.
 * Centralised here to make tuning easy and avoid magic numbers.
 */
export const TIMEOUTS = {
  /** Default API polling timeout for feed helpers (toPass retry loop) */
  FEED_POLL: 10000,

  /** waitForResponse timeout on article publish — extended for Docker load */
  PUBLISH_CONFIRM: 25000,

  /** Timeout for feed state to reflect after a follow/unfollow action */
  FEED_UPDATE: 15000,

  /** test.setTimeout / testInfo.setTimeout for complex multi-user setup flows */
  COMPLEX_SETUP: 60000,

  /** test.setTimeout for favorite / unfavorite tests */
  FAVORITE_TEST: 45000,
} as const;
