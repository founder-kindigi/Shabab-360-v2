# ATT01 commit manifest

Date: 2026-09-18. Task: review and commit only the accepted ATT01
release-preparation source changes. Branch: `v2`. Base commit: `401ff32`.

This is a Git hygiene and evidence review. No push, deployment, PostgreSQL
migration, live database or `.env` access occurred. No file was staged or
committed from the excluded categories in section 4.

## 1. Method

Inventory: `git status --short`, `git diff --name-only`,
`git ls-files --others --exclude-standard`, `git status --ignored`,
`git diff --numstat`, and `git show`/`git show HEAD:<path>` for HEAD baselines.

Working tree at review time: 153 tracked modifications, 458 untracked
non-ignored paths. Every committed file's actual diff was read; handoffs were
used only to identify the approved scope and evidence, not as proof.

Commit construction used explicit path lists only. `git add .`,
`git commit -a`, `git reset`, `git restore`, `git clean`, force operations,
rebasing and stashing were not used.

## 2. Accepted and committed

Five commits, 83 files, all focused suites green.

### `c2588a6` — feat(attendance): add workbook reconciliation and local cleanup tools

Evidence: `docs/delivery/reports/ATT01_WORKBOOK_DB_RECONCILIATION.md` (this task),
`docs/delivery/reports/ATT01_R03_PREFLIGHT.md`,
`ATT01_LOCAL_DATABASE_COMPATIBILITY_HANDOFF.md`,
`ATT01_STAFF_ATTENDANCE_SCHEMA_RECONCILIATION_HANDOFF.md`; owner statement that
the seven browser-test sessions and one excused mark were removed by the
reviewed cleanup tool.

Purpose: guarded, local-only attendance data tooling — read-only workbook/SQLite
reconciliation, fixed-whitelist browser-test cleanup, backup-gated refresh and
schema-compatibility CLIs.

Files (45, all new):
`docs/delivery/reports/ATT01_WORKBOOK_DB_RECONCILIATION.md`;
`scripts/att01-database-compatibility{-impl}.ts`;
`scripts/att01-workbook-reconciliation{-impl}.ts`;
`scripts/cleanup-att01-browser-test-sessions.ts`;
`scripts/lahore-batch-4-refresh{-impl}.ts`;
`scripts/reconcile-park-staff-attendance{-impl}.ts`;
`src/lib/attendance/attendance-schema-contract{,.test}.ts`;
`src/lib/attendance/attendance-schema-reconcile{,.test}.ts`;
`src/lib/attendance/browser-test-cleanup{,.test}.ts`;
`src/lib/attendance/lahore-refresh/**` (21 files);
`src/lib/attendance/park-staff-attendance-reconcile{,.test}.ts`;
`src/lib/attendance/park-staff-attendance-schema{,.test}.ts`;
`src/lib/attendance/sqlite-support.ts`.

Validation: 16 files / 110 tests passed; scoped ESLint clean; `tsc --noEmit`
exit 0; `git diff --check --cached` clean.

### `2b44751` — feat(attendance): add guarded local Team Access provisioning

Evidence: `docs/delivery/reports/ASTRA_ATT01_R03_REVIEW.md` (accepted; local
provisioning completed: 52 supported staff, 34 Murabbi / 12 Muawin / 6 Park
Lead); `ATT01_TEAM_ACCESS_SCHEMA_COMPATIBILITY_HANDOFF.md`.

Purpose: pure schema contract, probe-backed additive reconciler and the guarded
provisioner that activates existing inactive staff placeholders.

Files (8, all new): `scripts/provision-lahore-team-access.ts`;
`scripts/team-access-schema-compatibility{-impl}.ts`;
`src/lib/attendance/team-access/{schema,schema-reconcile,provision}{,.test}.ts`.

Validation: 2 files / 20 tests passed (the dedicated schema-reconcile real-schema
test is blocked — see section 3); scoped ESLint clean; `git diff --check --cached`
clean.

### `803321e` — feat(auth): add guarded local city head provisioner

Evidence: `docs/delivery/reports/ATT01_CITY_HEAD_READINESS.md` (accepted local
candidate); `docs/delivery/tasks/ATT01_CITY_HEAD_READINESS.md` acceptance
checklist.

Purpose: local-only preflight-by-default CLI/library creating one City Head test
account, with explicit execution gates, verified backup and DPAPI handoff.

Files (3, all new): `scripts/provision-local-city-head.ts`;
`src/lib/auth/city-head-provision{,.test}.ts`.

Validation: 1 file / 14 tests passed; scoped ESLint clean;
`git diff --check --cached` clean.

### `636a774` — fix(attendance): enforce the batch calendar on marking and correction

