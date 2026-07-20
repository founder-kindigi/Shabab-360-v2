# Shabab360 v2 - Production Hardening Task Backlog

## Operating Rules

- This backlog implements [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md). The plan is the source of release policy; this file is the execution queue.
- Every task is one branch, one owner, and one review request. No direct changes to `main`.
- No task may read, print, commit, or transmit secret values. Production credentials, secret rotation, Supabase provisioning, Vercel setup, Git-history rewriting, and production migration execution stay with the project owner and Codex approval gate.
- Before beginning a task, re-read the relevant current files. Stop and report if another agent has modified an overlapping file.
- Every implementation handoff must use the mandatory format in the improvement plan and include test evidence plus a rollback note.

## Release Decision

The application is **not approved for a public or production handover**. It may only move toward a restricted free-tier pilot after every P0 task and its acceptance tests are approved by Codex.

## Current Execution Status

Status as of 2026-07-14:

- `GOV-001`: In progress. Work is isolated on `codex/production-hardening`; no agent has changed `main`.
- `SEC-001`: Partially complete. `.env` and `db/custom.db` are removed from current Git tracking, ignored going forward, and the shared start-script secret fallback is removed. Secret rotation and any Git-history rewrite remain owner-controlled decisions.
- `AUTH-001`: Implemented and regression-tested. `src/lib/auth/authorize.ts` provides a deny-by-default hierarchy policy that requires complete resource context for scoped staff; unit tests cover missing sessions, forced password reset, role allow-lists, and authorized access.
- `AUTH-003`: Verified. Captured-session regression tests prove single-user scope reassignment and deactivation, plus bulk deactivation and role changes, increment `tokenVersion` inside the same database transaction as the access change. Invalid and inconsistent hierarchy assignments, including an empty park scope for park-scoped roles, are rejected.
- `AUTH-004`: Server-side verified; interactive browser smoke remains a release gate. A forced-reset user can set a new password without a prior password, while ordinary changes require the current password. Both paths invalidate prior sessions atomically and queue a password-changed confirmation with no password or reset URL. Local authentication smoke establishes a session and reaches a protected admin route. User-selected passwords require 12-128 characters and cannot be blank. Generated import passwords also meet the policy; each participant import row is hierarchy-scoped and creates its account, participant, guardian, and relationship atomically, returning a newly generated credential only in the current import result.
- `AUTH-002`: Verified. Route regressions prove cross-city, cross-park, and cross-group batch/group reads or mutations, student/guardian details, and attendance record edits/resets return `403` before protected data or writes are reached. Search is staff-only and carries the caller's city, park, or group scope into every query.
- `OPS-003`: Verified. CSP and browser-security headers, private indexing policy, and same-origin API mutation protection are active. Audit write failures now emit the PII-safe structured `audit_write_failed` event without blocking the main action. `OPERATIONS_RUNBOOK.md` covers free-tier monitoring, rollback, secret exposure, and the database cutover boundary.
- `INV-001`: Partially complete. Shared credentials and plaintext notification/audit storage are removed; each invitation gets a cryptographic temporary password, shown once to the administrator, and centralized authorization forces a password reset before app access. Expiring, one-time hashed invitation tokens and cleanup of historical queued credentials require the approved schema/migration lane and remain a release gate.
- `RUNTIME-001`: Implemented, pending browser and route-test approval. Guardian invite no longer writes a non-existent Prisma field. Unsupported avatar and admission-document upload controls, local avatar persistence, and calls to missing upload APIs are removed; the UI uses initials and explicitly defers documents until private Supabase Storage is configured.
- `ATT-001`: Implemented and regression-tested. Alert evaluation runs through a server-safe service, validates event/participant/scope, treats every non-absent record as a streak break, and has no relative self-fetch or Socket.IO dependency.
- `PAY-001`: Implemented and regression-tested. Payment writes validate active fee-event batch membership, use paisa-normalized comparisons, allocate unique receipt numbers, and persist through a serializable transaction. Tests cover foreign-batch payments, overpayment, and serializable transaction conflicts. Receipt reads are hierarchy-scoped.
- `RT-001`: Implemented, pending browser and P0-suite approval. The unauthenticated Socket.IO mini-service and client dependency are removed; the authenticated shell imports a single notification polling hook that refreshes the authorized API every 60 seconds and on browser focus. Presence indicators are intentionally hidden until an authenticated realtime design is approved. Local authenticated notification API verification passes.
- `QA-001`: Implemented. Vitest is configured with `npm test`, deterministic fixtures contain no production data, and the suite covers money, authorization, session invalidation, invitations, attendance, payments, fee aggregation, origin checks, query parsing, password policy, and navigation.
- `QA-002`: Implemented and locally verified. Negative authorization, invitation hierarchy, session invalidation, attendance scope/streak, payment precision/batch/overpayment/conflict, and fees aggregation tests pass.
- `BUILD-001`: Implemented and locally verified on 2026-07-14. All 219 historical TypeScript errors were resolved without suppressing validation. `next.config.ts` no longer ignores build errors, React Strict Mode is enabled, and the build scripts use portable Next.js commands compatible with local Windows development and Vercel.
- `OPS-002`: Implemented. Pull requests run deterministic `npm ci`, Prisma generation, lint, typecheck, unit tests, a production build, production dependency audit at high severity, and a tracked-file guard for `.env` and SQLite database files. The committed `package-lock.json` contains the Linux and Windows optional packages required by GitHub Actions and Vercel.
- `OPS-003`: Verified. A global CSP and baseline browser-security headers, private noindex metadata, and an all-crawler `robots.txt` policy are implemented. The Next.js 16 `proxy.ts` rejects cross-origin application API mutations while leaving NextAuth endpoints to its built-in CSRF handling. Local live verification confirms headers, crawler blocking, `403` for a cross-origin mutation, and normal `401` authentication behavior for an unauthenticated same-origin mutation. Audit-failure visibility and the free-tier runbook are complete.
- `APP-001`: Implemented and locally verified. `useAppStore` now retains a bounded 25-page navigation history, ignores duplicate navigation to the active page, and correctly returns through every visited page before falling back to login. Three regression tests cover multi-step navigation, duplicates, bounds, and the fallback behavior.
- `APP-002`: Partially complete. Shared Zod query parsing now rejects malformed pagination, bounds list pages and identifiers, limits search text to 100 characters, and validates date-only ranges. It protects global search and the primary student, guardian, user, admission, staff-directory, group, audit-log, attendance-event, and notification-queue lists. Remaining list APIs are tracked for later isolated passes.
- `APP-003`: Implemented and regression-tested. Fees list data is bounded to the requested page; payment, event, and participant totals use database-side aggregates, and indexes support the fee/batch/participant/payment query shape. The `all` filter now uses matching list and summary scopes.
- `APP-004`: Partially complete. All queries without page-specific settings now inherit a documented 30-second freshness window, five-minute cache lifetime, one retry, and no focus-driven refetch. Development DevTools is deferred pending an intentional dependency addition.
- `APP-005`: Verified. The centralized audit helper redacts sensitive profile and credential fields before persistence, audit reads remain restricted to HQ administrators, and `AUDIT_DATA_POLICY.md` defines pilot access, retention, and the no-IP/no-user-agent boundary. Historical audit data remains excluded from production migration unless sanitized by the approved migration tooling.
- `DATA-001`: Staging rehearsal verified. The versioned Postgres baseline was applied to the owner-provisioned Supabase Staging project; the controlled SQLite import and full reconciliation passed.
- `DATA-002`: PostgreSQL code compatibility verified. Decimal-safe money handling, database-neutral reports/dashboard queries, the `on_leave` participant state migration, and the dedicated PostgreSQL production build all pass. The schema remains inactive at runtime pending Staging browser/role tests, private storage, and backup/restore evidence.
- Validation baseline: `git diff --check` passes. Full-project TypeScript validation passes with zero errors against both SQLite and PostgreSQL clients; `npm run lint` passes; `npm test` passes 94 tests in 28 files; `npm audit --omit=dev --audit-level=high` passes with no high-severity finding; and both `npm run build` and `npm run build:postgres` complete with TypeScript validation enabled and generate all 61 routes. Local smoke confirms root `200`, CSP present, authenticated session creation, and protected-route `200`.

