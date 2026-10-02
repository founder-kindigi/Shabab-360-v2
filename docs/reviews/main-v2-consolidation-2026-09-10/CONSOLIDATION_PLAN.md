# Main / v2 consolidation and documentation plan

Date: 2026-09-10. Status: proposed execution plan, based on a fresh fetched Git comparison.

## Owner decision and intended result

The owner approves v2 as the product baseline. Preserve its interface, operational improvements and audit corrections. Before consolidating into main, account for features and modules from the original main line that v2 may have missed. After the verified consolidation, rebuild current documentation from the resulting system, then resume development from one canonical main branch.

This approval is recorded; do not ask the owner to approve v2 again. It does not silently settle conflicting business rules discovered between branches, enable previously gated workflows, or authorize a live database mutation. This task prepares the plan and comparison evidence; it does not merge, push or deploy application changes.

## Fresh baseline and comparison boundary

`git fetch origin --prune` succeeded. Source working tree was clean before this planning work. No application files, branch heads or database were changed. Local tracking references were refreshed.

| Reference | Pinned commit | Relationship / significance |
| --- | --- | --- |
| Local `main` | `054dbb775e630ddb153c5e9a225b4980b43b493c` | Original local line; fully ancestral to v2, 214 commits behind it. |
| Published `origin/main` | `dedb91a640ea244ce9323cd1dcde2a40d74bb718` | Diverged from v2: 172 main-side commits and 272 v2-side commits since their common ancestor. |
| Approved `v2` and `origin/v2` | `401ff322726c3ceab9b05db776b2b076e63bbaf5` | Includes the correction commit `d2af03d` and subsequent memory update. |
| Published-main / v2 common ancestor | `159ba859c280b2ee197d4136f797b6385d772f4d` | Use this history when assessing branch-specific changes. |

The published main line is essential: comparing only local main against v2 would miss the parallel implementation. There are 171 main-side commits after Git's patch-equivalence filtering; commit counts are not feature counts.

| Static inventory | Local main | Published main | v2 |
| --- | ---: | ---: | ---: |
| API route files | 126 | 154 | 193 |
| App page files | 11 | 13 | 35 |
| PostgreSQL models | 48 | 55 | 74 |
| PostgreSQL migration SQL files | 12 | 17 | 31 |
| Tracked test/spec files, including historical evidence | 118 | 161 | 193 |
| Tracked `.worktrees` Git links | 36 | 0 | 36 |

Published main has 108 paths absent from v2, including 25 API routes, 39 test files and 18 documents. Another 233 shared paths differ. A route can be renamed or replaced, so these are investigation inputs, not a claim of 25 missing workflows. Exact paths, commits, schema differences and locked dependency versions are in [BRANCH_INVENTORY.json](BRANCH_INVENTORY.json). The initial feature assessment is in [FEATURE_PARITY_MATRIX.md](FEATURE_PARITY_MATRIX.md).

## Working rules for consolidation

1. Keep v2 as the product and UI baseline; treat useful main behavior as functionality to preserve, adapt or deliberately replace.
2. Preserve both histories. Do not force-push main, replace it with a v2 tree, or resolve every conflict using one side. A clean textual merge does not establish behavioral compatibility.
3. Every main-only route, test and meaningful commit needs a recorded disposition: **preserve**, **adapt into v2**, **equivalent replacement verified**, **intentionally gated**, or **owner decision required**. Unassessed is not an acceptable final disposition.
4. Retain v2's complete hierarchy checks, current identity validation, exact money, transaction/audit integrity, retry receipts and attendance version/reset protections throughout integration.
5. Preserve audit history and owner decisions. Never rewrite an old finding or test result to imply it described the new candidate.
6. Test with synthetic isolated accounts and databases. Operational schema/history discovery must be separately controlled and read-only; no data cleanup or migration is implied by this plan.
7. A branch merge and production rollout are separate operations. Before merging, inspect actual deployment triggers and establish what a main push will do; repository `vercel.json` does not reveal the project's production-branch setting.

## Phase C0 — Pin and preserve the baselines

