# SEC-006: Static Security Revalidation — Findings Resolution Audit

**Task:** SEC-006
**Owner:** DeepSeek
**Status:** Draft — pending Codex review
**Created:** 2026-07-22
**Scope:** Revalidate every finding from SEC-001 against the current
`codex/production-hardening` branch at commit `1bfc2fa`. For each finding,
check whether it has been resolved by subsequent tasks (SEC-002, SEC-004,
ATT-VALIDATION-002, CP-IMPORT-001) or remains open. Report only verified
current-state evidence. No code, schema, migration, deployment, secrets, or
data changes.

---

## 1. Revalidation Method

SEC-001 identified 12 findings (2 High, 7 Medium, 3 Low). Each finding was
re-checked against the current source at `1bfc2fa`. A finding is marked
**RESOLVED** if the exact fix recommended in SEC-001 is present in the code.
It is marked **PARTIAL** if the fix is partially applied or a related task
(SEC-002, SEC-004, ATT-VALIDATION-002) addressed a subset. It is marked
**OPEN** if no change was applied.

---

## 2. Finding Status

### P1-0: Document upload lacks entity authorization and path allowlisting

**SEC-002 action:** Replaced POST/GET/DELETE handlers with a `disabledHandler`
that requires auth then returns 503. No filesystem access, no file details, no
path building.

| Sub-finding | Status | Evidence |
|-------------|--------|----------|
| No entity-ownership check | **RESOLVED** — disabled, no filesystem access | `requireAuth()` then 503. |
| No path allowlist for entityType | **RESOLVED** — route has no path construction | All `fs`/`path` imports removed. |
| No capability gate | **RESOLVED** — route returns 503, no operation possible | `requireAuth()` only, then 503. |
| Cross-entity read/delete | **RESOLVED** — no data returned at all | 503 on any authenticated request. |

**Verdict: RESOLVED** by SEC-002. Document upload is safely disabled.

---

### P1-1: File upload routes validate MIME type only — no content verification

**SEC-002/004 action:** Both document upload and avatar upload routes were
disabled. No files are written to disk.

| Sub-finding | Status | Evidence |
|-------------|--------|----------|
| Document upload MIME-only | **RESOLVED** — handler returns 503 | No file accepted at all. |
| Avatar upload MIME-only | **RESOLVED** by SEC-004 — handler returns 503 | Same pattern. |

**Verdict: RESOLVED.** Both upload routes return 503. Content verification is
not needed while disabled.

---

### P2-1: Attendance mutation routes use manual `req.json()` validation — no Zod

**ATT-VALIDATION-002 action:** All 7 mutation routes now use bounded Zod
schemas with `safeParse()` returning 400 on validation failure.

| Route | SEC-001 status | Current status | Evidence |
|-------|---------------|----------------|----------|
| POST `/attendance` | Manual typeof | **RESOLVED** — `createAttendanceEventSchema` | `safeParse()` at handler entry |
| POST `/attendance/events` | Manual typeof (duplicate) | **RESOLVED** — same schema | Same |
| POST `/[eventId]` | Manual includes | **RESOLVED** — `markAttendanceSchema` | cuid, status enum, bounded editReason |
| PATCH `/[eventId]/close` | Manual `if (!reason)` | **RESOLVED** — `closeAttendanceEventSchema` | string 1-500 |
| PATCH `/[eventId]/records/[recordId]` | Typed + length | **RESOLVED** — `editAttendanceRecordSchema` | status enum, editReason 10-2000 |
| POST `/sync` | Custom `parseMutation()` | **RESOLVED** — `syncAttendanceRequestSchema` | z.array bounds, safe error |
| POST `/check-alerts` | Manual typeof | **RESOLVED** — `checkAlertsSchema` | cuid validation |

**Verdict: RESOLVED** by ATT-VALIDATION-002.

---

### P2-2: CSV import routes have no file size limit — OOM risk

