# Access Management Matrix

**Status:** Owner-approved soft-launch policy baseline

**Authority:** This matrix supplements [ROLE_BASED_ACCESS_MATRIX.md](ROLE_BASED_ACCESS_MATRIX.md). It defines how access is administered. It does not weaken the server-side city, park, group, participant, guardian, financial, or audit scope checks.

## Policy Decisions

1. Every user has a canonical role. The role grants a default set of module capabilities.
2. A named-user override may grant or remove a module capability beyond the role default, but only within the user's existing approved organization scope.
3. An override never changes canonical role, city, park, group, participant, guardian, or financial scope. Those require separate, audited assignment changes.
4. During soft launch, Super Admin alone manages role defaults and individual capability overrides. A City Head may provision and manage Park Leads, Park Admins, and Murabbis inside the assigned city only.
5. A City Head never manages Super Admin, Program Admin, City Head, global role defaults, individual capability overrides, Cities, or cross-city staff.
6. Every access change is audited and invalidates the changed user's active sessions immediately.
7. Unlisted modules and undecided sensitive actions are denied by default.

## Capability Catalogue

Access is granted to fixed capabilities. It is never free-text or a custom route name.

| Code | Capability | Soft-launch status |
| --- | --- | --- |
| `dashboard.view` | Role dashboard and scoped operational summary | Available |
| `organisation.view` | Scoped parks, batches, and groups | Available |
| `organisation.manage` | Cities, parks, batches, and groups | Available foundation |
| `people.view` | Scoped member directory and profiles | Available foundation |
| `students.manage` | Scoped student roster and record management | Available foundation |
| `guardians.manage` | Scoped guardian records and links | Available foundation |
| `admissions.manage` | Admissions pipeline and decisions | Available foundation |
| `attendance.mark` | Create and mark Shabab class attendance | Available foundation |
| `attendance.correct` | Edit, reset, close, or reopen attendance | Available foundation |
| `fees.manage` | Fee events, payments, waivers, and receipts | Available foundation |
| `announcements.manage` | Publish scoped announcements | Available foundation |
| `reports.view` | Scoped reports and exports | Available foundation |
| `audit.view` | Redacted audit-log access | Available foundation |
| `settings.manage` | Controlled system settings | Available foundation |
| `access.role_defaults.manage` | Role-to-capability defaults | New Access Management module |
| `access.user_overrides.manage` | Named-user capability overrides | New Access Management module |
| `access.scope.manage` | Canonical role plus city, park, and group assignment | New Access Management module |
| `access.city_staff.manage` | City-scoped staff provisioning and lifecycle actions | Available for City Head |

Future modules, including events, planner, procurement, inventory, messaging, community, content, team attendance, Mashwara attendance, and safeguarding, have no soft-launch capability grants until their requirements and server enforcement are implemented.

## Default Role Matrix

| Capability | Super Admin | Program Admin | City Head | Park Lead | Park Admin | Murabbi | Guardian | Shabab |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dashboard.view` | Global | Global | City | Park | Park | Assigned groups | Linked children | Own |
| `organisation.view` | Global | Global | City | Assigned park | - | - | - | - |
| `organisation.manage` | Global | Global | City | - | - | - | - | - |
| `people.view` | Global | Global | City | - | - | - | Limited linked | Own |
| `students.manage` | Global | Global | City | - | - | - | - | Own profile request only |
| `guardians.manage` | Global | Global | City | - | - | - | Own record | - |
| `admissions.manage` | Global | Global | City | - | - | - | Own application | Own application |
| `attendance.mark` | Global | Global oversight | City | Park | Park | Assigned groups | - | - |
| `attendance.correct` | Global | Global oversight | City | Park | - | - | - | - |
| `fees.manage` | Global | Global | City | - | - | - | View linked | View own |
| `announcements.manage` | Global | Global | City | - | - | - | - | - |
| `reports.view` | Global | Global | City | - | - | - | Linked children | Own |
| `audit.view` | Global | Global read-only | - | - | - | - | - | - |
| `settings.manage` | Global | Global limited | - | - | - | - | - | - |
| `access.role_defaults.manage` | Global | - | - | - | - | - | - | - |
| `access.user_overrides.manage` | Global | - | - | - | - | - | - | - |
| `access.scope.manage` | Global | - | - | - | - | - | - | - |
| `access.city_staff.manage` | Global | - | City staff only | - | - | - | - | - |

`Global` means global only where the capability is appropriate. Server-side sensitive-data rules and resource scope checks still apply. `City`, `Park`, and `Assigned groups` must match the current user's database assignment. `-` means denied.

## Individual Override Rules

### Allowed

- Grant or remove a capability for one named user within their approved city, park, or group scope.
- Add a time-bounded reason and optional expiry to every override.
- Override a role default when a documented operational need exists.

### Never allowed by an override

- Elevate a person to another canonical role.
- Add city, park, or group scope.
- Grant global access to a city-, park-, or group-scoped user.
- Bypass participant, guardian, finance, audit, safeguarding, or data-isolation checks.
- Grant any unimplemented, deferred, or unapproved module.
- Allow an inactive account to access any module.

## Access Management Administration

### Soft launch

| Action | Super Admin | Program Admin | City Head | Other roles |
| --- | --- | --- | --- | --- |
| Manage role defaults | Allow | Deny | Deny | Deny |
| Assign canonical roles and scope | Allow | Deny | Park Lead, Park Admin, and Murabbi in own city | Deny |
| Create, edit, revoke user overrides | Allow | Deny | Deny | Deny |
| Read access-change audit | Allow | Read-only | Deny | Deny |

### City Head staff delegation

This delegation is enabled only for the narrow, server-enforced lifecycle
actions below. City isolation remains a staging UAT gate.

| Action | City Head boundary |
| --- | --- |
| Provision, activate, deactivate, reset, assign role or scope | Only Park Leads, Park Admins, and Murabbis assigned to the same city |
| Manage user overrides | Deny |
| Edit global role defaults | Deny |
| Manage Super Admin, Program Admin, or City Head access | Deny |
| Grant global/sensitive capabilities | Deny |
| View access audit | City-scoped, redacted, if separately approved |

## Enforcement Requirements

1. Module checks run on the server before every protected action; navigation hiding is only a usability improvement.
2. Resource-scope checks run after module authorization. Both must allow the request.
3. An explicit individual denial wins over a role default grant.
4. An override grant must be approved by the fixed capability catalogue and the Super Admin-defined override policy; it may extend the role default but never the user's organization scope or a protected data boundary.
5. All create, change, revoke, expiry, role, and scope actions write redacted audit records.
6. Role, scope, or override changes increment `tokenVersion` in the same database transaction, invalidating existing sessions.
7. Each capability has allow and deny tests for all relevant role and scope boundaries before release.

## Implementation Order

1. Approve this capability catalogue and default matrix.
2. Add versioned PostgreSQL and SQLite schema changes for role defaults, user overrides, expiry, and redacted access audit data.
3. Build server-side authorization composition: canonical role default plus override plus immutable resource scope.
4. Build the Super Admin Access Management workspace.
5. Add tests, migration/reconciliation tests, and role-based browser UAT.
6. Enable only the available soft-launch capabilities.
7. Complete City Head city-isolation UAT before expanding delegation beyond the approved staff lifecycle boundary.
