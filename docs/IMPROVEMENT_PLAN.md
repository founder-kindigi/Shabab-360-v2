# Shabab360 v2 — Integrated Production Plan

> Status: FREE-TIER PILOT ONLY. Production deployment is blocked until every P0 release gate in this document is closed and independently verified. The Vercel Hobby plan is restricted to personal, non-commercial use, so an organizational/commercial handover requires a later plan upgrade before it can be called production.
>
> Scope: This is the single source of truth for bringing the current Next.js application safely to a free-tier Vercel pilot, then to a paid production handover when required. It combines the original Claude review preserved below with the independent Codex audit of the checked-out code.
>
> Preservation rule: No original Claude finding has been removed. The Original Claude Audit section remains below verbatim. The unified registry records how every original item is sequenced, while current-code evidence overrides an earlier conclusion when they conflict.

---

## 1. Executive Decision

Shabab360 is a feature-rich operations platform, but it is not a safe production deployment in its current state. The first delivery goal is not new functionality; it is a secure, reproducible, observable free-tier pilot baseline.

### Hosting and data decision

| Area | Decision | Why |
|---|---|---|
| Web application | Vercel Hobby on one owner account, for a controlled non-commercial pilot | Free hosting for the pilot; no team collaboration, spend controls, or commercial-use entitlement. |
| Primary database | Supabase Free PostgreSQL | Replaces the tracked SQLite file with managed Postgres and works with Prisma within the free 500 MB database allowance. |
| Database runtime connection | Supabase Supavisor transaction pooler | Vercel Functions are short-lived and need pooled connections. |
| Database migration connection | Direct PostgreSQL connection used only by a controlled CI migration job | Avoids running schema migrations from parallel Vercel builds. |
| File storage | Supabase Free Storage | Avatars and documents must not be written to the local filesystem or the public folder; the free allowance is capped at 1 GB. |
| Private files | Private Storage bucket plus short-lived signed URLs | Guardian and participant documents contain sensitive data. |
| Realtime | Do not deploy the current Socket.IO mini-service. Use polling initially; adopt an authenticated managed realtime design only after its security review. | The current service has no authentication, accepts arbitrary room membership and broadcasts, and is not production-safe. |
| Notifications | Resend Free plus an application outbox | The free allowance is limited to 100 emails per day; retries are limited to a daily reconciliation job on Vercel Hobby. |

