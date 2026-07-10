# Module 01: Authentication, Authorization & Foundation Infrastructure

> **Module ID:** M1
> **Priority:** P0 — Foundation (Phase 1)
> **Depends On:** None
> **Blocking:** All subsequent modules (M2–M10)
> **Estimated Total Effort:** ~15 tasks, 3–5 days

---

## Module Overview

This is the **foundation module** for Shabab360. It establishes the entire authentication system, role-based authorization layer, application shell layout, client-side navigation, and the shared component library that every other module depends on.

### What This Module Delivers

1. **Database schema** for `users`, `staff_meta`, and `audit_log` tables
2. **NextAuth v4 configuration** with credentials provider, JWT strategy, and role resolution via `staff_meta` join
3. **Login, reset password, and access-pending screens** — the complete unauthenticated/authenticated-but-unlinked flows
4. **App Shell** — sidebar + main content area layout that all authenticated workspaces use
5. **Role-aware sidebar navigation** — menu items change per role, collapsible on desktop, drawer on mobile
6. **Zustand app store** — client-side page routing and context selection (city/park/batch/group)
7. **Authorization helpers** — `requireRole()`, `requireCityScope()`, `requireParkScope()` used by every API route
8. **Audit logging utility** — `logAudit()` used by every mutating API route
9. **Shared layout components** — `PageHeader`, `LoadingState`, `ErrorState`, `EmptyState`, `ConfirmDialog`
10. **Seed script** with demo users for all 8 roles

### Affected Shabab Roles

| Role | Code | Impact |
|------|------|--------|
| Super Admin | `super_admin` | Can log in, lands in Admin workspace, sees all menu items |
| Program Admin | `program_admin` | Can log in, lands in Admin workspace, sees national-level menu |
| City Head | `city_head` | Can log in, lands in Admin workspace, scoped to assigned city |
| Park Admin | `park_admin` | Can log in, lands in Park workspace, scoped to assigned park |
| Park Lead | `park_lead` | Can log in, lands in Park workspace, scoped to assigned park |
| Murabbi | `murabbi` | Can log in, lands in Park workspace, scoped to assigned group |
| Guardian | `guardian` | Can log in, lands in Guardian workspace, read-only children view |
| Student | `student` | Can log in, lands in Student workspace, read-only self view |

### Dependencies

**None.** This is the first module built. All other modules depend on it.

---

## Database Tables

Only the tables relevant to this module are created here. The remaining tables (cities, parks, batches, groups, participants, etc.) are added in Module 2. However, since Prisma requires relational integrity, the schema file will contain the full schema from the master plan but only the three tables below are **new** in this module.

> **Note:** The existing `prisma/schema.prisma` contains a placeholder `User` and `Post` model from the scaffold. The entire file must be replaced with the full master plan schema. However, this module document only covers the three tables listed below. Module 2 will add the organizational and people tables.

### 1. `users` Table

Stores authentication credentials and basic profile for all user types (staff, guardians, students).

```prisma
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
```

**Key fields explained:**
- `passwordHash` — bcrypt hash of the user's password. No plain-text storage.
- `mustResetPwd` — When `true`, the user is forced to change password after login. Set `true` by default for new accounts and when admin resets a user's password.
- `isActive` — Soft-delete flag. Inactive users cannot authenticate.
- `staffMeta` — One-to-one with `StaffMeta`. If present, this user is a staff member. If absent, the user is either a guardian or student (determined by `guardian` or `participant` relation).
- `guardian` / `participant` — One-to-one optional links. Populated by Module 2 and Module 10.

### 2. `staff_meta` Table

Extends `User` with role and organizational scope for staff members.

```prisma
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

  @@map("staff_meta")
}
```

**Key fields explained:**
- `role` — One of: `super_admin`, `program_admin`, `city_head`, `park_admin`, `park_lead`, `murabbi`. Not stored for guardians/students (they use the `guardian`/`participant` tables).
- `assignedCityId` — Only set for `city_head`. Other staff get their city indirectly via park assignment.
- `assignedParkId` — Set for `park_admin`, `park_lead`. Murabbis also have this (transitively via group).
- `assignedGroupId` — Only set for `murabbi`. A murabbi is tied to exactly one group.
- `isActive` — Allows disabling a staff assignment without deactivating the user account.

### 3. `audit_log` Table

Immutable log of all significant mutations in the system.

```prisma
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
```

**Key fields explained:**
- `action` — Human-readable action verb: `create`, `update`, `delete`, `close`, `reset_password`, `login`, etc.
- `entityType` — The type of entity affected: `user`, `city`, `park`, `batch`, `group`, `participant`, `attendance_event`, `payment`, etc.
- `entityId` — The `id` of the affected entity.
- `oldValues` — JSON string of the entity's state before mutation. Omit for `create` actions.
- `newValues` — JSON string of the entity's state after mutation. Omit for `delete` actions.
- `reason` — Optional free-text reason (e.g., for manual overrides).
- `userId` — Nullable because system actions (e.g., batch auto-close) may not have a user.

---

## API Endpoints

### `POST /api/auth/[...nextauth]` — NextAuth Login

This is the standard NextAuth catch-all handler. It processes the credentials provider's `authorize` callback.

**Request:**

```json
POST /api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded

{
  "email": "admin@shabab360.pk",
  "password": "changeme123",
  "redirect": "false"
}
```

**Server-side flow (in `authorize` callback):**

1. Find user by email where `isActive === true`
2. Compare password using `bcrypt.compare(password, user.passwordHash)`
3. If no match, return `null` (NextAuth shows generic "Invalid credentials" error)
4. If match, query `StaffMeta` to determine role. If no `StaffMeta` exists, check `Guardian` and `Participant` relations.
5. Return user object with role and scope info embedded in the JWT

**Response (successful):**

```json
HTTP 200
{
  "user": {
    "id": "clxxxxx",
    "email": "admin@shabab360.pk",
    "name": "Super Admin",
    "role": "super_admin",
    "mustResetPwd": true,
    "assignedCityId": null,
    "assignedParkId": null,
    "assignedGroupId": null
  }
}
```

**Response (failed):**

```json
HTTP 401
{
  "error": "CredentialsSignin",
  "url": null
}
```

**JWT token content (encoded in session cookie):**

```json
{
  "sub": "clxxxxx",
  "email": "admin@shabab360.pk",
  "name": "Super Admin",
  "role": "super_admin",
  "mustResetPwd": true,
  "assignedCityId": null,
  "assignedParkId": null,
  "assignedGroupId": null,
  "iat": 1751000000,
  "exp": 1751086400
}
```

### `GET /api/auth/session` — Get Current Session

Standard NextAuth session endpoint. Returns the current JWT-decoded session.

**Request:**

```
GET /api/auth/session
Cookie: next-auth.session-token=xxx
```

**Response (authenticated):**

```json
HTTP 200
{
  "user": {
    "id": "clxxxxx",
    "email": "admin@shabab360.pk",
    "name": "Super Admin",
    "role": "super_admin",
    "mustResetPwd": false,
    "assignedCityId": null,
    "assignedParkId": null,
    "assignedGroupId": null
  },
  "expires": "2025-06-28T00:00:00.000Z"
}
```

**Response (unauthenticated):**

```json
HTTP 200
{}
```

### `POST /api/auth/reset-password` — Password Reset / First-Login Reset

Custom endpoint for resetting a user's password. Used in two scenarios:
1. **First login** — User has `mustResetPwd: true` and is redirected here after authentication.
2. **Admin-initiated reset** — Admin resets a user's password, setting `mustResetPwd: true`.

**Request:**

```json
POST /api/auth/reset-password
Content-Type: application/json
Cookie: next-auth.session-token=xxx

{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePass456!",
  "confirmPassword": "newSecurePass456!"
}
```

**Validation rules:**
- `currentPassword` is **not required** if `mustResetPwd` is `true` (first login after admin-set password). It IS required if `mustResetPwd` is `false` (user changing their own password).
- `newPassword` minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one digit.
- `confirmPassword` must match `newPassword`.

**Response (success):**

