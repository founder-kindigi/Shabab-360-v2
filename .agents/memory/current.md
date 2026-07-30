# Shabab 360 current memory

Last consolidated: 2026-07-18. Verify changing facts against the checkout before relying on them.

## Authority

- Owner-approved decisions come first.
- Use `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md` for day-to-day planning.
- Current code plus fresh tests, browser, database, or deployment evidence outranks older implementation claims.
- `worklog.md` is historical evidence, not an always-loaded prompt.

## Verified baseline

- Stack: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Prisma, NextAuth, TanStack Query, Zustand, Dexie, Zod, and Vitest.
- Runtime database: SQLite through `prisma/schema.prisma`.
- Staged deployment database: PostgreSQL through `prisma/postgres/schema.prisma`; the production-oriented build is `npm run build:postgres`.
- Authentication uses NextAuth credentials, bcrypt, and Prisma. Older Supabase Auth/RLS descriptions do not match the current checkout.
- Core role-aware portals, operational APIs, and offline attendance foundations exist. Treat additional capabilities in older documents as unverified until confirmed in code.
- Read-only browser UAT opened all eight demo roles on 2026-07-16; visible portal
  boundaries matched their intended scope. `UAT-001` remains pending for
  state-changing security checks, denial checks and owner acceptance.
- Forced-reset UAT found and corrected an invalid-session client-state defect:
  successful resets now sign out before reauthentication instead of showing
  `Access Pending`. Focused reset tests, lint, typecheck, the full 131-test
  suite and the PostgreSQL production build passed; the SQLite client was then
  restored. Post-fix live browser completion remains pending because the local
  browser connector became unavailable after its plugin update. On 2026-07-18
  the in-app browser again stopped activating controls, while Chrome fallback
  was unavailable because its local Codex plugin/native-host registration was
  missing; reinstall that plugin before remaining state-changing UAT.
- On 2026-07-16, the owner rotated the database passwords for the staging and
  pilot-production Supabase projects. Old connection strings must not be used;
  replacement configuration remains owner-private. The approved Git history
  cleanup was then force-pushed to GitHub `main` from a verified isolated
  mirror. `NEXTAUTH_SECRET` and any historic third-party credentials still
  require rotation or revocation. The active dirty checkout remains on the
  pre-rewrite base and must be migrated without resetting its in-progress work.
- Owner-approved organization model: staff have a canonical access role
  (`murabbi`, `park_lead`, or `park_admin`, etc.) plus zero or more collaboration
  team memberships in Sports, Skills, Tadreeb, Media, and Muawin. Teams hold
  documents, activity planning, and discussions, but are not login roles and
  never expand hierarchy scope. Senior/Junior cohorts are an optional city-level
  configuration, not a global requirement. Access Management provides an
  auditable Super Admin role-permission matrix for approved module, feature, and
  action capabilities plus named-user grant/revoke overrides. These configurable
  permissions never bypass server-enforced city, park, or group scope; new
  capability codes require reviewed code and route gates, not free-text runtime
  names. City Head city-scoped override management is a future separately-tested
  delegation. The current single staff assignment does not fully represent this
  target. Batches are city-owned and groups link one batch to one park in the
  same city; migration and API checks must preserve that invariant.
- Access Management AM-001 through AM-005 are locally verified: controlled
  capability catalogue, aligned override schemas/migration, fail-closed
  resolution, transactional APIs, Super Admin workspace, and capability
  enforcement alongside hierarchy scope.
- AM-004 browser UAT completed on 2026-07-18. Role and named-user
  create/audit/revert/revoke flows pass, optional expiry persists and is visible,
  effective reads exclude revoked/expired rows, and local cleanup confirmed zero
  active role or user exceptions. Lint, typecheck, and all 231 tests pass.
- AM-005 is complete. Capability gates now cover admissions, attendance,
  certificates, finance and receipts, organization, dashboards, reports,
  announcements, notification-queue administration, audit, staff listing,
  scope changes and provisioning, access administration, students, guardians,
  bulk student/guardian imports, family-portal reports/schedules, Murabbi
  groups, staff search, and member-directory/roster APIs while retaining
  hierarchy scope checks. Attendance-event detail and certificate
  routes now fail closed on wrong or missing scope. Super Admin and `access.*`
  role defaults remain
  immutable, and named-user overrides cannot target access-administration
  capabilities. Password reset, own profile, targeted announcement polling,
  and personal read acknowledgement remain intentional self-service
  exemptions. Activity history is own-action-only outside HQ; global HQ access
  requires `audit.view`, and sensitive audit fields are excluded. On 2026-07-18
  lint, typecheck, 230 tests, and the
  PostgreSQL production build passed; the SQLite client was restored afterward.
- Guardian linking lookup now requires a complete exact phone number, handles
  common Pakistan local/international forms, returns at most one active match,
  masks the phone, and no longer exposes CNIC or address.
