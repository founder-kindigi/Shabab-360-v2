# ATT01 local SQLite lock diagnostic (`prisma/dev.db`)

Date: 2026-09-18. Scope: read-only diagnosis of why exclusive operations on
`prisma/dev.db` fail while the local app is running. No process was stopped, no
database was modified, and no source code was changed.

## 1. Summary

The lock is **expected local development activity**, not a test defect. The
Next.js development server that is serving the local app holds `prisma/dev.db`
open through its SQLite connection. While it runs:

- reading and copying the file work normally;
- operations that need to exclude a concurrent writer - including
  `Get-FileHash`, `certutil`-style hashing, renames, deletes and in-place
  replacement - fail with *"the process cannot access the file because it is
  being used by another process"*.

No test leaks a handle and no test opens `prisma/dev.db` for writing. Nothing
needs to be fixed in the code; operators need to know which operations must wait
for the dev server to stop.

## 2. Evidence: who holds the file

Read-only Windows diagnostics only (Restart Manager file-lock query plus a
process listing); no environment variables, command lines or user data recorded.

| Observation | Value |
| --- | --- |
| Lock owner (Restart Manager) | one process: `node.exe`, application name *Node.js JavaScript Runtime* |
| Process class | Next.js app runtime (`next-server`), child of the `next dev` launcher |
| Listening port | 3000 (owned by the same process) |
| Process age | started 2026-09-18 12:12, still serving at diagnosis time |
| Activity evidence | `dev-local.log` shows live request traffic (`GET /`, `/api/notifications` 200) |
| Sidecar files next to `dev.db` | none (`dev.db` only, so a plain rollback-journal database with an idle connection) |

Re-detection recipe (read-only, safe to repeat):

1. find the app runtime by its listening port rather than by a remembered PID:
   `Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq 3000 }`;
2. resolve that PID with `Get-CimInstance Win32_Process -Filter "ProcessId=<pid>"`;
3. to ask Windows directly which process holds a file, query the Restart Manager
   API (`RmStartSession` / `RmRegisterResources` / `RmGetList`) - it lists the
   holding PID and application name without opening or locking anything.

PIDs are re-used between runs, so identify the process by class and port, not by
a recorded number.

## 3. Why hashing fails while copying works

The failing and succeeding operations differ only in the *sharing mode they
request*, which explains a result that otherwise looks contradictory:

| Operation | Access | Share mode requested | Result |
| --- | --- | --- | --- |
| `Get-FileHash` / `certutil` | read | read only | **fails** - would exclude the app's writer |
| `fs.copyFileSync`, `fs.readFileSync` (Node) | read | read + write + delete | succeeds |
| `[System.IO.File]::Open(path,'Open','Read','ReadWrite')` | read | read + write | succeeds |

SQLite opens its database file with read and write access, so a caller that
demands "no other writer" is refused; a caller that permits a concurrent writer
succeeds and sees a consistent snapshot. This is normal SQLite-on-Windows
behaviour and applies to any running process using the database, not only to
this project.

Practical consequence: hashing the live development database with a
share-read-only tool will keep failing for as long as the dev server runs. Read
and copy paths are unaffected, which is why the reconciliation tests (which copy
first and hash through Node) pass.

## 4. Is it expected or a defect?

**Expected.** Two checks show it is not test-induced:

- the lock is attributed to the app runtime serving port 3000, not to a test
  runner;
- it is persistent, not transient: three consecutive hash attempts over
  ~1.5 s all failed while the app kept running, matching the dev server's
  lifetime rather than a short-lived test process.

Test isolation also rules out a test holding the file:

- `vitest.setup.ts` points `DATABASE_URL` at `db/test.db`, so application code
  under test never opens `prisma/dev.db`;
- every test that needs real schema shape copies it to an OS temp directory
  first and asserts the original's size and mtime are unchanged.

## 5. Handle-lifecycle review (no defect found)

All SQLite handles are closed on every path:

- `src/lib/attendance/sqlite-support.ts` - `createSqliteFileBackup`,
  `verifySqliteBackupFile`, `countForeignKeyViolations` each open inside
  `try` with `db.close()` in `finally`.
- `src/lib/attendance/attendance-schema-reconcile.ts`,
  `src/lib/attendance/park-staff-attendance-reconcile.ts`,
  `src/lib/attendance/team-access/schema-reconcile.ts`,
  `src/lib/attendance/browser-test-cleanup.ts` - both the read-only inspection
  open and the write-capable open (which is wrapped in `BEGIN` / `COMMIT` with a
  `ROLLBACK` on error) close in `finally`.
- Test helpers that construct `DatabaseSync` directly
  (`attendance-schema-reconcile.test.ts`, `park-staff-attendance-reconcile.test.ts`,
  `browser-test-cleanup.test.ts`, `team-access/schema-reconcile.test.ts`,
  `lahore-refresh/test-support.ts`) close in `finally` as well.

No test opens `prisma/dev.db` for writing: every reference is a `statSync`,
hash, read-only preflight or `copyFileSync` into an OS temp path, and each such
file keeps its own disposable-target guard that refuses the real database (in
one case with the relative-path variant covered too).

Because no defect was proved, no source or test change was made.

## 6. Safe operator steps

Before any operation that needs exclusive access to `prisma/dev.db` (hashing the
live file with a share-read-only tool, replacing, renaming or deleting the
database file, or a guarded reconciliation pointed at the real file):

1. in the terminal that is running the local dev server, stop it from the
   foreground (`Ctrl+C`) - do not terminate a process by PID, because the PID
   may by then belong to something else;
2. confirm nothing still holds the file by re-running the Restart Manager query
   in section 2; an empty list means the file is free;
3. perform the exclusive operation;
4. restart the app the way it was started before.

While the app is running, prefer the copy-first route that the repository's own
tools already use:

- copy `prisma/dev.db` to an OS temp path, then hash or inspect the copy;
- use Node's `fs` or a Java/PowerShell open that requests read + write sharing
  rather than a share-read-only open;
- keep the existing guards: any reconciliation write must still target a temp
  copy, and a dry run must remain the default.

Do not:

- hash, replace, rename or delete `prisma/dev.db` while the app is running;
- kill or restart the app process on someone else's behalf;
- point a reconciliation write path at the real development database to work
  around a lock.

## 7. Non-claims

No process was started, stopped, restarted or killed. `prisma/dev.db` was only
read, never written: its size and modification time are unchanged from before
this diagnostic. No schema, migration, workbook, credential, handoff,
environment file or deployment setting was touched, and no production or
external system was contacted.
