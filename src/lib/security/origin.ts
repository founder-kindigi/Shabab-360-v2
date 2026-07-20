/**
 * Accept only browser mutations originating from the current deployment host.
 * Request URLs keep preview deployments isolated without a hard-coded origin list.
 */
export function isSameOriginRequest(request: Request): boolean {
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;

  try {
    return new URL(source).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
