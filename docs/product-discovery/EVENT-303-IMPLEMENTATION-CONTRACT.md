# EVENT-303: Events and Responsibility Implementation Contract

**Status:** Implementation-ready contract (docs only — no code, no schema, no data)
**Owner:** Codex (design); implementation follows after PKG-01 integration
**Dependencies:** PKG-01 additive schema migration (content planner models)
**Base:** codex/production-hardening @ 99f9460

---

## 1. Scope And Boundaries

### 1.1 What This Contract Covers

1. **Event** — a programme operational event: trips, ceremonies, campaigns, open days, activities, sports days, closing events, etc. Distinct from AttendanceEvent (which is a group-class attendance session).
2. **Temporary Event Team** — a time-bounded operational team created for a specific event: Security, Parking, Welcome, Transport, Registration, etc. **Not** a login role or permanent collaboration team.
3. **Event Responsibility** — a time-bounded assignment created from a Mashwara decision or event planning: Calling POC, Event Lead, Team Lead, etc. **Not** a login role or city-wide post.
4. **Event Planner Item** — a task/deadline for delivering an event, linked to an event, a responsibility, or a team.

### 1.2 What Is Out Of Scope

- Modification of AttendanceEvent, AttendanceRecord, or group-class session attendance.
- Modification of CollaborationTeam or StaffTeamMembership (permanent collaboration teams).
- Login roles, authorization scope expansion, or hierarchy changes.
- Automatically generated event occurrences (recurrence/cron — deferred to post-pilot).
- Real workbook/event data import.
- Notification, calendar sync, or external provider integration.
- Event attendance (separate future work — attendance for operational events may use a different model than group-class attendance).

### 1.3 Calling POC Rule

Calling POC is a **temporary event/Mashwara responsibility only**, never a login role or city-wide post. This contract defines the responsibility model; the Calling module (`CALL-302`+) will use it to create Calling POC assignments scoped to a campaign/event/Mashwara with mandatory start/end dates, city scope, and audited revocation.

---

## 2. Current-Model Reconciliation

### 2.1 Verified Existing Models (from prisma/schema.prisma)

| Model | Key Fields | Relevant Relations | Notes |
|-------|-----------|-------------------|-------|
| `User` | id, email, isActive, tokenVersion | staffMeta, guardian, participant | Base identity |
| `StaffMeta` | id, userId (unique), role, assignedCityId?, assignedParkId?, assignedGroupId?, isActive | assignedCity, assignedPark, assignedGroup, teamMemberships | Single canonical assignment; city scope derivation |
| `CollaborationTeam` | id, cityId, code, name, isActive | city, memberships, contentBlocks, activityPlans | Permanent operational teams (Sports, Skills, Tadreeb, Media, Muawin) |
| `StaffTeamMembership` | id, staffMetaId, teamId, title?, startedAt, endedAt?, isActive | staffMeta, team | Team membership with history |
| `AuditLog` | id, userId?, action, entityType, entityId?, oldValues?, newValues?, reason?, createdAt | user | Redacted, restrict-read audit |
| `AttendanceEvent` | id, groupId, title, eventDate, isClosed, closedAt?, closedBy? | group, records | Group-class attendance only; not a programme event |
| `Batch` | id, name, cityId?, parkId, startDate, endDate?, isActive | park, city, groups, settings, feeEvents | City-owned with optional cityId |
| `Park` | id, name, cityId, isActive | city, batches, groups | Belongs to one city |
| `Group` | id, name, batchId, parkId?, isActive | batch, park, participants, murabbis, attendanceEvents | Links one batch + one park |
| `City` | id, name, code, isActive | parks, batches, cityHeads, collaborationTeams | Top of hierarchy |
| `ActivityPlanItem` | id, teamId, contentBlockId?, assignedStaffMetaId?, title, status, scheduledFor? | team, contentBlock, assignedStaff | Team activity planning — separate from event responsibilities |

### 2.2 Existing Authorization Patterns

- **Module gate:** `requireCapability("capability.name")` → checks session + role default / role override / user override
- **Data gate:** `requireResourceScope(user, {cityId, parkId, groupId})` → checks StaffMeta assignment against entity scope
- **HQ roles** (`super_admin`, `program_admin`): may operate in any explicitly selected existing city; they must never receive unfiltered cross-city lists or blind global access
- **City scope derivation:** `StaffMeta.assignedCityId` (or via `assignedParkId` → `Park.cityId`, or via `assignedGroupId` → `Group.batch.cityId`)
- **Audit:** `logAudit({userId, action, entityType, entityId, oldValues?, newValues?, reason?})` or `createAuditLogData(...)` inside transactions
- **Capability catalogue** is in `src/lib/auth/capabilities.ts` — new capabilities must be added there

### 2.3 What Does NOT Yet Exist

| Concept | Missing |
|---------|---------|
| Programme Event model | No `Event` table — only `AttendanceEvent` for group-class sessions |
| Temporary Event Team | No `TemporaryEventTeam` model |
| Event Team Membership | No `EventTeamMembership` model |
| Event Responsibility | No `EventResponsibility` model |
| Event Planner Item | No `EventPlannerItem` model |
| Event-Responsibility links | No FK from Responsibility → Mashwara occurrence, event, or campaign |
| Event capabilities | No `events.*` capabilities in the catalogue |
| Calling POC as responsibility | Must be a row in EventResponsibility, never a role string |

---

## 3. Additive Models (Both Schemas)

These models are additive-only. They must be added identically to `prisma/schema.prisma` (SQLite) and `prisma/postgres/schema.prisma` (PostgreSQL) after PKG-01's schema migration is approved and integrated.

### 3.1 Event

```prisma
model Event {
  id          String   @id @default(cuid())
  cityId      String
  title       String
  description String?
  eventType   String   // "trip" | "ceremony" | "campaign" | "activity" | "sports_day" | "camp" | "open_day" | "closing" | "other"
  status      String   @default("planned") // "planned" | "confirmed" | "in_progress" | "completed" | "cancelled"
  venue       String?
  venueNotes  String?
  startDate   DateTime
  endDate     DateTime?
  capacity    Int?
  cost        Decimal? @default(0)
  requiresConsent Boolean @default(false)
  requiresMedical  Boolean @default(false)
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  city           City                  @relation(fields: [cityId], references: [id], onDelete: Cascade)
  teams          TemporaryEventTeam[]
  responsibilities EventResponsibility[]
  plannerItems   EventPlannerItem[]

  @@index([cityId, status])
  @@index([cityId, startDate])
  @@index([status, startDate])
  @@map("events")
}
```

