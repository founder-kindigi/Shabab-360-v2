# Shabab 360: Project Scope and Product Overview

**Audience:** Project stakeholders, programme leaders, implementation partners, and new team members  
**Status:** Working scope baseline; product-owner approval is still required for the open decisions listed below.  
**Last updated:** 2026-08-24  
**Planning authority:** [Codex Master Blueprint](CODEX_SHABAB360_MASTER_BLUEPRINT.md)

## 1. What we are building

Shabab 360 is the operational platform for the **Shabab Alburhan youth-development programme**. It is not a generic administration dashboard. It brings programme delivery, people, attendance, communication, governance, and later finance and logistics into one controlled, role-based system.

The platform will provide:

- A public website for learning about the programme and applying, where approved.
- Secure portals for national, city, park, mentor, guardian, and Shabab users.
- An end-to-end path from admission to enrolment, group placement, programme delivery, attendance, follow-up, and reporting.
- Mobile-first attendance that can continue when park connectivity is unreliable.
- Controlled communication, consent, safety, finance, inventory, resources, and audit processes as their policy rules are approved.

The working programme understanding is a long-form, in-person youth programme that develops character, responsibility, leadership, spiritual growth, teamwork, and practical skills. Public materials have described school-aged boys, weekend delivery, limited places, selection/interviews, and activities such as classes, sports, outdoor activities, camping, hiking, swimming, archery, and leadership exercises. The final official curriculum, age bands, duration, active locations, costs, and public wording remain owner decisions.

## 2. The intended outcome

When complete, Shabab 360 will let authorised teams run the programme reliably at national, city, park, group, and participant level. It will make the next operational action clear, keep each user within their authorised data scope, and retain evidence for important changes.

`Public information/application → screening and interview → approval → enrolment and group placement → programme sessions and attendance → family follow-up and reporting → programme improvement`

Planning, content, events, staff collaboration, notifications, finance, procurement, and governance support this journey. They must not become separate, competing spreadsheets or dashboards.

## 3. Design and operating principles

1. **Programme-first:** language, screens, and workflows must match real Shabab Alburhan operations.
2. **One platform, different doors:** everyone uses the same trusted system but sees only their relevant workspace and data.
3. **Deny by default:** hiding a page is never security; every protected server action verifies role, active status, assignment scope, action, and resource context.
4. **Youth safety first:** guardian consent, emergency information, medical considerations, safe communications, private files, safeguarding, and incident handling are core requirements.
5. **Mobile and offline operations:** attendance must be fast, practical, and resilient to unreliable connectivity.
6. **Actionable information:** dashboards should surface exceptions and next actions, not merely decorative counts.
7. **One source of truth:** there must be one authoritative workflow for a participant, guardian, attendance issue, payment, or assignment.
8. **Minimum necessary data:** collect, show, retain, and export only what programme delivery and safety require.
9. **Audit important changes:** sensitive and operationally significant actions must be traceable without retaining credentials or unnecessary personal data.
10. **Evidence-based delivery:** a screen is not done until its workflow, permissions, data integrity, tests, required mobile behaviour, and release impact have been verified.

## 4. Organisation and data scope

The core structure is:

`National Programme → City → {Parks, Batches} → Group → Shabab`

| Level | Meaning and rules |
| --- | --- |
| National programme | National governance, programme standards, cross-city oversight, and consolidated reporting. |
| City | Contains city-wide batches and its parks. City access never grants access to another city. |
| Park | Delivery location and operational scope for daily programme work. |
| Batch | A city-owned programme cohort that can run across parks in the same city. |
| Group | Links exactly one batch to one park in the same city. |
| Shabab | A participant has one primary active group at a time; assignment history is retained. |
| Guardian | May be linked to one or more Shabab; a Shabab may have more than one approved guardian/contact. |

Two separate collaboration dimensions are also needed:

- **Collaboration teams:** Sports, Skills, Tadreeb, Media, and Muawin. They support documents, planning, and discussions. Team membership is not a login role and never expands city, park, or group scope.
- **Time-bounded event responsibilities:** Calling POC, Security, Parking, Welcome, registration, or transport, for example. These assignments have scope, dates, accountable people, and audit history; they are not permanent roles or general portal access.

