# Module 8 — Announcements

> **Priority:** P2
> **Depends On:** Module 1 (Auth & Foundation) only
> **Parallel Group:** Group A (can be built in parallel with Modules 3, 5, 7)
> **New Tables:** `announcements`

---

## 1. Module Overview

Announcements provide a one-way broadcast channel from administrators to selected audience segments across the organization. A program admin or city head drafts an announcement, selects who should see it (audience) and where it applies (scope), then publishes it. Every other role sees a read-only feed of announcements relevant to their role and geographic scope.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Audience** | Which roles see the announcement: `all`, `staff`, `city_heads`, `park_staff`, `guardians`, `students` |
| **Scope** | Geographic reach: national (no city/park), city-level (`cityId` set), or park-level (`parkId` set) |
| **Soft Delete** | Announcements are never hard-deleted. Deactivation sets `isActive = false`; they disappear from feeds but remain in the admin list for audit |
| **Publisher** | The `StaffMeta` record of the user who created the announcement (`publishedBy`) |

### Role Permissions

| Role | Can Create | Can Edit Own | Can Deactivate | Feed Access |
|------|-----------|-------------|----------------|-------------|
| `super_admin` | Yes (any scope) | Yes | Yes | National + all scopes |
| `program_admin` | Yes (national or specific city/park) | Yes | Yes | National + all scopes |
| `city_head` | Yes (own city or specific park within city) | Yes | Only own announcements | City-scoped + national |
| `park_admin` | No | No | No | Park-scoped + city + national |
| `park_lead` | No | No | No | Park-scoped + city + national |
| `murabbi` | No | No | No | Park-scoped + city + national |
| `guardian` | No | No | No | Guardian-targeted + `all` |
| `student` | No | No | No | Student-targeted + `all` |

### Audience Mapping to Roles

| Audience Value | Roles That See It |
|---------------|-------------------|
| `all` | Every authenticated user (subject to scope) |
| `staff` | `super_admin`, `program_admin`, `city_head`, `park_admin`, `park_lead`, `murabbi` |
| `city_heads` | `super_admin`, `program_admin`, `city_head` |
| `park_staff` | `super_admin`, `program_admin`, `city_head`, `park_admin`, `park_lead`, `murabbi` |
| `guardians` | `super_admin`, `program_admin`, `guardian` |
| `students` | `super_admin`, `program_admin`, `student` |

---

## 2. Database Table

### `announcements`

```prisma
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
```

**Key design notes:**

