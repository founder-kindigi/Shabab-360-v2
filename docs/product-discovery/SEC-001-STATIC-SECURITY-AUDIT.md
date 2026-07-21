# SEC-001: Static Security Audit — API Routes, Auth, and Data Handling

**Task:** SEC-001
**Owner:** DeepSeek
**Status:** Revised — pending Codex review
**Created:** 2026-07-21
**Revised:** 2026-07-21
**Scope:** Static source-code review of authentication, authorization, input
validation, error handling, file upload, session management, scope enforcement,
and rate limiting. Findings only; no code, schema, migration, test, deployment,
or data changes.

**Threat model:** The application runs on Vercel Hobby with NextAuth, Prisma,
and Supabase PostgreSQL. Routes fall into four tiers:
- **Admin tier** (`/api/admin/*`) — authenticated staff, capability-gated,
  resource-scoped. Leaked data affects operational records across cities.
- **Park tier** (`/api/park/*`) — authenticated park staff, capability-gated,
  scope derived from JWT StaffMeta claims. Leaked data affects park-scoped
  participant, guardian, and attendance records.
- **Upload tier** (`/api/upload/*`) — authenticated users only, no capability
  gates. Data written to public filesystem on disk.
- **Import tier** (`/api/admin/import/*`) — authenticated admin, executes bulk
  writes from CSV. Errors may leak DB internals.

---

## P0 — Critical

### P0-1: Document upload POST, GET, and DELETE lack entity authorization and filesystem-path allowlisting

**File:** `src/app/api/upload/document/route.ts`
- POST: lines 42-57 (`requireAuth()` only; `entityType`, `entityId` from
  `formData` without allowlist validation)
- GET: lines 162-183 (same pattern)
- DELETE: lines 186-219 (same pattern)

**Current behaviour:** All three handlers call `requireAuth()` only. No
entity-ownership check, capability check, or role restriction. The
`entityType`, `entityId`, and `fileName` parameters are used directly to build
filesystem paths without an allowlist:

```typescript
// Line 108 — entityType goes directly into the path
const uploadDir = join(process.cwd(), "public", "uploads", "documents", entityType);

// Line 115 — filePath built from uploadDir + filename
const filePath = join(uploadDir, filename);

// DELETE — Lines 205-207
const dirPath = join(process.cwd(), "public", "uploads", "documents", entityType);
const filePath = join(dirPath, fileName);
```

`entityType` is not validated against an allowlist of known types (e.g.
`"admission"`, `"participant"`, `"announcement"`). `fileName` on DELETE is
accepted from query params without checking file ownership.

**Exploit scenario:** An authenticated guardian:
1. Calls `GET /api/upload/document?entityType=admission&entityId=other-id`
   to read another applicant's document metadata.
2. Calls `DELETE /api/upload/document?entityType=admission&entityId=other-id
   &fileName=doc-123.pdf` to delete that file.
3. If `entityType` is not allowlisted, `mkdir({ recursive: true })` on the
   constructed path creates unexpected directories under `public/uploads/`.

**Fix:**
1. Validate `entityType` against an allowlist before building paths.
2. Add `requireCapability` gates to POST, GET, DELETE.
3. Verify entity ownership against the requesting user's scope.
4. Validate `fileName` against `^[a-zA-Z0-9_-]+\.[a-z]+$`.
5. Record all mutations in the audit log.

**Test:** Authenticate as a guardian, GET documents for another user's
admission. Verify 403. DELETE with arbitrary `fileName`. Verify 403. POST with
`entityType=../../unexpected`. Verify 400.

---

## P1 — High

### P1-1: Seven attendance mutation routes use manual `req.json()` validation — no Zod schema

**Files:**
- `src/app/api/park/attendance/route.ts` — POST, line 182: manual
  `typeof groupId !== "string"` checks
- `src/app/api/park/attendance/events/route.ts` — POST, line 16: same pattern
- `src/app/api/park/attendance/[eventId]/route.ts` — POST, line 147: manual
  `if (!participantId || !status)`
