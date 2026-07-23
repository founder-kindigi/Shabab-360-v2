# AUTH-106: Dynamic Capability Governance Contract

**Status:** Implementation-ready contract (docs only — no code, no schema, no data)
**Owner:** Codex (design); implementation integrated into each module package
**Base:** codex/production-hardening @ 078d912
**Relevant contracts:** `PKG-01` (content planner), `PKG-04` (events), `PKG-05` (teams), `PKG-06` (mashwara), `PKG-08` (calling module), `TEAM-003`, `EVENT-303`, `MASHWARA-303`, `CALL-308`

---

## 1. Verified Current Architecture

### 1.1 Current Capability Catalogue (in `src/lib/auth/capabilities.ts`)

The following 18 capabilities are currently defined in `ACCESS_CAPABILITIES`. They are the only codes accepted by the override system. No free-text runtime capability name is accepted.

```typescript
"dashboard.view",
"organisation.view",       "organisation.manage",
"people.view",
"students.manage",         "guardians.manage",      "admissions.manage",
"attendance.mark",         "attendance.correct",
"fees.manage",
"announcements.manage",
"reports.view",
"audit.view",
"settings.manage",
"access.role_defaults.manage",  "access.user_overrides.manage",
"access.scope.manage",          "access.city_staff.manage",
```

### 1.2 Current Resolution Order (Verified in `resolveEffectiveCapability`)

```
1. User override (if active, not expired, not revoked) → effect (allow/deny)
2. Role override (if present in RoleCapabilityOverride table) → effect
3. Role default (from ROLE_DEFAULT_CAPABILITIES in capabilities.ts) → allow/deny
4. Anything else → deny
```

No capability is ever resolved from free text. Every code must pass `isAccessCapability()`.

### 1.3 Current Override Model

| Model | Table | Key | Effect | Constraints |
|-------|-------|-----|--------|-------------|
| `RoleCapabilityOverride` | `role_capability_overrides` | `@@unique([role, capability])` | `allow` / `deny` | `super_admin` role and `access.*` capabilities protected from mutation |
| `UserCapabilityOverride` | `user_capability_overrides` | `@@unique([userId, capability])` | `allow` / `deny` | Only `USER_OVERRIDE_CAPABILITIES` subset permitted; `expiresAt` validated; session invalidated on change |

**User override whitelist** (`USER_OVERRIDE_CAPABILITIES`): Excludes `audit.view`, `settings.manage`, and all `access.*` capabilities. These remain role-level, Super Admin-controlled only.

**Session invalidation:** Every override mutation increments `tokenVersion` for all affected users, forcing next-request re-authentication.

**Audit:** Every override create/update/delete is logged with actor, capability, effect, reason, and timestamp.

### 1.4 Current Route Enforcement Pattern

All protected routes use `requireCapability(capability)` as the module gate, then `requireResourceScope(user, { cityId, parkId, groupId })` or a dedicated scope helper as the data gate. The module gate never replaces the data gate.

### 1.5 Current Role Defaults

| Role | Granted Capabilities |
|------|---------------------|
| `super_admin` | All 18 |
| `program_admin` | 14 (excludes `access.*` except via override) |
| `city_head` | 13 (includes `access.city_staff.manage`) |
| `park_lead` | `dashboard.view`, `organisation.view`, `attendance.mark`, `attendance.correct` |
| `park_admin` | `dashboard.view`, `attendance.mark` |
| `murabbi` | `dashboard.view`, `attendance.mark` |
| `guardian` | `dashboard.view`, `people.view`, `guardians.manage`, `reports.view` |
| `student` | `dashboard.view`, `people.view`, `students.manage`, `reports.view` |

**These are defaults only.** Super Admin may override any eligible capability for any role or named user via the dynamic override system. The only exceptions are the canonical protected capabilities (§6), which are immutable via the override API, and any proposed capability that remains pending owner approval (§12 D5–D9).

---

