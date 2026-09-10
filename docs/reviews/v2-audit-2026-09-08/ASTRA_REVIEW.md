# Astra independent review — v2 remediation

Date: 2026-09-08. Reviewer: GPT-6 Astra. **Review outcome: CHANGES REQUIRED.**

The candidate provides useful containment, but does not complete the authorized remediation plan. Confirmed authorization, safeguarding, persistence and concurrency defects remain reachable. It also introduces two deletion-response regressions and production TypeScript errors. No release, deployment, migration or merge approval is given.

## Candidate and review boundary

- Branch/base: `v2`, `a25260321abe28673db4337bdc2074b55ee0d836`; candidate is the uncommitted working tree, not a new commit.
- Source/test identity: SHA-256 `1a0231f8c75328373c534b2e6c98ab6410fc99a0d53195c94b0ad0b085576db1`, calculated over the sorted file/hash manifest in [astra-candidate-manifest.json](astra-candidate-manifest.json). It covers 31 modified and 3 newly added files under `src`. All 34 hashes were unchanged at the end of inspection.
- Read the audit, entire implementation plan, implementation ledger, AGENTS.md, verification skill, memory, relevant blueprint rules, complete application candidate diff, added tests and neighboring consumers. Existing dirty audit files, implementation documents and unrelated work were preserved.
- This review changed no application source, production tests, migration, generated shared client, account, deployment or live database. New evidence lives in this review directory; disposable generated clients/databases live under uniquely named `.next/astra-disposable-*` directories. No cleanup of other work was performed.
- References below are current candidate file/line references. A passing characterization means a defect reproduced, not that remediation passed. This review's `CONFIRMED` tests intentionally record defects; `CONTAINMENT` tests assert the limited protections that work.

## Fresh verification

| Check | Actual result | Evidence and limit |
| --- | --- | --- |
| `npm run typecheck` | **FAIL**, exit 1, three TS2554 errors | `src/app/api/calling/assignments/route.ts:43` passes 2 arguments to a zero-argument replacement; `interactions/route.ts:32` passes 3; historical `docs/reviews/v2-audit-2026-09-08/routes.test.ts:258` passes 1 to the new zero-argument sync handler. Two errors are in production callers. Terra's final typecheck-pass claim does not describe this candidate. |
| `npm run lint` | PASS, exit 0, **0 errors / 6 warnings** | Six pre-existing unused-disable warnings in CJS scripts. No lint fix or rule suppression was applied. |
| `npx vitest run --maxWorkers=1 --no-file-parallelism --reporter=json --outputFile=docs/reviews/v2-audit-2026-09-08/astra-suite-results.json` | **FAIL**, exit 1; **1,236/1,237 tests**, 177 files | [Full results](astra-suite-results.json). `src/app/api/admin/procurement/__tests__/items.test.ts` fails because its authorization mock lacks `requireResourceScope`, newly required by `stock/route.ts:81`. The former dashboard/profile-detail test failures are gone, with the dashboard coverage caveat below. |
| `npx vitest run --config docs/reviews/v2-audit-2026-09-08/astra.vitest.config.mts --reporter=json --outputFile=docs/reviews/v2-audit-2026-09-08/astra-review-results.json` | **20/20 evidence checks**, exit 0; 2 files | [Results](astra-review-results.json), [route evidence](astra-review.test.mts), [database evidence](astra-db.test.mts). Nine containment checks and eleven defect characterizations, not twenty repaired workflows. Sessions/capability grants are synthetic. Route checks use real authorization helpers. |
| Original audit characterizations, unchanged, rerun with their config and a new output file | **24/33 still reproduce**; exit 1 overall | [Results](astra-characterizations.json). Nine old assertions fail after candidate changes. A17's old mock lacks the new conditional-update result, so its failure alone proves nothing about concurrency. New tests supply the relevant evidence. |
| Actual transfer handler + Prisma + disposable SQLite | Concurrent 4-from-5 transfer: **201 + 409**, one transfer, source balance 1 | Independently generated SQLite client and empty database from current SQLite schema. An identical retry with sufficient stock creates two transfers; the same database permits two active batches in one city. Audit sink mocked: these tests do not prove audit atomicity. |
| Synthetic browser export, actual minutes generator | **Stored script executed** | Served only a synthetic fixture at `http://127.0.0.1:4309/minutes`, using the candidate's inline-script policy. In-app browser DOM read returned `data-astra-probe="executed"`. No account, application session, private content, external request or live exploit involved. See [browser evidence](astra-browser-evidence.json) and [fixture](astra-minutes-fixture.html). |
| Prisma validation, SQLite and PostgreSQL schemas | Both PASS | Ran installed Prisma `validate` for each schema with synthetic datasource variables; validation does not open a database or prove migration parity. |
| Migration inventory | **14 modeled tables still lack creation SQL**, 72 models / 24 SQL migration files | [Inventory/manifest](astra-candidate-manifest.json). Extended-profile primary key gap also remains. |
| Source dataset reference scan | Zero runtime `src` references to `portal-raw-dataset` | Source removal confirmed; this is not clean production-bundle or deployed-cache verification. |
| `git diff --check` | PASS, exit 0 | Only line-ending warnings. |

