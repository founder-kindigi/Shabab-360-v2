# Shabab 360 User-Perspective Requirements

**Purpose:** Describe the Shabab 360 requirements in the language of the people
who use the programme, rather than in terms of screens, APIs, or database
tables.

**Status:** Working requirements baseline, prepared from the master blueprint,
role matrix, current application structure, and current project-scope material.
It intentionally separates the desired product from features that are only a
foundation today. It is not a statement that every item is ready for public or
pilot use.

## 1. What users need Shabab 360 to do

Shabab 360 must help Shabab Alburhan run a safe, repeatable youth-development
programme across cities and parks. It should give each person one clear place
to do their work or see their own information, while preventing them from
seeing data or controls outside their responsibility.

In practical terms, the platform must enable the programme to:

- introduce the programme and receive approved admissions enquiries;
- organise cities, parks, batches, groups, staff, guardians, and Shabab;
- plan and deliver sessions, activities, events, and meetings;
- record attendance quickly, including when park connectivity is poor;
- keep families informed through approved, safe communication;
- make operational issues visible early enough for someone to act;
- handle approved fees, donations, expenses, and stock with traceable records;
- report accurately at the appropriate national, city, park, group, and family
  level; and
- protect youth, family, staff, and operational data throughout.

## 2. Users and their needs

### 2.1 Public visitor or applicant

As a visitor, I need to understand what the programme is, who it is for, where
it operates, what participation involves, and how to apply, so that I can make
an informed decision before sharing personal information.

The public experience must provide:

- a clear programme overview, eligibility and location information, activities,
  frequently asked questions, and approved contact details;
- an application path that asks only for approved, necessary information;
- clear next steps after application and, if approved later, a safe way to
  check application status; and
- a separate portal login. Internal staff roles must not be publicly
  self-registerable.

### 2.2 Program Head / Markazi Masoul

As a Program Head, I need a national view of programme health and exceptions,
so that I can set standards, support cities, and make informed decisions without
having to manage each local task myself.

The HQ workspace must enable me to:

- oversee authorised cities, City Heads, programme delivery, admissions,
  attendance, reporting, and approved national planning;
- spot important exceptions, such as missing local coverage, operational gaps,
  attendance pressure, or unresolved risks, and go directly to the relevant
  action;
- manage national communications and access only where the approved authority
  matrix allows it;
- receive reports and exports at national or safely filtered local scope; and
- review an appropriately redacted audit trail of important actions.

### 2.3 City Head / City Masoul

As a City Head, I need to run the programme in my assigned city, so that parks,
groups, people, admissions, attendance, and local operations remain healthy.

The city workspace must enable me to:

- manage only the authorised parks, batches, groups, staff, Shabab, guardians,
  and operational records in my city;
- identify and resolve local exceptions, including unassigned people, groups
  without suitable coverage, attendance issues, and data-quality gaps;
- manage local admissions, placement, announcements, reports, and approved
  operational functions;
- provision or manage only the staff roles and scopes delegated for that city;
- view city-scoped reporting and audit information; and
- never create, manage, or access other cities, HQ-only administration, or
  capability-policy settings.

### 2.4 Park Lead and Park Admin

As a Park Lead or Park Admin, I need a fast daily operations workspace, so that
I can prepare sessions, manage the park roster, record attendance, and follow
up on local issues.

The park workspace must enable authorised users to:

- see today’s sessions, the next needed action, attendance state, and sync
  health for their assigned park;
- access only their park’s groups, Shabab, family contacts, and schedule;
- create, mark, close, reopen, or correct attendance only when their approved
  role and scope permit it;
- record attendance on a mobile device even when connectivity is unreliable,
  with clear indication of queued, synced, failed, and conflicting changes;
- see and resolve local exceptions, such as missing attendance or failed sync;
- use approved content, events, inventory requests, and communication tools
  where those modules and permissions have been approved; and
- never access another park merely because a navigation item or direct URL is
  known.

Park Leads may have approval and correction responsibilities that Park Admins
do not. The exact rights for each attendance context must be explicitly
approved and enforced before release.

### 2.5 Murabbi

As a Murabbi, I need a focused view of my assigned group and delivery duties,
so that I can prepare meaningful sessions, mentor Shabab, and complete the
attendance or follow-up actions I am authorised to perform.

