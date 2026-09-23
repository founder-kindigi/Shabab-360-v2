# ATT01 PostgreSQL import and reconciliation

Date: 2026-09-23. Task: build and verify the ATT01 Lahore Batch 4 PostgreSQL import
and reconciliation path for a **fresh empty database**.

Status: **implemented and validated against a disposable local PostgreSQL 18 database.**
Production, staging, Supabase and every external database were **not** contacted, and
the new tool was **not** run against any live target.

This report does not authorize or claim a production bootstrap. It records what now
exists, how it is guarded, and the disposable evidence.

## 1. What this closes

`ATT01_PRODUCTION_BOOTSTRAP_BLOCKED.md` recorded that no approved PostgreSQL import
or reconciliation path existed: the Lahore refresh refused `--target postgres` and
the only PostgreSQL importer was pinned to the staging project. That gap is closed
for the import and reconciliation steps. Account provisioning remains a separate,
unbuilt change.

## 2. Files

New:

| File | Purpose |
| --- | --- |
| `src/lib/attendance/lahore-refresh/load.ts` | Shared workbook-to-manifest loading (extracted from the SQLite CLI) |
| `src/lib/attendance/lahore-refresh/postgres-port.ts` | Narrow query port, `pg` binding, connection contract, diagnostic sanitizer |
| `src/lib/attendance/lahore-refresh/postgres-target.ts` | Read-only fresh-target guard: provider, migration ledger, tables, constraints, indexes, emptiness |
| `src/lib/attendance/lahore-refresh/postgres-import.ts` | Import plan, transactional insert, post-import verification |
| `src/lib/attendance/lahore-refresh/postgres-reconcile.ts` | Read-only snapshot/evidence readers, report builder, human summary |
| `src/lib/attendance/lahore-refresh/postgres-cli.ts` | Argument parsing, execution gates, connection resolution, safe diagnostics |
| `scripts/att01-postgres-import.ts` + `-impl.ts` | Import CLI |
| `scripts/att01-postgres-reconcile.ts` + `-impl.ts` | Read-only reconciliation CLI |
| `src/lib/attendance/lahore-refresh/postgres-cli.test.ts` | Guard/contract tests (no database) |
| `src/lib/attendance/lahore-refresh/postgres-import.test.ts` | Disposable-PostgreSQL integration tests |

Modified:

- `scripts/lahore-batch-4-refresh-impl.ts` — now uses the shared loader; behaviour unchanged.
- `src/lib/attendance/lahore-refresh/reconcile.ts` — additive `CompareOptions.staffIsRelevant`
  (default `true`, so the SQLite path is unchanged).
- `package.json` / lockfile — adds `pg` + `@types/pg` and the two tool scripts.

No Prisma schema or migration file was added or changed. No generated client was edited.

## 3. Tool commands

The connection is supplied only at run time; every command below uses placeholders.

```bash
# dry run (default): workbook aggregates, plus a read-only target preflight when a
# connection is configured. Performs zero writes.
npm run att01:postgres:reconcile -- --input <approved-workbook.xlsx>
node scripts/att01-postgres-import.ts --input <approved-workbook.xlsx>

# write (all four gates are required)
node scripts/att01-postgres-import.ts --input <approved-workbook.xlsx> \
  --target postgres --execute \
  --confirm-att01-postgres-import --confirm-fresh-empty-database

# read-only reconciliation (JSON)
node scripts/att01-postgres-reconcile.ts --input <approved-workbook.xlsx> --json
```

## 4. Runtime input contract

- The connection is read from the single environment variable `ATT01_POSTGRES_URL`.
- It is never read from `.env`, never hardcoded, never printed and never written to a
  file. `createPgQueryPort` opens one pool per run and closes it in a `finally`.
- Only a direct `postgres://` / `postgresql://` target is accepted. A pooled host
  (`*.pooler.supabase.com`, the staging target) is refused, as is any other scheme.
- Every error string passes through `sanitizeDiagnostic`, which replaces connection
  URLs and `password=` values before anything is printed.

## 5. Safety guards

| Guard | Behaviour |
| --- | --- |
| Dry run default | No `--execute` means no write; the preflight and workbook parse are read-only |
| Explicit target | `--target postgres` is mandatory for a write and is rejected in a dry run |
| Import acknowledgement | `--confirm-att01-postgres-import` required |
| Fresh-target acknowledgement | `--confirm-fresh-empty-database` required |
| Fresh-target check | provider, full migration-ledger comparison, required tables/FKs/unique indexes, and zero rows in all 13 business tables |
| Non-fresh target | refused with `target_not_empty:<table>` codes; the target is never reset or merged |
| Schema mismatch | refused with `missing_table:` / `missing_constraint:` / `missing_index:` / `migration_ledger_mismatch` |
| Transactionality | every insert plus the post-import verification run in one transaction; any failure rolls the batch back |
| No identities | no `users`, `staff_meta`, `audit_log` or credential row is created |
| Output | aggregate counts, catalog names and non-reversible digests only |

The staging importer (`scripts/import-lahore-batch-4-staging.cjs`) is not imported,
called or generalised by any of this.

## 6. Disposable PostgreSQL validation

Engine: the `postgres:18` image (`sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280`,
the same digest recorded in `ATT01_POSTGRES_DISPOSABLE_REPLAY.md`), reported as
**PostgreSQL 18.6**. It was started as a temporary container bound to `127.0.0.1`
only, no external service was contacted, and it was removed after validation.

The committed 32-migration PostgreSQL chain was applied with
`prisma migrate deploy --schema prisma/postgres/schema.prisma`; the ledger recorded
**32 applied, 32 distinct**. Each integration test then cloned the migrated
template into its own temporary database.

