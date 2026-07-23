# Product Work Packages

**Status:** Owner-approved execution format, 2026-07-23

These packages replace one-task-at-a-time dispatching for the next delivery
phase. A worker owns its package branch until every listed task is complete.
Codex reviews the package as a whole; the same worker fixes review feedback.

## Shared Rules

- Base every package on `codex/production-hardening` at the recorded commit.
- Use a dedicated Git worktree; never work in the shared root checkout.
- Commit coherent subtask checkpoints, but create one final package handoff.
- Never handle secrets, deployment configuration, migrations against staging,
  production data, or real Lahore records.
- Do not change another package's allowed files. Stop and report overlap.
- Every behavior change requires allow, deny, and failure tests as applicable.
- Run focused tests while working, then lint, typecheck, full tests, and the
  required build before handoff.

## PKG-01: Content Planner Foundation

**Tier:** C3. **Start now.** This is the only package allowed to change Prisma
schemas until it completes.

### Objective

Turn the verified, non-writing content-plan parser into a city/batch/park
scoped internal planner for the four approved content categories. Support the
Lahore template plus State Life School override without importing real workbook
rows automatically.

### Required sequence

1. Reconcile `CP-IMPORT-001/002` code with the approved content-plan workbook
   contract; record any unsupported columns without guessing meaning.
2. Define additive planner models in both Prisma schemas and an additive local
   migration. Preserve SQLite/PostgreSQL alignment.
3. Add server-only city/batch/park/group scope helpers. Request parameters may
   narrow scope only; they must never broaden it.
4. Create bounded Zod contracts and protected APIs for draft plan/session/block
   list, read, create, update, and archive operations.
5. Enforce the four approved categories and collaboration-team mapping;
   off-days have no content blocks.
6. Add a dry-run-only import preview that returns a masked reconciliation
   report. It must never write or infer city, batch, park, or staff membership.
7. Implement the City Head/Super Admin planner workspace and Park/Murabbi
   scoped read workspace using existing visual patterns.
8. Show State Life School overrides clearly without changing the Lahore base
   plan.
9. Add audit events for writes without storing source workbook rows or
   unnecessary personal data.
10. Add focused API, scope-denial, parser, and UI state tests.

### Allowed domain

`prisma/schema.prisma`, `prisma/postgres/schema.prisma`, new additive migration,
`src/lib/content-planner*`, `src/app/api/**/content-planner/**`,
`src/components/modules/**/content-planner*`, focused tests, and relevant docs.

### Acceptance

Both Prisma schemas align; unauthorized/cross-city access returns `403`; a
dry-run has zero writes; off-days contain zero blocks; no real workbook data is
committed; SQLite/PostgreSQL builds and full quality gates pass.

## PKG-02: Lahore Current-System UAT And Repair List

**Tier:** C2. **Start now.** Documentation and test evidence only; do not
change application code in this package.

### Objective

Execute the prepared UAT safely against isolated `UAT_TEST_` records and
produce one evidence-backed repair list for the existing Lahore-backed system.

### Required sequence

1. Reconcile the UAT-002 to UAT-005 documents with the current integration
   branch and mark stale scenarios.
2. Confirm the Lahore baseline counts before testing; do not alter imported
   records.
3. Test Super Admin, Program Admin, City Head, Park Lead, Park Admin, Murabbi,
   Guardian, and Student workflows.
4. Capture direct API-denial evidence for cross-city, cross-park, and
   cross-group paths.
5. Execute the 375px and 390px mobile matrix for current attendance, people,
   dashboard, and access screens.
6. Record only reproducible defects with route, role, preconditions, expected
   and observed result, screenshot reference, and severity.
7. Classify each item as retain, remove, modify, or future feature.
8. Verify UAT_TEST_ cleanup and restored baseline counts.
9. Produce a single prioritized repair backlog; do not prescribe schema or
   implementation changes outside verified evidence.
