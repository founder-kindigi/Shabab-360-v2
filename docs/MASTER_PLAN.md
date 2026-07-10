# Shabab360 - Master Implementation Plan

> **Last Updated:** July 2025
> **Status:** Ready for implementation
> **Build Approach:** Modular, one module at a time, multiple agents can work in parallel on independent modules

---

## 1. Project Overview

Shabab360 is a browser-based, multi-role program operations platform for managing Shabab (youth) activities across cities in Pakistan. The organization runs regular sessions at local venues called "parks," organized into batches (time-bound cycles) and groups (participant cohorts).

### Core Organizational Hierarchy

```
National HQ (Markazi)
  └── City (City Masoul)
        └── Park (local venue)
              └── Batch (program cycle, e.g., Jan-Jun 2025)
                    └── Group (15-20 participants + 1 Murabbi/mentor)
                          └── Participant (Shabab - the youth)
```

### Roles

| Role | Code | Landing Workspace | Primary Job |
|------|------|-------------------|-------------|
| Super Admin | `super_admin` | Admin | Technical recovery, full access |
| Program Admin | `program_admin` | Admin | National oversight, city governance |
| City Head | `city_head` | Admin | City-level ops: parks, batches, people, events, fees |
| Park Admin | `park_admin` | Park | Daily attendance marking, mobile-first |
| Park Lead | `park_lead` | Park | Park attendance with broader privileges |
| Murabbi | `murabbi` | Park | Mentor, tied to one group |
| Guardian | `guardian` | Guardian | Read-only view of linked children |
| Student | `student` | Student | Read-only view of own data |

---

## 2. Architecture

### 2.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York style) |
| Database | Prisma ORM + SQLite |
| Auth | NextAuth.js v4 (Credentials provider, JWT sessions) |
| Client State | Zustand |
| Server State | TanStack Query |
| Icons | Lucide React |
| Animations | Framer Motion |
| Excel Exports | exceljs |
| Offline Queue | Dexie / IndexedDB (for attendance) |
| Timezone | UTC storage, Asia/Karachi (PKT) display |

### 2.2 Critical Architecture Constraint

**All UI must be served from the `/` route (single `page.tsx`).** The application uses a **Single Page Application (SPA) pattern** with client-side navigation managed by Zustand.

```tsx
// src/app/page.tsx - The ONLY user-visible route
export default function Home() {
  return (
    <SessionProvider>
      <AppRouter />
    </SessionProvider>
  );
}

// AppRouter renders different workspaces based on auth state + navigation state
function AppRouter() {
  const { status } = useSession();
  const currentPage = useAppStore(s => s.currentPage);

  if (status === 'loading') return <LoadingScreen />;
  if (status === 'unauthenticated') return <LoginPage />;

  return (
    <AppShell>
      <PageRenderer page={currentPage} />
    </AppShell>
  );
}
```

### 2.3 API Routes

Backend API routes ARE allowed at `/api/*` — these are server-side and not user-visible routes.

```
src/app/api/
  ├── auth/[...nextauth]/route.ts
  ├── admin/
  │   ├── cities/route.ts
  │   ├── parks/route.ts
  │   ├── batches/route.ts
  │   ├── groups/route.ts
  │   ├── people/route.ts
  │   ├── attendance-events/route.ts
  │   ├── fees/route.ts
  │   ├── users/route.ts
  │   ├── admissions/route.ts
  │   ├── announcements/route.ts
  │   └── reports/route.ts
  ├── park/
  │   ├── attendance/route.ts
  │   ├── attendance/sync/route.ts
  │   └── dashboard/route.ts
  └── guardian/
      └── data/route.ts
```

### 2.4 State Management

**Zustand Stores** (in `src/stores/`):

| Store | Purpose |
|-------|---------|
| `useAppStore` | Global app state: currentPage, selectedParkId, selectedBatchId, etc. |
| `useAuthStore` | Auth state wrapper around NextAuth session |
| `useOfflineStore` | Offline attendance queue management |

### 2.5 Navigation System

Client-side navigation is handled entirely by Zustand. No Next.js file-based routing for pages.