## 5. Users and roles

| Role | Main responsibility | Normal scope |
| --- | --- | --- |
| Super Admin | Technical recovery, security, audited access configuration, and controlled system administration; not normal programme operations. | Global technical scope |
| Program Head / Markazi Masoul | National standards, city oversight, programme planning, national reporting, and approved administration. | All cities |
| City Head / City Masoul | City operations, parks, batches, groups, city team, admissions, exceptions, and city reporting. | Assigned city/cities |
| Park Lead | Park leadership, team oversight, attendance correction, approvals, and park exceptions. | Assigned park(s) |
| Park Admin | Daily administration, attendance marking, records, walk-in enquiries, and operational support. | Assigned park |
| Murabbi | Mentoring, group delivery, content use, participant follow-up, and approved attendance actions. | Assigned group(s), team(s), and/or park |
| Guardian / Parent | Linked-child information, notices, required actions, consent, and approved communication. | Linked children only |
| Shabab / Student | Own programme information, schedule, resources, attendance, and approved engagement features. | Own record only |

### Confirmed current boundaries

- A City Head does not manage cities and may provision only Park Leads, Park Admins, and Murabbis within their own city.
- A Park Lead can view groups and manage attendance only in the assigned park.
- A Park Admin can mark attendance only for groups in the assigned park.
- A Murabbi can mark attendance only for their assigned group.
- Only Super Admin manages the role-capability matrix and approved named-user capability exceptions.
- A capability grant never bypasses city, park, group, active-account, or resource-scope checks.
- Guardians see only linked children; Shabab see only their own records.
- Internal users do not self-register. Authorised administrators provision accounts; deactivation, role changes, and scope reassignment must invalidate active sessions.

Detailed medical, incident, finance, attendance-closure, admissions-decision, and community permissions remain deliberately undecided. They must be denied until approved and tested.

## 6. Product modules

“Foundation” means related functionality exists today; it does **not** mean the full target workflow is ready for production.

### Platform and people

| Module | Scope | Current position |
| --- | --- | --- |
| Public website | Programme overview, eligibility, locations, activities, FAQs, contact, admissions entry/status where approved, and portal login. | Basic foundation; official content requires approval. |
| Authentication | Email/password login, first-login reset, role-aware landing, session management, deactivation, and invalidation. | Strong foundation; role UAT remains. |
| Access provisioning | Linked staff, guardian, and Shabab accounts; invitations; access status; controlled bulk import. | Partial; authority and invitation security need completion. |
| Organisation setup | Cities, parks, venues, batches, groups, capacity, active/inactive state, and history. | Core structure exists; venues and history need expansion. |
| Roles, teams, assignments | Canonical role, park/group scope, collaboration teams, multiple assignments, and assignment history. | Current single-assignment model is insufficient. |
| Members and profiles | Private, scoped directory across staff, Murabbis, Shabab, and guardians. | Information is fragmented and needs consolidation. |

### Programme operations

| Module | Scope | Current position |
| --- | --- | --- |
| Admissions and onboarding | Application, screening, interviews, decisions, allocation, placement, and enrolment. | Partial; known data-loss issue requires repair before redesign. |
| Safeguarding and consent | Guardian verification, emergency/medical information, permissions, risks, incidents, and staff clearance. | Required target; policy and access rules must be approved first. |
| Grouping and placement | Age/class-based suggestions, capacity and Murabbi coverage checks, authorised overrides, transfers, and history. | Manual assignment foundation; automation/history missing. |
| Attendance | Shabab sessions, activities, team attendance, Mashwara/training attendance, corrections, closure, and reporting. | Strong Shabab-attendance foundation; other contexts need development. |
| Offline attendance sync | Local queue, reconnect/sync, conflict visibility, and queue health. | Foundation exists; mobile and browser UAT remains. |
| Content planner | Four approved content categories, plans, objectives, materials, versioning, publishing, and delivery confirmation. | High-value target; content is currently maintained in Sheets. |
| Murabbi training | Separate training curriculum, resources, schedule, completion, and approved training/clearance records. | Required target. |
| Calendar and batch planner | Sessions, milestones, admissions timelines, meetings, activity dates, and approved links. | Current schedule is mostly inferred from attendance history. |
| Events and activities | Sports, trips, camps, ceremonies, capacity, consent, risk, staff, transport, equipment, costs, and attendance. | Required target. |
| Responsibility planner | Event/campaign tasks, owners, due dates, dependencies, evidence, and review. | Required target. |
| Venue management | Primary/backup venues, capacity, facilities, permissions, hazards, emergency details, and contacts. | Only basic park information exists. |
| Weekly Mashwara | Scoped recurring meetings, attendance, Karguzari/MoM, decisions, team tasks, meeting-specific sharing, review/closure, and audit. | Approved future module; access cannot broaden hierarchy scope. |

