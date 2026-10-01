# ATT01 local release readiness

Date: 2026-09-18. Scope: read-only verification of the local ATT01 state after the
local Next.js server was stopped.

**This is not production readiness.** It records what was verified locally, what
is committed, and what still blocks a live rollout. No production or staging
system, account, migration, import, credential, handoff, deployment or server
process was touched, and `prisma/dev.db` was never opened for writing.

## 1. Lock release and database fingerprint

| Check | Result |
| --- | --- |
| Ports 3000 / 3001 / 3002 listening | none - the app server is stopped |
| Restart Manager file-lock query for `prisma/dev.db` | no locking process reported |
| `Get-FileHash` (share-read-only open, previously refused) | **succeeds** |
| SHA-256 | `F4BF279A9130B82C031408B39D59D4895352144CBDA9D6B97FF0E743125E5024` |
| Bytes | 4,198,400 |
| lastWriteTimeUtc | 2026-09-18T15:53:20.992Z |
| `-wal` / `-shm` / `-journal` sidecars | none |

The previously diagnosed lock (see `ATT01_LOCAL_SQLITE_LOCK_DIAGNOSTIC.md`) is
gone: the share-read-only hash that used to fail now succeeds, and no process is
reported as holding the file. The fingerprint is stable: an independent hash
before the reconciliation run and the run's own before/after capture agree
(`databaseUnchanged: true`).

## 2. Local reconciliation (read-only)

Command (`node --experimental-strip-types --experimental-detect-module
scripts/att01-workbook-reconciliation.ts --input
docs/sheets/Shabab_Batch_4_Attendance.xlsx --database prisma/dev.db`), exit 0.
The tool opens SQLite read-only, refuses URLs and network paths, reads no `.env`,
and emits aggregates, truncated SHA-256 key digests and mismatch categories only.

### Required totals - all pass

| Aggregate | Required | Workbook | Database | Result |
| --- | ---: | ---: | ---: | --- |
| Parks | 6 | 6 | 6 | PASS |
| Groups | 18 | 18 | 18 | PASS |
| Participants | 339 | 339 | 339 | PASS |
| Attendance events | 460 | 460 | 460 | PASS |
| Attendance records | 6,210 | 6,210 | 6,210 | PASS |
| Calendar dates | 74 | 74 | 74 | PASS |

`aggregatesEqual: true`. The earlier divergences (7 browser-test events, 1
surviving `excused` mark) are gone: the browser-test cleanup removed them, and
`resetEvents`, `openEvents` and `recordsMarkedByUser` are now all 0.

### Business-key comparison - every set equal

| Key set | Count | Workbook hash | Database hash | Matched | WB-only | DB-only |
| --- | ---: | --- | --- | ---: | ---: | ---: |
| Park placement | 6 | `cdcddfeb9be06883` | `cdcddfeb9be06883` | 6 | 0 | 0 |
| Group placement | 18 | `08977a6edfdba09d` | `08977a6edfdba09d` | 18 | 0 | 0 |
| Participant identity | 339 | `8007f38ef039152e` | `8007f38ef039152e` | 339 | 0 | 0 |
| Participant placement | 339 | `550f9c92c6ab66bf` | `550f9c92c6ab66bf` | 339 | 0 | 0 |
| Attendance events | 460 | `03bf18a86fc70f8d` | `03bf18a86fc70f8d` | 460 | 0 | 0 |
| Calendar dates | 74 | `7e8cedaa9d2adace` | `7e8cedaa9d2adace` | 74 | 0 | 0 |
| Per-event record counts | 460 | `1b385c8a5f46597a` | `1b385c8a5f46597a` | 460 | 0 | 0 |

Zero workbook-only rows: no data loss. Four identity duplicates exist on both
sides identically (same name+phone in different groups), which is consistent.

### Status and lifecycle totals - equal

| Status | Workbook | Database | | Lifecycle | Workbook | Database |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| present | 1,626 | 1,626 | | active | 231 | 231 |
| absent | 2,570 | 2,570 | | dropout | 108 | 108 |
| late | 1,346 | 1,346 | | reactivated | 0 | 0 |
| excused | 668 | 668 | | | | |

