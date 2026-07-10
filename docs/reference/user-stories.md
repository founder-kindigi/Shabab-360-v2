# Shabab360 User Stories

Version: 0.1 draft  
Date: 2026-07-04  
Status: Refinement baseline  
Related documents:

- `docs/project-working-refinement-guide.md`
- `docs/software-requirements-specification.md`

## 1. Purpose

This document captures user stories for the Shabab360 project. It is organized by epics and concrete roles so the project can be refined into a smaller, clearer product.

The stories include existing functionality and refinement stories. Each story should be reviewed and marked as:

- Keep
- Change
- Merge
- Remove
- Phase 2

## 2. Story format

Each story uses:

```text
As a [specific role],
I want [capability],
so that [business outcome].
```

Acceptance criteria use Given/When/Then.

Priority labels:

| Priority | Meaning |
|---|---|
| P0 | Essential for first usable release |
| P1 | Important for daily operations |
| P2 | Useful but can wait |
| P3 | Optional or likely phase 2 |

Status labels:

| Status | Meaning |
|---|---|
| Implemented | Exists in current product |
| Needs Refinement | Exists but must be simplified or clarified |
| Proposed | Needed for refinement but not necessarily implemented |
| To Confirm | Business decision required |

## 3. Personas

| Persona | Description |
|---|---|
| Public Family Applicant | Family member applying for admission |
| Super Admin | Technical recovery/full-access administrator |
| Program Admin | HQ or Markazi Masoul operator |
| City Head | City Masoul operator |
| Park Admin | Park-level operations user |
| Park Lead | Park-level lead with attendance responsibility |
| Murabbi | Mentor working with one group or park |
| Guardian | Parent/guardian linked to Shabab |
| Student | Shabab participant |

## 4. Epic 1: Authentication and Role Access

### US-AUTH-001: Login With Issued Credentials

As an internal user, I want to log in using credentials issued by an administrator, so that I can access my assigned workspace.

Priority: P0  
Status: Implemented

Acceptance criteria:

- Given I have a valid auth account, when I enter my email and password, then I am signed in.
- Given my credentials are invalid, when I submit the form, then I see a login error.
- Given I am not authenticated, when I open a protected route, then I am redirected to `/login`.

### US-AUTH-002: Role-Based Landing

As an authenticated user, I want the system to send me to the correct workspace, so that I do not need to choose my role manually.

Priority: P0  
Status: Implemented

Acceptance criteria:

- Given I am a Program Admin, when I sign in, then I land on `/admin`.
- Given I am a City Head, when I sign in, then I land on `/admin`.
- Given I am a Park Admin, Park Lead, or Murabbi, when I sign in, then I land on `/park`.
- Given I am a Guardian, when I sign in, then I land on `/guardian`.
- Given I am a Student, when I sign in, then I land on `/student`.

### US-AUTH-003: First Login Password Reset

As a newly provisioned user, I want to be asked to reset my temporary password, so that my account is not left with a shared temporary password.

Priority: P1  
Status: Implemented

Acceptance criteria:

- Given my account is marked `must_reset_password`, when I log in, then I am redirected to `/reset-password`.
- Given I submit matching valid passwords, when reset succeeds, then the reset flag is cleared.
- Given my new password and confirmation do not match, when I submit, then I see a validation error.

### US-AUTH-004: Access Pending State

As an authenticated but unlinked user, I want to see an access pending page, so that I know my account exists but is not ready.

Priority: P1  
Status: Implemented

Acceptance criteria:

- Given my auth account has no linked role/profile, when I sign in, then I land on `/access-pending`.
- Given I am on access pending, when I sign out, then I return to login.

### US-AUTH-005: Finalize Unlinked Account Policy

As a project owner, I want a clear policy for unlinked auth accounts, so that the system is not confusing or insecure.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given an auth account is unlinked, when it signs in, then the expected behavior is documented.
- Given unlinked accounts are not allowed, when one exists, then admins can identify and resolve it.
- Given the policy is approved, then the access workspace and UAT checklist reflect it.

