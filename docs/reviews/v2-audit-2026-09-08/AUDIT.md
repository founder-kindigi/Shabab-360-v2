# v2 deep audit — 2026-09-08

**Audited branch/commits:** `v2`, initially `d81df15`, reconciled against `a252603` after concurrent v2 commits. Initial working tree was clean. Source line numbers are navigational references from inspection and may shift between those commits.

**Assessment:** v2 is not ready for release or merging into `main`. This audit records **30 defect groups and one partially resolved release gate** (A00–A30). The most urgent findings are personal registration data in browser JavaScript and an API that lets scoped staff modify other accounts while exposing password hashes. Several important operational flows are still demonstrations that report successful saves without durable writes.

This audit changed no application source, database records, migrations, deployment, or project memory. Other work updated v2 and committed the initial audit artifacts during inspection; those application changes and deployments were not performed or independently deployment-verified by this audit. This folder contains the audit and isolated evidence only. This is a code and local verification audit, not a claim that every workflow has passed browser UAT or that the current public deployment was penetration-tested.

## Evidence and limits

| Check | Result |
| --- | --- |
| API inventory | 192 route files, 291 exported HTTP handlers inventoried; risk-based inspection of authentication, scope, imports, attendance, profile, finance, procurement, communications, and UI callers |
| Baseline `npm run typecheck` | Passed against the existing SQLite client |
| Baseline `npm run lint` | Failed: 8 errors in three existing CJS scripts |
| Baseline `npm test -- --reporter=json` | 173 files; 1,225/1,227 tests passed; two failed tests |
| Isolated rerun of the two failing files | 24/25 tests passed. Calling-import CLI failure did not reproduce. Park-dashboard expectation still fails |
| Latest `npm run typecheck` on `a252603` | Passed |
| Latest `npm run lint` on `a252603` | Passed with zero errors and six unused-disable warnings after concurrent lint configuration changes |
| Latest full suite on `a252603` | 174 files, 1,229/1,232 tests passed. Park-dashboard denial test still fails; two profile-detail tests lack the newly imported `userHasCapability` mock. Calling-import tests pass. Run used `--maxWorkers=2 --no-file-parallelism` |
| Audit reproductions on `a252603` | 33/33 passed across three files. These deliberately assert the **current defective behavior**, not the desired security contract |
| SQLite production build | Attempted with synthetic configuration; failed fetching Geist and Geist Mono from Google Fonts. No successful production build claimed |
| Standard PostgreSQL generation/build path | Generation stopped on Windows `EPERM` renaming the loaded Prisma engine DLL; build could not proceed through that path |
| Isolated PostgreSQL typecheck | Passed using a separately generated client in `.next/audit-postgres/client` and the audit TypeScript configuration |
| Shared Prisma client after checks | Runtime provider remains SQLite; generated schema matches the SQLite source after ignoring formatting/comments. Normal regeneration also hit the same DLL lock; no running app was stopped |
| Schema/migration inspection | Both schemas contain 72 models. PostgreSQL has 24 migration files, but 14 modeled tables have no creation migration |
| Compiled client-data inspection | A generated public JS chunk contains matching phone strings from all 759 source registration rows and matching address strings from 727 rows. Values were not copied into this report |

Not performed: authenticated browser UAT for all roles, real PostgreSQL migration replay/restore rehearsal, deployed database reconciliation, production security probing, provider configuration audit, or a fresh dependency vulnerability audit. Missing-table findings are based on checked-in SQL, not an assertion about which tables currently exist in a deployed database. The build’s network failure and engine lock are environment limitations, not proof of a source compilation failure.

Severity: **P0** immediate privacy/account-integrity containment; **P1** security, safety, operational data loss, or release-blocking integrity; **P2** important correctness, usability, or verification gap. A finding's prerequisites are part of its severity assessment.

## Findings

### A00 — P0 — Registration data ships in public browser JavaScript

- **Evidence:** `src/components/modules/admin/mobile-portal-import-page.tsx:29`, `portal-import-page.tsx:51`, and `fees-page.tsx:73` import `src/lib/import-framework/portal-raw-dataset.json` from client components. The PWA shell imports the mobile importer directly. `static-inventory.json` records the matching emitted chunk and counts.
- **Impact:** Browser bundles are public assets. API authorization does not protect embedded names, phones, addresses, registration/payment fields, and medical-information fields. The source has 759 rows. The `cnic` field is empty in this dataset; this audit does not claim populated CNIC values were exposed.
- **Fix/acceptance:** Remove personal datasets from every client import graph and deliver minimum fields through authorized, scoped, paginated APIs. Verify a clean production bundle contains no registration fixtures or actual identifiers. If a deployed build contains this data, assess and remove affected deployment/cache artifacts as part of explicit release containment.

