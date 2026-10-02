# MTI-01 Gemini frontend verification — third pass, 2026-09-29

Status: **one more functional correction required before DeepSeek cleanup**. This is a read-only verification of the current shared candidate.

## Verified improvements

- Misleading `?preview=true` button removed.
- `AppShell` render cases, sidebar role inclusion and English/Urdu nav labels exist.
- `npm run typecheck` passes. Focused tests from the previous candidate covered sidebar, definition and city API (11 passed); they do not cover the changed City Head fallback or editor state.

## Remaining functional defects

1. City Head form creation derives the owning city from the first active park returned by `GET /api/admin/parks` after `/api/admin/cities` denies the role. A valid City Head assigned to a city with no active parks gets `Failed to load city context` and cannot create a form, although `POST /api/admin/registration-forms` permits the assigned city. Use an authorized assigned-city identity/context or a scoped city endpoint; do not infer city ownership from park existence. The fallback and `formCityId` state were also accidentally duplicated in the parent `RegistrationFormsPage` and should be removed there.
2. Builder refetch protection is incomplete. `loadedVersion` is not tied to `selectedFormId`, so switching between two forms with the same version can leave the previous form's content visible. `patchMutation.onSuccess` sets `hasUnsavedChanges` false unconditionally: edits made after Save was clicked but before its response can then be overwritten by the version-refetch effect. Track form identity and the submitted editor snapshot, and do not clear a newer dirty state. Cover this with a focused component test.
3. The City Head fallback requires `organisation.view` on `/api/admin/parks`, while the form API requires `admissions.manage`; these capabilities may differ. Do not make form creation depend on unrelated park access. A failed city fetch must remain an error rather than an empty choice list.

`npm run lint` passes with zero errors and six existing script warnings. Full-suite and browser/mobile checks have not been rerun for this candidate. Prior builds were blocked by existing Google Fonts network access; no new build success is claimed. No live form was published or deployed.