Supabase is the recommended default because this project needs both Postgres and secure object storage. It lets us retain Prisma and NextAuth during the hardening phase; moving authentication providers is not required for the pilot. Supabase documents Prisma connectivity and recommends transaction pooling for serverless workloads, while Supabase Storage supports private buckets and signed access. Vercel documents environment separation and supports external Postgres through Marketplace integrations. References: [Supabase Prisma](https://supabase.com/docs/guides/database/prisma), [Supabase connection management](https://supabase.com/docs/guides/database/connection-management), [Supabase Storage](https://supabase.com/docs/guides/storage), [Vercel Postgres integrations](https://vercel.com/docs/postgres), [Vercel Hobby limits](https://vercel.com/docs/plans/hobby), [Supabase Free limits](https://supabase.com/pricing), [Resend Free limits](https://resend.com/docs/knowledge-base/what-is-resend-pricing).

Neon PostgreSQL plus Cloudflare R2 or Vercel Blob is the approved alternative only if isolated database branches for every preview deployment become a higher priority than keeping database and file storage under one provider. It must not be selected casually because it adds a second storage vendor.

### Free-tier operating model and hard limits

- The Vercel Hobby plan is for personal, non-commercial use only. It may be used for a controlled pilot/demonstration while the owner retains control; it must be upgraded before commercial or organization-owned production handover.
- Vercel Hobby has hard usage caps and no overage purchase. It provides one hour of runtime logs, no team collaboration, and functions can run for at most one minute. The owner reviews usage weekly.
- Supabase Free allows two active projects, 500 MB database storage per project, and 1 GB file storage. Free projects pause after one week of inactivity and have no automatic backups or point-in-time recovery.
- The two free Supabase projects are reserved for Staging and Pilot Production. Vercel Preview deployments use a sanitized shared Staging database; there is no free per-branch database isolation.
- Each developer/agent uses a local database for destructive or schema experiments. No preview branch may run migrations automatically.
- Before accepting real data, the owner takes an encrypted manual database export and verifies a restore procedure. A weekly manual export and size review are mandatory during the pilot.
- Vercel Hobby cron jobs can run only once per day and may execute within the scheduled hour. They cannot power urgent notifications, precise retries, or a real-time worker.
- Resend Free permits at most 100 emails per day. Invitation, reset, and attendance-alert volume must remain below that cap; beyond it, emails are queued for manual/daily reconciliation or the sender plan is upgraded.

### Upgrade triggers for handover

- The owner wants commercial, client, team, or organization use on Vercel.
- More than one Vercel collaborator needs deployment access or longer runtime log retention.
- Any Vercel Hobby function, CPU, data transfer, image, or analytics quota is approached.
- The system needs cron more than once daily, reliable minute-level timing, durable background jobs, or large-volume notification retry.
- Supabase database approaches 500 MB, Storage approaches 1 GB, the project cannot tolerate inactivity pauses, or automatic backups/PITR become required.
- The system needs isolated preview databases, more than two active cloud environments, or a tested production recovery SLA.
- Email volume approaches 100 messages per day or sender-domain/support requirements grow.

### Non-negotiable deployment constraints

- Never deploy the tracked SQLite database or use SQLite in a Vercel Function.
- Never commit .env files, database files, private keys, credentials, or generated uploads.
- Never run Prisma migrate deploy from every Vercel build. One controlled CI migration job runs it once, before the approved production application deployment.
- Keep production, preview, and development secrets separate. Preview must never point at production data.
- Do not expose database, Supabase service-role, email-provider, or realtime credentials to the browser.
- Do not deploy the existing Caddy configuration, local restart scripts, or unauthenticated mini-service to Vercel.
- Do not enable a public file bucket for guardian/participant documents.

---

## 2. P0 Pilot Release Gates

Every gate below must be implemented, reviewed, tested, and checked off before a pilot DNS cutover.

- [ ] P0-01: Treat the committed NEXTAUTH_SECRET and database configuration as potentially exposed. Rotate secrets, replace the default auth-secret fallback, remove .env and db/custom.db from Git, and obtain explicit approval before rewriting remote Git history.
- [ ] P0-02: Replace all fail-open authorization paths with a single server-side policy layer. Every protected route must explicitly deny unknown roles, unassigned staff, and out-of-scope records.
- [ ] P0-03: Immediately revoke sessions when a user is deactivated, their staff record is deactivated, their role changes, or their city/park/group assignment changes.
- [ ] P0-04: Fix runtime blockers: wire the Vercel-safe notification polling hook into the authenticated shell, repair the guardian invite/schema mismatch, and either implement or remove the UI paths that call missing upload APIs.
- [ ] P0-05: Remove the hard-coded shared invite password and plaintext temporary credentials/reset metadata from notification records, logs, and audit data.
- [ ] P0-06: Disable the current notification mini-service in the pilot. Replace it with an authenticated and authorized design before enabling realtime.
- [ ] P0-07: Fix attendance alert authorization, participant/event scope validation, server-side relative fetch failure, and incorrect consecutive-absence calculation.
- [ ] P0-08: Move from SQLite to a migration-managed PostgreSQL database. For the free pilot, establish encrypted manual backups and restore verification; upgrade before automatic backups/PITR are required.
- [ ] P0-09: Correct financial integrity: use integer minor units or Decimal, validate that a payment participant belongs to the fee event batch, and make receipt/payment writes transactional and concurrency-safe.
- [x] P0-10: Make type errors and lint failures block the build. Verified locally on 2026-07-14: build-error suppression is removed, React Strict Mode is enabled, full TypeScript validation, lint, tests, and `next build` pass.
- [ ] P0-11: Add a pilot release test gate: unit tests for policy and financial logic, end-to-end role tests, migration tests, and a staging smoke test.
- [ ] P0-12: Complete the Vercel Pilot setup with a custom domain, HTTPS, secure headers, noindex policy for the private application, environment separation, monitoring, quota review, and a tested rollback path.

Current implementation status: `P0-04` notification-shell wiring, guardian-invite schema correction, and removal of unsupported upload paths are implemented and locally verified on 2026-07-14. `P0-06` socket-service retirement is also implemented. `P0-10` is implemented and locally verified. The remaining P0 items stay open until their route, browser, migration, staging, and independent-review evidence is complete.

Verification status: `npm test` runs 92 deterministic Vitest tests in 28 files, covering policy guards, JWT invalidation, user-role and scope mutation transactions, cross-scope detail/search/attendance route denials, forced and ordinary password changes, password-change notification privacy, audit-data redaction and access control, audit-failure visibility without PII, invitations, attendance scope and streaks, payment validation/conflicts, fee aggregation, money, query parsing, password policy, navigation, and migration import safety. The staged Postgres schema validates; its reviewed baseline has been applied to Supabase Staging, and the SQLite import/reconciliation passed row counts, financial totals, fingerprints, foreign keys, and exclusion checks. The active application remains on SQLite until Decimal/runtime compatibility and database-neutral reporting are implemented and validated. `npm run lint`, full TypeScript validation, and `npm run build` pass with validation enabled. Local smoke verifies root availability, CSP delivery, authenticated session creation, and a protected-route response. GitHub Actions now runs locked npm installation, Prisma generation, lint, typecheck, unit tests, production build, a high-severity production dependency audit, and a tracked sensitive-file guard. Interactive end-to-end role tests, Postgres application smoke tests, backup/restore evidence, and branch protection configuration remain required release gates.

Security baseline update: global CSP and browser-security headers, private metadata, and a crawler-blocking `robots.txt` are implemented. The Next.js 16 request proxy rejects cross-origin application API mutations while preserving NextAuth's built-in CSRF handling. Local live verification on 2026-07-14 confirms `403` for a cross-origin mutation and normal `401` handling for the equivalent unauthenticated same-origin request. This is partial `P0-12` implementation; custom domain, HTTPS verification, monitoring, environment separation, and the rollback runbook remain open.

---

## 3. Confirmed Findings From The Current Checkout

| ID | Finding | Required outcome |
|---|---|---|
| C-SEC-01 | .env and db/custom.db are currently tracked despite ignore rules. | Remove, rotate, scan history, and establish a secrets/data policy. |
| C-SEC-02 | Batch and group detail routes can fall through scope checks without a final deny, allowing authenticated but unauthorized users to access or mutate records. | Centralize authorization and add role-matrix tests for every route. |
| C-SEC-03 | User deactivation and scope/role updates do not invalidate issued JWTs. | Increment tokenVersion or use an equivalent immediate session-revocation mechanism in the same transaction. |
| C-SEC-04 | The Socket.IO service accepts anonymous connections, arbitrary room joins, presence impersonation, and arbitrary notification POSTs. | Retire it from launch scope; reintroduce realtime only with authenticated server-issued claims and strict event authorization. |
| C-RUN-01 | AppShell calls useRealtimeNotifications without importing it. | Add the import and protect it with automated startup coverage. |
| C-RUN-02 | Guardian invitation writes a Prisma field absent from the schema. | Reconcile the product model and schema, add migration, and cover with an integration test. |
| C-RUN-03 | Avatar and document UI call API routes that are absent from this checkout. | Implement secured upload routes backed by Storage, or remove the controls until complete. |
| C-DATA-01 | SQLite has no versioned Prisma migrations in the repository and the local database file is tracked/copied by the current build. | Create a clean Postgres baseline with migrations and a controlled data import. |
| C-DATA-02 | Fee/payment logic uses Float and accepts a participant without confirming batch membership. | Make money exact and validate all payment relationships in one transaction. |
| C-DATA-03 | Audit entries can silently fail, contain PII/credentials, and some callers pass pre-serialized JSON. | Use structured, redacted audit events with monitored delivery and a retention policy. |
| C-OPS-01 | Production scripts point to a temporary z.ai filesystem path and use restart loops; Caddy is development-oriented. | Replace with Vercel-native build/deploy configuration; do not carry those scripts into production. |
| C-OPS-02 | An initial local Vitest suite and reproducible npm build commands now exist, but CI, route-level regression coverage, and deployment configuration remain incomplete. | Build reproducible CI and staging verification before release. |
| C-OPS-03 | Notification records are only queued; no sender/worker is implemented. | Add a transactional provider, retry/outbox behavior, delivery state, and monitoring. |
| C-OPS-04 | Security headers, consistent mutation-origin protection, request size limits, and a private crawler policy are missing. | Add platform and application security controls. |

---

## 4. Unified Registry: Every Claude Finding Preserved

The identifiers below refer to the Original Claude Audit retained later in this document. A disposition of Revalidated means it remains in scope. Corrected means the point was checked against source and its wording or priority changed without being discarded.

| Source ID | Unified disposition | Delivery phase |
|---|---|---|
| BUG-001 missing realtime import | Revalidated as C-RUN-01 and P0. | Phase 1 |
| BUG-002 one-level goBack history | Revalidated usability bug. | Phase 5 |
| HIGH-001 in-memory rate limiter | Revalidated; use a shared rate limiter for login and sensitive mutations. | Phase 2 |
| HIGH-002 avatar local/public storage | Corrected: the referenced backend route is absent in this checkout; secure Storage implementation is required. | Phase 3 |
| HIGH-003 JWT database query per request | Revalidated after correctness/security fixes; optimize only without weakening revocation. | Phase 4 |
| HIGH-004 fee summary full scans | Revalidated performance issue. | Phase 4 |
| MED-001 inconsistent API errors | Revalidated; add an API error/validation boundary. | Phase 2 |
| MED-002 SQLite write bottleneck | Superseded by mandatory Postgres migration. | Phase 3 |
| MED-003 unrestricted search input | Partially complete: global search and the primary admin lists reject oversized text, malformed pagination, and invalid date ranges. Apply the same shared contract to the remaining list endpoints. | Phase 2 |
| MED-004 inconsistent stale times | Partially complete: safe shared defaults now cover queries without an explicit freshness rule. Consolidate page-specific values and add DevTools only after dependency review. | Phase 4 |
| MED-005 any type overuse | Revalidated; restore strict typing and remove unsafe casts. | Phase 2 |
| MED-006 notification port mismatch | Corrected: the larger issue is unsafe realtime architecture and Vercel incompatibility of the current deployment assumptions. | Phase 3 |
| MED-007 anonymous JWT short-circuit | Corrected: the current callback already guards the database lookup with token.id. Keep a focused regression test rather than unnecessary code. | Phase 2 |
| MED-008 audit IP/user-agent | Revalidated, subject to privacy/retention policy. | Phase 4 |
| MED-009 plain-text email templates | Revalidated after actual email delivery exists. | Phase 5 |
| MED-010 missing indexes | Revalidated; add only after query plan review on Postgres. | Phase 3 |
| MED-011 hard-coded service-worker cache version | Revalidated. | Phase 4 |
| MED-012 unused participant address field | Revalidated product decision: explicitly support or remove it. | Phase 5 |
| ENH-001 Auth.js v5 upgrade | Deferred. Do not combine framework auth migration with production hardening. | Phase 6 |
| ENH-002 migrate SQLite to Postgres | Promoted to mandatory Phase 3 work. | Phase 3 |
| ENH-003 typed API responses | Revalidated. | Phase 5 |
| ENH-004 React Query DevTools | Revalidated development-only improvement. | Phase 5 |
| ENH-005 global QueryClient defaults | Partially complete: documented shared defaults now apply to queries and mutations; page-specific settings remain for operational data. | Phase 4 |
| ENH-006 city head capability expansion | Product enhancement after secure launch. | Phase 6 |
| ENH-007 guardian fee history/reminders | Product enhancement after payment correctness and email delivery. | Phase 6 |
| ENH-008 password policy | Corrected: the current reset flow already requires eight characters; add a stronger policy and compromised-password protection. | Phase 2 |

---

## 5. Delivery Roadmap And Agent Work Packages

### Phase 0 — Governance, freeze, and safe working model

- Create a dedicated production-hardening branch; no agent pushes directly to main.
- Protect main, require review, and create separate local Development, shared cloud Staging, and Pilot Production environments.
- Classify the tracked database as sample or real data without exposing records. Take an encrypted backup before any migration work.
- Freeze schema-changing feature work until the migration design is approved.
- Inventory every secret, integration, domain, sender identity, and data-retention requirement.
- Write a rollback decision record before the first production data migration.

### Phase 1 — Security and runtime blockers

Work Package A: Identity and authorization

- Implement one authorization helper that loads current account status and enforces role plus city/park/group scope.
- Repair every route that lacks a final deny, including batch, group, attendance, certificate, and park-scoped paths.
- Validate that a staff assignment exists and is active; null assignments must deny access.
- Invalidate sessions atomically on account/staff/role/scope changes.
- Replace the shared invite password with one-time, hashed, expiring invitation tokens.
- Remove credentials, reset URLs, CNIC, address, and invitation codes from notification/audit payloads.

Work Package B: Runtime and broken integrations

- Fix the missing realtime hook import and add an authenticated-app startup test.
- Repair the guardian data model and invitation flow; do not invent schema fields without a migration.
- Implement the missing upload endpoints only after Storage policies are in place; otherwise hide the controls.
- Disable the current mini-service and remove localhost/Caddy/XTransformPort assumptions from launch configuration.
- Fix attendance alerts, including correct scope checks, server-safe internal invocation, and threshold logic.

Exit criteria: All P0 security/runtime tests pass; no private data or known credentials are tracked; a guardian, student, murabbi, park user, city head, and admin role matrix has passing allow/deny tests.

### Phase 2 — Application quality and secure API baseline

Work Package C: API contract and reliability

- Add shared Zod request schemas, bounded query parameters, response contracts, and one structured error boundary.
- Restore TypeScript and ESLint protections. Remove the Next.js ignoreBuildErrors configuration.
- Standardize audit events, redaction, audit failure monitoring, and retention.
- Add CSRF/origin protection appropriate to cookie-authenticated mutations, request body limits, rate limits, and security headers.
- Strengthen password policy while preserving a usable reset flow.
- Add unit tests for authorization, attendance rules, fee calculations, import validation, and notification state transitions.

Exit criteria: lint, typecheck, unit tests, and security checks all block merges; no unauthenticated or cross-scope API mutation passes the tests.

### Phase 3 — Supabase Postgres, Storage, and data migration

Work Package D: Database and data safety

- Create two Supabase Free projects in the selected compliant region: one shared sanitized Staging project and one Pilot Production project.
- Create a least-privilege Prisma database role; do not use the Supabase service role for Prisma.
- Configure Vercel runtime traffic through the Supavisor transaction pooler and a protected direct connection for migrations/backups.
- Convert the Prisma provider to PostgreSQL, replace Float monetary values with exact values, add only reviewed indexes, and generate an initial migration history.
- Add database constraints for staff assignment consistency, attendance-event uniqueness, payment relationships, and allowed status values where appropriate.
- Design, test, and rehearse the SQLite-to-Postgres migration on a staging copy. Reconcile record counts, identifiers, balances, receipt numbers, and audit data before cutover.
- Configure private avatar and document buckets. Use server-side authorization and signed URLs; record storage keys, not public filesystem paths.
- Define manual encrypted backup, weekly export review, restore drill, and operator runbook. Automatic backups/PITR are explicit upgrade triggers.

Exit criteria: staging runs only on Postgres/Storage; migration is repeatable; a restore drill succeeds; no uploaded/private file is publicly addressable without authorization.

### Phase 4 — Vercel delivery architecture and operations

Work Package E: Hosting and operational readiness

- Create the Vercel Hobby project under the owner account, connect GitHub, and make main the Pilot Production branch. Treat it as a pilot, not an organization-owned commercial production service.
- Use Preview deployments for every pull request with the shared sanitized Staging database. Preview must never use Pilot Production credentials or production uploads, and schema migrations run only locally/through the approved migration workflow.
- Store secrets in Vercel environment variables scoped separately to Development, Preview, and Production. Vercel applies variables to future deployments, so every secret change requires a redeploy.
- Build in CI using the lockfile. Run Prisma generate and application build there; run migration deploy in one serialized, approved CI job before production promotion.
- Configure custom domain, HTTPS, redirect policy, CSP, HSTS, frame protection, MIME-sniffing protection, referrer policy, and private-app noindex behavior.
- Add a protected health endpoint that checks application and database readiness without exposing details.
- Add free-tier-compatible error tracking, structured logs, uptime checks, alert routing, deployment owner, runbook, and rollback steps. The owner must export/inspect relevant logs promptly because Hobby retention is short.
- Use one secured daily Vercel Cron only for non-urgent outbox reconciliation. Protect cron invocation with a dedicated CRON_SECRET. Do not promise precise delivery or durable background processing on the free tier.
- Do not restore the current unauthenticated Socket.IO service. Realtime design requires a separate security decision and authenticated subscriptions; polling remains acceptable for the initial launch.

Exit criteria: local development, shared Staging, and Pilot Production are separated; deployment and rollback are rehearsed; monitoring alerts are received by the responsible owner; pilot limits are documented and accepted.

### Phase 5 — Performance, UX, and maintainability

- Implement navigation history, query defaults/stale-time policy, fee summary aggregation, service-worker build cache versioning, typed API responses, and development tools.
- Split oversized module components only after behavioral tests cover them.
- Add audit context such as IP/user agent only with an approved privacy and retention policy.
- Decide whether participant address is a supported feature and update forms/schema consistently.
- Upgrade email templates after real delivery and unsubscribe/consent policy are complete.

### Phase 6 — Product expansion and platform modernization

- Evaluate Auth.js v5 as a separately tested migration.
- Add city-head operational workflows, guardian payment history/reminders, advanced dashboards, QR attendance, messaging, push notifications, and other enhancement ideas only after secure launch stability.

---

## 6. Vercel Deployment Runbook

1. Approve the security and database architecture before touching production credentials or data.
2. Create Supabase staging first; complete Postgres migration rehearsal and restore test.
3. Create Vercel Preview deployments with the sanitized shared Staging database/storage and deploy the hardened branch. Do not run migrations from previews.
4. Run the complete role matrix, attendance offline/online sync, payment, import/export, invite, document, and password-reset UAT on Preview/Staging.
5. Create the Pilot Production Supabase project, complete the manual backup/restore drill, and apply only approved migrations through the controlled CI job.
6. Add production Vercel environment variables, custom domain, email sender domain, monitoring DSN, and CRON_SECRET. Do not copy credentials into Git or local shared files.
7. Deploy a production smoke-test release behind a restricted access window; validate database, storage, login, each role, payment, notifications, backups, and monitoring.
8. Open DNS only after pilot checklist sign-off. Keep a rollback deployment and encrypted pre-migration backup available.
9. Monitor closely after pilot release, review error/authorization logs and free-tier quotas, and hold feature releases until the launch stabilization window closes.

---

## 7. Multi-Agent Execution And Review Protocol

Each task must have one owner, one narrow file/domain scope, explicit acceptance criteria, automated evidence, and a rollback note. Agents must not modify unrelated files or merge directly to main.

### Capability-specific allocation

Model capability is used to decide the task type, not to replace review. Every agent must provide file-level evidence, tests, and remaining risks; Codex remains the architecture and release authority.

| Workspace/model | Best use in this program | Do not assign |
|---|---|---|
| Codex | Owns architecture, task sequencing, cross-cutting security decisions, integration, production-pilot gates, and final review/approval. Implements high-risk changes that span lanes. | Delegate final approval, secret handling, migration cutover, or release decisions. |
| Claude Opus 4.6 Thinking | Deep threat modelling, authorization design challenge, migration-risk review, difficult code review, and independent adversarial validation. | Broad mechanical refactors or unreviewed deployment actions. |
| Claude Sonnet 4.6 Thinking | Well-scoped, high-complexity implementation after an approved design; focused API/security tests; careful refactors. | Database cutover, secret rotation, or overlapping multi-lane changes. |
| Gemini 3.1 Pro High | Database/data-flow analysis, migration rehearsal design, complex test scenarios, and independent architecture review. | Live database operations or Git history changes. |
| Gemini 3.1 Pro Low | Focused module analysis, integration mapping, documentation verification, and test-case preparation. | Security-critical implementation without an approved specification. |
| Gemini 3.5 Flash High/Medium | Fast API inventories, UI-to-endpoint mapping, route coverage tables, duplicate finding detection, and test data/checklist generation. | Any security, schema, migration, or deployment edit. |
| Gemini 3.5 Flash Low | File inventory, documentation extraction, formatting checks, and simple non-code task breakdown. | Interpretation of authorization, payments, data loss, or deployment safety. |
| GPT-OSS 120B Medium | Independent second-pass review, edge-case generation, and comparing agent reports against the master plan. | Final security conclusion or direct edits to core auth/database code. |
| CommandCode DeepSeek | Mechanical, isolated implementation after approval: test scaffolding, route test fixtures, lint/type cleanup, documentation, or narrowly specified UI fixes. | Auth policy design, payment/data integrity changes, migrations, secrets, deployment, or final review. |
| Kiro Claude (Sonnet/Opus when available) | Isolated implementation of an approved high-complexity specification, followed by self-test evidence. | Parallel edits in the same files as another agent, account provisioning, or autonomous deployment. |

### Wave 1: parallel evidence gathering — no code edits

| Owner | Exact task | Required handoff |
|---|---|---|
| Claude Opus Thinking | Produce an independent P0 threat model for authentication, authorization, session revocation, secrets, notifications, and sensitive youth data. Challenge every assumed-safe route. | Prioritized findings, endpoint/role matrix, exploit path, fix design, tests. |
| Gemini 3.1 Pro High | Produce the SQLite-to-Supabase Free migration design, data reconciliation plan, free-tier backup/restore procedure, and schema constraint plan. | Ordered migration runbook, breaking changes, rollback, acceptance checks. |
| Gemini 3.5 Flash High | Inventory every API route, its methods, current auth mechanism, role checks, scope checks, mutation type, and client caller. | CSV/Markdown matrix of routes plus suspected gaps; no code edits. |
| Gemini 3.5 Flash Medium or Low | Map every UI fetch call to an existing API route and identify missing, stale, or mismatched integrations. | File/path evidence and a broken-flow checklist. |
| GPT-OSS 120B Medium | Independently compare the master plan against the checkout, especially contradictory claims in the preserved Claude audit. | Confirmed, disproved, and unverified items with evidence. |

### Wave 1 intake and Codex adjudication

Wave 1 evidence gathering is complete as of 2026-07-13. These reports are planning inputs, not approval to deploy or edit production. Codex reconciles conflicting claims against the checkout before work is assigned.

| Input | Status | Codex decision |
|---|---|---|
| Claude Opus 4.6 Thinking P0 threat model (task attachment, 2026-07-13) | Accepted with severity corrections. | Confirms the shared invitation password and credential exposure, tracked secrets/database, missing session invalidation, insecure Socket.IO service, authorization gaps, payment integrity issue, and failing server-side relative attendance fetch. Middleware is valuable defense in depth, but never replaces route-level authorization. TypeScript build enforcement is a release gate, not by itself an exploit. |
| [Gemini migration design](MIGRATION_DESIGN.md) | Accepted only after corrections in this row. | Use two Supabase Free projects and a rehearsed Postgres migration. Do not roll a Vercel/Postgres deployment back to SQLite after any write: recovery is a Postgres backup plus redeploy/forward-fix process. Enum conversion needs an actual data-value inventory and approved mapping. Restore drills must not destructively overwrite the shared staging project. Confirm the exact Prisma 6.11 direct/pooler configuration before implementation. |
| [Gemini API inventory](reviews/api_inventory_review.md) | Accepted as route coverage evidence; authorization conclusions require the central policy review. | Its P0 evidence confirms fail-open batch/group detail routes, null-assignment park bypasses, PII scope leakage, financial validation gaps, and realtime exposure. A route using `requireAuth()` is not automatically secure; each read and mutation still needs explicit role and city/park/group scope authorization. |
| [Gemini UI-to-API map](reviews/ui_to_api_integration_map.md) | Accepted. | Confirms the missing realtime hook import, guardian invitation/schema mismatch, unsafe attendance-role logic, and UI/API discrepancy inventory. Repair runtime blockers before feature work. |
| [Pilot release checklist](reviews/pilot_release_checklist.md) | Accepted as an operational checklist, with corrections. | Vercel Hobby permits functions up to one minute, not ten seconds. It can schedule up to 100 Cron jobs per project, but on Hobby each is at most daily and timing is imprecise. Keep the plan's free-tier pilot constraints as authoritative. |
| GPT-OSS 120B final review (task message, 2026-07-13) | Received, but does not meet its required evidence handoff. | Preserve its runtime/performance checklist: missing realtime import, single-level navigation history, fees summary scans, search bounds, SQLite concurrency, query caching consistency, indexes, and testing/CI. Reject its unverified `safe` labels: tracked `.env` invalidates the JWT-secret conclusion; fail-open and missing scope checks invalidate the role-authorization conclusion; user update/deactivation does not increment `tokenVersion`; and NextAuth alone does not establish CSRF coverage for every mutation route. The claimed WebSocket port mismatch is not a confirmed blocker; the confirmed issue is the unauthenticated service and unsupported Vercel-Hobby deployment model. |

Approved evidence-based release blockers, in dependency order:

1. Rotate exposed credentials; remove `.env` and `db/custom.db` from tracking; obtain explicit owner approval before any Git-history rewrite.
2. Establish one deny-by-default authorization policy and apply it to every protected route, including scope checks for reads, searches, detail endpoints, attendance, and guardian/student PII.
3. Atomically increment `tokenVersion` for account activation/deactivation, role, and scope changes; prove it through captured-session tests.
4. Replace the invitation credential flow with one-time, hashed, expiring tokens; purge plaintext passwords/codes from notification and audit records.
5. Disable the current Socket.IO service for the pilot and change the client to authenticated polling. Do not expose port 3004.
6. Repair the missing realtime hook import, guardian invitation model mismatch, server-side attendance alert invocation, and upload/storage path before pilot testing.
7. Add transactional payment membership/overpayment protection now; schedule exact-money and Postgres schema migration only through the approved migration lane.
8. Make lint, typecheck, build, authorization tests, and role-matrix tests required CI gates before any preview or production deployment.

### Wave 2: implementation - use the approved task backlog

The task-level sequence, ownership boundaries, dependencies, and acceptance tests are maintained in [TASK_BACKLOG.md](TASK_BACKLOG.md). A task begins only when Codex assigns its identifier and confirms that no overlapping task is active.

| Owner | Approved implementation lane | File/domain boundary |
|---|---|---|
| Codex | Authorization architecture, task integration, security decisions, migration/release design, and final review. | Cross-cutting changes and all high-risk approvals. |
| Claude Sonnet Thinking or Kiro Claude | One approved P0 runtime/API slice at a time, such as the missing realtime import plus a contained route fix and tests. | Exactly the files named in the task; no schema/deployment changes. |
| CommandCode DeepSeek | Test framework, fixtures, low-risk lint/type cleanup, and mechanical refactors after the desired behavior is specified. | package/test/config files or one isolated component group. |
| Gemini 3.1 Pro High | Schema/migration implementation only after Codex approves a migration plan and a backup/rollback rehearsal. | prisma schema, migrations, migration scripts, and migration tests only. |
| Claude Opus Thinking | Independent review of completed P0 changes before Codex integration. | Read-only review; no parallel implementation. |

### Mandatory agent handoff format

Every agent report or change request must contain:

1. Task identifier and a one-sentence outcome.
2. Exact files inspected or changed.
3. Evidence for every claim, including route/method/role where relevant.
4. Tests run and their result; if not run, the exact reason.
5. Security, data, migration, and rollback impact.
6. Dependencies or conflicts with another lane.
7. A statement: Ready for Codex review.

| Lane | Agent responsibility | Initial scope |
|---|---|---|
| Security lane | Authentication, authorization, session revocation, secrets, CSRF, headers | Phase 1 Work Package A |
| Runtime lane | Broken UI/API flows, attendance, notifications, uploads | Phase 1 Work Package B |
| Data lane | Prisma/Postgres schema, migrations, data migration, Storage policies | Phase 3 Work Package D |
| Platform lane | Vercel, CI/CD, monitoring, cron/outbox, deployment runbook | Phase 4 Work Package E |
| Quality lane | Unit/E2E tests, role matrix, performance tests, UAT evidence | Phases 2 and 5 |

Codex review/approval gate:

1. An agent first submits its implementation summary, changed files, migration impact, tests run, and rollback note.
2. Codex performs a code review focused on authorization, data loss, race conditions, deployment safety, and regression coverage.
3. Codex either approves, requests exact corrections, or blocks the change when prerequisites are missing.
4. Only approved, tested work moves to the integration branch; only a successful staging checklist may move to main/production.

---

## 8. Current Verification Limits

- Local dependencies were installed solely for validation, but the project has no reproducible lockfile and package install scripts were blocked by the local package policy. The resulting tool tree could not load ESLint reliably.
- `npx tsc --noEmit` reaches the application but reports extensive existing errors across Prisma generation, dependency-version compatibility, API routes, and UI components. A successful build must not be claimed until `BUILD-001` resolves the baseline and CI proves it.
- The current Next.js configuration ignores TypeScript build errors; therefore an existing build must not be treated as a production-quality signal.
- The tracked SQLite database was not inspected for record values during audit, to avoid exposing potentially sensitive data.

---

## 9. Original Claude Audit — Preserved Source Material

# Shabab360 v2 — Deep Audit & Improvement Plan

> **Author**: Antigravity AI (Google DeepMind)
> **Date**: 2026-07-12
> **Audit Scope**: Full codebase — architecture, security, performance, UX, bugs, database, and maintainability
> **Status**: Living document — update as items are resolved

---

## Executive Summary

Shabab360 v2 is a **mature, well-structured** youth program management platform built on Next.js 16, Prisma/SQLite, NextAuth.js v4, Zustand, and TanStack Query. All 27 planned pages are built, the brand migration is complete, and several advanced features (offline sync, PWA, real-time notifications, CSV import/export) are in place.

The platform is production-ready for a **small-to-medium deployment**. However, this audit has identified **1 critical runtime bug**, **4 high-priority issues**, **12 medium-priority improvements**, and **8 enhancement opportunities** that should be addressed before scaling beyond ~200 active users.

---

## 🔴 CRITICAL BUGS (Fix Immediately)

### BUG-001: `useRealtimeNotifications` Used But Not Imported in `app-shell.tsx`

**File**: [`src/components/layout/app-shell.tsx`](../src/components/layout/app-shell.tsx)
**Line**: 354

**Root Cause**: The hook `useRealtimeNotifications()` is called inside the `AppShell` component body, but there is no `import { useRealtimeNotifications }` statement at the top of the file. This means the symbol is undefined at runtime, which will throw a `ReferenceError: useRealtimeNotifications is not defined` when any authenticated user visits any page.

**Impact**: **ALL authenticated users** will hit a runtime crash on page load. The app is non-functional in production unless the dev server's error overlay is masking this.

**Fix**:
```tsx
// Add to imports section of app-shell.tsx (around line 73)
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
```

---

### BUG-002: `goBack()` in Zustand Store Only Tracks One Level of History

**File**: [`src/stores/useAppStore.ts`](../src/stores/useAppStore.ts)
**Lines**: 104–108

**Root Cause**: The `goBack()` function sets `previousPage` to `null` after navigating back. This means if a user navigates A → B → C and calls `goBack()` twice, the second call returns to `null` (falls back to "login") instead of going back to A.

**Impact**: Breadcrumb "back" actions and keyboard shortcuts that trigger `goBack()` will drop users back to the login page after one use instead of the correct previous page.

**Fix**:
```ts
// Replace simple previousPage with a navigation stack
navigationStack: PageId[];
navigateTo: (page) => set((state) => ({
  currentPage: page,
  navigationStack: [...state.navigationStack.slice(-9), state.currentPage], // max 10 deep
})),
goBack: () => set((state) => {
  const stack = [...state.navigationStack];
  const prev = stack.pop() || "login";
  return { currentPage: prev, navigationStack: stack };
}),
```

---

## 🟠 HIGH PRIORITY

### HIGH-001: In-Memory Rate Limiter Not Suitable for Production

**File**: [`src/lib/auth.ts`](../src/lib/auth.ts)
**Lines**: 7–23

**Issue**: The login rate limiter uses `Map<string, { count, resetAt }>` stored in the Node.js process memory. This means:
1. State is **lost on every server restart** (or Vercel/serverless cold start)
2. Does **not work at all** in multi-instance deployments (each server has its own map)
3. A bad actor can bypass it by simply retrying on a different server instance

**Fix**: Replace with a DB-backed or Redis-backed rate limiter:
```ts
// Option A: Use the existing SQLite DB (simple, works for single-server)
// Store rate limit attempts in a new RateLimit table in Prisma schema

// Option B: Use Upstash Redis (free tier, works for serverless)
// import { Ratelimit } from "@upstash/ratelimit";
```

---

### HIGH-002: Avatar Images Stored in `public/` Directory

**File**: [`src/app/api/upload/avatar/route.ts`](../src/app/api/upload/avatar/route.ts)

**Issue**: Profile avatars are saved to `public/uploads/avatars/`. This works on a persistent server but:
1. **Files are lost** every time a fresh production build is deployed (Next.js `next build` wipes and rebuilds `.next/` and uses the `public/` folder from source)
2. Files are **not included** in the standalone build output automatically
3. No file size cleanup or storage management

**Fix**:
- Short-term: Store avatar base64 in the DB `User` table (already has a `name` field to add `avatarUrl` to)
- Long-term: Use cloud storage (Cloudflare R2, AWS S3, or Supabase Storage) with pre-signed upload URLs

---

### HIGH-003: JWT Token Validation Hits DB on Every Request

**File**: [`src/lib/auth.ts`](../src/lib/auth.ts)
**Lines**: 171–179

**Issue**: The JWT callback runs a DB query on **every single API call** to check token version:
```ts
const dbUser = await db.user.findUnique({
  where: { id: token.id },
  select: { tokenVersion: true },
});
```

With 50 concurrent users each making 5 API calls per page, that's 250 extra DB reads per second. SQLite is single-writer and will become a bottleneck.

**Fix**:
- Add a short TTL to the token version check (e.g., cache the last-checked timestamp in the JWT itself, only re-query every 15 minutes)
- Or implement a Redis/in-memory token blocklist for invalidated sessions instead

---

### HIGH-004: `fees/route.ts` Makes Two Full Table Scans for Summary

**File**: [`src/app/api/admin/fees/route.ts`](../src/app/api/admin/fees/route.ts)
**Lines**: 143–172

**Issue**: After fetching the paginated page of fee events, the route then fetches **ALL** matching fee events again with full payment and group relations just to compute summary totals. This is a complete table scan done twice.

**Fix**: Compute summaries in a single aggregation query using `groupBy` or `aggregate`, then use the paginated query just for the displayed rows.

---

## 🟡 MEDIUM PRIORITY

### MED-001: Missing `try/catch` on Several API Routes

**Files**: `src/app/api/admin/fees/route.ts`, `src/app/api/admin/admissions/route.ts`, and others

**Issue**: Several GET/POST handlers are missing `try/catch` blocks. If Prisma throws (e.g., constraint violation, SQLite lock), the server returns an unformatted 500 error with no structured JSON body. This causes TanStack Query to fail silently with cryptic errors.

**Fix**: Add a consistent error wrapper:
```ts
// src/lib/api-error.ts
export function withErrorHandling(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("[API Error]", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
```

---

### MED-002: SQLite Single-Writer Bottleneck for Concurrent Attendance Marking

**Files**: `src/app/api/park/attendance/[eventId]/route.ts`, offline sync routes

**Issue**: When 20 participants are being marked simultaneously (offline sync replay + realtime), SQLite's write-ahead log (WAL) can cause lock timeouts because only one write transaction can be active at a time. The current offline sync sends individual requests per participant.

**Fix**:
- Use `createMany` for bulk attendance marking (already available in Prisma)
- Add a `PRAGMA journal_mode=WAL` and `PRAGMA synchronous=NORMAL` to improve concurrent read/write
- Batch the offline sync to send all marks for an event in one request instead of N individual requests

---

### MED-003: No Input Sanitization on `search` Parameters

**Files**: Multiple API routes that accept `search` query parameters

**Issue**: All `searchParams.get("search")` values are passed directly to Prisma `contains` without sanitization. While Prisma parameterizes queries (preventing SQL injection), extremely long search strings (e.g., 10,000+ characters) can cause performance degradation.

**Fix**:
```ts
const search = (searchParams.get("search") || "").trim().slice(0, 200);
```

---

### MED-004: `staleTime` Values Are Inconsistent Across Pages

**Scope**: Multiple files in `src/components/modules/`

**Issue**: `staleTime` values range from `5000ms` (5 seconds) to `300000ms` (5 minutes) with no documented reasoning. Some pages refetch every 5 seconds (attendance roster) while others cache for 5 minutes (city list). There's no central configuration.

**Fix**: Create a shared query constants file:
```ts
// src/lib/query-config.ts
export const QUERY_STALE_TIMES = {
  STATIC: 5 * 60 * 1000,        // 5min: cities, parks, batches (rarely change)
  SEMI_STATIC: 60 * 1000,       // 1min: groups, users, fees
  DYNAMIC: 30 * 1000,           // 30s: dashboard stats, announcements
  REALTIME: 10 * 1000,          // 10s: attendance events, notifications
};
```

---

### MED-005: `any` Type Overuse in TypeScript

**Files**: `src/app/page.tsx` (line 25: `as any`), `src/components/layout/app-shell.tsx`, and multiple modules

**Issue**: `session.user` is cast to `any` in multiple places instead of using the augmented `Session` type defined in `auth.ts`. This defeats TypeScript's type safety.

**Fix**: Use the properly typed session:
```ts
// Instead of: const user = session.user as any;
// Use: const user = session.user; // Already typed via module augmentation
```

---

### MED-006: Notification Service Port Mismatch

**File**: [`src/hooks/use-realtime-notifications.ts`](../src/hooks/use-realtime-notifications.ts)
**Line**: 51

**Issue**: The hook connects to port 3004 (`XTransformPort=3004`), but the worklog states the service runs on port 3003. This mismatch means the WebSocket connection silently fails, and the app falls back to 60s polling for all users.

**Fix**: Verify and standardize the port. Create an environment variable:
```ts
const WS_PORT = process.env.NEXT_PUBLIC_NOTIFICATION_PORT || "3004";
const socket = io(`/socket.io/?XTransformPort=${WS_PORT}`, ...);
```

---

### MED-007: `auth.ts` JWT Callback Has No Short-Circuit for Unauthenticated Calls

**File**: [`src/lib/auth.ts`](../src/lib/auth.ts)
**Lines**: 160–179

**Issue**: The JWT callback fires on every `getServerSession()` call regardless. When `token.id` is undefined (API routes called without auth that proceed to return 401 anyway), there's still a conditional check that evaluates to false — but the structure could short-circuit earlier.

**Fix**: Minor defensive code:
```ts
async jwt({ token, user }) {
  if (user) { /* ...populate token... */ }
  if (!token.id) return token; // No DB check needed for anonymous tokens
  // ...DB tokenVersion check...
}
```

---

### MED-008: Audit Log Does Not Capture IP Address or User Agent

**File**: [`src/lib/audit.ts`](../src/lib/audit.ts)

**Issue**: The `AuditLog` model and `logAudit()` function do not record IP address, user agent, or request headers. For a platform managing youth data, this is a compliance gap.

**Schema addition** (requires migration):
```prisma
model AuditLog {
  // ... existing fields ...
  ipAddress   String?
  userAgent   String?
}
```
**API integration**: Pass `request.headers.get("x-forwarded-for")` and `request.headers.get("user-agent")` to `logAudit()`.

---

### MED-009: Email Templates Are Plain Text — No HTML

**File**: [`src/lib/email-service.ts`](../src/lib/email-service.ts)

**Issue**: All 4 email templates (password reset, invite, absence alert, fee reminder) use plain text bodies. Email clients in 2025 expect HTML emails with proper formatting, and plain-text emails have high spam scores.

**Fix**: Add an HTML email template system:
```ts
function buildEmailTemplate(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><style>
        body { font-family: sans-serif; background: #F3F1F4; }
        .card { background: white; border-radius: 8px; padding: 24px; max-width: 480px; margin: 32px auto; }
        .brand { color: #4B0A8F; font-size: 24px; font-weight: bold; }
        .cta-button { background: #4B0A8F; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
      </style></head>
      <body>
        <div class="card">
          <div class="brand">Shabab360</div>
          <h2>${title}</h2>
          ${content}
          <p style="color:#999; font-size:12px; margin-top:24px">— Shabab360 Team</p>
        </div>
      </body>
    </html>
  `;
}
```

---

### MED-010: No Database Indexes on High-Frequency Query Fields

**File**: [`prisma/schema.prisma`](../prisma/schema.prisma)

**Issue**: Several high-frequency query patterns are missing database indexes:
- `Guardian.phone` — searched frequently in participant linking
- `Participant.state` + `Participant.groupId` — filtered together constantly
- `AttendanceRecord.markedAt` — used in date-range queries for dashboards
- `Announcement.targetRoles` + `Announcement.expiresAt` — filtered on every announcement fetch

**Fix** (add to schema, requires `prisma db push`):
```prisma
model Guardian {
  @@index([phone])
}
model Participant {
  @@index([groupId, state])
}
model Announcement {
  @@index([expiresAt])
}
```

---

### MED-011: Service Worker Cache Version is Hardcoded

**File**: [`public/sw.js`](../public/sw.js)
**Line**: 6

**Issue**: `const CACHE_VERSION = "shabab360-v1.0.0"` is hardcoded. After every deployment, the old cached app shell is served to existing users. They only get the new version when the browser eventually decides to re-check the service worker — which can take 24 hours.

**Fix**: Inject the build hash at build time using `next.config.js`:
```js
// next.config.js
const CACHE_VERSION = `shabab360-${process.env.NEXT_PUBLIC_BUILD_ID || Date.now()}`;
```
Or use Workbox which handles this automatically.

---

### MED-012: `Participant.address` Field Exists in Schema But Not Exposed in Any UI

**File**: [`prisma/schema.prisma`](../prisma/schema.prisma)
**Line**: 177

**Issue**: The `Participant` model has an `address` field, but none of the student CRUD forms (students-page, import dialog, etc.) include it. It's dead schema weight that clutters the model without providing value.

**Action**: Either add the field to relevant forms or remove it from the schema if not needed.

---

## 🟢 ENHANCEMENT OPPORTUNITIES

### ENH-001: Upgrade from NextAuth.js v4 to Auth.js v5

**File**: [`src/lib/auth.ts`](../src/lib/auth.ts), `package.json`

**Context**: The project uses `next-auth@^4.24.11`. Auth.js v5 (the official successor) has been stable since early 2025 and provides:
- Native Edge Runtime support (removes DB calls from the middleware layer)
- Better TypeScript types with no manual module augmentation needed
- Built-in adapter support with Prisma (no custom JWT hacks needed for `tokenVersion`)
- `unstable_update()` for on-demand session refresh

**Effort**: ~4 hours. Mostly a find-and-replace of imports and session callback patterns.

---

### ENH-002: Migrate SQLite to PostgreSQL for Production

**Context**: SQLite is excellent for development but has hard limits:
- **Single writer** — all writes are serialized (critical for concurrent attendance marking)
- **File-based** — not suitable for multi-server deployments
- **Max practical size** — starts degrading around 100GB

**For production with >50 concurrent users**, migrate to:
- **Supabase** (free tier, managed Postgres, supports Prisma natively)
- **PlanetScale** (serverless MySQL, branching for dev workflows)
- **Neon** (serverless Postgres, hibernation for cost saving)

The Prisma schema migration is straightforward — change `provider = "sqlite"` to `provider = "postgresql"` and run `prisma migrate dev`.

---

### ENH-003: Implement Proper API Response Types

**Scope**: All API routes + `src/types/index.ts`

**Context**: The `ApiResponse<T>` type exists in `types/index.ts` but is not used by any API route handler. All routes return untyped `NextResponse.json()`. This means the frontend has no compile-time guarantee about response shapes.

**Fix**: Use Zod schemas for both input validation AND output shape definition, then share these types between API and client:
```ts
// src/schemas/city.schema.ts
export const CityResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  isActive: z.boolean(),
});
export type CityResponse = z.infer<typeof CityResponseSchema>;
```

---

### ENH-004: Add React Query DevTools for Development

**Context**: The `QueryClientProvider` in `page.tsx` has no devtools. This makes debugging cache state, stale data, and query keys very difficult for future developers.

**Fix**:
```tsx
// In page.tsx or a separate dev-only component
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
// ...
{process.env.NODE_ENV === "development" && (
  <ReactQueryDevtools initialIsOpen={false} />
)}
```

---

### ENH-005: Add a Global `QueryClient` Default Config

**File**: [`src/app/page.tsx`](../src/app/page.tsx)
**Line**: 12

**Issue**: `const queryClient = new QueryClient()` uses all defaults. There are no global defaults for `staleTime`, `retry`, or error handling.

**Fix**:
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false, // Prevents aggressive refetch on tab switch
    },
    mutations: {
      onError: (error) => toast.error("Operation failed. Please try again."),
    },
  },
});
```

