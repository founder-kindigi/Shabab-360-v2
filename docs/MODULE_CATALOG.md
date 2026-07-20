# Shabab 360 Module Catalogue

**Status:** Draft target module map - product-owner approval required

**Last updated:** 2026-07-15

**Authority:** This catalogue is derived from the
[Codex Master Blueprint](CODEX_SHABAB360_MASTER_BLUEPRINT.md) and should be read
with the [Role-Based Access Matrix](ROLE_BASED_ACCESS_MATRIX.md). It describes
target capabilities and current foundations; it does not claim that every
module is implemented or approved for immediate development.

## Status Meaning

| Status | Meaning |
| --- | --- |
| Strong foundation | Important current functionality exists, but final UAT may remain |
| Partial | Some related screens/data exist, but the target workflow is incomplete |
| Basic foundation | A limited current version exists and needs product correction or expansion |
| Missing | No complete module exists in the current checkout |
| Deferred | Intentionally blocked until policy, safety, or earlier phases are complete |

## Core Platform Modules

| # | Module | Purpose and main capabilities | Main users | Current status |
| --- | --- | --- | --- | --- |
| 1 | Public Website | Explains the programme, eligibility, values, cities, activities, FAQs and contact information. Provides admission entry/status and portal login based on final decisions. | Public visitors, applicants | Basic foundation; programme content needs approval |
| 2 | Authentication | Email/password login, first-login password reset, session management, role-aware landing, account deactivation and session invalidation. No internal self-registration. | All authorised users | Strong foundation; browser UAT remains |
| 3 | Access Provisioning | Creates and updates linked staff, Guardian and Shabab accounts. Supports access-status checks, secure invitations and controlled bulk import. | Program Head, City Head | Partial; invitation security and authority need completion |
| 4 | Organisation Setup | Manages cities, parks, venues, batches and groups. Supports active/inactive states, capacity and organisational history. | Program Head, City Head | Core structure exists; venue and history models need expansion |
| 5 | Teams, Roles and Assignments | Maps members to canonical roles, parks, groups, and collaboration teams: Sports, Skills, Tadreeb, Media, and Muawin. Each team has documents, activity planning, and discussions; membership never replaces login role or hierarchy scope. Supports multiple assignments and assignment history. | Program Head, City Head, Park Lead | Current single-assignment model is insufficient |
| 6 | Members and Profiles | Central directory for staff, Murabbis, Shabab and Guardians. Profiles show approved roles, groups, teams and titles with privacy controls. | Scoped staff, Guardian, Shabab | Information exists across separate screens; needs consolidation |

## Programme Operations Modules

| # | Module | Purpose and main capabilities | Main users | Current status |
| --- | --- | --- | --- | --- |
| 7 | Admissions and Onboarding | Admission form, screening, candidate and Guardian interviews, scoring, remarks, decisions, fee status, park allocation, group suggestion and enrolment. | Program Head, City Head, assessors | Partial with confirmed data-loss defect |
| 8 | Safeguarding and Consent | Guardian verification, emergency contacts, medical/allergy information, pickup permissions, activity/travel/media consent, risk assessments, incidents and staff clearances. | Restricted authorised staff, Guardians | Missing; policy and access rules must be approved first |
| 9 | Grouping and Placement | Automatically suggests groups using approved age/class rules, checks capacity and Murabbi coverage, and supports authorised manual overrides or transfers. | City Head, Park Lead | Manual group assignment exists; automation/history missing |
| 10 | Attendance | Handles Shabab class attendance, activity attendance, team attendance and Mashwara/training attendance. Includes corrections, closures, absence alerts and reporting. | Park Lead, Park Admin, Murabbi TBD | Strong Shabab attendance foundation; other attendance contexts missing |
| 11 | Offline Attendance Sync | Stores attendance locally when internet is unavailable, syncs later, preserves failed items and displays queue health/conflicts. | Park Lead, Park Admin, Murabbi TBD | Foundation exists; full mobile/browser UAT required |
| 12 | Content Planner | Manages the four official content categories, lesson/session plans, objectives, materials, versions, publishing and delivery confirmation. | Program Head, City Head, Park Lead, Murabbi | Missing; content currently managed in Google Sheets |
| 13 | Murabbi Training | Separate training curriculum, resources, schedule, completion and approved clearance/training records for Murabbis. | Programme leadership, City Head, Murabbis | Missing |
| 14 | Calendar and Batch Planner | Forward-looking programme calendar with recurring sessions, admissions timelines, park hunting, meetings, batch milestones and meeting links. | All roles according to scope | Current schedule is mostly derived from attendance history |
| 15 | Events and Activities | Manages swimming, trips, camps, sports, inaugurations and ceremonies, including capacity, consent, risk, staff, transport, equipment, cost and attendance. | Program Head, City Head, Park Lead, Park Admin, Murabbi | Missing as a complete module |
| 16 | Responsibility Planner | Breaks campaigns and events into tasks with owners, assistants, deadlines, dependencies, status, evidence and post-event review. | Programme, city and park teams | Missing |
| 17 | Venue Management | Maintains primary and backup venues, capacity, availability, facilities, permissions, hazards, emergency guidance and responsible contacts. | Program Head, City Head, Park Lead | Current Park model only has basic information |

