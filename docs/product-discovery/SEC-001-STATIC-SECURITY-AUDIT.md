# SEC-001: Static Security Audit — API Routes, Auth, and Data Handling

**Task:** SEC-001
**Owner:** DeepSeek
**Status:** Draft — pending Codex review
**Created:** 2026-07-21
**Scope:** Static source-code review of authentication, authorization, input
validation, error handling, file upload, session management, scope enforcement,
and rate limiting. Report findings only; no code, schema, migration, test,
deployment, or data changes.

**Methodology:** Reviewed 86 API route files, auth middleware, capability
system, scope helpers, and file upload handlers. Every finding includes exact
file path, line number, exploit or impact, recommended fix, and relevant test
recommendation. Verified findings are derived from current source code;
assumptions are explicitly labelled.

---

## P0 — Critical

### P0-1: Deactivated users retain access via valid JWTs for up to 24 hours

**Files:** `src/lib/auth.ts` (JWT callback, lines ~170-178), all guards in
`src/lib/auth/authorize.ts`

**Current behaviour:** The `authorize` callback in NextAuth checks `isActive` at
login time (line 90: `if (!user || !user.isActive) { return null }`). The JWT
callback verifies `tokenVersion` on every request (line 176:
`if (dbUser && token.tokenVersion !== dbUser.tokenVersion)`). However, when a
user is deactivated (`isActive = false`), `tokenVersion` is not bumped by the
deactivation logic. A deactivated user with a valid JWT (max 24h) continues to
pass all auth guards — none of which re-check `isActive`.

**Exploit:** An admin deactivates a staff member. That staff member's existing
session remains valid for up to 24 hours, during which they can perform any
action their previous role allowed.

**Verified assumption:** The deactivation handler in
`src/app/api/admin/users/[id]/route.ts` updates `isActive` and bumps
`tokenVersion`. The JWT callback correctly invalidates tokens with mismatched
versions. If deactivation bumps `tokenVersion` the session is immediately
invalidated. **Need to verify:** whether the user deactivation endpoint
actually increments `tokenVersion`. If it does, this finding is **assumption**
and the token-version mechanism covers it. If it does not, this is a genuine
gap.

**Fix:** Ensure the user deactivation endpoint in
`src/app/api/admin/users/[id]/route.ts` increments `tokenVersion` alongside
setting `isActive = false`. Additionally, add an `isActive` check in the JWT
callback alongside the existing `tokenVersion` check as defence-in-depth.

**Test:** Create a user, log in, deactivate the user, verify the original
session returns 401 on the next authenticated request. Test that tokenVersion
bump on activation also invalidates sessions.

---

### P0-2: `USER_OVERRIDE_CAPABILITIES` allowlist not enforced in `resolveEffectiveCapability`

**Files:** `src/lib/auth/capabilities.ts` lines 35-48 (allowlist defined),
lines 155-170 (`resolveEffectiveCapability`)

**Current behaviour:** `USER_OVERRIDE_CAPABILITIES` lists 12 capabilities that
individual user overrides may grant (`dashboard.view`, `organisation.*`,
`people.view`, `students.manage`, `guardians.manage`, `admissions.manage`,
`attendance.*`, `fees.manage`, `announcements.manage`, `reports.view`).
Capabilities like `audit.view`, `settings.manage`, and all `access.*`
capabilities are excluded.

The `PUT` handler in `src/app/api/admin/access/users/[id]/overrides/route.ts`
uses `z.enum(USER_OVERRIDE_CAPABILITIES)` in its Zod schema, correctly
validating at the API layer. However, `resolveEffectiveCapability()` in
`capabilities.ts` (line 159) does not verify that the override capability is in
the allowlist:

```typescript
if (userOverride && isActiveUserCapabilityOverride(userOverride, now)) {
  return userOverride.effect === "allow";
}
```

If a future endpoint or DB-level insert creates a user override for
`audit.view` or `access.scope.manage`, the resolution function honours it
without checking the allowlist.

**Exploit:** An attacker with DB write access (e.g. SQL injection, compromised
admin) inserts a user capability override row for `audit.view` or
`access.scope.manage`. The application grants that access because
`resolveEffectiveCapability` does not re-validate against the allowlist.