## 5. Epic 2: Public Admissions

### US-PUB-001: Submit Admission Application

As a public family applicant, I want to submit an admission application, so that my child can be considered for the Shabab program.

Priority: P1 if admissions remain  
Status: Implemented, To Confirm

Acceptance criteria:

- Given I fill required application fields, when I submit, then the application is created.
- Given submission succeeds, then I receive a tracking code.
- Given required fields are missing, when I submit, then I see validation errors.

### US-PUB-002: Check Application Status

As a public family applicant, I want to check application status using a tracking code and guardian phone, so that I can follow progress without contacting staff.

Priority: P2  
Status: Implemented, To Confirm

Acceptance criteria:

- Given I enter valid tracking code and guardian phone, when I search, then I see public-safe status information.
- Given I enter invalid details, when I search, then I do not see private application data.
- Given internal notes exist, when public status loads, then internal notes are hidden.

### US-PUB-003: Decide Admission Scope

As a project owner, I want to decide whether public admissions are part of the first release, so that the product does not include unnecessary workflow.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given admissions are required, then application, review, interview, and conversion stories remain active.
- Given admissions are not required, then public apply routes are hidden or removed from main flows.

## 6. Epic 3: HQ and City Administration

### US-ADM-001: View Admin Dashboard

As a Program Admin or City Head, I want to view an operations dashboard, so that I can quickly understand current work.

Priority: P0  
Status: Implemented, Needs Refinement

Acceptance criteria:

- Given I am authorized, when I open `/admin`, then dashboard data loads.
- Given I am a Program Admin, then I see HQ-oriented context.
- Given I am a City Head, then I see city operations context.

### US-ADM-002: Manage Cities

As a Program Admin, I want to create and manage cities, so that the program network is structured correctly.

Priority: P1  
Status: Implemented

Acceptance criteria:

- Given I enter a valid city name and code, when I save, then the city is created.
- Given a city exists, when I edit it, then updates are persisted.
- Given I am not authorized, when I attempt city management, then access is denied.

### US-ADM-003: Assign City Heads

As a Program Admin, I want to assign a City Head to a city, so that city operations are owned by the right person.

Priority: P1  
Status: Implemented

Acceptance criteria:

- Given a staff record exists, when I assign it as City Head, then the city scope is updated.
- Given a City Head signs in, then their data is scoped to the assigned city.

### US-ADM-004: Manage Parks, Batches, and Groups

As a City Head, I want to manage parks, batches, and groups, so that Shabab can be organized for attendance and reporting.

Priority: P0  
Status: Implemented

Acceptance criteria:

- Given I create a park under my city, then it is available for batches.
- Given I create a batch under a park, then it is available for groups.
- Given I create a group under a batch, then participants can be assigned to it.
- Given I am city-scoped, then I cannot manage another city's parks.

### US-ADM-005: Simplify Admin Navigation

As a project owner, I want admin navigation to show fewer top-level pages, so that staff can understand the system quickly.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given the route inventory is reviewed, then every route is marked keep, merge, hide, remove, or phase 2.
- Given a page overlaps another page, then the preferred primary location is documented.
- Given the new navigation is approved, then users see only the simplified top-level items.

## 7. Epic 4: People, Students, Murabbis, and Guardians

### US-PEOPLE-001: Create Shabab Record

As a City Head, I want to create a Shabab record and assign it to a group, so that the participant appears in attendance and reports.

Priority: P0  
Status: Implemented

Acceptance criteria:

- Given I enter valid participant details and group, when I save, then the Shabab record is created.
- Given no group is selected, when I save, then the system rejects the record.
- Given the record is created, then it can appear in rosters and reports.

### US-PEOPLE-002: Create Murabbi Record

As a City Head, I want to create a Murabbi record and assign it to a group or park, so that mentorship responsibility is visible.

Priority: P1  
Status: Implemented