The Murabbi workspace must enable me to:

- see only my assigned groups, Shabab, approved team work, schedule, and
  notices;
- receive the approved session plan, objectives, materials, delivery guidance,
  and training content relevant to my assignment;
- record attendance only for the assigned group and only within the approved
  workflow;
- see appropriate follow-up and attendance information without unnecessary
  sensitive family or safeguarding data; and
- receive relevant notifications and approved operational tasks.

### 2.6 Guardian / parent

As a guardian, I need a simple, private view of each child linked to me, so
that I can keep up with the programme and take approved required actions.

The guardian portal must enable me to:

- see only my linked child or children;
- view each child’s approved schedule, attendance history, notices, and
  approved fee or event-payment information;
- receive requests for consent, information, or other approved family actions
  when this workflow is formally enabled;
- use approved communication channels to contact the programme or respond to
  an authorised request; and
- understand empty, delayed, or failed states without exposure to another
  family’s information.

### 2.7 Shabab / student

As a Shabab participant, I need a clear view of my own programme journey, so
that I know where to be, what to prepare, and how I am progressing.

The Shabab portal must enable me to:

- view only my own profile, group/team context, schedule, attendance,
  announcements, and approved fee information;
- access programme resources, courses, books, and articles that are published
  for my audience;
- see only approved progress, roles, titles, or activity information; and
- participate in communication or community features only after their safety,
  supervision, moderation, consent, and reporting rules have been approved.

## 3. Shared user journeys

### 3.1 Admission to enrolment

An applicant and guardian must be able to move through a controlled journey:

`New → Interview scheduled → Interviewed → Approved → Enrolled`

`Hold` and `Rejected` are valid alternative outcomes. Authorised staff need to
capture the approved application, conduct and record interviews, retain the
decision history, assign the accepted Shabab to the correct city, park, batch,
and group, and create any necessary guardian or participant access without
duplicating the person. Sensitive admission and safety information must not be
silently lost or shown outside its authorised audience.

### 3.2 Programme planning and delivery

Programme staff need to turn a batch plan into actual delivery. They must be
able to distinguish and connect sessions, activities, operational events,
calendar entries, and delivery tasks. A planned event must have the approved
scope, audience, venue, capacity, cost, consent/safety needs, responsible
people, checklist, status, and review record.

Temporary responsibilities such as Calling POC, Security, Parking, or Welcome
must be dated operational assignments. They must not become permanent login
roles or broaden a person’s normal access.

### 3.3 Attendance and follow-up

For every approved attendance context, authorised staff need to select the
right session and roster, mark a status, see the result immediately, and know
whether it has synchronised. If offline, the application must safely queue the
latest local change, show its state, retry when possible, and leave failures
or conflicts visible until resolved.

Attendance changes, corrections, closure, reopening, warning rules, and
follow-up must be governed by role, location, group, and approved attendance
policy. Families and Shabab may see their own approved history, not internal
staff notes or other participants’ records.

### 3.4 Meetings and team collaboration

Where Weekly Mashwara is enabled, a meeting lead needs to schedule the meeting,
manage authorised attendance, record Karguzari/minutes, decisions, blockers,
and action items, then review and close the record so it cannot be silently
rewritten. Team members may contribute only within their approved, scoped
meeting access. Collaboration-team membership must never grant wider city,
park, or group access.

### 3.5 Finance, procurement, and inventory

When the programme approves these policies, authorised operators need to
record registration or event charges separately from donations and expenses,
issue receipts, record adjustments with approval history, and report exact PKR
totals. The system must not present generic recurring tuition dues unless that
policy is expressly approved.

For stock, authorised users need to request, approve, receive, allocate,
transfer, return, count, and adjust items with accountable ownership and a
traceable record. Financial and stock reports must reconcile to the underlying
transactions.

## 4. Requirements every user should experience

### Access, privacy, and safety

- Each user must sign in through a controlled account and be routed to the
  correct workspace.
- A user’s effective access must be limited by active account status, role,
  approved capability, and city/park/group/resource context. Missing required
  scope means access is denied.
- Server-side checks must protect every sensitive read and write; hiding a menu
  item is never sufficient protection.
