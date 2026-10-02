# BASE-01 — Completed intake and comparison baseline

Owner/reviewer: Astra. Date: 2026-09-11. **Outcome: ACCEPTED for baseline planning.** This is completion of reference/capability intake and preparation of the next consolidation task, not completion of the product, imports, integration, independent release review or production validation.

## Deliverables

- [Requirements matrix](REQUIREMENTS_MATRIX.md): all 35 catalogue capabilities and nine additional owner requirements; actors/scope, current route/model/UI, gap verdict, dependencies and acceptance requirements.
- [Worksheet map](WORKSHEET_MAP.md): all 57 worksheets across six immutable source workbooks, with row-grain direction, exclusions/holds, sensitive fields and target module/model/API families. Individual holds remain excluded from import until their module mapping is settled.
- [Consolidation refresh](CONSOLIDATION_REFRESH.md): freshly fetched original/local/published refs, 14 reconciliation areas, high-risk differences and operational limits. [108 path dispositions](MAIN_PATH_DISPOSITIONS.json) route every main-only path to review work; [branch evidence](BRANCH_REFRESH.json) retains all 171 patch-unique commits. Routing is not final feature equivalence.
- [Gemini image index](../reports/GEMINI_FRONTEND_REFERENCE_MAP.md) and [Astra qualifications](../reports/ASTRA_GEMINI_REVIEW.md): all 34 exact image files accounted for, 14 component hashes checked, with functional/state claims corrected by lead review. Gemini's visual classification is attributed; Astra independently viewed only the two previously recorded images. No current-rendering parity claim.
- [Notification review](../reports/ASTRA_DEEPSEEK_REVIEW.md): confirmed contract/read/audience/outbox defects and lead corrections to DeepSeek's proposed scope.
- [Next task: C0-01](../tasks/C0-01.md): preserve both histories and the dirty v2 candidate, verify recoverability, prepare isolated consolidation and the C1 packet. Ready, not started.

## Exact verification

| Check | Result / evidence |
| --- | --- |
| Fresh `npm test -- --reporter=json --outputFile=docs/delivery/baseline/TEST_RESULTS.json` | Exit 0; **187 files, 1,375 passed, 0 failed, 0 pending**. [Test report](TEST_RESULTS.json). Passing old defect-characterization tests is not fix verification. |
| Fresh `npm run lint` | Exit 0; 0 errors, six pre-existing unused-disable warnings in operational scripts. No auto-fix. |
| Fresh `npm run typecheck` | Exit 0; no diagnostics. |
| Independent worksheet reconciliation | All 57 sheets: openpyxl traversal matches XML nonempty row/cell counts, no mismatches. [Results](XML_RECONCILIATION.json). No formula evaluation/import or private row export. |
| Structural verification script | **15 checks passed**, including six unchanged workbook hashes, exact image coverage, 35/57 IDs, fetched refs, 108 path routing, previous build manifest and local links. [Results](STRUCTURAL_VERIFICATION.json). |
| Source/reference preservation | **897 selected file hashes unchanged**, no added/deleted selected paths, HEAD unchanged. [Baseline](SOURCE_BASELINE.json), [comparison](PRESERVATION_CHECK.json). Includes source/schema/lockfiles/workbooks/images; does not claim to hash every unrelated local document. |
| Existing SQLite build evidence reuse | All **823 recorded input hashes match** the 2026-09-10 isolated SQLite build manifest. Previous successful build retained; not rerun. No code/routing/schema/build configuration changed by BASE-01. |
| Workflow metadata | `node scripts/delivery/check-workflow.mjs` passes; task state records BASE-01 done, C0-01 ready. Coordination validity is not product correctness. |

The fresh test run used the existing synthetic test suite, including its synthetic calling dry-run subprocess. No configured/live database, live account, provider send, migration, deployment or browser operation was performed by BASE-01. Native database and browser evidence in earlier reviews remains historical with its recorded coverage. No fresh PostgreSQL build, dependency audit, production UAT or full main/v2 behavioral parity was run here.

Extractor corrections made during this task: handling unsized and empty sheets, then resetting misleading declared dimensions. The registration export actually contains A1:BQ760; initial A1-only traversal was rejected. Final XML reconciliation validates the corrected traversal across every sheet. Openpyxl warned that one workbook lacks a default style; it applied an in-memory default for reading, and workbook hashes stayed unchanged. No spreadsheet was rewritten.

## Current priorities and open boundaries

The candidate has strong verified foundations and also real uncovered gaps: event registration target scope/capacity/fee trust, notification read/audience/cache behavior, mobile parks reference-data fallback/failed saves and inventory sample/local-only workflows. Preserve mobile design while resolving behavior. All these remain in the matrix and reconciliation plan; baseline acceptance does not resolve them.

Published main still carries Media Briefs, server search, event registration/fee/check-in and historical attendance behavior requiring preservation or a proved replacement. It must not be overwritten with the v2 tree. Main's REST branch flag is currently unprotected; live deployment trigger/schema state is unknown. C0 records a deliberate merge process before later integration/release work.

Field-by-field import mapping, deduplication, source precedence, financial reconciliation and approved safeguarding/retention decisions remain later module tasks. No real data has been imported. The explicit `Hold` worksheets have a preservation/exclusion disposition rather than an invented interpretation.

**Next: Astra executes C0-01.** Gemini and DeepSeek wait for bounded implementation assignments. After consolidation and canonical-main documentation, Notifications remains the first product module. Current mobile stays default; optional desktop/tablet modes from Settings remain deferred.
