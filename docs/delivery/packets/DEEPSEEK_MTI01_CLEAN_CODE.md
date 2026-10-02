# DeepSeek packet — MTI-01 registration forms clean-code pass

Prepared by Astra on 2026-09-29; **not dispatched**. MTI-01 remains the single active delivery task. Candidate is the current shared working tree on base `73425a5af08e366d437eed76dc112e6df9f0455e`, with substantial unrelated dirty files. Preserve all unrelated work.

Read `AGENTS.md`, `.agents/skills/shabab-clean-code/SKILL.md`, `docs/delivery/tasks/MTI-01.md`, the approved `docs/pwa screens/PROPOSED_REGISTRATION_SCREENS.md`, and the current registration-form API/definition files. Read `docs/delivery/reports/MTI-01-GEMINI-FRONTEND-VERIFICATION-4.md` as historical review, not as current source authority.

## Scope

Perform a **bounded, behavior-preserving** cleanup of the integrated generic registration-form frontend. Allowed source files are:

- `src/components/modules/admin/registration-forms-page.tsx`
- `src/components/modules/admin/registration-form-builder-page.tsx`
- `src/components/modules/admin/registration-form-submissions-page.tsx`
- `src/app/register/forms/[slug]/page.tsx`
- their two focused tests `registration-forms-page.test.tsx` and `registration-form-builder-page.test.tsx`

You may touch the small navigation integration only if a concrete cleanup issue is demonstrated: `src/components/layout/app-shell.tsx`, `sidebar.tsx`, `src/components/shared/breadcrumb-nav.tsx`, and `src/stores/useAppStore.ts`. No API, auth, Prisma, migrations, release-test, dependency, or unrelated source changes. No visual redesign.

## Demonstrated cleanup opportunities

- Remove unused parent-page `useSession`, `assignedCityId`, `router`, and other dead state/imports if confirmed unused. Do not alter the City Head's session-based `assignedCityId` create path or server scope enforcement.
- Replace weak `any` types at the form API boundaries with narrow types where simple; simplify duplicated or unclear editor snapshot state without changing save/publish semantics. Preserve in-flight-edit protection and optimistic version behavior.
- The focused builder test currently checks an asterisk that was already present before resolving Save. Strengthen it to wait for a confirmed save/refetch and assert the later edit remains both visible and dirty. Keep the City Head no-selected-city case and assert the actual POST payload. Tests should establish behavior, not mirror internals.
- Remove misleading comments or unused icons. Keep current mobile/desktop appearance, status/error wording, request-key retry behavior, privacy boundaries and no-store handling.

## Preservation and return

Do not change endpoint contracts, published-revision immutability, consent, eligibility checks, applicant data storage, authorization, or transaction/audit boundaries. Do not create or publish a live form. Re-read each file immediately before editing and stop if it changed unexpectedly.

Run focused frontend tests, lint, typecheck and `git diff --check` on your patch. Return the exact diff/files, reasons, commands and results, and any unresolved concerns. Do not claim independent approval or deployment readiness; Astra will review actual changes and run final checks.