```json
HTTP 200
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Response (validation error):**

```json
HTTP 400
{
  "error": "Validation failed",
  "details": [
    { "field": "newPassword", "message": "Password must be at least 8 characters" }
  ]
}
```

**Response (wrong current password):**

```json
HTTP 403
{
  "error": "Current password is incorrect"
}
```

**Response (unauthenticated):**

```json
HTTP 401
{
  "error": "Unauthorized"
}
```

---

## UI Components & Screens

### 1. Login Page

**File:** `src/components/modules/auth/login-page.tsx`

**Behavior:**
- Rendered when `useSession()` returns `status === 'unauthenticated'`
- Full-screen centered layout with Shabab360 branding (logo + app name)
- Email and password form fields using shadcn `Input` and `Label` components
- "Sign In" button using shadcn `Button`
- Form validation via react-hook-form + zod:
  - Email: valid email format, required
  - Password: required, minimum 1 character
- On submit, call `signIn('credentials', { email, password, redirect: false })` from `next-auth/react`
- **Loading state:** Button shows a spinner (from lucide `Loader2` icon) and text changes to "Signing in..."
- **Error state:** If `signIn` returns an error, display a dismissible alert (shadcn `Alert`) below the form: "Invalid email or password. Please try again."
- **Success state:** After successful `signIn`, the `useSession()` hook will update to `authenticated` and the `AppRouter` will re-render, replacing the login page with the app shell.
- **Mobile-first:** On screens < 640px, the form takes full width with comfortable padding. On larger screens, it's centered in a card with max-width ~400px.
- **Branding:** Display the Shabab360 logo (from `/logo.svg`) above the form. Use muted tones — white/gray card on neutral background.
- No links to "Forgot Password" or "Sign Up" — this is a closed system. Accounts are provisioned by admins.

**Visual layout:**
```
┌──────────────────────────────────┐
│          (full screen)           │
│                                  │
│         [Shabab360 Logo]         │
│          Shabab360               │
│     Youth Program Management     │
│                                  │
│   ┌────────────────────────┐     │
│   │  Email                  │     │
│   │  [________________]     │     │
│   │                         │     │
│   │  Password               │     │
│   │  [________________]     │     │
│   │                         │     │
│   │  [    Sign In    ]      │     │
│   │                         │     │
│   │  ⚠ Invalid credentials  │     │
│   └────────────────────────┘     │
│                                  │
│        © 2025 Shabab360          │
└──────────────────────────────────┘
```

### 2. Reset Password Page

**File:** `src/components/modules/auth/reset-password-page.tsx`

**Behavior:**
- Rendered when the user is authenticated (`status === 'authenticated'`) AND `session.user.mustResetPwd === true`
- This takes precedence over normal app rendering — the user cannot access any other page until password is reset
- Full-screen centered layout matching the login page aesthetic
- Three form fields: Current Password (conditionally shown), New Password, Confirm Password
- **Current Password field:** Hidden (not rendered) if `session.user.mustResetPwd === true`. Shown if user navigates here voluntarily (future: profile settings).
- **New Password:** Shows real-time strength indicator (weak/fair/strong) using color-coded bar
- **Validation:**
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 digit
  - New password must differ from current password
  - Confirm password must match new password
- On submit, call `POST /api/auth/reset-password` with the form data
- **Success:** Show a brief success toast/message, then call `update()` from `useSession()` to refresh the session (which will now have `mustResetPwd: false`), causing the app to re-render into the normal workspace
- **Error:** Display validation errors inline below each field. Display server errors (wrong current password) as an alert at the top of the form.

**Password strength indicator logic:**
- < 8 chars: "Too short" (red)
- 8+ chars, missing requirements: "Weak" (orange)
- Meets all requirements, no special chars: "Fair" (yellow)
- Meets all requirements + special char or 12+ chars: "Strong" (green)

### 3. Access Pending Page

**File:** `src/components/modules/auth/access-pending-page.tsx`

**Behavior:**
- Rendered when the user is authenticated but has NO `staffMeta`, NO `guardian`, and NO `participant` record linked to their account
- This means the user account exists but has not been assigned a role or linked to a person record yet
- Full-screen centered layout
- Shows: Shabab360 logo, a friendly message, and an illustration (use lucide `ShieldCheck` or `UserCog` icon as a large visual)
- **Message:** "Your account has been created but access has not been configured yet. Please contact your administrator to complete your setup."
- **Below message:** Display the user's email (from session) and a note about who to contact
- **Logout button:** Allow the user to sign out (`signOut()` from `next-auth/react`)
- **Auto-check:** Poll `GET /api/auth/session` every 30 seconds. If the session gains a role/assignment, automatically transition to the appropriate workspace.
- No sidebar, no navigation — this is a dead-end screen until access is provisioned

**Visual layout:**
```
┌──────────────────────────────────┐
│          (full screen)           │
│                                  │
│         [ShieldCheck Icon]       │
│          (large, muted)          │
│                                  │
│       Access Pending             │
│                                  │
│  Your account has been created   │
│  but access has not been         │
│  configured yet.                 │
│                                  │
│  Email: user@example.com         │
│                                  │
│  Contact your administrator to   │
│  complete your setup.            │
│                                  │
│        [  Sign Out  ]            │
│                                  │
└──────────────────────────────────┘
```

### 4. App Shell

**File:** `src/components/layout/app-shell.tsx`

**Behavior:**
- The main authenticated layout wrapper used by `AppRouter` in `page.tsx`
- Composed of: `Sidebar` (left) + main content area (right)
- Uses CSS Grid or Flexbox for the two-column layout
- **Desktop (≥1024px):** Sidebar is 280px wide, fixed position, main content has `margin-left: 280px`
- **Tablet (768–1023px):** Sidebar is 64px (icon-only collapsed mode), main content has `margin-left: 64px`
- **Mobile (<768px):** Sidebar is hidden off-screen (translateX(-100%)), toggled via hamburger menu in a top bar. Uses a `Sheet` (shadcn drawer) overlay pattern.
- **Sidebar collapse toggle:** A button (chevron icon) at the bottom of the sidebar toggles between full (280px) and collapsed (64px) on desktop
- **Top bar (mobile only):** Shows hamburger menu icon (left), Shabab360 logo/name (center), and user avatar dropdown (right)
- **User avatar dropdown:** Shows user name, role badge, and a "Sign Out" option. Uses shadcn `DropdownMenu`
- **Content area:** Has a light gray background (`bg-muted/30`), padding, and renders the `PageRenderer` output
- **Scroll behavior:** Sidebar is independently scrollable if content overflows. Main content area scrolls independently.

**Structure:**
```
┌──────────┬───────────────────────────────┐
│          │ [Mobile Top Bar: ☰ Logo 👤]   │
│ Sidebar  │                               │
│          │    Main Content Area          │
│  - Menu  │    (PageRenderer output)      │
│  - Items │                               │
│          │                               │
│          │                               │
│  [Toggle]│                               │
└──────────┴───────────────────────────────┘
```

### 5. Sidebar Navigation

**File:** `src/components/layout/sidebar.tsx`

**Behavior:**
- Reads the current user's role from the session (via `useSession()`)
- Renders a list of navigation items based on the role
- Each item has: icon (lucide), label, and target page identifier (string matching `useAppStore.currentPage`)
- **Active state:** The item matching `useAppStore(s => s.currentPage)` is highlighted with `bg-accent` and `text-accent-foreground`
- **Click handler:** Calls `useAppStore(s => s.navigateTo)(pageId)` — this updates the Zustand store, which triggers the `PageRenderer` to show the correct page component
- **Section headers:** Menu items are grouped under collapsible section headers (e.g., "Management", "Attendance", "Reports")
- **Role-based menu filtering:** Each item has a `roles` array. Only items where the current user's role is included are rendered.

**Menu configuration (role → visible items):**

| Menu Item | Icon | Page ID | Visible For |
|-----------|------|---------|-------------|
| **Dashboard** | `LayoutDashboard` | `dashboard` | All roles |
| **Cities** | `MapPin` | `cities` | `super_admin`, `program_admin` |
| **Parks** | `Trees` | `parks` | `super_admin`, `program_admin`, `city_head` |
| **Batches** | `CalendarRange` | `batches` | `super_admin`, `program_admin`, `city_head` |
| **Groups** | `Users` | `groups` | `super_admin`, `program_admin`, `city_head` |
| **People** | `UserCog` | `people` | `super_admin`, `program_admin`, `city_head` |
| **Attendance** | `ClipboardCheck` | `attendance` | `super_admin`, `program_admin`, `city_head`, `park_admin`, `park_lead`, `murabbi` |
| **Mark Attendance** | `CheckCircle` | `mark-attendance` | `park_admin`, `park_lead`, `murabbi` |
| **Fees** | `CreditCard` | `fees` | `super_admin`, `program_admin`, `city_head` |
| **Admissions** | `FileText` | `admissions` | `super_admin`, `program_admin`, `city_head` |
| **Announcements** | `Megaphone` | `announcements` | `super_admin`, `program_admin`, `city_head` |
| **User Management** | `Shield` | `users` | `super_admin`, `program_admin` |
| **Reports** | `BarChart3` | `reports` | `super_admin`, `program_admin`, `city_head` |
| **My Children** | `Heart` | `guardian-children` | `guardian` |
| **My Progress** | `TrendingUp` | `student-progress` | `student` |

**Section grouping:**
- **Overview:** Dashboard
- **Organization:** Cities, Parks, Batches, Groups, People
- **Operations:** Attendance, Mark Attendance, Fees, Admissions, Announcements
- **Administration:** User Management, Reports
- **My Portal:** My Children (guardian only), My Progress (student only)

**Collapsed mode behavior:**
- When collapsed (64px wide), only icons are shown
- On hover over an icon, show a tooltip with the item label using shadcn `Tooltip`

### 6. Page Router (Client-Side Navigation)

**Files:**
- `src/components/layout/app-router.tsx` — Top-level router in `page.tsx`
- `src/components/layout/page-renderer.tsx` — Maps page IDs to components

**Behavior:**
- The `AppRouter` component is the single client-side router for the entire application
- It reads `useSession()` from NextAuth and `currentPage` from `useAppStore`
- **Routing logic:**

```
Session status:
  "loading"     → <LoadingScreen /> (full-screen spinner with Shabab360 branding)
  "unauthenticated" → <LoginPage />
  "authenticated":
    mustResetPwd === true   → <ResetPasswordPage />
    role is undefined/null  → <AccessPendingPage />
    role is defined         → <AppShell><PageRenderer page={currentPage} /></AppShell>