**Design decisions:**
- `cityId` is the owning scope. Events are city-level; a single park may host but the event belongs to the city.
- `eventType` is a string rather than an enum to allow future extension without migrations. The server validates against the approved set.
- `cost` uses `Decimal` for PostgreSQL compatibility (exact PKR). SQLite uses `Float` behind the scenes; the application layer should treat it as Decimal via Prisma.
- Capacity, consent, and medical flags are present for future attendance/safety linking but are not mandatory in the pilot.

### 3.2 TemporaryEventTeam

```prisma
model TemporaryEventTeam {
  id          String   @id @default(cuid())
  eventId     String
  title       String   // "Security", "Parking", "Welcome", "Transport", "Registration", "Calling POC team", etc.
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  event        Event                   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  memberships  EventTeamMembership[]

  @@unique([eventId, title])
  @@index([eventId, isActive])
  @@map("temporary_event_teams")
}
```

**Design decisions:**
- TemporaryEventTeam is **not** a login role. Membership never expands authorization scope.
- Title is a free-text operational label, not a role enum. The server should validate against known event roles but remain extensible.
- One event may have multiple teams: Security, Parking, Welcome, etc.

### 3.3 EventTeamMembership

```prisma
model EventTeamMembership {
  id                String   @id @default(cuid())
  teamId            String
  staffMetaId       String
  title             String?  // "Lead", "Assistant", "Member" — operational label within the team
  assignedAt        DateTime @default(now())
  assignedUntil     DateTime?
  revokedAt         DateTime?
  revokedReason     String?
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  team              TemporaryEventTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  staffMeta         StaffMeta          @relation(fields: [staffMetaId], references: [id], onDelete: Cascade)

  @@unique([teamId, staffMetaId])
  @@index([staffMetaId, isActive])
  @@index([teamId, isActive])
  @@map("event_team_memberships")
}
```

**Design decisions:**
- Links to `StaffMeta` (not `User` directly), following the existing pattern used by `StaffTeamMembership`.
- `assignedUntil` supports mandatory expiry — after this date, the membership auto-expires (checked server-side).
- `revokedAt` + `revokedReason` provide audited revocation without data loss.
- `isActive` is the computed access predicate: `isActive && (!assignedUntil || assignedUntil > now) && revokedAt IS NULL`.

### 3.4 EventResponsibility

```prisma
model EventResponsibility {
  id                String   @id @default(cuid())
  eventId           String?
  mashwaraId        String?  // FK → future Mashwara model (string ref for now; FK added when Mashwara is implemented)
  mashwaraOccurrenceId String? // FK → future MashwaraOccurrence model
  title             String   // "Calling POC", "Event Lead", "Transport Lead", "Security Lead", "Registration Lead"
  description       String?
  assignedToStaffMetaId String
  assignedBy        String   // userId who created the assignment
  cityId            String   // Denormalized city scope — must match assignedTo's StaffMeta city
  startDate         DateTime
  endDate           DateTime  // Mandatory — responsibilities always expire
  revokedAt         DateTime?
  revokedBy         String?
  revokedReason     String?
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  event             Event?   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  assignedToStaffMeta StaffMeta @relation(fields: [assignedToStaffMetaId], references: [id], onDelete: Cascade)

  @@index([assignedToStaffMetaId, isActive])
  @@index([eventId, isActive])
  @@index([cityId, isActive])
  @@index([endDate, isActive])
  @@map("event_responsibilities")
}
```

**Design decisions:**
- `endDate` is **mandatory** — a responsibility without expiry is not allowed. This enforces the "temporary" rule.
- `mashwaraId` and `mashwaraOccurrenceId` are string references to the future Mashwara model (which does not yet exist). They are not FK-constrained until the Mashwara schema is added. The application validates that **exactly one** parent is set: `eventId` XOR `mashwaraId`. If `mashwaraId` is set, `mashwaraOccurrenceId` is optional.
- `cityId` is denormalized for efficient scope queries. The server **derives it from the selected parent** (the parent Event's `Event.cityId`, or the parent Mashwara's city when that model exists), then verifies the assignee's derived StaffMeta city matches. The client must never supply `cityId`.
- `assignedBy` is a User ID (audit field).
- `revokedAt` + `revokedBy` + `revokedReason` provide audited early termination.

### 3.5 EventPlannerItem

```prisma
model EventPlannerItem {
  id                String   @id @default(cuid())
  eventId           String
  title             String
  description       String?
  assignedToStaffMetaId String?
  teamId            String?  // FK → TemporaryEventTeam
  dueDate           DateTime?
  priority          String   @default("medium") // "low" | "medium" | "high" | "critical"
  status            String   @default("pending") // "pending" | "in_progress" | "completed" | "cancelled"
  completedAt       DateTime?
  completionNote    String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  event             Event                @relation(fields: [eventId], references: [id], onDelete: Cascade)
  assignedStaffMeta StaffMeta?           @relation(fields: [assignedToStaffMetaId], references: [id], onDelete: SetNull)
  team              TemporaryEventTeam?  @relation(fields: [teamId], references: [id], onDelete: SetNull)

  @@index([eventId, status])
  @@index([assignedToStaffMetaId, status])
  @@index([teamId, status])
  @@index([dueDate, status])
  @@map("event_planner_items")
}
```

**Design decisions:**
- Separate from `ActivityPlanItem` (which belongs to permanent collaboration teams + content planner blocks). Event planner items belong to an Event and may be assigned to a temporary event team or an individual.
- `teamId` links to `TemporaryEventTeam` — items can be assigned to an event team (collective responsibility) or an individual staff member.

---

## 4. Authorization Model

### 4.1 New Capabilities (Add to ACCESS_CAPABILITIES)

