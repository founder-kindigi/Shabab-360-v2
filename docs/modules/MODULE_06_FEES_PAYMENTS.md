# Module 6 — Fees & Payments

> **Priority:** P1 | **Phase:** 4 (Support Systems) | **Parallel Group:** B
> **Depends On:** Module 1 (Auth & Foundation), Module 2 (City Operations)

---

## Module Overview

This module handles the complete fee lifecycle for Shabab360: City Heads create fee events (admission fee, monthly fees, event-specific charges) scoped to a batch, staff record payments against those fee events, the system auto-generates unique sequential receipt numbers, and unpaid dues are surfaced as actionable attention items on the dashboard.

### Business Context

Shabab360 operates youth programs organized in **batches** (time-bound cycles, e.g., "Jan–Jun 2025"). Each batch may have multiple fee events — an admission fee charged once at enrollment, and recurring monthly fees throughout the batch duration. Parents/guardians pay these fees to staff members, who record the payment in the system. Each recorded payment produces a printable receipt with a unique, sequential receipt number. When a fee event has a due date and participants haven't paid by that date, the system flags them as unpaid dues and surfaces guardian contact information with a WhatsApp link for quick reminder messaging.

### Key Workflow

```
City Head creates Fee Event (per batch)
       │
       ▼
System shows fee event to staff ─── participants who owe
       │
       ▼
Staff selects participant + fee event → enters amount, method, notes
       │
       ▼
System generates receipt number (atomic, year-based prefix + counter)
       │
       ▼
Payment saved → Receipt shown (printable) → Ledger updated
       │
       ▼
Unpaid dues query aggregates outstanding amounts across all fee events
       │
       ▼
Dashboard shows unpaid dues count + WhatsApp links for reminders
```

### Who Can Do What

| Action | Roles Allowed |
|--------|--------------|
| Create / update / deactivate fee events | `super_admin`, `program_admin`, `city_head` |
| Record payments | `super_admin`, `program_admin`, `city_head`, `park_admin`, `park_lead` |
| View fee events & payments (own city scope) | All admin workspace roles |
| View unpaid dues & send WhatsApp reminders | `super_admin`, `program_admin`, `city_head` |
| View participant ledger | All admin workspace roles |

---

## Database Tables

Three new tables are introduced by this module. The Prisma schema is copied verbatim from the master plan.

### 3.1 `fee_events` — FeeEvent Model

Represents a chargeable fee event tied to a batch. Examples: "Admission Fee", "Monthly Fee - January 2025".

```prisma
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
```

**Field Notes:**

| Column | Type | Notes |
|--------|------|-------|
| `batchId` | FK → `batches.id` | Required. Fee events are scoped to a batch. |
| `title` | `String` | Human-readable label. Free text, e.g. "Admission Fee", "Monthly Fee - March". |
| `feeType` | `String` | Enum-like: `admission`, `monthly`, `event`. Used for grouping/filtering. |
| `amount` | `Float` | The fee amount per participant. Stored as Float; display with 2 decimal places. |
| `dueDate` | `DateTime?` | Optional. When set, the unpaid dues query uses this to flag overdue items. Stored UTC. |
| `isActive` | `Boolean` | Soft-delete / deactivate toggle. Inactive fee events are hidden from default lists but retain their payment history. |

### 3.2 `payments` — Payment Model

Records an individual payment from a participant against a fee event.

```prisma
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
```

**Field Notes:**

| Column | Type | Notes |
|--------|------|-------|
| `feeEventId` | FK → `fee_events.id` | Which fee event this payment is for. |
| `participantId` | FK → `participants.id` | Who paid. |
| `amount` | `Float` | Amount paid. May be a partial payment (less than the fee event amount). |
| `method` | `String` | Enum-like: `cash`, `bank_transfer`, `online`. |
| `receiptNo` | `String?` | Auto-generated, unique. Format: `RCPT-{YEAR}-{PADDED_COUNTER}`, e.g. `RCPT-2025-0001`. |
| `recordedBy` | FK → `staff_meta.id` | Staff member who recorded the payment. |
| `notes` | `String?` | Free-text notes. E.g. "Partial payment, remaining next month". |

**Unique Constraint:** `receiptNo` is `@unique` globally. The generation logic guarantees uniqueness via atomic counter (see Task 3).

### 3.3 `receipt_sequences` — ReceiptSequence Model

Tracks the auto-incrementing counter for receipt numbers, partitioned by year.

```prisma
model ReceiptSequence {
  id        String    @id @default(cuid())
  prefix    String    // e.g., "RCPT"
  year      Int
  counter   Int       @default(0)
  updatedAt DateTime  @updatedAt

  @@unique([prefix, year])
  @@map("receipt_sequences")
}
```

**Field Notes:**

| Column | Type | Notes |
|--------|------|-------|
| `prefix` | `String` | Static prefix for receipt numbers. Always `"RCPT"`. |
| `year` | `Int` | Calendar year. Receipts reset per year. |
| `counter` | `Int` | Last used counter value. Incremented atomically. |
| `@@unique([prefix, year])` | | Ensures one row per prefix+year combination. |

**Receipt Number Format:** `RCPT-{YYYY}-{NNNN}`

Examples: `RCPT-2025-0001`, `RCPT-2025-0002`, `RCPT-2026-0001` (counter resets for new year).

### Relationship Diagram

```
Batch (Module 2)
  └── FeeEvent ──── Payment ──── Participant (Module 2)
         │              │
         │              └── StaffMeta (Module 1) [recordedBy]
         │
         └── Payment[]

ReceiptSequence (standalone, referenced only during receipt generation)
```

---

## API Endpoints

All endpoints live under `/api/admin/fees` and enforce server-side authorization via the `authorize()` helper. Date fields are stored in UTC and displayed in PKT (`Asia/Karachi`) on the client.

### `GET /api/admin/fees`

List fee events with payment summary. Returns fee events scoped to the authenticated user's city (or all cities for `super_admin` / `program_admin`).

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `batchId` | `string` | Yes | Filter by batch. |
| `feeType` | `string` | No | Filter by type: `admission`, `monthly`, `event`. |
| `includeInactive` | `boolean` | No | Default `false`. Include deactivated fee events. |

**Response (200):**