```

- The `PageRenderer` is a large switch/record that maps page ID strings to React components:

```typescript
const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  // Auth (already handled above, but listed for completeness)
  "login": LoginPage,
  "reset-password": ResetPasswordPage,
  "access-pending": AccessPendingPage,

  // Common
  "dashboard": DashboardPage,        // Module 4
  "not-found": NotFoundPage,

  // Admin workspace pages (Modules 2, 3, 5, 6, 7, 8, 9)
  "cities": CitiesPage,
  "parks": ParksPage,
  // ... etc

  // Park workspace pages (Modules 2, 3)
  "mark-attendance": MarkAttendancePage,
  // ... etc

  // Guardian portal (Module 10)
  "guardian-children": GuardianChildrenPage,

  // Student portal (Module 10)
  "student-progress": StudentProgressPage,
};
```

- In this module, only the auth-related pages (`login`, `reset-password`, `access-pending`) and a placeholder `dashboard` / `not-found` page are implemented. All other page components will be stub components that show "Coming soon" or "Module X" until those modules are built.
- **Navigation is entirely client-side.** No `next/router` or `Link` components are used for page navigation. All navigation goes through `useAppStore().navigateTo(pageId)`.
- **Browser back button:** The `goBack()` action in the store restores `previousPage`. Attach a `popstate` event listener in `AppRouter` to handle browser back/forward.

---

## Complete Task Breakdown

### M1-T01: Prisma Schema Setup (Users, StaffMeta, AuditLog)

**Description:**
Replace the existing `prisma/schema.prisma` with the full schema from the master plan. For this module, the three focus tables are `users`, `staff_meta`, and `audit_log`. However, because of Prisma's relational requirements, you must include the complete schema (all models from the master plan) to avoid broken relations. The existing `User` and `Post` models from the scaffold must be removed.

**Specific changes to make:**
- Remove the existing `User` and `Post` models
- Add `passwordHash`, `phone`, `mustResetPwd`, `isActive` fields to the new `User` model
- Add the `StaffMeta` model with `role`, `assignedCityId`, `assignedParkId`, `assignedGroupId` fields
- Add the `AuditLog` model with `userId`, `action`, `entityType`, `entityId`, `oldValues`, `newValues`, `reason` fields
- Include all remaining models from the master plan (City, Park, Batch, Group, Guardian, GuardianChild, Participant, etc.) so relations compile
- Keep `datasource db` pointing to `file:../db/custom.db`
- Keep `generator client` as `prisma-client-js`

**Files to modify:**
- `prisma/schema.prisma` — Complete replacement

**Acceptance criteria:**
- [ ] `prisma/schema.prisma` contains all models from the master plan
- [ ] `bun run db:generate` runs without errors
- [ ] `bun run db:push` creates all tables in `db/custom.db` without errors
- [ ] No `Post` model exists in the schema
- [ ] `User` model has `passwordHash` (not `password`), `mustResetPwd`, `isActive`

**Estimated complexity:** Medium

---

### M1-T02: Database Push and Initial Seed Script

**Description:**
Run the database migration and create a seed script at `prisma/seed.ts` that populates the database with demo users for all 8 roles. The seed script must be idempotent (safe to run multiple times — use `upsert` or check-before-insert patterns).

**Demo users to seed:**

| Email | Name | Password | Role | City/Park/Group |
|-------|------|----------|------|-----------------|
| `super@shabab360.pk` | Super Admin | `changeme123` | super_admin | — |
| `program@shabab360.pk` | Program Admin | `changeme123` | program_admin | — |
| `city@shabab360.pk` | City Head Karachi | `changeme123` | city_head | Karachi |
| `park@shabab360.pk` | Park Admin Gulshan | `changeme123` | park_admin | Karachi / Gulshan Park |
| `lead@shabab360.pk` | Park Lead Gulshan | `changeme123` | park_lead | Karachi / Gulshan Park |
| `murabbi@shabab360.pk` | Murabbi Ali | `changeme123` | murabbi | Karachi / Gulshan Park / Group A |
| `guardian@shabab360.pk` | Ahmed Khan (Guardian) | `changeme123` | guardian | — |
| `student@shabab360.pk` | Bilal Ahmed (Student) | `changeme123` | student | — |

**Implementation details:**
- Use `bcrypt` (or `bun:password` / `bcryptjs`) to hash passwords before inserting
- The guardian and student users will NOT have a `StaffMeta` record. Instead, they will have `Guardian` and `Participant` records respectively (but those tables require cities/parks/groups from Module 2). For now, create the user accounts only for guardian and student — they will land on the "Access Pending" page until Module 2 provisions their records.
- Actually, to allow full testing: seed a minimal `City` → `Park` → `Batch` → `Group` → `Participant` chain so that guardian and student users can also have linked records. This means you need to seed some organizational data as a prerequisite.
- The seed script must also create a `super_admin` user who is NOT flagged `mustResetPwd` for easy dev login. All other users should have `mustResetPwd: true` by default, but for testing convenience, set them to `false` as well (or provide a flag).
- Add a `prisma/seed.ts` script and register it in `package.json` under `prisma.seed`

**Files to create/modify:**
- `prisma/seed.ts` — New file
- `package.json` — Add `"prisma": { "seed": "bun run prisma/seed.ts" }` section
- `prisma/seed-helpers.ts` — (Optional) Helper functions for hashing, etc.

**Acceptance criteria:**
- [ ] Running `bunx prisma db seed` completes without errors
- [ ] All 8 user accounts exist in the `users` table
- [ ] All staff users have corresponding `staff_meta` records with correct roles
- [ ] Passwords are bcrypt-hashed (not plain text)
- [ ] `mustResetPwd` is configurable (default `false` for dev convenience)
- [ ] Guardian user has a `guardian` record; student user has a `participant` record (with minimal organizational prerequisites seeded)

**Estimated complexity:** Large

---

### M1-T03: NextAuth Configuration

**Description:**
Configure NextAuth v4 with a credentials provider, JWT session strategy, and custom callbacks that embed role/scope information into the JWT and session.

**Implementation details:**

Create `src/lib/auth.ts` with:

1. **AuthOptions export:**
```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { staffMeta: true },
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        // Determine role from staffMeta, guardian, or participant
        let role: string | null = null;
        if (user.staffMeta) {
          role = user.staffMeta.role;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: role,
          mustResetPwd: user.mustResetPwd,
          assignedCityId: user.staffMeta?.assignedCityId ?? null,
          assignedParkId: user.staffMeta?.assignedParkId ?? null,
          assignedGroupId: user.staffMeta?.assignedGroupId ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.mustResetPwd = user.mustResetPwd;
        token.assignedCityId = user.assignedCityId;
        token.assignedParkId = user.assignedParkId;
        token.assignedGroupId = user.assignedGroupId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string | null;
        session.user.mustResetPwd = token.mustResetPwd as boolean;
        session.user.assignedCityId = token.assignedCityId as string | null;
        session.user.assignedParkId = token.assignedParkId as string | null;
        session.user.assignedGroupId = token.assignedGroupId as string | null;
      }
      return session;
    },
  },
  pages: {
    // Do NOT set custom signIn page — we handle it client-side via AppRouter
  },
  secret: process.env.NEXTAUTH_SECRET,
};
```

2. **Create the NextAuth route handler:**
   `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

3. **Extend NextAuth types** for the custom session:
   Create `src/types/next-auth.d.ts`:
```typescript
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string | null;
      mustResetPwd: boolean;
      assignedCityId: string | null;
      assignedParkId: string | null;
      assignedGroupId: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string | null;
    mustResetPwd: boolean;
    assignedCityId: string | null;
    assignedParkId: string | null;
    assignedGroupId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string | null;
    mustResetPwd?: boolean;
    assignedCityId?: string | null;
    assignedParkId?: string | null;
    assignedGroupId?: string | null;
  }
}
```

