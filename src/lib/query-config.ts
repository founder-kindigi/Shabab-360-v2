export const QUERY_STALE_TIMES = {
  LIVE: 10_000,
  DEFAULT: 30_000,
  STATIC: 5 * 60_000,
} as const;

export const QUERY_CACHE_TIME = 5 * 60_000;

export const QUERY_RETRY_COUNT = 1;