```json
{
  "feeEvents": [
    {
      "id": "clxyz...",
      "batchId": "clabc...",
      "title": "Monthly Fee - January 2025",
      "feeType": "monthly",
      "amount": 500,
      "dueDate": "2025-01-31T18:00:00.000Z",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "_count": {
        "payments": 42
      },
      "_sum": {
        "payments": { "amount": 19500 }
      }
    }
  ]
}
```

**Authorization:** `super_admin`, `program_admin`, `city_head`

---

### `POST /api/admin/fees`

Create a new fee event.

**Request Body:**

```json
{
  "batchId": "clabc...",
  "title": "Monthly Fee - February 2025",
  "feeType": "monthly",
  "amount": 500,
  "dueDate": "2025-02-28T18:00:00.000Z"
}
```

**Validation (Zod):**

| Field | Rules |
|-------|-------|
| `batchId` | Required, valid CUID, batch must exist and belong to user's city scope |
| `title` | Required, string, 1–200 characters |
| `feeType` | Required, one of: `admission`, `monthly`, `event` |
| `amount` | Required, number, > 0 |
| `dueDate` | Optional, ISO date string |

**Response (201):** Returns the created `FeeEvent` object.

**Authorization:** `super_admin`, `program_admin`, `city_head`

---

### `PUT /api/admin/fees/[id]`

Update an existing fee event. Only `title`, `amount`, `dueDate`, and `isActive` are updatable. `batchId` and `feeType` are immutable after creation.

**Request Body:**

```json
{
  "title": "Monthly Fee - January 2025 (Revised)",
  "amount": 600,
  "dueDate": "2025-02-15T18:00:00.000Z",
  "isActive": true
}
```

**Response (200):** Returns the updated `FeeEvent` object.

**Authorization:** `super_admin`, `program_admin`, `city_head`

---

### `GET /api/admin/fees/payments`

List payments with filters. Returns paginated results.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `batchId` | `string` | No | Filter by batch. |
| `feeEventId` | `string` | No | Filter by fee event. |
| `participantId` | `string` | No | Filter by participant. |
| `parkId` | `string` | No | Filter by park (joins through batch). |
| `method` | `string` | No | Filter by payment method: `cash`, `bank_transfer`, `online`. |
| `dateFrom` | `string` | No | ISO date. Payments on or after this date. |
| `dateTo` | `string` | No | ISO date. Payments on or before this date. |
| `page` | `number` | No | Default `1`. |
| `limit` | `number` | No | Default `20`, max `100`. |

**Response (200):**

```json
{
  "payments": [
    {
      "id": "clpqr...",
      "feeEventId": "clxyz...",
      "feeEventTitle": "Monthly Fee - January 2025",
      "participantId": "clmno...",
      "participantName": "Ahmed Khan",
      "amount": 500,
      "method": "cash",
      "receiptNo": "RCPT-2025-0001",
      "recordedByName": "Ali Hassan",
      "notes": null,
      "createdAt": "2025-01-05T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

**Authorization:** All admin workspace roles. Scoped to user's city.

---

### `POST /api/admin/fees/payments`

Record a new payment. Auto-generates a receipt number via the `ReceiptSequence` atomic counter.

**Request Body:**

```json
{
  "feeEventId": "clxyz...",
  "participantId": "clmno...",
  "amount": 500,
  "method": "cash",
  "notes": "Paid in full"
}
```

**Validation (Zod):**

| Field | Rules |
|-------|-------|
| `feeEventId` | Required, valid CUID, must exist and be active |
| `participantId` | Required, valid CUID, must exist and belong to a group within the fee event's batch |
| `amount` | Required, number, > 0, ≤ (fee event amount − already paid amount for this participant on this event) |
| `method` | Required, one of: `cash`, `bank_transfer`, `online` |
| `notes` | Optional, string, max 500 characters |

**Side Effects:**

1. Generates receipt number atomically (see Task 3).
2. Creates `Payment` record with the generated `receiptNo` and `recordedBy` set to the authenticated user's `StaffMeta.id`.
3. Audit log entry created for `payment.create` action.

**Response (201):**

```json
{
  "payment": {
    "id": "clpqr...",
    "feeEventId": "clxyz...",
    "participantId": "clmno...",
    "amount": 500,
    "method": "cash",
    "receiptNo": "RCPT-2025-0001",
    "recordedBy": "clstaff...",
    "notes": "Paid in full",
    "createdAt": "2025-01-05T10:30:00.000Z"
  },
  "receiptUrl": "/fees/receipt/RCPT-2025-0001"
}
```

**Authorization:** `super_admin`, `program_admin`, `city_head`, `park_admin`, `park_lead`

---

### `GET /api/admin/fees/unpaid`

Get unpaid dues list. This is the data source for dashboard attention items and the Unpaid Dues page. Uses a left-join approach: all participants in the batch's groups minus those who have paid in full for a given fee event.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `batchId` | `string` | Yes | Filter by batch. |
| `feeEventId` | `string` | No | Filter by specific fee event. |
| `overdueOnly` | `boolean` | No | Default `false`. Only show fee events past their `dueDate`. |

**Response (200):**

```json
{
  "unpaidDues": [
    {
      "participantId": "clmno...",
      "participantName": "Ahmed Khan",
      "groupName": "Group A",
      "parkName": "Central Park",
      "feeEventId": "clxyz...",
      "feeEventTitle": "Monthly Fee - January 2025",
      "feeEventAmount": 500,
      "totalPaid": 0,
      "outstanding": 500,
      "dueDate": "2025-01-31T18:00:00.000Z",
      "isOverdue": true,
      "guardians": [
        {
          "guardianId": "clgua...",
          "name": "Muhammad Khan",
          "phone": "923001234567",
          "whatsappUrl": "https://wa.me/923001234567?text=Assalam%20o%20Alaikum..."
        }
      ]
    }
  ],
  "summary": {
    "totalOutstanding": 75000,
    "totalOverdue": 45000,
    "uniqueParticipants": 120,
    "overdueParticipants": 68
  }
}
```

**Authorization:** `super_admin`, `program_admin`, `city_head`

---

### `GET /api/admin/fees/[participantId]/ledger`

Participant payment ledger. Shows complete payment history for a specific participant across all fee events.

**Query Parameters:** None (participant ID is in the URL path).

**Response (200):**

```json
{
  "participant": {
    "id": "clmno...",
    "name": "Ahmed Khan",
    "groupName": "Group A",
    "parkName": "Central Park",
    "batchName": "Jan-Jun 2025"
  },
  "ledger": [
    {
      "feeEventId": "clxyz1...",
      "feeEventTitle": "Admission Fee",
      "feeType": "admission",
      "feeAmount": 1000,
      "totalPaid": 1000,
      "outstanding": 0,
      "status": "paid",
      "payments": [
        {
          "id": "clpqr1...",
          "amount": 1000,
          "method": "bank_transfer",
          "receiptNo": "RCPT-2025-0001",
          "recordedByName": "Ali Hassan",
          "notes": null,
          "paidAt": "2025-01-02T09:00:00.000Z"
        }
      ]
    },
    {
      "feeEventId": "clxyz2...",
      "feeEventTitle": "Monthly Fee - January 2025",
      "feeType": "monthly",
      "feeAmount": 500,
      "totalPaid": 300,
      "outstanding": 200,
      "status": "partial",
      "payments": [
        {
          "id": "clpqr2...",
          "amount": 300,
          "method": "cash",
          "receiptNo": "RCPT-2025-0002",
          "recordedByName": "Ali Hassan",
          "notes": "Partial, remaining next week",
          "paidAt": "2025-01-10T14:00:00.000Z"
        }
      ]
    }
  ],
  "summary": {
    "totalFees": 1500,
    "totalPaid": 1300,
    "totalOutstanding": 200,
    "lastPaymentDate": "2025-01-10T14:00:00.000Z"
  }
}
```

**Ledger Status Values:**

| Status | Condition |
|--------|-----------|
| `paid` | `totalPaid >= feeAmount` |
| `partial` | `totalPaid > 0 && totalPaid < feeAmount` |
| `unpaid` | `totalPaid === 0` |

**Authorization:** All admin workspace roles. Scoped to user's city.

---

## UI Screens

All screens are client-side components rendered by the SPA router. Navigation is handled via `useAppStore().navigateTo()`.

### 6.1 Fee Events Page

**Navigation ID:** `admin-fees`

**Location in Sidebar:** Admin Workspace → Fees & Payments (expandable section)

**Description:** Lists all fee events for the currently selected batch. The batch is read from `useAppStore().selectedBatchId`. The page provides a summary view showing each fee event's title, type, amount, due date, total collected, and collection progress.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Fees & Payments"                        │
│ Description: "Manage fee events and track payments"   │
│                              [+ New Fee Event] btn   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─ Summary Cards (row of 3) ────────────────────┐   │
│  │  Total Fee Events  │  Total Collected  │  Due  │   │
│  │       12           │     Rs. 45,000    │  3    │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ Fee Events Table ─────────────────────────────┐   │
│  │ Title          │ Type     │ Amount │ Due    │ % │   │
│  │ Admission Fee  │ admission│ 1,000  │ —      │100│   │
│  │ Monthly - Jan  │ monthly  │ 500    │ Jan 31 │ 85│   │
│  │ Monthly - Feb  │ monthly  │ 500    │ Feb 28 │ 42│   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  [Payments History]  [Unpaid Dues]  ← tab-like links  │
└─────────────────────────────────────────────────────┘
```

