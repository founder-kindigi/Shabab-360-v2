# ATT01-R03 preflight — corrected local attendance-data rebuild

Date: 2026-09-17. Task: ATT01-R03, **preflight only**. The rebuild was **not** executed.
No database, account, schema, migration, package, or password was changed.

## Dry-run result (read-only)

Command:

```
node scripts/lahore-batch-4-refresh.ts --input docs/sheets/Shabab_Batch_4_Attendance.xlsx
```

Exit 0. Output: `mode: dry-run`, `writesPerformed: false`, `attendanceThrough: 2026-09-13`.

| Aggregate | Required | Reported |
| --- | --- | --- |
| Parks | 6 | 6 |
| Groups | 18 | 18 |
| **Participants** | **339** | **339** |
| Attendance events | 460 | 460 |
| Attendance records | 6,210 | 6,210 |
| Calendar dates | 74 | 74 |
| Historical / future calendar dates | — | 34 / 40 |
| Staff placeholders | — | 67 |
| Participants with dropout | — | 108 |
| Status totals (present/absent/late/excused) | — | 1,626 / 2,570 / 1,346 / 668 |

339 participants is the corrected count: the 126 summary-row phantoms are gone and
every other aggregate is unchanged.

## Proof that no database was written

- `prisma/dev.db` size **4,194,304 bytes** and `LastWriteTimeUtc`
  **2026-09-17T11:20:22.7255713Z** are identical before and after every dry run and
  test run in this preflight.
- No `prisma/dev.db-wal`, `dev.db-shm`, or `dev.db-journal` sidecar exists
  (count 0 before and after); `prisma/` still holds exactly 3 files.
- The dry-run path never constructs the SQLite ports or opens a database: the runner
  returns the dry-run summary before target resolution, and the refresh module,
  its dependencies, and `src/lib/timezone.ts` contain no `process.env`, `dotenv`, or
  connection-string access. The optional `--output` report is written only to the
  session scratch directory, not the repository.
- No reset, import, backup, restore, migration, or `.env` read was performed.

## Execute-path audit (guarded local SQLite)

Required preconditions, all enforced in `parseRefreshArgs` / `resolveExecutableTarget`:

- `--execute` (write mode off by default) — enforced.
- `--confirm-lahore-refresh`, valid only together with `--execute` — enforced.
- explicit `--target sqlite|postgres` — enforced.
- explicit `--sqlite-path` (no environment variable, no default) — enforced.
- explicit `--backup-dir` — enforced.

Fail-closed behavior verified:

- A connection URL as `--sqlite-path` is refused, and the refusal never echoes
  credentials.
- A **network/UNC path** (`\\host\share\…` or `//host/share/…`) is now refused; see
  the fix below.
- `--target postgres` is refused unless a verified full-dump mechanism exists, and
  the CLI refuses to wire PostgreSQL execution at all.
- `verifyTargetSchema` runs **before** the backup and opens the target read-only via
  `readAttendanceSchemaPreflight`. A missing path, a non-SQLite file, a blocked
  shape, or an incomplete attendance schema is refused before any file is created
  (confirmed with `node:sqlite`: a read-only open of a missing file throws and does
  not create it, whereas a read-write open would).
- Backup ordering: `createBackup` → `verifyBackup` (opens the copy, `PRAGMA
  integrity_check`, core tables present) → only then `resetData`. `run.test.ts`
  pins that exact call order and asserts a failed backup verification aborts before
  the reset. The reset itself refuses if the target holds an unplanned clearable
  table or a foreign-key cycle, and preserves `_prisma_migrations`, the capability
  overrides, Super Admin users, and Super Admin `staff_meta`.

### Fix applied (smallest concrete tool-safety defect)

`resolveExecutableTarget` rejected `scheme://` URLs but accepted UNC and
protocol-relative paths, so a network share could be treated as a "local" SQLite
target — contradicting the stated "fails closed on an unsafe target" guarantee and
the boundary against touching live infrastructure.

- `src/lib/attendance/lahore-refresh/guards.ts`: added `NETWORK_PATH_PATTERN =
  /^(\\\\|\/\/)/` and refuse such a `--sqlite-path` with a "must be a local file
  path" error.
- `src/lib/attendance/lahore-refresh/guards.test.ts`: focused test asserting both
  UNC and protocol-relative paths are refused while `prisma/dev.db` is still
  accepted.

No other defect was found; the remaining requirements are already enforced.

## Later owner execution (not run here)

Stop any process holding the database first (a lock on `prisma/dev.db` was observed
during this preflight).

```
node scripts/lahore-batch-4-refresh.ts --input docs/sheets/Shabab_Batch_4_Attendance.xlsx --execute --confirm-lahore-refresh --target sqlite --sqlite-path prisma/dev.db --backup-dir tool-results/att01-local-backups
```

Do not pass `--completed-through`; that override could import marks past the approved
2026-09-13 cutoff. Reconcile the ATT01 attendance schema first if the preflight
reports it incomplete (the refusal message names the command).

Backup convention: the tool creates `--backup-dir` if absent and writes a verified
full file copy named `lahore-refresh-<ISO-stamp>.db`. Use the git-ignored
`tool-results/att01-local-backups/`, and keep the copy until post-import
verification passes and the owner accepts the totals.

## Rollback

- Automatic: any failure after the verified backup (reset, import, or post-import
  verification) restores that backup over the target and rethrows. If the restore
  itself fails the runner raises `RollbackFailedError` and the database must be
  treated as partially modified rather than assumed good.
- Manual: stop every process using the file, copy the pre-run backup over
  `prisma/dev.db`, then reopen and confirm 6 parks / 18 groups / 339 participants /
  460 events / 6,210 records / 74 calendar dates and an empty
  `PRAGMA foreign_key_check`.

## Remaining risks

- The rebuild remains destructive and owner-gated; it was not executed, so the local
  database still holds the 126 phantom participants.
- The tool cannot know it is being pointed at the repository's database: it accepts
  any schema-ready **local** path. Network/UNC paths are now refused.
- `prisma/dev.db` was locked by another process during this preflight; the write run
  will fail closed if that lock is still held.
- PostgreSQL/live has no verified full-dump path wired, so no live rebuild is
  possible from this tool.
- No journal-mode configuration exists in the repository and no WAL sidecars exist
  today; if WAL is ever enabled, a restore must also clear stale `-wal`/`-shm`
  sidecars, which is not implemented.
- The real-schema rehearsal exercises the incomplete-schema refusal only when the
  copied database is not already up to date; on the current baseline that refusal is
  covered at the function level in `attendance-schema-reconcile` tests.