- `audience` is a single string, not an array. If an admin needs to reach multiple audiences, they create separate announcements or use `all`.
- `cityId` and `parkId` are both nullable. When both are `null`, the announcement is national scope. When only `cityId` is set, it is city-scoped. When `parkId` is set, it is park-scoped (and `cityId` may also be set for referential integrity, derived from the park's city).
- `publishedBy` references `StaffMeta.id` (not `User.id`) so the publisher's role and scope assignment are captured at time of publishing.
- `isActive` controls feed visibility. Admin list shows all records regardless of `isActive`.

---

## 3. API Endpoints

All endpoints follow the authorization pattern from Module 1 (`src/lib/auth/authorize.ts`).

### 3.1 `GET /api/admin/announcements`

**Purpose:** List all announcements for admin views (includes inactive).

**Allowed Roles:** `super_admin`, `program_admin`, `city_head`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cityId` | `string?` | — | Filter by city (city_head auto-scoped to own city) |
| `parkId` | `string?` | — | Filter by park |
| `audience` | `string?` | — | Filter by audience value |
| `activeOnly` | `boolean?` | `false` | When `true`, hide deactivated |
| `page` | `number?` | `1` | Page number |
| `limit` | `number?` | `20` | Items per page |

**Scope enforcement:**

- `city_head` can only see announcements scoped to their assigned city or national.
- `program_admin` / `super_admin` see everything.

**Response:**

```json
{
  "data": [
    {
      "id": "clxxx",
      "title": "Ramadan Schedule Update",
      "body": "All sessions will be adjusted...",
      "audience": "all",
      "cityId": null,
      "parkId": null,
      "publishedBy": "clxxx_staffmeta",
      "isActive": true,
      "createdAt": "2025-07-15T10:00:00.000Z",
      "updatedAt": "2025-07-15T10:00:00.000Z",
      "publisher": {
        "user": { "name": "Ali Khan", "email": "ali@shabab360.pk" },
        "role": "program_admin"
      },
      "city": null,
      "park": null
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45 }
}
```

### 3.2 `POST /api/admin/announcements`

**Purpose:** Create and publish a new announcement.

**Allowed Roles:** `super_admin`, `program_admin`, `city_head`

**Request Body (Zod validated):**

```typescript
const createAnnouncementSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(10000),
  audience: z.enum(["all", "staff", "city_heads", "park_staff", "guardians", "students"]),
  cityId: z.string().nullable().optional(),   // null = national
  parkId: z.string().nullable().optional(),   // null = not park-scoped
});
```

**Validation rules:**

- If `parkId` is provided, `cityId` should also be provided (or auto-derived from the park's city). The API should auto-set `cityId` from the park's relationship if not supplied.
- `city_head` can only set `cityId` to their own assigned city. If they set `parkId`, the park must belong to their city.
- `program_admin` / `super_admin` can set any valid `cityId` / `parkId`.

**Response:** `201 Created` with the full announcement object (same shape as GET item).

### 3.3 `PUT /api/admin/announcements/[id]`

**Purpose:** Update an existing announcement (title, body, audience, scope).

**Allowed Roles:** `super_admin`, `program_admin`, `city_head` (own city only).

**Request Body:** Same Zod schema as POST (all fields optional via `.partial()`).

**Validation rules:**

- Same scope restrictions as POST apply to the updated values.
- `city_head` can only edit announcements they published (or those scoped to their city — decide policy; recommended: only own announcements).

**Response:** `200 OK` with the updated announcement object.

### 3.4 `DELETE /api/admin/announcements/[id]`

**Purpose:** Soft-delete (deactivate) an announcement.

**Allowed Roles:** `super_admin`, `program_admin`, `city_head` (own city).

**Behavior:** Sets `isActive = false`. Does **not** hard-delete the record.

**Response:** `200 OK` with `{ success: true }`.

### 3.5 `GET /api/announcements`

**Purpose:** Get announcements relevant to the currently authenticated user. This is the feed endpoint used by all roles.

**Allowed Roles:** All authenticated roles.

**Behavior — Complex filtering logic:**

```
Return announcements WHERE:
  1. isActive = true
  2. Audience matches current user's role (see audience mapping table)
  3. Scope matches:
     a. National (cityId IS NULL AND parkId IS NULL) → always included
     b. City-scoped (cityId IS NOT NULL, parkId IS NULL) → match user's city
     c. Park-scoped (parkId IS NOT NULL) → match user's park
ORDER BY createdAt DESC
```

**Role-to-scope resolution:**

| Role | How to determine matching scope |
|------|-------------------------------|
| `super_admin`, `program_admin` | See all scopes (national, any city, any park) |
| `city_head` | National + announcements scoped to their `assignedCityId` |
| `park_admin`, `park_lead`, `murabbi` | National + city-scoped to their park's city + park-scoped to their `assignedParkId` |
| `guardian` | National + city-scoped to their children's park's city (requires joining through `GuardianChild` → `Participant` → `Group` → `Batch` → `Park` → `City`) |
| `student` | National + city-scoped to their own park's city + park-scoped to their own park |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | `number?` | `20` | Max items to return |

**Response:**

```json
{
  "data": [
    {
      "id": "clxxx",
      "title": "Ramadan Schedule Update",
      "body": "All sessions will be adjusted...",
      "audience": "all",
      "scopeLabel": "National",
      "createdAt": "2025-07-15T10:00:00.000Z",
      "publisherName": "Ali Khan"
    }
  ]
}
```

> **Note:** The feed response is a simplified shape — no `cityId`/`parkId` raw values, but a human-readable `scopeLabel` (`"National"`, `"Karachi"`, `"Park: Gulshan-e-Iqbal"`).

---

## 4. UI Screens

### 4.1 Announcements Management (Admin)

**Navigation page:** `admin-announcements` (rendered inside `AppShell`)

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ PageHeader: "Announcements"  [+ New Announcement]│
├─────────────────────────────────────────────────┤
│ FilterBar: [Audience ▼] [Scope ▼] [Status ▼]   │
├─────────────────────────────────────────────────┤
│ DataTable:                                       │
│  Title | Audience | Scope | Status | Date | Acts │
│  ─────────────────────────────────────────────── │
│  Ramadan... | all | National | ● Active | Jul 15│
│  Park rules | park_staff | Karachi | ● Active   │
│  Old notice | staff | Lahore | ○ Inactive | ...  │
├─────────────────────────────────────────────────┤
│ Pagination: < 1 2 3 4 5 >                       │
└─────────────────────────────────────────────────┘
```

