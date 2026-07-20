# Shabab Alburhan Programme Research And Product Gap Audit

> Status: Discovery evidence only. No application behaviour or data model has been changed by this audit.
>
> Date: 2026-07-15
>
> Purpose: Preserve public research on Shabab Alburhan and compare it with the current Shabab360 application before defining the product vision and implementation roadmap.

---

## 1. Public Programme Research

### 1.1 What Shabab Alburhan is

Public Al-Burhan material positions Shabab Alburhan as a youth leadership and development programme within the wider Al-Burhan network. Its stated orientation combines Islamic learning, personal and spiritual development, guidance, community service, leadership, and character development.

- The programme is publicly presented around the Mind, Body, Soul framework.
- It is publicly advertised for boys in grades 9-12 and O/A Levels; current public promotions also describe an approximate 14-19 age range.
- Admissions are selective, with limited seats, application, and shortlisted-candidate interviews.
- Public material describes the programme as tuition-free and weekend-based.

Sources:

- [Official Al-Burhan Shabab announcement](https://www.linkedin.com/posts/alburhanorg_introducing-youth-training-program-as-shabab-activity-7102272655529025536-ZR0L)
- [Al-Burhan Sialkot courses](https://alburhansialkot.org/our-courses/)
- [Mufti Syed Adnan Kakakhail profile](https://muftiadnankakakhail.com/about-mufti-adnan-kakakahail/)

### 1.2 Publicly described operating pattern

Public material indicates that programme details can vary by city or cohort.

- Earlier official material described a one-year, weekend, on-campus programme.
- Recent Lahore material describes a 6+ month, weekend programme conducted at selected public parks.
- Public Islamabad material describes three-hour weekend sessions and activities including camping, outdoor survival, hiking, archery, swimming, teamwork, problem-solving, leadership, public speaking, and life skills.
- Public posts indicate mentor-led groups, winter camps, tarbiyah/recreational camps, and parent engagement.
- A recent public repost states that Shabab and Atfal are offered in 15+ cities. This scale and the exact city list must be confirmed from internal records before it is treated as product truth.

Sources:

- [Lahore programme material](https://pk.linkedin.com/in/khawaja-anas-ibrahim-82b651198)
- [Islamabad programme material](https://pk.linkedin.com/in/abdullah-yousafzai)
- [Public mentor/programme material](https://pk.linkedin.com/in/salman-umar-dogar-435046137)
- [Public city-scale promotion](https://pk.linkedin.com/in/adeel-baloch-32102651)

### 1.3 Internal facts still required

The following must come from Al-Burhan programme leadership, not internet research:

- Official current city, venue, cohort, and participant counts.
- Standard duration, weekly schedule, and whether they differ by city.
- Curriculum, Mind/Body/Soul tracks, milestones, and completion rules.
- Mentor hierarchy, responsibilities, and assignment policy.
- Guardian consent, medical, transport, camp, incident, and safeguarding procedures.
- Whether camps, rescue training, robotics, sports, and other skills are standard modules or locally optional activities.

---

## 2. Current Application Strengths

The current app is a useful operational foundation. It already provides:

- City, park, batch, and group hierarchy.
- Participants and guardian-to-participant links.
- Role and scope authorization for HQ, city, park, murabbi, guardian, and student users.
- Admission stages, interviews, and conversion to participant records.
- Session attendance with present, absent, late, and excused states.
- Offline-capable attendance workflows and consecutive-absence alerts.
- Dashboards, announcements, notifications, audit logs, reports, and certificate generation.

This foundation should be preserved while the product is reshaped around Shabab's actual operations.

---

## 3. Programme-Fit Gap Audit

### P0 - Admissions silently loses information

The admissions form asks staff for emergency contact, emergency phone, previous education, and reference details. The form sends these values to the API, but the API validation schema and Prisma model do not accept or save them. Zod removes the unknown fields, so staff can believe the data was captured when it was not.

Evidence:

- UI state and fields: [admissions-page.tsx](../../src/components/modules/admin/admissions-page.tsx#L359), [admissions-page.tsx](../../src/components/modules/admin/admissions-page.tsx#L491), [admissions-page.tsx](../../src/components/modules/admin/admissions-page.tsx#L990)
- API validation and persistence: [admissions route](../../src/app/api/admin/admissions/route.ts#L16), [admissions route](../../src/app/api/admin/admissions/route.ts#L114)
- Stored admission fields: [schema](../../prisma/schema.prisma#L311)

Impact: This must be fixed before the admissions form is trusted for a youth programme.

### P1 - No safeguarding, consent, medical, transport, or incident model

The data model stores basic guardian and participant records, but has no records for guardian consent, emergency contact, medical/allergy needs, pickup/transport arrangements, incidents, camp risk assessment, staff clearance, or safeguarding case handling.

Evidence:

- Guardian fields: [schema](../../prisma/schema.prisma#L140)
- Participant fields: [schema](../../prisma/schema.prisma#L171)
- Attendance-only event model: [schema](../../prisma/schema.prisma#L211)

Impact: The current model is not ready for a minors programme with outdoor sessions, public-park activities, camps, or travel.

### P1 - No Mind/Body/Soul curriculum or participant development record

The app cannot record curriculum tracks, lesson plans, skills, badges, leadership development, mentor observations, behaviour, or programme outcomes. Every activity is represented only as a generic attendance event.

Certificates use attendance rate and total attendance events; they do not prove progression or completion of a defined programme.

Evidence:

- Attendance event model: [schema](../../prisma/schema.prisma#L211)
- Certificate calculation: [certificate route](../../src/app/api/admin/certificates/[participantId]/route.ts#L81)

Impact: The product cannot demonstrate whether Shabab is delivering its stated development outcomes.

### P1 - Sessions are not planned programme activities

Session creation accepts only a group, title, and date. It prevents more than one event per group on the same day. The model has no activity type, duration, venue, trainer, capacity, equipment, session objective, or participant preparation.

Evidence:

- Event input: [attendance event route](../../src/app/api/park/attendance/events/route.ts#L15)
- One-event-per-group-per-day check: [attendance event route](../../src/app/api/park/attendance/events/route.ts#L50)
- Persisted data: [attendance event route](../../src/app/api/park/attendance/events/route.ts#L64)

Impact: It cannot represent camps, multiple activity blocks, sports sessions, workshops, field activities, or a structured weekend programme.

### P1 - Schedule is retrospective, not an operational calendar

The park schedule reads existing attendance events for a week and infers typical meeting days from historical events. It does not create or publish a future session plan, manage recurring schedules, notify guardians of changes, collect confirmation, or operate a camp itinerary.

Evidence:

- Existing-week events: [park schedule](../../src/app/api/park/schedule/route.ts#L104)
- Historical inference: [park schedule](../../src/app/api/park/schedule/route.ts#L120)
- Typical-day calculation: [park schedule](../../src/app/api/park/schedule/route.ts#L129)

### P1 - Admissions is too shallow for selective youth-programme intake

The app includes an application status flow and three generic interview scores, but lacks configurable eligibility, screening rubric, assessor panel, capacity and waitlist handling, consent capture, education history persistence, referral tracking, parent interview, or structured reasoned decisions.

Accepted applications are converted directly into an active participant and an optional guardian record.

Evidence:

- Admission fields: [admissions route](../../src/app/api/admin/admissions/route.ts#L16)
- Interview implementation: [interview route](../../src/app/api/admin/admissions/[id]/interviews/route.ts)
- Conversion input: [conversion route](../../src/app/api/admin/admissions/[id]/convert/route.ts#L9)
- Participant creation: [conversion route](../../src/app/api/admin/admissions/[id]/convert/route.ts#L78)

### P1 - Location model is too simple

A Park has only a name, city, and address. Shabab operations need flexible venues such as public parks, indoor backup locations, camp sites, meeting points, capacities, operating hours, safety notes, and venue-specific staff assignments.

Evidence:

- Park model: [schema](../../prisma/schema.prisma#L67)
- Batch model: [schema](../../prisma/schema.prisma#L84)
- Group model: [schema](../../prisma/schema.prisma#L102)

### P1 - Mentor operations are under-modelled

Each staff member has one role and at most one assigned city, park, and group. The model cannot represent a mentor team across groups, coach specialities, availability, training, safeguarding clearance, participant ratios, or mentor performance.

Evidence:

- Staff assignment model: [schema](../../prisma/schema.prisma#L121)
- Existing role navigation: [sidebar](../../src/components/layout/sidebar.tsx#L158)

### P2 - Guardian experience is tracking-only

Guardians can view attendance, schedule, fees, and announcements. They cannot submit consent, update emergency/medical details, confirm attendance, report absence, approve trips, receive event-specific instructions, or access a consent history.

Evidence:

- Guardian navigation: [sidebar](../../src/components/layout/sidebar.tsx#L165)
- Guardian schedule response: [guardian schedule](../../src/app/api/guardian/schedule/route.ts)

### P2 - Fees are too central to the current product

Fees appear in the HQ, guardian, and student experiences, although public Shabab admissions material says there is no tuition fee. Financial features may remain for future optional use, but they should not define the core product experience.

Evidence:

- Role navigation: [sidebar](../../src/components/layout/sidebar.tsx#L159)

### P2 - Reports measure attendance and fees, not programme health

Current reporting focuses on attendance and fees. It lacks admission-funnel, cohort-capacity, mentor-ratio, consent-completion, planned-vs-delivered session, activity participation, camp-readiness, retention, development-outcome, and safeguarding reporting.

Evidence:

- Attendance reporting: [reports page](../../src/components/modules/admin/reports-page.tsx#L1078)
- Fee reporting: [reports page](../../src/components/modules/admin/reports-page.tsx#L1223)

---

## 4. Product Conclusion

Shabab360 is a solid attendance-and-administration foundation, but it is not yet a Shabab youth-programme operating system. The required work is a product rebase around the programme's actual operating model, not cosmetic UI changes.

Before implementation, the product vision document should define:

1. Participant lifecycle from application through alumni/completion.
2. Programme entities: city, venue, cohort, group, session, activity, camp, curriculum track, and milestone.
3. Role hierarchy and mentor assignment model.
4. Guardian communications, consent, safeguarding, and incident processes.
5. Minimum data that should be collected, retained, and visible to each role.
6. Reports and success measures that matter to programme leadership.

When leadership provides the internal vision and operating facts, this document should be used to produce the target data model, workflow map, screen inventory, and safe implementation order.
