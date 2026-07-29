/**
 * Prevent generated credentials from being stored by browsers or intermediaries.
 * Use only for responses that intentionally contain a one-time secret.
 */
export const SENSITIVE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;
