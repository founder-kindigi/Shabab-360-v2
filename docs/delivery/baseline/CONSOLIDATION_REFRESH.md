# Main/v2 comparison refresh

Owner: Astra. 2026-09-11. **Outcome: baseline refreshed; integration remains required.** No merge, branch replacement, push, deployment or live database action.

`git fetch origin` succeeded after the initial sandbox denied writing FETCH_HEAD. Read-only GitHub inspection confirms repository `founder-kindigi/Shabab-360-v2`, default branch `main`, main SHA below and REST branch `protected: false`. This does not establish Vercel production-branch settings or enumerate every repository rule. No remote settings changed.

| Ref | SHA |
| --- | --- |
| Working v2 / origin/v2 | 401ff322726c3ceab9b05db776b2b076e63bbaf5 |
| Original local main | 054dbb775e630ddb153c5e9a225b4980b43b493c |
| Published origin/main | dedb91a640ea244ce9323cd1dcde2a40d74bb718 |
| Merge base | 159ba859c280b2ee197d4136f797b6385d772f4d |

All refs match the earlier comparison. Published main and v2 remain **172/272 commits divergent**, with **171 patch-unique main commits**, **108 main-only paths**, and **233 modified shared paths** in the Git comparison. Main-only is calculated by tree-path set difference; rename-detecting deleted-file counts produce 107 and must not be used as the path inventory. [BRANCH_REFRESH.json](BRANCH_REFRESH.json) preserves the exact lists.

The current candidate also includes the uncommitted UI-restoration/delivery work. [SOURCE_BASELINE.json](SOURCE_BASELINE.json) hashes the actual working files; HEAD alone is not their identity. Owner approval of v2 does not waive the newly found source defects or approve all unfinished workflows.

## Reconciliation dispositions

These are explicit next-work dispositions, not claims of implemented or behaviorally equivalent replacements. The 108 paths are routed to a parity register item in MAIN_PATH_DISPOSITIONS.json; every one must receive tested preserve/adapt/replacement/gated reasoning during C1/C2. All 171 patch-unique commits remain in the evidence so path routing cannot silently discard behavior in shared files.

| Register | Disposition and current evidence | Required integration proof |
| --- | --- | --- |
| MP01 Media Briefs | Adapt missing model and `/api/admin/media/*` plus UI. Fresh main source confirms scoped collection reads and persisted lifecycle footprint. | Current capability/scope rules, safe assignees, lifecycle/audit and migrated rows; no UI redesign. |
| MP02 Event registration/fees/check-in | Reconcile incompatible contracts. Fresh v2 POST still reads an active participant without target hierarchy; capacity count/upsert and audit are not one transaction, and fee/consent flags are caller supplied. Main EventFeeSchedule and check-in projection cannot be discarded. | Target-scope denial, concurrent capacity, ledger-derived fees, retry/cancellation/check-in and policy-approved consent; paired migration preserving both histories. |
| MP03 Calendar/off-days | Assess replacement: main BatchOffDate/BatchOffWeekday versus v2 OperationalOffDate/BatchClassDate. | Same dates/timezone/off-days/extras in preparation, schedule and reports. |
| MP04 Historical attendance/reporting | Adapt missing history behavior or prove equivalent. Main AttendanceRosterSnapshot and summaries have no same-named v2 model/helper. | Transfers/inactive dates must not rewrite historical denominators; compare identical synthetic histories. |
| MP05 Staff attendance | Reconcile event ownership: main AttendanceEvent versus v2 StaffAttendanceEvent. | Preserve old staff record IDs/relationships, closure/correction, scope and migration rollback. |
| MP06 Global search | Adapt missing server `/api/search`; main source confirms scoped result types and query schema. Navigation search is not a replacement for people search. | Minimum projections, capability/hierarchy filters and bounded results, including foreign-person discovery denial. |
| MP07 Accounts/profiles | Assess missing student/guardian account endpoints against v2 invite/profile flows. | Link/create/reset/deactivate identity and session invalidation; retain unapproved provisioning gates. |
| MP08 Calling | Adapt useful main UI-context and assignment-options behavior into v2's corrected authorization. | POC/caller candidate scope, reassignment, campaign locks and source-import identity. |
| MP09 Mashwara | Adapt action-item update/context/notification behavior or prove replacement. | Scoped assignees/status, atomic audit/outbox, escaped minutes; queue is not delivery proof. |
| MP10 Teams | Assess overlapping team/member APIs, preserve useful activity/membership behavior. | Membership IDs/state transitions, visibility and revoked capabilities; do not expand hierarchy through teams. |
| MP11 Content | Reconcile permission/read/publish/import/UI implementations; do not restore obsolete component names alone. | W1/W4 date/category/version mapping and existing mobile layout, with actual API compatibility. |
| MP12 Reports/performance | Adapt main bounded report reads and truthful partial-print behavior. V2 attendance-report query still has date/scope fields without page/pageSize. | Bounded projections/query cost under a named synthetic workload, complete exports, correct history. |
| MP13 Schema/CI/dependencies | Preserve useful main SQLite baseline/FK migration and provider CI checks through an explicit reconciliation strategy. Locked v2 Next 16.2.10 / NextAuth 4.24.14 differ from earlier recorded main 16.2.12 / 4.24.15. Current local lock was reread; no upgrade performed. | Full supported migration/upgrade paths on both providers, isolated clients/builds and fresh dependency assessment at integration. Never copy an init migration into an existing populated history blindly. |
| MP14 Docs/repository/other tests | Preserve original evidence and assess missing tests/docs, shared providers/security/RTL/UI checks and tracked worktree links. | Canonical docs tied to final main SHA; remove unintended Git links only through reviewed index changes, never delete working directories. |

The main-only models are exactly AttendanceRosterSnapshot, BatchOffDate, BatchOffWeekday, EventFeeSchedule and MediaBrief. The original local-main line is ancestral to v2; published-main divergence is why local-main-only comparison is insufficient.

## New v2 gaps that affect the merge candidate

- Notification audience/read/cache/queue defects: ASTRA_DEEPSEEK_REVIEW.md and its source references.
- Mobile parks fallback/failed save and inventory sample/local-only behavior: latest ASTRA_GEMINI_REVIEW.md. Treat visual preservation and real behavior separately; fix integration without replacing the design.
- Event registration target-scope/capacity/payment concerns above remain high-risk. Existing passing tests do not close an uncovered path.

## Operational limits and next package

Current repository `vercel.json` selects `npm run build:postgres`. Current CI runs lint/typecheck/tests/SQLite build and dependency audit; main also has provider schema and SQLite migration checks. Neither file tells us the live project's production branch, migration state or rollback compatibility. Those remain pre-merge decisions, not reasons to stop local baseline work.

Next single package: [C0-01](../tasks/C0-01.md), isolated preservation and integration setup, followed by C1 behavioral parity. C0–C5 remain the agreed integration/documentation sequence. The merge must use a reviewed combined candidate; main is not replaced with the v2 tree, and no live schema migration is implied.