Evidence: `docs/delivery/reports/ASTRA_ATT01_R01_REVIEW.md` (accepted; P1
calendar gate on marking, correction and both create routes).

Purpose: enforce the shared `isBatchClassDate` predicate inside the mutation
transaction after authorization and before the lock/version/audit, and require an
active group and active batch on the create routes.

Files (7): `src/lib/attendance/apply-mutation.ts`;
`src/app/api/park/attendance/route{,.test}.ts`;
`src/app/api/park/attendance/events/route{,.test}.ts`;
`src/app/api/park/attendance/[eventId]/records/[recordId]/route{,.test}.ts`.

Validation: 3 files / 27 tests passed; scoped ESLint clean;
`git diff --check --cached` clean.

### `0424ae9` — fix(auth): close City Head cross-city scope gaps

Evidence: `docs/delivery/reports/ATT01_CITY_HEAD_READINESS.md` (accepted; 9
findings, 111 focused tests).

Purpose: single `resolveRequestedCityScope` resolution on every city-scoped
report/export/dashboard/mashwara surface; authoritative `Group.parkId` group
filtering and park/city labels; stable product-facing `roleLabel`.

Files (20): `src/lib/auth.ts`, `src/lib/auth.test.ts`,
`src/lib/auth/role-labels{,.test}.ts`;
`src/app/api/admin/reports/{admissions,fees,attendance,export}/route.ts`;
`src/app/api/admin/reports/attendance-report/route{,.test}.ts`;
`src/app/api/admin/reports/city-head-scope.test.ts`;
`src/app/api/admin/dashboard/route{,.test}.ts`;
`src/app/api/admin/mashwara/route.ts`,
`src/app/api/admin/mashwara/mashwara-api.test.ts`;
`src/app/api/city-head/dashboard/route{,.test}.ts`;
`src/app/api/admin/pilot/verify-scopes/route.ts`,
`src/app/api/admin/pilot/__tests__/scopes.test.ts`;
`src/app/admin/reports/reports-ui.test.ts`.

Validation: 9 files / 117 tests passed; scoped ESLint clean;
`git diff --check --cached` clean.

## 3. Blocked candidates

| Candidate | Reason | Required action |
| --- | --- | --- |
| `src/lib/attendance/team-access/schema-reconcile.test.ts` | Its real-schema test asserts the pre-write baseline `assistsMurabbiIndexPresent: false`; the authorised local column write has landed, so it reports `true` and fails (30 pass / 1 fail). Fixing it means editing unaccepted test code. | Owner-approved baseline-independent correction, then commit. |
| Frontend role/dashboard packet (R02/R04/R06): `mobile-parks-page.tsx`, `mobile-park-dashboard.tsx`, `mobile-park-detail-page.tsx`, `mobile-murabbi-dashboard.tsx`, `tabs/*`, `pwa-app.tsx`, `student-profile/profile-page.tsx`, new `muawin/`, `shared/module-presentation.tsx`, `mobile-park-workspace.tsx`, `mobile-scoped-parks-page.tsx` and ~21 `.test.tsx` files | Cannot be committed as one small coherent unit: the reviewed interaction tests require the undeclared `@testing-library/react` and `jsdom` dev dependencies plus the `vitest.setup.ts` change, and ~25 interdependent files. Committing the components without those tests would leave untested code; committing the package/config change exceeds the brief's exclusion of package changes. | Dedicated owner-approved frontend commit including the test dependencies and setup change. |
| `prisma/schema.prisma`, `prisma/postgres/schema.prisma` | Two independent changes: `StaffMeta.assistsMurabbiId` (Team Access) and nullable `Participant.groupId` (U01). Committing them without a coherent migration chain is unsafe: the new `20260917193000_add_operation_receipts` migration duplicates `20260909020000_operation_receipts`, and the SQLite chain has no baseline or nullable-group migration. | Resolve the duplicate migration and the SQLite baseline, then commit schema + migrations together. |
| `prisma/migrations/20260916080000_add_muawin_assistance/`, `prisma/migrations/20260917193000_add_operation_receipts/` (+ PostgreSQL equivalents) | Untracked migrations. `operation_receipts` is created by two migrations in both chains, so a fresh replay fails; committing either folder makes the 5 release migration-count assertions fail (33 vs 31 PG, 19 vs 17 SQLite). | Owner decision on the duplicate, then commit migrations with the updated counts. |
| `src/lib/auth/muawin-assistance{,.test}.ts`, `src/lib/auth/screen-access{,.test}.ts` | Depend on the blocked frontend packet and/or the blocked `StaffMeta.assistsMurabbiId` Prisma field. | Commit with their owning packets. |

## 4. Excluded, not in accepted ATT01 scope (preserved uncommitted)

