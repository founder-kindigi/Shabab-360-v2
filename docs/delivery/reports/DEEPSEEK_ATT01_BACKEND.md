# DeepSeek handoff — ATT01 attendance lifecycle correction

Date: 2026-09-16. Candidate: current dirty `v2` workspace. Scope: bounded
correction of the owner-approved attendance lifecycle (close records attendance
only; reactivation needs an authorized rejoin date). Source and synthetic-test
handoff only — not independent review, release, deployment, or production
readiness.

## Changed files

1. `src/app/api/park/attendance/[eventId]/close/route.ts`
   - Removed the entire automatic-dropout branch (`evaluateConsecutiveAbsenceWeeks`,
     final-weekly-session detection, `participant.updateMany`, per-participant
     `student.dropout.automatic` audit). Closing now only sets
     `isClosed/closedAt/closedBy` and writes the single `event_close` audit inside
     the same transaction.
   - Preserved scope check, `isClosed` 409, the `updateMany ... isClosed:false`
     concurrency guard, the `ATTENDANCE_ALREADY_CLOSED` 409 catch, and the
     response/audit shape (`automaticDropouts: 0`).
   - The event/scope/staff reads remain inside the original `try` block.
2. `src/app/api/park/attendance/[eventId]/close/route.test.ts`
   - Replaced the automatic-dropout tests with a regression test: with a legacy
     `automaticDropoutEnabled: true` setting, close returns `automaticDropouts: 0`,
     writes exactly one `event_close` audit, and never calls
     `participant.findMany/updateMany` or `attendanceRecord.findMany`. Added a
     409 concurrent-close case.
3. `src/app/api/admin/students/[id]/dropout/route.ts`
   - Reactivation now requires an `effectiveDate`, rejects it when absent (400),
     when before the stored `dropoutAt` PKT day (400), when in the future PKT day
     (400), and when no dropout date is recorded (409). Days are compared with
     `formatPKT`; the rejoin instant is the PKT day start via `attendanceDateStart`.
   - The reactivate write is now `{ state: "active", reactivatedAt }`, so the prior
     `dropoutAt` (and reason/source) remain as the interruption history and
     `joinedAt` is untouched. Audit old/new values now include `reactivatedAt`.
     Dropout behavior, `students.manage` capability, and scope checks unchanged.
4. `src/app/api/admin/students/[id]/dropout/route.test.ts`
   - Replaced the old reactivate test with: valid rejoin (asserts `reactivatedAt`
     is the approved PKT day and that `dropoutAt` is not rewritten), missing
     rejoin, pre-dropout rejoin, future rejoin, and missing-dropout-date denials.
5. `src/lib/attendance/opportunities.ts`
   - `eligibleForSession` now: inactive → ineligible; joined after the session day
     → ineligible; before the dropout day → eligible; from the dropout day through
     the day before the rejoin → ineligible; on/after the rejoin day → eligible; a
     current dropout (no `reactivatedAt`) stays ineligible from dropout on.
     `reactivatedAt` is optional on the internal `Participant` type.
6. `src/lib/attendance/opportunities.test.ts`
   - Added the interruption window and current-dropout-from-dropout-day cases.
7. `src/app/api/park/attendance/[eventId]/route.test.ts`
   - Added roster exclusion during a reactivated participant's interruption and
     mark denial (`ATTENDANCE_DISCONTINUED`) inside the interruption plus
     acceptance on/after the rejoin date, exercising the shared rule through the
     roster and mutation paths.
8. `src/app/api/park/attendance/summaries/route.ts`
   - Added `reactivatedAt: true` to the participant select so the shared
     eligibility rule can resume a reactivated participant's denominator on/after
     the rejoin day.
9. `docs/delivery/reports/DEEPSEEK_ATT01_BACKEND.md` — this handoff.

No schema, migration, generated client, package, auth grant, UI, workbook,
notification, threshold-policy, production-config, account, or deployment file
was changed; `joinedAt` is never set to the rejoin date.

## Commands, exits and totals

- `npx vitest run src/app/api/park/attendance src/lib/attendance src/lib/offline/sync-attendance.test.ts src/components/modules/park/mobile-attendance-page.test.ts` (NODE_ENV cleared): **20 files / 101 tests passed**, exit 0 (baseline was 20/94; +7 from this and the prior bounded pass).
- `npx vitest run <the above + src/app/api/admin/students>`: **26 files / 144 tests passed**, exit 0.
- `npx eslint` on the eight changed source/test files: **pass**, 0 errors.
- `npx tsc --noEmit`: **pass**, 0 errors.
- `git diff --check` scoped to `src/lib/attendance`, `src/app/api/park/attendance`, `src/app/api/admin/students/[id]/dropout`: **clean** (CRLF notices only).

## No-change findings

- Reopen/reset/correction authority, statuses and audit semantics were audited and
  left untouched.
- Mutation/sync acknowledgement, receipt replay and scope denial are unaffected;
  the only change they see is the shared eligibility rule (now rejects marks
  inside a reactivation interruption, allows them from the rejoin day).
- `evaluateConsecutiveAbsenceWeeks` is still used by `summaries` for warning
  streaks; only the close-route usage was removed.

## Remaining risks

- `src/app/api/admin/home-analytics/route.ts` (out of ATT01 scope) selects
  `{ id, groupId, state, joinedAt, dropoutAt }` without `reactivatedAt`, so its
  `attendanceOpportunities` totals treat a reactivated participant as ineligible
  from the dropout day onward. It compiles (the field is optional) but should
  select `reactivatedAt` in a follow-up. `certificates/[participantId]` and
  `certificates/batch` load full participant rows, so they are already correct.
- The roster's Prisma `where` still keys the historical clause on
  `state: "dropout"`; a record left in `state: "dropout"` with a `reactivatedAt`
  would be excluded for late sessions. The approved flow sets `state: "active"`
  on rejoin, so this is not currently reachable.
- The close response and `event_close` audit keep an `automaticDropouts: 0` field
  to preserve the existing payload shape, even though automatic dropout no longer
  exists.
- No full Vitest suite, `npm run build`, browser, database, migration, or
  deployment check ran. Automatic-dropout policy is now enforced in code but this
  handoff is not release or production approval; Astra owns final verification.
