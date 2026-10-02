# ATT01 production PostgreSQL bootstrap — BLOCKED

Date: 2026-09-20. Task: bootstrap a fresh production PostgreSQL database for ATT01,
import approved Lahore Batch 4 data, provision approved team access, validate and
hand over.

Status: **NOT EXECUTED — STOPPED AT STEP 1 (target confirmation).**

This is **not** a completion handover. No production database was contacted, no
schema was applied, no data was imported, no account was created, no handoff file
was produced, and no credential was read or printed.

## 0. Why this stopped

Two independent stop conditions were hit before any write:

1. **No production connection was supplied.** The task authorizes work only against
   "the single production PostgreSQL connection explicitly supplied by the owner at
   runtime". No connection string, injected runner or secret-manager reference was
   provided in this session. `DIRECT_URL`, `DATABASE_URL` and `SQLITE_DATABASE_URL`
   are all unset in the process environment; `.env*` files exist but were not read.
   `psql` and `pg_dump` are not installed locally. Gate 1 (confirm freshness and
   emptiness) therefore cannot be performed, and the task's own rule — "Do not
   proceed if the target is not confirmed fresh and empty" — is not satisfiable.

2. **Three of the six required steps have no approved production tool path.** The
   repository's own runbook and readiness report already record this (runbook
   §12.3, `ATT01_LOCAL_RELEASE_READINESS.md` §6 item 4); fresh code inspection this
   session confirms it. The missing paths are the import, the reconciliation and
   the account provisioning (details in sections 2–4). Building them is a gated
   change with its own owner decisions and independent review, not something this
   task can assume.

Per `AGENTS.md` (auth, migrations and deployment are high-risk; never claim
completion without evidence) and the runbook's stop conditions, the run halts here
and reports evidence instead of proceeding.

## 1. What was verified (fresh this session)

| Check | Command | Exit | Result |
| --- | --- | --- | --- |
| Focused guard/refusal suites | `npx vitest run src/lib/auth/production-access.test.ts src/lib/attendance/team-access src/lib/attendance/lahore-refresh/guards.test.ts` | 0 | 5 files, **57 tests passed** |
| Approved importer dry run (read-only, aggregates only) | `node scripts/lahore-batch-4-refresh.ts --input docs/sheets/Shabab_Batch_4_Attendance.xlsx` | 0 | see below |
| PostgreSQL write attempt with an unreachable fake URL | `node scripts/lahore-batch-4-refresh.ts --input … --execute --confirm-lahore-refresh --target postgres --postgres-url postgresql://blocked@127.0.0.1:1/none --backup-dir tool-results/blocked-probe` | 1 | `aborted: PostgreSQL writes require a verified full backup mechanism; refusing a partial backup`; **no backup directory created** — fail-closed, never connects |

### Approved importer dry run — aggregates match the approved target exactly

| Aggregate | Approved requirement | Dry run |
| --- | ---: | ---: |
| Parks | 6 | 6 |
| Groups | 18 | 18 |
| Participants (valid) | 339 | 339 |
| Attendance events | 460 | 460 |
| Attendance records | 6,210 | 6,210 |
| Calendar dates | 74 | 74 |
| present / absent / late / excused | 1,626 / 2,570 / 1,346 / 668 | 1,626 / 2,570 / 1,346 / 668 |

The manifest also reports 67 staff placeholders and 108 participant dropouts, and
the cutoff is `2026-09-13`. No private row, name or phone was printed.

### Migration chain (committed, replay-proven on a disposable instance)

- 32 PostgreSQL migration folders are committed under
  `prisma/postgres/migrations/`, including `20260909020000_operation_receipts` and
  `20260916080000_add_muawin_assistance`.
- A fresh disposable local PostgreSQL 18 replay applied **32 / 32** in order with
  `operation_receipts` present once and `staff_meta_assistsMurabbiId_fkey` present
  once (`ATT01_POSTGRES_DISPOSABLE_REPLAY.md`). That proves the chain builds a new
  database; it does not touch production.

## 2. Blocker — no approved production import path

- `scripts/lahore-batch-4-refresh-impl.ts` (the approved Lahore refresh) declares
  `WRITE_CAPABILITIES = { sqliteBackup: true, postgresFullDump: false }` and refuses
  PostgreSQL execution: "PostgreSQL execution requires an approved verified
  full-dump mechanism and is not wired in this pass". Proven above with exit 1.
