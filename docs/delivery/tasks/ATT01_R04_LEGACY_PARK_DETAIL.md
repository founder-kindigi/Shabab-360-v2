# ATT01-R04 — legacy Park Detail route repair

Assigned to: Sonnet. Module: ATT01. Status: ready. ATT01-R03 was reviewed and the owner-authorized local rebuild completed successfully on 2026-09-17. Base: current `v2` shared working tree; preserve unrelated changes.

## Objective

Repair the legacy Park Detail route reached through the PWA bottom **Parks** navigation. It currently shows stale dashboard content such as fixed student counts, all-time rates, evaluation cards, and placeholder names. The route is visible in the attached owner screenshot and must not contradict the real Park Lead dashboard.

## Boundary

- First trace `pwa-app.tsx`, `mobile-park-detail-page.tsx`, and the dashboard tab components to identify the exact route and caller.
- Preserve Super Admin navigation. Staff must not gain any data or capabilities.
- Use only real authorized API data. If the legacy screen has no reviewed API contract, show a truthful unavailable/empty state or route safely to the accepted Park Lead dashboard; do not invent data or reuse generic admin endpoints for scoped staff.
- Do not alter APIs, authorization, Prisma/schema/migrations, package files, workbook data, or database state.

## Required work

1. Remove or replace every fabricated dashboard value seen on the legacy Park Detail screen.
2. Ensure Park Lead and Murabbi paths cannot reach a stale generic Park Detail dashboard.
3. Add focused navigation/render tests covering Super Admin, Park Lead, and an unavailable/no-data response.
4. Preserve the accepted ATT01-R02 dashboards and visual system.

## Required checks

Focused tests, scoped lint, `npx tsc --noEmit`, and scoped `git diff --check`. Run a browser check if a local runtime is available.

## Return to Astra

Exact route traced, changed files, commands/exits, role behavior, remaining inaccessible states, and reference-comparison limit. Do not self-approve or claim release readiness.
