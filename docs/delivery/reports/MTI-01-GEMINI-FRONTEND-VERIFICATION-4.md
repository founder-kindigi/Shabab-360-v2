# MTI-01 Gemini frontend verification — fourth pass, 2026-09-29

Status: **functional blockers remain; do not hand to DeepSeek yet**. Read-only review of Gemini's third correction.

## Confirmed

- The auth session does include `assignedCityId` (`src/lib/auth.ts`), and the first-party city/park APIs enforce their own scope.
- `npm run typecheck` passes. `npm run lint` passes with zero errors and six pre-existing script warnings. Preview remains removed.

## Blocking behavior

1. In `CreateFormDialog` (`registration-forms-page.tsx`), the City Head fallback computes `ownerCityId` from `assignedCityId` only inside `createMutation.mutate(...)`. `handleSubmit` first returns when `formCityId` is empty, and the Create button is disabled when `!formCityId`. A City Head with no selected city never reaches the fallback. Compute one `resolvedCityId` before both the disabled condition and submit guard; use `assignedCityId` for City Head and validate it is present. Distinguish 401 from 403 and require the role rather than treating any denial as a City Head signal. Add a focused City Head no-selected-city test.
2. In `registration-form-builder-page.tsx`, `patchMutation.onSuccess` reads `title`, `intro`, `fields`, `settings`, and `submittedSnapshot` from the render closure that called Save. If the user edits after clicking Save, the callback still compares the old values and can clear the dirty flag; the subsequent refetch overwrites the new edits. Compare a live current editor snapshot (for example a ref updated on every edit) with the exact payload submitted to that mutation, and test an edit during an in-flight save. Normalization also means the raw options text may differ from the trimmed submitted snapshot even without a later edit; reconcile local state to the saved payload or compare normalized snapshots before enabling Publish.

The new frontend still has no focused component tests for these paths. Do not claim a full-suite pass from the earlier interrupted run. No live publication or deployment occurred.
