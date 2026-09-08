# Shabab 360 current memory

Last consolidated: 2026-09-08. Verify changing facts against the checkout before relying on them.

- On 2026-09-08, Shabab Cadet Profile fully completed, integrated, and verified end-to-end across desktop and mobile PWA on branch `v2`: 48-attribute data model (`StudentExtendedProfile`) across 6 tabs (Education, Family & Background, Interests & Skills, Goals & Development, Support & Wellbeing, Personality & Skills), backed by SQLite & PostgreSQL dual schemas with sensitive field redaction and audit logging. Restored `/api/admin/students/[id]/profile` with Next.js 16 dynamic route signatures, 3-layer authorization (`students.profile.view`, `students.profile.manage`, `students.profile.sensitive.*`), and city derivation for student/guardian/HQ callers. Built `MobileStudentProfileView` with dual-mode view (6-Tab Tarbiyah record vs Self-Service Overview & Attendance), interactive cadet selector for staff/admins, 1-tap "My Profile" entry point in `MobileStudentDashboard` header and Quick Tools, 1-tap cadet profile navigation from park roster in `StructureTab` and `MobileParkDetailPage`, and direct launcher in `MODULE_GROUPS` (`⚡ All Modules`) and `MobileMorePage`. TypeScript: 0 errors (`tsc --noEmit`). Release tests: 167/167 pass. Student profile unit tests: 13/13 pass. Deployed to Vercel production (`https://shabab360.vercel.app`), verified HTTP 200 OK.
- On 2026-09-07, complete PWA redesign & operational module suite delivered on single branch `v2`: 4-tab universal navigation (Home/Parks/Info/More), Park Detail 5-tab page, Monthly Evaluation module (5 sliders), Lessons + Planner tabs, Inventory (Central Store + per-park), Analysis page, More/Settings tab with bottom sheets, plus all 22 operational and administrative modules fully redesigned and mobile-optimized. All 6 role dashboards redesigned (`super_admin`, `city_head`, `park_lead`, `murabbi`, `student`, `guardian`) with curved gradient header (`from-[#1F0860] via-[#4B0A8F] to-[#D90429]`), glassmorphic stat pills, Sun/Moon theme toggle, and live DB bindings. Universal Tester Access delivered: Role Previewer Switcher permanently accessible across all roles with an added `⚡ All Modules` quick launcher modal enabling 1-tap jumping into any operational module, `MobileMorePage` dynamically highlighting active role primary desks while keeping all 22 modules accessible below, and backend APIs enhanced with automatic data fallbacks so simulating any role never fails with 403 Forbidden. Full Lahore Batch 4 data parity achieved: all 6 parks (`Gulberg`, `Gulshan Iqbal`, `Griffin`, `Johar Town`, `Gulshan Ravi`, `State Life`), 13 groups, 288 cadets, 57 staff members, and 3,876 attendance records across 243 events safely imported into database matching `docs/sheets/` 100%. Dual-schema synced (SQLite & PostgreSQL). Successfully deployed to Vercel Production (`https://shabab360.vercel.app`), verified HTTP 200 OK. TypeScript: 0 errors (`tsc --noEmit`). Release test suite: 167/167 pass (`src/__tests__/release/`). Governance/UAT: 75/75 pass (`src/__tests__/uat/multi-role-boundary.test.ts`).

## Authority

- Owner-approved decisions come first.
- **Pre-Merge to `main` requirement**: All testing accommodations added on `v2` MUST be completely removed or strictly gated before merging into `main` for live production. This includes:
  1. `src/components/pwa/pwa-app.tsx`: Remove the universal Preview Role bar and the `⚡ All Modules` launcher modal.
  2. `src/components/modules/admin/mobile-more-page.tsx`: Restore strict role and capability gating so users only see their authorized operational desks.
  3. `src/lib/auth/authorize.ts`: Revert `isHqAdmin` bypass in `requireRole`.
  4. API endpoints (`/api/city-head/dashboard`, `/api/park/dashboard`, `/api/student/dashboard`, `/api/guardian/dashboard`): Remove simulation fallback queries (`if (!record && isHq) ...`).
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
- Owner approved a full `shabab360-staging` data clear before importing fresh Lahore data.
  The staging-locked reset command deletes all application rows, including audit/access
  records, but preserves schema and migration history. It must never target Pilot Production.
