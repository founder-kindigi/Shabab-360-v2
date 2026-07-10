# Shabab360 Software Requirements Specification

Version: 0.1 draft  
Date: 2026-07-04  
Status: Refinement baseline  
Related document: `docs/project-working-refinement-guide.md`

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification describes the expected behavior, users, modules, data, constraints, and quality requirements for Shabab360.

The document is written as a refinement baseline. It reflects the current implemented project and identifies requirements that must be confirmed because the existing product is broader than the desired final system.

### 1.2 Scope

Shabab360 is a web-based program operations system for managing Shabab activities across cities, parks, batches, groups, attendance, admissions, fees, communications, reports, and family follow-up.

The current product includes:

- public homepage and admissions
- internal admin workspace
- park operations workspace
- guardian portal
- student portal
- role-based login and routing
- Supabase-backed data model
- offline attendance support
- Excel reports

The target refinement should decide which implemented modules remain in scope for the next usable version.

### 1.3 Intended audience

This document is for:

- project owner
- product decision makers
- developers
- UI/UX designers
- QA testers
- future maintainers

### 1.4 Definitions

| Term | Meaning |
|---|---|
| HQ | National program operations level |
| Program Admin | HQ business role, also described as Program Head or Markazi Masoul |
| City Head | City-level business owner, also described as City Masoul |
| Park | Local operating unit where groups and sessions happen |
| Batch | Time-bounded program cycle under a park |
| Group | Participant grouping under a batch |
| Shabab | Student or participant |
| Murabbi | Mentor assigned to a group or park |
| Guardian | Parent or guardian linked to one or more Shabab |
| Attendance Event | A scheduled session for attendance marking |
| RLS | Supabase Row Level Security |
| UAT | User Acceptance Testing |

### 1.5 Requirement status labels

| Status | Meaning |
|---|---|
| Implemented | Exists in the current codebase |
| Required | Should remain part of the refined product |
| To Confirm | Business decision needed |
| Candidate For Merge | Exists but overlaps other modules |
| Candidate For Removal | Exists but may be outside the desired scope |

## 2. Overall Description

### 2.1 Product perspective

Shabab360 is a role-based operations portal built on Next.js and Supabase. It is not a public social platform. It is an internal and family-facing program management system.

The system currently supports a broad operational suite. The refined version should become simpler, with fewer overlapping boards and clearer workflows.

### 2.2 Product functions

The system currently provides these top-level functions:

- authenticate users
- route users by role
- manage cities, parks, batches, and groups
- manage staff, Shabab, and guardians
- create and manage access accounts
- accept public admission applications
- review, interview, approve, and convert admissions
- create attendance events
- mark attendance online and offline
- monitor attendance alerts and insights
- configure batch rules
- track fees and payments
- publish announcements and resources
- manage procurement items and park requests
- show guardian and student portals
- export reports
- review audit logs

### 2.3 User classes

| User class | Description | Current access surface |
|---|---|---|
| Super Admin | Technical full-access recovery role | `/admin` |
| Program Admin | HQ program operator | `/admin` |
| City Head | City-scoped operator | `/admin` |
| Park Admin | Park operations user | `/park` |
| Park Lead | Park operations lead | `/park` |
| Murabbi | Mentor tied to park/group work | `/park` |
| Guardian | Parent/guardian linked to child records | `/guardian` |
| Student | Participant with personal portal | `/student` |
| Public Family | Unauthenticated admissions applicant | `/apply`, `/apply/status` |

### 2.4 Operating environment

| Area | Requirement |
|---|---|
| Browser | Must support current Chrome, Edge, Safari, and common mobile browsers |
| Device | Must support desktop and mobile layouts |
| Hosting | Current deployment target is Vercel |
| Database/Auth | Current backend is Supabase |
| Offline | Attendance marking should work offline where required |
| Timezone | Pakistan date behavior should use Asia/Karachi |

### 2.5 Design and implementation constraints