- No access-management migration has been deployed. AM-006 now has a versioned,
  non-writing Lahore Batch 4 parser with focused tests. Its initial report found
  254 numbered roster rows plus 23 unnumbered populated candidates, conflicting
  with the prior 255-student summary; 51 staff rows requiring nominations; 79
  missing phones; and source age/grade fields without approved destinations.
  The owner confirmed attendance through 2026-07-19 and approved retention of
  age and grade/class. Nullable Participant `age` and `gradeClass` application
  support plus a forward PostgreSQL migration are locally verified, but no
  database schema or real data has been written. The corrected 2026-07-19
  cutoff dry run reconciles 181 proposed events and 2,942 records with zero
  writes; 46 blocking decisions remain, principally 23 unnumbered roster
  candidates, 20 dropout decisions, one malformed value, blank Murabbi scope,
  and schema deployment. Staff/mapping decisions remain required before staging.
- A reviewed PostgreSQL-only `bootstrap:super-admin` command is available but has
  not been executed. It defaults to no writes; actual creation requires explicit
  execution and credential-reveal acknowledgement, refuses duplicate email or
  Super Admin records, forces a password reset, and records no credentials in audit data.
  Owner-approved deletion/replacement additionally requires its own explicit execution flag;
  it preserves audit rows but nulls their prior actor reference.
- Lahore Batch 4 is now reconciled from the supplied current workbook, never replaced wholesale.
  The last complete session is 2026-07-26 (all 6 parks and 13 groups); later isolated future-dated
  Leave values are not attendance sessions. A non-writing parser correction excludes 14 formula-derived
  summary rows that had been misidentified as people, leaving 12 genuine unassigned candidate students.
  Owner decisions: preserve those students without a group after a nullable-group migration; defer the
  missing Murabbi; ignore the malformed value; preserve existing data and upsert only reviewed additions.
  Dropout will support an audited manual student-profile action and a configurable disabled-by-default
  automatic policy of three consecutive completed absence weeks. Configured weekend/off days do not count.
  Student, Murabbi, and class summaries must be calculated from normalized records; Murabbi summaries
  require separate staff-attendance records rather than student attendance rows.
- The additive collaboration-team migration is deployed to staging. Lahore now
  has Sports, Skills, Tadreeb, Media, and Muawin teams with zero memberships.
  Team membership is intentionally separate from login role/scope, and no
  placeholder staff account was activated.
- The Batch 4 content workbook is the approved source for a Lahore template
  plus a State Life School park override. The owner will map staff into the
  five collaboration teams in the portal; no workbook-based membership
  inference is allowed. No planner rows have been written to staging.
- Calling-system policy is approved: Calling POC is a time-bounded Mashwara or
  event responsibility, not a permanent city post or login role. The POC assigns
  leads to approved Shabab callers. Rare cross-department help uses an
  expiry-bound External Support Caller workspace with only explicitly assigned
  leads, never general Shabab portal access. Pilot helper authentication uses
  the existing email/password invite and forced first-login reset; OTP is
  deferred. WhatsApp is manual via approved deep-link templates, unsuccessful
  lead history retains for 12 months,
  referral categories are catalogue-managed, and City Head CSV exports are
  audited. Event teams such as Security, Parking and Welcome are also temporary
  operational teams/titles, never login roles.
- Weekly Mashwara is an approved future module: scoped recurring meetings,
  attendance where needed, Karguzari/MoM, decisions and collaboration-team
  action items. It requires immutable review/audit behavior and never lets team
  membership expand hierarchy scope. All active city team members receive
  restricted participant access to city-scoped Mashwara. City Heads/HQ may
  grant a revocable, audited, meeting-specific share to a selected same-city
  active team member without changing general scope.
- Owner delivery order: first perform a real-data stabilization pass over the
  existing Lahore-backed roles, workflows, UI, errors, scope boundaries, and
  operational gaps. Record retain/remove/modify findings and complete staging
  UAT before beginning broad redesigns, new modules, or later product fixes.
- Confirmed role boundary: City Head has no Cities access and may manage only
  Park Leads, Park Admins, and Murabbis in the assigned city. Park Lead sees
  groups and manages attendance in the assigned park; Park Admin marks only
  assigned-park attendance; Murabbi marks only the assigned group. Capability
  defaults and individual overrides remain Super Admin-only.
- Stabilized City Head and park creation boundary: park creation API POST route is implemented;
  Admissions, Students, Guardians, Reports, and People listing/mutation endpoints are secured
  under City Head assignedCityId scoping filters. ESLint, typecheck, and all 258 tests pass.

## Invariants to preserve

- Authorization is deny-by-default and hierarchy-scoped through `src/lib/auth/authorize.ts` and `src/lib/auth/scope.ts`.
- Scoped staff access requires matching city, park, or group context; missing scope does not broaden access.
- Financial writes require exact-money checks and transaction safety.
- Audit data must be redacted and access-restricted.
- Same-origin mutation protection, security headers, private indexing, forced password reset, bounded query validation, and authenticated notification polling are intentional hardening.
- Do not edit `prisma/generated/`; regenerate it through project commands.

## Update rule

Keep this file below roughly 1,000 words. Record only durable decisions, verified state, invariants, and active blockers. Replace stale facts instead of appending a diary. Never store secrets or personal data here.
