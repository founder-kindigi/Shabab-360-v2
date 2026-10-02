# ATT01-R02 — role dashboard and attendance presentation repair

Assigned to: Gemini. Module: ATT01. Status: ready. Base: current `v2` shared working tree; preserve unrelated changes. Depends on: ATT01-R01 accepted on 2026-09-17.

## Outcome and boundary

Repair the mobile role experience reported on 2026-09-17 while preserving the established PWA design.

- Park Lead/Park Admin dashboard renders only returned real data; it never displays fake parks, groups, students, manager names, counts, or percentages.
- Assigned Murabbi sees only the actual assigned park/group and an attendance action only when the server identifies a real selectable/scheduled session.
- Unassigned Murabbi sees their assigned park and a clear `No group assigned yet` state; no fallback group, roster, student, phone, call, WhatsApp, or attendance action.
- Muawin has a functioning limited home screen for approved content access or a truthful empty/error state. It has no attendance, park operational data, group roster, participant, phone, call, or WhatsApp access.
- Display **Leave** everywhere attendance status `excused` is presented to an operator. Keep the status code/payload value `excused` unless Astra publishes a revised API contract.

Do not invent endpoints, alter authorization, access private workbook data, modify APIs/Prisma/migrations/packages, reset/import a database, or redesign unrelated modules. Do not add demo fallbacks. Keep the current mobile gradient, typography, navigation, cards, and bottom-sheet conventions.

## Minimal inputs

- [ATT01-R01 contract](ATT01_ROLE_REPAIR_BACKEND.md) after Astra acceptance.
- Current `mobile-park-dashboard.tsx`, `mobile-murabbi-dashboard.tsx`, `mobile-attendance-page.tsx`, PWA shell, and relevant existing tests.
- Exact references in `docs/pwa screens/` for Park/Murabbi attendance. The role captures from 2026-09-17 define the reported failures; they are not sample data.

## Accepted server contract

- `GET /api/park/dashboard` returns only real, scoped data: `park`, `batch`, `todayDate`, `todayAttendance`, `groupBreakdown`, and `events`. `todayAttendance.rate` is the date-accurate percentage for a `Today Att.` card. Do not substitute the weekly summary rate.
- An unassigned Murabbi may receive their assigned-park dashboard context, but receives no group, participant, roster, contact, or attendance-event data. Render the explicit no-group state.
- `GET /api/park/attendance/parks` is the scoped attendance entry point for an assigned Murabbi. Do not send a Murabbi through the general `/api/admin/parks` directory.
- All attendance write surfaces reject inactive groups, inactive batches, and dates outside the batch calendar. Use real returned/scheduled sessions only; never manufacture an attendance session client-side.
- Persisted status remains `excused`; only the operator-visible text becomes `Leave`.

## Work and verification

1. Replace all data fallbacks in Park and Murabbi dashboards with loading, API-error, no-scope, and empty-session states. Do not render controls for unavailable data.
2. Add the Muawin home route in the PWA shell and a narrow component that uses only approved content access. Cover loading, empty, error, and denied states.
3. Make the Murabbi attendance action route to the real selected/scheduled date supplied by ATT01-R01; show a useful no-scheduled-class state otherwise.
4. Map every attendance-facing `excused` label/button/badge in the scoped operator UI to `Leave`, without changing the internal code.
5. Add focused interaction tests for Park Lead, assigned Murabbi, unassigned Murabbi, and Muawin. Run them plus scoped lint/typecheck/diff check. Include browser screenshots only if a local runtime is available.

## Return to Astra

Exact changed files, commands/exits/test totals, reference comparison limits, API-contract assumptions, and any remaining inaccessible screen. Do not self-approve or release.