- The frontend uses Next.js App Router and TypeScript.
- Supabase Auth is the identity provider.
- Supabase Postgres is the system of record.
- Authorization must be enforced server-side and by RLS where applicable.
- Service role keys must not be exposed to client code.
- Internal users must not self-register into privileged roles.
- Attendance offline state is stored locally in IndexedDB.
- Reports are currently Excel based.

### 2.6 Assumptions

- The program structure remains city -> park -> batch -> group -> participant.
- Each participant belongs to one group at a time.
- Each guardian can be linked to one or more participants.
- Park attendance is a core workflow.
- Role-based access is required.
- Some current modules may be hidden or removed after requirements confirmation.

### 2.7 Dependencies

- Supabase project availability
- Vercel deployment environment
- Valid Supabase keys in environment variables
- Browser local storage and IndexedDB for offline attendance
- Email/password or magic-link access flows through Supabase Auth

## 3. System Features and Functional Requirements

### 3.1 Authentication and Role Routing

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-AUTH-001 | The system shall allow internal users to log in using email and password. | Must | Implemented |
| FR-AUTH-002 | The system shall prevent unknown public users from self-registering into internal roles. | Must | Implemented |
| FR-AUTH-003 | The system shall redirect users to the correct landing route after login. | Must | Implemented |
| FR-AUTH-004 | The system shall redirect users requiring password reset to `/reset-password`. | Must | Implemented |
| FR-AUTH-005 | The system shall redirect users without a usable linked role/profile to `/access-pending`. | Must | Implemented |
| FR-AUTH-006 | The system shall support admin-created access accounts for staff, students, and guardians. | Must | Implemented |
| FR-AUTH-007 | The system shall allow admins to update existing auth account passwords. | Should | Implemented |
| FR-AUTH-008 | The system shall require a confirmed access policy for unlinked accounts. | Must | To Confirm |

Acceptance criteria:

- Given an unauthenticated user, when they open a protected route, then the system redirects to `/login`.
- Given a Program Admin signs in, when their session is valid, then they land on `/admin`.
- Given a Park Admin signs in, when their session is valid, then they land on `/park`.
- Given a Guardian signs in, when linked to a guardian record, then they land on `/guardian`.
- Given a Student signs in, when linked to a participant record, then they land on `/student`.
- Given a user has no role or link, when they sign in, then they land on `/access-pending`.

### 3.2 Public Site and Admissions

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-PUB-001 | The system shall provide a public homepage. | Should | Implemented |
| FR-PUB-002 | The system shall provide a public admission application form. | Must If Admissions Remain | Implemented |
| FR-PUB-003 | The system shall generate a tracking code for submitted applications. | Must If Admissions Remain | Implemented |
| FR-PUB-004 | The system shall allow applicants to check status using tracking code and guardian phone. | Should | Implemented |
| FR-PUB-005 | The system shall hide internal review notes from public status results. | Must | Implemented |
| FR-PUB-006 | The system shall define whether public admissions are part of the refined MVP. | Must | To Confirm |

Acceptance criteria:

- Given a family submits a valid application, when the request succeeds, then the system returns a tracking code.
- Given a family has a tracking code and guardian phone, when they check status, then the system returns only public-safe status fields.
- Given invalid lookup data, when the family checks status, then the system returns no private application details.

### 3.3 Admin Dashboard and Navigation

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-ADM-001 | The system shall provide an admin dashboard for HQ and city operations. | Must | Implemented |
| FR-ADM-002 | The system shall show different admin navigation for HQ roles and city roles. | Must | Implemented |
| FR-ADM-003 | The system shall make current workspace context visible. | Should | Implemented |
| FR-ADM-004 | The system shall reduce duplicate admin top-level navigation entries. | Must | To Confirm |
| FR-ADM-005 | The system shall define a final admin navigation structure. | Must | To Confirm |

Acceptance criteria:

- Given a Program Admin opens `/admin`, then the interface shows HQ-oriented navigation.
- Given a City Head opens `/admin`, then the interface shows city operations navigation.
- Given the refined navigation is approved, then redundant top-level pages are hidden, merged, or renamed.

### 3.4 City, Park, Batch, and Group Setup

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-ORG-001 | The system shall allow authorized admins to manage cities. | Must | Implemented |
| FR-ORG-002 | The system shall allow authorized admins to manage parks under cities. | Must | Implemented |
| FR-ORG-003 | The system shall allow authorized admins to manage batches under parks. | Must | Implemented |
| FR-ORG-004 | The system shall allow authorized admins to manage groups under batches. | Must | Implemented |
| FR-ORG-005 | The system shall support city-scoped access for City Head users. | Must | Implemented |
| FR-ORG-006 | The system shall define whether HQ and City Head can both create parks and batches. | Must | To Confirm |

Acceptance criteria:

- Given an authorized admin creates a park, when city scope is valid, then the park is saved under that city.
- Given a City Head views organization setup, then only visible city-scoped data is shown.
- Given a park has batches and groups, then participant assignment can use those groups.

### 3.5 People, Students, Murabbis, and Guardians

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-PEOPLE-001 | The system shall store staff and participant records in `people`. | Must | Implemented |
| FR-PEOPLE-002 | The system shall store staff role metadata in `staff_meta`. | Must | Implemented |
| FR-PEOPLE-003 | The system shall allow authorized admins to create and edit Shabab records. | Must | Implemented |
| FR-PEOPLE-004 | The system shall allow authorized admins to create and edit Murabbi records. | Must | Implemented |
| FR-PEOPLE-005 | The system shall allow authorized admins to create guardians and link children. | Must | Implemented |
| FR-PEOPLE-006 | The system shall allow one guardian to be linked to multiple children. | Should | Implemented |
| FR-PEOPLE-007 | The system shall decide whether Students, People, and Student Progress remain separate modules. | Must | To Confirm |

Acceptance criteria:

- Given a Shabab is created, then the record must be assigned to exactly one group.
- Given a Murabbi is created, then the record must have valid role metadata.
- Given a guardian is linked to a child, then the guardian portal can display that child and no unrelated children.

### 3.6 Access Provisioning

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-ACCESS-001 | The system shall allow admins to create one linked login account. | Must | Implemented |
| FR-ACCESS-002 | The system shall allow admins to update an existing linked login account. | Must | Implemented |
| FR-ACCESS-003 | The system shall allow bulk account import from Excel. | Should | Implemented |
| FR-ACCESS-004 | The system shall show linked access status for selected people or guardians. | Must | Implemented |
| FR-ACCESS-005 | The system shall support first-login password reset state. | Should | Implemented |
| FR-ACCESS-006 | The system shall define whether bulk import remains in the refined product. | Should | To Confirm |
| FR-ACCESS-007 | The system shall log or expose enough information for admins to see who still needs login access. | Should | Implemented |

Acceptance criteria:

- Given an admin selects a student target, when saving a login account, then the auth user is linked to that participant record.
- Given an admin selects a guardian target, when saving a login account, then the auth user is linked to that guardian record.
- Given an account already exists, when admin saves a new password, then the auth account is updated.

### 3.7 Attendance Events and Marking

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-ATT-001 | The system shall allow authorized users to create attendance events. | Must | Implemented |
| FR-ATT-002 | The system shall display today's attendance events to park users. | Must | Implemented |
| FR-ATT-003 | The system shall display a roster for each attendance event. | Must | Implemented |
| FR-ATT-004 | The system shall allow authorized park users to mark attendance. | Must | Implemented |
| FR-ATT-005 | The system shall enforce closed-event edit rules. | Must | Implemented |
| FR-ATT-006 | The system shall support participant warning/dropout state logic. | Should | Implemented |
| FR-ATT-007 | The system shall define final attendance statuses. | Must | To Confirm |
| FR-ATT-008 | The system shall define whether Murabbis can mark attendance. | Must | To Confirm |
| FR-ATT-009 | The system shall define whether attendance is once per day or multi-session. | Must | To Confirm |

