# Shabab 360 Codex Master Blueprint

**Document owner:** Project Owner, with Codex as technical editor and review authority

**Status:** Consolidated working baseline, pending product-owner approval

**Last updated:** 2026-07-15

**Purpose:** This is the single working reference for all further Shabab 360
product, design, engineering, testing, migration, deployment, and handover
work. It consolidates the product-owner inputs, programme research, current
checkout evidence, security and integration audits, module specifications,
migration design, release plan, and open decisions without deleting the
original source documents.

## 1. Authority And Change Control

This document supersedes the other documents for day-to-day planning. The
source documents remain evidence and detail references.

When sources conflict, use this order:

1. A product decision explicitly approved by the project owner.
2. Current code plus fresh test, browser, database, or deployment evidence.
3. Product-owner vision inputs, for intended behaviour.
4. The programme research audit, for public programme context.
5. Security, API, integration, migration, and release audits.
6. Older implementation plans, module drafts, and agent reports.

Older claims such as "implemented", "deployed", or "safe" are not accepted
without current evidence. In particular, older documents describing Supabase
Auth/RLS do not describe the current checkout, which uses NextAuth and Prisma.

Use these status labels:

| Label | Meaning |
| --- | --- |
| Confirmed decision | The project owner has approved the requirement. |
| Verified existing | Current code and proportionate evidence confirm it. |
| Partial | A useful foundation exists, but required behaviour is incomplete. |
| Required target | Needed in the intended product, but not yet complete. |
| Decision required | Business rules must be approved before implementation. |
| Deferred | Intentionally later than the free pilot. |
| Release blocker | Must be closed before real production use. |

Any approved change to product scope, role permissions, data ownership,
security, deployment, or workflow must update this file before implementation
tasks are assigned.

## 2. Executive Product Decision

Shabab 360 should become the operational system for the Shabab Alburhan
programme, not merely a collection of generic admin dashboards.

The target system has:

- A public programme website.
- A controlled login for authorised users only.
- Role-specific workspaces for national, city, park, mentor, guardian, and
  Shabab users.
- National-to-local governance and reporting.
- Admissions and onboarding.
- Programme delivery through groups, content, sessions, activities, events,
  and calendars.
- Mobile-first, offline-capable attendance.
- Guardian communication and participant safety controls.
- Finance and procurement operations.
- Online resources, community, messaging, and notifications after their safety
  rules are approved.

The current app contains valuable foundations, but it does not yet represent
the full programme model. We will preserve secure, tested foundations and
reshape the product around the approved vision instead of blindly extending
the current screens.

The operating sequence is:

1. Finalise the product and programme rules from all collected information.
2. Make the existing codebase correct, secure, testable, and internally
   consistent.
3. Complete the PostgreSQL staging and deployment foundation.
4. Correct the core programme model and workflows.
5. Add the approved operational and engagement modules in controlled phases.
6. Run complete role-based UAT before a restricted pilot.

No public production handover is currently approved.

### Current Delivery Order (Owner Decision, 2026-07-20)

The Lahore staging import is now the practical baseline for the next delivery
phase. Before starting broad redesigns, new modules, or speculative features,
complete a **real-data stabilization pass** across the current system:

1. Review every existing role, page, workflow, scope boundary, dashboard, and
   mobile UI against the imported Lahore data.
2. Correct defects, empty/error states, misleading counts, inaccessible or
   out-of-scope navigation, data-shape assumptions, and operational gaps that
   prevent the current system from being useful.
3. Verify the corrected current system through role-based staging UAT and
   document what must be retained, removed, or changed.
4. Only after this stabilization gate is accepted, begin the next product phase
   to redesign and extend the system module by module from the approved gap
   list.

This sequence does not weaken security, authorization, migration, or data
quality gates. New foundation work is allowed only where it is necessary to
make the current Lahore-backed system operational.

### Confirmed Current Role Boundaries (2026-07-20)

- City Head operates below the city level, never manages Cities, and may manage
  only Park Leads, Park Admins, and Murabbis within the assigned city.
- Park Lead can view all groups and manage attendance in the assigned park.
- Park Admin can mark attendance for all groups in the assigned park only.
- Murabbi can mark attendance for the assigned group only.
- City Head staff provisioning, activation, deactivation, reset, and scope
  changes must be enforced on the server. It must never grant role-default or
  individual capability-override administration, HQ roles, or cross-city access.

## 3. Programme Understanding

Public research currently supports the following working understanding:

- Shabab Alburhan is a youth development programme connected to Al-Burhan.
- Public material describes a focus on character, responsibility, leadership,
  spiritual development, teamwork, and practical growth.
- Public Lahore material targeted boys in school-level education, including
  grades 9-12 or O/A Level equivalents.
- Public material describes in-person weekend delivery, limited seats,
  shortlisting/interviews, and a long-form programme rather than a single
  event.
- Activities publicly associated with the programme include classes,
  teamwork, outdoor activities, camping or survival, hiking, swimming,
  archery, and leadership/problem-solving exercises. The exact approved
  curriculum remains an internal decision.
- Public material has described the programme as tuition-free. Registration
  charges, optional event costs, donations, or special-activity fees must
  therefore be modelled separately and communicated accurately.

The public research does not establish the final curriculum, all active
cities, safeguarding policy, age rules, programme duration in every city, fee
policy, or internal authority matrix. These require official internal input.

Detailed evidence and source links are preserved in the
[Programme Research And Gap Audit](product-discovery/SHABAB_PROGRAMME_GAP_AUDIT.md).

## 4. Product Principles

All future work must follow these principles:

1. **Programme-first:** Screens and terms must reflect how Shabab Alburhan
   actually operates.
2. **One platform, different doors:** Users share one system but see only the
   workspace and data appropriate to their role.
3. **Deny by default:** Navigation visibility is not security. Every protected
   read and write requires server-side role and scope enforcement.
4. **Youth safety first:** Guardian consent, emergency information, medical
   considerations, communication safety, incident handling, and private files
   are core requirements, not later polish.
5. **Mobile and offline where operations require it:** Attendance must remain
   fast and resilient in parks with unreliable connectivity.
6. **Action before decoration:** Dashboards should identify exceptions and
   direct users to the next real action.
7. **One source for each business fact:** Avoid duplicate boards and competing
   workflows for the same participant, guardian, attendance issue, or payment.
8. **Business language:** Use Program Head, City Head, Park Lead, Park Admin,
   Murabbi, Guardian, and Shabab consistently in the interface.
