# Shabab 360 — Module Completion Status

**Generated:** 2026-10-01  
**Branch / working tree:** `v2` (dirty; many local candidates unmerged)  
**Authority order:** current code + tests → `docs/delivery/state.json` → `.agents/memory/current.md` → baseline matrix (2026-09-11) → master blueprint  

**How to read this document**

| Status | Meaning |
| --- | --- |
| **Done (local)** | Bounded delivery slice lead-accepted locally. Not independent release, merge, or production approval. |
| **In progress** | Active or substantial work exists; module definition of done not closed. |
| **Partial** | Real code/UI/API exist; material features, policy, import, or UAT remain open. |
| **Queued** | Delivery task exists; not started or paused behind dependencies. |
| **Blocked / gated** | Owner policy, production path, or explicit 503/unavailable gate stops completion. |
| **Scaffold-only** | UI shell and/or unavailable API only; no durable product lifecycle. |
| **Deferred** | Explicitly postponed (e.g. desktop/tablet modes). |

**Global caveats**

- Almost no module is production/UAT complete. “Done (local)” ≠ release.
- Gemini/DeepSeek packets prepared ≠ work dispatched or integrated unless a handoff says so.
- Source workbooks (57 sheets) are **mapped**, not fully **imported** as a finished product path.
- Production bootstrap (PostgreSQL connection, approved import/provisioning, backup/restore) remains incomplete for live ops.
- Active pointer in `state.json` may lag owner reprioritizations; task packets + memory override stale “active” labels when they conflict.

**Delivery task roll-up** (`docs/delivery/state.json`, updated 2026-10-01)

| Task | Module | Status |
| --- | --- | --- |
| D00 | Delivery setup | Done |
| BASE-01 | Baseline intake (35 caps, 57 sheets) | Done |
| C0–C3 | Main/v2 consolidation packages | Done (local lead; unmerged / no independent release) |
| N01 | Notifications | In progress / blocked after in-app slice |
| O01 | Organisation, accounts, people, profiles | Done (local) |
| U01 | People placement (nullable group) | Done (local) |
| MTI-01 | Murabbi training induction + registration forms | Done (local integration) |
| M01 | Production migration readiness | Queued |
| A02 | Admissions placement recommend | Queued |
| ATT01 | Group-session attendance | Queued in state; large local body of work; **production bootstrap blocked** |

---

## 1. Platform & delivery foundations

### 1.1 Delivery setup (D00)
- **Status:** Done  
- **Built:** Workflow plan, skills, hooks, coordination checks, delivery docs.  
- **Remaining:** Ongoing use only; not product scope.  
- **Evidence:** `docs/delivery/PLAN.md`, `docs/delivery/SETUP_VERIFICATION.json`

### 1.2 Baseline intake (BASE-01)
- **Status:** Done (planning baseline, not product completion)  
- **Built:** 35 catalogue capabilities + owner extras mapped; 57 worksheets dispositioned; 34 PWA image filenames accounted; main/v2 parity refresh.  
- **Remaining:** Field-by-field import, live data application, product gap closure (tracked per module below).  
- **Evidence:** `docs/delivery/baseline/README.md`, `REQUIREMENTS_MATRIX.md`, `WORKSHEET_MAP.md`

### 1.3 Main/v2 consolidation (C0–C3)
- **Status:** Done (local lead acceptance); merge/independent review/deploy open  
- **Built:** History preservation (C0), parity dispositions/findings (C1), foundation security/privacy patches (C2-01), contracts (C2-02), schema/history reconciliation (C2-03), nullable group compatibility (C2-04), integrated candidate (C3-01).  
- **Remaining:** Independent review, merge to canonical main, deployment coupling, residual C1 findings, policy holds.  
- **Evidence:** `docs/delivery/consolidation/*`, state.json C* entries

### 1.4 Production migration readiness (M01)
- **Status:** Queued  
- **Built:** Read-only aggregate preflight for pending PostgreSQL migrations; impact/review docs; disposable checks in related work.  
- **Remaining:** Owner-authorized operational migration path; connection injection design; backup/restore rehearsal against real target; participant-group reconciliation execution as needed. Owner (2026-10-01): test-phase data may be reset until live launch.  
- **Evidence:** `docs/delivery/tasks/M01.md`, `docs/delivery/reports/PRODUCTION_MIGRATION_IMPACT_REVIEW_2026-09-15.md`