---

### ENH-006: City Head Dashboard Has No Actionable Data

**File**: `src/components/modules/city-head/city-head-dashboard.tsx`

**Context**: Based on the worklog, the city head dashboard was built as a single page. However, the role has no dedicated CRUD pages — city heads can only view. Adding these would improve their utility:
- City-scoped Reports view (filtered to their city)
- Ability to view parks and park performance in their city
- Direct navigation to park-specific attendance summaries

---

### ENH-007: Fees Module Missing Guardian-Facing Payment History

**File**: `src/components/modules/guardian/guardian-fees-page.tsx`

**Context**: The guardian fees page exists but was noted in the worklog as a "stub". Guardians should be able to:
- View all outstanding fees for their children
- See payment history per child
- Receive fee reminders (the backend `sendFeeReminder()` exists but is never triggered automatically)

---

### ENH-008: No Password Complexity Enforcement on Reset

**File**: `src/app/api/auth/reset-password/route.ts`

**Issue**: The password reset API accepts any non-empty string as a new password. There's no minimum length, complexity, or strength requirement.

**Fix** (Zod schema):
```ts
const resetSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});
```

---

## 📊 Architecture Observations

### What Works Well

| Area | Assessment |
|------|-----------|
| SPA pattern with Zustand | ✅ Clean, all navigation in one place |
| Code splitting (React.lazy) | ✅ All 35+ page components are lazily loaded |
| TanStack Query caching | ✅ Consistent usage throughout, staleTime set everywhere |
| Offline-first attendance | ✅ Dexie queue + sync with proper retry logic |
| Brand color system | ✅ 100% migrated, CSS custom properties for tokens |
| Audit logging | ✅ All CRUD operations logged with old/new values |
| Role-based scoping | ✅ Every API route validates role + scope |
| PWA manifest & SW | ✅ Cache-first for static, network-first for API |
| Bilingual support (EN/UR) | ✅ Complete translation files for both languages |
| Error boundary | ✅ Wraps all page content |