## Wave 0 - Owner Decisions And Safety Setup

| ID | Owner | Task | Dependencies | Acceptance / stop condition |
|---|---|---|---|---|
| GOV-001 | Project owner + Codex | Create an isolated hardening branch and protect `main`; record a file-lock/owner list before concurrent editing. | None | No agent pushes to `main`; each task has a branch and owner. |
| SEC-001 | Project owner, reviewed by Codex | Rotate `NEXTAUTH_SECRET` and any credential that was ever present in tracked `.env`; remove `.env` and `db/custom.db` from current Git tracking. Decide explicitly whether to rewrite Git history. | Owner access; no agent secret access | Fresh secrets exist only in approved secret stores; tracked-file checks are clean; decision and rollback are recorded. |
| OPS-001 | Project owner, reviewed by Codex | Confirm the pilot is personal/non-commercial under Vercel Hobby terms; otherwise stop and choose an eligible paid/team plan. | None | Written decision before deploying anything. |
| DATA-001 | Codex + project owner | Verified Staging migration design and rehearsal: value inventory, enums, exact-money preflight, schema baseline, controlled import, and reconciliation. | SEC-001; migration review | Complete. App runtime activation remains DATA-002 and deployment-gated work. |

## Wave 1 - P0 Security And Runtime Blockers

