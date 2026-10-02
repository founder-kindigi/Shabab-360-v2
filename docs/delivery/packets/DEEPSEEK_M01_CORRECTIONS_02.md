# DeepSeek packet — M01 sequence-completeness corrections

Read `docs/delivery/tasks/M01.md`, the complete Astra review, the current helper/tests, and every remaining PostgreSQL migration from `20260909020000_operation_receipts` through `20260909070000_attendance_reset_version` before editing. Preserve unrelated working-tree changes.

The existing preflight may not report `ready: true` when a later migration in that sequence would predictably fail. Extend only the read-only aggregate preflight and focused synthetic tests.

1. Add an aggregate collision check for `operation_receipts` because its pending migration unconditionally creates that table. Present must be a named blocker; absent must not block.
2. Add aggregate collision checks for both indexes created by `20260909060000_align_modeled_indexes`. Existing index names must be named blockers.
3. Add an aggregate collision check for `attendance_events.resetVersion` because `20260909070000_attendance_reset_version` unconditionally adds it. Present must be a named blocker.
4. Add aggregate foreign-key readiness checks for the additions in `20260909050000_align_modeled_constraints`: non-null participant group IDs without a group; non-null admission converted-participant IDs without a participant; park lessons without a park; and park routine slots without a park. Each nonzero count needs a non-PII, distinct blocker.
5. Make `student_extended_profiles` an explicit pre-deployment prerequisite. Do not issue its profile-key queries unless the table is present; absence must produce a named blocker rather than only a query rejection.
6. Extend migration-parity tests to prove every required operation above has a matching check, along with focused success/failure tests for every new blocker. Keep all queries parameter-free `SELECT`s with explicit `AS "count"` aliases.

Hard limits: do not read `.env`, access a database or production, migrate, back up, write data, alter schema, change APIs/UI/dependencies/generated clients, or expose rows. Report exact focused-test and scoped-diff-check exits. Do not claim production readiness or approval.