---

## 2. Catalogue capabilities (R01–R35)

### R01 — Public website
- **Status:** Partial  
- **Purpose:** Public programme entry and admissions/content surface.  
- **Built**
  - PWA shell at `/`; programme page; public registration form routes (`/register/forms/[slug]`).
  - Public APIs for published forms and murabbi-training applications.
- **Remaining**
  - Approved programme marketing content and public admission boundaries.
  - No private data projections on public surfaces (ongoing verification).
- **Evidence:** `src/app/page.tsx`, `src/app/program/`, `src/app/register/`, `src/app/api/public/**`

### R02 — Authentication
- **Status:** Done (foundation) / operationally partial for full multi-role UAT  
- **Purpose:** Credentials login, reset, throttling, session revalidation.  
- **Built**
  - NextAuth credentials; exact normalized email; durable login throttling.
  - Forced reset, token-version invalidation, inactive/revoked denial.
  - PWA session polling and authority-change cache clearing.
  - Login / mobile-login / splash / reset-password / access-pending UI.
- **Remaining**
  - Full multi-device / multi-role browser UAT matrix.
  - Edge policies for unlinked or incomplete identities.
- **Evidence:** `src/lib/auth.ts`, `src/lib/auth/**`, `src/app/api/auth/**`, `src/components/modules/auth/**`

### R03 — Access provisioning
- **Status:** Partial / lifecycle gated  
- **Purpose:** Create, link, reset, deactivate staff and related identities in scope.  
- **Built**
  - Invite and user admin APIs; capability overrides; security-access / access-provisioning UI.
  - Pilot provision helpers; team-access design work under ATT01 (local).
  - `muawin` limited role policy (content-view; no attendance/group data).
- **Remaining**
  - Full account lifecycle authority (create/link/reset/deactivate) as product policy.
  - Park staff creation still limited/unavailable in places.
  - Production team-access provisioning path (emails missing in workbook placeholders cannot activate).
  - Confirmed staff emails / memberships (DATA-001 style holds).
- **Evidence:** `src/app/api/admin/invite/**`, `admin/users/**`, `components/modules/admin/access-*-page.tsx`

### R04 — Organisation setup
- **Status:** Partial  
- **Purpose:** Cities → parks → batches → groups hierarchy.  
- **Built**
  - Models and admin APIs for cities, parks, batches, groups.
  - One-active-batch constraint (provider-specific).
  - Admin and park structure/parks UI.
- **Remaining**
  - Parks mobile reference-data fallback and failed-save closure defects (baseline).
  - Visual parity vs exact PWA screens where still open.
  - Full hierarchy equivalence with main where dispositions remain.
- **Evidence:** `prisma/schema.prisma` org models; `api/admin/{cities,parks,batches,groups}`; park structure UI

### R05 — Teams, roles & assignments
- **Status:** Partial  
- **Purpose:** Collaboration teams, memberships, activity plans (not hierarchy scope).  
- **Built**
  - CollaborationTeam, StaffTeamMembership, TeamChatMessage, TeamDocumentLink, ActivityPlanItem.
  - Admin teams / collaboration-teams APIs and UI.
- **Remaining**
  - Full membership lifecycle UI and activation of confirmed Lahore teams.
  - Assignment history / multi-role StaffMeta completeness.
  - Team membership must never expand hierarchy (ongoing enforcement/UAT).
- **Evidence:** `api/admin/teams/**`, `admin/collaboration-teams`, schema team models

### R06 — Members & profiles
- **Status:** Partial (O01 local acceptance)  
- **Delivery:** O01 done (local)  
- **Purpose:** People directory, participant/staff/guardian profiles, privacy projections.  
- **Built**
  - Participant, StudentExtendedProfile, Guardian, GuardianChild.
  - People / students / guardians APIs and admin UI sheets.
  - Versioned profile writes; safe directory projections (name, role/state, city/park/group context).
  - Hide phone/email/address/DoB/guardian/wellbeing in ordinary directories (owner 2026-09-14).
  - Self profile (`me` / `user/profile`) and student-profile surfaces.
