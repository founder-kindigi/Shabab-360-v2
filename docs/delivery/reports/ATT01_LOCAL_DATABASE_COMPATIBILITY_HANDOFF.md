# ATT01 local database compatibility — candidate handoff

Date: 2026-09-16. Task: ATT01 (active). Scope: bounded local preflight and additive
reconciliation. Status: **candidate ready for Astra review**. Astra decides whether
to run the local reconciliation. Not database completion, production readiness,
release or deployment approval.

## Why this exists

`prisma/dev.db` now carries the canonical `park_staff_attendance_*` tables (added
by the earlier guarded staff reconciliation), but it still cannot support the
attendance behaviour the active ATT01 code requires. Prisma migration history is
unreliable and out of scope, so this package works from the current code and
`prisma/schema.prisma` instead of the historical migrations.

## Inventory (contract sources)

Model usage across `src/app/api/park/attendance/**`, `src/app/api/park/staff-attendance/**`
and `src/lib/attendance/**` (read-only count of `db.`/`tx.` call sites):

| Model | Uses | Table |
| --- | --- | --- |
| attendanceEvent | 21 | `attendance_events` |
| attendanceRecord | 7 | `attendance_records` |
| staffAttendanceEvent | 9 | `park_staff_attendance_events` |
| staffAttendanceRecord | 4 | `park_staff_attendance_records` |
| participant | 5 | `participants` |
| operationalOffDate | 2 | `operational_off_dates` |
| group / park / batch / staffMeta | 22 | shared scope tables |

Distinctive field usage: `resetVersion` 10 files, `reactivatedAt` 9, `dropoutAt` 18,
`dropoutReason` 5, `dropoutSource` 7, `automaticDropoutEnabled` 5,
`warningConsecutiveWeeks` 15, `dropoutConsecutiveWeeks` 13, `classWeekdays` 12,
`closedBy` 18, `isClosed` 32.

Declared in the Prisma SQLite schema but referenced by **no** current code
(`attendance_roster_snapshots`, `batch_off_weekdays`, `batch_off_dates`) are
**reported, not reconciled** — the preflight lists their presence so the gap is
visible rather than silently ignored.

### Measured delta on the current `prisma/dev.db`

Eight additive columns, nothing else:

```
attendance_events.resetVersion                     INTEGER NOT NULL DEFAULT 0
batch_settings.automaticDropoutEnabled             BOOLEAN NOT NULL DEFAULT true
batch_settings.warningConsecutiveWeeks             INTEGER NOT NULL DEFAULT 2
batch_settings.dropoutConsecutiveWeeks             INTEGER NOT NULL DEFAULT 3
participants.dropoutAt                             DATETIME
participants.dropoutReason                         TEXT
participants.dropoutSource                         TEXT
participants.reactivatedAt                         DATETIME
```

All 17 required indexes, all required foreign keys and the canonical staff pair
are already present, so no index or table work is planned for this database.

## Contract and reconciliation rules

- Contract module: `src/lib/attendance/attendance-schema-contract.ts`. A test
  compares every required column against the matching Prisma model (including the
  `@map("staffId")` mapping and the `?` optionality) and, for the staff pair,
  against the retained migration `20260810193000_add_park_staff_attendance`.
- Allowed and planned: create an absent table that has an authoritative
  definition; add a missing nullable column; add a missing `NOT NULL` column that
  carries a constant default; create a missing index.
- Fail closed with a blocker, never a write: a missing `NOT NULL` column without a
  default; a required column that is nullable in the database; a missing foreign
  key (SQLite cannot add one without a rebuild); an index present with the wrong
  table or uniqueness; an absent table this package has no authoritative
  definition for; a missing support table (`groups`, `participants`, `batches`,
  `cities`, `parks`, `staff_meta`).
- Never plans a drop, rename, copy, rebuild, data conversion or constraint
  replacement. A self-check asserts no planned statement names a preserved
  `staff_attendance_*` table.