Acceptance criteria:

- Given an open attendance event, when an authorized park user marks a participant, then the attendance record is saved.
- Given a closed attendance event, when a Park Admin tries an unauthorized edit, then the write is rejected.
- Given a participant accumulates absence patterns, when state recomputation runs, then participant state follows configured batch rules.

### 3.8 Offline Attendance

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-OFF-001 | The system shall queue attendance marks locally when offline. | Must If Offline Required | Implemented |
| FR-OFF-002 | The system shall keep one latest queued mutation per event and participant. | Must If Offline Required | Implemented |
| FR-OFF-003 | The system shall sync queued attendance marks when online. | Must If Offline Required | Implemented |
| FR-OFF-004 | The system shall keep failed sync items for retry. | Must If Offline Required | Implemented |
| FR-OFF-005 | The system shall show queue health to park users. | Should | Implemented |
| FR-OFF-006 | The system shall define whether offline attendance is mandatory in the refined MVP. | Must | To Confirm |

Acceptance criteria:

- Given the browser is offline, when the user marks attendance, then the mark is stored locally.
- Given the browser reconnects, when sync runs, then processed mutations are removed from queue.
- Given a sync item fails, then the item remains visible or retryable.

### 3.9 Attendance Monitoring and Follow-up

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-ATTMON-001 | The system shall provide attendance alerts for warning/dropout follow-up. | Should | Implemented |
| FR-ATTMON-002 | The system shall provide attendance insights and trend summaries. | Could | Implemented |
| FR-ATTMON-003 | The system shall provide attendance coverage command views. | Could | Implemented |
| FR-ATTMON-004 | The system shall define which attendance monitoring pages remain top-level. | Must | To Confirm |
| FR-ATTMON-005 | The system shall merge duplicate attendance monitoring pages where possible. | Should | To Confirm |

Acceptance criteria:

- Given participants have warning/dropout states, then authorized users can find them for follow-up.
- Given a selected date, then attendance coverage can show missing or open events if this module remains.
- Given attendance insights are removed from top-level nav, then required reporting must still be available elsewhere.

### 3.10 Fees and Payments

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-FEE-001 | The system shall support admission fee configuration. | Should | Implemented |
| FR-FEE-002 | The system shall support fee event creation. | Should | Implemented |
| FR-FEE-003 | The system shall record payments. | Should | Implemented |
| FR-FEE-004 | The system shall generate receipt numbers. | Should | Implemented |
| FR-FEE-005 | The system shall show outstanding dues to authorized users. | Should | Implemented |
| FR-FEE-006 | The system shall define whether fees are required in the refined MVP. | Must | To Confirm |
| FR-FEE-007 | The system shall define whether guardians/students should see fee information. | Must | To Confirm |

Acceptance criteria:

- Given a payment is recorded, then a unique receipt number is generated.
- Given a participant has outstanding dues, then authorized admin or park users can identify the due amount.
- Given fees are removed from MVP scope, then fee-related navigation is hidden without breaking other workflows.

### 3.11 Family Follow-up

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-FAMILY-001 | The system shall support guardian contact and child linkage. | Must | Implemented |
| FR-FAMILY-002 | The system shall provide family follow-up queues for attendance, fees, access, and admissions. | Should | Implemented |
| FR-FAMILY-003 | The system shall allow WhatsApp handoff through generated links where available. | Should | Implemented |
| FR-FAMILY-004 | The system shall define one primary family follow-up workflow. | Must | To Confirm |
| FR-FAMILY-005 | The system shall merge duplicate family follow-up boards where possible. | Should | To Confirm |

Acceptance criteria:

- Given a participant has linked guardians, then authorized users can see guardian contact information.
- Given a family follow-up item exists, then the user can see the next action.
- Given the refined workflow is approved, then duplicate family pages are consolidated.