## 2. Canonical Proposed Capability Catalogue

The following capability codes are the complete set for all approved modules. Codes marked as **proposed** do not yet exist in `ACCESS_CAPABILITIES` and must be added. Codes marked as **existing** are already in the current codebase.

| Module | Capability Code | Status | Source Contract |
|--------|----------------|--------|-----------------|
| Dashboard | `dashboard.view` | existing | — |
| Organisation | `organisation.view` | existing | — |
| Organisation | `organisation.manage` | existing | — |
| People | `people.view` | existing | — |
| Students | `students.manage` | existing | — |
| Guardians | `guardians.manage` | existing | — |
| Admissions | `admissions.manage` | existing | — |
| Attendance | `attendance.mark` | existing | — |
| Attendance | `attendance.correct` | existing | — |
| Fees/Finance | `fees.manage` | existing | — |
| Announcements | `announcements.manage` | existing | — |
| Reports | `reports.view` | existing | — |
| Audit | `audit.view` | existing | — |
| Settings/System | `settings.manage` | existing | — |
| Access: role defaults | `access.role_defaults.manage` | existing | — |
| Access: user overrides | `access.user_overrides.manage` | existing | — |
| Access: scope | `access.scope.manage` | existing | — |
| Access: city staff | `access.city_staff.manage` | existing | — |
| **Content Planner** | `content.view` | proposed | PKG-01 |
| **Content Planner** | `content.manage` | proposed | PKG-01 |
| **Collaboration Teams** | `teams.memberships.manage` | proposed | TEAM-003 |
| **Collaboration Teams** | `teams.workspace.view` | proposed | TEAM-003 |
| **Collaboration Teams** | `teams.workspace.manage` | proposed | TEAM-003 |
| **Events** | `events.view` | proposed | EVENT-303 |
| **Events** | `events.manage` | proposed | EVENT-303 |
| **Events** | `events.responsibilities.manage` | proposed | EVENT-303 |
| **Mashwara** | `mashwara.view` | proposed | MASHWARA-303 |
| **Mashwara** | `mashwara.attend` | proposed | MASHWARA-303 |
| **Mashwara** | `mashwara.manage` | proposed | MASHWARA-303 |
| **Calling** | `calling.campaign.manage` | proposed | CALL-308 |
| **Calling** | `calling.poc.manage` | proposed | CALL-308 |
| **Calling** | `calling.leads.view` | proposed | CALL-308 |
| **Calling** | `calling.leads.assign` | proposed | CALL-308 |
| **Calling** | `calling.leads.interact` | proposed | CALL-308 |
| **Calling** | `calling.templates.manage` | proposed | CALL-308 |
| **Calling** | `calling.export.manage` | proposed | CALL-308 |

**Total capability count after additions: 36.**

### 2.1 USER_OVERRIDE_CAPABILITIES Extension

The subset for named-user overrides must be extended to include the new module capabilities that are safe to delegate. The canonical protected-capability list is defined in §6. Only those capabilities are role-level only and never user-overridable.

---

## 3. Default Capability Matrix By Role

This matrix defines **default** capability grants. Super Admin may change any eligible role default through a role override (e.g. grant `events.manage` to `park_lead`). The exceptions are: (1) the canonical protected capabilities listed in §6 are immutable via the override API; (2) proposed capabilities pending owner decisions D5–D9 (§12) cannot be overridden until approved; (3) the `super_admin` role itself is protected from role overrides by the existing route handler. No route handler hard-codes role membership as a permission check — all route enforcement uses `requireCapability(capability)`.