### A01 — P0 — Park structure endpoint permits account reassignment and returns hashes

- **Evidence:** `src/app/api/park/structure/route.ts:196–283`. Every allowed staff role, including Murabbi, can submit `add_murabbi` with another account's email. The route fetches a complete `User`, upserts its staff role/park, and returns `user: targetUser` without a projection. No capability, target-account hierarchy, target-park, audit, or session-revocation check protects that operation.
- **Reproduction:** A synthetic Murabbi changed a foreign HQ account's staff role to Park Admin and received the synthetic `passwordHash` in a 201 response. No capability check or token-version update occurred.
- **Additional failure:** New accounts receive a placeholder hash rather than usable provisioning credentials, and some mapped roles (`head_murabbi`, `muawin`) are not canonical login roles.
- **Fix/acceptance:** Route staff creation/reassignment through the established provisioning service, enforce actor and target boundaries, whitelist response fields, audit transactionally, and revoke affected sessions on role/scope changes. Denial tests must include existing HQ targets and self-promotion attempts. Verify newly provisioned accounts can complete forced reset.

### A02 — P1 — New park APIs bypass scope, capability, and reset requirements

- **Evidence:** `src/app/api/park/evaluations/route.ts`, `park/lessons/route.ts`, `park/planner/route.ts`, `park/structure/route.ts`, and `inventory/central/route.ts` use direct session/role checks instead of the shared full authorization contract.
- **Reproduction:** A reset-required Murabbi with a denied mocked capability still saved an evaluation for a foreign participant/park. A Murabbi could read foreign lessons and delete a foreign routine slot. Evaluation writes do not verify that the participant belongs to the supplied park. Structure also accepts supplied group IDs without validating park membership.
- **Impact:** Cross-group/cross-park reads, changes, deletion, and access before first-login reset. Central inventory exposes all park stocks to allowed staff.
- **Fix/acceptance:** Require authentication/reset status, the approved capability, then resolved resource scope. Validate all linked records, cap input lengths/collections, and audit mutations. Test own scope, foreign scope, missing assignment, revoked capability, malformed input, and reset-required sessions per HTTP method.

### A03 — P1 — Admissions list/detail/update/delete lose hierarchy protections

- **Evidence:** `src/app/api/admin/admissions/route.ts:94` and `src/app/api/admin/admissions/[id]/route.ts`. Listing accepts broad staff roles and arbitrary query city, with no actor scope or capability enforcement. Detail and PATCH have a capability gate but no resource scope. DELETE has neither capability nor city enforcement. PATCH/DELETE swallow database failures and return apparent success.
- **Reproduction:** A City Head with denied admissions capability received a foreign-city application from an unconstrained `where: {}` query.
- **Impact:** Scoped staff can see unrelated admissions; a permitted City Head can modify/delete across cities. Missing or failed database operations can appear successful. Raw-dataset fallbacks ignore city filters and invent approved-interview scores/context.
- **Fix/acceptance:** Restore scoped service operations across all methods, enforce valid workflow transitions, return real not-found/failure responses, and remove operational fallback records. Verify cross-city denial, rollback/audit behavior, and persistence after reload.

### A04 — P1 — Calling assignment and interaction authorization fails open

- **Evidence:** `src/app/api/calling/interactions/route.ts:35`, `calling/assignments/route.ts:39`, `calling/campaigns/[id]/leads/route.ts`, and `calling/export/route.ts`. Interaction writes require only login; imported verification is never called. Assignment ignores explicit verification failure for management roles and catches verification exceptions before proceeding. Campaign lead listing does not constrain actor city or assigned-caller ownership; export resolves city but omits the export capability/manager restriction.
- **Reproduction:** A student logged an interaction for someone else's active assignment. A City Head created an assignment after verification explicitly returned a foreign-city 403.
- **Impact:** Lead disclosure and unauthorized call outcomes/reassignment. In-memory portal state is changed before verification/persistence, and database errors return virtual success.
- **Fix/acceptance:** Use one fail-closed campaign/caller authorization path, including current POC/external-caller expiry and assigned leads. Validate caller, campaign, application, and city consistency before any change; persist interactions and status atomically. Test errors and expired/foreign assignments, not only role helpers.