**Key Behaviors:**

- Clicking a fee event row opens the payments for that specific fee event (navigates to Payments History with `feeEventId` pre-filtered).
- The `%` column shows collection percentage: `(sum of payments / (amount × participant count)) × 100`.
- Fee events past their `dueDate` with < 100% collection are highlighted with a warning indicator.
- Inactive fee events are shown in a collapsed "Archived" section (toggle).

**Components Used:** `PageHeader`, `DataCard`, `DataTable`, `StatusBadge`, `Button`

---

### 6.2 Create / Edit Fee Event Dialog

**Component:** `CreateFeeEventDialog`

**Trigger:** "+ New Fee Event" button on Fee Events Page, or edit icon on a fee event row.

**Layout:**

```
┌─ Dialog: "New Fee Event" ─────────────────────────┐
│                                                       │
│  Batch:           [Central Park - Jan-Jun 2025 ▼]    │
│  (pre-selected, read-only if editing)                 │
│                                                       │
│  Title:           [Monthly Fee - March 2025      ]   │
│  Fee Type:        [● Monthly  ○ Admission  ○ Event]   │
│  Amount (Rs.):    [500                                ]   │
│  Due Date:        [2025-03-31          📅          ]   │
│                                                       │
│                              [Cancel]  [Save Fee]     │
└───────────────────────────────────────────────────────┘
```

**Validation:**

- Title: required, 1–200 chars
- Fee Type: required selection
- Amount: required, > 0, max 999,999
- Due Date: optional, must be a valid date

---

### 6.3 Record Payment Dialog

**Component:** `RecordPaymentDialog`

**Trigger:** "Record Payment" button (available on Fee Events Page, Payments History, and Unpaid Dues page).

**Layout:**

```
┌─ Dialog: "Record Payment" ────────────────────────┐
│                                                       │
│  Participant:     [Search participant...        ▼]   │
│  (searchable select, filtered to batch participants)  │
│                                                       │
│  Fee Event:       [Monthly Fee - Jan 2025       ▼]   │
│  (populated from active fee events in current batch)  │
│                                                       │
│  ┌─ Outstanding Info ────────────────────────────┐   │
│  │  Fee Amount:       Rs. 500                      │   │
│  │  Already Paid:     Rs. 200                      │   │
│  │  Outstanding:      Rs. 300  ← highlighted       │   │
│  └───────────────────────────────────────────────┘   │
│                                                       │
│  Payment Amount:  [300                                ]   │
│  Method:          [● Cash  ○ Bank Transfer  ○ Online] │
│  Notes:           [Optional notes...               ]  │
│                                                       │
│                              [Cancel]  [Record & Print]│
└───────────────────────────────────────────────────────┘
```

**Key Behaviors:**

- When a participant + fee event is selected, the system fetches the current outstanding balance and displays it.
- The payment amount field has a "Fill Outstanding" button that auto-populates the remaining amount.
- Validation prevents recording more than the outstanding amount.
- On successful submission:
  - Payment is recorded via `POST /api/admin/fees/payments`.
  - The receipt number is returned and a Receipt View is immediately shown (or opened in a new printable window).
  - The dialog closes and the parent list refreshes.

---

### 6.4 Payments History Page