Acceptance criteria:

- Given valid staff details and assignment, when I save, then a staff record and role metadata are created.
- Given assignment is invalid, when I save, then the system rejects the record.

### US-PEOPLE-003: Reassign Shabab Between Groups

As a City Head, I want to reassign Shabab between groups, so that roster membership stays accurate.

Priority: P1  
Status: Implemented

Acceptance criteria:

- Given a participant exists, when I select a new group and save, then the participant moves to that group.
- Given the new group is outside my scope, then the update is denied.

### US-PEOPLE-004: Create Guardian and Link Child

As a City Head, I want to create a guardian and link them to a Shabab, so that family follow-up and guardian access work.

Priority: P0  
Status: Implemented

Acceptance criteria:

- Given I enter guardian details and select a child, when I save, then the guardian is created and linked.
- Given a guardian already exists, when I link another visible child, then the additional link is saved.
- Given a child is outside my scope, then I cannot link it.

### US-PEOPLE-005: Consolidate People Views

As a project owner, I want to decide whether People, Students, Guardians, and Student Progress should be separate pages, so that users do not chase the same record across many modules.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given a student appears in multiple pages, then the primary owner page is selected.
- Given duplicate actions exist, then they are merged or turned into secondary links.
- Given the decision is approved, then navigation and user stories are updated.

## 8. Epic 5: Access Provisioning

### US-ACCESS-001: Create Login for a Person

As an admin, I want to create a login for a staff member or Shabab, so that the person can access their assigned workspace.

Priority: P0  
Status: Implemented

Acceptance criteria:

- Given a valid person target, email, password, and role, when I save, then an auth account is created or updated.
- Given the person target already has access, then the form makes clear that I am updating access.
- Given save succeeds, then the person is linked to the auth account.

### US-ACCESS-002: Create Login for a Guardian

As an admin, I want to create a login for a guardian, so that they can access linked child information.

Priority: P1 if guardian portal remains  
Status: Implemented

Acceptance criteria:

- Given a valid guardian target, email, and password, when I save, then the guardian is linked to an auth account.
- Given guardian mode is active, then role is locked to `guardian`.
- Given the guardian has no visible child link, then the system blocks or warns according to final policy.

### US-ACCESS-003: Bulk Import Access Accounts

As an admin, I want to import access accounts from Excel, so that many accounts can be provisioned quickly.

Priority: P2  
Status: Implemented, To Confirm

Acceptance criteria:

- Given an Excel file has required columns, when I upload it, then accounts are created or updated.
- Given a row is invalid, then the system reports the issue.
- Given bulk import is out of scope, then the page should hide or remove this option.

### US-ACCESS-004: Review Access Alerts

As an admin, I want to see missing login and reset-required accounts, so that onboarding gaps can be resolved.

Priority: P1  
Status: Implemented, Candidate For Merge

Acceptance criteria:

- Given a person or guardian has no login, then they appear as missing login.
- Given an account requires reset, then it appears as reset required.
- Given I open an item, then I can jump to targeted access setup.

## 9. Epic 6: Attendance Operations

### US-ATT-001: Create Attendance Event

As a City Head or authorized admin, I want to create attendance events for groups, so that park teams can mark attendance.

Priority: P0  
Status: Implemented

Acceptance criteria:

- Given I select valid park, batch, group, date, and title, when I save, then the event is created.
- Given required fields are missing, then the system shows validation errors.
- Given my role lacks access, then event creation is denied.

### US-ATT-002: View Today's Events

As a park user, I want to see today's attendance events, so that I can quickly start marking attendance.

Priority: P0  
Status: Implemented

Acceptance criteria:

- Given events exist for today, when I open `/park/attendance`, then the events are listed.
- Given no event exists, then I see an empty state or setup guidance.
- Given I am offline and cached data exists, then I can see an offline snapshot.

### US-ATT-003: Mark Attendance

