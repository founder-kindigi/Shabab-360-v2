# ATT01-R05 — attendance receipt schema compatibility

Owner: Astra. Module: ATT01. Status: ready. Base: current `v2` shared working tree; preserve unrelated changes.

## Confirmed defect

`applyAttendanceMutation` implements durable, actor-bound idempotency through raw reads/writes to `operation_receipts`. Both Prisma schemas model this table, but the rebuilt local SQLite database lacks it. The raw receipt query throws and the catch path returns `PROCESSING_ERROR` / **Mark was not acknowledged. Retry with the same mutation identifier.**

## Outcome

Restore the missing receipt table through aligned SQLite and PostgreSQL forward migrations, migrate the local SQLite database with a backup, and prove that an attendance mark completes, replays idempotently, and fails safely when its receipt differs.

## Boundaries

- Do not weaken receipt idempotency, remove the actor-bound hash, or turn failures into unconditional success.
- Do not edit generated Prisma clients.
- Preserve scope, batch calendar, lifecycle, optimistic-version, audit, and offline-sync rules.
- Use a verified local backup before migration. Do not access or modify PostgreSQL/live.

## Required checks

1. Add the compatible table migration for SQLite and PostgreSQL matching the existing `OperationReceipt` models.
2. Add focused migration/schema and `applyAttendanceMutation` coverage against a disposable SQLite database.
3. Apply only the new migration to local SQLite after a verified backup, then verify the table exists.
4. Mark a real scheduled-session participant locally using the API/test path; verify a replay with the same mutation id returns the stored acknowledgement and creates one record/audit entry.
5. Run focused attendance tests, migration/schema checks, lint, typecheck, `git diff --check`, and appropriate SQLite/PostgreSQL migration validation.

## Return

Exact migration names, data/rollback impact, backup path, tests/results, local verification, and remaining limits. No live deployment or release claim.
