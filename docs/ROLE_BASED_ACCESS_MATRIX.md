# Shabab 360 Role-Based Access Matrix

**Status:** Draft target access model - product-owner approval required

**Last updated:** 2026-07-15

**Authority:** This matrix is derived from the
[Codex Master Blueprint](CODEX_SHABAB360_MASTER_BLUEPRINT.md). It describes the
recommended target permissions; it does not claim that the current application
already enforces every permission below.

## Access Legend

| Term | Meaning |
| --- | --- |
| `Full` | Manage across the authorised scope |
| `Scoped` | Manage only the assigned city or park |
| `Assigned` | Access assigned groups or teams |
| `View` | Read-only access |
| `Linked` | Access linked children only |
| `Own` | Access own information only |
| `TBD` | Product-owner decision required |
| `-` | No access |

## Recommended Target Matrix

| Module / Capability | Super Admin | Program Head | City Head | Park Lead | Park Admin | Murabbi | Guardian | Shabab |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Technical recovery | Full | - | - | - | - | - | - | - |
| National dashboard | Technical | Full | - | - | - | - | - | - |
| City dashboard | Technical | Full | Scoped | - | - | - | - | - |
| Park dashboard | Technical | View | View | Scoped | Scoped | Assigned | - | - |
| Cities | Technical | Full | View own | - | - | - | - | - |
| Parks | Technical | Full | Scoped | View assigned | View assigned | View assigned | - | - |
| Batches and groups | Technical | Full | Scoped | Scoped view | Scoped view | Assigned | View linked | View own |
| Teams and titles | Technical | Full | Scoped | Scoped | View assigned | Assigned | View linked | View own |
| Members directory | Technical | Full | Scoped | Park scoped | Park scoped | Assigned | Limited | Limited |
| Account provisioning | Recovery | Full | Scoped | - | - | - | - | - |
| Admissions policy | Technical | Full | View | - | - | - | - | - |
| Admissions processing | Technical | Oversight | Scoped | Park input | Enquiry/intake assistance | Interview input TBD | Own application | Own application |
| Interview decisions | Technical | Final/oversight | Scoped authority TBD | Recommendation TBD | - | Assessor TBD | View result | View result |
| Park/group allocation | Technical | Oversight | Full in city | Recommendation | Assistance | Recommendation | View | View |
| Shabab class attendance | Technical | Reports | Reports | Mark and correct | Mark | Assigned group TBD | View linked | View own |
| Team attendance in park | Technical | Reports | Reports | Mark and correct | Mark | Own/assigned TBD | - | - |
| Mashwara/training attendance | Technical | Reports | Reports | Mark and correct | - | Own attendance | - | - |
| Attendance session creation | Technical | Oversight | Scoped | Park scoped TBD | TBD | Assigned group TBD | - | - |
| Attendance event closing | Technical | Oversight | Scoped | Park scoped | TBD | TBD | - | - |
| Content approval/publishing | Technical | Full | City planning TBD | Park delivery oversight | View | Use and deliver | View approved | View approved |
| Murabbi training content | Technical | Full | Manage city TBD | View/monitor | View if required | Assigned content | - | - |
| Programme planner/calendar | Technical | Full | Scoped | Park scoped | Assigned tasks | Assigned tasks | View linked | View own |
| Events and activities | Technical | National oversight | Scoped | Park management | Operational support | Assigned responsibilities | View/consent | View/participate |
| Guardian consent | Technical only | Policy/report | Scoped monitoring | Park monitoring | Collect/verify TBD | View status TBD | Submit/withdraw | View own status |
| Emergency/medical data | Technical emergency only | Restricted oversight | Restricted | Restricted park need | Restricted operational need | Minimum necessary TBD | Manage linked child | Own access TBD |
| Finance policy/reports | Technical | Full | Scoped | View/approval TBD | Collection TBD | - | Linked charges | Own charges |
| Record payments | Technical | Full | Scoped | TBD | TBD | - | - | - |
| Donations | Technical | Full | Scoped TBD | - | - | - | Own receipt if applicable | - |
| Procurement catalogue/POs | Technical | Full | Scoped | Park requests/stock | Park assistance | Assigned items | - | - |
| Inventory allocation | Technical | Full | Scoped | Park responsibility | Park assistance | View assigned | - | - |
| Announcements | Technical | National | City scoped | Park scoped TBD | Operational TBD | Group scoped TBD | Read | Read |
| In-app notifications | Technical | Send/manage | Send/manage scoped | Park scoped TBD | Receive | Receive | Receive | Receive |
| Reports and exports | Technical | Global | City scoped | Park operational | Limited operational | Assigned-group TBD | Personal view | Personal view |
| Audit logs | Full | Full | - | - | - | - | - | - |
| Community | Technical moderation | Policy/moderation | Scoped moderation TBD | Moderation TBD | Moderation TBD | Supervised use TBD | Safety visibility TBD | Use TBD |
| Messaging | Technical investigation | Policy/oversight | Oversight TBD | Park oversight TBD | Operational TBD | Supervised messaging TBD | Linked communication TBD | Supervised use TBD |
| Own profile | Full | Own | Own | Own | Own | Own | Own | Own |

## Role Scope Summary

| Role | Default scope | Primary purpose |
| --- | --- | --- |
| Super Admin | Global technical scope | Recovery, security, and controlled system administration; not normal programme operations |
| Program Head / Markazi Masoul | National | Programme governance, standards, city oversight, planning, reporting, and approved administration |
| City Head / City Masoul | Assigned city | City operations, parks, batches, groups, people, admissions, and city reporting |
| Park Lead | Assigned park | Park leadership, approvals, attendance correction, team operations, and exception handling |
| Park Admin | Assigned park | Daily administration, attendance marking, records, enquiries, and operational assistance |
| Murabbi | Assigned groups/teams | Mentoring, content delivery, roster access, and approved attendance/follow-up |
| Guardian / Parent | Linked children | Child information, consent, required actions, notices, and approved communication |
| Shabab / Student | Own record | Own programme information, teams, schedule, resources, and approved engagement features |

## Pending Permission Decisions

The following permissions cannot be finalised until the project owner approves
their business and safeguarding rules:

1. Multi-role users and role/context switching.
2. Murabbi attendance rights.
3. Who creates and closes each attendance-session type.
4. Admissions interview and final-decision authority at each level.
5. Payment collection, waivers, refunds, reversals, and period-closing authority.
6. Guardian medical, emergency, and consent update workflow.
7. Community and adult-to-minor messaging permissions.
8. Park-level and group-level announcement authority.
9. Who can access medical, incident, staff-clearance, and safeguarding records.
10. Whether City Heads create access accounts directly or submit approval requests.
11. Which operational actions Park Admin can perform beyond attendance and enquiries.
12. Whether Program Head and City Head can directly perform park operations or only oversee/report on them.

## Safety Default

Any sensitive or undecided capability is denied until it is explicitly approved,
implemented server-side, and covered by allow-and-deny tests. Hiding a page or
button is not sufficient authorisation.

## Implementation Requirement

After product-owner approval, this matrix must be translated into:

- A server-side permission policy.
- Route and resource-scope rules.
- Role-aware navigation.
- Field-level rules for medical, financial, incident, and safeguarding data.
- Session invalidation when a role or assignment changes.
- Automated role-matrix tests for allowed and denied actions.
- Browser UAT for every role.
