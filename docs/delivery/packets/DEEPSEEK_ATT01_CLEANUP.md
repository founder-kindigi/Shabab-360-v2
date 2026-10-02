# DeepSeek packet — ATT01 bounded clean-code pass

Work in the current dirty `v2` workspace. Preserve every unrelated change. Do
not reset, stash, commit, generate Prisma clients, change packages, schemas,
migrations, configuration, database data, deployment, or UI design.

Read `AGENTS.md`, `.agents/memory/current.md`,
`docs/delivery/tasks/ATT01.md`, and
`docs/delivery/reports/ASTRA_ATT01_DEEPSEEK_REVIEW.md` first.

## Objective

Perform a behavior-preserving cleanup only for the completed ATT01 files:

- `src/app/api/admin/students/[id]/dropout/route.ts` and test
- `src/app/api/admin/home-analytics/route.ts` and test
- `src/app/api/park/attendance/[eventId]/close/route.ts` and test
- `src/app/api/park/attendance/[eventId]/route.ts` and test
- `src/app/api/park/attendance/summaries/route.ts`
- `src/app/api/park/attendance/prepare/route.ts` and test
- `src/lib/attendance/opportunities.ts` and test
- `src/components/modules/student-profile/profile-page.tsx` and test
- `src/components/modules/park/mobile-attendance-page.tsx` and test

Do not add abstractions unless existing duplication makes behavior less clear.
Do not remove the absentee-only Call or WhatsApp controls. The attendance roster
phone is an owner-approved narrow operational-contact exception for authorized
attendance staff, never a directory/export/general-client field.

Preserve these invariants:

1. Closing attendance never changes participant lifecycle state.
2. Reactivation requires an authorized PKT rejoin date, retains interruption
   history, and resumes eligibility on that date.
3. Scope, authorization, conflict/version, offline queue, closure/reopen/reset,
   and audit protections must remain intact.
4. The mobile layout and behavior stay intact; no redesign.

Run the focused ATT01 tests you affect, scoped ESLint, `npx tsc --noEmit`, and
scoped `git diff --check`. Report exact changed files, commands/exits, and
anything you deliberately left unchanged. Do not claim review, release,
deployment, or full-suite verification.
