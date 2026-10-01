# ATT01 source readiness and commit-preparation inventory

Date: 2026-09-18. Task: ATT01 release preparation, Phase B (release gate 1 —
reviewed source inventory and commit boundary). Mode: **non-mutating**. No commit,
push, deploy or database write was performed.

Method: `git status --porcelain`, `git diff --name-only`, `git ls-files --others
--exclude-standard`, `git status --ignored`, `git ls-files`, `git check-ignore`.
Working tree at inspection: 153 tracked modifications, 451 untracked non-ignored
paths, 66 ignored entries, `153 files changed, 6769 insertions(+), 1970 deletions(-)`.

## 1. Tracked modifications (153)

ATT01-relevant groups:

- **Attendance API** — `src/app/api/park/attendance/**` (route, `events`,
  `prepare`, `sync`, `[eventId]`, `[eventId]/close|reopen|reset|records/[recordId]`,
  `check-alerts`, `warnings`, `summaries`, `parks`) plus their `.test.ts`.
- **Attendance lib** — `src/lib/attendance-alerts.ts` (+test),
  `src/lib/attendance/apply-mutation.ts`, `dropout-policy.ts`,
  `opportunities.ts` (+test), `session-list.ts`,
  `src/lib/attendance/__tests__/dropout-policy.test.ts`.
- **Authorization** — `src/lib/auth.ts`, `src/lib/auth/{capabilities,scope,hierarchy,identity,screen-access}.ts`
  and tests.
- **Admin/City Head surfaces** — `src/app/api/admin/{dashboard,home-analytics,reports,students,users,people,parks,mashwara,...}`
  and `src/app/api/city-head/dashboard`, `src/app/api/guardian/*`, `src/app/api/user/profile`.
- **Mobile UI** — `src/components/modules/**` (admin, city-head, guardian, murabbi,
  park, student, student-profile), `src/components/pwa/pwa-app.tsx`,
  `src/components/shared/{attendance-edit-dialog,attendance-report-print,heatmap-calendar}.tsx`.
- **Schema** — `prisma/schema.prisma`, `prisma/postgres/schema.prisma`,
  `prisma/postgres/migrations/20260909050000_align_modeled_constraints/migration.sql`.
- **Config/docs** — `package.json`, `package-lock.json`, `AGENTS.md`,
  `.agents/memory/current.md`, `.agents/skills/shabab-build-feature/SKILL.md`,
  `.codex/hooks.json`, `.codex/hooks/session-context.mjs`, `vitest.setup.ts`,
  `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md`, `src/types/index.ts`.

**Tracked deletions present:** `docs/pwa screens/Screenshot 2026-09-04 211600.png`,
`...211640.png`, `docs/sheets/B4_ Shabab Content Plan (1).xlsx`,
`docs/sheets/Shabab_Batch_4_Attendance (1).xlsx`.

## 2. New files that must be added for ATT01 delivery

- Reconciliation tooling (this task): `scripts/att01-workbook-reconciliation.ts`
  + `-impl.ts`, `src/lib/attendance/lahore-refresh/reconcile.ts`,
  `reconcile-sqlite.ts`, `reconcile.test.ts`.
- Lahore refresh tooling: `src/lib/attendance/lahore-refresh/**` (16 modules/tests),
  `scripts/lahore-batch-4-refresh.ts` + `-impl.ts`.
- Local schema compatibility: `src/lib/attendance/attendance-schema-contract.ts`
  (+test), `attendance-schema-reconcile.ts` (+test),
  `park-staff-attendance-schema.ts` (+test),
  `park-staff-attendance-reconcile.ts` (+test), `sqlite-support.ts`,
  `scripts/att01-database-compatibility.ts` + `-impl.ts`,
  `scripts/reconcile-park-staff-attendance.ts` + `-impl.ts`.
- Team access / provisioning: `src/lib/attendance/team-access/**` (6 files),
  `scripts/provision-lahore-team-access.ts`, `scripts/provision-local-city-head.ts`,
  `src/lib/auth/city-head-provision.ts` (+test), `muawin-assistance.ts` (+test),
  `role-labels.ts` (+test), `scripts/team-access-schema-compatibility.ts` + `-impl.ts`.
