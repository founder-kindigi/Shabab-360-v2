# Module 2: City Operations

> **Module ID:** M2
> **Priority:** P0
> **Phase:** Phase 2 (Core Data)
> **Depends On:** Module 1 (Auth & Foundation)
> **Parallel Group:** Solo (must complete before Phase 3 modules can begin)

---

## 1. Module Overview

### 1.1 Purpose

Module 2 delivers the **organizational hierarchy management** — the foundational data layer that every other operational module depends on. It enables the creation and management of the full chain: **City > Park > Batch > Group > Participant**, along with **Murabbis** (mentors assigned to groups), **Guardians** (parents linked to participants), and **Attendance Events** (session events for groups).

This is the **City Head's primary workspace**. The City Head logs into the Admin area and manages their entire city's operations from here. The Program Admin also uses this module to create cities and assign City Heads.

### 1.2 Business Context

Shabab360 operates across multiple cities in Pakistan. Each city has one or more parks (local venues where sessions happen). Parks run time-bound batches (e.g., "Jan-Jun 2025"). Within a batch, participants are divided into groups of 15-20, each led by a Murabbi (mentor). Guardians are the parents/family members linked to participants. Attendance events are created per group to track daily session attendance.

### 1.3 Who Uses This Module

| Role | Access Level | What They Do |
|------|-------------|--------------|
| **Program Admin** | All cities (national scope) | Create/update cities, assign City Heads, view all data |
| **City Head** | Their assigned city only (scoped) | Manage parks, batches, groups, participants, murabbis, guardians, attendance events within their city |
| **Super Admin** | Full access | Technical recovery, same as Program Admin |

> **Note:** Park Admin, Park Lead, Murabbi, Guardian, and Student roles do **NOT** use this module. They use the Park workspace or their respective portals.

### 1.4 Dependencies

- **Module 1 (Auth & Foundation)** must be fully complete:
  - `users` table with `passwordHash`, `mustResetPwd`, `isActive` columns
  - `staff_meta` table with role assignments
  - `audit_log` table for audit trail
  - NextAuth v4 session with `user.role` available
  - `authorize()` helper in `src/lib/auth/authorize.ts`
  - `requireRole()`, `requireCityScope()` helpers
  - Layout components: `AppShell`, `Sidebar`, `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState`, `ConfirmDialog`
  - Form components: `SearchInput`, `FilterBar`, `FormActions`, `FormField`
  - Data components: `DataTable`, `StatusBadge`
  - Business components: `RoleBadge`, `ScopeSelector` (stub)
  - Zustand store: `useAppStore` with navigation + context selection state
  - `src/lib/db.ts` (Prisma singleton)
  - `src/lib/audit.ts` (audit logging helper)

---

## 2. Database Tables

### 2.1 Tables Introduced by This Module

The following tables are added to `prisma/schema.prisma` as part of Module 2. The existing tables from Module 1 (`users`, `staff_meta`, `audit_log`) are referenced but not modified.

### 2.2 Full Prisma Schema for Module 2 Tables

```prisma
// ============================================================
// ORGANIZATIONAL HIERARCHY
// ============================================================

model City {
  id          String          @id @default(cuid())
  name        String
  code        String          @unique
  isActive    Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  parks           Park[]
  cityHeads       StaffMeta[]    @relation("CityHeadAssignment")
  announcements   Announcement[]

  @@map("cities")
}

model Park {
  id          String          @id @default(cuid())
  name        String
  cityId      String
  address     String?
  isActive    Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  city            City           @relation(fields: [cityId], references: [id])
  batches         Batch[]
  parkStaff       StaffMeta[]    @relation("ParkStaffAssignment")
  announcements   Announcement[]
  allocations     ParkAllocation[]

  @@map("parks")
}

model Batch {
  id          String                    @id @default(cuid())
  name        String
  parkId      String
  startDate   DateTime
  endDate     DateTime?
  isActive    Boolean                   @default(true)
  createdAt   DateTime                  @default(now())
  updatedAt   DateTime                  @updatedAt

  park                    Park                    @relation(fields: [parkId], references: [id])
  groups                  Group[]
  settings                BatchSettings?
  feeEvents               FeeEvent[]
  admissionApplications   AdmissionApplication[]

  @@map("batches")
}

model Group {
  id          String          @id @default(cuid())
  name        String
  batchId     String
  isActive    Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  batch            Batch               @relation(fields: [batchId], references: [id])
  participants     Participant[]
  murabbis         StaffMeta[]         @relation("MurabbiAssignment")
  attendanceEvents AttendanceEvent[]

  @@map("groups")
}

// ============================================================
// PEOPLE
// ============================================================

model Guardian {
  id          String          @id @default(cuid())
  userId      String?         @unique
  name        String
  phone       String
  cnic        String?
  address     String?
  isActive    Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  user        User?           @relation(fields: [userId], references: [id])
  children    GuardianChild[]

  @@map("guardians")
}

model GuardianChild {
  id            String      @id @default(cuid())
  guardianId    String
  participantId String
  relation      String?     // father, mother, uncle, etc.
  createdAt     DateTime    @default(now())

  guardian      Guardian    @relation(fields: [guardianId], references: [id], onDelete: Cascade)
  participant   Participant @relation(fields: [participantId], references: [id])

  @@unique([guardianId, participantId])
  @@map("guardian_children")
}

model Participant {
  id          String            @id @default(cuid())
  userId      String?           @unique
  name        String
  phone       String?
  dateOfBirth DateTime?
  gender      String?           // male, female
  address     String?
  groupId     String
  state       String            @default("active") // active, warning, dropout, graduated, inactive
  joinedAt    DateTime          @default(now())
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  user                User                @relation(fields: [userId], references: [id])
  group               Group               @relation(fields: [groupId], references: [id])
  guardianLinks       GuardianChild[]
  attendanceRecords   AttendanceRecord[]
  payments            Payment[]
  convertedFromApp    AdmissionApplication? @relation("ConvertedFrom")

  @@map("participants")
}

// ============================================================
// BATCH SETTINGS
// ============================================================

model BatchSettings {
  id              String    @id @default(cuid())
  batchId         String    @unique
  warningAbsents  Int       @default(3)
  dropoutAbsents  Int       @default(6)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  batch           Batch     @relation(fields: [batchId], references: [id])

  @@map("batch_settings")
}

// ============================================================
// ATTENDANCE EVENTS (creation only — marking handled in Module 3)
// ============================================================

model AttendanceEvent {
  id          String              @id @default(cuid())
  groupId     String
  title       String
  eventDate   DateTime            // stored UTC, displayed PKT
  isClosed    Boolean             @default(false)
  closedAt    DateTime?
  closedBy    String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  group       Group               @relation(fields: [groupId], references: [id])
  records     AttendanceRecord[]
  closer      StaffMeta?          @relation("EventCloser", fields: [closedBy], references: [id])

  @@map("attendance_events")
}
```

### 2.3 Notes on Existing Tables

- **`users`** — Already exists from Module 1. Module 2 creates `Participant` and `Guardian` records that optionally link to `users` via `userId`. No schema changes needed to `users`.
- **`staff_meta`** — Already exists from Module 1. Murabbis are created by inserting `staff_meta` rows with `role: "murabbi"`. City Head assignment is done by inserting `staff_meta` rows with `role: "city_head"` and `assignedCityId`.
- **`audit_log`** — Already exists from Module 1. All CRUD operations in this module must write audit log entries.

### 2.4 Important Constraint

**All datetime values are stored in UTC** in the database. Display must convert to **Asia/Karachi (PKT, UTC+5)** using the timezone utility in `src/lib/timezone.ts`. This applies to `startDate`/`endDate` on batches, `eventDate` on attendance events, `dateOfBirth` on participants, and `joinedAt`.

---

## 3. API Endpoints

All endpoints are under `/api/admin/`. Every endpoint must:

1. Validate the session via `getServerSession(authOptions)`
2. Check role authorization via `authorize(allowedRoles)`
3. For City Head: scope all queries to their assigned city via `staffMeta.assignedCityId`
4. Validate request body with **Zod** schemas
5. Write to `audit_log` on create/update/delete operations
6. Return consistent JSON responses

### 3.1 Standard Response Envelope

```typescript
// Success
{ "data": T | T[], "pagination": { page: number, limit: number, total: number } | null }

// Error
{ "error": string, "details": z.ZodError["errors"] | undefined }
```

### 3.2 Standard Query Parameters (for list endpoints)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |
| `search` | string | — | Fuzzy search on name fields |
| `sort` | string | `createdAt` | Sort column |
| `order` | `asc` \| `desc` | `desc` | Sort direction |
| `isActive` | boolean | — | Filter by active status |

---

### 3.3 Cities

#### `GET /api/admin/cities`

List all cities. Program Admin sees all; City Head sees only their assigned city.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by city name or code |
| `isActive` | boolean | Filter active/inactive |
| `page` | number | Page number |
| `limit` | number | Per page |
| `include` | string | Comma-separated: `parks`, `cityHeads`, `stats` |

**Response (200):**
```json
{
  "data": [
    {
      "id": "clxxx...",
      "name": "Karachi",
      "code": "KHI",
      "isActive": true,
      "createdAt": "2025-01-15T05:00:00.000Z",
      "updatedAt": "2025-01-15T05:00:00.000Z",
      "_count": {
        "parks": 5
      },
      "cityHeads": [
        {
          "id": "clxxx...",
          "userId": "clxxx...",
          "role": "city_head",
          "user": {
            "id": "clxxx...",
            "name": "Ahmed Khan",
            "email": "ahmed@shabab360.pk",
            "isActive": true
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12
  }
}
```

#### `POST /api/admin/cities`

Create a new city.

**Authorization:** `program_admin`, `super_admin`

**Request Body (Zod validated):**
```json
{
  "name": "Karachi",          // string, min 2, max 100, required
  "code": "KHI"              // string, min 2, max 10, uppercase, required, unique
}
```

**Zod Schema:**
```typescript
const createCitySchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).transform(v => v.toUpperCase()),
});
```

**Response (201):**
```json
{
  "data": {
    "id": "clxxx...",
    "name": "Karachi",
    "code": "KHI",
    "isActive": true,
    "createdAt": "2025-01-15T05:00:00.000Z",
    "updatedAt": "2025-01-15T05:00:00.000Z"
  }
}
```

**Errors:**
- `409` — City code already exists
- `403` — Not authorized (city_head cannot create cities)

#### `PUT /api/admin/cities`

Update a city. Only `name` and `isActive` are updatable (code is immutable after creation).

**Authorization:** `program_admin`, `super_admin`

**Request Body:**
```json
{
  "id": "clxxx...",            // string, required
  "name": "Karachi East",     // string, min 2, max 100, optional
  "isActive": true             // boolean, optional
}
```

**Zod Schema:**
```typescript
const updateCitySchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
}).refine(d => d.name !== undefined || d.isActive !== undefined, {
  message: "At least one field must be provided",
});
```

**Response (200):** Returns the updated city object.

**Errors:**
- `404` — City not found
- `403` — Not authorized

#### `DELETE /api/admin/cities`

Soft-delete a city (set `isActive: false`). Hard delete is not allowed — cities with existing parks cannot be deactivated.

**Authorization:** `program_admin`, `super_admin`

**Request Body:**
```json
{
  "id": "clxxx..."            // string, required
}
```

**Zod Schema:**
```typescript
const deleteCitySchema = z.object({
  id: z.string().cuid(),
});
```

**Response (200):**
```json
{
  "data": {
    "id": "clxxx...",
    "isActive": false
  }
}
```

**Errors:**
- `404` — City not found
- `409` — Cannot deactivate city with active parks. Deactivate all parks first.

---

### 3.4 Parks

#### `GET /api/admin/parks`