- **Remaining**
  - Source profile import and field reconciliation.
  - Main server-search parity.
  - Account lifecycle mutations still gated.
  - Gemini directory polish where packets were corrections-required.
- **Evidence:** O01 task/reports; `api/admin/people|students|guardians`; people/students UI

### R07 — Admissions & onboarding
- **Status:** Partial; A02 queued  
- **Purpose:** Application → interview → decision → enrol.  
- **Built**
  - AdmissionApplication / AdmissionInterview models.
  - Admin admissions APIs (including interviews/convert paths) and UI.
- **Remaining**
  - Registration-request workbook import and dedupe.
  - Placement recommendation engine (**A02**).
  - Full lifecycle criteria, rollback/retry UAT, source reconciliation.
- **Evidence:** `api/admin/admissions/**`, `admin/admissions`, `docs/delivery/tasks/A02.md`

### R08 — Safeguarding & consent
- **Status:** Blocked / scaffold-only  
- **Purpose:** Consent, emergency/medical, leave, family safety data.  
- **Built**
  - Explicit **unavailable** API gates for guardian consents, emergency-info, leave-requests (truthful 503-style workflow).
- **Remaining**
  - Entire approved lifecycle: consent versions, expiry/revocation, emergency/medical minimization, audit, enablement policy.
- **Evidence:** `api/guardian/consents|emergency-info|leave-requests`; memory unfinished list

### R09 — Grouping & placement
- **Status:** Partial (U01 core done)  
- **Delivery:** U01 done (local); A02 queued  
- **Purpose:** Assign participants to groups; unassigned intake.  
- **Built**
  - Nullable `Participant.groupId` with ON DELETE SET NULL (SQLite + PostgreSQL checked in U01).
  - HQ/central unassigned create; scoped roles denied without real group.
  - Separate authorized assignment path; group-scoped views exclude unassigned.
  - Guardian UI shows “Unassigned” safely.
- **Remaining**
  - Age/class auto-suggest, capacity balancing.
  - Interview → placement recommendation (A02).
  - Transfer history parity with main.
- **Evidence:** U01.md; `api/admin/students/[id]/assignment`; schema Participant

### R10 — Attendance (group session)
- **Status:** In progress / partial locally; **production blocked**  
- **Delivery:** ATT01 (queued in state; large local reliability + role work; prod bootstrap blocked)  
- **Purpose:** Mark present / absent / late / excused for group class sessions.  
- **Built**
  - Full park attendance API: list, prepare, event, records, close, reopen, reset, sync, warnings, summaries, check-alerts.
  - AttendanceEvent / AttendanceRecord; staff-attendance models (separate from group-session scope of ATT01 product goal).
  - Mobile attendance UI, roster, offline queue panel; desktop/shared edit and print helpers.
  - Owner lifecycle: close never auto-dropouts; dropout/reactivation separate audited actions with rejoin date.
  - Operational contact exception: phone for call/WhatsApp on absences (attendance-only).
  - City Head fail-closed scope on related dashboards/reports.
  - Local Lahore Batch 4 refresh evidence on SQLite (not production).
  - Substantial focused tests (routes, lib/attendance, UI).
- **Remaining**
  - Team-usable production bootstrap (approved PG connection, import/reconcile, provisioning) — **blocked**.
  - Staff / event / team / Mashwara attendance (explicitly out of ATT01 group-session scope).
  - Open owner decisions (e.g. F-19 critical warning sub-tier).
  - Browser/device UAT and team release sign-off.
  - Historical Batch 4 import as a finished **production** path.
- **Evidence:** `api/park/attendance/**`, `components/modules/park/mobile-attendance*`, ATT01 tasks/reports, `ATT01_PRODUCTION_BOOTSTRAP_BLOCKED.md`

### R11 — Offline attendance sync
- **Status:** Partial (strong foundation)  
- **Purpose:** Durable offline marks with receipts and conflicts.  
- **Built**
  - OperationReceipt; Dexie offline DB; `park/attendance/sync` + `sync/process`.
  - Shared Web Locks; conflict retention; offline-queue panel; admin sync-conflicts UI.
  - Account-partitioned offline work; no invented acks / unconditional LWW (per memory baseline).
