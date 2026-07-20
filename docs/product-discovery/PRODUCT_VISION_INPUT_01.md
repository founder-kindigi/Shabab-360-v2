# Shabab 360 Product Vision Input 01

**Status:** Early working input - not final

**Source:** Product-owner notes supplied on 2026-07-15

**Purpose:** Preserve the initial product vision. This document is an input to
the final requirements, information architecture, implementation roadmap, and
gap analysis. It does not approve features, data fields, workflows, or scope
until the full set of inputs has been reconciled and signed off.

## Product Access

Shabab 360 has a public home page with information for the public. A login
button takes authorised users to a role-specific portal.

## Modules

- Admissions
- Attendance
- Content Planner
- Events, including swimming and trips
- Planner, including admission campaigns, inaugurations, closing ceremonies,
  and other operational events
- Calendar
- Finance
- Procurement, including inventory, purchase orders, and which park owns each
  inventory item
- Community
- Online Resources
- Messaging
- Notifications
- Members directory

## Users And Roles

- Program Head (Markazi Masoul)
- City Head (City Masoul)
- Park Lead
- Park Admin: completes administrative tasks, takes attendance, and responds
  to enquiries from people who visit parks
- Murabbi (Mentor)
- Guardian / Parent
- Shabab (Student)

## Admissions

### Required Workflow

1. Candidate submits an admission form.
2. The team schedules an interview.
3. The candidate receives the interview slot by call and WhatsApp message.
4. Registration fees are collected where applicable.
5. The candidate interview takes place.
6. A guardian interview takes place.
7. Reviewers record marks, remarks, score or rating, and status.
8. The approved candidate is allocated to a park.
9. The enrolled student is assigned to a group.
10. A Murabbi is assigned.

### Recommended Statuses

`New` -> `Interview Scheduled` -> `Interviewed` -> `Approved` -> `Enrolled`

Alternative terminal or paused statuses: `Rejected` and `Hold`.

## Attendance

- Groups should be created automatically from a student's age and class, with
  a manual option to create, change, or update the grouping.
- Park Admin marks Shabab attendance for each group.
- Park Lead can modify Shabab attendance.
- Team attendance is supported.
- In-park class attendance is marked by Park Admin and can be modified by Park
  Lead.
- Attendance for Mashwara and training is marked by Park Lead.

## Content Planner

- Shabab class content is organised under four categories.
- The content is provided for Murabbis to use in Shabab classes.
- A separate section is available for Murabbi training content.
- Content is currently managed in Google Sheets and needs to be maintained in
  the portal.

## Calendar And Batch Planner

- An event calendar displays events, meeting links, and planned activities.
- Examples include admission timelines, park hunting, and related activities.
- A batch planner holds dates for batch-specific events.

## Finance

- Registration fees
- Donations
- Event fees for trips and special activities
- Sports and other purchases

## Procurement And Inventory

- A list of all items and their quantities.
- Visibility into how many items are assigned to each park.
- A primary point of contact for each park, with an assistant.
- Purchase orders.

## Community

The community feature should be similar in concept to [LetsVibeIt](https://letsvibeit.com).

## Online Resources

- Courses
- Books
- Articles

## Messaging

Users can send and receive messages through the portal, like a small internal
messenger.

## Teams, Groups, And Titles

Each team member in the system must be mapped to these organisational
dimensions:

- Park
- Group
- Role
- Team, for example Sports, Skills, or Tadreeb

## Notifications

The system must support notifications to team members, Shabab, and guardians.

## Events And Responsibility Assignment

Operational events, such as the admission process and admission campaign, can
be added and assigned to responsible people.

## Members And Profiles

- A members page lists all members with filters.
- A user's profile, and their community posts, show their joined groups, teams,
  and all other roles.

## Important Items To Define During Consolidation

The following points are intentionally left open in the source notes and must
be defined before implementation:

- The four Shabab class content categories and their learning structure.
- Which finance items are optional, required, waived, refundable, or specific
  to a programme, event, city, park, or student.
- The exact admissions data, interview rubric, approval authority, and WhatsApp
  integration process.
- Age/class grouping rules, exceptions, group capacity, and reassignment
  authority.
- The distinction between programme events, operational planning work, and
  class sessions.
- Inventory ownership, transfer, loss, approvals, and stock-audit workflows.
- Community moderation, privacy, media, and safeguarding rules.
- Messaging participants, retention, reporting, moderation, and safeguarding
  rules.
- The role-permission matrix and whether users may hold multiple roles, parks,
  groups, or teams.
- Notification channels, templates, consent, delivery tracking, and escalation
  rules.

## Relationship To Existing Documents

This is the first product-owner vision input. It should be reconciled with:

- [Shabab Programme Gap Audit](SHABAB_PROGRAMME_GAP_AUDIT.md): public programme
  research and the current application gap audit.
- [Improvement Plan](../IMPROVEMENT_PLAN.md): existing technical hardening and
  deployment plan.
- Future product-owner inputs before creating implementation tasks.