**Navigation ID:** `admin-fees-payments`

**Description:** Paginated table of all recorded payments with comprehensive filters.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Payments History"                        │
│ Description: "View and filter all recorded payments"  │
│                              [+ Record Payment] btn  │
├─────────────────────────────────────────────────────┤
│  ┌─ Filter Bar ───────────────────────────────────┐  │
│  │ [Date Range  📅]  [Participant 🔍]  [Park ▼]   │  │
│  │ [Batch ▼]  [Fee Event ▼]  [Method ▼]  [Clear]  │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Payments Table ───────────────────────────────┐  │
│  │ Date       │ Receipt    │ Participant  │ Amount│  │
│  │ 2025-01-05 │ RCPT-25-01 │ Ahmed Khan   │ 500   │  │
│  │            │            │              │ cash  │  │
│  │ 2025-01-04 │ RCPT-25-02 │ Bilal Ali    │ 500   │  │
│  │            │            │              │ bank  │  │
│  └──────────────────────────────────────────────┘  │
│                                                       │
│  Showing 1-20 of 156          [< 1 2 3 ... 8 >]      │
└─────────────────────────────────────────────────────┘
```

**Key Behaviors:**

- Clicking a receipt number opens the Receipt View.
- Clicking a participant name navigates to the Participant Ledger.
- The Date Range filter uses a date picker with preset options (Today, This Week, This Month, Custom).
- Filters are persisted in URL search params (via Zustand) so they survive page navigation.

**Components Used:** `PageHeader`, `FilterBar`, `DataTable`, `Pagination`, `ReceiptView` (as dialog/sheet)

---

### 6.5 Unpaid Dues Page

**Navigation ID:** `admin-fees-unpaid`

**Description:** Lists all participants with outstanding fee amounts, showing guardian contact info and one-click WhatsApp reminder links.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Unpaid Dues"                             │
│ Description: "Outstanding payments requiring follow-up"│
│                              [+ Record Payment] btn  │
├─────────────────────────────────────────────────────┤
│  ┌─ Summary Alert ────────────────────────────────┐  │
│  │ ⚠ 68 participants with overdue payments        │  │
│  │ Total outstanding: Rs. 75,000                  │  │
│  │ Overdue amount: Rs. 45,000                     │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  [Fee Event ▼]  [☑ Overdue Only]  [Park ▼]           │
│                                                       │
│  ┌─ Unpaid Dues Table ────────────────────────────┐  │
│  │ Participant  │ Fee Event     │ Due    │ Outst. │  │
│  │ Ahmed Khan   │ Monthly - Jan │ Jan 31 │ Rs.300 │  │
│  │   📱 Muhammad Khan (father)  │ [WhatsApp] │     │  │
│  │ ──────────── │ ───────────── │ ────── │ ────── │  │
│  │ Bilal Ali    │ Admission Fee │ —      │ 1,000  │  │
│  │   📱 Fatima Ali (mother)     │ [WhatsApp] │     │  │
│  └──────────────────────────────────────────────┘  │
│                                                       │
│  Showing 1-20 of 120          [< 1 2 3 ... 6 >]      │
└─────────────────────────────────────────────────────┘
```

**Key Behaviors:**

- Each participant row shows their guardians as a sub-row with name, phone, and a WhatsApp link button.
- The WhatsApp link opens `https://wa.me/{phone}?text=` with a pre-filled message: *"Assalam o Alaikum. This is a reminder that {participant name}'s fee of Rs. {outstanding} for {fee event title} is due/past due. Please arrange payment at your earliest convenience. — Shabab360"*
- The "Overdue Only" checkbox filters to fee events where `dueDate < now()`.
- A "Record Payment" quick-action button on each row pre-opens the Record Payment Dialog with the participant and fee event pre-selected.

---

### 6.6 Participant Ledger View

**Navigation ID:** `admin-participant-ledger` (also accessible from the People/Participants detail page via a "View Ledger" action button)

**Description:** Shows the complete payment history for a specific participant, grouped by fee event.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Payment Ledger — Ahmed Khan"            │
│ Breadcrumb: People > Ahmed Khan > Payment Ledger      │
│                              [+ Record Payment] btn  │
├─────────────────────────────────────────────────────┤
│  ┌─ Participant Info Card ────────────────────────┐  │
│  │ Ahmed Khan  │  Group A  │  Central Park         │  │
│  │ Jan-Jun 2025 batch                              │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Summary Row ──────────────────────────────────┐  │
│  │ Total Fees: Rs. 4,500 │ Paid: Rs. 4,200 │ Due  │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Fee Event: Admission Fee ── ✅ Paid ─────────┐  │
│  │ Amount: Rs. 1,000  │  Paid: Rs. 1,000          │  │
│  │   RCPT-2025-0001  │  Rs. 1,000  │  bank_transfer│  │
│  │   Jan 02, 2025    │  Ali Hassan                │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Fee Event: Monthly Fee - Jan ── 🟡 Partial ──┐  │
│  │ Amount: Rs. 500  │  Paid: Rs. 300  │  Due: 200 │  │
│  │   RCPT-2025-0005  │  Rs. 300  │  cash           │  │
│  │   Jan 10, 2025    │  Ali Hassan  │  Partial...   │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Fee Event: Monthly Fee - Feb ── 🔴 Unpaid ───┐  │
│  │ Amount: Rs. 500  │  Paid: Rs. 0   │  Due: 500 │  │
│  │   No payments recorded                          │  │
│  │   [Record Payment for this fee event]            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Key Behaviors:**

- Each fee event section is expandable/collapsible.
- Receipt numbers within each section are clickable and open the Receipt View.
- Status badges: green `Paid`, amber `Partial`, red `Unpaid`.
- A "Record Payment" button within each unpaid/partial section pre-fills the dialog.
- Accessible from the People module's participant detail view via a "Ledger" action button.

---

### 6.7 Receipt View Component

**Component:** `ReceiptView`

**Description:** A printable receipt displayed as a modal/sheet or full-page print view. Designed for A4 printing.

**Layout (Print View):**

