# DeepSeek packet — U01 candidate corrections

Read `docs/delivery/tasks/U01.md`, `docs/delivery/reports/ASTRA_U01_DEEPSEEK_REVIEW.md`, and all affected current files before editing. Preserve unrelated work.

1. Replace both active-group `findUnique` calls with a valid Prisma query and
   update tests to assert it.
2. In assignment, load and authorize the existing participant's group scope for
   re-placement. Central roles may place an unassigned participant; scoped users
   must be denied when the existing assignment is outside their scope.
3. Remove the obsolete M01 null-group readiness blocker and its tests. Null
   groups are now an approved state, not migration failure.
4. Remove the redundant SQLite rebuild migration and restore affected migration
   count tests. Keep both Prisma schemas nullable.
5. Audit every U01-reachable `participant.group` dereference. Add a safe null
   outcome and focused test for each relevant route; do not leak unassigned
   records to scoped users.

Do not generate Prisma clients, access databases/production, migrate, change UI,
add dependencies, or alter unrelated modules. Run focused tests, then lint,
typecheck, and scoped diff check. Return exact exits and limits for Astra review.