- **Remaining**
  - Full multi-tab/device UAT across roles.
  - Production service-worker / cache hygiene for historical deploys.
- **Evidence:** `src/lib/offline/**`, sync routes, `admin/sync/conflicts`

### R12 — Content planner
- **Status:** Partial  
- **Purpose:** Plan class content by batch/session/block.  
- **Built**
  - ContentPlan / Session / Block / Resource models.
  - Admin content-planner APIs and mobile/desktop planner UI.
  - Parallel ParkLesson path.
  - Parser/import scaffolding (TASKS.md CP-* queue still open for policy/import).
- **Remaining**
  - Category naming, publish lifecycle completeness.
  - Workbook import policy (placeholder rows blocked on owner).
  - Park-lesson vs planner reconciliation.
  - Staging migration deploy for content schema where still undeployed.
- **Evidence:** `api/admin/content-planner/**`, `components/modules/content-planner/**`, TASKS.md CP-*

### R13 — Murabbi training (+ generic registration forms)
- **Status:** Done (local) for induction/forms slice; curriculum LMS still partial/missing  
- **Delivery:** MTI-01 done (local integration)  
- **Purpose:** Configurable registration forms; Murabbi Training first template; longer-term training curriculum.  
- **Built**
  - RegistrationForm / Revision / Submission; TrainingCohort / Application / Action.
  - Admin registration-forms list, builder, submissions UI.
  - Public form publish/submit lifecycle; scoped staff review.
  - Murabbi-training admin + public APIs.
  - Immutable published revisions; city-scoped staff authorization pattern.
  - Local gates green per final integration verification (tests, schemas, lint, typecheck, PG build, synthetic browser lifecycle).
- **Remaining**
  - Live migration, real publication, deployment (separate authorization).
  - Per-programme retention and abuse controls before launch.
  - Full 16-day curriculum completion / attendance / safeguarding clearance LMS (original R13 lifecycle) still not complete.
- **Evidence:** MTI-01 task + final verification; `api/admin/registration-forms/**`; `api/admin/murabbi-training/**`; `api/public/**`

### R14 — Calendar & batch planner
- **Status:** Partial  
- **Purpose:** Class dates, off-days, routines, operational calendar.  
- **Built**
  - BatchClassDate, OperationalOffDate, ParkRoutineSlot, EventPlannerItem.
  - Operational calendar, batch attendance-schedule, park planner APIs/UI pieces.
- **Remaining**
  - Single PKT date policy across all consumers.
  - Full equivalence and operator documentation.
- **Evidence:** calendar models; `admin/operational-calendar`, `park/planner`

### R15 — Events & activities
- **Status:** Partial / high-risk gaps  
- **Purpose:** Programme events, registration, check-in.  
- **Built**
  - Event, EventRegistration, temporary event teams, responsibilities, planner items.
  - Admin events APIs/UI and mobile events surfaces.
- **Remaining**
  - Participant scope, capacity/waitlist, fee/consent trust, concurrency (baseline high-risk).
  - Main registration path compatibility.
  - Idempotent check-in and ledger-derived payment rules.
- **Evidence:** `api/admin/events/**`, baseline R15; EVENT-* in TASKS.md largely pending

### R16 — Responsibility planner (incl. Mashwara)
- **Status:** Partial  
- **Purpose:** Event/Mashwara assignments, decisions, action items.  
- **Built**
  - EventResponsibility; Mashwara meeting/attendee/decision/action/share models.
  - Mashwara APIs and admin UI.
- **Remaining**
  - Design-to-complete serial tasks (MASHWARA-301+ in TASKS.md).
  - Notification coupling; main action-update parity.
- **Evidence:** `api/admin/mashwara/**`, mashwara components

### R17 — Venue management
- **Status:** Scaffold-only / partial  
- **Purpose:** Venue availability, contacts, hazards beyond basic park record.  
- **Built**
  - Park address/basic fields and parks CRUD.
- **Remaining**
  - Availability, permission, hazard/emergency lifecycle.
- **Evidence:** Park model; baseline R17

