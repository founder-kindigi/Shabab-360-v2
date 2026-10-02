# MTI-01 Gemini frontend verification — second pass, 2026-09-29

Status: improved but **not yet ready for DeepSeek cleanup or final acceptance**. This verifies Gemini's bounded correction in the current shared working tree. The first-pass report remains historical; this file records current findings.

## Passed

- `npm run typecheck`: passed.
- `npm run lint`: passed with zero errors and six existing unused-disable warnings in scripts.
- Focused `npx vitest run src/components/layout/sidebar.test.ts src/lib/registration-forms/definition.test.ts src/app/api/admin/cities/route.test.ts`: 11 tests passed across three files.
- Static inspection confirms the three registration cases render in `AppShell`, and the sidebar includes the list page for Super Admin, Program Admin and City Head.

## Remaining issues

1. **Preview is not a draft preview.** `registration-form-builder-page.tsx` opens `/register/forms/[slug]?preview=true`, but the public page and `GET /api/public/forms/[slug]` do not process `preview`. A draft shows 404; a published form shows its current live revision, not unsaved or saved draft changes. Remove the misleading Preview action until a scoped, non-submitting draft-preview contract exists, or implement that contract with Astra's API/security review.
2. **City Head create flow is incomplete.** The dialog fetches `GET /api/admin/cities`, which allows only Super Admin/Program Admin. City Head receives 403 and an empty dropdown. It initializes from `selectedCityId`, which may be absent; derive the assigned city from an authorized city-scoped context without exposing arbitrary city selection. Also show a load/error state rather than converting an API denial to `[]`.
3. **Sidebar label is not translated.** `nav.registrationForms` is in `sidebar.tsx` but absent from both `src/lib/i18n/en.ts` and `ur.ts`; add both keys. The nav icon falls back to the generic dashboard icon.
4. **Editor state can be lost on refetch.** The builder's `[data]` effect resets all local inputs and `hasUnsavedChanges` whenever the query refetches, including after a save or background refresh. It can replace edits made while a request was in flight. Update state only when loading a different form or intentionally accepting a saved server version; preserve visible unsaved edits and handle 409 explicitly.
5. The public page remains a client page; its `?preview=true` flag is ignored. The dynamic client validation is improved, but there are still no focused component tests for draft edit/publish, city-scoped creation, closed/invalid public form, or idempotent submission retry. No desktop/mobile browser verification was performed.

The prior full `npm test` run did not finish after extended idle time and was interrupted; it cannot be reused as a pass for this changed candidate. `npm run build` was attempted and failed before application compilation because existing `next/font/google` Geist and Geist Mono requests could not reach Google Fonts. No production data, migrations or deployment were touched by this verification.
