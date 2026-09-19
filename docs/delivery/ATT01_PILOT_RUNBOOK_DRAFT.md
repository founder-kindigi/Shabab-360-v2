# ATT01 attendance pilot runbook — DRAFT (not executed)

> **Superseded for rollout purposes.** This draft records the Phase D preparation
> work and is retained for history. The current, authoritative rollout procedure —
> with the ordered owner gates, provisioning checklist and stop conditions — is
> `docs/delivery/runbooks/ATT01_PRODUCTION_ROLLOUT_RUNBOOK.md`. Follow that one; do
> not execute this draft.

Date: 2026-09-18. Task: ATT01 release preparation, Phase D (release gate 4).
Status: **drafted, unauthorized, unexecuted.** This runbook has not been run
against production, PostgreSQL or any operational system.

Companion documents: `docs/delivery/ATT01_PILOT_AND_ITERATION_PLAN.md` (entry
criteria, operating procedure, triage), `ATT01_WORKBOOK_DB_RECONCILIATION.md`,
`ATT01_SOURCE_COMMIT_INVENTORY.md`, `ATT01_POSTGRES_MIGRATION_PREFLIGHT.md`.

Rules for execution: run only under explicit owner authorization, one step at a
time, stopping at every failed precondition. Never print, copy or commit
passwords, DPAPI handoff contents, or private workbook rows. Substitute real
environment paths/identifiers at execution time; placeholders are written as
`<…>` in this draft.

## 0. Preconditions

- Entry criteria in the pilot plan are all true for each pilot park.
- Owner has approved: the target environment, the maintenance window, the backup
  location and the rollback authority.
- The two new migration folders are committed, the `operation_receipts`
  duplicate-migration blocker is resolved, and the migration-count assertions
  match the committed chain.
- No unresolved attendance-blocking mismatch in the reconciliation report.

## 1. Production backup and integrity confirmation

1. Announce the maintenance window and stop application writers.
2. Full database backup of the target:
   - PostgreSQL: `pg_dump -Fc -f <backup-dir>/shabab-<stamp>.dump <target>`
   - Local SQLite file (if applicable): copy the file and run
     `PRAGMA integrity_check` on the copy (must return `ok`).
3. Verify the backup is restorable on a disposable system before proceeding.
4. Record: backup path, byte size, checksum, `PRAGMA integrity_check` /
   `pg_restore --list` result, `_prisma_migrations` contents, and
   `npx prisma migrate status --schema prisma/postgres/schema.prisma` output.
5. **Do not continue** if the backup is missing, empty, or fails verification, or
   if the checksum does not match the source.

## 2. Migration compatibility preflight

1. Run the read-only readiness preflight (M01
   `runMigrationReadinessPreflight`) and require `ready: true`, zero blockers, and
   zero guard counts.
2. Confirm every unconditionally created object is absent on the clean baseline.
3. Confirm the duplicate `operation_receipts` issue is already resolved in the
   committed chain.
4. Confirm the staged PostgreSQL and SQLite schemas remain aligned for the new
   models (`StaffMeta.assistsMurabbiId`, `OperationReceipt`).
5. **Do not continue** on any collision, missing prerequisite, or non-zero guard.

## 3. Import / provisioning procedure

Order matters; each step is separate and gated.

1. Schema compatibility gates (read-only first):
   - `node scripts/att01-database-compatibility.ts --database <path>`
   - `node scripts/team-access-schema-compatibility.ts --database <path>`
   - Apply only if previously reviewed and authorized, with `--execute --backup-dir <dir>`.
2. Attendance/history import (only where authorized and after the dry run
   reports the approved totals):
   - Dry run: `node scripts/lahore-batch-4-refresh.ts --input <workbook>`
   - Execute: `node scripts/lahore-batch-4-refresh.ts --input <workbook> --execute --confirm-lahore-refresh --target sqlite --sqlite-path <db> --backup-dir <dir>`
   - Do **not** pass `--completed-through` (it could import marks past the
     approved 2026-09-13 cutoff).