### A05 — P1 — Finance/procurement scope can be bypassed via nullable city resolution

- **Evidence:** `src/lib/auth/authorize.ts:132` returns `assignedCityId || null` for non-HQ users, conflating missing city with unrestricted HQ scope. Affected consumers include `admin/procurement/{stock,requests,orders,transfers,audit}` and `admin/finance/{donations,adjustments,reconciliation}`. Orders/donations/adjustments listing lets a query `cityId` replace the actor's city without comparison.
- **Reproduction:** A Park Lead assigned only a park read foreign-park stock. A City Head queried finance adjustments for a foreign city.
- **Impact:** Capability possession can expand hierarchy scope. Write bypasses are possible where the corresponding capability is granted and the code skips checks on null city.
- **Fix/acceptance:** Return distinct HQ/scoped/denied results; derive scope from current park/group assignments and enforce both city and park boundaries. Treat query parameters as requested filters, never authority. Cover normal defaults and explicitly granted capabilities.

### A06 — P1 — Profile helper treats Park Admin as city-wide staff

- **Evidence:** `src/lib/student-profile/scope.ts:119–137` special-cases Park Lead and Murabbi, then returns true for every other staff role after a city match.
- **Reproduction:** Park Admin assigned to park A was authorized for a participant at park B in the same city.
- **Prerequisite:** Park Admin lacks profile-view capability by default. This becomes reachable when an approved role/user capability grant enables profile access; that grant must not expand scope.
- **Fix/acceptance:** Exhaustively handle supported roles, apply park checks to both park roles, and deny unknown roles. Test helper and actual routes with capability overrides enabled.

### A07 — P1 — Login identity and session lifecycle checks are incomplete

- **Evidence:** `src/lib/auth.ts:89–97` falls back from exact email to `contains`; limiter keys use the submitted string. Authentication ignores `StaffMeta.isActive`. JWT refresh only checks token-version mismatch when a user is found and retains tokens when the user is gone.
- **Reproductions:** A non-email substring authenticated the matching synthetic account with its correct password; an inactive staff assignment authenticated; a deleted account retained its HQ JWT.
- **Impact:** Ambiguous identity matching and multiple input keys for account login attempts; disabled assignments and deleted identities can retain access. This is not a demonstrated password bypass. The in-memory limiter also cannot provide a shared deployment-wide limit.
- **Fix/acceptance:** Exact normalized email only, bounded input, active user plus active canonical assignment checks, fail-closed invalid-session handling, and appropriate shared throttling. Exercise deletion, deactivation, reassignment, missing role, and token revocation.

### A08 — P1 — PWA omits forced reset and session-loss routing

- **Evidence:** `src/components/pwa/pwa-app.tsx:194–236` routes any session with ID/role home and never reads `mustResetPwd`. The old reset renderer is in `src/components/layout/page-router.tsx`, which the root/PWA entry points no longer use. One-time session initialization also does not route an already-open app back to login on session loss.
- **Impact:** First-login users reach a dashboard whose protected APIs deny them, without the required reset flow. Expired sessions can leave a stale application screen visible.
- **Fix/acceptance:** Explicit loading/unauthenticated/reset-required/authorized states in the live PWA shell, with session-loss handling and cache cleanup. Browser-test provisioning through forced reset, reauthentication, expiry, and logout for each role.

### A09 — P1 — New park attendance tab never saves its roster

- **Evidence:** `src/components/modules/park/tabs/attendance-tab.tsx:18–86` fetches data it does not use, displays hardcoded people/date, and posts `{parkId, murabbiAttendance, studentAttendance}` to `/api/park/attendance`. That endpoint creates an event and requires `groupId` and `title`. The UI ignores HTTP status/errors and always sets “All saved.”
- **Reproduction:** The exact UI payload returns 400 before any attendance event write.
- **Fix/acceptance:** Bind the real event/roster and correct student/staff mark APIs, preserve their separate scopes, and report saved only after a confirmed write or explicit durable offline enqueue. Test reload persistence, offline recovery, rejected changes, and the actual PWA tab.

