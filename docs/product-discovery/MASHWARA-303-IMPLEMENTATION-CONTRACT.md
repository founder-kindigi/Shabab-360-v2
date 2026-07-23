# MASHWARA-303: Weekly Mashwara Implementation Contract

**Status:** Implementation-ready contract (docs only — no code, no schema, no data)
**Owner:** Codex (design); implementation follows after PKG-01 and PKG-04 integration
**Dependencies:** PKG-01 additive schema migration, PKG-04 Event/Responsibility models
**Base:** codex/production-hardening @ 9563d06

---

## 1. Scope And Boundaries

### 1.1 What This Contract Covers

1. **Mashwara (Series)** — a recurring weekly staff meeting definition scoped to one city. Supports title, purpose, weekly recurrence pattern, and status (active/archived).
2. **MashwaraOccurrence** — a single meeting instance within a series. Manually created for pilot. Status: scheduled / completed / cancelled.
3. **MashwaraAttendance** — who attended a specific occurrence. City Head marks present/absent/excused for city staff.
4. **Karguzari (MoM)** — meeting minutes for an occurrence. Draft is editable; after finalization, immutable. Corrections are separate new entries.
5. **MashwaraDecision** — a decision captured during an occurrence. Has owner, due date, status.
6. **MashwaraActionItem** — a task assigned to a collaboration team or individual staff member. Has status, priority, due date, carry-forward, and expiry rules.
7. **MashwaraCorrectionNote** — an immutable correction or addendum to a finalized Karguzari. References the original occurrence.
8. **MashwaraMeetingShare** — an audited, revocable, meeting-specific grant of read-only access to a same-city active team member.

### 1.2 What Is Out Of Scope

- Automated occurrence generation (cron/scheduled — deferred post-pilot).
- Email, push notification, or external calendar delivery.
- File attachments to Karguzari, decisions, or action items.
- Cross-city or HQ-level Mashwara (future enhancement).
- Delegation of Mashwara management from City Head to Park Lead.
- PDF export of Karguzari.
- Integration with Calling campaigns or Event responsibilities (EventResponsibility from PKG-04 references mashwaraId; the Event module owns that link).
- Modification of CollaborationTeam, StaffTeamMembership, or Event models.

### 1.3 Key Product Rules (Owner-Approved)

- All active city collaboration-team members receive automatic restricted participant access to city-scoped Mashwara (read Karguzari, decisions, action items; update own-team tasks).
- A meeting-specific share grants read-only access to one occurrence for a selected same-city active team member. Revocable, audited.
- Collaboration team membership is an access predicate, never a login role or hierarchy-scope expansion.
- City scope derives server-side from StaffMeta: assignedCityId, or assignedParkId → Park.cityId, or assignedGroupId → Group/Batch city.
- Weekly recurrence only for pilot; manual occurrence creation.
- Karguzari/MoM is immutable after finalization. Corrections are separate CorrectionNote entries, never silent edits.
- Action items have assignment, status, due date, carry-forward, expiry, audit, and fail-closed authorization.
- Temporary Event responsibilities (PKG-04) and permanent collaboration teams remain distinct.
- File uploads remain disabled until private durable storage is separately approved.

---

## 2. Current-Model And Design Reconciliation

### 2.1 Verified Existing Models (from prisma/schema.prisma)

| Model | Key Fields | Relevant Relations | Notes |
|-------|-----------|-------------------|-------|
| `User` | id, email, isActive, tokenVersion | staffMeta, guardian, participant | Base identity |
| `StaffMeta` | id, userId (unique), role, assignedCityId?, assignedParkId?, assignedGroupId?, isActive | assignedCity, assignedPark, assignedGroup, teamMemberships | Single canonical assignment; city scope derivation |
| `CollaborationTeam` | id, cityId, code, name, isActive | city, memberships, contentBlocks, activityPlans | Permanent operational teams (Sports, Skills, Tadreeb, Media, Muawin) |
| `StaffTeamMembership` | id, staffMetaId, teamId, title?, startedAt, endedAt?, isActive | staffMeta, team | Team membership with history |
| `AuditLog` | id, userId?, action, entityType, entityId?, oldValues?, newValues?, reason?, createdAt | user | Redacted, restrict-read audit |
| `City` | id, name, code, isActive | parks, batches, cityHeads, collaborationTeams | Top of hierarchy |
| `EventResponsibility` (PKG-04) | id, mashwaraId?, eventId?, cityId, endDate, revokedAt | event, assignedToStaffMeta | Temporary responsibility; references mashwaraId as string |

### 2.2 Existing Authorization Patterns

- **Module gate:** `requireCapability("capability.name")` — checks session + role default / role override / user override
- **Data gate:** `canAccessResourceScope(user, {cityId, parkId, groupId})` or `requireCityScope(user, cityId)`
- **HQ roles** (`super_admin`, `program_admin`): may operate in any explicitly selected existing city; must never receive unfiltered cross-city lists or blind global access
- **City scope derivation:** `StaffMeta.assignedCityId`, or via `assignedParkId` → `Park.cityId`, or via `assignedGroupId` → `Group.batch.cityId`
- **Audit:** `logAudit({userId, action, entityType, entityId, oldValues?, newValues?, reason?})` or `createAuditLogData(...)` inside transactions
- **Capability catalogue** in `src/lib/auth/capabilities.ts` — new capabilities must be added there

### 2.3 What Does NOT Yet Exist

| Concept | Status |
|---------|--------|
| Mashwara (Series) model | Not in schema |
| MashwaraOccurrence model | Not in schema |
| MashwaraAttendance model | Not in schema |
| Karguzari (MoM) model | Not in schema |
| MashwaraDecision model | Not in schema |
| MashwaraActionItem model | Not in schema |
| MashwaraCorrectionNote model | Not in schema |
| MashwaraMeetingShare model | Not in schema |
| `mashwara.*` capabilities | Not in capabilities.ts |
| Mashwara API routes | Not implemented |
| Mashwara UI components | Not implemented |

### 2.4 Conflicts Between MASHWARA_DESIGN.md And Current Code

| Design Claim | Current Code Evidence | Resolution |
|-------------|----------------------|------------|
| `User.id` used in attendance and action items | Existing patterns link to `StaffMeta.id` for team memberships and activity plans | Use `staffMetaId` to align with `StaffTeamMembership` and `ActivityPlanItem` patterns |
| Attendance scope checks for staff from drop-down | Current scope derivation uses `StaffMeta.assignedCityId/parkId/groupId` | Follow same `resolveActorCity` variant for city derivation |
| Super Admin described as unchecked "All" | Current code: HQ bypasses scope but must supply explicit cityId (PKG-04 rule) | Apply same HQ rule: Super Admin/Program Admin must supply explicit cityId |

