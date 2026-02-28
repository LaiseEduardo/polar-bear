/**
 * HTTP status codes used across helpers and tests.
 * Centralised here to avoid magic numbers and keep assertions readable.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  UNAUTHORIZED: 401,
  UNPROCESSABLE_ENTITY: 422,
} as const;
