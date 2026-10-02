# DeepSeek packet — M01 profile primary-key collision

Read the M01 task, complete Astra M01 review, current preflight source/tests, and `20260909030000_restore_modeled_tables/migration.sql` before editing. Preserve unrelated work.

Make one bounded correction only: add a read-only aggregate catalog collision check for the named constraint `student_extended_profiles_pkey`, which that migration adds unconditionally. If it is present, return a distinct named blocker; if absent, it must not block a clear clean-baseline verdict. Add focused synthetic tests for both states and extend the existing parity coverage to include this operation.

Keep all SQL parameter-free `SELECT`s with `AS "count"`; do not read `.env`, connect to a database, access production, migrate, change schema/data/accounts/APIs/UI/dependencies/generated clients. Run the focused suite and scoped diff check. Report exact exits and limits; do not claim production readiness or approval.
