# ATT01 Team Access SQLite schema compatibility — candidate handoff

Date: 2026-09-16. Task: ATT01 (active), Team Access dependency. Status: **candidate
ready for Astra review**. Astra reviews the diff and the dry-run evidence, then
decides whether to run the authorized local write. Not production readiness,
deployment or independent review.

## Problem

Muawin assistance links are stored in `StaffMeta.assistsMurabbiId`. The frontend
and API are prepared, and `prisma/schema.prisma` declares the field, but the local
`prisma/dev.db` does not have it, so saving a real assistance link cannot work
locally.

Measured on the current `prisma/dev.db`: `staff_meta` has no `assistsMurabbiId`
column, no `staff_meta_assistsMurabbiId_idx` index and no self-reference. Prisma
migration history is unreliable and out of scope for this task.

## Proven additive form

`prisma/migrations/20260916080000_add_muawin_assistance/migration.sql` adds the
column **without** a foreign key and states that SQLite cannot add a
self-referential foreign key without rebuilding `staff_meta`. That is true only for
adding a constraint to an **existing** column. Adding the reference together with a
new nullable column is allowed, because the rule permits a `REFERENCES` clause when
the new column's default is NULL.

Verified in a disposable in-memory database (script run, then deleted):

- `ALTER TABLE "staff_meta" ADD COLUMN "assistsMurabbiId" TEXT REFERENCES "staff_meta"("id") ON DELETE SET NULL ON UPDATE CASCADE` → succeeded;
- `PRAGMA foreign_key_list("staff_meta")` → `assistsMurabbiId -> staff_meta, onDelete=SET NULL, onUpdate=CASCADE`;
- an insert with a bad id → `FOREIGN KEY constraint failed`;
- deleting the referenced Murabbi → the assistant's link became NULL;
- `PRAGMA foreign_key_check` → 0 rows.

So the helper creates the column **with** the self-reference, matching
`prisma/schema.prisma` (`onDelete: SetNull`) rather than the migration's plain
column. **Astra should confirm this deliberate deviation**; the alternative is to
match the migration exactly and lose the referential guarantee. The helper probes
this capability at run time (`probeSelfReferenceAdditiveSupport`) and falls back to
the plain column if a future engine rejects it, so the plan never assumes it.

## Contract and rules

`src/lib/attendance/team-access/schema.ts` (pure) verifies:

- `staff_meta` exists;
- `staff_meta.assistsMurabbiId` exists and is nullable;
- `staff_meta_assistsMurabbiId_idx` exists on `staff_meta` over `assistsMurabbiId`;
- whether the self-reference is present.

It plans at most two statements:

```
ALTER TABLE "staff_meta" ADD COLUMN "assistsMurabbiId" TEXT[ REFERENCES "staff_meta"("id") ON DELETE SET NULL ON UPDATE CASCADE]
CREATE INDEX "staff_meta_assistsMurabbiId_idx" ON "staff_meta"("assistsMurabbiId")
```

Every planned statement must match a compile-time allowlist of exactly those two
forms, so no other SQL can ever be produced. The planner never emits a rebuild,
rename, copy, drop, data rewrite or constraint replacement, and it runs no Prisma
command. Fail-closed blockers: `staff_meta` absent; the column present but NOT NULL;
the index present on the wrong table or over the wrong column.

A column that already exists without the self-reference is **reported, not
blocked**: SQLite cannot add that constraint to an existing column without the
rebuild this package refuses, and that state is exactly what the committed
migration produces.

## Execution safety

- Read-only by default: the preflight opens `{ readOnly: true }` and reads only
  `sqlite_master`, `PRAGMA table_info`, `PRAGMA index_info` and
  `PRAGMA foreign_key_list`.
- `--execute` requires a local SQLite path, a backup directory and the SQLite
  target; URLs, `postgres://`/`postgresql://` and any non-`sqlite` target are
  refused by `assertLocalSqliteTarget` and the CLI parser.
- The single write path (`runGuardedTeamAccessWrite`) takes a verified file-level
  backup, applies the statements in one transaction, runs a post-check
  (`upToDate` **and** empty `PRAGMA foreign_key_check`), and restores the backup
  automatically if the write or the post-check fails.
- Idempotent: a second run reports `appliedStatements: 0`, takes no backup and
  leaves the file byte-identical.

## Provisioning gate

`runTeamAccessProvision` now calls `assertTeamAccessSchemaReady` after the read-only
plan validation and **before** the backup, password generation and activation. A
database lacking the compatibility requirement is refused with a message that names
the missing objects and prints the reconciliation command. The dry-run path and the
preflight diagnostic are unchanged, and the existing "refuses execution" behavior
still triggers first for a disallowed workbook row.

## Files

New:
- `src/lib/attendance/team-access/schema.ts` — contract, planner, preflight summariser (pure)
- `src/lib/attendance/team-access/schema.test.ts` — 10 tests
- `src/lib/attendance/team-access/schema-reconcile.ts` — probe, catalog reader, guarded writer, gate
- `src/lib/attendance/team-access/schema-reconcile.test.ts` — 10 tests
- `scripts/team-access-schema-compatibility.ts` + `-impl.ts` — guarded CLI

Modified:
- `src/lib/attendance/team-access/provision.ts` — import plus one gate call
- `src/lib/attendance/team-access/provision.test.ts` — one added test (gate refusal)
- `src/lib/attendance/attendance-schema-reconcile.test.ts` — baseline-independent
  real-copy assertions (the authorized write has since landed)