- Migration preflight: `src/lib/migrations/**` (4 files),
  `scripts/sqlite-migration-catalog-audit.ts` + `-impl.ts`,
  `scripts/sqlite-migration-replay-probe.ts` + `-impl.ts`.
- New routes: `src/app/api/admin/parks/[id]/eligible-assistants/**`,
  `src/app/api/admin/students/[id]/assignment/**`, plus new `.test.ts` files
  (`home-analytics`, `city-head-scope`, guardian dashboard/schedule).
- New UI: `src/components/modules/muawin/**`,
  `src/components/modules/shared/module-presentation.tsx`,
  `src/components/modules/park/mobile-park-workspace.tsx`,
  `mobile-scoped-parks-page.tsx`, and the new `.test.tsx` suites.
- **New migrations (both providers):**
  `prisma/migrations/20260916080000_add_muawin_assistance/`,
  `prisma/migrations/20260917193000_add_operation_receipts/`,
  `prisma/postgres/migrations/20260916080000_add_muawin_assistance/`,
  `prisma/postgres/migrations/20260917193000_add_operation_receipts/`.
- Delivery system (currently untracked in full): `docs/delivery/**`
  (including the authority `docs/delivery/state.json`,
  `docs/delivery/ATT01_PILOT_AND_ITERATION_PLAN.md`, tasks/, packets/, reports/,
  baseline/, consolidation/), `docs/README.md`,
  `docs/reviews/main-v2-consolidation-2026-09-10/**`,
  `docs/reviews/ui-restoration-2026-09-10/**`, `scripts/delivery/**`,
  `.agents/skills/shabab-clean-code/`, `.agents/skills/shabab-module-delivery/`,
  `.codex/hooks/delivery-reminder.mjs`.

## 3. Must NOT be committed (private, local, generated or unrelated)

**Data-boundary blockers (currently TRACKED in git — owner decision required):**

- `prisma/dev.db` — tracked and modified. This is the local database holding the
  Lahore participant roster, staff accounts and password hashes. It is **not**
  ignored. It must be excluded from any delivery commit; untracking it
  (`git rm --cached`) is a history-affecting change that needs explicit owner
  approval and is **not** performed here.
- `docs/sheets/*.xlsx` — four private source workbooks are tracked
  (`B4_ Shabab Content Plan (1).xlsx`, `Calls for Phase 2 (1).xlsx`,
  `RegistrationRequests-06-08-2026.xls`, `Shabab_Batch_4_Attendance (1).xlsx`),
  two of them deleted in the working tree. A further five workbooks are untracked
  and must stay untracked. None of these may be committed.
- `tool-results/read_*.txt` — ~31 tracked agent scratch reads inside the ignored
  `tool-results/` directory. Delivery-irrelevant.

**Ignored and correctly excluded (do not commit):**

- Secrets/config: `.env`, `.env.local`, `.env.bootstrap`, `.vercel/`, `.claude/`.
- Database/backups/generated: `db/`, `prisma/generated/`, `tool-results/**`
  (all `att01-local-backups/`, `att01-schema-backups/`,
  `team-access-backups/`, `team-access-password-handoffs/`,
  `team-access-password-recovery-backups/`, `city-head-provision-backups/`,
  `att01-team-access-private/`, dry-run probes), `.next/`.
- Logs/artifacts: `*.log`, `*.tsbuildinfo`, `next-env.d.ts`,
  `docs/reviews/**/*.log`.

**Root litter (untracked, must never be committed — owner should delete):**

- 87 one-off root-level `.py` scripts (`patch*.py` 54, `fix*.py` 18,
  `scratch*.py` 14, plus `add_pragma/clean_*/count/debug_*/reset_test/rewrite`).
- `$null`, `-`, `diff.txt`, `knip_output.txt` at the repository root.
- Tracked root screenshots `qa-*.png` (11 files) are unrelated QA captures.

## 4. Required test evidence and known failures

Required before delivery: focused reconciliation tests; relevant
attendance/import tests; `npm run lint`; `npx tsc --noEmit`; scoped
`git diff --check`. Results are recorded in the final verification section of this
task's handoff.

Known, pre-identified failures (evidence in
`docs/delivery/tasks/ATT01_CITY_HEAD_READINESS.md` and the migration reports):