### Remaining reconciliation mismatch (attributed, not attendance drift)

| Category | Workbook | Database | Classification |
| --- | ---: | ---: | --- |
| `staff_state` - inactive staff placeholders | 67 | 15 | Authorized Team Access provisioning: 52 placeholders activated (6 `park_lead`, 34 `murabbi`, 1 `park_admin`, 12 rows now `muawin`) plus 1 local City Head account; 15 remain inactive because no valid Team Access row covers them (bracketed-name / missing work-email rows cannot be activated) |

Retained audit history (aggregate only): `attendance_mark` 14, `attendance_reset`
4, `attendance_session_prepare` 7, `import_lahore_batch_4` 1, `view_dashboard` 5,
and 14 durable operation receipts. 70 users total; 2 active Super Admins and 53
other active accounts; active staff roles `super_admin` 2, `city_head` 1,
`park_lead` 6, `murabbi` 34, `muawin` 12.

**No participant name, phone, email, password or source row was printed or
stored by this verification.**

## 3. Committed ATT01 changes (verified range `38e5953^..HEAD`)

| Commit | Subject |
| --- | --- |
| `2649074` | docs(att01): document local SQLite lock behavior |
| `ef0d59d` | test(attendance): make team access schema reconciliation baseline independent |
| `8c06351` | docs(att01): define production team access rollout |
| `6781423` | feat(auth): add guarded production access provisioning preflight |
| `4872014` | docs(att01): finalize production rollout runbook |
| `1dbe5bf` | docs(att01): define PostgreSQL operational preflight |
| `974e563` | fix(migrations): validate Muawin assistance schema parity |
| `9400305` | feat(attendance): restore scoped mobile role navigation |
| `2948622` | docs(att01): finalize the ATT01 commit manifest |
| `38e5953` | docs(att01): record release-preparation evidence and commit manifest |

Earlier ATT01 work sits below the range (`636a774` batch calendar on marking and
correction, `0424ae9` City Head cross-city scope, and the workbook/DB
reconciliation tooling commit).

## 4. Verification results

| Group | Command | Files | Tests | Exit |
| --- | --- | ---: | ---: | ---: |
| Workbook reconciliation, Team Access schema + provisioner, production-access, migrations + baseline parity, release suites | `npx vitest run src/lib/attendance/lahore-refresh/reconcile.test.ts src/lib/attendance/team-access src/lib/auth/production-access.test.ts src/lib/migrations src/__tests__/release` | 14 | **272 passed** | 0 |
| Five role-navigation frontend suites | `npx vitest run src/components/pwa/pwa-app.test.tsx src/components/modules/park/mobile-parks-page.test.tsx src/components/modules/park/mobile-park-workspace.test.tsx src/components/modules/park/mobile-park-detail-page.test.tsx src/components/modules/muawin/mobile-muawin-dashboard.test.tsx` | 5 | **49 passed** | 0 |
| Attendance mark/correction routes and attendance libraries | `npx vitest run src/app/api/park/attendance src/lib/attendance src/lib/attendance-alerts.test.ts` | 37 | **281 passed** | 0 |
| Lint | `npm run lint` | - | 0 errors, 6 pre-existing warnings | 0 |
| Typecheck | `npx tsc --noEmit` | - | no diagnostics | 0 |

**Total focused matrix: 56 files, 602 tests, 0 failures.**

The 37-file group includes the disposable real-schema refresh rehearsal, which
runs the guarded CLI against a temp copy of the real schema and asserts the
original's size and mtime are unchanged.

### Known unrelated items (none is a failure of this matrix)

- The two ATT01 test failures carried by earlier sessions are resolved and now
  verified green: the stale Team Access baseline assertion (`ef0d59d`) and the
  release migration-count expectations (raised to 18 SQLite / 32 PostgreSQL in
  `974e563`, not weakened).
- The 6 lint warnings are pre-existing unused `eslint-disable` directives in
  scripts, not errors.