9. **Minimum necessary data:** Collect, display, retain, and export only what is
   needed for programme operations and safety.
10. **Audit important changes:** High-impact actions must be traceable without
    storing credentials or unnecessary personal data.
11. **Free pilot, upgrade deliberately:** Use free services for controlled
    development and pilot work. Upgrade before terms, scale, reliability, or
    organisational use require it.
12. **Evidence-based completion:** A task is not complete because a page exists;
    it is complete when its workflow, permissions, tests, mobile behaviour,
    data integrity, and rollback impact are verified.

## 5. Organisational Model

The core operating hierarchy is:

`National Programme -> City -> Park -> Batch -> Group -> Shabab`

Cross-cutting dimensions are:

- Role: authority and responsibilities.
- Team: Sports, Skills, Tadreeb, Media, or Muawin. A team is a collaboration
  group with its own documents, activity planning, and discussions; it is not a
  login role or a substitute for organisational scope.
- Programme activity: class, training, Mashwara, sport, trip, campaign, or
  ceremony.
- Time: batch, term, calendar date, session, and event.

### Required structural rules

- A city contains parks.
- A park may run one or more batches over time.
- A batch contains groups.
- A Shabab has one primary active group at a time, with assignment history
  retained.
- Group suggestions are generated from approved age and class rules, but an
  authorised operator can override them with a recorded reason.
- A guardian can be linked to multiple Shabab; a Shabab may need more than one
  authorised guardian/contact.
- A staff member may need multiple roles, teams, parks, or groups. The current
  single `StaffMeta` assignment cannot be assumed to satisfy the final model.
- Team membership and group membership are separate concepts.
- All assignment changes must be dated and auditable.

## 6. Users, Roles, And Responsibility Boundaries

| Role | Primary responsibility | Intended scope |
| --- | --- | --- |
| `super_admin` | Technical recovery and controlled system administration | Global, hidden from normal business workflows |
| Program Head / Markazi Masoul (`program_admin`) | National governance, standards, city oversight, national planning and reporting | All cities |
| City Head / City Masoul (`city_head`) | City operations, parks, city team, batches, exceptions, and city reporting | Assigned city or approved cities |
| Park Lead (`park_lead`) | Park leadership, team oversight, approvals, attendance correction, Mashwara/training attendance | Assigned park or approved parks |
| Park Admin (`park_admin`) | Daily administration, group/class attendance, records, walk-in enquiries, and operational support | Assigned park |
| Murabbi (`murabbi`) | Mentoring, group delivery, content use, participant follow-up, and approved attendance actions | Assigned groups/teams/park |
| Guardian / Parent (`guardian`) | View linked children, receive updates, provide required consent/information, and communicate through approved channels | Linked children only |
| Shabab / Student (`student`) | View own programme information, schedule, resources, attendance, teams, and approved community features | Own record only |

### Access rules

- Internal roles do not self-register.
- An authorised administrator provisions accounts.
- A person/guardian/participant record and a login account are separate but
  explicitly linked.
- Temporary access must force a first-login password reset.
- Deactivation, role change, or scope reassignment must invalidate active
  sessions immediately.
- Unlinked accounts are blocked by default unless an explicit owner-approved
  use case is documented.
- Guardians see only linked children. Shabab users see only themselves.
- A user's effective permissions are the intersection of role, active status,
  assigned scope, action, and resource context.

### Permission decisions still required

- Whether Program Head and City Head may both create or deactivate cities,
  parks, batches, and groups.
- Whether Park Lead can administer accounts or only operational records.
- Exactly which attendance types a Murabbi can create, mark, close, or edit.
- Whether one person may hold simultaneous business roles and how the user
  switches context.
- Who approves group overrides, event costs, purchases, waivers, content, and
  community moderation actions.
- Who can view medical, emergency, safeguarding, financial, and incident data.

## 7. Target Information Architecture

The final navigation will be approved after workflow mapping. This is the
working target, not a licence to build every page immediately.

### Public website

- Home and programme overview.
- Purpose, audience, locations, activities, and frequently asked questions.
- Admissions information and application.
- Application status lookup, if approved.
- Public courses, books, and articles where intended.
- Portal login.

### HQ workspace

- Dashboard and national exceptions.
- Cities and City Heads.
- Programme planner and calendar.
- Admissions oversight.
- People and members.
- Content and training planner.
- Events and responsibilities.
- Finance and donations.
- Procurement and inventory.
- Communications and notifications.
- Reports and audit.
- System and access settings.

### City workspace

- City dashboard and exceptions.
- Parks, batches, groups, and teams.
- Admissions and placement.
- People, guardians, and access.
- Attendance setup and monitoring.
- City calendar and event responsibilities.
- Content delivery monitoring.
- Finance and procurement within scope.
- Announcements, reports, and audit within scope.

### Park workspace

- Park dashboard and next action.
- Today's sessions and attendance.
- Shabab/groups and families.
- Park team and team attendance.
- Content plan and delivery.
- Schedule and events.
- Inventory and requests.
- Messages, announcements, and notifications.

### Murabbi workspace

- Assigned groups and teams.
- Session plan and class content.
- Shabab roster and approved follow-up.
- Approved attendance workflow.
- Murabbi training content.
- Calendar, messages, and notifications.

### Guardian workspace

- Linked children.
- Attendance and schedule.
- Notices, consent requests, and required actions.
- Approved fee/event-payment information.
- Resources and monitored messaging.

### Shabab workspace

- Own dashboard and profile.
- Group, teams, roles/titles, and schedule.
- Attendance and progress information approved for self-view.
- Courses, books, articles, and class resources.
- Community, messaging, and notifications under approved safety rules.

## 8. End-To-End Workflows

### 8.1 Public Entry, Login, And Access Provisioning

1. A public visitor learns about the programme without entering the internal
   portal.
2. An authorised user opens the login page.
3. The system validates credentials, active account state, linked record, role,
   scope, and password-reset requirement.
4. The system routes the user to the correct workspace.
5. Admin account creation supports a deliberate person/guardian target,
   create-vs-update status, and one-time secure onboarding.
6. Bulk import may remain, but only with row-level validation, atomic creation,
   duplicate handling, safe generated credentials, and an auditable result.

### 8.2 Admissions And Onboarding

Target status flow:

`New -> Interview Scheduled -> Interviewed -> Approved -> Enrolled`

Alternative terminal or paused states: `Rejected` and `Hold`.

Required workflow:

1. Capture a complete application, including the final approved applicant,
   guardian, emergency, education/class, location, and consent fields.