```typescript
"events.manage",          // Create, edit, cancel events; manage event teams and responsibilities
"events.view",            // Read event details, teams, responsibilities, planner items
"events.responsibilities.manage",  // Create/revoke responsibility assignments (subset of events.manage for delegation)
```

### 4.2 Role Defaults

| Role | events.view | events.manage | events.responsibilities.manage |
|------|------------|--------------|------------------------------|
| `super_admin` | YES | YES | YES |
| `program_admin` | YES | YES | YES |
| `city_head` | YES (own city) | YES (own city) | YES (own city) |
| `park_lead` | YES (own park's city; `planned` events filtered out) | — | — |
| `park_admin` | — | — | — |
| `murabbi` | — | — | — |
| `guardian` | — | — | — |
| `student` | — | — | — |

### 4.3 Scope Derivation Rules

Two classes of actor determine authorized city scope:

**HQ roles (`super_admin`, `program_admin`):** No single city assignment. These users may select **any existing city** as scope for an event, a list, or a management operation. The server accepts an explicit `cityId` parameter when the actor is HQ; it validates that the city exists but does not restrict by `StaffMeta`.

**Scoped roles (all others):** City scope is derived from the actor's `StaffMeta`:

1. `StaffMeta.assignedCityId` (direct city assignment — City Head)
2. If `assignedCityId` is null but `assignedParkId` is set: city = `Park.cityId` (Park Lead, Park Admin)
3. If `assignedCityId` and `assignedParkId` are null but `assignedGroupId` is set: city = `Group.batch.cityId` via batch (Murabbi)

**Event scope rules:**
- `Event.cityId` must be within the actor's authorized city set (any city for HQ; the single derived city for scoped roles).
- `TemporaryEventTeam.event.cityId` — derived through the parent event.
- `EventResponsibility.cityId` — the server derives this from the **selected parent** (event or Mashwara): if `eventId` is set, derive from `Event.cityId`; if `mashwaraId` is set, derive from the Mashwara record's city. The derived city must match the assignee's StaffMeta city. The client never supplies `cityId`.
- `EventPlannerItem.event.cityId` — derived through the parent event.

**Request parameters** may narrow (e.g. `?parkId=` within the actor's authorized cities) but must never expand scope. A parameter requesting data outside the authorized scope must be ignored or return empty; it must never return cross-city data. HQ actors must still provide a `cityId` parameter (or derive it from an event context) — they are not granted unlimited blind access to all cities without specifying one.

### 4.4 Server-Side Enforcement Pattern

```typescript
// 1. Module gate
const auth = await requireCapability("events.manage");
if (auth instanceof NextResponse) return auth;

// 2. Resolve authorized city scope — actor-aware
//    super_admin / program_admin: require explicit existing cityId param
//    Scoped actors: derive exactly one city from StaffMeta
const resolvedCity = resolveActorCity(auth.user, providedCityId);
if (!resolvedCity) return new NextResponse(null, { status: 403 });

// 3. Resource scope check — resolvedCity must match the target entity
const error = requireResourceScope(auth.user, { cityId: event.cityId });
if (error) return error;
```

The `resolveActorCity` helper works as follows:
- If `auth.user.role` is `super_admin` or `program_admin`: the caller **must** provide a `cityId` parameter; the helper validates the city exists and returns it. No `cityId` → returns `null` (403).
- If `auth.user.role` is a scoped role (`city_head`, `park_lead`, etc.): the helper derives the single city from the actor's `StaffMeta` as defined in §4.3. If a `cityId` was also provided in the request, it is validated against the derived city; a mismatch is denied with 403. If no `cityId` was provided, the derived city is used.
- The resolved city is used for all entity scope checks on the request. Request query parameters (e.g. `?parkId=`) may only narrow the resolved scope; a parameter requesting data outside it returns 403.

### 4.5 Calling POC Authorization

Calling POC is an `EventResponsibility` with `title = "Calling POC"` linked to an event or Mashwara. Its authorization is:

- The assigned user may access the calling module only for leads belonging to the linked event/campaign.
- Access is limited to the `cityId` on the responsibility.
- Access expires at `endDate` or immediately upon `revokedAt` being set.
- The assigned user's `StaffMeta.isActive` must also be true.
- Calling POC does **not** grant dashboard, report, people search, export, admissions-decision, team, or Mashwara access beyond the calling module.

This module-level enforcement is implemented in the Calling module (`CALL-302`+), not in the Event model itself. The Event model provides the data (who, what, when, scope); the Calling module enforces the behaviour.

---

## 5. Lifecycle Rules

### 5.1 Event Lifecycle

```
planned → confirmed → in_progress → completed
planned → cancelled
confirmed → cancelled
```

- **planned:** Draft state. Visible only to the event creator and users with `events.manage` in the event's city. Server-side list and detail endpoints must filter out `planned` events for callers who lack `events.manage`.
- **confirmed:** Approved and published. All `events.view` users in the city can see it. Teams and responsibilities can be assigned.
- **in_progress:** Event is underway. Planner items may be updated. No structural changes (teams/responsibilities should be stable).
- **completed:** Event finished. Read-only. Corrections create new planner items (immutable review).
- **cancelled:** Event will not proceed. All responsibilities auto-expire. Teams are inactive.

### 5.2 Event Team Lifecycle

- Created by `events.manage` user (City Head/HQ) for a confirmed or in-progress event.
- Memberships are added/removed by the same scope.
- When event reaches `completed` or `cancelled`, all team memberships are auto-inactivated (server-enforced).
- A membership with `assignedUntil` in the past is treated as expired (server-enforced on every access check).

### 5.3 Event Responsibility Lifecycle

```
Created (startDate, endDate set) → Active → Expired (endDate passed)
                                  → Revoked (revokedAt set)
```

- **Created:** Assignment recorded. Not active until `startDate`.
- **Active:** Between `startDate` and `endDate`, not revoked, assigning user's `StaffMeta.isActive`.
- **Expired:** `endDate` passed. Server denies all access gated on this responsibility.
- **Revoked:** `revokedAt` set by a user with `events.responsibilities.manage` or `events.manage` in the same city. Server denies access immediately.

**Expiry enforcement:**
- Every API route that gates access on an `EventResponsibility` must check: `isActive && endDate > now && revokedAt IS NULL && assignedToStaffMeta.isActive`. No responsibility may be active without an expiry; `endDate` is mandatory and the access predicate must require it.
- A background task or middleware check is not required for the pilot — expiry is enforced on every request (lazy validation).

### 5.4 Planner Item Lifecycle

```
pending → in_progress → completed
                       → cancelled
```

- Status transitions are forward-only. `completed` and `cancelled` are terminal.
- `events.manage` users may move any item. The assigned staff member may update only their own items (status, completionNote).

---

## 6. Audit Contract

### 6.1 Audited Operations

All mutations to the new models must be audited via `logAudit()` or `createAuditLogData()`:

| Operation | Action string | Entity type | Audit fields |
|-----------|--------------|-------------|--------------|
| Create event | `event.create` | `Event` | newValues (redacted) |
| Update event | `event.update` | `Event` | oldValues, newValues (redacted) |
| Cancel event | `event.cancel` | `Event` | reason |
| Complete event | `event.complete` | `Event` | — |
| Create temp team | `event_team.create` | `TemporaryEventTeam` | newValues |
| Update temp team | `event_team.update` | `TemporaryEventTeam` | oldValues, newValues |
| Add team member | `event_team.member.add` | `EventTeamMembership` | newValues |
| Remove team member | `event_team.member.remove` | `EventTeamMembership` | reason |
| Create responsibility | `event_responsibility.create` | `EventResponsibility` | newValues |
| Revoke responsibility | `event_responsibility.revoke` | `EventResponsibility` | reason |
| Create planner item | `event_planner.create` | `EventPlannerItem` | newValues |
| Update planner item | `event_planner.update` | `EventPlannerItem` | oldValues, newValues |

### 6.2 Audit Redaction

The existing `createAuditLogData()` helper in `src/lib/audit.ts` automatically redacts PII fields. No additional redaction logic is needed for Event models because they store role/assignment data, not personal information. However, the `reason` and `description` fields on responsibilities and planner items are free text and must be truncated at 500 chars by the existing `sanitizeAuditText()` logic.

### 6.3 Audit Visibility

Audit log visibility is unchanged: `audit.view` capability required. Event-related audit records follow the same scope rules — a City Head sees only audit records for their own city's events.

---

## 7. Zod Contracts (API Validation)

### 7.1 Shared Primitives

```typescript
const eventIdSchema = z.string().cuid();
const cityIdSchema = z.string().cuid();
const staffMetaIdSchema = z.string().cuid();
const eventTypeSchema = z.enum(["trip", "ceremony", "campaign", "activity", "sports_day", "camp", "open_day", "closing", "other"]);
const eventStatusSchema = z.enum(["planned", "confirmed", "in_progress", "completed", "cancelled"]);
const responsibilityTitleSchema = z.enum([
  "Calling POC", "Event Lead", "Transport Lead", "Security Lead",
  "Parking Lead", "Welcome Lead", "Registration Lead", "Media Lead",
  "First Aid Lead", "Logistics Lead", "Other"
]);
const prioritySchema = z.enum(["low", "medium", "high", "critical"]);
const plannerItemStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);
```

### 7.2 Event Schemas

```typescript
// cityId is required for HQ actors (super_admin, program_admin) who must
// declare their target city. Scoped actors (City Head, Park roles, Murabbi)
// derive city from StaffMeta; any supplied cityId is validated to match or
// rejected — the server never accepts a city outside the actor's scope.
const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  eventType: eventTypeSchema,
  venue: z.string().max(200).optional(),
  venueNotes: z.string().max(500).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  cityId: cityIdSchema.optional(), // HQ passes explicitly; scoped derives from StaffMeta
  capacity: z.number().int().positive().optional(),
  requiresConsent: z.boolean().optional().default(false),
  requiresMedical: z.boolean().optional().default(false),
});

`updateEventSchema` removes `cityId` — `Event.cityId` is immutable after creation.

```typescript
const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  eventType: eventTypeSchema.optional(),
  venue: z.string().max(200).optional(),
  venueNotes: z.string().max(500).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  capacity: z.number().int().positive().optional(),
  requiresConsent: z.boolean().optional(),
  requiresMedical: z.boolean().optional(),
  status: eventStatusSchema.optional(),
});

