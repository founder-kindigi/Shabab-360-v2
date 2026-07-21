# UX-001: Lahore-Backed Application Screen Inventory

**Task:** UX-001
**Owner:** Gemini
**Status:** Completed — ready for Codex review
**Created:** 2026-07-21
**Scope:** Comprehensive Lahore-backed screen audit for current role portals and operational screens. Docs only — no code, schema, migration, test, or data modifications.

---

## 1. Executive Summary & Audit Scope

This document provides a systematic, Lahore-backed inventory of every meaningful screen and user workflow in the Shabab 360 platform across all eight active demo roles (`super_admin`, `program_admin`, `city_head`, `park_lead`, `park_admin`, `murabbi`, `guardian`, and `student`).

### 1.1 Verified Data Baseline (Lahore Staging Data)

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
- **Page ID / Component:** `login` / [`login-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/auth/login-page.tsx)
- **Roles:** Unauthenticated / All Roles
- **Status:** `Retain` (with `Modify`)
- **Role / Scope Concern:** None. Authenticates credentials via NextAuth and routes user to role-default landing page.
- **Data Dependency:** NextAuth Credentials Provider, bcrypt user table.
- **Operational Assessment:** Essential entry point. Supports email/password login and quick demo-role switches for testing.
- **Mobile & Responsive:** Excellent. Responsive container, clear touch targets.
- **Empty / Error States:** Invalid credentials display inline error toast. No crash on bad input.
- **Suggested Follow-up Task ID:** `AUTH-101`

#### Screen 02: Password Reset Screen
- **Page ID / Component:** `reset-password` / [`reset-password-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/auth/reset-password-page.tsx)
- **Roles:** Authenticated User (Forced Reset / Self-Service)
- **Status:** `Retain` (with `Modify`)
- **Role / Scope Concern:** Self-service exemption. Users with forced password reset flags are restricted to this page until password update completes.
- **Data Dependency:** User account record (`forcePasswordReset` flag).
- **Operational Assessment:** Essential security hardening. Clears session state and enforces bcrypt password complexity rules.
- **Mobile & Responsive:** Fully responsive single-column form.
- **Empty / Error States:** Shows field validation errors for weak passwords or mismatched confirmation.
- **Suggested Follow-up Task ID:** `AUTH-102`

#### Screen 03: Access Pending Screen
- **Page ID / Component:** `access-pending` / [`access-pending-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/auth/access-pending-page.tsx)
- **Roles:** Inactive / Unassigned Staff Placeholders (`example.invalid`)
- **Status:** `Retain`
- **Role / Scope Concern:** Fail-closed boundary. Inactive staff accounts without assigned city/park scope are safely held here with zero data access.
- **Data Dependency:** Staff metadata (`isActive = false` or null assignment).
- **Operational Assessment:** Prevents unprovisioned staff placeholders from viewing portal data.
- **Mobile & Responsive:** Centered mobile card layout.
- **Empty / Error States:** Displays clear instructions to contact Super Admin.
- **Suggested Follow-up Task ID:** `AUTH-103`

---

### 3.2 Super Admin / Program Admin Portal

#### Screen 04: Super Admin Dashboard
- **Page ID / Component:** `admin-dashboard` / [`admin-dashboard.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/admin-dashboard.tsx)
- **Roles:** `super_admin`, `program_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Global HQ scope. Shows national aggregate metrics across all cities.
- **Data Dependency:** Lahore dataset aggregates (1 city, 6 parks, 6 batches, 13 groups, 277 participants, 180 events).
- **Operational Assessment:** High usefulness. 2x2 top metric cards, 14-day trend charts, quick actions, and recent audit activity feed.
- **Mobile & Responsive:** Responsive 2-column grid switches to 1-column on mobile. Touch targets ≥ 44px.
- **Empty / Error States:** Skeletal loaders during query fetch; graceful empty card fallback.
- **Suggested Follow-up Task ID:** `DASH-001`

#### Screen 05: Cities Management
- **Page ID / Component:** `admin-cities` / [`cities-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/cities-page.tsx)
- **Roles:** `super_admin` only (Denied to `city_head`)
- **Status:** `Retain`
- **Role / Scope Concern:** Correctly restricted to Super Admin. City Head is strictly denied access.
- **Data Dependency:** Lahore city record (`LHR`, name: "Lahore").
- **Operational Assessment:** Allows creating and managing city records. Shows park and batch counts per city.
- **Mobile & Responsive:** Card layout on mobile screens with responsive creation dialog.
- **Empty / Error States:** Displays "No cities found" when database is unseeded.
- **Suggested Follow-up Task ID:** `CITY-101`

