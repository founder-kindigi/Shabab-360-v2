# Shabab 360 delivery plan

Owner direction: 2026-09-11. Planning authority: [master blueprint](../CODEX_SHABAB360_MASTER_BLUEPRINT.md). This document defines execution, not a second product specification.

## Responsibility

| Owner | Accountable work |
| --- | --- |
| Project owner | Product intent, unresolved business rules, visual acceptance and release decisions |
| Astra / Codex lead | Requirements, architecture, API contracts and implementation, database design/migrations/imports, security, performance, integration, review, final refactoring and verification |
| Gemini | Frontend implementation from the named screenshots and approved API contracts; loading, empty, error, permission, mobile and accessibility states |
| DeepSeek | Explicitly bounded backend implementation when delegated; a clean-code pass on each changed module after integration |

One active module and one active task across all agents. Hand off sequentially; do not run Gemini and DeepSeek on overlapping work. Astra reads the actual diff and runs proportionate checks; model completion statements are not evidence. Astra's review of code Astra authored is an implementation review, not an independent release review.

Gemini and DeepSeek are not callable through the currently available tools. Use the repository task packet through the owner's chosen interface and return a patch or commit plus evidence. Do not substitute another model under either name, request credentials in chat, or upload full workbooks containing personal information. Named model execution is not a prerequisite for preparing precise assignments.

## What defines a requirement

1. Latest owner decision controls intent and overrides older plans.
2. `docs/pwa screens/` controls frontend appearance for covered views. Historical v2 UI is fallback context only. Screenshot records/counts are examples, not operational data or permissions.
3. `docs/sheets/` provides source data, fields, relationships and operational vocabulary. A spreadsheet is not a complete authorization or database schema specification.
4. Current source, tests and isolated runtime evidence define what exists and must be preserved.
5. The blueprint supplies wider workflow/role requirements. Record conflicts and resolve only the material missing decision.

Each module gets one small `docs/delivery/modules/<id>.md` containing requirement IDs and acceptance cases. Each requirement maps to a precise screen or workbook sheet-index/cell-range, current code, DB mapping, API contract, UI action and verification evidence. Use synthetic examples in packets. Do not infer that a visible button authorizes an unsafe workflow.

## Order of work

| Stage | Scope | Exit |
| --- | --- | --- |
| D00 — this planning task | Team workflow, reference inventory, skills, hooks, memory, first task | Runnable coordination checks and reviewable plan |
| BASE-01 — first execution task | Pin current candidate and dirty-work ownership; classify all 34 reference images; inspect all 6 workbooks; establish requirements and current gaps; refresh main/v2 parity evidence | Source/version register, module/requirement matrix, verified reuse of existing evidence, exact outstanding decisions |
| Consolidation | Execute the existing [main/v2 plan](../reviews/main-v2-consolidation-2026-09-10/CONSOLIDATION_PLAN.md), one C0–C5 task at a time, preserving this delivery workflow and screen authority | Reviewed canonical main, useful main features accounted for, migration/deployment coupling addressed, current docs tied to candidate SHA |
| N01 — Notifications | First product module after consolidation; trace bell, mobile/desktop lists, announcements, read state and outbox before fixing | Real scoped in-app read/unread behavior and event-to-feed tests; external delivery separately classified |
| Remaining modules | Follow the queue below, verify existing behavior before adding missing behavior | Complete the module definition of done before advancing |

Consolidation still precedes renewed product development, per the owner's earlier instruction. It is an integration stage with serial packages, not permission to start several product modules. Do not execute a merge, push, deployment or live import merely because this plan exists. Preserve the uncommitted UI-restoration candidate and separate consolidation documents.

Proposed module queue after N01 (finalize exact requirement scope during BASE-01):