- Account deactivation, role changes, and scope reassignment must promptly
  invalidate existing access.
- Guardians see linked children only; Shabab see their own record only.
- Users must see only the minimum personal and sensitive information necessary
  for their task. Medical, emergency, incident, safeguarding, financial,
  clearance, and private-file data require separately approved access rules.
- Important access, attendance, admission, financial, and stock actions must
  be traceable without storing passwords, credentials, or unnecessary personal
  data in logs.

### Clarity and usability

- Every workspace must use programme language consistently: Program Head, City
  Head, Park Lead, Park Admin, Murabbi, Guardian, and Shabab.
- Dashboards must prioritise the next real action and meaningful exceptions,
  rather than only presenting decorative totals.
- Users must receive understandable loading, empty, validation, permission,
  offline, and error feedback, with a safe recovery path where possible.
- Core field operations, particularly attendance, must work well on a mobile
  phone. Dates should follow the approved Pakistan time-zone convention and
  approved financial amounts must display in PKR.
- Exports must be scoped to the requester’s authorised data and support the
  approved Excel/Urdu layout requirements.

### Data quality and reliability

- The platform must have one authoritative record for each programme fact;
  duplicate dashboards or separate workflows must not create competing truth.
- Forms must validate bounded, meaningful input and report what needs fixing.
- High-impact workflows must preserve data integrity and avoid partial or
  silent loss of information.
- Users must be able to rely on accurate attendance, payment, receipt,
  assignment, and report totals within their authorised view.

## 5. Delivery boundaries

The immediate user need is a stable Lahore-backed core: existing role journeys,
scope restrictions, mobile/offline attendance, data quality, and error/empty
states must be corrected and accepted in staging before broad expansion.

The following areas are important but must remain policy-gated or later-phase
work until their rules are approved and tested:

| Area | Boundary before release |
| --- | --- |
| Safeguarding and consent | Approve data fields, who can see them, incident handling, transport/pickup, media, medical, and retention rules. |
| Community and messaging | Approve age-appropriate communication paths, adult/minor boundaries, moderation, reporting, blocking, consent, retention, and escalation. |
| External notifications | Approve channels, templates, consent/eligibility, delivery monitoring, failure handling, and provider integration. |
| Finance and stock | Approve fees, donations, expenses, waivers, refunds, purchasing, ownership, and reconciliation policy. |
| Content, events, and Mashwara | Approve official content categories, publishing/review roles, event safety rules, venue data, and meeting authority. |
| Public/pilot launch | Complete role and denial UAT, staging/backup/restore evidence, storage and notification readiness, monitoring, rollback planning, and owner release approval. |

## 6. Decisions required from the programme owner

The following decisions directly affect what users can safely do and should be
confirmed before the related work is treated as final:

1. Official programme description, audience, age/class bands, duration,
   locations, contacts, and public fee wording.
2. Final authority matrix, including simultaneous roles, role switching,
   attendance rights, and approval/delegation boundaries.
3. Admission eligibility, required fields, interview rubric, capacity,
   placement, grouping, and transfer rules.
4. Guardian, emergency, medical, transport, media, online-communication,
   incident, and staff-clearance policies.
5. Content framework, assessment/progress expectations, training requirements,
   event categories, venue standards, and meeting responsibilities.
6. Fee, donation, expense, stock, waiver, refund, approval, and reconciliation
   policies.
7. Portal actions, notification channels and consent, report/Excel formats,
   privacy/retention policy, and pilot release ownership.

## 7. Acceptance from a user’s point of view

This requirements baseline is met only when representative users can complete
their approved end-to-end journeys using realistic data; prohibited roles and
out-of-scope users are denied; mobile/offline behaviour works where promised;
important records persist accurately; and the programme owner accepts the
workflow, safety, privacy, and operational outcomes.

## 8. Source and maintenance notes

Planning authority: [Master Blueprint](CODEX_SHABAB360_MASTER_BLUEPRINT.md).
Supporting sources: [Role-Based Access Matrix](ROLE_BASED_ACCESS_MATRIX.md),
[System Description](reference/system-description.md), and current application
routes/components. Current code and fresh verification evidence take precedence
where older documentation conflicts.

Update this document whenever an owner decision changes roles, workflow,
safeguarding, data ownership, or release scope.