List parks, filtered by city. City Head only sees their city's parks.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `cityId` | string | **Required for city_head.** Filter by city. |
| `search` | string | Search by park name or address |
| `isActive` | boolean | Filter active/inactive |
| `page` | number | Page number |
| `limit` | number | Per page |
| `include` | string | Comma-separated: `batches`, `city`, `parkStaff` |

**Response (200):**
```json
{
  "data": [
    {
      "id": "clxxx...",
      "name": "Gulshan Park",
      "cityId": "clxxx...",
      "address": "Block 13, Gulshan-e-Iqbal",
      "isActive": true,
      "createdAt": "2025-01-15T05:00:00.000Z",
      "updatedAt": "2025-01-15T05:00:00.000Z",
      "city": {
        "id": "clxxx...",
        "name": "Karachi"
      },
      "_count": {
        "batches": 2
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

#### `POST /api/admin/parks`

Create a new park.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "name": "Gulshan Park",        // string, min 2, max 150, required
  "cityId": "clxxx...",          // string (cuid), required
  "address": "Block 13, Gulshan-e-Iqbal"  // string, max 300, optional
}
```

**Zod Schema:**
```typescript
const createParkSchema = z.object({
  name: z.string().min(2).max(150),
  cityId: z.string().cuid(),
  address: z.string().max(300).optional(),
});
```

**Scope enforcement:** City Head can only create parks in their `assignedCityId`. If `cityId` doesn't match, return `403`.

**Response (201):** Returns the created park with city relation included.

**Errors:**
- `403` — City Head creating park outside their city
- `404` — City not found

#### `PUT /api/admin/parks`

Update a park.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "id": "clxxx...",
  "name": "Gulshan Park Updated",  // optional
  "address": "New address",          // optional
  "isActive": true                   // optional
}
```

**Scope enforcement:** City Head can only update parks in their city.

**Response (200):** Returns updated park.

**Errors:**
- `404` — Park not found
- `403` — Out of scope

#### `DELETE /api/admin/parks`

Soft-delete a park. Cannot deactivate if active batches exist.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "id": "clxxx..."
}
```

**Errors:**
- `409` — Cannot deactivate park with active batches

---

### 3.5 Batches

#### `GET /api/admin/batches`

List batches, filtered by park.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `parkId` | string | Filter by park |
| `cityId` | string | Filter by city (returns all batches across city's parks) |
| `isActive` | boolean | Filter active/inactive |
| `search` | string | Search by batch name |
| `page` | number | Page number |
| `limit` | number | Per page |
| `include` | string | `groups`, `settings`, `park` |

**Scope enforcement:** City Head can only see batches in parks within their city.

**Response (200):**
```json
{
  "data": [
    {
      "id": "clxxx...",
      "name": "Jan-Jun 2025",
      "parkId": "clxxx...",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-06-30T23:59:59.000Z",
      "isActive": true,
      "createdAt": "2025-01-01T05:00:00.000Z",
      "updatedAt": "2025-01-01T05:00:00.000Z",
      "park": {
        "id": "clxxx...",
        "name": "Gulshan Park"
      },
      "_count": {
        "groups": 4
      },
      "settings": {
        "warningAbsents": 3,
        "dropoutAbsents": 6
      }
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/admin/batches`

Create a new batch.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "name": "Jan-Jun 2025",          // string, min 2, max 150, required
  "parkId": "clxxx...",            // string (cuid), required
  "startDate": "2025-01-01",       // ISO date string, required
  "endDate": "2025-06-30",         // ISO date string, optional
  "settings": {                     // optional, creates BatchSettings
    "warningAbsents": 3,
    "dropoutAbsents": 6
  }
}
```

**Zod Schema:**
```typescript
const createBatchSchema = z.object({
  name: z.string().min(2).max(150),
  parkId: z.string().cuid(),
  startDate: z.string().datetime().transform(v => new Date(v)),
  endDate: z.string().datetime().transform(v => new Date(v)).optional(),
  settings: z.object({
    warningAbsents: z.number().int().min(1).max(30).default(3),
    dropoutAbsents: z.number().int().min(1).max(60).default(6),
  }).optional(),
}).refine(d => !d.endDate || d.endDate > d.startDate, {
  message: "endDate must be after startDate",
  path: ["endDate"],
}).refine(d => d.settings ? d.settings.dropoutAbsents > d.settings.warningAbsents : true, {
  message: "dropoutAbsents must be greater than warningAbsents",
  path: ["settings", "dropoutAbsents"],
});
```

**Scope enforcement:** City Head can only create batches in parks within their city.

**Response (201):** Returns created batch with settings if provided.

#### `PUT /api/admin/batches`

Update a batch.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "id": "clxxx...",
  "name": "Jan-Jun 2025 (Updated)",  // optional
  "startDate": "2025-01-15",         // optional
  "endDate": "2025-07-15",           // optional
  "isActive": true                    // optional
}
```

**Response (200):** Returns updated batch.

#### `DELETE /api/admin/batches`

Soft-delete a batch. Cannot deactivate if active groups exist.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Errors:**
- `409` — Cannot deactivate batch with active groups

---

### 3.6 Groups

#### `GET /api/admin/groups`

List groups, filtered by batch.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `batchId` | string | Filter by batch |
| `parkId` | string | Filter by park (all groups across park's batches) |
| `cityId` | string | Filter by city |
| `isActive` | boolean | Filter active/inactive |
| `search` | string | Search by group name |
| `page` | number | Page number |
| `limit` | number | Per page |
| `include` | string | `batch`, `participants`, `murabbis` |

**Response (200):**
```json
{
  "data": [
    {
      "id": "clxxx...",
      "name": "Group A",
      "batchId": "clxxx...",
      "isActive": true,
      "createdAt": "2025-01-01T05:00:00.000Z",
      "updatedAt": "2025-01-01T05:00:00.000Z",
      "batch": {
        "id": "clxxx...",
        "name": "Jan-Jun 2025",
        "park": {
          "id": "clxxx...",
          "name": "Gulshan Park"
        }
      },
      "_count": {
        "participants": 18
      },
      "murabbis": [
        {
          "id": "clxxx...",
          "role": "murabbi",
          "user": {
            "id": "clxxx...",
            "name": "Usman Ali"
          }
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/admin/groups`

Create a new group.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "name": "Group A",          // string, min 1, max 100, required
  "batchId": "clxxx..."       // string (cuid), required
}
```

**Zod Schema:**
```typescript
const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  batchId: z.string().cuid(),
});
```

**Scope enforcement:** City Head can only create groups in batches within their city's parks.

**Response (201):** Returns created group with batch and park info.

#### `PUT /api/admin/groups`

Update a group.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "id": "clxxx...",
  "name": "Group Alpha",     // optional
  "isActive": true            // optional
}
```

**Response (200):** Returns updated group.

#### `DELETE /api/admin/groups`

Soft-delete a group. Cannot deactivate if active participants exist.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Errors:**
- `409` — Cannot deactivate group with active participants

---

### 3.7 People (Participants / Shabab)

#### `GET /api/admin/people`

List participants with filters. This endpoint handles both Shabab (participants) and Murabbis through a `type` query parameter.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `type` | `participant` \| `murabbi` | **Required.** `participant` = Shabab, `murabbi` = Murabbi staff |
| `cityId` | string | Filter by city |
| `parkId` | string | Filter by park |
| `batchId` | string | Filter by batch |
| `groupId` | string | Filter by group |
| `state` | string | For participants: `active`, `warning`, `dropout`, `graduated`, `inactive` |
| `gender` | string | `male` or `female` |
| `search` | string | Search by name or phone |
| `isActive` | boolean | Filter active/inactive |
| `page` | number | Page number |
| `limit` | number | Per page |
| `include` | string | `group`, `guardianLinks`, `batch`, `park` |

**Scope enforcement:** City Head only sees participants/murabbis in their city.

**Response for `type=participant` (200):**
```json
{
  "data": [
    {
      "id": "clxxx...",
      "userId": null,
      "name": "Hassan Raza",
      "phone": "03001234567",
      "dateOfBirth": "2010-05-15T00:00:00.000Z",
      "gender": "male",
      "address": "House 12, Street 5, Gulshan",
      "groupId": "clxxx...",
      "state": "active",
      "joinedAt": "2025-01-15T05:00:00.000Z",
      "createdAt": "2025-01-15T05:00:00.000Z",
      "updatedAt": "2025-01-15T05:00:00.000Z",
      "group": {
        "id": "clxxx...",
        "name": "Group A",
        "batch": {
          "id": "clxxx...",
          "name": "Jan-Jun 2025",
          "park": {
            "id": "clxxx...",
            "name": "Gulshan Park"
          }
        }
      },
      "guardianLinks": [
        {
          "id": "clxxx...",
          "relation": "father",
          "guardian": {
            "id": "clxxx...",
            "name": "Raza Ahmed",
            "phone": "03009876543"
          }
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

**Response for `type=murabbi` (200):**
```json
{
  "data": [
    {
      "id": "clxxx...",
      "userId": "clxxx...",
      "role": "murabbi",
      "assignedCityId": "clxxx...",
      "assignedParkId": "clxxx...",
      "assignedGroupId": "clxxx...",
      "isActive": true,
      "user": {
        "id": "clxxx...",
        "name": "Usman Ali",
        "email": "usman@shabab360.pk",
        "phone": "03001112222"
      },
      "assignedGroup": {
        "id": "clxxx...",
        "name": "Group A",
        "batch": {
          "id": "clxxx...",
          "name": "Jan-Jun 2025"
        }
      }
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/admin/people`

Create a participant (Shabab) or Murabbi. The `type` field determines which.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body for `type=participant`:**
```json
{
  "type": "participant",
  "name": "Hassan Raza",                // string, min 2, max 150, required
  "phone": "03001234567",               // string, optional
  "dateOfBirth": "2010-05-15",          // ISO date string, optional
  "gender": "male",                     // "male" | "female", optional
  "address": "House 12, Street 5",      // string, max 300, optional
  "groupId": "clxxx..."                 // string (cuid), required
}
```

**Request Body for `type=murabbi`:**
```json
{
  "type": "murabbi",
  "name": "Usman Ali",                  // string, min 2, max 150, required
  "email": "usman@shabab360.pk",        // string, email, required
  "phone": "03001112222",               // string, optional
  "password": "initialPassword123",     // string, min 8, required
  "assignedCityId": "clxxx...",         // string (cuid), required
  "assignedParkId": "clxxx...",         // string (cuid), optional
  "assignedGroupId": "clxxx..."         // string (cuid), optional
}
```

**Zod Schema:**
```typescript
const createPersonSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("participant"),
    name: z.string().min(2).max(150),
    phone: z.string().max(20).optional(),
    dateOfBirth: z.string().datetime().transform(v => new Date(v)).optional(),
    gender: z.enum(["male", "female"]).optional(),
    address: z.string().max(300).optional(),
    groupId: z.string().cuid(),
  }),
  z.object({
    type: z.literal("murabbi"),
    name: z.string().min(2).max(150),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
    password: z.string().min(8),
    assignedCityId: z.string().cuid(),
    assignedParkId: z.string().cuid().optional(),
    assignedGroupId: z.string().cuid().optional(),
  }),
]);
```

**Murabbi creation flow:**
1. Hash the password with bcrypt
2. Create a `User` record with `mustResetPwd: true`
3. Create a `StaffMeta` record with `role: "murabbi"` and assignments
4. Return the combined result

**Scope enforcement:** City Head can only create participants in groups within their city. City Head can only create murabbis assigned to their city.

**Response (201):** Returns the created participant or murabbi.

#### `PUT /api/admin/people`

Update a participant or murabbi.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body for participant:**
```json
{
  "type": "participant",
  "id": "clxxx...",
  "name": "Hassan Raza Updated",    // optional
  "phone": "03009998888",            // optional
  "dateOfBirth": "2010-05-20",       // optional
  "gender": "male",                  // optional
  "address": "New address",          // optional
  "groupId": "clxxx...",             // optional — reassigns to different group
  "state": "warning"                 // optional — change participant state
}
```

**Request Body for murabbi:**
```json
{
  "type": "murabbi",
  "id": "clxxx...",
  "name": "Usman Ali Updated",       // optional
  "phone": "03005554444",             // optional
  "assignedParkId": "clxxx...",       // optional — reassign park
  "assignedGroupId": "clxxx...",      // optional — reassign group
  "isActive": true                    // optional — activate/deactivate
}
```

**Group reassignment:** When a participant's `groupId` is changed, the old group's participant count decreases and the new group's increases. This is a simple field update — no cascade needed.

**Response (200):** Returns updated record.

#### `PATCH /api/admin/people`

Bulk operations on participants.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "action": "activate" | "deactivate" | "move" | "change_state",
  "type": "participant",
  "ids": ["clxxx...", "clxxx..."],     // array of participant IDs, required, max 100
  // For "move" action:
  "targetGroupId": "clxxx...",
  // For "change_state" action:
  "targetState": "warning" | "dropout" | "graduated" | "inactive" | "active"
}
```

