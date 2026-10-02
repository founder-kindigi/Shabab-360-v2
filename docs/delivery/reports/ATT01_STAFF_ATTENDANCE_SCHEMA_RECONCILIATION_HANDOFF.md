# ATT01 local staff-attendance schema reconciliation — candidate handoff

Date: 2026-09-16. Task: ATT01 (active). Scope: bounded local compatibility fix.
Status: **candidate ready for Astra review**. Not production readiness, not
migration-history repair, not deployment or release approval.

## Problem this candidate solves

The application and `prisma/schema.prisma` use `park_staff_attendance_events` and
`park_staff_attendance_records`. The refreshed local SQLite database in
`prisma/dev.db` does not have them: it carries the older, empty
`staff_attendance_events` / `staff_attendance_records` pair instead. Prisma
migration history cannot be used to close that gap (17 of 18 SQLite migrations are
pending and unrecorded, the chain is not replayable, and an ordered apply fails on
its first statement — see
`docs/delivery/reports/SQLITE_MIGRATION_HISTORY_RECONCILIATION_2026-09-15.md`).

This candidate adds only the missing canonical tables and indexes, without
touching migration history and without changing the legacy tables.

## Reconciliation contract

- **Source of truth**: migration `20260810193000_add_park_staff_attendance` plus the
  current `prisma/schema.prisma` mapping (`@@map("park_staff_attendance_events")`,
  `@@map("park_staff_attendance_records")`, column `staffId`). The retained
  migration file is parsed in the test suite and compared field by field against
  the contract constants, so the two cannot silently drift apart.
- **Creates**: the two canonical tables with their three foreign keys
  (`parkId -> parks`, `eventId -> park_staff_attendance_events`, `staffId -> staff_meta`,
  all `ON DELETE CASCADE ON UPDATE CASCADE`) and six indexes (three unique-or-plain
  per table), exactly as the migration declares them.
- **Never creates, copies, drops, renames or alters** the legacy
  `staff_attendance_*` tables. Their lineage is unresolved and they hold no rows.
- **Never alters an existing canonical table.** If a canonical table is present but
  its columns, nullability, defaults or foreign keys do not match, the run is
  refused and reported as a blocker for review instead of being silently widened.
  A missing *index* on a correctly shaped table is added.
- **Prerequisites**: `parks` and `staff_meta` must already exist, otherwise the run
  refuses and reports which one is missing.
- **Fail-closed self-check**: the plan asserts that no statement it will execute
  references a legacy table name.

## Safety behaviour

- Read-only by default. The default mode opens the database with
  `{ readOnly: true }` and prints an aggregate, schema-only preflight.
- `--execute` additionally requires `--backup-dir`. It takes a verified file-level
  backup (`integrity_check` must be `ok`) before writing.
- All statements run inside one transaction; a failing statement rolls the whole
  batch back.
- After a successful apply the tool re-reads the preflight, requires `upToDate` and
  requires `PRAGMA foreign_key_check` to be empty; otherwise it restores the
  pre-apply backup automatically and throws.
- Idempotent: a second run reports `appliedStatements: 0`, takes no backup and
  leaves the file byte-identical.

## Files

New:
- `src/lib/attendance/sqlite-support.ts` — shared SQLite primitives (open, list
  tables, file-level backup, backup verification, restore, foreign-key violations)
- `src/lib/attendance/park-staff-attendance-schema.ts` — canonical contract,
  planner, legacy-preservation self-check, preflight summariser (pure)
- `src/lib/attendance/park-staff-attendance-schema.test.ts` — 13 tests
- `src/lib/attendance/park-staff-attendance-reconcile.ts` — catalog reader, read-only
  preflight, backup-gated applier, rollback
- `src/lib/attendance/park-staff-attendance-reconcile.test.ts` — 10 tests
- `scripts/reconcile-park-staff-attendance.ts` + `-impl.ts` — guarded CLI

Modified:
- `src/lib/attendance/lahore-refresh/reset-plan.ts` — the reset plan now clears
  **both** staff-attendance families (`park_staff_attendance_records`,
  `park_staff_attendance_events` added alongside the legacy pair) and its header
  comment states both are cleared but neither is created or dropped.
- `src/lib/attendance/lahore-refresh/reset-plan.test.ts` — expectations updated to
  the two-family contract, plus a case proving a legacy-only database is still
  acceptable.
- `src/lib/attendance/lahore-refresh/sqlite-driver.ts` — now consumes the shared
  backup/restore helpers instead of duplicating them. Behaviour-preserving: the
  backup filename pattern, the backup verification (integrity plus the
  `users`/`participants`/`_prisma_migrations` probes) and the exported names
  `openRefreshDatabase`, `createSqliteBackup`, `verifySqliteBackup`,
  `restoreSqliteBackup`, `listSqliteTables` are unchanged, so
  `src/lib/attendance/team-access/provision.ts` and both Lahore test files keep
  working unchanged.

