# Astra review — M01 production migration preflight

Review date: 2026-09-15  
Scope: `src/lib/migrations/production-preflight.ts` and its focused tests.  
Outcome: **corrections required; do not use this candidate to approve a production migration.**

## Evidence reviewed

- Read the M01 task, the candidate source and all 11 focused tests.
- Re-ran `npx vitest run src/lib/migrations/production-preflight.test.ts`: 1 file, 11 tests passed.
- Re-ran `git diff --check -- src/lib/migrations`: passed with no scoped output.
- Read the pending PostgreSQL migrations, including `20260909030000_restore_modeled_tables`, `20260909040000_active_city_batch`, and `20260909050000_align_modeled_constraints`.

The implementation is parameter-free and issues only `SELECT` statements. It returns aggregate counts and schema-presence flags only. It does not open a connection or read environment files.

## Findings

### P1 — readiness can never become true before the pending migration set is deployed

`REQUIRED_SCHEMA_ARTIFACTS` includes `operation_receipts` and `login_attempt_windows` in [production-preflight.ts](../../../src/lib/migrations/production-preflight.ts). Those tables are created by pending staged migrations. A pre-deployment readiness check therefore reports them missing and blocks every legitimate future deployment, even after the data guards are corrected.

Split artifacts into (a) prerequisites that must exist before the remaining migration sequence and (b) post-deploy verification targets. Only missing prerequisites may make the pre-deployment `ready` verdict false. Add a synthetic test showing a clear pre-deploy baseline can be ready while post-deploy targets are absent.

### P1 — the modeled-tables migration has no collision or profile-key preflight

`20260909030000_restore_modeled_tables` contains unconditional `CREATE TABLE` statements and adds a primary key to `student_extended_profiles`. Existing target tables would cause a deployment failure; duplicate or null profile IDs would cause the primary-key statement to fail. The candidate checks neither condition.

Add aggregate, read-only checks for pre-existing tables that this migration will create and for the `student_extended_profiles` primary-key preconditions. Report counts/booleans only, with distinct actionable blockers. Do not return table rows or profile values.

### P2 — count extraction depends on property ordering

`readCount` reads the first value from an arbitrary object. A driver row with an unrelated first numeric field could be accepted as the count. Alias every aggregate as a stable field such as `"count"`, model the returned row shape narrowly, and fail closed when that field is absent or invalid. Add coverage for a row that contains an unrelated numeric property but no count field.

### P3 — singular wording

The blocker says `1 cities have ...`. Use singular/plural wording so the operational report reads correctly.

## Limits

This is a source-and-synthetic-test review only. No database, environment file, production query, data migration, backup, deployment, API, or UI work was performed. The known owner-decision blocker remains: the 12 unassigned participants require approved dispositions before `participants.groupId` may become mandatory.

## Correction re-review — 2026-09-15

DeepSeek resolved the four findings above. I re-read the changed helper and all 17 focused tests, and re-ran `npx vitest run src/lib/migrations/production-preflight.test.ts`: 1 file, 17 tests passed. Scoped `git diff --check -- src/lib/migrations` also passed.

One release-critical gap remains.

### P1 — the preflight can report ready although later pending migrations will fail

M01 is a readiness check for the remaining migration sequence, but the implementation only collision-checks the tables created by `20260909030000_restore_modeled_tables`. It does not guard these unconditional later operations:

- `20260909020000_operation_receipts`: `CREATE TABLE "operation_receipts"` fails when the table already exists.
- `20260909060000_align_modeled_indexes`: its two `CREATE INDEX` statements fail when either index already exists.
- `20260909070000_attendance_reset_version`: `ADD COLUMN "resetVersion"` fails when that column already exists.
- `20260909050000_align_modeled_constraints`: its foreign-key additions can fail on orphaned references. The current check only covers `participants.groupId IS NULL`; it does not count non-null group IDs without a matching group, admission conversion IDs without a participant, or park lesson/routine references without a park.

Also, the profile-key queries reject without a named diagnostic if `student_extended_profiles` is absent. Treat that table as an explicit pre-deployment prerequisite, then run its key-condition queries only after its presence is confirmed.

The code must remain read-only, aggregate-only and fail-closed. This finding blocks acceptance and any future production migration approval.

## Correction re-review 02 — 2026-09-15

DeepSeek added the requested operation-receipts, index, reset-column, foreign-key, and profile-table checks. The focused synthetic suite now has 19 passing tests. The implementation remains parameter-free and read-only.