**Infrastructure and coverage limits:** The initial disposable-DB attempt exposed inconsistent shared generated state: its schema text identified SQLite, but the loaded client expected PostgreSQL. The review generated a separate SQLite client through Prisma and successfully reran the tests; it did not repair or replace shared generated files. No `psql`, `postgres`, `pg_ctl`, `initdb` or `docker` executable was found through local command discovery. No approved disposable PostgreSQL connection was supplied or used, so PostgreSQL migration replay, concurrency, upgrade preservation and restore rehearsal remain unverified. SQLite evidence cannot close those PostgreSQL acceptance gates.

Neither production build nor a fresh compiled client-bundle scan was run in this review: the candidate already fails production-call-site typechecking, and the shared generated state is inconsistent. Historical font-fetch/DLL failures are historical evidence only, not newly reproduced build results. No authenticated full-PWA reset/payment/offline/account-switch UAT was performed; the browser result is limited to the actual exporter's synthetic HTML. These are explicit missing acceptance checks, not implementation approval.

## Severity-ranked findings and corrections

### V01 — P0 acceptance gap: A00 source containment lacks clean-build evidence

The three direct client imports and all remaining runtime source references were removed. That is a real improvement. However, P01 explicitly requires a clean isolated bundle/source-map scan and separate treatment of historical deployed artifacts. `src/components/modules/admin/client-data-boundary.test.ts:13` only searches three files for one import pattern. No such test can establish that generated assets are clean.

**Terra correction:** retain source containment, restore type/build verification in isolated provider environments, scan emitted client JS and published source maps for dataset matches with counts only, and record the artifact identity. Keep historical deployment/cache containment as a separate owner-authorized operation. This is missing evidence for an original P0 finding, not a claim that the newly compiled candidate was observed leaking data.

### R02 — P1: new city helper still expands park/group authority and rejects valid park-only users (A05)

`src/lib/auth/authorize.ts:107` accepts any non-HQ actor's `assignedCityId` as sufficient scope; it neither resolves park/group assignments nor preserves their narrower boundaries. `admin/procurement/orders/route.ts:43` checks park scope only when a park filter is supplied. A Park Admin with an allowed capability and city+park assignment gets the entire city's order list if `parkId` is omitted. `admin/finance/adjustments/route.ts:29` and `donations/route.ts:44` permit arbitrary same-city park filters and corresponding writes without comparing the actor's park. Conversely, a legitimately park-only actor is rejected before the requested own park can be resolved.

**Evidence:** three `CONFIRMED R02` route checks use the real helper and synthetic capability grants: foreign-park adjustment GET 200; city-wide order filter; own-park order GET 403 with no park lookup. This contradicts the ledger's claim that all finance/procurement consumers now fail closed at the required hierarchy boundary.

**Terra correction:** distinguish unrestricted HQ, resolved city/park/group and denied actors; derive missing city from validated assignments; intersect every optional filter and mutation target with the full hierarchy. Explicitly deny roles for which a city-level operation has no approved narrow-scope representation. Cover default roles and grants, supplied and omitted filters, own/foreign targets and missing assignments.

### R03 — P1: reconciliation park filter overwrites the city constraint (A05)

