# Shabab 360 Codex Build Tasks

**Status:** Active execution queue

**Last updated:** 2026-07-16

**Current branch:** `codex/production-hardening`

**Current release decision:** Not approved for public production or handover

**Next executable task:** `SEC-OWN-001` owner confirmations; no dependent coding
task is `READY` until its product/provider decision is recorded

## 1. Purpose And Authority

This file converts the approved working documents into small, reviewable build
tasks. It is the execution queue for actual engineering work.

It must be used with:

- [Codex Master Blueprint](CODEX_SHABAB360_MASTER_BLUEPRINT.md)
- [Module Catalogue](MODULE_CATALOG.md)
- [Role-Based Access Matrix](ROLE_BASED_ACCESS_MATRIX.md)
- [Production Hardening Backlog](TASK_BACKLOG.md)
- [PostgreSQL Migration Design](MIGRATION_DESIGN.md)

When documents conflict, the Codex Master Blueprint governs product and
technical direction. This task file governs execution order. The older
Production Hardening Backlog remains evidence for completed and unfinished
hardening work.

## 2. Status And Priority Labels

### Task status

| Status | Meaning |
| --- | --- |
| `NEXT` | The single next task to execute |
| `READY` | Requirements and dependencies are sufficient to start |
| `IN_PROGRESS` | One assigned owner is actively working on it |
| `REVIEW` | Implementation is complete and awaiting Codex review |
| `BLOCKED_OWNER` | Requires a project-owner action or provider access |
| `BLOCKED_DECISION` | Requires an approved product/policy decision |
| `PENDING` | Sequenced but dependencies are incomplete |
| `DONE` | Implemented, verified, documented, and approved by Codex |
| `DEFERRED` | Explicitly postponed to a later phase |

### Priority

| Priority | Meaning |
| --- | --- |
| `P0` | Security, data integrity, safety, runtime, or release blocker |
| `P1` | Required core programme operation |
| `P2` | Important operational expansion |
| `P3` | Optional enhancement after pilot stability |

## 3. Mandatory Execution Rules

1. Only one task may modify a given file/domain at a time.
2. Every task has one owner and a narrow scope.
3. No agent pushes directly to `main` or handles production secrets.
4. Re-read every target file before editing; stop if overlapping changes appear.
5. Product expansion does not begin before the existing application is correct
   and PostgreSQL Staging is verified.
6. A schema task must update both the active SQLite development schema and the
   staged PostgreSQL schema until runtime cutover is complete.
7. Schema work requires a forward migration, import/reconciliation impact,
   rollback/recovery note, and tests.
8. Sensitive youth, medical, incident, guardian, financial, and credential data
   must follow minimum-necessary access and retention rules.
9. Every authorisation task tests both allowed and denied roles/scopes.
10. Every task ends with lint, typecheck, relevant tests, and applicable builds.
11. Codex reviews all agent work and alone marks implementation tasks `DONE`.
12. No completion claim is accepted without exact evidence.

## 4. Required Handoff Format

Every implementation handoff must include:

1. Task ID and one-sentence outcome.
2. Exact files inspected and changed.
3. Behaviour implemented and intentionally excluded.
4. Role/scope and personal-data impact.
5. Schema, migration, and rollback impact.
6. Tests and verification commands with results.
7. Remaining risks, dependencies, and follow-up work.
8. The statement: `Ready for Codex review.`

## 5. Preserved Completed Foundation

These items are already implemented and must not be rebuilt or regressed.

| ID | Status | Preserved outcome |
| --- | --- | --- |
| `BASE-AUTH-001` | `DONE` | Central deny-by-default role and hierarchy authorisation helper |
| `BASE-AUTH-002` | `DONE` | Covered cross-city, cross-park, cross-group, student, Guardian, search and attendance denial tests |
| `BASE-AUTH-003` | `DONE` | Atomic session invalidation through `tokenVersion` on relevant access changes |
| `BASE-AUTH-004` | `DONE` | Forced-reset and ordinary password-change separation with 12-128 character policy |
| `BASE-ATT-001` | `DONE` | Server-safe attendance alerts with scope and absence-streak validation |
| `BASE-PAY-001` | `DONE` | Exact-money helpers and transactional payment integrity protections |
| `BASE-RT-001` | `DONE` | Unauthenticated Socket.IO service removed; authenticated polling retained |
| `BASE-NAV-001` | `DONE` | Bounded navigation history and regression tests |
| `BASE-API-001` | `DONE` | Shared pagination/search/date validation on major list routes |
| `BASE-AUD-001` | `DONE` | Redacted audit writes, restricted reads and audit-failure visibility |
| `BASE-SEC-001` | `DONE` | CSP, security headers, noindex and same-origin mutation protection |
| `BASE-CI-001` | `DONE` | CI checks for install, Prisma, lint, typecheck, tests, build, audit and sensitive files |
| `BASE-DATA-001` | `DONE` | Versioned PostgreSQL baseline, importer, reconciliation and Postgres build path |
| `BASE-TEST-001` | `DONE` | Fresh 2026-07-15 result: 94 tests passed in 28 files |

## 6. Start Here: Immediate Build Queue

Execute these tasks in order. Only tasks explicitly marked `READY` may start in
parallel, and only after their dependencies are complete.

