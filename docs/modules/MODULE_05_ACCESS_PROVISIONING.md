# Module 5: Access Provisioning

> **Priority:** P1
> **Phase:** 3 (Core Operations — parallel with Modules 3, 7, 8)
> **Depends On:** Module 1 (Auth & Foundation), Module 2 (City Operations)
> **New Tables:** None (uses existing `users`, `staff_meta`, `guardians`, `participants`)
> **Build Estimate:** 12 tasks

---

## 1. Module Overview

Access Provisioning is the admin-facing workflow for creating and managing login accounts. Unlike typical SaaS products, **there is no self-registration** — all accounts are created by authorized admin users against existing people records already in the system.

### Business Context

Shabab360 has three categories of users who need login access:

| Target Type | Record Source | Role (auto-assigned) | Example |
|-------------|---------------|---------------------|---------|
| **Staff** | `StaffMeta` (created in Module 2) | Manually selected from staff roles | City Head, Park Admin, Murabbi |
| **Guardian** | `Guardian` (created in Module 2) | Always `guardian` | A father who wants to view his child's attendance |
| **Student** | `Participant` (created in Module 2) | Always `student` | A shabab who wants to view their own data |

The core workflow is:

1. Admin navigates to the **Access Management** page (or clicks "Create Access" from a People/Guardian/Student detail page).
2. Admin selects a target type and searches for the existing person/guardian record.
3. Admin enters an email address and either auto-generates or manually sets a password.
4. The system creates a `User` record and links it to the corresponding `StaffMeta`, `Guardian`, or `Participant` record.
5. The newly created account has `mustResetPwd: true`.
6. On first login, the user is forced to set a new password before accessing the application.

### Key Constraints

- **No self-registration.** All `User` records are created through this module's admin endpoints.
- **Email uniqueness** is enforced at the database level (`@unique` on `User.email`).
- **Role locking for guardians and students.** When the target type is "guardian" or "student," the role field is non-editable and locked to `guardian` or `student` respectively.
- **One account per person.** Each `StaffMeta`, `Guardian`, and `Participant` record can have at most one linked `User` (enforced by `@unique` on `userId` / `staffMeta.userId` / `guardian.userId` / `participant.userId`).
- **Bulk import** via Excel is supported for onboarding batches of accounts.

---

## 2. Database Schema

Module 5 does not introduce any new tables. It operates on the existing schema from Modules 1 and 2.

### Relevant Existing Models

#### `User` (Module 1)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `String` (cuid) | Primary key |
| `email` | `String` | **Unique** — login identifier |
| `passwordHash` | `String` | bcrypt hash |
| `name` | `String?` | Display name (mirrored from person record) |
| `phone` | `String?` | Optional |
| `mustResetPwd` | `Boolean` | Default `true` — forces password change on first login |
| `isActive` | `Boolean` | Default `true` — soft-disable flag |
| `createdAt` | `DateTime` | Account creation time |
| `updatedAt` | `DateTime` | Last modification time |
| `staffMeta` | `StaffMeta?` | One-to-one link to staff |
| `guardian` | `Guardian?` | One-to-one link to guardian |
| `participant` | `Participant?` | One-to-one link to participant |

#### `StaffMeta` (Module 2)

| Column | Type | Notes |
|--------|------|-------|
| `userId` | `String?` (unique) | Links to `User` — nullable means no login yet |
| `role` | `String` | Staff role code |
| `assignedCityId` | `String?` | Scope filter |
| `assignedParkId` | `String?` | Scope filter |

#### `Guardian` (Module 2)

| Column | Type | Notes |
|--------|------|-------|
| `userId` | `String?` (unique) | Links to `User` — nullable means no login yet |
| `name` | `String` | Guardian name |
| `phone` | `String` | Contact number |

#### `Participant` (Module 2)

| Column | Type | Notes |
|--------|------|-------|
| `userId` | `String?` (unique) | Links to `User` — nullable means no login yet |
| `name` | `String` | Participant name |

### Linking Diagram

```
User (email, passwordHash, mustResetPwd)
  ├── 1:1 ── StaffMeta (role, assignedCityId, ...)
  ├── 1:1 ── Guardian (name, phone, ...)
  └── 1:1 ── Participant (name, groupId, ...)
```

Exactly one of the three relations is populated per `User`. A person record without a linked `User` has `userId: null`, indicating no login access has been provisioned.

---

## 3. API Endpoints

All endpoints are under `/api/admin/users` and require an admin-level session.

### 3.1 `GET /api/admin/users` — List Access Accounts

List all `User` records with joined target information for display.

**Authorization:** `super_admin`, `program_admin`, `city_head`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | `string` | — | Fuzzy match on name or email |
| `role` | `string` | — | Filter by role code (e.g., `murabbi`, `guardian`, `student`) |
| `targetType` | `string` | — | Filter: `staff`, `guardian`, `student` |
| `cityId` | `string` | — | Filter staff by assigned city (city_head scope) |
| `parkId` | `string` | — | Filter staff by assigned park |
| `hasAccess` | `boolean` | — | `true` = has linked User, `false` = no login yet (requires `targetType`) |
| `isActive` | `boolean` | — | Filter by active status |
| `page` | `number` | `1` | Page number |
| `pageSize` | `number` | `25` | Items per page |

