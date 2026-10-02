# SQLite migration-history reconciliation — read-only investigation

Date: 2026-09-15. Status: **investigation only**. No migration command ran, nothing
was written to `prisma/dev.db`, `_prisma_migrations`, or any database, and no
PostgreSQL, live system, credential, or `.env` file was accessed. This document is
not a migration-readiness, release, or deployment approval.

## Subject

`prisma/dev.db` (fingerprint at inspection time: 4,161,536 bytes,
`sha256 8872908d8fc8efe21728c96f431a8d27e7f66bd0d34e249ee578d49c7a83c7c1`,
mtime 2026-09-16T14:59:53Z). Per the owner brief and `.agents/memory/current.md`,
this file was rebuilt by the owner-authorized ATT01 Lahore Batch 4 refresh.

`_prisma_migrations` records **exactly one** migration:
`20260909010000_login_throttle` (finished, not rolled back). The migrations
directory holds **18** SQLite migrations, so **17 are pending**, matching
`npx prisma migrate status`.

## Tools created (read-only, aggregate-only)

| Artifact | Purpose |
| --- | --- |
| `src/lib/migrations/sqlite-migration-catalog.ts` | Pure parser + catalog comparator, replay-conflict detector |
| `src/lib/migrations/sqlite-migration-catalog.test.ts` | 12 synthetic/disposable tests (the 25 pre-existing preflight tests are untouched) |
| `scripts/sqlite-migration-catalog-audit.ts` + `-impl.ts` | Read-only catalog diff CLI |
| `scripts/sqlite-migration-replay-probe.ts` + `-impl.ts` | Disposable replay probe (`:memory:` or temp copy) |

Every tool opens the database with `{ readOnly: true }`, issues only
`sqlite_master` and `PRAGMA table_info` reads, and returns schema object names and
counts only. The parser reports any statement it does not recognise as
`unclassified` instead of ignoring it; across all 18 migrations that list is empty.

## Evidence

Commands (all from the repository root):

```
node scripts/sqlite-migration-catalog-audit.ts        # exit 0
node scripts/sqlite-migration-replay-probe.ts --mode empty     # exit 0
node scripts/sqlite-migration-replay-probe.ts --mode existing  # exit 0
npx vitest run src/lib/migrations                     # exit 0
```

Catalog snapshot: 69 tables, 127 named indexes, **0 triggers**, 0 views.

### Classification of the 17 pending migrations

| # | Migration | Result | Represented / required |
| --- | --- | --- | --- |
| 1 | 20260723160000_add_student_extended_profile | structurally-represented | 60 / 60 |
| 2 | 20260723200000_add_events_and_calling_foundation | structurally-represented | 163 / 163 |
| 3 | 20260724200000_add_mashwara_module | structurally-represented | 55 / 55 |
| 4 | 20260725120000_add_login_attempts | **structurally-missing** | 0 / 5 |
| 5 | 20260729081417_add_media_briefs | **structurally-missing** | 0 / 29 |
| 6 | 20260730060714_add_attendance_foundation | partially-represented | 27 / 59 |
| 7 | 20260803090000_add_event_registrations | partially-represented | 10 / 16 |
| 8 | 20260803100000_add_event_fee_schedules | **structurally-missing** | 0 / 12 |
| 9 | 20260810193000_add_park_staff_attendance | **structurally-missing** | 0 / 26 |
| 10 | 20260811083000_add_attendance_event_uniqueness | structurally-represented | 1 / 1 |
| 11 | 20260817090000_add_attendance_schedule | structurally-represented | 17 / 17 |
| 12 | 20260817120000_add_attendance_dropout_lifecycle | **structurally-missing** | 0 / 7 |
| 13 | 20260827090000_add_team_document_links | **structurally-missing** | 0 / 14 |
| 14 | 20260909020000_operation_receipts | **structurally-missing** | 0 / 5 |
| 15 | 20260909040000_active_city_batch | **structurally-missing** | 0 / 6 |
| 16 | 20260909070000_attendance_reset_version | **structurally-missing** | 0 / 1 |
| 17 | 20260916080000_add_muawin_assistance | **structurally-missing** | 0 / 2 |