```
┌───────────────────────────────────────────────────┐
│                    (empty space)                    │
│                                                       │
│              SHABAB360                               │
│           Fee Payment Receipt                        │
│                                                       │
│  ────────────────────────────────────────────────   │
│  Receipt No:  RCPT-2025-0001                         │
│  Date:        January 5, 2025                         │
│  ────────────────────────────────────────────────   │
│                                                       │
│  Participant:    Ahmed Khan                           │
│  Group:          Group A                              │
│  Park:           Central Park                         │
│  Batch:          Jan-Jun 2025                         │
│                                                       │
│  ────────────────────────────────────────────────   │
│  Fee Event:     Monthly Fee - January 2025           │
│  Fee Type:      Monthly                               │
│  Amount Paid:   Rs. 500                               │
│  Payment Method: Cash                                  │
│  Recorded By:   Ali Hassan                            │
│  ────────────────────────────────────────────────   │
│                                                       │
│  Notes:         Paid in full                           │
│                                                       │
│  ────────────────────────────────────────────────   │
│                                                       │
│  This is a system-generated receipt.                  │
│  Shabab360 • Central Park, Lahore                     │
│                                                       │
│              (empty space)                            │
└───────────────────────────────────────────────────┘
```

**Key Behaviors:**

- Rendered in a Dialog/Sheet with a "Print" button that triggers `window.print()`.
- Uses `@media print` CSS to hide all UI chrome and show only the receipt.
- Receipt data is fetched by receipt number via a shared utility (or embedded in the payment creation response).
- Framer Motion fade-in animation on open.

---

## Task Breakdown

### Task 1 — Fee Events CRUD API

**Scope:** Implement `GET`, `POST`, and `PUT` handlers for `/api/admin/fees`.

**Details:**

- `GET`: Accept `batchId` (required), `feeType` (optional), `includeInactive` (optional). Return fee events with `_count.payments` and `_sum.payments.amount`. Scope to authenticated user's city via batch → park → city chain.
- `POST`: Validate request body with Zod. Verify batch exists and belongs to user's city scope. Create `FeeEvent` record. Create audit log entry.
- `PUT /api/admin/fees/[id]`: Validate only updatable fields (`title`, `amount`, `dueDate`, `isActive`). Verify fee event exists and is in user's city scope. Update record. Create audit log entry with old/new values.

**Files:** `src/app/api/admin/fees/route.ts`, `src/app/api/admin/fees/[id]/route.ts`

---

### Task 2 — Payment Recording API with Receipt Number Generation

**Scope:** Implement `POST /api/admin/fees/payments` that records a payment and atomically generates a receipt number.

**Details:**

- Validate request body (feeEventId, participantId, amount, method, notes).
- Verify participant belongs to a group within the fee event's batch.
- Calculate outstanding balance: `feeEvent.amount - sum(existing payments for this participant + feeEvent)`. Reject if payment amount exceeds outstanding.
- Within a Prisma `$transaction`:
  1. Increment `ReceiptSequence` counter atomically using `prisma.receiptSequence.upsert()` with `{ prefix: "RCPT", year: currentYear }`.
  2. Format receipt number: `RCPT-{YEAR}-{String(counter).padStart(4, '0')}`.
  3. Create `Payment` record with the generated receipt number.
- Set `recordedBy` to the authenticated user's `StaffMeta.id`.
- Create audit log entry.
- Return the created payment + receipt number.

**Files:** `src/app/api/admin/fees/payments/route.ts`

---

### Task 3 — Receipt Number Generation Utility

**Scope:** Create a reusable utility function for generating unique, sequential receipt numbers.

**Details:**

- File: `src/lib/receipts.ts` (already listed in master plan structure).
- Export `generateReceiptNumber(prisma: PrismaClient): Promise<string>`.
- Uses `prisma.$transaction` with `prisma.receiptSequence.upsert()` for atomicity:
  - `where: { prefix_year: { prefix: "RCPT", year: currentYear } }`
  - `create: { prefix: "RCPT", year: currentYear, counter: 1 }`
  - `update: { counter: { increment: 1 } }`
- Returns formatted string: `RCPT-{YEAR}-{PADDED_COUNTER}`.
- Counter resets each calendar year (new row per year due to `@@unique([prefix, year])`).
- Include a `parseReceiptNo(receiptNo: string)` helper that extracts prefix, year, and counter from a receipt number string.

**Files:** `src/lib/receipts.ts`

---

### Task 4 — Unpaid Dues Query API

**Scope:** Implement `GET /api/admin/fees/unpaid` that identifies participants with outstanding fee amounts.

**Details:**

- Accept `batchId` (required), `feeEventId` (optional), `overdueOnly` (optional).
- Query approach:
  1. Get all active fee events for the batch (optionally filtered).
  2. Get all participants in the batch's groups.
  3. For each (participant, feeEvent) pair, calculate: `outstanding = feeEvent.amount - COALESCE(SUM(payments.amount), 0)`.
  4. Filter to only rows where `outstanding > 0`.
  5. If `overdueOnly`, additionally filter where `feeEvent.dueDate < NOW()`.
  6. For each participant with unpaid dues, fetch guardian info (name, phone) via `guardian_children` + `guardians` table.
  7. Generate WhatsApp URL for each guardian.
- Return aggregated summary (total outstanding, total overdue, unique/overdue participant counts).
- **Performance note:** For SQLite with small-to-medium datasets (typical batch size ~100–300 participants), a raw SQL approach with subqueries is acceptable. Use `prisma.$queryRaw` for complex aggregation if the Prisma API is insufficient.

**Files:** `src/app/api/admin/fees/unpaid/route.ts`

---

### Task 5 — Participant Ledger API

**Scope:** Implement `GET /api/admin/fees/[participantId]/ledger`.

**Details:**

- Accept `participantId` from URL path.
- Fetch participant with their group, batch, and park info.
- Fetch all fee events for the participant's batch.
- For each fee event, fetch all payments for this participant.
- Calculate per-fee-event: `totalPaid`, `outstanding`, `status` (paid/partial/unpaid).
- Calculate overall summary: `totalFees`, `totalPaid`, `totalOutstanding`, `lastPaymentDate`.
- Scope: verify participant is in the authenticated user's city scope.

**Files:** `src/app/api/admin/fees/[participantId]/ledger/route.ts`

---

### Task 6 — Fee Events List Page UI

**Scope:** Build the main Fee Events page component.

**Details:**