| Order | Module | Main inputs/dependencies |
| --- | --- | --- |
| 2 | Organisation, accounts, people and profiles | Existing identity foundation; screenshot parks/structure; Batch 2 profiles and roster fields; account lifecycle decisions |
| 3 | Admissions, placement and registration import | RegistrationRequests workbook; deduplication and people mapping |
| 4 | Calling and calling-history import | Calls for Phase 2 workbook; admissions identities |
| 5 | Content planner and Murabbi training | Replacement B4 content workbook and Murabbi Training Lahore workbook; lessons screens; roles and publication lifecycle |
| 6 | Attendance, offline sync and attendance import | Batch 4 workbook; people, calendar/session identity; preserve receipts/versions |
| 7 | Safeguarding, consent and family access | Verified guardian links and approved sensitive-data lifecycle |
| 8 | Calendar, Mashwara, events, responsibilities and venues | Split into serial tasks/submodules; dependencies from core delivery and consent |
| 9 | Finance | Existing ledger; approved fee/refund/waiver lifecycle |
| 10 | Procurement and inventory | Existing requests/transfers; receiving/fulfillment lifecycle |
| 11 | Messaging | Notifications, membership and approved role-pair/moderation/retention rules |
| 12 | Community | Identity, moderation, reporting/blocking, visibility/media consent; screenshots for missing views require owner direction |
| 13 | Resources, Islah and certificates | Separate serial modules; publication, sensitive logs and issuance policies |
| 14 | Role portals, dashboards, reports, audit and settings | Update related views during each module; final cross-module verification here |
| 15 | Public site and final operational documentation | Approved programme content and complete module evidence |

BASE-01 must account for all 35 catalogue capabilities, including teams, assignments and grouping, within this queue. Catalogue statuses dated July are historical, not a current gap verdict. Do not invent missing features from filenames alone.

If a module is blocked on a material owner decision, mark it **blocked**, keep its unfinished requirements visible and choose one independent ready task. There is still at most one active task. A gated module is not complete. Ask a single bundled question for that module when needed; do not repeatedly ask for already recorded decisions.

## Deferred display modes

Owner-confirmed on 2026-09-11: preserve the current mobile view as the default.
Desktop and tablet alternatives will be designed later and enabled explicitly
from Settings. No current UI, routing, breakpoint or settings implementation is
authorized by this planning entry. Missing desktop/tablet references do not block
verification or repair of the current mobile modules.

| Later serial task | Deliverable / acceptance |
| --- | --- |
| Display requirements — Astra | Inventory existing shell/settings behavior; specify explicit Mobile (default), Tablet and Desktop choices. Large viewport alone must not switch modes. Define safe mobile fallback, preference persistence and account/device behavior before coding; per-device preference is a proposal, not an owner decision. |
| Design — Gemini | Propose tablet and desktop layouts for one completed module using the existing brand and mobile workflow. Obtain owner visual acceptance before implementation; do not infer a desktop layout from a desktop browser showing a narrow mobile column. |
| Contract and settings — Astra | Reuse current domain APIs and authorization. Add a preference API/schema only if the accepted persistence design needs it. Settings changes affect presentation, never role, permissions or dataset scope. |
| Frontend — Gemini | Implement the accepted module's alternate views and explicit settings selection. Preserve mobile design, unsaved edits, offline queues and navigation. Load optional presentation code only when needed where practical. |
| Review/cleanup/verification | Astra integrates, DeepSeek performs bounded cleanup, Astra reviews. Verify default and explicit selection, reload, resize/rotation, account switching, unavailable-view fallback, keyboard/touch, overflow, loading/error/denied states and identical authorized data/actions across layouts. |

Repeat for one module at a time after its mobile workflow and backend are verified.
Turning off an alternative or removing an invalid preference must return to mobile
without losing business data. Keep this phase deferred until separately scheduled;
do not add it to the active task queue now. Current desktop behavior is preserved
during this planning work, even where it needs later reconciliation with the target.

## One-module delivery cycle

1. **Understand — Astra:** inspect relevant references, actual code and tests; distinguish existing/defective/missing/gated behavior. Define actors, hierarchy, workflow transitions, edge cases and measurable acceptance cases.
2. **Contract/data — Astra:** define or preserve endpoints, bounded inputs, response/error types, capabilities, scope, pagination, concurrency/retry behavior and field mappings. Reuse existing models/services where valid. Agree material business decisions before dependent writes.
3. **Backend — Astra or assigned DeepSeek:** implement the smallest vertical slice with relevant DB/route tests. Astra owns high-risk design and reviews delegated changes before frontend work.
4. **Frontend — Gemini:** implement the exact named reference and contract. Match typography, gradient, spacing, cards, sheets, navigation and responsive behavior. Preserve existing features; no API/schema invention or broad redesign. Missing reference means a documented gap, not a license to invent a visual system.
5. **Clean code — DeepSeek:** after Astra integrates the slice, make a bounded behavior-preserving pass using `shabab-clean-code`. Return diff and evidence. Astra reviews, rejects unnecessary abstraction and performs final refactoring where needed.
6. **Verification — Astra:** focused tests during iteration; lint, typecheck and full suite before substantive module completion; affected provider builds, route/DB checks and real browser checks as required. Re-run affected checks after refactoring. Reuse unchanged, hash-matched evidence rather than repeating broad suites unnecessarily.
7. **Documentation/acceptance — Astra + owner:** update the module contract, data dictionary, operator instructions and evidence. Astra records technical acceptance; owner reviews material visual/product decisions. Close task/module only when mandatory criteria pass or the owner explicitly narrows scope. Move to the next module afterward.