**Zod Schema:**
```typescript
const bulkActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("activate"),
    type: z.literal("participant"),
    ids: z.array(z.string().cuid()).min(1).max(100),
  }),
  z.object({
    action: z.literal("deactivate"),
    type: z.literal("participant"),
    ids: z.array(z.string().cuid()).min(1).max(100),
  }),
  z.object({
    action: z.literal("move"),
    type: z.literal("participant"),
    ids: z.array(z.string().cuid()).min(1).max(100),
    targetGroupId: z.string().cuid(),
  }),
  z.object({
    action: z.literal("change_state"),
    type: z.literal("participant"),
    ids: z.array(z.string().cuid()).min(1).max(100),
    targetState: z.enum(["warning", "dropout", "graduated", "inactive", "active"]),
  }),
]);
```

**Scope enforcement:** All participant IDs must belong to groups within the City Head's city.

**Response (200):**
```json
{
  "data": {
    "affected": 15,
    "action": "move"
  }
}
```

---

### 3.8 People (Murabbis) — Dedicated Endpoints

Murabbis are also accessible through the `GET/POST /api/admin/people?type=murabbi` endpoint. The dedicated endpoints below provide additional convenience:

#### `POST /api/admin/murabbis`

Create a Murabbi (convenience wrapper — identical to `POST /api/admin/people` with `type: "murabbi"`).

#### `PUT /api/admin/murabbis`

Update a Murabbi's assignments (convenience wrapper — identical to `PUT /api/admin/people` with `type: "murabbi"`).

---

### 3.9 Guardians

#### `GET /api/admin/guardians`

List guardians with filters.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `cityId` | string | Filter by city (via linked children's groups) |
| `parkId` | string | Filter by park (via linked children's groups) |
| `search` | string | Search by guardian name, phone, or CNIC |
| `participantId` | string | Filter guardians linked to a specific participant |
| `isActive` | boolean | Filter active/inactive |
| `page` | number | Page number |
| `limit` | number | Per page |
| `include` | string | `children` — include linked participant details |

**Scope enforcement:** City Head only sees guardians who have children in groups within their city.

**Response (200):**
```json
{
  "data": [
    {
      "id": "clxxx...",
      "userId": null,
      "name": "Raza Ahmed",
      "phone": "03009876543",
      "cnic": "35201-1234567-1",
      "address": "House 12, Street 5",
      "isActive": true,
      "createdAt": "2025-01-15T05:00:00.000Z",
      "children": [
        {
          "id": "clxxx...",
          "relation": "father",
          "participant": {
            "id": "clxxx...",
            "name": "Hassan Raza",
            "state": "active",
            "group": {
              "id": "clxxx...",
              "name": "Group A"
            }
          }
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/admin/guardians`

Create a new guardian.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "name": "Raza Ahmed",                // string, min 2, max 150, required
  "phone": "03009876543",              // string, max 20, required
  "cnic": "35201-1234567-1",           // string, max 20, optional
  "address": "House 12, Street 5",     // string, max 300, optional
  "linkChild": {                       // optional, link a child on creation
    "participantId": "clxxx...",
    "relation": "father"
  }
}
```

**Zod Schema:**
```typescript
const createGuardianSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().max(20),
  cnic: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  linkChild: z.object({
    participantId: z.string().cuid(),
    relation: z.string().max(30).optional(),
  }).optional(),
});
```

**Scope enforcement:** If `linkChild` is provided, the participant must be in a group within the City Head's city.

**Response (201):** Returns created guardian with children if linked.

#### `PUT /api/admin/guardians`

Update a guardian.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "id": "clxxx...",
  "name": "Raza Ahmed Updated",    // optional
  "phone": "03009998888",           // optional
  "cnic": "35201-9999999-1",        // optional
  "address": "New address",         // optional
  "isActive": true                   // optional
}
```

**Response (200):** Returns updated guardian.

#### `POST /api/admin/guardians/link-child`

Link a guardian to a participant (child).

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "guardianId": "clxxx...",
  "participantId": "clxxx...",
  "relation": "father"               // optional, max 30 chars
}
```

**Zod Schema:**
```typescript
const linkChildSchema = z.object({
  guardianId: z.string().cuid(),
  participantId: z.string().cuid(),
  relation: z.string().max(30).optional(),
});
```

**Validation:**
- Guardian must exist and be active
- Participant must exist
- Link must not already exist (unique constraint on `[guardianId, participantId]`)
- Participant must be in a group within City Head's city scope

**Response (201):**
```json
{
  "data": {
    "id": "clxxx...",
    "guardianId": "clxxx...",
    "participantId": "clxxx...",
    "relation": "father",
    "createdAt": "2025-01-15T05:00:00.000Z"
  }
}
```

**Errors:**
- `409` — Link already exists

#### `DELETE /api/admin/guardians/unlink-child`

Unlink a guardian from a participant.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "guardianId": "clxxx...",
  "participantId": "clxxx..."
}
```

**Response (200):** Returns the deleted `GuardianChild` record ID.

---

### 3.10 Attendance Events

#### `GET /api/admin/attendance-events`

List attendance events with filters.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `groupId` | string | Filter by group |
| `batchId` | string | Filter by batch (all groups' events) |
| `parkId` | string | Filter by park |
| `cityId` | string | Filter by city |
| `dateFrom` | string | ISO date, events on or after this date |
| `dateTo` | string | ISO date, events on or before this date |
| `isClosed` | boolean | Filter open/closed events |
| `search` | string | Search by event title |
| `page` | number | Page number |
| `limit` | number | Per page |
| `include` | string | `group`, `records`, `closer` |

**Scope enforcement:** City Head only sees events for groups within their city.

**Response (200):**
```json
{
  "data": [
    {
      "id": "clxxx...",
      "groupId": "clxxx...",
      "title": "Session 15 - Quran Review",
      "eventDate": "2025-03-15T00:00:00.000Z",
      "isClosed": false,
      "closedAt": null,
      "closedBy": null,
      "createdAt": "2025-03-15T05:00:00.000Z",
      "updatedAt": "2025-03-15T05:00:00.000Z",
      "group": {
        "id": "clxxx...",
        "name": "Group A",
        "batch": {
          "id": "clxxx...",
          "name": "Jan-Jun 2025"
        }
      },
      "_count": {
        "records": 18
      }
    }
  ],
  "pagination": { ... }
}
```

#### `POST /api/admin/attendance-events`

Create a new attendance event for a group.

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "groupId": "clxxx...",                    // string (cuid), required
  "title": "Session 15 - Quran Review",     // string, min 2, max 200, required
  "eventDate": "2025-03-15T10:00:00Z"       // ISO datetime, required
}
```

**Zod Schema:**
```typescript
const createAttendanceEventSchema = z.object({
  groupId: z.string().cuid(),
  title: z.string().min(2).max(200),
  eventDate: z.string().datetime().transform(v => new Date(v)),
});
```

**Validation:**
- Group must exist and be active
- No duplicate open event for the same group on the same date (check by truncating eventDate to date and comparing)
- Group must be within City Head's city scope

**Response (201):** Returns created attendance event.

**Errors:**
- `409` — An open event already exists for this group on this date

#### `PATCH /api/admin/attendance-events`

Close an attendance event (prevents further attendance marking).

**Authorization:** `program_admin`, `city_head`, `super_admin`

**Request Body:**
```json
{
  "id": "clxxx...",               // string (cuid), required
  "action": "close"               // string, required, only "close" for now
}
```

**Zod Schema:**
```typescript
const patchAttendanceEventSchema = z.object({
  id: z.string().cuid(),
  action: z.enum(["close"]),
});
```

**Close logic:**
1. Set `isClosed: true`
2. Set `closedAt: new Date()`
3. Set `closedBy: session.user.staffMetaId`

**Response (200):**
```json
{
  "data": {
    "id": "clxxx...",
    "isClosed": true,
    "closedAt": "2025-03-15T14:30:00.000Z",
    "closedBy": "clxxx..."
  }
}
```

**Errors:**
- `404` — Event not found
- `409` — Event is already closed
- `403` — Event's group is outside City Head's scope

---

## 4. UI Components & Screens

All screens are rendered inside the `AppShell` layout. Navigation is client-side via Zustand's `useAppStore`. Every screen is a `"use client"` component.

### 4.1 Admin Dashboard (Basic)

**File:** `src/components/modules/admin/admin-dashboard.tsx`

**Page identifier:** `admin-dashboard`

**Description:** A basic dashboard showing summary counts. This will be significantly enhanced in Module 4 (Dashboards). For Module 2, it provides quick navigation to management pages.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ PageHeader: "Admin Dashboard"               │
│ Breadcrumb: Home > Admin Dashboard          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Cities   │  │ Parks    │  │ Batches  │  │
│  │    5     │  │   12     │  │    8     │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Groups   │  │ Shabab   │  │ Murabbis │  │
│  │   25     │  │  420     │  │   25     │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────┐  ┌──────────┐                │
│  │ Guardians│  │ Events   │                │
│  │   380    │  │   150    │                │
│  └──────────┘  └──────────┘                │
│                                             │
│  Quick Actions:                              │
│  [+ Add City] [+ Add Park] [+ Add Group]   │
│                                             │
└─────────────────────────────────────────────┘
```

**Fields:**
- 8 stat cards using the `DataCard` component from Module 1
- Each card shows: icon, label, count, and click navigates to the respective list page
- "Quick Actions" row with buttons for common create operations
- City Head: counts are scoped to their city; Quick Actions skip City creation

**Scope Selector:** Not shown on this page (city is implicit for City Head).

**Data source:** Single API call `GET /api/admin/cities?include=stats` or individual count queries.

**Role visibility:**
- City Head: Shows all cards except "Cities" (they only have 1 city)
- Program Admin: Shows all cards including "Cities"

---

### 4.2 Cities Page

**File:** `src/components/modules/admin/cities-page.tsx`

**Page identifier:** `admin-cities`