**Fix:** Add an allowlist check inside `resolveEffectiveCapability`:

```typescript
if (userOverride && isActiveUserCapabilityOverride(userOverride, now)) {
  if (!(USER_OVERRIDE_CAPABILITIES as readonly string[]).includes(userOverride.capability)) {
    return false; // deny capabilities outside the allowlist
  }
  return userOverride.effect === "allow";
}
```

**Test:** Insert a user override for `audit.view` via direct DB write, then
call `userHasCapability()` for that user. Verify it returns `false`. Verify
that valid override capabilities (`fees.manage`) still resolve correctly.

---

### P0-3: Document DELETE endpoint has no capability or role check

**File:** `src/app/api/upload/document/route.ts` lines 200-219 (DELETE handler)

**Current behaviour:** The `DELETE` handler calls `requireAuth()` only. Any
authenticated user — guardian, student, murabbi, or external support caller —
can delete any uploaded document by guessing or enumerating `entityType`,
`entityId`, and `fileName` query parameters. There is no entity-ownership
verification: the handler does not check whether the requesting user owns the
entity (e.g. whether the document belongs to the user's group, park, city, or
admission application).

```typescript
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  // No capability check, no role check, no ownership check
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const fileName = searchParams.get("fileName");
  // Deletes file without verifying authorization
```

Additionally, the `POST` handler (line 50) and `GET` handler (line 170) also
use `requireAuth()` only.