### Approved workbook import — exact totals

| Aggregate | Approved | Imported |
| --- | ---: | ---: |
| Parks | 6 | 6 |
| Groups | 18 | 18 |
| Participants | 339 | 339 |
| Attendance events | 460 | 460 |
| Attendance records | 6,210 | 6,210 |
| Calendar dates | 74 | 74 |
| present / absent / late / excused | 1,626 / 2,570 / 1,346 / 668 | 1,626 / 2,570 / 1,346 / 668 |

Lifecycle: active 231, dropout 108, reactivated 0. Users created: **0**. Staff created: **0**.
Post-import verification reported `ok: true` for all 15 checks, including
`noUsersCreated`, `noStaffCreated` and `noRecordsAfterCutoff`.

### Reconciliation — every key set equal

The reconciliation hashes match the approved SQLite baseline in
`ATT01_LOCAL_RELEASE_READINESS.md` exactly, which is strong cross-provider evidence
that the PostgreSQL import reproduces the reviewed dataset.

| Key set | Count | Workbook hash | PostgreSQL hash | Matched | WB-only | DB-only |
| --- | ---: | --- | --- | ---: | ---: | ---: |
| Park placement | 6 | `cdcddfeb9be06883` | `cdcddfeb9be06883` | 6 | 0 | 0 |
| Group placement | 18 | `08977a6edfdba09d` | `08977a6edfdba09d` | 18 | 0 | 0 |
| Participant identity | 339 | `8007f38ef039152e` | `8007f38ef039152e` | 339 | 0 | 0 |
| Participant placement | 339 | `550f9c92c6ab66bf` | `550f9c92c6ab66bf` | 339 | 0 | 0 |
| Attendance events | 460 | `03bf18a86fc70f8d` | `03bf18a86fc70f8d` | 460 | 0 | 0 |
| Calendar dates | 74 | `7e8cedaa9d2adace` | `7e8cedaa9d2adace` | 74 | 0 | 0 |
| Per-event record counts | 460 | `1b385c8a5f46597a` | `1b385c8a5f46597a` | 460 | 0 | 0 |

Result: `workbook <-> postgres: EQUAL`.

### Test evidence

| Suite | Command | Files | Tests | Exit |
| --- | --- | ---: | ---: | ---: |
| Lahore refresh (incl. database integration) | `npx vitest run src/lib/attendance/lahore-refresh` | 13 | 80 | 0 |
| Attendance + migration verification | `npx vitest run src/lib/attendance src/lib/migrations` | 30 | 253 | 0 |
| Release migration parity | `npx vitest run src/__tests__/release` | 6 | 167 | 0 |
| Scoped ESLint | `npx eslint <changed files>` | — | 0 errors | 0 |
| Typecheck | `npx tsc --noEmit` | — | clean | 0 |

The 10 PostgreSQL integration tests cover: a fresh target is compatible and the
preflight writes nothing; a successful import yields the exact totals; reconciliation
after import is fully equal; a deliberately altered row is reported as a mismatch; a
non-empty target is refused before any write; a missing table/constraint is refused;
an unexpected migration ledger is refused; a failing insert rolls the whole batch
back; the approved workbook imports with the approved totals; and no output contains
a connection string, participant name or phone. The suite skips itself when
`ATT01_TEST_POSTGRES_URL` is unset, so CI needs no database; it was executed here
with the disposable server.

## 7. Deliberate differences from the local SQLite refresh

1. **No reset.** A fresh-seed import must refuse a non-empty target, not clear it.
   The guard enforces this; the SQLite `resetData` path is not used.
2. **No synthetic identities.** The SQLite refresh creates inactive staff
   placeholders and an import audit row. The PostgreSQL import writes only the nine
   structural tables (`cities`, `parks`, `batches`, `batch_settings`, `groups`,
   `participants`, `attendance_events`, `attendance_records`, `batch_class_dates`)
   and creates no user, staff, password or credential. Staff and Team Access remain
   the separate provisioning change.
3. **Staff is excluded from the reconciliation.** Because (2) creates no staff row,
   `CompareOptions.staffIsRelevant: false` keeps the staff category reported but out
   of the equality verdict. Every other category uses the unchanged shared rules.

## 8. Known limitations

- The tool was exercised only against a disposable local database. It has never run
  against an operational target.
- The reconciliation compares business keys and aggregates; it is not a byte-level
  dump comparison.
- An approved-workbook assertion inside the integration suite is skipped when the
  workbook is absent, so a bare CI run validates the mechanics on the synthetic
  fixture rather than the approved dataset.
- The import creates a single Lahori batch anchored to the first park with each
  group carrying its own `parkId`, mirroring the reviewed SQLite structure; a
  multiple-active-batch layout is not supported (the provider enforces one active
  batch per city).
- Account provisioning, role/scope smoke tests, the attendance session smoke test and
  the live bootstrap remain outstanding.

## 9. Remaining work before a live bootstrap

1. Build and review the production account-provisioning writer (the separate change).
2. Owner authorization for the target, window and rollback authority (runbook Gate A),
   and a verified backup/rehearsal (Gate B).
3. Then the ordered live gates: confirm fresh/empty → migrate → verify → import (dry
   run first) → reconcile → provision → role/scope and attendance smoke tests →
   clean practice data → handover.

## Non-claims

No production, staging, Supabase or external database was contacted, queried or
altered. No `.env`, credential, password or DPAPI handoff was read; none is present
in this report. The new tool was not run against a live target, and no account was
created. This document does not authorize a live bootstrap.