### A10 — P1 — Sync Studio reports simulated synchronization

- **Evidence:** `src/app/api/sync/process/route.ts:32–86` compares timestamps to a hardcoded date, constructs synthetic conflicts, and returns `syncedIds` without database writes. `src/lib/offline/conflict-engine.ts` can mark those IDs synced locally. The mounted `sync-conflicts-page.tsx` separately calls this endpoint but neither settles queue items nor reads the returned property correctly (`synced` vs `syncedIds`).
- **Reproduction:** A synthetic student received success for an unrelated attendance mutation; no persistence, transaction, or attendance capability call occurred.
- **Fix/acceptance:** Connect the studio to the real attendance sync service, settle queue state using one contract, and create conflicts only from real stored versions. Do not remove local mutations until server persistence is acknowledged. This is distinct from the real endpoint's issues in A25.

### A11 — P1 — Guardian safety APIs are unscoped, transient demonstrations

- **Evidence:** `src/app/api/guardian/{consents,emergency-info,leave-requests}/route.ts` use process-local sample collections and only `requireAuth`. They do not check guardian role, child relationship, or current authorized event. Emergency validation defaults omitted medical fields to “B+” and “None.”
- **Reproductions:** A student approved an unrelated sample consent and wrote an arbitrary child's emergency details. Another guardian then read the synthetic private note.
- **Impact:** Safety records are neither private nor durable; signatures are not reliable consent evidence; missing medical information can be misrepresented as known facts. Sample identities should not appear as a family's own children.
- **Fix/acceptance:** Hide unfinished safety actions until scoped, durable models and approved rules exist. Implement verified child linkage, unknown-safe defaults, consent history/withdrawal, audit, valid dates, and persistence/restart tests before enabling them.

### A12 — P1 — Spiritual routines and community actions lack durable ownership

- **Evidence:** `src/app/api/islah/daily-log/route.ts` stores all users' submitted notes in one process-local array and returns it to every authenticated caller. `community/posts/route.ts` and `community/polls/route.ts` return created/voted success without storing changes; GET returns fixed sample content.
- **Reproductions:** Another student could read a submitted synthetic spiritual note. A newly “created” community post disappeared on the next GET.
- **Fix/acceptance:** Gate unfinished modules, then implement owner/scope rules, persistence, approved moderation and visibility rules. Verify cross-account denial, restart/reload behavior, and actual vote/post state. Do not treat creation of a response object as a completed workflow.

### A13 — P2 — Custom reports and settings backups are not real outputs

- **Evidence:** `src/app/api/admin/reports/custom/route.ts` echoes metadata only. `mobile-reports-builder-page.tsx:189` downloads a header and “Sample Data.” `mobile-more-page.tsx:179` creates a “database snapshot” containing app/version/date/note, without records. Its import/settings/admin actions also use timers or local state rather than persistence.
- **Reproduction:** Requested XLSX report returns success with no data or file and no database query.
- **Impact:** Operators may rely on fabricated reports or an unrestorable backup.
- **Fix/acceptance:** Clearly disable unimplemented actions. Build scoped exports on existing report services and distinguish an actual restorable backup from a metadata export. Verify file contents against controlled records and demonstrate restore before labeling an artifact a backup.

### A14 — P1 — Import flows misreport execution and can partially write the wrong scope

- **Evidence:** `mobile-portal-import-page.tsx:56–86` never parses the uploaded file, submits `{mode:"full_sync"}` instead of required `rows`, and reports simulated success on error. `admin/import/portal-raw/route.ts:96` writes only admissions, hardcodes Lahore's ID, deduplicates by guardian phone, and loops outside a transaction. Other represented pipeline domains are not written. `admin/attendance/import/route.ts:175` reports importedCount but only resolves a city and writes an audit record.
- **Impact:** Failed/no-op imports look successful; siblings sharing a guardian number can be skipped; supplied cross-city data can be written under the wrong city; a mid-loop failure leaves a partial import. “Full pipeline” does not mean five persisted module updates.
- **Fix/acceptance:** Parse the actual supplied workbook, validate a bounded canonical import manifest, derive authorized scope, use stable source identities and explicit sibling handling, and implement real transaction/chunk recovery and reconciliation. Dry-run and execution counts must correspond to persisted models. Keep unimplemented pipeline stages explicit.