### R18 — Finance / fees
- **Status:** Partial  
- **Purpose:** Fee events, payments, donations, adjustments, receipts.  
- **Built**
  - FeeEvent, Payment, ReceiptSequence, FeeDonation, FinancialAdjustment.
  - Admin fees/finance APIs; guardian/student fee views; money/retry integrity patterns.
  - PDF/receipt helpers.
- **Remaining**
  - Refund/waiver policy; event-fee bridge.
  - Source payment reconciliation (unposted until reconciled).
  - Full concurrent retry/UAT and operator policy.
- **Evidence:** `api/admin/fees/**`, `api/admin/finance/**`, fee UI modules

### R19 — Procurement
- **Status:** Partial  
- **Purpose:** Stock requests and purchase orders.  
- **Built**
  - StockRequest, PurchaseOrder APIs; admin/mobile procurement UI.
- **Remaining**
  - Receipt and fulfilment lifecycle (explicit unfinished).
  - State-machine completeness and approval scope UAT.
- **Evidence:** `api/admin/procurement/**`; memory unfinished list

### R20 — Inventory
- **Status:** Partial / UI defective (baseline)  
- **Purpose:** Central/park stock, transfers, counts.  
- **Built**
  - ProcurementItem, ParkStock, StockTransfer, StockAuditLog.
  - Central inventory and transfer APIs.
- **Remaining**
  - Mobile inventory sample/local-only workflows (bind real API; durable add/transfer/export).
  - Receiving without false stock claims.
- **Evidence:** `api/inventory/central`, procurement stock routes; baseline R20

### R21 — Announcements
- **Status:** Partial  
- **Purpose:** Scoped broadcasts.  
- **Built**
  - Announcement model/API; admin/mobile announcement UIs; ties into notification feed.
- **Remaining**
  - Audience serialization/scope correctness; global publish authority.
  - Expiry and pagination-before-limit guarantees.
- **Evidence:** `api/announcements`, announcement components; N01 coupling

### R22 — Notifications
- **Status:** Partial (in-app slice); external **blocked**  
- **Delivery:** N01 in_progress / blocked after safe in-app slice  
- **Purpose:** In-app feed + later external delivery.  
- **Built**
  - Notification + AnnouncementRead; feed, read, read-all, history, admin queue routes.
  - Fail-closed exact-role feeds; durable per-user receipts (candidate/integration claims).
  - Bell/mobile/history UI surfaces.
- **Remaining**
  - External provider/outbox; preferences; broad audience semantics.
  - Idempotency for producers; retention policy — **owner-gated**.
  - Full cache/method correctness verification vs baseline defects.
- **Evidence:** `api/notifications/**`, N01.md, memory N01/C3 entries

### R23 — Messaging
- **Status:** Scaffold-only (general); team chat partial  
- **Purpose:** Role-pair messaging.  
- **Built**
  - Team chat only (`TeamChatMessage`, team chat API/UI).
- **Remaining**
  - General Conversation/Message family; moderation, attachments, retention policy.
- **Evidence:** baseline R23; `admin/teams/[id]/chat`

### R24 — Community
- **Status:** Blocked / scaffold-only  
- **Purpose:** Posts, polls, social feed under safety rules.  
- **Built**
  - Admin/mobile community UI shells.
  - APIs return **unavailable**.
- **Remaining**
  - Full moderated persistence, report/block, media consent.
- **Evidence:** `api/community/posts|polls`; community components

### R25 — Online resources / knowledge base
- **Status:** Partial  
- **Purpose:** Digital resources and knowledge articles.  
- **Built**
  - DigitalResource, KnowledgeArticle; admin/public resource and knowledge APIs.
  - Knowledge-base admin UI.
- **Remaining**
  - Full course/progress/publication lifecycle; private-link and audience controls.
- **Evidence:** `api/resources`, `api/knowledge`, `admin/knowledge*`

### R26 — Program Head portal
- **Status:** Partial  
- **Purpose:** HQ dashboard and national tools.  
- **Built**
  - Admin dashboard, home-analytics API, mobile admin home, large admin module set in PWA.
- **Remaining**
  - KPI completeness; every linked child module working end-to-end.
  - Placeholder/sample count removal.
