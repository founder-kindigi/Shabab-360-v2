# ATT01 release-preparation handoff

Date: 2026-09-18. Task: ATT01 release preparation, Phases A–D (release gates 1–4
of `docs/delivery/ATT01_PILOT_AND_ITERATION_PLAN.md`). Mode: **safety-first,
non-mutating**.

No deployment, push, commit, production/PostgreSQL connection, `.env` read, account
change, workbook edit or database write was performed. `prisma/dev.db` was not
reset or modified.

## Outcome summary

| Gate | Phase | Status |
| --- | --- | --- |
| 2 — workbook/local reconciliation | A | Evidence produced; imported data matches the workbook exactly; only attributable post-import owner activity differs |
| 1 — source inventory & commit boundary | B | Inventory produced; data-boundary blockers found (`prisma/dev.db`, workbooks tracked) |
| 3 — PostgreSQL migration compatibility | C | Preflight evidence produced; **blockers found** (duplicate `operation_receipts` migration, stale M01 model, absent disposable runtime) |
| 4 — backup/import/provisioning/rollback runbook | D | Drafted, **not executed** |

Detail documents:

- `docs/delivery/reports/ATT01_WORKBOOK_DB_RECONCILIATION.md` (Phase A)
- `docs/delivery/reports/ATT01_SOURCE_COMMIT_INVENTORY.md` (Phase B)
- `docs/delivery/reports/ATT01_POSTGRES_MIGRATION_PREFLIGHT.md` (Phase C)
- `docs/delivery/ATT01_PILOT_RUNBOOK_DRAFT.md` (Phase D)

## Phase A — reconciliation result (exact aggregate evidence)

Command (read-only; `writesPerformed: false`; DB fingerprint byte-identical
before/after — 4,194,304 bytes, `2026-09-18T14:11:36.254Z`, 0 sidecars):

```
node scripts/att01-workbook-reconciliation.ts --input docs/sheets/Shabab_Batch_4_Attendance.xlsx --database prisma/dev.db
```

Required totals — workbook matches all six; database matches four:

| Aggregate | Required | Workbook | Database |
| --- | ---: | ---: | ---: |
| Parks | 6 | 6 | 6 |
| Groups | 18 | 18 | 18 |
| Valid participants | 339 | 339 | 339 |
| Attendance events | 460 | 460 | 465 |
| Historical records | 6,210 | 6,210 | 6,211 |
| Calendar dates | 74 | 74 | 74 |

Business keys: park, group, participant identity, participant placement and calendar
dates all match exactly (339/339 participants, hashes equal); 460/460 imported
events and their per-event record counts match exactly. Lifecycle: 231 active /
108 dropout / 0 reactivated in both. Status totals match except `excused` 668 → 669.

Mismatch report (all explained, none unexplained):

| Category | Expected | Actual | Cause |
| --- | ---: | ---: | --- |
| attendanceEvents | 460 | 465 | 5 sessions prepared in the owner's browser run |
| attendanceRecords | 6,210 | 6,211 | 1 surviving operator mark |
| event_set / event_record_counts | 460 | 465 | same 5 prepared sessions |
| status_totals (`excused`) | 668 | 669 | the 1 operator mark |
| staff_state | 67 placeholders | 15 placeholders | authorized Team Access provisioning |

Post-import evidence: `attendance_mark` 14, `attendance_reset` 4,
`attendance_session_prepare` 5, `import_lahore_batch_4` 1, `view_dashboard` 5; 3
events with `resetVersion > 0`; 5 open events; 1 user-written record; 14 durable
receipts; 70 users (2 Super Admin + 53 active others + 15 inactive placeholders);
active roles super_admin 2, city_head 1, park_lead 6, murabbi 34, muawin 12.
Classification: `attendance_reset`, `operator_marks`, `session_lifecycle_change`,
`queued_operation_receipts`, `account_activation`. Nothing was overwritten.

## Phase B — source inventory for a later commit

- 153 tracked modifications; 451 untracked non-ignored paths; 66 ignored entries;
  `+6769 / −1970` lines.
- New ATT01 files that must be added: attendance lib/routes/UI, the four new
  migration folders, `scripts/**` tooling, and the whole currently-untracked
  `docs/delivery/**` tree (including `state.json` and the pilot plan).
- **Data-boundary blockers:** `prisma/dev.db` is **tracked** and modified, and four
  private `docs/sheets/*.xlsx` workbooks are tracked. `tool-results/read_*.txt`
  (~31) and `qa-*.png` (11) are tracked and delivery-irrelevant. Untracking needs
  explicit owner approval (history-affecting) and is not done here.
- Root litter: 87 one-off `.py` scripts plus `$null`, `-`, `diff.txt`,
  `knip_output.txt` — untracked, must never be committed.
- Clean-code findings: the two duplicate create-event routes (F-18) remain; three
  local schema appliers coexist; legacy `staff_attendance_*` tables remain. No dead
  delivery-critical file found.

