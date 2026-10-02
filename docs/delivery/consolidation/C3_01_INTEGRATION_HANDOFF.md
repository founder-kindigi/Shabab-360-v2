# C3-01 integrated C2/N01 candidate handoff

Candidate: `D:/iBuild/Shabab-360-c0-20260911/n01-notifications-20260914`
Branch: `codex/n01-notifications-20260914`.

## Result

The candidate contains the C2-04 schema/route compatibility work and N01
in-app notification receipts together. SQLite and PostgreSQL Prisma clients
were generated locally under the owner's earlier isolated-candidate exception;
generated files remain untracked and were not source-edited. The previously
missing `@testing-library/react` development dependency was added to the
candidate package manifest and lockfile.

## Fresh evidence

- `src/lib/notifications` plus notification API routes and C2 deletion
  regression: 6 files, 25 tests passed.
- The Prisma raw receipt query executed against an isolated SQLite database:
  idempotent insert and read passed.
- Focused ESLint across the changed notification API/UI/helper paths passed.
- `git diff --check` passed for the candidate.

## Verification

- Full Vitest suite: **194 files / 1,400 tests passed**.
- Direct `tsc --noEmit`: passed, exit 0.
- Full ESLint: zero errors and six existing unused-disable warnings in scripts.
- Production build: compiled, completed TypeScript and static generation for
  154 pages, and produced `.next/BUILD_ID`.
- Five release suites: 161/161 checks passed after their schema/migration
  characterization baselines were updated to 81 models, 33 PostgreSQL
  migrations and 18 SQLite migrations.
- The receipt helper's real Prisma raw query passed against an isolated SQLite
  database. Candidate Prisma clients were regenerated after dependency changes.

The first full-suite run exposed the missing `@testing-library/react` and
`jsdom` dev dependencies and the stale release baselines; both dependencies are
now declared in the candidate manifest/lockfile and the final full suite passes.

## Next action

Perform the final candidate review before applying it to v2. N01
policy-dependent external delivery remains separately blocked.