No package file, Prisma schema, migration directory, generated client, workbook,
`.env`, UI or unrelated attendance behaviour was changed.

## Evidence

| Command | Exit | Result |
| --- | --- | --- |
| `npx vitest run src/lib/attendance/park-staff-attendance-schema.test.ts src/lib/attendance/park-staff-attendance-reconcile.test.ts` | 0 | 2 files, **23 tests passed** (13 + 10) |
| `npx vitest run src/lib/attendance/lahore-refresh src/lib/attendance/park-staff-attendance-schema.test.ts src/lib/attendance/park-staff-attendance-reconcile.test.ts` | 0 | 12 files, **70 tests passed** |
| `npx vitest run src/lib/attendance --exclude "**/team-access/**"` | 0 | 18 files, **101 tests passed** |
| `node scripts/reconcile-park-staff-attendance.ts --database prisma/dev.db` (read-only preflight) | 0 | `mode: read-only`, canonical tables 0/2, canonical indexes 0/6, both legacy tables present, `blocked: false`, `plannedStatements: 8`, `appliedStatements: 0`, `backup: null` |
| `npx eslint <10 changed/added files>` | 0 | clean |
| `npx tsc --noEmit` | 0 | pass |
| scoped `git diff --check` over the same 10 files | 0 | clean |

The disposable-copy proof is in the test suite, not a run against the real
database:

- the fixture and the `prisma/dev.db` copy are created under `os.tmpdir()`, and a
  guard rejects any target that resolves to `prisma/dev.db` or outside the temp
  directory (itself asserted by a test);
- the reconciliation test copies `prisma/dev.db`, reconciles the copy, then asserts
  the original's size, mtime and sha256 are unchanged;
- `dev.db` sha256 before and after every command run in this task:
  `8872908d8fc8efe21728c96f431a8d27e7f66bd0d34e249ee578d49c7a83c7c1` (unchanged);
- `SELECT COUNT(*)` of `park_staff%` objects in `prisma/dev.db` after this work: **0**
  — the real database was never reconciled.

Covered by tests: canonical tables/indexes/foreign keys created correctly; second
run makes no change and no backup; legacy rows and table SQL identical before and
after; backup created, non-empty and passes `integrity_check`; `foreign_key_check`
empty after apply; a failing statement rolls the entire batch back (no partial
table, schema fingerprint unchanged); restoring the backup returns the database to
the pre-apply state and the reconciliation can then be re-applied; a database
missing `parks`/`staff_meta` is refused before any write.

## Unrun checks and one known unrelated failure

- **Not run**: any `prisma migrate*`, `db push`, `db pull`, `prisma generate`; any
  `--execute` against `prisma/dev.db`; PostgreSQL; the production build; the full
  repository test suite.
- **Pre-existing failure in untracked work, unrelated to this diff**:
  `src/lib/attendance/team-access/provision.test.ts` expects
  `exactPlaceholderMismatches: 1` and the CLI now reports `0`. Both
  `src/lib/attendance/team-access/` and `scripts/provision-lahore-team-access.ts`
  are untracked, this candidate does not modify them, and the failing assertion
  runs the `--preflight` path, which does not touch the refactored backup helpers.
  The count is derived from the users/staff rows in `prisma/dev.db`, which the
  owner-authorized ATT01 Lahore refresh rebuilt. It needs an owner decision on the
  expectation, not a change in this candidate.

## Remaining risks

- Running `--execute` against `prisma/dev.db` is deliberately **not** part of this
  candidate. It changes a real local file and needs explicit authorization plus an
  accepted backup location.
- Adding the canonical tables does not repair migration history; the SQLite chain
  is still not replayable and `_prisma_migrations` is untouched and still
  inaccurate. `prisma migrate status` will keep reporting the same 17 pending
  migrations.
- The legacy `staff_attendance_*` tables remain. Application code that still reads
  them (if any) will keep reading the old, empty pair; the lineage question stays
  open.
- The canonical tables are created but the local database still lacks other
  artifacts the application expects (for example `attendance_events.resetVersion`),
  so this candidate does not make the local attendance feature complete.
- Backup, restore and rollback were verified on disposable copies only; the
  Node `readOnly` handle and `node:sqlite` backup primitive are the same ones used
  by the existing Lahore tooling.

## Suggested review checklist for Astra

1. Confirm the contract constants in `park-staff-attendance-schema.ts` match
   migration `20260810193000_add_park_staff_attendance` and `prisma/schema.prisma`.
2. Confirm the guard order in `reconcileStaffAttendanceSchema`: blockers first, then
   dry-run, then backup, then apply, then post-apply verification, then restore on
   failure.
3. Confirm `reset-plan.ts` clears both families without creating or dropping either.
4. Confirm no test can reach `prisma/dev.db` and that the sha256 above is still
   current.
5. Decide whether the `team-access` expectation above is in scope for a separate
   correction.

No self-approval, merge, deployment or release is claimed.