**Description:** List, create, edit, and manage cities. Only accessible to Program Admin and Super Admin. City Heads do NOT see this page.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Cities"          [+ Create City]       │
│ Breadcrumb: Home > Admin > Cities                   │
├─────────────────────────────────────────────────────┤
│ SearchInput: [Search cities...]                     │
│ FilterBar: [Active ▼] [All Status ▼]                │
├─────────────────────────────────────────────────────┤
│ DataTable:                                          │
│ ┌──────────┬──────────┬────────┬────────┬────────┐ │
│ │ Name     │ Code     │ Parks  │ Status │ Actions│ │
│ ├──────────┼──────────┼────────┼────────┼────────┤ │
│ │ Karachi  │ KHI      │   5    │ Active │ ⋮ Edit│ │
│ │ Lahore   │ LHR      │   3    │ Active │ ⋮ Edit│ │
│ │ Islamabad│ ISB      │   2    │ Active │ ⋮ Edit│ │
│ └──────────┴──────────┴────────┴────────┴────────┘ │
│ Pagination: < 1 2 3 >  Showing 1-20 of 12          │
└─────────────────────────────────────────────────────┘
```

**Fields in table:**
| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| Name | `city.name` | Yes | Clickable, navigates to Parks page filtered by this city |
| Code | `city.code` | Yes | Displayed as `Badge` |
| Parks | `_count.parks` | Yes | Number |
| City Head | `cityHeads[0].user.name` | No | Shows first city head name, or "Unassigned" |
| Status | `isActive` | Yes | `StatusBadge` — green for active, gray for inactive |
| Actions | — | No | Dropdown: Edit, Deactivate/Activate, View Parks |

**Filters:**
- Search: Fuzzy match on `name` and `code`
- Status: `All`, `Active`, `Inactive`

**Create/Edit Dialog:**
- Opens as a `Dialog` (shadcn/ui) with form fields
- **Create:** `name` (Input), `code` (Input, auto-uppercased)
- **Edit:** `name` (Input), `isActive` (Switch)
- Code is NOT editable after creation

**City Head Assignment:**
- In the Edit dialog, a section "Assigned City Head" shows current city head
- Button "Assign City Head" opens a sub-dialog where the admin can:
  - Search existing users by name/email
  - Only users who are NOT already assigned as city head elsewhere
  - Selecting a user creates/updates a `staff_meta` record with `role: "city_head"`, `assignedCityId: <this city>`
  - If a city head is already assigned, the new assignment replaces the old one (old staff_meta's `assignedCityId` is cleared, `role` may change)
- **Implementation note:** This calls `PUT /api/admin/cities` with the head assignment, or a dedicated `POST /api/admin/cities/assign-head` endpoint could be added

**Delete/Deactivate:**
- Clicking "Deactivate" shows a `ConfirmDialog`
- If city has active parks, error message: "Cannot deactivate. Deactivate all parks first."
- On success, row updates to show inactive status

**Actions dropdown (shadcn `DropdownMenu`):**
- Edit
- Manage Parks (navigates to parks page with city pre-selected)
- Deactivate / Activate (toggle based on current state)

---

### 4.3 Parks Page

**File:** `src/components/modules/admin/parks-page.tsx`

**Page identifier:** `admin-parks`

**Description:** List, create, edit, and manage parks within a city.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Parks"            [+ Create Park]      │
│ Breadcrumb: Home > Admin > Parks                    │
├─────────────────────────────────────────────────────┤
│ ScopeSelector: [City ▼] (pre-filled for City Head)  │
├─────────────────────────────────────────────────────┤
│ SearchInput: [Search parks...]                      │
│ FilterBar: [Active ▼]                               │
├─────────────────────────────────────────────────────┤
│ DataTable:                                          │
│ ┌──────────┬──────────┬────────┬────────┬────────┐ │
│ │ Name     │ City     │ Batches│ Status │ Actions│ │
│ ├──────────┼──────────┼────────┼────────┼────────┤ │
│ │ Gulshan  │ Karachi  │   2    │ Active │ ⋮ Edit│ │
│ │ DHA Park │ Karachi  │   1    │ Active │ ⋮ Edit│ │
│ └──────────┴──────────┴────────┴────────┴────────┘ │
│ Pagination                                          │
└─────────────────────────────────────────────────────┘
```

**Scope Selector:** City dropdown is shown. For City Head, it's locked to their city (disabled select). For Program Admin, it's a searchable dropdown of all cities.

**Fields in table:**
| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| Name | `park.name` | Yes | Clickable, navigates to Batches page |
| City | `city.name` | Yes | Only shown for Program Admin |
| Address | `park.address` | No | Truncated to 50 chars with tooltip |
| Batches | `_count.batches` | Yes | Number |
| Status | `isActive` | Yes | `StatusBadge` |
| Actions | — | No | Edit, Deactivate, View Batches |

**Create/Edit Dialog:**
- **Create:** `name` (Input), `cityId` (Select — pre-filled from Scope Selector, disabled for City Head), `address` (Textarea, optional)
- **Edit:** `name` (Input), `address` (Textarea), `isActive` (Switch)

**Role differences:**
- **City Head:** City is pre-selected and locked. Can only see/manage their city's parks.
- **Program Admin:** Can select any city from dropdown.

---

### 4.4 Batches Page

**File:** `src/components/modules/admin/batches-page.tsx`

**Page identifier:** `admin-batches`

**Description:** List, create, edit, and manage batches within a park.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Batches"           [+ Create Batch]    │
│ Breadcrumb: Home > Admin > Batches                  │
├─────────────────────────────────────────────────────┤
│ ScopeSelector: [City ▼] [Park ▼]                    │
├─────────────────────────────────────────────────────┤
│ SearchInput: [Search batches...]                    │
│ FilterBar: [Active ▼] [Date Range ▼]                │
├─────────────────────────────────────────────────────┤
│ DataTable:                                          │
│ ┌────────────┬──────────┬────────┬─────┬──────────┐ │
│ │ Name       │ Park     │ Period │Grps │ Actions  │ │
│ ├────────────┼──────────┼────────┼─────┼──────────┤ │
│ │ Jan-Jun 25 │ Gulshan  │Jan-Jun │  4  │ ⋮ Edit   │ │
│ │ Jul-Dec 25 │ Gulshan  │Jul-Dec │  3  │ ⋮ Edit   │ │
│ └────────────┴──────────┴────────┴─────┴──────────┘ │
│ Pagination                                          │
└─────────────────────────────────────────────────────┘
```

**Scope Selector:** City > Park cascading. For City Head, city is locked.

**Fields in table:**
| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| Name | `batch.name` | Yes | Clickable, navigates to Groups page |
| Park | `park.name` | Yes | Only shown for Program Admin |
| Start Date | `startDate` | Yes | Displayed in PKT |
| End Date | `endDate` | Yes | Displayed in PKT, or "Ongoing" if null |
| Groups | `_count.groups` | Yes | Number |
| Warning | `settings.warningAbsents` | No | Show "3 absents" |
| Dropout | `settings.dropoutAbsents` | No | Show "6 absents" |
| Status | `isActive` | Yes | `StatusBadge` |
| Actions | — | No | Edit, Settings, Deactivate |

**Create/Edit Dialog:**
- **Create:** `name` (Input), `parkId` (Select — pre-filled from Scope Selector), `startDate` (DatePicker), `endDate` (DatePicker, optional), `warningAbsents` (NumberInput, default 3), `dropoutAbsents` (NumberInput, default 6)
- **Edit:** All fields above except `parkId`
- Date validation: `endDate` must be after `startDate`
- Settings validation: `dropoutAbsents` must be greater than `warningAbsents`
- If settings are provided, a `BatchSettings` record is created alongside the batch

**Batch Settings link:**
- "Settings" action in dropdown navigates to Batch Settings page (Section 4.9)

---

### 4.5 Groups Page

**File:** `src/components/modules/admin/groups-page.tsx`

**Page identifier:** `admin-groups`

**Description:** List, create, edit, and manage groups within a batch.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Groups"            [+ Create Group]    │
│ Breadcrumb: Home > Admin > Groups                   │
├─────────────────────────────────────────────────────┤
│ ScopeSelector: [City ▼] [Park ▼] [Batch ▼]         │
├─────────────────────────────────────────────────────┤
│ SearchInput: [Search groups...]                     │
│ FilterBar: [Active ▼]                               │
├─────────────────────────────────────────────────────┤
│ DataTable:                                          │
│ ┌──────────┬────────────┬───────────┬──────┬──────┐ │
│ │ Name     │ Batch      │ Murabbi   │Count │ Acts │ │
│ ├──────────┼────────────┼───────────┼──────┼──────┤ │
│ │ Group A  │ Jan-Jun 25 │ Usman Ali │ 18   │ ⋮    │ │
│ │ Group B  │ Jan-Jun 25 │ (None)    │ 15   │ ⋮    │ │
│ └──────────┴────────────┴───────────┴──────┴──────┘ │
│ Pagination                                          │
└─────────────────────────────────────────────────────┘
```

**Scope Selector:** City > Park > Batch cascading.

**Fields in table:**
| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| Name | `group.name` | Yes | Clickable, navigates to People page filtered by group |
| Batch | `batch.name` | Yes | Only if not scoped to single batch |
| Park | `batch.park.name` | Yes | Only for Program Admin |
| Murabbi | `murabbis[0].user.name` | No | "Unassigned" if none |
| Participants | `_count.participants` | Yes | Number, color-coded: green if 15-20, yellow if <15, red if >25 |
| Status | `isActive` | Yes | `StatusBadge` |
| Actions | — | No | Edit, View Participants, Deactivate |

**Create/Edit Dialog:**
- **Create:** `name` (Input), `batchId` (Select — pre-filled from Scope Selector)
- **Edit:** `name` (Input), `isActive` (Switch)

**Participant count coloring:**
- 15-20 participants: default (no color)
- < 15 participants: yellow/warning badge
- > 25 participants: red badge (overcrowded)
- 0 participants: gray (empty group)

---

### 4.6 People Page

**File:** `src/components/modules/admin/people-page.tsx`

**Page identifier:** `admin-people`

