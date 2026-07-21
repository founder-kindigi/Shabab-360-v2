# UX-001: Lahore-Backed Application Screen Inventory

**Task:** UX-001
**Owner:** Gemini
**Status:** Completed — ready for Codex review
**Created:** 2026-07-21
**Scope:** Comprehensive Lahore-backed screen audit for current role portals and operational screens. Docs only — no code, schema, migration, test, or data modifications.

---

## 1. Executive Summary & Audit Scope

This document provides a systematic, Lahore-backed inventory of every meaningful screen and user workflow in the Shabab 360 platform across all eight active demo roles (`super_admin`, `program_admin`, `city_head`, `park_lead`, `park_admin`, `murabbi`, `guardian`, and `student`).

### 1.1 Verified Data Baseline (Lahore Staging Import Baseline)

All audit assessments are evaluated against the verified Lahore staging import baseline:
- **1 City:** Lahore (`LHR`)
- **6 Parks:** State Life School, Iqbal Park, and 4 additional active Lahore parks.
- **6 Batches:** City-owned batches ("Batch 4").
- **13 Groups:** Scoped park-batch groups.
- **277 Participants:** 257 active participants, 20 dropout candidates, enriched with nullable `age` and `gradeClass` fields.
- **180 Historical Events & 2,967 Attendance Records:** Spanning verified historical session dates.
- **51 Inactive Staff Placeholders (`example.invalid`) + 1 Active Super Admin.**

---

## 2. Inventory Methodology & Status Taxonomy

Each screen is evaluated against operational usefulness, role hierarchy boundaries, mobile responsive layout (≤ 430px viewport), offline capabilities, and empty/error states using seven mandatory audit markers:

1. **Status:** `Retain` | `Remove` | `Modify` | `Missing`
2. **Role / Scope Concern:** Access boundary alignment, hierarchy scope leaks, or denial enforcement.
3. **Data Dependency:** Required entity datasets (e.g. Lahore participants, events, groups, fee records).
4. **Operational & Workflow Assessment:** Purpose, workflow clarity, and usability for target roles.
5. **Mobile & Responsive Observations:** Performance on mobile viewports (≤ 430px width).
6. **Empty & Error State Assessment:** Graceful handling of null/empty queries or server errors.
7. **Suggested Follow-up Task ID:** Reference task identifier for future iterations.

---

## 3. Screen Inventory by Portal

### 3.1 Authentication & System Baseline Entry Screens

#### Screen 01: Login Screen
- **Page ID / Component:** `login` / [`src/components/modules/auth/login-page.tsx`](src/components/modules/auth/login-page.tsx)
- **Roles:** Unauthenticated / All Roles
- **Status:** `Retain`
- **Role / Scope Concern:** None. Authenticates credentials via NextAuth and routes user to role-default landing page.
- **Data Dependency:** NextAuth Credentials Provider, bcrypt user table.
- **Operational Assessment:** Essential entry point. Supports email/password login and quick demo-role switches for testing.
- **Mobile & Responsive:** Responsive container, clear touch targets.
- **Empty / Error States:** Invalid credentials display inline error toast.
- **Suggested Follow-up Task ID:** `AUTH-101`

#### Screen 02: Password Reset Screen
- **Page ID / Component:** `reset-password` / [`src/components/modules/auth/reset-password-page.tsx`](src/components/modules/auth/reset-password-page.tsx)
- **Roles:** Authenticated User (Forced Reset / Self-Service)
- **Status:** `Retain`
- **Role / Scope Concern:** Self-service exemption. Users with forced password reset flags are restricted to this page until password update completes.
- **Data Dependency:** User account record (`forcePasswordReset` flag).
- **Operational Assessment:** Security hardening flow. Clears session state and enforces bcrypt password rules.
- **Mobile & Responsive:** Fully responsive single-column form.
- **Empty / Error States:** Shows field validation errors for weak passwords.
- **Suggested Follow-up Task ID:** `AUTH-102`

#### Screen 03: Access Pending Screen
- **Page ID / Component:** `access-pending` / [`src/components/modules/auth/access-pending-page.tsx`](src/components/modules/auth/access-pending-page.tsx)
- **Roles:** Inactive / Unassigned Staff Placeholders (`example.invalid`)
- **Status:** `Retain`
- **Role / Scope Concern:** Fail-closed boundary. Inactive staff accounts without assigned city/park scope are safely held here with zero data access.
- **Data Dependency:** Staff metadata (`isActive = false` or null assignment).
- **Operational Assessment:** Prevents unprovisioned staff placeholders from viewing portal data.
- **Mobile & Responsive:** Centered mobile card layout.
- **Empty / Error States:** Displays clear instructions to contact Super Admin or City Head.
- **Suggested Follow-up Task ID:** `AUTH-103`

---

### 3.2 Super Admin / Program Admin Portal