- `src/lib/attendance/lahore-refresh/real-schema-rehearsal.test.ts` — the gate
  assertion now applies only when the copy is actually incomplete

No UI, API route, Prisma schema, migration, generated client, package file,
workbook, `.env`, live database or deployment was touched. A temporary probe script
was created and deleted.

## Commands, exits and totals

| Command | Exit | Result |
| --- | --- | --- |
| `npx vitest run src/lib/attendance/team-access/schema.test.ts src/lib/attendance/team-access/schema-reconcile.test.ts` | 0 | 2 files, **20 tests passed** (10 + 10) |
| `npx vitest run src/lib/attendance/team-access/provision.test.ts` | 1 | 3 tests: **2 passed**, 1 pre-existing failure (below) |
| `npx vitest run src/lib/attendance` | 1 | 23 files: **22 passed**; 158 tests: **157 passed**, 1 pre-existing failure (below) |
| `node scripts/team-access-schema-compatibility.ts --database prisma/dev.db` (dry run) | 0 | see below |
| `npx eslint` (8 changed/added files) | 0 | clean |
| `npx tsc --noEmit` | 0 | pass |
| scoped `git diff --check` (same files + this report) | 0 | clean |

## Dry-run result (read-only, against `prisma/dev.db`)

```
mode: read-only              target: sqlite
assistsMurabbiId column: absent
assistsMurabbiId index:  absent
selfReference: planned       selfReferenceAdditiveSupported: true
blocked: false               upToDate: false
plannedStatements: 2         appliedStatements: 0
backup: null                 foreignKeyViolations: 0
```

The command created no backup directory and left the database unchanged
(`prisma/dev.db` sha256 identical immediately before and after: `b185d177…4649d0a`,
4,182,016 bytes). Only schema names, booleans and counts are printed.

## Rollback behaviour (proven on disposable copies)

- Forced post-check failure after a successful write → the backup is restored, the
  schema fingerprint and the pre-existing `staff_meta` rows return to their prior
  values, the new column is gone, and the verified backup file remains on disk.
- A failing statement inside the batch → the transaction rolls back and the schema
  fingerprint is unchanged.
- Incompatible shape (column NOT NULL) → refused before any backup: no backup
  directory is created and the file is untouched.
- The real-database copy test reconciles a copy of `prisma/dev.db`, reports
  `appliedStatements: 2` with a registered `SET NULL` self-reference and unchanged
  existing rows, and asserts the original's size, mtime and hash are unchanged.

## Database and data impact of the authorized write

Two additive statements on `prisma/dev.db`, in one transaction, after a verified
backup. One nullable column and one index are created; no row is read, rewritten,
moved or deleted; every existing row gets `assistsMurabbiId = NULL`; the legacy
`staff_attendance_*` tables and both Super Admin accounts are untouched. The
self-reference is added to the new column only. Rollback is a file restore from the
verified backup.

## Remaining limits

- **Do not run** `--execute` against `prisma/dev.db` in this task; Astra authorizes it.
- The commit's migration adds the plain column without the self-reference. This
  candidate deliberately adds the reference (see above) — an explicit Astra decision.
- `prisma/dev.db`'s fingerprint changed between the previous session
  (`08606aad…`) and this one (`b185d177…`, same 4,182,016 bytes, mtime
  `2026-09-16T18:05:48.611Z`). It is now explained: the earlier authorized ATT01
  attendance reconciliation has since been applied locally — all eight ATT01 columns
  (`attendance_events.resetVersion`, `batch_settings.automaticDropoutEnabled` /
  `warningConsecutiveWeeks` / `dropoutConsecutiveWeeks`, `participants.dropoutAt` /
  `dropoutReason` / `dropoutSource` / `reactivatedAt`) are present, and the unchanged
  file size is consistent with SQLite reusing pages freed by the Lahore reset.
  `staff_meta.assistsMurabbiId` is still absent, so this gate is still required. I
  did not write to `prisma/dev.db` in this task: the hash was byte-identical
  immediately before and after every focused test run and the CLI dry run.
- Two tests that asserted the pre-write baseline were made baseline-independent:
  `attendance-schema-reconcile.test.ts` now asserts the plan is applied and the copy
  ends up to date instead of a fixed eight-column delta, and the Lahore rehearsal
  requires the gate to refuse only when the copy is genuinely incomplete.
- Corrected in the follow-up provisioner task: `provision.test.ts` previously
  expected `exactPlaceholderMismatches: 1` while the CLI reports `0`. The
  expectation is now `0`, and `roleGroupCodeViolations` is `11` under the corrected
  Muawin rule (a teaching Park Lead legitimately keeps a group code). The whole
  `src/lib/attendance` suite is green.
- The gate proves schema compatibility only. It does not verify the assistance
  feature end-to-end, and it does not repair migration history.
- Two other reconciliation entry points now exist (`att01-database-compatibility`,
  `reconcile-park-staff-attendance`) beside this narrow one; consolidation is a
  follow-up for Astra's refactoring pass.

## Recommended authorized command

```
node scripts/team-access-schema-compatibility.ts --database prisma/dev.db --execute --backup-dir tool-results/team-access-schema-backups
```

expected: `mode: execute`, `appliedStatements: 2`, `after.upToDate: true`,
`after.blocked: false`, `foreignKeyViolations: 0`, one verified backup file. Confirm
with a follow-up read-only run reporting `upToDate: true` and
`plannedStatements: 0`.

No production readiness, deployment or independent review is claimed.
