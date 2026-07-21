# SEC-001: Static Security Audit — API Routes, Auth, and Data Handling

**Task:** SEC-001
**Owner:** DeepSeek
**Status:** Final — pending Codex approval
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

## P1 — High

### P1-0: Document upload POST, GET, and DELETE lack entity authorization and filesystem-path allowlisting

**File:** `src/app/api/upload/document/route.ts`
- POST: lines 42-57 (`requireAuth()` only; `entityType`, `entityId` from
  `formData` without allowlist validation)
- GET: lines 162-183 (same pattern)
- DELETE: lines 186-219 (same pattern)

**Severity rationale:** Serious authenticated integrity/confidentiality
issue requiring a valid session. Not unauthenticated full-system compromise.

**Current behaviour:** All three handlers call `requireAuth()` only. No
entity-ownership check, capability check, or role restriction. The
`entityType`, `entityId`, and `fileName` parameters are used directly to build
filesystem paths without an allowlist:

```
// Line 108 — entityType goes directly into the path
const uploadDir = join(process.cwd(), "public", "uploads", "documents", entityType);
// Line 115 — filePath built from uploadDir + filename
const filePath = join(uploadDir, filename);
// DELETE — Lines 205-207 — same pattern
```

`entityType` is not validated against an allowlist of known types (e.g.
`"admission"`, `"participant"`, `"announcement"`). `fileName` on DELETE is
accepted from query params without checking file ownership.

**Vercel ephemeral filesystem note:** Vercel's deployment filesystem is
non-persistent — uploaded files are lost on redeployment. The current
`/public/uploads/` approach is a pilot convenience. Before production use,
document and avatar storage must move to a managed object-storage service
(Supabase Storage or equivalent) with server-authorised signed URLs.

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

**Tests:**
- Cross-entity read denial: authenticate as a guardian, GET documents for
  another user's admission. Verify 403.
- Cross-entity delete denial: authenticate as a guardian, DELETE documents
  belonging to another user. Verify 403.
- Traversal payload denial: POST or GET with `entityType=../../unexpected`.
  Verify 400.
- Invalid magic bytes: upload a file with a spoofed MIME type containing
  non-matching content bytes. Verify 400.
- Allowed success: upload a legitimate PDF, verify 200 and correct metadata.

---

### P1-1: File upload routes validate MIME type only — no content verification

**Files:**
- `src/app/api/upload/document/route.ts` — line 78
- `src/app/api/upload/avatar/route.ts` — line 31

Both use `ALLOWED_TYPES.includes(file.type)` without verifying file content.

**Impact:** The browser-provided MIME type is trivially spoofable. A malicious
executable with spoofed `application/pdf` MIME lands in `/public/uploads/` and
is served as a static asset. Vercel's filesystem is non-persistent (lost on
redeploy), so this must move to managed object storage before production.

**Fix:** Verify magic-byte signatures:
- PDF: `%PDF` at offset 0
- DOC/DOCX: ZIP header `PK\u0003\u0004`
- JPEG: `\u00FF\u00D8\u00FF`
- PNG: `\u0089PNG`
- WebP: `RIFF` + `WEBP`

**Test:** Upload `.exe` with MIME spoofed to `application/pdf`. Verify 400.

---

## P2 — Medium

### P2-1: Attendance mutation routes use manual `req.json()` validation — no Zod

**Files (7 routes):**
- `src/app/api/park/attendance/route.ts` — POST, line 182
- `src/app/api/park/attendance/events/route.ts` — POST, line 16
- `src/app/api/park/attendance/[eventId]/route.ts` — POST, line 147
- `src/app/api/park/attendance/sync/route.ts` — POST, line 54
- `src/app/api/park/attendance/check-alerts/route.ts` — POST, line 13
- `src/app/api/park/attendance/[eventId]/close/route.ts` — PATCH, line 20
- `src/app/api/park/attendance/[eventId]/records/[recordId]/route.ts` — PATCH,
  line 32

**Severity rationale:** All routes destructure specific fields, limiting
pass-through risk. The pattern invites future bugs but has low direct
exploitability. Important hardening, not a current bypass.

**Impact:** No Zod schema means field types, bounds, and extra fields are not
validated consistently. The sync route's custom `parseMutation` lacks Zod's
type-coercion safety.

**Fix:** Define Zod schemas for each mutation payload using `.safeParse()`.
For sync: `z.array(z.object({...})).min(1).max(50)`.