At `src/app/api/admin/finance/reconciliation/route.ts:22`, the city-restricted `paymentsWhere.feeEvent` is replaced on line 23 with the user-supplied park predicate. A City Head can select a park in another city and read that park's payment totals even though the response metadata still names the assigned city. The new helper does not prevent this because no conflicting city query is necessary.

**Evidence:** `CONFIRMED R03` returns 200 and the synthetic foreign payment total; the actual query contains only the foreign park constraint.

**Terra correction:** validate the target park, keep both constraints conjunctive, and resolve participant/group park correctly for city-owned batches. Test foreign park without a city query and mismatched city+park combinations; verify all total categories use identical authorized scope.

### R06 — P1: sensitive safety/Islah workflows remain enabled and unscoped (A11, A12)

`guardian/emergency-info/route.ts:43` returns the whole process-local map; POST at line 57 accepts arbitrary participants and defaults missing medical facts at lines 11–13. `guardian/consents/route.ts:55` accepts a consent/signature without child ownership. `islah/daily-log/route.ts:68` exposes every process-local note to authenticated callers. Community creation/voting also still construct successful responses without persistence (`community/posts/route.ts:37`, `community/polls/route.ts:52`).

**Evidence:** unchanged audit reproductions still demonstrate an unrelated student's emergency/consent writes, cross-account private-note access and a post disappearing on GET. These are current handler reproductions, not only old audit claims.

**Terra correction:** immediately gate unsupported client and server operations and remove sample-family leakage/medical defaults. Approval of future consent, moderation or retention policy is not needed to stop current leakage and false success; P09 explicitly authorizes that containment. Do not label an enabled unsafe route merely "decision-required."

### R09 — P1: minutes export still permits stored JavaScript and lacks shared meeting access (A22)

`src/lib/mashwara/export-minutes.ts:103` and `:121` interpolate raw titles into HTML, alongside other stored text. `admin/mashwara/[id]/minutes/route.ts:49` checks only resolved city; it does not reuse the meeting attendance/share/capability rules. Lines 96–102 serve inline HTML, while `next.config.ts:6` permits inline scripts.

**Evidence:** actual exporter output executed the harmless DOM marker in a browser under equivalent script policy. The synthetic test avoids writing a malicious meeting into any real database.

**Terra correction:** escape all text by output context, validate rendered URLs, apply shared meeting-access rules and restrictive export headers. Add hostile-title/attendee/decision/task browser checks plus same-city, non-attendee denial tests.

### R07 — P1: remaining route authorization and calling false-success paths are not contained (A02–A04, A24)

The new park routes still rely on session/role checks (`park/evaluations/route.ts:82`, `park/lessons/route.ts:20`, `park/planner/route.ts:104`, `park/structure/route.ts:175`, `inventory/central/route.ts:11`). Admissions list still lacks capability and actor scope, and detail/PATCH/DELETE lack complete resource checks (`admin/admissions/route.ts:40`, `admin/admissions/[id]/route.ts:73`, `:120`). Removing raw fallbacks did not fix these boundaries.

Calling assignment still ignores manager verifier denials and proceeds after exceptions (`calling/assignments/route.ts:32`); interactions never enforce assignment ownership (`calling/interactions/route.ts:35`). Their final branches still report virtual success after missing records/DB failures (`assignments/route.ts:100`, `interactions/route.ts:76`), despite `portal-store.ts` becoming a no-op. Campaign DELETE also never invokes the verifier (`calling/campaigns/[id]/route.ts:101`). Announcement audience remains caller-filtered (`announcements/route.ts:66`) and resources omit city restrictions on null resolution (`resources/route.ts:18`).

**Evidence:** existing synthetic route reproductions for reset-required foreign evaluation writes, foreign lesson/planner access, unscoped admissions, student call logging, ignored calling denial and cross-audience/resource reads all still match the defective behavior.

**Terra correction:** finish P03 on every HTTP method and consumer. Apply reset/capability/scope and linked-record checks before data access; return verifier denials and controlled failures; make writes/audits atomic. Replace every surviving virtual-success branch. Use normal-suite route tests with real shared helpers and synthetic capability grants/denials.

### R08 — P1: authentication/reset/missing-dashboard-scope defects remain (A07, A08, A21)