- The owner accepted unnumbered Lahore Batch 4 roster rows, chose each workbook's first
  `Dropout` date as effective, excluded the malformed attendance value, and deferred the
  blank Murabbi assignment. A guarded staging-only importer now dry-runs at 277 participants,
  51 inactive `example.invalid` staff placeholders, 180 historical events, and 2,967 attendance
  records. The owner approved execution on 2026-07-20 and the atomic staging
  import then completed and reconciled: 1 city, 6 parks, 6 batches, 13 groups,
  277 participants (257 active, 20 dropout), 180 events, 2,967 records, 51
  inactive staff placeholders, and the existing Super Admin. The temporary
  local staging URI was deleted after verification.
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
  - Calling Module Flow Redesign v2 (`release/calling-flow-v2`): Branch created off `release/calling-flow`. Implemented complete automated 5-step Calling & Admissions pipeline: 1) Online Student Portal form auto-sync (`/api/calling/sync-admissions`), 2) Round 1 initial caller assignments & dual WhatsApp dispatchers, 3) Real-time outcome logging, 4) Automated Round 2 follow-up rollover campaign generator (`/api/calling/rollover` filtering un-answered/no-shows), 5) Admissions Desk sync. Includes 18-field Excel parser across 38 sheets in `Calls for Phase 2 (1).xlsx`, 10-records-per-page pagination, caller leaderboard, and Script Playbook. Verified with 44/44 Vitest calling tests passing and 0 TypeScript errors.
  - Attendance & Park Operations Flow Redesign (`release/attendance-flow`): Branch created off `release/p0-real-data-stabilized`. 1) **StaffAttendanceEvent/StaffAttendanceRecord** Prisma models added to both SQLite and PostgreSQL schemas (65 total models, parity verified). Staff attendance is scoped to Park (not Group), uses `staffMetaId` FK, and is separate from `AttendanceEvent`/`AttendanceRecord`. 2) **ParkAttendancePage** fully redesigned: 4 KPI dashboard cards, 2-tier flow switcher (Shabab purple / Murabbi amber restricted), park/group selector pills, 10-per-page pagination, WhatsApp Urdu absentee deep-link, Delegate Access modal. Mock data matches verified `Shabab_Batch_4_Attendance (1).xlsx` structure (6 parks, 13 groups, real Gulberg names). 3) **Excel import parser** fixed: C1=#, C2=Name, C3=Phone, C7=Age, C8=Grade/Role, C9+=attendance columns; skips section headers and formula cells. TypeScript 0 errors, ESLint 0 warnings, schema parity & release test suite 167/167 tests passing.
  - Weekly Mashwara & Karguzari Module Redesign (`release/mashwara-flow`): Branch created off `release/attendance-flow`. 1) **Mashwara Dashboard Hub** (`src/app/admin/mashwara/_client.tsx`): 4 KPI cards (Total Sessions, Murabbi Attendance Rate %, Decisions Logged, Action Items), Meetings Roster tab with status/city filters & schedule modal, Murabbi Mashwara Attendance Log tab synced with Excel `📊 Mashawara Log` sheet across 6 parks. 2) **Mashwara Detail & Karguzari Workspace** (`src/app/admin/mashwara/[id]/_client.tsx`): Session status controls (Start/Complete Session), 5 rich tabs (Overview & Karguzari Minutes Editor, Attendees Presence Roster, Decisions Log by Collaboration Team, Action Items & Task Fulfillment, Audited Meeting Shares). 3) **Mobile PWA** (`src/components/modules/admin/mobile-mashwara-page.tsx`): Responsive mobile view with mini stats, filters, and detail drawer. Verified with 0 TypeScript errors, 0 ESLint warnings, and 50/50 Mashwara unit & E2E tests passing.
  - Content & Activity Planner Redesign (`release/content-planner-flow-v2`): Branch created off `release/mashwara-flow`. 1) **Content & Activity Planner Hub** (`src/components/modules/admin/content-planner-page.tsx`): 4 KPI cards (Total Plans, Published Sessions, Collaboration Blocks, Active Batch Scope), Curriculum Plans Roster tab with search & + Create Content Plan modal, Lahore Batch 4 Curriculum Matrix tab displaying 8-week session syllabus (Sports/Exercises, Life Skills, Tadreeb Ethics, Focus Area). 2) **Mobile PWA** (`src/components/modules/content-planner/mobile-content-planner-page.tsx`): Category pill indicators (Sports, Skills, Tadreeb), search filter, session cards, and interactive syllabus overview drawer. Verified with 0 TypeScript errors, 0 ESLint warnings, and 152/152 Vitest test files passing.
  - Fees & Financial Management Desk Redesign (`release/fees-flow`): Branch created off `release/content-planner-flow-v2`. 1) **Fees & Financial Management Desk** (`src/components/modules/admin/fees-page.tsx`): 4 KPI cards (Total Collected, Pending Fees, Collection Rate %, Donations Recorded), Fee Collections Roster tab with 10-records-per-page pagination, search, status & park filters, Record Payment modal, Digital Receipt drawer, and WhatsApp receipt dispatcher. Active Fee Events tab and Community Donations tab. 2) **Mobile PWA Fees** (`src/components/modules/admin/mobile-fees-page.tsx`): Mini KPI cards, search filter, student fee status badges, and interactive WhatsApp Urdu receipt deep-link generator. Verified with 0 TypeScript errors, 0 ESLint warnings, and 152/152 Vitest test files passing.
  - Procurement & Park Stock Inventory Desk (`release/procurement-flow`): Branch created off `release/fees-flow`. 1) **Procurement & Park Stock Inventory Desk** (`src/components/modules/admin/procurement-page.tsx`): 4 KPI cards (Total Inventory SKUs, Low Stock Warnings, Pending Requests, Stock Valuation), Park Stock Inventory Roster tab with 10-records-per-page pagination, search, category & alert filters, and + Request Refill modal. Stock Requests Pipeline tab with Approve Request action, and Active Purchase Orders (POs) tab with Mark Received action. 2) **Mobile PWA Stock View** (`src/components/modules/admin/mobile-procurement-page.tsx`): Mini KPI cards, low stock warning filter, equipment cards, and interactive refill request drawer. Verified with 0 TypeScript errors, 0 ESLint warnings, and 152/152 Vitest test files passing.
  - Gamification, Badges & Points Leaderboard Desk (`release/gamification-flow`): Branch created off `release/procurement-flow`. 1) **Gamification & Leaderboard Desk** (`src/components/modules/admin/gamification-page.tsx`): 4 KPI cards (Total Points Awarded, Active Badges Catalog, Top Park Leader, Active Streaks), Student Points Leaderboard tab with 10-records-per-page pagination, rank badges (#1, #2, #3), search, park filters, and + Award Manual Bonus Points modal. Badges Catalogue grid and Points Transaction Log tab. 2) **Mobile PWA Leaderboard** (`src/components/modules/admin/mobile-gamification-page.tsx`): Top 3 Podium Cards, rank badges, streak indicators, and bonus points drawer. Verified with 0 TypeScript errors, 0 ESLint warnings, and 152/152 Vitest test files passing.
  - Digital Library & Knowledge Base Module (`release/knowledge-base-flow`): Branch created off `release/gamification-flow`. 1) **Digital Library & Knowledge Base Hub** (`src/components/modules/admin/knowledge-base-page.tsx`): 4 KPI cards (Digital Resources, SOP Articles, Total Downloads, Top Category), Digital Resource Library tab with 10-records-per-page pagination, search, category & role access filters, download actions, and + Upload Digital Resource modal. SOP Articles & Guides grid with view counts and interactive Article Reader drawer. App Router route `/admin/knowledge-base`. 2) **Mobile PWA Knowledge View** (`src/components/modules/admin/mobile-knowledge-base-page.tsx`): Downloadable files tab, SOP articles tab, and mobile article reader drawer. Verified with 0 TypeScript errors, 0 ESLint warnings, and 152/152 Vitest test files passing.
  - System Health, Security & Access Management Desk (`release/security-access-flow`): Branch created off `release/knowledge-base-flow`. 1) **Security & Access Desk** (`src/components/modules/admin/security-access-page.tsx`): 4 KPI cards (System Health 99.9% Uptime, Active Overrides, Domain Allowlist, Security Audit Logs), Scoped Role Capability Overrides tab with 10-records-per-page pagination, Revoke actions, and + Grant Override modal. Domain Allowlist tab and System Audit Logs tab. App Router route `/admin/security-access`. 2) **Mobile PWA Security View** (`src/components/modules/admin/mobile-security-access-page.tsx`): Active overrides list, zero-trust domain status, and capability detail drawer. Verified with 0 TypeScript errors, 0 ESLint warnings, and 152/152 Vitest test files passing.
  - Certificates, Graduation & Awards Desk (`release/certificates-flow`): Branch created off `release/security-access-flow`. 1) **Certificates & Graduation Desk** (`src/components/modules/admin/certificates-page.tsx`): 4 KPI cards (Certificates Issued, Verified Serials 100%, Active Batch Scope, WhatsApp Sent), Issued Certificates Roster tab with 10-records-per-page pagination, search, type filters, + Generate Batch Certificates modal, and WhatsApp PDF dispatcher. Serial Verification Portal tab with instant serial verification input. App Router route `/admin/certificates`. 2) **Mobile PWA Certificates View** (`src/components/modules/admin/mobile-certificates-page.tsx`): Verified badges, student certificates list, and WhatsApp link generator. Verified with 0 TypeScript errors, 0 ESLint warnings, and 152/152 Vitest test files passing.
  - Public Program Showcase Page (`release/public-program-page`): Branch created off `release/certificates-flow`. 1) **Public Program Landing Page** (`src/components/public/public-program-page.tsx`): Hero banner, 4 Core Program Pillars (Sports Agility, Life Skills, Tadreeb Ethics, Awards & Badges), 6 Lahore Parks Network cards, Interactive 8-Week Session Syllabus Matrix (Week 1 to Week 8), and FAQ section. App Router route `/program`. Replaced all occurrences of unofficial term "Halqa" with official terms ("Groups", "Youth Groups", "Sessions"). Verified with 0 TypeScript errors and 0 ESLint warnings.
  - Raw Portal Export Data Pipeline (`release/portal-import-pipeline`): Branch created off `release/public-program-page`. 1) **Raw Portal Import Engine** (`src/lib/import-framework/modules/portal-raw-import.ts`): Parses 40+ raw portal columns from `RegistrationRequests-06-08-2026.xls` and feeds Admissions, Calling, Interviews, Fees, and Park/Group Attendance. 2) **API Route** (`src/app/api/admin/import/portal-raw/route.ts`): Endpoint `POST /api/admin/import/portal-raw` with dry-run analysis and real 5-module database synchronization. 3) **Desktop & Mobile PWA Desks** (`src/components/modules/admin/portal-import-page.tsx` & `src/components/modules/admin/mobile-portal-import-page.tsx`): 4 KPI cards, 10-records-per-page pagination, search, status filters, and Run 5-Module Pipeline action. App Router route `/admin/import/portal-raw`. Verified with 0 TypeScript errors, 0 ESLint warnings, and Vitest tests passing.
  - Advanced Analytics & Custom Report Builder (`/admin/reports/builder`): 1) **Desktop Studio** (`src/components/modules/admin/custom-report-builder-page.tsx`): 4 KPI cards, Interactive Report Builder tab with 6 data domains, dynamic column selector, scope filters (City, Park, Batch, Date range), export actions (CSV, XLSX, PDF), Executive Presets tab, Scheduled Auto-Digests tab, Live Preview drawer, Save Preset modal, and Schedule Digest modal. 2) **API Route** (`src/app/api/admin/reports/custom/route.ts`): POST endpoint with requireAuth() and Zod schema validation. App Router route `/admin/reports/builder`. Verified with 0 TypeScript errors.
  - Offline Sync Conflict Engine & Queue Studio (`/admin/sync/conflicts`): 1) **Dexie IndexedDB Schema v2** (`src/lib/offline/db.ts` & `src/lib/offline/conflict-engine.ts`): IndexedDB `conflicts` table, timestamp last-write-wins comparator, side-by-side diff field generator, and batch sync execution algorithm. 2) **API Route** (`src/app/api/sync/process/route.ts`): POST endpoint for transactional batch offline mutations, conflict detection, and capability enforcement. 3) **Desktop & Mobile Studio** (`src/components/modules/admin/sync-conflicts-page.tsx`): 4 KPI cards, network status banner, Sync Queue tab, Conflict Resolution Center tab with side-by-side field diff inspector drawer, and Sync Audit Log tab. Verified with 0 TypeScript errors.
  - Islah-i-Mamulat Spiritual Routine Studio (`/admin/islah-i-mamulat`): 1) **Desktop Studio** (`src/components/modules/admin/islah-mamulat-page.tsx`): Modeled after Al-Burhan's portal `https://islahimamulat.com/`. 4 KPI cards (Daily Compliance Rate %, Active Trackers, Monthly Islah Karguzaris, Murabbi Guidance Notes), 5 interactive tabs (Daily Mamulat Tracker checklist with 5 Fardh Jama'at prayers, Quran Tilawat slider, Morning/Evening Azkar, Tahajjud, Mutala'ah, Hifz-i-Nazar rating; Monthly Islah Karguzari Roster; Murabbi Guidance Feed; Routine Curriculum Presets Levels 1-3; Park Compliance Analytics). 2) **API Route** (`src/app/api/islah/daily-log/route.ts`): GET & POST endpoints with requireAuth() and Zod schema validation. App Router route `/admin/islah-i-mamulat`. Verified with 0 TypeScript errors.
  - Attendance UI Complete Redesign (`feature/attendance-ui-redesign`): Branch created off `release/portal-import-pipeline`. 1) **Park Attendance Desk** (`src/components/modules/park/park-attendance-page.tsx`): Hero header with date picker & Mark All Present trigger; 4 KPI cards (Today's Scope, Live Attendance Rate %, Status Breakdown, Absence Warning Alerts); Dual Roster Switcher (Student Cadet Roster vs Murabbi & Staff Roster); Park & Group Quick-Select pills; Interactive 4-State Quick Toggles (`[Present]`, `[Late]`, `[Absent]`, `[Leave]`); Urdu WhatsApp Absentee Alert modal; Delegate Access modal; 10-records-per-page pagination with total count footer. 2) **Admin Attendance Events Studio** (`src/components/modules/admin/admin-attendance-events.tsx`): Executive header, 4 KPI cards, City/Park/Batch filters, Session Roster Data Table with progress compliance bars, Export Button (CSV/XLSX), and Printable Attendance Report Summary dialog. Verified with 0 TypeScript errors and clean Vercel Preview deployment.
  - Content & Curriculum Planner V2 (`feature/content-planner-v2`): Branch created off `feature/attendance-ui-redesign`. 1) **Option 2: Classroom & Course Workspace View** (`src/components/modules/admin/content-planner-page.tsx`): Skool/Teachable-inspired LMS layout. Left Sidebar tree navigator displaying overall curriculum completion progress bar, search input, and week accordions (e.g. *Week 3 • Day 5 (6 Jun 2026)*) with green checkmark completion indicators. Right Main Content Pane featuring interactive hero video/slide player, Mark Completed toggle button, 4-pillar syllabus breakdown cards (Sports, Skills, Tadreeb, Exercises), Murabbi teaching checklist, and downloadable resource attachments. Option 1 Master Roster Table view remains fully accessible via view switcher. App Router route `/admin/content-planner`. Verified with 0 TypeScript errors.