// For list queries, HQ must provide cityId; scoped actors derive it.
// If a scoped actor supplies cityId, the endpoint ignores/rejects it
// when it does not match the actor's derived city.
const listEventsSchema = z.object({
  cityId: cityIdSchema.optional(),
  status: eventStatusSchema.optional(),
  eventType: eventTypeSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

### 7.3 Temporary Event Team Schemas

```typescript
const createEventTeamSchema = z.object({
  eventId: eventIdSchema,
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const addTeamMemberSchema = z.object({
  staffMetaId: staffMetaIdSchema,
  title: z.string().max(100).optional(),
  assignedUntil: z.coerce.date().optional(),
});
```

### 7.4 Event Responsibility Schemas

```typescript
const createResponsibilitySchema = z.object({
  eventId: eventIdSchema.optional(),
  mashwaraId: z.string().cuid().optional(),
  mashwaraOccurrenceId: z.string().cuid().optional(),
  title: responsibilityTitleSchema,
  description: z.string().max(500).optional(),
  assignedToStaffMetaId: staffMetaIdSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  data => data.endDate > data.startDate,
  { message: "endDate must be after startDate" }
).refine(
  data => (data.eventId !== undefined) !== (data.mashwaraId !== undefined),
  { message: "Exactly one parent required: eventId XOR mashwaraId" }
).refine(
  data => data.mashwaraOccurrenceId === undefined || data.mashwaraId !== undefined,
  { message: "mashwaraOccurrenceId is allowed only when mashwaraId is set" }
);

const listResponsibilitiesSchema = z.object({
  eventId: eventIdSchema.optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional(),
  isActive: z.boolean().optional(),
  cityId: cityIdSchema.optional(), // narrowing only
});
```

### 7.5 Planner Item Schemas

```typescript
const createPlannerItemSchema = z.object({
  eventId: eventIdSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional(),
  teamId: z.string().cuid().optional(),
  dueDate: z.coerce.date().optional(),
  priority: prioritySchema.optional().default("medium"),
});

const updatePlannerItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional(),
  teamId: z.string().cuid().optional(),
  dueDate: z.coerce.date().optional(),
  priority: prioritySchema.optional(),
  status: plannerItemStatusSchema.optional(),
  completionNote: z.string().max(500).optional(),
});
```

---

## 8. API Matrix

### 8.1 Event Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema | Response |
|--------|------|---------|-----------|-------------|---------------|----------|
| `POST` | `/api/admin/events` | createEvent | `events.manage` | resolveActorCity: HQ provides explicit cityId; scoped derives from StaffMeta; mismatch = 403 | `createEventSchema` | `Event` |
| `GET` | `/api/admin/events` | listEvents | `events.view` | resolveActorCity: HQ must provide cityId or 403; scoped derives from StaffMeta; filters `planned` when caller lacks `events.manage` | `listEventsSchema` | `{ events: Event[], total, page, limit }` |
| `GET` | `/api/admin/events/[id]` | getEvent | `events.view` | resolveActorCity against event.cityId; return 404 if event is `planned` and caller lacks `events.manage` | — | `Event` with teams, responsibilities, items |
| `PATCH` | `/api/admin/events/[id]` | updateEvent | `events.manage` | resolveActorCity against event.cityId | `updateEventSchema` | `Event` |
| `POST` | `/api/admin/events/[id]/cancel` | cancelEvent | `events.manage` | resolveActorCity against event.cityId | `{ reason?: string }` | `Event` |
| `POST` | `/api/admin/events/[id]/complete` | completeEvent | `events.manage` | resolveActorCity against event.cityId | — | `Event` |

### 8.2 Temporary Event Team Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `POST` | `/api/admin/events/[eventId]/teams` | createTeam | `events.manage` | resolveActorCity against event.cityId | `createEventTeamSchema` |
| `GET` | `/api/admin/events/[eventId]/teams` | listTeams | `events.view` | resolveActorCity against event.cityId | — |
| `PATCH` | `/api/admin/events/teams/[teamId]` | updateTeam | `events.manage` | resolveActorCity against team.event.cityId | `{ title?, description? }` |
| `DELETE` | `/api/admin/events/teams/[teamId]` | deactivateTeam | `events.manage` | resolveActorCity against team.event.cityId | — |
| `POST` | `/api/admin/events/teams/[teamId]/members` | addMember | `events.manage` | resolveActorCity against team.event.cityId | `addTeamMemberSchema` |
| `DELETE` | `/api/admin/events/teams/[teamId]/members/[memberId]` | removeMember | `events.manage` | resolveActorCity against team.event.cityId | `{ reason?: string }` |

### 8.3 Event Responsibility Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `POST` | `/api/admin/events/[eventId]/responsibilities` | createResponsibility | `events.responsibilities.manage` | resolveActorCity against event.cityId (or derived from Mashwara for mashwaraId); parent city must match assignee's StaffMeta city | `createResponsibilitySchema` (parentId injected) |
| `GET` | `/api/admin/events/[eventId]/responsibilities` | listResponsibilities | `events.view` | resolveActorCity against event.cityId | — |
| `GET` | `/api/admin/events/responsibilities/[id]` | getResponsibility | `events.view` | resolveActorCity against responsibility.cityId | — |
| `POST` | `/api/admin/events/responsibilities/[id]/revoke` | revokeResponsibility | `events.responsibilities.manage` | resolveActorCity against responsibility.cityId | `{ reason?: string }` |
| `GET` | `/api/me/responsibilities` | myResponsibilities | `requireAuth` | own staffMetaId only | — |

**Note:** `POST /api/admin/events/[eventId]/responsibilities` receives an eventId from the URL path and injects it into the body before validation. A separate `POST /api/admin/mashwara/[mashwaraId]/responsibilities` (or similar future endpoint) will inject mashwaraId. The `createResponsibilitySchema` validates that exactly one parent is set: `eventId` XOR `mashwaraId`.

### 8.4 Event Planner Item Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `POST` | `/api/admin/events/[eventId]/planner` | createPlannerItem | `events.manage` | resolveActorCity against event.cityId | `createPlannerItemSchema` (eventId injected) |
| `GET` | `/api/admin/events/[eventId]/planner` | listPlannerItems | `events.view` | resolveActorCity against event.cityId | — |
| `PATCH` | `/api/admin/events/planner/[itemId]` | updatePlannerItem | `events.manage` OR item creator/assignee | resolveActorCity against event.cityId | `updatePlannerItemSchema` |

**Planner item update rule:** A staff member assigned to a planner item may update `status`, `completionNote`, and `dueDate` on their own items. All other fields require `events.manage`.

---

## 9. UI-State Contract

### 9.1 Event List Page (City Head/Super Admin/Program Admin)

- **Create button:** "New Event" → opens create form with title, type, dates, venue, capacity, consent/medical flags.
- **Filters:** Status, type, date range.
- **Event cards/rows:** Title, type badge, date range, status pill, team count, responsibility count, item count.
- **Actions:** View, Edit, Cancel (if not completed/cancelled), Complete (if in_progress).

### 9.2 Event Detail Page

- **Header:** Title, type, status, dates, venue.
- **Tabs:**
  1. **Overview** — description, capacity, safety flags, venue notes.
  2. **Teams** — list of temporary event teams, members, add/remove controls (City Head/HQ only).
  3. **Responsibilities** — list of responsibility assignments, assigned-to, dates, status (active/expired/revoked), revoke control (City Head/HQ only).
  4. **Planner** — kanban or list-style task board, create/edit/complete items.

### 9.3 My Responsibilities View (Any Staff)

- Available from sidebar/profile: "My Responsibilities".
- Lists active `EventResponsibility` records where `assignedToStaffMetaId` matches the user.
- Shows: title, event name, start/end dates, days remaining.
- Expired/revoked items shown with reduced opacity and "Expired" / "Revoked" badge.

### 9.4 Empty State

- No events in city: "No events yet. Create your first event to start planning."
- No teams: "No teams assigned. Add a team to organize event staff."
- No responsibilities: "No responsibilities assigned."
- No planner items: "No tasks yet. Add tasks to track event preparation."
- Expired view: "This responsibility has expired." / "This responsibility was revoked on [date]."

### 9.5 Loading State

- Skeleton cards/rows while fetching.
- Disabled buttons during mutation (prevent double-submit).

### 9.6 Error State

- `401`: "Please sign in to continue."
- `403`: "You do not have permission to perform this action."
- `404`: "Event not found." / "Responsibility not found."
- `409`: "This event cannot be modified in its current state."
- `422`: Field-level Zod validation errors.
- `500`: "Something went wrong. Please try again."

---

## 10. Migration Sequence

### 10.1 Prerequisites

- PKG-01's additive content-planner migration must be approved and integrated first.
- The codebase must be on the `codex/production-hardening` branch with both Prisma schemas in sync.

### 10.2 Migration Steps

1. **Add models to both schema files:**
   - `Event`
   - `TemporaryEventTeam`
   - `EventTeamMembership`
   - `EventResponsibility`
   - `EventPlannerItem`

2. **Generate Prisma client** (both SQLite and PostgreSQL paths).

3. **Create additive local migration** (SQLite): `npx prisma migrate dev --name add_event_responsibility_models`

4. **Align PostgreSQL:** Manually copy the migration SQL to `prisma/postgres/` or generate via `prisma migrate dev --schema prisma/postgres/schema.prisma`

5. **Add capability constants** to `src/lib/auth/capabilities.ts`:
   - `"events.manage"`
   - `"events.view"`
   - `"events.responsibilities.manage"`

6. **Add role defaults** for `super_admin`, `program_admin`, `city_head`, `park_lead`.

7. **Create API routes** as defined in Section 8.

8. **Add scope derivation helper** (if not already existing directly): a `deriveCityFromEvent(eventId)` helper that queries `Event.cityId` and compares against the user's derived city.

9. **Add focused tests** (see Section 11).

10. **Run full quality gates:** lint, typecheck, test suite, SQLite build, PostgreSQL build.

### 10.3 Rollback Plan

**General rollback principles:**
- **Backup before migration:** A full database backup (SQLite file copy or PostgreSQL pg_dump) must be taken before applying the additive migration. This is the only recovery path that preserves all data.
- **Forward repair for standard rollback:** Rather than dropping tables, the preferred rollback is a forward migration that removes application access (deactivate routes, hide UI, revoke capabilities) while preserving operational data in-place. This keeps audit references intact and allows re-enabling without data loss.
- **Verified restore for Codex-and-owner incident recovery:** If the migration must be fully reversed and data loss is authorised by the owner, restore from the pre-migration backup. This is an incident response action, not a routine rollback. All operational and audit records are preserved in the backup.
- **Preserve audit records:** `AuditLog` entries referencing event entities are never dropped or altered. They remain as historical evidence under the existing redaction and access rules.

**Rollback steps (in priority order):**

1. **Disable access (safest):** Remove capability constants from `capabilities.ts`, revert role defaults, and delete API route files. The additive tables remain in the database with their data intact but are unreachable through the application. This is the only standard rollback path.
2. **Verified restore (Codex-and-owner incident only):** Codex and the project owner jointly decide to restore from the pre-migration backup. This is an incident response action, not a routine rollback. The process is: stop the application, restore from backup, verify integrity, restart. All operational and audit records are preserved in the backup.

No destructive DROP TABLE option is provided. Routine rollback is always the disable-access path. Destructive schema changes require a forward repair migration following the backup-first policy and must be approved by Codex and the owner before execution.

**Data retention under disable-access rollback:**

| Table | State | Access |
|-------|-------|--------|
| `Event` | Preserved intact | Unreachable via application |
| `TemporaryEventTeam` | Preserved intact | Unreachable via application |
| `EventTeamMembership` | Preserved intact | Unreachable via application |
| `EventResponsibility` | Preserved intact | Unreachable via application |
| `EventPlannerItem` | Preserved intact | Unreachable via application |

Under no circumstances are `AuditLog` records referencing event entities dropped or altered. They remain as historical evidence with their existing references intact.

---

## 11. Test Contract

### 11.1 Allow Tests (Success Paths)

| ID | Test | Expected |
|----|------|----------|
| EVT-ALLOW-001 | Super Admin creates an event in any city | 201 + Event returned |
| EVT-ALLOW-002 | Program Admin creates an event in any city | 201 + Event returned |
| EVT-ALLOW-003 | City Head creates an event in own city | 201 + Event returned |
| EVT-ALLOW-004 | City Head lists events in own city | 200 + events array (scoped) |
| EVT-ALLOW-005 | City Head updates own city event (title, dates) | 200 + updated Event |
| EVT-ALLOW-006 | City Head cancels own city event | 200 + status = "cancelled" |
| EVT-ALLOW-007 | City Head completes own city event | 200 + status = "completed" |
| EVT-ALLOW-008 | City Head creates temporary team on own city event | 201 + Team returned |
| EVT-ALLOW-009 | City Head adds member to temp team | 201 + Membership returned |
| EVT-ALLOW-010 | City Head removes member from temp team | 200 + membership isActive = false |
| EVT-ALLOW-011 | City Head creates responsibility on own city event | 201 + Responsibility returned |
| EVT-ALLOW-012 | City Head revokes own city responsibility | 200 + revokedAt set |
| EVT-ALLOW-013 | City Head creates planner item | 201 + Item returned |
| EVT-ALLOW-014 | Park Lead views event details (own city, events.view) | 200 + Event |
| EVT-ALLOW-015 | Assigned staff reads own responsibilities via `/api/me/responsibilities` | 200 + own active responsibilities |
| EVT-ALLOW-016 | Assigned staff updates own planner item status | 200 + updated status |
| EVT-ALLOW-017 | Event with endDate < now — responsibility auto-expired on access check | 403 (endDate check fails) |
| EVT-ALLOW-018 | Revoked responsibility — API returns 403 on access | 403 |
| EVT-ALLOW-019 | Super Admin creates event with explicit cityId | 201 + Event in correct city |
| EVT-ALLOW-020 | Program Admin lists events with explicit cityId | 200 + city-scoped events |
| EVT-ALLOW-021 | City Head creates a Mashwara-linked responsibility (mashwaraId set, eventId null) | 201 + Responsibility returned |
| EVT-ALLOW-022 | City Head creates event-linked responsibility — city derived from event matches assignee | 201 + Responsibility returned |
| EVT-ALLOW-023 | City Head creates Mashwara-linked responsibility with mashwaraOccurrenceId | 201 + Responsibility returned |

### 11.2 Deny Tests (Negative Paths)

| ID | Test | Expected |
|----|------|----------|
| EVT-DENY-001 | Unauthenticated user creates event | 401 |
| EVT-DENY-002 | Park Admin creates event | 403 |
| EVT-DENY-003 | Murabbi creates event | 403 |
| EVT-DENY-004 | Guardian/Student creates event | 403 |
| EVT-DENY-005 | City Head creates event in another city | 403 |
| EVT-DENY-006 | City Head updates event in another city | 403 |
| EVT-DENY-007 | City Head cancels event in another city | 403 |
| EVT-DENY-008 | Park Lead creates responsibility on event | 403 |
| EVT-DENY-009 | City Head creates responsibility with assignedToStaffMeta from another city | 403 (assignee city mismatch) |
| EVT-DENY-010 | City Head creates responsibility without any parent (no eventId, no mashwaraId) | 422 |
| EVT-DENY-011 | City Head creates responsibility with endDate <= startDate | 422 |
| EVT-DENY-012 | City Head creates responsibility without endDate | 422 |
| EVT-DENY-013 | City Head revokes another-city responsibility | 403 |
| EVT-DENY-014 | Park Lead creates planner item | 403 |
| EVT-DENY-015 | Assigned staff updates planner item title (non-own field) | 403 |
| EVT-DENY-016 | City Head lists events with another city's cityId | 403 (resolveActorCity mismatch) |
| EVT-DENY-017 | Deactivated staff member's active responsibility | 403 (isActive check on StaffMeta) |
| EVT-DENY-018 | Park Lead (events.view only) lists events — planned events are filtered out | 200 + no planned events in response |
| EVT-DENY-019 | Park Lead (events.view only) reads a planned event by ID | 404 (not found) |
| EVT-DENY-020 | Super Admin creates event without cityId | 422 (cityId required for HQ) |
| EVT-DENY-021 | Program Admin lists events without cityId | 422 (cityId required for HQ) |
| EVT-DENY-022 | City Head creates event with cityId set to a different city | 403 (rejected — does not match derived city) |
| EVT-DENY-023 | City Head creates responsibility with both eventId and mashwaraId set | 422 (exactly one parent required) |
| EVT-DENY-024 | City Head creates responsibility with neither eventId nor mashwaraId | 422 (exactly one parent required) |
| EVT-DENY-025 | City Head creates Mashwara-linked responsibility where assignee city does not match Mashwara city | 403 (assignee city mismatch) |
| EVT-DENY-026 | City Head creates event-linked responsibility where assignee city does not match event city | 403 (assignee city mismatch) |
| EVT-DENY-027 | City Head creates responsibility with mashwaraOccurrenceId but no mashwaraId | 422 (occurrence requires mashwaraId) |
| EVT-DENY-028 | City Head attempts to change event.cityId via PATCH | 422 (cityId not in updateEventSchema) |

### 11.3 Failure/Error Tests

| ID | Test | Expected |
|----|------|----------|
| EVT-ERR-001 | Create event with empty title | 422, Zod error |
| EVT-ERR-002 | Create event with title > 200 chars | 422, Zod error |
| EVT-ERR-003 | Create event with invalid eventType | 422, Zod error |
| EVT-ERR-004 | Update non-existent event ID | 404 |
| EVT-ERR-005 | Create team on non-existent event | 404 |
| EVT-ERR-006 | Add member with non-existent staffMetaId | 404 |
| EVT-ERR-007 | Cancel already-completed event | 409 |
| EVT-ERR-008 | Complete already-cancelled event | 409 |
| EVT-ERR-009 | Revoke already-revoked responsibility | 409 |
| EVT-ERR-010 | Create responsibility with invalid staffMetaId | 404 |
| EVT-ERR-011 | List events with invalid page (< 1) | 422 |
| EVT-ERR-012 | List events with limit > 100 | 422 |

### 11.4 Audit Tests

| ID | Test | Expected |
|----|------|----------|
| EVT-AUDIT-001 | Creating event creates audit log entry | AuditLog with action "event.create" exists |
| EVT-AUDIT-002 | Updating event captures old/new values | AuditLog.oldValues and newValues populated |
| EVT-AUDIT-003 | Cancelling event logs reason | AuditLog.reason matches |
| EVT-AUDIT-004 | Revoking responsibility logs reason | AuditLog.reason matches |
| EVT-AUDIT-005 | Sensitive fields are redacted in audit | No PII in audit values |
| EVT-AUDIT-006 | Non-events.view user cannot read event audit logs | 403 |

---

## 12. Files To Create In Implementation Package

All paths relative to `src/` or project root:

### Schema
| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add 5 new models (Section 3) after `ActivityPlanItem` |
| `prisma/postgres/schema.prisma` | Add same 5 models (identical structure, postgres-compatible types) |
| `prisma/migrations/` | New additive migration |
| `prisma/postgres/migrations/` | Aligned migration |

### Auth
| File | Action |
|------|--------|
| `src/lib/auth/capabilities.ts` | Add 3 new capabilities + role defaults |

### Shared Helpers
| File | Action |
|------|--------|
| `src/lib/events/zod.ts` | All Zod schemas from Section 7 |
| `src/lib/events/types.ts` | TypeScript types derived from Zod |
| `src/lib/events/scope.ts` | `deriveCityFromEvent()`, `deriveCityFromStaffMeta()` (if not already extracted) |
| `src/lib/events/audit.ts` | Audit event helpers (wrappers around `createAuditLogData` with event-specific action strings) |

### API Routes
| File | Action |
|------|--------|
| `src/app/api/admin/events/route.ts` | POST (create), GET (list) |
| `src/app/api/admin/events/[id]/route.ts` | GET, PATCH |
| `src/app/api/admin/events/[id]/cancel/route.ts` | POST |
| `src/app/api/admin/events/[id]/complete/route.ts` | POST |
| `src/app/api/admin/events/[eventId]/teams/route.ts` | POST, GET |
| `src/app/api/admin/events/teams/[teamId]/route.ts` | PATCH, DELETE |
| `src/app/api/admin/events/teams/[teamId]/members/route.ts` | POST |
| `src/app/api/admin/events/teams/[teamId]/members/[memberId]/route.ts` | DELETE |
| `src/app/api/admin/events/[eventId]/responsibilities/route.ts` | POST, GET |
| `src/app/api/admin/events/responsibilities/[id]/route.ts` | GET |
| `src/app/api/admin/events/responsibilities/[id]/revoke/route.ts` | POST |
| `src/app/api/me/responsibilities/route.ts` | GET |
| `src/app/api/admin/events/[eventId]/planner/route.ts` | POST, GET |
| `src/app/api/admin/events/planner/[itemId]/route.ts` | PATCH |

### UI Components
| File | Action |
|------|--------|
| `src/components/modules/events/event-list.tsx` | Event list with filters |
| `src/components/modules/events/event-detail.tsx` | Tabbed event detail |
| `src/components/modules/events/event-form.tsx` | Create/edit form |
| `src/components/modules/events/teams-section.tsx` | Team management |
| `src/components/modules/events/responsibilities-section.tsx` | Responsibility management |
| `src/components/modules/events/planner-section.tsx` | Planner task board |
| `src/components/modules/events/my-responsibilities.tsx` | Staff's own responsibilities view |

### Tests
| File | Action |
|------|--------|
| `src/__tests__/api/events/allow.test.ts` | Allow tests (EVT-ALLOW-*) |
| `src/__tests__/api/events/deny.test.ts` | Deny tests (EVT-DENY-*) |
| `src/__tests__/api/events/error.test.ts` | Error tests (EVT-ERR-*) |
| `src/__tests__/api/events/audit.test.ts` | Audit tests (EVT-AUDIT-*) |
| `src/__tests__/lib/events/zod.test.ts` | Zod schema validation tests |
| `src/__tests__/lib/events/scope.test.ts` | Scope derivation tests |

---

## 13. Open Owner Decisions

These decisions must be approved by the project owner before the implementation package begins:

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| D1 | Event types — is the `eventType` enum (`trip`, `ceremony`, `campaign`, `activity`, `sports_day`, `camp`, `open_day`, `closing`, `other`) complete, or are additions/removals needed? | Accept or modify | Changes Zod enum and validation |
| D2 | Responsibility titles — is the `title` list (`Calling POC`, `Event Lead`, `Transport Lead`, etc.) correct? Should titles use a fixed enum or a free-text string with a controlled catalogue? | Enum vs catalogue | Affects Zod schema and API flexibility |
| D3 | Planner item assignment — should a team-assigned item be visible/editable by all team members, or by the team lead only? | All members vs Lead only | Affects authorization logic in planner update |
| D4 | Event cost — is the `cost` field on Event needed for the pilot, or should it be deferred? | Include vs Defer | Affects schema and form |
| D5 | Event attendance — should the Event model link to a future attendance model now (via nullable FK), or is that entirely separate work? | Add ref now vs Defer entire | Nil if deferred |
| D6 | Calling POC — should the `EventResponsibility` model also support a `campaignId` FK for Calling campaigns, or is linking only via `eventId` sufficient for the pilot? | event-only vs event+campaign | May require an additional FK field if campaigns exist before the Event model |
| D7 | Planner item — can a planner item be created without a team or assignee (unassigned task visible to all event managers)? | Allow unassigned vs Require assignee | Affects Zod validation and UI |

---

## 14. Implementation Package Handoff

### Summary

This contract turns EVENT-301 (design) and EVENT-302 (implementation) into a single implementation-ready specification. It defines 5 additive Prisma models, 3 new capabilities, 22 API endpoints, 70 tests (23 allow, 29 deny, 12 error, 6 audit), and a complete migration/rollback plan.

### Key rules preserved

- **Calling POC is a temporary event/Mashwara responsibility only**, never a login role or city-wide post.
- **Temporary event teams are separate from permanent collaboration teams** and never expand authorization scope.
- **City scope is derived server-side through `StaffMeta`** — request parameters may only narrow.
- **All responsibilities have mandatory expiry** (`endDate`). Expired/revoked responsibilities yield no access.
- **Audit is required for all mutations** using the existing `createAuditLogData`/`logAudit` pattern.

### Pre-requisites

- PKG-01 content-planner schema migration must be approved and integrated.
- The base commit `99f9460` must be reachable on the target branch.

### Risks

- If Mashwara implementation (`MASHWARA-302`) starts before the Event model, the `mashwaraId` and `mashwaraOccurrenceId` fields on `EventResponsibility` will be string references without FK constraints. They can be made proper FKs in the Mashwara package.
- If Calling implementation (`CALL-302`) starts before the Event model, Calling POC assignments will need to use a different mechanism temporarily or wait for this model.
- The `Event` model's `cost` field uses `Decimal` in PostgreSQL and `Float` in SQLite — the application must handle this type difference carefully.

### Handoff checklist

- [ ] Prisma schemas (SQLite + PostgreSQL) updated with 5 new additive models
- [ ] Migration generated and tested on SQLite
- [ ] PostgreSQL migration aligned
- [ ] Capability catalogue updated with `events.*` capabilities
- [ ] Role defaults updated
- [ ] Zod schemas created
- [ ] API routes implemented (22 endpoints)
- [ ] Scope derivation helpers created
- [ ] Audit helpers created
- [ ] UI components created (7 components)
- [ ] Tests pass (70 test cases: 23 allow, 29 deny, 12 error, 6 audit)
- [ ] Lint, typecheck, full test suite, SQLite build, PostgreSQL build pass
- [ ] Owner decisions D1–D7 resolved
- [ ] This contract updated with any deviations from the original design

---

*End of EVENT-303 Implementation Contract*
