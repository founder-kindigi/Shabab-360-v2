# Shabab 360 Product Vision Input 02: System Flow Story

**Status:** Early working input - not final

**Source:** Product-owner document supplied on 2026-07-15

**Purpose:** Preserve the described end-to-end operating model and the
supplied current implementation snapshot. This is an input to product
consolidation, UAT, and implementation planning. It is not an independent
verification that every described capability is present or deployed.

## How To Read This Document

This input has two distinct parts:

1. **System Flow Story** describes the intended role-based experience and is a
   core product-vision input.
2. **Current Implementation Plan** states which capabilities are believed to
   exist and be deployed. Each item must be validated against the repository,
   configured environments, and browser UAT before it is treated as complete.

## System Flow Story

The product is one shared platform with different doors. Each person sees a
different workspace after login.

### 1. Public Entry

A visitor opens the public Shabab Program home page. It explains the program,
its purpose, and who it is for. This page is public only; it is not the
internal system.

Authorised internal users click a portal button and go to the login page.

### 2. Internal Login

- There is no public self-registration for internal roles.
- An administrator creates accounts.
- Users sign in with email and password.
- Where an account has a temporary password, the system can require a password
  reset before the user continues.
- After login, the system checks the user's identity, whether they are linked
  to a person or guardian record, the role they hold, and whether they must
  reset their password.
- The user is automatically sent to the correct role-specific landing page.

### 3. Program Head / Markazi Masoul: HQ Story

The Program Head lands on the HQ dashboard, the national oversight point for
all cities.

The Program Head can:

- View national metrics.
- View HQ exception boards.
- Identify cities without city heads.
- Identify cities without active parks.
- Identify cities with higher warning or dropout pressure.
- Move into reports and exports.
- Make announcements.
- Manage city-head access.

The dedicated city management page allows the Program Head to:

- Create a city.
- Edit a city name and code.
- Assign or reassign a City Head.
- Focus on one city.
- Search and filter cities by assignment state.

The HQ role is focused on city governance, cross-city visibility, top-level
monitoring, and city-head administration.

### 4. City Head / City Masoul: City Operations Story

The City Head also uses the admin area, but lands in a city-operations
dashboard scoped to one city rather than the national HQ dashboard.

The dashboard highlights operational issues such as:

- Parks without active batches.
- Batches without groups.
- Groups without today's attendance event.

These exceptions link to filtered operational pages so the City Head can act
on the issue directly.

The City Head can manage:

- Parks.
- Batches.
- Groups.
- Attendance events.
- Batch rules.
- Fees.
- Announcements.
- Audit logs.
- Reports.

City-level pages should support filterable, shareable, URL-driven views. For
example, a focused park, batch, or issue view remains in the URL and can be
reopened later.

### 5. Shabab And Murabbi Operations

The city workspace includes a people-operations screen for Shabab and
Murabbis.

The City Head can:

- Create a Shabab and place them into a group immediately.
- Create a Murabbi and place them into a group immediately.
- Move Shabab and Murabbis between groups.
- Edit names, phone numbers, and active/inactive status.
- Filter by park, batch, and activity.
- Bulk-move Shabab.
- Bulk-activate or deactivate Shabab.
- Bulk-activate or deactivate Murabbis.

The page also signals:

- Groups with Shabab but no Murabbi.
- Warning or dropout participants.
- Inactive Murabbis assigned to active groups.

The intended result is a city-operations control board, not merely a list.

### 6. Student Access Flow

A student is represented first as a participant record. The City Head uses a
focused student directory to:

- Search students.
- Filter by park, batch, and activity.
- See who already has login access.
- Select a student to see detailed access status.
- Go directly to the access workspace.
- Use an `Open Access` action from a table row.

This provides a clear transition from a student record to student-login setup
without needing to find or manually enter IDs.

### 7. Guardian Operations

The City Head uses a city-scoped guardians workspace to:

- Create a guardian and immediately link that guardian to a visible child.
- Link an existing guardian to an additional child.
- Filter guardians by park.
- Search guardians and linked children.
- See whether each guardian has login access.
- Select a guardian to see detailed access status.
- Go directly to the access workspace.
- Use an `Open Access` action from a guardian row.

Guardians are handled as records linked to a child, rather than as
free-floating users.

### 8. Access Workspace

A dedicated access page is the central place for creating and updating login
accounts. It supports:

- Excel bulk import.
- Single-account creation.
- Single-account updates.
- Contextual handoff from student, guardian, Shabab, and Murabbi workspaces.

Where the page is opened from another workspace, the form is prefilled with
the relevant target context. It displays:

- The target person or guardian.
- Whether the target already has linked login access.
- The linked email when it exists.
- Whether a password reset is required.
- Whether the action will create or update an account.
- The effective target type: Person, Guardian, or Manual / Unlinked.
- The effective role that will be submitted.

The following rules are explicit in the interface:

- If `guardianId` is present, guardian context takes priority.
- `personId` becomes inactive in guardian mode.
- Role becomes locked to `guardian` in guardian mode.
- Saving is blocked if role is blank.
- If no target is linked, a warning explains that this will create an unlinked
  account.

### 9. Park Admin / Park Lead / Murabbi Story

Park-level users land on `/park`, a park dashboard that shows:

- The number of attendance events today.
- How many events are open and closed.
- Whether the park needs attention.
- The next most urgent action.
- Offline attendance queue depth.
- Failed sync items.
- Last sync time.
- Whether the queue needs attention.

The next action directs the user to the first failed event, otherwise the first
live event, otherwise the attendance board.

### 10. Attendance Marking Story

From the park dashboard, the user opens the attendance board, which lists
today's events. If online data fails, the board can use cached data.

On the selected event roster:

- Every participant appears.
- The user marks a status.
- The action is queued in the local offline store.
- The roster updates immediately.
- A sync indicator tracks queued, failed, and synced state.

When there is no internet, marking continues locally and the items remain
queued. When connectivity returns, synchronisation runs: successful items are
cleared and failed items remain visible for retry.

Offline-first, mobile-friendly attendance is described as a key system
foundation.

### 11. Guardian Story

Guardians use the guardian portal to:

- See their linked child or children.
- View attendance.
- View fees.
- Read announcements.

They must not see administrative tools or other children's data.

### 12. Student Story

Students use the student portal to:

- View their own attendance.
- View their own fee status.
- Read announcements.

They must see only their own data.

### 13. Reporting Story

HQ and city operations have reports and exports with:

- Filters.
- Saved presets.
- URL-persistent scoped views.
- City-focused report views from dashboard links.
- Group-attendance, team-attendance, and summary-dashboard exports.

Reporting is intended to be connected to the operational flow, rather than a
standalone export screen.

### 14. Overall Story

The intended system is role-driven and operational:

- HQ controls cities and City Heads.
- City Heads run city operations.
- Park roles manage attendance and sync.
- Guardians and students see only their own linked information.
- Access creation is centralised and explicit.
- Offline attendance is a first-class workflow.
- Dashboards direct users toward the next real action rather than only showing
  static metrics.

## Supplied Current Implementation Plan

### 1. Foundation: Claimed Implemented

- Next.js App Router, TypeScript, and Tailwind CSS.
- Supabase (Auth, Postgres, RLS).
- Dexie / IndexedDB for the offline attendance queue.
- `exceljs` for exports.
- Role-based routing, Supabase server/client/admin access layers, guarded route
  access, and a Vercel deployment at `https://shabab360.vercel.app`.

### 2. Authentication And Access: Claimed Implemented

- Email/password login for internal users.
- No public self-registration for internal roles.
- First-login password-reset flow.
- Role-aware landing: HQ to `/admin`; park roles to `/park`; guardian to
  `/guardian`; student to `/student`.
- Account provisioning through Excel bulk import and single-account create or
  update.
- Access-status lookup, target and role summary, guardian-precedence rules,
  save blocking when role is missing, and unlinked-account warnings.

### 3. Role Structure: Claimed Implemented

Roles listed as wired:

- `super_admin`
- `program_admin`
- `city_head`
- `park_admin`
- `park_lead`
- `murabbi`
- `guardian`
- `student`

The supplied functional split is HQ national oversight, City Head city
operations, park operations for park roles, and read-only personal portals for
guardian and student roles.

### 4. HQ / Program Head Workspace: Claimed Implemented

Pages listed: `/admin`, `/admin/cities`, `/admin/reports`,
`/admin/announcements`, `/admin/users`, and `/admin/audit-log`.

Capabilities listed: national dashboard, city management, City Head
assignment, HQ exception board, report exports, City Head announcements, and
access administration.

### 5. City Head Workspace: Claimed Implemented

Pages listed: `/admin`, `/admin/parks`, `/admin/people`, `/admin/students`,
`/admin/guardians`, `/admin/attendance-events`, `/admin/settings`,
`/admin/fees`, `/admin/announcements`, `/admin/reports`, and `/admin/users`.

Capabilities listed: manage parks, batches, groups, attendance events, Shabab,
Murabbis, students, guardians, batch rules, fees, announcements, and city
scope.

