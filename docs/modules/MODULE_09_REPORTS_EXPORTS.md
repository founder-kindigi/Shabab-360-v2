# Module 9: Reports & Exports

> **Priority:** P2 | **Phase:** 4 (Support Systems — Parallel)
> **Depends On:** Module 1 (Auth), Module 2 (City Operations), Module 3 (Park Attendance), Module 6 (Fees & Payments)
> **New Tables:** `report_presets`

---

## 1. Module Overview

Module 9 provides admin users with the ability to generate data-driven reports and export them as Excel files. The module supports four distinct report types — Attendance, Summary Dashboard, Fee, and Participant Directory — each with configurable filters. Users can save frequently-used filter combinations as **presets** for one-click reuse.

Reports are generated server-side, streamed as `.xlsx` files via `exceljs`, and downloaded by the browser. All report endpoints enforce role-based access and, for `city_head` users, automatic city-scoping to prevent cross-city data leakage.

### Key Capabilities

- **Configurable filters** — city, park, batch, group, date range, status, fee type, payment status
- **Excel export** — formatted `.xlsx` with headers, column widths, and styled header rows
- **Saved presets** — store, list, and delete filter combinations per user
- **Scope enforcement** — City Head users are restricted to their assigned city only
- **Large dataset handling** — streaming Excel generation to avoid request timeouts

### Dependencies

| Module | What This Module Consumes |
|--------|--------------------------|
| Module 1 | Auth session, `authorize()` helpers, `getServerSession` |
| Module 2 | Cities, Parks, Batches, Groups, Participants, Guardians, GuardianChild data |
| Module 3 | AttendanceEvents, AttendanceRecords data |
| Module 6 | FeeEvents, Payments data |

---

## 2. Database Table

The `report_presets` table is already defined in `prisma/schema.prisma`. No schema migration is required for this module.

```prisma
model ReportPreset {
  id          String    @id @default(cuid())
  userId      String
  name        String
  reportType  String    // attendance | summary | fees | directory
  filters     String    // JSON string of filter key-value pairs
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("report_presets")
}
```

### Column Details

| Column | Type | Description |
|--------|------|-------------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK to `users.id` — the user who saved this preset |
| `name` | String | Human-readable label, e.g. "Lahore Q1 Attendance" |
| `reportType` | String | One of: `attendance`, `summary`, `fees`, `directory` |
| `filters` | String (JSON) | Serialized filter object, e.g. `{"cityId":"...","parkId":"...","dateFrom":"2025-01-01"}` |
| `createdAt` | DateTime | Auto-set on creation |
| `updatedAt` | DateTime | Auto-updated on modification |

---

## 3. Report Types

### 3.1 Attendance Report

Generates a row-level attendance report with one row per attendance record.

**Endpoint:** `GET /api/admin/reports/attendance`

**Filters (query params):**

| Filter | Param | Type | Required | Description |
|--------|-------|------|----------|-------------|
| City | `cityId` | string | No | Filter by city |
| Park | `parkId` | string | No | Filter by park |
| Batch | `batchId` | string | No | Filter by batch |
| Group | `groupId` | string | No | Filter by group |
| Date From | `dateFrom` | string (ISO date) | No | Event date >= this date |
| Date To | `dateTo` | string (ISO date) | No | Event date <= this date |
| Status | `status` | string | No | Comma-separated: `present`, `absent`, `late`, `excused` |
| Group By | `groupBy` | string | No | `participant` or `event` (default: `event`) |

**Excel Columns (group by event — default):**

| # | Column Header | Data Source |
|---|--------------|-------------|
| 1 | Participant Name | `participant.name` |
| 2 | Group | `attendanceEvent.group.name` |
| 3 | Event Date | `attendanceEvent.eventDate` (formatted PKT) |
| 4 | Event Title | `attendanceEvent.title` |
| 5 | Status | `attendanceRecord.status` |
| 6 | Marked By | `attendanceRecord.marker.user.name` (or "Unknown") |
| 7 | Marked At | `attendanceRecord.markedAt` (formatted PKT) |

**Excel Columns (group by participant):**

| # | Column Header | Data Source |
|---|--------------|-------------|
| 1 | Participant Name | `participant.name` |
| 2 | Group | `attendanceEvent.group.name` |
| 3 | Total Present | Aggregated count where status = `present` |
| 4 | Total Absent | Aggregated count where status = `absent` |
| 5 | Total Late | Aggregated count where status = `late` |
| 6 | Total Excused | Aggregated count where status = `excused` |
| 7 | Attendance Rate | `(present + late) / total * 100` % |

**Prisma Query Strategy:**
```typescript
// Base query (group by event)
const where = buildAttendanceWhere(filters, session);
const records = await db.attendanceRecord.findMany({
  where,
  include: {
    participant: { include: { group: { include: { batch: { include: { park: { include: { city: true } } } } } } },
    event: { include: { group: true, closer: { include: { user: true } } },
    marker: { include: { user: true } },
  },
  orderBy: [{ event: { eventDate: 'asc' } }, { participant: { name: 'asc' } }],
});
```

---

### 3.2 Summary Dashboard Report

