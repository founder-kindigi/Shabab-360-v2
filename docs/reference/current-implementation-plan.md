# Current Implementation Plan

This document reflects the system as currently implemented and deployed. It is based on the active Next.js codebase and the production build at `https://shabab360.vercel.app`.

## 1. Foundation

**Status:** Implemented

- Stack:
  - Next.js (App Router)
  - TypeScript
  - Tailwind CSS
  - Supabase (Auth, Postgres, RLS)
  - Dexie / IndexedDB for offline attendance queue
  - exceljs for Excel exports
- Core infrastructure:
  - role-based routing
  - server/client/admin Supabase access layers
  - protected route guards
  - Vercel deployment pipeline

## 2. Authentication and Access

**Status:** Implemented

- Email/password login for internal users
- No public self-registration for internal roles
- First-login password reset flow
- Role-aware post-login routing:
  - HQ roles -> `/admin`
  - Park roles -> `/park`
  - Guardian -> `/guardian`
  - Student -> `/student`
- Access provisioning:
  - bulk Excel import
  - single-account create/update
  - target status lookup before save
  - guardian precedence rules
  - effective target and effective role summary
  - save blocked when effective role is missing

## 3. Role Structure

**Status:** Implemented

Supported role flows:

- `super_admin`
- `program_admin`
- `city_head`
- `park_admin`
- `park_lead`
- `murabbi`
- `guardian`
- `student`

Role split:

- HQ roles use the national oversight workspace
- `city_head` uses the city operations workspace
- Park roles use the park operations workspace
- Guardian and student use read-only personal portals

## 4. HQ / Program Head Workspace

**Status:** Implemented

Primary routes:

- `/admin`
- `/admin/cities`
- `/admin/reports`
- `/admin/announcements`
- `/admin/fee-alerts`
- `/admin/schedule`
- `/admin/users`
- `/admin/audit-log`

Capabilities:

- national dashboard metrics
- HQ exception board
- city creation and editing
- city-head assignment and reassignment
- city-head-targeted announcements
- fee-attention queue for unpaid cases and guardian follow-up
- national reports and exports
- access administration

## 5. City Head / City Operations Workspace

**Status:** Implemented

Primary routes:

- `/admin`
- `/admin/admissions`
- `/admin/attendance-alerts`
- `/admin/fee-alerts`
- `/admin/schedule`
- `/admin/parks`
- `/admin/people`
- `/admin/students`
- `/admin/guardians`
- `/admin/attendance-events`
- `/admin/settings`
- `/admin/fees`
- `/admin/content`
- `/admin/procurement`
- `/admin/announcements`
- `/admin/reports`
- `/admin/users`
- `/admin/test-center`

Capabilities:

- manage parks, batches, and groups
- manage admissions pipeline, interview follow-up, and placement decisions
- manage attendance attention cases and guardian follow-up for warning/dropout participants
- manage unpaid-fee attention cases and guardian payment reminders
- manage attendance events
- manage participants and murabbis
- manage students
- manage guardians
- manage batch rules
- manage fees, receipts, and ledger filters
- manage content publishing and featured resources
- manage procurement inventory, allocations, stock adjustments, and park request review
- create announcements
- operate entirely inside city scope

## 6. People Operations

**Status:** Implemented

Route: `/admin/people`

Features:

- create Shabab and assign to a group
- create Murabbis and assign to a group
- reassign Shabab between groups
- reassign Murabbis between groups
- edit name, phone, and active status
- bulk move Shabab
- bulk activate/deactivate Shabab
- bulk activate/deactivate Murabbis
- filter by park, batch, and activity
- coverage-gap view
- attention queue
- row-level login visibility
- selected-record access status
- direct handoff into `/admin/users`

## 7. Student Operations

**Status:** Implemented

Route: `/admin/students`

Features:

- student-only directory
- search by text
- filter by park, batch, and activity
- URL-persistent filter state
- copy filtered URL
- reset view
- row-level `Open Access`
- selected student access status
- direct handoff into `/admin/users`

## 8. Guardian Operations

**Status:** Implemented

Route: `/admin/guardians`

Features:

- create guardian linked to a visible child
- link existing guardian to another visible child
- guardian directory
- search and park filter
- URL-persistent filter state
- copy filtered URL
- reset view
- row-level `Open Access`
- selected guardian access status
- direct handoff into `/admin/users`