### 6. People Operations: Claimed Implemented

`/admin/people` is stated to support creating, assigning, reassigning, editing,
activating/deactivating, bulk actions, operational filters, coverage gaps,
attention queues, access visibility, and direct handoff to `/admin/users`.

### 7. Student Operations: Claimed Implemented

`/admin/students` is stated to offer a student directory, park/batch/activity
filters, text search, URL-persistent filters, filtered URL copying, row-level
access opening, selected-student access status, and handoff to `/admin/users`.

### 8. Guardian Operations: Claimed Implemented

`/admin/guardians` is stated to support guardian creation linked to a child,
additional child linking, directory/search/filter access, URL-persistent
filters, filtered URL copying, access-status visibility, and handoff to
`/admin/users`.

### 9. Access Management Workspace: Claimed Implemented

`/admin/users` is stated to support a bulk-import template, bulk upload,
single-account creation/update, selected-target status checks, contextual
targets, and safeguards for account state, email/role preservation, guardian
precedence, blank roles, and unlinked targets.

### 10. Park Operations: Claimed Implemented

- `/park` has a park dashboard with live attendance-event counts, open/closed
  counts, attention queue, offline queue health, and urgency routing.
- `/park/attendance` has today's event board with cache fallback and event
  cards.
- `/park/attendance/[eventId]` has the roster, per-participant offline queue,
  local persistence, and sync indicator/state.

### 11. Guardian Portal: Claimed Implemented

`/guardian` offers linked-child visibility, attendance, fees, and
announcements.

### 12. Student Portal: Claimed Implemented

`/student` offers own attendance, fee status, and announcements.

### 13. Reports And Exports: Claimed Implemented

`/admin/reports` offers filters, saved presets, URL-persistent filtered views,
city-focused scope, and Excel exports for group attendance, team attendance,
and a summary dashboard.

### 14. UI / UX System: Claimed Implemented

- Branded, role-aware app shell.
- Functional dashboards.
- Filter-heavy operational pages with URL persistence, filtered URL copying,
  view reset, visible scope, and mobile improvements.
- Public homepage and branded login flow.
- App-wide logo and theme integration.

### 15. Security / Data Access: Claimed Implemented

- Session is used for identity.
- A server-side admin client is used for complex reads and writes.
- Scope checks are explicit in code.
- RLS-recursion exposure is reduced.
- Protected-route redirects were stated to be verified in production.

### 16. Testing And Verification: Claimed Implemented

The source states that `npm run lint`, `npm run typecheck`, and `npm run test`
all pass, with a full test-suite result of `113/113` passing.

### 17. Deployment: Claimed Implemented

The source states that production is deployed at
`https://shabab360.vercel.app`.

### 18. Remaining Work: Proposed Next Phase

- Full browser UAT using real role accounts.
- Authenticated live smoke tests across major workflows.
- Data validation against the real Supabase content.
- Fixes for bugs found in UAT.
- Optional migration from the deprecated Next.js middleware convention to
  `proxy`.
- Park-side urgency-routing refinements.
- Feature gaps found during real usage.

### 19. Proposed Immediate Plan

Run browser UAT on:

- `/admin/students`
- `/admin/guardians`
- `/admin/users`
- `/park`
- `/park/attendance`
- `/park/attendance/[eventId]`

Validate student access creation, guardian access creation, and park queue
health updates. Log defects found in live use and patch confirmed defects.

## Consolidation Notes

- This document complements [Vision Input 01](PRODUCT_VISION_INPUT_01.md).
- The core model is consistent with the first input: public site plus
  role-specific portal, HQ-to-city-to-park operational hierarchy, linked
  guardians, and protected personal portals.
- It introduces stronger requirements for role-aware landing, central account
  provisioning, URL-shareable operational views, exception-led dashboards, and
  offline attendance.
- It does not yet cover several major modules from Vision Input 01 in workflow
  detail: Content Planner, curriculum, events, calendar/batch planner,
  procurement, community, online resources, messaging, notifications, and the
  members directory.
- Its claims about Supabase, RLS, Vercel deployment, route availability, and
  test counts require independent verification before planning work around
  them. They are retained as source claims, not as confirmed project facts.

## Relationship To Existing Documents

- [Vision Input 01](PRODUCT_VISION_INPUT_01.md): early module and role
  requirements.
- [Shabab Programme Gap Audit](SHABAB_PROGRAMME_GAP_AUDIT.md): public
  programme research and current codebase gap audit.
- [Improvement Plan](../IMPROVEMENT_PLAN.md): technical hardening and deployment
  work.