- `src/app/api/park/attendance/sync/route.ts` — POST, line 54: custom
  `parseMutation()` instead of Zod
- `src/app/api/park/attendance/check-alerts/route.ts` — POST, line 13: manual
  `typeof body.participantId === "string"`
- `src/app/api/park/attendance/[eventId]/close/route.ts` — PATCH, line 20:
  manual `reason` check
- `src/app/api/park/attendance/[eventId]/records/[recordId]/route.ts` — PATCH,
  line 32: manual `if (!status || !isAttendanceStatus(status))`

**Impact:** No Zod schema means field types, bounds, and extra fields are not
validated consistently. While all routes destructure specific fields (limiting
pass-through risk), the pattern invites future bugs where a body field is
spread directly into a Prisma write. The sync route's custom `parseMutation`
lacks Zod's type-coercion safety and error reporting.

**Fix:** Define Zod schemas for each mutation payload using `.safeParse()`.
For sync: `z.array(z.object({...})).min(1).max(50)`.

**Test:** Submit each endpoint with empty body, missing fields, extra fields,
type-mismatched values. Verify 400 with field-level errors.

---

### P1-2: File upload routes validate MIME type only — no content verification

**Files:**
- `src/app/api/upload/document/route.ts` — line 78: `ALLOWED_TYPES.includes(file.type)`
- `src/app/api/upload/avatar/route.ts` — line 31: `ALLOWED_TYPES.includes(file.type)`

**Impact:** The browser-provided `file.type` MIME type is trivially spoofable.
An attacker can upload a malicious executable with spoofed MIME
`application/pdf`. The file lands in `/public/uploads/` and is served as a
static asset — any visitor who opens the URL risks executing untrusted content.

**Fix:** Verify magic-byte/header signatures for each allowed type:
- PDF: `%PDF` at offset 0
- DOC/DOCX: ZIP header `PK\u0003\u0004`
- JPEG: `\u00FF\u00D8\u00FF`
- PNG: `\u0089PNG`
- WebP: `RIFF` + `WEBP`

Or use a library like `file-type` to read content-type from the buffer before
writing.

**Test:** Upload `.exe` with MIME spoofed to `application/pdf`. Verify 400.
Upload legitimate PDF. Verify 200.

---

### P1-3: CSV import routes have no file size limit — OOM denial-of-service

**Files:**
- `src/app/api/admin/import/participants/route.ts` — line 27
- `src/app/api/admin/import/guardians/route.ts` — line 22
- `src/app/api/admin/import/users/route.ts` — line 37

**Impact:** All three routes load the entire CSV into memory with
`file.text()` with no size check. A large CSV (hundreds of MB) exhausts the
Node.js heap on Vercel Hobby (constrained memory). An authenticated admin can
trigger this.

**Fix:** Check `file.size` before reading. Reject files over 5 MB. Return 413.

**Test:** Upload a 50 MB CSV. Verify 413. Upload a 100 KB CSV. Verify 200.

---

### P1-4: In-memory login rate limiter does not scale across serverless instances

**File:** `src/lib/auth.ts` — module-level `Map<string, { count: number;
resetAt: number }>()`

**Impact:** In Vercel's serverless environment, each invocation may run on a
separate instance. The rate-limit map is per-instance, so an attacker can make
5 attempts against N instances, multiplying the allowed window. Pragmatic on
Hobby plan but not a robust defence.

**Fix:** Move to a database-backed approach with TTL index or shared cache
(Vercel KV). Add account-level lockout stored on the user record.

**Test:** Make repeated login attempts across simulated instances. Verify
blocked after N total attempts. Verify legitimate login after cooldown.

---

## P2 — Medium

### P2-1: Import and attendance-sync routes leak `error.message` to authenticated clients

**Files:**
- `src/app/api/admin/import/participants/route.ts` — lines 281, 293:
  `error instanceof Error ? error.message : "Unknown error"` returned to client
- `src/app/api/admin/import/guardians/route.ts` — lines 126, 138: same
- `src/app/api/admin/import/users/route.ts` — lines 237, 241: same
- `src/app/api/park/attendance/sync/route.ts` — line 155: per-mutation
  `error.message` in result array

