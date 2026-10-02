# DeepSeek packet — M01 dry-run migration readiness

Work in the shared `v2` checkout only. Read `AGENTS.md`,
`docs/delivery/tasks/M01.md`, and
`docs/delivery/reports/PRODUCTION_MIGRATION_IMPACT_REVIEW_2026-09-15.md`.

## Goal

Create a small, testable, **read-only** helper for migration readiness. It must
accept a supplied query interface and return aggregate counts only:

- participants with no group assignment;
- batch/park city conflicts;
- cities with more than one active batch;
- presence of required migration tables/columns.

## Constraints

- Do not read `.env` files, connect to production, print SQL URLs, output names
  or rows, run migrations, modify schemas, or change application routes/UI.
- Use synthetic test doubles only. No source-workbook data.
- Keep the query list explicit and parameter-free; return a typed result with a
  clear `ready` boolean and blockers.
- Allowed files: a new helper and focused synthetic tests under
  `scripts/delivery/` or `src/lib/migrations/`, plus this task's evidence note
  if needed. Do not change package dependencies or generated Prisma clients.

Run focused tests, `git diff --check`, and typecheck if feasible. Return the
actual diff, exact exits, and limits. Astra will review; do not self-approve.