10. Update the evidence log and handoff document only.

### Allowed domain

`docs/product-discovery/UAT-*`, `docs/uat-evidence/**`, and one new
`docs/product-discovery/LAHORE_STABILIZATION_REPAIR_BACKLOG.md`.

### Acceptance

No Lahore data changes; evidence is redacted; every claimed defect is
reproducible; cleanup is recorded; the output is ready to split into code tasks.

## PKG-03: Calling Import Preparation

**Tier:** C2. **Start now.** No Prisma, API route, UI, or database writes.

### Objective

Convert the approved Calls for Phase 2 workbook contract into a safe,
read-only, synthetic-fixture-tested importer foundation for the later Calling
module.

### Required sequence

1. Reconcile CALL-304, CALL-305, and CALL-306; flag conflicts rather than
   choosing business rules independently.
2. Implement workbook normalization for source sheets using only
   operator-supplied city/campaign context.
3. Normalize Pakistani phone formats and reject malformed rows with bounded
   errors.
4. Build duplicate-candidate detection using no raw PII in reports.
5. Produce HMAC-fingerprint-ready interfaces without reading/logging secrets.
6. Match only existing `AdmissionInterview` records in read-only mode;
   unmatched candidates go to a masked reconciliation report.
7. Provide a dry-run CLI with synthetic fixtures only. It must make no Prisma
   writes and must not commit a real workbook.
8. Cover malformed input, scope mismatch, duplicates, interview mismatch, and
   report masking with tests.
9. Document the precise implementation handoff for the later Calling schema
   package.
10. Run standard verification and supply a data/privacy impact statement.

### Allowed domain

New `src/lib/calling-import/**`, `scripts/dry-run-calling-import.*`, synthetic
fixtures/tests, and `docs/product-discovery/CALL-307-IMPORT-IMPLEMENTATION.md`.

### Acceptance

No database writes or real PII; no campaign/event inference; every scope comes
from explicit operator context; dry-run reports are masked and deterministic.

## PKG-04: Events And Responsibility Implementation Contract

**Tier:** C3. **Start now as contract/test preparation only.** It must not edit
Prisma until PKG-01 is approved and integrated.

### Objective

Turn EVENT-301 and EVENT-302 into an implementation-ready contract for scoped
events and temporary responsibilities such as Calling POC, Security, Parking,
and Welcome.

### Required sequence

1. Reconcile existing Event, AttendanceEvent, Batch, Park, Group, User,
   StaffMeta, CollaborationTeam, and audit models in current code.
2. Produce exact additive-model and relation changes for temporary event teams
   and responsibility assignments; distinguish them from login roles and
   permanent collaboration teams.
3. Define server-derived city scope through actor `StaffMeta`; inputs only
   narrow scope.
4. Define lifecycle, start/end expiry, revocation, assignment, and audit
   invariants.
5. Define City Head/Super Admin creation rights and scoped member visibility.
6. Define Zod contracts, API matrix, allow/deny/error test matrix, and UI
   states using existing design patterns.
7. Include a migration sequence, SQLite/PostgreSQL alignment requirements,
   rollout/rollback notes, and no-real-data rule.
8. Include Calling POC as a temporary event/Mashwara responsibility only, not a
   role or city-wide post.
9. Identify every file to be edited in the subsequent implementation package.
10. Publish a single implementation contract with open owner decisions called
   out explicitly.

### Allowed domain

`docs/product-discovery/EVENT-303-IMPLEMENTATION-CONTRACT.md` only.

### Acceptance

No code/schema/data changes. The follow-up implementation package has no
ambiguous entity ownership, scope, expiry, capability, migration, or test rules.

## Sequencing

PKG-01, PKG-02, PKG-03, and PKG-04 may begin together because their allowed
files do not overlap. After PKG-01 integration, Codex creates the Event and
Mashwara implementation packages. Calling schema/API work begins only after
the Event responsibility contract is approved.