**Description:** Tabbed view for managing Shabab (participants) and Murabbis. This is the most complex page in the module.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ PageHeader: "People"          [+ Create Shabab]         │
│ Breadcrumb: Home > Admin > People                       │
├─────────────────────────────────────────────────────────┤
│ Tabs: [Shabab (420)] [Murabbis (25)]                    │
├─────────────────────────────────────────────────────────┤
│ ScopeSelector: [City ▼] [Park ▼] [Batch ▼] [Group ▼]   │
├─────────────────────────────────────────────────────────┤
│ SearchInput: [Search by name or phone...]               │
│ FilterBar: [Status ▼] [Gender ▼] [State ▼]              │
│ Bulk Actions: [Activate] [Deactivate] [Move] [Change St]│
├─────────────────────────────────────────────────────────┤
│ DataTable (Shabab tab):                                 │
│ ┌───┬──────────┬──────┬────────┬──────┬─────┬────────┐ │
│ │ ☐ │ Name     │Phone │ Gender │State │Grp  │ Actions│ │
│ ├───┼──────────┼──────┼────────┼──────┼─────┼────────┤ │
│ │ ☐ │ Hassan R │0300..│ Male   │Active│Grp A│ ⋮ Edit │ │
│ │ ☐ │ Ali K    │0301..│ Male   │Warn  │Grp A│ ⋮ Edit │ │
│ └───┴──────────┴──────┴────────┴──────┴─────┴────────┘ │
│ Pagination: Select All (page) | Showing 1-20 of 420    │
└─────────────────────────────────────────────────────────┘
```

#### Shabab Tab

**Fields in table:**
| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| Checkbox | — | No | For bulk selection |
| Name | `participant.name` | Yes | Primary identifier |
| Phone | `phone` | Yes | With WhatsApp icon link |
| Gender | `gender` | Yes | Badge: M/F |
| Age | Calculated from `dateOfBirth` | No | Displayed as years |
| State | `state` | Yes | `StatusBadge`: active=green, warning=yellow, dropout=red, graduated=blue, inactive=gray |
| Group | `group.name` | Yes | Clickable, navigates with group filter |
| Park | `group.batch.park.name` | Yes | Only for Program Admin |
| Joined | `joinedAt` | Yes | Displayed in PKT, date only |
| Actions | — | No | Edit, View Guardians, Change State |

**Filters:**
- Search: Name or phone
- State: All, Active, Warning, Dropout, Graduated, Inactive
- Gender: All, Male, Female
- Scope Selector: City > Park > Batch > Group (any level)

**Create Dialog:**
```
┌─────────────────────────────────────┐
│ Create Shabab                        │
├─────────────────────────────────────┤
│ Name:        [___________________]  │
│ Phone:       [___________________]  │
│ Date of Birth: [DD/MM/YYYY 📅]     │
│ Gender:      ○ Male  ○ Female      │
│ Address:     [___________________]  │
│ Group:       [Select Group ▼]      │
│              (cascading: city>park> │
│               batch>group)          │
├─────────────────────────────────────┤
│              [Cancel]  [Create]     │
└─────────────────────────────────────┘
```

- Group selector is a cascading: City > Park > Batch > Group
- For City Head, City is locked
- Name is required
- Group is required

**Edit Dialog:**
- All fields from Create, plus:
- `state` (Select: active, warning, dropout, graduated, inactive)
- Group can be changed (reassignment)

**Bulk Operations Bar:**
- Shown when at least 1 row is selected
- Actions:
  - **Activate** — Set all selected to `state: "active"`
  - **Deactivate** — Set `isActive: false` on all selected
  - **Move to Group** — Opens group selector, moves all selected to chosen group
  - **Change State** — Opens state selector dropdown, applies to all selected
- Confirmation dialog before executing bulk operations
- Shows count: "3 participants selected"

#### Murabbis Tab

**Fields in table:**
| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| Name | `user.name` | Yes | |
| Email | `user.email` | Yes | |
| Phone | `user.phone` | Yes | |
| Park | `assignedPark.name` | Yes | "Unassigned" if null |
| Group | `assignedGroup.name` | Yes | "Unassigned" if null |
| Status | `isActive` | Yes | `StatusBadge` |
| Actions | — | No | Edit, Reassign |

**Create Dialog:**
```
┌─────────────────────────────────────┐
│ Create Murabbi                       │
├─────────────────────────────────────┤
│ Name:        [___________________]  │
│ Email:       [___________________]  │
│ Phone:       [___________________]  │
│ Password:    [___________________]  │
│              (will be required to    │
│               change on first login) │
│ Assigned City: [Select City ▼]      │
│ Assigned Park: [Select Park ▼]      │
│ Assigned Group: [Select Group ▼]    │
├─────────────────────────────────────┤
│              [Cancel]  [Create]     │
└─────────────────────────────────────┘
```

- Email is required (used for login)
- Password is required (minimum 8 chars, will need to be reset on first login)
- City > Park > Group cascading selectors
- For City Head, City is locked to their city

**Edit Dialog:**
- Name, Phone (editable)
- Assigned Park (can reassign)
- Assigned Group (can reassign)
- `isActive` (Switch to activate/deactivate)
- Email and password are NOT editable here (handled in Module 5: Access Provisioning)

**Filters:**
- Search: Name, email, phone
- Park: Dropdown of parks
- Status: Active, Inactive

---

### 4.7 Guardians Page

**File:** `src/components/modules/admin/guardians-page.tsx`

**Page identifier:** `admin-guardians`

**Description:** Manage guardians, link them to participants (children).

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ PageHeader: "Guardians"          [+ Create Guardian]    │
│ Breadcrumb: Home > Admin > Guardians                    │
├─────────────────────────────────────────────────────────┤
│ ScopeSelector: [City ▼] [Park ▼] [Group ▼]             │
├─────────────────────────────────────────────────────────┤
│ SearchInput: [Search by name, phone, or CNIC...]       │
│ FilterBar: [Has Linked Children ▼] [Active ▼]           │
├─────────────────────────────────────────────────────────┤
│ DataTable:                                              │
│ ┌──────────┬──────────┬──────────┬────────┬───────────┐ │
│ │ Name     │ Phone    │ CNIC     │Childrn │ Actions   │ │
│ ├──────────┼──────────┼──────────┼────────┼───────────┤ │
│ │ Raza Ahmed│0309..  │35201-..  │   2    │ ⋮ Edit    │ │
│ │ Fatima B │0308..  │35202-..  │   1    │ ⋮ Edit    │ │
│ └──────────┴──────────┴──────────┴────────┴───────────┘ │
│ Pagination                                              │
└─────────────────────────────────────────────────────────┘
```

**Fields in table:**
| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| Name | `guardian.name` | Yes | |
| Phone | `phone` | Yes | With WhatsApp icon |
| CNIC | `cnic` | Yes | Format: `XXXXX-XXXXXXX-X` |
| Address | `address` | No | Truncated |
| Children | `children.length` | No | Number, clickable to expand/view |
| Status | `isActive` | Yes | `StatusBadge` |
| Actions | — | No | Edit, View Children, Link Child, Deactivate |

**Create Dialog:**
```
┌─────────────────────────────────────┐
│ Create Guardian                      │
├─────────────────────────────────────┤
│ Name:        [___________________]  │
│ Phone:       [___________________]  │
│ CNIC:        [___________________]  │
│ Address:     [___________________]  │
│                                     │
│ ☐ Link a child immediately          │
│   Child (Search): [___________▼]   │
│   Relation: [father ▼]              │
├─────────────────────────────────────┤
│              [Cancel]  [Create]     │
└─────────────────────────────────────┘
```

- "Link a child" is a checkbox that reveals additional fields
- Child selector: searchable dropdown of participants within scope
- Relation: free-text or dropdown (father, mother, uncle, brother, sister, other)

**Edit Dialog:**
- Name, Phone, CNIC, Address, isActive

**View Children (Expandable Row or Sub-dialog):**
```
┌─────────────────────────────────────────┐
│ Children of Raza Ahmed                  │
├──────────┬──────────────┬───────┬──────┤
│ Name     │ Group        │ State │ Rel  │
├──────────┼──────────────┼───────┼──────┤
│ Hassan R │ Group A      │Active │Father│
│ Sara R   │ Group B      │Active │Father│
└──────────┴──────────────┴───────┴──────┘
│ [+ Link Another Child]                  │
└─────────────────────────────────────────┘
```

**Link Child Dialog:**
- Shown when clicking "Link Child" from actions or "Link Another Child"
- Fields: Participant (searchable select), Relation (dropdown/text)
- Calls `POST /api/admin/guardians/link-child`

**Unlink Child:**
- In the children view, each child row has an "Unlink" button (X icon)
- Confirmation dialog before unlinking
- Calls `DELETE /api/admin/guardians/unlink-child`

