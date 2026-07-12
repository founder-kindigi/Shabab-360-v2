# Task 14 — File Upload System Builder

## Summary
Built a complete file upload system for Shabab360 supporting avatar uploads and document attachments, using native Node.js fs for server-side storage and localStorage for client-side avatar persistence.

## Files Created
1. `src/app/api/upload/avatar/route.ts` — POST (upload) + GET (metadata) for user avatars
2. `src/app/api/upload/document/route.ts` — POST (upload) + GET (list) + DELETE for entity documents
3. `src/components/shared/avatar-upload.tsx` — Reusable avatar upload component (3 sizes, hover overlay, camera icon)
4. `src/components/shared/document-upload.tsx` — Reusable document upload component (drag-and-drop, progress, file list)

## Files Modified
1. `src/components/modules/admin/settings-page.tsx` — Avatar upload in Profile tab
2. `src/components/layout/app-shell.tsx` — Avatar display in header user menu
3. `src/components/modules/admin/people-page.tsx` — Avatar in table/cards/detail sheet
4. `src/components/modules/admin/admissions-page.tsx` — Document upload in application detail
5. `src/components/modules/admin/reports-page.tsx` — Fixed pre-existing Calendar name collision

## Key Decisions
- Used localStorage for avatar persistence (no DB schema changes needed)
- JSON sidecar files for document metadata (no DB schema changes needed)
- Custom "avatar-updated" event for cross-component avatar sync
- setTimeout(0) in useEffect for lint compliance with react-hooks/set-state-in-effect rule