### Finance and logistics

| Module | Scope | Current position |
| --- | --- | --- |
| Finance | Approved registration/event charges, donations, expenses, discounts, waivers, refunds, receipts, and exact-PKR reporting. | Fee/payment foundation exists; finance policy is pending. |
| Procurement | Requests, approvals, purchase orders, receiving, suppliers, and purchase evidence. | Required target. |
| Inventory | Item catalogue, park allocation, transfers, returns, loss/damage, adjustments, counts, and accountable POCs. | Required target. |

### Communication, engagement, and knowledge

| Module | Scope | Current position |
| --- | --- | --- |
| Announcements | National, city, park, or group notices with controlled audience, priority, and expiry. | Basic foundation exists. |
| Notifications | In-app notifications, then approved email/WhatsApp/SMS delivery, templates, eligibility, retries, and failure records. | In-app polling/outbox foundation; external delivery is incomplete. |
| Messaging | Safe internal conversations, permitted participant combinations, groups, read states, files, reporting, moderation, retention, and audit. | Deferred until communication-safety policy is approved. |
| Community | Approved social/community features such as posts, groups, media, comments, reactions, challenges, and reporting. | Deferred until safeguarding, moderation, visibility, and retention rules are approved. |
| Online resources | Courses, books, articles, search, categories, audience controls, publication states, and optional progress. | Required target; approved storage and copyright rules apply. |

### Role workspaces, governance, and reporting

| Module | Scope | Current position |
| --- | --- | --- |
| HQ / Program Head portal | National dashboard, city governance, planning, exceptions, reports, announcements, and access administration. | Dashboard foundation; target modules need expansion. |
| City operations portal | City parks, batches, groups, people, admissions, attendance, events, finance, procurement, and reports. | Core administration exists; workflows remain incomplete. |
| Park operations portal | Daily sessions, attendance, rosters/families, team operations, content delivery, events, and stock requests. | Attendance-focused foundation. |
| Murabbi portal | Assigned groups, roster, content, training, follow-up, calendar, and approved attendance. | Basic dashboard/groups; target workspace incomplete. |
| Guardian portal | Linked children, attendance, schedule, notices, consent/actions, absence reporting, and approved fees. | Read-only tracking foundation. |
| Shabab portal | Own profile, group/team, schedule, attendance, resources, progress, and approved community features. | Basic tracking foundation. |
| Dashboards and exception boards | Role-specific KPIs and actionable exceptions such as attendance, placement, consent, or sync gaps. | Basic dashboards; programme KPIs need expansion. |
| Reports and exports | Scoped admissions, attendance, capacity, delivery, events, finance, stock, access, and notification reporting; Excel exports remain necessary. | Attendance/fee reporting foundation exists. |
| Audit log | Redacted history for important access, attendance, admissions, financial, and stock activity. | Foundation exists; coverage grows with approved modules. |
| System settings | Controlled configuration for grouping rules, statuses, thresholds, templates, categories, and features. | Basic settings; final configuration model is pending. |

## 7. Key workflows

### Admissions to enrolment

`New → Interview Scheduled → Interviewed → Approved → Enrolled`

`Rejected` and `Hold` are alternative terminal/paused outcomes. The final workflow includes validated forms, candidate and guardian interviews, documented decisions, allocation/placement, approved notifications, and audit history.

### Programme delivery and attendance