- **Evidence:** `api/admin/dashboard`, `home-analytics`, mobile-home-dashboard

### R27 — City operations portal
- **Status:** Partial  
- **Purpose:** City-scoped ops for City Head.  
- **Built**
  - City-head dashboard API; desktop/mobile dashboards.
  - City scope pin via `resolveRequestedCityScope` on key admin reports (ATT01 readiness slice).
- **Remaining**
  - Full child workflows; browser UAT; no residual cross-city leaks in unreviewed routes.
- **Evidence:** `api/city-head/dashboard`, city-head components, ATT01_CITY_HEAD_READINESS.md

### R28 — Park operations portal
- **Status:** Partial  
- **Purpose:** Park dashboard, roster, attendance entry.  
- **Built**
  - Park dashboard/roster/participants/guardians/schedule; workspace tabs (dashboard, structure, lessons, attendance, planner).
  - Mobile park workspace and attendance entry.
- **Remaining**
  - Inherited parks/inventory defects; offline/failed state honesty on every tab.
- **Evidence:** `api/park/**`, `components/modules/park/**`

### R29 — Murabbi portal
- **Status:** Partial  
- **Purpose:** Assigned-group mentor workspace.  
- **Built**
  - Murabbi dashboard + groups APIs/UI; mobile murabbi dashboard.
  - Policy: murabbis may exist without group but are denied group/attendance data until assigned.
  - Separate **muawin** limited dashboard (content-view).
- **Remaining**
  - Training/content/follow-up completeness tied to R12/R13.
- **Evidence:** `api/murabbi/**`, murabbi + muawin components

### R30 — Guardian portal
- **Status:** Partial  
- **Purpose:** Linked-child tracking for parents.  
- **Built**
  - Dashboard, schedule, fees, attendance-history APIs.
  - Guardian UI (dashboard, schedule, fees, history, announcements) + mobile.
- **Remaining**
  - Consent/emergency/leave (R08 gates).
  - Link-removal and foreign-child denial UAT completeness.
- **Evidence:** `api/guardian/**`, guardian components

### R31 — Shabab / student portal
- **Status:** Partial  
- **Purpose:** Self-view programme info.  
- **Built**
  - Student dashboard, schedule, fees, attendance-history APIs.
  - Student UI (dashboard, profile, schedule, fees, history, announcements) + mobile.
- **Remaining**
  - Community/messaging deferred; foreign-profile denial UAT.
- **Evidence:** `api/student/**`, student components

### R32 — Dashboards & exception boards
- **Status:** Partial  
- **Purpose:** Role KPIs and actionable exceptions.  
- **Built**
  - Home-analytics; role dashboards (admin, city-head, park, murabbi, muawin, guardian, student).
  - ATT01 analytics fixes (e.g. rejoin/reactivatedAt handling in related work).
- **Remaining**
  - Historical denominators; KPI definitions; placeholder removal; Super Admin analytics packet follow-through.
- **Evidence:** `api/admin/home-analytics`, role dashboard components

### R33 — Reports & exports
- **Status:** Partial  
- **Purpose:** Operational reports and CSV/export.  
- **Built**
  - Admissions/fees/attendance reports + export; custom report builder UI; ReportPreset.
  - Calling export; city-head scope hardening on key report paths.
- **Remaining**
  - Scheduled reports and notification delivery of reports.
  - Main bounded pagination parity; large-fixture cost measurement.
- **Evidence:** `api/admin/reports/**`, reports UI modules

### R34 — Audit log
- **Status:** Partial (foundation solid)  
- **Purpose:** Trace high-impact mutations.  
- **Built**
  - AuditLog model; admin audit-log API/UI; redaction helpers; many transactional writes.
  - C2 foundation privacy/bounds work.
- **Remaining**
  - Event/outbox atomicity gaps; retention policy.
- **Evidence:** `api/admin/audit-log`, `src/lib/audit.ts`, C2-01 handoff

### R35 — System settings
- **Status:** Partial; display modes **deferred**  
- **Purpose:** Access matrix, external links, domain allowlist, future display mode.  
- **Built**
  - External links, access overrides, domain allowlist, settings/security UI.