| Order | Task | Priority | Status | Suggested owner | Depends on | Outcome |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `BLD-001` | P0 | `DONE` | Codex | None | Restore a clean, reproducible quality baseline |
| 2 | `ADM-FIX-001` | P0 | `DONE` | Codex | `BLD-001` | Persist the four admission fields currently discarded |
| 3 | `NTF-SEC-001` | P0 | `DONE` | Codex | `BLD-001` | Remove reset URLs and secret-like data from notification persistence |
| 4 | `SEC-OWN-001` | P0 | `BLOCKED_OWNER` | Project owner + Codex review | None | Confirm secret rotation, history decision and provider ownership |
| 5 | `INV-001` | P0 | `DONE` | Codex | `ADM-FIX-001` | One-time administrator handoff with forced password reset |
| 6 | `RATE-001` | P0 | `BLOCKED_DECISION` | Codex design | Free-tier strategy decision | Replace in-memory login limiting for multi-instance runtime |
| 7 | `API-001` | P1 | `DONE` | Codex | `BLD-001` | Bounded validation, safe error responses and route tests completed across remaining list/search APIs |
| 8 | `UAT-001` | P0 | `PENDING` | Codex + project owner | Tasks 1-7 | Run current-role browser and denial UAT |
| 9 | `UAT-002` | P0 | `PENDING` | Codex + project owner | `UAT-001` | Run mobile/offline attendance UAT |
| 10 | `FIX-001` | P0/P1 | `PENDING` | Assigned per defect | `UAT-001`, `UAT-002` | Fix only confirmed current-application defects |
| 11 | `BASE-APPROVAL-001` | P0 | `PENDING` | Codex | All above | Approve existing-system correctness gate |

### `BLD-001`: Clean Reproducible Verification Baseline

**Goal:** Establish a trustworthy baseline before changing application
behaviour.

**Scope:**

- Stop or isolate any development process writing generated `.next` types.
- Regenerate build/type artefacts safely.
- Investigate the malformed `.next/dev/types/routes.d.ts` result without
  treating generated output as source code.
- Run the complete local verification sequence.
- Record exact versions, results and any true source failures.

**Required evidence:**

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run build:postgres`
- `npm audit --omit=dev --audit-level=high`
- Confirmation that generated Postgres-client work is followed by restoring the
  local SQLite client when local development continues on SQLite.

**Acceptance criteria:**

- Every command passes, or a source defect is isolated into a new task with
  file-level evidence.
- No source file is changed merely to suppress a check.
- Test counts and generated route counts are recorded.
- Local application start remains possible after verification.

**Completion evidence (2026-07-15):**

- Verification runtime: Node.js `v26.5.0`, npm `12.0.0`, Next.js `16.2.10`
  and Prisma Client `6.19.3`.
- The active development writer was stopped, the workspace-local `.next`
  directory was removed, and the SQLite Prisma client was regenerated. The
  earlier malformed `.next/dev/types/routes.d.ts` result was confirmed as
  generated-state interference rather than a source-code defect.
- `npm run lint` passed, `npm run typecheck` passed, and `npm test` passed 94
  tests in 28 files.
- SQLite and PostgreSQL production builds passed. Each completed `61/61`
  static-page generation and listed the same 86 application routes.
- `npm audit --omit=dev --audit-level=high` exited successfully with no high or
  critical findings. Ten moderate transitive findings remain documented; the
  proposed `--force` remediations are breaking dependency changes and were not
  applied without a dedicated compatibility task.
- The local SQLite Prisma client was restored after the PostgreSQL build, and
  the restarted application returned `HTTP 200` on `http://localhost:3000`.
- No source file or application behaviour was changed to obtain these results.

**Rollback:** Generated build/type artefacts may be recreated; no application
data or source behaviour changes are allowed.

### `ADM-FIX-001`: Persist Existing Admission Form Fields

**Goal:** Stop the confirmed silent loss of fields that the current UI already
collects.

**Exact approved scope:**

- `emergencyContact`
- `emergencyPhone`
- `previousEducation`
- `reference`

Do not add medical, consent, safeguarding, eligibility, rubric, or document
fields in this task. Those require approved product design.

**Implementation requirements:**

- Add nullable, appropriately bounded fields to the active SQLite and staged
  PostgreSQL Prisma models.
- Add a versioned additive PostgreSQL migration.
- Define the safe local SQLite development migration/update procedure.
- Update create and relevant update/detail API validation and persistence.
- Normalise blank optional values consistently.
- Confirm the admin UI sends and displays the persisted values.
- Review admission conversion so no value is silently misrepresented as part of
  a Participant or Guardian record.
- Add tests proving valid persistence, optional omission, maximum lengths and
  rejection of malformed values.
- Update migration import/reconciliation manifests if the schema inventory
  requires it.

**Acceptance criteria:**

- Submit, read, edit and reload preserve all four fields.
- Existing admission records remain valid with null values.
- Both Prisma schemas validate and generate.
- SQLite and PostgreSQL builds pass.
- No unrelated admissions workflow or status redesign is included.

**Completion evidence (2026-07-15):**

- Added nullable fields to the active SQLite model and bounded PostgreSQL
  columns (`120/30/200/120` characters), plus additive migration
  `20260715123000_add_admission_application_details`.
- Created a current-Windows-user encrypted SQLite rollback backup outside Git,
  applied the additive local schema with `db:push`, and regenerated the SQLite
  client without resetting or dropping data.
- Create and PATCH routes trim values, convert blanks to `null`, preserve
  omitted fields, reject all four maximum-length violations, and reject a
  malformed short emergency phone.
