# EVENT-301 Event Responsibility & Temporary Team Design

**Task ID:** `EVENT-301`
**Status:** `PROPOSED` (Design Proposal Pending Owner Approval — No Schema / Code Changes Applied)
**Integration Base:** `codex/production-hardening` @ `2a3fcc7`

---

## 1. Executive Summary & Scope

Shabab 360 requires a unified **Event Module** to manage specialized, recurring, and ad-hoc activities across cities and parks. These include:
- **Admissions Campaigns** (City-wide outreach, application drives, parent interviews)
- **Specialized Activities** (Swimming sessions, outdoor trips, workshops)
- **Ceremonial Events** (Inauguration ceremonies, closing ceremonies)
- **Temporary Operations & Support Teams** (Security, Parking management, Welcome/Reception, Logistics, First Aid)

Currently, system authorization is anchored strictly to permanent organizational entities (`City`, `Park`, `Batch`, `Group`) and static user roles (`SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD`, `PARK_ADMIN`, `MURABBI`). Standard operations do not support temporary event-specific operational authority or short-lived duty assignments.

This design introduces a decoupled **Event Responsibility Architecture** that enables time-bound, event-scoped duty assignments and team memberships without mutating permanent user login roles or breaching organizational security boundaries.

---

## 2. Core Architectural Principles

### 2.1 Login-Role Separation vs. Event Team Membership
- **System Login Roles (Immutable Baseline):** A user's system role (`SUPER_ADMIN`, `CITY_HEAD`, `PARK_LEAD`, `PARK_ADMIN`, `MURABBI`, `STUDENT`, `GUARDIAN`) defines their baseline access to permanent Shabab 360 resources.
- **Event Team Membership (Decoupled Dynamic Context):** Event responsibilities are granted via temporary `EventResponsibilityAssignment` records. Belonging to a "Security Team" or acting as an "Event Lead" for a trip does **not** alter the user's underlying system `role` or permanent `assignedParkId`/`assignedCityId`.
- **Restricted Event Lead Capabilities:** A temporary Event Lead does **not** gain unrestricted setup/lifecycle, team-formation, or notification authority. Temporary Event Leads receive only explicitly delegated, event-scoped operational capabilities bounded strictly by `startsAt`/`expiresAt`, city validation, and mandatory audit logging.
- **Grant Ceiling Rule:** An Event Lead cannot grant capabilities or assign roles beyond their own approved event grant.

```
┌────────────────────────────────────────────────────────┐
│               Permanent System Identity                │
│ User (id, role: MURABBI, assignedParkId: park-lahore)  │
└──────────────────────────┬─────────────────────────────┘
                           │
             Grants Baseline Application Access
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             Temporary Event Context Grant              │
│ EventResponsibilityAssignment                          │
│  - eventId: event-swimming-2026                        │
│  - teamType: SECURITY                                  │
│  - eventRole: TEAM_LEAD                                │
│  - startsAt: 2026-08-01T08:00:00Z                      │
│  - expiresAt: 2026-08-01T18:00:00Z                     │
│  - status: ACTIVE                                      │
└────────────────────────────────────────────────────────┘
```

### 2.2 Temporary Responsibility Assignments & Expiry
- All event-specific operational grants must have explicit temporal boundaries (`startsAt`, `expiresAt`).
- **Dynamic Authorization Check:** Authorization logic evaluates `now() >= assignment.startsAt && now() <= assignment.expiresAt && assignment.status === 'ACTIVE'`.
- **Automatic Expiry:** Assignments transition logically to `EXPIRED` once `expiresAt` passes, requiring no background cron job for security enforcement.
- **Early Revocation:** City Heads or Park Leads can explicitly mark an assignment as `REVOKED`.

### 2.3 Scope Invariants & Boundaries
An event operates under one of three explicit scope models (`EventScopeType`):
1. **CITY_WIDE:** Event belongs to a `City` and encompasses all Parks within that City (e.g., Annual Inauguration Ceremony, City Admissions Drive). Created and managed by City Head & appointed Event Steering Teams.
2. **SINGLE_PARK:** Event belongs strictly to one `Park` (e.g., Park Swimming Session, Park Welcome Night). Managed by Park Lead / appointed Park Event Lead.
3. **MULTI_PARK:** Event belongs to a `City` but targets a defined subset of explicit `Park` records via junction records (`EventScopePark`) (e.g., Joint Trip for North and South Parks).

