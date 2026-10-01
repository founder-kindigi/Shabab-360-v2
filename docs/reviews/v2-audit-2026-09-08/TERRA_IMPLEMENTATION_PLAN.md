# v2 remediation: GPT-5.6 Terra implementation, GPT-6 Astra review

Prepared 2026-09-08. Implementation owner: **GPT-5.6 Terra** (`gpt-5.6-terra`). Independent review owner: **GPT-6 Astra** (`gpt-6-astra`).

This is an implementation handoff, not evidence that fixes have started or passed review. The user requested this plan and the implementer/reviewer separation. No new task, model switch, deployment, or database operation is performed by preparing it.

## 1. Objective and authority

Remediate the v2 audit's A00–A30 findings in narrow, reviewable packages. Preserve the current product design and existing correct services. Produce code, regression tests, migration/recovery evidence where relevant, and a complete finding ledger for Astra to review independently.

Read these first, relative to the repository root:

1. `AGENTS.md`, `.agents/memory/current.md`, and current Git status.
2. `docs/reviews/v2-audit-2026-09-08/AUDIT.md`, including its evidence limits and reconciliation notes.
3. `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md`: authority order, confirmed role boundaries, relevant workflows, safeguarding, migration and release rules.
4. `.agents/skills/shabab-build-feature/SKILL.md` and its context map; use this skill during implementation.
5. `.agents/skills/shabab-verify-change/SKILL.md`; use it after implementation.

The audit was reconciled against `v2` commit `a252603`. The working tree also contains newer audit documentation/evidence changes. Preserve those files and record their starting state. Do not reset, stash indiscriminately, or include other work as Terra-authored changes. Re-read files before editing and reassess findings if newer code has landed.

Current evidence: 174 application test files, 1,229/1,232 tests passing; typecheck passes; lint passes with six warnings. There are 33 synthetic defect characterization tests in the audit folder. Their passing results demonstrate defects, not safe behavior. Both database providers passed typechecking, but full build evidence is incomplete because of Google font fetching and a loaded Windows Prisma engine DLL. These historical results are not the final acceptance baseline.

Preserve the already completed removal of preview/all-module navigation and the HQ role bypass, along with the profile Overview subject fix and recent mobile spacing improvements. The remaining parts of A21 and A27 still need work.

## 2. Execution rules

- Implement locally on the agreed v2 working context. Record the actual base commit and changed paths before each package. Use narrowly scoped commits if committing is authorized; otherwise provide package diffs and a path manifest. Never merge into `main` as part of this handoff.
- Do not stop after a plan or helper refactor. Complete each ready package through its actual UI/API paths, tests, and evidence. Continue independent packages when one has a specific external dependency.
- Preserve approved role and hierarchy rules. Capability grants never expand resource scope. In particular, family users have self/linked-child access, Park Admin and Park Lead are park-scoped, and Murabbi is group-scoped. City Head may provision only approved subordinate roles within the assigned city.
- Never print personal registration values, credentials, `.env` contents, password hashes, or real medical notes. Use synthetic fixtures and counts in artifacts.
- Treat an uncertain product rule as unresolved, not permission to invent it. Apply existing approved behavior where documented. For unfinished actions, remove false success and make the server return an explicit unavailable response as appropriate; UI-only hiding is insufficient.
- Disabling a feature is containment, not full implementation. Record it as `MITIGATED / DECISION REQUIRED`, with the missing decision and activation criteria. Do not declare all findings fixed while such entries remain.
- Do not add safeguarding/community tables or enable those workflows before their business rules are approved. The blueprint explicitly reserves those decisions. This does not block removing leakage, unsafe defaults, or fake writes now.
- Use disposable local databases and synthetic data for destructive/concurrency tests. A production or shared staging URL is not a disposable database. This plan does not authorize live migration, deployment, account reassignment, notifications, data cleanup, or cache purging.
- Do not stop another task's app or delete shared build caches to work around Prisma locks. Prefer an isolated verification checkout/client and report genuine infrastructure blockers precisely.
- Keep historical audit evidence intact. Add desired-behavior regressions under the normal test discovery paths. Do not weaken tests, remove failures, or broadly disable lint rules to obtain a green summary.

