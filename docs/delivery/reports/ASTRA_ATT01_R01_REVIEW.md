# Astra review — ATT01-R01

Date: 2026-09-17. Outcome: **accepted as the ATT01-R02 backend contract**.

## Accepted evidence

- The parser diagnosis is credible: seven summary labels across 18 groups explain the 126-participant delta, while the reported attendance aggregates remain unchanged.
- The scoped-entry diagnosis is credible: the Murabbi home route currently sends users to `parks`, whose generic directory endpoint requires `organisation.view`; a Murabbi does not have that capability.
- The candidate adds targeted parser, dashboard, scoped-park and create-date tests. Its reported focused suite is not independent verification.

## Required corrections

### P1 — enforce the batch calendar at the mark mutation, not only event creation

`src/lib/attendance/apply-mutation.ts` accepts an existing event and writes a mark after scope and lifecycle checks, but it never verifies that `event.eventDate` is a scheduled date inside the event group's active batch. ATT01's owner policy requires server enforcement for both creation **and marking**. A legacy or manually-created invalid-date event remains markable through `POST /api/park/attendance/[eventId]` and offline sync.

Use the shared schedule helper inside the transaction, require an active batch/group, fail closed with a non-retryable result, and add direct route or mutation tests for a valid scheduled event plus a non-class/out-of-range existing event. Cover online and sync if they share the helper.

**Correction review update:** implemented and independently verified in the standard mark and offline-sync path.

### P1 — enforce the same calendar gate for privileged record corrections

`src/app/api/park/attendance/[eventId]/records/[recordId]/route.ts` is another attendance write surface. Its `PATCH` handler changes a record status after authorization but does not check that the event belongs to an active group, active batch, and scheduled batch date. The owner policy applies to attendance marking and correction; an authorized Park Lead could otherwise change an invalid legacy session.

Apply the same shared calendar predicate inside this route's transaction, preserving its version and audit behavior. Add allowed and rejected correction-route tests for an invalid-date event, inactive group, and inactive batch. This is the final R01 blocker.

### P1 — require active group and batch during both create routes

`src/app/api/park/attendance/route.ts:160` and `src/app/api/park/attendance/events/route.ts:55` fetch a batch by id but do not require `isActive`; their group lookup is also an unrestricted `findUnique`. A dated but inactive batch can therefore pass `isBatchClassDate`. Enforce active group and active batch before creating a session, and add tests for each denial.

### P2 — restrict summary-label rejection to unnumbered rows

`src/lib/attendance/lahore-refresh/workbook.ts:159` rejects a name matching a summary label before checking whether the row has a valid roster serial. This can silently discard a legitimate numbered participant named `Late`, `Present`, or `Leave`. Apply the label rule only in the unnumbered-candidate branch and add a numbered-name regression test.

### P2 — return a real today percentage for the Park Lead card

The dashboard's `recentSummary.last7DaysAttendanceRate` is a seven-day value, but the Park Lead UI labels it `Today Att.`. `todayAttendance` currently reports counts only. Add an explicit, date-accurate `todayAttendance.rate` (or eligible denominator) to the reviewed API contract and tests so Gemini does not display a weekly number as today’s rate.

## Review limits

No database reset, re-import, account change, browser check, full test suite, build, or live action was performed in this review. The local phantom participants remain until an owner-approved, backup-gated refresh is separately reviewed.

## Final acceptance

The final correction extends the shared active-group, active-batch, and scheduled-class-date gate to the privileged record-correction route. It runs after authorization and scope resolution, inside the transaction, and before the record lock, optimistic version check, or audit write. The direct correction suite passes 10/10 independently; scoped lint and whitespace checks pass.

ATT01-R01 is accepted for the frontend contract. This does not approve a data refresh, account activation, deployment, or team attendance release. The existing local database still contains pre-parser-fix phantom participants and requires a separately reviewed, backup-gated rebuild before operational use.