As a Park Admin or Park Lead, I want to mark attendance from the roster, so that attendance records are accurate.

Priority: P0  
Status: Implemented

Acceptance criteria:

- Given an open event and visible roster, when I mark a participant present, absent, late, or other allowed status, then the record is saved.
- Given the event is closed, when I try to edit without permission, then the system rejects the change.
- Given the mark succeeds, then the roster shows updated status.

### US-ATT-004: Mark Attendance Offline

As a park user, I want attendance marks to work offline, so that poor connectivity does not stop session operations.

Priority: P0 if offline remains required  
Status: Implemented

Acceptance criteria:

- Given I am offline, when I mark attendance, then the mark is added to local queue.
- Given multiple marks are made for the same participant and event, then the latest local mark wins.
- Given the browser reconnects, then queued marks sync to the server.
- Given a sync item fails, then it remains visible or retryable.

### US-ATT-005: Review Attendance Alerts

As a city or park operator, I want to review warning and dropout cases, so that families can be contacted quickly.

Priority: P1  
Status: Implemented, Candidate For Merge

Acceptance criteria:

- Given a participant is in warning or dropout state, then they appear in the attention list.
- Given guardian contact exists, then I can start a WhatsApp handoff where supported.
- Given attendance alert pages are merged, then the same follow-up data remains reachable.

### US-ATT-006: Decide Murabbi Attendance Rights

As a project owner, I want to decide whether Murabbis can mark attendance, so that permissions match the real operating model.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given Murabbis should mark attendance, then their allowed scope and closed-event rights are documented.
- Given Murabbis should not mark attendance, then UI and guards prevent it.

## 10. Epic 7: Family Follow-up

### US-FAM-001: View Family Follow-up Queue

As an admin or park operator, I want a family follow-up queue, so that attendance, fee, access, and admissions issues are not missed.

Priority: P1  
Status: Implemented, Candidate For Merge

Acceptance criteria:

- Given follow-up items exist, then they are grouped by issue type.
- Given a guardian phone exists, then a contact action is available.
- Given duplicate family queues exist, then the primary queue is selected for the refined product.

### US-FAM-002: Contact Guardian From Follow-up

As a park or city operator, I want to open a guardian WhatsApp message handoff, so that I can contact families quickly.

Priority: P1  
Status: Implemented

Acceptance criteria:

- Given a guardian has a phone number, then a WhatsApp handoff link can be generated.
- Given no phone number exists, then the UI does not show a broken contact action.

### US-FAM-003: Consolidate Family Pages

As a project owner, I want family follow-up to live in one clear place, so that staff do not inspect multiple pages for the same issue.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given family-related pages are reviewed, then each is marked keep, merge, hide, or remove.
- Given the primary page is selected, then related modules link to it consistently.

## 11. Epic 8: Fees and Payments

### US-FEE-001: Configure Batch Fees

As a City Head, I want to configure admission and event fee rules for a batch, so that expected dues are known.

Priority: P1 if fees remain  
Status: Implemented, To Confirm

Acceptance criteria:

- Given a batch exists, when I set fee rules, then settings are saved.
- Given fee rules are invalid, then validation prevents saving.

### US-FEE-002: Record Payment

As an authorized operator, I want to record payments, so that dues and receipts are accurate.

Priority: P1 if fees remain  
Status: Implemented, To Confirm

Acceptance criteria:

- Given valid participant, payment type, amount, and method, when I save, then the payment is recorded.
- Given the payment is recorded, then a unique receipt number is generated.
- Given amount is invalid, then save is rejected.

### US-FEE-003: Review Unpaid Dues

As an admin or park operator, I want to see unpaid dues, so that families can be reminded.

Priority: P1 if fees remain  
Status: Implemented, Candidate For Merge

Acceptance criteria:

- Given participants have outstanding dues, then they appear in fee alerts.
- Given guardian contact exists, then a reminder handoff is available.
- Given fees are out of scope, then fee alerts are hidden from navigation.