## 3. Sequence and finding ownership

Execute P01 first. P02–P04 establish shared authorization and schema foundations. Later packages may prepare their code before migration validation completes, but must not claim persistence/integration acceptance without their required schema and database tests. P11 follows all implemented packages. Astra reviews the resulting candidate after Terra's handoff.

| Package | Primary findings | Dependencies | Outcome |
| --- | --- | --- | --- |
| P01 | A00, A01 | Current-code baseline | Public data and unauthorized account mutation contained |
| P02 | A05, A06, A28, A29 | P01 | Shared scope resolution and correct domain boundaries |
| P03 | A02, A03, A04, A22, A24 | P02 | All affected route methods use complete authorization |
| P04 | A19 | Start after P01; coordinate schemas with later packages | Replayable PostgreSQL schema and reviewed recovery path |
| P05 | A07, A08, A21 | P01–P03; P04 if storage changes | Correct login, revocation, reset routing and menus |
| P06 | A09, A10, A25 | P02–P04 | Real attendance persistence and safe offline replay |
| P07 | A16, A17, A23, A30 | P02–P04 | Exact payment/stock writes and concurrency invariants |
| P08 | A14, A15 | P02–P04 | Truthful imports and certificate operations |
| P09 | A11, A12, A13 | P02–P04 where persistence is approved | Private, truthful safety/community/report actions |
| P10 | A18, A26, A27 | P02–P06 | Correct analytics and reliable profile editing |
| P11 | A20 and acceptance for A00–A30 | All implemented packages | Independent-review candidate with reproducible evidence |

### P01 — Contain the two critical findings

**Inspect:** the three dataset-importing client components identified in A00, the PWA import graph, `src/app/api/park/structure/route.ts`, and established access-provisioning routes/services.

1. Remove private registration datasets from every client import graph. Replace operational fallback records with authorized, scoped, paginated server reads and minimum response projections. Make server-only data modules impossible to import from client code. Tests should use synthetic data.
2. Replace the structure endpoint's ad hoc staff upsert with the existing approved provisioning path. If an action has no safe supported provisioning operation, reject it explicitly until wired correctly. Validate canonical roles, actor hierarchy, target account and target park; never silently reassign an existing account based only on email.
3. Return allowlisted public account fields. Make assignment change, audit and required token revocation atomic. Preserve a working invitation/forced-reset path for authorized provisioning.

**Exit:** own-scope authorized provisioning succeeds; Murabbi self-promotion, foreign targets, HQ targets and missing scope are denied with no writes. No response contains a hash. Build into clean isolated output and scan client JS plus any published source maps for fixture markers/private dataset matches, reporting counts only. A source search alone does not close bundle exposure. Document that any historical deployed artifacts require a separate authorized containment operation.

### P02 — Correct shared authorization and hierarchy resolution

**Inspect:** `src/lib/auth/authorize.ts`, `scope.ts`, capability access, `src/lib/student-profile/scope.ts`, `admin/gamification/points`, and consumers listed in A05/A28.

1. Replace ambiguous nullable city resolution with explicit unrestricted HQ, resolved scoped actor, and denied outcomes. Derive required city/park/group from validated current assignments. Requested filters must intersect actor scope.
2. Resolve attendance and related resources from `Group.parkId`. Define a narrow, documented fallback for genuinely null legacy group parks only; a present group park must override the batch anchor. Check linked batch/city consistency.
3. Handle Park Admin explicitly in profile scope. Check granted capabilities without treating a grant as city-wide access.
4. Separate staff point-award authority from `students.manage` self-profile access. Use the established capability system with reviewed code-defined actions and conservative defaults. Deny family awards; bound permitted points under an existing approved rule or leave awards unavailable pending that rule.
5. Inventory every caller of changed helpers, including resources, finance/procurement, dashboards, certificates and analytics. Update them together so an old `null` interpretation cannot remain silently permissive.

**Exit:** real route tests cover all supported roles, approved allow/deny overrides, missing assignments, self/linked/foreign records, and conflicting query filters. Use one city-owned batch across two parks: own-group park access succeeds, anchor-only access fails. Student point awards to self and others fail; authorized staff own-scope behavior remains valid.