Staff plan a batch, schedule sessions or activities, make approved content available, deliver it to an assigned group, record attendance, resolve exceptions, and use reports to follow up. Attendance must support offline use, later synchronisation, visible conflicts, correction/closure rules, and reporting without crossing scope boundaries.

### Planning, events, and responsibility

Sessions, activities, operational events, planner tasks, calendar entries, and batch plans are distinct but connected. Events require scope, audience, venue, capacity, cost, consent/safety needs, responsible people, checklists/tasks, status, and post-event review. Time-bound responsibilities must have an accountable lead, assignees, dates, evidence, and closure.

### Family, participant, and communication experience

Guardians and Shabab receive only their authorised programme information: schedules, attendance, notices, approved actions, fees, and resources. Adult-to-minor communication, community, and attachments require approved supervision, reporting, moderation, retention, consent, and escalation rules before release.

### Finance and stock control

The system distinguishes programme income, participant charges, donations, expenses, and stock movements. It must use exact PKR arithmetic, approval histories, receipts, and reconciled reporting. Shabab 360 must not imply recurring tuition dues where this conflicts with the programme’s public tuition-free position.

## 8. Scope: now, later, and not yet approved

| Category | Scope |
| --- | --- |
| Immediate delivery focus | Stabilise the Lahore-backed application: review every current role, page, workflow, dashboard, mobile view, error/empty state, and scope boundary; repair confirmed operational defects; complete staging role UAT; record retain/remove/change findings. |
| Core next scope | Correct and harden authentication, access, admissions, organisation/people, guardian links, attendance/offline sync, reports/audit, and PostgreSQL staging readiness. |
| Approved later scope | Core programme model; content planner and training; calendar/events/Mashwara; finance/procurement/inventory; then resources and engagement. |
| Explicitly deferred | Community and internal messaging until safeguarding and communication rules are signed off; unrestricted external-notification automation; unsupported generic social features. |
| Out of scope unless separately approved | Public production launch, uncontrolled self-registration, cross-city/park/group access, unmonitored adult-to-minor messaging, generic recurring tuition billing, and treating team/event titles as login roles. |

## 9. Delivery roadmap

| Phase | Goal | Exit evidence |
| --- | --- | --- |
| 0. Product consolidation | Approve programme facts, roles, workflows, module boundaries, terminology, and open decisions. | Owner-approved requirements baseline. |
| 1. Existing-system correctness | Repair verified defects and complete current role/workflow UAT. | Current critical workflows have evidence. |
| 2. PostgreSQL staging and readiness | Complete environment separation, storage/notifications foundations, staging tests, backup/restore rehearsal, and rollback readiness. | Hardened PostgreSQL staging, no production traffic. |
| 3. Core programme model | Implement multi-role/scope/team assignments, safety data, admissions redesign, grouping, and generalised attendance. | Admissions-to-follow-up works end to end. |
| 4. Programme delivery operations | Deliver content planning, Murabbi training, sessions, activities, events, planner, calendar, and delivery reporting. | A full batch can be planned, delivered, and reviewed in the portal. |
| 5. Finance and procurement | Implement approved financial policies, inventory and procurement, and reconciliation. | Financial and inventory totals reconcile with audit evidence. |
| 6. Engagement and knowledge | Deliver resources and, only after policy approval, community/messaging/notification maturity. | Safety, privacy, moderation, retention, and reporting UAT pass. |
| 7. Restricted pilot and handover | Pilot data, role/security/mobile/offline/payment/storage/report/backup checks, signed release approval, and stabilisation. | Restricted pilot approval and operational handover evidence. |

## 10. Security, privacy, safeguarding, and quality commitments