- The admin create form now uses the shared limits. Admission detail displays
  all four values and provides a focused edit dialog. The conversion paths were
  reviewed and continue to map only existing participant/guardian fields; the
  four admission-only values remain on the source application.
- SQLite-to-PostgreSQL reconciliation now fingerprints all four fields.
- Focused verification passed 17 tests. Full verification passed lint,
  typecheck, both Prisma schema validations, 107 tests in 30 files, and SQLite
  and PostgreSQL production builds with `61/61` static-page generation.
- An authenticated localhost smoke test passed create, detail read, edit,
  detail re-read, and fresh-session list reload with exact values. The uniquely
  identified smoke application and its two audit rows were then removed.
- The SQLite Prisma client was restored and the local application remains live
  on `http://localhost:3000`.

**Rollback:** The migration is additive. Application rollback must tolerate the
new nullable columns; do not drop populated columns during rollback.

### `NTF-SEC-001`: Notification Data Minimisation

**Goal:** Ensure the notification outbox never persists credentials, reset
URLs, tokens, token hashes or unnecessary personal data.

**Scope:**

- Review every `sendEmail` call and notification `data` payload.
- Remove `resetUrl` persistence from password-reset notification data.
- Add a central allow-list or redaction boundary for notification metadata.
- Keep password-change confirmations free of password/reset information.
- Add regression tests for password reset, password change and invitation
  notification records.
- Define treatment of historical local notification rows before the next
  PostgreSQL import.

**Acceptance criteria:**

- Tests fail if secret-like fields are queued.
- The outbox contains only delivery and minimum business metadata.
- No delivery-provider implementation is mixed into this task.

**Implementation evidence (2026-07-15):**

- Every outbox write passes through `sendEmail`; no direct notification create
  path bypasses the central boundary.
- Channel-specific strict metadata schemas reject unknown fields before a
  database write. Password reset/change store no metadata, invitations store
  only role, absence alerts retain bounded operational fields without names or
  event titles, and fee reminders do not duplicate financial metadata.
- Sensitive-channel bodies reject URLs, secret-bearing URLs, credential
  assignments, temporary-password/token terms, and token/password hashes.
  `sendPasswordReset` no longer accepts or stores a reset URL, and invitation
  notifications never receive the generated temporary password.
- Notification logs contain only channel and notification ID; recipient email,
  subject and body are not logged by the queue helper.
- Seven focused privacy regressions cover reset, password change, invitation,
  absence, fee, unsafe metadata, URLs, credential assignments and token hashes.
  The complete suite passes with 113 tests in 30 files.
- Lint, typecheck, both Prisma schema validations, and SQLite/PostgreSQL
  production builds pass with 61/61 static pages. The local client was restored
  to SQLite after the PostgreSQL build.
- Authenticated localhost smoke verified a browser-created invitation and a
  forced password change. Persisted records had only the approved keys and no
  URL or credential assignment. Two uniquely tagged users, three notifications
  and two related audit rows were removed after verification.
- Historical notifications remain excluded by the executable SQLite-to-
  PostgreSQL migration manifest, and reconciliation requires an empty target
  notification table. The local source had zero notification rows before the
  smoke, so no local historical cleanup was required.
- No email provider, sender worker or retry implementation was added.

### `SEC-OWN-001`: Owner Security And Provider Decisions

**Owner-only actions:**

- Confirm rotation of every credential ever exposed through tracked `.env` or
  shared configuration.
- Confirm whether remote Git history will be rewritten.
- Confirm GitHub, Vercel, Supabase, domain and email-provider ownership.
- Confirm the pilot qualifies for the selected free hosting terms.
- Confirm who receives security, deployment and quota alerts.

**Evidence rule:** Record completion and dates only. Never place secret values
in Git, documentation, chat, tests or screenshots.

**Preliminary safe inventory (2026-07-16; owner action required):**

- Source references `NEXTAUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL` and the
  migration-only `SQLITE_DATABASE_URL`. No values were inspected or recorded.
- Name-only repository history and current tracked-file metadata indicate
  `.env`, `.build-env`, and environment-named build/screenshot artifacts.
  Treat every value that may have appeared in those artifacts as exposed until
  rotated or revoked. Existing ignore rules do not remove files already tracked.
- Before any history rewrite or file removal, the owner must rotate credentials,
  confirm the authoritative provider accounts, and choose whether collaborators
  will migrate to rewritten history. Codex will then implement only the
  approved cleanup and verify that no sensitive artifact remains tracked.

**Owner direction recorded (2026-07-16):**

- Rewrite repository history after credential rotation is explicitly confirmed.
- GitHub `main` history was rewritten and force-pushed on 2026-07-16 after an
  isolated-mirror rewrite removed tracked `.env`, `.build-env`, `db/custom.db`,
  root `upload/`, and unused root QA screenshots. The rewritten branch passed
  Git integrity and reachable-path checks before publication. Collaborators
  must re-clone or realign local clones; never merge the old history back.
- The database passwords for both `shabab360-staging` and
  `shabab360-pilot-prod` were rotated on 2026-07-16. The new values were not
  collected or recorded. Any application or deployment configuration using
  their previous connection strings must be replaced before it can connect.
- `NEXTAUTH_SECRET` and any non-database third-party credentials that may have
  appeared in historic configuration remain rotation/revocation work before
  this task can be closed.