## 9. Access Management Workspace

**Status:** Implemented

Route: `/admin/users`

Features:

- Excel template download
- bulk import
- single-account create
- single-account update
- existing access lookup for person or guardian target
- contextual target handoff from people, students, and guardians

Current form safeguards:

- create vs update wording
- email autofill for existing linked accounts
- role autofill with manual override preservation
- guardian target precedence
- `personId` disabled in guardian mode
- role locked to `guardian` in guardian mode
- explicit effective target type
- explicit effective role
- disabled save when effective role is blank
- explicit warning for unlinked account creation

## 10. Park Operations

**Status:** Implemented

Routes:

- `/park`
- `/park/schedule`
- `/park/attendance`
- `/park/attendance/[eventId]`
- `/park/alerts`
- `/park/procurement`
- `/park/resources`

Park dashboard (`/park`) features:

- live attendance-event counts for today
- open vs closed counts
- park attention queue
- offline queue health
- next urgent action
- direct jump into first failed queue event or first live event
- attendance alert workspace for warning/dropout follow-up with guardian communication

Attendance workflow:

- today event board
- attendance roster
- offline-first marking
- local queueing in Dexie
- sync and retry handling

Additional park operations:

- park resources library
- park procurement visibility for allocations and low-stock review
- park-side supply request creation and request-history tracking

## 11. Guardian Portal

**Status:** Implemented

Route: `/guardian`

Features:

- linked child visibility
- attendance view
- fees view with outstanding summary, outstanding items, and receipt method visibility
- announcements feed
- dedicated guardian resources workspace via `/guardian/resources`

## 12. Student Portal

**Status:** Implemented

Route: `/student`

Features:

- own attendance
- own fee status with outstanding summary, outstanding items, and receipt method visibility
- announcements

## 12A. Admissions Operations

**Status:** Implemented

Route: `/admin/admissions`

Features:

- public intake form at `/apply`
- city-scoped admissions pipeline
- interview scheduling
- interview completion with panel scores
- placement decision workflow
- approved-application conversion into live participant and guardian records
- guardian WhatsApp handoff for interview scheduling and decision updates
- action queue for overdue interviews, upcoming interviews, pending decisions, and ready-to-notify records

## 12B. Content and Resources

**Status:** Implemented

Routes:

- `/admin/content`
- `/guardian/resources`
- `/park/resources`
- `/student/resources`

Features:

- content categories
- link, video, and document publishing
- audience targeting for staff, students, and guardians
- featured-resource control
- read-only consumption workspaces for guardians, students, and park roles

## 12C. Procurement Operations

**Status:** Implemented

Routes:

- `/admin/procurement`
- `/park/procurement`

Features:

- inventory item catalog
- park allocations
- low-stock review
- HQ stock adjustments and adjustment ledger
- park-side allocation visibility

## 12D. Fee Attention Operations

**Status:** Implemented

Route: `/admin/fee-alerts`

Features:

- shared unpaid-fee attention queue for HQ and city roles
- search by participant, guardian, park, batch, and group
- park filter
- balance-type filter for admission vs event dues
- guardian WhatsApp reminder handoff
- direct jump into fee operations
- outstanding amount summaries and due-item previews

## 13. Reports and Exports

**Status:** Implemented

Route: `/admin/reports`

Features:

- filterable report workspace
- saved report presets
- URL-persistent filter state
- city-focused report scope
- copy filtered URL

Exports:

- Group Attendance
- Team Attendance
- Summary Dashboard

## 14. UI / UX System

**Status:** Implemented

- unified branded UI
- role-aware app shell
- sticky dashboard surfaces
- filter-heavy operational pages with:
  - URL persistence
  - visible active scope
  - copy filtered URL
  - reset view
- improved mobile layouts on key admin pages
- branded public homepage and login

## 15. Security and Data Access Model

**Status:** Implemented

- session is used for identity
- server-side admin client is used for complex reads and writes
- explicit scope checks are enforced in code
- route-level auth guards are active
- protected routes redirect correctly when unauthenticated

## 16. Testing and Verification

**Status:** Implemented

Current verification state:

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run test` passed
- Test suite: `113/113` passing

## 17. Deployment

**Status:** Implemented

- Production deployment completed successfully
- Live URL: `https://shabab360.vercel.app`

