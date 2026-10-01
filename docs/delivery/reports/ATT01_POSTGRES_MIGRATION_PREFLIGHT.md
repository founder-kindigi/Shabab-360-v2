# ATT01 PostgreSQL migration compatibility preflight

Date: 2026-09-18. Task: ATT01 release preparation, Phase C (release gate 3 —
PostgreSQL migration-history compatibility preflight). Mode: **read-only**.

No operational PostgreSQL database was contacted. No migration, `migrate resolve`,
`migrate deploy`, `db push` or `prisma generate` was run. No production/`.env`
credential was read.

## 1. Exact migration-count / history mismatch evidence

Chain sizes now on disk:

| Chain | Migration folders | Release assertion | Drift |
| --- | ---: | ---: | ---: |
| SQLite `prisma/migrations` | **19** | 17 | +2 |
| PostgreSQL `prisma/postgres/migrations` | **33** | 31 | +2 |

The two extra folders are the untracked ATT01 migrations, present in both chains:

- `20260916080000_add_muawin_assistance`
- `20260917193000_add_operation_receipts`

Resulting known-failing assertions (expected once the two folders exist, before
the count assertions are updated in the same commit):

- `src/__tests__/release/pilot-production-health.test.ts` — "POSTGRES has 31
  migration folders", "SQLITE has 17 migration folders"
- `src/__tests__/release/master-production-signoff.test.ts` — 31 / 17
- `src/__tests__/release/staging-smoke.test.ts` — 31

SQLite runtime history (`node scripts/sqlite-migration-catalog-audit.ts`, exit 0):

- `_prisma_migrations` records exactly **1** migration:
  `20260909010000_login_throttle` (finished, none rolled back).
- **18 pending** migrations (19 − 1 recorded).
- Catalog: 72 tables, 134 indexes, **0 triggers**.

Pending classification (fresh run): **11 structurally-represented, 2
partially-represented, 5 structurally-missing**. Remaining structurally-missing are
`20260725120000_add_login_attempts`, `20260729081417_add_media_briefs`,
`20260803100000_add_event_fee_schedules`, `20260827090000_add_team_document_links`,
and `20260909040000_active_city_batch` (its `batches_one_active_city` index and four
city triggers). Partially-represented remain `20260730060714_add_attendance_foundation`
(`participants.groupId` still `NOT NULL`; `batch_off_*` and
`attendance_roster_snapshots` absent; `staff_attendance_records.staffId` absent) and
`20260803090000_add_event_registrations`.

## 2. Chain-internal replay conflicts

`sqlite-migration-catalog-audit.ts` reports three duplicate-artifact conflicts:

| Kind | Artifact | Migrations |
| --- | --- | --- |
| column | `batch_settings.automaticDropoutEnabled` | `20260730060714`, `20260817120000` (pre-existing) |
| column | `batch_settings.dropoutConsecutiveWeeks` | `20260730060714`, `20260817120000` (pre-existing) |
| **table** | **`operation_receipts`** | **`20260909020000_operation_receipts`, `20260917193000_add_operation_receipts` (NEW)** |

The `operation_receipts` conflict is new and was introduced by the ATT01-R05
receipt migration. Both PostgreSQL files execute a bare
`CREATE TABLE "operation_receipts" (…)` with no `IF NOT EXISTS`
(`prisma/postgres/migrations/20260909020000_operation_receipts/migration.sql` and
`…/20260917193000_add_operation_receipts/migration.sql` are byte-similar). Applying
the chain in order makes the second one fail with "relation already exists".

Replay probes (`scripts/sqlite-migration-replay-probe.ts`, exit 0, disposable only):

- `--mode empty` (in-memory, all migrations): 5 succeed, then
  `20260730060714_add_attendance_foundation` fails with
  `no such table: batch_settings` → the SQLite chain has **no baseline migration**
  and cannot rebuild from empty.
- `--mode existing` (temp copy of `prisma/dev.db`): fails immediately at
  `20260723160000_add_student_extended_profile` with
  `table "student_extended_profiles" already exists` → the chain cannot be replayed
  forward against the current database either.

## 3. Can a disposable replay be run safely, without environment secrets?

In principle **yes**, and it is the correct preflight vehicle:

- The historical harness `docs/reviews/v2-audit-2026-09-08/start-disposable-postgres.sh`
  creates a throwaway PostgreSQL 18 cluster in a `mktemp` data directory under
  `/tmp`, with `--auth=trust` on `127.0.0.1:54391`, and no secret or operational
  connection string; `stop-disposable-postgres.sh` refuses to stop anything whose
  real path is not `/tmp/shabab-astra-postgres-*`.