### P03 — Repair route-level protections and HTML exports

1. Apply authentication/reset, capability, resolved resource scope and linked-record validation to every HTTP method of affected park evaluations/lessons/planner/structure/central inventory APIs.
2. Restore admissions listing/detail/PATCH/DELETE scope and workflow rules. Remove raw-dataset fallbacks and virtual-success catches. Validate changes and persist related audit transactionally.
3. Enforce one fail-closed calling manager/POC/caller authorization path. Respect verifier denials and exceptions; check campaign/caller/application city and assignment ownership/expiry before any in-memory or persistent change. Protect lead lists and exports too.
4. Restrict announcement readers by actual target audience, intersecting supplied filters. Resolve resource access for family and park/group-only accounts without interpreting missing city as unrestricted.
5. Escape all stored text in Mashwara HTML for its output context, validate any rendered URL, and use shared meeting attendance/share/capability access. Review export headers/CSP so the response cannot execute stored content.

**Exit:** per-method success, unauthenticated, reset-required, wrong role/capability, foreign/missing scope, invalid linked IDs, malformed/bounded input, missing record, and database failure tests. Denied requests produce no write/audit side effects or private response fields. Hostile export text renders literally in a browser without execution; same-city unauthorized viewers cannot export minutes.

### P04 — Make schema delivery reproducible

1. Compare both Prisma schemas with the full PostgreSQL migration chain at table, column, constraint, enum and index level. Cover all 14 missing modeled tables and the missing extended-profile primary key identified in A19.
2. Add forward migrations for approved existing application domains and subsequent package changes. Do not edit applied migrations or generated clients. Keep shared SQLite/PostgreSQL models aligned; document provider-specific constraint implementation.
3. Account for two distinct states: a fresh migration-only database and an existing environment with possible separately created tables. Do not blindly add `IF NOT EXISTS` or mark migrations applied: those can conceal incompatible schemas. Define a reconciliation/preflight path based on read-only schema evidence from an approved environment.
4. Check for null/duplicate/inconsistent rows before adding constraints. Report collisions; never silently delete or merge operational data. Preserve migration prerequisites and data backfill ordering.

**Exit:** fresh disposable PostgreSQL replay and schema diff pass; representative synthetic upgrade data is preserved; constraints are verified through writes, not only schema text. Record backup/restore rehearsal and recovery steps for the disposable database. If PostgreSQL is unavailable, schema code may be ready but A19 remains unverified and release-blocking. Changes to approved existing models do not authorize enabling new safeguarding/community domains.

### P05 — Restore authentication, reset and navigation lifecycle

1. Use exact normalized email matching and bounded credentials. Reject inactive/deleted identities and invalid/inactive staff assignments. Ensure token refresh invalidates deleted users and revoked versions; scope/role changes cannot retain old authority.
2. Apply throttling with the approved shared deployment mechanism and normalized account keys, retaining generic failure responses. If no shared mechanism is configured, document the concrete dependency; do not claim an in-memory counter is distributed protection.
3. Model loading, unauthenticated, reset-required and authorized states in the live PWA. Route forced reset before operational screens. Handle expiry and logout, clearing private view/query state while coordinating account-owned pending offline work with P06.
4. Keep preview controls removed. Replace remaining simulation dashboard fallbacks with explicit authorized selection/real empty states. Use effective capabilities for menus and actions without weakening server gates.

**Exit:** browser tests for initial provisioning through reset, login failure, session expiry, revoked/deleted/inactive identity, reauthentication and logout. Missing City Head scope denies access. Existing approved own-city dashboard behavior succeeds. A revoked menu capability disappears and direct API access remains denied.

### P06 — Make attendance and offline writes reliable

1. Wire the live park attendance tab to actual event/roster data and the correct student/staff APIs. Preserve their distinct permissions. Show saved only after server confirmation; distinguish pending offline changes from saved records.
2. Remove the simulated `/api/sync/process` contract or adapt it to the real sync service. Use one response contract for the hook, conflict engine and Sync Studio; settle only acknowledged items.
3. Chunk the queue to server limits and continue draining. Make mutation identity durable, owned by its actor, and idempotent. Use server record versions or equivalent transactional concurrency checks; do not trust client timestamps as authority to overwrite a newer mark.
4. Preserve conflicted/failed work. Require an authorized resolution when versions disagree until any automatic business rule is approved. Separate queues by account and prevent another user from replaying them. Account switching must not silently discard unacknowledged work.

