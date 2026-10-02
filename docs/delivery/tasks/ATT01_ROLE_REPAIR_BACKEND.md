# ATT01-R01 — attendance data and server contract repair

Assigned to: Command Code (DeepSeek/GLM). Module: ATT01. Status: accepted on 2026-09-17. Base: current `v2` shared working tree; preserve all unrelated changes. Depends on: none.

## Outcome and boundary

Repair the confirmed server/data defects behind the 2026-09-17 role checks, without a production action or a local database write:

- Imported attendance metric/header cells must never become participants.
- Establish the exact cause of the assigned-Murabbi attendance failure and repair any server-side authorization, date/session, or response-contract defect.
- Define the actual scoped Park Dashboard response needed by the existing mobile screen: only the caller's authorized park, real group counts, real active participant count, a real batch, and date-accurate session/attendance data.
- Keep unassigned Murabbis denied group attendance and roster data. Muawin remains denied attendance and group data.
- Preserve `excused` as the stored compatibility value for historical records. This packet must not rename a Prisma enum or create a migration. The approved user-facing label is **Leave** and belongs to the frontend packet.

Do not change schemas, migrations, generated clients, packages, live/PostgreSQL databases, accounts, UI components, or Team Access provisioning. Do not reset/import `prisma/dev.db`. Do not place workbook names, phones, emails, or rows in reports or test fixtures.

## Minimal inputs

- [ATT01 task](ATT01.md), owner decisions in `AGENTS.md`, and the current role findings.
- `src/lib/attendance/lahore-refresh/workbook.ts`, `manifest.ts`, their tests, and the refresh dry-run model.
- `src/app/api/park/dashboard/route.ts`, `src/app/api/park/attendance/**`, `src/lib/attendance/session-list.ts`, and focused tests.
- Synthetic workbook rows only. Treat status/summary labels such as `Present`, `Absent`, `Late`, `Leave`, `Attendance Percentage`, `Strength`, and `Total Present` as non-participant input.

## Contract and invariants

- Existing persisted attendance statuses stay `present | absent | late | excused`.
- A Murabbi may list/create/read/mutate attendance only for its assigned active group and only for a scheduled class date inside the active batch's inclusive range. The actual observed reason for a failed mark must be represented by a focused route test.
- An unassigned Murabbi gets a deliberate 403/empty scoped result as appropriate, before a data lookup. A Muawin is denied attendance/group APIs.
- Park Lead/Park Admin get only their assigned park. Dashboard totals must have no sample fallback contract and must be date-explicit.
- Import repair must first provide a read-only, aggregate-only diagnosis and a proposed repair/refresh plan. Any deletion/re-import remains an Astra-reviewed, backup-gated, owner-executed operation.

## Work and verification

1. Trace the current workbook parser with a synthetic fixture that includes real-looking group metadata plus all listed metric/header labels. Fix the parser/manifest logic so those labels cannot produce a participant or attendance record. Add a regression test.
2. Trace the exact route sequence reached by an assigned Murabbi using the current attendance screen. Add a test that exercises a valid scheduled date and a denial/invalid-date case. Fix only confirmed server defects.
3. Audit `GET /api/park/dashboard`; add a focused role/scope/date-accuracy test and make the smallest server correction required for the frontend contract.
4. Write `docs/delivery/reports/ATT01_R01_DATA_DIAGNOSTIC.md`: aggregate-only counts before/after the parser correction, the proposed local repair mechanism, backup/rollback steps, and explicit statement that no database was changed.
5. Run focused parser/manifest/dashboard/attendance route tests, scoped lint, `npm run typecheck`, and scoped `git diff --check`.

## Return to Astra

Exact changed files, commands/exits/test totals, the observed Murabbi failure cause, API response examples with synthetic values only, the diagnostic report, and remaining risks. Do not self-approve or perform the local repair.