---

## 3. Additive Prisma Models (Both Schemas)

These models are additive-only. They must be added identically to `prisma/schema.prisma` (SQLite) and `prisma/postgres/schema.prisma` (PostgreSQL) after PKG-01 and PKG-04 schema migrations are integrated.

### 3.1 Mashwara (Series)

**Pilot scope:** Weekly recurrence only. The `recurrenceDayOfWeek` field is required on creation (not optional). Manual occurrence creation remains the only way to create meeting instances. Ad-hoc series, biweekly, monthly, and custom patterns are deferred post-pilot.

```prisma
model Mashwara {
  id               String   @id @default(cuid())
  cityId           String
  title            String
  purpose          String?
  recurrenceDayOfWeek Int   // 0=Sunday, 6=Saturday; required for pilot
  recurrenceTime   String?  // "HH:mm" local time
  status           String   @default("active") // "active" | "archived"
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  city         City                    @relation(fields: [cityId], references: [id], onDelete: Cascade)
  occurrences  MashwaraOccurrence[]

  @@index([cityId, status])
  @@map("mashwara")
}
```

### 3.2 MashwaraOccurrence

```prisma
model MashwaraOccurrence {
  id              String    @id @default(cuid())
  mashwaraId      String
  scheduledDate   DateTime
  actualDate      DateTime?
  status          String    @default("scheduled") // "scheduled" | "completed" | "cancelled"
  venueNotes      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  mashwara    Mashwara                @relation(fields: [mashwaraId], references: [id], onDelete: Cascade)
  attendance  MashwaraAttendance[]
  karguzari   Karguzari?
  decisions   MashwaraDecision[]
  actionItems MashwaraActionItem[]
  shares      MashwaraMeetingShare[]

  @@index([mashwaraId, scheduledDate])
  @@index([status, scheduledDate])
  @@map("mashwara_occurrences")
}
```

### 3.3 MashwaraAttendance

```prisma
model MashwaraAttendance {
  id               String   @id @default(cuid())
  occurrenceId     String
  staffMetaId      String
  attendanceStatus String   // "present" | "absent" | "excused"
  recordedBy       String   // userId
  recordedAt       DateTime @default(now())

  occurrence MashwaraOccurrence @relation(fields: [occurrenceId], references: [id], onDelete: Cascade)
  staffMeta  StaffMeta          @relation(fields: [staffMetaId], references: [id], onDelete: Cascade)

  @@unique([occurrenceId, staffMetaId])
  @@index([occurrenceId])
  @@map("mashwara_attendance")
}
```

**Decisions:** Uses `staffMetaId` (not `userId`) to align with existing `StaffTeamMembership` and `ActivityPlanItem` patterns. Attendance is per-staffMeta, not per-user. `recordedBy` is server-derived from the authenticated actor — never from the client.

### 3.4 Karguzari (MoM)

```prisma
model Karguzari {
  id          String    @id @default(cuid())
  occurrenceId String   @unique
  content     String    // Markdown or structured text
  preparedBy  String    // server-derived from authenticated actor (userId) — never from client
  reviewedBy  String?   // server-derived on finalization (userId) — never from client
  finalizedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  occurrence  MashwaraOccurrence  @relation(fields: [occurrenceId], references: [id], onDelete: Cascade)
  corrections MashwaraCorrectionNote[]

  @@map("karguzari")
}
```

**Decisions:** One Karguzari per occurrence (unique constraint on occurrenceId). `finalizedAt` null = draft, set = immutable. Editable before finalization only. All identity/audit fields (`preparedBy`, `reviewedBy`, `recordedBy`, `createdBy`, `grantedBy`, `revokedBy`) on Karguzari, CorrectionNote, Decision, ActionItem, Attendance, and Share models are server-derived from the authenticated session actor. The client must never supply them.

### 3.5 MashwaraCorrectionNote

```prisma
model MashwaraCorrectionNote {
  id          String   @id @default(cuid())
  karguzariId String
  content     String
  createdBy   String   // userId
  createdAt   DateTime @default(now())

  karguzari Karguzari @relation(fields: [karguzariId], references: [id], onDelete: Cascade)

  @@index([karguzariId])
  @@map("mashwara_correction_notes")
}
```

**Decisions:** Immutable after creation. No update allowed. References the finalized Karguzari. Separate from decisions — a correction note is purely a content addendum. `createdBy` is server-derived from the authenticated actor — never from the client.

### 3.6 MashwaraDecision

```prisma
model MashwaraDecision {
  id            String    @id @default(cuid())
  occurrenceId  String
  title         String
  description   String?
  decisionOwnerStaffMetaId String?  // nullable; owner may not be assigned yet
  dueDate       DateTime?
  status        String    @default("pending") // "pending" | "in_progress" | "completed"
  recordedBy    String    // userId
  recordedAt    DateTime  @default(now())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  occurrence  MashwaraOccurrence  @relation(fields: [occurrenceId], references: [id], onDelete: Cascade)

  @@index([occurrenceId])
  @@index([decisionOwnerStaffMetaId, status])
  @@map("mashwara_decisions")
}
```

**Decisions:** Uses `staffMetaId` for owner for consistency. Decisions exist independently of action items — an action item may optionally link to a decision. `recordedBy` and `recordedAt` are server-derived — never from the client.

### 3.7 MashwaraActionItem

```prisma
model MashwaraActionItem {
  id                String    @id @default(cuid())
  occurrenceId      String
  decisionId        String?   // optional FK → MashwaraDecision
  teamId            String?   // FK → CollaborationTeam (nullable so individual assignments don't require team)
  assignedToStaffMetaId String?
  title             String
  description       String?
  priority          String    @default("medium") // "low" | "medium" | "high" | "critical"
  status            String    @default("pending") // "pending" | "in_progress" | "completed" | "cancelled" | "carried_forward"
  dueDate           DateTime?
  carryForwardDate  DateTime?
  completedAt       DateTime?
  completionNote    String?
  createdBy         String    // userId
  expiredAt         DateTime? // set when the item passes its due date + grace without completion
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  occurrence  MashwaraOccurrence  @relation(fields: [occurrenceId], references: [id], onDelete: Cascade)
  decision    MashwaraDecision?   @relation(fields: [decisionId], references: [id], onDelete: SetNull)
  team        CollaborationTeam?  @relation(fields: [teamId], references: [id], onDelete: SetNull)
  assignedStaff StaffMeta?        @relation(fields: [assignedToStaffMetaId], references: [id], onDelete: SetNull)

  @@index([occurrenceId, status])
  @@index([teamId, status])
  @@index([assignedToStaffMetaId, status])
  @@index([dueDate, status])
  @@map("mashwara_action_items")
}
```