Totals: 5 structurally-represented, 2 partially-represented, 10 structurally-missing.

For every table in the five represented migrations the catalog column set matches
the migration column set **exactly** (0 extra columns, 0 nullability drift,
0 default drift). That is strong evidence those migrations' structure is present
even though the history table does not say so.

### Detail for the two partial migrations

`20260730060714_add_attendance_foundation`
- `participants` has the exact column set but `groupId` is `NOT NULL` where the
  migration rebuilds it as nullable, and `dropoutAt` / `dropoutReason` /
  `dropoutSource` are absent — the rebuild was never applied.
- `batch_off_weekdays`, `batch_off_dates`, `attendance_roster_snapshots` absent.
- `batch_settings.automaticDropoutEnabled` and `dropoutConsecutiveWeeks` absent.
- `staff_attendance_records` exists but keyed on `staffMetaId`, not the
  migration's `staffId`, so its two indexes are absent under the declared names.

`20260803090000_add_event_registrations`
- `event_registrations` exists but lacks `consentStatus`, `attendanceRecordId`,
  `cancelledAt`, `createdAt`; it has 4 columns the migration does not declare;
  `feeStatus` default is `'unpaid'` where the migration declares
  `'not_required'`.

### Ordered apply is not possible (replay probe)

`--mode existing` (17 pending migrations against a temp copy of the rebuilt DB):

```
succeeded: []
failure: 20260723160000_add_student_extended_profile
         table "student_extended_profiles" already exists
```

`--mode empty` (all 18 migrations into an in-memory database):

```
succeeded: 20260723160000 .. 20260729081417  (5 migrations)
failure:   20260730060714_add_attendance_foundation
           ALTER TABLE "batch_settings" ADD COLUMN "automaticDropoutEnabled" ...
           no such table: batch_settings
```

The chain therefore has **no SQLite baseline migration**: migrations 1–5 create
new tables and succeed, and migration 6 addresses a pre-existing table. This
independently reproduces the recorded "v2 fails at sixth migration" finding.

### Chain-internal replay conflicts

`batch_settings.automaticDropoutEnabled` and
`batch_settings.dropoutConsecutiveWeeks` are each added by **two** migrations
(`20260730060714` and `20260817120000`). SQLite rejects the second identical
`ADD COLUMN` (`duplicate column name`), so the chain cannot be replayed in order
even against a correct baseline.

### Table-family lineage conflicts

Three generations of the staff-attendance family exist and disagree:

| Generation | Source | Shape |
| --- | --- | --- |
| 1 | present in `dev.db` | `staff_attendance_events` + `staff_attendance_records(staffMetaId)` |
| 2 | migration 20260730060714 | `staff_attendance_records(staffId)` |
| 3 | migration 20260810193000 + `prisma/schema.prisma` | `park_staff_attendance_events` / `park_staff_attendance_records` |

`dev.db` contains **0** objects named `park_staff%` and contains
`staff_attendance_events`, which **no migration creates**. `event_registrations`
and `participants` show the same pattern (the database is newer than the July
migrations for those tables). Which generation is canonical is a product/schema
decision, not something the catalog can settle.

### Cannot be proven from catalog inspection alone

- Row-level work in `20260730060714` (`INSERT INTO "new_participants" … SELECT`)
  and `20260909040000` (`UPDATE "batches" SET "cityId" = …` backfill, plus its
  temporary `_batch_scope_preflight` guard table) — data correctness is out of
  catalog scope and was not queried.
- `20260909040000`'s partial unique index `batches_one_active_city`: no partial
  index exists in the database at all, and whether existing rows *satisfy* the
  predicate cannot be determined from the catalog. `batches` currently has only
  `batches_cityId_isActive_idx` (a plain index).
- Semantic/application-level additions with no catalog representation, e.g. the
  `muawin` role value in `20260916080000`, the automatic-dropout policy default,
  and `20260909020000` receipt semantics.
- Whether the PostgreSQL-staged migrations correspond one-to-one to these SQLite
  migrations (the staged set has migrations this directory does not, e.g.
  `20260907114612_add_evaluations_lessons_planner`,
  `20260909030000_restore_modeled_tables`,
  `20260909050000_align_modeled_constraints`,
  `20260909060000_align_modeled_indexes`).