## 18. Current Remaining Work

**Status:** Pending / Next phase

Primary remaining items:

- full browser UAT with real role accounts
- live authenticated smoke tests for all main workflows
- validation against real production data
- bug fixes found during UAT
- optional migration from deprecated Next.js `middleware` convention to `proxy`

## 19. Recommended Immediate Next Steps

1. Run browser UAT on:
   - `/admin/students`
   - `/admin/guardians`
   - `/admin/users`
   - `/park`
   - `/park/attendance`
   - `/park/attendance/[eventId]`
2. Validate:
   - student access creation
   - guardian access creation
   - park queue health and urgent action behavior
3. Log issues found in live use
4. Patch only confirmed defects next

## 20. Next Five Sprint Roadmap

### Sprint 1. Visual System Refresh

**Goal:** Lift the visual quality of the product shell so every role workspace inherits a stronger identity.

- strengthen the shared visual system in `globals.css`
- add richer hero, spotlight, and KPI surface styles
- reduce flat white-card repetition
- improve perceived hierarchy across dashboards

**Execution state:** Core visual-system uplift implemented in this pass.

### Sprint 2. Shell and Navigation Upgrade

**Goal:** Make the application shell feel like a modern operations workspace instead of a basic sidebar layout.

- redesign sidebar branding and active-state treatment
- improve topbar controls and workspace context
- add mobile shortcut navigation
- surface current view and viewer context more clearly

**Execution state:** Shared app shell upgraded in this pass.

### Sprint 3. Dashboard Experience Upgrade

**Goal:** Turn primary dashboards into stronger command surfaces with clearer hierarchy and urgency.

- redesign admin dashboard hero and KPI cards
- strengthen HQ vs city-ops visual distinction
- improve park dashboard hero and urgent-action focus
- keep operational shortcuts prominent above secondary content

**Execution state:** Admin and park dashboards upgraded in this pass.

### Sprint 4. Operational Workspace Polish

**Goal:** Extend the stronger UX language into the main operational screens users touch every day.

- align students, guardians, people, access, and reporting pages with the new shell language
- tighten dense forms and control bars for mobile
- improve page-level empty states, filters, and action prominence
- remove remaining visually flat sections

**Execution state:** Planned next implementation wave.

### Sprint 5. Go-Live Readiness and UAT Closure

**Goal:** Finish the UI with production-quality validation and close remaining workflow gaps.

- run browser UAT against the refreshed UI
- fix issues found in live role workflows
- polish remaining copy and spacing inconsistencies
- complete go-live checklist and stabilization work

**Execution state:** Planned after Sprint 4 work lands.

## 21. Latest Sprint Snapshot

**Status:** Implemented

- Added `/admin/ops-center` as a unified admin action queue
- Combined action lanes:
  - admissions
  - attendance alerts
  - fee alerts
  - procurement requests
  - todayâ€™s attendance event coverage
- Added admin navigation, dashboard entry, and Test Center coverage for the new workspace

## 22. Latest Sprint Snapshot

**Status:** Implemented

- Added `/park/ops-center` as a unified park action queue
- Combined park action lanes:
  - todayâ€™s live attendance events
  - attendance alerts
  - supply request follow-up
  - local offline queue pressure
- Added park navigation, dashboard entry, and Test Center coverage for the new workspace

## 23. Latest Sprint Snapshot

**Status:** Implemented

- Added `/admin/schedule` as a date-focused admin schedule center
- Added `/park/schedule` as a date-focused park schedule center
- Reused existing admissions, attendance, and procurement data to build schedule queues without new schema
- Added schedule navigation, dashboard entry points, and Test Center coverage for both admin and park roles

## 24. Latest Sprint Snapshot

**Status:** Implemented

- Added `/apply/status` as a public admissions tracking page
- Added `/api/public/admissions/status` for tracking-code plus guardian-phone lookups
- Extended the admissions form success state with:
  - tracking code
  - copy tracking code
  - copy public status link
- Extended admin admissions review with:
  - visible tracking code
  - copy tracking code
  - copy public status link
- Tightened public admissions privacy by removing internal review notes from the public lookup response

## 25. Latest Sprint Snapshot

**Status:** Implemented

- Added `/guardian/schedule` as a family schedule workspace for linked children
- Added `/student/schedule` as a student schedule workspace for upcoming attendance events
- Added shared family schedule data and UI with:
  - search
  - participant filter
  - event-state filter
  - copy filtered URL
  - reset view