#### Strict Invariant Enforcement:
- **City-Park Hierarchy Invariant:** `Event.parkId` (if set) and all `EventScopePark.parkId` entries MUST belong to `Event.cityId`. Cross-city park inclusion is strictly rejected with a `400 Bad Request` validation error.
- **User-City Alignment Invariant:** Every assigned user (`EventResponsibilityAssignment.userId`) MUST belong to the same city (`Event.cityId`). Attempts to assign staff from a foreign city are denied.
- **Park Admin Scope Restriction:** In alignment with system security policy, Park Admin is strictly attendance-only for their assigned park. Park Admin has zero authority to manage event setup, create teams, manage tasks, or send event notifications.

```
   [City: Lahore]
     │
     ├──> City-Wide Event: "Lahore Inauguration 2026" (Scope: CITY_WIDE)
     │
     ├──> Multi-Park Event: "Inter-Park Swimming Gala" (Scope: MULTI_PARK -> Park A, Park B [Both in Lahore])
     │
     └──> [Park: Gulberg Park]
            │
            └──> Single-Park Event: "Gulberg Welcome Orientation" (Scope: SINGLE_PARK [Park in Lahore])
```

---

## 3. Event Lifecycle & Capabilities

### 3.1 Event Lifecycle States
Events transition through a strict, auditable lifecycle (`EventStatus`):

```
 [DRAFT] ───► [PLANNING] ───► [ACTIVE] ───► [COMPLETED] ───► [ARCHIVED]
    │             │              │
    └─────────────┴──────────────┴───────► [CANCELLED]
```

- **DRAFT:** Initial setup by event creator (City Head / Park Lead). Event visible only to creator, Park Lead, and City Head.
- **PLANNING:** Published for team assignment and participant registration. Operational tasks assigned.
- **ACTIVE:** Event is currently underway. Live operational check-ins enabled.
- **COMPLETED:** Event concluded. Attendance locked against non-admin edits.
- **ARCHIVED:** Finalized event record locked for historical compliance.
- **CANCELLED:** Event terminated prior to completion. All active assignments invalidated.

### 3.2 Event Tasks & Execution
- Events contain granular operational tasks (`EventTask`) assigned to specific `EventTeam` records or individual `User` IDs.
- Task status flow: `PENDING` -> `IN_PROGRESS` -> `COMPLETED` -> `VERIFIED`.

### 3.3 Event Attendance & Duty Check-ins
- **Participant Attendance:** Independent from regular weekly batch attendance. Tracks student/participant presence at the specific event (`EventAttendanceRecord`).
- **Staff Duty Check-ins:** Tracks whether assigned team members (e.g., Security, Parking volunteers) checked in for their temporary event duties.

### 3.4 Event Notifications Channel Constraint
- **Pilot Scope:** The current pilot version MUST use **In-App Notifications only**.
- **Future Channels:** Email and SMS/Push notifications are marked strictly as future channels, pending owner approval of a sending provider and consent management policy.

### 3.5 Event Audit Trail
- All critical event actions (event creation, scope validation, state transition, team assignment creation/revocation, task status updates, attendance modifications) produce immutable `AuditLog` records tagged with `eventId` and actor metadata.

---

## 4. Role & Scope Authorization Matrix

| Action / Capability | Super Admin | City Head | Park Lead | Park Admin | Murabbi | Event Lead (Temp) | Team Member (Temp) | Participant / Guardian |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Create City Event** | ✅ | ✅ (Own City) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create Park Event** | ✅ | ✅ (Own City) | ✅ (Own Park) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Manage Event Lifecycle** | ✅ | ✅ (Own City) | ✅ (Own Park) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Form Teams & Assign Roles** | ✅ | ✅ (Own City) | ✅ (Own Park) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Manage Event Tasks** | ✅ | ✅ (Own City) | ✅ (Own Park) | ❌ | ❌ | ✅ (Assigned Tasks) | ✅ (Assigned Tasks) | ❌ |
| **Take Event Attendance / Check-in** | ✅ | ✅ (Own City) | ✅ (Own Park) | ✅ (Own Park Events) | ✅ (If assigned) | ✅ (Assigned Event) | ✅ (If team permits) | ❌ |
| **Send In-App Event Notifications** | ✅ | ✅ (Own City) | ✅ (Own Park) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Event Roster & Schedule** | ✅ | ✅ (Own City) | ✅ (Own Park) | ✅ (Own Park) | ✅ (If attending) | ✅ (Assigned Event) | ✅ (Assigned Event) | ✅ (Own event details) |
| **View Event Audit Log** | ✅ | ✅ (Own City) | ✅ (Own Park) | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. API & Prisma Schema Design Proposal

### 5.1 Proposed Prisma Schema Extension (`prisma/schema.prisma` & `prisma/postgres/schema.prisma`)