- Two pre-existing whitespace errors exist in **uncommitted** working-tree edits
  and are outside every ATT01 commit: `src/app/api/park/attendance/[eventId]/close/route.test.ts:165`
  and `src/lib/attendance/__tests__/dropout-policy.test.ts:169` (each a blank line
  at EOF). `git diff --check` over the whole ATT01 commit range is clean.
- The full Vitest suite has stalled in earlier sessions and was not run here; the
  focused matrix above is the evidence, not a whole-suite claim.
- Browser/device behaviour, offline sync under real conditions and the operational
  PostgreSQL baseline are **not** covered by this matrix.

## 5. Working-tree inventory (nothing silently included)

`git status --short`: **0 staged, 122 modified, 383 untracked**. The full
inventory is captured at verification time. Notable uncommitted ATT01 items
explicitly *not* part of any commit above:

- tooling: `scripts/sqlite-migration-catalog-audit*.ts`,
  `scripts/sqlite-migration-replay-probe*.ts`, `src/lib/migrations/sqlite-migration-catalog.ts`
  (+ test), `src/lib/auth/muawin-assistance.ts` (+ test), `src/lib/auth/screen-access.test.ts`;
- documentation: `docs/delivery/ATT01_PILOT_AND_ITERATION_PLAN.md`,
  `docs/delivery/state.json`, `docs/delivery/tasks/`, and the remaining
  `docs/delivery/reports/*` handoffs and reviews;
- `prisma/dev.db` itself (modified locally by the authorized refresh and
  provisioning, never committed).

## 6. Remaining blockers before a live rollout

1. **Approved target, window and rollback authority** - a named owner must
   authorize the production target, the change window and who may execute a
   rollback.
2. **Verified production backup and restore rehearsal** - a backup that has
   actually been restored and validated, not merely taken.
3. **Read-only operational PostgreSQL baseline preflight against a restored
   copy** - the fresh disposable PostgreSQL replay passed, but the *operational*
   baseline has never been checked against a restored copy of the real data.
4. **Approved live provisioning writer and connection contract** - the current
   production-access module is a guarded planning/preflight candidate with the
   write path deliberately unwired, and the local provisioners are SQLite-only and
   refuse PostgreSQL. No live writer exists.
5. **Independent review and explicit authorization** - an independent reviewer
   plus the owner's written go-ahead.

Supporting decisions still open:

- an approved PostgreSQL runtime source (path + checksum, archive + checksum, or
  written authorization) - the disposable replay is blocked on this;
- duplicate/un-committed migration history and the intentional SQLite/PostgreSQL
  Muawin self-reference asymmetry;
- how the `staff_state` divergence (67 workbook placeholders vs 15 in the
  database) is resolved for the remaining 15 rows, which the Team Access workbook
  cannot currently activate;
- whether to commit or retire the uncommitted ATT01 tooling and reports listed in
  section 5, and the two whitespace errors.

## 7. Actions requiring future explicit owner authorization

Each of these is a separate, explicitly authorized step; none is implied by this
report:

- any production or staging connection, query, migration or data change;
- creating, activating, reissuing credentials for or disabling any account, and
  any use of the DPAPI handoff;
- importing, resetting or cleaning data, including removing the residual audit
  rows and operation receipts;
- deploy, push, or any change to hosting, CI or environment configuration;
- running the disposable PostgreSQL replay once an approved runtime source
  exists;
- committing the outstanding ATT01 tooling, documentation or database changes.

## 8. Conclusion

Locally the ATT01 attendance slice is verified: the database is unlocked and
fingerprinted, the workbook-to-database reconciliation matches on all six
required totals, business keys, status totals and lifecycle state, 602 focused
tests pass across 56 files, lint and typecheck are clean, and the ATT01 commit
range has no whitespace defects. The single remaining reconciliation difference
is authorized staff provisioning, not attendance data.

**Live rollout is not authorized.** Items 1-5 above remain outstanding, and this
report must not be read as production readiness, migration approval, pilot
approval, or permission to provision any live account.