| Role | dashboard | organisation | people | students | guardians | admissions | attendance | fees | announcements | reports | audit | settings | access.* | content | teams | events | mashwara | calling |
|------|-----------|-------------|--------|----------|-----------|------------|------------|------|--------------|--------|-------|----------|----------|---------|-------|--------|----------|---------|
| `super_admin` | view | view+manage | view | manage | manage | manage | mark+correct | manage | manage | view | view | manage | all | view+manage | all | all | all | all |
| `program_admin` | view | view+manage | view | manage | manage | manage | mark+correct | manage | manage | view | view | manage | — | view+manage | all | all | all | all |
| `city_head` | view | view+manage | view | manage | manage | manage | mark+correct | manage | manage | view | — | — | city_staff | view+manage | memberships | view+manage | view+attend+manage | campaign+leads.view+export |
| `park_lead` | view | view | — | — | — | — | mark+correct | — | — | — | — | — | — | view | workspace.view | view | view | — |
| `park_admin` | view | — | — | — | — | — | mark | — | — | — | — | — | — | — | — | — | — | — |
| `murabbi` | view | — | — | — | — | — | mark | — | — | — | — | — | — | — | — | — | — | — |
| `guardian` | view | — | view | — | manage | — | — | — | — | view | — | — | — | — | — | — | — | — |
| `student` | view | — | view | manage | — | — | — | — | — | view | — | — | — | — | — | — | — | — |

**Key:** `all` = all capabilities in that module. `—` = no default capabilities. Empty cells mean no access.

**Calling defaults:** `city_head` receives `calling.campaign.manage`, `calling.leads.view`, `calling.export.manage`. All other roles receive no calling capabilities by default (POC and caller assignments come through `EventResponsibility` + campaign scope, not role defaults).

---

## 4. Dynamic Resolution Order

```
1. User override (if active, not expired, not revoked)
   → effect = allow/deny → return effect
2. Role override (if present in RoleCapabilityOverride table)
   → effect = allow/deny → return effect
3. Role default (from ROLE_DEFAULT_CAPABILITIES)
   → capability present → return allow
4. Fallback
   → return deny
```

**Key rules:**
- A deny override at any level wins over all lower levels.
- User override is only possible for capabilities in `USER_OVERRIDE_CAPABILITIES`.
- All other capabilities require a role override (Super Admin action).
- `super_admin` role and all `access.*` capabilities are immutable via the override API (enforced in route handler).
- No resolution path accepts a free-text capability code. The code must pass `isAccessCapability()`.

---

## 5. Scope Matrix By Module And Actor

Every capability gate must be paired with a server-derived scope check. The following matrix defines the scope for each module and actor type. A capability grant **never** bypasses the scope check.

### 5.1 Actor Type Definitions

| Actor | Scope Derivation | Rule |
|-------|-----------------|------|
| **HQ** (`super_admin`, `program_admin`) | Explicit `cityId` parameter | Must provide valid `cityId` (400 if missing/malformed). May select any city. Never receives unfiltered cross-city lists. |
| **City Head** (`city_head`) | `StaffMeta.assignedCityId` | Single derived city. Supplied `cityId` mismatch → 403. |
| **Park Lead** (`park_lead`) | `assignedParkId` → `Park.cityId` | Single derived city. |
| **Park Admin** (`park_admin`) | `assignedParkId` → `Park.cityId` | Single derived city. |
| **Murabbi** (`murabbi`) | `assignedGroupId` → `Group.batch.cityId` | Single derived city. |
| **Guardian** (`guardian`) | Linked `Participant.group.batch.cityId` | Own linked children only. |
| **Student** (`student`) | Own `Participant.group.batch.cityId` | Own record only. |
| **External Support Caller** | `ExternalSupportCaller.campaign.cityId` | Assigned campaign/event only. |
| **Team member** (collaboration) | Same as staff base role; team membership adds workspace scope predicate within the same city | Never expands base city/park/group scope. |

### 5.2 Module Scope Requirements