**Current status:** initial inventory complete; execution snapshot still required when work starts.

- Refresh refs again, record exact SHAs and confirm no concurrent owner changes. If a ref moved, update the comparison rather than relying on this snapshot.
- Preserve immutable references to approved v2 and pre-consolidation published main, using tags or equivalent release references under the agreed repository workflow. Preserve any new uncommitted work separately; do not bulk-stage it.
- Use an isolated integration branch such as `codex/main-v2-consolidation`, based on the current published main. Keep the existing v2 checkout available for comparison.
- Record repository branch protection, CI requirements and deployment-trigger behavior through read-only inspection. Determine whether merging main triggers production and whether an authorized migration is required before runtime changes can safely run.

**Exit:** pinned source identities, isolated integration workspace, and a known merge/deployment boundary. No loss of either branch's work.

## Phase C1 — Complete behavior-level parity assessment

**Depends on:** C0. Initial comparison is provided, but full runtime parity is not yet verified.

- Inventory every published-main page, API method, navigation action, capability, schema model/field, background behavior and relevant test. Also review shared files that changed on both sides.
- Map the 35 catalogue modules to actual main and v2 code. Use the catalogue as a scope checklist, not as current completion evidence.
- Trace each workflow through UI → API → permission/scope → persistence → audit → recovery. Check desktop and the actual mobile PWA entry path, including routes accessible directly but absent from navigation.
- Review all 108 main-only paths and 171 patch-unique main commits. Account for deleted tests by restored behavior, equivalent current coverage, or an explicit obsolete-behavior explanation.
- Run original-main and v2 comparisons only with synthetic fixtures, isolated provider clients and separate browser profiles. Do not run arbitrary historical seed/reset scripts against configured services.
- Populate the feature matrix with exact code references, comparison test cases, resulting disposition and any narrowly stated policy conflict.

**Priority:** Media Briefs; event registration/fees/check-in; attendance schedule/roster/staff/report semantics; search; account lifecycle; calling pickers; Mashwara actions; team lifecycle; build/migration/security infrastructure.

**Exit:** no unassessed main feature, route family, schema difference or main-only test. Equivalent replacements require observable evidence; missing policy decisions remain explicitly gated and tracked.

## Phase C2 — Reconcile in dependency order

**Depends on:** C1 dispositions. Start integration with a normal merge of approved v2 into the isolated branch based on published main; resolve deliberately and commit reviewable packages. Do not commit an unresolved index or assume a merge strategy can choose product semantics.

| Package | Work | Required evidence |
| --- | --- | --- |
| C2.1 Foundation | Reconcile capabilities, shared authorization helpers, API contracts and supported dependencies. Keep v2 authority rules. Preserve main protections that remain applicable. Remove accidentally tracked worktree links from the candidate index only after verifying their identity; do not delete local worktree directories. | Complete missing/foreign-scope and reset/revocation tests; repository hygiene inspection. |
| C2.2 Data model | Reconcile five main-only models and incompatible shared models. Define deterministic mappings for event registration states/fees/consent, staff attendance event ownership, historical rosters and off-days. Pair SQLite/PostgreSQL changes. | Fresh schema comparison, migration histories, synthetic upgrades from both branch baselines, preservation assertions and backup/restore rehearsal. |
| C2.3 Attendance | Preserve v2's durable offline protocol and adopt or prove replacements for main schedules, roster snapshots, staff attendance integration and operational summaries. | Cross-park/batch scope, off-days/extra dates, historical denominators, closed/reset events, stale writes, replay, 200+ marks, two tabs and account switch. |
| C2.4 Events and fees | Consolidate the competing registration APIs; retain capacity and lifecycle behavior, real ledger-derived fees, scoped eligibility and idempotent check-in/attendance projection. Keep safeguarding actions gated until their lifecycle is approved. | Cross-city participant denial; malformed/unauthorized inputs; competing capacity claims; retry/audit rollback; cancellation and payment integrity. |
| C2.5 Operational parity | Restore/adapt Media Briefs, search, calling assignment pickers, Mashwara actions/notifications, team/member lifecycle and content-planner permission behavior. Preserve v2 presentation and improvements. | Actual role-bound UI/API tests, persisted results, denials, empty/error states and relevant mobile coverage. |
| C2.6 Performance and build | Preserve main bounded report pagination/print disclosure and useful query aggregation. Reconcile runtime/client reuse, lockfile patches and CI. Include both provider checks with isolated generated clients. | Meaningful large synthetic dataset checks, bounded queries, compatible UI response shape, clean-install CI and both production builds. |

