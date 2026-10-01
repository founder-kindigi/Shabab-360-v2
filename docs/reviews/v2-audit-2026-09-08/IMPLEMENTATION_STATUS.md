# v2 remediation implementation status

## Astra correction pass — 2026-09-10

Owner authorization: implement all review corrections directly. The original audit, Terra ledger below, initial ASTRA_REVIEW.md and characterization evidence are preserved. This is implementation verification, not independent review or release approval. No deployment, merge, live database migration or real-account operation occurred.

All A00–A30 are tracked below. "Implemented; local checks pass" is bounded by the listed evidence, not a claim that every possible acceptance scenario was tested. Gated workflows are explicitly unfinished.

| Finding | Current verdict | Evidence and remaining work |
| --- | --- | --- |
| A00 | FIXED / VERIFIED within recorded scope | Dataset runtime imports removed; both final isolated provider builds and scans pass. Each scan checked 689 distinct dataset identifiers across 388 JS assets, zero matches. Historical deployed/CDN/service-worker cache containment remains outside this non-deployment task. |
| A01 | MITIGATED / DECISION REQUIRED | Authenticated 503; no invented staff/account provisioning. Approval of the account lifecycle is still required. Normal gate test passes. |
| A02 | FIXED / VERIFIED within recorded scope | Capabilities, complete hierarchy, bounded inputs and transactional audit for park lessons/planner/evaluation/structure. 21 focused real-handler boundary checks pass (DB mocked); relevant standard suites pass. |
| A03 | FIXED / VERIFIED within recorded scope | Admissions source/destination scope, status/CAS, delete guards and required audit. 14 route checks and deletion regressions pass; no dataset fallback or virtual success. |
| A04 | FIXED / VERIFIED within recorded scope | Real manager/POC/caller ownership and active campaign checks, linked-city filters, campaign lock for assignment replacement, bounded paginated leads and escaped export. 42 calling checks pass, including 24 real-helper/handler boundaries. Mobile uses actual campaign IDs and persisted scripts; two mounted UI regressions pass. |
| A05 | FIXED / VERIFIED within recorded scope | Hierarchy intersections preserve park restrictions with capability grants. Finance/procurement route tests pass; transactional finance/stock acceptance runs on SQLite and native PostgreSQL. |
| A06 | FIXED / VERIFIED within recorded scope | Profile scope uses authoritative group park, explicit HQ city and active family ownership. Normal scope/save regressions pass. |
| A07 | FIXED / VERIFIED within recorded scope | Exact bounded credentials, fresh active identity/token-version checks and database-backed atomic throttle. 11 auth tests, 12 concurrent attempts limited to 5 in each DB provider. Compiled-PWA login/reset and automatic identity revocation checks pass, without reload. |
| A08 | FIXED / VERIFIED within recorded scope | Session refresh every 30 seconds while online; reset precedes operational screens. Account, role and assignment changes clear private query/navigation state. Compiled PWA passes reset/sign-out/session loss and automatic invalidation without reload. |
| A09 | FIXED / VERIFIED within recorded scope | Real roster service; correction/reset preconditions, server scope, mandatory audit and reset-generation protection. SQLite and native PostgreSQL mutation/rollback/closure checks pass. Authenticated browser HTTP save/reload/replay passes with one durable row and receipt. |
| A10 | FIXED / VERIFIED within recorded scope | Durable idempotent mutation receipts and real acknowledgements replace simulated sync. Both DB providers pass replay, stale-write and audit rollback checks. |
| A11 | MITIGATED / DECISION REQUIRED | Consent, emergency and leave APIs/UI explicitly unavailable; sample child/medical data removed. Gate regressions pass. Approved ownership, retention and safeguarding lifecycle still required. |
| A12 | MITIGATED / DECISION REQUIRED | Islah/community simulated persistence replaced by explicit unavailable API/UI. Gate tests pass. Business ownership/persistence decisions remain unapproved. |
| A13 | FIXED / VERIFIED within recorded scope | Reports use the real service. Custom builder/scheduling and notification-delivery/export controls disclose unavailability instead of inventing output. Normal suite covers gates; exhaustive visual coverage is not claimed. |
| A14 | MITIGATED / DECISION REQUIRED | Portal import gated. Attendance dry-run is bounded and nonpersistent; apply returns 503. Normal import/gate tests pass. Approved scoped application/rollback workflow still required. |
| A15 | MITIGATED / DECISION REQUIRED | Preview has no invented certificate ID/completion date. Eligible historical-session helper and certificate authorization checks pass. Issuance/reissue approval and an exhaustive certificate browser matrix remain pending. |
| A16 | MITIGATED / DECISION REQUIRED | Issuing an order changes stock zero times. Request decisions are pending-only CAS with required audit; native PostgreSQL competing decisions pass. UI reads persisted records and does not simulate fulfillment/receipt. Those transitions remain unavailable. |
| A17 | FIXED / VERIFIED within recorded scope | Stable transfer keys, ordered park locks, conditional decrement and transactional receipt/audit. Both providers pass 4-from-5 contention, retry, absolute-stock stale version and audit rollback. |
| A18 | FIXED / VERIFIED within recorded scope | Analytics uses eligible participant-session opportunities including unmarked; present/late/excused separate. Four opportunity regressions and standard suite pass. Full visual analytics matrix is not claimed. |
| A19 | FIXED / VERIFIED within recorded scope | 31-migration native PostgreSQL replay succeeds. Upgrade from original 24 preserves synthetic participant/attendance/payment/batch values; null-city backfill and reset generation verified. PGlite compares 729 modeled columns, 212 indexes, constraints and 44 enum values. Native dump/restore matches 328 tables and 185 synthetic rows. Existing separately-created operational tables still need an approved read-only reconciliation before rollout. |
| A20 | FIXED / VERIFIED within recorded scope | Most recent full suite 1375/1375, 187 files; lint 0 errors/6 existing warnings and typecheck pass. Both final provider builds and bundle scans pass. Browser evidence and precise limits are recorded in the handoff. |
| A21 | FIXED / VERIFIED within recorded scope | Missing scope denies dashboard access. Capability endpoint and role/capability menu intersection replace previews. Dashboard and hierarchy tests pass; compiled-PWA capability revocation/direct API denial passed. Automatic menu update without reload passes. |
| A22 | FIXED / VERIFIED within recorded scope | Minutes text escaped; calling CSV quoting/formula protection and scoped export retained. Real Edge executes no script/image handler for hostile stored content; normal export-security tests pass. |
| A23 | FIXED / VERIFIED within recorded scope | Real fee services/receipts, durable owner-specific retry record, pending confirmation and cross-tab Web Lock. Six mounted editor/payment/calling regressions pass. Native PostgreSQL verifies replay, overcollection contention and audit rollback. Real browser commits a payment, drops its response, reloads, then recovers the original receipt without a second payment. |
| A24 | FIXED / VERIFIED within recorded scope | Resources and announcements intersect audience and authorized city, including active guardian links. Updated real-policy fixtures and standard suite pass. |
| A25 | FIXED / VERIFIED within recorded scope | Owner partition, legacy quarantine, version/reset guards, retained conflicts and shared Web Lock. Real IndexedDB drains 225 marks chronologically in 50/50/50/50/25 batches; account switch, two tabs, malformed acknowledgement, nonretryable conflict and legacy migration pass. |
| A26 | FIXED / VERIFIED within recorded scope | Changed-field profile CAS and required redacted audit are transactional. Response permission projection is resolved before committing. Nine save regressions pass. |
| A27 | FIXED / VERIFIED within recorded scope | Paginated directory and target-specific context, frozen edit base and changed-field writes. Mounted edit/refetch checks pass. Reopening profile selection now clears the prior target. Browser page-two selection/save/return passes; selected profile changes and an unrelated profile remains unchanged. |
| A28 | FIXED / VERIFIED within recorded scope | Authoritative Group.park with null-only legacy fallback across affected consumers. Hierarchy, profile/attendance/certificate routes and both-provider foreign-scope checks pass. |
| A29 | MITIGATED / DECISION REQUIRED | Point-award writes remain explicitly unavailable pending approved award/correction policy. Gate regression passes. |
| A30 | FIXED / VERIFIED within recorded scope | Both providers normalize legacy null batch city and enforce one active batch per city. Concurrent cross-park creation, duplicate creation and reactivation checks pass; migration preserves valid synthetic upgrade data. |

