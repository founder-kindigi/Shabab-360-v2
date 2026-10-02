# DeepSeek packet — M01 complete ordered migration sequence

Read `docs/delivery/tasks/M01.md`, the complete Astra M01 review, the production migration-impact report, the current helper/tests, and all eight pending PostgreSQL migrations before editing. Preserve unrelated changes.

The verified sequence after the applied throttle migration is:

1. `20260827090000_add_team_document_links`
2. `20260907114612_add_evaluations_lessons_planner`
3. `20260909020000_operation_receipts`
4. `20260909030000_restore_modeled_tables`
5. `20260909040000_active_city_batch`
6. `20260909050000_align_modeled_constraints`
7. `20260909060000_align_modeled_indexes`
8. `20260909070000_attendance_reset_version`

Extend only the read-only, aggregate-only preflight and its synthetic tests.

1. Include the first two migrations in the ordered sequence and collision-check every unconditional table, index, function, trigger, and column they create. Use mechanical parity coverage.
2. Model ordered state correctly. Tables created by an earlier pending migration, including `park_lessons` and `park_routine_slots`, are expected to be absent before deployment. Their absence must not block readiness; data checks against them must be marked skipped. Presence must be treated as a collision/partial-state blocker when their creating migration remains pending.
3. Split pre-first-migration prerequisites from artifacts created during the pending sequence. A clean baseline must be able to return ready when all data guards are clear and every pending-created target is absent.
4. Add read-only catalog checks for the two constraints that `20260909050000` drops. If either required old constraint is absent, report a named blocker rather than permitting migration failure. Also test the expected-present condition.
5. Update synthetic tests for a clean eight-migration baseline, each new collision class, old-constraint absence, and the no-query behavior for tables created earlier in the same sequence. Keep all queries parameter-free `SELECT`s with explicit `AS "count"` aliases.

Hard limits: no `.env` read, database/production access, migration, backup, data/account/schema/API/UI/dependency/generated-client change. Run the focused suite and scoped diff check; report exact exits and limits. Do not claim production readiness or approval.