- Component: `FeeEventsPage` in `src/components/modules/admin/fee-events-page.tsx`.
- Uses `useQuery` to fetch fee events from `GET /api/admin/fees?batchId=...`.
- Reads `selectedBatchId` from `useAppStore`.
- Renders summary cards (total events, total collected, overdue count).
- Renders fee events table with columns: Title, Type (badge), Amount, Due Date, Collection %, Status.
- Each row is clickable to navigate to Payments History filtered by that fee event.
- "New Fee Event" button opens `CreateFeeEventDialog`.
- Uses `PageHeader`, `DataCard`, `DataTable`, `StatusBadge`, `Button` from shared components.
- Framer Motion `AnimatePresence` for list animations.

**Files:** `src/components/modules/admin/fee-events-page.tsx`

---

### Task 7 — Create Fee Event Dialog

**Scope:** Build the dialog for creating and editing fee events.

**Details:**

- Component: `CreateFeeEventDialog` in `src/components/modules/admin/create-fee-event-dialog.tsx`.
- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `editData?: FeeEvent` (for edit mode), `batchId: string`.
- Form fields: Title (Input), Fee Type (RadioGroup), Amount (Input type number), Due Date (Calendar/DatePicker).
- Uses shadcn/ui `Dialog`, `Form`, `Input`, `RadioGroup`, `Button`.
- Zod validation on the client side (mirrors server validation).
- On submit: calls `POST /api/admin/fees` (create) or `PUT /api/admin/fees/[id]` (edit).
- Invalidates the fee events query on success via TanStack Query's `queryClient.invalidateQueries()`.
- Shows toast notification on success/error.

**Files:** `src/components/modules/admin/create-fee-event-dialog.tsx`

---

### Task 8 — Record Payment Dialog (with Auto-Receipt)

**Scope:** Build the dialog for recording payments with outstanding balance display and auto-receipt generation.

**Details:**

- Component: `RecordPaymentDialog` in `src/components/modules/admin/record-payment-dialog.tsx`.
- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `prefilledParticipantId?: string`, `prefilledFeeEventId?: string`.
- Two-step flow:
  1. Select participant (SearchInput/Combobox fetching batch participants) + fee event (Select dropdown).
  2. Once both are selected, fetch outstanding balance and display the info card.
- Form fields: Payment Amount (Input with "Fill Outstanding" button), Method (RadioGroup), Notes (Textarea).
- Validation: amount > 0, amount ≤ outstanding balance.
- On submit:
  1. Call `POST /api/admin/fees/payments`.
  2. On success, open `ReceiptView` with the returned payment data.
  3. Invalidate relevant queries (payments, fee events summary, unpaid dues).
- Uses `useMutation` from TanStack Query.

**Files:** `src/components/modules/admin/record-payment-dialog.tsx`

---

### Task 9 — Payments History Page with Filters

**Scope:** Build the Payments History page with comprehensive filter support and pagination.

**Details:**

- Component: `PaymentsHistoryPage` in `src/components/modules/admin/payments-history-page.tsx`.
- Uses `useQuery` with all filter params serialized into the query key.
- Filter bar components: Date Range (DatePicker with presets), Participant (SearchInput), Park (Select), Batch (Select from store), Fee Event (Select), Method (Select).
- Table columns: Date, Receipt No (clickable), Participant Name (clickable → ledger), Fee Event, Amount, Method (badge), Recorded By, Notes.
- Pagination with `DataTable` component.
- "Record Payment" button opens `RecordPaymentDialog`.
- Clicking receipt number opens `ReceiptView` in a Sheet/Dialog.
- Clicking participant name navigates to `admin-participant-ledger` with the participant ID.

**Files:** `src/components/modules/admin/payments-history-page.tsx`

---

### Task 10 — Unpaid Dues Page with Guardian Contact

**Scope:** Build the Unpaid Dues page showing outstanding amounts and guardian WhatsApp links.

**Details:**

- Component: `UnpaidDuesPage` in `src/components/modules/admin/unpaid-dues-page.tsx`.
- Uses `useQuery` to fetch unpaid dues from `GET /api/admin/fees/unpaid?batchId=...`.
- Summary alert banner at top showing totals and overdue counts.
- Filter bar: Fee Event (Select), Overdue Only (Checkbox), Park (Select).
- Table/grouped list showing:
  - Participant name, fee event title, due date, outstanding amount.
  - Sub-row per guardian: name, phone, WhatsApp link button.
- WhatsApp link uses the `WhatsAppLink` shared business component.
- Pre-filled WhatsApp message template (in Urdu/English mix, configurable).
- "Record Payment" action button per row pre-fills `RecordPaymentDialog`.
- Pagination support.

**Files:** `src/components/modules/admin/unpaid-dues-page.tsx`

---

### Task 11 — Participant Ledger View

**Scope:** Build the participant payment ledger view, accessible from both the Fees section and the People module.

**Details:**

- Component: `ParticipantLedgerPage` in `src/components/modules/admin/participant-ledger-page.tsx`.
- Accepts participant ID (from `useAppStore` state or props).
- Fetches ledger data from `GET /api/admin/fees/[participantId]/ledger`.
- Participant info card at top (name, group, park, batch).
- Summary row: Total Fees, Total Paid, Total Outstanding.
- Fee event sections (expandable via `Accordion`):
  - Header: Fee event title, type badge, status badge (Paid/Partial/Unpaid), amounts.
  - Body: Payment rows with receipt number (clickable), amount, method, date, recorded by, notes.
- "Record Payment" button within unpaid/partial sections.
- Integration with People module: add a "View Ledger" button to the participant detail view in Module 2 that navigates to this page.

**Files:** `src/components/modules/admin/participant-ledger-page.tsx`

---

### Task 12 — Receipt View Component (Printable)

**Scope:** Build a printable receipt component.

**Details:**

- Component: `ReceiptView` in `src/components/modules/admin/receipt-view.tsx`.
- Props: `payment: PaymentReceiptData`, `open: boolean`, `onOpenChange: (open: boolean) => void`.
- Renders a clean, centered receipt layout with Shabab360 branding.
- "Print" button triggers `window.print()`.
- `@media print` CSS:
  - Hides the print button, dialog chrome, sidebar, navigation.
  - Shows only the receipt content, centered on the page.
  - White background, black text.
  - Page size A4.
- Framer Motion fade-in/slide-up animation when opened.
- Receipt data type:

```typescript
interface PaymentReceiptData {
  receiptNo: string;
  date: string;          // PKT-formatted date string
  participantName: string;
  groupName: string;
  parkName: string;
  batchName: string;
  feeEventTitle: string;
  feeType: string;
  amount: number;
  method: string;
  recordedByName: string;
  notes: string | null;
}
```

**Files:** `src/components/modules/admin/receipt-view.tsx`

---

### Task 13 — Fee Amount Validation and Outstanding Balance Calculation

**Scope:** Implement server-side and client-side validation logic for payment amounts.

**Details:**

**Server-side** (in the payment recording API):
- Before accepting a payment, query `SUM(payments.amount)` for the (participantId, feeEventId) pair.
- Calculate `outstanding = feeEvent.amount - existingTotalPaid`.
- If `paymentAmount > outstanding`, return `400 Bad Request` with a clear error message: `"Payment amount Rs. {X} exceeds outstanding balance of Rs. {Y}"`.
- This check runs inside the same transaction as the payment creation for consistency.

**Client-side** (in RecordPaymentDialog):
- Fetch outstanding balance when participant + fee event are selected.
- Display outstanding balance prominently.
- Set `max` attribute on the amount input field.
- Show real-time validation error if amount exceeds outstanding.
- "Fill Outstanding" button sets the input to the exact outstanding amount.

**Files:**
- Server: `src/app/api/admin/fees/payments/route.ts` (validation logic within Task 2)
- Client: `src/components/modules/admin/record-payment-dialog.tsx` (validation UI within Task 8)

---

### Task 14 — WhatsApp Reminder Link from Unpaid Dues

**Scope:** Generate pre-filled WhatsApp message links for guardian payment reminders.

**Details:**

- Uses the shared `WhatsAppLink` business component (defined in Module 1, `src/components/business/whatsapp-link.tsx`).
- Phone number format: must be in international format without `+` or `00` prefix (e.g., `923001234567` for Pakistani numbers). If guardian phone starts with `0`, strip the leading `0` and prepend `92`.
- URL format: `https://wa.me/{formattedPhone}?text={encodedMessage}`.
- Default reminder message template:

```
Assalam o Alaikum.
This is a reminder that {participantName}'s fee of Rs. {outstandingAmount} for "{feeEventTitle}" is {dueStatus}.
Please arrange payment at your earliest convenience.
— Shabab360
```

Where `dueStatus` is either `"due"` or `"past due"` based on the fee event's due date.
- The message should be URL-encoded.
- WhatsApp link opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).

**Files:**
- `src/lib/whatsapp.ts` (new utility for phone formatting + URL generation)
- `src/components/business/whatsapp-link.tsx` (enhance if needed, or use as-is)

---

### Task 15 — Fee Summary on Dashboard (Module 4 Integration Point)

**Scope:** Add fee-related summary data to the admin dashboard (Module 4).

**Details:**

This task defines the **integration contract** between Module 6 and Module 4 (Dashboards). Module 4 will consume the data; Module 6 provides the API endpoint.

**API endpoint for dashboard:** Reuse `GET /api/admin/fees/unpaid?batchId=...` — the `summary` object in the response provides all dashboard needs:

```json
{
  "summary": {
    "totalOutstanding": 75000,
    "totalOverdue": 45000,
    "uniqueParticipants": 120,
    "overdueParticipants": 68
  }
}
```

**Dashboard cards to add (implemented in Module 4, specified here):**

| Card | Data Source | Icon |
|------|------------|------|
| Unpaid Dues | `summary.overdueParticipants` | `AlertTriangle` |
| Total Outstanding | `summary.totalOutstanding` (formatted as Rs.) | `Wallet` |
| Overdue Amount | `summary.totalOverdue` (formatted as Rs.) | `Clock` |

**Dashboard attention item:** If `overdueParticipants > 0`, add an attention item card linking to the Unpaid Dues page (`navigateTo('admin-fees-unpaid')`).

**Files (Module 4 responsibility, documented here for traceability):**
- `src/components/modules/admin/dashboard/fee-summary-cards.tsx` (created in Module 4)
- `src/app/api/admin/fees/unpaid/route.ts` (created in Task 4 of this module)

---

## Dependencies

### Hard Dependencies (Must Be Complete Before Starting)

| Dependency | What Module 6 Needs |
|------------|-------------------|
| **Module 1 — Auth & Foundation** | Authentication (`getServerSession`), authorization (`authorize()`), `StaffMeta` model, audit logging (`logAudit()`), `WhatsAppLink` component |
| **Module 2 — City Operations** | `Batch`, `Park`, `Group`, `Participant`, `Guardian`, `GuardianChild` models. Batch → Park → City scope chain. Participant detail view (for ledger link). |

### Integration Points (Can Be Developed In Parallel)

| Integration | Direction | Details |
|-------------|-----------|---------|
| **Module 4 — Dashboards** | Module 6 → Module 4 | Module 6 provides the unpaid dues summary API; Module 4 consumes it for dashboard cards. Module 4 adds the dashboard UI. |
| **Module 9 — Reports & Exports** | Module 6 → Module 9 | Payment data and ledger data may be included in reports. Module 9 reads from the same tables. |
| **Module 10 — Family Portals** | Module 6 → Module 10 | Guardian portal shows payment history for linked children. Reads from `payments` and `fee_events`. |

### State Store Additions

No new Zustand stores are needed. Module 6 uses the existing `useAppStore` for:

- `selectedBatchId` — to filter fee events and payments by the current batch context.
- `selectedCityId` — to scope data (enforced server-side, but used for UI hints).
- `navigateTo(pageId)` — to navigate between fee-related pages.

New page IDs to register in the page router:

| Page ID | Component | Description |
|---------|-----------|-------------|
| `admin-fees` | `FeeEventsPage` | Main fee events list |
| `admin-fees-payments` | `PaymentsHistoryPage` | Payments history with filters |
| `admin-fees-unpaid` | `UnpaidDuesPage` | Unpaid dues with guardian contacts |
| `admin-participant-ledger` | `ParticipantLedgerPage` | Individual participant ledger |

---

## Acceptance Criteria