| ID | Suggested owner | Exact scope | Dependencies | Required acceptance evidence |
|---|---|---|---|---|
| AUTH-001 | Codex | Design and implement a single deny-by-default authorization policy that resolves role plus city, park, and group scope from current server-side state. Establish reusable helpers and a role-matrix test contract. | SEC-001 | Unknown role, inactive account, or missing required assignment is denied; tests cover HQ, city, park, group, guardian, student, and anonymous cases. |
| AUTH-002 | Claude Sonnet/Kiro Claude after AUTH-001 design approval | Apply approved policy to batch/group detail routes, student and guardian detail/search routes, and park attendance routes. Do not change schema or auth policy helper design. | AUTH-001 | Cross-scope read/mutation tests return `403`; allowed scoped requests remain successful; exact routes are listed in handoff. |
| AUTH-003 | Codex | Update user/staff activation, deactivation, role, and scope changes atomically with `tokenVersion` invalidation. Correct assignment validation that permits empty park scope. | AUTH-001 | Captured pre-change JWT fails after deactivation, demotion, or city/park/group reassignment; DB transaction test proves both writes succeed or fail together. |
| INV-001 | Codex | Replace the shared/default-password invitation model with one-time, hashed, expiry-bound invitation tokens. Remove plaintext credentials/codes from notification bodies, data, and audit values; define cleanup for existing queued records. | SEC-001; DATA-001 if schema change needed | Two invitations cannot share a credential; invitation token is single-use and expires; DB/audit/response never exposes a password or token hash. |
| RT-001 | Claude Sonnet/Kiro Claude | Remove the unauthenticated Socket.IO service from pilot execution and change the client to safe authenticated polling. Repair the missing `useRealtimeNotifications` import/runtime failure. Do not deploy port 3004. | AUTH-001 contract for notification reads | Authenticated shell renders; no Socket.IO connection is attempted; notifications are scoped and load through authenticated API polling. |
| ATT-001 | Codex | Extract attendance alert logic into a server-safe service; eliminate relative self-fetch; validate event, participant, staff scope, status transitions, and consecutive-absence behavior. | AUTH-001 | Absent marking triggers an alert check without HTTP self-call; cross-group participant and out-of-scope staff are denied; excused/present records break the absence streak. |
| PAY-001 | Codex | Make payment creation transactional: validate fee-event batch membership, prevent concurrent overpayment, and make receipt generation concurrency safe. Keep current money representation isolated behind a helper until Postgres migration. | AUTH-001; DATA-001 for exact-money decision | Foreign-batch payment returns `400`/`409`; concurrent overpayment permits at most the allowable amount; receipt numbers are unique. |
| RUNTIME-001 | Claude Sonnet/Kiro Claude | Repair guardian invitation payload/schema mismatch and verify current avatar/document routes against Vercel constraints. Add no public file storage; prepare a storage interface only if required by DATA-002. | INV-001 | Guardian invite completes without unsupported Prisma field; upload behavior has explicit authorization, file validation, and a migration path away from ephemeral/public disk. |

## Wave 2 - Test, Build, And Platform Baseline