Migration rules: preserve applied migration files/checksums; prefer additive forward reconciliation. Main includes a SQLite initial migration absent from v2; do not copy it into an already populated migration history and assume deploy will work. Test a safe baseline strategy for fresh SQLite and existing v2 SQLite. PostgreSQL shared migration hashes match, but this does not establish that operational tables or their histories match either branch's schema. Do not drop main-only fields/tables to satisfy the v2 model. Document and verify all required mappings first.

**Exit:** reviewable integration candidate, complete feature dispositions and package evidence. Previously gated workflows remain visibly unfinished; they cannot be counted as restored product capability.

## Phase C3 — Verify the combined candidate and review it independently

**Depends on:** C2.

- Record the integration commit and complete changed-file manifest. Compare its effective behavior against both pinned baselines and check neighboring consumers for regressions.
- Run relevant focused checks plus full lint, typecheck and normal regression discovery. Record actual process exit codes, file/test counts and warnings. Historical defect characterizations remain separate.
- Produce clean isolated SQLite and PostgreSQL builds and scan their emitted client bundles/source maps for private dataset leakage without printing dataset values.
- Run native PostgreSQL integrity/concurrency tests, migration replay, upgrades from the two supported baselines, and synthetic restore rehearsal. Establish a real SQLite migration baseline strategy rather than claiming schema creation proves migration replay.
- Browser UAT must include HQ, assigned city, park, group, guardian and participant roles where the workflow applies. Cover desktop/mobile entry points, direct URL access, reset/revocation, profiles, attendance/offline, fees, events, imports/gates and recovered main modules.
- An independent review reads the actual integration diff and fresh source. Since Astra implemented the prior corrections, this should be a fresh review task; do not relabel its implementation handoff as independent approval.
- Check planned migration and application rollback compatibility. Retain receipts, historical attendance versions and audit records through recovery.

**Exit:** no unresolved critical/high-risk integration defect; all mandatory parity checks either pass or are explicitly accepted product deferrals. Publish `INTEGRATION_VERIFICATION.md`, `INDEPENDENT_REVIEW.md` and a merge checklist tied to one candidate SHA. v2's previous results are historical baseline evidence, not verification of the new merged candidate.

## Phase C4 — Make main canonical

**Depends on:** C3 and a concrete reviewed integration candidate. Execute the merge only as part of the later authorized execution task.

- Submit the integration branch to published main through the protected repository workflow. The normal merge history should retain both source lines. Preserve provenance for any adapted or intentionally omitted feature.
- If published main changed, refresh and reverify the affected candidate before merging. Require passing checks for the exact merge candidate.
- Address production auto-deploy coupling before the merge. A runtime needing unapplied schema cannot be shipped by an incidental branch push. Obtain any separately required release/database authorization against the concrete candidate.
- After merge, record main's canonical commit, synchronize the local main checkout without discarding work, and create the agreed baseline release reference.
- Freeze v2 as historical reference. Keep its approved commit/tag available; do not continue parallel development there. Branch deletion is optional and is not required to establish one source of truth.

**Exit:** published main contains the verified combined implementation, both histories are recoverable, and active development targets main. Production deployment status is reported separately and only from observed evidence.

## Phase C5 — Rebuild documentation from canonical main

**Depends on:** C4. Draft facts during reconciliation; publish authoritative current-system documentation only against the final main SHA.

