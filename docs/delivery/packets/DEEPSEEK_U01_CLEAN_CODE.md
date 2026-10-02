# DeepSeek packet — U01 bounded clean-code pass

Task: perform a small, behavior-preserving cleanup of the integrated U01
people-placement candidate. This is a clean-code pass, not a feature change.

Read first: `AGENTS.md`, `.agents/skills/shabab-clean-code/SKILL.md`,
`docs/delivery/tasks/U01.md`, and
`docs/delivery/reports/ASTRA_U01_NULL_GROUP_REVIEW.md`.

## Candidate and scope

Work only in these U01 files when a demonstrated maintenance problem exists:

- `src/app/api/admin/students/route.ts`
- `src/app/api/admin/students/[id]/route.ts`
- `src/app/api/admin/students/[id]/assignment/route.ts`
- `src/app/api/admin/certificates/[participantId]/route.ts`
- `src/app/api/admin/guardians/[id]/detail/route.ts`
- `src/app/api/admin/home-analytics/route.ts`
- `src/app/api/admin/reports/export/route.ts`
- `src/app/api/guardian/dashboard/route.ts`
- `src/app/api/guardian/schedule/route.ts`
- `src/app/api/park/dashboard/route.ts`
- `src/app/api/park/guardians/route.ts`
- `src/app/api/park/participants/route.ts`
- `src/app/api/park/roster/route.ts`
- their existing focused U01 tests under `src/app/api/**`
- the three guardian components and tests named in the Astra review

Do not edit Prisma schemas or migrations, package files, generated clients,
authentication providers, UI styling, unrelated files, documentation other
than your handoff report, or production configuration.

## Required preservation rules

- Preserve the approved API payloads and status/error behavior.
- Preserve server authorization and scope checks. Do not weaken central-only
  unassigned creation/listing or target-group assignment checks.
- Preserve the audit write, transaction boundaries, participant-group
  nullability, and exclusion of unassigned participants from group attendance,
  schedules, reports, and scoped directories.
- Preserve the guardian `Unassigned` UI state and current visual design.
- Do not add dependencies or abstractions without a demonstrated need.

## Work

1. Inspect the actual U01 diff and direct consumers before editing.
2. Make only small changes that improve a concrete issue such as duplicated
   null-group narrowing, unclear local names, dead code, or difficult control
   flow. If no justified cleanup is found, make no code change and report that.
3. Re-read each file before editing. Preserve unrelated dirty work.
4. Run the focused U01 tests you affect, scoped ESLint, TypeScript if possible,
   and scoped `git diff --check`.

## Return to Astra

Give exact changed files, concise reason for each, exact commands and exit
results, and unresolved concerns. Do not claim independent review, full-suite
success, merge readiness, deployment, or release approval.