**Decisions:**
- `carryForwardDate` — set when an item is intentionally carried to the next occurrence. The status remains `carried_forward`.
- `expiredAt` — set automatically (server-side on read or on occurrence close) for items past dueDate without completion. This is a soft expiry; the item remains visible but its status is terminal.
- At least one of `teamId` or `assignedToStaffMetaId` must be set (validated by Zod).
- Server validates on create/update: decision, team, and assignee all belong to the occurrence's city (derived via mashwara.cityId). Assigned staff must have active StaffMeta. A team member may update only status and completionNote on items assigned directly to them or to a team they actively belong to; all other fields require `mashwara.manage`.
- `createdBy` is server-derived from the authenticated actor — never from the client.

### 3.8 MashwaraMeetingShare

```prisma
model MashwaraMeetingShare {
  id               String    @id @default(cuid())
  occurrenceId     String
  grantedToUserId  String    // User.id (the login account receiving share)
  grantedBy        String    // userId
  grantedAt        DateTime  @default(now())
  revokedAt        DateTime?
  revokedBy        String?
  reason           String?

  occurrence MashwaraOccurrence @relation(fields: [occurrenceId], references: [id], onDelete: Cascade)
  grantedTo  User               @relation(fields: [grantedToUserId], references: [id], onDelete: Cascade)

  @@unique([occurrenceId, grantedToUserId])
  @@index([occurrenceId, grantedToUserId])
  @@map("mashwara_meeting_shares")
}
```

**Decisions:** Uses `userId` (not staffMetaId) because Share is a login-account-level grant. The receiving user must have active `StaffMeta` in the same city — collaboration-team membership is **not** required. This makes the share the narrow gate for inviting a same-city StaffMeta user who is not on any collaboration team. Server validates city match on grant. Recipient must also hold `mashwara.view` (not denied by override). Share grants read-only access to finalized artifacts only — never draft Karguzari.

---

## 4. Capability Catalogue And Role Matrix

### 4.1 New Capabilities (Add to ACCESS_CAPABILITIES)

```typescript
"mashwara.manage",  // Create/edit/archive Mashwara series; manage occurrences; finalize Karguzari; grant/revoke shares
"mashwara.attend",  // Mark attendance for occurrences
"mashwara.view",    // Read Mashwara details, occurrences, Karguzari, decisions, action items
```

### 4.2 Role Default Capabilities