Login still falls back to email `contains` (`src/lib/auth.ts:96`), uses inactive staff metadata (`:131`), and retains a deleted user's JWT (`:194`). `src/components/pwa/pwa-app.tsx:193` still initializes once without forced-reset/session-loss routing. `park/dashboard/route.ts:59` still picks the first active park with an unrestricted query when City Head city scope is missing.

The candidate changes `park/dashboard/route.test.ts:53` from a City Head to an invented `viewer` role. That makes the prior test green but does not deliver P11's required missing-city denial plus own-city success coverage. The separate profile-detail mock repair is appropriate.

**Terra correction:** finish P05 and restore the explicit City Head boundary tests. Verify exact normalized credentials, inactive/deleted/revoked users, active scope, shared-throttling dependency, forced reset and session loss through the mounted PWA; derive menus from effective capabilities. Do not treat the changed dashboard fixture as proof of policy resolution.

### R10 — P1: Group.parkId correction covers only one attendance entry point (A28)

`park/attendance/sync/route.ts:82` correctly uses the group park, and the profile helper now checks Park Admin. However, `park/attendance/route.ts:139`, `park/attendance/[eventId]/route.ts:186`, `park/attendance/prepare/route.ts:32`, `admin/certificates/[participantId]/route.ts:54` and `admin/students/[id]/detail/route.ts:65` still authorize or select records using the batch anchor. The alternate write/read endpoints therefore retain the original cross-park boundary defect.

**Evidence:** new A28 route check confirms own-group-park sync succeeds and anchor-only sync is denied; neighboring source gates still use batch park. The updated normal sync test uses identical group and anchor parks and does not exercise this distinction.

**Terra correction:** centralize group resource resolution and migrate every attendance, profile detail, certificate and analytics consumer. Test a city-owned batch spanning two parks across every alternate entry point, including null-only legacy fallback and inconsistent city links. Mark the overall A28 item partial/open until that inventory is finished.

### R04 — P1: stock transitions and retry integrity remain incomplete (A17)

`admin/procurement/requests/[id]/route.ts:23` reads status outside its transaction. The new transition map at line 48 checks that stale value, and the update at line 57 has only `{ id }` in its predicate. Two pending readers can approve and reject the same request with two 200 responses. Thus the apparent one-way rule is not atomic. Fulfillment is safely disabled, so this candidate no longer inflates stock through that transition.

Transfers now correctly condition the source decrement, but `transfers/route.ts:7` has no durable retry identity and `:81` creates a new transfer each time. A retry after a lost success response moves inventory again when sufficient stock remains. The audit call at line 103 is outside the transaction and unawaited; the passing tests mock this sink.

**Evidence:** deterministic concurrent request handlers both returned 200; actual disposable SQLite transfer handlers returned 201 twice for the identical retry. Actual SQLite overspend test passed, so the conditional-decrement improvement is accepted narrowly.

**Terra correction:** atomic compare-and-set status or equivalent locked transition; durable operation identity and replay result for transfers/receipts; transactional required audit; controlled conflicts and bounded retries. Run the planned PostgreSQL concurrent, duplicate and rollback cases before claiming A17 implemented/verified.

### R11 — P1: schema delivery and active-city invariant are unchanged (A19, A30)

No forward migration or model/constraint remediation is in the candidate. The 14 tables lacking creation SQL are `fee_donations`, `financial_adjustments`, `procurement_items`, `park_stocks`, `stock_requests`, `purchase_orders`, `stock_transfers`, `stock_audit_logs`, `team_chat_messages`, `point_transactions`, `badges`, `student_badges`, `digital_resources` and `knowledge_articles`; the manifest records the inventory. `prisma/postgres/migrations/20260723160000_add_student_extended_profile/migration.sql:5` still declares `id` NOT NULL without its modeled primary key.

`admin/batches/route.ts:152` checks for an active batch before creating at line 172; reactivation does likewise at `[id]/route.ts:108` before the update at line 137. `prisma/schema.prisma:174` only adds a non-unique city/activity index. There is no corresponding PostgreSQL active-city uniqueness constraint.

