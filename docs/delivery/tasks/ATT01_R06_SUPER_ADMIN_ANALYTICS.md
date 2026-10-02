# ATT01-R06 — Super Admin mobile analytics controls

Assigned to: Gemini. Module: ATT01. Status: blocked until ATT01-R05 accepts the attendance write path. Base: current `v2` shared working tree; preserve unrelated changes.

## Owner decision

Attendance status `excused` stays the internal/API value. Operator-visible attendance UI uses **Excuse** (not Leave).

## Confirmed defects

- In `mobile-home-dashboard.tsx`, Today and Trend only toggle button styling. The content remains the same park list.
- Students and Murabbis only change the heading. The UI does not use the already-returned `byMurabbi` data.

## Work

1. Make **Students** render real per-park student attendance from the existing home-analytics response.
2. Make **Murabbis** render real `byMurabbi` data, with truthful empty/loading/error states.
3. Make **Trend** request and present a truthful date-range aggregate using the existing API contract. Do not label an aggregate as today and do not invent a time series if the server does not return one.
4. Replace the ATT01 operator-facing display labels introduced as `Leave` with **Excuse**, while retaining the `excused` code. Scope the change to attendance operator screens, their tests, and any directly shared print/edit/heatmap labels.
5. Do not alter APIs, authorization, database/schema/migrations, packages, or accepted Park/Murabbi/Muawin role fixes.

## Checks

Add focused interaction tests for all four tab combinations, loading/error/empty states, and the Excuse wording. Run focused tests, scoped lint, typecheck, and `git diff --check`.