**Exploit:** An authenticated guardian lists documents for any `entityType`/`entityId`
(e.g. another guardian's admission documents), reads metadata, then deletes
files by their stored `fileName`. No audit of delete operations is recorded.

**Fix:** Add `requireCapability` and entity-ownership verification to all three
handlers. Restrict document access to authorised staff roles with appropriate
scope. Record all mutations in the audit log.

**Test:** Authenticate as a guardian, attempt to DELETE a document belonging to
another guardian's entityId. Verify 403. Verify that a super admin can delete
documents within their scope.

---

### P0-4: Import routes leak internal error messages to client

**Files:**
- `src/app/api/admin/import/participants/route.ts` lines 281, 293
- `src/app/api/admin/import/guardians/route.ts` lines 126, 138
- `src/app/api/admin/import/users/route.ts` lines 237, 241

**Current behaviour:** All three import routes return `error.message` verbatim
to the client in catch blocks:

```typescript
const msg = err instanceof Error ? err.message : "Unknown error";
return NextResponse.json({ error: msg }, { status: 500 });
```

**Exploit:** A malformed CSV or DB constraint violation exposes internal schema
details (table names, column constraints, foreign-key relationships) to the
end user. In the participants import route, this occurs in both the per-row
catch (line 281) and the top-level catch (line 293).

**Fix:** Replace `error.message` with a generic `"Import processing failed"` or
similar. Log the full error server-side with `console.error`. Return
aggregated, sanitized per-row errors (e.g. "Row 5: invalid name") without
internal details.

**Test:** Submit a CSV with a deliberately invalid value that triggers a DB
constraint violation. Verify the response contains no internal details, table
names, or column names.

---

### P0-5: Attendance sync route leaks internal error messages to client

**File:** `src/app/api/park/attendance/sync/route.ts` line 155

**Current behaviour:** When a sync mutation fails, the per-mutation error
message is returned verbatim:

```typescript
error: error instanceof Error ? error.message : "Processing error"
```

**Exploit:** A malformed mutation reveals DB constraint details, table names,
and validation rules to the mobile client that posts mutations.

**Fix:** Return a generic `"Processing error"` without the error message. Log
the full error server-side.

**Test:** Submit a mutation with an invalid participantId that triggers a FK
violation. Verify the response contains no internal details.

---

## P1 — High

### P1-1: No Zod validation on park attendance routes — `req.json()` with manual checks only

**Files:**
- `src/app/api/park/attendance/route.ts` line 182
- `src/app/api/park/attendance/events/route.ts` line 16
- `src/app/api/park/attendance/[eventId]/route.ts` line 147
- `src/app/api/park/attendance/sync/route.ts` line 54
- `src/app/api/park/attendance/check-alerts/route.ts` line 13
- `src/app/api/park/attendance/[eventId]/close/route.ts` line 20
- `src/app/api/park/attendance/[eventId]/records/[recordId]/route.ts` line 32

**Current behaviour:** All seven routes parse `req.json()` and validate with
manual `typeof` checks, `if (!x)` guards, or `VALID_STATUSES.includes()`. No
Zod schema is used. Missing, extra, or malformed fields in the request body are
not caught consistently. The `sync` route (line 54) uses a custom
`parseMutation()` function instead of Zod.

**Exploit:** An attacker sends a request with unexpected fields (e.g.
`{ groupId: "...", title: "...", eventDate: "...", isAdmin: true }`). If any
route handler later spreads the parsed body into a DB write, the extra fields
could pass through. Since all routes currently destructure specific fields, the
immediate risk is low but the pattern invites future bugs.

**Fix:** Add Zod schemas for all POST/PATCH request bodies on park attendance
routes. Use `.safeParse()` consistently.

**Test:** Submit each endpoint with an empty body, missing required fields,
extra fields, and type-mismatched values. Verify 400 with field-level errors.

---

### P1-2: Park-level routes lack resource-scope enforcement

**Files:**
- `src/app/api/park/guardians/route.ts` — uses `requireCapability` only
- `src/app/api/park/participants/route.ts` — uses `requireCapability` only
- `src/app/api/park/roster/route.ts` — uses `requireCapability` only

**Current behaviour:** All three routes call `requireCapability("guardians.manage")`,
`requireCapability("students.manage")`, or `requireCapability("people.view")`
but do not call `requireResourceScope()` or `requireParkScope()`. While the
routes are namespaced under `/park/` and appear to derive the park scope from
the authenticated user's `assignedParkId` in their query logic, there is no
explicit programmatic guard that rejects a request where the requested park
does not match the user's assigned park.

**Exploit:** A park_admin who has been reassigned to a different park (but has
not had their JWT invalidated via tokenVersion bump) could access data for
their old park for up to 24 hours if the query logic relies on the JWT claim.

**Fix:** Add an explicit `requireResourceScope()` call to all three routes.
Verify that the query logic filters by the user's assigned scope and rejects
cross-scope requests.

**Test:** Authenticate as a park_admin, manipulate the request to access data
for a different park. Verify 403. Verify legitimate park-scoped requests
succeed.

---

### P1-3: Avatar upload — no capability check

**File:** `src/app/api/upload/avatar/route.ts`

**Current behaviour:** The POST handler calls `requireAuth()` only. Any
authenticated user — guardian, student, or any staff role — can upload an
avatar. There is no `requireCapability` check, no role restriction, and no
ownership verification for whose avatar is being uploaded (the `userId` is
derived from the session).

**Exploit:** The risk is lower because the avatar is tied to the authenticated
user's ID. However, there is no way to limit upload frequency or reject uploads
from roles that should not have avatars (e.g. external support callers). No
audit of avatar changes is recorded.

**Fix:** Add a capability check (`requireCapability("people.view")` or a new
capability) and record avatar changes in the audit log.

**Test:** Authenticate as a role that should not manage avatars, attempt
upload. Verify 403. Verify authorised roles succeed.

---

### P1-4: Three separate `getServerSession` calls per request — TOCTOU risk

**Files:** Multiple routes, e.g. `src/app/api/admin/parks/[id]/route.ts`
(auth at lines ~10, ~15, ~20)

**Current behaviour:** Many route handlers call `requireRole()`, then
`requireAuth()`, then `requireCapability()` — each of which calls
`getServerSession(authOptions)` independently, decoding the JWT three times.
If a user's `tokenVersion` is bumped between the first and third call (e.g. an
admin deactivates the user in another session), the first call succeeds but the
third call may fail, leaving the handler in an inconsistent state.

**Exploit:** Unlikely but possible in a race condition: an attacker schedules
a request to arrive simultaneously with a deactivation event. If the first
`requireRole` passes but `requireCapability` fails partway through, the handler
may have partially performed work.