2. Screen and shortlist according to approved rules.
3. Schedule candidate and guardian interviews.
4. Inform the family through call and a controlled WhatsApp handoff or future
   approved integration.
5. Conduct candidate and guardian interviews.
6. Record structured rubric scores, reviewer remarks, recommendation, and
   decision authority.
7. Record registration fee status only if the approved policy requires it.
8. Allocate city/park, suggest a group using age/class rules, allow an approved
   override, and assign Murabbi/team relationships.
9. Convert the application atomically into participant, guardian, links,
   assignments, and optional access accounts.
10. Keep the original application and decision history for audit and reporting.

The current UI collects `emergencyContact`, `emergencyPhone`,
`previousEducation`, and `reference`, but the API/schema do not persist them.
This silent data loss is a confirmed defect and must be fixed before relying on
the admissions module.

### 8.3 Grouping And Assignment

- Maintain approved age and class bands as versioned grouping rules.
- Suggest a group during admission/enrolment.
- Show capacity, assigned Murabbis, and schedule before confirmation.
- Allow authorised manual assignment or transfer with reason and effective
  date.
- Retain group, park, team, and role history.
- Surface groups without Murabbis, over-capacity groups, inactive staff
  assignments, and unplaced approved applicants.

### 8.4 Attendance

Attendance is not one generic daily record. The target must support distinct
attendance contexts:

- Shabab group/class session attendance, normally marked by Park Admin and
  correctable by Park Lead.
- Special activity and event attendance.
- Team member attendance in the park.
- Team attendance for Mashwara or training, marked by Park Lead.
- Any approved Murabbi marking workflow.

Each attendance session needs an activity type, target group/team, park,
scheduled start/end, venue, facilitator, content/event link where relevant,
open/closed state, and edit authority.

Offline rules:

- Roster data can be used offline after authorised caching.
- The latest local mutation per session/person remains queued.
- Marking feels immediate.
- Successful sync removes the queued item.
- Failed/conflicting items remain visible for resolution.
- Closing, reopening, and correction rules are enforced server-side.
- The user sees queue depth, failures, last sync, and the next required action.

### 8.5 Content Planner And Murabbi Training

- Owner-provided Batch 4 source plans have been reviewed. The workbook maps
  Exercises/Sports to Sports, Skills to Skills, and Tadreeb to Tadreeb; it does
  not define Media or Muawin content or memberships. See
  `docs/product-discovery/CONTENT_PLANNER_SOURCE_ANALYSIS.md` before any import
  or planner implementation.
- Maintain Shabab class content under four official categories, still to be
  named and defined.
- Plan content by batch, week, class/session, group type, age/class band, and
  delivery date.
- Provide Murabbis with objectives, preparation, materials, delivery guidance,
  attachments/links, and reflection or completion status.
- Maintain a separate Murabbi training-content area.
- Import or reconcile the existing Google Sheets content without losing source
  history.
- Apply draft, review, approved, published, archived, and version states.
- Restrict sensitive/internal training content by audience and scope.

### 8.6 Planner, Calendar, Activities, And Events

These concepts must be distinct:

- **Session:** A scheduled class, training, Mashwara, or attendance-bearing
  programme delivery unit.
- **Activity:** Swimming, sport, trip, hike, camp, or similar participant
  activity.
- **Operational event:** Admission campaign, park hunting, inauguration,
  closing ceremony, or another programme milestone.
- **Planner item/task:** Work required to deliver an event, with owner,
  deadline, dependencies, status, and evidence.
- **Calendar entry:** The date/time representation of sessions, activities,
  meetings, deadlines, and events, including approved meeting links.
- **Batch planner:** The official sequence of dates and milestones for one
  batch.

Events require scope, audience, venue, capacity, cost, consent/safety needs,
responsible people, assistants, checklist/tasks, status, and post-event review.

The venue model must support a regular primary location and approved backup or
indoor locations. Where operationally justified, it should record venue type,
capacity, operating hours, permissions, facilities such as water/restrooms and
first aid, known hazards, emergency assembly guidance, responsible contact,
equipment storage, and nearby emergency support. GPS coordinates and similar
location detail should be collected only when the owner confirms a real safety
or operational need and approves who may see it.

### 8.7 Finance

Finance must distinguish income, participant charges, donations, and expenses:

- Registration fees where approved.
- Optional event/trip/special-activity fees.
- Donations with donor/privacy and acknowledgement rules.
- Sports and other purchases/expenses.
- Discounts, waivers, refunds, and adjustments with approval history.
- Receipts and exact PKR arithmetic.
- Park, city, batch, event, category, and date reporting.

The programme's public tuition-free position means the system must not present
generic recurring tuition dues unless the owner approves and explains that
policy. The existing fee engine is a useful transactional foundation but is not
the final finance model.

### 8.8 Procurement And Inventory

- Maintain an item catalogue, units, categories, condition, and total stock.
- Track stock by location and quantity assigned to each park.
- Track a Park POC and assistant, as assignments rather than free text where
  possible.
- Support requests, approvals, purchase orders, receiving, allocation,
  transfers, returns, loss/damage, adjustments, and stock counts.
- Link expenses and purchase evidence to finance without duplicating totals.
- Audit every stock-affecting transaction.

### 8.9 Community

The intended reference is LetsVibeIt, but "similar" is not yet an implementable
requirement. Before design, define whether Shabab 360 needs posts, feeds,
groups, teams, events, media, reactions, comments, profiles, discovery, or
challenges.

Because users include minors, community work requires approval of moderation,
visibility, reporting, blocking, media consent, retention, staff oversight, and
incident escalation. Community is deferred until these rules are signed off.

### 8.10 Online Resources

- Courses.
- Books.
- Articles.
- Search, categories, audience, publication state, featured content, and
  progress/completion only where useful.
- Public resources and logged-in programme resources must be clearly separated.
- Files must use approved private/public storage rules and copyright metadata.

### 8.11 Messaging

The target is an internal mini messenger, subject to safety design:

- One-to-one or group conversations only between approved role combinations.
- Clear scope and membership rules.
- Delivery/read state where required.
- Attachments only through secure storage and file validation.
- Reporting, moderation, retention, search, and audit rules.
- No hidden or unmonitored adult-to-minor channel.
- Emergency and safeguarding reports must not depend only on ordinary chat.

### 8.12 Notifications And External Communication

- Support in-app notifications for team members, Shabab, and guardians.
- Define email and WhatsApp channels separately from in-app delivery.
- Record template, audience, consent/eligibility, delivery state, attempts, and
  failure reason without storing credentials.