| # | Criterion | Verification Method |
|---|-----------|-------------------|
| 1 | City Head can create fee events for a batch with title, type, amount, and optional due date | Create fee event via UI → appears in list with correct data |
| 2 | City Head can update fee event details (title, amount, due date, active status) | Edit fee event → changes persisted → list updated |
| 3 | Staff can record payments with auto-generated receipt numbers | Record payment → receipt number returned → receipt viewable and printable |
| 4 | Receipt numbers are unique and sequential per year | Create multiple payments → verify sequence: RCPT-2025-0001, RCPT-2025-0002, ... |
| 5 | Receipt numbers reset for a new calendar year | Manually test or verify logic that a new year creates a new `ReceiptSequence` row with counter starting at 1 |
| 6 | Payment amount validation prevents over-payment | Attempt to pay more than outstanding → error message shown, payment rejected |
| 7 | Partial payments are supported and tracked | Pay Rs. 300 of Rs. 500 → outstanding shows Rs. 200 → ledger shows "Partial" status |
| 8 | Unpaid dues accurately show outstanding amounts per participant per fee event | Create fee event → record some payments → unpaid dues page shows correct outstanding for unpaid/partial participants |
| 9 | Unpaid dues page shows guardian contact info | Participant with linked guardians → guardians appear in unpaid dues with name and phone |
| 10 | Guardian WhatsApp link works for payment reminders | Click WhatsApp link → opens WhatsApp with correct phone number and pre-filled message |
| 11 | Participant ledger shows complete payment history across all fee events | View ledger → all fee events listed with individual payment records, statuses, and summary totals |
| 12 | Receipt view is printable and contains all required information | Open receipt → click Print → printed output shows receipt content without UI chrome |
| 13 | Payments history page supports filtering by date range, participant, park, batch, method | Apply various filter combinations → correct filtered results shown |
| 14 | All fee operations are scoped to the authenticated user's city | City Head A cannot see/modify fee events for City Head B's city |
| 15 | Fee summary data is available for dashboard consumption | `GET /api/admin/fees/unpaid` returns correct `summary` object with totals |

---

## Files to Create

### API Routes

| # | File | Purpose |
|---|------|---------|
| 1 | `src/app/api/admin/fees/route.ts` | `GET` (list fee events), `POST` (create fee event) |
| 2 | `src/app/api/admin/fees/[id]/route.ts` | `PUT` (update fee event) |
| 3 | `src/app/api/admin/fees/payments/route.ts` | `GET` (list payments with filters), `POST` (record payment) |
| 4 | `src/app/api/admin/fees/unpaid/route.ts` | `GET` (unpaid dues list with guardian info) |
| 5 | `src/app/api/admin/fees/[participantId]/ledger/route.ts` | `GET` (participant payment ledger) |

### Utilities

| # | File | Purpose |
|---|------|---------|
| 6 | `src/lib/receipts.ts` | Receipt number generation (atomic counter), receipt number parser |
| 7 | `src/lib/whatsapp.ts` | Phone number formatting, WhatsApp URL generation with pre-filled message |

### UI Components — Pages

| # | File | Purpose |
|---|------|---------|
| 8 | `src/components/modules/admin/fee-events-page.tsx` | Fee events list page with summary cards |
| 9 | `src/components/modules/admin/payments-history-page.tsx` | Payments history with filters and pagination |
| 10 | `src/components/modules/admin/unpaid-dues-page.tsx` | Unpaid dues with guardian WhatsApp links |
| 11 | `src/components/modules/admin/participant-ledger-page.tsx` | Participant payment ledger view |

### UI Components — Dialogs

| # | File | Purpose |
|---|------|---------|
| 12 | `src/components/modules/admin/create-fee-event-dialog.tsx` | Create/edit fee event form dialog |
| 13 | `src/components/modules/admin/record-payment-dialog.tsx` | Record payment with outstanding balance display |

### UI Components — Shared

| # | File | Purpose |
|---|------|---------|
| 14 | `src/components/modules/admin/receipt-view.tsx` | Printable receipt component |

### Types

| # | File | Purpose |
|---|------|---------|
| 15 | `src/types/fees.ts` | TypeScript types for fee events, payments, receipt data, unpaid dues, ledger |

---

## Files to Modify

| # | File | Change | Module |
|---|------|--------|--------|
| 1 | `prisma/schema.prisma` | Add `FeeEvent`, `Payment`, `ReceiptSequence` models (if not already present from full schema migration) | Schema |
| 2 | `src/stores/useAppStore.ts` | Register new page IDs: `admin-fees`, `admin-fees-payments`, `admin-fees-unpaid`, `admin-participant-ledger`. Add `selectedParticipantIdForLedger` state if needed. | State |
| 3 | `src/components/layout/sidebar.tsx` | Add "Fees & Payments" nav section with sub-items: Fee Events, Payments History, Unpaid Dues. Visible for admin workspace roles. | Navigation |
| 4 | `src/types/index.ts` | Re-export types from `src/types/fees.ts` | Types |
| 5 | `src/app/page.tsx` or page router | Add `ParticipantLedgerPage` to the page renderer switch/if-else block | Routing |

---

## Edge Cases & Considerations

### Concurrency

- **Receipt number generation** uses an atomic database transaction with `upsert` + `increment`. SQLite's inherent serialization of writes provides sufficient safety. No additional locking is needed.

### Partial Payments

- A participant may make multiple partial payments against the same fee event.
- The outstanding balance is always: `feeEvent.amount - SUM(all payments for this participant + event)`.
- The UI should clearly indicate partial payment status.

### Fee Event Deactivation

- Deactivating a fee event (`isActive: false`) hides it from default lists but preserves all associated payment records.
- Already-recorded payments remain valid and visible in history/ledger.
- The unpaid dues query should only consider active fee events (to avoid showing stale unpaid items).

### Cross-Batch Payments

- A payment must always be for a fee event in the same batch as the participant's group. The API enforces this: participant → group → batch must match fee event → batch.

### Amount Precision

- `Float` is used in Prisma schema. All calculations should round to 2 decimal places for display.
- Validation should reject amounts with more than 2 decimal places.

### Guardian Without Phone

- Some guardians may not have a phone number. The unpaid dues page should show such entries without the WhatsApp link.
- The WhatsApp URL generation should gracefully handle missing or invalid phone numbers.

### Empty States

- Fee Events Page with no events: show `EmptyState` component with "No fee events yet" message and a CTA to create one.
- Payments History with no results: show "No payments found matching your filters".
- Unpaid Dues with all paid: show a celebratory "All dues cleared!" message.