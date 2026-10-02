# ATT01-R05 status — attendance receipt compatibility

Date: 2026-09-17. Local status: repaired through a backup-gated compatibility operation; migration replay remains blocked by pre-existing ledger drift.

## Confirmed cause

The local SQLite file contained `attendance_events` and `attendance_records`, but lacked `operation_receipts`. `applyAttendanceMutation` reads that table before marking a record, so SQLite threw and the client received `PROCESSING_ERROR` / “Mark was not acknowledged.”

## Local repair

- A fresh local database backup was created at `tool-results/att01-local-backups/pre-operation-receipts-20260917-190033.db`.
- The empty `operation_receipts` table was added locally with the model-required `id`, `requestHash`, `resultJson`, and `createdAt` columns. No attendance record, participant, staff assignment, or password data was changed.
- Future reset plans now clear receipt rows, preventing stale acknowledgements after an import.

## Migration state

Aligned forward SQLite/PostgreSQL migration files were added. A disposable `prisma migrate deploy` cannot currently validate them because the copied local database's existing migration ledger omits already-present historical tables; Prisma aborts at `20260723160000_add_student_extended_profile` before reaching this new migration. No live/PostgreSQL migration was attempted.

## Verification

- Focused attendance/sync/reset-plan suite: 42 tests passed.
- Local table contract verified after the repair.
- R03's 49-test refresh suite and backup-gated rebuild remain passing evidence.

## Remaining work

- Browser confirmation that the same queued attendance mark is accepted after refresh.
- A separate migration-ledger reconciliation before relying on `prisma migrate deploy` for the local file or any production database.
- ATT01-R06 repairs Super Admin analytics controls and changes operator wording to **Excuse**.