**Impact:** An authenticated admin making a malformed import request sees
internal schema details (table names, column constraints, FK relationships) in
error messages. Not unauthenticated disclosure — the routes require auth — but
it aids an attacker with admin access. The sync route shares per-mutation
errors with the mobile client.

**Fix:** Replace `error.message` with a generic sanitized message in all five
locations. Log full errors server-side. Return aggregated sanitized per-row
errors for imports.

**Test:** Submit a CSV with a deliberately invalid value triggering a DB
constraint violation. Verify the response contains no internal details.

---

### P2-2: `USER_OVERRIDE_CAPABILITIES` allowlist not enforced in resolver (defence-in-depth)

**File:** `src/lib/auth/capabilities.ts` — line 160 (`resolveEffectiveCapability`)

**Current behaviour:** The API input is correctly validated — the override
route (`src/app/api/admin/access/users/[id]/overrides/route.ts`, line 9) uses
`z.enum(USER_OVERRIDE_CAPABILITIES)`. The resolver `resolveEffectiveCapability`
(line 160) does not re-validate:

```typescript
if (userOverride && isActiveUserCapabilityOverride(userOverride, now)) {
  return userOverride.effect === "allow";
}
```

A direct DB insert bypassing the API could grant capabilities outside the
allowlist.

**Impact:** Low under normal operation — the API gate is effective. If a future
code path writes overrides without the Zod restriction, the allowlist is
bypassed. Defence-in-depth only.

**Fix:** Add allowlist check inside `resolveEffectiveCapability`:

```typescript
if (!(USER_OVERRIDE_CAPABILITIES as readonly string[]).includes(userOverride.capability)) {
  return false;
}
```

**Test:** Insert a user override for `audit.view` via direct DB write. Call
`userHasCapability()`. Verify `false`. Verify valid overrides still resolve
correctly.

---

### P2-3: Repeated `getServerSession` calls per request (style/maintainability)

**Files:** Multiple routes — e.g. `src/app/api/admin/parks/[id]/route.ts`

**Current behaviour:** Several handlers call `requireRole()` then
`requireAuth()` then `requireCapability()` — each triggers
`getServerSession(authOptions)` independently. All three calls pass or fail on
the same JWT; no demonstrated TOCTOU exploitation path.

**Impact:** Negligible for security. Code style and minor performance concern.

**Fix:** Consolidate into a single `requireAuth()` at the top of each handler,
then use synchronous scope/capability helpers.

**Test:** Code review only.

---

### P2-4: No `isActive` check in JWT callback (defence-in-depth)

**File:** `src/lib/auth.ts` — line 176:
`if (dbUser && token.tokenVersion !== dbUser.tokenVersion)`

**Current behaviour:** The deactivation handler
(`src/app/api/admin/users/[id]/route.ts`, line 316) sets `isActive: false` and
increments `tokenVersion` atomically within a transaction. All deactivations
invalidate sessions via the version check. The missing `isActive` check is
redundant under current code.

**Impact:** None currently. Worth adding as defence-in-depth if a future code
path deactivates without bumping the version.

**Fix:** Add `|| !dbUser.isActive`:
```typescript
if (dbUser && (token.tokenVersion !== dbUser.tokenVersion || !dbUser.isActive)) {
  return {};
}
```

**Test:** Deactivate a user. Verify the next authenticated request returns 401.

---

### P2-5: Mixed return-type convention in auth helpers

**File:** `src/lib/auth/authorize.ts`

**Current behaviour:**
- `requireCityScope()`, `requireParkScope()`, `requireGroupScope()` return
  `boolean`
- `requireResourceScope()` returns `NextResponse | null`
- `requireAuth()`, `requireCapability()` return `{ user } | NextResponse`

**Impact:** A developer who treats boolean helpers like guard helpers may skip
the `if (!result) return 403` check, bypassing scope verification. Code-review
risk, not an active vulnerability.

**Fix:** Standardise all scope helpers to return `NextResponse | null`.

**Test:** Code review only.

---

## P3 — Low