#### Screen 04: Super Admin Dashboard
- **Page ID / Component:** `admin-dashboard` / [`src/components/modules/admin/admin-dashboard.tsx`](src/components/modules/admin/admin-dashboard.tsx)
- **Roles:** `super_admin`, `program_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Global HQ scope. Shows national aggregate metrics across all cities.
- **Data Dependency:** Lahore dataset aggregates (1 city, 6 parks, 6 batches, 13 groups, 277 participants, 180 events).
- **Operational Assessment:** High usefulness. Top metric cards, 14-day trend charts, quick actions, and recent audit activity feed.
- **Mobile & Responsive:** Responsive 2-column grid switches to 1-column on mobile.
- **Empty / Error States:** Skeletal loaders during query fetch; graceful empty card fallback.
- **Suggested Follow-up Task ID:** `DASH-001`

#### Screen 05: Cities Management
- **Page ID / Component:** `admin-cities` / [`src/components/modules/admin/cities-page.tsx`](src/components/modules/admin/cities-page.tsx)
- **Roles:** `super_admin` only (Denied to `city_head`)
- **Status:** `Retain`
- **Role / Scope Concern:** Correctly restricted to Super Admin. City Head is strictly denied access.
- **Data Dependency:** Lahore city record (`LHR`, name: "Lahore").
- **Operational Assessment:** Allows creating and managing city records. Shows park and batch counts per city.
- **Mobile & Responsive:** Card layout on mobile screens.
- **Empty / Error States:** Displays "No cities found" when database is unseeded.
- **Suggested Follow-up Task ID:** `CITY-101`

#### Screen 06: Parks Management
- **Page ID / Component:** `admin-parks` / [`src/components/modules/admin/parks-page.tsx`](src/components/modules/admin/parks-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Scoped correctly: Super Admin sees all cities; City Head sees only assigned city parks (e.g. Lahore's 6 parks).
- **Data Dependency:** 6 Lahore parks (State Life School, Iqbal Park, etc.).
- **Operational Assessment:** Displays park list, group counts, assigned park leads/admins, and park creation dialog.
- **Mobile & Responsive:** Responsive grid adapts to single-column mobile view.
- **Empty / Error States:** Shows empty state component when city has zero parks.
- **Suggested Follow-up Task ID:** `PARK-101`

#### Screen 07: Batches Management
- **Page ID / Component:** `admin-batches` / [`src/components/modules/admin/batches-page.tsx`](src/components/modules/admin/batches-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped), `park_lead` (read-only city batches)
- **Status:** `Modify`
- **Role / Scope Concern:** Park Admin and Murabbi are denied. Aligns with HIER-002 city-owned batch model.
- **Data Dependency:** 6 Lahore batches ("Batch 4").
- **Operational Assessment:** Manages batch creation and dates. `POST /api/admin/batches` ([src/app/api/admin/batches/route.ts](src/app/api/admin/batches/route.ts)) lacks validation enforcing `endDate >= startDate` (`B-V05`).
- **Mobile & Responsive:** Card layout for mobile. Date inputs use native mobile pickers.
- **Empty / Error States:** Displays "No batches found" empty state.
- **Suggested Follow-up Task ID:** `HIER-003`

#### Screen 08: Groups Management
- **Page ID / Component:** `admin-groups` / [`src/components/modules/admin/groups-page.tsx`](src/components/modules/admin/groups-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped), `park_lead` (read-only assigned park)
- **Status:** `Modify`
- **Role / Scope Concern:** In current legacy code ([src/app/api/admin/groups/route.ts](src/app/api/admin/groups/route.ts) and [src/app/api/admin/groups/[id]/route.ts](src/app/api/admin/groups/[id]/route.ts)), Park Lead possesses `organisation.manage` capability and is permitted to create/edit groups in their assigned park. Under HIER-003, Phase B hierarchy refactoring will restrict Park Lead to view-only access for assigned-park groups, returning 403 on create/edit/delete.
- **Data Dependency:** 13 Lahore groups.
- **Operational Assessment:** Manages group naming, park/batch linking, and participant counts.
- **Mobile & Responsive:** Clean mobile card layout with dropdown selectors.
- **Empty / Error States:** Filters empty groups gracefully.
- **Suggested Follow-up Task ID:** `HIER-003`

#### Screen 09: People / Staff Directory
- **Page ID / Component:** `admin-people` / [`src/components/modules/admin/people-page.tsx`](src/components/modules/admin/people-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** City Head manages only Lahore staff (`park_lead`, `park_admin`, `murabbi`). Super Admin sees global staff.
- **Data Dependency:** 51 Lahore staff placeholders + 1 Super Admin.
- **Operational Assessment:** Staff listing, role filter, assigned park/group context display, and profile trigger.
- **Mobile & Responsive:** Mobile card list view with quick search input.
- **Empty / Error States:** Shows empty search state when no staff match filters.
- **Suggested Follow-up Task ID:** `STAFF-101`

#### Screen 10: Students Directory & Participant Detail
- **Page ID / Component:** `admin-students` / [`src/components/modules/admin/students-page.tsx`](src/components/modules/admin/students-page.tsx) + [`src/components/modules/admin/participant-detail-sheet.tsx`](src/components/modules/admin/participant-detail-sheet.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain` (with `Modify`)
- **Role / Scope Concern:** Scoped by city. Displays full Lahore student roster with detail drawer.
- **Data Dependency:** 277 Lahore participants (257 active, 20 dropouts, age, gradeClass).
- **Operational Assessment:** High operational utility. Roster search, filter by park/group, dropout status badge, age, and grade class.
- **Mobile & Responsive:** Slide-over detail sheet is scrollable and readable on mobile viewports.
- **Empty / Error States:** Renders empty state when search query returns 0 matches.
- **Suggested Follow-up Task ID:** `STUDENT-101`