### A15 — P2 — Certificate issuance UI has no matching API operation

- **Evidence:** `mobile-certificates-page.tsx:207–247` POSTs names as participant IDs to `/api/admin/certificates/batch`; that route exports GET only. Empty or failed reads show sample “verified” certificates, and share text contains a verification URL for which no corresponding app route exists.
- **Impact:** Issuing cannot succeed through the current UI; sample certificates may be mistaken for issued records.
- **Fix/acceptance:** Select actual participants, define issued vs preview/generated certificate semantics, implement the authorized operation and verification route if issuance is required, and remove sample-success fallbacks. Test issuance, serial lookup, permission denial, and sharing with actual result URLs.

### A16 — P1 — Purchase-order issuance increases stock before receipt

- **Evidence:** `src/app/api/admin/procurement/orders/route.ts` creates status `issued` and immediately increments destination stock in the same transaction.
- **Reproduction:** Issuing a synthetic order for ten units immediately added ten available units without a receipt action.
- **Fix/acceptance:** Separate ordered, received, and available quantities. Only an audited receipt should increase stock. Cover partial/full receipt, cancellation, retries, and reconciliation to the corresponding financial event.

### A17 — P1 — Stock transfer/fulfillment concurrency can corrupt balances

- **Evidence:** `admin/procurement/transfers/route.ts` reads available balance before its transaction, then decrements unconditionally. `admin/procurement/requests/[id]/route.ts` reads prior status before the transaction and allows arbitrary transitions; fulfillment can be counted again after reopening or concurrent requests.
- **Reproduction:** Two transfers each reading five available units and moving four both returned 201; the synthetic balance became -3. This tests application interleaving, not a live PostgreSQL load test.
- **Fix/acceptance:** Conditional/locked balance updates, one-way validated transitions, idempotent receipt/fulfillment identities, conflict handling, and constraints where appropriate. Run concurrent database-backed tests demonstrating no negative or duplicated stock.

### A18 — P2 — Analytics totals mix participants and attendance opportunities

- **Evidence:** `admin/home-analytics/route.ts:150–240` divides present records over a date range by current student count, always sets Murabbi present counts and late count to zero, and uses fixed Murabbi totals/fallback identities. Park/group scope and Program Admin handling are also inconsistent.
- **Reproduction:** One student present at two sessions produces 200% attendance while the Murabbi breakdown remains zero.
- **Fix/acceptance:** Define the denominator per date/session and eligible roster, use actual status/staff aggregates, preserve park/group scope, and show real empty/error states. Cover multiple sessions, late/excused, join/dropout dates, no events, and HQ roles.

### A19 — P1 — PostgreSQL migrations cannot recreate the modeled application

- **Evidence:** `static-inventory.json` compares mapped table names to all 24 checked-in migration SQL files. Missing creation SQL: `fee_donations`, `financial_adjustments`, `procurement_items`, `park_stocks`, `stock_requests`, `purchase_orders`, `stock_transfers`, `stock_audit_logs`, `team_chat_messages`, `point_transactions`, `badges`, `student_badges`, `digital_resources`, `knowledge_articles`. The extended-profile migration also declares `id` NOT NULL without its modeled primary key.
- **Impact:** A fresh environment or disaster restore using migrations cannot reproduce current schema even though both Prisma files contain 72 models. Existing deployed tables may have been created separately; that was not verified here.
- **Fix/acceptance:** Reconcile schema vs actual approved staging state, add forward migrations, and replay the entire chain in a fresh disposable PostgreSQL database. Compare tables, columns, constraints, enums, and indexes—not model counts. Document data preservation and rollback/forward-recovery before deployment.

### A20 — P2 — Verification baseline has failures and incomplete workflow coverage

- **Evidence:** Initial lint had eight `no-require-imports` errors in three CJS scripts. Concurrent commit `aca9b06` globally disabled that rule; those errors are no longer an open lint finding. Park-dashboard test expects City Head denial; the route admits City Head and its test mock lacks the resulting lookup, producing 500. The initial calling-import CLI failure passed on isolated retry. `src/__tests__/uat/multi-role-boundary.test.ts` mainly exercises helpers, and parts of `release/p0-staging-uat.test.ts` assert local arithmetic/schema existence rather than actual workflows. Latest rerun results are recorded separately below.
- **Latest rerun:** 1,229/1,232 tests pass across 174 files. Two profile-detail tests additionally fail because their authorization mock does not export `userHasCapability`, now used by the handler. This is a test-contract regression, not evidence that the production export is missing. The actual module exports it.
- **Impact:** Historical green counts are not evidence that new routes enforce the helpers or new screens persist data. The failing dashboard test requires a policy-aligned implementation/test decision, not merely changing an expected status to 500.
- **Fix/acceptance:** Restore lint and deterministic tests, resolve the preview policy explicitly, and build route-level denial plus UI/API persistence coverage for the findings. Keep unit/helper checks distinct from browser/staging UAT in documentation.