Generates an aggregated summary with overall metrics and a per-group breakdown.

**Endpoint:** `GET /api/admin/reports/summary`

**Filters (query params):**

| Filter | Param | Type | Required | Description |
|--------|-------|------|----------|-------------|
| City | `cityId` | string | No | Filter by city |
| Park | `parkId` | string | No | Filter by park |
| Batch | `batchId` | string | No | Filter by batch |
| Group | `groupId` | string | No | Filter by group |
| Date From | `dateFrom` | string (ISO date) | No | Event date >= this date |
| Date To | `dateTo` | string (ISO date) | No | Event date <= this date |

**Sheet 1 — Overall Summary:**

| Row | Metric | Value |
|-----|--------|-------|
| 1 | Total Participants | Count of unique participants in scope |
| 2 | Total Events | Count of attendance events in scope |
| 3 | Attendance Rate | `(present + late) / total_records * 100` % |
| 4 | Warning Count | Participants whose state = `warning` |
| 5 | Dropout Count | Participants whose state = `dropout` |

**Sheet 2 — Per-Group Breakdown:**

| # | Column Header | Data Source |
|---|--------------|-------------|
| 1 | Group Name | `group.name` |
| 2 | Park | `batch.park.name` |
| 3 | Batch | `batch.name` |
| 4 | Total Participants | Count of participants in group |
| 5 | Total Events | Count of events for this group in date range |
| 6 | Present Count | Sum of `present` records |
| 7 | Absent Count | Sum of `absent` records |
| 8 | Late Count | Sum of `late` records |
| 9 | Excused Count | Sum of `excused` records |
| 10 | Attendance Rate | `(present + late) / total * 100` % |
| 11 | Warning Count | Participants with `state = 'warning'` |
| 12 | Dropout Count | Participants with `state = 'dropout'` |

**Prisma Query Strategy:**
```typescript
// Fetch groups in scope
const groups = await db.group.findMany({
  where: buildGroupWhere(filters, session),
  include: {
    batch: { include: { park: { include: { city: true } } } },
    participants: { where: { state: { in: ['active', 'warning', 'dropout'] } } },
    attendanceEvents: {
      where: buildEventDateWhere(filters),
      include: { records: true },
    },
  },
});
// Then aggregate in-memory per group
```

---

### 3.3 Fee Report

Generates a row-per-payment report with fee and payment details.

**Endpoint:** `GET /api/admin/reports/fees`

**Filters (query params):**

| Filter | Param | Type | Required | Description |
|--------|-------|------|----------|-------------|
| City | `cityId` | string | No | Filter by city |
| Park | `parkId` | string | No | Filter by park |
| Batch | `batchId` | string | No | Filter by batch |
| Fee Type | `feeType` | string | No | `admission`, `monthly`, `event` |
| Date From | `dateFrom` | string (ISO date) | No | Payment created >= this date |
| Date To | `dateTo` | string (ISO date) | No | Payment created <= this date |
| Payment Status | `paymentStatus` | string | No | `paid` or `unpaid` |

**Excel Columns (paid payments):**

| # | Column Header | Data Source |
|---|--------------|-------------|
| 1 | Participant Name | `payment.participant.name` |
| 2 | Guardian | Primary guardian name via `GuardianChild` relation |
| 3 | Fee Event | `payment.feeEvent.title` |
| 4 | Amount | `payment.amount` |
| 5 | Payment Status | "Paid" |
| 6 | Receipt No | `payment.receiptNo` |
| 7 | Payment Date | `payment.createdAt` (formatted PKT) |
| 8 | Method | `payment.method` |

**Excel Columns (unpaid — participants who owe):**
For `paymentStatus=unpaid`, generate one row per participant per fee event where no `Payment` record exists.

| # | Column Header | Data Source |
|---|--------------|-------------|
| 1 | Participant Name | `participant.name` |
| 2 | Guardian | Primary guardian name |
| 3 | Fee Event | `feeEvent.title` |
| 4 | Amount Due | `feeEvent.amount` |
| 5 | Payment Status | "Unpaid" |
| 6 | Receipt No | — |
| 7 | Payment Date | — |
| 8 | Method | — |

**Prisma Query Strategy:**
```typescript
// Paid payments
if (paymentStatus === 'paid' || !paymentStatus) {
  const payments = await db.payment.findMany({
    where: buildFeeWhere(filters, session),
    include: {
      participant: { include: { group: { include: { batch: { include: { park: { include: { city: true } } } } } } },
      feeEvent: { include: { batch: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// Unpaid — cross-join participants with fee events, exclude those with payments
if (paymentStatus === 'unpaid') {
  const feeEvents = await db.feeEvent.findMany({ where: buildFeeEventWhere(filters, session) });
  // For each fee event, find participants without a payment record
  // Use a NOT EXISTS subquery approach
}
```

---

### 3.4 Participant Directory

Generates a flat list of participants with their key info.

**Endpoint:** `GET /api/admin/reports/directory`

**Filters (query params):**

