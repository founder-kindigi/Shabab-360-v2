# Task 8-9: Batches & Groups CRUD Modules

**Agent:** Main
**Status:** Complete

## Work Done

### Backend API Routes (6 files)

1. **`/api/admin/parks/route.ts`** — GET endpoint for park dropdowns
   - Role-scoped: super_admin/program_admin see all parks, city_head sees their city's parks, park staff sees only their assigned park
   - Includes city name for display in dropdowns

2. **`/api/admin/batches/route.ts`** — GET + POST
   - GET: Fetches batches with park.city info and _count.groups. Supports `?parkId=xxx` filter. Full role scoping (HQ → all, city_head → own city, park_staff → own park)
   - POST: Creates batch with Zod validation (name min 2, parkId required, startDate required ISO, endDate optional). Validates park access before creation. Audit logged.

3. **`/api/admin/batches/[id]/route.ts`** — GET + PATCH + DELETE
   - GET: Single batch with park.city info, scope-checked
   - PATCH: Updates name/startDate/endDate/isActive with Zod validation, audit logged
   - DELETE: Soft-delete (isActive: false), audit logged

4. **`/api/admin/groups/route.ts`** — GET + POST
   - GET: Fetches groups with batch.park info and _count.participants. Supports `?batchId=xxx` filter. Murabbi only sees their own group.
   - POST: Creates group (name min 2, batchId required). Murabbi cannot create. Validates batch access. Audit logged.

5. **`/api/admin/groups/[id]/route.ts`** — GET + PATCH + DELETE
   - GET: Single group with batch.park.city info, scope-checked
   - PATCH: Updates name/isActive. Murabbi can edit own group name only. Audit logged.
   - DELETE: Soft-delete. Murabbi cannot delete. Audit logged.

### Frontend Pages (2 files)

6. **`batches-page.tsx`** — Full CRUD page
   - Search filter (name, park, city)
   - Desktop table + mobile card views
   - Create Dialog: Batch Name, Park Select dropdown (fetched from /api/admin/parks), Start Date, End Date (optional)
   - Edit Dialog: name, dates (park is read-only)
   - Delete confirmation dialog (soft-delete)
   - Role-aware: city_head/park_lead/park_admin see Create button, murabbi does not
   - Emerald theme, TanStack Query, sonner toasts, loading/empty states

7. **`groups-page.tsx`** — Full CRUD page
   - Search filter (name, batch, park)
   - Desktop table + mobile card views
   - Create Dialog: Group Name, Batch Select dropdown (fetched from /api/admin/batches)
   - Edit Dialog: name only (batch is read-only)
   - Delete confirmation (soft-delete)
   - Murabbi: no Create, no Delete, can only Edit their own group name
   - Shows participant count per group
   - Emerald theme, TanStack Query, sonner toasts, loading/empty states

### App Shell Registration

8. **`app-shell.tsx`** — Updated
   - Added `case "admin-batches": return <BatchesPage />;`
   - Added `case "admin-groups": return <GroupsPage />;`
   - Added both to `showPageHeader` exclusion list (they have their own PageHeader)

### Lint
- `bun run lint` passes with zero errors
- Dev server compiles successfully (no type errors)