### A21 — Partially resolved release gate — Dashboard fallbacks remain after preview removal

- **Resolved in concurrent work:** `aca9b06` removed the PWA role preview, all-modules launcher, and `requireRole` HQ bypass, and added role-based navigation gates. Those original findings are closed by source inspection.
- **Remaining evidence/impact:** `src/app/api/park/dashboard/route.ts:59–70` still selects the first active park for a City Head without a city assignment. Missing scope can therefore select another city's data. PWA menus use fixed role arrays rather than effective capability overrides; a grant/revocation can disagree with visible actions. This audit has not browser-tested the new navigation.
- **Fix/acceptance:** Fail closed for missing required city/park/group assignments, use scoped real data, and derive menus from effective capabilities. Verify normal City Head dashboard policy through route and browser tests.

### A22 — P1 — Printable Mashwara minutes embed unescaped stored HTML

- **Evidence:** `src/lib/mashwara/export-minutes.ts:103` interpolates meeting titles, attendee names, decisions, and tasks into HTML. `admin/mashwara/[id]/minutes/route.ts` returns this inline on the application's origin. Current CSP permits inline scripts.
- **Reproduction:** An inert test markup marker appears unescaped in the exported title and body. No browser exploit or external request was executed.
- **Impact:** Stored markup can become executable content when an authorized viewer opens minutes. The export also checks city resolution rather than the full meeting attendance/share/capability rules used by the main module.
- **Fix/acceptance:** Context-appropriate HTML escaping, restrictive export response policy, and shared meeting-access checks. Test hostile text as literal content and denial for same-city users without meeting access.

### A23 — P1 — Mobile fee collection reports payments without recording them

- **Evidence:** `src/components/modules/admin/mobile-fees-page.tsx:159–209` renders fixed challans, marks them paid with local `setChallansList`, invents a receipt reference, and shows a payment success toast. Challan generation only shows a success toast. There is no payment mutation in either handler.
- **Impact:** An operator can believe money was recorded when no ledger entry exists. Reload loses the action. Guardian dashboard navigation also points to this admin-oriented screen, which uses a restricted admin report endpoint and sample fallbacks.
- **Fix/acceptance:** Bind actual scoped fee events/participants and transactional payment APIs; use server-generated receipts and confirmed balances. Route family users to their own fee endpoint. Test amount/method validation, repeated submission, reload, and ledger/receipt reconciliation.

### A24 — P1 — Targeted announcements and resources do not consistently restrict readers

- **Evidence:** `src/app/api/announcements/route.ts:40–119` applies optional caller-supplied role filters but never restricts reads to the session's target roles. `src/app/api/resources/route.ts` omits city restrictions when its nullable resolver returns null, including family and park/group-only users.
- **Reproductions:** A student read a notice targeted only to HQ. A student resource query used `where: {}` and returned a city-targeted resource permitted to role `all`.
- **Fix/acceptance:** Intersect requested filters with authorized audiences; derive family scope from linked participants and staff scope from hierarchy. Test cross-role/cross-city reads and arbitrary filter changes. Reuse rules for polling, listing, and exports.

### A25 — P1 — Real offline attendance has batch-size and stale-write defects

- **Evidence:** `src/lib/offline/db.ts:114` reads up to 200 pending records; `use-attendance-sync.ts` sends the full list; `attendance/schemas.ts:58` permits at most 50. `park/attendance/sync/route.ts:114` upserts old marks unconditionally and stores no mutation identity/version. IndexedDB queue rows also contain no owner/account ID and no account-switch cleanup was found.
- **Reproductions:** 51 valid mutations fail batch validation; one succeeds. An older mark sent after a newer one overwrites it successfully.
- **Impact:** Larger offline rosters cannot sync via the current batch request; replay/reconnect can overwrite newer corrections. On shared devices, pending work is not associated with its originating actor.
- **Fix/acceptance:** Chunk bounded requests and drain the queue, use actor-owned mutation IDs and server version/conflict policy, isolate account queues, and keep locks/state changes atomic. Test 51/200+ records, reconnect, replay after correction, simultaneous tabs, event closure, and account switching.