**Features:**
- Filterable by audience, scope (national/city/park), and active status
- Clicking a row opens the edit form
- Deactivate button with `ConfirmDialog`
- Uses `DataTable` component from shared library
- `StatusBadge` for active/inactive

### 4.2 Create / Edit Announcement Form

**Navigation page:** `admin-announcement-form` (with optional `?id=xxx` for edit mode)

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ PageHeader: "New Announcement" / "Edit..."      │
├─────────────────────────────────────────────────┐
│ FormField: Title (input, required, max 200)     │
│                                                 │
│ FormField: Body (textarea, supports markdown,   │
│            min 10, max 10000 characters)        │
│                                                 │
│ ┌─ Preview Toggle ─────────────────────────────┐│
│ │ [Write] [Preview]                            ││
│ │ ┌─────────────────────────────────────────┐  ││
│ │ │ Rendered markdown preview of body       │  ││
│ │ └─────────────────────────────────────────┘  ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ FormField: Audience                             │
│ ┌─ AudienceSelector ──────────────────────────┐│
│ │ ☑ All Users                                ││
│ │ ☐ Staff (admin + park roles)               ││
│ │ ☐ City Heads                               ││
│ │ ☐ Park Staff                               ││
│ │ ☐ Guardians                                ││
│ │ ☐ Students                                 ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ FormField: Scope                                │
│ ┌─ ScopeSelector ─────────────────────────────┐│
│ │ ● National                                 ││
│ │ ○ Specific City  [City dropdown ▼]         ││
│ │ ○ Specific Park  [City ▼] [Park ▼]        ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ FormActions: [Cancel] [Save & Publish]          │
└─────────────────────────────────────────────────┘
```

**Key behaviors:**
- Selecting "All Users" in audience disables other checkboxes (mutually exclusive).
- Scope dropdowns are populated via `/api/admin/cities` and `/api/admin/parks?cityId=xxx`.
- `city_head` sees only their own city in the city dropdown and only their city's parks.
- Preview tab renders the body as formatted text (lightweight markdown rendering).
- On save, navigate back to the announcements list.

### 4.3 Announcements Feed (All Roles)

**Navigation page:** `announcements-feed` (available in every workspace's sidebar)

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ PageHeader: "Announcements"                     │
├─────────────────────────────────────────────────┤
│ ┌─ AnnouncementCard ──────────────────────────┐│
│ │ 📢 Ramadan Schedule Update                  ││
│ │ All sessions will be adjusted for Ramadan...││
│ │ [All] · National · Jul 15, 2025            ││
│ │                           [Read More →]     ││
│ └──────────────────────────────────────────────┘│
│ ┌─ AnnouncementCard ──────────────────────────┐│
│ │ 📢 Park Maintenance Notice                  ││
│ │ Gulshan park will be closed on...           ││
│ │ [Park Staff] · Karachi · Jul 12, 2025       ││
│ │                           [Read More →]     ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│ Load More                                       │
└─────────────────────────────────────────────────┘
```

**Read More behavior:**
- Clicking "Read More" expands the card to show the full body (or opens a simple modal/sheet with full content).
- The feed is read-only for non-admin roles.

**Empty state:**
- Uses `EmptyState` component: "No announcements yet" with a megaphone icon.

---

## 5. Task Breakdown