- Use polling for the free pilot. Do not restore the retired unauthenticated
  Socket.IO service.
- Urgent operational communication cannot rely on a once-daily free cron.
- Calls and WhatsApp deep links may be used as controlled handoffs before a
  fully approved provider integration exists.

### 8.13 Members, Profiles, Teams, And Titles

- Provide a filterable members directory with strict scope and field-level
  privacy.
- A profile may show approved current roles, parks, groups, teams, and titles.
- Community posts may show safe profile context, not private assignments or
  guardian information.
- Keep assignment history for administration while exposing only current safe
  context publicly or socially.

### 8.14 Reporting And Audit

Reports must support national, city, park, batch, group, team, event, and date
scope as authorised. Required report families include:

- Admissions funnel, interview, decision, placement, and enrolment.
- Attendance by session/activity/group/team and exception trends.
- Group capacity, Murabbi coverage, and participant state.
- Content plan versus delivery.
- Calendar/event responsibility and completion.
- Registration/event fees, donations, expenses, and reconciliations.
- Inventory, park allocation, movement, and purchase orders.
- Access status and inactive/unlinked account exceptions.
- Notification delivery and failure summaries.

Excel remains required for operational exports. Final layouts, columns, Urdu
support, and privacy rules require owner approval.

## 9. Module Scope And Priority

| Module | Current state | Target priority |
| --- | --- | --- |
| Public site | Basic SPA homepage exists | Core; rewrite copy/content after programme approval |
| Authentication/access | Strong partial foundation | P0 correctness and UAT |
| Organisation/people | Cities, parks, batches, groups, participants, guardians exist | Core; extend assignments/teams/history |
| Admissions | Partial workflow with confirmed data loss | P0 repair, then core redesign |
| Attendance | Strong participant/offline foundation | Core; extend session and team contexts |
| Family portals | Read-only attendance/fees/schedule/announcements foundation | Core; add approved consent/actions later |
| Reports/audit | Attendance/fees/presets and redacted audit foundation | Core; expand by approved modules |
| Content planner | Not represented in the current checkout | Post-core, high business value |
| Events/planner/calendar | Schedule is inferred from attendance; no full planner | Post-core, high business value |
| Finance | Fee/payment engine only | Redesign after fee policy approval |
| Procurement | Not represented in the current checkout | Later operational phase |
| Community | Not represented in the current checkout | Deferred pending safeguarding design |
| Online resources | No complete current module | Later, can follow content architecture |
| Messaging | Not represented in the current checkout | Deferred pending communication safety design |
| Notifications | In-app polling and database outbox foundation | Complete delivery after core security |
| Members/profiles | Scattered directories and profile data | Consolidate after assignment model |

## 10. Data Model Direction

### Verified current models

The active and staged schemas currently contain:

- `User`, `StaffMeta`, and `AuditLog`.
- `City`, `Park`, `Batch`, `Group`, and `BatchSettings`.
- `Guardian`, `GuardianChild`, and `Participant`.
- `AttendanceEvent` and `AttendanceRecord`.
- `FeeEvent`, `Payment`, and `ReceiptSequence`.
- `AdmissionApplication` and `AdmissionInterview`.
- `Announcement`, `Notification`, and `ReportPreset`.

### Required future domains

Do not add these tables until their business rules are approved, but the final
model is expected to need:

- Staff role assignments, scope assignments, team memberships, titles, and
  effective-date history, plus approved training/clearance status where it is
  legally and operationally required.
- Grouping rules, capacity, assignment suggestions, and transfer history.
- Emergency contacts, guardian consent, medical/allergy information,
  transport/pickup permissions, document consent, and safeguarding records
  with restricted access.
- Admission form versions, interview types, rubric criteria/scores, panel
  members, communications, decisions, waitlist/hold reasons, and placement.
- Programme categories, curriculum tracks, content versions, batch content
  plans, session plans, delivery records, and Murabbi training.
- Sessions, activities, events, calendar entries, planner tasks,
  responsibilities, venues, meeting links, safety checklists, and attendance
  targets.
- Venue locations, primary/backup relationships, availability, facilities,
  hazards, emergency guidance, permissions, and responsible contacts, subject
  to data-minimisation and access decisions.
- Team attendance and staff/training attendance, not only participant-group
  attendance.
- Finance accounts/categories, charges, donations, expenses, adjustments,
  approvals, and attachments/evidence.
- Inventory items, locations, balances, transactions, requests, purchase
  orders, receipts, allocations, and responsible contacts.
- Resource items, courses, enrolments/progress only if required, books,
  articles, and publication metadata.
- Community posts/comments/reactions/media/moderation only after approval.
- Conversations, members, messages, delivery state, reports, and retention only
  after approval.
- Notification templates, preferences/consent, delivery attempts, and provider
  reconciliation.
- Private file objects with owner, purpose, scope, retention, malware/type
  validation, and storage key.

Schema changes must be versioned, reviewed with data migration and rollback
impact, tested on Staging, and reflected in both application behaviour and this
blueprint.

## 11. Current Verified Technical Baseline

### Checkout and stack

- Branch: `codex/production-hardening`.
- The working tree intentionally contains the uncommitted hardening work and
  documentation. Nothing in this consolidation is a production release.
- Next.js 16.1, React 19, TypeScript, Tailwind CSS 4, Prisma 6.11, NextAuth 4,
  TanStack Query 5, Zustand 5, Dexie 4, Zod 4, and ExcelJS 4.
- Current runtime schema: SQLite in `prisma/schema.prisma`.
- Staged target schema: PostgreSQL in `prisma/postgres/schema.prisma`.
- Vercel build command: `npm run build:postgres`.
- Current authentication: NextAuth credentials plus bcrypt and Prisma. Supabase
  Auth is not the current authentication provider.
- Intended managed services: Vercel for the app, Supabase for PostgreSQL and
  private object storage, and an approved email provider such as Resend.

### Current application capabilities verified by checkout

- Role-aware SPA shell and navigation for all eight roles.
- Cities, parks, batches, groups, people, students, guardians, access,
  admissions, fees, announcements, reports, notifications, audit, and settings
  screens for authorised admin roles.
- Park dashboard, attendance, roster, participants, guardians, and schedule.
- Murabbi dashboard and groups.
- Guardian dashboard, attendance history, schedule, fees, and announcements.
- Student dashboard, attendance history, schedule, fees, announcements, and
  profile.
- APIs for the corresponding core operations, plus scoped search and reports.
- Offline attendance queue and sync behaviour.