### A26 — P2 — Profile write and audit are not atomic

- **Evidence:** `admin/students/[id]/profile/route.ts:121–160` reads the prior profile, performs an upsert, then writes audit outside a transaction.
- **Reproduction:** Synthetic audit failure propagated after the profile upsert; no transaction wrapped the operations.
- **Impact:** The client receives failure after data has changed, with no matching required audit evidence. A retry is ambiguous and concurrent updates can produce inaccurate before-state audit entries.
- **Fix/acceptance:** Transactional profile-and-audit persistence with controlled error responses and a reviewed concurrency policy. Test audit failure, rollback, and concurrent edits, including sensitive fields.

### A27 — P2 — Extended self profile and nullable edit submissions remain broken

- **Reconciliation:** `c378476` changed the default view to Overview and passed the selected participant into that overview, fixing the initial default/selected-subject problem. That issue is not reported as open.
- **Remaining evidence:** `src/components/modules/student/mobile-student-profile-view.tsx:63` still expects `session.user.participantId`, which NextAuth never supplies. Student dashboard navigation passes only a screen ID, so selecting the Extended view still lacks a participant ID. The selector fetches only 100 records, filters parks locally without sending the park filter, and has no pagination. `student-profile/profile-page.tsx:211` copies the full nullable server record into the edit draft; `student-profile/zod.ts` accepts optional strings but rejects null.
- **Reproduction:** An edited school combined with an unchanged null college fails the update schema, while the school-only patch succeeds.
- **Additional issue:** Mobile edit/sensitive controls are hardcoded from the role rather than resolved capabilities. A Park Lead/Murabbi may see an Edit action that the server correctly denies by default; a granted Park Admin may not see it.
- **Fix/acceptance:** Resolve the current participant through an authorized self endpoint, use paginated server-filtered selectors and effective capability data, and submit intentional changed fields with explicit null/clear semantics. Test student self access, guardians' linked children, more than 100 participants, secondary-city HQ navigation, and editing an existing sparse profile.

### A28 — P1 — Attendance still authorizes by batch anchor instead of group park

- **Evidence:** `admin/groups/route.ts:163–190` correctly permits groups at different parks within a city-owned batch. Attendance queries and gates in `park/attendance/route.ts`, `prepare/route.ts`, `[eventId]/*`, `sync/route.ts:82`, certificates, and analytics continue using `group.batch.parkId` or `batch: {parkId}`.
- **Reproduction:** A Park Lead for the batch's anchor park successfully marked a participant whose group explicitly belonged to a different park.
- **Impact:** Wrong-park authorization and incomplete/wrong rosters appear as soon as a batch spans multiple parks. This is an existing supported configuration, not a speculative new model.
- **Fix/acceptance:** Centralize group resource resolution around `Group.parkId` with a documented transitional fallback only for null legacy values. Test one city-owned batch spanning two parks and prove both own-park success and anchor-park denial across attendance, profiles, certificates, and reports.

### A29 — P1 — Default student permissions allow awarding points to other students

- **Evidence:** `src/lib/auth/capabilities.ts:180` gives students `students.manage` by default. `src/app/api/admin/gamification/points/route.ts` uses that capability for awards, with only the nullable actor-city comparison described in A05. It does not require an authorized awarding staff role or enforce participant ownership. Signed integer points have no business upper/lower bound.
- **Reproduction:** Using the actual default capability resolver with a synthetic student session, an award of 99,999 points to a foreign student returned 201 and called `pointTransaction.create`. No production points were changed.
- **Fix/acceptance:** Separate staff award permission from self-profile access, resolve target participant scope, bound points under the approved policy, and persist audit atomically. Test self/foreign award denial for family users and own/foreign scope for authorized staff.

### A30 — P1 — One active batch per city is not enforced under concurrency