| # | Task | Description | Estimated Effort |
|---|------|-------------|-----------------|
| 1 | **Announcements CRUD API** | Implement `GET`, `POST`, `PUT`, `DELETE` at `/api/admin/announcements` and `/api/admin/announcements/[id]`. Include Zod validation, role authorization, scope enforcement, and pagination. | Medium |
| 2 | **Role-scoped feed query** | Implement `GET /api/announcements` with the full audience + scope filtering logic for every role type. Includes the guardian join through children to determine city/park scope. | Medium |
| 3 | **Admin announcements list page** | Create `AnnouncementsListPage` component with `DataTable`, `FilterBar`, pagination, status badges, and navigation to create/edit. | Medium |
| 4 | **Create/edit announcement form** | Create `AnnouncementFormPage` with title input, body textarea with markdown preview toggle, form validation, and submit logic. Supports both create and edit modes via query param. | Medium |
| 5 | **Audience selector component** | Create `AudienceSelector` — checkbox group for `all`, `staff`, `city_heads`, `park_staff`, `guardians`, `students`. "All" is mutually exclusive. | Small |
| 6 | **Scope selector component** | Create `AnnouncementScopeSelector` — radio group (national / city / park) with cascading city and park dropdowns. Respects role constraints (city_head limited to own city). | Small |
| 7 | **Announcements feed component** | Create `AnnouncementsFeed` — reusable read-only feed. Fetches from `/api/announcements`, renders list of `AnnouncementCard` components with "Load More" pagination. | Medium |
| 8 | **Announcement card component** | Create `AnnouncementCard` — displays title, body preview (truncated), audience badge, scope label, formatted date, and expandable full-body view. | Small |
| 9 | **Integration into each role's navigation** | Add "Announcements" link to the `Sidebar` for all workspaces (admin, park, guardian, student). Wire up `currentPage` navigation in `useAppStore`. | Small |
| 10 | **Announcement count badge in sidebar** | Fetch unread/active announcement count from a lightweight endpoint (or derive from feed) and display as a badge count on the "Announcements" sidebar item. | Small |

---

## 6. Dependencies

### Required (Must Be Complete Before Starting)

| Dependency | What's Needed |
|-----------|---------------|
| **Module 1: Auth & Foundation** | `User`, `StaffMeta`, `AuditLog` tables; NextAuth session; `authorize()` helper; `AppShell`, `Sidebar`, `PageHeader`, `DataTable`, `EmptyState`, `LoadingState`, `ConfirmDialog`, `FormActions`, `FormField`, `StatusBadge`, `FilterBar` shared components; `useAppStore` navigation; `db.ts` Prisma client |

### Optional (Enhances But Not Blocking)

| Dependency | What's Needed | Impact If Missing |
|-----------|---------------|-------------------|
| **Module 2: City Operations** | `City`, `Park` tables for scope selector dropdowns | Scope selector must have city/park data. **This IS effectively required** since the `Announcement` model references `City` and `Park`. However, the API and feed logic can be built with the schema alone; the UI scope selector just won't have data until Module 2 is complete. |

> **Practical note:** Module 8 is listed as depending on Module 1 only. In the parallel build matrix, it runs alongside Module 2. The recommended approach is: build the full API + feed logic + components that don't depend on city/park lookup data first. The scope selector UI (Task 6) can be wired up once Module 2's city/park data is available, or a simple text input can be used as a temporary fallback.

### Integration Points

| Integration | Module | Description |
|-------------|--------|-------------|
| Sidebar navigation | Module 1 | Add "Announcements" menu item to all workspace sidebars |
| City/Park dropdowns | Module 2 | Scope selector fetches from `/api/admin/cities` and `/api/admin/parks` |
| Publisher name display | Module 1 | Uses `StaffMeta.user.name` relation |
| Guardian feed scope | Module 2 | Guardian's children → participants → groups → batches → parks → cities chain |

---

## 7. Acceptance Criteria

### AC-1: Admin creates announcement
- [ ] Super admin / program admin can create an announcement with title, body, audience (`all`), and national scope
- [ ] Announcement appears in the admin list immediately after creation
- [ ] Announcement appears in all users' feeds

### AC-2: Audience targeting
- [ ] Creating an announcement with audience `guardians` makes it visible only to guardians (and admins)
- [ ] Creating an announcement with audience `park_staff` makes it visible to park_admin, park_lead, murabbi (and admins)
- [ ] Creating an announcement with audience `city_heads` makes it visible to city_head role (and admins)