| Filter | Param | Type | Required | Description |
|--------|-------|------|----------|-------------|
| City | `cityId` | string | No | Filter by city |
| Park | `parkId` | string | No | Filter by park |
| Batch | `batchId` | string | No | Filter by batch |
| Group | `groupId` | string | No | Filter by group |
| State | `state` | string | No | `active`, `warning`, `dropout`, `graduated`, `inactive` |

**Excel Columns:**

| # | Column Header | Data Source |
|---|--------------|-------------|
| 1 | Name | `participant.name` |
| 2 | Phone | `participant.phone` |
| 3 | Guardian | Primary guardian name via `GuardianChild` |
| 4 | Park | `group.batch.park.name` |
| 5 | Batch | `group.batch.name` |
| 6 | Group | `group.name` |
| 7 | State | `participant.state` |
| 8 | Join Date | `participant.joinedAt` (formatted PKT) |

**Prisma Query Strategy:**
```typescript
const participants = await db.participant.findMany({
  where: buildParticipantDirectoryWhere(filters, session),
  include: {
    group: { include: { batch: { include: { park: { include: { city: true } } } } },
    guardianLinks: { include: { guardian: true }, take: 1, orderBy: { createdAt: 'asc' } },
  },
  orderBy: { name: 'asc' },
});
```

---

## 4. API Endpoints

All endpoints are under `/api/admin/reports/`. Authorization requires one of: `super_admin`, `program_admin`, `city_head`.

### 4.1 Generate Attendance Report

```
GET /api/admin/reports/attendance
```

| Param | Location | Type | Description |
|-------|----------|------|-------------|
| `cityId` | query | string | Optional city filter |
| `parkId` | query | string | Optional park filter |
| `batchId` | query | string | Optional batch filter |
| `groupId` | query | string | Optional group filter |
| `dateFrom` | query | string | ISO date, event date lower bound |
| `dateTo` | query | string | ISO date, event date upper bound |
| `status` | query | string | Comma-separated attendance statuses |
| `groupBy` | query | string | `participant` or `event` (default: `event`) |

**Response:** `200` with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="attendance-report-<timestamp>.xlsx"`

**Errors:**
- `401` — Not authenticated
- `403` — Insufficient role
- `422` — Invalid filter values

---

### 4.2 Generate Summary Report

```
GET /api/admin/reports/summary
```

| Param | Location | Type | Description |
|-------|----------|------|-------------|
| `cityId` | query | string | Optional city filter |
| `parkId` | query | string | Optional park filter |
| `batchId` | query | string | Optional batch filter |
| `groupId` | query | string | Optional group filter |
| `dateFrom` | query | string | ISO date, event date lower bound |
| `dateTo` | query | string | ISO date, event date upper bound |

**Response:** `200` with Excel file. Filename: `summary-report-<timestamp>.xlsx`

---

### 4.3 Generate Fee Report

```
GET /api/admin/reports/fees
```

| Param | Location | Type | Description |
|-------|----------|------|-------------|
| `cityId` | query | string | Optional city filter |
| `parkId` | query | string | Optional park filter |
| `batchId` | query | string | Optional batch filter |
| `feeType` | query | string | `admission`, `monthly`, `event` |
| `dateFrom` | query | string | ISO date, payment date lower bound |
| `dateTo` | query | string | ISO date, payment date upper bound |
| `paymentStatus` | query | string | `paid` or `unpaid` |

**Response:** `200` with Excel file. Filename: `fee-report-<timestamp>.xlsx`

---

### 4.4 Generate Participant Directory

```
GET /api/admin/reports/directory
```

| Param | Location | Type | Description |
|-------|----------|------|-------------|
| `cityId` | query | string | Optional city filter |
| `parkId` | query | string | Optional park filter |
| `batchId` | query | string | Optional batch filter |
| `groupId` | query | string | Optional group filter |
| `state` | query | string | Participant state filter |

**Response:** `200` with Excel file. Filename: `participant-directory-<timestamp>.xlsx`

---

### 4.5 Save Report Preset

```
POST /api/admin/reports/presets
```

**Request Body:**
```json
{
  "name": "Lahore Q1 Attendance",
  "reportType": "attendance",
  "filters": {
    "cityId": "clx...abc",
    "dateFrom": "2025-01-01",
    "dateTo": "2025-03-31",
    "status": "present,absent"
  }
}
```

**Validation (Zod):**
```typescript
const savePresetSchema = z.object({
  name: z.string().min(1).max(100),
  reportType: z.enum(['attendance', 'summary', 'fees', 'directory']),
  filters: z.record(z.string(), z.unknown()).refine(
    (f) => Object.keys(f).length > 0,
    { message: 'At least one filter is required' }
  ),
});
```

**Response:** `201` with the created preset JSON.

---

### 4.6 List Saved Presets

```
GET /api/admin/reports/presets
```

| Param | Location | Type | Description |
|-------|----------|------|-------------|
| `reportType` | query | string | Optional — filter presets by report type |

**Response:** `200` with array of user's presets:
```json
[
  {
    "id": "clx...preset1",
    "name": "Lahore Q1 Attendance",
    "reportType": "attendance",
    "filters": { "cityId": "...", "dateFrom": "2025-01-01", "dateTo": "2025-03-31", "status": "present,absent" },
    "createdAt": "2025-07-15T10:30:00Z",
    "updatedAt": "2025-07-15T10:30:00Z"
  }
]
```

Presets are scoped to the authenticated user — a user only sees their own presets.

---

### 4.7 Delete Report Preset

```
DELETE /api/admin/reports/presets/[id]
```

**Response:** `200` with `{ "success": true }` or `404` if preset not found or doesn't belong to user.

---

## 5. Excel Export Utility

A shared utility at `src/lib/excel.ts` handles all Excel generation to ensure consistent formatting across report types.

### 5.1 Responsibilities

- Create `exceljs.Workbook` and `Worksheet` instances
- Write header row with bold styling, background color, and white text
- Auto-size column widths based on header length and data content
- Apply `PKT` timezone formatting to all date columns using `formatToPKT()` from `src/lib/timezone.ts`
- Buffer the workbook and return it as an `ArrayBuffer` for streaming

### 5.2 API Design

```typescript
// src/lib/excel.ts
import ExcelJS from 'exceljs';
import { formatToPKT } from '@/lib/timezone';