| Module | Scope Check | What Is Scoped |
|--------|------------|----------------|
| Dashboard | Derived city | Dashboard data for actor's city |
| Organisation | Derived city | Cities, parks, batches, groups |
| People | Derived city | Staff, participants, guardians |
| Students | Derived city + group | Own group for Murabbi, own park for Park Lead |
| Guardians | Derived city + linked children | Own children for Guardian |
| Admissions | Derived city | Applications, interviews |
| Attendance | Derived city + park/group | Own park for Park Lead/Admin, own group for Murabbi |
| Fees | Derived city + batch | Batch-scoped fee events |
| Announcements | Derived city | City-scoped announcements |
| Reports | Derived city | Report data for actor's scope |
| Audit | Derived city (HQ: all) | Audit records for actor's scope |
| Settings | Global (Super Admin only) | System settings |
| Access | Admin role + city scope | Role/user overrides within scope |
| **Content Planner** | Derived city + batch/park | Content plans in actor's city; write requires `content.manage` |
| **Teams** | Derived city + team membership | `teams.workspace.*` requires active membership in the target team |
| **Events** | Derived city + event.cityId | Events in actor's city; `planned` filtered from view-only users |
| **Mashwara** | Derived city + participant access predicate | Mashwara in actor's city; participant access requires team membership in same city |
| **Calling** | Derived city + campaign scope + POC/responsibility scope | Campaign leads in actor's city; callers see only assigned leads |

### 5.3 Special Scope Predicates

| Context | Predicate | Source |
|---------|-----------|--------|
| Team workspace access | Active `StaffTeamMembership` for the target team in the same city | TEAM-003 |
| Mashwara participant access | Active `StaffTeamMembership` in at least one city collaboration team | MASHWARA-303 |
| Meeting share access | Active `MashwaraMeetingShare` record + `mashwara.view` not denied | MASHWARA-303 |
| Calling POC | Active `EventResponsibility` with title "Calling POC", not expired, not revoked | CALL-308, EVENT-303 |
| External Support Caller | Active `ExternalSupportCaller` record, not expired, not revoked | CALL-308 |
| Event responsibility | Active `EventResponsibility`, `endDate > now`, `revokedAt IS NULL` | EVENT-303 |
| Event planned visibility | `events.manage` required to see `planned` events; `events.view` sees only confirmed+ | EVENT-303 |

---

## 6. Protected Capabilities Policy

This is the single canonical list of protected capabilities. They are **immutable via the override API** — never grantable via named-user override, and their role-level overrides are restricted to Super Admin through the existing API protections.

| Capability | Protection Reason | Allowed Override Level |
|------------|------------------|----------------------|
| `audit.view` | Audit data is sensitive and scope-restricted | Role override only |
| `settings.manage` | System settings affect all users | Role override only |
| `access.role_defaults.manage` | Role defaults define module access for entire roles | Super Admin only (protected in route) |
| `access.user_overrides.manage` | Named-user override management | Super Admin only (protected in route) |
| `access.scope.manage` | Scope changes affect authorization boundaries | Super Admin only (protected in route) |
| `access.city_staff.manage` | Staff provisioning within city | Role override only |

**Capabilities outside the canonical protected list** are eligible for named-user override only if they have been explicitly added to `USER_OVERRIDE_CAPABILITIES` (see §9 for the exact whitelist). Five proposed capabilities — `teams.memberships.manage`, `calling.poc.manage`, `calling.export.manage`, `calling.templates.manage`, `events.responsibilities.manage` — are subject to owner decisions D5–D9 in §12 and remain excluded until approved. Only explicitly approved public capabilities enter `USER_OVERRIDE_CAPABILITIES`.

**Immutable exceptions (current code, unchanged):**
- The `super_admin` role cannot be targeted by role overrides.
- `access.*` capabilities are already protected by route-level enforcement in the override API.
- `super_admin` role defaults for `access.*` capabilities are immutable.

---

## 7. Route Enforcement Pattern

Every protected route must follow this three-layer pattern. No single check is sufficient.