**Evidence:** fresh migration inventory; old concurrent handler reproduction still yields two successful creates; actual disposable SQLite accepts two active batches. PostgreSQL replay is unavailable, not passed.

**Terra correction:** implement P04 forward migrations and preflight/recovery documentation; implement the approved active-city invariant at the DB/transaction boundary including legacy nullable city rows. Prepare code despite unavailable PostgreSQL, but retain release-blocking verification status until fresh replay/upgrade/concurrency/restore evidence exists. Do not migrate or reconcile real records during this correction task.

### R12 — P1: attendance, fee and import operations still misrepresent saves (A09, A14, A23)

`park/tabs/attendance-tab.tsx:71` posts the wrong request shape and line 84 reports "All saved" regardless of response. `admin/mobile-fees-page.tsx:188` updates a local sample list and line 201 claims payment recorded; challan generation at line 207 is another success toast. `admin/attendance/import/route.ts:199` reports `importedCount` after city resolution and audit, without participant/attendance persistence.

**Evidence:** the original actual-tab payload test still returns 400; current UI/import handlers remain unchanged. The workbook endpoint gate only contains one import path, so A14's ledger claim that no partial/default-city/false-success path remains is too broad.

**Terra correction:** bind the approved existing attendance/payment/import services through the actual mounted UI, or explicitly gate unsupported operations on both sides. Preserve drafts/queued changes after failures. Verify reload, ledger/receipt reconciliation, actual parsed workbook counts and duplicate submission. Do not postpone removing false success while awaiting policy decisions.

### R13 — P1: real offline replay still overwrites corrections and exceeds server limits (A25)

`src/lib/offline/db.ts:114` selects 200 rows; `src/hooks/use-attendance-sync.ts:76` sends all of them; `src/lib/attendance/schemas.ts:58` accepts at most 50. `park/attendance/sync/route.ts:118` still upserts without persisted mutation identity, actor ownership or version comparison. Event state is checked outside a transaction. Gating the separate `/api/sync/process` stub does not protect this live endpoint.

**Evidence:** 51-record validation rejection and older-after-newer overwrite both still reproduce. Queue schema has no owner/account identity; browser account-switch/reconnect acceptance is missing.

**Terra correction:** chunk and drain actor-owned queues, preserve failed/conflicted work, apply persisted mutation identity/version checks and event locking atomically, and prohibit stale overwrites. An unresolved automatic conflict policy does not block detecting a conflict and retaining the user's pending work. Test 51/200+, closed events, replay, two tabs and account switching.

### R05 — P1 build gate: replacement signatures break current callers; full suite has a new failure (A20)

`src/lib/calling/portal-store.ts:22` and `:26` remove function parameters while `calling/assignments/route.ts:43` and `calling/interactions/route.ts:32` still pass them. `sync/process/route.ts:4` also conflicts with a preserved historical route test included by root typecheck. The procurement stock test's missing mock is the full-suite failure described above.

**Terra correction:** update or remove callers together with the actual calling contract, rather than masking type errors or preserving virtual successes. Keep a compatible HTTP-handler signature or isolate historical evidence from application typechecking with a documented review/test arrangement that preserves it. Repair the stock test using the real desired authorization contract. Rerun to actual process completion and capture exit codes, file/test counts and both builds; do not infer completion from partial tool output.

### R01 — P2 introduced regression: successful deletions return 404 (A03, A04)

`admin/admissions/[id]/route.ts:132` deletes an existing application and always falls through to 404 at line 138. `calling/campaigns/[id]/route.ts:111` similarly deletes and audits, then returns 404 at line 124. Removing false-success fallbacks was correct, but the success return was removed along with them. Clients can show failure and keep stale rows after irreversible server-side deletion; retry then sees an absent record.

**Evidence:** two independent current-handler checks confirm the delete spy was called exactly once before the 404 response.

**Terra correction:** return success only after the authorized transaction commits; return 404 only for an absent target; keep audit with the mutation. Add success, not-found, audit/DB-failure and foreign-scope tests for both DELETE methods. This correction must accompany the existing authorization repairs, not restore unconditional success.

### R14 — P2: reports/certificates/profiles/analytics and the handoff remain incomplete (A13, A15, A18, A26, A27)