- Added guardian and student dashboard entry points into the new schedule routes
- Migrated deprecated `middleware.ts` to `proxy.ts` to remove the Next.js build warning

## 26. Latest Sprint Snapshot

**Status:** Implemented

- Added dedicated announcement centers for:
  - `/guardian/announcements`
  - `/student/announcements`
  - `/park/announcements`
- Added shared audience-announcement feed UI with:
  - search
  - scope filter
  - copy filtered URL
  - reset view
  - open/copy/share message actions
- Fixed student announcement targeting by adding a real student audience to the announcements schema
- Updated admin announcement publishing so HQ and city teams can target students explicitly
- Added guardian, student, and park dashboard/nav entry points to the new announcement centers
- Added Test Center coverage for the new announcement routes

## 27. Latest Sprint Snapshot

**Status:** Implemented

- Added `/admin/access-alerts` as a unified onboarding and access-follow-up workspace for HQ and city operations
- Added a shared access-attention data layer and board with:
  - search
  - target filter
  - status filter
  - park filter
  - copy filtered URL
  - reset view
- The new queue surfaces:
  - missing login access
  - forced password reset accounts
  - ready accounts when broader inspection is needed
- Included students, guardians, murabbis, park admins, park leads, and city heads within the appropriate admin scope
- Added direct action links from each row into `/admin/users`
- Fixed `/admin/users` context handling so guardian-targeted access handoffs now load correctly end to end
- Added navigation, dashboard links, and Test Center coverage for the new access-alerts route

## 28. Latest Sprint Snapshot

**Status:** Implemented

- Extended `/admin/admissions` so converted applications now surface onboarding follow-up state directly
- Admissions applications now carry:
  - participant access status
  - guardian access status
  - reset-required visibility
- Added batched linked-access loading in the access data layer to avoid one-by-one status lookups
- Added admissions onboarding actions:
  - open student ops
  - open guardian ops
  - open targeted access setup
  - open access alerts
- Added an `Onboarding Incomplete` KPI to the admissions workspace
- Updated the Test Center admissions checklist to include onboarding handoff

## 29. Latest Sprint Snapshot

**Status:** Implemented

- Added scoped attendance insight workspaces for:
  - `/admin/attendance-insights`
  - `/park/attendance-insights`
- Added one shared attendance-insights data layer and client UI with:
  - date-range filtering
  - park filtering
  - local search
  - copy filtered URL
  - reset view
- The new insight center surfaces:
  - attendance rate
  - open vs closed events
  - warning/dropout pressure
  - daily trend rows
  - park summaries
  - hotspot groups with direct event follow-up links
- Added admin and park navigation, dashboard links, and Test Center coverage for the new attendance-insights routes
- Included a small sprint cleanup to keep dashboard copy and route wiring aligned with the new insight workflow

## 30. Latest Sprint Snapshot

**Status:** Implemented

- Added `/park/roster` as a dedicated participant and guardian follow-up workspace for park roles
- Added a shared park-roster data layer that reuses:
  - participants
  - guardian links
  - login access state
  - latest attendance context
- The new roster page includes:
  - park filtering
  - participant-state filtering
  - access/guardian-linkage filtering
  - local search
  - copy filtered URL
  - reset view
- Added direct park actions for:
  - opening attendance alerts
  - messaging the first linked guardian on WhatsApp
- Added park navigation, dashboard links, ops-center entry points, and Test Center coverage for the new roster route

## 31. Latest Sprint Snapshot

**Status:** Implemented

- Added `/park/fee-alerts` as a dedicated unpaid-dues follow-up workspace for park roles
- Extended the shared fee-attention board so it can be reused safely by:
  - admin roles
  - park roles
- Park fee alerts now support:
  - unpaid participant review
  - guardian WhatsApp reminder handoff
  - direct park-roster follow-up
- Added a fee lane into `/park/ops-center` so park roles can see unpaid-dues pressure in the unified action queue
- Added park navigation, dashboard links, and Test Center coverage for the new park fee-alert workflow
- No schema migration was required for this sprint

## 32. Latest Sprint Snapshot

**Status:** Implemented