4. **Environment variable:** Ensure `NEXTAUTH_SECRET` is set. Add to `.env`:
```
NEXTAUTH_SECRET=shabab360-dev-secret-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

5. **Install bcryptjs:** Add `bcryptjs` and `@types/bcryptjs` to dependencies if not already present.

**Files to create/modify:**
- `src/lib/auth.ts` — New file
- `src/app/api/auth/[...nextauth]/route.ts` — New file
- `src/types/next-auth.d.ts` — New file
- `.env` — Add NEXTAUTH_SECRET and NEXTAUTH_URL
- `package.json` — Ensure `bcryptjs` and `@types/bcryptjs` in dependencies

**Acceptance criteria:**
- [ ] `POST /api/auth/callback/credentials` with valid demo credentials returns a session with `role` and `mustResetPwd`
- [ ] `GET /api/auth/session` returns the custom session fields
- [ ] Invalid credentials return 401
- [ ] Inactive user (`isActive: false`) cannot authenticate
- [ ] JWT contains role, mustResetPwd, and scope fields
- [ ] TypeScript compiles without errors for custom session types

**Estimated complexity:** Large

---

### M1-T04: Role Resolution in Session (Guardian/Student Detection)

**Description:**
Enhance the `authorize` callback in `src/lib/auth.ts` to also detect guardian and student roles. Currently, only `staffMeta` is queried. Add logic to check `guardian` and `participant` relations and set the role accordingly.

**Implementation details:**

In the `authorize` callback, after finding the user, include all three possible relations:

```typescript
const user = await db.user.findUnique({
  where: { email: credentials.email },
  include: { staffMeta: true, guardian: true, participant: true },
});
```

Then determine role:
```typescript
let role: string | null = null;
if (user.staffMeta) {
  role = user.staffMeta.role;
} else if (user.guardian) {
  role = "guardian";
} else if (user.participant) {
  role = "student";
}
// If none match, role stays null → user lands on Access Pending page
```

**Files to modify:**
- `src/lib/auth.ts` — Update the `authorize` callback's `include` and role resolution logic

**Acceptance criteria:**
- [ ] Staff user (with `staffMeta`) gets their `staffMeta.role` in session
- [ ] Guardian user (with `guardian` record) gets `"guardian"` in session
- [ ] Student user (with `participant` record) gets `"student"` in session
- [ ] User with no relations gets `role: null` in session → Access Pending
- [ ] All 8 demo users from the seed script return correct roles

**Estimated complexity:** Small

---

### M1-T05: Login Page UI

**Description:**
Build the full login page component with form validation, error handling, and loading states. This is the first thing users see.

**Implementation details:**

- Use `"use client"` directive
- Use `react-hook-form` with `@hookform/resolvers/zod` for form validation
- Use shadcn/ui `Input`, `Label`, `Button`, `Card`, `Alert` components
- Use `signIn` from `next-auth/react`
- Use lucide `Loader2` for the spinner icon
- Use `logo.svg` from `/public/`

**Form schema (zod):**
```typescript
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
```

**Component structure:**
```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ... form setup, submit handler, JSX
```

**Submit handler:**
```typescript
const onSubmit = async (data: LoginFormData) => {
  setError(null);
  setLoading(true);
  try {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    }
    // On success, useSession() will update automatically
  } catch {
    setError("An unexpected error occurred. Please try again.");
  } finally {
    setLoading(false);
  }
};
```

**Styling:**
- Full viewport height: `min-h-screen flex items-center justify-center bg-muted/30`
- Card: `w-full max-w-sm` with `p-8`
- Logo: centered, 48x48px
- App name: `text-2xl font-bold` below logo
- Tagline: `text-sm text-muted-foreground`
- Footer: `text-xs text-muted-foreground mt-4` with "© 2025 Shabab360"
- Error alert: `destructive` variant, appears below the form with fade-in animation
- Mobile: card fills width with `px-4` on the outer container

**Files to create:**
- `src/components/modules/auth/login-page.tsx` — New file

**Acceptance criteria:**
- [ ] Login form renders centered on screen
- [ ] Shabab360 logo and branding are displayed
- [ ] Email validation prevents submission with invalid email
- [ ] Password field is type="password"
- [ ] Submit button shows spinner and disabled state during login
- [ ] Invalid credentials show an error alert
- [ ] Successful login transitions to the app shell (no page reload)
- [ ] Responsive: works on mobile (320px) through desktop (1920px)
- [ ] Focus management: email input is auto-focused on page load

**Estimated complexity:** Medium

---

### M1-T06: Reset Password Page

**Description:**
Build the password reset page that users see when `mustResetPwd` is `true`. Includes password strength indicator and full validation.

**Implementation details:**

- Use `"use client"` directive
- Use react-hook-form + zod for validation
- Use shadcn/ui `Input`, `Label`, `Button`, `Card`, `Progress` components
- Use `useSession` from `next-auth/react` to check `mustResetPwd` and get user info
- Use `update` from `useSession` to refresh the session after password change

**Form schema:**
```typescript
const resetPasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine(data => !data.currentPassword || data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});
```

**Password strength calculation:**
```typescript
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 25, label: "Weak", color: "bg-red-500" };
  if (score <= 3) return { score: 50, label: "Fair", color: "bg-orange-500" };
  if (score <= 4) return { score: 75, label: "Good", color: "bg-yellow-500" };
  return { score: 100, label: "Strong", color: "bg-green-500" };
}
```

**UI flow:**
1. Header: "Set New Password" (with `Lock` icon from lucide)
2. Description text: "Please set a new password for your account."
3. Current Password field (only if `mustResetPwd === false`)
4. New Password field with real-time strength bar below it
5. Confirm Password field
6. "Update Password" button
7. On success: show success toast, then `await update()` to refresh session

**Files to create:**
- `src/components/modules/auth/reset-password-page.tsx` — New file

**Acceptance criteria:**
- [ ] Page renders when `mustResetPwd === true` in session
- [ ] Current Password field is hidden for forced resets (`mustResetPwd === true`)
- [ ] Password strength indicator updates in real-time as user types
- [ ] Validation catches: too short, missing uppercase, missing lowercase, missing digit, mismatch
- [ ] Submitting shows loading state on button
- [ ] On success, session refreshes and user enters their normal workspace
- [ ] On failure (wrong current password), error is displayed
- [ ] Responsive design matching login page style

**Estimated complexity:** Medium

---

### M1-T07: Access Pending Page

**Description:**
Build the page shown to authenticated users who have no role assignment (no `staffMeta`, no `guardian`, no `participant` record).

**Implementation details:**

- Use `"use client"` directive
- Use `useSession` and `signOut` from `next-auth/react`
- Use shadcn/ui `Button`, `Card` components
- Use lucide `ShieldCheck` icon
- Implement a polling mechanism that checks session every 30 seconds

**Component structure:**
```tsx
"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccessPendingPage() {
  const { data: session, update, status } = useSession();

  // Poll session every 30 seconds to check if role has been assigned
  useEffect(() => {
    const interval = setInterval(() => {
      update(); // Re-fetches session from server
    }, 30000);
    return () => clearInterval(interval);
  }, [update]);

  if (status === "loading") return null; // Or a loading skeleton

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <ShieldCheck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Pending</h1>
        <p className="text-muted-foreground mb-4">
          Your account has been created but access has not been configured yet.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Email: {session?.user?.email}
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Please contact your administrator to complete your setup.
        </p>
        <Button variant="outline" onClick={() => signOut()}>
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
```

**Files to create:**
- `src/components/modules/auth/access-pending-page.tsx` — New file

**Acceptance criteria:**
- [ ] Page renders for authenticated users with no role (`role: null`)
- [ ] Displays user's email
- [ ] Sign Out button works (calls `signOut()`)
- [ ] Session polling runs every 30 seconds
- [ ] When a role is assigned (session updates), user is automatically redirected to their workspace
- [ ] Clean, professional, non-alarming design
- [ ] No sidebar or navigation visible

**Estimated complexity:** Small

---

### M1-T08: Zustand App Store (Navigation & Context Selection)

**Description:**
Create the global Zustand store that manages client-side navigation state and organizational context selection.

**Implementation details:**

Create `src/stores/useAppStore.ts`:

```typescript
import { create } from "zustand";

// Landing page mapping: role → default page
const ROLE_LANDING_PAGES: Record<string, string> = {
  super_admin: "dashboard",
  program_admin: "dashboard",
  city_head: "dashboard",
  park_admin: "mark-attendance",
  park_lead: "mark-attendance",
  murabbi: "mark-attendance",
  guardian: "guardian-children",
  student: "student-progress",
};

interface AppState {
  // Navigation
  currentPage: string;
  previousPage: string | null;
  navigateTo: (page: string) => void;
  goBack: () => void;
  setLandingPage: (role: string | null) => void;

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
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentPage: "dashboard",
  previousPage: null,

  navigateTo: (page) => {
    set((state) => ({
      previousPage: state.currentPage,
      currentPage: page,
    }));
  },

  goBack: () => {
    const { previousPage } = get();
    if (previousPage) {
      set((state) => ({
        currentPage: previousPage,
        previousPage: state.currentPage,
      }));
    }
  },

  setLandingPage: (role) => {
    if (role && ROLE_LANDING_PAGES[role]) {
      set({ currentPage: ROLE_LANDING_PAGES[role] });
    } else {
      set({ currentPage: "dashboard" });
    }
  },

  // Context selection
  selectedCityId: null,
  selectedParkId: null,
  selectedBatchId: null,
  selectedGroupId: null,