```prisma
// ==========================================
// EVENT MODULE ENUMS
// ==========================================

enum EventType {
  ADMISSIONS_CAMPAIGN
  SWIMMING
  TRIP
  INAUGURATION
  CLOSING_CEREMONY
  OTHER
}

enum EventStatus {
  DRAFT
  PLANNING
  ACTIVE
  COMPLETED
  ARCHIVED
  CANCELLED
}

enum EventScopeType {
  CITY_WIDE
  SINGLE_PARK
  MULTI_PARK
}

enum EventTeamType {
  STEERING
  SECURITY
  PARKING
  WELCOME_RECEPTION
  LOGISTICS
  FIRST_AID
  CONDUCTOR
  INTERVIEW_PANEL
  CUSTOM
}

enum EventRole {
  EVENT_LEAD
  COORDINATOR
  TEAM_LEAD
  TEAM_MEMBER
  VOLUNTEER
}

enum EventTaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  VERIFIED
  CANCELLED
}

enum EventAttendanceStatus {
  PRESENT
  ABSENT
  EXCUSED
  LATE
}

// ==========================================
// EVENT MODULE MODELS
// ==========================================

model Event {
  id           String         @id @default(cuid())
  title        String
  description  String?
  type         EventType
  status       EventStatus    @default(DRAFT)
  scopeType    EventScopeType

  cityId       String
  city         City           @relation(fields: [cityId], references: [id], onDelete: Cascade)

  // Primary park anchor for SINGLE_PARK events (must belong to cityId)
  parkId       String?
  park         Park?          @relation("PrimaryParkEvents", fields: [parkId], references: [id], onDelete: SetNull)

  // Explicit target parks for MULTI_PARK events (all must belong to cityId)
  scopedParks  EventScopePark[]

  startsAt     DateTime
  endsAt       DateTime
  location     String?

  createdById  String
  createdBy    User           @relation("EventCreator", fields: [createdById], references: [id])

  teams        EventTeam[]
  assignments  EventResponsibilityAssignment[]
  tasks        EventTask[]
  attendance   EventAttendanceRecord[]

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([cityId])
  @@index([parkId])
  @@index([status])
  @@index([startsAt, endsAt])
}

model EventScopePark {
  id        String   @id @default(cuid())
  eventId   String
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  parkId    String
  park      Park     @relation(fields: [parkId], references: [id], onDelete: Cascade)

  @@unique([eventId, parkId])
  @@index([eventId])
  @@index([parkId])
}

model EventTeam {
  id          String        @id @default(cuid())
  eventId     String
  event       Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name        String        // e.g., "North Gate Parking Team"
  teamType    EventTeamType

  assignments EventResponsibilityAssignment[]
  tasks       EventTask[]

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([eventId])
}

model EventResponsibilityAssignment {
  id          String         @id @default(cuid())
  eventId     String
  event       Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)

  teamId      String?
  team        EventTeam?     @relation(fields: [teamId], references: [id], onDelete: SetNull)

  userId      String         // User must belong to same cityId as Event
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  eventRole   EventRole      @default(TEAM_MEMBER)
  title       String?        // Custom operational title e.g., "Parking Volunteer"

  startsAt    DateTime
  expiresAt   DateTime
  isActive    Boolean        @default(true)

  assignedById String
  assignedBy   User          @relation("AssignmentGranter", fields: [assignedById], references: [id])

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([eventId])
  @@index([userId])
  @@index([teamId])
  @@index([startsAt, expiresAt])
}

model EventTask {
  id          String          @id @default(cuid())
  eventId     String
  event       Event           @relation(fields: [eventId], references: [id], onDelete: Cascade)

  teamId      String?
  team        EventTeam?      @relation(fields: [teamId], references: [id], onDelete: SetNull)

  assigneeId  String?
  assignee    User?           @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  title       String
  description String?
  status      EventTaskStatus @default(PENDING)
  dueDate     DateTime?

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([eventId])
  @@index([teamId])
  @@index([assigneeId])
}

model EventAttendanceRecord {
  id            String                @id @default(cuid())
  eventId       String
  event         Event                 @relation(fields: [eventId], references: [id], onDelete: Cascade)

  participantId String?
  participant   Participant?          @relation(fields: [participantId], references: [id], onDelete: Cascade)

  staffUserId   String?
  staffUser     User?                 @relation(fields: [staffUserId], references: [id], onDelete: Cascade)

  status        EventAttendanceStatus @default(PRESENT)
  checkInTime   DateTime              @default(now())
  notes         String?

  recordedById  String
  recordedBy    User                  @relation("AttendanceRecorder", fields: [recordedById], references: [id])

  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  @@index([eventId])
  @@index([participantId])
  @@index([staffUserId])
}
```