```typescript
// LAYER 1: Module capability gate
const auth = await requireCapability("events.manage");
if (auth instanceof NextResponse) return auth;

// LAYER 2: Server-derived scope (actor-aware)
//   HQ: explicit cityId required (400 if missing)
//   Scoped: derive from StaffMeta (403 if mismatch or missing)
const resolvedCity = resolveActorCity(auth.user, providedCityId);
if (resolvedCity === null) {
  if (isHqRole(auth.user.role)) return new NextResponse(null, { status: 400 });
  return new NextResponse(null, { status: 403 });
}

// LAYER 3: Module-specific predicate (where applicable)
//   Team route: active membership check
//   Mashwara route: participant access predicate or meeting share
//   Calling route: active POC/responsibility or campaign scope
//   Content route: plan city/batch/park match
//   Event route: event.cityId comparison
//   Attendance route: park/group resource scope

// Example for a team workspace route:
if (!(await hasActiveTeamMembership(auth.user, teamId, resolvedCity))) {
  return new NextResponse(null, { status: 403 });
}

// Example for an event route:
if (event.cityId !== resolvedCity) {
  return new NextResponse(null, { status: 403 });
}
```

### 7.1 Error Code Convention

| Condition | Code | Message |
|-----------|------|---------|
| Zod/body/query/business-input validation failure | 400 | "Invalid request. Please check your input." |
| Missing required cityId for HQ | 400 | "cityId is required." |
| Unauthenticated | 401 | "Please sign in to continue." |
| Missing capability, scope, or membership | 403 | "You do not have permission to perform this action." |
| Resource not found or hidden | 404 | Module-specific: "Event not found." |
| State conflict (immutable, already completed, etc.) | 409 | Module-specific message |
| Internal error | 500 | "Something went wrong. Please try again." |

### 7.2 Cross-Module Enforcement Rules