### AC-3: Scope targeting
- [ ] National announcement (no city/park) is visible to all matching roles
- [ ] City-scoped announcement is visible only to users in that city
- [ ] Park-scoped announcement is visible only to users assigned to that park
- [ ] Park-scoped announcement is also visible to the city_head of that park's city

### AC-4: City Head restrictions
- [ ] City head can create announcements scoped to their city or any park within their city
- [ ] City head cannot create announcements for a different city
- [ ] City head's announcements list only shows national + their city's announcements

### AC-5: Ordering and filtering
- [ ] Feed returns announcements ordered by `createdAt DESC` (newest first)
- [ ] Inactive announcements (`isActive = false`) do NOT appear in any feed
- [ ] Admin list can optionally filter to show active-only

### AC-6: Deactivation
- [ ] Admin can deactivate an announcement via the list page
- [ ] Deactivated announcement disappears from all feeds
- [ ] Deactivated announcement remains visible in admin list with "Inactive" badge

### AC-7: Cross-role feed visibility
- [ ] Park staff member sees national + their city-scoped + their park-scoped announcements
- [ ] Guardian sees announcements with audience `guardians` or `all` that match their children's city/park scope
- [ ] Student sees announcements with audience `students` or `all` that match their park/city scope

### AC-8: Sidebar integration
- [ ] Every workspace sidebar shows an "Announcements" link
- [ ] Clicking it navigates to the announcements feed page
- [ ] Feed page shows a count badge when there are active announcements

### AC-9: Form validation
- [ ] Title is required (min 3, max 200 characters)
- [ ] Body is required (min 10, max 10000 characters)
- [ ] Audience must be one of the valid enum values
- [ ] Scope city/park must be valid existing records
- [ ] Zod errors display inline next to each field

---

## 8. Files to Create / Modify

### API Routes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/admin/announcements/route.ts` | **Create** | `GET` (list with filters + pagination) and `POST` (create) |
| `src/app/api/admin/announcements/[id]/route.ts` | **Create** | `PUT` (update) and `DELETE` (soft-delete) |
| `src/app/api/announcements/route.ts` | **Create** | `GET` — role-scoped feed endpoint |

### Page Components

| File | Action | Description |
|------|--------|-------------|
| `src/components/modules/admin/announcements/announcements-list-page.tsx` | **Create** | Admin announcements list with table, filters, actions |
| `src/components/modules/admin/announcements/announcement-form-page.tsx` | **Create** | Create/edit announcement form with preview |
| `src/components/modules/shared/announcements/announcements-feed.tsx` | **Create** | Reusable read-only feed component |
| `src/components/modules/guardian/announcements/guardian-announcements-page.tsx` | **Create** | Guardian-specific feed wrapper (thin) |
| `src/components/modules/student/announcements/student-announcements-page.tsx` | **Create** | Student-specific feed wrapper (thin) |
| `src/components/modules/park/announcements/park-announcements-page.tsx` | **Create** | Park workspace feed wrapper (thin) |

### Reusable Components

| File | Action | Description |
|------|--------|-------------|
| `src/components/modules/shared/announcements/announcement-card.tsx` | **Create** | Single announcement card with preview, badges, expand |
| `src/components/modules/shared/announcements/audience-selector.tsx` | **Create** | Checkbox group for audience selection |
| `src/components/modules/shared/announcements/announcement-scope-selector.tsx` | **Create** | Radio group + cascading city/park dropdowns |

### Types

| File | Action | Description |
|------|--------|-------------|
| `src/types/announcements.ts` | **Create** | `Announcement`, `CreateAnnouncementInput`, `AnnouncementFeedItem`, `AUDIENCE_OPTIONS` constant, `AUDIENCE_LABELS` map |

### Store Modifications

| File | Action | Description |
|------|--------|-------------|
| `src/stores/useAppStore.ts` | **Modify** | No new store needed. The feed badge count can be managed via TanStack Query cache — no Zustand changes required. Navigation pages `admin-announcements`, `admin-announcement-form`, `announcements-feed` are already handled by the string-based `currentPage` routing. |

### Sidebar Modifications