| Role | mashwara.view | mashwara.attend | mashwara.manage |
|------|-------------|----------------|----------------|
| `super_admin` | YES (with explicit cityId) | YES | YES |
| `program_admin` | YES (with explicit cityId) | YES | YES |
| `city_head` | YES (own city) | YES (own city) | YES (own city) |
| `park_lead` | YES (own park's city, if team member) | — | — |
| `park_admin` | YES (own park's city, if team member) | — | — |
| `murabbi` | YES (own group's city, if team member) | — | — |
| `guardian` | — | — | — |
| `student` | — | — | — |

**Override behavior:** Super Admin may use the existing `RoleCapabilityOverride` / `UserCapabilityOverride` system to grant or deny any `mashwara.*` capability for a role or named user. The standard resolution order applies: user override → role override → default. A deny override always wins regardless of default.

**Scope enforcement remains server-side:** Even if a user has `mashwara.manage` via override, they must still have a valid derived city scope (or be HQ with explicit cityId) to access any Mashwara data.

### 4.3 Participant Access (Automatic Read)

Users with `mashwara.view` who have an active `StaffMeta` in a city **and** at least one active `StaffTeamMembership` in that city's `CollaborationTeam` receive automatic read-only participant access to all active Mashwara in that city. This grants:
- Read list of Mashwara and their occurrences.
- Read finalized Karguzari, decisions, and action items.
- Read occurrence attendance records (summary only — who attended, not detailed notes).
- Update status and completionNote for action items assigned to their team or to themselves.

This access is enforced server-side; it is not a separate API grant. It never grants create, edit, delete, attendance marking, share management, or Karguzari editing.

---

## 5. Authorization Model

### 5.1 Server-Derived City Scope

Two classes of actor determine authorized city scope, following PKG-04's `resolveActorCity` pattern:

**HQ roles (`super_admin`, `program_admin`):** Must provide an explicit `cityId` parameter (400 if missing/malformed/nonexistent). May select any existing city.

**Scoped roles (all others):** City scope derived from StaffMeta:
1. `StaffMeta.assignedCityId` (City Head)
2. If null, `assignedParkId` → `Park.cityId` (Park Lead, Park Admin)
3. If null, `assignedGroupId` → `Group.batch.cityId` (Murabbi)
4. If none resolved → 403

**Request parameters** may only narrow the resolved city scope.

### 5.2 Server-Side Enforcement Pattern

```typescript
// 1. Module gate
const auth = await requireCapability("mashwara.manage");
if (auth instanceof NextResponse) return auth;

// 2. Resolve authorized city scope
const resolvedCity = resolveActorCity(auth.user, providedCityId);
if (resolvedCity === null) {
  if (isHqRole(auth.user.role)) return new NextResponse(null, { status: 400 });
  return new NextResponse(null, { status: 403 });
}

// 3. Verify against target Mashwara city
if (mashwara.cityId !== resolvedCity) {
  return new NextResponse(null, { status: 403 });
}
```

### 5.3 Meeting-Specific Share Rules

| Rule | Value |
|------|-------|
| Who can grant | City Head or Super Admin (`mashwara.manage` + same city) |
| Who can receive | Active user with `StaffMeta` in the same city (collaboration-team membership **not** required — share is the narrow gate for inviting a non-team-member staff user) |
| Access level | Read-only for the specific occurrence: finalized Karguzari only, decisions, action items, attendance summary. Draft Karguzari is never exposed via share. |
| Duration | Until explicitly revoked or occurrence is archived |
| Audit | Every grant and revocation logged with actor, timestamp, reason |
| Constraints | No duplicate active share for same occurrence+user. Share cannot be self-granted. Recipient must hold `mashwara.view` capability (not denied by override). Share never bypasses a `mashwara.view` deny override, server-derived city scope, or draft confidentiality. |

The share server-side check — when loading an occurrence, if the caller is not automatically authorized via §4.3 but has an active (non-revoked) share and holds `mashwara.view` not denied by override, they are granted read-only access to that occurrence's finalized artifacts only. A share must never bypass a `mashwara.view` deny override, server-derived city scope, or draft Karguzari confidentiality.

### 5.4 Authorization Decisions vs MASHWARA_DESIGN.md

| MASHWARA_DESIGN.md Claim | Contract Decision |
|--------------------------|-------------------|
| Attendance uses `userId` | Uses `staffMetaId` to match existing patterns |
| Action item `assignedTo` links to `userId` | Links to `StaffMeta.id` via `assignedToStaffMetaId` |
| Super Admin has blind "All" access | HQ must provide explicit `cityId` (400 if missing) |
| Team member update uses `scope.ts` | Uses `mashwara.view` capability + `StaffTeamMembership` + city match |

---

## 6. Lifecycle Rules

### 6.1 Mashwara (Series) Lifecycle

```
active → archived
```

- **active:** Series is live. New occurrences can be created. Visible to all authorized users.
- **archived:** Series is hidden from default views. Existing occurrences remain accessible via direct link or explicit filter.

### 6.2 Occurrence Lifecycle

```
scheduled → completed → (Karguzari can be drafted and finalized)
scheduled → cancelled
```

- **scheduled:** Occurrence is planned. City Head can mark attendance.
- **completed:** Meeting occurred. Karguzari can be drafted. Attendance final.
- **cancelled:** Meeting did not occur. Attendance is moot. No Karguzari expected.

### 6.3 Karguzari Lifecycle

```
(draft, editable) → finalizedAt set → (immutable, visible to all authorized)
```

- While `finalizedAt` is null, only users with `mashwara.manage` may view or edit the draft. Users with `mashwara.view` see a "Karguzari not yet finalized" placeholder. A meeting share never bypasses this — shares grant read-only access to finalized content only.
- Setting `finalizedAt` locks the record. No further edits. Once finalized, eligible `mashwara.view` users may read it.
- Corrections after finalization: create a `MashwaraCorrectionNote` referencing this Karguzari. Correction notes are immutable after creation and follow the same visibility rules as the finalized Karguzari.

### 6.4 Decision Lifecycle

```
pending → in_progress → completed
```

- Status transitions are forward-only. `completed` is terminal.
- `mashwara.manage` users may move any decision. The assigned owner may update status on their own decisions.

### 6.5 Action Item Lifecycle

```
pending → in_progress → completed
pending → cancelled
in_progress → completed
in_progress → carried_forward → pending (carried to next occurrence)
```

- **Expiry:** When `dueDate` is set and the current date exceeds `dueDate + 7 days` (grace period) without `completed` or `cancelled`, the server sets `expiredAt` on read. Expired items are terminal (no further updates).
- **Carry-forward:** City Head or Super Admin may set `carryForwardDate` and change status to `carried_forward`. The item becomes `pending` again when the next occurrence is created (server-side on occurrence creation, the system re-evaluates carried items that reference that occurrence's series).
- **Update rules:**
  - `mashwara.manage` users may update any field on any item.
  - A team member with `mashwara.view` (auto-participant access) may update `status` and `completionNote` only on items where **either** the item's `assignedToStaffMetaId` matches their own `StaffMeta.id` **or** the item's `teamId` matches an active `StaffTeamMembership.teamId` they belong to. They may not update any other field.
  - All other updates require `mashwara.manage`.

### 6.6 Meeting Share Lifecycle

```
Granted (active) → Revoked (revokedAt set)
```

- Active until explicit revocation.
- Cannot be renewed after revocation; a new share must be granted.

---

## 7. Zod Contracts (API Validation)

### 7.1 Shared Primitives

```typescript
const mashwaraIdSchema = z.string().cuid();
const occurrenceIdSchema = z.string().cuid();
const cityIdSchema = z.string().cuid();
const staffMetaIdSchema = z.string().cuid();
const userIdSchema = z.string().cuid();

const mashwaraStatusSchema = z.enum(["active", "archived"]);
const occurrenceStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
const attendanceStatusSchema = z.enum(["present", "absent", "excused"]);
const prioritySchema = z.enum(["low", "medium", "high", "critical"]);
const actionItemStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled", "carried_forward"]);
const decisionStatusSchema = z.enum(["pending", "in_progress", "completed"]);
```

### 7.2 Mashwara Series Schemas

```typescript
const createMashwaraSchema = z.object({
  cityId: cityIdSchema.optional(),  // HQ passes explicitly; scoped derives from StaffMeta
  title: z.string().min(1).max(200),
  purpose: z.string().max(500).optional(),
  recurrenceDayOfWeek: z.number().int().min(0).max(6), // required for pilot (weekly only)
  recurrenceTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
}).strict();

const updateMashwaraSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  purpose: z.string().max(500).optional(),
  recurrenceDayOfWeek: z.number().int().min(0).max(6).optional(),
  recurrenceTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status: mashwaraStatusSchema.optional(),
}).refine(
  data => !(data.recurrenceTime !== undefined && data.recurrenceDayOfWeek === undefined),
  { message: "recurrenceTime requires recurrenceDayOfWeek" }
).strict();

const listMashwaraSchema = z.object({
  cityId: cityIdSchema.optional(),
  status: mashwaraStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
```

### 7.3 Occurrence Schemas

```typescript
const createOccurrenceSchema = z.object({
  mashwaraId: mashwaraIdSchema,
  scheduledDate: z.coerce.date(),
  venueNotes: z.string().max(500).optional(),
}).strict();

const updateOccurrenceSchema = z.object({
  scheduledDate: z.coerce.date().optional(),
  actualDate: z.coerce.date().optional(),
  status: occurrenceStatusSchema.optional(),
  venueNotes: z.string().max(500).optional(),
}).strict();
```

### 7.4 Attendance Schemas

```typescript
const markAttendanceSchema = z.object({
  records: z.array(z.object({
    staffMetaId: staffMetaIdSchema,
    attendanceStatus: attendanceStatusSchema,
  })).min(1).max(200),
}).strict();
```

### 7.5 Karguzari Schemas

```typescript
const upsertKarguzariSchema = z.object({
  content: z.string().min(1).max(50000),
}).strict(); // Rejects client-supplied preparedBy, reviewedBy, or any unknown field

const finalizeKarguzariSchema = z.object({
  // Empty — all audit fields are server-derived from authenticated actor
}).strict();

const createCorrectionNoteSchema = z.object({
  content: z.string().min(1).max(10000),
}).strict();
```

### 7.6 Decision And Action Item Schemas

```typescript
const createDecisionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  decisionOwnerStaffMetaId: staffMetaIdSchema.optional(),
  dueDate: z.coerce.date().optional(),
}).strict();

const updateDecisionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  decisionOwnerStaffMetaId: staffMetaIdSchema.optional(),
  dueDate: z.coerce.date().optional(),
  status: decisionStatusSchema.optional(),
}).strict();

const createActionItemSchema = z.object({
  decisionId: z.string().cuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  teamId: z.string().cuid().optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional(),
  priority: prioritySchema.optional().default("medium"),
  dueDate: z.coerce.date().optional(),
}).refine(
  data => data.teamId !== undefined || data.assignedToStaffMetaId !== undefined,
  { message: "At least one assignee required: teamId or assignedToStaffMetaId" }
).strict();

const updateActionItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  teamId: z.string().cuid().optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional(),
  priority: prioritySchema.optional(),
  dueDate: z.coerce.date().optional(),
  status: actionItemStatusSchema.optional(),
  carryForwardDate: z.coerce.date().optional(),
  completionNote: z.string().max(500).optional(),
}).strict();

const listActionItemsSchema = z.object({
  occurrenceId: occurrenceIdSchema.optional(),
  teamId: z.string().cuid().optional(),
  assignedToStaffMetaId: staffMetaIdSchema.optional(),
  status: actionItemStatusSchema.optional(),
});
```

### 7.7 Meeting Share Schemas

```typescript
const grantShareSchema = z.object({
  grantedToUserId: userIdSchema,
  reason: z.string().max(500).optional(),
}).strict();

const revokeShareSchema = z.object({
  reason: z.string().max(500).optional(),
}).strict();
```

---

## 8. API Route Matrix

### 8.1 Mashwara Series Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema | Response |
|--------|------|---------|-----------|-------------|---------------|----------|
| `POST` | `/api/admin/mashwara` | createMashwara | `mashwara.manage` | resolveActorCity; HQ provides cityId (400 if missing), scoped derives | `createMashwaraSchema` | `Mashwara` |
| `GET` | `/api/admin/mashwara` | listMashwara | `mashwara.view` | resolveActorCity; filter by city | `listMashwaraSchema` | `{ mashwara[], total, page, limit }` |
| `GET` | `/api/admin/mashwara/[id]` | getMashwara | `mashwara.view` | resolveActorCity against mashwara.cityId | — | `Mashwara` with next/prev occurrence |
| `PATCH` | `/api/admin/mashwara/[id]` | updateMashwara | `mashwara.manage` | resolveActorCity against mashwara.cityId | `updateMashwaraSchema` | `Mashwara` |
| `POST` | `/api/admin/mashwara/[id]/archive` | archiveMashwara | `mashwara.manage` | resolveActorCity against mashwara.cityId | — | `Mashwara` (status = archived) |

### 8.2 Occurrence Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `POST` | `/api/admin/mashwara/[id]/occurrences` | createOccurrence | `mashwara.manage` | resolveActorCity against mashwara.cityId | `createOccurrenceSchema` |
| `GET` | `/api/admin/mashwara/[id]/occurrences` | listOccurrences | `mashwara.view` | resolveActorCity against mashwara.cityId | — |
| `GET` | `/api/admin/mashwara/occurrences/[occId]` | getOccurrence | `mashwara.view` OR meeting share | resolveActorCity or active share check | — |
| `PATCH` | `/api/admin/mashwara/occurrences/[occId]` | updateOccurrence | `mashwara.manage` | resolveActorCity against mashwara.cityId | `updateOccurrenceSchema` |

### 8.3 Attendance Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `POST` | `/api/admin/mashwara/occurrences/[occId]/attendance` | markAttendance | `mashwara.attend` | resolveActorCity against mashwara.cityId; verified attendees have StaffMeta in same city | `markAttendanceSchema` |
| `GET` | `/api/admin/mashwara/occurrences/[occId]/attendance` | getAttendance | `mashwara.view` OR meeting share | resolveActorCity or active share | — |

### 8.4 Karguzari Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `PUT` | `/api/admin/mashwara/occurrences/[occId]/karguzari` | upsertKarguzari | `mashwara.manage` | resolveActorCity; must be draft (finalizedAt null) | `upsertKarguzariSchema` |
| `POST` | `/api/admin/mashwara/occurrences/[occId]/karguzari/finalize` | finalizeKarguzari | `mashwara.manage` | resolveActorCity; occurrence must be completed | `finalizeKarguzariSchema` |
| `GET` | `/api/admin/mashwara/occurrences/[occId]/karguzari` | getKarguzari | `mashwara.manage` if draft; `mashwara.view` or meeting share if finalized | resolveActorCity or active share; draft returned only to manage users | — |
| `POST` | `/api/admin/mashwara/occurrences/[occId]/karguzari/corrections` | createCorrectionNote | `mashwara.manage` | resolveActorCity; requires finalized Karguzari | `createCorrectionNoteSchema` |
| `GET` | `/api/admin/mashwara/occurrences/[occId]/karguzari/corrections` | listCorrectionNotes | `mashwara.view` OR meeting share | resolveActorCity or active share | — |

### 8.5 Decision Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `POST` | `/api/admin/mashwara/occurrences/[occId]/decisions` | createDecision | `mashwara.manage` | resolveActorCity | `createDecisionSchema` |
| `GET` | `/api/admin/mashwara/occurrences/[occId]/decisions` | listDecisions | `mashwara.view` OR meeting share | resolveActorCity or active share | — |
| `PATCH` | `/api/admin/mashwara/decisions/[decId]` | updateDecision | `mashwara.manage` (full) or assigned owner (status only) | resolveActorCity | `updateDecisionSchema` |

### 8.6 Action Item Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `POST` | `/api/admin/mashwara/occurrences/[occId]/actions` | createActionItem | `mashwara.manage` | resolveActorCity | `createActionItemSchema` |
| `GET` | `/api/admin/mashwara/occurrences/[occId]/actions` | listActionItems | `mashwara.view` OR meeting share | resolveActorCity or active share | `listActionItemsSchema` |
| `PATCH` | `/api/admin/mashwara/actions/[itemId]` | updateActionItem | `mashwara.manage` (full) or team member (status+note) | resolveActorCity | `updateActionItemSchema` |
| `GET` | `/api/me/mashwara/actions` | myActionItems | `requireAuth` | own staffMetaId; active responsibilities | — |

### 8.7 Meeting Share Endpoints

| Method | Path | Handler | Auth Gate | Scope Check | Request Schema |
|--------|------|---------|-----------|-------------|---------------|
| `POST` | `/api/admin/mashwara/occurrences/[occId]/shares` | grantShare | `mashwara.manage` | resolveActorCity; recipient must have StaffMeta + team membership in same city | `grantShareSchema` |
| `GET` | `/api/admin/mashwara/occurrences/[occId]/shares` | listShares | `mashwara.manage` | resolveActorCity | — |
| `POST` | `/api/admin/mashwara/shares/[shareId]/revoke` | revokeShare | `mashwara.manage` | resolveActorCity | `revokeShareSchema` |

---

## 9. UI-State Contract

### 9.1 Mashwara List Page

**City Head / Super Admin / Program Admin:**
- **Create button:** "New Mashwara" → modal or page with title, purpose, weekly day/time.
- **Filters:** Status (active/archived), optionally by city (HQ only).
- **List cards:** Title, purpose preview, recurrence (e.g. "Weekly, Mon 19:00"), next occurrence date, total occurrences count, status pill.
- **Actions per row:** View, Edit (title/purpose/recurrence), Archive.

**Team Member / Park Lead / Park Admin / Murabbi (read-only participant):**
- Same list but no create/edit/archive buttons.
- Only active Mashwara shown.
- "My Tasks" quick-link to action items assigned to their team or self.

**Empty state:** "No Mashwara yet. The City Head can create a weekly meeting series."
**Error state (no team membership):** "You need to be a member of a city collaboration team to view Mashwara."

### 9.2 Occurrence List (within a Mashwara Detail)

- Chronological list of occurrences.
- Each row: date, status pill (scheduled/completed/cancelled), attendance count, Karguzari status (draft/finalized/none), action item count.
- **Create occurrence button** (City Head only): "New Occurrence" → date + optional venue notes.
- **Actions per row:** View detail, Mark attendance (City Head), Prepare Karguzari (City Head), Create Decision (City Head), Grant Access (City Head).

**Empty state:** "No occurrences yet. Create the first meeting to begin."

### 9.3 Occurrence Detail Page

**Tabs:**
1. **Overview** — Date, status, venue notes. Quick actions (complete, cancel for City Head).
2. **Attendance** — Table of city staff with attendance status; City Head can mark/edit. Summary: X present, Y absent, Z excused.
3. **Karguzari** — Empty state: "Karguzari not yet prepared." Draft: editable text area (City Head). Finalized: read-only display with correction notes below. Correction button (City Head only).
4. **Decisions** — List of decisions with owner, due date, status. Create button (City Head). Assigned owner can update status.
5. **Action Items** — Kanban or list grouped by status. Create button (City Head). Team members can update status + note on own-team items.
6. **Shares** — List of granted shares. Grant/revoke controls (City Head). Shows user name, granted date, granted by, revoked status.

**Participant view (team member via auto-access or meeting share):**
- Read-only display of all tabs. No create/edit/revoke controls.
- Action items tab: can update status + completionNote on items assigned to own team or self.

### 9.4 My Action Items View

Available from sidebar/profile: "My Action Items" (for team members) or "Mashwara Tasks" (for City Head).

- Lists action items where the user's team or staffMetaId matches.
- Shows: title, occurrence date, Mashwara title, status, due date, priority.
- Inline status update dropdown.
- **Empty state:** "No pending action items."

### 9.5 Loading & Error States

- Skeleton listings during fetch.
- Disabled mutation buttons during save.
- `400`: "Invalid request. Please check your input."
- `401`: "Please sign in to continue."
- `403`: "You do not have permission to perform this action."
- `404`: "Mashwara not found." / "Occurrence not found."
- `409`: "This occurrence cannot be modified in its current state." / "Karguzari is already finalized."

---

## 10. Test Contract

### 10.1 Allow Tests (Success Paths)

| ID | Test | Expected |
|----|------|----------|
| MSW-ALLOW-001 | Super Admin creates Mashwara with explicit cityId | 201 + Mashwara |
| MSW-ALLOW-002 | Program Admin creates Mashwara with explicit cityId | 201 + Mashwara |
| MSW-ALLOW-003 | City Head creates Mashwara in own city (cityId from StaffMeta) | 201 + Mashwara |
| MSW-ALLOW-004 | City Head creates occurrence on own city Mashwara | 201 + Occurrence |
| MSW-ALLOW-005 | City Head marks attendance for city staff | 201 + records |
| MSW-ALLOW-006 | City Head saves Karguzari draft | 200 + Karguzari (finalizedAt null) |
| MSW-ALLOW-007 | City Head finalizes Karguzari | 200 + Karguzari (finalizedAt set) |
| MSW-ALLOW-008 | City Head creates correction note on finalized Karguzari | 201 + CorrectionNote |
| MSW-ALLOW-009 | City Head creates decision | 201 + Decision |
| MSW-ALLOW-010 | City Head creates action item assigned to a team | 201 + ActionItem |
| MSW-ALLOW-011 | City Head creates action item assigned to a staff member | 201 + ActionItem |
| MSW-ALLOW-012 | City Head grants meeting share to same-city team member | 201 + Share |
| MSW-ALLOW-013 | City Head revokes meeting share | 200 + revokedAt set |
| MSW-ALLOW-014 | Team member (read-only) lists Mashwara in own city | 200 + mashwara array |
| MSW-ALLOW-015 | Team member updates own-team action item status to completed | 200 + updated status |
| MSW-ALLOW-016 | City Head creates action item with both teamId and assignedToStaffMetaId (both optional, at least one required) | 201 + ActionItem |
| MSW-ALLOW-017 | Meeting share recipient reads occurrence detail | 200 + read-only data |
| MSW-ALLOW-018 | City Head carries forward an action item | 200 + status = carried_forward |
| MSW-ALLOW-019 | City Head archives Mashwara | 200 + status = archived |
| MSW-ALLOW-020 | Team member reads finalized Karguzari | 200 + Karguzari content |
| MSW-ALLOW-021 | Meeting share recipient reads finalized Karguzari | 200 + Karguzari content |
| MSW-ALLOW-022 | City Head grants share to same-city StaffMeta user without collaboration-team membership | 201 + Share |

### 10.2 Deny Tests (Negative Paths)

| ID | Test | Expected |
|----|------|----------|
| MSW-DENY-001 | Unauthenticated user creates Mashwara | 401 |
| MSW-DENY-002 | Park Admin creates Mashwara | 403 |
| MSW-DENY-003 | Murabbi creates Mashwara | 403 |
| MSW-DENY-004 | Guardian/Student accesses any Mashwara endpoint | 403 |
| MSW-DENY-005 | City Head creates Mashwara with another city's cityId (scoped) | 403 |
| MSW-DENY-006 | Super Admin creates Mashwara without cityId | 400 |
| MSW-DENY-007 | City Head creates occurrence on another-city Mashwara | 403 |
| MSW-DENY-008 | Park Lead marks attendance (no mashwara.attend) | 403 |
| MSW-DENY-009 | Team member edits Karguzari draft | 403 |
| MSW-DENY-010 | Team member finalizes Karguzari | 403 |
| MSW-DENY-011 | City Head edits finalized Karguzari (immutability) | 409 |
| MSW-DENY-012 | Team member creates decision | 403 |
| MSW-DENY-013 | Team member creates action item | 403 |
| MSW-DENY-014 | City Head grants share to user without StaffMeta in same city | 403 |
| MSW-DENY-015 | City Head grants share to user whose mashwara.view is denied by override | 403 |
| MSW-DENY-016 | Meeting share recipient edits occurrence | 403 |
| MSW-DENY-017 | Team member updates action item title (non-own field) | 403 |
| MSW-DENY-018 | City Head accesses Mashwara in another city | 403 |
| MSW-DENY-019 | Park Lead (no team membership) accesses Mashwara | 403 |
| MSW-DENY-020 | City Head creates Karguzari on non-completed occurrence | 409 |
| MSW-DENY-021 | Team member reads draft Karguzari (not yet finalized) | 403 |
| MSW-DENY-022 | Meeting share recipient reads draft Karguzari | 403 |
| MSW-DENY-023 | User with mashwara.view denied by override accesses Karguzari via meeting share | 403 (share never bypasses capability deny) |
| MSW-DENY-024 | Client supplies preparedBy in Karguzari request | 400 (strict schema rejects unknown field) |
| MSW-DENY-025 | Client supplies recordedBy in attendance request | 400 (strict schema rejects unknown field) |
| MSW-DENY-026 | City Head creates action item without teamId or assignedToStaffMetaId | 400 (at least one assignee required) |
| MSW-DENY-027 | City Head creates action item with assignedToStaffMetaId that does not belong to occurrence's city | 403 (assignee outside city) |
| MSW-DENY-028 | City Head creates action item with deactivated staff member as assignee | 403 (StaffMeta not active) |
| MSW-DENY-029 | Team member updates action item assigned to different team (not their own) | 403 |
| MSW-DENY-030 | Team member updates action item title (non-permitted field) | 403 |

### 10.3 Error/Failure Tests

| ID | Test | Expected |
|----|------|----------|
| MSW-ERR-001 | Create Mashwara with empty title | 400 |
| MSW-ERR-002 | Create occurrence with past scheduledDate | 400 |
| MSW-ERR-003 | Update non-existent Mashwara | 404 |
| MSW-ERR-004 | Mark attendance with non-existent staffMetaId | 404 |
| MSW-ERR-005 | Create correction note on non-finalized Karguzari | 409 |
| MSW-ERR-006 | Revoke already-revoked share | 409 |
| MSW-ERR-007 | Create duplicate share for same occurrence+user | 409 |
| MSW-ERR-008 | List with invalid page (< 1) | 400 |
| MSW-ERR-009 | Create action item with invalid teamId | 400 |

### 10.4 Audit Tests

| ID | Test | Expected |
|----|------|----------|
| MSW-AUDIT-001 | Creating Mashwara creates audit log entry | AuditLog with action "mashwara.create" exists |
| MSW-AUDIT-002 | Finalizing Karguzari logs action | AuditLog with action "karguzari.finalize" exists |
| MSW-AUDIT-003 | Revoking share logs reason | AuditLog.reason matches |
| MSW-AUDIT-004 | Sensitive fields are redacted | No PII in audit values |
| MSW-AUDIT-005 | Non-mashwara.view user cannot read Mashwara audit logs | 403 |

---

## 11. Migration Sequence

### 11.1 Prerequisites

- PKG-01 content-planner schema migration must be approved and integrated.
- PKG-04 Event/Responsibility schema migration must be approved and integrated.
- The codebase must be on `codex/production-hardening` with both Prisma schemas in sync.

### 11.2 Migration Steps

1. **Add models to both schema files:**
   - `Mashwara`
   - `MashwaraOccurrence`
   - `MashwaraAttendance`
   - `Karguzari`
   - `MashwaraCorrectionNote`
   - `MashwaraDecision`
   - `MashwaraActionItem`
   - `MashwaraMeetingShare`

2. **Generate Prisma client** (both SQLite and PostgreSQL).

3. **Create additive local migration (SQLite):** `npx prisma migrate dev --name add_mashwara_models`. This generates the migration file for local development only.

4. **Align PostgreSQL:** Copy the generated migration SQL to `prisma/postgres/migrations/` or run `npx prisma migrate dev --schema prisma/postgres/schema.prisma --name add_mashwara_models` for local generation only.

5. **Staging/production migration** uses `npx prisma migrate deploy` (or `--schema prisma/postgres/schema.prisma` for PostgreSQL). Never run `migrate dev` against staging or production — it is a local-development command that may reset data. Only committed migrations are applied via `migrate deploy`.

6. **Add capability constants** to `src/lib/auth/capabilities.ts`:
   - `"mashwara.manage"`
   - `"mashwara.attend"`
   - `"mashwara.view"`

7. **Add role defaults.**

8. **Create API routes** as defined in Section 8.

9. **Add helpers:**
   - `src/lib/mashwara/scope.ts` — `resolveActorCity` (reuse from PKG-04 or implement variant), `hasMashwaraParticipantAccess()` checks StaffMeta + team membership in city
   - `src/lib/mashwara/zod.ts` — all Zod schemas
   - `src/lib/mashwara/audit.ts` — audit action wrappers

10. **Add tests** (Section 10).

11. **Run full quality gates:** lint, typecheck, test suite, SQLite build, PostgreSQL build.

### 11.3 Rollback Plan

**General principles:**
- Backup before migration.
- Standard rollback: disable access (remove capabilities + routes) while preserving all additive tables and their data. No destructive `DROP TABLE` rollback.
- Verified restore (Codex-and-owner incident only): restore from pre-migration backup.

Under no circumstances are `AuditLog` records referencing Mashwara entities dropped or altered.

---

## 12. Files To Create In Implementation Package

### Schema
| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add 8 new models after `ActivityPlanItem` |
| `prisma/postgres/schema.prisma` | Add same 8 models |

### Auth
| File | Action |
|------|--------|
| `src/lib/auth/capabilities.ts` | Add `mashwara.manage`, `mashwara.attend`, `mashwara.view` + role defaults |

### Shared Helpers
| File | Action |
|------|--------|
| `src/lib/mashwara/zod.ts` | All Zod schemas |
| `src/lib/mashwara/types.ts` | TypeScript types |
| `src/lib/mashwara/scope.ts` | `resolveActorCity` (shared from PKG-04), `hasMashwaraParticipantAccess()`, `hasActiveShare()` |
| `src/lib/mashwara/audit.ts` | Audit action wrappers |

### API Routes (19 route files)
| File | Method/Handler |
|------|---------------|
| `src/app/api/admin/mashwara/route.ts` | POST create, GET list |
| `src/app/api/admin/mashwara/[id]/route.ts` | GET detail, PATCH update |
| `src/app/api/admin/mashwara/[id]/archive/route.ts` | POST archive |
| `src/app/api/admin/mashwara/[id]/occurrences/route.ts` | POST create, GET list |
| `src/app/api/admin/mashwara/occurrences/[occId]/route.ts` | GET detail, PATCH update |
| `src/app/api/admin/mashwara/occurrences/[occId]/attendance/route.ts` | POST mark, GET list |
| `src/app/api/admin/mashwara/occurrences/[occId]/karguzari/route.ts` | PUT upsert, GET |
| `src/app/api/admin/mashwara/occurrences/[occId]/karguzari/finalize/route.ts` | POST finalize |
| `src/app/api/admin/mashwara/occurrences/[occId]/karguzari/corrections/route.ts` | POST create, GET list |
| `src/app/api/admin/mashwara/occurrences/[occId]/decisions/route.ts` | POST create, GET list |
| `src/app/api/admin/mashwara/decisions/[decId]/route.ts` | PATCH update |
| `src/app/api/admin/mashwara/occurrences/[occId]/actions/route.ts` | POST create, GET list |
| `src/app/api/admin/mashwara/actions/[itemId]/route.ts` | PATCH update |
| `src/app/api/me/mashwara/actions/route.ts` | GET my action items |
| `src/app/api/admin/mashwara/occurrences/[occId]/shares/route.ts` | POST grant, GET list |
| `src/app/api/admin/mashwara/shares/[shareId]/revoke/route.ts` | POST revoke |

### UI Components
| File | Action |
|------|--------|
| `src/components/modules/mashwara/mashwara-list.tsx` | List with filters |
| `src/components/modules/mashwara/mashwara-detail.tsx` | Series detail + occurrence list |
| `src/components/modules/mashwara/mashwara-form.tsx` | Create/edit form |
| `src/components/modules/mashwara/occurrence-detail.tsx` | Tabbed occurrence detail |
| `src/components/modules/mashwara/attendance-section.tsx` | Attendance table + mark controls |
| `src/components/modules/mashwara/karguzari-section.tsx` | Karguzari editor/viewer + corrections |
| `src/components/modules/mashwara/decisions-section.tsx` | Decision list + create |
| `src/components/modules/mashwara/action-items-section.tsx` | Action item kanban/list |
| `src/components/modules/mashwara/shares-section.tsx` | Share management |
| `src/components/modules/mashwara/my-action-items.tsx` | Staff's own action items |

### Tests
| File | Action |
|------|--------|
| `src/__tests__/api/mashwara/allow.test.ts` | 19 allow tests |
| `src/__tests__/api/mashwara/deny.test.ts` | 20 deny tests |
| `src/__tests__/api/mashwara/error.test.ts` | 9 error tests |
| `src/__tests__/api/mashwara/audit.test.ts` | 5 audit tests |
| `src/__tests__/lib/mashwara/zod.test.ts` | Zod validation tests |
| `src/__tests__/lib/mashwara/scope.test.ts` | Scope + participant access tests |

---

## 13. Owner Decisions

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| D1 | Action item self-reporting — should team members self-report completion, or must City Head approve? | Self-report vs Approval required | Affects action item update auth |
| D2 | Expiry grace period — what is the grace period after dueDate before an item auto-expires? | 3/7/14 days | Affects expiry logic default |
| D3 | Attendance scope — should attendance marking show all StaffMeta in the city, or only those with team memberships? | All staff vs Team members only | Affects attendance UI list |
| D4 | Correction note visibility — should correction notes be publicly visible alongside Karguzari, or restricted to mashwara.manage? | Public vs Restricted | Affects endpoint auth for corrections list |
| D5 | Series archive — should archiving a Mashwara also cancel all pending occurrences? | Cascade vs Preserve | Affects archive handler behavior |
| D6 | Meeting share semantics — share may target an active same-city StaffMeta user even without team membership. This is the narrow gate for inviting non-team-member staff. Draft Karguzari is never exposed via share. Is this the intended pilot behaviour? | Accept vs Restrict further | Nil if accepted; adjust recipient constraints if changed |

---

## 14. Implementation Package Handoff

### Summary

This contract turns the MASHWARA_DESIGN.md into an implementation-ready specification. It defines 8 additive Prisma models, 3 new capabilities, 19 API route groups, 66 tests (22 allow, 30 deny, 9 error, 5 audit), and a complete migration/rollback plan.

### Key rules preserved

- Mashwara is city-scoped. Server-derives city through `resolveActorCity`.
- Collaboration-team membership is an access predicate, never a login role or scope expansion.
- Karguzari is immutable after finalization. Corrections are separate CorrectionNote entries.
- Action items have assignment, status, due date, carry-forward, expiry, and fail-closed authorization.
- Temporary Event responsibilities (PKG-04) and permanent collaboration teams remain distinct.
- File uploads remain disabled.
- Weekly manual occurrence creation only.

### Pre-requisites

- PKG-01 and PKG-04 schema migrations integrated.
- Base commit `9563d06` reachable.

### Risks

- If `EventResponsibility.mashwaraId` (from PKG-04) references a Mashwara that does not yet exist in this migration, the FK is a string reference without constraint. The relationship becomes a real FK when the Mashwara migration is applied. Order: PKG-04 runs first (creates EventResponsibility with string mashwaraId), then this package (creates Mashwara table). The FK can be added as a separate migration after both are deployed.
- `resolveActorCity` is shared with PKG-04's Event code. Both packages must use the same helper. If PKG-04 has not yet been implemented, this package implements it.

### Handoff checklist

- [ ] 8 Prisma models added to both schemas
- [ ] Migration generated and tested
- [ ] `mashwara.*` capabilities added + role defaults
- [ ] 19 API route files created
- [ ] Scope helpers, Zod schemas, audit helpers created
- [ ] UI components created (10)
- [ ] All 66 tests pass
- [ ] Lint, typecheck, full suite, SQLite/PostgreSQL builds pass
- [ ] Owner decisions D1-D5 resolved
- [ ] This contract updated with deviations

---

*End of MASHWARA-303 Implementation Contract*