### 3.12 Guardian Portal

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-GUARD-001 | The system shall show guardians only their linked children. | Must | Implemented |
| FR-GUARD-002 | The system shall show child attendance history. | Should | Implemented |
| FR-GUARD-003 | The system shall show fee status if fees remain in scope. | Should | Implemented |
| FR-GUARD-004 | The system shall show schedule, announcements, and resources. | Could | Implemented |
| FR-GUARD-005 | The system shall define whether guardians need login access in the refined MVP. | Must | To Confirm |

Acceptance criteria:

- Given a guardian is linked to Child A only, when they open the portal, then they cannot view Child B.
- Given guardian access is disabled in the refined scope, then no guardian-only workflow should be required for core operations.

### 3.13 Student Portal

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-STU-001 | The system shall show students only their own data. | Must If Student Portal Remains | Implemented |
| FR-STU-002 | The system shall show own attendance history. | Should | Implemented |
| FR-STU-003 | The system shall show fee status if fees remain in scope. | Should | Implemented |
| FR-STU-004 | The system shall show schedule, announcements, and resources. | Could | Implemented |
| FR-STU-005 | The system shall define whether students need login access in the refined MVP. | Must | To Confirm |

Acceptance criteria:

- Given a student logs in, then they see only their own participant record.
- Given student portal is removed from MVP scope, then internal workflows still support attendance and reports.

### 3.14 Announcements and Content

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-COMM-001 | The system shall allow authorized admins to publish announcements. | Should | Implemented |
| FR-COMM-002 | The system shall target announcements by audience and scope. | Should | Implemented |
| FR-COMM-003 | The system shall provide read-only announcement centers. | Could | Implemented |
| FR-COMM-004 | The system shall provide a content/resource library. | Could | Implemented |
| FR-COMM-005 | The system shall define whether content library remains in scope. | Must | To Confirm |

Acceptance criteria:

- Given an announcement targets guardians, then guardian users can see it if in scope.
- Given content is unpublished, then it should not be visible in consumption portals.
- Given communications are simplified, then essential announcements remain available to required users.

### 3.15 Procurement

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-PROC-001 | The system shall manage inventory items. | Could | Implemented |
| FR-PROC-002 | The system shall manage park allocations. | Could | Implemented |
| FR-PROC-003 | The system shall allow park supply requests. | Could | Implemented |
| FR-PROC-004 | The system shall allow request review and fulfillment. | Could | Implemented |
| FR-PROC-005 | The system shall define whether procurement remains in the refined MVP. | Must | To Confirm |

Acceptance criteria:

- Given procurement remains in scope, then park users can request supplies and admin users can review requests.
- Given procurement is out of scope, then procurement routes should be hidden or removed from navigation.

### 3.16 Reports and Exports

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-REP-001 | The system shall provide admin reports. | Must | Implemented |
| FR-REP-002 | The system shall export group attendance to Excel. | Must If Report Required | Implemented |
| FR-REP-003 | The system shall export team attendance to Excel. | Should | Implemented |
| FR-REP-004 | The system shall export summary dashboard data to Excel. | Should | Implemented |
| FR-REP-005 | The system shall support saved report presets. | Could | Implemented |
| FR-REP-006 | The system shall define final required report formats. | Must | To Confirm |

Acceptance criteria:

- Given an admin selects report filters, when they export, then the Excel file reflects those filters.
- Given a City Head exports reports, then data is city-scoped.
- Given final report formats are approved, then exports match expected headers and grouping.

### 3.17 Audit Log

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-AUD-001 | The system shall record auditable changes for important operational tables. | Must | Implemented |
| FR-AUD-002 | The system shall allow privileged users to review audit log entries. | Should | Implemented |
| FR-AUD-003 | The system shall define which actions require audit coverage. | Must | To Confirm |

Acceptance criteria:

- Given an attendance record changes, then audit metadata is stored where configured.
- Given an unauthorized user tries to read audit log, then access is denied.

### 3.18 Test Center and UAT

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-UAT-001 | The system shall provide a manual test center for internal QA. | Could | Implemented |
| FR-UAT-002 | The system shall define whether the test center appears in production navigation. | Must | To Confirm |
| FR-UAT-003 | The project shall maintain role-based UAT scripts. | Must | Proposed |

Acceptance criteria:

- Given test center remains, then it is visible only to internal admin roles.
- Given production simplification is approved, then test center may be hidden from normal navigation.

## 4. External Interface Requirements

### 4.1 User interface requirements

| ID | Requirement |
|---|---|
| UI-001 | The UI shall be role-aware and show only relevant navigation. |
| UI-002 | The UI shall be usable on desktop and mobile. |
| UI-003 | The UI shall clearly indicate current workspace and viewer context. |
| UI-004 | Forms shall validate required fields before submission. |
| UI-005 | Operational pages shall make filters and current scope visible. |
| UI-006 | The refined UI shall reduce overlapping top-level navigation entries. |

### 4.2 API requirements

| ID | Requirement |
|---|---|
| API-001 | Write operations shall use authenticated server/API routes. |
| API-002 | API errors shall return structured error messages. |
| API-003 | API responses shall include request IDs where implemented. |
| API-004 | High-write routes shall enforce rate limits where implemented. |
| API-005 | Attendance sync API shall return per-mutation success/failure. |

### 4.3 Database requirements

| ID | Requirement |
|---|---|
| DB-001 | The database shall enforce row-level security on scoped operational tables. |
| DB-002 | The database shall preserve relational integrity between cities, parks, batches, groups, participants, and guardians. |
| DB-003 | Attendance and payment rules shall use database constraints/triggers where appropriate. |
| DB-004 | The database shall store timestamps in UTC. |

### 4.4 Authentication requirements

| ID | Requirement |
|---|---|
| SEC-001 | Supabase Auth shall identify users. |
| SEC-002 | Unknown users shall not gain internal access by signing up. |
| SEC-003 | Role and profile links shall determine landing route and permissions. |
| SEC-004 | Passwords shall not be stored in documentation or application tables as plaintext. |

### 4.5 Export requirements

| ID | Requirement |
|---|---|
| EXP-001 | Reports shall export as Excel files. |
| EXP-002 | Exported reports shall apply selected filters. |
| EXP-003 | Final report layouts shall be confirmed by project owner. |

## 5. Data Requirements

### 5.1 Core entities

| Entity | Key properties |
|---|---|
| City | id, name, code |
| Park | id, city, name, code |
| Batch | id, park, name, start date, end date |
| Group | id, batch, name, participant type |
| Person | id, name, phone, type, group, park, auth user |
| Staff Meta | staff id, role, assigned park, assigned group, city scope |
| Guardian | id, name, phone, auth user |
| Guardian Child | guardian id, participant id |
| Attendance Event | park, batch, group, date, type, title, closed state |
| Attendance Record | event, participant, status, marked at, source |
| Payment | participant, park, batch, fee event, type, amount, receipt |
| Admission Application | tracking code, applicant, guardian, city, status |
| Content Item | category, title, type, URL, audience, published state |
| Procurement Request | item, park, quantity, urgency, status |

### 5.2 Data visibility

| User type | Data visibility |
|---|---|
| Super Admin | Broad system data |
| Program Admin | National/HQ operational data |
| City Head | City-scoped operational data |
| Park Admin | Park-scoped operational data |
| Park Lead | Park-scoped operational data with attendance privileges |
| Murabbi | Park/group-scoped operational data |
| Guardian | Linked children only |
| Student | Own participant record only |

### 5.3 Data quality requirements

- Participant records must have a valid group.
- Murabbi assignment must be consistent with group/park scope.
- Guardian-child links must refer to existing records.
- Attendance records must refer to valid events and participants.
- Payment records must have valid amount and receipt metadata.
- Public admission status must not expose internal notes.