### Areas of Technical Debt

| Area | Issue |
|------|-------|
| `page.tsx` QueryClient | Created at module level, not in a stable hook |
| Inline `Record<string, unknown>` Prisma `where` types | Should use Prisma-generated `WhereInput` types |
| `fees-page.tsx` at 98KB | Largest component, should be split into sub-components |
| `admissions-page.tsx` at 95KB | Same — kanban board logic should be a separate component |
| `people-page.tsx` ESLint errors | Pre-existing linting issues never resolved |
| HTTP-only cookie for session | Currently relies on localStorage for avatar — mixed storage concern |

---

## 🗓️ Recommended Implementation Order

### Phase 1 — Immediate (This Week)
1. **BUG-001**: Fix missing `useRealtimeNotifications` import
2. **BUG-002**: Implement navigation stack for `goBack()`
3. **HIGH-004**: Fix double table scan in fees route
4. **MED-006**: Fix WebSocket port mismatch (3003 vs 3004)
5. **MED-003**: Add input length sanitization on search params

### Phase 2 — Short Term (Next 2 Weeks)
6. **HIGH-001**: Replace in-memory rate limiter with DB-backed solution
7. **MED-004**: Centralize `staleTime` values in `query-config.ts`
8. **MED-010**: Add missing database indexes
9. **ENH-005**: Add global QueryClient default config
10. **ENH-008**: Add password complexity enforcement
11. **MED-008**: Add IP/User-Agent to audit log