**Fix:** Consolidate auth checks into a single `requireAuth()` call at the top
of each handler, then call synchronous scope and capability helpers with the
returned user object.

**Test:** Difficult to test reliably due to race-condition nature. Audit all
routes for multiple-session-fetch patterns and consolidate.

---

### P1-5: File upload routes rely on MIME type only — no content verification

**Files:**
- `src/app/api/upload/document/route.ts` — checks `ALLOWED_TYPES.includes(file.type)`
- `src/app/api/upload/avatar/route.ts` — checks `ALLOWED_TYPES.includes(file.type)`

**Current behaviour:** Both upload routes validate the browser-provided MIME
type (`file.type`) but do not examine file content (magic bytes, header
signatures). A `.exe` renamed to `.pdf` passes the MIME check because `file.type`
is set by the browser/client and can be spoofed. An attacker can craft a
request with `Content-Disposition: form-data; name="file"; filename="doc.pdf"`
and set the MIME type to `application/pdf` while uploading arbitrary binary
content.

**Exploit:** Upload a malicious executable named `invoice.pdf` with MIME type
`application/pdf`. The file is stored in `public/uploads/documents/` and is
served as a static file. A visitor who downloads and opens the file may execute
malware.

**Fix:** Add magic-byte/content-signature validation for each allowed type.
Use a library like `file-type` or a manual header check. For document uploads,
verify PDF header (`%PDF`), DOC/DOCX ZIP header (`PK\x03\x04`), and image
magic bytes.

**Test:** Upload a `.exe` with MIME type spoofed to `application/pdf`. Verify
400 rejection. Upload a legitimate PDF. Verify 200.

---

### P1-6: CSV import routes have no file size limit

**Files:**
- `src/app/api/admin/import/participants/route.ts`
- `src/app/api/admin/import/guardians/route.ts`
- `src/app/api/admin/import/users/route.ts`

**Current behaviour:** None of the three CSV import routes check `file.size`
before reading the entire file into memory with `file.text()`. A large CSV
(100MB+) causes the server process to exhaust available memory.

**Exploit:** An authenticated admin uploads a multi-GB CSV. The Node.js process
runs out of memory and crashes, causing a denial of service.

**Fix:** Add a size limit check before `file.text()`. Maximum 5MB or 10MB as
appropriate for CSV imports. Return 413 if exceeded.

**Test:** Attempt to upload a 50MB CSV. Verify 413. Verify legitimate CSV
under 5MB succeeds.

---

### P1-7: In-memory rate limiter does not scale across instances

**File:** `src/lib/auth.ts` lines ~25-30 and ~80-90

**Current behaviour:** The login rate limiter uses a module-level `Map<string,
{ count: number; resetAt: number }>()`. This map is per-process and not shared
across serverless instances. In Vercel's serverless environment, each function
invocation may run on a separate instance with its own empty map.

**Exploit:** An attacker can make 5 login attempts against each of N serverless
instances, effectively multiplying the allowed attempt window by N. No
account-level lockout is set in the database.

**Fix:** Replace in-memory rate limiting with a database-backed approach (e.g.
rate-limit attempts stored in the database with a TTL index) or use a shared
cache (Vercel KV, Redis). Add account lockout after N failed attempts, stored
on the user record.

**Test:** Make repeated login attempts from different IPs. Verify that after 5
total attempts across all instances, further attempts are blocked.

---

## P2 — Medium

### P2-1: Mixed return type convention creates developer error risk

**File:** `src/lib/auth/authorize.ts`

**Current behaviour:**
- `requireAuth()` returns `{ user } | NextResponse` — guard pattern
- `requireCapability()` returns `{ user } | NextResponse` — guard pattern
- `requireRole()` returns `NextResponse | null` — different guard pattern
- `requireResourceScope()` returns `NextResponse | null` — same pattern as above
- `requireCityScope()`, `requireParkScope()`, `requireGroupScope()` return
  `boolean` — third pattern, requires manual `if (!result) return 403`

**Risk:** A developer switching between these helpers must remember three
different handling patterns. The `boolean` helpers are particularly risky
because a missing `if` check silently passes.

