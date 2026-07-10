# Shabab360 Project Working and Refinement Guide

Last reviewed: 2026-07-04

## 1. Purpose of this document

This document explains how the current Shabab360 project works today. It is meant to help refine the project because the current system is broader than the desired requirements and contains overlapping workspaces.

Use this document as a baseline. For every module, decide whether it should be kept, simplified, merged, hidden, or removed.

This document does not store passwords, API keys, or service role secrets. Login credentials should be managed through Supabase Auth or the admin access workspace, not committed into project documentation.

## 2. One-page summary

Shabab360 is a browser-based program operations platform for managing Shabab activities across cities, parks, batches, groups, attendance, admissions, fees, content, procurement, and family follow-up.

The project currently has five main surfaces:

| Surface | Main routes | Primary users | Current purpose |
|---|---|---|---|
| Public site | `/`, `/apply`, `/apply/status` | Public families | Program entry, admissions application, application status tracking |
| Auth | `/login`, `/reset-password`, `/access-pending`, `/auth/callback` | All users | Email/password login, first-login reset, magic link callback, pending-access state |
| Admin | `/admin/*` | `super_admin`, `program_admin`, `city_head` | HQ and city operations |
| Park | `/park/*` | `park_admin`, `park_lead`, `murabbi` | Park-level attendance and family operations |
| Family portals | `/guardian/*`, `/student/*` | Guardians and students | Read-only personal progress, fees, schedule, announcements, resources |

The current system is functionally rich but not lean. The biggest product problem is not missing functionality. The bigger problem is that similar work appears across too many pages:

- Ops Center
- Family Ops
- Attendance Command
- Attendance Alerts
- Attendance Insights
- Fee Alerts
- Access Alerts
- Student Progress
- Park Health
- Batch Health
- Onboarding Center

For refinement, the main decision is how simple the product should become and which workflows matter most.

## 3. Technology stack

| Layer | Current implementation |
|---|---|
| Frontend framework | Next.js App Router |
| Language | TypeScript |
| UI | Tailwind CSS, local shadcn-style components, lucide-react icons |
| Backend | Next.js API routes and server components |
| Auth | Supabase Auth |
| Database | Supabase Postgres |
| Authorization | Supabase RLS plus server-side role guards |
| Offline attendance | Dexie and IndexedDB queue |
| Reports | Excel exports using `exceljs` |
| Deployment | Vercel |
| Timezone behavior | UTC storage, Asia/Karachi display/date logic |

Important scripts:

| Command | Purpose |
|---|---|
| `npm run dev` | Start local app |
| `npm run build` | Build production app |
| `npm run lint` | Run linting |
| `npm run typecheck` | Run TypeScript check |
| `npm run test` | Run node test suite |
| `npm run db:seed:demo` | Seed demo data using script |
| `npm run demo:link-user` | Link an existing auth user to a seeded role |
| `npm run uat:provision-users` | Create UAT auth users and print magic links |
| `npm run deploy:check` | Validate deploy readiness |
| `npm run uat:check` | Print UAT checks and validate critical files |

## 4. Current architecture

The project follows this shape:

```text
Browser / PWA
  |
  | Next.js pages, forms, client components
  v
Next.js App Router
  |
  | Server components load scoped data
  | API routes handle writes, imports, sync, exports
  v
Supabase
  |
  | Auth users
  | Postgres tables
  | RLS policies
  | triggers and helper functions
  v
Role-scoped data access
```

Key local folders:

| Folder | Purpose |
|---|---|
| `src/app` | Routes, layouts, pages, and API route handlers |
| `src/components` | UI clients and shared layout/components |
| `src/features` | Data loaders and domain logic by feature area |
| `src/lib` | Auth, Supabase clients, validation, time, HTTP, errors, utilities |
| `src/domain` | Domain rules such as attendance rules |
| `supabase/migrations` | Database schema, RLS, triggers, schema extensions |
| `supabase/seed.sql` | Demo database seed records |
| `scripts` | Seeding, UAT provisioning, release checks |
| `tests` | Node test suite |
| `docs` | Project documentation and planning notes |

## 5. Role model

Current implemented roles:

| Role | Type | Landing route | Current meaning |
|---|---|---|---|
| `super_admin` | Staff | `/admin` | Technical full-access or recovery role |
| `program_admin` | Staff | `/admin` | HQ / Markazi Masoul role |
| `city_head` | Staff | `/admin` | City Masoul role, city-scoped operations |
| `park_admin` | Staff | `/park` | Park operations and attendance |
| `park_lead` | Staff | `/park` | Park operations with broader attendance privileges |
| `murabbi` | Staff | `/park` | Mentor role tied to group/park context |
| `guardian` | Family | `/guardian` | Parent/guardian linked to children |
| `student` | Participant | `/student` | Participant personal portal |

Server-side guards enforce role access:

| Guard | Allows |
|---|---|
| `requireAdminAccess` | `super_admin`, `program_admin`, `city_head` |
| `requireParkAccess` | `super_admin`, `program_admin`, `city_head`, `park_admin`, `park_lead`, `murabbi` |
| `requireGuardianAccess` | Users linked to a guardian record |
| `requireStudentAccess` | Users linked to a participant record |
| `requirePasswordResetAccess` | Users with `must_reset_password` |

Post-login routing:

```text
must reset password -> /reset-password
HQ or city role     -> /admin
park role           -> /park
guardian link       -> /guardian
student link        -> /student
otherwise           -> /access-pending
```

## 6. Authentication and access provisioning

Internal users do not self-register. Accounts are created by admins or scripts.

Current access model:

1. A real person or guardian record must exist.
2. Admin opens `/admin/users`.
3. Admin creates or updates an auth account.
4. The account is linked to one of:
   - `people.user_id`
   - `guardians.user_id`
   - legacy `app_users` fallback in some older schema paths
5. Optional first-login password reset is controlled by `user_access.must_reset_password`.
6. User logs in at `/login`.
7. User is routed by role/link state.

Important current files:

| File | Purpose |
|---|---|
| `src/lib/auth/guards.ts` | Role landing and server-side guards |
| `src/lib/auth/user-access.ts` | Reads first-login reset/access state |
| `src/features/user-access/data.ts` | User provisioning logic |
| `src/app/api/admin/users/single/route.ts` | Single account create/update API |
| `src/app/api/admin/users/import/route.ts` | Excel import API |
| `src/app/api/admin/users/status/route.ts` | Target access status API |
| `src/app/(admin)/admin/users/page.tsx` | Access management page |

Refinement concern:

The system supports both linked target accounts and unlinked accounts. This is flexible but can create confusion. Decide whether unlinked access should remain allowed.

## 7. Database model

Core hierarchy:

```text
city
  park
    batch
      group
        participant
```

Key database tables:

| Table | Purpose |
|---|---|
| `cities` | Cities in the network |
| `parks` | Parks under cities |
| `batches` | Program batches under parks |
| `groups` | Participant groups under batches |
| `people` | Staff and participants |
| `staff_meta` | Staff role, park assignment, group assignment, city scope |
| `guardians` | Guardian profiles |
| `guardian_children` | Guardian to participant links |
| `batch_settings` | Attendance, fee, and participant-state rules |
| `attendance_events` | Scheduled attendance events |
| `attendance_records` | Per-participant attendance marks |
| `fee_events` | Event-based fee definitions |
| `payments` | Admission/event payments |
| `receipt_sequences` | Receipt number generation |
| `announcements` | Staff, city-head, guardian, and student announcements |
| `report_presets` | Saved report filters |
| `user_access` | Login email and reset-required state |
| `admission_applications` | Public admission submissions |
| `admission_interviews` | Interview schedule and scoring |
| `content_categories` | Resource/content categories |
| `content_items` | Published resources |
| `inventory_items` | Procurement stock catalog |
| `park_allocations` | Inventory allocated to parks |
| `inventory_adjustments` | HQ stock changes |
| `procurement_requests` | Park supply requests |
| `push_subscriptions` | PWA push subscription placeholder |
| `audit_log` | Attendance/payment/auditable changes |

Important DB behavior:

- RLS is enabled on operational tables.
- `auth_staff_role()` resolves staff role from the current Supabase user.
- `can_access_park()` scopes data by role and park.
- `guardian_has_child()` limits guardian access to linked children.
- Payment receipt numbers are generated in the database.
- Participant state can be recomputed from attendance streaks.
- Closed attendance events have write restrictions.
- Audit logs record important updates.

Refinement concern:

The data model is already broad. Before adding new fields or tables, confirm whether existing modules should be simplified or removed.

## 8. Current route map

### Public and auth routes

| Route | Purpose |
|---|---|
| `/` | Public homepage |
| `/portal` | Auth-aware portal redirect |
| `/login` | Login form |
| `/reset-password` | First-login password change |
| `/access-pending` | Logged-in but not linked to a usable role/profile |
| `/auth/callback` | Supabase callback for magic links |
| `/apply` | Public admission application |
| `/apply/status` | Public application status lookup |

### Admin routes

| Route | Purpose |
|---|---|
| `/admin` | Admin dashboard |
| `/admin/ops-center` | Combined admin action queue |
| `/admin/family-ops` | Family follow-up across admissions, attendance, fees, access |
| `/admin/schedule` | Date-focused admin schedule |
| `/admin/cities` | City and city-head management |
| `/admin/admissions` | Admissions pipeline |
| `/admin/onboarding-center` | Approved application onboarding follow-up |
| `/admin/park-health` | Per-park health board |
| `/admin/attendance-command` | Attendance coverage command center |
| `/admin/batch-health` | Per-batch setup and health board |
| `/admin/attendance-alerts` | Warning/dropout follow-up |
| `/admin/attendance-insights` | Attendance trends and hotspots |
| `/admin/access-alerts` | Missing login/reset-required access queue |
| `/admin/fee-alerts` | Unpaid dues follow-up |
| `/admin/parks` | Parks, batches, groups |
| `/admin/people` | Shabab and murabbis |
| `/admin/students` | Student directory and access handoff |
| `/admin/student-progress` | Unified student follow-up |
| `/admin/content` | Content and resources |
| `/admin/procurement` | Inventory, allocations, requests |
| `/admin/guardians` | Guardian directory and links |
| `/admin/attendance-events` | Attendance event creation/management |
| `/admin/settings` | Batch rules/settings |
| `/admin/fees` | Fee event and payment operations |
| `/admin/users` | Access provisioning |
| `/admin/announcements` | Announcement publishing |
| `/admin/audit-log` | Audit review |
| `/admin/reports` | Reports and Excel exports |
| `/admin/test-center` | Manual QA checklist center |

### Park routes

| Route | Purpose |
|---|---|
| `/park` | Park dashboard |
| `/park/ops-center` | Combined park action queue |
| `/park/family-ops` | Park-side family follow-up |
| `/park/schedule` | Date-focused park schedule |
| `/park/attendance-command` | Park attendance coverage |
| `/park/attendance` | Today's attendance events |
| `/park/attendance/[eventId]` | Attendance roster marking |
| `/park/roster` | Participant and guardian follow-up |
| `/park/student-progress` | Park-scoped student progress |
| `/park/guardians` | Guardian contact center |
| `/park/alerts` | Attendance warning/dropout follow-up |
| `/park/fee-alerts` | Unpaid dues follow-up |
| `/park/attendance-insights` | Park attendance trends |
| `/park/announcements` | Park announcement feed |
| `/park/resources` | Resource library |
| `/park/procurement` | Park supply allocations and requests |

### Guardian routes

| Route | Purpose |
|---|---|
| `/guardian` | Guardian dashboard |
| `/guardian/action-center` | Guardian action queue |
| `/guardian/history` | Attendance and fee history |
| `/guardian/schedule` | Child schedule |
| `/guardian/announcements` | Announcements |
| `/guardian/resources` | Resources |

### Student routes

| Route | Purpose |
|---|---|
| `/student` | Student dashboard |
| `/student/action-center` | Student action queue |
| `/student/history` | Attendance and fee history |
| `/student/schedule` | Schedule |
| `/student/announcements` | Announcements |
| `/student/resources` | Resources |

## 9. Public admissions workflow

Current flow:

1. Family opens `/apply`.
2. Family submits applicant, guardian, city, preferred park, and related information.
3. System creates an `admission_applications` row.
4. A tracking code is generated.
5. Family can check status at `/apply/status`.
6. Admin reviews applications at `/admin/admissions`.
7. Admin can schedule an interview.
8. Admin can record interview status and scores.
9. Admin can approve, waitlist, or reject.
10. Approved applications can be converted into participant and guardian records.
11. Onboarding follow-up appears in `/admin/onboarding-center` and related access/family boards.

Refinement questions:

- Is public admission required for the real product?
- Should admissions be a full pipeline or only a simple registration form?
- Is interview scoring required?
- Who approves admission: HQ, city head, or park team?
- Should conversion create both student and guardian accounts automatically?

## 10. Admin workflow

The admin workspace currently combines HQ and city operations under `/admin`.

HQ roles currently see a navigation focused on:

- dashboard
- ops center
- family ops
- cities and city heads
- admissions and onboarding
- operational health boards
- alerts and insights
- content
- procurement
- announcements
- audit
- reports
- test center
- park view

City Head currently sees a navigation focused on:

- city dashboard
- parks, batches, groups
- people, students, guardians
- attendance events and settings
- fees
- content
- procurement
- access
- announcements
- reports
- test center
- park view

Refinement concern:

The same operational issue can appear in multiple admin pages. For example, a student with unpaid fees and missing guardian access may appear in:

- `/admin/students`
- `/admin/student-progress`
- `/admin/fee-alerts`
- `/admin/access-alerts`
- `/admin/family-ops`
- `/admin/onboarding-center`
- `/admin/ops-center`

This is useful for dashboards but confusing for daily users.

## 11. Park workflow

Park roles currently use `/park`.

Main attendance flow:

1. Park user logs in.
2. User lands at `/park`.
3. Dashboard shows current events and queue health.
4. User opens `/park/attendance`.
5. User selects an event.
6. Roster opens at `/park/attendance/[eventId]`.
7. User marks attendance.
8. If offline, marks are stored locally.
9. When online, queued marks sync to the API.

Other park operations:

- track family follow-up
- review participants and guardians
- monitor attendance alerts
- monitor fee alerts
- inspect attendance insights
- view resources
- view procurement allocations
- create supply requests

Refinement concern:

Park users likely need a smaller, action-first interface. Current park navigation has many entries and may be too much for mobile field use.

## 12. Guardian and student workflows

Guardian portal:

- shows linked child or children
- shows attendance
- shows fee status and outstanding items
- shows schedule
- shows announcements
- shows resources
- provides action center and history views

Student portal:

- shows own attendance
- shows own fee status
- shows schedule
- shows announcements
- shows resources
- provides action center and history views

Refinement concern:

Family portals are already simpler than admin/park areas. They may only need copy, layout, and content refinement unless the business model changes.

## 13. Attendance workflow and offline behavior

Attendance is the strongest specialized workflow in the app.

Online behavior:

1. User marks attendance from roster.
2. API validates request.
3. Database upserts attendance record.
4. Participant state can be recomputed.
5. Audit log records important changes.
6. UI refreshes roster.

Offline behavior:

1. User marks attendance while offline.
2. Mutation is written to IndexedDB through Dexie.
3. Queue stores event, participant, status, timestamp, mutation ID, and retry state.
4. Auto-sync or manual sync sends mutations to `/api/park/attendance/sync`.
5. API returns processed and failed mutation IDs.
6. Processed items are removed from queue.
7. Failed items remain for retry.
8. Cached event and roster snapshots help keep the screen usable offline.

Attendance role behavior:

| Role | Current attendance behavior |
|---|---|
| `park_admin` | Can mark attendance while event is open |
| `park_lead` | Can mark attendance and has more privileged after-close ability |
| `program_admin` / `super_admin` | Can manage broader attendance operations |
| `murabbi` | Park/group-scoped operational access |

Refinement questions:

- Should attendance be once per day, or multiple sessions per day?
- Should murabbi be allowed to mark attendance directly?
- Should park admin edit closed attendance?
- Is offline support required for all park roles or only attendance takers?
- What exact statuses are required: present, absent, late, excused?

## 14. Fees workflow

Current fee system supports:

- admission fee rules through batch settings
- event fee definitions
- fixed event fees
- participant-type fee amounts
- payment recording
- receipt number generation
- fee alerts for outstanding dues
- guardian/student fee summaries
- report/export visibility

Current related routes:

- `/admin/fees`
- `/admin/fee-alerts`
- `/park/fee-alerts`
- `/guardian/history`
- `/student/history`

Refinement questions:

- Is fee tracking required in phase 1?
- Should payments be recorded by HQ, city, or park?
- Are partial payments required?
- Are discounts, waivers, refunds, or arrears required?
- Is receipt printing required?
- Should guardians see fees, or only admins?