## Phase C — PostgreSQL compatibility status and blockers

- Chain sizes: SQLite **19** folders, PostgreSQL **33** folders; release assertions
  expect 17 / 31 → 5 known failures.
- SQLite `_prisma_migrations` records 1 migration, 18 pending; classification
  11 represented / 2 partial / 5 missing; catalog 72 tables, 134 indexes, 0 triggers.
- **Blocker 1:** `operation_receipts` is created by **two** migrations in both
  chains (`20260909020000_operation_receipts` and the new
  `20260917193000_add_operation_receipts`) — a fresh replay fails on the second.
- **Blocker 2:** the two new migration folders are untracked and the release count
  assertions are stale.
- **Blocker 3:** M01 `production-preflight.ts` models only 8 of the 10 pending
  PostgreSQL migrations.
- **Blocker 4:** the disposable PostgreSQL runtime is absent, so a disposable
  replay is unproven (the harness exists under `docs/reviews/v2-audit-2026-09-08/`
  and uses a trust-auth localhost cluster with no secrets).
- **Blocker 5:** the SQLite chain is still not replayable (no baseline migration;
  duplicate `batch_settings` ADD COLUMN).
- Replays were **not** run. No migration was applied, resolved or reset.

## Phase D — pilot runbook

`docs/delivery/ATT01_PILOT_RUNBOOK_DRAFT.md` — drafted but not executed, covering
production backup/integrity, migration preflight, import/provisioning, role-login
smoke tests, attendance-session smoke test, rollback decision points and commands,
and post-pilot reconciliation. Passwords and private source rows are excluded.

## Verification performed (commands, counts, exit codes)

| # | Command | Result | Exit |
| --- | --- | --- | --- |
| 1 | `npx vitest run src/lib/attendance/lahore-refresh/reconcile.test.ts` | 1 file, **9 passed** | 0 |
| 2 | `npx vitest run src/lib/attendance/lahore-refresh src/lib/migrations <4 schema suites>` | 17 files, **143 passed** | 0 |
| 3 | `npx vitest run src/app/api/park/attendance src/app/api/park/staff-attendance src/lib/attendance/team-access src/lib/auth` | 28 files, **248 passed / 1 failed** | 1 |
| 4 | `npx vitest run src/__tests__/release` | 6 files, **162 passed / 5 failed** | 1 |
| 5 | `npm run lint` | **0 errors, 6 pre-existing warnings** | 0 |
| 6 | `npx tsc --noEmit` | pass (after fixing the CLI defect) | 0 |
| 7 | `git diff --check` | 2 pre-existing whitespace errors in unrelated files | 2 |

All nine files created by this task are whitespace-clean (no trailing whitespace,
no blank last line).

Known failures, all pre-existing or expected (not caused by this task):

1. 5 release migration-count assertions (`33 vs 31` ×3, `19 vs 17` ×2).
2. `team-access/schema-reconcile.test.ts` real-schema test — stale assertion that
   `prisma/dev.db` still lacks `assistsMurabbiId`; the authorized write has landed.
3. 2 whitespace errors: `src/app/api/park/attendance/[eventId]/close/route.test.ts:165`
   and `src/lib/attendance/__tests__/dropout-policy.test.ts:169`.

## Exact changed files (this task)

New only — no pre-existing file was modified:

1. `src/lib/attendance/lahore-refresh/reconcile.ts`
2. `src/lib/attendance/lahore-refresh/reconcile-sqlite.ts`
3. `src/lib/attendance/lahore-refresh/reconcile.test.ts`
4. `scripts/att01-workbook-reconciliation.ts`
5. `scripts/att01-workbook-reconciliation-impl.ts`
6. `docs/delivery/reports/ATT01_WORKBOOK_DB_RECONCILIATION.md`
7. `docs/delivery/reports/ATT01_SOURCE_COMMIT_INVENTORY.md`
8. `docs/delivery/reports/ATT01_POSTGRES_MIGRATION_PREFLIGHT.md`
9. `docs/delivery/ATT01_PILOT_RUNBOOK_DRAFT.md`

Two defects in the new tooling were found during verification and fixed
(raw event keys; duplicate `database` payload key). No application behaviour
changed.

## Actions explicitly NOT performed

- No commit, push, merge, deployment, or release.
- No production or PostgreSQL connection; no live migration, `migrate resolve`,
  `migrate deploy`, `db push` or `prisma generate`.
- No `.env`, credential or password read; no password printed or written.
- No database write, reset, import, backup or restore; `prisma/dev.db` unchanged
  (fingerprint identical).
- No workbook or source-data change; no private participant name, phone, email or
  row printed.
- No migration created or edited to make counts match.
- No unrelated refactor; no pre-existing working-tree change altered.

No production readiness, deployment readiness, or successful live migration is
claimed.