  setSelectedCity: (id) => set({ selectedCityId: id, selectedParkId: null, selectedBatchId: null, selectedGroupId: null }),
  setSelectedPark: (id) => set({ selectedParkId: id, selectedBatchId: null, selectedGroupId: null }),
  setSelectedBatch: (id) => set({ selectedBatchId: id, selectedGroupId: null }),
  setSelectedGroup: (id) => set({ selectedGroupId: id }),

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
```

**Key behaviors:**
- `navigateTo` pushes the current page onto `previousPage` before changing
- `goBack` swaps `currentPage` and `previousPage`
- `setLandingPage` is called after authentication to set the initial page based on role
- Context selectors cascade: changing city clears park/batch/group; changing park clears batch/group; etc.
- `sidebarOpen` controls the sidebar visibility (mobile) and collapsed state (desktop)

**Files to create:**
- `src/stores/useAppStore.ts` — New file

**Acceptance criteria:**
- [ ] Store initializes with `currentPage: "dashboard"`
- [ ] `navigateTo("parks")` updates `currentPage` and saves previous
- [ ] `goBack()` restores the previous page
- [ ] `setLandingPage("park_admin")` sets page to `"mark-attendance"`
- [ ] `setSelectedCity(newId)` clears park, batch, and group selections
- [ ] `toggleSidebar()` flips `sidebarOpen` state
- [ ] TypeScript types are complete — no `any` types

**Estimated complexity:** Medium

---

### M1-T09: App Shell Component (Sidebar + Content Area)

**Description:**
Build the main application shell layout that wraps all authenticated pages. Includes the sidebar, mobile top bar, and content area.

**Implementation details:**

Create `src/components/layout/app-shell.tsx`:

**Structure:**
```tsx
"use client";

import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { Sidebar } from "./sidebar";
import { MobileTopBar } from "./mobile-top-bar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { sidebarOpen } = useAppStore();
  const isMobile = useIsMobile(); // from @/hooks/use-mobile (already installed)

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile top bar */}
      {isMobile && <MobileTopBar />}

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <main
          className={cn(
            "flex-1 transition-all duration-300",
            // Desktop: margin for sidebar
            !isMobile && (sidebarOpen ? "lg:ml-[280px]" : "lg:ml-[64px]"),
            // Mobile: full width, top padding for top bar
            isMobile && "mt-14",
            "p-4 md:p-6 lg:p-8"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
```

Also create `src/components/layout/mobile-top-bar.tsx`:

```tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/stores/useAppStore";

export function MobileTopBar() {
  const { data: session } = useSession();
  const { toggleSidebar } = useAppStore();

  const initials = session?.user?.name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    ?? "??";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b flex items-center justify-between px-4">
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <span className="font-semibold">Shabab360</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-sm font-medium">
            {session?.user?.name}
          </div>
          <div className="px-2 py-1 text-xs text-muted-foreground">
            {session?.user?.email}
          </div>
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

**Sidebar state management:**
- On desktop: `sidebarOpen` controls collapsed (64px icon-only) vs expanded (280px)
- On mobile: sidebar is a `Sheet` (drawer) that slides in from the left, controlled by `sidebarOpen`
- Use shadcn's `Sheet` component for mobile sidebar (already installed as `src/components/ui/sheet.tsx`)
- Use shadcn's `Tooltip` for icon-only menu items (already installed)

**Files to create:**
- `src/components/layout/app-shell.tsx` — New file
- `src/components/layout/mobile-top-bar.tsx` — New file

**Files to modify:**
- `src/components/ui/sidebar.tsx` — May need minor adjustments for the custom sidebar (the shadcn sidebar component is already installed but we may use a custom implementation instead)

**Acceptance criteria:**
- [ ] App shell renders sidebar on left, content on right
- [ ] Desktop: sidebar is 280px wide when expanded, 64px when collapsed
- [ ] Desktop: toggle button at bottom of sidebar collapses/expands
- [ ] Mobile: sidebar is hidden by default, opens as a drawer when hamburger is clicked
- [ ] Mobile: top bar shows hamburger, logo, and user avatar dropdown
- [ ] Content area has correct margins and padding at all breakpoints
- [ ] Sign Out in dropdown menu works correctly
- [ ] Smooth transitions on sidebar collapse/expand

**Estimated complexity:** Large

---

### M1-T10: Sidebar Navigation (Role-Aware Menu Items)

**Description:**
Build the sidebar component with role-aware navigation items, section groupings, active state highlighting, and collapsed-mode tooltips.

**Implementation details:**

Create `src/components/layout/sidebar.tsx`:

**Menu configuration:**
```typescript
import {
  LayoutDashboard, MapPin, Trees, CalendarRange, Users, UserCog,
  ClipboardCheck, CheckCircle, CreditCard, FileText, Megaphone,
  Shield, BarChart3, Heart, TrendingUp, ChevronLeft, ChevronRight,
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["*"] },
    ],
  },
  {
    title: "Organization",
    items: [
      { id: "cities", label: "Cities", icon: MapPin, roles: ["super_admin", "program_admin"] },
      { id: "parks", label: "Parks", icon: Trees, roles: ["super_admin", "program_admin", "city_head"] },
      { id: "batches", label: "Batches", icon: CalendarRange, roles: ["super_admin", "program_admin", "city_head"] },
      { id: "groups", label: "Groups", icon: Users, roles: ["super_admin", "program_admin", "city_head"] },
      { id: "people", label: "People", icon: UserCog, roles: ["super_admin", "program_admin", "city_head"] },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "attendance", label: "Attendance", icon: ClipboardCheck, roles: ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"] },
      { id: "mark-attendance", label: "Mark Attendance", icon: CheckCircle, roles: ["park_admin", "park_lead", "murabbi"] },
      { id: "fees", label: "Fees", icon: CreditCard, roles: ["super_admin", "program_admin", "city_head"] },
      { id: "admissions", label: "Admissions", icon: FileText, roles: ["super_admin", "program_admin", "city_head"] },
      { id: "announcements", label: "Announcements", icon: Megaphone, roles: ["super_admin", "program_admin", "city_head"] },
    ],
  },
  {
    title: "Administration",
    items: [
      { id: "users", label: "User Management", icon: Shield, roles: ["super_admin", "program_admin"] },
      { id: "reports", label: "Reports", icon: BarChart3, roles: ["super_admin", "program_admin", "city_head"] },
    ],
  },
  {
    title: "My Portal",
    items: [
      { id: "guardian-children", label: "My Children", icon: Heart, roles: ["guardian"] },
      { id: "student-progress", label: "My Progress", icon: TrendingUp, roles: ["student"] },
    ],
  },
];
```

**Role `roles: ["*"]` means the item is visible to all authenticated users.**

**Component rendering logic:**
1. Get current user role from `useSession()`
2. Filter menu sections: keep sections that have at least one item visible for the current role
3. For each section, render a collapsible header and list of items
4. Each item: if `sidebarOpen`, show icon + label. If collapsed, show icon only with `Tooltip` on hover.
5. Active item: highlighted with `bg-accent text-accent-foreground`
6. Click handler: `navigateTo(item.id)` + close sidebar on mobile

**Sidebar structure (expanded mode):**
```
┌──────────────────────┐
│ [Logo] Shabab360     │
│ Admin (role badge)   │
│──────────────────────│
│ OVERVIEW             │
│ ● Dashboard          │
│──────────────────────│
│ ORGANIZATION         │
│   Cities             │
│   Parks              │
│   Batches            │
│   Groups             │
│   People             │
│──────────────────────│
│ OPERATIONS           │
│   Attendance         │
│   Mark Attendance    │
│   ...                │
│──────────────────────│
│                      │
│ [◄ Collapse]         │
└──────────────────────┘
```

**Files to create:**
- `src/components/layout/sidebar.tsx` — New file

**Acceptance criteria:**
- [ ] Sidebar renders with correct sections and items for `super_admin` (all items visible)
- [ ] `city_head` sees: Dashboard, Parks, Batches, Groups, People, Attendance, Fees, Admissions, Announcements, Reports
- [ ] `park_admin` sees: Dashboard, Attendance, Mark Attendance
- [ ] `murabbi` sees: Dashboard, Attendance, Mark Attendance
- [ ] `guardian` sees: Dashboard, My Children
- [ ] `student` sees: Dashboard, My Progress
- [ ] Active page is highlighted in the sidebar
- [ ] Clicking an item navigates (via Zustand) without page reload
- [ ] Collapsed mode shows icons only with tooltips on hover
- [ ] Mobile: sidebar appears as a Sheet/drawer, closes after clicking an item
- [ ] Section headers are visible in expanded mode, hidden in collapsed mode

**Estimated complexity:** Large

---

### M1-T11: Client-Side Page Router (AppRouter + PageRenderer)

**Description:**
Implement the `AppRouter` component that goes into `src/app/page.tsx` and the `PageRenderer` that maps page IDs to components. Also wire up the `SessionProvider` and initial landing page logic.

**Implementation details:**

Create `src/components/layout/app-router.tsx`:

```tsx
"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { LoginPage } from "@/components/modules/auth/login-page";
import { ResetPasswordPage } from "@/components/modules/auth/reset-password-page";
import { AccessPendingPage } from "@/components/modules/auth/access-pending-page";
import { AppShell } from "@/components/layout/app-shell";
import { PageRenderer } from "@/components/layout/page-renderer";
import { Loader2 } from "lucide-react";

function AppRouterInner() {
  const { status, data: session, update } = useSession();
  const setLandingPage = useAppStore(s => s.setLandingPage);

  // Set landing page when session loads
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      setLandingPage(session.user.role);
    }
  }, [status, session?.user?.role, setLandingPage]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading Shabab360...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  // Authenticated
  if (session?.user?.mustResetPwd) {
    return <ResetPasswordPage />;
  }

  if (!session?.user?.role) {
    return <AccessPendingPage />;
  }

  return (
    <AppShell>
      <PageRenderer />
    </AppShell>
  );
}

export function AppRouter() {
  return (
    <SessionProvider>
      <AppRouterInner />
    </SessionProvider>
  );
}
```

Create `src/components/layout/page-renderer.tsx`:

```tsx
"use client";

import { useAppStore } from "@/stores/useAppStore";

// Placeholder pages for modules not yet built
function PlaceholderPage({ title, moduleInfo }: { title: string; moduleInfo: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="rounded-full bg-muted p-4">
        <span className="text-3xl">🚧</span>
      </div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-muted-foreground">{moduleInfo}</p>
    </div>
  );
}

function DashboardPage() {
  return <PlaceholderPage title="Dashboard" moduleInfo="Module 4 — Coming soon" />;
}

function NotFoundPage() {
  return <PlaceholderPage title="Page Not Found" moduleInfo="The page you're looking for doesn't exist." />;
}

export function PageRenderer() {
  const currentPage = useAppStore(s => s.currentPage);

  const pages: Record<string, React.ComponentType> = {
    "dashboard": DashboardPage,
    "not-found": NotFoundPage,
    // All other pages are placeholders until their modules are built
    "cities": () => <PlaceholderPage title="Cities" moduleInfo="Module 2 — City Operations" />,
    "parks": () => <PlaceholderPage title="Parks" moduleInfo="Module 2 — City Operations" />,
    "batches": () => <PlaceholderPage title="Batches" moduleInfo="Module 2 — City Operations" />,
    "groups": () => <PlaceholderPage title="Groups" moduleInfo="Module 2 — City Operations" />,
    "people": () => <PlaceholderPage title="People" moduleInfo="Module 2 — City Operations" />,
    "attendance": () => <PlaceholderPage title="Attendance" moduleInfo="Module 3 — Park Attendance" />,
    "mark-attendance": () => <PlaceholderPage title="Mark Attendance" moduleInfo="Module 3 — Park Attendance" />,
    "fees": () => <PlaceholderPage title="Fees" moduleInfo="Module 6 — Fees & Payments" />,
    "admissions": () => <PlaceholderPage title="Admissions" moduleInfo="Module 7 — Admissions" />,
    "announcements": () => <PlaceholderPage title="Announcements" moduleInfo="Module 8 — Announcements" />,
    "users": () => <PlaceholderPage title="User Management" moduleInfo="Module 5 — Access Provisioning" />,
    "reports": () => <PlaceholderPage title="Reports" moduleInfo="Module 9 — Reports & Exports" />,
    "guardian-children": () => <PlaceholderPage title="My Children" moduleInfo="Module 10 — Family Portals" />,
    "student-progress": () => <PlaceholderPage title="My Progress" moduleInfo="Module 10 — Family Portals" />,
  };

  const PageComponent = pages[currentPage] || NotFoundPage;

  return <PageComponent />;
}
```

**Update `src/app/page.tsx`:**
```tsx
import { AppRouter } from "@/components/layout/app-router";

export default function Home() {
  return <AppRouter />;
}
```

**Browser back button handling:**
In `AppRouterInner`, add a `useEffect` that listens for `popstate` events:
```tsx
useEffect(() => {
  const handlePopState = () => {
    const { goBack } = useAppStore.getState();
    goBack();
  };
  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, []);
```

Also, when `navigateTo` is called, push a history entry:
```typescript
navigateTo: (page) => {
  set((state) => ({
    previousPage: state.currentPage,
    currentPage: page,
  }));
  window.history.pushState({ page }, "", `#${page}`);
},
```

**Files to create:**
- `src/components/layout/app-router.tsx` — New file
- `src/components/layout/page-renderer.tsx` — New file

**Files to modify:**
- `src/app/page.tsx` — Replace existing content with `AppRouter`

**Acceptance criteria:**
- [ ] Unauthenticated users see the Login Page
- [ ] Authenticated users with `mustResetPwd: true` see the Reset Password Page
- [ ] Authenticated users with no role see the Access Pending Page
- [ ] Authenticated users with a role see the App Shell with Dashboard (or role-specific landing page)
- [ ] Clicking sidebar items changes the page without a browser reload
- [ ] Unknown page IDs show a "Page Not Found" placeholder
- [ ] All placeholder pages indicate which module will implement them
- [ ] Browser back/forward buttons work with client-side navigation
- [ ] Loading state shows a spinner while session is being fetched

**Estimated complexity:** Medium

---

### M1-T12: Authorization Helpers (requireRole, requireCityScope, requireParkScope)

**Description:**
Create server-side authorization utility functions that are used by every API route to enforce role-based and scope-based access control.

**Implementation details:**

Create `src/lib/auth/authorize.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Check if the current user has one of the allowed roles.
 * Returns null if authorized, or a 401/403 NextResponse if not.
 *
 * Usage in API routes:
 *   const authError = await requireRole(["city_head", "program_admin"]);
 *   if (authError) return authError;
 */
export async function requireRole(allowedRoles: string[]): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  if (!session.user.role) {
    return NextResponse.json(
      { error: "Access not configured", code: "NO_ROLE" },
      { status: 403 }
    );
  }

  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json(
      { error: "Forbidden", code: "INSUFFICIENT_ROLE", requiredRoles: allowedRoles },
      { status: 403 }
    );
  }

  return null; // Authorized
}

