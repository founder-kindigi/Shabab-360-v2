# Task 5-a: Server-side Pagination, Sorting, Filtering

## Summary
Enhanced 4 main list API routes with consistent server-side pagination, sorting, and filtering.

## Changes

### Backend APIs
1. **Students** (`/api/admin/students`) - Added sort/order params, gender filter, robust page/pageSize parsing, totalItems
2. **Guardians** (`/api/admin/guardians`) - Added sort/order params, cnic to search, robust parsing, totalItems
3. **Users** (`/api/admin/users`) - Full pagination added (was raw array before), sort/order params, totalItems
4. **Audit Log** (`/api/admin/audit-log`) - Added sort/order params, normalized to totalItems format

### Frontend Pages
- students-page, guardians-page, audit-log-page: Updated Pagination types and display refs from `.total` to `.totalItems`
- users-page: Full pagination support (query rewrite, Pagination type, page state, controls)
- access-provisioning-page: Updated to extract `.data` from paginated response

### Standard Response Format
```json
{ "data": [...], "pagination": { "page": 1, "pageSize": 20, "totalItems": N, "totalPages": M } }
```

### Lint: Clean