## Fail-closed local recovery plan (not executed)

Each phase requires explicit owner/Astra authorization before it runs. Stop at any
failed precondition; never continue past one.

**Phase 0 — owner decisions (blocking).**
1. Canonical staff-attendance lineage and canonical `event_registrations` /
   `participants` shape.
2. Whether the local `dev.db` is treated as disposable (its content is the
   Lahore workbook import plus test data) or must be preserved.
3. Whether a SQLite baseline migration will be added (Option B below).

**Phase 1 — backup, before any write.**
- Capture `npx prisma migrate status --schema prisma/schema.prisma` output.
- Copy `prisma/dev.db` to an ignored, timestamped path plus its recorded sha256.
- Run `PRAGMA integrity_check` and `PRAGMA foreign_key_check` on the copy and
  record both results.
- Record the `_prisma_migrations` contents verbatim.
- No step may proceed until the copy hash matches the source hash.

**Phase 2 — validation on a disposable copy only.**
- Re-run `node scripts/sqlite-migration-catalog-audit.ts` and both replay-probe
  modes against the copy; require `unclassified` to stay empty and the failure
  point to be understood before acting.
- Re-run the phase 1 probes after any action to confirm no regression.

**Phase 3 — reconciliation (choose exactly one; all currently blocked).**

| Option | Action | Assessment |
| --- | --- | --- |
| A | Rebuild the local database from the current `prisma/schema.prisma`, then record history as applied for the structurally-verified migrations only | Local-only, fastest, exercises the real schema. Does not fix the missing baseline migration and needs the Phase 0 lineage decision so the rebuild matches the intended shape. |
| B | Add the missing SQLite baseline migration, then replay 1–18 on a disposable database | Correct long-term fix and the only option that makes the chain replayable. It edits migration history (high-risk per AGENTS.md) and must resolve the two duplicate `ADD COLUMN` conflicts first. |
| C | `prisma migrate resolve --applied` for all 17 pending migrations | **Reject.** 10 migrations are structurally missing; marking them applied would permanently hide real gaps (media briefs, login attempts, event fees, team document links, attendance reset version, muawin assistance, batch-city triggers, operation receipts, park staff attendance, dropout lifecycle). |

**Phase 4 — verification (after any authorized action).**
- `foreign_key_check` empty, `integrity_check` ok.
- Re-run the catalog audit: every migration the history claims as applied must
  audit as structurally-represented.
- The application paths that depend on currently missing artifacts (`resetVersion`,
  the staff-attendance family, event registrations consent/fee fields) must be
  re-tested.
- Migration status must show a coherent, fully-recorded history.

**Phase 5 — rollback.**
- Restore the Phase 1 copy and delete any database file created by the action.
- Re-verify the restored copy's hash equals the Phase 1 hash, then re-run the
  catalog audit and replay probe to confirm the pre-change state.
- If a baseline migration (Option B) was committed, revert that commit too.

## Remaining unknowns and risks

- The schema lineage question above is unresolved and blocks every reconciliation
  option.
- The repository has no SQLite baseline migration; `prisma migrate reset` /
  `deploy` cannot rebuild this database without one.
- Data-level preconditions for `20260909040000` (batch/park city agreement, one
  active batch per city) were deliberately not queried and remain unverified.
- The exact provenance of the extra `event_registrations` columns and of
  `staff_attendance_events` is not established by this investigation.
- Only the SQLite side was inspected. The staged PostgreSQL prerequisites are a
  separate, already-documented question.

## Single recommended next action

Have Astra and the owner decide the **canonical staff-attendance table lineage**
(generation 1 `staff_attendance_*` as in `dev.db`, versus generation 3
`park_staff_attendance_*` as in `prisma/schema.prisma` and migration
`20260810193000`). Every other choice — rebuild versus reconcile, and which
migrations may be recorded as applied — depends on that decision, and the local
database already disagrees with both `schema.prisma` and the July migration.

## Non-claims

No migration was applied, resolved, or reset; no database was written; no client
was generated; no PostgreSQL, live system, credential, or `.env` file was touched.
No migration readiness, release approval, or deployment approval is claimed. Astra
reviews the actual diff and this evidence before any database action.