| Document | Source and required content |
| --- | --- |
| `README.md` and `docs/README.md` | Canonical branch, supported setup, navigation to authoritative docs, exact verification commands and visible unfinished features. Remove obsolete links/claims. |
| `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md` | Owner decisions, actual baseline, separately labelled target scope, unresolved decisions and next delivery order. Keep it the planning authority. |
| `docs/ARCHITECTURE.md` | Actual entry points, desktop/PWA structure, UI/API/services/database boundaries, providers, identity and offline data flow. |
| `docs/BUILD_AND_DEVELOPMENT.md` | Lockfile versions, supported Node/package manager, clean install, local configuration variable names only, isolated provider generation/builds, test discovery and CI/Vercel build commands. |
| `docs/MODULE_CATALOG.md` and module pages | Code-backed current status for all 35 modules, route/UI entry points, persisted behavior, permissions, tests, dependencies and explicit gates. |
| `docs/ROLE_BASED_ACCESS_MATRIX.md` | Role defaults, approved overrides, exact capabilities, resource scope, sensitive projections and server enforcement references. |
| `docs/DATA_MODEL_AND_MIGRATIONS.md` | Final paired schemas, model relations, main→canonical and v2→canonical mappings, migration history/baseline strategy and preservation invariants. |
| `docs/VERIFICATION.md` | Real test layers, synthetic fixtures, provider/browser requirements, CI gates, evidence artifact format and exclusions. Passing tests must not be described as coverage percentages. |
| `docs/OPERATIONS_RUNBOOK.md` | Verified deployment configuration, ownership, diagnostics, backup/restore, incident recovery and separate application/database rollback procedures. Unknown hosting settings remain marked unknown until inspected. |
| `docs/ROADMAP.md` and decision log | Prioritized next packages, explicit policy decisions, dependencies, acceptance criteria and retained feature-gap dispositions. |
| `AGENTS.md` and `.agents/memory/current.md` | Concise pointers to canonical documents, working agreements and verified current baseline. Keep history elsewhere. |

- Build a documentation inventory classifying each existing file as current authority, supporting reference, historical evidence or superseded plan. Keep original audit/review artifacts intact; link rather than overwrite their results.
- Resolve the current README/master-plan pointer conflict and stale branch/runtime claims in `docs/V2_RELEASE_BASELINE.md`. The current module catalogue also predates implemented procurement/inventory and remediation work.
- Remove duplicate authoritative descriptions by linking to a single owner document per topic. Keep desired product behavior distinct from observed implementation and deployed-state claims.
- Verify commands in an isolated clean checkout, check links against the actual repository, and tie each current-system status to the canonical commit and relevant evidence. Do not test destructive setup examples against existing data.

**Exit:** one documentation index; consistent branch/runtime/schema/module statements; no invented completion or deployment claims; old evidence preserved and clearly historical.

## Phase C6 — Resume development from main

**Depends on:** C5.

- Create short-lived `codex/*` feature branches from main. Merge small tested packages back into main; do not reopen a competing permanent product branch.
- Use the final module matrix and owner decision log to choose the next operational journey. Prioritize reliability and completion of approved core workflows over additional prototype screens.
- Each task names its module, actors/scope, persistence, failure/recovery behavior, acceptance tests and required documentation update before implementation.
- Keep independent review proportionate to risk. Auth, payments, safeguarding and migrations retain database/browser evidence requirements.

**Exit:** the next work package has an unambiguous specification anchored to canonical code and documentation.

## Current evidence limits

This planning pass fetched branches, compared Git history/file inventories/model definitions/build configuration, and inspected selected real handlers and consumers. It did not execute main's application, replay either branch's databases, inspect operational records, inspect hosting settings, perform a merge rehearsal or rerun full application tests. No application source was edited, so the earlier 1,375-test result is not presented as fresh parity evidence. Initial matrix findings must be completed through C1–C3 before merge readiness can be claimed.

## Execution order

**C0 snapshot → C1 parity → C2 reconcile → C3 independent verification → C4 main consolidation → C5 documentation rebuild → C6 resumed development.**

The immediate next executable package is C0/C1, using the pinned comparison and initial feature matrix supplied here. The owner-approved v2 baseline is retained throughout; discovered main functionality is recovered through explicit, tested integration rather than silently discarded.