```typescript
// src/stores/useAppStore.ts
interface AppState {
  // Navigation
  currentPage: string;
  previousPage: string | null;
  navigateTo: (page: string) => void;
  goBack: () => void;

  // Context selection
  selectedCityId: string | null;
  selectedParkId: string | null;
  selectedBatchId: string | null;
  selectedGroupId: string | null;
  setSelectedCity: (id: string | null) => void;
  setSelectedPark: (id: string | null) => void;
  setSelectedBatch: (id: string | null) => void;
  setSelectedGroup: (id: string | null) => void;

  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}
```

### 2.6 Authorization Pattern

All authorization is enforced in API routes (server-side), never in the client.

```typescript
// src/lib/auth/authorize.ts
export function requireRole(allowedRoles: string[]) {
  return async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userRole = session.user.role;
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null; // Authorized
  };
}

// Scope helpers
export function requireCityScope(session: Session, cityId: string) { ... }
export function requireParkScope(session: Session, parkId: string) { ... }
```

---

## 3. Complete Database Schema

### 3.1 Full Prisma Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "sqlite"
  url      = "file:../db/custom.db"
}

generator client {
  provider = "prisma-client-js"
}

// ============================================================
// AUTH & USERS
// ============================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  phone         String?
  mustResetPwd  Boolean   @default(true)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  staffMeta     StaffMeta?
  guardian      Guardian?
  participant   Participant?
  auditLogs     AuditLog[]

  @@map("users")
}

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

model StaffMeta {
  id              String    @id @default(cuid())
  userId          String    @unique
  role            String    // super_admin, program_admin, city_head, park_admin, park_lead, murabbi
  assignedCityId  String?
  assignedParkId  String?
  assignedGroupId String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignedCity    City?     @relation("CityHeadAssignment", fields: [assignedCityId], references: [id])
  assignedPark    Park?     @relation("ParkStaffAssignment", fields: [assignedParkId], references: [id])
  assignedGroup   Group?    @relation("MurabbiAssignment", fields: [assignedGroupId], references: [id])

  closedEvents       AttendanceEvent[]  @relation("EventCloser")
  attendanceRecords  AttendanceRecord[] @relation("AttendanceMarker")
  recordedPayments   Payment[]          @relation("PaymentRecorder")
  publishedAnnouncements Announcement[] @relation("AnnouncementPublisher")

  @@map("staff_meta")
}

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
// ATTENDANCE
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

model AttendanceRecord {
  id            String           @id @default(cuid())
  eventId       String
  participantId String
  status        String           // present, absent, late, excused
  markedBy      String?
  markedAt      DateTime         @default(now())
  editReason    String?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  event         AttendanceEvent  @relation(fields: [eventId], references: [id])
  participant   Participant      @relation(fields: [participantId], references: [id])
  marker        StaffMeta?       @relation("AttendanceMarker", fields: [markedBy], references: [id])

  @@unique([eventId, participantId])
  @@map("attendance_records")
}

// ============================================================
// FEES
// ============================================================

model FeeEvent {
  id          String      @id @default(cuid())
  batchId     String
  title       String      // e.g., "Admission Fee", "Monthly Fee - Jan"
  feeType     String      // admission, monthly, event
  amount      Float
  dueDate     DateTime?
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  batch       Batch       @relation(fields: [batchId], references: [id])
  payments    Payment[]

  @@map("fee_events")
}

model Payment {
  id              String       @id @default(cuid())
  feeEventId      String
  participantId   String
  amount          Float
  method          String       // cash, bank_transfer, online
  receiptNo       String?      @unique
  recordedBy      String?
  notes           String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  feeEvent        FeeEvent     @relation(fields: [feeEventId], references: [id])
  participant     Participant  @relation(fields: [participantId], references: [id])
  recorder        StaffMeta?   @relation("PaymentRecorder", fields: [recordedBy], references: [id])

  @@map("payments")
}

model ReceiptSequence {
  id        String    @id @default(cuid())
  prefix    String    // e.g., "RCPT"
  year      Int
  counter   Int       @default(0)
  updatedAt DateTime  @updatedAt

  @@unique([prefix, year])
  @@map("receipt_sequences")
}

// ============================================================
// ADMISSIONS
// ============================================================

