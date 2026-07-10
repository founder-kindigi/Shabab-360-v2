# Task 3-b: Users Management Module - Work Record

## Files Created
1. `/home/z/my-project/src/app/api/admin/users/route.ts` - GET (list with filters) + POST (create user)
2. `/home/z/my-project/src/app/api/admin/users/[id]/route.ts` - PATCH (update) + DELETE (soft-delete)
3. `/home/z/my-project/src/components/modules/admin/users-page.tsx` - Full frontend component

## Files Modified
1. `/home/z/my-project/src/components/layout/app-shell.tsx` - Added UsersPage import, route case, removed from comingSoonIcons, added to showPageHeader exclusion

## Key Design Decisions
- GET API supports `?role=&status=&search=` query params for server-side filtering
- POST creates User + StaffMeta in a Prisma `$transaction` for atomicity
- PATCH uses `upsert` pattern for StaffMeta (handles users who may not have a StaffMeta record)
- DELETE is soft-delete (sets `isActive=false` on both User and StaffMeta)
- Self-deactivation is blocked on both PATCH and DELETE
- Password hashing uses bcryptjs with cost factor 12
- Frontend follows exact CitiesPage pattern: PageHeader, search, filters, table+cards, dialogs, mutations
- Role badges are color-coded: emerald (admin), sky (city), amber (park), purple (murabbi)
- Cascading dropdowns: role → city → park → group (each level enables the next)
- Groups dropdown fetches via batches API (since groups API needs batchId)