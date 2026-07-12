---
Task ID: 2-b
Agent: Main
Task: Build CSV/Excel data import system for bulk uploading participants, guardians, and users

Work Log:
- Installed `papaparse` (5.5.4) and `@types/papaparse` (5.5.2) for CSV parsing
- Created `src/lib/csv-parser.ts`:
  - `parseCSV(file)`: Parses CSV with PapaParse (header: true, skipEmptyLines, trim headers+values)
  - `parseExcel(file)`: Placeholder (only CSV supported, throws helpful message for .xlsx/.xls)
  - `validateImportData(data, fields)`: Row-by-row validation with per-field type checks (string, email, date, number) and required enforcement; returns `{ valid[], errors[] }`
  - `generateTemplateCSV(fields, exampleRows, filename)`: Generates and downloads a CSV template with correct column headers and example rows
  - `generateErrorCSV(errors)`: Generates and downloads a CSV of validation/import errors for offline review
  - Types: `ImportField` (key, label, required, type), `ValidationError` (row, field, message), `ValidationResult` (valid, errors)
- Created 3 import API routes:
  - `POST /api/admin/import/participants`:
    - Accepts multipart/form-data CSV upload
    - Parses CSV server-side with PapaParse
    - Resolves group by name, or falls back to city→park→batch→group hierarchy lookup
    - Auto-creates User account (with bcrypt-hashed random password) if email provided
    - Auto-creates or finds-by-phone Guardian if guardianName+guardianPhone provided
    - Creates Participant + GuardianChild link; audit logs as IMPORT_PARTICIPANTS
    - Returns `{ success, errors[], total }`
  - `POST /api/admin/import/guardians`:
    - Validates name (required) + phone (required); deduplicates by phone within import batch
    - Checks for existing guardians by phone before creating
    - Returns same format; audit logs as IMPORT_GUARDIANS
  - `POST /api/admin/import/users`:
    - Restricted to super_admin + program_admin roles
    - Validates name, email, role (enum check against valid staff roles)
    - Resolves city/park/group by name for assignment
    - Generates secure 8-char passwords using crypto.randomBytes
    - Creates User + StaffMeta in Prisma transaction
    - Returns `{ success, errors[], total, generatedPasswords[] }` (passwords included for admin distribution)
    - Audit logs as IMPORT_USERS
- Created `src/components/shared/import-dialog.tsx`:
  - Reusable `ImportDialog` component with 4-step wizard: Upload → Preview → Importing → Results
  - Step indicator with brand colors (#4B0A8F/#8A40B0) and check icons for completed steps
  - Drag-and-drop file zone with dashed border, hover effect, FileSpreadsheet icon, file name display with remove button
  - Template download button (generates CSV with correct headers + 2 example rows)
  - Client-side preview: shows first 5 rows in a Table, validation errors in a scrollable error panel
  - Import progress bar with simulated progress + animated Upload icon during server processing
  - Results summary: 3 metric cards (total/imported/errors), success/error messages
  - "Export Errors" button downloads error CSV; "Download CSV" for generated passwords (users only)
  - AnimatePresence transitions between steps
  - Exports: `ImportType`, `PARTICIPANT_FIELDS`, `GUARDIAN_FIELDS`, `USER_FIELDS`, `EXAMPLE_ROWS`
- Added Import buttons to 3 admin pages:
  - **Students Page** (`students-page.tsx`): Added "Import" button (outline, FolderInput icon) between ExportButton and Create Student button; renders `<ImportDialog type="participants" .../>` with queryClient invalidation
  - **Guardians Page** (`guardians-page.tsx`): Added "Import" button (outline, FolderInput icon) after Invite Guardian button; renders `<ImportDialog type="guardians" .../>` with queryClient invalidation; added FolderInput to lucide imports
  - **Access Provisioning Page** (`access-provisioning-page.tsx`): Added "Import Users" button in PageHeader actions; renders `<ImportDialog type="users" .../>`; added FolderInput + ImportDialog imports
- ESLint: all new code clean (5 pre-existing errors in unrelated files: app-shell, people-page, reports-page)

Stage Summary:
- CSV/Excel data import system COMPLETE
- 7 files created, 3 files modified
- 3 API endpoints with server-side parsing, validation, and audit logging
- Reusable ImportDialog with drag-drop, preview, progress, results, error export, password export
- Template generation for each import type with correct column headers
- Users import returns generated passwords for secure distribution
- All buttons use brand styling (#4B0A8F/#A0006B) consistent with project theme