**Exit:** browser plus real database tests for online save/reload, 51/200+ queued records, reconnect, same-mutation replay, older-after-newer writes, simultaneous tabs, event closure, authorization revoked while offline, cross-account switching and partial batch failure. No lost marks, stale overwrite, duplicate side effects or misleading success.

### P07 — Enforce financial, stock and batch invariants

1. Connect mobile fee collection/challan actions to existing scoped payment services and exact-money transaction rules. Render real records and server receipts; route family users through their own fee endpoints. Duplicate submission must not charge twice.
2. Separate purchase-order issuance from audited receipt. Issue must not increase available stock. Support only receipt/partial receipt/cancellation behavior already approved; otherwise disable the unsupported transition while retaining correct state.
3. Use conditional stock changes/locks and transactional status transitions to prevent negative balances and duplicate fulfillment. Define durable retry identities. Validate source/destination scope and status before applying any effects.
4. Enforce one active batch per city at the database/transaction boundary for create and reactivate, including legacy nullable city rows. Plan conflict detection and data-preserving reconciliation before adding uniqueness. Return controlled conflicts rather than unhandled constraint errors.

**Exit:** disposable PostgreSQL concurrency tests: two transfers of four from five units cannot both succeed; fulfillment/receipt retry changes stock once; order issue changes stock zero times; two active-batch creates/reactivations leave exactly one active batch. Test exact amounts, payment/audit failure rollback, duplicate clicks, reload, receipt/balance reconciliation, and invalid transition denial. Do not rewrite real ledgers or existing batch rows during local remediation.

### P08 — Repair imports and certificates end to end

1. Parse the actual uploaded file; validate a bounded canonical manifest before execution. Use authorized destination scope, stable source identity and explicit duplicate/sibling handling. Never deduplicate people solely by a shared guardian phone.
2. Define atomic execution for small batches or durable checkpoints/idempotency for larger imports. Dry-run, committed, rejected and failed counts must reconcile to stored records. Reuse the existing admissions/calling import foundation and report unsupported stages accurately. Remove fake attendance-import counts and fake full-pipeline success.
3. Use actual participant IDs for certificate actions. Distinguish document generation/preview from persisted issuance. Wire UI methods to supported APIs. If verified issuance is approved, implement scoped issuance, serial lookup and a real share/verification route with a minimal public response; otherwise remove verified/issued claims and unavailable actions.

**Exit:** synthetic workbook tests include same-phone siblings, repeat import, malformed rows, foreign-city rows, interrupted execution and resumed retries. Browser preview/execute counts match persisted results after reload. Certificate actions use real result IDs/URLs; missing or revoked certificates are not shown as verified. No source registration data is returned as an error fallback.

### P09 — Make unfinished workflows safe and truthful

1. For guardian consents/emergency/leave actions, first remove sample-family leakage and invented medical defaults. Enforce verified guardian-child links on any supported reads. Explicitly disable writes whose safety models/rules are not approved; unknown medical data remains unknown.
2. Remove cross-account Islah note access and process-local operational storage. Use approved owner visibility/persistence if already specified; otherwise make the action unavailable. Do not invent a sensitive-note retention policy.
3. Community post/poll operations must either persist under approved audience/moderation rules or be unavailable on both client and server. Never return a constructed success object as evidence of persistence.
4. Replace fabricated custom-report files with scoped outputs built on real report services where supported. Disable unsupported report formats/settings/admin mutations. Remove or accurately rename metadata downloads so they cannot be mistaken for restorable database backups. Do not build a browser-accessible database dump as a shortcut.

**Exit:** unrelated students/guardians cannot read or mutate each other's data. Approved persisted writes survive reload and process restart; unavailable operations do not acknowledge a save. Export contents match controlled records. Any claimed backup has an authorized restore procedure and demonstrated restore evidence. List every gated feature and the exact rule needed to enable it.

### P10 — Correct profiles and analytics