#### Screen 06: Parks Management
- **Page ID / Component:** `admin-parks` / [`parks-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/parks-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain` (with `Modify`)
- **Role / Scope Concern:** Scoped correctly: Super Admin sees all cities; City Head sees only assigned city parks (e.g. Lahore's 6 parks).
- **Data Dependency:** 6 Lahore parks (State Life School, Iqbal Park, etc.).
- **Operational Assessment:** Displays park list, group counts, assigned park leads/admins, and park creation dialog.
- **Mobile & Responsive:** Responsive grid adapts to single-column mobile view.
- **Empty / Error States:** Shows empty state component when city has zero parks.
- **Suggested Follow-up Task ID:** `PARK-101`

#### Screen 07: Batches Management
- **Page ID / Component:** `admin-batches` / [`batches-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/batches-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped), `park_lead` (read-only city batches)
- **Status:** `Modify`
- **Role / Scope Concern:** Park Admin and Murabbi are denied. Aligns with HIER-002 city-owned batch model.
- **Data Dependency:** 6 Lahore batches ("Batch 4").
- **Operational Assessment:** Manages batch creation and dates. Needs validation rule fix for start/end dates (`B-V05`).
- **Mobile & Responsive:** Card layout for mobile. Date inputs use native mobile pickers.
- **Empty / Error States:** Displays "No batches found" empty state.
- **Suggested Follow-up Task ID:** `HIER-003`

#### Screen 08: Groups Management
- **Page ID / Component:** `admin-groups` / [`groups-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/groups-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped), `park_lead` (read-only assigned park)
- **Status:** `Modify`
- **Role / Scope Concern:** Enforces same-city invariant (`group.park.cityId === group.batch.cityId`). Park Admin denied access. Park Lead restricted to read-only view of assigned park groups per HIER-003.
- **Data Dependency:** 13 Lahore groups.
- **Operational Assessment:** Manages group naming, park/batch linking, and participant counts.
- **Mobile & Responsive:** Clean mobile card layout with dropdown selectors.
- **Empty / Error States:** Filters empty groups gracefully.
- **Suggested Follow-up Task ID:** `HIER-003`

#### Screen 09: People / Staff Directory
- **Page ID / Component:** `admin-people` / [`people-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/people-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** City Head manages only Lahore staff (`park_lead`, `park_admin`, `murabbi`). Super Admin sees global staff.
- **Data Dependency:** 51 Lahore staff placeholders + 1 Super Admin.
- **Operational Assessment:** Staff listing, role filter, assigned park/group context display, and profile trigger.
- **Mobile & Responsive:** Mobile card list view with quick search input.
- **Empty / Error States:** Shows empty search state when no staff match filters.
- **Suggested Follow-up Task ID:** `STAFF-101`

#### Screen 10: Students Directory & Participant Detail
- **Page ID / Component:** `admin-students` / [`students-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/students-page.tsx) + [`participant-detail-sheet.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/participant-detail-sheet.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain` (with `Modify`)
- **Role / Scope Concern:** Scoped by city. Displays full Lahore student roster with detail drawer.
- **Data Dependency:** 277 Lahore participants (257 active, 20 dropouts, age, gradeClass).
- **Operational Assessment:** High operational utility. Roster search, filter by park/group, dropout status badge, age, and grade class.
- **Mobile & Responsive:** Slide-over detail sheet is scrollable and readable on mobile viewports.
- **Empty / Error States:** Renders empty state when search query returns 0 matches.
- **Suggested Follow-up Task ID:** `STUDENT-101`

#### Screen 11: Guardians Directory & Detail Sheet
- **Page ID / Component:** `admin-guardians` / [`guardians-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/guardians-page.tsx) + [`guardian-detail-sheet.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/guardian-detail-sheet.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Privacy hardened. Exact phone search only, phone masked, CNIC and address redacted from response.
- **Data Dependency:** Guardian linking records for Lahore participants.
- **Operational Assessment:** Manages guardian profile records and participant links.
- **Mobile & Responsive:** Mobile sheet view for linked wards.
- **Empty / Error States:** Prompts for exact phone entry when searching.
- **Suggested Follow-up Task ID:** `GUARD-101`

#### Screen 12: Attendance Events Administration
- **Page ID / Component:** `admin-attendance-events` / [`admin-attendance-events.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/admin-attendance-events.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Global/City monitoring of attendance sessions. Fails closed if city context missing.
- **Data Dependency:** 180 Lahore historical attendance events.
- **Operational Assessment:** Reviews session completion rates, marked vs total counts, and event status (Open/Closed).
- **Mobile & Responsive:** Session card layout with inline progress bars.
- **Empty / Error States:** Displays calendar empty state when no events exist for selected date.
- **Suggested Follow-up Task ID:** `ATT-101`

#### Screen 13: Admissions Management
- **Page ID / Component:** `admin-admissions` / [`admissions-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/admissions-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** City Head manages admissions within assigned city only.
- **Data Dependency:** Admission application pipeline records.
- **Operational Assessment:** Application review, interview scheduling, approval, and participant conversion workflow.
- **Mobile & Responsive:** Responsive pipeline stage tabs and mobile modal dialogs.
- **Empty / Error States:** Clear empty pipeline stage indicator.
- **Suggested Follow-up Task ID:** `ADM-101`

#### Screen 14: Fees & Receipts Management
- **Page ID / Component:** `admin-fees` / [`fees-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/fees-page.tsx)
- **Roles:** `super_admin`, `program_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Financial management requires exact-money math and transaction safety.
- **Data Dependency:** Batch fee structures and fee payment records.
- **Operational Assessment:** Manages fee events, collection tracking, and receipt generation.
- **Mobile & Responsive:** Financial summary cards stack vertically on mobile.
- **Empty / Error States:** Zero pending fees displays clean confirmation state.
- **Suggested Follow-up Task ID:** `FEE-101`

#### Screen 15: Announcements Administration
- **Page ID / Component:** `admin-announcements` / [`announcements-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/announcements-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Targeted broadcasts. City Head can publish announcements targeted to assigned city/parks only.
- **Data Dependency:** Announcement publication records.
- **Operational Assessment:** Creates and publishes targeted announcements with role and scope filters.
- **Mobile & Responsive:** Responsive card list view with action controls.
- **Empty / Error States:** Empty state card with "Create Announcement" trigger.
- **Suggested Follow-up Task ID:** `ANNC-101`

#### Screen 16: System Reports
- **Page ID / Component:** `admin-reports` / [`reports-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/reports-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Scoped report generation. City Head reports are filtered by `assignedCityId`.
- **Data Dependency:** Lahore attendance (2,967 records) and fee history.
- **Operational Assessment:** Generates attendance summary reports, fee collection breakdowns, and export previews.
- **Mobile & Responsive:** Report preview tables wrap with horizontal scroll container on mobile.
- **Empty / Error States:** Shows filter prompt when no date range selected.
- **Suggested Follow-up Task ID:** `REP-101`

#### Screen 17: Audit Log Viewer
- **Page ID / Component:** `admin-audit-log` / [`audit-log-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/audit-log-page.tsx)
- **Roles:** `super_admin`, `program_admin` (requires `audit.view`)
- **Status:** `Retain`
- **Role / Scope Concern:** Restricted to HQ. Requires `audit.view` capability; sensitive audit fields are redacted.
- **Data Dependency:** System audit log table.
- **Operational Assessment:** Displays chronological system mutations with actor, action type, and entity target.
- **Mobile & Responsive:** Compact log card list view for small viewports.
- **Empty / Error States:** "No audit logs found" fallback message.
- **Suggested Follow-up Task ID:** `AUDIT-101`

#### Screen 18: Access Management Overrides
- **Page ID / Component:** `admin-access-management` / [`access-management-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/access-management-page.tsx)
- **Roles:** `super_admin` only
- **Status:** `Retain`
- **Role / Scope Concern:** Implements AM-001–AM-005. Default role matrix + named user overrides with fail-closed checks.
- **Data Dependency:** Role capabilities and user overrides database tables.
- **Operational Assessment:** High security value. Allows Super Admin to grant/revert/expire individual capability overrides without bypassing hierarchy scope.
- **Mobile & Responsive:** Tabbed interface for Role Matrix vs User Overrides.
- **Empty / Error States:** Displays "No active user overrides" state.
- **Suggested Follow-up Task ID:** `AM-005`

#### Screen 19: Staff Access Provisioning
- **Page ID / Component:** `admin-access` / [`access-provisioning-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/access-provisioning-page.tsx)
- **Roles:** `super_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** Assigns staff role and park/group scope. City Head can provision staff only within assigned city.
- **Data Dependency:** 51 Lahore staff placeholder accounts.
- **Operational Assessment:** Provisioning workflow to activate staff placeholders, assign canonical role, and set scope.
- **Mobile & Responsive:** Step-by-step form dialog optimized for touch.
- **Empty / Error States:** Explicit validation error on missing scope selection.
- **Suggested Follow-up Task ID:** `PROV-101`

#### Screen 20: User Accounts Management
- **Page ID / Component:** `admin-users` / [`users-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/users-page.tsx)
- **Roles:** `super_admin`, `program_admin`, `city_head` (city-scoped)
- **Status:** `Retain`
- **Role / Scope Concern:** User account status and password reset trigger. Access admin roles cannot be assigned by named overrides.
- **Data Dependency:** Application user accounts.
- **Operational Assessment:** Lists accounts, triggers forced password reset, and manages user status.
- **Mobile & Responsive:** Mobile list cards with clear action dropdowns.
- **Empty / Error States:** Filters empty results gracefully.
- **Suggested Follow-up Task ID:** `USER-101`

#### Screen 21: Notifications Administration
- **Page ID / Component:** `notifications` / [`notifications-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/notifications-page.tsx)
- **Roles:** All Authenticated Roles (Scoped view)
- **Status:** `Retain`
- **Role / Scope Concern:** Outbox privacy enforced. Users see only own notifications or targeted announcements.
- **Data Dependency:** Notification queue table.
- **Operational Assessment:** Displays notification inbox, mark-as-read triggers, and system alerts.
- **Mobile & Responsive:** Mobile notification list with swipe/tap actions.
- **Empty / Error States:** Clean "No notifications" inbox state.
- **Suggested Follow-up Task ID:** `NOTIF-101`

#### Screen 22: System Settings
- **Page ID / Component:** `admin-settings` / [`settings-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/settings-page.tsx)
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
- **Page ID / Component:** `city-head-dashboard` / [`city-head-dashboard.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/city-head/city-head-dashboard.tsx)
- **Roles:** `city_head`
- **Status:** `Retain`
- **Role / Scope Concern:** City-scoped summary. Shows Lahore metrics (6 parks, 6 batches, 13 groups, 277 participants). Denies access to other cities.
- **Data Dependency:** Lahore dataset scoped to `assignedCityId = LHR`.
- **Operational Assessment:** Excellent operational hub. 2x2 metrics, park comparison bar chart, 14-day attendance trend, fees overview, today's sessions list, and recent city activity.
- **Mobile & Responsive:** Responsive cards stack seamlessly on mobile viewports.
- **Empty / Error States:** Skeletal loading states and user-friendly error fallback.
- **Suggested Follow-up Task ID:** `CH-DASH-101`

---

### 3.4 Park Lead Portal

#### Screen 24: Park Lead Dashboard
- **Page ID / Component:** `park-dashboard` / [`park-dashboard.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/park-dashboard.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain` (with `Modify`)
- **Role / Scope Concern:** Park-scoped summary for assigned park (e.g. State Life School).
- **Data Dependency:** Assigned park groups, roster, and active events.
- **Operational Assessment:** High usefulness for daily operations. Highlights today's sessions, roster count, and attendance completion.
- **Mobile & Responsive:** Card layout optimized for mobile tablets and phones.
- **Empty / Error States:** Displays empty session card when no sessions are active today.
- **Suggested Follow-up Task ID:** `PL-DASH-101`

#### Screen 25: Park Groups View
- **Page ID / Component:** `admin-groups` (scoped) / [`groups-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/admin/groups-page.tsx)
- **Roles:** `park_lead`
- **Status:** `Modify`
- **Role / Scope Concern:** Per HIER-003 deterministic policy: Park Lead may view assigned-park groups; create, edit, and delete are **403 Forbidden** unless Codex approves an explicit change.
- **Data Dependency:** Assigned park groups.
- **Operational Assessment:** Read-only view of groups in the assigned park.
- **Mobile & Responsive:** Mobile list view of park groups.
- **Empty / Error States:** Displays empty state if park has no groups.
- **Suggested Follow-up Task ID:** `HIER-003`

#### Screen 26: Park Attendance Session & Marking
- **Page ID / Component:** `park-attendance` / [`park-attendance-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/park-attendance-page.tsx) + [`attendance-roster.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/attendance-roster.tsx) + [`offline-queue-panel.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/offline-queue-panel.tsx)
- **Roles:** `park_lead`, `park_admin`, `murabbi`
- **Status:** `Retain`
- **Role / Scope Concern:** Attendance session marking. Park Lead can make attendance corrections within assigned park. Integrated with local Dexie offline queue.
- **Data Dependency:** Group roster, attendance event records.
- **Operational Assessment:** Critical core workflow. Rapid status toggles (Present / Late / Absent / Leave), bulk mark, offline queue sync, and session close/reset.
- **Mobile & Responsive:** Excellent touch roster with large tap targets for field use.
- **Empty / Error States:** Handles offline network loss gracefully with local Dexie queuing and sync indicator.
- **Suggested Follow-up Task ID:** `ATT-201`

---

### 3.5 Park Admin Portal

#### Screen 27: Park Admin Dashboard & Attendance Marker
- **Page ID / Component:** `park-dashboard` & `park-attendance` / [`park-dashboard.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/park-dashboard.tsx) & [`park-attendance-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/park-attendance-page.tsx)
- **Roles:** `park_admin`
- **Status:** `Modify`
- **Role / Scope Concern:** Per HIER-003: Park Admin is **denied Batches and Groups navigation and API access**. Approved scope is attendance in assigned park only.
- **Data Dependency:** Assigned park attendance events and group roster.
- **Operational Assessment:** Focused execution portal for marking daily attendance in assigned park. Navigation sidebar excludes Batches and Groups links.
- **Mobile & Responsive:** Mobile-optimized touch roster for field attendance.
- **Empty / Error States:** Navigating directly to `/admin/batches` or `/admin/groups` yields 403 Forbidden page.
- **Suggested Follow-up Task ID:** `HIER-003`

---

### 3.6 Murabbi Portal

#### Screen 28: Murabbi Dashboard
- **Page ID / Component:** `murabbi-dashboard` / [`murabbi-dashboard.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/murabbi/murabbi-dashboard.tsx)
- **Roles:** `murabbi`
- **Status:** `Retain`
- **Role / Scope Concern:** Group-only scope. Fails closed if assigned group context is missing (`MU-NONE`).
- **Data Dependency:** Assigned group record and participant roster in Lahore.
- **Operational Assessment:** Shows assigned group name, student count, recent session completion rate, and quick link to mark attendance.
- **Mobile & Responsive:** Clean 1-column layout for mobile smartphones.
- **Empty / Error States:** Unassigned Murabbi (`MU-NONE`) displays clear empty state with instructions to contact Park Lead.
- **Suggested Follow-up Task ID:** `MUR-101`

#### Screen 29: Murabbi Assigned Groups Page
- **Page ID / Component:** `murabbi-groups` / [`murabbi-groups-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/murabbi/murabbi-groups-page.tsx)
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
- **Page ID / Component:** `guardian-dashboard` / [`guardian-dashboard.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/guardian/guardian-dashboard.tsx)
- **Roles:** `guardian`
- **Status:** `Retain`
- **Role / Scope Concern:** Family portal. Restricted strictly to linked ward(s).
- **Data Dependency:** Linked Lahore participant records, attendance logs, fee status.
- **Operational Assessment:** Provides parents with attendance summary, upcoming session schedule, outstanding fee alerts, and announcements.
- **Mobile & Responsive:** High mobile priority. Cards wrap nicely on small mobile displays.
- **Empty / Error States:** Unlinked guardian sees phone-linking prompt screen.
- **Suggested Follow-up Task ID:** `GUARD-201`

#### Screen 31: Guardian Attendance History
- **Page ID / Component:** `guardian-history` / [`guardian-history-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/guardian/guardian-history-page.tsx)
- **Roles:** `guardian`
- **Status:** `Retain`
- **Role / Scope Concern:** Linked ward attendance log only.
- **Data Dependency:** Historical attendance records for linked ward.
- **Operational Assessment:** Monthly attendance calendar and session log (Present / Late / Absent status).
- **Mobile & Responsive:** Mobile calendar grid with status indicators.
- **Empty / Error States:** Clean "No attendance records found" state for new enrollees.
- **Suggested Follow-up Task ID:** `GUARD-202`

#### Screen 32: Guardian Activity Schedule
- **Page ID / Component:** `guardian-schedule` / [`guardian-schedule-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/guardian/guardian-schedule-page.tsx)
- **Roles:** `guardian`
- **Status:** `Retain`
- **Role / Scope Concern:** Ward's park and group session schedule only.
- **Data Dependency:** Session schedule for ward's group.
- **Operational Assessment:** Shows upcoming session dates, times, and park locations.
- **Mobile & Responsive:** Mobile list view of scheduled events.
- **Empty / Error States:** "No upcoming events scheduled" notification.
- **Suggested Follow-up Task ID:** `GUARD-203`

#### Screen 33: Guardian Fee Payments
- **Page ID / Component:** `guardian-fees` / [`guardian-fees-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/guardian/guardian-fees-page.tsx)
- **Roles:** `guardian`
- **Status:** `Retain`
- **Role / Scope Concern:** Linked ward fee status and payment receipts.
- **Data Dependency:** Fee event and payment receipt records.
- **Operational Assessment:** Displays monthly fee status, paid receipts, and payment instructions.
- **Mobile & Responsive:** Mobile fee card with receipt preview drawer.
- **Empty / Error States:** "No outstanding fees" badge.
- **Suggested Follow-up Task ID:** `GUARD-204`

#### Screen 34: Guardian Announcements
- **Page ID / Component:** `guardian-announcements` / [`guardian-announcements-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/guardian/guardian-announcements-page.tsx)
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
- **Page ID / Component:** `student-dashboard` / [`student-dashboard.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/student/student-dashboard.tsx)
- **Roles:** `student` (Shabab)
- **Status:** `Retain`
- **Role / Scope Concern:** Self-service student view. Restricted to own attendance, schedule, and profile.
- **Data Dependency:** Student's own participant record, attendance, and fee history.
- **Operational Assessment:** Personal overview showing overall attendance percentage, upcoming sessions, and recent announcements.
- **Mobile & Responsive:** High mobile usage; clean single-column cards.
- **Empty / Error States:** Handles initial state for newly assigned students.
- **Suggested Follow-up Task ID:** `STU-101`

#### Screen 36: Student Attendance History
- **Page ID / Component:** `student-history` / [`student-history-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/student/student-history-page.tsx)
- **Roles:** `student`
- **Status:** `Retain`
- **Role / Scope Concern:** Own attendance history only.
- **Data Dependency:** Personal attendance records.
- **Operational Assessment:** Shows personal attendance log with status badges and monthly rates.
- **Mobile & Responsive:** Mobile list with date indicators.
- **Empty / Error States:** Empty history state display.
- **Suggested Follow-up Task ID:** `STU-102`

#### Screen 37: Student Activity Schedule
- **Page ID / Component:** `student-schedule` / [`student-schedule-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/student/student-schedule-page.tsx)
- **Roles:** `student`
- **Status:** `Retain`
- **Role / Scope Concern:** Own group session schedule.
- **Data Dependency:** Group session schedule.
- **Operational Assessment:** View upcoming sessions, start times, and park locations.
- **Mobile & Responsive:** Mobile agenda view.
- **Empty / Error States:** "No upcoming sessions" card.
- **Suggested Follow-up Task ID:** `STU-103`

#### Screen 38: Student Fee History & Receipts
- **Page ID / Component:** `student-fees` / [`student-fees-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/student/student-fees-page.tsx)
- **Roles:** `student`
- **Status:** `Retain`
- **Role / Scope Concern:** Own fee payment records only.
- **Data Dependency:** Student fee records and receipts.
- **Operational Assessment:** View fee breakdown, due dates, and paid receipt vouchers.
- **Mobile & Responsive:** Responsive card layout.
- **Empty / Error States:** "Fees fully paid" status badge.
- **Suggested Follow-up Task ID:** `STU-104`

#### Screen 39: Student Announcements
- **Page ID / Component:** `student-announcements` / [`student-announcements-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/student/student-announcements-page.tsx)
- **Roles:** `student`
- **Status:** `Retain`
- **Role / Scope Concern:** Targeted announcements for student's group/park/city.
- **Data Dependency:** Announcement records.
- **Operational Assessment:** Feed of announcements published by City Head or HQ.
- **Mobile & Responsive:** Mobile feed view.
- **Empty / Error States:** "No announcements" fallback card.
- **Suggested Follow-up Task ID:** `STU-105`

#### Screen 40: Student Profile Page
- **Page ID / Component:** `student-profile` / [`student-profile-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/student/student-profile-page.tsx)
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
- **Page ID / Component:** `park-roster` / [`park-roster-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/park-roster-page.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Scoped to assigned park.
- **Data Dependency:** Park student roster.
- **Operational Assessment:** Quick print/view roster for daily physical sessions.
- **Mobile & Responsive:** Mobile table view with horizontal scrolling.
- **Empty / Error States:** "No roster participants" state.
- **Suggested Follow-up Task ID:** `PARK-201`

#### Screen 42: Park Participants View
- **Page ID / Component:** `park-participants` / [`park-participants-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/park-participants-page.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Scoped to assigned park.
- **Data Dependency:** Participants in assigned park.
- **Operational Assessment:** Directory of park participants with group filters.
- **Mobile & Responsive:** Mobile list cards.
- **Empty / Error States:** Empty participant filter state.
- **Suggested Follow-up Task ID:** `PARK-202`

#### Screen 43: Park Guardians View
- **Page ID / Component:** `park-guardians` / [`park-guardians-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/park-guardians-page.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Privacy masked guardian search for assigned park participants.
- **Data Dependency:** Guardian links for park participants.
- **Operational Assessment:** Contact directory for park leads to reach parents.
- **Mobile & Responsive:** Mobile cards with tap-to-call action.
- **Empty / Error States:** Prompt for phone search.
- **Suggested Follow-up Task ID:** `PARK-203`

#### Screen 44: Park Schedule View
- **Page ID / Component:** `park-schedule` / [`park-schedule-page.tsx`](file:///d:/iBuild/Shabab-360-v2/src/components/modules/park/park-schedule-page.tsx)
- **Roles:** `park_lead`, `park_admin`
- **Status:** `Retain`
- **Role / Scope Concern:** Scoped to assigned park.
- **Data Dependency:** Session calendar for park groups.
- **Operational Assessment:** Weekly session planner for park leads.
- **Mobile & Responsive:** Responsive calendar view.
- **Empty / Error States:** Empty day schedule indicator.
- **Suggested Follow-up Task ID:** `PARK-204`

---

### 3.10 Missing Modules / Gaps Identified

#### Screen 45: Weekly Mashwara Workspace Screen
- **Page ID / Component:** `missing` / `(Not Implemented)`
- **Roles:** City Head, Park Lead, Collaboration Team Members (Sports, Skills, Tadreeb, Media, Muawin)
- **Status:** `Missing`
- **Role / Scope Concern:** Approved future module per baseline memory. Requires meeting-scoped restricted access without expanding general hierarchy scope.
- **Data Dependency:** Mashwara meetings, attendance, Karguzari/MoM, decision log, team action items.
- **Operational Assessment:** High operational priority for weekly city/park mashwara coordination.
- **Suggested Follow-up Task ID:** `MASHWARA-001`

#### Screen 46: Calling System Outreach Workspace Screen
- **Page ID / Component:** `missing` / `(Not Implemented)`
- **Roles:** Calling POC, Shabab Callers, External Support Callers
- **Status:** `Missing`
- **Role / Scope Concern:** Time-bounded responsibility workspace. External support callers get access ONLY to assigned leads, never general portal.
- **Data Dependency:** Outreach lead lists, call logs, WhatsApp manual deep-link templates, referral categories.
- **Operational Assessment:** Time-bounded outreach campaign management.
- **Suggested Follow-up Task ID:** `CALL-301`

#### Screen 47: Lahore Batch 4 Exception Reconciliation Workspace
- **Page ID / Component:** `missing` / `(Not Implemented)`
- **Roles:** Super Admin, City Head
- **Status:** `Missing`
- **Role / Scope Concern:** Administrative data cleaning interface.
- **Data Dependency:** 23 unnumbered roster candidates, 20 dropout decisions, blank Murabbi scope assignments.
- **Operational Assessment:** Visual workspace for reviewing and resolving non-writing Lahore Batch 4 parser candidates before production staging.
- **Suggested Follow-up Task ID:** `AM-006`

---

## 4. Key Findings Summary (Ordered by Severity)

### 4.1 Critical Severity (P0)

1. **Park Admin Scope Boundary Leak in Navigation Configuration:**
   - **Finding:** In `src/components/layout/sidebar.tsx`, navigation items for `park_admin` include `park-dashboard`, `park-attendance`, and `notifications`. However, direct navigation to `/admin/batches` or `/admin/groups` must remain strictly blocked (`403 Forbidden`) per HIER-003 guidelines. Park Admin scope is strictly limited to marking attendance in assigned park only.
   - **Remediation Task:** `HIER-003`

2. **Park Lead Group Management Permission Ambiguity:**
   - **Finding:** Prior documents allowed non-deterministic "succeeds if capability is granted" logic for Park Lead group creation/editing. HIER-003 enforces a strict deterministic policy: *Park Lead may view assigned-park groups; create, edit, and delete are denied unless Codex approves.*
   - **Remediation Task:** `HIER-003`

---

### 4.2 High Severity (P1)

3. **Batch Creation End-Date Validation (`B-V05`):**
   - **Finding:** `BatchesPage` dialog accepts batch end dates before start dates without returning a validation error.
   - **Remediation Task:** `HIER-003`

4. **Lahore Participant Enriched Fields Display in Student Profile:**
   - **Finding:** The Lahore Batch 4 import added `age` and `gradeClass` to `Participant`, but `student-profile-page.tsx` does not display these fields prominently.
   - **Remediation Task:** `STU-106`

5. **Lack of Visual Reconciliation Workspace for AM-006 Candidates:**
   - **Finding:** 23 unnumbered roster candidates and 20 dropouts from Lahore Batch 4 require administrative decision management in a dedicated UI before staging deployment.
   - **Remediation Task:** `AM-006`

---

### 4.3 Medium Severity (P2)

6. **Navigation Clarity & Section Label Localization:**
   - **Finding:** Sidebar section titles use English fallback strings when Urdu translation keys are unseeded.
   - **Remediation Task:** `UX-002`

7. **Mobile Table Horizontal Scrolling in Reports & Audit Log:**
   - **Finding:** Wide data tables on `reports-page.tsx` and `audit-log-page.tsx` require horizontal scrolling on narrow viewports (≤ 390px). Responsive card views are recommended for mobile.
   - **Remediation Task:** `UX-003`

---

### 4.4 Low Severity (P3)

8. **Unassigned State Guidance for Placeholder Accounts:**
   - **Finding:** Staff placeholders (`example.invalid`) landing on `AccessPendingPage` need clearer contact links for City Head provisioning.
   - **Remediation Task:** `AUTH-103`

---

## 5. Suggested Follow-Up Task Backlog Mapping

| Task ID | Component / Area | Description | Priority |
| --- | --- | --- | --- |
| `HIER-003` | Admin & Park Portals | Enforce Park Admin & Park Lead deterministic group/batch policies and B-V05 date validation | P0 |
| `AM-006` | Admin Import Workspace | Create visual reconciliation UI for Lahore Batch 4 candidate exceptions | P1 |
| `MASHWARA-001` | Modules | Build Weekly Mashwara meeting, attendance, Karguzari/MoM, and action items workspace | P1 |
| `CALL-301` | Outreach | Build time-bounded Calling System workspace with WhatsApp templates and referral logs | P1 |
| `STU-106` | Student Portal | Display `age` and `gradeClass` enriched Lahore fields on Student Profile screen | P2 |
| `UX-002` | Layout & i18n | Complete Urdu translation key coverage for sidebar nav sections | P2 |
| `UX-003` | Mobile UX | Implement responsive card list alternatives for wide reporting tables on mobile | P2 |
| `AUTH-103` | Auth | Enhance Access Pending screen with direct City Head contact links | P3 |

---

## 6. Audit Sign-Off & Verification Result

- **Total Screens Assessed:** 47 (44 existing role screens/views + 3 missing module workspaces).
- **Code & Schema Impact:** Zero lines of application code, schema, migration, or test files modified.
- **`git diff --check` Result:** Clean (0 trailing whitespace warnings).
- **Status:** **Ready for Codex review**.