model AdmissionApplication {
  id                     String                  @id @default(cuid())
  trackingCode           String                  @unique
  applicantName          String
  applicantDOB           DateTime?
  gender                 String?
  guardianName           String
  guardianPhone          String
  guardianRelation       String?
  cityId                 String?
  preferredParkId        String?
  status                 String                  @default("submitted")
  notes                  String?
  convertedParticipantId String?
  createdAt              DateTime                @default(now())
  updatedAt              DateTime                @updatedAt

  city                   City?                   @relation(fields: [cityId], references: [id])
  preferredPark          Park?                   @relation(fields: [preferredParkId], references: [id])
  interviews             AdmissionInterview[]
  convertedParticipant   Participant?             @relation("ConvertedFrom")

  @@map("admission_applications")
}

model AdmissionInterview {
  id              String                @id @default(cuid())
  applicationId   String
  scheduledDate   DateTime?
  scheduledTime   String?
  status          String                @default("scheduled") // scheduled, completed, cancelled
  score1          Int?                   // interview score fields
  score2          Int?
  score3          Int?
  totalScore      Int?
  notes           String?
  conductedBy     String?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  application     AdmissionApplication  @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("admission_interviews")
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================

model Announcement {
  id          String        @id @default(cuid())
  title       String
  body        String
  audience    String        // all, staff, city_heads, park_staff, guardians, students
  cityId      String?
  parkId      String?
  publishedBy String?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  city        City?         @relation(fields: [cityId], references: [id])
  park        Park?         @relation(fields: [parkId], references: [id])
  publisher   StaffMeta?    @relation("AnnouncementPublisher", fields: [publishedBy], references: [id])

  @@map("announcements")
}

// ============================================================
// AUDIT
// ============================================================

model AuditLog {
  id          String    @id @default(cuid())
  userId      String?
  action      String
  entityType  String
  entityId    String?
  oldValues   String?   // JSON string
  newValues   String?   // JSON string
  reason      String?
  createdAt   DateTime  @default(now())

  user        User?     @relation(fields: [userId], references: [id])

  @@map("audit_log")
}

// ============================================================
// REPORT PRESETS
// ============================================================

model ReportPreset {
  id          String    @id @default(cuid())
  userId      String
  name        String
  reportType  String
  filters     String    // JSON string
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("report_presets")
}
```

### 3.2 Schema Growth by Module

| Module | New Tables |
|--------|-----------|
| 1. Auth & Foundation | `users`, `staff_meta`, `audit_log` |
| 2. City Operations | `cities`, `parks`, `batches`, `groups`, `batch_settings`, `guardians`, `guardian_children`, `participants` |
| 3. Park Attendance | `attendance_events`, `attendance_records` |
| 4. Dashboards | (reads existing tables, no new tables) |
| 5. Access Provisioning | (uses existing `users` table) |
| 6. Fees & Payments | `fee_events`, `payments`, `receipt_sequences` |
| 7. Admissions | `admission_applications`, `admission_interviews` |
| 8. Announcements | `announcements` |
| 9. Reports & Exports | `report_presets` |
| 10. Family Portals | (reads existing tables, no new tables) |

---

## 4. Module Dependency Graph

```
Module 1: Auth & Foundation
  └── Module 2: City Operations (depends on 1)
        ├── Module 3: Park Attendance (depends on 2)
        ├── Module 5: Access Provisioning (depends on 2)
        ├── Module 6: Fees & Payments (depends on 2)
        └── Module 7: Admissions (depends on 2)
  └── Module 4: Dashboards (depends on 1, can start after 2)
  └── Module 8: Announcements (depends on 1)
  └── Module 9: Reports & Exports (depends on 2, 3, 6)
  └── Module 10: Family Portals (depends on 2, 3, 6)

Parallelism:
  After Module 1 + 2 are done:
    - Module 3, 5, 7, 8 can be built IN PARALLEL
    - Module 4 can start (basic version)
  After Module 3 is done:
    - Module 9 can start
    - Module 10 can start
```

### Parallel Build Matrix

| Phase | Modules | Can Run In Parallel |
|-------|---------|-------------------|
| Phase 1 | Module 1 (Auth) | No - foundation |
| Phase 2 | Module 2 (City Ops) | No - needs auth |
| Phase 3 | Module 3 (Attendance), Module 5 (Access), Module 7 (Admissions), Module 8 (Announcements) | YES - all 4 parallel |
| Phase 4 | Module 4 (Dashboards), Module 6 (Fees), Module 9 (Reports), Module 10 (Portals) | YES - all 4 parallel |

---

## 5. Shared Components Library

These components are built in Module 1 and reused across all modules:

### 5.1 Layout Components (`src/components/layout/`)

| Component | Purpose |
|-----------|---------|
| `AppShell` | Main layout with sidebar + content area |
| `Sidebar` | Role-aware collapsible navigation sidebar |
| `PageHeader` | Consistent page title + breadcrumb + actions |
| `EmptyState` | Illustrated empty states |
| `LoadingState` | Skeleton/spinner loading states |
| `ErrorState` | Error display with retry |
| `ConfirmDialog` | Reusable confirmation modal |
| `DataCard` | Metric card for dashboards |

### 5.2 Form Components (`src/components/forms/`)

| Component | Purpose |
|-----------|---------|
| `SearchInput` | Debounced search with icon |
| `FilterBar` | Collapsible filter row with chips |
| `FormActions` | Save/Cancel/Delete action bar |
| `FormField` | Label + input + error wrapper |

### 5.3 Data Display (`src/components/data/`)

| Component | Purpose |
|-----------|---------|
| `DataTable` | Sortable, filterable table with pagination |
| `StatusBadge` | Colored status indicator |
| `Avatar` | User avatar with fallback |
| `DetailRow` | Key-value detail display |

### 5.4 Business Components (`src/components/business/`)

| Component | Purpose |
|-----------|---------|
| `RoleBadge` | Shows user role with color |
| `ScopeSelector` | City/Park/Batch/Group cascading selector |
| `EntityLink` | Clickable entity name that navigates to detail |
| `AttendanceStatusIcon` | Present/Absent/Late icons |
| `WhatsAppLink` | Phone number to WhatsApp link |

---

## 6. File/Folder Structure Convention

```
src/
  app/
    page.tsx                          # ONLY user-visible route
    layout.tsx                        # Root layout with providers
    globals.css                       # Global styles
    api/
      auth/[...nextauth]/route.ts     # NextAuth API
      admin/
        cities/route.ts               # City CRUD
        parks/route.ts                # Park CRUD
        batches/route.ts              # Batch CRUD
        groups/route.ts               # Group CRUD
        people/route.ts               # People CRUD
        attendance-events/route.ts    # Attendance event CRUD
        fees/route.ts                 # Fee operations
        users/route.ts                # Access provisioning
        admissions/route.ts           # Admissions pipeline
        announcements/route.ts        # Announcements CRUD
        reports/route.ts              # Report generation
      park/
        attendance/route.ts           # Mark attendance
        attendance/sync/route.ts      # Offline sync
        dashboard/route.ts            # Park dashboard data
      guardian/
        data/route.ts                 # Guardian read-only data
  components/
    ui/                               # shadcn/ui components (pre-installed)
    layout/                           # AppShell, Sidebar, PageHeader, etc.
    forms/                            # SearchInput, FilterBar, etc.
    data/                             # DataTable, StatusBadge, etc.
    business/                         # Domain-specific components
    modules/                          # Module-specific page components
      auth/                           # LoginPage, ResetPasswordPage
      admin/                          # Admin workspace pages
      park/                           # Park workspace pages
      guardian/                       # Guardian portal pages
      student/                        # Student portal pages
  stores/
    useAppStore.ts                    # Global navigation & UI state
    useOfflineStore.ts               # Offline attendance queue
  lib/
    db.ts                             # Prisma client singleton
    auth.ts                           # NextAuth configuration
    utils.ts                          # Utility functions
    auth/
      authorize.ts                    # Role & scope authorization helpers
      session.ts                      # Session helpers
    timezone.ts                       # PKT timezone utilities
    audit.ts                          # Audit logging helper
    receipts.ts                       # Receipt number generation
  types/
    index.ts                          # Shared TypeScript types
    api.ts                            # API response types
prisma/
  schema.prisma                       # Database schema
db/
  custom.db                           # SQLite database file
```

---

## 7. Coding Standards

### 7.1 Naming Conventions

- **Files:** kebab-case (`attendance-roster.tsx`)
- **Components:** PascalCase (`AttendanceRoster`)
- **Stores:** camelCase with `use` prefix (`useAppStore`)
- **API routes:** kebab-case (`/api/admin/attendance-events`)
- **DB tables:** snake_case (`attendance_records`)
- **DB columns:** snake_case (`participant_id`)
- **Types/Interfaces:** PascalCase (`AttendanceRecord`)
- **Constants:** UPPER_SNAKE_CASE (`ATTENDANCE_STATUS`)

### 7.2 Component Pattern

```tsx
// Every page component follows this pattern:
"use client";

import { useAppStore } from "@/stores/useAppStore";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState } from "@/components/layout/loading-state";