### US-FEE-004: Decide Fee Scope

As a project owner, I want to decide whether fees belong in the next version, so that the product stays focused.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given fees are required, then payment, dues, receipts, and fee reports remain in scope.
- Given fees are phase 2, then fee modules are hidden and no core workflow depends on them.

## 12. Epic 9: Guardian Portal

### US-GUARD-001: View Linked Children

As a guardian, I want to see only my linked children, so that my portal is private and relevant.

Priority: P1 if guardian portal remains  
Status: Implemented

Acceptance criteria:

- Given I am linked to one child, when I open `/guardian`, then only that child appears.
- Given I am not linked to a child, then no unrelated participant appears.

### US-GUARD-002: View Child History

As a guardian, I want to view child attendance and fee history, so that I can understand program participation and dues.

Priority: P2  
Status: Implemented, To Confirm

Acceptance criteria:

- Given child attendance exists, then I can view attendance history.
- Given fee data exists and fees are in scope, then I can view fee history.
- Given fees are not in scope, then fee history is hidden or removed.

### US-GUARD-003: View Schedule and Announcements

As a guardian, I want to see schedule and announcements, so that I know upcoming sessions and updates.

Priority: P2  
Status: Implemented, To Confirm

Acceptance criteria:

- Given upcoming events exist, then I can view them in schedule.
- Given announcements target my audience/scope, then I can read them.

### US-GUARD-004: Decide Guardian Portal Scope

As a project owner, I want to decide whether guardians need login access, so that the product does not include an unused portal.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given guardian login is required, then guardian stories remain active.
- Given guardian login is not required, then guardian portal is hidden or moved to phase 2.

## 13. Epic 10: Student Portal

### US-STU-001: View Own Dashboard

As a student, I want to see my own dashboard, so that I can track my participation.

Priority: P2 if student portal remains  
Status: Implemented, To Confirm

Acceptance criteria:

- Given I am linked to a participant record, when I open `/student`, then I see only my own data.
- Given I try to access another participant's data, then access is denied.

### US-STU-002: View Own History and Schedule

As a student, I want to view my attendance history and schedule, so that I know my progress and upcoming sessions.

Priority: P2  
Status: Implemented, To Confirm

Acceptance criteria:

- Given attendance history exists, then I can view it.
- Given upcoming events exist, then I can view schedule.
- Given announcements target students, then I can read them.

### US-STU-003: Decide Student Portal Scope

As a project owner, I want to decide whether students need login access, so that the system matches real-world usage.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given student login is required, then student stories remain active.
- Given student login is phase 2, then student portal is hidden without breaking admin/park workflows.

## 14. Epic 11: Announcements and Resources

### US-COMM-001: Publish Announcement

As an admin, I want to publish announcements to selected audiences, so that staff, guardians, or students receive relevant updates.

Priority: P2  
Status: Implemented, To Confirm

Acceptance criteria:

- Given I select title, body, audience, and scope, when I publish, then the announcement is saved.
- Given an audience is not selected, then validation prevents unclear publishing.
- Given a user is outside target scope, then they do not see the announcement.

### US-COMM-002: Read Announcements

As a park, guardian, or student user, I want to read announcements relevant to me, so that I stay updated.

Priority: P2  
Status: Implemented, To Confirm

Acceptance criteria:

- Given announcements target my role and scope, then I can see them.
- Given an announcement does not target me, then I cannot see it.

### US-COMM-003: Manage Resource Library

As an admin, I want to publish resources by audience, so that users can access useful content.

Priority: P3  
Status: Implemented, Candidate For Removal

Acceptance criteria:

- Given a resource is published to my audience, then it appears in my resources page.
- Given a resource is unpublished, then it does not appear.
- Given resources are out of scope, then content library is hidden or removed.

## 15. Epic 12: Procurement

### US-PROC-001: Manage Inventory

As an HQ operator, I want to manage inventory items and stock levels, so that program supplies are tracked.

