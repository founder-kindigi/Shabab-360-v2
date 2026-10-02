# Astra review — U01 DeepSeek backend candidate

Outcome: **corrections required. Do not integrate or run a migration.**

Focused route claims were reviewed against the actual candidate; no database or
generated Prisma client was used. The candidate has these blocking findings.

## P1 — invalid Prisma active-group lookup

Both `POST /api/admin/students` and the new assignment route call
`group.findUnique({ where: { id, isActive: true } })`. `isActive` is not a
unique selector, so a generated Prisma client rejects this query at runtime.
Use `findFirst({ where: { id, isActive: true } })` or an ID lookup followed by
an explicit active check. Update route tests to catch the real call shape.

## P1 — scoped reassignment can take a participant from another scope

The assignment route authorizes only the destination group. A scoped actor who
knows an ID can move a participant currently assigned outside their hierarchy
into an allowed group. Authorize the existing participant's group scope before
allowing a re-placement; central roles may place an unassigned participant.

## P1 — M01 still blocks the supported unassigned state

The preflight still treats the count of null `participants.groupId` records as a
blocker even though the staged migration no longer sets that field `NOT NULL`.
Remove that obsolete blocker and its report contract/test assertions. Preserve
all remaining collision, foreign-key and schema checks.

## P1 — the new SQLite migration is an unnecessary destructive-style rebuild

The existing SQLite attendance migration already made `participants.groupId`
nullable with `ON DELETE SET NULL`. The new migration rebuilds the table without
changing its physical nullability and creates avoidable migration risk. Remove
it and restore release migration-count assertions. Keep both Prisma schemas
nullable so generated types match the actual database.

## P2 — null-group dereferences remain unhandled

The candidate identifies routes that dereference `participant.group` without a
null guard. U01 must make those routes return their established safe empty/404
or central-only response instead of throwing. Audit and cover the listed
guardians, park dashboard/evaluations/guardians, user profile, certificates,
reports export, fees-payment, student-detail and dropout paths. Do not expose
unassigned participants through a scoped endpoint.

## Evidence limit

No generated client, disposable schema replay, build, database, production,
migration, account, UI, or deployment check occurred in this review.

## Correction re-review — remaining P1 bypass

The corrected focused suite was re-run by Astra: 3 files, 48 tests passed.
The existing generic `PATCH /api/admin/students/[id]` still accepts `groupId`,
uses the invalid `findUnique({ id, isActive })` selector, and bypasses the new
assignment route's dedicated audit action and placement rules. Group changes
must be removed from this generic PATCH endpoint; `PATCH .../assignment` is the
sole placement mutation. Add regression coverage. Also update M01 task/report
wording so the approved unassigned test records are no longer described as a
production migration blocker.

## Final source review — pending runtime schema gate

**Outcome: source candidate accepted for runtime verification; U01 remains in review.**

The generic PATCH no longer accepts `groupId`; the dedicated assignment endpoint
is the sole placement mutation. The corrected student routes and migration
preflight were re-run by Astra: 4 files, 53 tests passed. Scoped
`git diff --check` produced only CRLF conversion notices, with no whitespace
errors. Both Prisma schemas were submitted to `prisma validate`; the local tool
returned no diagnostic result, so schema parsing is not claimed as passed.

The remaining required gate is an explicitly authorized Prisma client generation
followed by disposable SQLite and PostgreSQL schema/migration verification. It
must not use production credentials, the live database, or production data.
Only after that gate can U01 be technically accepted and M01's nullable-group
revision be unblocked.

## Runtime-gate update — 2026-09-15

The owner explicitly approved local Prisma generation and disposable database
verification. Prisma Client v6.19.3 generated successfully, sequentially, for
both `prisma/schema.prisma` and `prisma/postgres/schema.prisma`. The focused
U01 route and preflight suite then passed: 4 files, 53 tests. `npm run
typecheck` and `npm run lint` completed successfully.

The PostgreSQL portion subsequently passed in a Docker Desktop PostgreSQL 18.6
container on local port 55432. All 31 migrations applied and `migrate status`
reported the synthetic database up to date. Catalog inspection confirmed
`participants.groupId` is nullable with `ON DELETE SET NULL`. A synthetic,
rolled-back transaction created a city, park, batch, group and participant;
deleting the group returned the participant with a null group ID. The container
and its synthetic database were then removed.

The disposable SQLite contract also passed. Prisma's `db push` connection path
continues to return a generic schema-engine error, including after Node 24.21.0
and a locked dependency reinstall. Prisma did generate the complete SQLite DDL
from the current schema; that DDL was applied to a temporary SQLite database.
A synthetic group deletion left the participant with a null group ID and
`foreign_key_check` returned zero violations. All temporary files were removed.

The subsequent typecheck remains nonzero. It identifies U01 follow-up work in
group-scoped routes that still dereference nullable group data, plus an existing
missing `@testing-library/react` dev dependency for unrelated component tests.
The focused U01 route and preflight suite remains green (53 tests), and lint
passes with six pre-existing script warnings. No production URL, credential,
database, data, migration, account, or deployment was accessed.

**Outcome: the database runtime gate has passed, but U01 remains in review
until the reported safe-null route corrections and a clean typecheck are
complete.**