- `docs/reviews/v2-audit-2026-09-08/verify-postgres-migrations.mjs` replays the
  migration chain into PGlite (WASM) and diffs columns/constraints/indexes/enums
  against `prisma/postgres/schema.prisma`, also without a live database.

**But it was not run here and is not currently wired:** `.next/astra-native-postgres/runtime`
and `.next/astra-pg-runtime` are absent, and `psql` is not on PATH (WSL is
available). The harness lives under a dated review folder, not in `scripts/`. So
phase 3's "disposable replay" step remains **unproven for the new migration set**
until the runtime is re-provisioned. This is a blocker, not a passed check.

Therefore a fresh disposable PostgreSQL replay of the full chain would currently
**fail** at `20260917193000_add_operation_receipts` for the duplicate-table reason
above — before any operational question is reached.

## 4. Production preflight is stale for the new migrations

`src/lib/migrations/production-preflight.ts` (M01) models exactly **8** pending
PostgreSQL migrations, ending at `20260909070000_attendance_reset_version`, and its
test asserts that exact ordered list (`COLLISION_CHECKS_BY_MIGRATION` length 8).
The two new ATT01 migrations are **not modelled**, so the preflight no longer
covers the full pending sequence. It also still treats `operation_receipts` as a
single-migration collision check.

## 5. Required preflight checks before any production migration

1. `npx prisma migrate status --schema prisma/postgres/schema.prisma` against the
   intended target (owner-run, credentials never shared) — recorded verbatim.
2. Read-only aggregate readiness via `runMigrationReadinessPreflight` after it is
   extended to the 10-migration pending set.
3. Collision preflight for every unconditionally created object, including the
   duplicate `operation_receipts` question — a clean baseline must have them absent.
4. Guard counts must all be zero: batch/park city conflicts, cities with multiple
   active batches, participant group orphans, admission converted-participant
   orphans, park lesson/slot orphans, and `student_extended_profiles` null/duplicate
   ids.
5. Confirm the 12 production participants with a null `groupId` remain a supported
   state (they are test data and must stay unassigned — no guesswork placement).
6. Confirm `prisma/schema.prisma` and `prisma/postgres/schema.prisma` still align
   for the new models. Verified: both declare `StaffMeta.assistsMurabbiId`
   (nullable, `onDelete: SetNull`, indexed) and `OperationReceipt`
   (`@@map("operation_receipts")`).
7. Note the deliberate provider deviation: PostgreSQL adds the self-referential FK
   for `assistsMurabbiId`; SQLite adds the plain column only (REVIEWED, documented).

## 6. Backup and rollback requirements

- Full, restorable PostgreSQL backup (e.g. `pg_dump -Fc`) of the target taken and
  its restore rehearsed on a disposable cluster **before** any migration.
- Record `_prisma_migrations` contents and `prisma migrate status` before and after.
- Migrations are forward-only here; rollback is dump restore, plus
  `prisma migrate resolve --rolled-back <name>` only for a genuinely failed partial
  apply. The `20260909040000` triggers/functions and `20260909030000` table
  restores have no inverse DDL.
- Maintenance window required: `20260909040000`, `20260909030000` and
  `20260909060000` build indexes/constraints and may lock.

## 7. Concrete blockers, owners and next commands

| # | Blocker | Owner | Next command / action |
| --- | --- | --- | --- |
| 1 | `operation_receipts` created by two migrations in both chains → fresh replay fails | Astra | Decide whether `20260917193000_add_operation_receipts` is removed or made idempotent (`IF NOT EXISTS`); it duplicates `20260909020000_operation_receipts`. Do not create a migration or edit SQL merely to reconcile counts. |
| 2 | Two new migration folders untracked; 5 release count assertions fail | Astra + owner commit | Add both folders for both providers, then update the release count assertions in the same commit. |
| 3 | M01 preflight models only 8 of the 10 pending PostgreSQL migrations | Astra | Extend `COLLISION_CHECKS_BY_MIGRATION` and the ordered-list parity test once blocker 1 is resolved. |
| 4 | Disposable PostgreSQL runtime absent; replay not proven | Astra / ops | Re-provision the ignored `.next/astra-native-postgres/runtime` (or PGlite runtime), then run `verify-postgres-migrations.mjs` and the disposable cluster. |
| 5 | SQLite chain not replayable (no baseline; duplicate `batch_settings` ADD COLUMN) | Astra | Separate owner decision; unchanged by ATT01. |
| 6 | `prisma/dev.db` tracked with live PII | Owner | Untracking approval — see the Phase B inventory. |

No production migration readiness, deployment readiness or successful live
migration is claimed. No PostgreSQL database was connected to.