## Spreadsheet-to-database work

- Preserve originals and file hashes. Inspect workbook content type, not just extension. Keep private rows local and out of source bundles, screenshots, public docs and external-agent packets.
- Map each column and date header to a domain field or an explicit ignored/derived/requires-decision disposition. Identify what one row represents. Workbook dimensions and stored rows include formatting and are not import totals.
- Link city → batch/park → group → participant/guardian/caller/session using reviewed stable keys; names alone are not safe unique identifiers. Preserve Urdu/text, phone prefixes/leading zeros, local dates and historical meaning.
- Normalize repeating attendance date columns into event/attendance rows. Preserve blank vs absent vs not applicable; distinguish formulas/summaries from source records. Do not recreate historical attendance by assuming every blank means absent.
- Stage and dry-run first: accepted, rejected, duplicate, ambiguous and unmatched counts with source-sheet/row provenance. Report sensitive errors by row/key, not full personal records.
- Use repeatable import-batch identities, uniqueness constraints and transactions. Re-running the same import must not duplicate people, payments, attendance or calling interactions. Keep historical sources distinguishable from later API updates.
- Reconcile source/accepted/rejected totals and business invariants in disposable SQLite and PostgreSQL. Test retry, partial failure and rollback/recovery. Update both schemas and forward migrations where applicable; preserve applied migration history.
- The intended outcome includes importing the source data. Select the real target and approve the concrete import report before applying to a live database; the planning task performs no live import or account creation.

## Evidence and completion

Required evidence: exact candidate SHA plus dirty-file hashes, commands/exit codes, meaningful test results, endpoint authorization/validation/negative cases, persistence and rollback where relevant, desktop/mobile screenshots compared with the specified reference, and recorded limits. Financial/concurrent/offline changes need duplicate/retry/conflict checks. Notification checks must distinguish queued, provider-accepted, delivered and read; a `sent` field alone is not delivery proof.

Performance criteria are agreed per module using a named synthetic dataset and measured baseline: bounded pagination/projections, query count, payload size and response time. Improve confirmed bottlenecks without speculative repository-wide rewrites.

Baseline evidence already available: UI-restoration suite 1,375 tests/187 files, 37 visual captures and 12 actual PWA/SQLite checks. Reuse only when its source manifest and tested behavior still match. Owner-reported deployed condition, local verification, visual acceptance and release approval remain separate facts.

## Low-token operating rules

- Start with AGENTS, concise memory, delivery state and the active packet. Read only the module's reference ranges and relevant blueprint sections; do not reload large audits by default.
- One small packet, one patch, one concise result. Target a one-page assignment and a short handoff; link logs instead of pasting them. Do not send whole conversation history or workbooks to delegates.
- Astra handles requirements and difficult review; delegate only a concrete task whose savings exceed handoff/review cost. No duplicate implementation, unnecessary agent fan-out or repeated full audits.
- Preserve useful code and tests. Avoid formatting unrelated files, creating parallel service architectures or generating documentation that repeats the same facts.
- Record actual token/time figures only when available; do not invent estimates or promise a fixed project cost.

## Documentation policy

Maintain professional Markdown in the repository as the single editable documentation source. Start with the [documentation index](README.md), then publish current-system architecture, setup/build, API contracts, data dictionary/migrations, permissions, module/operator guides and operations/recovery from verified code. Each page states status, owner and verified candidate/date. Keep target scope separately labelled. Redact examples and retain historical audits as evidence.

During each module, update documentation alongside code. After canonical-main consolidation, reconcile overlapping old pages and broken links; retain provenance rather than deleting history. Export PDFs/Word only if needed later, from the maintained source.