Priority: P3  
Status: Implemented, Candidate For Removal

Acceptance criteria:

- Given an inventory item is created, then it appears in inventory.
- Given stock is adjusted, then adjustment history is recorded.

### US-PROC-002: Request Supplies

As a park operator, I want to request supplies, so that HQ or city teams can respond.

Priority: P3  
Status: Implemented, Candidate For Removal

Acceptance criteria:

- Given I submit a valid request, then it appears for review.
- Given the request is approved or rejected, then status updates.

### US-PROC-003: Decide Procurement Scope

As a project owner, I want to decide whether procurement belongs in the current release, so that the product is not overloaded.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given procurement is required, then inventory and request stories remain active.
- Given procurement is not required, then procurement routes are hidden or removed.

## 16. Epic 13: Reports and Audit

### US-REP-001: Export Attendance Report

As an admin, I want to export attendance reports, so that offline Excel review and sharing are possible.

Priority: P0 or P1 depending on launch needs  
Status: Implemented

Acceptance criteria:

- Given I select report filters, when I export, then the Excel file uses those filters.
- Given I am city-scoped, then the export contains only visible data.
- Given no data matches filters, then the export handles empty results clearly.

### US-REP-002: Save Report Preset

As an admin, I want to save report filters as presets, so that repeated reporting is faster.

Priority: P2  
Status: Implemented, To Confirm

Acceptance criteria:

- Given I save a valid preset name and filters, then the preset is available later.
- Given I rename a preset, then the updated name is saved.
- Given presets are not required, then this feature can be hidden without removing export.

### US-REP-003: Review Audit Log

As a privileged admin, I want to review audit entries, so that important data changes can be traced.

Priority: P1  
Status: Implemented

Acceptance criteria:

- Given audit entries exist, when I open audit log, then I can view key metadata.
- Given I am not privileged, then I cannot read audit logs.

### US-REP-004: Confirm Final Report Formats

As a project owner, I want to confirm exact report formats, so that exports match operational expectations.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given each required report is listed, then its columns, grouping, filters, and filename pattern are documented.
- Given formats are approved, then implementation and tests are updated.

## 17. Epic 14: Product Simplification

### US-SIMP-001: Route Decision Inventory

As a project owner, I want every route marked as keep, merge, hide, remove, or phase 2, so that the codebase can be refined intentionally.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given the current route map, then every route has a decision.
- Given a route is marked merge, then its destination route is documented.
- Given a route is marked remove, then dependent workflows are identified first.

### US-SIMP-002: Simplified Admin Navigation

As an admin user, I want fewer top-level navigation items, so that I can find the correct workflow faster.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given simplified navigation is approved, then admin top-level nav contains only core modules.
- Given secondary modules remain, then they are reachable from relevant primary pages.
- Given a module is phase 2, then it is hidden from normal navigation.

### US-SIMP-003: Simplified Park Navigation

As a park user, I want a smaller mobile-friendly workspace, so that attendance and follow-up are fast during field operations.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given I am a park user, then top-level navigation focuses on attendance, participants, families, schedule, and resources only if approved.
- Given analytics remain, then they are secondary links rather than daily-work blockers.

### US-SIMP-004: Rename Modules to Business Language

As a non-technical operator, I want labels that match my real work, so that I understand pages without training.

Priority: P1  
Status: Proposed

Acceptance criteria:

- Given a label is unclear, then a business-language replacement is proposed.
- Given replacements are approved, then navigation, headings, and docs use the same terms.

## 18. Epic 15: Security and Data Isolation

### US-SEC-001: Guardian Data Isolation

As a guardian, I want only my linked children to be visible, so that family privacy is protected.

Priority: P0  
Status: Implemented, Must Test

Acceptance criteria:

- Given I am Guardian A, then I can see only children linked to Guardian A.
- Given I try to access another guardian's child data, then access is denied.

### US-SEC-002: Student Data Isolation

As a student, I want only my own record to be visible, so that participant privacy is protected.