### Phase 3 — Medium Term (Next Month)
12. **HIGH-002**: Move avatar storage out of `public/`
13. **HIGH-003**: Reduce JWT DB calls with TTL caching
14. **MED-009**: HTML email templates
15. **MED-011**: Service worker cache versioning
16. **ENH-001**: Upgrade to Auth.js v5
17. **ENH-003**: Shared API response types

### Phase 4 — Long Term (Before Major Scale)
18. **ENH-002**: Migrate to PostgreSQL
19. Refactor `fees-page.tsx` and `admissions-page.tsx` into sub-components
20. End-to-end test suite (Playwright recommended)
21. CI/CD pipeline with lint + type check on every PR

---

## 🔐 Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| SQL Injection | ✅ Safe | Prisma parameterizes all queries |
| CSRF | ✅ Safe | NextAuth.js handles CSRF for credentials flow |
| Password hashing | ✅ Safe | bcryptjs with cost factor 10 |
| JWT secret | ✅ Safe | `NEXTAUTH_SECRET` env var required |
| Role-based authorization | ✅ Safe | Every API route validates role + scope |
| Rate limiting | ⚠️ Partial | In-memory only — doesn't survive restarts |
| Input validation | ✅ Safe | Zod schemas on all mutating endpoints |
| Password reset security | ⚠️ Weak | No token expiry, no complexity requirement |
| File upload validation | ✅ Safe | Type + size check on avatar upload |
| Sensitive data exposure | ✅ Safe | `passwordHash` never returned in API responses |
| Session invalidation | ✅ Safe | `tokenVersion` mechanism implemented |
| XSS | ✅ Safe | React escapes HTML by default |

---

## 📁 File Size Concerns

Large files that may benefit from splitting:

| File | Size | Recommendation |
|------|------|----------------|
| `fees-page.tsx` | 98KB | Extract `FeeEventDetail`, `PaymentForm`, `UnpaidList` |
| `admissions-page.tsx` | 95KB | Extract `KanbanBoard`, `ApplicationDetail`, `InterviewDialog` |
| `admin-dashboard.tsx` | 53KB | Extract `AttendanceTrend`, `QuickActions`, `ActivityFeed` sections |
| `attendance-roster.tsx` | 62KB | Extract `RosterRow`, `StatusCycler`, `OfflinePanel` |
| `import-dialog.tsx` | 33KB | Extract `FileDropzone`, `PreviewTable`, `ResultsSummary` |

---

*This document was prepared through a systematic review of all source files, API routes, database schema, store logic, hooks, service worker, and mini-service code. All findings are based on static analysis of the current commit at the time of audit.*

*— Antigravity AI, Google DeepMind Team*
