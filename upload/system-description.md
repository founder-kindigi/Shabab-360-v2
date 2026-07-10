# Shabab360 System Description

This document explains the **current system as it exists today**. It is not an aspirational plan. It is the baseline for deciding what to simplify, remove, or change next.

## 1. What the system is

Shabab360 is a multi-role program operations system for running Shabab activities across cities, parks, batches, groups, attendance, admissions, fees, resources, procurement, and family follow-up.

It has:
- one **public site** for the public-facing program pages and admissions
- one **internal admin system** for HQ and city operations
- one **park operations system** for park teams
- one **guardian portal**
- one **student portal**

The product is browser-based and deployed on Vercel. Data, auth, and storage are handled by Supabase. Attendance supports offline queueing through Dexie/IndexedDB.

## 2. Current role model

The current implemented roles are:

### Staff roles
- `super_admin`
- `program_admin`
- `city_head`
- `park_admin`
- `park_lead`
- `murabbi`

### Family and participant roles
- `guardian`
- `student`

## 3. What each role currently means

### `super_admin`
Technical full-access role.

Intended use:
- bootstrap / recovery / unrestricted control
- not the normal business role for HQ

### `program_admin`
HQ business role.

Current meaning:
- Program Head / Markazi Masoul
- national oversight
- city governance
- cross-city reports
- city-head assignment

### `city_head`
City business role.

Current meaning:
- City Masoul
- city-level operational setup and control

### `park_admin`
Park operations role.

Current meaning:
- day-to-day park-level attendance and family follow-up

### `park_lead`
Park operations role with similar operational access to park admin.

### `murabbi`
Mentor role.

Current meaning:
- park-scoped operational role
- tied to one group in one park

### `guardian`
Parent/guardian portal user tied to one or more linked children.

### `student`
Participant portal user tied to one participant record.

## 4. Main product surfaces

## 4.1 Public surface

### Public homepage
Purpose:
- explain the Shabab Program publicly
- direct internal users to the login portal
- support admissions entry

### Public admissions
Routes:
- `/apply`
- `/apply/status`

Current behavior:
- families can submit an admission application
- they receive a tracking code
- they can later check admission status using:
  - tracking code
  - guardian phone

## 4.2 Admin surface

Admin roles:
- `super_admin`
- `program_admin`
- `city_head`

Shared entry route:
- `/admin`

Important distinction:
- `super_admin` and `program_admin` use an HQ-oriented workspace
- `city_head` uses a city-operations workspace

### HQ admin navigation currently includes
- Dashboard
- Ops Center
- Family Ops
- Schedule
- Cities & City Heads
- Admissions
- Onboarding Center
- Park Health
- Attendance Command
- Batch Health
- Attendance Alerts
- Attendance Insights
- Access Alerts
- Fee Alerts
- Students
- Student Progress
- Content Library
- Procurement
- City Heads & Access
- Announcements
- Audit Log
- Reports & Exports
- Test Center
- Network Operations
- Park View

### City admin navigation currently includes
- Dashboard
- Ops Center
- Family Ops
- Schedule
- Admissions
- Onboarding Center
- Park Health
- Attendance Command
- Batch Health
- Attendance Alerts
- Attendance Insights
- Access Alerts
- Fee Alerts
- Parks/Batches/Groups
- Shabab & Murabbis
- Students
- Student Progress
- Content Library
- Procurement
- Guardians
- Attendance Events
- Batch Settings
- Fees Operations
- People Access
- Announcements
- Audit Log
- Reports & Exports
- Test Center
- Park View

## 4.3 Park surface

Park roles:
- `park_admin`
- `park_lead`
- `murabbi`

Shared entry route:
- `/park`

Current park navigation:
- Dashboard
- Ops Center
- Family Ops
- Schedule
- Attendance Command
- Today's Events
- Roster
- Student Progress
- Guardians
- Attendance Alerts
- Fee Alerts
- Attendance Insights
- Announcements
- Resources
- Procurement

## 4.4 Guardian surface

Entry route:
- `/guardian`