## Finance and Logistics Modules

| # | Module | Purpose and main capabilities | Main users | Current status |
| --- | --- | --- | --- | --- |
| 18 | Finance | Handles approved registration fees, event charges, donations, expenses, discounts, waivers, refunds, receipts and financial reporting using exact PKR values. | Program Head, City Head, authorised collectors | Fee/payment engine exists; complete finance policy is pending |
| 19 | Procurement | Manages purchase requests, approvals, purchase orders, receiving and supplier/purchase evidence. | Program Head, City Head, Park Lead/POC | Missing |
| 20 | Inventory | Maintains item catalogue, total stock, park allocation, transfers, returns, loss/damage, adjustments, counts and POC/assistant responsibility. | Program Head, City Head, Park Lead, Park Admin | Missing |

## Communication and Engagement Modules

| # | Module | Purpose and main capabilities | Main users | Current status |
| --- | --- | --- | --- | --- |
| 21 | Announcements | Publishes national, city, park or group announcements to approved audiences with priority and expiry. | Authorised leadership and staff | Basic foundation exists |
| 22 | Notifications | Sends in-app and later approved email/WhatsApp/SMS notifications with templates, consent, delivery attempts, failures and escalation. | All users | In-app polling/outbox foundation; external delivery incomplete |
| 23 | Messaging | Internal mini messenger with approved participant combinations, group conversations, read state, attachments, reporting and retention. | Approved staff, Guardians and Shabab | Missing; communication safety policy required |
| 24 | Community | LetsVibeIt-inspired community containing only approved features such as posts, groups, teams, media, comments or reactions. Requires moderation and reporting. | Shabab community and approved staff | Deferred until safeguarding rules are approved |
| 25 | Online Resources | Provides courses, books and articles with categories, search, audience controls, publication state and optional completion tracking. | Public, Murabbis, Guardians, Shabab | Missing as a complete module |

## Role Portal Modules

| # | Module | Purpose and main capabilities | Main users | Current status |
| --- | --- | --- | --- | --- |
| 26 | Program Head Portal | National metrics, city governance, national planner, exceptions, reports, announcements and access administration. | Program Head | Dashboard foundation exists; programme modules need expansion |
| 27 | City Operations Portal | City parks, batches, groups, members, admissions, attendance, events, finance, procurement and reports. | City Head | Core administration exists; target workflows incomplete |
| 28 | Park Operations Portal | Daily sessions, attendance, queue health, Shabab, families, team operations, events, content delivery and inventory requests. | Park Lead, Park Admin | Attendance-focused foundation exists |
| 29 | Murabbi Portal | Assigned groups, rosters, content plans, training, participant follow-up, schedule and approved attendance actions. | Murabbi | Basic dashboard/groups exist; target workspace incomplete |
| 30 | Guardian Portal | Linked children, attendance, schedule, notices, consent, event approvals, absence reporting and approved financial information. | Guardian | Read-only tracking foundation exists |
| 31 | Shabab Portal | Own schedule, attendance, group, teams, profile, resources, programme progress and approved community features. | Shabab | Basic tracking foundation exists |

## Reporting and Governance Modules

| # | Module | Purpose and main capabilities | Main users | Current status |
| --- | --- | --- | --- | --- |
| 32 | Dashboards and Exception Boards | Shows role-specific KPIs and actionable issues such as missing groups, absent Murabbis, pending interviews, missing consent or failed sync. | Leadership and operational staff | Basic dashboards exist; programme KPIs need expansion |
| 33 | Reports and Exports | Admissions, attendance, group capacity, content delivery, events, finance, inventory, access and notification reports with scoped Excel exports. | Program Head, City Head and approved scoped roles | Attendance/fee reporting foundation exists |
| 34 | Audit Log | Records important access, attendance, admission, financial and inventory changes without storing credentials or unnecessary personal data. | Super Admin, Program Head | Redacted audit foundation exists |
| 35 | System Settings | Manages approved configuration such as grouping rules, attendance thresholds, statuses, templates, categories and controlled feature settings. | Super Admin, Program Head, authorised City Head | Basic settings exist; final configuration model pending |

## Navigation Rule

These 35 entries are capability modules, not a requirement to create 35
top-level navigation items. Related capabilities should be combined into clear
role-specific workspaces.

Recommended examples:

- Admissions, interviews, placement and onboarding form one admissions
  workspace.
- Attendance, offline sync and attendance exceptions form one attendance
  workspace.
- Calendar, batch planner, events, venues and responsibilities form one
  planning workspace with clear subviews.
- Procurement and inventory form one logistics workspace.
- Announcements, notifications and messaging share communication foundations
  but retain separate permissions.
- Members, roles, teams, groups and profiles should use one consistent people
  model rather than competing directories.

## Implementation Order

The module catalogue does not override the phased roadmap in the Codex master.
The required sequence remains:

1. Finalise product decisions.
2. Fix and verify the existing application.
3. Complete PostgreSQL Staging and platform readiness.
4. Implement the core programme and safeguarding model.
5. Implement programme-delivery modules.
6. Implement finance and procurement.
7. Add engagement modules after safety approval.
8. Run restricted-pilot release gates.