#### Screen 11: Guardians Directory & Detail Sheet
- **Page ID / Component:** `admin-guardians` / [`src/components/modules/admin/guardians-page.tsx`](src/components/modules/admin/guardians-page.tsx) + [`src/components/modules/admin/guardian-detail-sheet.tsx`](src/components/modules/admin/guardian-detail-sheet.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Privacy hardened. Exact phone search only, phone masked, CNIC and address redacted from response.
- **Data Dependency:** Guardian linking records for Lahore participants.
- **Operational Assessment:** Manages guardian profile records and participant links.
- **Mobile & Responsive:** Mobile sheet view for linked wards.
- **Empty / Error States:** Prompts for exact phone entry when searching.
- **Suggested Follow-up Task ID:** `GUARD-101`

#### Screen 12: Attendance Events Administration
- **Page ID / Component:** `admin-attendance-events` / [`src/components/modules/admin/admin-attendance-events.tsx`](src/components/modules/admin/admin-attendance-events.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Global/City monitoring of attendance sessions. Fails closed if city context missing.
- **Data Dependency:** 180 Lahore historical attendance events.
- **Operational Assessment:** Reviews session completion rates, marked vs total counts, and event status (Open/Closed).
- **Mobile & Responsive:** Session card layout with inline progress bars.
- **Empty / Error States:** Displays calendar empty state when no events exist for selected date.
- **Suggested Follow-up Task ID:** `ATT-101`

#### Screen 13: Admissions Management
- **Page ID / Component:** `admin-admissions` / [`src/components/modules/admin/admissions-page.tsx`](src/components/modules/admin/admissions-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** City Head manages admissions within assigned city only.
- **Data Dependency:** Admission application pipeline records.
- **Operational Assessment:** Application review, interview scheduling, approval, and participant conversion workflow.
- **Mobile & Responsive:** Responsive pipeline stage tabs and mobile modal dialogs.
- **Empty / Error States:** Clear empty pipeline stage indicator.
- **Suggested Follow-up Task ID:** `ADM-101`

#### Screen 14: Fees & Receipts Management
- **Page ID / Component:** `admin-fees` / [`src/components/modules/admin/fees-page.tsx`](src/components/modules/admin/fees-page.tsx)
- **Roles:** `super_admin`, `program_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Financial management requires exact-money math and transaction safety.
- **Data Dependency:** Batch fee structures and fee payment records.
- **Operational Assessment:** Manages fee events, collection tracking, and receipt generation.
- **Mobile & Responsive:** Financial summary cards stack vertically on mobile.
- **Empty / Error States:** Zero pending fees displays clean confirmation state.
- **Suggested Follow-up Task ID:** `FEE-101`

#### Screen 15: Announcements Administration
- **Page ID / Component:** `admin-announcements` / [`src/components/modules/admin/announcements-page.tsx`](src/components/modules/admin/announcements-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Targeted broadcasts. City Head can publish announcements targeted to assigned city/parks only.
- **Data Dependency:** Announcement publication records.
- **Operational Assessment:** Creates and publishes targeted announcements with role and scope filters.
- **Mobile & Responsive:** Responsive card list view with action controls.
- **Empty / Error States:** Empty state card with "Create Announcement" trigger.
- **Suggested Follow-up Task ID:** `ANNC-101`

#### Screen 16: System Reports
- **Page ID / Component:** `admin-reports` / [`src/components/modules/admin/reports-page.tsx`](src/components/modules/admin/reports-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Scoped report generation. City Head reports are filtered by `assignedCityId`.
- **Data Dependency:** Lahore attendance (2,967 records) and fee history.
- **Operational Assessment:** Generates attendance summary reports, fee collection breakdowns, and export previews. Wide data tables on small viewports wrap with horizontal scroll.
- **Mobile & Responsive:** Report preview tables require horizontal scroll on viewports ≤ 390px.
- **Empty / Error States:** Shows filter prompt when no date range selected.
- **Suggested Follow-up Task ID:** `REP-101`

#### Screen 17: Audit Log Viewer
- **Page ID / Component:** `admin-audit-log` / [`src/components/modules/admin/audit-log-page.tsx`](src/components/modules/admin/audit-log-page.tsx)
- **Roles:** `super_admin`, `program_admin` (requires `audit.view`)
- **Status:** `Retain`
- **Role / Scope Concern:** Restricted to HQ. Requires `audit.view` capability; sensitive audit fields are redacted.
- **Data Dependency:** System audit log table.
- **Operational Assessment:** Displays chronological system mutations with actor, action type, and entity target.
- **Mobile & Responsive:** Compact log card list view for small viewports.
- **Empty / Error States:** "No audit logs found" fallback message.
- **Suggested Follow-up Task ID:** `AUDIT-101`

#### Screen 18: Access Management Overrides
- **Page ID / Component:** `admin-access-management` / [`src/components/modules/admin/access-management-page.tsx`](src/components/modules/admin/access-management-page.tsx)
- **Roles:** `super_admin` only
- **Status:** `Retain`
- **Role / Scope Concern:** Implements AM-001–AM-005. Default role matrix + named user overrides with fail-closed checks.
- **Data Dependency:** Role capabilities and user overrides database tables.
- **Operational Assessment:** High security value. Allows Super Admin to grant/revert/expire individual capability overrides without bypassing hierarchy scope.
- **Mobile & Responsive:** Tabbed interface for Role Matrix vs User Overrides.
- **Empty / Error States:** Displays "No active user overrides" state.
- **Suggested Follow-up Task ID:** `AM-005`

#### Screen 19: Staff Access Provisioning
- **Page ID / Component:** `admin-access` / [`src/components/modules/admin/access-provisioning-page.tsx`](src/components/modules/admin/access-provisioning-page.tsx)
- **Roles:** `super_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Assigns staff role and park/group scope. City Head can provision staff only within assigned city.
- **Data Dependency:** 51 Lahore staff placeholder accounts.
- **Operational Assessment:** Provisioning workflow to activate staff placeholders, assign canonical role, and set scope.
- **Mobile & Responsive:** Step-by-step form dialog optimized for touch.
- **Empty / Error States:** Explicit validation error on missing scope selection.
- **Suggested Follow-up Task ID:** `PROV-101`

#### Screen 20: User Accounts Management
- **Page ID / Component:** `admin-users` / [`src/components/modules/admin/users-page.tsx`](src/components/modules/admin/users-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** User account status and password reset trigger. Access admin roles cannot be assigned by named overrides.
- **Data Dependency:** Application user accounts.
- **Operational Assessment:** Lists accounts, triggers forced password reset, and manages user status.
- **Mobile & Responsive:** Mobile list cards with clear action dropdowns.
- **Empty / Error States:** Filters empty results gracefully.
- **Suggested Follow-up Task ID:** `USER-101`

#### Screen 21: Notifications Administration
- **Page ID / Component:** `notifications` / [`src/components/modules/admin/notifications-page.tsx`](src/components/modules/admin/notifications-page.tsx)
- **Roles:** All Authenticated Roles (Scoped view)
- **Status:** `Retain`
- **Role / Scope Concern:** Outbox privacy enforced. Users see only own notifications or targeted announcements.
- **Data Dependency:** Notification queue table.
- **Operational Assessment:** Displays notification inbox, mark-as-read triggers, and system alerts.
- **Mobile & Responsive:** Mobile notification list with swipe/tap actions.
- **Empty / Error States:** Clean "No notifications" inbox state.
- **Suggested Follow-up Task ID:** `NOTIF-101`

#### Screen 22: System Settings
- **Page ID / Component:** `admin-settings` / [`src/components/modules/admin/settings-page.tsx`](src/components/modules/admin/settings-page.tsx)
- **Roles:** `super_admin` only
- **Status:** `Retain`
- **Role / Scope Concern:** Global platform settings. Super Admin only.
- **Data Dependency:** System configuration settings.
- **Operational Assessment:** Manages system-wide parameters, default language (EN/UR), and operational toggles.
- **Mobile & Responsive:** Vertical form layout on mobile screens.
- **Empty / Error States:** Validates settings inputs before saving.
- **Suggested Follow-up Task ID:** `SETT-101`

---

### 3.3 City Head Portal

#### Screen 23: City Head Dashboard
- **Page ID / Component:** `city-head-dashboard` / [`src/components/modules/city-head/city-head-dashboard.tsx`](src/components/modules/city-head/city-head-dashboard.tsx)
- **Roles:** `city_head`
- **Status:** `Retain`
- **Role / Scope Concern:** City-scoped summary. Shows Lahore metrics (6 parks, 6 batches, 13 groups, 277 participants). Denies access to other cities.
- **Data Dependency:** Lahore dataset scoped to `assignedCityId = LHR`.
- **Operational Assessment:** Operational hub for City Head. Metrics, park comparison bar chart, 14-day attendance trend, fees overview, today's sessions list, and recent city activity.
- **Mobile & Responsive:** Responsive cards stack seamlessly on mobile viewports.
- **Empty / Error States:** Skeletal loading states and user-friendly error fallback.
- **Suggested Follow-up Task ID:** `CH-DASH-101`

---

### 3.4 Park Lead Portal

#### Screen 24: Park Lead Dashboard
- **Page ID / Component:** `park-dashboard` / [`src/components/modules/park/park-dashboard.tsx`](src/components/modules/park/park-dashboard.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Park-scoped summary for assigned park (e.g. State Life School).
- **Data Dependency:** Assigned park groups, roster, and active events.
- **Operational Assessment:** High usefulness for daily operations. Highlights today's sessions, roster count, and attendance completion.
- **Mobile & Responsive:** Card layout optimized for mobile tablets and phones.
- **Empty / Error States:** Displays empty session card when no sessions are active today.
- **Suggested Follow-up Task ID:** `PL-DASH-101`

#### Screen 25: Park Groups View
- **Page ID / Component:** `admin-groups` (scoped) / [`src/components/modules/admin/groups-page.tsx`](src/components/modules/admin/groups-page.tsx)
- **Roles:** `park_lead`
- **Status:** `Modify`
- **Role / Scope Concern:** Legacy code permits Park Lead group mutations (`organisation.manage`). Under Phase B hierarchy work (HIER-003), Park Lead will be restricted to view-only access for assigned-park groups.
- **Data Dependency:** Assigned park groups.
- **Operational Assessment:** Read-only view of groups in the assigned park.
- **Mobile & Responsive:** Mobile list view of park groups.
- **Empty / Error States:** Displays empty state if park has no groups.
- **Suggested Follow-up Task ID:** `HIER-003`

#### Screen 26: Park Attendance Session & Marking
- **Page ID / Component:** `park-attendance` / [`src/components/modules/park/park-attendance-page.tsx`](src/components/modules/park/park-attendance-page.tsx) + [`src/components/modules/park/attendance-roster.tsx`](src/components/modules/park/attendance-roster.tsx) + [`src/components/modules/park/offline-queue-panel.tsx`](src/components/modules/park/offline-queue-panel.tsx)
- **Roles:** `park_lead`, `park_admin`, `murabbi`
- **Status:** `Retain`
- **Role / Scope Concern:** Attendance session marking. Park Lead can make attendance corrections within assigned park. Integrated with local Dexie offline queue.
- **Data Dependency:** Group roster, attendance event records.
- **Operational Assessment:** Core operational workflow. Status toggles (Present / Late / Absent / Leave), bulk mark, offline queue sync, and session close/reset.
- **Mobile & Responsive:** Excellent touch roster with large tap targets for field use.
- **Empty / Error States:** Handles offline network loss gracefully with local Dexie queuing and sync indicator.
- **Suggested Follow-up Task ID:** `ATT-201`

---

### 3.5 Park Admin Portal

#### Screen 27: Park Admin Dashboard & Attendance Marker
- **Page ID / Component:** `park-dashboard` & `park-attendance` / [`src/components/modules/park/park-dashboard.tsx`](src/components/modules/park/park-dashboard.tsx) & [`src/components/modules/park/park-attendance-page.tsx`](src/components/modules/park/park-attendance-page.tsx)
- **Roles:** `park_admin`
- **Status:** `Retain` (with HIER-003 UAT assertion)
- **Role / Scope Concern:** In current UI navigation ([src/components/layout/sidebar.tsx](src/components/layout/sidebar.tsx) line 164), `park_admin` is mapped to `["park-dashboard", "park-attendance", "notifications"]`. Batches and Groups links are **not** exposed in the sidebar UI. Direct API POST/PATCH/DELETE denial for Park Admin on `/api/admin/batches` and `/api/admin/groups` will be asserted during HIER-003 browser UAT.
- **Data Dependency:** Assigned park attendance events and group roster.
- **Operational Assessment:** Execution portal for marking daily attendance in assigned park.
- **Mobile & Responsive:** Mobile-optimized touch roster for field attendance.
- **Empty / Error States:** Direct URL navigation to unmapped routes redirects or displays access denied.
- **Suggested Follow-up Task ID:** `HIER-003`

---

### 3.6 Murabbi Portal

#### Screen 28: Murabbi Dashboard
- **Page ID / Component:** `murabbi-dashboard` / [`src/components/modules/murabbi/murabbi-dashboard.tsx`](src/components/modules/murabbi/murabbi-dashboard.tsx)
- **Roles:** `murabbi`
- **Status:** `Retain`
- **Role / Scope Concern:** Group-only scope. Fails closed if assigned group context is missing (`MU-NONE`).
- **Data Dependency:** Assigned group record and participant roster in Lahore.
- **Operational Assessment:** Shows assigned group name, student count, recent session completion rate, and quick link to mark attendance.
- **Mobile & Responsive:** Clean 1-column layout for mobile smartphones.
- **Empty / Error States:** Unassigned Murabbi (`MU-NONE`) displays clear empty state with instructions to contact Park Lead.
- **Suggested Follow-up Task ID:** `MUR-101`

#### Screen 29: Murabbi Assigned Groups Page
- **Page ID / Component:** `murabbi-groups` / [`src/components/modules/murabbi/murabbi-groups-page.tsx`](src/components/modules/murabbi/murabbi-groups-page.tsx)
- **Roles:** `murabbi`
- **Status:** `Retain`
- **Role / Scope Concern:** Restricted strictly to assigned group. Cannot view other groups in the same park or city.
- **Data Dependency:** Assigned group participant roster.
- **Operational Assessment:** Renders group participant list, contact info, and attendance history summary.
- **Mobile & Responsive:** Responsive list cards with tap-to-call links.
- **Empty / Error States:** Displays empty state if no participants are assigned to the group.
- **Suggested Follow-up Task ID:** `MUR-102`

---

### 3.7 Guardian Portal

#### Screen 30: Guardian Dashboard
- **Page ID / Component:** `guardian-dashboard` / [`src/components/modules/guardian/guardian-dashboard.tsx`](src/components/modules/guardian/guardian-dashboard.tsx)
- **Roles:** `guardian`
- **Status:** `Retain`
- **Role / Scope Concern:** Family portal. Restricted strictly to linked ward(s).
- **Data Dependency:** Linked Lahore participant records, attendance logs, fee status.
- **Operational Assessment:** Attendance summary, upcoming session schedule, outstanding fee alerts, and announcements for linked ward.
- **Mobile & Responsive:** Cards wrap nicely on small mobile displays.
- **Empty / Error States:** Unlinked guardian sees phone-linking prompt screen.
- **Suggested Follow-up Task ID:** `GUARD-201`

#### Screen 31: Guardian Attendance History
- **Page ID / Component:** `guardian-history` / [`src/components/modules/guardian/guardian-history-page.tsx`](src/components/modules/guardian/guardian-history-page.tsx)
- **Roles:** `guardian`
- **Status:** `Retain`
- **Role / Scope Concern:** Linked ward attendance log only.
- **Data Dependency:** Historical attendance records for linked ward.
- **Operational Assessment:** Monthly attendance calendar and session log (Present / Late / Absent status).
- **Mobile & Responsive:** Mobile calendar grid with status indicators.
- **Empty / Error States:** Clean "No attendance records found" state for new enrollees.
- **Suggested Follow-up Task ID:** `GUARD-202`

#### Screen 32: Guardian Activity Schedule
- **Page ID / Component:** `guardian-schedule` / [`src/components/modules/guardian/guardian-schedule-page.tsx`](src/components/modules/guardian/guardian-schedule-page.tsx)
- **Roles:** `guardian`
- **Status:** `Retain`
- **Role / Scope Concern:** Ward's park and group session schedule only.
- **Data Dependency:** Session schedule for ward's group.
- **Operational Assessment:** Shows upcoming session dates, times, and park locations.
- **Mobile & Responsive:** Mobile list view of scheduled events.
- **Empty / Error States:** "No upcoming events scheduled" notification.
- **Suggested Follow-up Task ID:** `GUARD-203`

#### Screen 33: Guardian Fee Payments
- **Page ID / Component:** `guardian-fees` / [`src/components/modules/guardian/guardian-fees-page.tsx`](src/components/modules/guardian/guardian-fees-page.tsx)
- **Roles:** `guardian`
- **Status:** `Retain`
- **Role / Scope Concern:** Linked ward fee status and payment receipts.
- **Data Dependency:** Fee event and payment receipt records.
- **Operational Assessment:** Displays monthly fee status, paid receipts, and payment instructions.
- **Mobile & Responsive:** Mobile fee card with receipt preview drawer.
- **Empty / Error States:** "No outstanding fees" badge.
- **Suggested Follow-up Task ID:** `GUARD-204`

#### Screen 34: Guardian Announcements
- **Page ID / Component:** `guardian-announcements` / [`src/components/modules/guardian/guardian-announcements-page.tsx`](src/components/modules/guardian/guardian-announcements-page.tsx)
- **Roles:** `guardian`
- **Status:** `Retain`
- **Role / Scope Concern:** Targeted announcements for ward's city, park, or group.
- **Data Dependency:** Targeted announcement records.
- **Operational Assessment:** Feed of announcements with read/unread status.
- **Mobile & Responsive:** Mobile feed layout.
- **Empty / Error States:** "No announcements at this time" card.
- **Suggested Follow-up Task ID:** `GUARD-205`

---

### 3.8 Shabab (Student) Portal

#### Screen 35: Student Dashboard
- **Page ID / Component:** `student-dashboard` / [`src/components/modules/student/student-dashboard.tsx`](src/components/modules/student/student-dashboard.tsx)
- **Roles:** `student` (Shabab)
- **Status:** `Retain`
- **Role / Scope Concern:** Self-service student view. Restricted to own attendance, schedule, and profile.
- **Data Dependency:** Student's own participant record, attendance, and fee history.
- **Operational Assessment:** Personal overview showing overall attendance percentage, upcoming sessions, and recent announcements.
- **Mobile & Responsive:** High mobile usage; clean single-column cards.
- **Empty / Error States:** Handles initial state for newly assigned students.
- **Suggested Follow-up Task ID:** `STU-101`

#### Screen 36: Student Attendance History
- **Page ID / Component:** `student-history` / [`src/components/modules/student/student-history-page.tsx`](src/components/modules/student/student-history-page.tsx)
- **Roles:** `student`
- **Status:** `Retain`
- **Role / Scope Concern:** Own attendance history only.
- **Data Dependency:** Personal attendance records.
- **Operational Assessment:** Shows personal attendance log with status badges and monthly rates.
- **Mobile & Responsive:** Mobile list with date indicators.
- **Empty / Error States:** Empty history state display.
- **Suggested Follow-up Task ID:** `STU-102`

#### Screen 37: Student Activity Schedule
- **Page ID / Component:** `student-schedule` / [`src/components/modules/student/student-schedule-page.tsx`](src/components/modules/student/student-schedule-page.tsx)
- **Roles:** `student`
- **Status:** `Retain`
- **Role / Scope Concern:** Own group session schedule.
- **Data Dependency:** Group session schedule.
- **Operational Assessment:** View upcoming sessions, start times, and park locations.
- **Mobile & Responsive:** Mobile agenda view.
- **Empty / Error States:** "No upcoming sessions" card.
- **Suggested Follow-up Task ID:** `STU-103`

#### Screen 38: Student Fee History & Receipts
- **Page ID / Component:** `student-fees` / [`src/components/modules/student/student-fees-page.tsx`](src/components/modules/student/student-fees-page.tsx)
- **Roles:** `student`
- **Status:** `Retain`
- **Role / Scope Concern:** Own fee payment records only.
- **Data Dependency:** Student fee records and receipts.
- **Operational Assessment:** View fee breakdown, due dates, and paid receipt vouchers.
- **Mobile & Responsive:** Responsive card layout.
- **Empty / Error States:** "Fees fully paid" status badge.
- **Suggested Follow-up Task ID:** `STU-104`

#### Screen 39: Student Announcements
- **Page ID / Component:** `student-announcements` / [`src/components/modules/student/student-announcements-page.tsx`](src/components/modules/student/student-announcements-page.tsx)
- **Roles:** `student`
- **Status:** `Retain`
- **Role / Scope Concern:** Targeted announcements for student's group/park/city.
- **Data Dependency:** Announcement records.
- **Operational Assessment:** Feed of announcements published by City Head or HQ.
- **Mobile & Responsive:** Mobile feed view.
- **Empty / Error States:** "No announcements" fallback card.
- **Suggested Follow-up Task ID:** `STU-105`

#### Screen 40: Student Profile Page
- **Page ID / Component:** `student-profile` / [`src/components/modules/student/student-profile-page.tsx`](src/components/modules/student/student-profile-page.tsx)
- **Roles:** `student`
- **Status:** `Retain` (with `Modify`)
- **Role / Scope Concern:** Self-service profile view. Displays personal information.
- **Data Dependency:** Lahore participant record (name, phone, age, gradeClass, group, park, city).
- **Operational Assessment:** Shows student details, assigned park, group, and Murabbi name. Needs to display enriched Lahore Batch 4 fields (`age` and `gradeClass`).
- **Mobile & Responsive:** Profile summary card layout for mobile screens.
- **Empty / Error States:** Gracefully handles unassigned optional fields.
- **Suggested Follow-up Task ID:** `STU-106`

---

### 3.9 Standalone Park Operational Subviews

#### Screen 41: Park Roster View
- **Page ID / Component:** `park-roster` / [`src/components/modules/park/park-roster-page.tsx`](src/components/modules/park/park-roster-page.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Scoped to assigned park.
- **Data Dependency:** Park student roster.
- **Operational Assessment:** Quick print/view roster for daily physical sessions.
- **Mobile & Responsive:** Mobile table view with horizontal scrolling.
- **Empty / Error States:** "No roster participants" state.
- **Suggested Follow-up Task ID:** `PARK-201`

#### Screen 42: Park Participants View
- **Page ID / Component:** `park-participants` / [`src/components/modules/park/park-participants-page.tsx`](src/components/modules/park/park-participants-page.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Scoped to assigned park.
- **Data Dependency:** Participants in assigned park.
- **Operational Assessment:** Directory of park participants with group filters.
- **Mobile & Responsive:** Mobile list cards.
- **Empty / Error States:** Empty participant filter state.
- **Suggested Follow-up Task ID:** `PARK-202`

#### Screen 43: Park Guardians View
- **Page ID / Component:** `park-guardians` / [`src/components/modules/park/park-guardians-page.tsx`](src/components/modules/park/park-guardians-page.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Privacy masked guardian search for assigned park participants.
- **Data Dependency:** Guardian links for park participants.
- **Operational Assessment:** Contact directory for park leads to reach parents.
- **Mobile & Responsive:** Mobile cards with tap-to-call action.
- **Empty / Error States:** Prompt for phone search.
- **Suggested Follow-up Task ID:** `PARK-203`

#### Screen 44: Park Schedule View
- **Page ID / Component:** `park-schedule` / [`src/components/modules/park/park-schedule-page.tsx`](src/components/modules/park/park-schedule-page.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Scoped to assigned park.
- **Data Dependency:** Session calendar for park groups.
- **Operational Assessment:** Weekly session planner for park leads.
- **Mobile & Responsive:** Responsive calendar view.
- **Empty / Error States:** Empty day schedule indicator.
- **Suggested Follow-up Task ID:** `PARK-204`

---

### 3.10 Approved Future Modules (Planned Backlog)

#### Screen 45: Weekly Mashwara Workspace Screen
- **Page ID / Component:** `missing` / `(Planned Future Module)`
- **Roles:** City Head, Park Lead, Collaboration Team Members (Sports, Skills, Tadreeb, Media, Muawin)
- **Status:** `Missing`
- **Role / Scope Concern:** Approved future module per baseline memory. Requires meeting-scoped restricted access without expanding general hierarchy scope.
- **Data Dependency:** Mashwara meetings, attendance, Karguzari/MoM, decision log, team action items.
- **Operational Assessment:** High operational priority for weekly city/park mashwara coordination.
- **Suggested Follow-up Task ID:** `MASHWARA-001`

#### Screen 46: Calling System Outreach Workspace Screen
- **Page ID / Component:** `missing` / `(Planned Future Module)`
- **Roles:** Calling POC, Shabab Callers, External Support Callers
- **Status:** `Missing`
- **Role / Scope Concern:** Time-bounded responsibility workspace. External support callers get access ONLY to assigned leads, never general portal.
- **Data Dependency:** Outreach lead lists, call logs, WhatsApp manual deep-link templates, referral categories.
- **Operational Assessment:** Time-bounded outreach campaign management.
- **Suggested Follow-up Task ID:** `CALL-301`

---

## 4. Summary of Findings

### 4.1 Verified Code Findings (Empirically Verified in Code)

#### 1. High Severity: Batch End-Date Validation Missing (`B-V05`)
- **Verified Code Location:** [`src/app/api/admin/batches/route.ts`](src/app/api/admin/batches/route.ts)
- **Empirical Finding:** The Zod `batchSchema` validates `name` and `startDate` but lacks a refinement check verifying `endDate >= startDate`. Creating a batch with `endDate < startDate` passes schema validation instead of returning a `400` validation error.
- **Target Task:** `HIER-003`

#### 2. Medium Severity: Legacy Park Lead Group Mutation Permitted
- **Verified Code Location:** [`src/app/api/admin/groups/route.ts`](src/app/api/admin/groups/route.ts) and [`src/app/api/admin/groups/[id]/route.ts`](src/app/api/admin/groups/[id]/route.ts)
- **Empirical Finding:** In current legacy code, `park_lead` role defaults include `organisation.manage`, permitting Park Lead to execute POST/PATCH/DELETE operations on groups in their assigned park. Under Phase B hierarchy work (`HIER-003`), group mutation will be restricted to City Head / Super Admin, and Park Lead group access will be restricted to view-only (`403 Forbidden` on mutation).
- **Target Task:** `HIER-003`

#### 3. Medium Severity: Mobile Viewport Table Scrolling in Reports & Audit Log
- **Verified Code Location:** [`src/components/modules/admin/reports-page.tsx`](src/components/modules/admin/reports-page.tsx) and [`src/components/modules/admin/audit-log-page.tsx`](src/components/modules/admin/audit-log-page.tsx)
- **Empirical Finding:** Wide data tables require horizontal scrolling on narrow viewports (≤ 390px width). Responsive card list alternatives are recommended for mobile screens.
- **Target Task:** `UX-003`

#### 4. Low Severity: Guidance on Access Pending Screen for Unprovisioned Placeholders
- **Verified Code Location:** [`src/components/modules/auth/access-pending-page.tsx`](src/components/modules/auth/access-pending-page.tsx)
- **Empirical Finding:** Unprovisioned staff placeholder accounts landing on `AccessPendingPage` receive generic text. Adding direct City Head contact links improves onboarding clarity.
- **Target Task:** `AUTH-103`

---

### 4.2 UAT & Phase B Hierarchy Recommendations

1. **Park Admin API Direct Access Denial:**
   - **Verification Strategy:** UI navigation ([src/components/layout/sidebar.tsx](src/components/layout/sidebar.tsx) line 164) correctly hides Batches and Groups links for `park_admin`. During HIER-003 browser UAT, assert that direct API attempts to GET/POST `/api/admin/batches` or `/api/admin/groups` by Park Admin return `403 Forbidden`.

2. **Park Lead View-Only Group Policy Assertion:**
   - **Verification Strategy:** During HIER-003 browser UAT, assert that `park_lead` can view assigned-park groups but receives `403 Forbidden` on POST/PATCH/DELETE group requests.

3. **Lahore Participant Enriched Fields Display:**
   - **Verification Strategy:** Verify that `student-profile-page.tsx` renders the Lahore Batch 4 imported `age` and `gradeClass` fields.

---

## 5. Suggested Follow-Up Task Backlog Mapping

| Task ID | Component / Area | Description | Priority |
| --- | --- | --- | --- |
| `HIER-003` | Admin & Park API / UAT | Enforce B-V05 batch end-date validation, Park Lead view-only group policy, and Park Admin API denial | P0 |
| `MASHWARA-001` | Future Module | Build Weekly Mashwara meeting, attendance, Karguzari/MoM, and action items workspace | P1 |
| `CALL-301` | Future Module | Build time-bounded Calling System workspace with WhatsApp templates and referral logs | P1 |
| `STU-106` | Student Portal | Display `age` and `gradeClass` enriched Lahore fields on Student Profile screen | P2 |
| `UX-002` | Layout & i18n | Complete Urdu translation key coverage for sidebar nav sections | P2 |
| `UX-003` | Mobile UX | Implement responsive card list alternatives for wide reporting tables on mobile | P2 |
| `AUTH-103` | Auth | Enhance Access Pending screen with direct City Head contact links | P3 |

---

## 6. Audit Sign-Off & Verification Result

- **Total Screens Assessed:** 46 (44 existing role screens/views + 2 planned future module workspaces).
- **Code & Schema Impact:** Zero lines of application code, schema, migration, or test files modified.
- **`git diff --check` Result:** Clean (0 trailing whitespace warnings).
- **Status:** **Ready for Codex review**.