- **5 release migration-count assertions** fail because the two new ATT01
  migration folders are new and untracked in both chains:
  `src/__tests__/release/master-production-signoff.test.ts` (31 PG / 17 SQLite),
  `pilot-production-health.test.ts` (31 / 17), `staging-smoke.test.ts` (31),
  `production-build.test.ts` (folder presence). Confirmed by running the release
  slice: **162 passed / 5 failed**, all five being `33 vs 31` (×3) and `19 vs 17`
  (×2) counts. This is a **known count drift**, not a routing or schema defect; it
  must be resolved by the commit adding the two new migrations (and only then
  updating the assertions), never by editing the counts to match.
- **1 stale baseline assertion (newly surfaced):**
  `src/lib/attendance/team-access/schema-reconcile.test.ts > real-schema disposable
  copy > detects the real gap and reconciles a copy without touching the original`
  expects the real `prisma/dev.db` copy to still lack `assistsMurabbiId`
  (`plannedStatements: 2`, `upToDate: false`). The owner-authorized team-access
  schema reconciliation has since landed, so the copy reports
  `assistsMurabbiColumnPresent: true`, `plannedStatements: 0`, `upToDate: true`.
  This is a baseline-dependent test, not a product defect. The bounded fix is to
  make it baseline-independent; it is **not applied here** because it is outside
  this task's scope.
- `src/lib/attendance/team-access/provision.test.ts` previously asserted
  `exactPlaceholderMismatches: 1`; the corrected expectation is `0` with
  `roleGroupCodeViolations: 11`. It passes in the current tree.
- **2 pre-existing whitespace errors** in tracked-modified files:
  `src/app/api/park/attendance/[eventId]/close/route.test.ts:165` and
  `src/lib/attendance/__tests__/dropout-policy.test.ts:169` both add "new blank line
  at EOF", so repository-wide `git diff --check` exits 2. Both files are unrelated
  to this task and were already modified before it; they are left untouched.

## 5. Source-level clean-code review (bounded)

- **Duplicate create-event routes (F-18, open):**
  `src/app/api/park/attendance/route.ts` POST and
  `src/app/api/park/attendance/events/route.ts` POST both create an attendance
  event with the same scope, calendar and duplicate-date checks. Kept because
  caller evidence has not been reviewed; not removed here.
- **Three local schema appliers coexist:** `attendance-schema-reconcile.ts`,
  `park-staff-attendance-reconcile.ts`, `team-access/schema-reconcile.ts`. They
  share `sqlite-support.ts` primitives but not the apply loop. Documented as an
  Astra refactoring follow-up; consolidation is not attempted here.
- **Legacy staff-attendance tables** (`staff_attendance_events` /
  `staff_attendance_records`) remain in the local database with unresolved
  lineage beside the canonical `park_staff_attendance_*` pair. Reported, not
  touched.
- **No dead or unreferenced delivery-critical file found** among the new ATT01
  modules; the reconciliation, refresh, schema and entitlement modules are
  imported by their tests and scripts. `attendance_roster_snapshots`,
  `batch_off_weekdays`, `batch_off_dates` are declared in `schema.prisma` but
  referenced by no code — already tracked as declared-unreferenced.
- **Unsafe/generated artifacts are not tracked** except for the data-boundary
  blockers in section 3, which are the only material risk found.

## 6. Recommended commit boundary

One focused commit (or a small ordered series) containing:

1. `src/lib/attendance/**`, `src/lib/auth/**`, `src/lib/migrations/**`
2. `src/app/api/**`, `src/components/**`
3. `prisma/schema.prisma`, `prisma/postgres/schema.prisma`, and the four new
   migration folders
4. `scripts/**` delivery tooling
5. `docs/delivery/**`, `docs/README.md`, `docs/reviews/**`
6. `package.json` / `package-lock.json`

Explicitly excluded: `prisma/dev.db`, `docs/sheets/**`, `tool-results/**`,
`.env*`, `prisma/generated/**`, all `*.log` / `*.tsbuildinfo`, tracked `qa-*.png`,
and the 87 root `.py` litter scripts.

**Owner decisions required before committing:** (a) whether to untrack
`prisma/dev.db` and `docs/sheets/*.xlsx`; (b) whether the entire currently-untracked
`docs/delivery/**` tree becomes tracked; (c) whether tracked `qa-*.png` and
`tool-results/read_*.txt` are removed from the index.

No commit, push, deployment or release approval is claimed.