1. **No hard-coded role gate** may override a granted capability plus valid scope. If a user has `content.manage` via override and valid city scope, they may write content plans regardless of their role string.
2. **Capability plus scope** is necessary but not always sufficient. Module-specific predicates (team membership, POC assignment, lead assignment) add an additional ownership/assignment layer.
3. **Team membership** is an authorization predicate, not a capability. It is checked after the capability gate and scope check.
4. **Temporary responsibilities** (Calling POC, event leads) are checked after capability and scope. An expired or revoked responsibility denies access even if the capability is granted.
5. **EventResponsibility** from PKG-04 references `mashwaraId`; this cross-module link must be validated at the point of use (calling module verifies the responsibility's city matches the campaign city).

---

## 8. Test Regression Matrix

### 8.1 Allow Tests

| ID | Test | Module | Expected |
|----|------|--------|----------|
| CAP-ALLOW-001 | Super Admin grants `content.manage` to a park_lead via role override | Access | 200 |
| CAP-ALLOW-002 | park_lead with granted `content.manage` writes content plan in own park | Content | 200 |
| CAP-ALLOW-003 | City Head grants `teams.workspace.view` to a park_lead via user override | Access | 200 |
| CAP-ALLOW-004 | park_lead with active team membership reads team workspace | Teams | 200 |
| CAP-ALLOW-005 | City Head grants `events.manage` to a park_lead via role override | Access | 200 |
| CAP-ALLOW-006 | park_lead with `events.manage` creates an event in own city | Events | 201 |
| CAP-ALLOW-007 | City Head grants `mashwara.attend` to a park_lead via user override | Access | 200 |
| CAP-ALLOW-008 | park_lead with `mashwara.attend` marks attendance at own-city Mashwara | Mashwara | 201 |
| CAP-ALLOW-009 | HQ role override grants a new module capability to all city_heads | Access | 200 |
| CAP-ALLOW-010 | User override with `expiresAt` in future grants access | Access | 200 (capability resolved) |

### 8.2 Deny Tests

| ID | Test | Module | Expected |
|----|------|--------|----------|
| CAP-DENY-001 | Super Admin grants `audit.view` to a park_lead via user override | Access | 400 (protected) |
| CAP-DENY-002 | Super Admin grants `access.role_defaults.manage` to a city_head via role override targeting `super_admin` role | Access | 400 (protected role) |
| CAP-DENY-003 | park_lead with `content.manage` writes content plan in another city | Content | 403 (scope mismatch) |
| CAP-DENY-004 | park_lead with granted `content.manage` but no scope writes content plan | Content | 403 (no scope) |
| CAP-DENY-005 | User override denied for `access.role_defaults.manage` (canonical protected) | Access | 400 (not in USER_OVERRIDE_CAPABILITIES) |
| CAP-DENY-006 | User with `events.view` but `events.manage` denied by override attempts event edit | Events | 403 (deny wins) |
| CAP-DENY-007 | User with `mashwara.view` but no team membership attempts to view Mashwara | Mashwara | 403 (participant predicate fails) |
| CAP-DENY-008 | HQ role creates campaign without `cityId` | Calling | 400 (missing cityId) |
| CAP-DENY-009 | Scoped actor attempts to grant `content.manage` to cross-city staff via access API | Access | 403 (scope mismatch) |
| CAP-DENY-010 | User override expired — access denied despite effect=allow | Access | 403 (expired) |
| CAP-DENY-011 | Expired Calling POC attempts to assign leads | Calling | 403 (responsibility expired) |
| CAP-DENY-012 | Role override for `super_admin` role attempted | Access | 400 (protected role) |
| CAP-DENY-013 | Free-text capability code submitted to override API | Access | 400 (invalid capability) |
| CAP-DENY-014 | Team member without `content.manage` attempts to manage content plan | Content | 403 |
| CAP-DENY-015 | Team member with `teams.workspace.view` but no active membership reads team workspace | Teams | 403 |

### 8.3 Error Tests

| ID | Test | Expected |
|----|------|----------|
| CAP-ERR-001 | Create role override with invalid capability code | 400 |
| CAP-ERR-002 | Create user override with `expiresAt` in the past | 400 |
| CAP-ERR-003 | Create role override with invalid role string | 400 |
| CAP-ERR-004 | Revoke non-existent role override | 404 |
| CAP-ERR-005 | Revoke non-existent user override | 404 |

### 8.4 Audit Tests

| ID | Test | Expected |
|----|------|----------|
| CAP-AUDIT-001 | Creating role override creates audit log entry | AuditLog with action `role_override.upsert` exists |
| CAP-AUDIT-002 | Creating user override creates audit log entry | AuditLog with action `user_override.upsert` exists |
| CAP-AUDIT-003 | Revoking user override creates audit log entry | AuditLog with action `user_override.revoke` exists |
| CAP-AUDIT-004 | Denied override attempt is not audited (no state change) | No audit log created |
| CAP-AUDIT-005 | Capability resolution with no overrides (default only) does not create audit log | No audit log created |

---

## 9. User Override Extension

### 9.1 Extended USER_OVERRIDE_CAPABILITIES

The following capabilities must be added to `USER_OVERRIDE_CAPABILITIES` so Super Admin can grant them to named users:

```typescript
"content.view",              "content.manage",
"teams.workspace.view",      "teams.workspace.manage",
"teams.memberships.manage",  // Subject to owner decision D5 — recommended default: allow named-user override
"events.view",               "events.manage",
"mashwara.view",             "mashwara.attend",       "mashwara.manage",
"calling.campaign.manage",   "calling.leads.view",
"calling.leads.assign",      "calling.leads.interact",
"calling.poc.manage",        // Subject to owner decision D6 — recommended default: allow named-user override
```

The following capabilities from the proposed catalogue remain **excluded** from `USER_OVERRIDE_CAPABILITIES` pending owner decisions D7–D9 (recommended default: protect):

```typescript
// Pending owner decision — currently excluded:
// "calling.export.manage"      — D7 recommended protect
// "calling.templates.manage"   — D8 recommended protect
// "events.responsibilities.manage" — D9 recommended protect
```

The following capabilities are always **excluded** (canonical protected list per §6):

```typescript
// Canonical protected capabilities (always role-level only):
"audit.view",                  "settings.manage",
"access.role_defaults.manage", "access.user_overrides.manage",
"access.scope.manage",         "access.city_staff.manage",
```

---

## 10. Safe Rollout, Session Invalidation, Rollback

### 10.1 Safe Rollout Order

1. **Add new capability codes** to `ACCESS_CAPABILITIES` in `capabilities.ts`. This is a read-only schema change — existing resolution logic continues working.
2. **Extend USER_OVERRIDE_CAPABILITIES** with the public capabilities above.
3. **Add role defaults** for new capabilities (per the matrix in §3). Roles receive their intended defaults at deployment.
4. **Deploy module routes** (content, teams, events, mashwara, calling) that use the new capability codes via `requireCapability()`. No existing route is affected.
5. **Existing access-management API** (`admin/access/role-overrides`, `admin/access/users/[id]/overrides`) automatically supports the new codes because they validate against `ACCESS_CAPABILITIES` and `USER_OVERRIDE_CAPABILITIES`.
6. **Existing Super Admin UI** can configure the new capabilities immediately after deployment.

### 10.2 Session Invalidation

The existing `tokenVersion` invalidation on override mutation is sufficient. No change needed. Every override mutation (role or user) already increments `tokenVersion` for affected users.

### 10.3 Rollback

Standard rollback for capability changes is removal of the capability code from `ACCESS_CAPABILITIES` and `USER_OVERRIDE_CAPABILITIES`, plus reversion of role defaults. No database migration rollback is needed because capability codes are application constants, not schema.

If module routes must be rolled back, delete the route files and revert `capabilities.ts`. The additive database tables remain intact (no destructive rollback).

---

## 11. Implementation Packages And Files

### 11.1 Files To Modify

| File | Change |
|------|--------|
| `src/lib/auth/capabilities.ts` | Add new capability codes to `ACCESS_CAPABILITIES`; extend `USER_OVERRIDE_CAPABILITIES`; add new entries to `ROLE_DEFAULT_CAPABILITIES` |
| `src/lib/auth/authorize.ts` | No change needed (uses `requireCapability` generically) |
| `src/lib/auth/capability-access.ts` | No change needed (uses `resolveEffectiveCapability` generically) |

### 11.2 Module Implementation Contracts (Each Defines Its Own Routes)

- Content Planner: [PKG-01](docs/product-discovery/PKG-01-HANDOFF.md) — uses `content.view`, `content.manage`
- Collaboration Teams: [TEAM-003](docs/product-discovery/TEAM-003-COLLABORATION-TEAM-WORKSPACE-CONTRACT.md) — uses `teams.*`
- Events: [EVENT-303](docs/product-discovery/EVENT-303-IMPLEMENTATION-CONTRACT.md) — uses `events.*`
- Mashwara: [MASHWARA-303](docs/product-discovery/MASHWARA-303-IMPLEMENTATION-CONTRACT.md) — uses `mashwara.*`
- Calling: [CALL-308](docs/product-discovery/CALL-308-CALLING-MODULE-IMPLEMENTATION-CONTRACT.md) — uses `calling.*` (under review)

Each module contract defines its own API routes, Zod schemas, scope helpers, UI components, and focused tests. This contract does not duplicate those.

### 11.3 Module Test Files

| File | Scope |
|------|-------|
| [src/lib/auth/capabilities.test.ts](src/lib/auth/capabilities.test.ts) | Unit tests for capability resolution order, protected capabilities, invalid codes |
| [src/lib/auth/capability-access.test.ts](src/lib/auth/capability-access.test.ts) | Unit tests for `userHasCapability` resolution |
| [src/app/api/admin/access/role-overrides/route.test.ts](src/app/api/admin/access/role-overrides/route.test.ts) | Integration tests for role override CRUD (CAP tests) |
| [src/app/api/admin/access/users/[id]/overrides/route.test.ts](src/app/api/admin/access/users/\[id\]/overrides/route.test.ts) | Integration tests for user override CRUD (CAP tests) |

---

## 12. Open Owner Decisions

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| D1 | Calling module (CALL-308) is still under review. Should `calling.*` capabilities be added to `ACCESS_CAPABILITIES` now (enabling Super Admin to pre-configure overrides), or deferred until the calling module is approved? | Add now vs Defer | Affects rollout order |
| D2 | `teams.memberships.manage` — should this capability default for Park Lead, or remain Super Admin/City Head only? Current default: City Head only. | Add to Park Lead vs Keep as is | Affects role defaults matrix |
| D3 | Event `planned` visibility — currently `events.view` users without `events.manage` cannot see planned events (404/403). Should this be a capability-level rule or a separate status filter? | Capability rule vs Status filter | Affects route enforcement pattern |
| D4 | Calling POC — should the existing `calling.poc.manage` capability be combined with `events.responsibilities.manage`, since Calling POC is an EventResponsibility? | Separate vs Combined | Affects capability catalogue size |
| D5 | `teams.memberships.manage` — should this capability be eligible for named-user override? **Recommended default: Yes** (allow in USER_OVERRIDE_CAPABILITIES) so Super Admin can delegate team membership management to a City Head or trusted Park Lead. | Allow override vs Protect | Affects USER_OVERRIDE_CAPABILITIES |
| D6 | `calling.poc.manage` — should this capability be eligible for named-user override? **Recommended default: Yes** (allow in USER_OVERRIDE_CAPABILITIES) so Calling POC management can be delegated within a city. | Allow override vs Protect | Affects USER_OVERRIDE_CAPABILITIES |
| D7 | `calling.export.manage` — should this capability be eligible for named-user override? **Recommended default: No** (protect, role-level only) because export of personal data requires an audited trail. | Protect vs Allow override | Affects USER_OVERRIDE_CAPABILITIES |
| D8 | `calling.templates.manage` — should this capability be eligible for named-user override? **Recommended default: No** (protect, role-level only) because template approval controls message content sent to leads. | Protect vs Allow override | Affects USER_OVERRIDE_CAPABILITIES |
| D9 | `events.responsibilities.manage` — should this capability be eligible for named-user override? **Recommended default: No** (protect, role-level only) because responsibilities grant operational authority (Calling POC, Event Lead) that should be Super Admin-governed. | Protect vs Allow override | Affects USER_OVERRIDE_CAPABILITIES |

---

## 13. Contract Handoff

### Summary

This contract governs the dynamic capability system across all Shabab 360 modules. It reconciles the existing 18-capability catalogue with 18 proposed additions for content planner, teams, events, mashwara, and calling — bringing the total to 36. Every capability is fixed, free-text codes are rejected, and no hard-coded role gate may override a granted capability plus valid scope.

### Key Rules

- **Resolution order:** user override → role override → role default → deny.
- **Canonical protected capabilities** (6 codes: `audit.view`, `settings.manage`, `access.*`) are role-level only, never user-overridable. See §6. Only explicitly approved public capabilities enter `USER_OVERRIDE_CAPABILITIES`; five proposed capabilities remain pending owner decisions D5–D9 (§12).
- **Every capability check** is paired with a server-derived scope check (city, park, group, team, campaign, event, or assigned lead). A capability grant never bypasses scope.
- **Module-specific predicates** (team membership, POC assignment, meeting share, lead assignment) add an additional enforcement layer after capability + scope.
- **Session invalidation** on override mutation is already implemented via `tokenVersion`.
- **Standard error codes:** 400 (validation/input), 403 (capability/scope/membership), 404 (not found), 409 (state conflict).

---

*End of AUTH-106 Dynamic Capability Governance Contract*