## 15. Content and announcements

Current content system:

- content categories
- content items as link, video, or document
- audience roles
- published/featured state
- read-only resource workspaces for staff, students, guardians

Current announcement system:

- global, park, and batch scoped announcements
- audiences for staff, city heads, guardians, and students
- announcement centers for admin, park, guardian, and student users
- copy/share actions

Refinement questions:

- Is content library required, or should it be removed for MVP?
- Who creates resources?
- Should announcements be one-way only?
- Should WhatsApp/SMS be integrated, or is manual copy enough?
- Do guardians and students need separate announcement views?

## 16. Procurement workflow

Current procurement system supports:

- inventory item catalog
- total quantity and low-stock threshold
- park allocations
- HQ stock adjustments
- adjustment ledger
- park-side procurement view
- park supply requests
- HQ/city request review

Current routes:

- `/admin/procurement`
- `/park/procurement`

Refinement questions:

- Is procurement part of the real requirement?
- Is this needed now or later?
- Who owns stock: HQ, city, or park?
- Should park teams request supplies through the app?
- Are approvals required?

## 17. Reporting and audit

Current reporting:

- `/admin/reports`
- saved report presets
- shareable filtered URLs
- Excel exports
- group attendance export
- team attendance export
- summary dashboard export

Current audit:

- `/admin/audit-log`
- audit rows for selected DB updates
- old/new JSON values
- actor context where available

Refinement questions:

- What are the exact required reports?
- Are current Excel formats acceptable?
- Who should access reports?
- Should reports be city-scoped, park-scoped, or national?
- Which user actions must be auditable?

## 18. Current feature inventory

Use this table to decide what stays.

| Area | Current status | Refinement decision |
|---|---|---|
| Public homepage | Implemented | Keep / Change / Remove |
| Public admissions | Implemented | Keep / Change / Remove |
| Public application status | Implemented | Keep / Change / Remove |
| Login and password reset | Implemented | Keep / Change |
| Admin dashboard | Implemented | Keep / Simplify |
| City management | Implemented | Keep / Change |
| Parks, batches, groups | Implemented | Keep / Change |
| People/Shabab management | Implemented | Keep / Change |
| Student directory | Implemented | Keep / Merge |
| Guardian directory | Implemented | Keep / Merge |
| Access provisioning | Implemented | Keep / Simplify |
| Admissions pipeline | Implemented | Keep / Simplify / Remove |
| Onboarding center | Implemented | Keep / Merge / Remove |
| Attendance events | Implemented | Keep / Change |
| Park attendance | Implemented | Keep / Priority |
| Offline attendance | Implemented | Keep / Change |
| Attendance alerts | Implemented | Keep / Merge |
| Attendance command | Implemented | Keep / Merge |
| Attendance insights | Implemented | Keep / Merge / Remove |
| Family ops | Implemented | Keep / Merge |
| Ops center | Implemented | Keep / Merge |
| Student progress | Implemented | Keep / Merge |
| Park roster | Implemented | Keep / Merge |
| Fee operations | Implemented | Keep / Simplify / Remove |
| Fee alerts | Implemented | Keep / Merge |
| Reports and Excel exports | Implemented | Keep / Change |
| Announcements | Implemented | Keep / Simplify |
| Content library | Implemented | Keep / Remove |
| Procurement | Implemented | Keep / Remove |
| Audit log | Implemented | Keep |
| Test center | Implemented | Keep internal only |
| Guardian portal | Implemented | Keep / Simplify |
| Student portal | Implemented | Keep / Simplify |

## 19. Current problems likely causing requirement mismatch

### 19.1 Too many dashboards

The app has many dashboard-like pages. This gives many ways to view the same work, but it makes the product hard to explain.

Likely fix:

- choose one main action center per role
- convert secondary boards into filters or tabs
- hide low-priority boards from navigation

### 19.2 Admin and city workflows are mixed

HQ and city users both live under `/admin`. This is technically fine, but product language may be confusing.

Likely fix:

- clearly define HQ vs city duties
- rename nav items to business terms
- remove HQ-only concepts from city navigation

### 19.3 Student and people modules overlap

`people` manages Shabab and murabbis. `students` is a student-only view. `student-progress` is another student follow-up view.

Likely fix:

- decide whether "People" is the master module
- decide whether "Students" is only a filtered people view
- decide whether "Student Progress" should be a tab inside Students

### 19.4 Family follow-up is fragmented

Family concerns appear in guardians, students, access alerts, fee alerts, attendance alerts, family ops, onboarding, and progress pages.

Likely fix:

- create one family follow-up workflow
- route all family issues through one page with tabs or filters

### 19.5 Park workspace may be too complex

Park users likely need fast attendance and participant follow-up, not a large operations suite.

Likely fix:

- reduce park navigation to 4 to 6 top-level items
- place secondary analytics under dashboard or reports

### 19.6 Some modules may be beyond current requirement

Procurement, content library, detailed admissions, and many health boards may not be required in the current version.

Likely fix:

- mark nonessential modules as phase 2
- hide them until business process is confirmed

## 20. Suggested simplified target navigation

This is not a final recommendation. It is a simpler starting point for discussion.

### Admin / HQ

| Proposed nav | Could include |
|---|---|
| Dashboard | KPIs, urgent actions |
| Cities & Parks | Cities, parks, batches, groups |
| Admissions | Applications, interviews, conversion, onboarding |
| People | Staff, students, guardians, access |
| Attendance | Events, command, alerts, insights |
| Fees | Fee setup, payments, dues follow-up |
| Communications | Announcements, content/resources |
| Reports | Exports, presets, audit |
| Settings | Batch settings and admin configuration |

### Park

| Proposed nav | Could include |
|---|---|
| Dashboard | Today's actions |
| Attendance | Today's events, roster marking, offline queue |
| Participants | Roster, student progress |
| Families | Guardians, family follow-up, fee reminders |
| Schedule | Upcoming events |
| Resources | Announcements, resources, procurement if needed |

### Guardian

| Proposed nav | Could include |
|---|---|
| Dashboard | Summary and next actions |
| History | Attendance and fees |
| Schedule | Upcoming sessions |
| Announcements | Program messages |
| Resources | Shared content |

### Student

| Proposed nav | Could include |
|---|---|
| Dashboard | Summary and next actions |
| History | Attendance and fees |
| Schedule | Upcoming sessions |
| Announcements | Program messages |
| Resources | Shared content |

## 21. Refinement worksheet

Answer these before changing code.

### 21.1 Product scope

| Question | Your answer |
|---|---|
| What is the main purpose of the app in one sentence? |  |
| Is this primarily for attendance, full operations, or family engagement? |  |
| What must be ready for first real use? |  |
| What can wait for phase 2? |  |
| Which modules should be hidden now? |  |

### 21.2 Roles

| Question | Your answer |
|---|---|
| Do you need all current roles? |  |
| Should `super_admin` be used only for recovery? |  |
| What exactly can `program_admin` do? |  |
| What exactly can `city_head` do? |  |
| What exactly can `park_admin` do? |  |
| What exactly can `park_lead` do? |  |
| What exactly can `murabbi` do? |  |
| Should students log in? |  |
| Should guardians log in? |  |

### 21.3 Attendance

| Question | Your answer |
|---|---|
| Who creates attendance events? |  |
| Who marks attendance? |  |
| Can attendance be edited after close? |  |
| What statuses are required? |  |
| Is offline attendance mandatory? |  |
| Should attendance affect warning/dropout automatically? |  |

### 21.4 Admissions

| Question | Your answer |
|---|---|
| Is public application required? |  |
| Is interview scheduling required? |  |
| Is scoring required? |  |
| Who approves admission? |  |
| Should conversion create records automatically? |  |

### 21.5 Fees

| Question | Your answer |
|---|---|
| Are fees required in the current version? |  |
| Who records payments? |  |
| Are receipts required? |  |
| Should guardians/students see dues? |  |
| Are fee events needed, or only admission fees? |  |

### 21.6 Reports

| Question | Your answer |
|---|---|
| Which reports are mandatory? |  |
| What Excel format is expected? |  |
| Who can export reports? |  |
| What filters are required? |  |

### 21.7 Navigation

| Question | Your answer |
|---|---|
| Which 5 admin pages should be top-level? |  |
| Which 5 park pages should be top-level? |  |
| Which pages are confusing or unnecessary? |  |
| Which pages should be merged? |  |

## 22. Recommended refinement process

### Step 1: Freeze new feature work