/**
 * Check if the current user has access to a specific city.
 * Super admins and program admins have access to all cities.
 * City heads must be assigned to the specified city.
 * Park-level staff must be assigned to a park within the specified city.
 *
 * Returns null if authorized, or a 403 NextResponse if not.
 */
export async function requireCityScope(
  request: NextRequest,
  cityId: string
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;

  // National-level roles have access to all cities
  if (role === "super_admin" || role === "program_admin") {
    return null;
  }

  // City head: must be assigned to this city
  if (role === "city_head") {
    if (session.user.assignedCityId === cityId) return null;
    return NextResponse.json({ error: "Forbidden: city scope mismatch" }, { status: 403 });
  }

  // Park-level staff: check via assignedParkId (would need DB lookup)
  // For now, return null — the DB lookup will be done in Module 2
  if (["park_admin", "park_lead", "murabbi"].includes(role)) {
    return null; // Will be tightened in Module 2 with park→city lookup
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Check if the current user has access to a specific park.
 * Super admins and program admins have access to all parks.
 * City heads must have the park in their assigned city.
 * Park-level staff must be assigned to the specified park.
 * Murabbis must be assigned to a group within the specified park.
 *
 * Returns null if authorized, or a 403 NextResponse if not.
 */
export async function requireParkScope(
  request: NextRequest,
  parkId: string
): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;

  if (role === "super_admin" || role === "program_admin") {
    return null;
  }

  if (["park_admin", "park_lead"].includes(role)) {
    if (session.user.assignedParkId === parkId) return null;
    return NextResponse.json({ error: "Forbidden: park scope mismatch" }, { status: 403 });
  }

  // Murabbi: assigned to a group within the park — needs DB lookup (Module 2)
  if (role === "murabbi") {
    return null; // Will be tightened in Module 2
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Convenience: get the current session, or return a 401 response.
 */
export async function getSessionOrUnauthorized(): Promise<
  | { session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}
```

Also create `src/lib/auth/session.ts` for client-side session helpers:

```typescript
/**
 * Check if a given role has access to a specific feature.
 * For client-side UI hiding (NOT security — server-side checks are authoritative).
 */
export function hasRole(userRole: string | null | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Get the human-readable label for a role.
 */
export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  program_admin: "Program Admin",
  city_head: "City Head",
  park_admin: "Park Admin",
  park_lead: "Park Lead",
  murabbi: "Murabbi",
  guardian: "Guardian",
  student: "Student",
};

/**
 * Get the workspace type for a role (used for routing/layout decisions).
 */
export function getWorkspaceForRole(role: string): "admin" | "park" | "guardian" | "student" {
  if (["super_admin", "program_admin", "city_head"].includes(role)) return "admin";
  if (["park_admin", "park_lead", "murabbi"].includes(role)) return "park";
  if (role === "guardian") return "guardian";
  return "student";
}
```

**Files to create:**
- `src/lib/auth/authorize.ts` — New file
- `src/lib/auth/session.ts` — New file

**Acceptance criteria:**
- [ ] `requireRole(["super_admin"])` returns `null` for super_admin, `403` for city_head
- [ ] `requireRole([])` always returns `403` (empty allowed list)
- [ ] Unauthenticated request returns `401` from `requireRole`
- [ ] `requireCityScope` allows super_admin and program_admin for any city
- [ ] `requireParkScope` allows super_admin and program_admin for any park
- [ ] `hasRole` client helper works for UI conditional rendering
- [ ] `ROLE_LABELS` contains all 8 roles with readable names
- [ ] `getWorkspaceForRole` returns correct workspace for all 8 roles

**Estimated complexity:** Medium

---

### M1-T13: Audit Logging Utility

**Description:**
Create a reusable audit logging function that all mutating API routes will call to record actions in the `audit_log` table.

**Implementation details:**

Create `src/lib/audit.ts`:

```typescript
import { db } from "@/lib/db";

interface AuditLogEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  reason?: string | null;
}

/**
 * Log an audit entry.
 *
 * @example
 * await logAudit({
 *   userId: session.user.id,
 *   action: "create",
 *   entityType: "city",
 *   entityId: newCity.id,
 *   newValues: { name: "Karachi", code: "KHI" },
 * });
 *
 * @example
 * await logAudit({
 *   userId: session.user.id,
 *   action: "update",
 *   entityType: "participant",
 *   entityId: participantId,
 *   oldValues: { state: "active" },
 *   newValues: { state: "dropout" },
 *   reason: "Exceeded absence limit",
 * });
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
        reason: entry.reason ?? null,
      },
    });
  } catch (error) {
    // Audit logging should NEVER crash the main operation.
    // Log to console in development for debugging.
    console.error("[AUDIT LOG ERROR]", error);
  }
}

/**
 * Common action constants to avoid typos.
 */
export const AUDIT_ACTIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LOGIN: "login",
  LOGOUT: "logout",
  RESET_PASSWORD: "reset_password",
  CLOSE_ATTENDANCE: "close_attendance",
  MARK_ATTENDANCE: "mark_attendance",
  EDIT_ATTENDANCE: "edit_attendance",
  RECORD_PAYMENT: "record_payment",
  PUBLISH_ANNOUNCEMENT: "publish_announcement",
  CONVERT_ADMISSION: "convert_admission",
  PROVISION_ACCESS: "provision_access",
  DEACTIVATE_USER: "deactivate_user",
} as const;

/**
 * Common entity type constants.
 */
export const ENTITY_TYPES = {
  USER: "user",
  CITY: "city",
  PARK: "park",
  BATCH: "batch",
  GROUP: "group",
  PARTICIPANT: "participant",
  GUARDIAN: "guardian",
  ATTENDANCE_EVENT: "attendance_event",
  ATTENDANCE_RECORD: "attendance_record",
  FEE_EVENT: "fee_event",
  PAYMENT: "payment",
  ADMISSION_APPLICATION: "admission_application",
  ANNOUNCEMENT: "announcement",
} as const;
```

**Design decisions:**
- Audit logging is **fire-and-forget** — errors are caught and logged to console, never thrown
- `oldValues` and `newValues` are serialized to JSON strings (SQLite text column)
- The function is async but callers don't need to `await` it unless they want to ensure it completes before sending a response
- Constants are provided to avoid string typos across the codebase

**Files to create:**
- `src/lib/audit.ts` — New file

**Acceptance criteria:**
- [ ] `logAudit()` creates a record in the `audit_log` table
- [ ] `oldValues` and `newValues` are stored as JSON strings
- [ ] Function never throws — errors are caught and logged to console
- [ ] `AUDIT_ACTIONS` and `ENTITY_TYPES` constants cover all expected operations
- [ ] Works correctly with `null` userId (system actions)
- [ ] TypeScript types are strict — no `any` in the interface

**Estimated complexity:** Small

---

### M1-T14: Seed Script with Demo Users for All 8 Roles

**Description:**
This is a continuation of M1-T02. Ensure the seed script creates a complete minimal dataset that allows testing all 8 role flows, including guardian and student users with proper linked records.

**Prerequisite:** This task should be done after M1-T01 (schema) and can be combined with M1-T02 if preferred. It's listed separately here for clarity.

**Minimal data required:**

```
City: Karachi (code: KHI)
  └── Park: Gulshan Park
        └── Batch: Batch 1 (2025-01-01 to 2025-06-30)
              └── Group: Group A
                    └── Participant: Bilal Ahmed

Guardian: Ahmed Khan
  └── GuardianChild: Bilal Ahmed (linked to participant above)
```

**Users:**
```
super@shabab360.pk     → StaffMeta (super_admin)
program@shabab360.pk   → StaffMeta (program_admin)
city@shabab360.pk      → StaffMeta (city_head, cityId: Karachi)
park@shabab360.pk      → StaffMeta (park_admin, parkId: Gulshan Park)
lead@shabab360.pk      → StaffMeta (park_lead, parkId: Gulshan Park)
murabbi@shabab360.pk   → StaffMeta (murabbi, groupId: Group A)
guardian@shabab360.pk  → Guardian (Ahmed Khan)
student@shabab360.pk   → Participant (Bilal Ahmed)
```

**Also seed an unlinked user:**
```
unlinked@shabab360.pk  → User only (no StaffMeta, no Guardian, no Participant)
```
This user tests the "Access Pending" flow.

**Files to create/modify:**
- `prisma/seed.ts` — Complete implementation (may have been started in M1-T02)

**Acceptance criteria:**
- [ ] All 8 role accounts can log in and get correct role in session
- [ ] `unlinked@shabab360.pk` can log in and lands on Access Pending page
- [ ] Guardian user sees `role: "guardian"` and can access "My Children" menu
- [ ] Student user sees `role: "student"` and can access "My Progress" menu
- [ ] City Head's session has `assignedCityId` pointing to Karachi
- [ ] Park Admin's session has `assignedParkId` pointing to Gulshan Park
- [ ] Murabbi's session has `assignedGroupId` pointing to Group A
- [ ] Seed script is idempotent (can run multiple times safely)
- [ ] `bunx prisma db seed` completes in under 5 seconds

**Estimated complexity:** Medium

---

### M1-T15: Shared Layout Components (PageHeader, LoadingState, ErrorState, EmptyState, ConfirmDialog)

**Description:**
Build the five shared layout components that all module pages will use. These provide consistent UI patterns across the entire application.

#### 15a. PageHeader

**File:** `src/components/layout/page-header.tsx`

**Props:**
```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode; // Right-aligned action buttons
  breadcrumb?: Array<{ label: string; pageId?: string }>;
}
```

**Behavior:**
- Renders the page title as an `h1` with `text-2xl font-semibold`
- Optional description below in `text-muted-foreground`
- Optional breadcrumb trail above the title (uses shadcn `Breadcrumb` component)
- Optional actions slot on the right side (flexbox aligned)
- Breadcrumb items with `pageId` are clickable (call `navigateTo(pageId)`), items without are plain text
- The last breadcrumb item is the current page (not clickable, shown in `text-foreground`)

**Usage:**
```tsx
<PageHeader
  title="Cities"
  description="Manage cities and their assigned heads"
  breadcrumb={[
    { label: "Dashboard", pageId: "dashboard" },
    { label: "Cities" },
  ]}
  actions={<Button>+ Add City</Button>}