Older reference documents list many more dashboards, content, procurement, and
deployed Supabase capabilities. Those lists do not match the current checkout
and are not treated as verified.

### Verification evidence

- Clean baseline completed on 2026-07-15 with Node.js `v26.5.0`, npm `12.0.0`,
  Next.js `16.2.10` and Prisma Client `6.19.3`.
- After isolating the active development writer and regenerating `.next`, lint
  and full TypeScript validation passed. This confirms the earlier malformed
  `.next/dev/types/routes.d.ts` result was generated-state interference, not a
  source-code defect.
- Baseline verification passed 94 tests in 28 files. After `ADM-FIX-001`, the
  current suite passes 107 tests in 30 files.
- SQLite and PostgreSQL production builds passed; both completed `61/61`
  static-page generation and listed the same 86 application routes.
- The high-severity production dependency audit passed with no high or critical
  findings. Ten moderate transitive findings remain for a compatibility-safe
  remediation task; breaking `npm audit fix --force` changes were not applied.
- The SQLite Prisma client was restored after PostgreSQL verification, and the
  local application returned `HTTP 200` on `http://localhost:3000`.
- `ADM-FIX-001` now preserves `emergencyContact`, `emergencyPhone`,
  `previousEducation`, and `reference` across bounded create/read/edit/reload
  flows in both database schemas. Authenticated localhost smoke verification
  passed and its temporary data was removed.
- No claim of 113 passing tests is accepted for this checkout; the verified
  current count is 107.

## 12. Completed Hardening To Preserve

The following work is valuable and must not be regressed:

- Deny-by-default authorisation helper with hierarchy scope tests.
- Cross-city, cross-park, cross-group, student, guardian, search, and attendance
  negative route tests for the covered endpoints.
- Atomic `tokenVersion` invalidation for relevant user access changes.
- Forced first-login reset and ordinary password-change separation.
- Password policy of 12-128 characters for user-selected/generated credentials.
- Unique cryptographic temporary passwords returned only in the current admin
  result, with forced reset.
- Attendance alert service with event/participant/scope validation and correct
  absence-streak breaks.
- Transactional exact-money payment checks, batch membership validation,
  overpayment protection, and unique receipts.
- Retirement of the unauthenticated Socket.IO mini-service.
- Authenticated notification polling every 60 seconds and on browser focus.
- Bounded navigation history.
- Shared pagination/search/date validation on major list APIs.
- Database-side fee aggregates and supporting indexes.
- Shared TanStack Query defaults.
- Redacted audit helper, restricted audit reads, and PII-safe audit-failure
  visibility.
- CSP, security headers, private indexing policy, and same-origin mutation
  protection.
- CI workflow for install, Prisma generation, lint, typecheck, tests, build,
  dependency audit, and sensitive tracked-file guard.
- Versioned PostgreSQL baseline, controlled SQLite importer, reconciliation,
  Decimal compatibility, database-neutral reports, and PostgreSQL build path.

## 13. Known Defects, Risks, And Release Blockers

### P0 owner and platform gates

- Confirm all previously exposed secrets were rotated. Record the Git-history
  rewrite decision. Never print or place secret values in documentation.
- Confirm Vercel Hobby use is eligible for the controlled pilot. Organisational
  or commercial handover may require Vercel Pro or another eligible plan.
- Protect the main branch and establish the final review/merge policy.
- Provision and separate sanitised Staging and Pilot Production environments.
- Complete encrypted Postgres backup and non-destructive restore evidence.
- Configure private object storage and prove authorised/signed access.
- Configure the actual notification sender, sender domain, reconciliation, and
  delivery monitoring.
- Complete custom domain, HTTPS, environment, quota, monitoring, smoke,
  rollback, and incident-response checks.

### P0 application and data gates

- Replace temporary-password account onboarding with one-time, hashed,
  expiry-bound invitation tokens if invitations are to leave the administrator
  handoff model. Historical notification rows are excluded from PostgreSQL
  import and target reconciliation requires an empty notification table.
- Notification data minimisation is implemented and verified: channel-specific
  strict metadata schemas and content guards prevent reset URLs, credentials,
  token material, hashes, and unnecessary duplicate metadata from reaching the
  outbox. The queue remains an outbox only; provider delivery is a separate
  gated task.
- The four confirmed admissions fields now persist through create, read, edit,
  and reload across both supported database schemas.
- Shared query validation now covers remaining list/search/report APIs with
  bounded page, identifier, search, date-range and sort inputs; continue to
  use the shared boundary helpers for all new endpoints.
- Replace or redesign the in-memory login rate limiter before multi-instance
  production use.
- Run complete browser role-matrix UAT, including deny cases.
- Run the application against PostgreSQL Staging before changing any production
  runtime variable.
- Do not accept real document/avatar uploads until private storage is complete.
- Resolve the fresh generated `.next` typecheck issue and rerun lint, typecheck,
  tests, SQLite build, and PostgreSQL build in a clean verification window.

### Core product-model gaps

- Current staff metadata represents one role and one city/park/group assignment
  and cannot represent the proposed multi-role/team model.
- Current participant/guardian/admission data lacks approved emergency,
  consent, medical, transport, and safeguarding structures.
- Current attendance events contain only group, title, date, and close state;
  they do not model class/activity/team/training context, duration, venue,
  facilitator, or programme content.
- Current schedule is derived from attendance history rather than a true
  programme calendar and batch plan.
- Current admissions interviews use generic score fields rather than approved
  candidate and guardian rubrics.
- Current certificates are attendance-driven and do not represent programme
  learning, skills, behaviour, or completion criteria.
- Current reports focus mainly on attendance and fees.
- Content planning, events/planner, procurement, community, resources,
  messaging, and full member/team profiles are not complete in this checkout.

### P1/P2 technical debt

- Standardise API success/error envelopes and response types.
- Finish request-size, query-bound, and sensitive-route rate-limit coverage.
- Review page-specific query freshness and add development DevTools only after
  dependency approval.
- Replace hard-coded service-worker cache versioning if PWA caching remains.
- Add HTML email templates only after real delivery, consent, and content rules
  exist.
- Split very large components only after behaviour is protected by tests.
- Review indexes using PostgreSQL query plans after representative staging data
  exists.
- Evaluate Auth.js v5 as a separate later migration, never mixed with core
  product or database cutover work.

## 14. Security, Privacy, And Safeguarding Baseline

### Security