3. Staff/team provisioning (activates existing inactive placeholders; no account is
   created without an approved work email):
   - Preflight: `node scripts/provision-lahore-team-access.ts --input <team-access.xlsx> --preflight --sqlite-path <db>`
   - Execute: `… --input <xlsx> --execute --confirm-team-access-provision --target sqlite --sqlite-path <db> --backup-dir <dir> --handoff <file>`
   - Passwords go only to the DPAPI-protected handoff; never print them.
4. City Head test account (only if in the pilot scope):
   `node scripts/provision-local-city-head.ts --email <email> --sqlite-path <db> --dry-run` then the gated `--execute` form.
5. Re-run the aggregate reconciliation and confirm the expected totals; record
   every authorized pilot delta separately from imported history.

## 4. Role-login smoke tests

For each pilot role (Park Lead, Park Admin, Murabbi, City Head, Program Head /
System Owner):

1. Sign in with the assigned account; complete a forced password reset where
   required (password entered by the human operator only).
2. Confirm the session returns the correct role/scope (`GET /api/admin/pilot/verify-scopes`
   for authorised staff) and the product-facing `roleLabel`.
3. Confirm a wrong-role or wrong-scope account is **denied** the roster/session.
4. Record pass/deny per role with the exact route and HTTP status.

## 5. Attendance-session smoke test

1. Park Lead opens the assigned park workspace; Murabbi opens only their own group.
2. Select the real scheduled session date; confirm the displayed park/group/date.
3. Mark a small agreed practice subset as Present, Absent, Late, Excuse; wait for
   confirmation; refresh once and confirm the saved state persists without duplication.
4. Confirm a non-scheduled date and an out-of-scope group are refused.
5. Close the session; confirm marks can no longer change; reopen with a reason and
   confirm a correction is audited.
6. If a reset is authorized, reset only the practice session and confirm the result.
7. Confirm that closing a session never marks a student as dropout, and that Call /
   WhatsApp controls appear only for absent students.
8. Record the session date, park, group, roles and outcome in the pilot log.

## 6. Rollback decision points and commands

Stop digital marking and use the manual attendance fallback when: a roster is wrong
or from another scope; any scope leak; a mark does not save, duplicates or changes
after refresh; the session date is wrong; offline status cannot be confirmed; or a
login/role assignment blocks attendance.

Rollback actions by layer:

- **Data write (import/provisioning):** the guarded tools restore their verified
  pre-write backup automatically on failure. If a restore itself fails they raise
  `RollbackFailedError` and the target must be treated as **partially modified**,
  not assumed good. Manual: copy the pre-run backup over the target, then re-run
  the post-import verification.
- **Migration:** restore the full dump; for a partial failure use
  `npx prisma migrate resolve --rolled-back <migration>` only after confirming the
  partial state. No forward migration in this set has inverse DDL.
- **Application (no data change):** redeploy the previous build; no database action.
- Rollback is complete only when integrity checks pass and the reconciliation
  returns to the pre-pilot state.

## 7. Post-pilot reconciliation

1. Re-run the read-only reconciliation:
   `node scripts/att01-workbook-reconciliation.ts --input <workbook> --database <db>`
   and archive its JSON output.
2. Confirm imported totals (6 parks / 18 groups / 339 participants / 460 events /
   6,210 records / 74 dates) unchanged, and record pilot-session deltas
   (extra prepared sessions, operator marks, resets, receipts) as an attributed
   pilot delta — never as an import error.
3. Use only aggregate counts, deterministic hashes/IDs and mismatch categories;
   keep private rows and credentials out of reports and packets.
4. Classify every issue by the pilot plan's priority rules, assign an owner, and
   require a regression test before calling it resolved.
5. Decide: proceed, proceed with limits, pause affected parks, or stop pilot.

## Not performed

This runbook was drafted, not run. No production backup, migration, import,
provisioning, deployment, password handling or pilot session occurred. No
passwords or private source rows are included. No production, deployment or
release readiness is claimed.