---

### 5.2 Proposed REST API Endpoints

| Method | Path | Description | Authorization Scope |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | List events with filters (`cityId`, `parkId`, `type`, `status`) | City Head (City), Park Lead (Park), Staff (Assigned) |
| `POST` | `/api/events` | Create new event (Validates park belongs to city) | City Head (City-wide), Park Lead (Park-specific) |
| `GET` | `/api/events/[id]` | Fetch detailed event overview, teams & tasks | Scoped access (Participant/Staff/Admin) |
| `PATCH` | `/api/events/[id]` | Update event details or advance lifecycle status | City Head / Park Lead |
| `POST` | `/api/events/[id]/teams` | Create operational team | City Head / Park Lead |
| `POST` | `/api/events/[id]/assignments` | Assign user to event team (Validates user city & temporal bounds) | City Head / Park Lead |
| `DELETE` | `/api/events/[id]/assignments/[id]` | Early revocation of responsibility assignment | City Head / Park Lead |
| `GET` | `/api/events/[id]/tasks` | List operational tasks for event | Event Staff / Assignees |
| `POST` | `/api/events/[id]/tasks` | Create task & assign to team/user | City Head / Park Lead / Event Lead |
| `PATCH` | `/api/events/[id]/tasks/[taskId]` | Update task status (`PENDING` -> `COMPLETED`) | Task Assignee / Team Lead / Event Lead |
| `POST` | `/api/events/[id]/attendance` | Mark event check-in for student or duty staff | Attendance Recorder / Park Admin (Own Park) |
| `GET` | `/api/events/[id]/audit` | Retrieve full event operational audit log | City Head / Park Lead |

---

## 6. Migration, Rollback, and Test Plan

### 6.1 Schema Migration Strategy (Non-Breaking)
1. **Additive Prisma Schema Changes Only:** New models (`Event`, `EventTeam`, `EventResponsibilityAssignment`, `EventTask`, `EventAttendanceRecord`) are added alongside existing schemas (`prisma/schema.prisma` and `prisma/postgres/schema.prisma`). No existing models or fields are removed or altered.
2. **Dual-DB Schema Alignment:** Ensure both SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`) remain 100% aligned.
3. **No Backfill Required:** Events operate as clean new records. Baseline data (Cities, Parks, Users, Participants) require zero mutations.

### 6.2 Pre-Migration Backup & Safety Protocol
- **Strict Staging Backup Requirement:** Prior to applying schema updates on staging, execute a verified full database snapshot.
- **Rollback Protocol:** If migration fails or issues arise during deployment:
  > **Rollback Rule:** Restore the verified pre-migration staging backup. Reverse SQL or partial rollbacks are strictly prohibited.

### 6.3 Test & Verification Plan
Before recommending production readiness, the implementation must pass the following automated test suites:

1. **Scope Invariant Validation Unit Tests:**
   - Verify creating an event with a `parkId` outside `cityId` returns `400 Bad Request`.
   - Verify creating a `MULTI_PARK` event with any `EventScopePark` outside `cityId` returns `400 Bad Request`.
   - Verify assigning a user from a foreign city to an event returns `403 Forbidden`.
   - Verify Park Admin is denied team creation, lifecycle management, task creation, and notification sending.

2. **Temporal Expiry & Delegation Ceiling Tests:**
   - Create `EventResponsibilityAssignment` with `expiresAt` in the past. Verify authorization middleware rejects event management requests with `403 Forbidden`.
   - Verify Event Lead cannot grant capabilities or assign roles beyond their approved event grant.
   - Test early revocation (`isActive = false`) invalidates access immediately.

3. **In-App Notification Channel Tests:**
   - Verify event notification dispatches write strictly to in-app notification channels (`db.notification`).
   - Verify push/email channels remain disabled and rejected by validation logic.

4. **Event Attendance & Duty Check-in Tests:**
   - Verify event attendance records do not modify or collide with regular weekly `AttendanceRecord` entries.
   - Verify staff check-in records correctly log `staffUserId` and `recordedById`.

5. **Audit Trail Verification:**
   - Verify every state change (`DRAFT` -> `PLANNING` -> `ACTIVE` -> `COMPLETED`) generates a corresponding `AuditLog` entry with complete metadata.

---

## 7. Execution Readiness & Handoff

> [!IMPORTANT]
> This document represents the proposed design pending owner approval for **Task EVENT-301**. No code, schema migrations, database writes, or staging deployments have been executed as part of this task. Implementation shall commence under dedicated implementation tasks (`EVENT-302+`) upon owner approval.