Custom reports still return metadata (`admin/reports/custom/route.ts:33`), report UI exports "Sample Data" (`mobile-reports-builder-page.tsx:200`), and the "backup" is metadata (`mobile-more-page.tsx:186`). Certificates still POST a name as participant ID to a GET-only route and display sample verified claims (`mobile-certificates-page.tsx:208`, `:243`). Analytics still divides range-wide marks by current participants (`home-analytics/route.ts:155`). Profile upsert precedes audit (`admin/students/[id]/profile/route.ts:127`); Extended self identity relies on an absent session participant ID (`mobile-student-profile-view.tsx:59`), and the editor submits the full nullable profile (`student-profile/profile-page.tsx:207`) to a non-nullable optional-string schema.

**Evidence:** custom-report no-op, 200% analytics, audit-after-persist failure and sparse-profile validation failure all still reproduce. Other statements are fresh source inspection, not full browser UAT.

**Terra correction:** finish P08–P10 as specified, retaining explicitly gated behavior where policy is unresolved. Correct ledger overstatements: A01/A29 are mitigations, A05/A17/A28 are partial, A14 covers more than the workbook gate, and A20 currently fails. Add the required per-item paths, test outcomes, data/security impact, recovery, exact missing decisions and candidate summary/manifest. The blanket "verification blocked" label must not hide unfinished implementation or substitute for concrete infrastructure evidence.

## Per-audit-item verdicts (all A00–A30)

"Contained" below accepts only the described gate; "partial" means acceptance is still incomplete; "open" means the finding remains actionable. No row grants release approval.