**Test:** Submit each endpoint with empty body, missing and extra fields.
Verify 400 with field-level errors.

---

### P2-2: CSV import routes have no file size limit — OOM risk

**Files:**
- `src/app/api/admin/import/participants/route.ts` — line 27
- `src/app/api/admin/import/guardians/route.ts` — line 22
- `src/app/api/admin/import/users/route.ts` — line 37

**Severity rationale:** Requires authenticated admin session. Current pilot
on Hobby plan with constrained concurrency limits blast radius. Schedule
fix before wider deployment.

**Impact:** All three routes load the entire CSV with `file.text()` with no
size check. A large CSV exhausts the Node.js heap.

**Fix:** Check `file.size` before reading. Reject files over 5 MB. Return 413.

**Test:** Upload 50 MB CSV. Verify 413. Upload 100 KB CSV. Verify 200.

---

### P2-3: In-memory login rate limiter not shared across serverless instances

**File:** `src/lib/auth.ts` — module-level `Map<string, { count: number; resetAt: number }>()`

**Severity rationale:** Pragmatic on Hobby plan where concurrent instances are
limited. Schedule before wider rollout or production use.

**Impact:** Each serverless invocation may use a separate instance with its own
empty map. An attacker multiplies attempts by instance count.

**Fix:** Database-backed rate limiting with TTL index, or shared cache (Vercel
KV). Add account-level lockout on the user record.

**Test:** Make repeated login attempts across simulated instances. Verify
blocked after N total attempts.

---

### P2-4: Import and attendance-sync routes leak `error.message` to authenticated clients

**Files:**
- `src/app/api/admin/import/participants/route.ts` — lines 281, 293
- `src/app/api/admin/import/guardians/route.ts` — lines 126, 138
- `src/app/api/admin/import/users/route.ts` — lines 237, 241
- `src/app/api/park/attendance/sync/route.ts` — line 155

**Impact:** An authenticated admin sees internal schema details (table names,
constraints, FK relationships) in error messages. Not unauthenticated
disclosure — all routes require auth — but aids an attacker with admin access.

**Fix:** Replace `error.message` with a generic sanitized message in all five
locations. Log full errors server-side.

**Test:** Submit a CSV triggering a DB constraint violation. Verify the
response contains no internal details.

---

### P2-5: `USER_OVERRIDE_CAPABILITIES` allowlist not enforced in resolver (defence-in-depth)

**File:** `src/lib/auth/capabilities.ts` — line 160 (`resolveEffectiveCapability`)

**Current behaviour:** The API input is correctly validated — the override
route (`src/app/api/admin/access/users/[id]/overrides/route.ts`, line 9) uses
`z.enum(USER_OVERRIDE_CAPABILITIES)`. The resolver does not re-validate:

```
if (userOverride && isActiveUserCapabilityOverride(userOverride, now)) {
  return userOverride.effect === "allow";
}
```

A direct DB insert bypassing the API could grant capabilities outside the
12-capability allowlist.

**Impact:** Low under normal operation — the API gate is effective.
Defence-in-depth only.

**Fix:** Add allowlist check inside `resolveEffectiveCapability`:

```
if (!(USER_OVERRIDE_CAPABILITIES as readonly string[]).includes(userOverride.capability)) {
  return false;
}
```

**Test:** Insert a user override for `audit.view` via direct DB write. Call
`userHasCapability()`. Verify `false`.

---

### P2-6: No `isActive` check in JWT callback (defence-in-depth)

**File:** `src/lib/auth.ts` — line 176:
`if (dbUser && token.tokenVersion !== dbUser.tokenVersion)`

**Current behaviour:** The deactivation handler
(`src/app/api/admin/users/[id]/route.ts`, line 316) sets `isActive: false` and
increments `tokenVersion` atomically. All deactivations invalidate sessions via
the version check. No active vulnerability.

**Fix:** Add `|| !dbUser.isActive` as defence-in-depth:
```
if (dbUser && (token.tokenVersion !== dbUser.tokenVersion || !dbUser.isActive)) {
  return {};
}
```

**Test:** Deactivate a user. Verify the next authenticated request returns 401.

---

### P2-7: Mixed return-type convention in auth helpers

**File:** `src/lib/auth/authorize.ts`

- `requireCityScope()`, `requireParkScope()`, `requireGroupScope()` return `boolean`
- `requireResourceScope()` returns `NextResponse | null`
- `requireAuth()`, `requireCapability()` return `{ user } | NextResponse`