- Unrelated module UI/work: `admin/{fees,procurement,islah-mamulat,community,certificates,custom-report-builder,sync-conflicts,mobile-*,batches-page,people-page,students-page,access-provisioning-page,guardian-detail-sheet,staff-directory,participant-detail-sheet}`,
  `guardian/*`, `student/mobile-student-profile-view.tsx`.
- O01/U01 admin and guardian API changes: `admin/{students,users,invite,people,parks,guardians,batches,certificates}`, `guardian/{dashboard,schedule}`, `user/profile`,
  `admin/students/[id]/assignment`, `admin/parks/[id]/eligible-assistants`.
- Remaining attendance reliability edits not in an accepted commit packet:
  `attendance-alerts`, `dropout-policy`, `opportunities`, `session-list`,
  `close`/`reopen`/`reset`/`warnings`/`check-alerts`/`prepare`/`sync`/`summaries` routes.
- Repository/agent configuration and docs: `AGENTS.md`, `.agents/**`, `.codex/**`,
  `.commandcode/**`, `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md`,
  `docs/reviews/**`, `src/types/index.ts`.
- Sensitive/local/generated/private artefacts, never staged:
  `prisma/dev.db` (tracked, modified), `docs/sheets/*.xlsx` (tracked + untracked
  workbooks), `docs/pwa screens/*.png`, `tool-results/**`, `db/`,
  `prisma/generated/`, `.env*`, `*.log`, `*.tsbuildinfo`, `next-env.d.ts`,
  `qa-*.png`, the ~87 root one-off `.py` scripts, `$null`, `-`, `diff.txt`,
  `knip_output.txt`.
- This task's own release-preparation reports other than the reconciliation
  report (`ATT01_SOURCE_COMMIT_INVENTORY.md`,
  `ATT01_POSTGRES_MIGRATION_PREFLIGHT.md`, `ATT01_PILOT_RUNBOOK_DRAFT.md`,
  `ATT01_RELEASE_PREPARATION_HANDOFF.md`) and this manifest: committed separately
  below.

## 5. Validation commands and results

| # | Command | Result | Exit |
| --- | --- | --- | --- |
| 1 | `npx vitest run` (16-file commit-1 focused set) | 16 files / 110 passed | 0 |
| 2 | `npx vitest run` (team-access schema + provision) | 2 files / 20 passed | 0 |
| 3 | `npx vitest run src/lib/auth/city-head-provision.test.ts` | 1 file / 14 passed | 0 |
| 4 | `npx vitest run` (3 attendance route suites) | 3 files / 27 passed | 0 |
| 5 | `npx vitest run` (9 City Head focused suites) | 9 files / 117 passed | 0 |
| 6 | `npx eslint <staged paths>` per commit | clean | 0 |
| 7 | `npx tsc --noEmit` | pass | 0 |
| 8 | `git diff --check --cached` per commit | clean | 0 |
| 9 | `npm run lint` (repository) | 0 errors, 6 pre-existing warnings | 0 |
| 10 | `npx vitest run src/lib/attendance/team-access` | 30 passed / 1 failed | 1 |

Baseline limitations recorded, not hidden:

- The 5 release migration-count failures remain
  (`master-production-signoff`, `pilot-production-health`, `staging-smoke`) because
  the two new migration folders are untracked; they are blocked from this commit
  set (section 3). No count assertion was edited.
- The single team-access schema-reconcile baseline test failure (section 3).
- 2 pre-existing whitespace errors (`git diff --check` exit 2 repo-wide) in
  `src/app/api/park/attendance/[eventId]/close/route.test.ts:165` and
  `src/lib/attendance/__tests__/dropout-policy.test.ts:169`, unrelated and
  untouched.
- The full Vitest suite was not run (it has previously stalled); scoped suites
  were used and their exact counts are reported above.

## 6. Commits

| Commit | Subject | Files |
| --- | --- | --- |
| `c2588a6` | feat(attendance): add workbook reconciliation and local cleanup tools | 45 |
| `2b44751` | feat(attendance): add guarded local Team Access provisioning | 8 |
| `803321e` | feat(auth): add guarded local city head provisioner | 3 |
| `636a774` | fix(attendance): enforce the batch calendar on marking and correction | 7 |
| `0424ae9` | fix(auth): close City Head cross-city scope gaps | 20 |

After these commits: 129 tracked modifications and 399 untracked paths remain in
the working tree, preserved exactly as found (no `reset`, `restore`, `clean`,
stash or force operation was used).

## 7. Confirmation

No database file (`prisma/dev.db` or any `*.db`/WAL/SHM), backup, DPAPI handoff,
password, credential, `.env`, `tool-results/` file, spreadsheet or private source
row, migration, production artefact, or deployment artefact was staged or
committed. No PostgreSQL migration or live database was touched. No push or
deployment occurred.