export interface ExcelColumn<T = unknown> {
  header: string;
  key: string;
  width?: number;
  formatter?: (value: T, row: Record<string, unknown>) => string;
}

export interface ExcelExportOptions<T = unknown> {
  filename: string;            // e.g. "attendance-report"
  sheetName?: string;          // defaults to "Sheet 1"
  columns: ExcelColumn<T>[];
  data: Record<string, unknown>[];
  headerBgColor?: string;      // default: "1F4E79" (dark blue-gray)
  headerFontColor?: string;    // default: "FFFFFF" (white)
}

export async function generateExcelBuffer<T>(options: ExcelExportOptions<T>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? 'Sheet 1');

  // Define columns
  sheet.columns = options.columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width ?? Math.max(col.header.length + 4, 15),
  }));

  // Add header row styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: options.headerFontColor ?? 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: options.headerBgColor ?? '1F4E79' },
  };
  headerRow.alignment = { horizontal: 'left', vertical: 'middle' };
  headerRow.height = 24;

  // Add data rows
  for (const row of options.data) {
    const dataRow: Record<string, string | number | null> = {};
    for (const col of options.columns) {
      const raw = row[col.key];
      dataRow[col.key] = col.formatter ? col.formatter(raw as T, row) : (raw as string | number | null);
    }
    sheet.addRow(dataRow);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function getExcelResponseHeaders(filename: string): HeadersInit {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}-${timestamp}.xlsx"`,
  };
}
```

### 5.3 Date Formatting Convention

All dates stored in the database are UTC. When writing to Excel, use `formatToPKT()` from `src/lib/timezone.ts` to convert to `Asia/Karachi` (PKT). Format pattern: `yyyy-MM-dd HH:mm` for timestamps, `yyyy-MM-dd` for dates only.

---

## 6. Report Scope Enforcement

All report endpoints must enforce data scope based on the authenticated user's role and assignments.

### 6.1 Scope Rules

| Role | Scope |
|------|-------|
| `super_admin` | All data, no restriction |
| `program_admin` | All data, no restriction |
| `city_head` | Only data within their `assignedCityId` |

### 6.2 Implementation Pattern

Every report route applies scope filtering before querying data. The `cityId` query parameter is **ignored** for `city_head` users — their assigned city is injected automatically.

```typescript
// src/lib/reports/scope.ts
import { Session } from 'next-auth';

export function getReportScope(session: Session, queryCityId?: string): { cityId?: string } {
  const role = session.user.role;
  const assignedCityId = session.user.assignedCityId;

  if (role === 'city_head') {
    // City Head is forced to their own city — ignore query param
    if (!assignedCityId) return {}; // Edge case: unassigned city head
    return { cityId: assignedCityId };
  }

  // super_admin and program_admin: use query param if provided
  if (queryCityId) return { cityId: queryCityId };
  return {};
}
```

The `assignedCityId` field must be available on the NextAuth session. This is populated in Module 5 (Access Provisioning) via the JWT callback. If not yet available, the report endpoint should fall back to querying `StaffMeta` for the user.

---

## 7. Filter Validation

All filter query parameters are validated with Zod before use. This prevents malformed inputs from causing Prisma errors or producing incorrect data.

```typescript
// src/lib/reports/validators.ts
import { z } from 'zod';

export const attendanceReportFilters = z.object({
  cityId: z.string().cuid().optional(),
  parkId: z.string().cuid().optional(),
  batchId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  status: z.string().optional().transform((val) =>
    val ? val.split(',').filter(s => ['present', 'absent', 'late', 'excused'].includes(s)) : undefined
  ),
  groupBy: z.enum(['participant', 'event']).optional().default('event'),
});