| ID | Verdict | Candidate evidence and required next step |
| --- | --- | --- |
| A00 | **Partial — source contained; bundle verification missing** | Runtime dataset references are zero. `client-data-boundary.test.ts:13` is source-only. Complete V01 clean artifact scan; historical deployments remain outside this review. |
| A01 | **Contained / decision required** | `park/structure/route.ts:221` returns 503; independent test proves no account lookup/write/hash response. Safe provisioning UI/reset path still not verified. Keep unavailable until wired to approved provisioning. |
| A02 | **Open** | Evaluation/lesson/planner reproductions persist; structure student action and central inventory still omit full guards. Finish R07 per method. |
| A03 | **Partial with introduced regression** | Raw fallback and swallowed-error virtual PATCH removed; resource/capability gaps persist, DELETE commits then returns 404. R07 + R01. |
| A04 | **Partial with introduced regressions** | Dataset store removed and campaign GET/PATCH fallbacks removed; assignment/interaction authorization and virtual successes persist, DELETE returns 404, caller signatures fail. R07 + R01 + R05. |
| A05 | **Partial — not fully implemented** | Foreign-city replacement and foreign stock query denied in fresh tests. Same-city park expansion, reconciliation overwrite, valid park-only denial remain. R02 + R03. |
| A06 | **Helper corrected; route acceptance incomplete** | `student-profile/scope.ts:125` distinguishes Park Admin. Fresh own/foreign helper checks pass. Require actual profile GET/PUT tests with effective overrides, missing assignments and projections; separate detail-route anchor defect remains A28. |
| A07 | **Open** | All three authentication characterizations reproduce; exact identity, inactive assignment and deleted JWT at `auth.ts:96`, `:131`, `:194`. R08. |
| A08 | **Open** | `pwa-app.tsx:193` still omits reset state and session-loss handling; no authenticated browser acceptance. R08. |
| A09 | **Open** | Actual UI payload remains rejected; `attendance-tab.tsx:84` still says saved. R12. |
| A10 | **Contained / decision required** | `sync/process/route.ts:4` returns authenticated 503; unauthenticated/reset checks pass. Preserve queue and expose unavailability in Studio; unified persisted contract still unfinished. |
| A11 | **Open — not safely deferred** | Emergency/consent/leave remain active, sample-backed, unscoped; cross-account safety writes reproduce. Gate before waiting for future domain design. R06. |
| A12 | **Open — not safely deferred** | Private-note cross-account read and disappearing post reproduce; polls return invented votes. Gate unfinished operations. R06. |
| A13 | **Open** | Metadata reports, sample CSV and non-restorable "backup" unchanged. R14; no restore/export acceptance. |
| A14 | **Partial containment only** | Workbook GET/POST 503 and mobile action no-op error verified. Attendance import still falsely reports imports (`admin/attendance/import/route.ts:199`); desktop button still says full sync of 759 (`portal-import-page.tsx:215`). Finish R12 and correct ledger scope. |
| A15 | **Open** | `mobile-certificates-page.tsx:243` sends a name as ID; POST handler absent, sample verified/share claims remain. R14. |
| A16 | **Narrow fix verified; lifecycle partial** | Independent issue-handler check proves zero stock writes. Unsupported fulfillment is rejected. Receipt/cancellation workflow and DB/audit lifecycle acceptance remain gated/pending; don't claim full P07 completion. |
| A17 | **Partial — remaining integrity defects confirmed** | Actual SQLite overspend test passes. Duplicate transfer and stale competing status changes remain; PostgreSQL acceptance missing. R04. |
| A18 | **Open** | 200% multi-session attendance and zero Murabbi present metrics still reproduce; fixed mock totals remain. R14. |
| A19 | **Open / PostgreSQL verification blocked** | Same 14 missing creation tables and profile PK gap; no migration fixes. Both schemas validate, which does not close this item. R11. |
| A20 | **Failed acceptance** | Typecheck fails; full suite 1,236/1,237; lint passes with six warnings. Required builds/full browser evidence absent; dashboard policy coverage not repaired. R05 + R08. |
| A21 | **Open remainder; earlier preview removal preserved** | No candidate reintroduction of role preview/HQ bypass. `park/dashboard/route.ts:59` missing-city fallback and role-array menus remain. R08. |
| A22 | **Open — browser-confirmed execution** | Synthetic exported title executes a script under equivalent candidate policy; meeting access incomplete. R09. |
| A23 | **Open** | `mobile-fees-page.tsx:188` changes local fake challans; no real receipt/ledger write. R12. |
| A24 | **Open** | HQ-target notice readable by student; null-city resource lookup remains unrestricted in fresh route reproductions. R07. |
| A25 | **Open** | 51-record rejection and stale overwrite reproduce; no owner/version/idempotency storage or account-switch acceptance. R13. |
| A26 | **Open** | Audit failure still occurs after profile persistence; no transaction. R14. |
| A27 | **Open remainder; earlier Overview fix preserved** | Extended self ID, 100-row selector, role-based controls, nullable full-draft submission still broken. R14. |
| A28 | **Partial — sync-specific protection verified** | New sync test with distinct group and anchor parks passes both allow/deny. Other attendance/detail/certificate gates use batch anchors. R10. |
| A29 | **Contained / decision required** | Point-award POST returns 503 with no write. This is not an implemented award policy; do not restore until capability/value/correction/audit rules are approved and tested. Broad staff GET still filters by city when no student is supplied (`gamification/points/route.ts:50`); include it in hierarchy inventory. |
| A30 | **Open** | Concurrent handler creates still both succeed; real disposable SQLite has no uniqueness constraint. PostgreSQL create/reactivate verification required. R11. |

## Return to Terra

1. Repair R05 compile/test regressions and R01 truthful deletion results without weakening gates or discarding historical audit evidence.
2. Complete the already authorized server-boundary work R02/R03/R07/R08/R10 and escape/protect minutes (R09). Gate the unsafe safety/Islah/community and misleading operational actions immediately where their full workflows cannot yet be enabled.
3. Complete transactional/replay corrections, migration preparation and active-city invariants. Keep PostgreSQL-specific checks explicitly blocked until disposable infrastructure is available; continue other implementation work.
4. Finish or safely gate remaining P08–P10 operations, then replace characterization assertions with desired-behavior regressions in normal discovery paths. Preserve this review evidence as historical evidence.
5. Produce the plan's complete per-item ledger and exact candidate evidence, including both isolated builds/bundle scan, relevant browser UAT and real PostgreSQL tests. Return the amended diff to Astra for another independent review.

Disabling unresolved staff awards, receipt/fulfillment, workbook import and simulated sync is an acceptable interim direction. It does not excuse leaving unrelated authorized fixes or unsafe unapproved workflows enabled. The initial review is complete; implementation corrections belong to Terra.