- Existing columns are checked for presence and nullability only. SQL defaults on
  already-existing columns are deliberately not treated as blockers: they cannot
  be changed additively, and Prisma supplies model defaults at the application
  layer.
- The canonical staff pair keeps its accepted create-or-verify behaviour: a
  missing column there is a blocker, not an automatic add.

## Safety behaviour

- Read-only default: `readAttendanceSchemaPreflight` opens `{ readOnly: true }`
  and only reads `sqlite_master`, `PRAGMA table_info` and `PRAGMA foreign_key_list`
  for the watched tables.
- `--execute` requires `--backup-dir`; it takes a verified file-level backup
  (`integrity_check` must be `ok`), applies the statements in one transaction,
  re-runs the preflight and requires `upToDate` plus an empty
  `PRAGMA foreign_key_check`, and restores the backup automatically if anything
  fails.
- Idempotent: a second run reports `appliedStatements: 0`, no backup, and a
  byte-identical file.

## Lahore refresh change (requirement 7)

The refresh now verifies the attendance schema before it touches anything:

- `RefreshPorts.verifyTargetSchema?(target)` is optional, so existing unit fakes
  are unaffected;
- `runLahoreRefresh` calls it immediately after target resolution and **before**
  `createBackup`, so an incompatible target aborts with no backup and no write;
- `buildSqliteRefreshPorts` implements it with `assertAttendanceSchemaReady`,
  whose message names the missing objects and prints the exact
  `node scripts/att01-database-compatibility.ts …` command to run;
- the refresh never changes schema during an import.

## Files

New:
- `src/lib/attendance/attendance-schema-contract.ts` — contract, planner, preflight summariser (pure)
- `src/lib/attendance/attendance-schema-contract.test.ts` — 13 tests
- `src/lib/attendance/attendance-schema-reconcile.ts` — catalog reader, preflight, backup-gated applier, gate
- `src/lib/attendance/attendance-schema-reconcile.test.ts` — 12 tests
- `scripts/att01-database-compatibility.ts` + `-impl.ts` — guarded CLI

Modified:
- `src/lib/attendance/sqlite-support.ts` — added `countForeignKeyViolations`
- `src/lib/attendance/lahore-refresh/types.ts` — optional `verifyTargetSchema` port
- `src/lib/attendance/lahore-refresh/run.ts` — calls the gate before any write
- `src/lib/attendance/lahore-refresh/sqlite-driver.ts` — implements the gate
- `src/lib/attendance/lahore-refresh/real-schema-rehearsal.test.ts` — now proves the
  gate refuses first, then reconciles the copy before the write run

No package file, migration, generated client, workbook, `.env`, PostgreSQL, UI or
unrelated module was touched.

## Commands, exits and totals

| Command | Exit | Result |
| --- | --- | --- |
| `npx vitest run src/lib/attendance/attendance-schema-contract.test.ts src/lib/attendance/attendance-schema-reconcile.test.ts` | 0 | 2 files, **25 tests passed** (13 + 12) |
| `npx vitest run src/lib/attendance/lahore-refresh` | 0 | 10 files, **47 tests passed** |
| `npx vitest run src/lib/attendance src/app/api/park/attendance src/app/api/park/staff-attendance --exclude "**/team-access/**"` | 0 | 33 files, **206 tests passed** |
| `node scripts/att01-database-compatibility.ts --database prisma/dev.db` | 0 | `mode: read-only`, `blocked: false`, `upToDate: false`, `plannedStatements: 8`, `appliedStatements: 0`; missing columns = the eight listed above; `missingIndexes: []`; both legacy tables present |
| `npx eslint` (11 files) | 0 | clean |
| `npx tsc --noEmit` | 0 | pass |
| scoped `git diff --check` (same 11 files) | 0 | clean |

## Disposable-copy evidence

`prisma/dev.db` fingerprint before and after every command in this task:
4,182,016 bytes, `sha256 08606aadbcd709afabefb87395a2ec02bbe7ba6858f9bf215a8c0a0ffa0ffdd9`
— unchanged. `attendance_events.resetVersion` is still absent, confirming no write
reached it.