- GitHub repository owner: `founder-kindigi`.
- Planned Supabase targets: `shabab360-staging` and `shabab360-pilot-prod`.
- Email provider, alert recipient and domain registrar remain undecided.
- Vercel team: `OUtheCS`. Vercel Hobby is selected for the restricted testing
  period. The existing project and its domain are owner-approved for deliberate
  replacement; its unrelated prior application may be discarded. Before the
  first deployment, Codex must inventory and replace stale environment
  variables, protect the domain configuration, and deploy a preview before
  promoting this checkout.

### `INV-001`: Secure Invitation Lifecycle

**Goal:** Replace indefinite administrator-transferred temporary credentials
with the owner-approved invitation model.

**Design decision before coding:** Choose whether the restricted pilot uses:

1. A one-time, hashed, expiring invitation token delivered through an approved
   provider; or
2. A documented administrator handoff of a cryptographic temporary password,
   shown once and forced to reset, with no email token flow.

**Approved pilot model (2026-07-15):** Option 2. The server generates a
cryptographic temporary password; it is returned only in the creation response,
shown once in the staff-management UI, and must be reset at first login. No
temporary credential is stored in an audit record, notification, or email.

**Completion evidence (2026-07-15):**

- All staff creation now uses `/api/admin/invite`, which validates role scope,
  creates the account transactionally, applies `mustResetPwd`, and returns the
  one-time credential response.
- The Users page no longer accepts an administrator-selected password and clears
  the generated credential when its one-time dialog is closed.
- The legacy `POST /api/admin/users` route now returns `410 Gone`, preventing
  direct-password account creation through a parallel API path.
- Guardian invitations already use the same cryptographic temporary-password
  and forced-reset model; their audit data is redacted by the shared audit
  policy.

**If token flow is approved, acceptance requires:**

- Hash-only token storage.
- Explicit expiry and single-use consumption.
- Atomic account activation/password setup and token invalidation.
- Rate limiting and generic error responses.
- No token, hash, password or reset URL in notification/audit data.
- Captured replay, expiry and cross-account negative tests.

### `RATE-001`: Free-Compatible Shared Rate Limiting

**Decision required:** Approve one multi-instance strategy after cost,
availability and personal-data review. Options may include a free managed Redis
allowance or a carefully bounded PostgreSQL-backed limiter. Do not add a new
provider without owner approval.

**Free-tier recommendation (research refreshed 2026-07-16; awaiting owner
approval):** Use Vercel Hobby WAF's single fixed-window IP rule for the login
route as the initial cross-instance control. It includes one rate-limit rule
per project and one million allowed requests, needs no additional provider, and
can be rolled back in the Vercel Firewall. Preserve the current per-email
in-memory limiter only as a local secondary guard; it is not shared state.
Record a monthly quota review and use a generic `429` response. If the pilot
needs shared application-level limits for multiple sensitive routes, approve
Upstash Redis separately; its free allowance is currently 500,000 commands per
month, so it must be monitored and must not receive raw emails, passwords or
unnecessary personal data.