Evidence: astra-corrections-acceptance-suite.json (final standard suite), astra-sqlite-db-acceptance.json and astra-native-postgres-db-acceptance.json (21 tests per provider), astra-native-upgrade-results.json, astra-native-restore-results.json, astra-postgres-migration-results.json, astra-browser-corrections-results.json, astra-pwa-session-results.json, provider build/bundle reports. The handoff records final candidate identity and exact limitations. Historical defect-characterization passes are never used as repair verification.

Security/data impact: new login-window and operation-receipt storage; server hierarchy enforcement, version/reset guards and mandatory transactional audit; paired active-batch constraints; PostgreSQL restoration of modeled tables/constraints/indexes. Existing duplicate/inconsistent data must fail preflight, not be silently reassigned or deactivated. Rollback requires a verified backup and data-aware recovery; do not restore unsafe handlers or drop new receipt/version data as a shortcut. Native backup/restore used only synthetic disposable databases. SQLite has no initial migration baseline; its tests use fresh schema creation plus the active-batch migration, not a full historical-chain replay.

## Per-item code and verification index

All paths are repository-relative. The correction manifest records the exact hash of every changed application/schema/config/test path, including related callers beyond these primary entry points. The first table records root causes, resulting behavior, exact available outcomes and remaining decisions. All listed normal-suite tests pass in the 1,375-test result; standalone database/browser/migration checks are identified separately. This index does not convert helper or mocked tests into end-to-end coverage.