1. Resolve student self identity from an authorized self endpoint for Extended view while preserving the fixed Overview and selected-participant behavior. Paginate and filter participant selectors on the server. Use effective capabilities for edit/sensitive controls.
2. Submit intentional changed fields. Define consistent omitted/null/empty clearing semantics across client, schema and storage. Wrap profile update and audit together; use appropriate concurrency checks so failure cannot leave an unaudited change.
3. Compute attendance rates using eligible attendance opportunities across the selected sessions/dates, following documented attendance policy. Include real late/excused/staff metrics, scope, join/dropout dates and honest empty states. Do not clamp a faulty 200% result to hide a wrong denominator.

**Exit:** student Extended view loads; a permitted staff user selects beyond the first 100 records; guardian linked-child access works only where exposed/approved; sparse profile edits and field clearing succeed; denied edits and audit failures leave no changes. Multiple sessions produce correct rates with independent expected values, and each park/group sees only its own aggregates.

### P11 — Verify and assemble the review candidate

1. Repair the three current suite failures according to approved behavior: missing-scope dashboard denial plus own-city success, and profile-detail authorization mocks/denial coverage matching the actual capability contract. Do not change a denied expectation to 500 or accept every role for convenience.
2. Convert each implemented finding into focused desired-behavior regression tests in the normal suite. The audit's old characterization tests should fail for repaired behavior; retain them as historical evidence and explain supersession in the ledger. Do not advertise the old 33-pass result as fix verification.
3. Run relevant tests while iterating. At the candidate state run lint, typecheck and the full suite, then both SQLite and PostgreSQL production builds in isolated verification environments. Validate both schemas. Generate each provider client through Prisma; never hand-edit it or overwrite another running task's generated state.
4. Run actual role-based browser checks across the live PWA entry path, especially reset, profiles, attendance, payment, imports and denied states. Run database-backed migration/concurrency/restart checks for the packages that require them. Helper tests and HTTP 200 responses do not replace these checks.
5. Repeat the clean client-bundle inspection for A00. Include exact commands, commit/diff identity, test counts, provider and sanitized configuration assumptions. Record failed/unrun checks separately from passed checks.
6. Update concise memory only for verified durable facts; keep the complete remediation history and evidence in this audit folder. Do not edit the historical audit to imply the initial findings never existed.

**Exit:** all A00–A30 entries have an explicit disposition and evidence, package diffs are reviewable, no unreported failure remains, and Terra produces the handoff below. A candidate may be ready for Astra review with documented blockers; it is not release-ready until the required evidence and approvals exist.

## 4. Product decisions and external dependencies

These are local dependencies, not reasons to pause every package:

| Topic | Proceed now | What must remain explicit |
| --- | --- | --- |
| Guardian safety/community rules | Remove leaks, fake success and unsafe defaults; gate unsupported actions | Consent lifecycle, medical editing, moderation, visibility and retention need approved rules before enabling new workflows |
| Stock receipt lifecycle | Stop issuance from adding stock; prevent negative/duplicate changes | Implement only approved partial receipt/cancellation/fulfillment transitions; otherwise gate the missing transition |
| Certificate semantics | Remove sample verified data and invalid method calls | Decide issued/revocable credentials versus generated documents before inventing verification behavior |
| Offline conflict resolution | Preserve mutations; detect and expose conflicts; prohibit silent stale overwrite | Automatic conflict winner policy needs documented authority; human resolution must itself be authorized |
| Dashboard scope | Deny missing/foreign scope; use actual authorized records | Preserve documented City Head access; seek a narrow decision only if existing approved sources conflict |
| Infrastructure | Prepare local code and synthetic tests | PostgreSQL replay, both builds, browser UAT and distributed throttling require usable isolated/configured infrastructure |

If a missing decision blocks a feature, state the exact rule and proposed safe behavior, continue other authorized work, and keep the item unresolved. Never claim feature completion merely because its button is hidden.

## 5. Terra's required handoff artifacts

Create `IMPLEMENTATION_STATUS.md` in this folder and maintain it during implementation. Start each finding as `OPEN`. Allowed dispositions: `FIXED / VERIFIED`, `IMPLEMENTED / VERIFICATION BLOCKED`, `MITIGATED / DECISION REQUIRED`, `OPEN`, or `NO LONGER REPRODUCIBLE` with fresh evidence. None implies Astra approval.