Tests copy the fixture or `prisma/dev.db` into `os.tmpdir()` and a guard rejects any
target resolving to `prisma/dev.db` or outside temp (itself asserted). Covered:

- every required ATT01 requirement is detected by the preflight (the exact eight
  missing columns, the six staff indexes, no blockers, `plannedStatements: 16` on
  the fixture);
- missing additive objects are created correctly, including column
  nullability/defaults, the canonical staff tables, their six indexes and their
  foreign keys, with existing rows preserved and the new `resetVersion` defaulted
  to `0`;
- a second run is idempotent (`appliedStatements: 0`, no backup, byte-identical);
- an incompatible shape (required `NOT NULL` column absent) is blocked before any
  write, with the schema fingerprint unchanged and no backup directory created;
- the preserved legacy `staff_attendance_*` rows and table SQL are byte-identical
  before and after;
- backup creation, `integrity_check`, empty `foreign_key_check`, backup restore to
  the pre-apply state with a successful re-apply, and full transaction rollback
  when a statement fails;
- the Lahore gate refuses an unreconciled copy (exit 1, message names the
  reconciliation CLI, no backup written) and succeeds once the copy is reconciled;
- the real `prisma/dev.db` copy reconciles to `upToDate` with
  `appliedStatements: 8` while the original's size, mtime and hash stay identical.

## Unrun checks and known unrelated items

- **Not run**: any `prisma migrate*`, `db push`, `db pull`, `prisma generate`;
  `--execute` against `prisma/dev.db`; the production build; the full repository
  suite; PostgreSQL.
- **Pre-existing, unrelated**: `src/lib/attendance/team-access/provision.test.ts`
  expects `exactPlaceholderMismatches: 1` while the CLI reports `0`. Both
  `src/lib/attendance/team-access/` and `scripts/provision-lahore-team-access.ts`
  are untracked, this candidate does not modify them, and the count derives from
  the users/staff rows in the rebuilt `prisma/dev.db`. It needs an owner
  expectation decision.
- **Out of ATT01 scope, reported**: `attendance_roster_snapshots`,
  `batch_off_weekdays`, `batch_off_dates` are absent and unreferenced. Also
  `participants.groupId` is still `NOT NULL` in the local database while
  `prisma/schema.prisma` makes it nullable; that is the U01 placement question,
  not an ATT01 requirement, and this package does not touch it.

## Risks

- Running `--execute` locally changes a real file and needs explicit authorization
  plus an accepted backup location. The eight column additions are additive and
  reversible from the verified backup, but they are still a schema change.
- Adding these columns does not repair migration history: `prisma migrate status`
  will keep reporting the same pending migrations, and the chain is still not
  replayable.
- The legacy `staff_attendance_*` tables remain, so code that reads them keeps
  reading the empty old pair.
- Reconciliation makes the local database support ATT01's fields; it does not make
  the attendance feature complete or verified end-to-end.
- Two appliers now exist: this one and the earlier staff-only
  `park-staff-attendance-reconcile.ts`. They share the backup/restore primitives in
  `sqlite-support.ts` but not the apply loop. Consolidating them is a follow-up for
  Astra's final refactoring pass, not part of this bounded candidate.

## Recommended next action for Astra

Review the diff, then, if accepted, run the local reconciliation explicitly:

```
node scripts/att01-database-compatibility.ts --database prisma/dev.db --execute --backup-dir tool-results/att01-schema-backups
```

expected result: `mode: execute`, `appliedStatements: 8`, `after.upToDate: true`,
`after.blocked: false`, `foreignKeyViolations: 0`, and a verified backup file in
the backup directory. Verify with a follow-up read-only run that reports
`upToDate: true` and `plannedStatements: 0`, and confirm the legacy
`staff_attendance_*` tables and both Super Admin accounts are unchanged.

No self-approval, merge, commit, deployment or release is claimed.