**Response:**

```json
{
  "users": [
    {
      "id": "clx...",
      "email": "ahmed@shabab360.org",
      "name": "Ahmed Khan",
      "phone": "0300-1234567",
      "mustResetPwd": false,
      "isActive": true,
      "lastLogin": "2025-07-01T10:30:00Z",
      "createdAt": "2025-06-15T08:00:00Z",
      "targetType": "staff",
      "role": "city_head",
      "targetId": "clx_staff_...",
      "targetName": "Ahmed Khan",
      "linkedCityName": "Karachi",
      "linkedParkName": null
    },
    {
      "id": "clx...",
      "email": "father@gmail.com",
      "name": "Muhammad Ali",
      "phone": "0312-9876543",
      "mustResetPwd": true,
      "isActive": true,
      "lastLogin": null,
      "createdAt": "2025-07-10T12:00:00Z",
      "targetType": "guardian",
      "role": "guardian",
      "targetId": "clx_guard_...",
      "targetName": "Muhammad Ali",
      "linkedCityName": null,
      "linkedParkName": null
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

**Implementation Notes:**
- Use Prisma `include` to join `staffMeta`, `guardian`, `participant`, and their related city/park.
- Derive `targetType` from which relation is non-null.
- `lastLogin` is derived from the most recent `AuditLog` entry with action `"login"` for that user. If audit logs are not yet available, return `null`.
- City heads should only see staff within their assigned city. Super admins and program admins see all.

---

### 3.2 `POST /api/admin/users` — Create Single Account

Create a new `User` record and link it to an existing person/guardian record.

**Authorization:** `super_admin`, `program_admin`, `city_head`

**Request Body:**

```json
{
  "targetType": "staff",
  "targetId": "clx_staffmeta_...",
  "email": "ahmed@shabab360.org",
  "password": "TempPass123!",
  "name": "Ahmed Khan"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetType` | `"staff" \| "guardian" \| "student"` | Yes | Which record to link |
| `targetId` | `string` | Yes | ID of the `StaffMeta`, `Guardian`, or `Participant` |
| `email` | `string` | Yes | Must be unique across all users |
| `password` | `string` | No | Plain text password. If omitted, auto-generate. |
| `name` | `string` | No | Display name. If omitted, copy from target record. |

**Validation Rules:**

1. `email` must be a valid email format.
2. `email` must not already exist in the `User` table.
3. If `targetType` is `"staff"`, the `targetId` must reference an existing `StaffMeta` record with `userId: null`.
4. If `targetType` is `"guardian"`, the `targetId` must reference an existing `Guardian` record with `userId: null`.
5. If `targetType` is `"student"`, the `targetId` must reference an existing `Participant` record with `userId: null`.
6. If `password` is provided, it must meet minimum complexity requirements (8+ chars, at least one letter and one number).
7. If `password` is omitted, the server auto-generates a secure random password.

**Server Behavior:**

1. Hash the password with bcrypt (10 rounds).
2. Create the `User` record with `mustResetPwd: true` and `isActive: true`.
3. Update the target record's `userId` to the new user's ID.
4. Write an audit log entry with action `"user_created"`.

**Response (201):**

```json
{
  "id": "clx_user_...",
  "email": "ahmed@shabab360.org",
  "name": "Ahmed Khan",
  "mustResetPwd": true,
  "isActive": true,
  "targetType": "staff",
  "targetId": "clx_staffmeta_...",
  "plainPassword": "TempPass123!"
}
```

> **Security Note:** `plainPassword` is returned **only** in the create response so the admin can share it with the user. It is never stored and never returned on subsequent GET requests.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `409` | Email already exists |
| `409` | Target record already has a linked user |
| `404` | Target record not found |
| `422` | Validation failure (invalid email, weak password, etc.) |
| `403` | City head tries to create account outside their city |

---

### 3.3 `PUT /api/admin/users` — Update Account

Update an existing account's properties.

**Authorization:** `super_admin`, `program_admin`, `city_head`

**Request Body:**

```json
{
  "id": "clx_user_...",
  "email": "new-email@shabab360.org",
  "isActive": true,
  "mustResetPwd": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | User ID to update |
| `email` | `string` | No | New email (must be unique) |
| `isActive` | `boolean` | No | Activate/deactivate account |
| `mustResetPwd` | `boolean` | No | Force password reset on next login |

**Constraints:**
- `email` change must not conflict with an existing email.
- Role changes are **not** allowed through this endpoint. Role is determined by the target record type and, for staff, by the `StaffMeta.role` field (managed via Module 2 People management).
- City heads can only update staff within their city.

**Response (200):**

```json
{
  "id": "clx_user_...",
  "email": "new-email@shabab360.org",
  "name": "Ahmed Khan",
  "mustResetPwd": true,
  "isActive": true,
  "targetType": "staff",
  "targetId": "clx_staffmeta_..."
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `404` | User not found |
| `409` | New email already taken |
| `403` | Out-of-scope update attempt |

---

### 3.4 `POST /api/admin/users/import` — Bulk Import from Excel

Create multiple accounts from an uploaded Excel file.

**Authorization:** `super_admin`, `program_admin`, `city_head`

**Request:** `multipart/form-data` with a file field named `file`.

**Excel Format (.xlsx):**

| Column | Header | Required | Description |
|--------|--------|----------|-------------|
| A | `Target Type` | Yes | `staff`, `guardian`, or `student` |
| B | `Target ID` | Yes | CUID of the StaffMeta / Guardian / Participant |
| C | `Email` | Yes | Login email |
| D | `Name` | No | Display name (auto-filled from record if blank) |
| E | `Password` | No | If blank, auto-generated |

**Server Behavior:**

1. Parse the Excel file using `exceljs`.
2. Validate all rows before creating any records (fail-fast if any row has a structural error).
3. For each valid row, create the `User` record and link to the target — same logic as the single create endpoint.
4. Collect results: successes, skips (already linked), and failures (with row-level error messages).

**Response (200):**

```json
{
  "totalRows": 15,
  "created": 12,
  "skipped": 2,
  "failed": 1,
  "results": [
    {
      "row": 2,
      "status": "created",
      "userId": "clx_user_...",
      "email": "ahmed@shabab360.org",
      "plainPassword": "xK9mP2qL"
    },
    {
      "row": 3,
      "status": "skipped",
      "reason": "Target already has a linked user"
    },
    {
      "row": 5,
      "status": "failed",
      "reason": "Email already exists: father@gmail.com"
    }
  ]
}
```

**Validation:**
- File must be `.xlsx`.
- Maximum 500 rows per import.
- All structural validation (required columns, valid target types, email format) runs before any writes.

---

### 3.5 `GET /api/admin/users/status` — Check Access Status

Check whether a person, guardian, or participant has login access provisioned. Used for displaying access badges on People/Students/Guardians list pages.

**Authorization:** `super_admin`, `program_admin`, `city_head`

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `targetType` | `"staff" \| "guardian" \| "student"` | Yes | Record type |
| `targetId` | `string` | Yes | Record ID |

**Response (200):**

```json
{
  "targetType": "guardian",
  "targetId": "clx_guard_...",
  "targetName": "Muhammad Ali",
  "hasAccess": true,
  "userId": "clx_user_...",
  "email": "father@gmail.com",
  "isActive": true,
  "mustResetPwd": false,
  "lastLogin": "2025-07-01T10:30:00Z",
  "createdAt": "2025-06-15T08:00:00Z"
}
```

If no access exists:

```json
{
  "targetType": "guardian",
  "targetId": "clx_guard_...",
  "targetName": "Muhammad Ali",
  "hasAccess": false,
  "userId": null,
  "email": null,
  "isActive": null,
  "mustResetPwd": null,
  "lastLogin": null,
  "createdAt": null
}
```

**Batch Variant:** Accept `targetIds` as a comma-separated string to check multiple records at once. Returns an array of status objects keyed by `targetId`. Used by list pages that need to show access badges for all visible rows.

```
GET /api/admin/users/status?targetType=guardian&targetIds=id1,id2,id3
```

```json
{
  "statuses": {
    "id1": { "hasAccess": true, "email": "a@b.com", "isActive": true, ... },
    "id2": { "hasAccess": false, ... },
    "id3": { "hasAccess": true, "email": "c@d.com", "mustResetPwd": true, ... }
  }
}
```

---

## 4. UI Screens

### 4.1 Access Management Page

**Component:** `AccessManagementPage`
**Navigation:** Admin workspace sidebar → "Access Management"
**Zustand page key:** `admin-access`

This is the primary listing page for all access accounts.

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ PageHeader: "Access Management"                      │
│ Subtitle: "Create and manage login accounts"         │
│                                             [Import] │
│                                             [Create] │
├─────────────────────────────────────────────────────┤
│ FilterBar:                                          │
│   [Search by name/email...]                         │
│   [Target Type ▼]  [Role ▼]  [City ▼]  [Status ▼]  │
├─────────────────────────────────────────────────────┤
│ ┌──────┬──────────────┬───────┬──────────┬────────┐ │
│ │ Name │ Email        │ Role  │ Target   │ Status │ │
│ ├──────┼──────────────┼───────┼──────────┼────────┤ │
│ │ Ahmed│ ahmed@s360.. │ CityH │ Staff    │ Active │ │
│ │ Ali  │ father@gm..  │ Guard │ Guardian │ Reset  │ │
│ │ Omar │ omar@s360..  │ Murab │ Staff    │ New    │ │
│ └──────┴──────────────┴───────┴──────────┴────────┘ │
│ Pagination: < 1 2 3 4 5 >                           │
└─────────────────────────────────────────────────────┘
```

**Table Columns:**

| Column | Source | Notes |
|--------|--------|-------|
| Name | `User.name` | With avatar fallback |
| Email | `User.email` | Truncated if long |
| Role | `User.role` / derived | Shown as `RoleBadge` |
| Target | `targetType` + `targetName` | e.g., "Staff — Ahmed Khan" |
| City/Park | Joined from StaffMeta | Only for staff |
| Status | Computed | See status logic below |
| Last Login | `AuditLog` or `null` | Formatted in PKT |
| Actions | — | Edit, Deactivate/Activate |

**Status Column Logic:**

| Condition | Badge | Color |
|-----------|-------|-------|
| `isActive: false` | Deactivated | Gray |
| `mustResetPwd: true` && `lastLogin: null` | Never Logged In | Amber |
| `mustResetPwd: true` && `lastLogin` exists | Password Reset Required | Orange |
| `mustResetPwd: false` && `lastLogin` exists | Active | Green |

**Data Fetching:** Uses TanStack Query with key `["admin-users", { search, role, targetType, cityId, parkId, isActive, page, pageSize }]`.

---

### 4.2 Create Account Form

**Component:** `CreateAccountDialog`
**Trigger:** "Create Account" button on Access Management page, or "Create Access" button on People/Guardian/Student detail pages.

**Layout (Dialog/Sheet):**

```
┌─────────────────────────────────────────────┐
│ Create Access Account                  [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Target Type *                              │
│  ┌─────────┬──────────┬──────────┐         │
│  │ Staff   │ Guardian │ Student  │         │
│  └─────────┴──────────┴──────────┘         │
│                                             │
│  Search Person/Guardian *                   │
│  ┌─────────────────────────────────────┐   │
│  │ Type name or phone...          🔍   │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ ✔ Ahmed Khan — City Head, Karachi  │   │
│  │   Bilal Shah — Murabbi, Park X     │   │
│  │   Omar Siddiq — Park Lead, Park Y  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Email *                                    │
│  ┌─────────────────────────────────────┐   │
│  │ ahmed@shabab360.org                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Role *                                     │
│  ┌─────────────────────────────────────┐   │
│  │ city_head                        ▼  │   │
│  └─────────────────────────────────────┘   │
│  ℹ️ For guardians/students, role is locked  │
│                                             │
│  Password                                   │
│  ┌────────────────────────┐ ┌──────────┐   │
│  │ xK9mP2qL              │ │ Generate │   │
│  └────────────────────────┘ │  & Copy  │   │
│                              └──────────┘   │
│                                             │
│  ── Effective Role Summary ──               │
│  Role: city_head                            │
│  Scope: Karachi (all parks)                 │
│  Landing: Admin Workspace                   │
│                                             │
│            [Cancel]    [Create Account]     │
└─────────────────────────────────────────────┘
```

**Behavior Details:**

1. **Target Type Selection:** Three toggle buttons (Staff / Guardian / Student). Changing this resets the person search and role field.

2. **Person/Guardian Search:**
   - For "Staff": searches `StaffMeta` records joined with `User` name. Only shows records where `userId` is `null` (no existing login).
   - For "Guardian": searches `Guardian` records where `userId` is `null`.
   - For "Student": searches `Participant` records where `userId` is `null`.
   - Uses a `Command` component (cmdk) for typeahead search.
   - On selection, auto-fills the email field if the person has a known email, and auto-fills the name.

3. **Role Selection:**
   - For `targetType: "staff"`: dropdown of staff roles (`super_admin`, `program_admin`, `city_head`, `park_admin`, `park_lead`, `murabbi`). Note: This may update the `StaffMeta.role` field, or simply display the current role. The role should be managed primarily through Module 2's People management. For this module, the create form shows the current role and allows it to be set if the staff meta doesn't have one yet.
   - For `targetType: "guardian"`: locked to `guardian`, shown as disabled.
   - For `targetType: "student"`: locked to `student`, shown as disabled.

4. **Password Field:**
   - Starts empty with a visible "Generate & Copy" button.
   - Clicking "Generate & Copy" creates a 12-character password (mixed case + digits) and copies it to clipboard.
   - Admin can also manually type a password.
   - A small eye-toggle shows/hides the password.
   - Validation message if password is too weak (8+ chars, at least one letter and one digit).

5. **Effective Role Summary:** A read-only summary section showing:
   - The role this user will have
   - The scope (city, park, group) derived from the staff meta assignments
   - The landing workspace they'll see after login

6. **On Submit:**
   - Calls `POST /api/admin/users`.
   - On success, shows a success toast with the email and a reminder to share the password (which was already copied or manually noted).
   - Closes the dialog and refreshes the list.
   - If opened from a People/Guardian/Student page, also refreshes that page's access status.

---

### 4.3 Edit Account Form

**Component:** `EditAccountDialog`
**Trigger:** "Edit" action button on the access management table row.

**Layout (Dialog/Sheet):**

```
┌─────────────────────────────────────────────┐
│ Edit Access Account                    [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Target Type: Staff (read-only)             │
│  Linked To: Ahmed Khan — City Head         │
│                                             │
│  Email *                                    │
│  ┌─────────────────────────────────────┐   │
│  │ new-email@shabab360.org             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Account Status                             │
│  ┌─────────────────────────────────────┐   │
│  │ Active                        [✓]   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Password Reset                             │
│  ┌─────────────────────────────────────┐   │
│  │ Require password reset on next  │   │
│  │ login                         [✓]   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Created: 15 Jun 2025                       │
│  Last Login: 01 Jul 2025, 3:30 PM PKT      │
│                                             │
│            [Cancel]    [Save Changes]       │
└─────────────────────────────────────────────┘
```

**Behavior Details:**

1. **Target type and linked record are read-only.** To change the linked record, the admin would deactivate the current account and create a new one.
2. **Email** is editable with uniqueness validation (debounced check against existing emails, excluding the current user's own email).
3. **Active toggle** deactivates/reactivates the account. A confirmation dialog appears before deactivation: "Deactivating this account will immediately prevent the user from logging in. Continue?"
4. **Password reset flag** can be toggled on. When toggled on, the next login attempt will redirect to the password reset flow.
5. Role is **not editable** here. Role changes for staff are done through People management (Module 2).

---

### 4.4 Handoff from People/Students/Guardians Pages

On existing list and detail pages from Module 2, an "Access" action is available:

**People List Page:**
- Each staff row shows an access status badge (see §4.6).
- Row actions include "Create Access" (if no login) or "View Access" (if login exists → navigates to the edit dialog).

**People Detail Page:**
- An "Access" card/section shows the current access status.
- "Create Access" button opens the `CreateAccountDialog` with `targetType: "staff"` and `targetId` pre-filled.
- "Edit Access" button opens the `EditAccountDialog`.

**Guardians List Page:**
- Each guardian row shows an access status badge.
- "Create Access" action opens `CreateAccountDialog` with `targetType: "guardian"` pre-filled.

**Students (Participants) List Page:**
- Each participant row shows an access status badge.
- "Create Access" action opens `CreateAccountDialog` with `targetType: "student"` pre-filled.

**Pre-fill Mechanism:**

The `CreateAccountDialog` accepts optional props:

```typescript
interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: {
    targetType: "staff" | "guardian" | "student";
    targetId: string;
    targetName: string;
    email?: string;
    role?: string; // Only for staff
  };
  onSuccess?: () => void;
}
```

When `prefill` is provided, the dialog opens with the target type locked, the person pre-selected, and the email/name fields auto-populated.

---

### 4.5 Access Status Check (Inline)

When a user clicks on an access status badge or a "View Access" link, a small popover or inline panel shows:

```
┌─────────────────────────────────┐
│ Access Status                   │
│ ─────────────────────────────── │
│ Email:    ahmed@shabab360.org   │
│ Status:   Active                │
│ Last Login: 01 Jul 2025         │
│ Created: 15 Jun 2025           │
│                                 │
│ [Edit Access] [Deactivate]     │
└─────────────────────────────────┘
```

This uses the `GET /api/admin/users/status` endpoint.

---

### 4.6 Access Status Badges on List Pages

On the People, Guardians, and Students list pages, each row displays a small badge indicating the login status of that record.

**Badge Variants:**

| State | Badge Text | Variant | Color |
|-------|-----------|---------|-------|
| No account | "No Access" | `outline` | Gray |
| Account exists, never logged in | "Not Activated" | `secondary` | Amber |
| Account exists, must reset password | "Reset Pending" | `secondary` | Orange |
| Account active, logged in | "Active" | `default` | Green |
| Account deactivated | "Deactivated" | `outline` | Red/Gray |

**Implementation:**
- The list page fetches access statuses in bulk using the batch variant of `GET /api/admin/users/status`.
- Statuses are stored in a React state map and looked up per row.
- Badge is clickable — navigates to edit dialog or shows status popover.

---

## 5. Task Breakdown

### Task 1: Access List API with Joins to People/Guardians

**File:** `src/app/api/admin/users/route.ts` (GET handler)

Implement the `GET` handler that:
- Accepts query parameters: `search`, `role`, `targetType`, `cityId`, `parkId`, `isActive`, `hasAccess`, `page`, `pageSize`.
- Builds a Prisma query with conditional `where` clauses.
- Uses `include` to join `staffMeta` (with `assignedCity`, `assignedPark`), `guardian`, and `participant` (with `group`).
- Derives `targetType` from which relation is populated.
- Applies scope filtering for `city_head` users (only see their city).
- Returns paginated results with total count.

**Validation:** Zod schema for query parameters.

---

### Task 2: Create Account API

**File:** `src/app/api/admin/users/route.ts` (POST handler)

Implement the `POST` handler that:
- Validates request body with Zod: `targetType`, `targetId`, `email`, `password` (optional), `name` (optional).
- Checks email uniqueness.
- Verifies target record exists and `userId` is null.
- If no password provided, generates a random 12-char password.
- Hashes password with bcrypt.
- Creates `User` record with `mustResetPwd: true`.
- Updates target record's `userId`.
- Writes audit log.
- Returns the created user with `plainPassword` included.

**Helpers needed:**
- Password generation utility function.

---

### Task 3: Update Account API

**File:** `src/app/api/admin/users/route.ts` (PUT handler)

Implement the `PUT` handler that:
- Validates request body: `id`, `email` (optional), `isActive` (optional), `mustResetPwd` (optional).
- Checks user exists.
- Validates email uniqueness (excluding self).
- Updates fields.
- Writes audit log.
- Returns updated user (without `plainPassword`).

---

### Task 4: Access Status Check API

**File:** `src/app/api/admin/users/status/route.ts`

Implement the `GET` handler that:
- Accepts `targetType` and either `targetId` (single) or `targetIds` (comma-separated batch).
- For single: queries the target record, checks if `userId` is populated, and returns the full status object.
- For batch: queries all target records in a single Prisma query, returns a map of statuses.
- Derives `lastLogin` from audit logs if available.

---

### Task 5: Bulk Import API

**File:** `src/app/api/admin/users/import/route.ts`

Implement the `POST` handler that:
- Accepts `multipart/form-data` with an `xlsx` file.
- Validates file type and size (max 500 rows).
- Parses using `exceljs`: reads headers, iterates rows.
- Runs pre-flight validation on all rows.
- Creates accounts in a sequential loop (or batch with `createMany` where possible, noting that password hashing must be done individually).
- Collects per-row results (created, skipped, failed).
- Returns the results array with generated passwords.

**Error handling:**
- If the file cannot be parsed, return 422 with a clear error message.
- If more than 10% of rows fail validation, return 422 with all errors (don't create any).
- If fewer than 10% fail, create the valid ones and report failures.

---

### Task 6: Access Management Page UI (List with Search/Filter)

**Files:**
- `src/components/modules/admin/access-management-page.tsx`

Implement the main listing page:
- Uses `PageHeader` with "Access Management" title and "Create Account" + "Import" action buttons.
- `FilterBar` with search input, target type dropdown, role dropdown, city/park scope selectors, status filter.
- `DataTable` with columns: Name, Email, Role (via `RoleBadge`), Target, City/Park, Status (via `StatusBadge`), Last Login, Actions.
- TanStack Query for data fetching with proper cache invalidation.
- Pagination controls.
- Row actions: Edit (opens `EditAccountDialog`), Deactivate/Activate (with confirmation).

---

### Task 7: Create Account Dialog

**Files:**
- `src/components/modules/admin/create-account-dialog.tsx`

Implement the creation form as a `Dialog` component:
- Target type selector (three toggle buttons: Staff / Guardian / Student).
- Person/Guardian search using `Command` component (cmdk).
- Email input with validation.
- Role selector (dropdown for staff, locked for guardian/student).
- Password field with "Generate & Copy" button using `navigator.clipboard.writeText()`.
- Effective role summary section.
- Form validation with Zod (client-side).
- On submit, calls `POST /api/admin/users` and handles success/error.
- Accepts `prefill` prop for handoff from other pages (see §4.4).

**Supporting utility:**
- `src/lib/password.ts` — Password generation function (12 chars, mixed case + digits, no ambiguous chars like `0O`, `1lI`).

---

### Task 8: Edit Account Dialog

**Files:**
- `src/components/modules/admin/edit-account-dialog.tsx`

Implement the edit form as a `Dialog` component:
- Read-only display of target type and linked record name.
- Editable email field with debounced uniqueness check.
- Active/inactive toggle switch.
- Password reset flag toggle.
- Read-only metadata: created date, last login.
- Confirmation dialog for deactivation.
- On submit, calls `PUT /api/admin/users` and handles success/error.

---

### Task 9: Handoff Integration (Pre-fill Target from People/Students/Guardians Pages)

**Files to modify:**
- `src/components/modules/admin/people-list-page.tsx` — Add "Create Access" / "View Access" action buttons and access status badge column.
- `src/components/modules/admin/people-detail-page.tsx` — Add "Access" card section with create/view actions.
- `src/components/modules/admin/guardians-list-page.tsx` — Add access status badge and "Create Access" action.
- `src/components/modules/admin/students-list-page.tsx` — Add access status badge and "Create Access" action.

**Implementation:**
- Import and render `CreateAccountDialog` with `prefill` prop populated from the clicked row's data.
- On "View Access" click, open `EditAccountDialog` pre-populated with the user's data.
- Wire up `onSuccess` callbacks to refresh the list query after account creation.

---

### Task 10: Password Auto-Generation with Copy Button

**Files:**
- `src/lib/password.ts` — New utility file.
- `src/components/modules/admin/create-account-dialog.tsx` — Integrate into the password field (part of Task 7 but called out separately for clarity).

**Password generation requirements:**
- Length: 12 characters.
- Character set: `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789` (excludes ambiguous chars: `0`, `O`, `1`, `l`, `I`).
- Guaranteed at least 2 uppercase, 2 lowercase, and 2 digits.
- Returns the generated string.

**Copy button behavior:**
- Uses `navigator.clipboard.writeText()` to copy the password.
- Shows a brief "Copied!" tooltip/toast confirmation.
- Button text toggles between "Generate" and "Copied!" for 2 seconds.

---

### Task 11: Must-Reset-Password Flag Handling

**Files to modify:**
- `src/lib/auth.ts` — Add redirect logic in the NextAuth JWT callback/session callback.
- `src/app/api/auth/[...nextauth]/route.ts` — Ensure `mustResetPwd` is included in the JWT/session.

**Implementation:**
- Include `mustResetPwd` in the NextAuth session `user` object.
- In the client-side `AppRouter`, after session loads, check `session.user.mustResetPwd`.
- If `true`, redirect to a `ResetPasswordPage` component instead of the normal workspace.
- The `ResetPasswordPage` requires the user to enter a new password (with confirmation).
- On successful reset, call an API endpoint (e.g., `POST /api/auth/reset-password`) that:
  - Validates the current session.
  - Hashes the new password.
  - Updates `User.passwordHash` and sets `User.mustResetPwd = false`.
  - Returns success; the client then navigates to the normal workspace.

**New files:**
- `src/components/modules/auth/reset-password-page.tsx` — Password reset form.
- `src/app/api/auth/reset-password/route.ts` — Password reset API.

---

### Task 12: Access Status Badges on People/Students/Guardians List Pages

**Files to modify:**
- `src/components/modules/admin/people-list-page.tsx`
- `src/components/modules/admin/guardians-list-page.tsx`
- `src/components/modules/admin/students-list-page.tsx`

**Implementation:**
- On page load, collect all visible `targetIds` from the current page's data.
- Call the batch variant of `GET /api/admin/users/status` to fetch statuses.
- Render an `AccessStatusBadge` component in each row (a small `Badge` with appropriate color).
- Badge is clickable — shows a `Popover` with detailed status or opens the edit dialog.

**New component:**
- `src/components/business/access-status-badge.tsx` — Reusable badge that accepts `hasAccess`, `isActive`, `mustResetPwd`, `lastLogin` and renders the appropriate variant.

---

## 6. Dependencies

### Required Modules (must be complete before starting)

| Module | What This Module Needs From It |
|--------|-------------------------------|
| **Module 1: Auth & Foundation** | `User` model, `StaffMeta` model, NextAuth configuration, JWT session structure, `authorize.ts` helper, `AuditLog` model, `db.ts` Prisma client, `useAuthStore` |
| **Module 2: City Operations** | `Guardian` model, `Participant` model, `StaffMeta` with role/assignment fields, People list/detail pages, Guardians list page, Students list page, `ScopeSelector` component |

### Integration Points

1. **NextAuth session** must expose `mustResetPwd` so the client can redirect to the reset flow (Task 11).
2. **People/Guardians/Student pages** (Module 2) need action slots for "Create Access" buttons (Task 9, Task 12).
3. **Audit logging** (Module 1) should log `user_created`, `user_updated`, `user_deactivated` actions.
4. **Sidebar navigation** (Module 1) needs an "Access Management" entry in the admin workspace.

---

## 7. Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | Admin (super_admin / program_admin / city_head) can navigate to the Access Management page and see a paginated, filterable list of all user accounts with joined person/guardian/student data. |
| AC-2 | Admin can create a login account for a staff member by selecting their `StaffMeta` record, entering an email, and setting a password. The `User` record is created and `StaffMeta.userId` is updated. |
| AC-3 | Admin can create a login account for a guardian by selecting their `Guardian` record. The role is automatically locked to `guardian`. |
| AC-4 | Admin can create a login account for a student/participant. The role is automatically locked to `student`. |
| AC-5 | Every newly created account has `mustResetPwd: true`. |
| AC-6 | When a user with `mustResetPwd: true` logs in, they are forced to change their password before accessing any workspace. After resetting, `mustResetPwd` is set to `false`. |
| AC-7 | Admin can update an account's email, active status, and password reset flag via the edit form. |
| AC-8 | Email uniqueness is enforced — duplicate emails are rejected with a clear error message. |
| AC-9 | Admin cannot create an account for a person/guardian/student that already has a linked `User` (enforced by unique constraint and API validation). |
| AC-10 | Admin can bulk-import accounts from an Excel file. The response shows per-row status with generated passwords for created accounts. |
| AC-11 | Access status badges are visible on the People, Guardians, and Students list pages, correctly showing whether each record has login access. |
| AC-12 | Clicking "Create Access" from a People/Guardian/Student page opens the create dialog with the target pre-filled. |
| AC-13 | City heads can only see and manage accounts for staff within their assigned city. |
| AC-14 | Deactivating an account immediately prevents the user from logging in. |
| AC-15 | The auto-generated password is at least 12 characters with mixed case and digits, and can be copied to clipboard with one click. |
| AC-16 | Audit log entries are created for account creation, updates, and deactivation. |

---

## 8. Files to Create/Modify

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `src/app/api/admin/users/route.ts` | GET (list), POST (create), PUT (update) handlers for access accounts |
| 2 | `src/app/api/admin/users/import/route.ts` | POST handler for bulk Excel import |
| 3 | `src/app/api/admin/users/status/route.ts` | GET handler for access status check (single + batch) |
| 4 | `src/app/api/auth/reset-password/route.ts` | POST handler for first-login password reset |
| 5 | `src/lib/password.ts` | Password generation utility |
| 6 | `src/components/modules/admin/access-management-page.tsx` | Main access management listing page |
| 7 | `src/components/modules/admin/create-account-dialog.tsx` | Create account form dialog |
| 8 | `src/components/modules/admin/edit-account-dialog.tsx` | Edit account form dialog |
| 9 | `src/components/modules/auth/reset-password-page.tsx` | Forced password reset page for first login |
| 10 | `src/components/business/access-status-badge.tsx` | Reusable access status badge component |

### Modified Files

| # | File | Modification |
|---|------|-------------|
| 1 | `src/lib/auth.ts` | Add `mustResetPwd` to JWT/session; add redirect logic for forced password reset |
| 2 | `src/app/api/auth/[...nextauth]/route.ts` | Ensure `mustResetPwd` is included in session callbacks |
| 3 | `src/components/modules/admin/people-list-page.tsx` | Add access status badge column and "Create Access" / "View Access" row actions |
| 4 | `src/components/modules/admin/people-detail-page.tsx` | Add "Access" card section with create/view/edit actions |
| 5 | `src/components/modules/admin/guardians-list-page.tsx` | Add access status badge column and "Create Access" row action |
| 6 | `src/components/modules/admin/students-list-page.tsx` | Add access status badge column and "Create Access" row action |
| 7 | `src/components/layout/sidebar.tsx` | Add "Access Management" nav item in admin workspace |
| 8 | `src/stores/useAppStore.ts` | Add `admin-access` to page type union (if typed) |
| 9 | `src/types/api.ts` | Add TypeScript types for user list, create, update, import, and status API responses |
| 10 | `src/components/layout/app-shell.tsx` | Wire `PageRenderer` to render `AccessManagementPage` for the `admin-access` page key |

---

## 9. Data Flow Diagrams

### 9.1 Account Creation Flow

```
Admin clicks "Create Account"
  │
  ├─→ Selects target type (staff/guardian/student)
  │
  ├─→ Searches and selects person/guardian/participant
  │     └─→ API: Search endpoint (people/guardians API from Module 2, filtered by userId=null)
  │
  ├─→ Enters email, (optionally) password, role
  │
  ├─→ Reviews effective role summary
  │
  └─→ Submits form
        │
        ├─→ POST /api/admin/users
        │     ├─ Validate email uniqueness
        │     ├─ Validate target record exists and is unlinked
        │     ├─ Hash password (bcrypt)
        │     ├─ Create User record (mustResetPwd: true)
        │     ├─ Update target record (set userId)
        │     └─ Write AuditLog
        │
        └─→ Response with plainPassword
              ├─ Admin copies/shares password with user
              └─ Dialog closes, list refreshes
```

### 9.2 First-Login Password Reset Flow

```
User enters credentials on login page
  │
  ├─→ POST /api/auth/signin (NextAuth)
  │     └─ Returns session with mustResetPwd: true
  │
  ├─→ Client-side AppRouter checks session
  │     └─ mustResetPwd === true → Render ResetPasswordPage
  │
  ├─→ User enters new password + confirmation
  │
  └─→ POST /api/auth/reset-password
        ├─ Validate session
        ├─ Validate new password strength
        ├─ Hash new password
        ├─ Update User (passwordHash, mustResetPwd: false)
        └─ Return success
              └─ Client navigates to normal workspace
```

### 9.3 Bulk Import Flow

```
Admin clicks "Import" on Access Management page
  │
  ├─→ File picker opens (.xlsx only)
  │
  └─→ Admin selects file and confirms
        │
        ├─→ POST /api/admin/users/import (multipart/form-data)
        │     ├─ Parse Excel with exceljs
        │     ├─ Validate all rows (pre-flight)
        │     │     ├─ Check required columns
        │     │     ├─ Validate email formats
        │     │     ├─ Check email uniqueness (within file + database)
        │     │     └─ Check target records exist and are unlinked
        │     ├─ If >10% rows invalid → Return 422 with all errors
        │     ├─ Else → Create valid accounts sequentially
        │     │     ├─ Generate password (if not in file)
        │     │     ├─ Create User + link target
        │     │     └─ Collect result (created/skipped/failed)
        │     └─ Return results array
        │
        └─→ UI shows import results summary
              ├─ "12 accounts created"
              ├─ "2 skipped (already have access)"
              ├─ "1 failed (duplicate email)"
              └─ [Download Results] button (exports results as Excel)
```

---

## 10. Security Considerations

1. **Plain password exposure:** The auto-generated or manually entered password is returned in the API response exactly once (on creation). It is never logged, never stored in plain text, and never returned on GET/PUT requests.

2. **Authorization scoping:** City heads can only create and manage accounts for staff within their assigned city. This is enforced server-side in every API handler.

3. **No self-service role changes:** Users cannot modify their own role, active status, or password reset flag. These are admin-only operations.

4. **Password strength:** Minimum 8 characters with at least one letter and one digit. Auto-generated passwords are 12 characters with guaranteed complexity.

5. **Rate limiting:** The password reset endpoint should have basic rate limiting to prevent brute-force attempts (handled at the NextAuth/middleware level).

6. **Audit trail:** Every account creation, update, and deactivation is logged in `AuditLog` with the acting admin's user ID.

---

## 11. Edge Cases

| Scenario | Handling |
|----------|----------|
| Admin tries to create account with email that exists on a deactivated user | Return 409 — email is unique regardless of active status. Admin should reactivate the existing account instead. |
| Target record (StaffMeta/Guardian/Participant) is deleted or deactivated | API returns 404. Only active, non-deleted target records should be linkable. |
| Bulk import has duplicate emails within the file itself | Pre-flight validation catches this. Row with the later occurrence is marked as failed. |
| User is linked to a StaffMeta, and that StaffMeta's role changes | The user's effective role changes on next login because the role is read from `StaffMeta.role`, not stored on `User`. |
| Admin deactivates their own account | Blocked by API — cannot deactivate your own account. Return 422 with message "Cannot deactivate your own account." |
| Multiple admins try to create accounts for the same target simultaneously | Database unique constraint on `userId` prevents double-linking. Second request gets a 409. |
| Excel file has wrong column headers | Return 422 with message listing expected headers and what was found. |
| Password reset page is accessed directly without `mustResetPwd` | The reset API validates the session's `mustResetPwd` flag. If false, return 403. |