/>
```

#### 15b. LoadingState

**File:** `src/components/layout/loading-state.tsx`

**Props:**
```typescript
interface LoadingStateProps {
  message?: string; // Default: "Loading..."
}
```

**Behavior:**
- Centered loading indicator using shadcn `Skeleton` components
- Shows a skeleton card (or multiple skeleton lines) with a pulsing animation
- Optional custom message displayed below the skeleton
- Used as the default loading state in pages that fetch data

**Visual:** Three horizontal skeleton bars of varying widths (70%, 50%, 80%) stacked vertically, with the message below.

#### 15c. ErrorState

**File:** `src/components/layout/error-state.tsx`

**Props:**
```typescript
interface ErrorStateProps {
  error: Error | unknown;
  title?: string; // Default: "Something went wrong"
  message?: string; // Default: error message
  onRetry?: () => void; // Optional retry button
}
```

**Behavior:**
- Centered error display with an icon (lucide `AlertTriangle`), title, and error message
- If `onRetry` is provided, shows a "Try Again" button
- Extracts error message from `Error` objects, or shows "An unexpected error occurred" for unknown errors
- Uses muted colors — not alarming, professional

#### 15d. EmptyState

**File:** `src/components/layout/empty-state.tsx`

**Props:**
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode; // Default: lucide Inbox icon
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Behavior:**
- Centered display for when a list/data view has no items
- Large icon (48x48, muted color), title, description, and optional action button
- Used in tables, lists, and dashboard sections

**Usage:**
```tsx
<EmptyState
  icon={<Trees className="h-12 w-12 text-muted-foreground/50" />}
  title="No parks yet"
  description="Create your first park to get started."
  action={{ label: "Add Park", onClick: () => setOpen(true) }}
/>
```

#### 15e. ConfirmDialog

**File:** `src/components/layout/confirm-dialog.tsx`

**Props:**
```typescript
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string; // Default: "Confirm"
  cancelLabel?: string; // Default: "Cancel"
  variant?: "default" | "destructive"; // Default: "default"
  onConfirm: () => void | Promise<void>;
  loading?: boolean; // Show loading state on confirm button
}
```

**Behavior:**
- Uses shadcn `AlertDialog` component
- Shows title, description, Cancel and Confirm buttons
- `variant: "destructive"` makes the confirm button red (for delete confirmations)
- `loading` shows a spinner on the confirm button and disables both buttons
- On confirm, calls `onConfirm()`. If async, shows loading state until resolved. On resolve, calls `onOpenChange(false)` to close.
- On cancel, just closes the dialog
- Keyboard accessible: Escape closes, Tab navigates buttons

**Files to create:**
- `src/components/layout/page-header.tsx` — New file
- `src/components/layout/loading-state.tsx` — New file
- `src/components/layout/error-state.tsx` — New file
- `src/components/layout/empty-state.tsx` — New file
- `src/components/layout/confirm-dialog.tsx` — New file

**Acceptance criteria:**
- [ ] `PageHeader` renders title, description, breadcrumb, and actions correctly
- [ ] `PageHeader` breadcrumb items with `pageId` navigate on click
- [ ] `LoadingState` shows animated skeleton with optional message
- [ ] `ErrorState` displays error info with optional retry button
- [ ] `EmptyState` shows icon, title, description, and action button
- [ ] `ConfirmDialog` opens/closes correctly, supports destructive variant
- [ ] `ConfirmDialog` shows loading state during async confirm
- [ ] All 5 components use shadcn/ui primitives (no custom CSS)
- [ ] All 5 components are properly typed with TypeScript

**Estimated complexity:** Medium

---

## Dependencies

**None.** This is the foundation module. No other modules need to exist before this one can be built.

**Required packages (already in `package.json`):**
- `next-auth` (v4.24.11) — Authentication
- `zustand` (v5.0.6) — Client state management
- `@tanstack/react-query` (v5.82.0) — Server state (used by later modules)
- `zod` (v4.0.2) — Schema validation
- `react-hook-form` (v7.60.0) — Form management
- `@hookform/resolvers` (v5.1.1) — Zod resolver for react-hook-form
- `@prisma/client` (v6.11.1) — Database ORM
- `lucide-react` (v0.525.0) — Icons
- `framer-motion` (v12.23.2) — Animations
- `clsx` + `tailwind-merge` — Class utilities
- shadcn/ui components (pre-installed): Button, Input, Label, Card, Alert, Avatar, Dialog, AlertDialog, Sheet, Tooltip, Skeleton, Breadcrumb, DropdownMenu, Progress, Separator, ScrollArea, Collapsible

**Package to add:**
- `bcryptjs` + `@types/bcryptjs` — Password hashing (not currently in package.json)

---

## Integration Points

### How Other Modules Will Use Auth

Every API route in subsequent modules will follow this pattern:

```typescript
// src/app/api/admin/cities/route.ts (Module 2)
import { requireRole } from "@/lib/auth/authorize";
import { logAudit } from "@/lib/audit";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // 1. Authorization check
  const authError = await requireRole(["super_admin", "program_admin"]);
  if (authError) return authError;

  // 2. Parse and validate input
  // 3. Business logic
  // 4. Audit log
  await logAudit({
    userId: session.user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: ENTITY_TYPES.CITY,
    entityId: newCity.id,
    newValues: { name, code },
  });

  // 5. Return response
}
```

Every page component will follow this pattern:

```typescript
"use client";