- Added `/admin/family-ops` as a unified family follow-up workspace for HQ and city roles
- Built one shared family-ops data layer that combines:
  - admissions follow-up
  - attendance family outreach
  - fee reminders
  - access onboarding actions
- Added one reusable client workspace with:
  - lane summaries
  - severity filtering
  - park filtering
  - search
  - copy filtered URL
  - reset view
- Added guardian WhatsApp handoff directly from family-facing attendance, fee, and admissions rows
- Added direct next-step links into:
  - admissions
  - students
  - guardians
  - access alerts
  - targeted access setup
- Added admin navigation, dashboard links, and Test Center coverage for the new family-ops route
- No schema migration was required for this sprint

## 33. Latest Sprint Snapshot

**Status:** Implemented

- Added `/admin/attendance-command` as a date-based attendance coverage workspace for HQ and city roles
- Built one shared attendance-command data layer that combines:
  - missing group coverage for the selected date
  - open and closed event follow-up
  - park-by-park coverage summaries
- Added one reusable client workspace with:
  - date filter
  - park filter
  - batch filter
  - severity filter
  - search
  - copy filtered URL
  - reset view
- Added admin navigation, dashboard entry points, and Test Center coverage for the new attendance-command route
- Fixed `/admin/attendance-events` local filter updates so they use client-side URL replacement instead of unnecessary Next.js server navigation
- No schema migration was required for this sprint

## 34. Latest Sprint Snapshot

**Status:** Implemented

- Added `/guardian/action-center` and `/student/action-center` as unified family follow-up workspaces
- Built one shared family-action data layer that combines:
  - attendance progress attention
  - upcoming schedule follow-up
  - fee follow-up
  - latest announcement follow-up
- Added one reusable client workspace with:
  - search
  - participant filter
  - lane filter
  - copy filtered URL
  - reset view
- Added guardian and student navigation, dashboard entry points, and Test Center coverage for the new action-center routes
- Fixed `/guardian/schedule` and `/student/schedule` local filter updates so they use client-side URL replacement instead of unnecessary Next.js server navigation
- No schema migration was required for this sprint

## 35. Latest Sprint Snapshot

**Status:** Implemented

- Added `/guardian/history` and `/student/history` as dedicated history centers for family users
- Built one shared family-history data layer and client workspace that combines:
  - attendance history
  - fee history
  - per-participant fee summary
- Added shareable, URL-persistent filters for:
  - search
  - participant selection
  - attendance date range
  - fee date range
  - focused view (`attendance`, `fees`, or both)
- Added guardian and student navigation entries for the new history routes
- Updated guardian and student dashboard quick actions so attendance and fee follow-up can open the new history centers directly instead of relying only on deep dashboard scrolling
- Added Test Center coverage for the new family history routes
- No schema migration was required for this sprint

## 36. Latest Sprint Snapshot

**Status:** Implemented

- Added `/park/guardians` as a dedicated guardian contact center for park roles
- Built one shared park-guardian data layer by reusing:
  - park roster visibility
  - guardian linkage
  - participant state
  - latest attendance context
- Added one park guardian workspace with:
  - search
  - park filter
  - attention filter
  - access filter
  - copy filtered URL
  - reset view
- Added direct guardian follow-up actions:
  - WhatsApp contact
  - park roster handoff
  - attendance alerts handoff
  - fee alerts handoff
- Added park navigation, dashboard links, ops-center links, and Test Center coverage for the new guardian-contact route
- No schema migration was required for this sprint

## 37. Latest Sprint Snapshot

**Status:** Implemented

- Added `/admin/onboarding-center` as a dedicated admissions onboarding workspace for HQ and city roles
- Built one shared admissions-onboarding data layer that reuses:
  - approved admissions placement state
  - admissions conversion state
  - linked student access state
  - linked guardian access state
- Added one onboarding center with:
  - search
  - lane filter
  - status filter
  - severity filter
  - park filter
  - copy filtered URL
  - reset view
- Added direct next-step actions into:
  - admissions
  - student access setup
  - guardian access setup
  - student ops
  - guardian ops
- Fixed `/admin/admissions` local query and stage filters so they persist in the browser URL instead of resetting on refresh
- Added admin navigation, dashboard links, and Test Center coverage for the new onboarding-center route
- No schema migration was required for this sprint

## 38. Latest Sprint Snapshot

**Status:** Implemented