**Impact:** A developer who treats boolean helpers like guard helpers may skip
the `if (!result) return 403` check. Code-review risk, not active vulnerability.

**Fix:** Standardise all scope helpers to return `NextResponse | null`.

---

## P3 — Low / Engineering Cleanup

### P3-1: Repeated `getServerSession` calls per request

**Files:** Multiple routes — e.g. `src/app/api/admin/parks/[id]/route.ts`

Several handlers call `requireRole()` then `requireAuth()` then
`requireCapability()` — each triggers `getServerSession(authOptions)`
independently. No demonstrated TOCTOU exploitation path; the JWT is consistent
within a single request. Code style and minor performance concern.

**Fix:** Consolidate into a single `requireAuth()` at the top of each handler,
then use synchronous scope/capability helpers.

---

### P3-2: `requireRole` casts `user.role` without runtime validation

**File:** `src/lib/auth/authorize.ts` line 37:
`if (!user.role || !roles.includes(user.role as UserRole))`

Technically safe because `UserRole` is a typed string union. Omitted defensive
validation only.

**Fix:** Use `isUserRole(user.role)` before the cast.

---

### P3-3: CSV import rows lack full Zod schemas

**Files:**
- `src/app/api/admin/import/participants/route.ts` — profile fields use Zod,
  main rows manual
- `src/app/api/admin/import/guardians/route.ts` — no Zod for rows
- `src/app/api/admin/import/users/route.ts` — no Zod for rows

**Fix:** Define a Zod schema for each CSV row and validate with `.safeParse()`.

---

## Summary Table

| ID | Severity | Finding | Exploitable? |
|----|----------|---------|-------------|
| P1-0 | **High** | Document POST/GET/DELETE: no entity auth, no path allowlist, no capability gate | Yes — authenticated user reads/deletes other entities' documents |
| P1-1 | **High** | File uploads check MIME type only, no magic-byte verification | Moderate — spoofed MIME serves arbitrary content from `/public/` |
| P2-1 | **Medium** | 7 attendance routes use manual JSON, no Zod | Low — fields destructured, pattern invites future bugs |
| P2-2 | **Medium** | CSV import routes have no file size limit — OOM DoS | Yes — authenticated admin, schedule fix before wider rollout |
| P2-3 | **Medium** | In-memory rate limiter not shared across serverless instances | Moderate — schedule fix before wider rollout |
| P2-4 | **Medium** | Import + sync routes leak `error.message` to authenticated clients | Moderate — aids schema discovery for authenticated attacker |
| P2-5 | **Medium** | `USER_OVERRIDE_CAPABILITIES` allowlist not enforced in resolver | Low — API input already validated with `z.enum` |
| P2-6 | **Medium** | No `isActive` check in JWT callback (defence-in-depth) | None — `tokenVersion` bump covers this |
| P2-7 | **Medium** | Mixed return-type convention in scope helpers | Low — developer error risk |
| P3-1 | **Low** | Repeated `getServerSession` calls (style) | None — engineering cleanup |
| P3-2 | **Low** | `requireRole` casts without runtime role validation | None |
| P3-3 | **Low** | CSV import rows lack full Zod schemas | Low — partial manual validation exists |

**Total: 12 findings** — 2 High, 7 Medium, 3 Low.

### Removed or revised from initial draft

| Original finding | Reason |
|-----------------|--------|
| Deactivated user sessions (was P0-1) | Deactivation endpoint (`users/[id]/route.ts` line 316) increments `tokenVersion` atomically with `isActive = false`. Tests cover it. Removed. |
| Park scope not enforced (was P1-2) | Park routes derive scope from authenticated `StaffMeta`, not from client input. Removed. |
| Avatar capability check (was P1-3) | Self-service avatar upload is intentional. Removed. |
| Repeated session reads TOCTOU (was P1-4) | Not a demonstrated vulnerability. Moved to P3-1 as engineering cleanup. |
| Document upload P0 | Downgraded to P1 — authenticated only, not full-system compromise. |
| Attendance manual validation P1 | Downgraded to P2 — low direct exploitability, important hardening. |
| CSV sizes P1 | Downgraded to P2 — authenticated only, schedule before wider rollout. |
| Rate limiter P1 | Downgraded to P2 — schedule before wider rollout. |

---

## Checks

```
git diff --check: pass

Branch: agent/deepseek/SEC-001-static-route-audit
Base: codex/production-hardening @ dffd68a
Ready for Codex approval.
```