import { useAppStore } from "@/stores/useAppStore";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState } from "@/components/layout/loading-state";
import { ErrorState } from "@/components/layout/error-state";

export function SomePage() {
  const { selectedParkId } = useAppStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["some-data", selectedParkId],
    queryFn: () => fetch(`/api/park/...`).then(r => r.json()),
    enabled: !!selectedParkId,
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Page Title" description="Description" />
      {/* Module-specific content */}
    </div>
  );
}
```

### How Other Modules Will Use Shared Components

| Component | Used By |
|-----------|---------|
| `AppShell` | All authenticated pages (already wrapping via `AppRouter`) |
| `Sidebar` | All authenticated pages (navigation to module pages) |
| `PageHeader` | Every page in every module |
| `LoadingState` | Every page that fetches data |
| `ErrorState` | Every page that can encounter errors |
| `EmptyState` | List views, table views, dashboard sections |
| `ConfirmDialog` | Delete actions, destructive operations in every module |
| `PageRenderer` | Updated by each module to add new page components |
| `useAppStore` | All pages for navigation, context selection |
| `requireRole` | All API routes for authorization |
| `requireCityScope` | City-scoped API routes (Modules 2, 4, 5, 7, 8, 9) |
| `requireParkScope` | Park-scoped API routes (Modules 3, 4, 5, 6) |
| `logAudit` | All mutating API routes |
| `hasRole` | Client-side conditional UI rendering |
| `ROLE_LABELS` | User displays, role badges |
| `getWorkspaceForRole` | Layout decisions |

### How to Register New Pages in PageRenderer

When a new module is built, it adds its page components to `src/components/layout/page-renderer.tsx`:

```typescript
// In page-renderer.tsx, add:
import { CitiesPage } from "@/components/modules/admin/cities-page";
import { ParksPage } from "@/components/modules/admin/parks-page";

// In the pages record, replace placeholders:
"cities": CitiesPage,
"parks": ParksPage,
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] **All 8 roles can log in** using their seeded credentials
- [ ] **Each role lands in the correct workspace** (admin staff → Admin workspace with admin menu, park staff → Park workspace with park menu, guardian → Guardian portal, student → Student portal)
- [ ] **First-login password reset works** — users with `mustResetPwd: true` are forced to reset before accessing the app
- [ ] **Unlinked accounts see Access Pending** — users with no role/staff_meta/guardian/participant see the pending page
- [ ] **Sidebar shows correct menu per role** — menu items are filtered by role, sections with no visible items are hidden
- [ ] **Client navigation works without page reload** — clicking sidebar items updates the view instantly via Zustand
- [ ] **Browser back/forward buttons work** — history state is managed correctly

### Security Requirements

- [ ] Passwords are bcrypt-hashed, never stored in plain text
- [ ] Inactive users (`isActive: false`) cannot authenticate
- [ ] Invalid login attempts return a generic error (no information leakage about whether email exists)
- [ ] JWT sessions expire after 24 hours
- [ ] Authorization is enforced server-side in all API routes

### Technical Requirements

- [ ] `bun run lint` passes with no errors
- [ ] `bun run build` compiles successfully
- [ ] TypeScript has no `any` types in new code
- [ ] All components follow the `"use client"` + react-hook-form + shadcn/ui pattern
- [ ] No indigo/blue colors in styling
- [ ] Mobile-responsive at 320px, 375px, 768px, 1024px, 1440px breakpoints
- [ ] Seed script is idempotent and completes in under 5 seconds

---

## Files to Create/Modify

### New Files

| # | File Path | Purpose |
|---|-----------|---------|
| 1 | `src/lib/auth.ts` | NextAuth configuration (authOptions, providers, callbacks) |
| 2 | `src/lib/auth/authorize.ts` | Server-side authorization helpers (requireRole, requireCityScope, requireParkScope) |
| 3 | `src/lib/auth/session.ts` | Client-side session helpers (hasRole, ROLE_LABELS, getWorkspaceForRole) |
| 4 | `src/lib/audit.ts` | Audit logging utility (logAudit, AUDIT_ACTIONS, ENTITY_TYPES) |
| 5 | `src/types/next-auth.d.ts` | NextAuth type extensions for custom session fields |
| 6 | `src/stores/useAppStore.ts` | Zustand store (navigation, context selection, UI state) |
| 7 | `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API route handler |
| 8 | `src/components/modules/auth/login-page.tsx` | Login page component |
| 9 | `src/components/modules/auth/reset-password-page.tsx` | Password reset page component |
| 10 | `src/components/modules/auth/access-pending-page.tsx` | Access pending page component |
| 11 | `src/components/layout/app-shell.tsx` | Main app shell (sidebar + content) |
| 12 | `src/components/layout/app-router.tsx` | Top-level client-side router |
| 13 | `src/components/layout/page-renderer.tsx` | Page ID → component mapping |
| 14 | `src/components/layout/sidebar.tsx` | Role-aware sidebar navigation |
| 15 | `src/components/layout/mobile-top-bar.tsx` | Mobile top bar with hamburger + avatar |
| 16 | `src/components/layout/page-header.tsx` | Reusable page header with breadcrumb + actions |
| 17 | `src/components/layout/loading-state.tsx` | Skeleton loading state |
| 18 | `src/components/layout/error-state.tsx` | Error display with retry |
| 19 | `src/components/layout/empty-state.tsx` | Empty data state with action |
| 20 | `src/components/layout/confirm-dialog.tsx` | Confirmation dialog (default + destructive) |
| 21 | `prisma/seed.ts` | Database seed script with demo users |

### Modified Files

| # | File Path | Changes |
|---|-----------|---------|
| 1 | `prisma/schema.prisma` | Replace with full master plan schema (all models) |
| 2 | `src/app/page.tsx` | Replace with `<AppRouter />` |
| 3 | `src/app/layout.tsx` | Update metadata (title, description, icons for Shabab360) |
| 4 | `package.json` | Add `bcryptjs`, `@types/bcryptjs`; add `prisma.seed` config |
| 5 | `.env` | Add `NEXTAUTH_SECRET` and `NEXTAUTH_URL` |

### Total: 21 new files, 5 modified files

---

## Task Execution Order

Tasks should be executed in this order due to dependencies:

```
M1-T01 (Schema) ──→ M1-T02/T14 (Seed) ──→ M1-T03 (NextAuth) ──→ M1-T04 (Role Resolution)
                                                                          │
M1-T08 (Zustand Store) ──────────────────────────────────────────────────┤
                                                                          │
M1-T15 (Shared Components) ──────────────────────────────────────────────┤
                                                                          │
                                                  M1-T09 (App Shell) ────┤
                                                  M1-T10 (Sidebar) ──────┤
                                                                          │
                                                  M1-T05 (Login) ────────┤
                                                  M1-T06 (Reset Pwd) ────┤
                                                  M1-T07 (Access Pending)┤
                                                  M1-T11 (Page Router) ──┤
                                                  M1-T12 (Auth Helpers) ─┤
                                                  M1-T13 (Audit Log) ────┤
```

**Recommended implementation sequence:**
1. **M1-T01** → **M1-T02/T14** (database first)
2. **M1-T03** → **M1-T04** (auth layer)
3. **M1-T08** (state management)
4. **M1-T15** (shared components — can be done in parallel with 2-3)
5. **M1-T09** → **M1-T10** (shell + sidebar — depends on M1-T08, M1-T15)
6. **M1-T05** → **M1-T06** → **M1-T07** (auth pages — depends on M1-T03)
7. **M1-T11** (page router — depends on all above)
8. **M1-T12** → **M1-T13** (utilities — can be done anytime after M1-T03)