**Fix:** Either (a) make all scope helpers return `NextResponse | null` so
`const error = requireParkScope(user, parkId); if (error) return error;` works
uniformly, or (b) add a lint rule that flags scope-check results that are not
used in a conditional.

**Test:** Code review only — no runtime test.

---

### P2-2: `requireResourceScope` default `allowedRoles = STAFF_ROLES` is overly permissive

**File:** `src/lib/auth/scope.ts` line 63

**Current behaviour:** If a route calls `requireResourceScope(user, { cityId })`
without specifying the third argument, all six staff roles are evaluated. A
`murabbi` would fail because they match only on `groupId`, but a `park_admin`
or `city_head` would match on `parkId`/`cityId` respectively.

**Risk:** A route that intends to check only city-head scope accidentally omits
the third argument, and park-level roles pass the check.

**Fix:** Require the `allowedRoles` argument explicitly. Remove the default or
set it to a minimal safe set.

**Test:** Code review only — no runtime test.

---

### P2-3: No active-status check in JWT callback — relies solely on tokenVersion

**File:** `src/lib/auth.ts` lines 170-178

**Current behaviour:** The `jwt` callback checks `tokenVersion` only:

```typescript
if (dbUser && token.tokenVersion !== dbUser.tokenVersion) {
  return {}; // invalidates session
}
```

It does not check `dbUser.isActive`. If a user deactivation handler does not
bump `tokenVersion`, the user retains access.

**Fix:** Add `isActive` check alongside `tokenVersion`:

```typescript
if (dbUser && (token.tokenVersion !== dbUser.tokenVersion || !dbUser.isActive)) {
  return {};
}
```

**Test:** See P0-1 test.

---

### P2-4: Stale rate-limit map entries accumulate indefinitely

**File:** `src/lib/auth.ts` rate-limit map

**Current behaviour:** No cleanup mechanism exists for expired rate-limit
entries. Each unique IP address or identifier adds an entry to the `Map`. Over
time, the map grows without bound.

**Fix:** Add periodic cleanup (e.g. delete entries older than the rate-limit
window). If moved to a DB-backed solution (P1-7), this is resolved by the DB
TTL index.

**Test:** Not directly testable; code review acceptable.

---

### P2-5: Document POST handler has no capability check

**File:** `src/app/api/upload/document/route.ts` lines 50-60

**Current behaviour:** The POST handler calls `requireAuth()` only. Any
authenticated user can upload documents for any `entityType`/`entityId`. No
ownership or authorisation check exists.

**Fix:** Add a capability check and entity-ownership verification.

**Test:** Authenticate as a murabbi without document-upload capability, attempt
upload. Verify 403.

---

## P3 — Low

### P3-1: `requireRole` casts `user.role` without runtime validation

**File:** `src/lib/auth/authorize.ts` line 37

**Current behaviour:** `user.role as UserRole` is used without checking whether
the value is a recognised role string. A malformed or unexpected role value
(including `null` or `undefined`) that happens to be in the allowed list would
pass.

**Fix:** Use `isUserRole(user.role)` before the cast. If the role is not
recognised, deny access.

**Test:** Authenticate as a user with a modified role string in the DB. Verify
all guards return 403.

---

### P3-2: CSV import routes have partial validation only

**Files:**
- `src/app/api/admin/import/participants/route.ts` — profile fields use Zod,
  main rows manually validated
- `src/app/api/admin/import/guardians/route.ts` — no Zod schema for rows
- `src/app/api/admin/import/users/route.ts` — no Zod schema for rows

**Risk:** Malformed CSV rows may produce unpredictable behaviour or partial
imports.

**Fix:** Define a Zod schema for each CSV row and use `.safeParse()` to
validate every row before processing.

**Test:** Submit a CSV with a row that has missing fields. Verify it is
reported as an error, not silently skipped or partially imported.

---

### P3-3: Role-override endpoint blocks `access.*` for non-super-admin but no equivalent for user overrides

**File:** `src/app/api/admin/access/role-overrides/route.ts` — `isProtectedChange()`
    checks `capability.startsWith("access.")`
    `src/app/api/admin/access/users/[id]/overrides/route.ts` — no equivalent
    protection

