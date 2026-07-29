# TEAM-006: Collaboration Workspace Owner Decisions

**Status:** Partially approved. Activity planner implementation remains blocked
until the canonical Teams API is selected. Chat and document-link policy
decisions below are approved for the subsequent implementation package.

## Approved Decisions

### Chat Retention

Team chat messages are retained until the associated collaboration team is
archived. Archiving must make the messages read-only and preserve them for
audit and historical context. The implementation must not use automatic
90-day deletion.

### Document-Link Policy

Document-link domains and the external redirect warning are configurable
settings, not hard-coded allowlists.

- Super Admin may manage global policy and city policy.
- City Head may manage policy for the actor's server-derived city only.
- A City Head must never create, edit, or remove policy for another city.
- Every policy change requires an audit record containing the city scope,
  domain, enabled state, redirect-warning state, actor, and timestamp. URLs
  and document titles are not audit payloads.
- Link registration remains fail-closed unless a matching enabled domain policy
  exists for the target team city.
- Each enabled domain policy has an independently configurable redirect-warning
  toggle. When enabled, the application shows an internal warning page before
  navigation. When disabled, the application may navigate directly only to a
  matching enabled domain.

### Inactive Staff Memberships

Deactivating a staff profile does not delete or automatically end the related
team-membership rows. Existing chat messages, activities, and other
contributions remain visible in historical context.

The UI must show inactive members with a dimmed presentation and an explicit
inactive status. Inactive staff must fail all active-access predicates and may
not create, update, moderate, or receive new team assignments.

## Remaining Blocker

Before any TEAM-006 route or UI code is started, select one canonical
membership API and authorization helper. The existing `/api/admin/teams` and
`/api/admin/collaboration-teams` surfaces use different capability and scope
rules. The selected baseline must preserve dynamic capability checks,
server-derived city scope, and the active-membership predicate:

`isActive === true && endedAt === null`.

## Implementation Guardrails

- Team membership never expands the actor's city, park, or group scope.
- Chat and document links remain staff-only.
- Client inputs may narrow a query but never supply authoritative city scope.
- New schema changes require aligned SQLite and PostgreSQL models and forward
  migrations. Existing historical contributions must not be deleted by a
  rollback or deactivation workflow.
