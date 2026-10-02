# DeepSeek packet — M01 complete-sequence readiness

Read the full M01 task, all prior Astra M01 reviews, the current helper/tests, and every pending PostgreSQL migration from `20260909020000_operation_receipts` through `20260909070000_attendance_reset_version`. Preserve unrelated work.

The preflight must not return `ready: true`, or throw a generic missing-table error, if any remaining migration will predictably fail because its source schema is absent or an object it unconditionally creates already exists.

1. Probe every prerequisite and source table/column before running guards, foreign-key checks, profile checks, or collision-dependent checks. Missing schema must produce named, aggregate-only blockers and skip dependent queries.
2. Complete collision coverage for the sequence. At minimum include the index, functions, and triggers created by `20260909040000_active_city_batch`; and `feeAmount`, `hasConsent`, `hasMedical`, and `checkedInAt` added by `20260909050000_align_modeled_constraints`. Include every other unconditional object from the six pending migrations after verifying its SQL.
3. Make all required source artifacts for `20260909050000`, `20260909060000`, and `20260909070000` explicit prerequisites, including the exact columns used by the index and alteration operations.
4. Refactor the migration-parity tests so they prove all relevant unconditional `CREATE INDEX`, `CREATE FUNCTION`, `CREATE TRIGGER`, `ADD COLUMN`, and table operations in the migration files have a matching preflight check. Avoid a manually incomplete list.
5. Add synthetic cases for missing prerequisite suppression, each new collision class, and a fully-present clear baseline. Keep all queries `SELECT` only, parameter-free, explicitly aliased `AS "count"`, and aggregate-only.

Hard limits: no `.env` read, database or production access, migration, backup, data/account/schema/API/UI/dependency/generated-client change. Run the focused suite and scoped diff check. Report exact exits and limits; do not claim production readiness or approval.