For **every A00–A30**, record:

- Package and disposition; user-visible behavior after the change.
- Base/candidate commit or diff identity and exact changed paths.
- Root cause and fix; any related callers examined.
- Normal-suite regression test paths and exact verification outcomes.
- Data/security impact, migration prerequisites and rollback/forward-recovery steps.
- Remaining limitations, disabled actions, decisions or environment dependencies.

Add a compact final candidate summary with exact lint/typecheck/test/build results, database/browser verification performed, all unresolved findings, and the changed-file/commit manifest. Do not include private records. State **“Ready for GPT-6 Astra review”**, not “approved for release.”

## 6. GPT-6 Astra independent review gate

After Terra completes its candidate, return this task to **GPT-6 Astra** and request review using the prompt below. Preparing this plan does not start Terra or automatically schedule Astra. The reviewer must use fresh tools and inspect the actual final tree, not simply accept Terra's status document.

Review steps:

1. Establish the original baseline, latest candidate and unrelated changes. Read the audit, this plan and Terra's ledger. Verify every A00–A30 disposition against actual code.
2. Review the complete diff and neighboring callers, concentrating on authorization side effects, private field projections, transaction boundaries, schema constraints and migration compatibility. Look for new regressions introduced by shared-helper changes.
3. Independently reproduce P01's protections, negative scope/role/reset cases, HTML escaping, attendance replay rules, stock/batch concurrency and missing-migration closure. Use real disposable PostgreSQL for database/concurrency claims.
4. Run proportionate independent tests and inspect final build/bundle and browser evidence. Rerun checks when evidence is missing, stale, ambiguous or contradicted. Do not mistake mocks, static schema checks or a reported deployment for end-to-end proof.
5. Check that current UI improvements were preserved and that no important operation still returns false success. Inspect unavailable-feature server behavior, not only navigation.
6. Produce `ASTRA_REVIEW.md` with severity-ranked actionable findings, exact file/line references, failed acceptance criteria, and a per-audit-item verdict. Distinguish confirmed defects, verification gaps and accepted product deferrals.
7. Return corrections to Terra when needed, then re-review the actual amended candidate. Astra should identify review findings rather than silently becoming the implementer during the initial review.

Possible review outcomes: **CHANGES REQUIRED**, **VERIFICATION BLOCKED**, or **APPROVED FOR THE REVIEWED SCOPE**. Approval must list unresolved/gated features and does not authorize live deployment or migration. Any unresolved critical/high-risk issue or missing mandatory acceptance evidence prevents release clearance.

## 7. Copy-ready task prompts

### Start implementation with GPT-5.6 Terra

> Implement the v2 audit remediation plan in `docs/reviews/v2-audit-2026-09-08/TERRA_IMPLEMENTATION_PLAN.md`. Read the entire plan and audit before editing. Follow AGENTS.md, the master blueprint and both Shabab skills. Preserve the current uncommitted audit evidence and unrelated work. Start with P01, then execute the ready packages in dependency order through tests and evidence. Track all A00–A30 in IMPLEMENTATION_STATUS.md. Do not treat passing defect-characterization tests as fix verification. Safely gate genuinely unapproved workflows, explicitly report their unfinished status, and continue independent work. Do not deploy, merge to main, migrate a live database or change real accounts. Finish with a reviewable candidate and exact verification results for GPT-6 Astra; do not claim independent review or release approval.

### Review the completed candidate with GPT-6 Astra

> Independently review Terra's v2 remediation against AUDIT.md, TERRA_IMPLEMENTATION_PLAN.md and IMPLEMENTATION_STATUS.md in `docs/reviews/v2-audit-2026-09-08/`. Inspect the actual candidate diff and fresh code; do not trust completion claims without evidence. Check all A00–A30, preserve unrelated work, verify high-risk fixes with appropriate route/browser/database checks, and look for introduced regressions. Write ASTRA_REVIEW.md with severity-ranked findings, precise code references, per-item verdicts, evidence limits and one explicit review outcome. Return required corrections for Terra to implement. Do not deploy or silently fix review findings during the initial review.
