# DeepSeek packet — ATT01 attendance lifecycle correction

Read `AGENTS.md`, `docs/delivery/tasks/ATT01.md`, and
`docs/delivery/reports/ATT01_BASELINE_AUDIT.md` before editing. Preserve
unrelated dirty workspace changes.

## Goal

Correct two owner-approved lifecycle defects in the existing v2
**group-session attendance** module. Do not rebuild it. The current module has
a passing 20-file/94-test baseline, but the new tests must verify the corrected
behavior rather than merely characterize the old behavior.

## Allowed scope

- `src/app/api/park/attendance/**`
- `src/lib/attendance/**`
- `src/lib/offline/sync-attendance.ts` and its test
- `src/app/api/admin/students/[id]/dropout/route.ts` and its existing test
- directly corresponding tests only
- `docs/delivery/reports/DEEPSEEK_ATT01_BACKEND.md` for your handoff

Do not change Prisma schemas/migrations/generated clients, package files,
authentication grants, UI, workbook data/imports, notification delivery,
dropout/warning thresholds, production configuration, accounts, or deployment.

## Preserve these contracts

- Group-session scope comes from the server; missing/cross-scope hierarchy is
  denied.
- Unassigned, inactive, or ineligible participants do not enter a roster.
- Marks require active staff assignment, session-open/reset/version checks,
  idempotent mutation receipt, audit evidence, and truthful acknowledgement.
- The offline queue remains owner-bound and failures/conflicts stay visible.
- Close/reopen/reset/correction authority and response semantics remain
  unchanged.

## Owner-approved lifecycle correction

1. Closing an attendance event must **not** automatically change any
   participant to `dropout`, even if a legacy batch setting says automatic
   dropout is enabled. Preserve session close scope/concurrency/audit behavior.
   Replace the old automatic-dropout test with a regression test proving no
   participant lifecycle write occurs.
2. Reactivation is a separate `students.manage` action and must require a
   bounded `effectiveDate` rejoin date. It must be authorized and audited.
3. Preserve previous attendance records. Keep the prior `dropoutAt` as the
   historical interruption start and set `reactivatedAt` to the approved rejoin
   date. Do not set `joinedAt` to the rejoin date and do not add a schema or
   migration.
4. Update eligibility so a participant is eligible before their historical
   dropout date, ineligible from dropout through the day before rejoin, and
   eligible on/after the rejoin date. A current dropout remains ineligible
   from its dropout date onward.
5. Make the roster use the same eligibility rule. A reactivated participant
   must not appear in a historical session during their interruption.
6. Reject an invalid rejoin date: absent, before the stored dropout date, or
   in the future. Use the project PKT date helpers; do not rely on UTC date
   string parsing for the business-day comparison.

## Required review targets

1. Close behavior with a legacy enabled automatic-dropout setting.
2. Authorised reactivation with a valid rejoin date plus audit evidence.
3. Missing, past-before-dropout, and future rejoin date denial.
4. Roster and opportunity calculations before, during, and after an
   interruption.
5. Existing mutation/sync acknowledgement and scope denial paths touched by
   the shared eligibility rule.

Add focused success, denial, conflict, and failure tests only where they prove
a real correction. Prefer an empty source diff over an invented improvement.

## Verification

Run the affected focused tests, scoped ESLint, TypeScript if possible, and
scoped `git diff --check`. Return exact changed files, commands/exits/test
counts, remaining risks, and any no-change findings. Do not claim independent
review, full-suite success, production readiness, deployment, or release
approval.
