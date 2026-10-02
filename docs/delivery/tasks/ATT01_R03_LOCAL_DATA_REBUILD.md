# ATT01-R03 — corrected local attendance-data rebuild

Assigned to: DeepSeek. Module: ATT01. Status: ready for preflight only. Base: current `v2` shared working tree; preserve unrelated changes.

## Objective

Prepare the owner-executable local SQLite rebuild that removes the 126 phantom participants created when Batch 4 summary rows were imported as students. The corrected parser must be used.

## Strict boundary

- Do **not** write, reset, import, back up, restore, migrate, or open `prisma/dev.db` in write mode.
- Do **not** read `.env` files or contact PostgreSQL/live infrastructure.
- Do **not** activate, change, or reveal user accounts or passwords.
- Do not modify the workbook, schemas, migrations, packages, or UI.
- Use aggregate-only evidence. Never include names, email addresses, phones, passwords, or worksheet rows in output.

## Required work

1. Run the guarded refresh tool in its read-only dry-run mode against `docs/sheets/Shabab_Batch_4_Attendance.xlsx`.
2. Verify it exits successfully, performs no writes, and reports exactly: 6 parks, 18 groups, **339 participants**, 460 attendance events, 6,210 attendance records, and 74 calendar dates.
3. Inspect the current refresh runner and verify its execute path requires all of: `--execute`, `--confirm-lahore-refresh`, target `sqlite`, an explicit `prisma/dev.db` path, and a backup directory. Verify it creates and checks a backup before deleting records, and fails closed on an unsafe target.
4. If a concrete implementation defect prevents those guarantees, make the smallest fix and add a focused synthetic/disposable test. Do not execute a real rebuild.
5. Produce a short aggregate-only handoff with the exact owner command for the later SQLite execution and rollback command/path requirements.

## Required checks

- Focused Lahore refresh tests.
- Dry run command above.
- Scoped lint, typecheck, and `git diff --check` if source changes.

## Return to Astra

Exact changed files, dry-run output counts, proof that no database was written, exact later execution command, backup location convention, rollback procedure, and remaining risks. Do not claim the rebuild, browser validation, release, or deployment occurred.