### P3-1: `requireRole` casts `user.role` without runtime validation

**File:** `src/lib/auth/authorize.ts` line 37:
`if (!user.role || !roles.includes(user.role as UserRole))`

**Impact:** A malformed role passes the `includes` check only if it matches a
valid role name. The cast is technically safe because `UserRole` is a typed
string union, but omits defensive validation.

**Fix:** Use `isUserRole(user.role)` before the cast.

---

### P3-2: CSV import rows lack full Zod schemas

**Files:**
- `src/app/api/admin/import/participants/route.ts` — profile fields use Zod,
  main rows manual
- `src/app/api/admin/import/guardians/route.ts` — no Zod for rows
- `src/app/api/admin/import/users/route.ts` — no Zod for rows

**Impact:** Malformed CSV rows may cause unpredictable partial imports.

**Fix:** Define a Zod schema for each CSV row and validate with `.safeParse()`.

---

## Summary Table

| ID | Severity | Finding | File(s) | Exploitable? |
|----|----------|---------|---------|-------------|
| P0-1 | **Critical** | Document POST/GET/DELETE: no entity auth, no path allowlist, no capability gate | `upload/document/route.ts` | Yes — authenticated user can read/delete other entities' documents |
| P1-1 | **High** | 7 attendance routes use manual JSON validation, no Zod | `park/attendance/*/route.ts` | Low — fields destructured, but pattern invites future bugs |
| P1-2 | **High** | File uploads check MIME type only, no magic-byte verification | `upload/document/route.ts`, `upload/avatar/route.ts` | Moderate — spoofed MIME serves arbitrary content from `/public/` |
| P1-3 | **High** | CSV import routes have no file size limit — OOM DoS | `import/*/route.ts` | Yes — authenticated admin can exhaust server memory |
| P1-4 | **High** | In-memory rate limiter not shared across serverless instances | `auth.ts` | Moderate — multiplied attempts across instances on Hobby plan |
| P2-1 | **Medium** | Import + sync routes leak `error.message` to authenticated clients | `import/*/route.ts`, `park/attendance/sync/route.ts` | Moderate — aids schema discovery for authenticated attacker |
| P2-2 | **Medium** | `USER_OVERRIDE_CAPABILITIES` allowlist not enforced in resolver | `capabilities.ts` | Low — API input already validated with `z.enum` |
| P2-3 | **Medium** | Repeated `getServerSession` calls per request (style) | Multiple routes | None |
| P2-4 | **Medium** | No `isActive` check in JWT callback (defence-in-depth) | `auth.ts` | None — `tokenVersion` bump on deactivation covers this |
| P2-5 | **Medium** | Mixed return-type convention in scope helpers | `authorize.ts` | Low — developer error risk during code changes |
| P3-1 | **Low** | `requireRole` casts without runtime role validation | `authorize.ts` | None |
| P3-2 | **Low** | CSV import rows lack full Zod schemas | `import/*/route.ts` | Low — partial manual validation exists |

**Total: 12 findings** — 1 Critical, 4 High, 5 Medium, 2 Low.

### Removed or revised from initial draft

| Original finding | Reason for removal/revision |
|-----------------|----------------------------|
| Deactivated user sessions (was P0-1) | Deactivation endpoint (`users/[id]/route.ts` line 316) increments `tokenVersion` atomically with `isActive = false`. Tests cover it. Removed. |
| Park scope not enforced (was P1-2) | Park routes derive scope from authenticated `StaffMeta` (line 50 of `participants/route.ts`), not from client input. Removed. |
| Avatar capability check (was P1-3) | Self-service avatar upload is intentional, not a missing privileged gate. Retained magic-byte validation as part of P1-2. |
| Repeated session reads TOCTOU (was P1-4) | Not a demonstrated vulnerability. Moved to P2-3 as style concern. |

---

## Checks

```
git diff --check: pass

Branch: agent/deepseek/SEC-001-static-route-audit
Base: codex/production-hardening @ dffd68a
Commit SHA: (pending — existing 6aa9fb4 will be replaced)
Ready for Codex review.
```