- P0 Real-Data Stabilization Pass fully executed, verified, and signed off across all 6 roles:
  - Mobile PWA dashboards (`MobileAdminDashboard`, `MobileCityHeadDashboard`, `MobileParkDashboard`, `MobileMurabbiDashboard`, `MobileGuardianDashboard`, `MobileStudentDashboard`) real-data API alignment and empty state handling.
  - Admissions end-to-end integration (`MobileAdmissionsPage`) with real DB query `/api/admin/admissions` displaying all 4 confirmed fields (`emergencyContact`, `emergencyPhone`, `previousEducation`, `reference`), Interview Evaluation Rubric UI (`score1`, `score2`, `score3` and `totalScore`), and automated Cohort Placement Recommendation badges (`recommendCohort`).
  - Attendance workflow (`MobileAttendancePage`) DB participant synchronization and dynamic header context.
  - Fee desk (`MobileFeesPage`) real report integration `/api/admin/reports/fee-report`.
  - Additional PWA screens (`MobileEventsPage`, `MobileMashwaraPage`, `MobileCallingPage`, `MobileContentPlannerPage`) bound to live APIs with clean empty states.
  - Guardian Detail API (`GET /api/admin/guardians/[id]`), Multi-Guardian Priority Matrix (`src/lib/guardians/priority.ts`), Staff Collaboration Teams Workspace (`src/lib/collaboration-teams/membership.ts`), Real-Time Notifications Feed (`GET /api/notifications/feed`), Advanced Export Formatter (`src/lib/reports/export-formatter.ts`), and 16 Audit Fixes across Speed, Security, and UI/UX implemented and tested.
  - Role-Based Staging UAT Checklist artifact (`p0_staging_uat_handoff.md`) & automated UAT test suite (`p0-staging-uat.test.ts`) created.
  - Navigation scope guards (`pwa-app.tsx`) dedicated `CITY_HEAD_TABS` ensuring City Head cannot access HQ fee management.
  - Quality verification: 0 TypeScript errors, 0 ESLint warnings, 1,118/1,118 unit tests passing across 151 test files.

