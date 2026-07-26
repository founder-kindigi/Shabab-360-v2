# SEC-008: CSRF Enforcement Audit

- **Document Version:** 2.0.0
- **Task ID:** `SEC-008-CSRF-ENFORCEMENT-AUDIT`
- **Complexity:** C2
- **Status:** `COMPLETE` — Evidence-based audit (no code, middleware, route, schema, or data changes)
- **Base:** `159ba85` (`origin/codex/production-hardening`)
- **Release Candidate:** `343491e` (`codex/release-candidate-security`)
- **Objective:** Audit CSRF protection for every cookie-authenticated mutation route.

---

## 1. Auth/Session Flow

| Property | Value |
|----------|-------|
| Provider | `CredentialsProvider` (email/password) — no OAuth/SAML |
| Session strategy | JWT only |
| Session max age | 24 hours |
| Rate limiting | In-memory `Map`, 5 attempts per 15 min |
| Token invalidation | `tokenVersion` checked on every JWT refresh |

Session augmentation: `id`, `email`, `role`, `mustResetPwd`, `tokenVersion`, `assignedCityId`, `assignedParkId`, `assignedGroupId`.

The app uses `CredentialsProvider` with `redirect: false` from the client, so NextAuth's built-in form CSRF token is never validated (by design — the session is obtained through credentials, not a form POST).

---

## 2. CSRF Enforcement — src/proxy.ts (ACTIVE)

### 2.1 Next.js 16 Convention

`src/proxy.ts` is **not dead code**. Next.js 16 replaces `middleware.ts` with a named `proxy` export inside `src/proxy.ts`. The `export function proxy` and `export const config = { matcher: ["/api/:path*"] }` follow the correct Next.js 16 pattern and are automatically invoked by the runtime.

**File:** `src/proxy.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/security/origin";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApplicationApi = pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/");

  if (isApplicationApi && MUTATING_METHODS.has(request.method) && !isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
```

### 2.2 What It Protects

| Dimension | Scope |
|-----------|-------|
| Methods | `POST`, `PUT`, `PATCH`, `DELETE` |
| Paths | All `/api/*` EXCEPT `/api/auth/*` |
| Check | `isSameOriginRequest` — reads `Origin` header (falls back to `Referer`), compares against request URL's origin |
| Fail-closed | Missing or unparseable header → `false` → 403 |

**All 82 application mutation routes are covered by this proxy.** There is no gap for cookie-authenticated non-auth mutations.

### 2.3 What Is Exempt (By Design)

| Path pattern | Reason |
|-------------|--------|
| `/api/auth/*` | NextAuth internal endpoints (signin, callback, session, signout, csrf). The sole custom auth mutation (`reset-password`) has its own `isSameOriginRequest` check. |

### 2.4 `isSameOriginRequest` — Origin/Referer Check

**File:** `src/lib/security/origin.ts`

- Reads `Origin` header (preferred) or falls back to `Referer`
- Returns `false` if either header is missing or fails to parse
- Rejects subdomains, different ports, different protocols, malformed URLs
- Unit tests at `src/lib/security/origin.test.ts` cover all cases

### 2.5 Security Headers (Defense in Depth)

| Header | Value | CSRF relevance |
|--------|-------|----------------|
| `Content-Security-Policy` | `form-action 'self'` | Prevents form submissions to external origins |
| `X-Frame-Options` | `DENY` | Prevents clickjacking (CSRF delivery vector) |
| `frame-ancestors` | `none` | Same as X-Frame-Options |

---

## 3. Regression Coverage

**File:** `src/proxy.test.ts` (release candidate `codex/release-candidate-security`)

5 tests covering the complete enforcement surface:

| # | Test | Scenario | Expected |
|---|------|----------|----------|
| 1 | Cross-origin mutation | `POST /api/admin/cities` with `Origin: https://attacker.example` | **403** |
| 2 | Missing origin evidence | `DELETE /api/admin/cities` with no Origin/Referer | **403** |
| 3 | Same-origin mutation allowed | `PATCH /api/admin/cities` with `Origin: https://pilot.shabab360.pk` | `x-middleware-next: 1` |
| 4 | Safe reads pass through | `GET /api/admin/cities` with no Origin | `x-middleware-next: 1` |
| 5 | Auth endpoints exempt | `POST /api/auth/reset-password` with cross-origin Origin | `x-middleware-next: 1` (passed through to route's own check) |

All 17 security tests, lint, and TypeScript pass at `343491e`.

---

## 4. Route Inventory Summary

### 4.1 Protected by Proxy (82 routes)

All non-auth `/api/*` routes handling `POST`, `PUT`, `PATCH`, or `DELETE`. Full inventory in the original v1 appendix — every route in that list is intercepted by `src/proxy.ts` before the handler runs.

### 4.2 Also Has Per-Route Check (1 route)

| Route | File | Check |
|-------|------|-------|
| `POST /api/auth/reset-password` | `src/app/api/auth/reset-password/route.ts` | `isSameOriginRequest(request)` — redundant with proxy but explicit |

### 4.3 Exempt (By Design — Not CSRF-Applicable)

| Route group | Reason |
|-------------|--------|
| `/api/auth/[...nextauth]` | NextAuth built-in endpoints |
| All GET/HEAD/OPTIONS routes (~49) | Safe methods — no CSRF risk |

### 4.4 Content-Type / Safe-Method Bypass Analysis

Not applicable — the proxy intercepts at the request level before any content-type parsing. It checks method and origin, not body format. A `text/plain` CSRF payload would be rejected by the same `isSameOriginRequest` check.

---

## 5. Findings

### 5.1 P0/P1: None

All 82 cookie-authenticated mutation routes are protected by the `src/proxy.ts` origin check. The route-level gap identified in v1 was based on an incorrect assumption that `proxy.ts` was dead code under the `middleware.ts` convention. Under Next.js 16's `src/proxy.ts` convention, it is active.

### 5.2 P2: Hardening Opportunities

| Gap | Severity | Recommendation |
|-----|----------|---------------|
| No explicit regression test committed at base `159ba85` | P2 | The test exists at `codex/release-candidate-security` (`343491e`). Consider backporting to `main`. |
| `isSameOriginRequest` relies on `Origin`/`Referer` headers — some privacy tools strip `Referer` | P2 | Acceptable for this application tier. The `Origin` header is always present on cross-origin `fetch`/`XHR` requests, which is the primary CSRF vector for an SPA. |
| No second independent CSRF layer (double-submit cookie) | P2 | Not required for the audited scope — origin check is standard for SPA + API architectures and widely adopted (GitHub API, Stripe, etc.). A double-submit cookie would add defense-in-depth but is not warranted given: (1) CSP `form-action 'self'` prevents form-based CSRF; (2) `frame-ancestors 'none'` prevents clickjacking; (3) the origin check blocks all cross-origin mutations. |
| CSP `script-src 'unsafe-inline'` | P2 | Standard for Next.js apps. If nonce-based CSP is desired, it requires server-side rendering changes. |

### 5.3 Intentionally Unchanged

| Aspect | Reason |
|--------|--------|
| No CORS configuration | Same-origin SPA — no cross-origin API consumers. If needed in future, must not bypass the proxy. |
| No API key / bearer token for non-browser clients | Not in scope. Non-browser callers would need separate auth that doesn't rely on cookies. |
| No changes to `src/proxy.ts` or `isSameOriginRequest` | Correct as-is. The proxy is fail-closed, excludes only auth paths, and the origin check is tested. |

---

## 6. Test Contract

### 6.1 Existing Regression Tests

All 5 tests in `src/proxy.test.ts` pass (verified at `343491e`).

### 6.2 Recommended Additions (If Backporting to Main)

| ID | Scenario | Expected |
|----|----------|----------|
| CSRF-REG-001 | Same-origin `PUT` with valid Origin | `x-middleware-next: 1` |
| CSRF-REG-002 | Same-origin `DELETE` with valid Origin | `x-middleware-next: 1` |
| CSRF-REG-003 | Cross-origin `PUT` with Origin subdomain prefix | 403 |
| CSRF-REG-004 | `POST` to `/api/auth/session` from attacker origin | `x-middleware-next: 1` (exempt) |
| CSRF-REG-005 | `OPTIONS` preflight passes through | `x-middleware-next: 1` |

---

## 7. Conclusion

**CSRF protection for all cookie-authenticated mutation routes is fully enforced.** The `isSameOriginRequest` check in `src/proxy.ts` applies a fail-closed origin/referer validation on every non-auth `POST`, `PUT`, `PATCH`, and `DELETE` request. The sole custom auth mutation (`reset-password`) has a redundant per-route origin check. Five dedicated regression tests confirm correct behavior for cross-origin denial, missing-origin denial, same-origin success, safe-read pass-through, and auth-endpoint exemption.

No additional CSRF layer (double-submit cookie, CSRF token) is required for the audited scope. The existing enforcement is standard for SPA + cookie-authenticated API architectures and matches widely adopted patterns (GitHub API, Stripe, etc.).

---

*End of SEC-008-CSRF-ENFORCEMENT-AUDIT.md*
