# ATT01-R01 data diagnostic — workbook participant over-import

Date: 2026-09-17. Task: ATT01-R01 (backend/parser repair). Mode: **read-only**.
No database was read, reset, imported, backed up, or changed by this diagnostic.

## Finding

The workbook parser read each group's seven summary rows as unnumbered students.
`readParkSheet` keeps rows without an integer serial when the row carries a name
under an explicit group and has a phone, age, grade, or attendance cell. Each
summary row carries a value in the phone column, so it satisfied that test and
became a participant (and only a participant: it produced no attendance record).

Group summary labels confirmed in the source workbook, 18 groups each:
`Present`, `Absent`, `Late`, `Leave`, `Total Present`, `Attendance Percentage`,
`Strength` — 7 labels × 18 groups = **126** phantom participants.

The parser now treats those labels as reserved summary/header input
(`NON_PARTICIPANT_LABELS` / `isNonParticipantLabel` in
`src/lib/attendance/lahore-refresh/workbook.ts`), so they cannot produce a
participant or an attendance record. Per Astra review P2, the rule is applied
only to rows without a valid roster serial: a numbered row is always a real
participant, even when its name matches one of those labels. The read-only dry
run still reports 339 participants after that scoping, so the accepted diagnosis
is unchanged.

## Aggregate-only counts, before and after the parser correction

Source: read-only dry run of `scripts/lahore-batch-4-refresh.ts` over
`docs/sheets/Shabab_Batch_4_Attendance.xlsx` (`mode: dry-run`,
`writesPerformed: false`). No names, phones, emails, or source rows are recorded
here.

| Count | Before | After |
| --- | --- | --- |
| Parks | 6 | 6 |
| Groups | 18 | 18 |
| **Participants** | **465** | **339** |
| Staff placeholders | 67 | 67 |
| Attendance events | 460 | 460 |
| Attendance records | 6,210 | 6,210 |
| Calendar dates | 74 | 74 |
| Historical / future calendar dates | 34 / 40 | 34 / 40 |
| Participants missing phone | 127 | 127 |
| Participants with dropout | 108 | 108 |
| Status totals (present/absent/late/excused) | 1,626 / 2,570 / 1,346 / 668 | 1,626 / 2,570 / 1,346 / 668 |

Delta: **−126 participants**, exactly the 126 summary rows. Every other aggregate
is unchanged, including all 6,210 attendance records, so the phantom rows added
no attendance evidence — only phantom participant identities.

## Current local database state (aggregate only, not re-verified here)

The authorized 2026-09-16 local `prisma/dev.db` refresh ran with the pre-fix
parser, so that local database is expected to hold the same 126 phantom
participants. This was **not** re-measured in this task and no local database was
opened; the statement is an inference from the parser behavior plus the verified
local totals in `.agents/memory/current.md`.

## Proposed local repair mechanism (owner-executed, not performed here)

A re-run of the existing guarded refresh would rebuild the local dataset with the
corrected parser and remove the 126 phantom participants. It remains a
destructive, Astra-reviewed, backup-gated, owner-executed operation.

1. Dry run first (read-only, aggregate only):
   `node scripts/lahore-batch-4-refresh.ts --input docs/sheets/Shabab_Batch_4_Attendance.xlsx --output <dir>`
   Confirm the reported participants count is **339** before considering a write.
2. Owner-authorized execution:
   `node scripts/lahore-batch-4-refresh.ts --input <workbook> --execute --confirm-lahore-refresh --target sqlite --sqlite-path prisma/dev.db --backup-dir <dir>`
3. The run resets application data while preserving Super Admin identity, imports
   the corrected manifest, and verifies the post-import totals. PostgreSQL live
   targets remain blocked: no verified full-dump mechanism is wired, so a live
   repair cannot run in this pass.

## Backup and rollback steps

- The runner plans and takes a **verified** SQLite file-copy backup before any
  reset (`createBackup` → `verifyBackup`), and only then deletes data. Keep a
  fresh pre-import copy outside version control (existing local backups are under
  the ignored `tool-results/att01-local-backups/`).
- Rollback: stop, restore the verified pre-reset backup (`restoreBackup`), then
  re-run the post-import verification and confirm the pre-repair totals. If the
  restore itself fails, the runner raises `RollbackFailedError` and the target
  must be treated as partially modified rather than assumed good.
- Do not delete the pre-import backup until the post-import verification passes
  and the owner accepts the totals.

## No database was changed

No reset, import, backup, restore, migration, schema change, or write of any kind
was executed against `prisma/dev.db`, PostgreSQL, or any other database. The only
execution was a read-only workbook parse whose output is the aggregate counts
above.