## 6. Non-Functional Requirements

### 6.1 Security

| ID | Requirement |
|---|---|
| NFR-SEC-001 | The system shall deny unauthorized access by default. |
| NFR-SEC-002 | Authorization shall be enforced server-side. |
| NFR-SEC-003 | Client-side navigation hiding shall not be treated as security. |
| NFR-SEC-004 | Service role keys shall never be used in client code. |
| NFR-SEC-005 | Guardian and student data isolation shall be tested. |
| NFR-SEC-006 | Access changes shall be auditable where required. |

### 6.2 Usability

| ID | Requirement |
|---|---|
| NFR-USE-001 | Daily workflows shall be understandable without developer explanation. |
| NFR-USE-002 | Park attendance marking shall be fast on mobile. |
| NFR-USE-003 | Top-level navigation shall avoid duplicate operational concepts. |
| NFR-USE-004 | Search/filter heavy pages shall preserve clear scope and reset controls. |
| NFR-USE-005 | The refined product shall use business language understood by staff. |

### 6.3 Reliability

| ID | Requirement |
|---|---|
| NFR-REL-001 | Attendance queue shall preserve unsynced marks until success or manual resolution. |
| NFR-REL-002 | Failed sync items shall not be silently dropped. |
| NFR-REL-003 | Database rules shall protect critical attendance/payment integrity. |
| NFR-REL-004 | Public admissions shall not lose submitted data on valid submission. |

### 6.4 Performance

| ID | Requirement |
|---|---|
| NFR-PERF-001 | Dashboard pages should load within acceptable operational time for normal data sizes. |
| NFR-PERF-002 | Attendance roster interactions should feel immediate on mobile. |
| NFR-PERF-003 | Reports should generate within a practical wait time for filtered ranges. |
| NFR-PERF-004 | Data loaders should batch access-status lookups where possible. |

### 6.5 Maintainability

| ID | Requirement |
|---|---|
| NFR-MAINT-001 | Feature data loading should remain grouped under `src/features`. |
| NFR-MAINT-002 | Shared UI boards should avoid duplicating business rules. |
| NFR-MAINT-003 | Schema migrations should remain versioned under `supabase/migrations`. |
| NFR-MAINT-004 | Requirements docs should evolve with product decisions. |

### 6.6 Compatibility

| ID | Requirement |
|---|---|
| NFR-COMP-001 | The app shall support current desktop browsers. |
| NFR-COMP-002 | The app shall support common mobile browsers. |
| NFR-COMP-003 | PWA/offline attendance behavior shall not depend on unsupported browser features without fallback. |

## 7. Access Control Requirements

### 7.1 Role permission matrix

| Capability | Super Admin | Program Admin | City Head | Park Admin | Park Lead | Murabbi | Guardian | Student |
|---|---|---|---|---|---|---|---|---|
| Access `/admin` | Yes | Yes | Yes | No | No | No | No | No |
| Access `/park` | Yes | Yes | Yes | Yes | Yes | Yes | No | No |
| Access guardian portal | No | No | No | No | No | No | Yes | No |
| Access student portal | No | No | No | No | No | No | No | Yes |
| Manage cities | Yes | Yes | Limited or No | No | No | No | No | No |
| Manage parks/batches/groups | Yes | Yes | City scoped | No | No | No | No | No |
| Manage people | Yes | Yes | City scoped | Limited | Limited | Limited | No | No |
| Manage access accounts | Yes | Yes | Scoped | No | No | No | No | No |
| Create attendance events | Yes | Yes | City scoped | Park scoped | Park scoped | To Confirm | No | No |
| Mark attendance | Yes | Yes | City scoped | Park scoped | Park scoped | To Confirm | No | No |
| View own linked child data | No | No | No | No | No | No | Yes | No |
| View own student data | No | No | No | No | No | No | No | Yes |
| Export reports | Yes | Yes | City scoped | To Confirm | To Confirm | No | No | No |