### P1 — a clear verdict still does not cover the full remaining migration sequence

The current clear-baseline test can report `ready: true` while essential source tables are absent and several unconditional DDL operations in the remaining sequence would fail. This is not only a theoretical issue: `runMigrationReadinessPreflight` runs the participant/batch/park guards before prerequisite probes, so a missing source table causes a generic query error rather than a named blocker.

The missing coverage includes:

- `20260909040000_active_city_batch`: the `batches_one_active_city` index plus two functions and two triggers are created unconditionally.
- `20260909050000_align_modeled_constraints`: `feeAmount`, `hasConsent`, `hasMedical`, and `checkedInAt` are added unconditionally. The migration also requires its altered tables/columns to exist.
- Source tables needed by the existing checks, including `admission_applications`, `park_lessons`, `park_routine_slots`, `batch_settings`, `event_registrations`, `park_staff_attendance_records`, and `attendance_events`, are not all prerequisites.

Make all prerequisite/source presence checks run before every data query. A missing prerequisite must yield a named, aggregate-only blocker and suppress dependent checks. Add collision checks for every unconditional pending migration object, including the items above, using the PostgreSQL catalogs where appropriate. Extend parity tests to derive and cover these operations, not a hand-maintained partial subset.

This P1 blocks M01 acceptance and production-migration approval.

## Final implementation review — 2026-09-15

**Outcome: accepted for the local read-only preflight implementation; M01 is blocked for the owner and production gates.**

The final candidate adds the named `student_extended_profiles_pkey` catalog collision check in the migration-300 group, reports a distinct blocker when it exists, and preserves a clear clean-baseline verdict when it does not. The parity test extracts that primary-key operation from the migration and the focused suite covers both states.

Fresh Astra evidence: `npx vitest run src/lib/migrations/production-preflight.test.ts` passed, with 1 file and 25 tests. Scoped `git diff --check -- src/lib/migrations` passed. The helper is source-reviewed as parameter-free, `SELECT`-only, aggregate-only, and fail-closed. No database, environment, production, migration, account, API, UI, or deployment action was performed in this review.

This acceptance does not approve a production query, backup, migration, release, or deployment. The known 12 unassigned participants still require owner-approved dispositions. After that, a separately authorized Astra production preflight and backup/snapshot are required before any final migration decision.

## Correction re-review 04 — 2026-09-15

DeepSeek now models the verified eight-migration order, distinguishes pre-first-migration prerequisites from sequence-created objects, and verifies the clean-baseline behavior. I re-ran `npx vitest run src/lib/migrations/production-preflight.test.ts`: 1 file, 24 tests passed. Scoped `git diff --check -- src/lib/migrations` passed.

### P1 — existing profile primary key can still abort migration 20260909030000 after a green report

`20260909030000_restore_modeled_tables` runs `ADD CONSTRAINT "student_extended_profiles_pkey" PRIMARY KEY ("id")`. The helper checks the table and its data, but not whether that named primary-key constraint already exists. A target database with the existing profile table and primary key can pass the current data checks, then abort at this statement.

Add a read-only catalog collision check for `student_extended_profiles_pkey`, with a named blocker and synthetic present/absent coverage. Do not broaden the scope beyond that concrete missing operation.

This P1 blocks M01 acceptance and production-migration approval.

## Correction re-review 03 — 2026-09-15

The latest candidate correctly probes prerequisites first, suppresses dependent checks, and covers the six migrations it names. I re-ran its focused suite: 1 file, 20 tests passed. The production migration-impact report, however, confirms that the actual post-throttle sequence has **eight** pending migrations, not six: it starts with `20260827090000_add_team_document_links` and `20260907114612_add_evaluations_lessons_planner`.

### P1 — the modeled sequence is incomplete and treats pending-created tables as prerequisites

The helper omits the two earlier pending migrations entirely. It also lists `park_lessons` and `park_routine_slots` as pre-deployment prerequisites even though `20260907114612` creates them. On a clean pre-deployment production schema they should be absent; the candidate would block instead of allowing their later foreign-key checks to be skipped because the new tables will be empty.

The next correction must model the complete ordered eight-migration sequence. It must collision-check the objects created by the two omitted migrations, distinguish artifacts required before the first pending migration from artifacts created earlier in the same pending sequence, and only run data integrity checks when their source data can pre-exist. It must also handle the two `DROP CONSTRAINT` prerequisites in `20260909050000`; absence would otherwise abort the migration despite a green report.

This P1 blocks M01 acceptance and production-migration approval.
