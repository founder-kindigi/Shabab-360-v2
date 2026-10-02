# DeepSeek packet — M01 preflight corrections

Read `docs/delivery/tasks/M01.md`, `docs/delivery/reports/ASTRA_M01_DEEPSEEK_REVIEW.md`, the complete current `src/lib/migrations/production-preflight.ts`, its tests, and the seven remaining PostgreSQL migrations before editing. Preserve unrelated working-tree changes.

Correct only the M01 read-only preflight and its focused tests.

1. Split pre-deployment prerequisites from post-deployment verification targets. A missing table created by a pending migration must not permanently block a clear pre-deployment readiness verdict.
2. Add aggregate-only collision checks for every table created by `20260909030000_restore_modeled_tables`, and aggregate primary-key preconditions for `student_extended_profiles` (`id` nulls and duplicate IDs). Each failure must have a distinct non-PII blocker.
3. Use an explicit aggregate alias and fail closed if the count field is absent or invalid; do not depend on object-value order.
4. Correct singular/plural blocker wording.
5. Extend synthetic tests for each correction, including a clear pre-deployment case, target-table collision, profile-key failure, and an unrelated numeric field without the required count alias.

Hard limits: no `.env` read, database connection, migration, production access, data/account change, schema change, API/UI change, dependency change, or generated client. All queries must remain parameter-free `SELECT`s and reports must remain aggregate-only.

Run the focused test and scoped `git diff --check`; report exact exits and limits. Do not claim production readiness, deployment approval, or independent review.
