# ATT01 Reliability Implementation — Handoff Report

**Module:** ATT01  
**Branch:** `v2`  
**Generated:** 2026-09-16

---

## Status: ALL CHECKPOINTS COMPLETE ✅

---

## Checkpoint 1 — Rejoin/Dropout Attendance Correctness (F-11) ✅

**Tests:** 7/7 pass  
**Command:** `npx vitest run src/lib/attendance-alerts.test.ts`

**Files changed:**
- `src/lib/attendance-alerts.ts` — Added `eligibleForSession` import, `eventDate` to events select, eligibility filter before streak counting
- `src/lib/attendance-alerts.test.ts` — Rewritten: updated mocks to include lifecycle fields, 4 new F-11 regression tests added

---

## Checkpoint 2 — Park Admin Session Lifecycle Authority (F-02) ✅

**Tests:** 25/25 pass  
**Command:** `npx vitest run src/app/api/park/attendance/[eventId]/close/route.test.ts src/app/api/park/attendance/[eventId]/reopen/route.test.ts src/app/api/park/attendance/[eventId]/reset/route.test.ts src/lib/auth/capabilities.test.ts`

**Files changed:**
- `src/lib/auth/capabilities.ts` — Added `"attendance.correct"` to `park_admin` capability list
- `src/app/api/park/attendance/[eventId]/close/route.ts` — Added `"park_admin"` to `EVENT_SUPERVISOR_ROLES`
- `src/app/api/park/attendance/[eventId]/reopen/route.ts` — Added `"park_admin"` to `EVENT_SUPERVISOR_ROLES`; removed unused `groupResourceScope`, `requireResourceScope` imports (F-10)
- `src/app/api/park/attendance/[eventId]/reset/route.ts` — Added `"park_admin"` to `ROLES`
- `src/app/api/park/attendance/[eventId]/reset/route.test.ts` — Updated role list assertion
- `src/app/api/park/attendance/[eventId]/close/route.test.ts` — Added 3 park_admin F-02 regression tests
- `src/lib/auth/capabilities.test.ts` — Updated park_admin.attendance.correct assertion from false to true

---

## Checkpoint 3 — Explicit Scope and Authorization Hardening (F-03, F-05, F-06, F-07, F-08, F-10) ✅

**Tests:** 14/14 pass  
**Command:** `npx vitest run src/app/api/park/attendance/route.test.ts src/app/api/park/attendance/check-alerts/route.test.ts src/app/api/park/attendance/events/route.test.ts src/app/api/park/attendance/[eventId]/reopen/route.test.ts`

**Files changed:**
- `src/app/api/park/attendance/route.ts` — F-03: Added explicit null-group Murabbi guard before any DB query; removed stale `!` assertions
- `src/app/api/park/attendance/route.test.ts` — Added F-03 Murabbi/Muawin regression tests
- `src/app/api/park/attendance/warnings/route.ts` — F-05/F-07: Removed double requireAuth, removed unused imports
- `src/app/api/park/attendance/check-alerts/route.ts` — F-05/F-06: Removed double requireAuth, removed unused imports
- `src/app/api/park/attendance/events/route.ts` — F-08: Confirmed already uses ATTENDANCE_ROLES (no code change needed)
- `src/app/api/park/attendance/[eventId]/reopen/route.ts` — F-10: Removed unused `groupResourceScope`, `requireResourceScope` imports (done in CP2)

---

## Checkpoint 4 — Warning Model Consistency and Safe Correctness Cleanup (F-09, F-12, F-13, F-15, F-16, F-17, F-19) ✅

**Tests:** 18/18 pass  
**Command:** `npx vitest run src/lib/attendance/__tests__/dropout-policy.test.ts src/app/api/park/attendance/prepare/route.test.ts`

**Files changed:**
- `src/lib/attendance/dropout-policy.ts` — F-09: Added `@deprecated` JSDoc to `evaluateConsecutiveAbsences`, `canMarkAttendance`, `isOffDate`
- `src/lib/attendance/session-list.ts` — F-13: Added comment clarifying participant count is a current-headcount approximation
- `src/app/api/park/attendance/prepare/route.ts` — F-15: Changed `attempt <= eligible.length` to `attempt < eligible.length`
- `src/lib/attendance/team-access/provision.test.ts` — F-16: Added comment flagging stale `exactPlaceholderMismatches: 1` assertion pending owner verification
- `src/lib/attendance/__tests__/dropout-policy.test.ts` — F-17: Added 5 weekly boundary regression tests
- `src/app/api/park/attendance/warnings/route.ts` — F-12: Replaced per-session absence model with authoritative weekly model (`evaluateConsecutiveAbsenceWeeks`); applied `eligibleForSession` filtering per F-11 pattern

---

## Full Regression Summary

**Total:** 61/61 tests pass across 10 test files  
**Typecheck:** `npx tsc --noEmit --skipLibCheck` → exit code 0

```
npx vitest run \
  src/lib/attendance-alerts.test.ts \
  src/lib/auth/capabilities.test.ts \
  src/app/api/park/attendance/[eventId]/close/route.test.ts \
  src/app/api/park/attendance/[eventId]/reopen/route.test.ts \
  src/app/api/park/attendance/[eventId]/reset/route.test.ts \
  src/app/api/park/attendance/route.test.ts \
  src/app/api/park/attendance/check-alerts/route.test.ts \
  src/app/api/park/attendance/events/route.test.ts \
  src/app/api/park/attendance/prepare/route.test.ts \
  src/lib/attendance/__tests__/dropout-policy.test.ts
```

---

## Owner Decisions Required

### F-19: Undocumented `criticalThreshold` in warnings API

The `/api/park/attendance/warnings` response includes a `"critical"` level computed as `Math.ceil(warningConsecutiveWeeks * 0.67)`. This is not documented in any owner policy or API contract.

- **Preserved** pending owner decision on whether this is part of the supported API contract.
- **Response field changed:** `consecutiveAbsents` → `consecutiveAbsentWeeks` (weekly model alignment)
- **Settings response changed:** `{ warningAbsents, dropoutAbsents }` → `{ warningConsecutiveWeeks, dropoutConsecutiveWeeks }`

> **Action required:** Owner must decide whether to keep the `critical` level or remove it. If kept, it must be documented in the API contract.

### F-16: Provision test stale mismatch count

`src/lib/attendance/team-access/provision.test.ts` asserts `exactPlaceholderMismatches: 1`. `current.md` states zero mismatches. The test skips without the real workbook/DB.

> **Action required:** Run the integration test against the current workbook to confirm the correct value, then update the assertion.

---

## Remaining Work (None)

All ATT01 findings have been addressed. The only open items are the two owner decisions above.

---

## Deferred / Not in Scope

- F-18 (duplicate create-event routes): Deferred. Caller evidence must be reviewed separately before either route can be removed.
- Notification JSON-deduplication redesign: Out of scope per task constraints.
- PostgreSQL `prisma/postgres/schema.prisma` alignment for any schema changes: No schema changes were made in this packet.