**Decision sources:** [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting),
[Vercel WAF rollback](https://vercel.com/docs/vercel-firewall/vercel-waf), and
[Upstash Redis pricing](https://upstash.com/pricing/redis).

**Required coverage:** Login, password reset/invitation, public application
submission/status lookup, attendance sync abuse and other high-risk mutations.

### `API-001`: Complete API Boundary Normalisation

**Scope:**

- Inventory remaining list/search endpoints not using shared bounded parsing.
- Add maximum page size, identifier length, search length, date-range and sort
  allow-list validation as applicable.
- Standardise safe validation/error responses without exposing internal errors.
- Preserve all server-side role and scope filtering.
- Add route tests for malformed, oversized and out-of-scope requests.

**Completion evidence (2026-07-15):**

- Normalised remaining admin, reporting, announcement, notification, guardian,
  student, park and global-search query routes using the shared bounded helpers.
- Enforced page-size, offset, identifier, search, ISO date/date-range and sort
  allow-lists as appropriate, without changing existing role or resource-scope
  checks.
- Corrected the announcement search predicate so it cannot bypass expiry
  filtering, and removed its redundant second authentication lookup.
- Added route tests for malformed and oversized global search, denied
  non-staff search, invalid announcement filters and retained announcement
  expiry filtering.

### `UAT-001`: Existing Role And Data-Isolation UAT

Test current functionality with controlled role accounts:

- Super Admin technical paths.
- Program Head national paths.
- City Head assigned-city paths and cross-city denial.
- Park Lead and Park Admin assigned-park paths and cross-park denial.
- Murabbi assigned-group paths and unrelated-group denial.
- Guardian linked-child paths and unrelated-child denial.
- Shabab own-data paths and other-participant denial.
- Forced reset, account deactivation, role/scope reassignment and session
  invalidation.

Every defect receives a separate task. Do not redesign workflows during UAT.

**Formal UAT attempt (2026-07-15):** The local application entry point served
successfully from an isolated production server, but the in-app browser rejected
every tab with a browser-session mismatch and exposed no claimable tab for
recovery. No application data was created or changed. This failed attempt is
superseded by the later read-only browser evidence below; it does not close any
remaining UAT acceptance criteria.

**Read-only browser UAT (2026-07-16; not formal approval):** The local browser
runtime was restored and all eight controlled demo portals were opened through
their real login journeys without creating or changing programme records.

- Super Admin and Program Admin showed their expected broad technical and
  national navigation.
- City Head was limited to the assigned city view; Park Admin and Park Lead
  were limited to the assigned park view.
- Murabbi exposed group-focused navigation rather than administrative modules.
- Guardian exposed only the linked-child portal; Shabab exposed only the
  self-service attendance, schedule, profile and fee-status portal.
- Automated server-side scope tests remain the evidence for cross-city,
  cross-park, cross-group, unrelated-family and other-participant denials;
  direct browser API-denial checks are still unavailable in the local browser.
- **Forced-reset UAT (2026-07-16; partially complete):** a controlled staff
  account was correctly forced onto the reset screen. Completing that initial
  flow exposed a defect: token-version invalidation left an unusable session
  that the client showed as `Access Pending`. The correction now signs out
  after a successful reset and defensively clears sessions without an identity,
  preserving the invalidation of all prior sessions.
- The reset route's focused tests, full lint, typecheck and complete suite
  passed (131 tests in 38 files). A full PostgreSQL-oriented production build
  subsequently completed successfully; the SQLite Prisma client was restored
  immediately afterwards for local development.
- Post-fix live reset completion, deactivation, reassignment/session
  invalidation, direct browser API-denial checks and project-owner acceptance
  remain outstanding. The controlled browser connector became unavailable
  after its plugin update; no further account state was changed.

#### `FEE-FIX-001`: Correct Dashboard Fee Expectation `DONE`

**Confirmed defect:** The HQ dashboard added each active fee event once when
calculating its expected total, while payment collection is per active
participant. This produced an impossible `400%` collection rate in the local
Program Admin portal.

**Correction:** Expected fees now multiply each active fee event by active
participants across its batch's active groups. The local dashboard now reports
`Rs 60.0K` expected, `Rs 8.0K` collected and `13%` progress.

**Pre-UAT evidence (2026-07-15; not formal UAT approval):**

- Local demo login and navigation boundaries were observed for Super Admin,
  Program Admin, City Head, Park Admin, Park Lead, Murabbi, Guardian and
  Shabab. Each displayed the expected portal scope; Guardian and Shabab showed
  linked-child or self-only data respectively.
- Existing automated scope tests remain the server-side evidence for cross-city,
  cross-park, cross-group and unrelated-family denial. Direct API-denial
  browser checks remain outstanding because the local browser runtime blocks
  direct `/api` navigation.
- Forced reset, deactivation, reassignment/session invalidation, mobile/offline
  attendance and project-owner acceptance remain required before `UAT-001` or
  `UAT-002` can be approved.

#### `ACCESS-FIX-001`: Revoke Family And Shabab Sessions On Deactivation `DONE`

**Confirmed defect:** Deactivating a Guardian or Shabab record did not revoke
an already-issued linked user session. This affected single and batch actions.

**Correction:** Single deactivation now updates the linked record and increments
the user token version atomically. Batch deactivation uses the same transaction
boundary and revokes only newly deactivated linked users.

### `UAT-002`: Mobile And Offline Attendance UAT

Verify on a representative mobile browser:

- Roster load and authorised cache.
- Offline marking and latest-mutation behaviour.
- Queue depth and status visibility.
- Reconnect and successful sync.
- Failure retention and retry.
- Conflict/closed-event behaviour.
- Correction, reset, close and audit rules by role.
- Cross-group and cross-park denial.

#### `OFFLINE-FIX-001`: Preserve Offline Mutation Order And Single-Flight Sync `DONE`

**Confirmed defects:** Pending queue items were not explicitly processed in
chronological order, and the roster plus queue panel could mount separate sync
hooks and submit the same batch concurrently.

**Correction:** Queue retrieval now orders by `queuedAt`, and all hook instances
share one in-flight sync lock. The final offline state therefore reflects the
latest queued mark without duplicate batch submission.

#### `SYNC-UAT-TEST-001`: Verify Offline Sync API Outcomes `DONE`

**Coverage:** The sync API now has regression tests for malformed requests,
scope denial, closed events, and ordered same-participant mutations where the
latest status wins. These are server-side UAT evidence; representative-device
offline interaction remains required before closing `UAT-002`.

## 7. Product-Owner Decision Queue

These decisions may proceed in parallel with existing-system fixes. They block
their related feature tasks, not `BLD-001`, `ADM-FIX-001` or `NTF-SEC-001`.

| ID | Status | Decision required | Blocks |
| --- | --- | --- | --- |
| `DEC-PROG-001` | `BLOCKED_OWNER` | Official programme description, audience, cities, duration, weekly schedule, framework and standard/local activities | Public site, content, calendar, reporting |
| `DEC-ROLE-001` | `BLOCKED_OWNER` | Approve the target role-access matrix, multi-role model and context switching | Assignment model, navigation, role UAT expansion |
| `DEC-ADM-001` | `BLOCKED_OWNER` | Final admission fields, eligibility, campaign/referral data and required documents | Admissions redesign |
| `DEC-INT-001` | `BLOCKED_OWNER` | Candidate/Guardian rubrics, reviewers, scores, thresholds, hold/waitlist and final authority | Interview redesign |
| `DEC-GROUP-001` | `BLOCKED_OWNER` | Age/class grouping rules, capacity, overrides, transfers and Murabbi ratios | Grouping engine |
| `DEC-ATT-001` | `BLOCKED_OWNER` | Attendance types, statuses, authority, leave, warnings and correction rules | Session/attendance expansion |
| `DEC-CONTENT-001` | `BLOCKED_OWNER` | Four categories, Mind/Body/Soul relationship, outcomes, milestones and certificates | Content Planner |
| `DEC-SAFE-001` | `BLOCKED_OWNER` | Consent, medical, emergency, pickup, incident, clearance, risk and retention policy | Safeguarding implementation |
| `DEC-VENUE-001` | `BLOCKED_OWNER` | Venue types, primary/backup model, facilities, permissions, hazards and visibility | Venue/Event model |
| `DEC-FIN-001` | `BLOCKED_OWNER` | Registration/event charges, donations, expenses, methods, waivers, refunds and authority | Finance redesign |
| `DEC-PROC-001` | `BLOCKED_OWNER` | Inventory ownership, categories, POs, receiving, transfers, loss and audit | Procurement/Inventory |
| `DEC-PORTAL-001` | `BLOCKED_OWNER` | Final Guardian and Shabab actions and visibility | Family/participant portals |
| `DEC-COMM-001` | `BLOCKED_OWNER` | Announcement, notification, email and WhatsApp channels/authority/consent | Communications expansion |
| `DEC-COMMUNITY-001` | `BLOCKED_OWNER` | LetsVibeIt-inspired feature boundary and moderation | Community |
| `DEC-MSG-001` | `BLOCKED_OWNER` | Allowed conversations, adult/minor rules, oversight, reporting and retention | Messaging |
| `DEC-REPORT-001` | `BLOCKED_OWNER` | Final KPIs, reports, Excel formats and recipients | Reports expansion |

## 8. Phase 2: PostgreSQL Staging And Platform Tasks

These begin only after `BASE-APPROVAL-001` and all schema changes from the
immediate queue are integrated.

| ID | Priority | Status | Suggested owner | Depends on | Outcome |
| --- | --- | --- | --- | --- | --- |
| `DATA-101` | P0 | `PENDING` | Codex | `ADM-FIX-001`, `INV-001` if schema-changing | Update/review Postgres migrations and migration manifests |
| `DATA-102` | P0 | `PENDING` | Codex + owner | `DATA-101`, `SEC-OWN-001` | Rehearse import/reconciliation on empty Staging target |
| `DATA-103` | P0 | `PENDING` | Codex | `DATA-102` | Run application against PostgreSQL Staging |
| `STOR-101` | P0 | `BLOCKED_DECISION` | Codex design + owner | Safety/file policy | Define private bucket, object ownership and signed-access policy |
| `STOR-102` | P0 | `PENDING` | Codex | `STOR-101` | Implement private file service and access tests |
| `EMAIL-101` | P0 | `BLOCKED_OWNER` | Owner + Codex | Sender/domain/provider approval | Configure approved sender and environment secrets |
| `EMAIL-102` | P0 | `PENDING` | Codex | `EMAIL-101`, `NTF-SEC-001` | Implement outbox sender, retries and provider reconciliation |
| `OPS-101` | P0 | `BLOCKED_OWNER` | Owner + Codex | Provider access | Separate Development, Preview/Staging and Pilot Production variables |
| `OPS-102` | P0 | `PENDING` | Owner + Codex | `DATA-102` | Produce encrypted backup and non-destructive restore evidence |
| `OPS-103` | P0 | `PENDING` | Codex | `OPS-101`, `DATA-103` | Deploy Vercel Preview against sanitised Staging |
| `OPS-104` | P0 | `PENDING` | Codex + owner | `OPS-103` | Configure logs, health check, quota review, alerts and rollback procedure |
| `STG-UAT-001` | P0 | `PENDING` | Codex + owner | Phase 2 tasks | Complete Staging role, storage, email, pool, offline and report UAT |
| `PLATFORM-APPROVAL-001` | P0 | `PENDING` | Codex | `STG-UAT-001` | Approve PostgreSQL/platform readiness gate |

### Phase 2 acceptance gate

- Staging uses PostgreSQL, not SQLite.
- Import and reconciliation pass after all approved migrations.
- Existing login hashes and Unicode content work.
- Transaction pooling and migration connections use the correct modes.
- Private files cannot be accessed across scope or without authorised expiry.
- Notification provider success/failure is observable and contains no secrets.
- Encrypted backup and independent restore succeed.
- Preview never receives production credentials or runs migrations.
- Complete role and mobile/offline tests pass on Staging.

## 9. Phase 3: Core Programme Model Tasks

These tasks require their matching owner decisions and
`PLATFORM-APPROVAL-001`. Design and migration tasks precede implementation.

| ID | Priority | Status | Depends on | Outcome |
| --- | --- | --- | --- | --- |
| `ORG-201` | P1 | `BLOCKED_DECISION` | `DEC-ROLE-001` | Design multi-role, multi-scope, team/title and assignment-history model |
| `ORG-202` | P1 | `PENDING` | `ORG-201` | Implement assignments, context, authorisation and migration |
| `MEM-201` | P1 | `PENDING` | `ORG-202` | Consolidate members directory and privacy-safe profiles |
| `SAFE-201` | P0/P1 | `BLOCKED_DECISION` | `DEC-SAFE-001` | Approve safeguarding data classification, access and retention design |
| `SAFE-202` | P0/P1 | `PENDING` | `SAFE-201`, `ORG-202` | Implement Guardian/emergency/consent/medical foundations |
| `SAFE-203` | P1 | `PENDING` | `SAFE-202` | Implement risk, incident and approved clearance workflows |
| `ADM-201` | P1 | `BLOCKED_DECISION` | `DEC-ADM-001`, `DEC-INT-001`, `SAFE-201` | Design complete admissions and interview state model |
| `ADM-202` | P1 | `PENDING` | `ADM-201` | Implement application, screening, candidate/Guardian interviews and decisions |
| `ADM-203` | P1 | `PENDING` | `ADM-202`, `GROUP-202` | Implement atomic placement, enrolment and account handoff |
| `GROUP-201` | P1 | `BLOCKED_DECISION` | `DEC-GROUP-001`, `ORG-201` | Design grouping rules, capacity and transfer history |
| `GROUP-202` | P1 | `PENDING` | `GROUP-201` | Implement suggestions, overrides, capacity and assignment history |
| `SESSION-201` | P1 | `BLOCKED_DECISION` | `DEC-ATT-001`, `DEC-VENUE-001` | Design session/activity/attendance target model |
| `SESSION-202` | P1 | `PENDING` | `SESSION-201` | Implement rich sessions without regressing offline attendance |
| `ATT-201` | P1 | `PENDING` | `SESSION-202` | Implement Shabab activity and subset attendance |
| `ATT-202` | P1 | `PENDING` | `SESSION-202`, `ORG-202` | Implement team, Mashwara and training attendance |
| `PORTAL-201` | P1 | `BLOCKED_DECISION` | `DEC-PORTAL-001`, `SAFE-202` | Implement approved Guardian and Shabab actions |
| `CORE-REPORT-201` | P1 | `PENDING` | Phase 3 modules | Add admissions, capacity, coverage, consent and attendance reports |
| `CORE-UAT-201` | P0/P1 | `PENDING` | All Phase 3 tasks | End-to-end admission-to-enrolment-to-session UAT |
| `CORE-APPROVAL-201` | P0/P1 | `PENDING` | `CORE-UAT-201` | Approve core programme model gate |

## 10. Phase 4: Programme Delivery Tasks

| ID | Priority | Status | Depends on | Outcome |
| --- | --- | --- | --- | --- |
| `CONTENT-301` | P1 | `BLOCKED_DECISION` | `DEC-CONTENT-001`, `CORE-APPROVAL-201` | Design categories, curriculum, versioning and delivery model |
| `CONTENT-302` | P1 | `PENDING` | `CONTENT-301` | Implement content authoring, review, publish and audience access |
| `CONTENT-303` | P1 | `PENDING` | `CONTENT-302` | Import/reconcile approved Google Sheets content |
| `MURABBI-301` | P1 | `PENDING` | `CONTENT-302`, `ORG-202` | Implement Murabbi training and delivery workspace |
| `VENUE-301` | P1 | `BLOCKED_DECISION` | `DEC-VENUE-001` | Implement approved primary/backup venue model |
| `CAL-301` | P1 | `PENDING` | `SESSION-202`, `CONTENT-302` | Implement forward calendar, recurrence and batch planner |
| `EVENT-301` | P1 | `PENDING` | `CAL-301`, `VENUE-301`, `SAFE-203` | Implement activities/events, consent, capacity and attendance links |
| `PLAN-301` | P1 | `PENDING` | `EVENT-301` | Implement responsibility tasks, owners, deadlines and evidence |
| `DELIVERY-REPORT-301` | P1 | `PENDING` | Phase 4 modules | Report plan versus delivery, participation and responsibility completion |
| `DELIVERY-UAT-301` | P1 | `PENDING` | Phase 4 modules | Run complete batch-planning and delivery UAT |

## 11. Phase 5: Finance And Logistics Tasks

| ID | Priority | Status | Depends on | Outcome |
| --- | --- | --- | --- | --- |
| `FIN-401` | P1/P2 | `BLOCKED_DECISION` | `DEC-FIN-001` | Design charges, donations, expenses, approvals and accounting boundaries |
| `FIN-402` | P1/P2 | `PENDING` | `FIN-401`, `EVENT-301` | Extend exact-money schema and services |
| `FIN-403` | P2 | `PENDING` | `FIN-402` | Implement scoped finance UI, receipts and reconciliation reports |
| `PROC-401` | P2 | `BLOCKED_DECISION` | `DEC-PROC-001` | Design procurement, inventory ownership and stock transaction model |
| `PROC-402` | P2 | `PENDING` | `PROC-401`, `ORG-202` | Implement catalogue, requests, approvals and purchase orders |
| `INVTRY-401` | P2 | `PENDING` | `PROC-402` | Implement receiving, park stock, transfer, return, loss and counts |
| `FIN-PROC-REPORT-401` | P2 | `PENDING` | Phase 5 modules | Reconcile finance and procurement reports without duplicate totals |
| `FIN-PROC-UAT-401` | P1/P2 | `PENDING` | Phase 5 modules | Run money, approval, concurrency, stock and audit UAT |

## 12. Phase 6: Engagement And Knowledge Tasks

| ID | Priority | Status | Depends on | Outcome |
| --- | --- | --- | --- | --- |
| `RESOURCE-501` | P2 | `PENDING` | `CONTENT-302` | Implement courses, books and articles with audience/publication rules |
| `PROFILE-501` | P2 | `PENDING` | `MEM-201` | Show safe groups, teams, roles and titles on profiles/posts |
| `COMMUNITY-501` | P2 | `BLOCKED_DECISION` | `DEC-COMMUNITY-001`, `SAFE-203` | Define exact community scope, moderation and privacy design |
| `COMMUNITY-502` | P2 | `PENDING` | `COMMUNITY-501` | Implement approved feed/group/community features |
| `MSG-501` | P2 | `BLOCKED_DECISION` | `DEC-MSG-001`, `SAFE-203` | Design monitored conversations, reporting and retention |
| `MSG-502` | P2 | `PENDING` | `MSG-501`, `STOR-102` | Implement approved messaging and secure attachments |
| `NOTIF-501` | P2 | `BLOCKED_DECISION` | `DEC-COMM-001`, `EMAIL-102` | Expand approved templates, preferences and channels |
| `ENGAGE-UAT-501` | P1/P2 | `PENDING` | Phase 6 modules | Run moderation, privacy, youth-safety and retention UAT |

Community and messaging remain deferred until their decision and safeguarding
gates are approved. Their presence in this queue is not permission to start.

## 13. Phase 7: Restricted Pilot And Handover Tasks

| ID | Priority | Status | Owner | Depends on | Outcome |
| --- | --- | --- | --- | --- | --- |
| `REL-601` | P0 | `BLOCKED_OWNER` | Owner + Codex | Approved module scope | Confirm pilot scope, users, data and support owner |
| `REL-602` | P0 | `PENDING` | Codex | All included phase gates | Freeze release candidate and run complete CI |
| `REL-603` | P0 | `PENDING` | Owner + Codex | `REL-602` | Create encrypted final backup and migration write freeze |
| `REL-604` | P0 | `PENDING` | Codex | `REL-603` | Apply approved migrations/import to empty Pilot Production |
| `REL-605` | P0 | `PENDING` | Codex | `REL-604` | Reconcile data and deploy restricted Vercel production candidate |
| `REL-606` | P0 | `PENDING` | Codex + owner | `REL-605` | Run production role, security, storage, email, report and offline smoke |
| `REL-607` | P0 | `PENDING` | Owner | `REL-606` | Approve restricted pilot opening |
| `REL-608` | P0 | `PENDING` | Owner + Codex | Pilot operation | Monitor, log incidents, review quotas and stabilise |
| `HANDOVER-601` | P0 | `BLOCKED_DECISION` | Owner + Codex | Stable pilot | Decide paid plans, ownership, SLA, backups and handover readiness |

## 14. Codex Review Checklist

Codex may approve a task only when all applicable checks pass:

- Scope matches the task and excludes unrelated refactors.
- Product-owner decisions are not invented.
- Unknown or out-of-scope roles/resources are denied.
- Sensitive fields have explicit field-level access and minimum retention.
- Inputs are bounded and errors do not expose internals.
- Money, inventory and high-impact state changes are transactional.
- Schema changes include migration, existing-data behaviour and recovery impact.
- Offline behaviour preserves queued work and handles conflicts visibly.
- Tests cover success, failure, scope denial and regression.
- Lint, typecheck, tests and required builds pass.
- Documentation and task status are updated.
- Rollback/recovery is realistic and does not risk live data.

## 15. Task Completion Log

Append one row only after Codex approval.

| Task ID | Completed date | Owner | Verification summary | Codex approval |
| --- | --- | --- | --- | --- |
| `BASE-TEST-001` | 2026-07-15 | Codex | 94 tests passed in 28 files | Approved baseline evidence |
| `BLD-001` | 2026-07-15 | Codex | Clean lint, typecheck, 94 tests, SQLite/PostgreSQL builds, high-severity audit and local HTTP verification passed | Approved |
| `ADM-FIX-001` | 2026-07-15 | Codex | Four fields persist through create/read/edit/reload; 107 tests, lint, typecheck, both schemas and both builds passed | Approved |
| `NTF-SEC-001` | 2026-07-15 | Codex | Strict metadata/content boundary; invitation and password-change live smoke; 113 tests, lint, typecheck, both schemas and both builds passed | Approved |
| `API-001` | 2026-07-15 | Codex | Remaining query endpoints normalised; 117 tests in 31 files, lint, typecheck and SQLite production build passed | Approved |
| `FEE-FIX-001` | 2026-07-15 | Codex | Program Admin fee expectation corrected from per-event to per-active-participant calculation; 2 regression tests, typecheck, lint and local dashboard confirmation passed | Approved |
| `ACCESS-FIX-001` | 2026-07-15 | Codex | Guardian and Shabab single/batch deactivation now invalidate linked sessions; 125 tests, typecheck, lint and whitespace check passed | Approved |
| `OFFLINE-FIX-001` | 2026-07-15 | Codex | Offline queue is chronological and single-flight across mounted hooks; 126 tests, typecheck, lint and whitespace check passed | Approved |
| `SYNC-UAT-TEST-001` | 2026-07-15 | Codex | Offline sync API failure, denial, closed-event and ordered-update behavior covered; 130 tests, typecheck, lint and whitespace check passed | Approved |
| `INV-001` | 2026-07-15 | Codex | All staff creation uses the generated, one-time temporary-password lifecycle; legacy direct creation is rejected; 131 tests in 38 files, typecheck, targeted lint, production build and whitespace check passed | Approved |

## 16. Local Browser Validation Gate

Visual browser automation was restored on 2026-07-15 and verified through a
real click-based Super Admin login and Admissions form journey on localhost.
All four `ADM-FIX-001` fields were uniquely visible, and the form was cancelled
without creating data. The machine-local runtime repair and update precautions
are recorded in [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md#local-codex-visual-browser-recovery).

## 17. Immediate Command

Complete the owner confirmations in `SEC-OWN-001` without recording secret
values. `INV-001` is approved and complete; `RATE-001` remains blocked on its
free-tier provider decision. API boundary normalisation, admissions persistence
and notification data minimisation are approved; UAT and new modules remain
gated until the existing-application correctness work is approved.