- Deny unknown, inactive, unassigned, and out-of-scope access by default.
- Enforce every role/scope decision on the server.
- Validate ownership and hierarchy for every detail read and mutation.
- Use atomic transactions for access changes, admissions conversion, money,
  stock, and other integrity-sensitive workflows.
- Use exact PKR values, never floating-point money.
- Keep credentials, database URLs, service keys, email keys, and storage keys
  only in approved secret stores.
- Apply bounded input, Zod validation, origin/CSRF strategy, security headers,
  rate limits, file validation, and audit coverage.
- Test both allowed and denied paths.

### Privacy and audit

- Audit access is restricted to Program Admin and technical Super Admin unless
  the owner approves a narrower operational exception.
- Audit records may retain actor, action, entity type/id, timestamp, and
  non-sensitive changed fields.
- Passwords, temporary passwords, tokens, reset URLs, names, emails, phone,
  CNIC, address, date of birth, free-form messages, and unnecessary content are
  redacted from audit changes.
- IP addresses, user agents, device fingerprints, and request bodies are not
  collected for the pilot without a new privacy decision.
- Pilot audit retention defaults to 90 days, pending legal/program approval.
- Historical audit and notification records are excluded from migration unless
  approved sanitisation is proven.

### Safeguarding requirements to formalise

- Guardian identity and relationship verification.
- Consent for enrolment, activities, travel, media, medical help, online
  community, and messaging as applicable.
- Emergency contacts, medical/allergy information, authorised pickup, and
  incident response.
- Activity and venue risk assessments, approved staff training/clearance
  evidence, incident follow-up, and consent withdrawal history where required.
- Restricted access and short retention for sensitive safety information.
- Approved adult-to-minor communication, monitoring, reporting, and escalation.
- Content, media, community, and messaging moderation.
- Clear responsibility for reviewing and resolving a reported concern.
- A data-protection impact assessment, staff operating procedure, and training
  plan before high-risk safeguarding workflows are activated.
- Applicable Pakistani law, institute policy, and child-safeguarding review
  before public rollout.

## 15. Approved Technical Direction

### Runtime architecture

`Browser -> Vercel Next.js -> NextAuth/authorisation -> Prisma -> Supabase PostgreSQL`

Supporting services:

- Dexie/IndexedDB for offline attendance queueing.
- Supabase private Storage for approved files, using server-authorised access
  and short-lived signed URLs.
- Database notification outbox plus an approved provider such as Resend.
- Authenticated API polling for pilot notifications.
- Vercel/GitHub CI for checks and controlled deployment.

### Authentication decision

Retain NextAuth 4 during hardening and the free pilot. Do not migrate to
Supabase Auth or Auth.js v5 while simultaneously changing the database and
product model. Supabase is the target database/storage provider, not the
current identity provider.

### Database decision

- Active local/runtime data remains SQLite until Staging gates pass.
- The reviewed PostgreSQL baseline and Staging import/reconciliation are
  complete.
- The controlled importer copied 1,242 operational records and excluded 48
  historical audit records plus transient notifications under the data policy.
- PostgreSQL runtime activation still requires role/browser tests, private
  storage, pool validation, encrypted backup, and restore evidence.
- Vercel runtime uses the Supabase transaction pooler.
- Migrations, backup, and restore use direct or approved session connections.
- Vercel builds must never run migrations automatically.
- After Postgres accepts live writes, recovery remains on Postgres; do not roll
  the live system back to SQLite.

### Environment model

| Environment | Purpose | Data rule |
| --- | --- | --- |
| Local development | Code, tests, destructive experiments | Local synthetic/sanitised data only |
| Shared Staging | Migration, role UAT, browser tests, storage and integration rehearsal | Sanitised controlled data |
| Pilot Production | Restricted real pilot after all gates | Approved minimum real data only |

Preview deployments may use shared sanitised Staging but must never receive
Pilot Production credentials or run migrations.

## 16. Free-Tier Deployment Policy

The owner has selected free services for the current stage. The working plan
is Vercel Hobby, two Supabase Free projects for Staging and Pilot Production,
and a free email allowance where eligible.

Free-tier limits and terms change and must be rechecked at deployment time.
The existing plan records these working constraints:

- Vercel Hobby is suitable only for an eligible controlled pilot and lacks team
  collaboration and long log retention.
- Supabase Free has limited database/storage, can pause inactive projects, and
  does not provide the required production-grade automatic backup/PITR model.
- Free email volume is limited and cannot support uncontrolled notification
  growth.
- Daily/imprecise cron cannot guarantee urgent messages or durable background
  work.
- Shared Staging means preview branches do not have isolated databases.

Upgrade or redesign is required when:

- Use becomes organisational/commercial under provider terms.
- Multiple deployment collaborators or stronger access controls are needed.
- Availability cannot tolerate pausing or manual recovery.
- Automatic backups, PITR, a recovery SLA, or isolated preview databases are
  required.
- Database, storage, function, bandwidth, or email limits are approached.
- Reliable background jobs, urgent retries, frequent schedules, or realtime
  delivery are required.
- Handover requires provider support, longer logs, spend controls, or team
  ownership.

## 17. Delivery Roadmap

### Phase 0: Product Consolidation And Approval

- Collect remaining internal programme information.
- Approve the programme facts, role matrix, workflows, module scope, safety
  rules, and vocabulary.
- Approve target navigation and route keep/merge/remove decisions.
- Convert every unresolved item in Section 20 into a decision or explicit
  deferral.
- Freeze new module implementation until the core decisions are recorded.

Exit gate: product owner approves this blueprint's requirements baseline.

### Phase 1: Existing-System Correctness

- Fix admission data loss and other confirmed existing defects.
- Close invitation, notification data, rate limiting, and remaining input/API
  contract gaps.
- Run clean lint, typecheck, tests, SQLite build, and PostgreSQL build.
- Perform browser UAT for every current role and core current workflow.
- Correct only confirmed defects and confusing duplicate current paths.

Exit gate: current app is internally correct and all current critical workflows
have evidence.

### Phase 2: PostgreSQL Staging And Platform Readiness

- Complete secret decisions and environment separation.
- Finish private storage and notification delivery foundations.
- Complete Staging role, payment, import, storage, pool, Unicode, mobile, and
  offline tests.
- Complete encrypted backup and independent restore rehearsal.
- Configure Vercel Preview against sanitised Staging and rehearse rollback.

Exit gate: the hardened app runs safely on PostgreSQL Staging; no production
traffic is enabled.

### Phase 3: Core Programme Model