Priority: P0 if student portal remains  
Status: Implemented, Must Test

Acceptance criteria:

- Given I am Student A, then I can see only Student A data.
- Given I try to access Student B data, then access is denied.

### US-SEC-003: Park Scope Enforcement

As a program owner, I want park users restricted to their assigned scope, so that one park cannot edit another park's data.

Priority: P0  
Status: Implemented, Must Test

Acceptance criteria:

- Given I am assigned to Park A, then I cannot write Park B attendance.
- Given I am scoped to a city, then I cannot access another city's operational data unless my role allows it.

### US-SEC-004: Password and Secret Handling

As a project owner, I want passwords and secrets kept out of committed docs, so that operational security is not weakened.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given documentation is committed, then it does not include plaintext production passwords or service role keys.
- Given test passwords are needed, then they are shared operationally or reset through admin tooling.

## 19. Epic 16: Testing and UAT

### US-UAT-001: Role-Based Smoke Test

As a QA tester, I want a smoke test for every role, so that login and core routes are verified.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given each role has a test account, when I log in, then the role lands in the correct workspace.
- Given I open unauthorized routes, then the system redirects or denies access.

### US-UAT-002: Attendance UAT

As a QA tester, I want to test attendance online and offline, so that the core workflow is reliable.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given a park event exists, then attendance marking works online.
- Given the browser is offline, then marks queue locally.
- Given the browser reconnects, then queued marks sync.

### US-UAT-003: Refinement Acceptance Test

As a project owner, I want UAT to verify the simplified product shape, so that the refined system matches requirements.

Priority: P0  
Status: Proposed

Acceptance criteria:

- Given simplified navigation is implemented, then users can complete core workflows without using hidden/removed pages.
- Given a phase-2 module is hidden, then core workflows still pass.

## 20. Story Prioritization Summary

### P0 stories

- US-AUTH-001 Login With Issued Credentials
- US-AUTH-002 Role-Based Landing
- US-AUTH-005 Finalize Unlinked Account Policy
- US-PUB-003 Decide Admission Scope
- US-ADM-001 View Admin Dashboard
- US-ADM-004 Manage Parks, Batches, and Groups
- US-ADM-005 Simplify Admin Navigation
- US-PEOPLE-001 Create Shabab Record
- US-PEOPLE-004 Create Guardian and Link Child
- US-PEOPLE-005 Consolidate People Views
- US-ACCESS-001 Create Login for a Person
- US-ATT-001 Create Attendance Event
- US-ATT-002 View Today's Events
- US-ATT-003 Mark Attendance
- US-ATT-006 Decide Murabbi Attendance Rights
- US-FEE-004 Decide Fee Scope
- US-GUARD-004 Decide Guardian Portal Scope
- US-STU-003 Decide Student Portal Scope
- US-PROC-003 Decide Procurement Scope
- US-REP-004 Confirm Final Report Formats
- US-SIMP-001 Route Decision Inventory
- US-SIMP-002 Simplified Admin Navigation
- US-SIMP-003 Simplified Park Navigation
- US-SEC-001 Guardian Data Isolation
- US-SEC-003 Park Scope Enforcement
- US-SEC-004 Password and Secret Handling
- US-UAT-001 Role-Based Smoke Test
- US-UAT-002 Attendance UAT
- US-UAT-003 Refinement Acceptance Test

### Likely phase 2 candidates

- procurement
- content library
- report presets
- detailed attendance insights
- batch health and park health dashboards
- student portal if not required
- guardian portal if not required
- detailed admissions scoring

## 21. Recommended Next Action

Before coding, review these story groups and mark each one:

- Keep
- Change
- Merge
- Remove
- Phase 2

The fastest refinement path is:

1. approve or reject admissions, fees, procurement, content, guardian portal, and student portal
2. approve final admin and park navigation
3. confirm role permissions
4. confirm required reports
5. convert approved P0 stories into implementation tasks