Do not add new modules until the target product shape is confirmed.

### Step 2: Mark every route

For each route, mark:

- keep
- rename
- merge
- hide
- remove

### Step 3: Define the main workflow for each role

Example:

```text
Park Admin:
login -> dashboard -> today's attendance -> roster -> sync -> family follow-up
```

If a route does not support a main workflow, move it to secondary navigation or phase 2.

### Step 4: Collapse duplicate boards

Start with these candidates:

- merge `Ops Center`, `Family Ops`, `Access Alerts`, `Fee Alerts`, and `Attendance Alerts` into fewer action queues
- merge `Students`, `People`, and `Student Progress` into a cleaner people workflow
- merge `Attendance Command` and `Attendance Insights` into attendance operations or reports
- move `Park Health` and `Batch Health` into dashboard summaries unless deeply needed

### Step 5: Rename modules to business language

Avoid internal names if users do not understand them.

Examples:

| Current | Possible replacement |
|---|---|
| Ops Center | Action Center |
| Access Alerts | Login Access |
| Attendance Command | Attendance Coverage |
| Batch Health | Batch Setup |
| Park Health | Park Overview |
| Student Progress | Shabab Follow-up |

### Step 6: Re-test role journeys

After simplification, run UAT for:

- HQ admin
- city head
- park admin
- park lead
- murabbi
- guardian
- student

## 23. UAT checklist

### Public

- Public homepage loads.
- Application form submits.
- Tracking code is generated.
- Public status lookup works.

### Admin

- Login redirects admin to `/admin`.
- Dashboard loads.
- City/park/batch/group setup works.
- Student and guardian records can be created.
- Access account can be created and linked.
- Attendance event can be created.
- Fee payment can be recorded if fees remain in scope.
- Reports export correctly.

### Park

- Login redirects park role to `/park`.
- Today's event list loads.
- Attendance roster loads.
- Attendance can be marked online.
- Attendance can be queued offline.
- Queue syncs after reconnect.
- Park family follow-up is understandable.

### Guardian

- Login redirects guardian to `/guardian`.
- Guardian only sees linked children.
- Attendance history is correct.
- Fee status is correct if fees remain in scope.
- Announcements and resources load.

### Student

- Login redirects student to `/student`.
- Student only sees own data.
- Attendance history is correct.
- Fee status is correct if fees remain in scope.
- Announcements and resources load.

### Security

- Unknown users cannot self-register into internal roles.
- Unlinked users land on `/access-pending`.
- Non-admin users cannot access admin pages.
- Guardians cannot see unrelated children.
- Students cannot see other students.
- Park users cannot access unrelated parks.

## 24. Proposed next deliverables

To refine the project properly, the next documents should be:

1. Product Requirements Document
   - what the product should do
   - target users
   - must-have vs later
   - acceptance criteria

2. Route Simplification Map
   - current route
   - keep/merge/remove decision
   - new route if changed

3. Role Permission Matrix
   - role
   - allowed pages
   - allowed actions
   - data scope

4. UAT Test Script
   - step-by-step testing by role
   - expected result for each workflow

5. Migration/cleanup plan
   - navigation changes
   - code modules to remove or hide
   - schema changes if any
   - test updates

## 25. Immediate decision list

These are the fastest decisions that will clarify the project:

1. Should the project be attendance-first or full operations?
2. Should admissions stay in this version?
3. Should fees stay in this version?
4. Should procurement stay in this version?
5. Should content/resources stay in this version?
6. Should guardians and students log in, or is this internal-only for now?
7. Should park users see only attendance and roster, or full park operations?
8. Should HQ and city users share `/admin`, or should the UI clearly separate them?
9. Which pages should be removed from the sidebar immediately?
10. What is the exact real-world workflow from enrollment to attendance to reporting?

## 26. Bottom-line recommendation

Do not rebuild the project from scratch yet. The current codebase has useful foundations:

- role-based routing
- Supabase RLS
- offline attendance
- admissions
- access provisioning
- city/park/group hierarchy
- guardian/student portals
- reports

The right next move is controlled simplification:

1. define the real target requirements
2. reduce navigation
3. merge duplicate operational boards
4. hide phase-2 modules
5. run role-based UAT
6. then patch the code according to confirmed requirements

The current system is too broad, but it is not wasted work. It should become a smaller, clearer product.