- Added `/park/family-ops` as a dedicated park-side family follow-up workspace
- Built one shared park-family-ops data layer that reuses:
  - park roster visibility
  - guardian linkage
  - attendance attention
  - fee attention
- Added one park family operations center with:
  - search
  - lane filter
  - severity filter
  - park filter
  - copy filtered URL
  - reset view
- Added direct next-step actions into:
  - guardians
  - roster
  - attendance alerts
  - fee alerts
  - guardian WhatsApp follow-up
- Fixed `/admin/students` and `/admin/guardians` local filter updates so they use browser URL replacement instead of unnecessary Next.js router navigation
- Added park navigation, dashboard links, ops-center links, and Test Center coverage for the new park-family-ops route
- No schema migration was required for this sprint

## 39. Latest Sprint Snapshot

**Status:** Implemented

- Added `/park/attendance-command` as a dedicated date-focused attendance coverage workspace for park roles
- Refactored the attendance-command feature into one shared admin/park implementation instead of keeping it admin-only
- Added park-scoped attendance-command data loading that reuses:
  - accessible park ids
  - active batches
  - active groups
  - attendance events for the selected date
- Added direct park links into:
  - attendance board
  - attendance insights
  - park dashboard
  - park ops center
- Fixed shared announcement-center local filters so they update the browser URL without unnecessary Next.js router navigation
- Fixed shared content-library local filters so they update the browser URL without unnecessary Next.js router navigation
- Added Test Center coverage for the new park attendance-command route
- No schema migration was required for this sprint

## 40. Latest Sprint Snapshot

**Status:** Implemented

- Added `/admin/student-progress` and `/park/student-progress` as unified student follow-up workspaces for admin and park roles
- Built one shared student-progress data layer that combines:
  - participant state
  - guardian linkage
  - access status
  - latest attendance context
  - outstanding dues
- Added one shared student-progress center with:
  - search
  - park filter
  - state filter
  - access filter
  - dues filter
  - copy filtered URL
  - reset view
- Added direct next-step actions into:
  - students or roster
  - attendance alerts
  - fee alerts
  - access or guardians follow-up
- Fixed `/admin/people`, `/admin/parks`, and `/admin/reports` local filter updates so they update the browser URL without unnecessary Next.js router navigation
- Added navigation, dashboard links, and Test Center coverage for the new admin and park student-progress routes
- No schema migration was required for this sprint

## 41. Latest Sprint Snapshot

**Status:** Implemented

- Added `/admin/park-health` as a dedicated per-park operational health workspace for HQ and city roles
- Built a shared park-health data layer that combines:
  - active batch coverage
  - group coverage
  - participant counts
  - warning and dropout pressure
  - today's open and closed attendance events
  - groups missing today's event
  - outstanding dues pressure
  - pending procurement requests
- Added a park health board with:
  - search
  - park filter
  - health-state filter
  - copy filtered URL
  - reset view
- Added direct next-step actions into:
  - attendance command
  - fee alerts
  - procurement
- Fixed `/admin/procurement` local filter updates so request and inventory filters now persist in the browser URL without unnecessary Next.js router navigation
- Fixed `/admin/content` local filter updates so content search and audience/category/state filters now persist in the browser URL without unnecessary Next.js router navigation
- Added admin navigation, dashboard links, and Test Center coverage for the new park-health route
- No schema migration was required for this sprint

## 42. Latest Sprint Snapshot

**Status:** Implemented

- Added `/admin/batch-health` as a dedicated per-batch operational health workspace for HQ and city roles
- Built a shared batch-health data layer that combines:
  - batch rule configuration coverage
  - group and participant counts
  - murabbi coverage gaps
  - today's open and closed attendance events
  - groups missing today's event
  - outstanding dues pressure
- Added a batch health board with:
  - search
  - park filter
  - health-state filter
  - copy filtered URL
  - reset view
- Added direct next-step actions into:
  - batch settings
  - parks and groups setup
  - attendance command
- Fixed `/admin/settings` so focused `batchId` selection is URL-driven and reload-safe
- Fixed `/admin/cities` local focus changes so they update the browser URL without unnecessary Next.js router navigation
- Fixed `/admin/attendance-insights` park filtering so local scope changes no longer trigger avoidable server navigation
- Added admin navigation, dashboard links, and Test Center coverage for the new batch-health route
- No schema migration was required for this sprint
