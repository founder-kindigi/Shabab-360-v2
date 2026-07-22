# EVENT-301 Event Responsibility & Temporary Team Design

**Task ID:** `EVENT-301`  
**Status:** `PROPOSED` (Design Authority Only — No Schema / Code Changes Applied)  
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
- **Event Team Membership (Decoupled Dynamic Context):** Event responsibilities are granted via temporary `EventTeamMember` and `EventResponsibilityAssignment` records. Belonging to a "Security Team" or acting as an "Event Lead" for a trip does **not** alter the user's underlying system `role` or permanent `assignedParkId`/`assignedCityId`.
- **Contextual Capability Elevation:** Operational permissions for event management (e.g., taking event check-ins, marking task completion, issuing event alerts) are evaluated dynamically by combining baseline scope with active event assignments.

```
┌────────────────────────────────────────────────────────┐
│               Permanent System Identity                │
│ User (id, role: PARK_ADMIN, assignedParkId: park-lahore)│
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
- **Automatic Expiry:** Assignments transition logically to `EXPIRED` once `expiresAt` passes, requiring no background cron job for security enforcement (though a lightweight background job can update status for reporting).
- **Early Revocation:** Event Leads, Park Leads, or City Heads can explicitly mark an assignment as `REVOKED`.

### 2.3 City / Park / Event Scoping Rules
An event operates under one of three explicit scope models (`EventScopeType`):
1. **CITY_WIDE:** Event belongs to a `City` and encompasses all Parks within that City (e.g., Annual Inauguration Ceremony, City Admissions Drive). Managed primarily by City Head & appointed Event Steering Teams.
2. **SINGLE_PARK:** Event belongs strictly to one `Park` (e.g., Park Swimming Session, Park Welcome Night). Managed by Park Lead / Park Admin / appointed Park Event Lead.
3. **MULTI_PARK:** Event belongs to a `City` but targets a defined subset of explicit `Park` records via junction records (`EventScopePark`) (e.g., Joint Trip for North and South Parks).

```
   [City: Lahore]
     │
     ├──> City-Wide Event: "Lahore Inauguration 2026" (Scope: CITY_WIDE)
     │
     ├──> Multi-Park Event: "Inter-Park Swimming Gala" (Scope: MULTI_PARK -> Park A, Park B)
     │
     └──> [Park: Gulberg Park]
            │
            └──> Single-Park Event: "Gulberg Welcome Orientation" (Scope: SINGLE_PARK)
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

- **DRAFT:** Initial setup by event creator. Teams and tasks can be defined. Event visible only to creator, Park Lead, and City Head.
- **PLANNING:** Published for team assignment and participant registration. Tasks can be assigned. Notifications for pre-event preparation enabled.
- **ACTIVE:** Event is currently underway (or on the event day). Operational check-ins, live team management, and active notifications enabled.
- **COMPLETED:** Event concluded. Attendance and task lists locked against non-admin edits. Post-event reporting enabled.
- **ARCHIVED:** Finalized event record locked for historical compliance.
- **CANCELLED:** Event terminated prior to completion. All active assignments invalidated.

### 3.2 Event Tasks & Execution
- Events contain granular operational tasks (`EventTask`) assigned to specific `EventTeam` records or individual `User` IDs.
- Examples: "Set up parking barriers" (Security Team), "Distribute swimming passes" (Logistics Team), "Conduct Parent Interviews" (Admissions Team).
- Task status flow: `PENDING` -> `IN_PROGRESS` -> `COMPLETED` -> `VERIFIED`.

### 3.3 Event Attendance & Duty Check-ins
- **Participant Attendance:** Independent from regular weekly batch attendance. Tracks student/participant presence at the specific event (`EventAttendanceRecord`).
- **Staff Duty Check-ins:** Tracks whether assigned team members (e.g., Security, Parking volunteers) checked in for their temporary event duties.

### 3.4 Event Notifications
- Targeted multi-channel notifications (In-app, Push, Email) scoped to event contexts:
  - Broadcast to all event participants (e.g., "Trip departure time changed to 7:00 AM").
  - Broadcast to specific event teams (e.g., "Parking Team report to Gate 2").
  - Automated pre-event reminders to Guardians for consent form submissions.

### 3.5 Event Audit Trail
- All critical event actions (event creation, state transition, team assignment creation/revocation, task status updates, attendance modifications) produce immutable `AuditLog` records tagged with `eventId` and actor metadata.

---

## 4. Role & Scope Authorization Matrix