**Current state:** `src/app/api/admin/import/participants/route.ts`,
`guardians/route.ts`, and `users/route.ts` still use `file.text()` without a
size check. No task has addressed these routes.

| File | Current check | Risk |
|------|-------------|------|
| `import/participants/route.ts` | None before `file.text()` | OOM on large CSV |
| `import/guardians/route.ts` | None before `file.text()` | OOM on large CSV |
| `import/users/route.ts` | None before `file.text()` | OOM on large CSV |

**Verdict: OPEN.** Requires a size check before `file.text()` with 413
response for oversized uploads.

---

### P2-3: In-memory login rate limiter not shared across serverless instances

**Current state:** `src/lib/auth.ts` still uses a module-level `Map<string,
{ count: number; resetAt: number }>()`. No task has replaced this with a
database-backed or shared-cache approach.

**Verdict: OPEN.** Not a blocker for the current Hobby plan with limited
concurrency, but must be scheduled before wider deployment.

---

### P2-4: Import and attendance-sync routes leak `error.message`

| File | SEC-001 claim | Current state | Status |
|------|--------------|---------------|--------|
| `import/participants/route.ts` | Returns `error.message` at lines 281, 293 | **OPEN** — still leaks | **OPEN** |
| `import/guardians/route.ts` | Returns `error.message` at lines 126, 138 | **OPEN** — still leaks | **OPEN** |
| `import/users/route.ts` | Returns `error.message` at lines 237, 241 | **OPEN** — still leaks | **OPEN** |
| `park/attendance/sync/route.ts` | Returns `error.message` per-mutation | **RESOLVED** by ATT-VALIDATION-002 | Generic `"Processing error"` |

**Verdict: PARTIAL.** Sync route fixed. Three import routes remain open.

---

### P2-5: `USER_OVERRIDE_CAPABILITIES` allowlist not enforced in resolver

**Current state:** `resolveEffectiveCapability()` in `capabilities.ts` still
does not check the allowlist. The API input is correctly validated via
`z.enum(USER_OVERRIDE_CAPABILITIES)` at
`src/app/api/admin/access/users/[id]/overrides/route.ts` line 9.

**Verdict: OPEN.** Defence-in-depth finding. Low priority — the API gate is
effective. Requires adding the allowlist check inside
`resolveEffectiveCapability()`.

---

### P2-6: No `isActive` check in JWT callback (defence-in-depth)

**Current state:** The JWT callback at `src/lib/auth.ts` line 176 checks
`token.tokenVersion !== dbUser.tokenVersion` but not `dbUser.isActive`. The
deactivation handler bumps `tokenVersion` atomically, so no active bypass
exists.

**Verdict: OPEN** as defence-in-depth. Adding `|| !dbUser.isActive` is
trivial but not urgent.

---

### P2-7: Mixed return-type convention in auth helpers

**Current state:** `requireCityScope()`/`requireParkScope()`/`requireGroupScope()`
still return `boolean` while `requireResourceScope()` returns `NextResponse | null`.
No refactoring task has addressed this.

**Verdict: OPEN.** Code-review risk, not active vulnerability. Engineering
cleanup priority.

---

### P3-1: Repeated `getServerSession` calls per request

**Current state:** No consolidation task has been completed. Routes still call
`requireRole()` then `requireAuth()` then `requireCapability()`, each fetching
the session independently.

**Verdict: OPEN.** Style/performance concern. Low priority.

---

### P3-2: `requireRole` casts `user.role` without runtime validation

**Current state:** `if (!user.role || !roles.includes(user.role as UserRole))`
at line 37 of `authorize.ts`. No defensive `isUserRole()` check added.

**Verdict: OPEN.** Low risk — `UserRole` is a typed union.

---

### P3-3: CSV import rows lack full Zod schemas

**Current state:** `import/participants/route.ts` has profile fields validated
with Zod but main rows manually validated. `import/guardians/route.ts` and
`import/users/route.ts` have no Zod row validation.

**Verdict: OPEN.** Low priority — partial manual validation exists.