- `scripts/import-lahore-batch-4-staging.cjs`, the only PostgreSQL-capable importer,
  is hard-pinned to the **staging** project (`STAGING_POOLER_USERNAME`, hostname must
  end `pooler.supabase.com`, manifest `target: "shabab360-staging"`). Using it would
  both fail the owner's "do not touch staging" rule and be refused by its own guard.
- There is no production target for `--postgres-url` that any approved tool accepts.

## 3. Blocker — no approved production provisioning path

- `src/lib/auth/production-access.ts` is planning/preflight only. Its own contract
  states it "opens no connection … and writes nothing by itself"; `applyAccessPlan`
  requires **injected** write ports, there is **no CLI entry point**, no concrete
  PostgreSQL writer, and no audit emission. Nothing in the repository supplies real
  ports, so it cannot reach a database.
- `ATT01_PRODUCTION_TEAM_ACCESS_DESIGN.md` §15 lists the owner decisions required
  before a live writer may exist (connection contract, writer ownership, handoff
  granularity, audit reference, who may run it, first City Head).
- `scripts/provision-lahore-team-access.ts` — "PostgreSQL is deliberately
  unsupported"; `--execute` requires `--target sqlite`.
- `scripts/provision-local-city-head.ts` / `src/lib/auth/city-head-provision.ts` —
  refuse PostgreSQL and URLs, require an explicit `--sqlite-path`.

Therefore the DPAPI-encrypted handoff cannot be produced for a production run
either, since the only wired path to `writeDpapiHandoff` is the SQLite provisioners.
No account was created and no handoff file exists.

## 4. Blocker — no production-capable reconciliation

- `scripts/att01-workbook-reconciliation.ts` is SQLite read-only and "refuses URLs
  and network paths".
- `src/lib/attendance/lahore-refresh/reconcile-sqlite.ts` is the SQLite side only;
  no PostgreSQL reconciliation reader is wired.
- `scripts/reconcile-sqlite-to-postgres.cjs` compares a **local SQLite snapshot** to
  a PostgreSQL database — it is a snapshot-parity tool, not the approved
  workbook-to-production reconciliation, and it needs a local SQLite source.

## 5. What could run, and under what authorization

Only the migration step has an approved command (`npm run db:postgres:deploy`, i.e.
`prisma migrate deploy --schema prisma/postgres/schema.prisma`; runbook Gate D2).
It still requires, in order:

1. the owner-supplied production connection at command time (never from `.env`,
   never committed, never through a transaction pooler);
2. a named owner authorization for target, window and rollback authority
   (runbook Gate A) — the runbook's own change-window gate applies even to a fresh
   empty target;
3. a wired read-only preflight runner. `src/lib/migrations/production-preflight.ts`
   is a library that requires an **injected** query interface; no concrete
   PostgreSQL runner is wired in this repository.

Steps D4–D6 (import), E (provisioning) and the reconciliation are blocked on tooling
that does not exist yet (sections 2–4), independent of the connection.

## 6. What must happen before a real bootstrap

1. Owner supplies the production connection at run time and names the approver,
   window and rollback authority (Gate A).
2. An approved production import path is built and reviewed — either wiring the
   verified full-dump mechanism into `lahore-batch-4-refresh-impl.ts`, or a reviewed
   production target for the importer — with its dry run compared to the approved
   totals above.
3. An approved production provisioning writer is built and reviewed against
   `ATT01_PRODUCTION_TEAM_ACCESS_DESIGN.md` §15, including in-transaction audit and
   the DPAPI handoff produced before any activation.
4. A production-capable reconciliation reader is wired for the workbook comparison.
5. Only then may the ordered gates run: confirm fresh/empty → migrate → verify
   ledger/schema/constraints → import (dry run first) → reconcile → provision →
   role/scope and attendance smoke test → clean practice data → handover.

## 7. Non-claims and safety

- No production, staging or external database was contacted, queried or altered.
- No schema, migration, data, account, password, credential or handoff was created.
- No `.env`, secret or DPAPI handoff content was read or printed; no connection
  string, email or private workbook row appears in this report.
- `prisma/dev.db` was not opened for writing; no source change was committed.
- The dry run and the refusal test used only repository-local, read-only paths and an
  unreachable placeholder URL.

## 8. Readiness statement

**The system is not ready for the team to test.** The bootstrap did not run, and the
import, reconciliation and provisioning tooling required by the approved plan does
not yet exist. This report must not be read as production readiness, migration
approval, pilot approval, or permission to provision any live account.