- Implement multi-role/scope/team assignment model and history.
- Complete guardian, emergency, consent, and safety data model.
- Redesign admissions, interview rubrics, grouping, placement, and onboarding.
- Generalise sessions/activities and attendance for Shabab and team contexts
  while preserving offline behaviour.
- Consolidate member/family views and core reports.

Exit gate: admissions-to-enrolment-to-session-to-follow-up works end to end.

### Phase 4: Programme Delivery Operations

- Implement the four-category Content Planner.
- Implement Murabbi training content.
- Implement sessions, activities, events, planner tasks, calendar, and batch
  planner.
- Connect content plans to sessions and attendance.
- Add responsibility and delivery/completion reporting.

Exit gate: staff can plan, deliver, and review a full batch using the portal.

### Phase 5: Finance And Procurement

- Implement approved registration/event fee and donation policies.
- Expand exact-money finance to expenses, adjustments, approvals, and reports.
- Implement catalogue, stock, park allocation, requests, POs, receiving,
  transfers, and stock audit.
- Reconcile procurement expenses with finance.

Exit gate: financial and inventory totals reconcile and every sensitive action
has approval and audit evidence.

### Phase 6: Engagement And Knowledge

- Implement courses, books, and articles on the content foundation.
- Implement community only after safeguarding and moderation approval.
- Implement messaging only after communication-safety approval.
- Complete notification preferences, channel delivery, and failure handling.
- Complete member profiles with safe group/team/title context.

Exit gate: privacy, moderation, retention, reporting, and safety UAT pass.

### Phase 7: Restricted Pilot And Handover

- Create Pilot Production from the approved schema/migration process.
- Import/reconcile approved real data during a write freeze.
- Run role, data isolation, mobile, offline, payment, storage, notification,
  report, security, backup, rollback, and quota checks.
- Open the pilot only after signed release approval.
- Stabilise before adding features.
- Decide and execute paid-plan handover when provider terms or operational
  requirements demand it.

## 18. Release And UAT Gates

No phase or release is approved until its relevant checks pass.

### Automated gates

- Locked dependency installation and Prisma generation.
- Lint and TypeScript validation with no suppression.
- Unit/integration tests, including allowed and denied authorisation cases.
- SQLite and PostgreSQL production builds.
- Production dependency vulnerability audit.
- Sensitive tracked-file guard.
- Migration manifest, dry-run, import, and reconciliation tests.

### Role UAT

- Program Head: national dashboard, city governance, access, reports, audit.
- City Head: city-only parks/groups/people, admissions, events, reports, and
  cross-city denial.
- Park Lead: park operations, corrections/closures, team workflows, and
  cross-park denial.
- Park Admin: daily administration, attendance, enquiries, and restricted
  approval actions.
- Murabbi: only assigned groups/teams, content, approved attendance, and no
  unrelated family data.
- Guardian: only linked children, approved actions, and no other child data.
- Shabab: only own record and approved social/resource context.
- Super Admin: recovery paths tested but hidden from normal operations.

### Operational UAT

- Login, forced reset, deactivation, reassignment, and session revocation.
- Admissions submit, schedule, interview, decision, placement, conversion, and
  notification handoff.
- Mobile attendance online, offline, reconnect, conflict, close, reset, edit,
  and audit.
- Exact-money charge/payment/waiver/refund/expense and concurrent operations.
- Private file upload, access, expiry, deletion, and cross-scope denial.
- Notification queue, provider delivery, failure, retry, and quota behaviour.
- Excel export filters, scope, Urdu/Unicode, totals, and privacy.
- Backup, restore, deployment rollback, and incident runbook.

## 19. Engineering And Multi-Agent Working Rules

- One approved task, one owner, one narrow branch/file scope.
- No direct work on `main`.
- Re-read current files before editing and stop on overlapping changes.
- No agent receives or prints production secrets or unnecessary real data.
- Schema work requires forward migration, data impact, rollback/recovery, and
  Staging evidence.
- High-risk auth, financial, safeguarding, migration, and deployment design is
  owned or approved by Codex and the project owner.
- Other agents may implement narrowly approved tasks, but Codex performs final
  code review and approval.
- Every handoff states task ID, outcome, exact files, evidence, tests, security
  and data impact, rollback, dependencies, and remaining risks.
- No completion claim is accepted without tests or a precise explanation of
  why a test could not run.

Codex review focuses on:

- Behavioural correctness and regressions.
- Server-side authorisation and data isolation.
- Race conditions and transactional integrity.
- Personal data and safeguarding impact.
- Migration, rollback, and deployment safety.
- Mobile/offline behaviour.
- Tests for both success and failure paths.
- Scope discipline and maintainable code.

## 20. Product Decision Register

These decisions must be answered before their affected implementation starts.

### Programme and public information

1. Official programme description, audience, ages/classes, duration, current
   cities, weekly schedule, eligibility, and public contact information,
   including which details vary by city.
2. Whether Mind/Body/Soul is the official programme framework and the official
   names, definitions, and relationship of the four content categories.
3. Approved programme outcomes, skills, milestones, badges, certificates, and
   whether/how progress is assessed beyond attendance.
4. Which activities and camp types are national programme standards versus
   optional/local offerings, and the required level of parent engagement.
5. Public tuition-free wording and exact registration/event cost policy.
6. Whether admission applications are submitted directly from the public site,
   through a separate public campaign route, or entered by authorised staff.

### Organisation and roles

7. Final authority matrix for Program Head, City Head, Park Lead, Park Admin,
   and Murabbi.
8. Whether staff can hold multiple simultaneous roles, parks, groups, teams,
   and titles.
9. Team definitions, membership rules, POC/assistant rules, mentor-to-Shabab
   ratios, availability, approved staff training/clearance requirements, and
   assignment history.
10. Who creates, approves, deactivates, transfers, and overrides each
   organisational record.

### Admissions and safety

11. Final admission form fields, eligibility rules, referral/campaign data, and
    required documents.
12. Candidate and guardian interview rubrics, reviewers, scores, thresholds,
    recommendation, waitlist/hold, and final decision authority.
13. Age/class grouping bands, capacity, override, and reassignment rules.
14. Guardian verification, emergency, medical, allergy, dietary,
    transport/pickup,
    media, event/travel, and online-communication consent requirements.
15. Consent history/withdrawal, incident reporting/follow-up, activity/venue
    risk assessment, staff clearance, and safeguarding case rules.
16. Call/WhatsApp operating procedure and whether an API integration is ever
    required.

### Attendance and programme delivery

17. Final attendance statuses and whether `late`/`excused` affect warnings.
18. Which roles can create, mark, edit, reset, close, and reopen each attendance
    type.