- **Server-side authorisation:** every protected read and write checks permissions and hierarchy scope; roles without city, park, or group context are denied.
- **Capability governance:** capabilities are controlled codes, not free-text permissions. Super Admin configuration and authorised named-user overrides are auditable, fail closed, and never override hierarchy scope.
- **Sensitive data:** medical, emergency, incident, safeguarding, financial, staff-clearance, and private-file access is restricted to the minimum necessary role and context.
- **Input and data integrity:** untrusted inputs use bounded validation; sensitive workflows are transactional where needed; high-impact changes are dated and auditable.
- **Privacy-aware reporting:** exports are scoped and approved around minimum necessary fields, including Urdu/Unicode requirements where applicable.
- **Safety before social features:** messaging, community, external delivery, and media must not launch without consent, moderation, reporting, retention, and escalation design.
- **Release discipline:** relevant automated tests, role allow/deny tests, browser UAT, lint, type checking, database checks, builds, migration/import reconciliation, backup/restore, and rollback evidence are required before release.

## 11. Technical approach and environments

Shabab 360 uses Next.js, React, TypeScript, Tailwind CSS, Prisma, NextAuth credentials authentication, Zod validation, TanStack Query, Zustand, Dexie, and Vitest.

| Environment | Purpose | Data rule |
| --- | --- | --- |
| Local development | Development, tests, and destructive experiments. | Synthetic or sanitised data only. |
| Shared staging | Role UAT, migration rehearsal, storage/integration checks, and controlled operational testing. | Sanitised, controlled data. |
| Pilot production | Restricted real pilot after every applicable release gate passes. | Approved minimum real data only. |

SQLite remains the active local/runtime database during the current stage. PostgreSQL has a staged schema and is the intended deployment database, but activation still requires remaining role/browser, storage, pooling, backup, restore, and release evidence. Deployments must never run database migrations automatically.

## 12. Owner decisions still needed

1. Official programme description, audience, age/class bands, duration, city-specific schedule, active cities, public contacts, and public fee wording.
2. Official content-framework names, curriculum outcomes, milestones, progress assessment, and which activities are national standards versus local options.
3. Final authority matrix, multi-role/context-switching model, team/POC/assistant rules, staff requirements, and assignment history.
4. Final admission fields, eligibility, interview rubrics, decision authority, capacity rules, grouping overrides, and placement rules.
5. Guardian verification, emergency/medical/allergy details, pickup, transport, media/event/travel/online-communication consent, incident, risk, and staff-clearance policies.
6. Attendance statuses, warning/dropout rules, leave handling, and exact create/mark/edit/close/reopen rights for each attendance type.
7. Content review/publishing, planner ownership, event categories, venue requirements, and responsibility workflows.
8. Registration/event/donation/expense/waiver/refund/payment and approval policies; stock ownership, valuation, transfer, loss, and purchasing rules.
9. Guardian/Shabab portal actions; external communication channels/templates/consent; messaging/community moderation, retention, and participant-combination rules.
10. Final KPIs, reports, Excel formats, data retention, privacy/safeguarding policies, deployment ownership, monitoring, backups, incident contacts, and paid-service handover trigger.

Until these rules are approved, the affected sensitive actions must remain unavailable rather than guessed in the product.

## 13. Definition of ready and done

A deliverable is ready only when its business outcome, roles/scope, inputs/outputs, states/exceptions, safety/privacy/audit impact, acceptance tests, dependencies, and out-of-scope boundary are explicit.

A deliverable is done only when the approved workflow works end to end; server-side permissions reject invalid role/scope access; data persists without silent loss; transactions protect integrity where needed; required desktop/mobile/offline behaviour passes; tests, lint, type checks, and builds pass; and its documentation, migration/deployment, monitoring, and rollback impacts are addressed.

## 14. Related documents

- [Codex Master Blueprint](CODEX_SHABAB360_MASTER_BLUEPRINT.md) — authoritative planning baseline and decision register.
- [Role-Based Access Matrix](ROLE_BASED_ACCESS_MATRIX.md) — detailed target capability matrix and pending permission decisions.
- [Module Catalogue](MODULE_CATALOG.md) — detailed module inventory and status definitions.
- [Product Work Packages](PRODUCT_WORK_PACKAGES.md) — execution packages, dependencies, and acceptance evidence.
- [Operations Runbook](OPERATIONS_RUNBOOK.md) — deployment, support, and operational guidance.

---

This overview intentionally separates **verified foundations**, **required target scope**, **deferred work**, and **owner decisions still required**. Update it whenever scope, roles, safety rules, data ownership, or release strategy change.
