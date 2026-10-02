# MTI-01 Gemini frontend verification — 2026-09-29

Status: **not ready for DeepSeek cleanup or release**. This is verification of the current working-tree candidate, not an implementation or approval. No source files were changed by this review.

## Blocking findings

1. `npm run typecheck` fails: missing `ScrollArea` import in `registration-form-builder-page.tsx`; unsupported `children`/`icon` props on `PageHeader` and unsupported `action` prop on `EmptyState` in `registration-forms-page.tsx`; and three new `PageId` keys missing from the required `breadcrumb-nav.tsx` title map. `npm run lint` fails on the undefined `ScrollArea` JSX (plus six existing script warnings).
2. `app-shell.tsx` declares lazy imports, titles and known IDs but has no render cases for the three registration pages. `sidebar.tsx` adds a navConfig entry but does not add the page to any authorized role's `roleNavPages`, its icon map or a confirmed translation key. Consequently the claimed portal navigation is not connected.
3. The create dialog requires `selectedCityId` but offers no city selector. A central administrator without a previously selected city cannot create the first form; the owner-city configuration promised by the approved blueprint is unavailable there.
4. Builder `Publish` validates local editor values but sends only the server's current version; it never saves pending local edits first or warns that they are unsaved. This can publish older saved copy while the UI appears to publish the visible draft. The promised draft preview is absent. An error fetching a form leaves an indefinite loading view.
5. The questions editor displays a drag handle but does not reorder fields. It does not expose number bounds, and changing a field type can retain incompatible options or limits, causing server rejection. Comma-separated options and gender values are not trimmed before save. The public form only checks required fields before review; server validation/eligibility errors return a generic toast rather than actionable field feedback.

## Checks

- `npm run typecheck`: failed with five errors in new frontend/integration files.
- `npm run lint`: failed with one new error (`ScrollArea` undefined) and six pre-existing script warnings.
- `npm test`: ran many existing suites without a reported failure, but stopped producing output and did not return a final result; interrupted after an extended idle period. No full-suite pass is claimed. There are no new component tests for the form UI.
- `npm run build`: failed before application compilation because existing `next/font/google` Geist and Geist Mono requests could not reach Google Fonts. This is an environment/dependency fetch failure, not proof of source build success.
- Desktop/mobile browser behavior was not verified because the portal route integration and compilation fail. No production data or deployment touched.

## Next action

Return this packet to Gemini for a bounded correction pass. Require exact changed-file report, focused tests for list/builder/public and navigation states, successful lint/typecheck, then repeat build and full-suite checks. Only after Astra re-verifies the integrated candidate should DeepSeek perform its required clean-code pass.