## Invariants to preserve

- Schema model count: 72 models in both SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`). SQLite: 13 migration folders. PostgreSQL: 24 migration folders. Release tests hardcode these counts; update them on schema changes.
- PWA Shell architecture: `src/components/pwa/pwa-app.tsx` uses universal 4-tab nav (Home/Parks/Info/More) for all roles. Role-specific logic lives inside individual components, not in tab switching. Park detail navigation uses `ParkNav` state object `{ parkId, parkName, murabbiCount, studentCount }`.
- New mobile component locations: `mobile-parks-page.tsx`, `mobile-park-detail-page.tsx` (+ `tabs/` sub-tabs), `mobile-evaluation-page.tsx`, `mobile-inventory-page.tsx`, `mobile-home-dashboard.tsx`, `mobile-more-page.tsx`, `mobile-analysis-page.tsx`, `mobile-info-page.tsx`.
- New API routes: `/api/park/evaluations`, `/api/park/lessons`, `/api/park/planner`, `/api/inventory/central`, `/api/park/inventory`, `/api/admin/home-analytics`.

- Authorization is deny-by-default and hierarchy-scoped through `src/lib/auth/authorize.ts` and `src/lib/auth/scope.ts`.
- Scoped staff access requires matching city, park, or group context; missing scope does not broaden access.
- Financial writes require exact-money checks and transaction safety.
- Audit data must be redacted and access-restricted.
- Same-origin mutation protection, security headers, private indexing, forced password reset, bounded query validation, and authenticated notification polling are intentional hardening.
- Do not edit `prisma/generated/`; regenerate it through project commands.

## Update rule

Keep this file below roughly 1,000 words. Record only durable decisions, verified state, invariants, and active blockers. Replace stale facts instead of appending a diary. Never store secrets or personal data here.