| Item | Package | Primary implementation paths | Normal regression or standalone verification paths |
| --- | --- | --- | --- |
| A00 | P01 | `src/lib/calling/portal-store.ts`<br>`src/components/modules/admin/portal-import-page.tsx` | `src/components/modules/admin/client-data-boundary.test.ts` |
| A01 | P01 | `src/app/api/park/structure/route.ts` | `src/app/api/park/structure/route.test.ts` |
| A02 | P03 | `src/app/api/park/lessons/route.ts`<br>`src/app/api/park/planner/route.ts`<br>`src/app/api/park/evaluations/route.ts`<br>`src/app/api/park/structure/route.ts`<br>`src/app/api/inventory/central/route.ts` | `src/__tests__/api/v2-park-boundaries.test.ts` |
| A03 | P03 | `src/lib/admissions/access.ts`<br>`src/app/api/admin/admissions/route.ts`<br>`src/app/api/admin/admissions/[id]/route.ts` | `src/app/api/admin/admissions/route.test.ts`<br>`src/app/api/admin/admissions/[id]/route.test.ts`<br>`src/__tests__/api/v2-deletion-regressions.test.ts` |
| A04 | P03 | `src/lib/calling/assignment-access.ts`<br>`src/lib/calling/poc-auth.ts`<br>`src/app/api/calling/assignments/route.ts`<br>`src/app/api/calling/interactions/route.ts`<br>`src/app/api/calling/campaigns/[id]/leads/route.ts`<br>`src/app/api/calling/export/route.ts`<br>`src/components/modules/admin/mobile-calling-page.tsx` | `src/__tests__/api/v2-calling-boundaries.test.ts`<br>`src/__tests__/api/v2-editor-recovery.test.tsx` |
| A05 | P02 | `src/lib/auth/hierarchy.ts`<br>`src/lib/auth/authorize.ts`<br>`src/app/api/admin/finance/reconciliation/route.ts`<br>`src/app/api/admin/procurement/orders/route.ts` | `src/lib/auth/hierarchy.test.ts`<br>`src/app/api/admin/finance/__tests__/reconciliation.test.ts`<br>`src/app/api/admin/procurement/__tests__/items.test.ts` |
| A06 | P02 | `src/lib/student-profile/scope.ts`<br>`src/app/api/admin/students/[id]/profile/route.ts` | `src/lib/student-profile/scope-boundary.test.ts`<br>`src/__tests__/api/student-profile/route.test.ts` |
| A07 | P05 | `src/lib/auth.ts`<br>`src/lib/auth/identity.ts`<br>`src/lib/auth/login-throttle.ts` | `src/lib/auth.test.ts` |
| A08 | P05 | `src/components/pwa/pwa-app.tsx`<br>`src/components/providers/app-providers.tsx` | `src/app/api/auth/reset-password/route.test.ts` |
| A09 | P06 | `src/components/modules/park/tabs/attendance-tab.tsx`<br>`src/components/modules/park/attendance-roster.tsx`<br>`src/lib/attendance/apply-mutation.ts` | `src/app/api/park/attendance/route.test.ts`<br>`src/app/api/park/attendance/[eventId]/records/[recordId]/route.test.ts`<br>`src/app/api/park/attendance/[eventId]/reset/route.test.ts` |
| A10 | P06 | `src/app/api/sync/process/route.ts`<br>`src/app/api/park/attendance/sync/route.ts`<br>`src/lib/attendance/apply-mutation.ts` | `src/app/api/park/attendance/sync/route.test.ts` |
| A11 | P09 | `src/app/api/guardian/consents/route.ts`<br>`src/app/api/guardian/emergency-info/route.ts`<br>`src/app/api/guardian/leave-requests/route.ts`<br>`src/components/modules/guardian/mobile-guardian-dashboard.tsx` | `src/__tests__/api/v2-unavailable-workflows.test.ts` |
| A12 | P09 | `src/app/api/islah/daily-log/route.ts`<br>`src/app/api/community/posts/route.ts`<br>`src/app/api/community/polls/route.ts` | `src/__tests__/api/v2-unavailable-workflows.test.ts` |
| A13 | P09 | `src/components/modules/admin/custom-report-builder-page.tsx`<br>`src/components/modules/admin/mobile-reports-builder-page.tsx`<br>`src/components/modules/admin/mobile-more-page.tsx`<br>`src/components/modules/admin/settings-page.tsx` | `src/__tests__/api/v2-unavailable-workflows.test.ts` |
| A14 | P08 | `src/app/api/admin/attendance/import/route.ts`<br>`src/app/api/admin/import/portal-raw/route.ts`<br>`src/components/modules/admin/portal-import-page.tsx` | `src/app/api/admin/attendance/import/route.test.ts`<br>`src/components/modules/admin/client-data-boundary.test.ts` |
| A15 | P08 | `src/app/api/admin/certificates/[participantId]/route.ts`<br>`src/app/api/admin/certificates/batch/route.ts`<br>`src/components/modules/admin/mobile-certificates-page.tsx` | `src/app/api/admin/certificates/routes.test.ts`<br>`src/lib/attendance/opportunities.test.ts` |
| A16 | P07 | `src/app/api/admin/procurement/orders/route.ts`<br>`src/app/api/admin/procurement/requests/[id]/route.ts`<br>`src/components/modules/admin/mobile-procurement-page.tsx` | `src/app/api/admin/procurement/__tests__/requests.test.ts` |
| A17 | P07 | `src/app/api/admin/procurement/transfers/route.ts`<br>`src/app/api/admin/procurement/stock/route.ts`<br>`src/lib/api/operation-receipt.ts` | `src/app/api/admin/procurement/__tests__/items.test.ts` |
| A18 | P10 | `src/app/api/admin/home-analytics/route.ts`<br>`src/lib/attendance/opportunities.ts`<br>`src/components/modules/admin/mobile-analysis-page.tsx` | `src/lib/attendance/opportunities.test.ts` |
| A19 | P04 | `prisma/schema.prisma`<br>`prisma/postgres/schema.prisma`<br>`prisma/postgres/migrations` | `docs/reviews/v2-audit-2026-09-08/verify-postgres-migrations.mjs`<br>`docs/reviews/v2-audit-2026-09-08/verify-native-upgrade.mjs`<br>`docs/reviews/v2-audit-2026-09-08/verify-native-restore.mjs` |
| A20 | P11 | `next.config.ts`<br>`src/app/globals.css`<br>`src/lib/calling/portal-store.ts` | `src/app/api/park/dashboard/route.test.ts`<br>`src/app/api/admin/students/[id]/detail/route.test.ts`<br>`src/app/api/admin/procurement/__tests__/items.test.ts` |
| A21 | P05 | `src/app/api/park/dashboard/route.ts`<br>`src/app/api/auth/capabilities/route.ts`<br>`src/hooks/use-effective-capabilities.ts`<br>`src/lib/auth/screen-access.ts` | `src/app/api/park/dashboard/route.test.ts`<br>`src/lib/auth/capability-access.test.ts` |
| A22 | P03 | `src/lib/mashwara/export-minutes.ts`<br>`src/lib/auth/mashwara-scope.ts`<br>`src/app/api/admin/mashwara/[id]/minutes/route.ts`<br>`src/app/api/calling/export/route.ts` | `src/lib/mashwara/export-security.test.ts` |
| A23 | P07 | `src/components/modules/admin/fees-page.tsx`<br>`src/app/api/admin/fees/[id]/payments/route.ts` | `src/app/api/admin/fees/[id]/payments/route.test.ts`<br>`src/__tests__/api/v2-editor-recovery.test.tsx` |
| A24 | P03 | `src/lib/auth/audience.ts`<br>`src/app/api/resources/route.ts`<br>`src/app/api/announcements/route.ts` | `src/app/api/resources/__tests__/library.test.ts` |
| A25 | P06 | `src/lib/offline/db.ts`<br>`src/lib/offline/sync-attendance.ts`<br>`src/hooks/use-attendance-sync.ts` | `src/lib/offline/sync-attendance.test.ts`<br>`src/lib/offline/db.test.ts` |
| A26 | P10 | `src/app/api/admin/students/[id]/profile/route.ts`<br>`src/lib/student-profile/zod.ts` | `src/__tests__/api/student-profile/save-regressions.test.ts` |
| A27 | P10 | `src/components/modules/student-profile/profile-page.tsx`<br>`src/components/modules/student/mobile-student-profile-view.tsx`<br>`src/app/api/admin/students/[id]/profile-context/route.ts`<br>`src/components/pwa/pwa-app.tsx` | `src/__tests__/api/v2-editor-recovery.test.tsx` |
| A28 | P02 | `src/lib/auth/hierarchy.ts`<br>`src/lib/student-profile/scope.ts`<br>`src/lib/attendance/apply-mutation.ts`<br>`src/app/api/admin/students/[id]/detail/route.ts`<br>`src/app/api/admin/certificates/[participantId]/route.ts` | `src/lib/auth/hierarchy.test.ts`<br>`src/lib/student-profile/scope-boundary.test.ts`<br>`src/app/api/park/attendance/sync/route.test.ts`<br>`src/app/api/admin/certificates/routes.test.ts` |
| A29 | P02 | `src/app/api/admin/gamification/points/route.ts` | `src/app/api/admin/gamification/__tests__/points.test.ts` |
| A30 | P07 | `src/app/api/admin/batches/route.ts`<br>`src/app/api/admin/batches/[id]/route.ts`<br>`prisma/migrations/20260909040000_active_city_batch/migration.sql`<br>`prisma/postgres/migrations/20260909040000_active_city_batch/migration.sql` | `src/app/api/admin/batches/route.test.ts`<br>`src/app/api/admin/batches/[id]/route.test.ts` |