| File | Action | Description |
|------|--------|-------------|
| `src/components/layout/sidebar.tsx` | **Modify** | Add "Announcements" menu item to all workspace navigation configs (admin, park, guardian, student) with optional count badge |

### Page Router Registration

| File | Action | Description |
|------|--------|-------------|
| `src/app/page.tsx` or `src/components/layout/page-renderer.tsx` | **Modify** | Register new `currentPage` values: `admin-announcements`, `admin-announcement-form`, `announcements-feed`, `guardian-announcements`, `student-announcements`, `park-announcements` |

### Database

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | **Modify** | Add `Announcement` model (if not already added during Module 1 schema scaffolding) |

---

## 9. Implementation Notes

### 9.1 Audience Filtering Implementation (API)

The feed endpoint needs a helper function to determine which audience values a given role can see:

```typescript
// src/lib/announcements/audience.ts

const ROLE_AUDIENCE_MAP: Record<string, string[]> = {
  super_admin: ["all", "staff", "city_heads", "park_staff", "guardians", "students"],
  program_admin: ["all", "staff", "city_heads", "park_staff", "guardians", "students"],
  city_head: ["all", "staff", "city_heads", "park_staff"],
  park_admin: ["all", "staff", "park_staff"],
  park_lead: ["all", "staff", "park_staff"],
  murabbi: ["all", "staff", "park_staff"],
  guardian: ["all", "guardians"],
  student: ["all", "students"],
};

export function getVisibleAudiences(role: string): string[] {
  return ROLE_AUDIENCE_MAP[role] ?? [];
}
```

### 9.2 Scope Filtering Implementation (API)

The Prisma query for the feed endpoint:

```typescript
// Pseudocode for the WHERE clause
const where = {
  isActive: true,
  audience: { in: visibleAudiences },
  OR: [
    // National
    { cityId: null, parkId: null },
    // City-scoped (match user's city)
    { cityId: userCityId, parkId: null },
    // Park-scoped (match user's park)
    { parkId: userParkId },
  ],
};
```

For guardians, `userCityId` is derived from their children's park city, and `userParkId` is the set of parks their children belong to.

### 9.3 Markdown Rendering

For the body preview, use a lightweight approach — either:
- A simple `<div className="prose prose-sm">` with `dangerouslySetInnerHTML` after sanitizing (use `DOMPurify`), or
- Install `react-markdown` for proper rendering.

Recommended: `react-markdown` with `remark-gfm` for standard markdown support.

### 9.4 Date Formatting

All dates stored in UTC. Display using PKT timezone (`Asia/Karachi`) via the shared `src/lib/timezone.ts` utility:

```typescript
import { formatInPKT } from "@/lib/timezone";
formatInPKT(announcement.createdAt, "MMM d, yyyy"); // "Jul 15, 2025"
```

### 9.5 Unread / Count Badge

For the sidebar badge, the simplest approach is:
1. The feed component fetches active announcements on app load (or on navigation to pages where sidebar is visible).
2. The total count from the feed response is surfaced to the sidebar via a shared TanStack Query key.
3. No separate "read" tracking table is needed for MVP — the badge simply shows the total active count.

If per-user read tracking is needed later, a future `announcement_reads` junction table can be added.

---

## 10. Testing Checklist

After implementation, verify with `agent-browser`:

1. [ ] Login as `program_admin` → navigate to Announcements → see empty state
2. [ ] Create a national announcement with audience `all` → verify it appears in admin list
3. [ ] Login as `student` → verify announcement appears in feed
4. [ ] Login as `guardian` → verify announcement appears in feed
5. [ ] Login as `park_admin` → verify announcement appears in feed
6. [ ] Create a city-scoped announcement for Lahore → verify only Lahore park staff and Lahore city head see it
7. [ ] Create a park-specific announcement → verify only that park's staff see it
8. [ ] Deactivate an announcement → verify it disappears from all feeds but stays in admin list
9. [ ] Verify ordering: newest announcements appear first in feed
10. [ ] Test form validation: empty title, short body, invalid audience
11. [ ] Verify sidebar "Announcements" link works for all roles
12. [ ] Verify count badge appears on sidebar when active announcements exist