- **Remaining**
  - Desktop/tablet opt-in from Settings (**deferred** per PLAN; not authorized to implement now).
- **Evidence:** settings APIs/UI; PLAN.md deferred display modes

---

## 3. Additional owner modules (X*)

### X01 — Calling
- **Status:** Partial  
- **Built:** CallingCampaign, assignments, interactions, templates, POC, external support caller; calling APIs; admin/mobile calling UI; export; import tooling tests. CALL-301 policy decisions recorded in TASKS.md.  
- **Remaining:** Full audited interaction APIs/UI (CALL-302+), workbook import dry-run then owner-gated staging import, appointment/orientation templates, bulk failure handling.  
- **Evidence:** `api/calling/**`, `admin/calling/**`, `src/lib/calling*`

### X02 — Evaluation
- **Status:** Partial  
- **Built:** StudentEvaluation; park evaluations API; mobile evaluation UI (sliders currently 0–10).  
- **Remaining:** Rubric range/comment policy vs source and owner intent.  
- **Evidence:** `api/park/evaluations`, park evaluation UI

### X03 — Islah / personal routines
- **Status:** Blocked  
- **Built:** Admin islah-i-mamulat UI shell; daily-log API **unavailable**.  
- **Remaining:** Privacy/retention/role policy then persistence.  
- **Evidence:** `api/islah/daily-log`, islah UI

### X04 — Certificates
- **Status:** Partial / issuance gated  
- **Built:** Eligibility/report-style certificate routes; certificates admin/mobile UI.  
- **Remaining:** Issuance, reissue, revocation, immutable identity, audit — unfinished.  
- **Evidence:** `api/admin/certificates/**`; memory unfinished list

### X05 — Media Briefs
- **Status:** Queued / consolidation disposition  
- **Built:** Confirmed as main-only family to recover; not first-class complete v2 module in current inventory.  
- **Remaining:** Adapt useful lifecycle into canonical code after scope review.  
- **Evidence:** baseline X05; consolidation path dispositions

### X06 — One source of truth
- **Status:** Partial (C0–C3 local; merge open)  
- **See:** §1.3 consolidation.

### X07 — Professional documentation
- **Status:** Partial  
- **Built:** Delivery docs, skills, memory, multiple handoffs and runbooks.  
- **Remaining:** Post-canonical architecture/API/data/ops rewrite tied to accepted SHA.

### X08 — Source data into DB
- **Status:** Partial (mapped; not product-complete import)  
- **Built:** All 57 sheets dispositioned; Lahore local attendance refresh tooling; various import frameworks and dry-runs.  
- **Remaining:** Field mapping, synthetic staging, repeatable import, approved live-target application for each workbook family.  
- **Evidence:** WORKSHEET_MAP.md; import scripts under `scripts/` and `src/lib/import*`

### X09 — Display modes
- **Status:** Deferred  
- **Built:** Mobile default retained by owner decision.  
- **Remaining:** Tablet/desktop design and settings opt-in (serial later phase).  
- **Evidence:** PLAN.md deferred display modes

---

## 4. Related surfaces (not full catalogue IDs)

| Surface | Status | Built | Remaining |
| --- | --- | --- | --- |
| **Gamification / points** | Partial / awards blocked | PointTransaction, Badge models; GET ledger; admin gamification UI | POST awards **503** until policy |
| **Alumni** | Partial / completeness low confidence | Admin alumni page + APIs | Lifecycle criteria and UAT |
| **Staff directory** | Partial | Mobile staff directory under O01 privacy rules | Full directory parity / activation |
| **Sync conflicts admin** | Partial | Conflicts page + process API | Operator runbook and multi-role UAT |
| **Portal import / pilot** | Partial | Admin portal-import and pilot routes/UI | Owner-gated live import/pilot release |
| **i18n (EN/UR)** | Partial | `src/lib/i18n/en.ts`, `ur.ts`; language sync provider | Product-wide completeness not claimed |
| **PWA shell** | Partial | `pwa-app`, app shell, sidebar, offline attendance path | Full compiled-PWA device matrix |
| **E2E / release gates** | Partial | Playwright config; release test suites under `src/__tests__/release` | Green production sign-off after real gates |

---

