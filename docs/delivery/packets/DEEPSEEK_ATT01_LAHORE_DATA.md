# DeepSeek packet — ATT01 Lahore data reset and import

Work in `D:\iBuild\Shabab-360-v2` on the current dirty `v2` workspace.
Preserve unrelated work. Read `AGENTS.md`, `.agents/memory/current.md`, and
`docs/delivery/tasks/ATT01.md` first.

## Objective

Implement a **new, guarded, testable** Lahore Batch 4 data-refresh tool. Do
not execute it against any local or remote database. Astra will review the
actual diff and run the approved operation separately.

Source workbook: `docs/sheets/Shabab_Batch_4_Attendance.xlsx`.

The tool must:

1. Default to a read-only dry run that reports only aggregate counts and
   redacted source references.
2. Target exactly either explicit local SQLite or an explicitly supplied
   PostgreSQL connection. Never infer a target from a remote-looking URL.
3. Refuse writes without separate `--execute` and clear acknowledgement flags.
4. Make and verify a restorable local backup before a reset. For PostgreSQL,
   fail closed unless a full backup mechanism is available and verified; do not
   invent a partial backup.
5. Preserve all existing Super Admin accounts and their ability to sign in.
6. Reset application data safely in dependency order, preserving schema and
   migration metadata. Do not rely on the old reset script, which deletes every
   user.
7. Import only Lahore: six parks, 18 source groups, Batch 4 from 2026-05-23
   through 2027-01-31, historical attendance through 2026-09-13, and future
   calendar dates without future attendance records.
8. Import source-group students, including rows that the old parser calls
   unnumbered when their group is explicit. Missing phone must remain allowed.
9. Treat a workbook `Dropout` cell as the earliest manual dropout date: retain
   prior marks, omit marks on/after that date, set dropout lifecycle fields,
   and do not invent a rejoin date.
10. Create staff profiles only as inactive placeholders. Do not create active
    staff login accounts because the workbook has no approved email identity.
11. Verify post-import aggregate counts, hierarchy integrity, no non-Lahore
    cities/parks, only Super Admin accounts active, and no attendance record
    after the completed-through date.

Keep workbook names, phones, email values, backup contents, and credentials out
of source, tests, reports, and command output. Do not edit generated clients,
schemas, migrations, packages, UI, or deployment configuration.

Add focused synthetic tests for parser/manifest, write gate, preservation,
date cutoff, future-calendar handling, dropout handling, and rollback failure.
Run focused tests, scoped ESLint, TypeScript, and scoped diff check. Report
exact files, commands/exits, and limitations. Do not claim any database was
reset, imported, backed up, or deployed.
