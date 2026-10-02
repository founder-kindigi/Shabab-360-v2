# Gemini corrections — O01 parks and directories

Work only in the isolated candidate
`D:/iBuild/Shabab-360-c0-20260911/n01-notifications-20260914`. Do not edit the
shared `v2` checkout. Read `AGENTS.md`, `docs/delivery/tasks/O01.md`,
`docs/delivery/reports/ASTRA_O01_GEMINI_REVIEW.md` and the two original Gemini
packets first.

## Required changes

1. In `mobile-parks-page.tsx`, add a city select only inside the existing Add
   Park bottom sheet for `super_admin` and `program_admin`.
   - Load active cities from `GET /api/admin/cities`; its response is
     `{ data: City[] }`.
   - Require a selected city before sending a POST for either HQ role.
   - Send `{ name, address, cityId }` for HQ. Do not send cityId for a City
     Head; the server derives it.
   - Preserve the existing mobile visual language and bottom-sheet layout.
   - Keep all entered fields and the sheet open after 400/403/404/409/503 or a
     network failure. Show the server error string when supplied.
   - On 201 only, clear fields, close the sheet and refetch the parks list.
   - Keep Add unavailable without `organisation.manage`.

2. Correct the submitted component tests. The current assertions for People
   and Students do not match the actual rendered loading/empty/error states.
   Add real interaction tests for:
   - HQ cannot submit before choosing a city.
   - HQ POST contains selected cityId.
   - City Head POST omits cityId.
   - 201 refetches and clears/closes the sheet.
   - Failed POST preserves entered data and shows the API error.
   - Parks loading, empty, denied and error states.
   - Both directories loading, empty, error, denied and safe data responses.

3. Limit directory changes to `people-page.tsx`, `students-page.tsx` and
   directly related tests/types. Revert the submitted
   `participant-detail-sheet.tsx` change; it was not part of this packet.

4. Do not edit API routes, Prisma, account flows, import flows or unrelated UI.
   Do not use fallback/sample data. Do not deploy, merge, push, generate Prisma
   clients, access `.env`, a real database or real accounts.

## Return

Return the exact candidate diff and the exit results for focused tests, lint,
typecheck and build. Do not claim browser verification unless it actually ran.