Current guardian navigation:
- My Dashboard
- Action Center
- History
- Schedule
- Announcements
- Resources

## 4.5 Student surface

Entry route:
- `/student`

Current student navigation:
- My Dashboard
- Action Center
- History
- Schedule
- Announcements
- Resources

## 5. Core business structure in the database

The main structure is:

- city
  - park
    - batch
      - group
        - participant

Important current rules:
- participant belongs to **one group**
- murabbi belongs to **one group in one park**
- staff roles use `people` + `staff_meta`
- guardians are stored separately in `guardians`
- guardian/child relation is stored in `guardian_children`

## 6. Current major workflows

## 6.1 HQ workflow

HQ users currently can:
- create cities
- edit city names and codes
- assign city heads
- reassign city heads
- view cross-city dashboards
- review national exceptions
- run reports and exports
- manage announcements
- manage access accounts

HQ also has derived operational boards such as:
- Ops Center
- Family Ops
- Park Health
- Batch Health
- Attendance Command
- Fee Alerts
- Access Alerts

## 6.2 City operations workflow

City Head currently can:
- configure parks
- configure batches
- configure groups
- configure batch rules
- create attendance events
- manage people
- manage students
- manage guardians
- manage access provisioning
- run city-scoped reports
- review operational alert boards

City-specific operations are spread across several pages rather than one single simple workflow.

## 6.3 Admissions workflow

Current admissions flow:
1. Public user submits form at `/apply`
2. Application appears in `/admin/admissions`
3. Admin can schedule interview
4. Admin can complete interview and scoring
5. Admin can approve and assign placement
6. Admin can convert approved application into:
   - participant
   - guardian linkage
7. Admin can follow onboarding status after conversion

Supporting admin workspaces:
- `/admin/admissions`
- `/admin/onboarding-center`

## 6.4 Access provisioning workflow

Current access flow:
1. Create staff / student / guardian records first
2. Open `/admin/users`
3. Either:
   - bulk import access accounts via Excel
   - create/update one access account manually
4. System links auth account to:
   - `people`
   - or `guardians`
5. User signs in with email/password
6. first-login reset may be required

Supporting admin workspaces:
- `/admin/users`
- `/admin/access-alerts`

## 6.5 Park attendance workflow

Current attendance flow:
1. park user lands on `/park`
2. park dashboard shows readiness and queue health
3. user opens `/park/attendance`
4. chooses an event
5. opens roster
6. marks attendance
7. if offline:
   - data is queued locally
8. when online:
   - queue syncs

Supporting park workspaces:
- `/park`
- `/park/attendance`
- `/park/attendance/[eventId]`
- `/park/attendance-command`
- `/park/attendance-insights`
- `/park/alerts`

## 6.6 Family follow-up workflow

Current family follow-up happens in multiple places:

Admin side:
- `/admin/family-ops`
- `/admin/attendance-alerts`
- `/admin/fee-alerts`
- `/admin/access-alerts`
- `/admin/students`
- `/admin/guardians`
- `/admin/student-progress`

Park side:
- `/park/family-ops`
- `/park/guardians`
- `/park/student-progress`
- `/park/alerts`
- `/park/fee-alerts`

This is one of the major sources of confusion: the same family-related operational context is split across multiple boards.

## 6.7 Guardian workflow

Guardian currently can:
- see dashboard
- see action center
- see attendance/fee history
- see schedule
- read announcements
- read resources

Routes:
- `/guardian`
- `/guardian/action-center`
- `/guardian/history`
- `/guardian/schedule`
- `/guardian/announcements`
- `/guardian/resources`

## 6.8 Student workflow

Student currently can:
- see dashboard
- see action center
- see attendance/fee history
- see schedule
- read announcements
- read resources

Routes:
- `/student`
- `/student/action-center`
- `/student/history`
- `/student/schedule`
- `/student/announcements`
- `/student/resources`

## 7. Current modules that exist

These modules are currently implemented:

- public homepage
- public admissions
- admin dashboards
- city management
- parks / batches / groups
- batch settings
- attendance events
- attendance alerts
- attendance insights
- attendance command
- batch health
- park health
- people management
- student management
- guardian management
- student progress
- access provisioning
- onboarding center
- reports and Excel exports
- fees operations
- fee alerts
- content library
- procurement
- operations center
- family ops
- park dashboard
- park roster
- park guardians
- park family ops
- park schedule
- park procurement
- park attendance command
- park attendance insights
- park fee alerts
- guardian portal
- student portal
- guardian/student action centers
- guardian/student history
- guardian/student schedule
- guardian/student announcements
- guardian/student resources
- test center

## 8. Why the product feels confusing now

The current system is powerful, but it has become confusing for three structural reasons.

### 8.1 Too many operational boards

There are many “center”, “alerts”, “health”, “ops”, and “progress” pages:

Admin examples:
- Ops Center
- Family Ops
- Onboarding Center
- Park Health
- Batch Health
- Attendance Command
- Attendance Alerts
- Attendance Insights
- Fee Alerts
- Access Alerts
- Student Progress

Park examples:
- Ops Center
- Family Ops
- Attendance Command
- Attendance Insights
- Attendance Alerts
- Fee Alerts
- Student Progress
- Guardians
- Roster

This creates overlap. A user has to guess:
- which page is the main one
- which page is only a summary
- which page is for action vs monitoring

### 8.2 Same domain spread across many pages

Family and participant operations are fragmented.

For example, one student can appear in:
- students
- people
- student progress
- attendance alerts
- fee alerts
- family ops
- admissions onboarding
- access alerts

That makes the product harder to learn.

### 8.3 Role workspaces are internally coherent, but globally too broad

Each route works, but the total navigation footprint is too large.

The app currently behaves more like an expanding operational suite than a tight MVP.

## 9. What is strong in the current system

The following parts are structurally strong:

- role-based access model
- guarded route model
- park offline attendance foundation
- access provisioning boundaries
- guardian/student portals being truly separate
- city and park scoping
- reusable shared boards and data loaders
- public admissions flow

These should be preserved.

## 10. What likely needs simplification

These are the best candidates for consolidation:

### Admin
- merge or reduce:
  - `Ops Center`
  - `Family Ops`
  - `Onboarding Center`
  - `Access Alerts`
  - `Student Progress`
- consider a simpler admin model:
  - `Dashboard`
  - `Admissions`
  - `Operations`
  - `People`
  - `Fees`
  - `Reports`
  - `Settings`

### Park
- merge or reduce:
  - `Ops Center`
  - `Family Ops`
  - `Attendance Command`
  - `Attendance Insights`
  - `Student Progress`
  - `Guardians`
- consider a simpler park model:
  - `Dashboard`
  - `Attendance`
  - `Participants`
  - `Families`
  - `Fees`
  - `Resources`

### Family portals
- they are already much cleaner
- likely need only light simplification, not a full redesign

## 11. Recommended next cleanup direction

If the goal is to make the product easier to understand, the next step should **not** be another feature sprint.

The correct next phase is:

### Phase A: product simplification
- define which pages are:
  - core
  - secondary
  - redundant
- reduce duplicate operational boards

### Phase B: navigation cleanup
- shorten admin nav
- shorten park nav
- group secondary tools under fewer top-level entries

### Phase C: workflow consolidation
- make one clear path for:
  - admissions and onboarding
  - student/family follow-up
  - attendance operations
  - fee operations

## 12. Practical summary

The current system is:
- broad
- operationally capable
- role-aware
- already beyond MVP in surface area

The current problem is **not** missing functionality.

The current problem is:
- too many overlapping operational pages
- too much navigation breadth
- too many ways to reach similar work

That means the next major improvement should be **reduction and consolidation**, not expansion.

## 13. Best next discussion

The next useful discussion is:

1. which routes should remain top-level
2. which routes should be merged
3. which routes should become secondary links only
4. what the ideal admin workflow should be
5. what the ideal park workflow should be

That is the fastest path to making the product understandable again.