| Action / Capability | Super Admin | City Head | Park Lead | Park Admin | Murabbi | Event Lead (Temp) | Team Member (Temp) | Participant / Guardian |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Create City Event** | ✅ | ✅ (Own City) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create Park Event** | ✅ | ✅ (Own City) | ✅ (Own Park) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Manage Event Setup / Lifecycle** | ✅ | ✅ (Own City) | ✅ (Own Park) | ❌ | ❌ | ✅ (Assigned Event) | ❌ | ❌ |
| **Form Teams & Assign Responsibilities** | ✅ | ✅ (Own City) | ✅ (Own Park) | ✅ (Own Park Event) | ❌ | ✅ (Assigned Event) | ❌ | ❌ |
| **Manage Event Tasks** | ✅ | ✅ (Own City) | ✅ (Own Park) | ✅ (Own Park Event) | ❌ | ✅ (Assigned Event) | ✅ (Assigned Tasks) | ❌ |
| **Take Event Attendance / Staff Check-in** | ✅ | ✅ (Own City) | ✅ (Own Park) | ✅ (Own Park Event) | ✅ (If assigned) | ✅ (Assigned Event) | ✅ (If team role permits) | ❌ |
| **Send Event Notifications** | ✅ | ✅ (Own City) | ✅ (Own Park) | ✅ (Own Park Event) | ❌ | ✅ (Assigned Event) | ❌ | ❌ |
| **View Event Roster & Schedule** | ✅ | ✅ (Own City) | ✅ (Own Park) | ✅ (Own Park) | ✅ (If attending) | ✅ (Assigned Event) | ✅ (Assigned Event) | ✅ (Own event details) |
| **View Event Audit Log** | ✅ | ✅ (Own City) | ✅ (Own Park) | ❌ | ❌ | ✅ (Assigned Event) | ❌ | ❌ |

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

  // Primary park anchor for SINGLE_PARK events (null for CITY_WIDE)
  parkId       String?
  park         Park?          @relation("PrimaryParkEvents", fields: [parkId], references: [id], onDelete: SetNull)

  // Explicit target parks for MULTI_PARK events
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

  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  eventRole   EventRole      @default(TEAM_MEMBER)
  title       String?        // Custom operational title e.g., "Head of Security"

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
| `POST` | `/api/events` | Create new event record | City Head (City-wide), Park Lead (Park-specific) |
| `GET` | `/api/events/[id]` | Fetch detailed event overview, teams & tasks | Scoped access (Participant/Staff/Admin) |
| `PATCH` | `/api/events/[id]` | Update event details or advance lifecycle status | City Head / Park Lead / Event Lead |
| `POST` | `/api/events/[id]/teams` | Create operational team (Security, Parking, Welcome) | City Head / Park Lead / Event Lead |
| `POST` | `/api/events/[id]/assignments` | Assign user to event team with explicit expiry | City Head / Park Lead / Event Lead |
| `DELETE` | `/api/events/[id]/assignments/[assignmentId]` | Early revocation of responsibility assignment | City Head / Park Lead / Event Lead |
| `GET` | `/api/events/[id]/tasks` | List operational tasks for event | Event Staff / Assignees |
| `POST` | `/api/events/[id]/tasks` | Create task & assign to team/user | Event Lead / Team Lead |
| `PATCH` | `/api/events/[id]/tasks/[taskId]` | Update task status (`PENDING` -> `COMPLETED`) | Task Assignee / Team Lead / Event Lead |
| `POST` | `/api/events/[id]/attendance` | Mark event check-in for student or duty staff | Authorized Attendance Recorder / Team Lead |
| `GET` | `/api/events/[id]/audit` | Retrieve full event operational audit log | City Head / Park Lead / Event Lead |

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

1. **Authorization & Scope Verification Unit Tests:**
   - Verify City Head can create and manage `CITY_WIDE` events in their assigned city.
   - Verify Park Lead can create `SINGLE_PARK` events for their assigned park but cannot mutate foreign park events.
   - Verify Murabbi or standard Park Admin cannot elevate their permanent system role via event team creation.

2. **Temporal Expiry Integration Tests:**
   - Create `EventResponsibilityAssignment` with `expiresAt` in the past. Verify authorization middleware rejects event management requests with `403 Forbidden`.
   - Verify active assignments within `startsAt` and `expiresAt` permit designated operational tasks.
   - Test early revocation (`isActive = false`) invalidates access immediately.

3. **Event Attendance & Duty Check-in Tests:**
   - Verify event attendance records do not modify or collide with regular weekly `AttendanceRecord` entries.
   - Verify staff check-in records correctly log `staffUserId` and `recordedById`.

4. **Audit Trail Verification:**
   - Verify every state change (`DRAFT` -> `PLANNING` -> `ACTIVE` -> `COMPLETED`) generates a corresponding `AuditLog` entry with complete metadata.

---

## 7. Execution Readiness & Handoff

> [!IMPORTANT]
> This document represents the authoritative architectural design for **Task EVENT-301**. No code, schema migrations, database writes, or staging deployments have been executed as part of this task. Implementation shall commence under dedicated implementation tasks (`EVENT-302+`) upon owner approval.