---

## 3. Summary Table

| ID | Severity (SEC-001) | Finding | Current Status | Resolved by |
|----|-------------------|---------|---------------|-------------|
| P1-0 | High | Document upload lacks entity auth and path allowlist | **RESOLVED** | SEC-002 |
| P1-1 | High | File upload MIME-only validation, no magic bytes | **RESOLVED** | SEC-002, SEC-004 |
| P2-1 | Medium | 7 attendance routes no Zod validation | **RESOLVED** | ATT-VALIDATION-002 |
| P2-2 | Medium | CSV import routes no file size limit | **OPEN** | — |
| P2-3 | Medium | In-memory rate limiter not shared | **OPEN** | — |
| P2-4 | Medium | Import + sync routes leak error.message | **PARTIAL** (sync fixed) | ATT-VALIDATION-002 |
| P2-5 | Medium | USER_OVERRIDE_CAPABILITIES allowlist not enforced | **OPEN** | — |
| P2-6 | Medium | No isActive check in JWT callback | **OPEN** | — |
| P2-7 | Medium | Mixed return-type convention in auth helpers | **OPEN** | — |
| P3-1 | Low | Repeated getServerSession calls | **OPEN** | — |
| P3-2 | Low | requireRole casts without runtime validation | **OPEN** | — |
| P3-3 | Low | CSV import rows lack full Zod schemas | **OPEN** | — |

**Total: 12 findings** — 3 RESOLVED, 1 PARTIAL (sync import subset fixed),
8 OPEN.

---

## 4. Resolved vs Open by Task

| Task | Findings resolved |
|------|------------------|
| SEC-002 (disable document upload) | P1-0 (full), P1-1 (document subset) |
| SEC-004 (disable avatar upload) | P1-1 (avatar subset) |
| ATT-VALIDATION-002 (attendance Zod schemas) | P2-1 (full), P2-4 (sync subset) |

| Remaining open | Priority for next pass |
|----------------|----------------------|
| P2-2 — CSV file size limits | **High** — OOM DoS from authenticated admin |
| P2-3 — Rate limiter scaling | **Medium** — schedule before wider rollout |
| P2-4 — Import routes error.message leak | **High** — aids schema discovery |
| P2-5 — USER_OVERRIDE_CAPABILITIES | **Low** — defence-in-depth |
| P2-6 — JWT isActive check | **Low** — defence-in-depth |
| P2-7 — Mixed return types | **Low** — engineering cleanup |
| P3-1 — Repeated session reads | **Low** — engineering cleanup |
| P3-2 — Role cast validation | **Low** |
| P3-3 — CSV Zod schemas | **Low** |

---

## 5. Handoff

```
Task ID: SEC-006
Branch and base commit: agent/deepseek/SEC-006-security-revalidation @ 1bfc2fa
Commit SHA: (pending)
Changed files: docs/product-discovery/SEC-006-STATIC-SECURITY-REVALIDATION.md
What changed:
  - Revalidated all 12 SEC-001 findings against current code at 1bfc2fa
  - 3 RESOLVED (P1-0 by SEC-002, P1-1 by SEC-002/SEC-004, P2-1 by
    ATT-VALIDATION-002)
  - 1 PARTIAL (P2-4 — sync route fixed, 3 import routes still open)
  - 8 OPEN (P2-2, P2-3, P2-5 through P3-3)
  - Open findings prioritised for next pass: P2-2 (CSV size) and P2-4
    (import error leak) at High priority
What was intentionally excluded:
  - No code, test, schema, migration, deployment, .env, or data changes
  - No re-audit of routes outside SEC-001 scope
  - No new findings — this is a resolution audit only
Commands run and results:
  - git diff --check: pass
Known risks / owner decisions:
  - Eight findings remain open. P2-2 and P2-4 (import routes) are the
    highest priority for the next security hardening pass
  - Remaining findings are low-risk defence-in-depth or engineering cleanup
Ready for Codex review.
```