19. Session types, attendance frequency, warning/dropout rules, leave handling,
    and manual correction process.
20. Curriculum planning cycle, Google Sheets migration ownership, content
    review/publishing, and delivery evidence.
21. Event/activity categories, safety requirements, capacity, consent, costs,
    and responsibility workflow.
22. Venue types, primary/backup locations, capacity/facilities, permissions,
    availability, safety details, emergency guidance, and who may view precise
    location information.

### Finance and procurement

23. Registration, event, donation, expense, discount, waiver, refund, and
    approval policies.
24. Supported payment methods and who can collect/record money, issue receipts,
    reverse transactions, view donor data, and close periods.
25. Inventory ownership, categories, valuation if any, stock locations, transfer, loss,
    damage, POs, receiving, and audit rules.

### Portals, communication, and community

26. Final guardian and Shabab portal capabilities, including whether guardians
    can update safety information, submit/withdraw consent, report absence,
    confirm attendance, or approve event participation.
27. Required notification channels, consent, urgency, templates, delivery
    expectations, and escalation for unread urgent notifications.
28. Exact LetsVibeIt-inspired community features and what is explicitly out of
    scope.
29. Messaging participant combinations, monitoring, moderation, reporting,
    attachments, and retention.
30. Which profile fields, groups, roles, teams, and titles are visible to whom.
31. Which courses/books/articles are public versus role-restricted and whether
    progress tracking is needed.

### Reporting, governance, and release

32. Final dashboards, KPIs, exception thresholds, reports, Excel formats, and
    recipients.
33. Final data-retention, audit-retention, privacy, safeguarding, incident,
    and data-protection impact policies.
34. Vercel/Supabase ownership, free-pilot eligibility, domain, sender domain,
    monitoring owner, backup owner, incident contacts, and handover trigger.

## 21. Definition Of Ready And Done

### A product task is ready when

- The owner-approved user and business outcome is clear.
- Roles and data scope are explicit.
- Inputs, outputs, states, exceptions, and permissions are defined.
- Safety/privacy, audit, notification, file, finance, and migration impact are
  assessed.
- Acceptance tests and out-of-scope boundaries are written.
- Dependencies and conflicting work are resolved.

### A task is done when

- The approved workflow works end to end.
- Server-side permissions deny invalid roles and scopes.
- Data is validated and persisted without silent loss.
- Transactions protect integrity where required.
- Desktop and required mobile/offline behaviour pass.
- Automated tests and relevant browser UAT pass.
- Lint, typecheck, and builds pass.
- Documentation and this blueprint are updated.
- Migration, deployment, monitoring, and rollback impacts are handled.
- Codex review is approved.

## 22. Source Register

### Authoritative working inputs

- [Product Vision Input 01](product-discovery/PRODUCT_VISION_INPUT_01.md)
- [Product Vision Input 02](product-discovery/PRODUCT_VISION_INPUT_02.md)
- [Programme Research And Gap Audit](product-discovery/SHABAB_PROGRAMME_GAP_AUDIT.md)

### Active hardening and delivery documents

- [Codex Build Tasks](CODEX_BUILD_TASKS.md)
- [Integrated Improvement Plan](IMPROVEMENT_PLAN.md)
- [Production Hardening Backlog](TASK_BACKLOG.md)
- [SQLite-To-Postgres Migration Design](MIGRATION_DESIGN.md)
- [Pilot Operations Runbook](OPERATIONS_RUNBOOK.md)
- [Audit Data Policy](AUDIT_DATA_POLICY.md)
- [Master Implementation Plan](MASTER_PLAN.md)

### Independent review evidence

- [API Inventory And Security Audit](reviews/api_inventory_review.md)
- [UI-To-API Integration Map](reviews/ui_to_api_integration_map.md)
- [Pilot Release Checklist](reviews/pilot_release_checklist.md)

### Supporting product synthesis

- [Kiro Product Consolidation](KIRO_PRODUCT_CONSOLIDATION.md): useful detailed
  product questions and safeguarding analysis. It is a supporting discovery
  report; this Codex master remains authoritative when the two differ.

### Reference requirements and refinement material

- [Project Working And Refinement Guide](reference/project-working-refinement-guide.md)
- [Implementation Plan](reference/implementation_plan.md)
- [Current Implementation Plan](reference/current-implementation-plan.md)
- [Architecture Plan](reference/ARCHITECTURE_PLAN.md)
- [System Description](reference/system-description.md)
- [Software Requirements Specification](reference/software-requirements-specification.md)
- [User Stories](reference/user-stories.md)

The reference set contains useful workflow detail but also stale Supabase Auth,
RLS, deployment, route, and completion claims. This master blueprint resolves
those conflicts for future work.

### Detailed legacy module specifications

- [Module 01: Auth Foundation](modules/MODULE_01_AUTH_FOUNDATION.md)
- [Module 02: City Operations](modules/MODULE_02_CITY_OPERATIONS.md)
- [Module 03: Park Attendance](modules/MODULE_03_PARK_ATTENDANCE.md)
- [Module 04: Dashboards](modules/MODULE_04_DASHBOARDS.md)
- [Module 05: Access Provisioning](modules/MODULE_05_ACCESS_PROVISIONING.md)
- [Module 06: Fees And Payments](modules/MODULE_06_FEES_PAYMENTS.md)
- [Module 07: Admissions](modules/MODULE_07_ADMISSIONS.md)
- [Module 08: Announcements](modules/MODULE_08_ANNOUNCEMENTS.md)
- [Module 09: Reports And Exports](modules/MODULE_09_REPORTS_EXPORTS.md)
- [Module 10: Family Portals](modules/MODULE_10_FAMILY_PORTALS.md)

These specifications remain implementation references only. Their schema,
route, and role assumptions must be checked against current code and approved
business rules before reuse.

### Original Antigravity documentation

- [Technical Documentation](antigravity/TECHNICAL_DOCUMENTATION.md)
- [User Documentation](antigravity/USER_DOCUMENTATION.md)
- [Proposed Improvements](antigravity/IMPROVEMENTS.md)

These are historical source materials, not current completion evidence.

## 23. Immediate Next Action

The next work item is not a new feature. The project owner should continue
sharing programme and operational information. Codex will map each new input to
this blueprint, identify contradictions and missing rules, and update the
decision register. When the product owner confirms the consolidated scope, we
will convert the approved roadmap into small tasks with dependencies,
acceptance tests, agent ownership, and Codex review gates.