| ID | Suggested owner | Exact scope | Dependencies | Required acceptance evidence |
|---|---|---|---|---|
| QA-001 | CommandCode DeepSeek | Add the agreed unit/integration test foundation and fixtures. Do not edit authorization behavior or schema. | AUTH-001 test contract | One command runs tests locally/CI; fixtures contain no real PII or production secrets. |
| QA-002 | Claude Sonnet/Kiro Claude | Implement the approved authorization, invite, session invalidation, attendance, and payment regression suites. | AUTH-001 through PAY-001; QA-001 | Role matrix and captured-session tests pass; negative security cases are included. |
| BUILD-001 | CommandCode DeepSeek | Remove build-error suppression only after resolving reported type errors; restore strict React mode if regression-free; tighten lint configuration in staged passes. | QA-001 | `lint`, `typecheck`, and `build` are separately documented and fail CI on regressions. |
| OPS-002 | CommandCode DeepSeek | Create CI workflow for lint, typecheck, unit tests, build, dependency audit, and secret/tracked-file checks. No deployment credentials or migration execution. | BUILD-001 | Pull requests cannot merge while a required check fails; workflow uses least privileges. |
| OPS-003 | Codex | Configure security headers, private-route indexing policy, CSRF/origin strategy, structured audit-failure visibility, and free-tier monitoring/runbook. | AUTH-001; OPS-002 | Security-header and mutation-origin tests pass; audit write failures are observable without recording unnecessary PII. |

## Wave 3 - Supabase Postgres And Private Storage

| ID | Suggested owner | Exact scope | Dependencies | Required acceptance evidence |
|---|---|---|---|---|
| DATA-002 | Codex | Decimal-safe money arithmetic/serialization, database-neutral dashboard/report queries, and Postgres enum compatibility are complete and type-validated. Runtime schema activation and private storage remain open. Do not point Vercel to Staging until the remaining checks pass. | DATA-001; PAY-001 | The app builds and passes its full suite against the Postgres client; Staging browser/role tests pass before any Vercel environment changes. |
| DATA-003 | Gemini 3.1 Pro High after Codex approval | Build repeatable local SQLite-to-Postgres import and reconciliation tooling using synthetic/sanitized data only. | DATA-002 | Table counts, financial totals, foreign keys, Unicode, and login-hash checks reconcile; tool has idempotency/rollback guidance. |
| DATA-004 | Codex + project owner | Provision Supabase Staging and Pilot Production, private buckets and policies, and run backup/restore rehearsal without damaging shared Staging. | DATA-002; DATA-003 | Signed URL/access tests pass; encrypted backup and independently verified restore evidence exist. |
| OPS-004 | Codex + project owner | Configure Vercel Preview to sanitized shared Staging and Production to Pilot Production; configure environment separation, Resend outbox/reconciliation, custom domain, and daily Cron only where necessary. | OPS-002; DATA-004 | Preview cannot migrate data; production variables are not in Git; smoke test passes on the restricted pilot release. |

## Wave 4 - P1/P2 Quality And Product Work

| ID | Suggested owner | Scope | Priority |
|---|---|---|---|
| APP-001 | CommandCode DeepSeek | Fix navigation history so `goBack()` supports a true stack; add route-state tests. | P1 usability |
| APP-002 | CommandCode DeepSeek | Bound and validate search parameters, normalize API error handling, and add tests. Authorization filtering remains AUTH-002. | P1 privacy/reliability |
| APP-003 | Claude Sonnet/Kiro Claude | Remove fees summary double scans; add query/index-aware performance tests without changing financial behavior. | P2 performance |
| APP-004 | CommandCode DeepSeek | Centralize React Query defaults/stale times and add DevTools only to development. | P2 maintainability |
| APP-005 | Codex | Define audit data minimization, retention, and access policy before adding IP/user-agent data or richer audit context. | P2 governance |
| APP-006 | Product owner + implementation agent | Prioritize HTML email design, City Head dashboard, guardian payment history, participant address UI, Auth.js v5, service-worker cache versioning, and response-type cleanup after pilot stabilization. | Post-pilot |

## Execution Sequence

1. Complete Wave 0 without exposing or changing real data through agents.
2. Codex delivers AUTH-001 and AUTH-003; no route-by-route authorization implementation starts first.
3. Run non-overlapping Wave 1 tasks, one implementation branch per task, then require Codex review.
4. Start QA-001 in parallel only after the authorization test contract is defined; start BUILD-001/OPS-002 after the test command exists.
5. Do not begin DATA-002 through OPS-004 until all P0 tests, build gates, and migration design approval are complete.
6. Freeze new feature work until the restricted pilot passes the release gates in the improvement plan.

## Codex Approval Checklist Per Task

- No secret, PII, or production data exposure.
- No unauthorized cross-scope read or mutation path introduced.
- Tests cover both allow and deny cases.
- Schema/data changes include forward migration, backup, and recovery implications.
- Deployment changes work within the free-tier pilot limits.
- Changed-file scope matches the assigned ticket; unrelated changes are not included.
