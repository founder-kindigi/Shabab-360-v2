# DeepSeek packet — U01 generic PATCH placement bypass

Read the complete U01 task, Astra U01 review, and current student routes/tests.
Make one bounded correction.

1. Remove `groupId` from the generic `PATCH /api/admin/students/[id]` request
   schema and update logic. A supplied group ID must be rejected as an unknown
   field. Do not leave any group lookup in this route.
2. `PATCH /api/admin/students/[id]/assignment` remains the only group-placement
   endpoint; preserve its scope checks and redacted audit action.
3. Add a regression test proving generic PATCH cannot change a group and does
   not call group lookup or participant update.
4. Update only the stale M01 wording that says null groups block migration;
   retain the actual remaining schema/collision readiness limits.

Do not generate Prisma clients, access a database or production, run migrations,
modify UI, add dependencies, or refactor unrelated routes. Run focused tests,
lint, typecheck and scoped diff check; report exact exits and limits.