export const summaryReportFilters = z.object({
  cityId: z.string().cuid().optional(),
  parkId: z.string().cuid().optional(),
  batchId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

export const feeReportFilters = z.object({
  cityId: z.string().cuid().optional(),
  parkId: z.string().cuid().optional(),
  batchId: z.string().cuid().optional(),
  feeType: z.enum(['admission', 'monthly', 'event']).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  paymentStatus: z.enum(['paid', 'unpaid']).optional(),
});

export const directoryReportFilters = z.object({
  cityId: z.string().cuid().optional(),
  parkId: z.string().cuid().optional(),
  batchId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  state: z.enum(['active', 'warning', 'dropout', 'graduated', 'inactive']).optional(),
});
```

### Cascading Filter Logic

When a user selects a park, the batch dropdown should only show batches for that park. When a batch is selected, the group dropdown shows groups for that batch. This cascading behavior is handled client-side by the `ScopeSelector` business component (built in Module 1) or via dedicated filter API calls.

Each filter level narrows the available options for the next level:
- `cityId` → filters available parks
- `parkId` → filters available batches
- `batchId` → filters available groups
- `groupId` → final leaf filter

---

## 8. UI Screens

### 8.1 Reports Hub Page

**Navigation key:** `reports` (rendered by `PageRenderer` inside `AppShell`)

This is the main reports page, accessible from the Admin sidebar under "Reports & Exports".

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: "Reports & Exports"                                  │
├──────────────┬──────────────────────────────────────────────────┤
│              │  Report Type Cards (2x2 grid)                    │
│  Saved       │  ┌─────────────┐  ┌─────────────┐              │
│  Presets     │  │ Attendance  │  │  Summary    │              │
│  Sidebar     │  │   Report    │  │  Dashboard  │              │
│              │  └─────────────┘  └─────────────┘              │
│  - Preset 1  │  ┌─────────────┐  ┌─────────────┐              │
│  - Preset 2  │  │   Fee       │  │ Participant │              │
│  - Preset 3  │  │  Report     │  │  Directory  │              │
│              │  └─────────────┘  └─────────────┘              │
│              │                                                  │
│  [+ Save     │  When a report type is selected:                 │
│   Current    │  ┌──────────────────────────────────────┐       │
│   Filters]   │  │  ReportFilterBar                     │       │
│              │  │  [City ▼] [Park ▼] [Batch ▼] ...    │       │
│              │  │  [Apply] [Reset]                     │       │
│              │  ├──────────────────────────────────────┤       │
│              │  │  [Export as Excel]                   │       │
│              │  └──────────────────────────────────────┘       │
└──────────────┴──────────────────────────────────────────────────┘
```

**Behavior:**
- Clicking a report card selects that report type and shows the filter bar
- The filter bar is shared across all 4 report types — irrelevant filters are hidden per report type
- Clicking "Export as Excel" triggers the download with current filters applied
- "Save Current Filters" in the sidebar opens a dialog to name the preset
- Clicking a saved preset loads its filters into the filter bar and optionally auto-exports

### 8.2 Report Filter Bar Component

**Component:** `src/components/modules/admin/reports/report-filter-bar.tsx`

A reusable filter bar that adapts to the selected report type.

**Props:**
```typescript
interface ReportFilterBarProps {
  reportType: 'attendance' | 'summary' | 'fees' | 'directory';
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onApply: () => void;
  onReset: () => void;
  isExporting: boolean;
}
```

**Filter Visibility by Report Type:**

| Filter | Attendance | Summary | Fees | Directory |
|--------|:----------:|:-------:|:----:|:---------:|
| City | ✅ | ✅ | ✅ | ✅ |
| Park | ✅ | ✅ | ✅ | ✅ |
| Batch | ✅ | ✅ | ✅ | ✅ |
| Group | ✅ | ✅ | — | ✅ |
| Date Range | ✅ | ✅ | ✅ | — |
| Attendance Status | ✅ | — | — | — |
| Group By | ✅ | — | — | — |
| Fee Type | — | — | ✅ | — |
| Payment Status | — | — | ✅ | — |
| Participant State | — | — | — | ✅ |

**shadcn/ui Components Used:**
- `Select` for City, Park, Batch, Group, Status, Fee Type, Payment Status, Participant State
- `Popover` + `Calendar` for Date Range (date-fns `format`)
- `ToggleGroup` for Group By (participant / event)
- `Button` for Apply and Reset
- `Label` for filter labels

### 8.3 Saved Presets Panel

**Component:** `src/components/modules/admin/reports/saved-presets-panel.tsx`

A sidebar panel listing the user's saved presets.

**Props:**
```typescript
interface SavedPresetsPanelProps {
  reportType: string | null;
  onSelectPreset: (preset: ReportPreset) => void;
  isSaving: boolean;
}
```

**Behavior:**
- Fetches presets via `GET /api/admin/reports/presets?reportType=<type>` when `reportType` changes
- Shows all presets if no report type is selected
- Each preset row shows: name, report type badge, created date
- Clicking a preset loads its filters into the `ReportFilterBar`
- Delete button (trash icon) with confirmation dialog triggers `DELETE /api/admin/reports/presets/[id]`
- "Save Current Filters" button opens a small form with a name input and calls `POST /api/admin/reports/presets`

### 8.4 Download Progress Indicator

When the user clicks "Export as Excel," the button enters a loading state:
- Button text changes to "Generating..." with a spinner
- The button is disabled to prevent duplicate requests
- On success, the file downloads automatically (browser handles `Content-Disposition`)
- On error, a toast notification shows the error message
- Uses `sonner` toast for error feedback (already in project dependencies)

---

## 9. Task Breakdown

### Task 1: Report Filter Types and Validation

**Files:**
- `src/lib/reports/validators.ts` (create)
- `src/types/reports.ts` (create)

Define TypeScript interfaces for all filter shapes and Zod validation schemas for each report type. Create a unified `ReportFilters` type that is a discriminated union on `reportType`.

```typescript
// src/types/reports.ts
export type ReportType = 'attendance' | 'summary' | 'fees' | 'directory';

export interface BaseFilters {
  cityId?: string;
  parkId?: string;
  batchId?: string;
}

export interface AttendanceFilters extends BaseFilters {
  groupId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  groupBy?: 'participant' | 'event';
}

export interface SummaryFilters extends BaseFilters {
  groupId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface FeeFilters extends BaseFilters {
  feeType?: 'admission' | 'monthly' | 'event';
  dateFrom?: string;
  dateTo?: string;
  paymentStatus?: 'paid' | 'unpaid';
}

export interface DirectoryFilters extends BaseFilters {
  groupId?: string;
  state?: 'active' | 'warning' | 'dropout' | 'graduated' | 'inactive';
}

export type ReportFilters =
  | { reportType: 'attendance'; filters: AttendanceFilters }
  | { reportType: 'summary'; filters: SummaryFilters }
  | { reportType: 'fees'; filters: FeeFilters }
  | { reportType: 'directory'; filters: DirectoryFilters };
```

---

### Task 2: Attendance Report Query and Excel Generation

**Files:**
- `src/app/api/admin/reports/attendance/route.ts` (create)
- `src/lib/reports/queries/attendance-report.ts` (create)

Implement the `GET` handler that:
1. Authorizes the user
2. Parses and validates query params with `attendanceReportFilters`
3. Applies scope enforcement via `getReportScope()`
4. Builds the Prisma `where` clause with all filter conditions
5. Fetches attendance records with required includes
6. If `groupBy === 'participant'`, aggregates in-memory
7. Maps results to flat rows using the column definitions
8. Calls `generateExcelBuffer()` and returns the response

---

### Task 3: Summary Report Query and Excel Generation

**Files:**
- `src/app/api/admin/reports/summary/route.ts` (create)
- `src/lib/reports/queries/summary-report.ts` (create)

Implement the `GET` handler that:
1. Authorizes and validates
2. Fetches groups with nested participants, events, and records
3. Computes overall metrics (total participants, events, attendance rate, warnings, dropouts)
4. Computes per-group breakdown
5. Creates a multi-sheet workbook (Sheet 1: Overall Summary, Sheet 2: Per-Group Breakdown)
6. Returns the Excel file

---

### Task 4: Fee Report Query and Excel Generation

**Files:**
- `src/app/api/admin/reports/fees/route.ts` (create)
- `src/lib/reports/queries/fee-report.ts` (create)

Implement the `GET` handler that:
1. Authorizes and validates
2. For `paid`: queries `Payment` records with includes, maps to Excel rows
3. For `unpaid`: cross-references `FeeEvent` with `Participant` records, excludes those with existing `Payment` entries
4. Joins guardian name via `GuardianChild` for each participant
5. Generates and returns the Excel file

**Unpaid Query Strategy:**
```typescript
// For each fee event in scope, find participants who have NOT paid
const feeEvents = await db.feeEvent.findMany({ where: feeEventWhere });
const results = [];

for (const feeEvent of feeEvents) {
  const paidParticipantIds = await db.payment.findMany({
    where: { feeEventId: feeEvent.id },
    select: { participantId: true },
  }).then(payments => new Set(payments.map(p => p.participantId)));

  const unpaidParticipants = await db.participant.findMany({
    where: {
      groupId: { in: groupIdsInScope },
      id: { notIn: Array.from(paidParticipantIds) },
    },
    include: { /* guardian, group, batch, park, city */ },
  });

  for (const p of unpaidParticipants) {
    results.push({ participant: p, feeEvent, amount: feeEvent.amount });
  }
}
```

---

### Task 5: Participant Directory Query and Excel Generation

**Files:**
- `src/app/api/admin/reports/directory/route.ts` (create)
- `src/lib/reports/queries/directory-report.ts` (create)

Implement the `GET` handler that:
1. Authorizes and validates
2. Fetches participants with group → batch → park → city chain
3. Joins the first guardian via `GuardianChild` (ordered by `createdAt` asc, take 1)
4. Maps to flat rows and generates Excel

---

### Task 6: Excel Export Utility

**Files:**
- `src/lib/excel.ts` (create)

Build the shared `generateExcelBuffer()` and `getExcelResponseHeaders()` functions as described in Section 5. This utility must:
- Accept a generic column definition and data array
- Apply consistent header styling (bold, colored background, white font)
- Auto-calculate column widths: `max(header.length, max(data.length)) + 4`, capped at 40
- Return a `Buffer` ready for streaming

**Dependency:** Requires `exceljs` package. Install before starting:
```bash
bun add exceljs
```

Also add `@types/exceljs` if types are not bundled:
```bash
bun add -D @types/exceljs
```

---

### Task 7: Report Presets CRUD API

**Files:**
- `src/app/api/admin/reports/presets/route.ts` (create)
- `src/app/api/admin/reports/presets/[id]/route.ts` (create)

**`presets/route.ts` — GET and POST:**
- `GET`: Fetch presets where `userId === session.user.id`. Optionally filter by `reportType` query param. Order by `createdAt` desc.
- `POST`: Validate body with `savePresetSchema`. Create `ReportPreset` record. Return `201` with created preset.

**`presets/[id]/route.ts` — DELETE:**
- Verify the preset belongs to the authenticated user (`preset.userId === session.user.id`)
- Delete the record
- Return `200` with `{ "success": true }`

---

### Task 8: Reports Hub Page UI

**Files:**
- `src/components/modules/admin/reports/reports-hub.tsx` (create)

The main page component for the Reports workspace. Manages:
- `selectedReportType` state
- `currentFilters` state
- Renders the 2x2 report type card grid using shadcn `Card`
- Renders `ReportFilterBar` when a report type is selected
- Renders export button that triggers file download
- Renders `SavedPresetsPanel` in a sidebar layout using shadcn `Sheet` or `ResizablePanel`
- Uses `useQuery` for fetching preset list
- Uses `useMutation` for saving presets

**Component Structure:**
```tsx
export function ReportsHub() {
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Query for presets
  const { data: presets } = useQuery({
    queryKey: ['report-presets', selectedReportType],
    queryFn: () => fetchPresets(selectedReportType),
  });

  // Export handler — opens a new window/trigger download via blob URL
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const url = buildReportUrl(selectedReportType, filters);
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = response.headers.get('content-disposition')?.split('filename=')[1] ?? 'report.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Exports" description="Generate and download data reports" />
      {/* Report type cards or filter bar based on selection */}
    </div>
  );
}
```

---

### Task 9: Report Filter Bar Component

**Files:**
- `src/components/modules/admin/reports/report-filter-bar.tsx` (create)

Reusable filter bar component. Uses shadcn `Select` for dropdowns, `Popover` + `Calendar` for date ranges. Cascading filter behavior: when `cityId` changes, reset `parkId`, `batchId`, `groupId` and refetch available options.

**Data Fetching:**
- Cities: fetched once on mount (cached)
- Parks: refetched when `cityId` changes
- Batches: refetched when `parkId` changes
- Groups: refetched when `batchId` changes
- All fetched via existing Module 2 API endpoints (`/api/admin/cities`, `/api/admin/parks?cityId=...`, etc.)

---

### Task 10: Saved Presets Panel

**Files:**
- `src/components/modules/admin/reports/saved-presets-panel.tsx` (create)
- `src/components/modules/admin/reports/save-preset-dialog.tsx` (create)

**Saved Presets Panel:**
- Lists presets as compact cards/rows
- Each shows: name, `Badge` with report type, relative date (e.g. "2 days ago")
- Click to apply — calls `onSelectPreset` which populates the filter bar
- Delete with confirmation via shadcn `AlertDialog`

**Save Preset Dialog:**
- Triggered by "Save Current Filters" button
- Contains a `Input` for preset name and the current report type shown as read-only
- Calls `POST /api/admin/reports/presets` on submit
- Invalidates the presets query on success

---

### Task 11: Download Progress / Loading Indicator

**Files:**
- Integrated into `reports-hub.tsx` (modify during Task 8)

The export button in `ReportsHub` handles loading state:
- While `isExporting` is true, the button shows `Loader2` icon (from lucide-react) spinning + "Generating..." text
- Button is disabled during export
- On completion, a success toast is shown briefly: "Report downloaded successfully"
- On error, an error toast with the error message
- Uses `sonner`'s `toast` for notifications

---

### Task 12: Report Scope Enforcement

**Files:**
- `src/lib/reports/scope.ts` (create)
- Integrated into all 4 report route handlers (Tasks 2–5)

Build the `getReportScope()` utility and integrate it into every report route. Additionally:
- For `city_head` users, validate that `assignedCityId` exists on the session; if not, query `StaffMeta` to resolve it
- Inject the city scope into the Prisma `where` clause for every query
- Log a warning if a `city_head` attempts to access data outside their city (though the query will simply return empty results)

---

## 10. Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | All 4 report types (Attendance, Summary, Fee, Directory) generate correctly formatted `.xlsx` files with proper headers, column widths, and data |
| AC-2 | Filters correctly scope data — city filters to city, park to park, batch to batch, group to group, date range bounds results |
| AC-3 | Attendance report supports both `event` and `participant` group-by modes |
| AC-4 | Summary report produces a multi-sheet workbook with overall metrics and per-group breakdown |
| AC-5 | Fee report correctly separates paid payments from unpaid (missing payment records) |
| AC-6 | `city_head` users only see data from their assigned city — cross-city filters are ignored or rejected |
| AC-7 | `super_admin` and `program_admin` can access data across all cities |
| AC-8 | Excel files have styled header rows (bold, colored background, white text) and readable column widths |
| AC-9 | All dates in Excel are formatted in PKT (Asia/Karachi) timezone |
| AC-10 | Presets can be saved, listed, loaded, and deleted — each user only sees their own presets |
| AC-11 | Loading indicator shows during export and disables duplicate clicks |
| AC-12 | Invalid filter values return `422` with descriptive error messages |
| AC-13 | Reports with no matching data produce an Excel file with headers only (no data rows) rather than an error |
| AC-14 | Large datasets (5000+ rows) complete without request timeout |

---

## 11. Files to Create / Modify

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `src/types/reports.ts` | TypeScript types for report filters, report types, preset interfaces |
| 2 | `src/lib/reports/validators.ts` | Zod validation schemas for all report filter inputs |
| 3 | `src/lib/reports/scope.ts` | `getReportScope()` — role-based city scope enforcement |
| 4 | `src/lib/reports/queries/attendance-report.ts` | Attendance report Prisma query builder and row mapper |
| 5 | `src/lib/reports/queries/summary-report.ts` | Summary report Prisma query builder, aggregation logic, row mapper |
| 6 | `src/lib/reports/queries/fee-report.ts` | Fee report Prisma query builder (paid + unpaid), row mapper |
| 7 | `src/lib/reports/queries/directory-report.ts` | Participant directory Prisma query builder and row mapper |
| 8 | `src/lib/excel.ts` | Shared Excel generation utility (`generateExcelBuffer`, `getExcelResponseHeaders`) |
| 9 | `src/app/api/admin/reports/attendance/route.ts` | `GET` — generate attendance report Excel |
| 10 | `src/app/api/admin/reports/summary/route.ts` | `GET` — generate summary report Excel |
| 11 | `src/app/api/admin/reports/fees/route.ts` | `GET` — generate fee report Excel |
| 12 | `src/app/api/admin/reports/directory/route.ts` | `GET` — generate participant directory Excel |
| 13 | `src/app/api/admin/reports/presets/route.ts` | `GET` (list presets), `POST` (save preset) |
| 14 | `src/app/api/admin/reports/presets/[id]/route.ts` | `DELETE` — delete a saved preset |
| 15 | `src/components/modules/admin/reports/reports-hub.tsx` | Main Reports Hub page component |
| 16 | `src/components/modules/admin/reports/report-filter-bar.tsx` | Reusable filter bar for all report types |
| 17 | `src/components/modules/admin/reports/saved-presets-panel.tsx` | Sidebar panel for saved presets |
| 18 | `src/components/modules/admin/reports/save-preset-dialog.tsx` | Dialog form to save current filters as a preset |
| 19 | `src/components/modules/admin/reports/report-type-cards.tsx` | 2x2 grid of report type selection cards |

### Modified Files

| # | File | Change |
|---|------|--------|
| 1 | `package.json` | Add `exceljs` dependency (and `@types/exceljs` in devDependencies) |
| 2 | `src/stores/useAppStore.ts` | Add `reports` page to navigation if not already present |
| 3 | `src/components/layout/sidebar.tsx` | Add "Reports & Exports" menu item for admin roles |
| 4 | `src/types/index.ts` | Re-export report types from `src/types/reports.ts` |

---

## 12. Integration Points

### With Module 1 (Auth)

- All report API routes use `getServerSession(authOptions)` and `authorize()` from `src/lib/auth/authorize.ts`
- Session must include `user.role` and `user.assignedCityId` (for `city_head` scope enforcement)

### With Module 2 (City Operations)

- Report filter bar fetches cities, parks, batches, and groups from existing Module 2 API endpoints
- Participant, Group, Batch, Park, City, and Guardian data is queried from Module 2 tables
- The `ScopeSelector` business component may be reused or adapted for the filter bar

### With Module 3 (Attendance)

- Attendance report queries `attendance_events` and `attendance_records` tables
- Summary report aggregates attendance data for metrics and per-group breakdown
- Attendance status values (`present`, `absent`, `late`, `excused`) are used as-is from Module 3

### With Module 6 (Fees & Payments)

- Fee report queries `fee_events` and `payments` tables
- Unpaid detection cross-references `fee_events` with `payments` to find missing records
- Fee type values (`admission`, `monthly`, `event`) and payment method values (`cash`, `bank_transfer`, `online`) are used from Module 6

---

## 13. Edge Cases and Considerations

| Scenario | Handling |
|----------|----------|
| No data matches filters | Return Excel with headers only, no data rows |
| Participant has no guardian | Guardian column shows "—" |
| Payment has no receipt number | Receipt No column shows "—" |
| Attendance marked by deleted user | Marked By column shows "Deleted User" |
| Date range is inverted (from > to) | Return `422` validation error |
| City Head with no assigned city | Return empty report with no data |
| Very large result sets (10,000+ rows) | Stream Excel buffer; Prisma queries use `findMany` without pagination (reports are full exports) |
| Multiple presets with same name | Allowed — each has unique `id` |
| Preset references deleted city/park | Filters still apply; if entity is gone, query returns empty results |
| Concurrent exports | Each request is independent; no shared state |