## 5. Cross-cutting foundations summary

| Foundation | Status | Notes |
| --- | --- | --- |
| Auth / roles / capabilities | Strong foundation, partial product | Server deny-by-default; capability matrix; scope hierarchy; muawin; roleLabel |
| PWA / offline | Partial | Dexie + receipts + locks; attendance offline strongest |
| i18n | Partial | EN/UR present; not full coverage claim |
| Reports | Partial | Live reports; scheduling missing |
| Fees | Partial | Ledger foundation; policy incomplete |
| Certificates | Partial | Eligibility yes; issuance no |
| Procurement | Partial | Requests/orders yes; receipt/fulfilment no |
| Community / Islah | Blocked | Truthful unavailable gates |
| Events | Partial / high-risk | CRUD exists; trust defects open |
| Calling | Partial | Core models/APIs/UI exist |
| Knowledge base | Partial | CRUD/read paths |
| Registration forms | **Done (local MTI-01)** | Publish/submit/review verified locally |
| Notifications | Partial | In-app slice; external gated |
| Attendance | Partial / prod blocked | Strong local stack; bootstrap blocked |
| Migrations (SQLite/PG) | Partial | Dual schemas; M01 queued; disposable checks exist; ops PG path incomplete |

---

## 6. Honest roll-up

### Strongest local slices (nearest “done”)
- Authentication foundation (R02)
- Registration forms + MTI-01 induction (R13 slice)
- U01 unassigned placement
- O01 privacy projections / people foundation
- Attendance offline stack (local ATT01 body of work)
- Delivery baseline + consolidation packages (unmerged)

### Real code, still incomplete product modules
- Attendance team release & production bootstrap
- Notifications external delivery
- Org provisioning lifecycle
- Admissions + A02 placement
- Content planner import/publish
- Finance / procurement completion
- Events trust & capacity
- Calling full lifecycle
- Reports scheduling
- All role portals KPI polish

### Explicitly gated / unavailable
- Safeguarding consent / emergency / leave
- Community posts/polls
- Islah daily log
- Point awards
- Certificate issuance/reissue
- Procurement receipt/fulfilment
- Custom-report scheduling + notification delivery of reports
- External notification provider
- Production staff provisioning path
- Source workbook **live** import as finished product
- Desktop/tablet display modes

### Do not treat as done
- Blueprint “target” workflows alone
- July catalogue status labels
- Agent “complete” claims without `state.json` + current tests
- Vercel deploy alone as product completion
- Passing defect-characterization tests as fix verification
- Mapped worksheets as imported operational data

---

## 7. Suggested next focus (from current evidence)

1. **Close or re-point `state.json` active task** so N01 / ATT01 / M01 / next owner priority cannot drift.  
2. **M01** — migration readiness under owner test-phase reset policy, still without unauthorized production writes.  
3. **ATT01** — resume only when production bootstrap prerequisites (connection, backup, import, provision) are intentionally scheduled; otherwise keep local validation.  
4. **A02** — admissions placement after U01.  
5. **N01** — finish only after owner external-delivery / audience decisions, or keep blocked with in-app slice documented.  
6. Serial later queue per PLAN.md: calling completion, content planner, safeguarding, calendar/events, finance, procurement, messaging, community, resources/certificates polish, portal verification, public site + ops docs.

---

## 8. Key evidence index

| Kind | Paths |
| --- | --- |
| Delivery state | `docs/delivery/state.json` |
| Plan / queue | `docs/delivery/PLAN.md`, `TASKS.md` |
| Baseline matrix | `docs/delivery/baseline/REQUIREMENTS_MATRIX.md` |
| Memory | `.agents/memory/current.md` |
| Task packets | `docs/delivery/tasks/*.md` |
| Handoffs / reviews | `docs/delivery/reports/*` |
| App UI | `src/components/modules/**`, `src/app/**/page.tsx` |
| APIs | `src/app/api/**` |
| Schema | `prisma/schema.prisma`, `prisma/postgres/schema.prisma` |
| Blueprint | `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md` |

---

*This file is a planning and status aid. Prefer fresh code and verification evidence over any single status cell when they disagree. Update after each module lead acceptance or owner priority change.*