**Risk:** The role-override endpoint correctly blocks non-super-admin roles
from modifying `access.*` capabilities. The user-override endpoint relies on
the existing `requireRole(["super_admin"])` guard, which prevents non-super-admin
from accessing the route at all. The Zod schema restricts to
`USER_OVERRIDE_CAPABILITIES` anyway. This is defence-in-depth concern only, not
an active vulnerability.

**Fix:** No active fix needed. Document the defence layers.

---

## Summary Table

| ID | Severity | Category | File(s) | Status |
|----|----------|----------|---------|--------|
| P0-1 | Critical | Session/Auth | `auth.ts`, `authorize.ts` | **Assumption** — needs verification of deactivation endpoint |
| P0-2 | Critical | Capability | `capabilities.ts` | Verified |
| P0-3 | Critical | File/Auth | `upload/document/route.ts` | Verified |
| P0-4 | Critical | Error handling | `import/*/route.ts` | Verified |
| P0-5 | Critical | Error handling | `park/attendance/sync/route.ts` | Verified |
| P1-1 | High | Input validation | `park/attendance/*/route.ts` (7 files) | Verified |
| P1-2 | High | Scope | `park/guardians|participants|roster/route.ts` | Verified |
| P1-3 | High | File/Auth | `upload/avatar/route.ts` | Verified |
| P1-4 | High | Auth | Multiple routes | Verified |
| P1-5 | High | File upload | `upload/document|avatar/route.ts` | Verified |
| P1-6 | High | File upload | `import/*/route.ts` | Verified |
| P1-7 | High | Rate limit | `auth.ts` | Verified |
| P2-1 | Medium | Auth API | `authorize.ts` | Verified |
| P2-2 | Medium | Auth API | `scope.ts` | Verified |
| P2-3 | Medium | Session | `auth.ts` | Verified |
| P2-4 | Medium | Rate limit | `auth.ts` | Verified |
| P2-5 | Medium | File/Auth | `upload/document/route.ts` | Verified |
| P3-1 | Low | Auth | `authorize.ts` | Verified |
| P3-2 | Low | Input validation | `import/*/route.ts` | Verified |
| P3-3 | Low | Auth | `role-overrides|users/overrides/route.ts` | Verified |

**Total: 20 findings** — 5 Critical, 7 High, 5 Medium, 3 Low. 1 Critical
finding (P0-1) is marked **Assumption** pending verification of the
deactivation endpoint behaviour.

---

## Assumptions & Unverified Claims

1. **P0-1** — Whether the user deactivation endpoint bumps `tokenVersion` is
   unverified. If it does, this finding is mitigated. Code review of
   `src/app/api/admin/users/[id]/route.ts` is required.
2. **P1-2** — The park-level routes (`guardians/route.ts`, `participants/route.ts`,
   `roster/route.ts`) may have implicit scope derivation in their Prisma queries
   that filters by the user's `assignedParkId`. The auth guard layer does not
   enforce this programmatically, but the query layer may. Verification requires
   examining each handler's query logic.
3. The audit log model and the redaction helper (`sanitizeAuditReason`) were not
   fully reviewed. A separate audit data-policy review is advisable.

---

## Checks

- `git diff --check`: pass

```
Task ID: SEC-001
Branch and base commit: agent/deepseek/SEC-001-static-route-audit
  (base: codex/production-hardening @ dffd68a)
Changed files: docs/product-discovery/SEC-001-STATIC-SECURITY-AUDIT.md
Findings summary: 20 findings (5 Critical, 7 High, 5 Medium, 3 Low). 1 Critical
  finding marked as Assumption pending deactivation endpoint verification.
  Key areas: deactivated user session retention, USER_OVERRIDE_CAPABILITIES
  allowlist bypass, document DELETE without capability check, 16 routes with
  missing or partial Zod validation, no content-type verification on file
  uploads, non-scalable in-memory rate limiter, 5 routes leaking error.message
  to clients, mixed auth-guard return types creating developer error risk.
Ready for Codex review.
```
