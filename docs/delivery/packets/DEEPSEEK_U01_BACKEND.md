# DeepSeek packet — U01 unassigned participant backend

Read `AGENTS.md`, `.agents/memory/current.md`, `docs/delivery/tasks/U01.md`,
the current `src/app/api/admin/students` routes/tests, hierarchy helpers, both
Prisma schemas, and the pending PostgreSQL migration before editing. Preserve
unrelated working-tree changes and re-read each target immediately before edit.

Implement only the U01 backend candidate. Do not change UI, workbooks,
production data, deployment settings, generated Prisma clients, dependencies,
or unrelated routes.

## Required behavior

1. Make `Participant.groupId` nullable and `Participant.group` optional in both
   Prisma schemas. Keep group-based attendance and other group-scoped behavior
   excluding null groups.
2. Revise the un-deployed PostgreSQL migration
   `20260909050000_align_modeled_constraints` so it does not set
   `participants.groupId` to `NOT NULL`; retain a nullable foreign-key design.
   Add a forward SQLite migration that safely permits a null participant group.
   Document the data and rollback implications in the U01 handoff; do not run a
   migration against any database.
3. `POST /api/admin/students` accepts optional `groupId`.
   - Omitted group: only `super_admin` or `program_admin` with
     `students.manage` may create the record.
   - Provided group: require `students.manage`, fetch an active group, resolve
     its hierarchy with `resolveRequestedHierarchy`, and deny cross-scope or
     inactive targets. Do not accept a client park/city.
4. Add `PATCH /api/admin/students/[id]/assignment` with a bounded required
   `groupId`. It requires `students.manage`, validates an active target group,
   resolves the target hierarchy, updates only `groupId`, and persists a
   redacted audit record with old/new group IDs. It must deny missing/inactive
   groups, unauthenticated callers, and cross-scope callers.
5. Add a central-only `unassigned=true` list filter to `GET /api/admin/students`.
   It returns the established privacy-safe projection and must deny scoped users.
   Existing normal group-scoped list behavior remains unchanged.

## Tests and evidence

Add meaningful route tests for unassigned creation, central-only filtering,
authorized placement, missing/inactive group, cross-scope denial, and audit
payload. Use synthetic IDs and no personal data. Run focused route tests, then
`npm run lint`, `npm run typecheck`, and a scoped `git diff --check`. Do not
claim a schema replay, production readiness, deployment, or independent review.

Return exact changed files, exits, data/rollback impact, and limits for Astra's
actual-diff review.
