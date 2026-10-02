# DeepSeek packet — O01 bounded clean-code pass

Work only in the isolated candidate:
`D:/iBuild/Shabab-360-c0-20260911/n01-notifications-20260914`

Read `AGENTS.md`, `docs/delivery/tasks/O01.md`, this packet, and
`D:/iBuild/Shabab-360-v2/docs/delivery/reports/ASTRA_O01_GEMINI_REVIEW.md`.

## Goal

Remove the confirmed React invalid HTML nesting warning in PeoplePage's loading
skeleton without changing visible design, API requests, data projections,
authorization, client state, or feature behavior.

## Allowed files

- `src/components/modules/admin/people-page.tsx`
- `src/components/modules/admin/people-page.test.tsx`

## Required work

1. Locate the loading stats markup that renders a Skeleton div inside a `p`.
   Replace only the invalid wrapper with semantically valid equivalent markup.
2. Preserve text styles, layout, skeleton dimensions and all existing
   PeoplePage behavior.
3. Add or adjust a focused test only if needed to prove the warning no longer
   occurs. Do not add broad snapshot tests.
4. Do not modify any other source, configuration, generated code, API route,
   Prisma file, test setup, or UI design.

## Verification

Run:

```powershell
npx vitest run src/components/modules/admin/people-page.test.tsx
git diff --check
npx tsc --noEmit
npm run lint
```

Return the exact candidate diff, each command's exit result, and any warning
that remains. Do not claim browser, database, deployment, merge, or release
verification. Astra will review the actual diff and run final O01 verification.