interface SomePageProps {
  // props from parent
}

export function SomePage({}: SomePageProps) {
  const { selectedParkId } = useAppStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["some-data", selectedParkId],
    queryFn: () => fetch(`/api/park/dashboard?parkId=${selectedParkId}`).then(r => r.json()),
    enabled: !!selectedParkId,
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Page Title" description="Page description" />
      {/* Page content */}
    </div>
  );
}
```

### 7.3 API Route Pattern

```typescript
// src/app/api/some/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authorize } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ /* validation */ });

export async function GET(request: NextRequest) {
  const authError = await authorize(["city_head", "program_admin"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  // ... query logic
}
```

### 7.4 Styling Rules

- Use Tailwind CSS 4 utility classes
- Use shadcn/ui components (never build from scratch)
- Use `bg-background`, `text-primary` theme variables
- **NO indigo or blue** unless explicitly requested
- Mobile-first responsive design
- Sticky footer where applicable
- `min-h-screen flex flex-col` for root layouts

---

## 8. Module Summary

| # | Module | Priority | Depends On | Parallel Group |
|---|--------|----------|------------|----------------|
| 1 | Auth & Foundation | P0 | None | Solo |
| 2 | City Operations | P0 | Module 1 | Solo |
| 3 | Park Attendance | P0 | Module 2 | Group A |
| 4 | Dashboards | P1 | Module 1, 2 | Group B |
| 5 | Access Provisioning | P1 | Module 2 | Group A |
| 6 | Fees & Payments | P1 | Module 2 | Group B |
| 7 | Admissions | P2 | Module 2 | Group A |
| 8 | Announcements | P2 | Module 1 | Group A |
| 9 | Reports & Exports | P2 | Module 2, 3, 6 | Group B |
| 10 | Family Portals | P2 | Module 2, 3, 6 | Group B |

### Detailed module documents

Each module has its own detailed document in `docs/modules/MODULE_XX_*.md` containing:
- Module overview and business context
- Database tables (specific to this module)
- API endpoints to implement
- UI components and screens
- Complete task breakdown
- Dependencies and integration points
- Acceptance criteria
- Files to create/modify

---

## 9. Phase-Based Build Order

### Phase 1: Foundation (Sequential)
1. **Module 1** - Auth & Foundation

### Phase 2: Core Data (Sequential)
2. **Module 2** - City Operations

### Phase 3: Core Operations (Parallel - 4 agents)
3. **Module 3** - Park Attendance
4. **Module 5** - Access Provisioning
5. **Module 7** - Admissions
6. **Module 8** - Announcements

### Phase 4: Support Systems (Parallel - 4 agents)
7. **Module 4** - Dashboards
8. **Module 6** - Fees & Payments
9. **Module 9** - Reports & Exports
10. **Module 10** - Family Portals

---

## 10. Testing & Verification

After each module:
1. Run `bun run lint` to check code quality
2. Check `/home/z/my-project/dev.log` for runtime errors
3. Use agent-browser to verify the UI renders and works
4. Test with different role accounts
5. Verify scope enforcement (city-scoped, park-scoped)
6. Update `/home/z/my-project/worklog.md` with completion status

---

## 11. Agent Coordination Protocol

When multiple agents work in parallel:
1. Each agent reads `/home/z/my-project/worklog.md` before starting
2. Each agent reads `docs/MASTER_PLAN.md` for shared context
3. Each agent reads their specific module doc
4. Each agent appends to `worklog.md` when done
5. Shared files (schema.prisma, shared components) should be modified carefully - document conflicts in worklog
6. Each agent works in its own domain folder (`src/components/modules/`, `src/app/api/`)