This matrix needs final approval before refactoring navigation and guards.

### 7.2 Access rules

- The system shall deny by default.
- The system shall enforce role checks in server-side route guards.
- The system shall use RLS for scoped database access where applicable.
- The system shall separate UI visibility from true authorization.
- The system shall prevent guardians from reading unrelated child data.
- The system shall prevent students from reading other student data.
- The system shall prevent park users from writing outside their allowed scope.

## 8. Workflow Requirements

### 8.1 Core workflow candidates

The refined product should define the final core workflows.

Recommended workflow candidates:

1. Admin setup workflow
   - city -> park -> batch -> group -> staff/student/guardian -> access
2. Admissions workflow
   - apply -> review -> interview -> approve -> convert -> onboard
3. Attendance workflow
   - create event -> mark attendance -> sync offline queue -> monitor alerts -> report
4. Family follow-up workflow
   - detect issue -> contact guardian -> update status -> review progress
5. Fee workflow
   - configure fee -> record payment -> monitor outstanding dues -> export report
6. Reporting workflow
   - select filters -> preview scope -> export Excel

### 8.2 Required refinement decision

The project owner must confirm which workflow is primary:

- attendance-first
- admissions-first
- full operations
- family engagement
- reporting/compliance

This decision controls which modules should remain top-level.

## 9. Out of Scope Unless Confirmed

These exist or are implied but should not be treated as required unless explicitly approved:

- procurement
- content library
- detailed admissions scoring
- student portal
- guardian portal
- multiple operational health dashboards
- advanced fee accounting
- WhatsApp/SMS gateway integration
- biometric attendance
- AI predictions
- custom report designer
- real-time push notifications
- multi-country timezone support

## 10. Open Questions

| ID | Question |
|---|---|
| OQ-001 | What is the single most important workflow for the next usable release? |
| OQ-002 | Should admissions remain in scope? |
| OQ-003 | Should fees remain in scope? |
| OQ-004 | Should procurement remain in scope? |
| OQ-005 | Should content/resources remain in scope? |
| OQ-006 | Should guardians log in? |
| OQ-007 | Should students log in? |
| OQ-008 | What are the exact final role permissions? |
| OQ-009 | What are the exact final reports and Excel formats? |
| OQ-010 | Which routes should be hidden immediately from navigation? |

## 11. Acceptance and UAT Summary

The refined product should not be accepted until these checks pass:

- role login and redirects work
- each role sees only permitted navigation
- each role can complete its primary workflow
- unauthorized routes redirect or deny correctly
- guardian and student isolation is verified
- park attendance works on mobile
- offline queue stores and syncs attendance correctly
- required reports export correctly
- final navigation matches approved workflow map
- phase-2 modules are hidden or clearly marked

## 12. Traceability

| Requirement area | Related current modules |
|---|---|
| Authentication | `src/lib/auth`, `/login`, `/reset-password`, `/admin/users` |
| Organization setup | `/admin/cities`, `/admin/parks`, `/admin/settings` |
| People and access | `/admin/people`, `/admin/students`, `/admin/guardians`, `/admin/users` |
| Admissions | `/apply`, `/apply/status`, `/admin/admissions`, `/admin/onboarding-center` |
| Attendance | `/park/attendance`, `/admin/attendance-events`, attendance API routes |
| Offline sync | `src/lib/offline`, `/api/park/attendance/sync` |
| Fees | `/admin/fees`, `/admin/fee-alerts`, `/park/fee-alerts` |
| Reports | `/admin/reports`, `src/features/reports` |
| Family portals | `/guardian`, `/student` |
| Security | Supabase RLS migrations, auth guards |

## 13. Change Control

Any refinement should update:

1. this SRS
2. user stories document
3. route simplification map
4. role permission matrix
5. UAT checklist
6. implementation plan

No major module should be added until the open questions in this document are answered.