Database integrity across A07/A09/A10/A16/A17/A23/A26/A28/A30 is exercised by `astra-corrections-db.test.mts` with separate SQLite and native PostgreSQL result files (21/21 each). Browser behavior for A07/A08/A09/A21/A23/A27 is exercised by `verify-pwa-session.mjs`; offline/export A22/A25 by `verify-browser-corrections.mjs`. These standalone files live in this review directory.

Recovery applies per item: authorization/UI/export fixes need no historical data rewrite; keep restrictive server checks if reverting presentation. A07/A10/A17/A23 require preserving throttle/receipt storage, A09/A25 record/reset versions, and A19/A30 forward migration constraints. Restore or forward-repair from a verified backup after approved reconciliation; never silently weaken invariants to make inconsistent legacy data pass. Gated items remain gated until their explicitly listed policy/lifecycle decisions and subsequent implementation are approved.

## Terra starting ledger (historical claims; see corrections above)

**Implementation base:** `a252603` (recorded before P01 edits)

This ledger is maintained by the implementation task. A status of `FIXED / VERIFIED` requires normal-suite regression evidence and the package acceptance checks. It does not imply GPT-6 Astra review or release approval.

| Finding | Package | Status | Current note |
| --- | --- | --- | --- |
| A00 | P01 | IMPLEMENTED / VERIFICATION BLOCKED | The bundled registration dataset is absent from all `src` imports; client import/export controls and the server portal-import endpoint are explicitly unavailable. Focused boundary and admissions/calling regressions pass; candidate-wide verification remains pending. |
| A01 | P01 | IMPLEMENTED / VERIFICATION BLOCKED | Park Structure staff provisioning is explicitly unavailable and cannot create users, role hashes, or staff records. Focused route regression passes. |
| A02 | P03 | OPEN | Awaiting shared authorization work. |
| A03 | P03 | OPEN | Awaiting shared authorization work. |
| A04 | P03 | OPEN | Awaiting calling authorization repair. |
| A05 | P02 | IMPLEMENTED / VERIFICATION BLOCKED | Finance and all procurement route consumers now resolve city/park scope fail-closed; focused finance and procurement regressions pass. Candidate-wide verification remains pending. |
| A06 | P02 | IMPLEMENTED / VERIFICATION BLOCKED | Profile helper now treats Park Admin as park-scoped and denies unknown staff roles; focused regression added. Broader route verification remains pending. |
| A07 | P05 | OPEN | Awaiting authentication/session lifecycle repair. |
| A08 | P05 | OPEN | Awaiting PWA lifecycle repair. |
| A09 | P06 | OPEN | Awaiting real attendance binding. |
| A10 | P06 | MITIGATED / DECISION REQUIRED | The simulated batch-sync endpoint now returns an authenticated 503 rather than inventing successes or conflicts. A persisted, idempotent sync contract is still required. |
| A11 | P09 | OPEN | Safeguarding rules remain decision-required. |
| A12 | P09 | OPEN | Ownership/persistence rules remain incomplete. |
| A13 | P09 | OPEN | Truthful reports/settings output pending. |
| A14 | P08 | MITIGATED / DECISION REQUIRED | Portal workbook import is explicitly unavailable on both client and server; no partial import, arbitrary default city, or false success remains. A reviewed scoped import design is still required. |
| A15 | P08 | OPEN | Awaiting certificate operation decision/repair. |
| A16 | P07 | IMPLEMENTED / VERIFICATION BLOCKED | Issuing a purchase order no longer changes stock. Stock requests allow only pending-to-approved/rejected transitions until a receipt workflow is approved. Focused procurement regression passes. |
| A17 | P07 | IMPLEMENTED / VERIFICATION BLOCKED | Transfers use a transaction with a conditional source decrement, preventing negative inventory on competing requests. Focused concurrency regression passes. |
| A18 | P10 | OPEN | Awaiting analytics repair. |
| A19 | P04 | OPEN | PostgreSQL migration replay required. |
| A20 | P11 | IN PROGRESS | Focused remediation suites pass, and the two prior suite failures now pass after test-mock repairs. `npm run lint` and `npm run typecheck` exited successfully. The full Vitest invocation did not produce a completion summary in this environment, so it is not accepted as candidate-wide verification. |
| A21 | P05 | OPEN | Dashboard missing-scope and capability-aware navigation remain. |
| A22 | P03 | OPEN | Awaiting export escaping/access repair. |
| A23 | P07 | OPEN | Awaiting real fee service integration. |
| A24 | P03 | OPEN | Awaiting audience/scope repair. |
| A25 | P06 | OPEN | Awaiting offline conflict and queue repair. |
| A26 | P10 | OPEN | Awaiting transactional profile audit repair. |
| A27 | P10 | OPEN | Awaiting profile identity/edit repair. |
| A28 | P02 | IMPLEMENTED / VERIFICATION BLOCKED | Attendance sync and profile scope now use Group.parkId with legacy fallback only when group park is null. Remaining attendance/certificate/analytics consumers require inventory and verification. |
| A29 | P02 | IMPLEMENTED / VERIFICATION BLOCKED | Point-award writes are safely unavailable pending an owner-approved staff award policy and value/correction rules. Focused regression coverage added; broader P02 verification remains pending. |
| A30 | P07 | OPEN | Awaiting database-backed batch invariant. |
