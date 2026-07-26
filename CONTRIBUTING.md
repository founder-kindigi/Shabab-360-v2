# Contributing To Shabab 360

## Before You Change Code

1. Read `AGENTS.md`, `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md`, and
   `.agents/memory/current.md`.
2. Work on a dedicated branch or worktree. Do not develop directly on `main`.
3. Inspect the current implementation and nearby tests before designing a new
   abstraction.
4. Keep unrelated working-tree changes intact.

## Required Engineering Rules

- Use the project-local `shabab-build-feature` and `shabab-code-quality` skills
  for application changes and review work.
- Enforce authorization on the server. Client state, route parameters,
  capabilities, and team membership cannot broaden city, park, or group scope.
- Validate untrusted input with bounded Zod schemas.
- Keep SQLite and PostgreSQL Prisma schemas aligned for shared model changes.
- Add forward migrations only. Never edit generated Prisma clients or run a
  migration against staging/production without owner approval.
- Redact sensitive audit data and never commit secrets, real data exports,
  credentials, local databases, temporary workbooks, or QA captures.

## Tests And Verification

For every substantive change, run the closest focused tests plus:

```text
npm run lint
npm run typecheck
npm test
```

Also run these when schema, routes, deployment configuration, or database
compatibility changes:

```text
npm run db:postgres:validate
npm run db:postgres:generate
npm run build:postgres
```

Browser UAT remains mandatory for role boundaries, state-changing flows, and
required mobile viewports. Automated tests do not replace browser evidence.

## Pull Request / Handoff Content

Include the changed-file list, tests run, security and data impact, migration
impact, rollback plan, and any remaining risks. Do not claim a check passed
unless it was run against the submitted change.