**Filters:**
- Search: Name, phone, CNIC
- Has Children: All, Has Children, No Children
- Scope Selector: City > Park > Group (filters guardians by their children's location)

---

### 4.8 Attendance Events Page

**File:** `src/components/modules/admin/attendance-events-page.tsx`

**Page identifier:** `admin-attendance-events`

**Description:** Create and manage attendance events (sessions) for groups. This page creates the events; actual attendance marking happens in Module 3 (Park Attendance).

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: "Attendance Events"    [+ Create Event]         │
│ Breadcrumb: Home > Admin > Attendance Events                 │
├─────────────────────────────────────────────────────────────┤
│ ScopeSelector: [City ▼] [Park ▼] [Batch ▼] [Group ▼]       │
├─────────────────────────────────────────────────────────────┤
│ SearchInput: [Search events...]                             │
│ FilterBar: [Date Range: From 📅 - To 📅] [Status: All ▼]   │
├─────────────────────────────────────────────────────────────┤
│ DataTable:                                                  │
│ ┌──────────┬──────────┬──────────┬─────────┬──────┬──────┐ │
│ │ Title    │ Group    │ Date     │ Status  │Recs  │ Acts │ │
│ ├──────────┼──────────┼──────────┼─────────┼──────┼──────┤ │
│ │ Session..│ Group A  │15-Mar-25│ Open    │ 18   │ ⋮    │ │
│ │ Session..│ Group A  │14-Mar-25│ Closed  │ 17   │ ⋮    │ │
│ └──────────┴──────────┴──────────┴─────────┴──────┴──────┘ │
│ Pagination                                                  │
└─────────────────────────────────────────────────────────────┘
```

**Fields in table:**
| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| Title | `title` | Yes | |
| Group | `group.name` | Yes | |
| Batch | `group.batch.name` | Yes | Only if not scoped |
| Date | `eventDate` | Yes | Displayed in PKT, date only |
| Status | `isClosed` | Yes | `StatusBadge`: Open=green, Closed=gray |
| Records | `_count.records` | No | Number of attendance records |
| Closed By | `closer.user.name` | No | Shown only for closed events |
| Actions | — | No | Close Event (if open), View Details |

**Create Dialog:**
```
┌─────────────────────────────────────┐
│ Create Attendance Event              │
├─────────────────────────────────────┤
│ Title:       [___________________]  │
│              e.g., "Session 15 -     │
│              Quran Review"           │
│ Group:       [Select Group ▼]       │
│              (cascading selectors)   │
│ Event Date:  [DD/MM/YYYY 📅]       │
├─────────────────────────────────────┤
│              [Cancel]  [Create]     │
└─────────────────────────────────────┘
```

- Title is required
- Group is required (selected via Scope Selector or dropdown)
- Event Date is required, defaults to today
- Validation: No duplicate open event for same group on same date

**Close Event:**
- Button in actions dropdown (only visible for open events)
- Confirmation dialog: "Close this attendance event? No further attendance can be marked."
- Calls `PATCH /api/admin/attendance-events` with `{ action: "close" }`

**Filters:**
- Date range: From/To date pickers
- Status: All, Open, Closed
- Scope Selector: City > Park > Batch > Group

---

### 4.9 Batch Settings Page

**File:** `src/components/modules/admin/batch-settings-page.tsx`

**Page identifier:** `admin-batch-settings`

**Description:** Configure warning and dropout thresholds for a batch. These settings determine when a participant's state automatically changes based on consecutive absences.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Batch Settings"                        │
│ Breadcrumb: Home > Admin > Batches > Settings       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Batch: Jan-Jun 2025                                │
│  Park: Gulshan Park                                 │
│  City: Karachi                                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Warning Threshold                          │   │
│  │  Number of consecutive absents after which  │   │
│  │  a participant enters "warning" state.      │   │
│  │                                             │   │
│  │  [ 3 ]  (number input, 1-30)               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Dropout Threshold                          │   │
│  │  Number of consecutive absents after which  │   │
│  │  a participant enters "dropout" state.      │   │
│  │                                             │   │
│  │  [ 6 ]  (number input, 1-60)               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ℹ️ The automatic state transition will be         │
│     calculated by Module 3 (Park Attendance)        │
│     when attendance events are closed.              │
│                                                     │
│              [Cancel]  [Save Settings]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Fields:**
- `warningAbsents` — NumberInput, min 1, max 30, default 3
- `dropoutAbsents` — NumberInput, min 1, max 60, default 6
- Validation: `dropoutAbsents` must be strictly greater than `warningAbsents`

**How to reach this page:**
- From Batches page, click "Settings" in a batch's actions dropdown
- The `batchId` is passed via the app store (`selectedBatchId`)

**Save:** Calls `PUT /api/admin/batches` with the batch ID and updates the related `BatchSettings`. If no `BatchSettings` exists, one is created (upsert).

---

### 4.10 Scope Selector Component

**File:** `src/components/business/scope-selector.tsx`

**Description:** A cascading dropdown component used across all admin list pages. It allows the user to narrow their view by selecting City > Park > Batch > Group in sequence.

**Layout:**
```
┌─────────┬──────────┬──────────┬──────────┐
│ City  ▼ │ Park   ▼ │ Batch  ▼ │ Group  ▼ │
└─────────┴──────────┴──────────┴──────────┘
```

**Behavior:**
- Each dropdown populates based on the previous selection
- Selecting a City populates the Park dropdown
- Selecting a Park populates the Batch dropdown
- Selecting a Batch populates the Group dropdown
- Changing a higher-level dropdown resets all lower-level selections
- Selecting a lower-level dropdown automatically sets the higher levels (by looking up the group's batch, park, city)
- Each dropdown has an "All" option (shows all items at that level)
- Dropdowns are disabled/enabled based on:
  - City Head: City is locked, always shows their city
  - Program Admin: All dropdowns are enabled
- The component writes to `useAppStore` (`selectedCityId`, `selectedParkId`, `selectedBatchId`, `selectedGroupId`)
- Parent pages watch these store values and re-fetch data when they change
- Props: `levels` (number, 1-4, which dropdowns to show), `onChange` callback

**Styling:**
- Horizontal row of `Select` components (shadcn/ui)
- On mobile: stacks vertically
- Selected values shown as `Badge` chips below the dropdowns
- "Clear All" button to reset all selections

**Implementation approach:**
- Use TanStack Query for each dropdown's data
- Query keys: `["scope-cities"]`, `["scope-parks", cityId]`, `["scope-batches", parkId]`, `["scope-groups", batchId]`
- Use `useAppStore` for state persistence across page navigations
- Debounce the `onChange` to avoid excessive re-fetches

---

### 4.11 Shared Components Used

These components from Module 1 are reused throughout:

| Component | Used In |
|-----------|---------|
| `PageHeader` | Every page |
| `DataTable` | All list pages |
| `StatusBadge` | Status columns in all tables |
| `SearchInput` | All list pages |
| `FilterBar` | All list pages |
| `ConfirmDialog` | Delete/Deactivate actions |
| `EmptyState` | Empty list views |
| `LoadingState` | Data loading states |
| `ErrorState` | Error displays |
| `FormActions` | All create/edit dialogs |
| `FormField` | All form fields |
| `RoleBadge` | People page (murabbi tab) |
| `DataCard` | Admin Dashboard |

---

## 5. Complete Task Breakdown

### M2-T01: Prisma Schema — Module 2 Tables

**Description:** Add all Module 2 tables to `prisma/schema.prisma` and run migration. Tables: `cities`, `parks`, `batches`, `groups`, `batch_settings`, `guardians`, `guardian_children`, `participants`, `attendance_events`. Also update existing `User`, `StaffMeta`, `AuditLog` models with relations to new tables.

**Files:**
- `prisma/schema.prisma` — Modify

**Acceptance Criteria:**
- All 9 new models added with correct fields, relations, and `@@map` annotations
- `User` model updated with `guardian`, `participant` relations
- `StaffMeta` model updated with `assignedCity`, `assignedPark`, `assignedGroup` relations, `EventCloser`, `AttendanceMarker` relations
- `npx prisma migrate dev` runs successfully
- `npx prisma generate` generates types without errors

**Complexity:** Medium

---

### M2-T02: Zod Validation Schemas

**Description:** Create all Zod schemas for API request validation. One file per entity grouping.

**Files:**
- `src/lib/validations/city.ts` — Create
- `src/lib/validations/park.ts` — Create
- `src/lib/validations/batch.ts` — Create
- `src/lib/validations/group.ts` — Create
- `src/lib/validations/participant.ts` — Create
- `src/lib/validations/murabbi.ts` — Create
- `src/lib/validations/guardian.ts` — Create
- `src/lib/validations/attendance-event.ts` — Create
- `src/lib/validations/index.ts` — Create (barrel export)

**Acceptance Criteria:**
- All create/update/bulk-action schemas defined with proper types, min/max, transforms
- Cross-field validation: `endDate > startDate`, `dropoutAbsents > warningAbsents`
- `index.ts` re-exports all schemas
- TypeScript types infer correctly from schemas (e.g., `z.infer<typeof createCitySchema>`)

**Complexity:** Medium

---

### M2-T03: Cities API

**Description:** Implement full CRUD for cities at `/api/admin/cities/route.ts`.

**Files:**
- `src/app/api/admin/cities/route.ts` — Create

**Acceptance Criteria:**
- `GET` returns paginated list with search, isActive filter, include option (parks, cityHeads)
- `POST` creates city with name + code validation, code auto-uppercased, unique check
- `PUT` updates name and/or isActive only (code immutable)
- `DELETE` soft-deletes (sets isActive=false), rejects if active parks exist
- Authorization: GET allows city_head, POST/PUT/DELETE require program_admin or super_admin
- City Head GET is scoped to their assigned city
- All mutations write to audit_log
- Zod validation on all inputs
- Returns 409 for duplicates, 404 for not found, 403 for unauthorized

**Complexity:** Medium

---

### M2-T04: Parks API

**Description:** Implement full CRUD for parks at `/api/admin/parks/route.ts`.

**Files:**
- `src/app/api/admin/parks/route.ts` — Create

**Acceptance Criteria:**
- `GET` returns paginated list filtered by cityId, with search, isActive filter
- `POST` creates park with cityId, validates city exists, scopes city_head
- `PUT` updates name, address, isActive; scopes city_head
- `DELETE` soft-deletes, rejects if active batches exist
- City Head scope: all operations scoped to `staffMeta.assignedCityId`
- Audit logging on all mutations
- Zod validation on all inputs

**Complexity:** Medium

---

### M2-T05: Batches API

**Description:** Implement full CRUD for batches at `/api/admin/batches/route.ts`, including BatchSettings creation on POST.

**Files:**
- `src/app/api/admin/batches/route.ts` — Create

**Acceptance Criteria:**
- `GET` returns paginated list filtered by parkId or cityId, with search, isActive filter, includes settings
- `POST` creates batch, optionally creates BatchSettings in same transaction, validates endDate > startDate
- `PUT` updates name, startDate, endDate, isActive
- `DELETE` soft-deletes, rejects if active groups exist
- BatchSettings upsert: if settings provided in POST, create; if provided in PUT, update or create
- Scope enforcement for City Head
- Audit logging on all mutations

**Complexity:** Medium-High

---

### M2-T06: Groups API

**Description:** Implement full CRUD for groups at `/api/admin/groups/route.ts`.

**Files:**
- `src/app/api/admin/groups/route.ts` — Create

**Acceptance Criteria:**
- `GET` returns paginated list filtered by batchId, parkId, or cityId, includes murabbis and participant count
- `POST` creates group, validates batch exists and is active
- `PUT` updates name, isActive
- `DELETE` soft-deletes, rejects if active participants exist
- Scope enforcement for City Head (batch must be in their city)
- Audit logging

**Complexity:** Medium

---

### M2-T07: Participants API (Shabab CRUD)

**Description:** Implement participant CRUD at `/api/admin/people/route.ts` for `type=participant`.

**Files:**
- `src/app/api/admin/people/route.ts` — Create

**Acceptance Criteria:**
- `GET` with `type=participant` returns paginated list with filters: cityId, parkId, batchId, groupId, state, gender, search
- `POST` with `type=participant` creates participant, requires groupId, validates group exists
- `PUT` with `type=participant` updates any field including groupId (reassignment) and state
- `PATCH` with `type=participant` handles bulk actions: activate, deactivate, move, change_state
- Group reassignment: simple field update, no cascade
- Scope: City Head can only access participants in groups within their city
- `GET` includes guardian links when `include=guardianLinks`
- `GET` includes group > batch > park chain for context
- Audit logging on all mutations

**Complexity:** High

---

### M2-T08: Murabbis API

**Description:** Implement Murabbi CRUD at `/api/admin/people/route.ts` for `type=murabbi`, including User creation.

**Files:**
- `src/app/api/admin/people/route.ts` — Modify (extends M2-T07 file)

**Acceptance Criteria:**
- `GET` with `type=murabbi` returns list with filters: cityId, parkId, search
- `POST` with `type=murabbi` creates User (with hashed password, mustResetPwd=true) AND StaffMeta (role=murabbi, assignments) in a Prisma transaction
- `PUT` with `type=murabbi` updates name, phone, assignedParkId, assignedGroupId, isActive
- Reassignment: changing assignedGroupId moves murabbi to new group, old group loses murabbi
- Email uniqueness check on User
- Password hashed with bcrypt (cost factor 12)
- Scope: City Head can only create murabbis assigned to their city
- Audit logging

**Complexity:** High

---

### M2-T09: Guardians API

**Description:** Implement Guardian CRUD and child linking at `/api/admin/guardians/route.ts` and `/api/admin/guardians/link-child/route.ts`.

**Files:**
- `src/app/api/admin/guardians/route.ts` — Create
- `src/app/api/admin/guardians/link-child/route.ts` — Create
- `src/app/api/admin/guardians/unlink-child/route.ts` — Create

**Acceptance Criteria:**
- `GET` returns paginated guardians with filters: cityId, parkId, participantId, search
- `POST` creates guardian, optionally links a child (creates GuardianChild in same transaction)
- `PUT` updates guardian fields
- `POST /link-child` links guardian to participant with relation
- `DELETE /unlink-child` removes the link
- Link uniqueness: 409 if link already exists
- Guardian list includes children when `include=children`
- Scope: City Head filtered by children's group locations
- Audit logging

**Complexity:** High

---

### M2-T10: Attendance Events API

**Description:** Implement Attendance Event CRUD and close functionality at `/api/admin/attendance-events/route.ts`.

**Files:**
- `src/app/api/admin/attendance-events/route.ts` — Create

**Acceptance Criteria:**
- `GET` returns paginated events with filters: groupId, batchId, parkId, cityId, dateFrom, dateTo, isClosed, search
- `POST` creates event, validates group is active, rejects duplicate open event for same group+date
- `PATCH` with `action=close` sets isClosed=true, closedAt, closedBy
- Date comparison for duplicate check: truncate to date (remove time) before comparing
- Scope: City Head filtered by group's batch's park's city
- Audit logging

**Complexity:** Medium

---

### M2-T11: TypeScript Types

**Description:** Define all TypeScript types and interfaces used by the frontend.

**Files:**
- `src/types/index.ts` — Modify (add Module 2 types)
- `src/types/api.ts` — Modify (add API response types)

**Acceptance Criteria:**
- `City`, `Park`, `Batch`, `Group`, `Participant`, `Guardian`, `GuardianChild`, `BatchSettings`, `AttendanceEvent` interfaces defined
- API response types: `PaginatedResponse<T>`, `CityResponse`, `ParkResponse`, etc.
- Mutations types: `CreateCityInput`, `UpdateCityInput`, etc. (inferred from Zod schemas or manually defined)
- `ParticipantState` union type: `"active" | "warning" | "dropout" | "graduated" | "inactive"`
- `Gender` type: `"male" | "female"`
- `BulkAction` types

**Complexity:** Low

---

### M2-T12: Scope Selector Component

**Description:** Build the cascading City > Park > Batch > Group selector component.

**Files:**
- `src/components/business/scope-selector.tsx` — Create/Modify (stub exists from Module 1)

**Acceptance Criteria:**
- Renders 1-4 cascading Select dropdowns based on `levels` prop
- Each level fetches options via TanStack Query when parent selection changes
- Selecting a higher level clears lower levels
- Writes to `useAppStore` state (`selectedCityId`, `selectedParkId`, etc.)
- City Head: City dropdown is disabled and locked to their city
- "All" option in each dropdown (null value)
- "Clear All" button
- Responsive: horizontal on desktop, vertical on mobile
- Selected values shown as dismissible Badge chips
- Debounced onChange (300ms)
- Accessible: proper labels, aria attributes

**Complexity:** High

---

### M2-T13: Admin Dashboard (Basic)

**Description:** Build the basic admin dashboard with summary cards and quick actions.

**Files:**
- `src/components/modules/admin/admin-dashboard.tsx` — Create

**Acceptance Criteria:**
- 8 stat cards: Cities, Parks, Batches, Groups, Shabab, Murabbis, Guardians, Events
- Each card clickable, navigates to respective list page
- Quick action buttons: Add City, Add Park, Add Group (contextual based on role)
- City Head: hides "Cities" card, hides "Add City" button
- Loading skeleton state while data loads
- Uses `DataCard` component from Module 1
- Responsive grid: 2 columns mobile, 3 columns tablet, 4 columns desktop

**Complexity:** Low-Medium

---

### M2-T14: Cities Page (UI)

**Description:** Build the Cities list page with create/edit dialogs and City Head assignment.

**Files:**
- `src/components/modules/admin/cities-page.tsx` — Create
- `src/components/modules/admin/cities/create-city-dialog.tsx` — Create
- `src/components/modules/admin/cities/edit-city-dialog.tsx` — Create
- `src/components/modules/admin/cities/assign-city-head-dialog.tsx` — Create

**Acceptance Criteria:**
- DataTable with columns: Name, Code, Parks count, City Head, Status, Actions
- Search by name/code
- Filter by status (Active/Inactive)
- Sorting on Name, Code, Parks, Status columns
- Pagination (20 per page default)
- Create dialog: name + code fields, Zod validation, code auto-uppercase
- Edit dialog: name + isActive, code not editable
- City Head assignment sub-dialog: search users, select, assign (creates staff_meta)
- Actions dropdown: Edit, Manage Parks, Deactivate/Activate
- Deactivate confirmation dialog with active-parks check
- Empty state when no cities
- Loading state
- Only visible to Program Admin and Super Admin (not City Head)

**Complexity:** High

---

### M2-T15: Parks Page (UI)

**Description:** Build the Parks list page with create/edit dialogs.

**Files:**
- `src/components/modules/admin/parks-page.tsx` — Create
- `src/components/modules/admin/parks/create-park-dialog.tsx` — Create
- `src/components/modules/admin/parks/edit-park-dialog.tsx` — Create

**Acceptance Criteria:**
- ScopeSelector with City dropdown (locked for City Head)
- DataTable with columns: Name, City (if Program Admin), Address, Batches count, Status, Actions
- Search, filter, sort, pagination
- Create dialog: name, cityId (locked), address
- Edit dialog: name, address, isActive
- Navigate to Batches page when clicking a park name
- Role-aware: City Head sees only their city's parks

**Complexity:** Medium

---

### M2-T16: Batches Page (UI)

**Description:** Build the Batches list page with create/edit dialogs including settings.

**Files:**
- `src/components/modules/admin/batches-page.tsx` — Create
- `src/components/modules/admin/batches/create-batch-dialog.tsx` — Create
- `src/components/modules/admin/batches/edit-batch-dialog.tsx` — Create

**Acceptance Criteria:**
- ScopeSelector: City > Park
- DataTable with columns: Name, Park, Start Date, End Date, Groups count, Warning, Dropout, Status, Actions
- Dates displayed in PKT
- "Ongoing" label when endDate is null
- Create dialog: name, parkId, startDate, endDate, warningAbsents, dropoutAbsents
- Date validation, settings validation
- Edit dialog: all fields except parkId
- Actions dropdown: Edit, Settings (navigates to Batch Settings), Deactivate
- Filter by date range

**Complexity:** Medium-High

---

### M2-T17: Groups Page (UI)

**Description:** Build the Groups list page with create/edit dialogs.

**Files:**
- `src/components/modules/admin/groups-page.tsx` — Create
- `src/components/modules/admin/groups/create-group-dialog.tsx` — Create
- `src/components/modules/admin/groups/edit-group-dialog.tsx` — Create

**Acceptance Criteria:**
- ScopeSelector: City > Park > Batch
- DataTable with columns: Name, Batch, Park, Murabbi, Participants count, Status, Actions
- Participant count color-coded: green (15-20), yellow (<15), red (>25), gray (0)
- Create dialog: name, batchId (from Scope Selector)
- Edit dialog: name, isActive
- Navigate to People page when clicking group name

**Complexity:** Medium

---

### M2-T18: People Page (UI) — Shabab Tab

**Description:** Build the People page with Shabab tab including bulk operations.

**Files:**
- `src/components/modules/admin/people-page.tsx` — Create
- `src/components/modules/admin/people/create-participant-dialog.tsx` — Create
- `src/components/modules/admin/people/edit-participant-dialog.tsx` — Create
- `src/components/modules/admin/people/bulk-actions-bar.tsx` — Create
- `src/components/modules/admin/people/bulk-move-dialog.tsx` — Create
- `src/components/modules/admin/people/bulk-state-dialog.tsx` — Create

**Acceptance Criteria:**
- Tabs component: Shabab (count) | Murabbis (count)
- ScopeSelector: City > Park > Batch > Group
- DataTable (Shabab): Checkbox, Name, Phone (WhatsApp link), Gender, Age, State, Group, Park, Joined, Actions
- Filters: Search, State, Gender
- Create dialog: name, phone, dateOfBirth, gender, address, group (cascading selector)
- Edit dialog: all fields + state + group (reassignment)
- Bulk operations bar (appears when rows selected):
  - Activate, Deactivate, Move to Group, Change State
- Move dialog: group selector
- State dialog: state dropdown
- Confirmation before bulk operations
- "Select all on page" checkbox
- Row count indicator: "3 participants selected"
- State column uses StatusBadge with colors: active=green, warning=yellow, dropout=red, graduated=blue, inactive=gray

**Complexity:** Very High

---

### M2-T19: People Page (UI) — Murabbis Tab

**Description:** Build the Murabbis tab within the People page.

**Files:**
- `src/components/modules/admin/people-page.tsx` — Modify (add tab content)
- `src/components/modules/admin/people/create-murabbi-dialog.tsx` — Create
- `src/components/modules/admin/people/edit-murabbi-dialog.tsx` — Create

**Acceptance Criteria:**
- Murabbis tab shows DataTable: Name, Email, Phone, Park, Group, Status, Actions
- Create dialog: name, email, phone, password, assignedCityId, assignedParkId, assignedGroupId
- Password minimum 8 chars, hint about must-change-on-login
- Edit dialog: name, phone, assignedParkId, assignedGroupId, isActive (no email/password)
- Filters: Search, Park, Status
- Reassignment: changing group moves murabbi

**Complexity:** High

---

### M2-T20: Guardians Page (UI)

**Description:** Build the Guardians page with child linking/unlinking.

**Files:**
- `src/components/modules/admin/guardians-page.tsx` — Create
- `src/components/modules/admin/guardians/create-guardian-dialog.tsx` — Create
- `src/components/modules/admin/guardians/edit-guardian-dialog.tsx` — Create
- `src/components/modules/admin/guardians/link-child-dialog.tsx` — Create
- `src/components/modules/admin/guardians/children-list.tsx` — Create

**Acceptance Criteria:**
- DataTable: Name, Phone, CNIC, Address, Children count, Status, Actions
- Search by name, phone, CNIC
- Filter: Has Children (All/Yes/No)
- Create dialog: name, phone, cnic, address, optional link-child section
- Link-child section: searchable participant dropdown + relation dropdown
- Edit dialog: all fields + isActive
- Children list sub-dialog: table of linked children with Name, Group, State, Relation, Unlink button
- "Link Another Child" button in children list
- Unlink confirmation dialog
- Scope selector for filtering by children's location

**Complexity:** High

---

### M2-T21: Attendance Events Page (UI)

**Description:** Build the Attendance Events page with create and close functionality.

**Files:**
- `src/components/modules/admin/attendance-events-page.tsx` — Create
- `src/components/modules/admin/attendance-events/create-event-dialog.tsx` — Create

**Acceptance Criteria:**
- ScopeSelector: City > Park > Batch > Group
- DataTable: Title, Group, Batch, Date (PKT), Status (Open/Closed), Records count, Closed By, Actions
- Filters: Date range (from/to), Status (All/Open/Closed), Search
- Create dialog: title, group (from scope or dropdown), event date (default today)
- Duplicate event validation feedback
- Close event action with confirmation dialog
- Closed events cannot be re-opened (no "reopen" action)
- Date column sorted chronologically by default (newest first)

**Complexity:** Medium

---

### M2-T22: Batch Settings Page (UI)

**Description:** Build the Batch Settings configuration page.

**Files:**
- `src/components/modules/admin/batch-settings-page.tsx` — Create

**Acceptance Criteria:**
- Displays batch context: name, park, city
- Warning Absents: NumberInput (1-30, default 3)
- Dropout Absents: NumberInput (1-60, default 6)
- Validation: dropout must be > warning
- Info note about automatic state transitions (handled in Module 3)
- Save button calls upsert on BatchSettings
- Navigated to from Batches page actions dropdown
- Reads batchId from `useAppStore.selectedBatchId`
- Cancel returns to Batches page

**Complexity:** Low-Medium

---

### M2-T23: TanStack Query Hooks

**Description:** Create reusable TanStack Query hooks for all Module 2 API endpoints.

**Files:**
- `src/hooks/queries/use-cities.ts` — Create
- `src/hooks/queries/use-parks.ts` — Create
- `src/hooks/queries/use-batches.ts` — Create
- `src/hooks/queries/use-groups.ts` — Create
- `src/hooks/queries/use-people.ts` — Create
- `src/hooks/queries/use-guardians.ts` — Create
- `src/hooks/queries/use-attendance-events.ts` — Create
- `src/hooks/queries/use-scope-options.ts` — Create

**Acceptance Criteria:**
- Each file exports: `useXxxList(queryParams)`, `useXxx(id)`, `useCreateXxx()`, `useUpdateXxx()`, `useDeleteXxx()`
- List hooks accept filter params and return `{ data, isLoading, error, pagination }`
- Mutation hooks invalidate relevant query keys on success
- `use-scope-options.ts` exports: `useScopeCities()`, `useScopeParks(cityId)`, `useScopeBatches(parkId)`, `useScopeGroups(batchId)`
- Proper TypeScript types on all hooks
- Error handling built in

**Complexity:** High

---

### M2-T24: Page Router Integration

**Description:** Register all Module 2 pages in the client-side page router (PageRenderer/AppRouter).

**Files:**
- `src/components/layout/page-router.tsx` — Create/Modify
- `src/stores/useAppStore.ts` — Modify (add page constants if needed)
- `src/components/layout/sidebar.tsx` — Modify (add Module 2 nav items)

**Acceptance Criteria:**
- All page identifiers mapped to their components:
  - `admin-dashboard` → `AdminDashboard`
  - `admin-cities` → `CitiesPage`
  - `admin-parks` → `ParksPage`
  - `admin-batches` → `BatchesPage`
  - `admin-groups` → `GroupsPage`
  - `admin-people` → `PeoplePage`
  - `admin-guardians` → `GuardiansPage`
  - `admin-attendance-events` → `AttendanceEventsPage`
  - `admin-batch-settings` → `BatchSettingsPage`
- Sidebar shows Module 2 navigation items for admin roles
- City Head sidebar: hides "Cities" link
- Program Admin sidebar: shows all links
- Navigation works via `useAppStore.navigateTo()`

**Complexity:** Medium

---

## 6. Dependencies

### Hard Dependencies (Must Be Complete)

| Dependency | From Module | What's Needed |
|------------|-------------|---------------|
| Authentication | Module 1 | NextAuth session with `user.role`, `getServerSession(authOptions)` |
| Authorization helpers | Module 1 | `authorize()`, `requireRole()`, `requireCityScope()` in `src/lib/auth/authorize.ts` |
| Database setup | Module 1 | `users`, `staff_meta`, `audit_log` tables in Prisma |
| Prisma client | Module 1 | `src/lib/db.ts` singleton |
| Audit logging | Module 1 | `src/lib/audit.ts` helper function |
| Layout components | Module 1 | `AppShell`, `Sidebar`, `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState`, `ConfirmDialog`, `DataCard` |
| Form components | Module 1 | `SearchInput`, `FilterBar`, `FormActions`, `FormField` |
| Data components | Module 1 | `DataTable` with sort/filter/pagination |
| Business components | Module 1 | `RoleBadge`, `ScopeSelector` (stub) |
| Zustand store | Module 1 | `useAppStore` with navigation + context selection |
| shadcn/ui | Pre-installed | All UI primitives: Dialog, Select, Input, Button, Badge, Table, Tabs, etc. |

### Soft Dependencies (Can Be Developed In Parallel)

- Module 4 (Dashboards) can use the same data — but Module 4 enhances the dashboard
- Module 5 (Access Provisioning) builds on the User/StaffMeta pattern established here

---

## 7. Acceptance Criteria

### Core User Stories

1. **As a Program Admin**, I can create a new city with a unique code and assign a City Head to it.

2. **As a City Head**, I can create parks within my assigned city.

3. **As a City Head**, I can create batches within my parks with date ranges and configure warning/dropout thresholds.

4. **As a City Head**, I can create groups within my batches.

5. **As a City Head**, I can create Shabab (participants) and assign them to groups within my city.

6. **As a City Head**, I can create Murabbis, assign them a login email/password, and assign them to parks and groups within my city.

7. **As a City Head**, I can create Guardians and link them to participants (children) in my city.

8. **As a City Head**, I can create attendance events for groups in my city.

9. **As a City Head**, I can close an attendance event to prevent further marking.

10. **As a City Head**, I can search and filter all list pages (parks, batches, groups, people, guardians, events).

11. **As a City Head**, I can perform bulk operations on participants: activate, deactivate, move to another group, change state.

12. **As a City Head**, I can reassign a participant to a different group.

13. **As a City Head**, I can reassign a Murabbi to a different group.

14. **As a Program Admin**, I can view and manage ALL cities, parks, batches, groups, and people across the system.

15. **All data is scoped by city** — a City Head never sees data from another city.

### Technical Acceptance Criteria

- All API endpoints return consistent JSON response envelopes
- All inputs are validated with Zod before database operations
- All mutations write to `audit_log`
- All datetime values stored in UTC, displayed in PKT
- All pages are responsive (mobile-first)
- All forms show inline validation errors
- All list pages support sorting, pagination, and search
- All delete/deactivate operations show confirmation dialogs
- Scope enforcement is server-side (never client-side only)
- No `indigo` or `blue` colors in the UI (per styling rules)

---

## 8. Files to Create/Modify

### Database

| File | Action | Task |
|------|--------|------|
| `prisma/schema.prisma` | **Modify** | M2-T01 |
| `prisma/migrations/` (auto-generated) | **Create** | M2-T01 |

### Validation Schemas

| File | Action | Task |
|------|--------|------|
| `src/lib/validations/city.ts` | **Create** | M2-T02 |
| `src/lib/validations/park.ts` | **Create** | M2-T02 |
| `src/lib/validations/batch.ts` | **Create** | M2-T02 |
| `src/lib/validations/group.ts` | **Create** | M2-T02 |
| `src/lib/validations/participant.ts` | **Create** | M2-T02 |
| `src/lib/validations/murabbi.ts` | **Create** | M2-T02 |
| `src/lib/validations/guardian.ts` | **Create** | M2-T02 |
| `src/lib/validations/attendance-event.ts` | **Create** | M2-T02 |
| `src/lib/validations/index.ts` | **Create** | M2-T02 |

### API Routes

| File | Action | Task |
|------|--------|------|
| `src/app/api/admin/cities/route.ts` | **Create** | M2-T03 |
| `src/app/api/admin/parks/route.ts` | **Create** | M2-T04 |
| `src/app/api/admin/batches/route.ts` | **Create** | M2-T05 |
| `src/app/api/admin/groups/route.ts` | **Create** | M2-T06 |
| `src/app/api/admin/people/route.ts` | **Create** | M2-T07, M2-T08 |
| `src/app/api/admin/guardians/route.ts` | **Create** | M2-T09 |
| `src/app/api/admin/guardians/link-child/route.ts` | **Create** | M2-T09 |
| `src/app/api/admin/guardians/unlink-child/route.ts` | **Create** | M2-T09 |
| `src/app/api/admin/attendance-events/route.ts` | **Create** | M2-T10 |

### Types

| File | Action | Task |
|------|--------|------|
| `src/types/index.ts` | **Modify** | M2-T11 |
| `src/types/api.ts` | **Modify** | M2-T11 |

### Query Hooks

| File | Action | Task |
|------|--------|------|
| `src/hooks/queries/use-cities.ts` | **Create** | M2-T23 |
| `src/hooks/queries/use-parks.ts` | **Create** | M2-T23 |
| `src/hooks/queries/use-batches.ts` | **Create** | M2-T23 |
| `src/hooks/queries/use-groups.ts` | **Create** | M2-T23 |
| `src/hooks/queries/use-people.ts` | **Create** | M2-T23 |
| `src/hooks/queries/use-guardians.ts` | **Create** | M2-T23 |
| `src/hooks/queries/use-attendance-events.ts` | **Create** | M2-T23 |
| `src/hooks/queries/use-scope-options.ts` | **Create** | M2-T23 |

### Components — Shared

| File | Action | Task |
|------|--------|------|
| `src/components/business/scope-selector.tsx` | **Create/Modify** | M2-T12 |
| `src/components/layout/page-router.tsx` | **Create/Modify** | M2-T24 |
| `src/components/layout/sidebar.tsx` | **Modify** | M2-T24 |
| `src/stores/useAppStore.ts` | **Modify** | M2-T24 |

### Components — Admin Pages

| File | Action | Task |
|------|--------|------|
| `src/components/modules/admin/admin-dashboard.tsx` | **Create** | M2-T13 |
| `src/components/modules/admin/cities-page.tsx` | **Create** | M2-T14 |
| `src/components/modules/admin/cities/create-city-dialog.tsx` | **Create** | M2-T14 |
| `src/components/modules/admin/cities/edit-city-dialog.tsx` | **Create** | M2-T14 |
| `src/components/modules/admin/cities/assign-city-head-dialog.tsx` | **Create** | M2-T14 |
| `src/components/modules/admin/parks-page.tsx` | **Create** | M2-T15 |
| `src/components/modules/admin/parks/create-park-dialog.tsx` | **Create** | M2-T15 |
| `src/components/modules/admin/parks/edit-park-dialog.tsx` | **Create** | M2-T15 |
| `src/components/modules/admin/batches-page.tsx` | **Create** | M2-T16 |
| `src/components/modules/admin/batches/create-batch-dialog.tsx` | **Create** | M2-T16 |
| `src/components/modules/admin/batches/edit-batch-dialog.tsx` | **Create** | M2-T16 |
| `src/components/modules/admin/groups-page.tsx` | **Create** | M2-T17 |
| `src/components/modules/admin/groups/create-group-dialog.tsx` | **Create** | M2-T17 |
| `src/components/modules/admin/groups/edit-group-dialog.tsx` | Create | M2-T17 |
| `src/components/modules/admin/people-page.tsx` | **Create** | M2-T18, M2-T19 |
| `src/components/modules/admin/people/create-participant-dialog.tsx` | **Create** | M2-T18 |
| `src/components/modules/admin/people/edit-participant-dialog.tsx` | **Create** | M2-T18 |
| `src/components/modules/admin/people/bulk-actions-bar.tsx` | **Create** | M2-T18 |
| `src/components/modules/admin/people/bulk-move-dialog.tsx` | **Create** | M2-T18 |
| `src/components/modules/admin/people/bulk-state-dialog.tsx` | **Create** | M2-T18 |
| `src/components/modules/admin/people/create-murabbi-dialog.tsx` | **Create** | M2-T19 |
| `src/components/modules/admin/people/edit-murabbi-dialog.tsx` | **Create** | M2-T19 |
| `src/components/modules/admin/guardians-page.tsx` | **Create** | M2-T20 |
| `src/components/modules/admin/guardians/create-guardian-dialog.tsx` | **Create** | M2-T20 |
| `src/components/modules/admin/guardians/edit-guardian-dialog.tsx` | **Create** | M2-T20 |
| `src/components/modules/admin/guardians/link-child-dialog.tsx` | **Create** | M2-T20 |
| `src/components/modules/admin/guardians/children-list.tsx` | **Create** | M2-T20 |
| `src/components/modules/admin/attendance-events-page.tsx` | **Create** | M2-T21 |
| `src/components/modules/admin/attendance-events/create-event-dialog.tsx` | **Create** | M2-T21 |
| `src/components/modules/admin/batch-settings-page.tsx` | **Create** | M2-T22 |

### Total File Count

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Database | 0 (auto) | 1 |
| Validation | 9 | 0 |
| API Routes | 9 | 0 |
| Types | 0 | 2 |
| Query Hooks | 8 | 0 |
| Shared Components | 1 | 3 |
| Page Components | 30 | 0 |
| **Total** | **57** | **6** |

---

## 9. Implementation Notes

### 9.1 Recommended Build Order

Build tasks in this order to maximize incremental testability:

1. **Phase A — Schema + Types:** M2-T01, M2-T02, M2-T11
2. **Phase B — Core APIs:** M2-T03 (Cities), M2-T04 (Parks), M2-T05 (Batches), M2-T06 (Groups)
3. **Phase C — People APIs:** M2-T07 (Participants), M2-T08 (Murabbis), M2-T09 (Guardians)
4. **Phase D — Events API:** M2-T10 (Attendance Events)
5. **Phase E — Query Hooks:** M2-T23
6. **Phase F — Shared Components:** M2-T12 (Scope Selector), M2-T24 (Page Router)
7. **Phase G — Core UI Pages:** M2-T14 (Cities), M2-T15 (Parks), M2-T16 (Batches), M2-T17 (Groups)
8. **Phase H — People UI:** M2-T18 (Shabab), M2-T19 (Murabbis)
9. **Phase I — Remaining UI:** M2-T20 (Guardians), M2-T21 (Events), M2-T22 (Settings), M2-T13 (Dashboard)

### 9.2 Scope Enforcement Pattern

Every API route must follow this pattern for City Head scoping:

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["program_admin", "city_head", "super_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get City Head's assigned city
  let cityScope: string | null = null;
  if (role === "city_head") {
    const staff = await db.staffMeta.findFirst({
      where: { userId: session.user.id, role: "city_head", isActive: true },
    });
    if (!staff?.assignedCityId) {
      return NextResponse.json({ error: "No city assigned" }, { status: 403 });
    }
    cityScope = staff.assignedCityId;
  }

  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("cityId");

  // City Head can only query their own city
  if (cityScope && cityId && cityId !== cityScope) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build where clause
  const where: any = {};
  if (cityScope) where.cityId = cityScope;
  else if (cityId) where.cityId = cityId;

  // ... query with where clause
}
```

### 9.3 Audit Logging Pattern

Every mutation should log:

```typescript
import { logAudit } from "@/lib/audit";

await logAudit({
  userId: session.user.id,
  action: "create",          // create, update, delete
  entityType: "city",        // table name
  entityId: city.id,
  newValues: JSON.stringify(city),
});
```

### 9.4 Password Hashing for Murabbis

```typescript
import bcrypt from "bcrypt";

const saltRounds = 12;
const passwordHash = await bcrypt.hash(password, saltRounds);
```

### 9.5 PKT Date Display

All dates returned from the API are in UTC. The frontend must convert to PKT for display:

```typescript
// src/lib/timezone.ts (from Module 1)
export function toPKT(date: Date | string): Date {
  // Convert UTC to Asia/Karachi (UTC+5)
  const d = new Date(date);
  const pktOffset = 5 * 60; // 300 minutes
  const utcOffset = d.getTimezoneOffset(); // in minutes, negative for east of UTC
  return new Date(d.getTime() + (pktOffset + utcOffset) * 60000);
}

export function formatPKTDate(date: Date | string): string {
  return toPKT(date).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Karachi",
  });
}
```

### 9.6 Soft Delete Constraints

When deactivating an entity, check for active children:

```typescript
// Before deactivating a city:
const activeParks = await db.park.count({
  where: { cityId: id, isActive: true },
});
if (activeParks > 0) {
  return NextResponse.json(
    { error: "Cannot deactivate city with active parks" },
    { status: 409 }
  );
}
```

Deactivation hierarchy (bottom-up):
1. Deactivate all participants in a group → then deactivate group
2. Deactivate all groups in a batch → then deactivate batch
3. Deactivate all batches in a park → then deactivate park
4. Deactivate all parks in a city → then deactivate city