- **Evidence:** The new `admin/batches/route.ts` creation gate reads `findFirst` and then creates outside a transaction. Reactivation in `[id]/route.ts` follows the same check-before-write pattern. Both schemas have only a non-unique city/activity index; checked-in PostgreSQL migrations contain no corresponding active-city uniqueness constraint.
- **Reproduction:** Two synthetic concurrent POST requests were held until both existence checks saw no active batch. Both returned 201 and created a batch for the same city. This is a deterministic handler interleaving test, not a real PostgreSQL load test.
- **Impact:** Simultaneous operators or retried requests can violate the newly approved city invariant, making the reported strict enforcement incomplete.
- **Fix/acceptance:** Enforce active-city uniqueness at the database boundary or serialize by city with an appropriate transaction/retry policy, covering legacy nullable city rows. Test concurrent create/reactivate against disposable PostgreSQL; exactly one operation should succeed and the other should receive a controlled conflict.

## Proposed fix sequence

No fixes are included in this audit. The following packages are ready to turn into small implementation tasks; the blueprint remains the planning authority.

| Order | Package | Findings | Required exit evidence |
| --- | --- | --- | --- |
| 1 | Contain public data and account mutations | A00, A01 | Clean client bundle; no hash projection; unauthorized provisioning/reassignment denied; real invite/reset flow |
| 2 | Restore server authorization and session boundaries | A02–A08, A21, A22, A24, A28, A29 | Actual handler tests for roles, capabilities, own/foreign/missing scope and reset state; safe HTML export; capability-aware menus |
| 3 | Make operational saves truthful | A09–A15, A23, A27 | Every visible save either persists and survives reload or is explicitly disabled; desktop/PWA contracts exercised |
| 4 | Protect transactions, inventory and offline replay | A16–A18, A25, A26, A30 | Concurrent database tests, exact balances, no lost/replayed changes, actor-owned queues, transactional audit, active-city batch invariant |
| 5 | Make schema delivery reproducible | A19 | Fresh PostgreSQL migration replay, schema diff, controlled-data reconciliation, backup/restore and recovery evidence |
| 6 | Re-establish release evidence | A20 and all packages | Clean lint/typecheck/relevant tests and both builds; role-based browser/staging UAT; accurate memory and release checklist |

Packages 3–4 that need new persistence depend on the corresponding forward migrations from package 5; do not wait until final release to design those migrations. Use narrow tasks with paired UI/API ownership rather than a broad redesign. Existing fee transaction and scoped-service foundations should be reused where they are correct.

Before coding, owner decisions are needed only where product behavior remains unresolved: which demonstration modules should be disabled versus completed now; intended normal City Head park-dashboard access; approved guardian consent/emergency rules; stock receipt/fulfillment lifecycle; and offline conflict policy. Those decisions need not delay containment of A00/A01 or restoring already-approved hierarchy invariants.

High-risk changes must state data/security impact and recovery. Schema changes should be additive and replayable. Revoke affected sessions after authorization repairs where needed. Recover a live PostgreSQL system on PostgreSQL; do not use a SQLite rollback. Do not deploy or migrate a real environment as part of an ordinary local fix task.

## Reproducing and using the evidence

- `baseline-summary.json`: full-suite counts and original failures, with unnecessary output omitted.
- `baseline-rerun.json`: isolated rerun of the two previously failing files.
- `latest-suite-results.json`: full-suite evidence after reconciliation against `a252603`, including three failed assertions.
- `static-inventory.json`: route inventory, table/migration gaps, client import paths and compiled-data verification counts. Authorization search markers are inventory aids, not proof of enforcement.
- `routes.test.ts`, `auth.test.ts`, `exports.test.ts`, `reproduction-results.json`: synthetic defect characterizations. Keep outside the normal test suite; replace these expectations with desired-behavior regressions as fixes land.
- Build/generation/typecheck logs: preserve the distinction between passed checks and environment-blocked checks.

```powershell
node docs/reviews/v2-audit-2026-09-08/static-audit.mjs
npx vitest run --config docs/reviews/v2-audit-2026-09-08/vitest.config.mts
```

The PostgreSQL typecheck configuration expects a client generated to `.next/audit-postgres/client` from a copy of `prisma/postgres/schema.prisma` with only generator output redirected. It uses synthetic connection variables and does not query a database. No generated client should be manually edited or committed.

The current assessment is **do not release**. Start with public-data/account containment, then server boundaries, then persistence. Passing the 33 characterization tests confirms these bugs exist; it does not approve release.
