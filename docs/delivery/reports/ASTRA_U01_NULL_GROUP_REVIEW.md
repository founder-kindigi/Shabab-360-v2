# Astra review — U01 null-group corrections

Outcome: **corrections required before U01 acceptance.**

## Accepted backend findings

The reviewed server routes now use explicit guards rather than non-null
assertions. The certificate route uses the resolved group ID; scoped guardian
detail access denies an unassigned child; park directories, analytics, roster,
reports and attendance surfaces exclude unassigned participants. The reviewed
focused U01 suite passed locally: 4 files, 53 tests. The disposable SQLite and
PostgreSQL checks previously established that deleting a group preserves a
participant with a null `groupId`.

## P1 — new nullable guardian payloads break existing client views

The corrected guardian detail endpoint returns `child.group: null` for a
central caller's unassigned child. `src/components/modules/admin/guardian-detail-sheet.tsx`
still declares `ChildEntry.group` as required and renders `child.group.name`,
`child.group.batch.name`, and related fields without a guard. Opening such a
guardian record will throw in the client.

The corrected guardian schedule route returns `group: null` and `events: []`
for an unassigned child. `src/components/modules/guardian/guardian-schedule-page.tsx`
still treats the group as required, so this safe API state is not rendered.

The mobile guardian dashboard reads an unassigned child's null group fields but
substitutes sample location/group text (`Gulberg Park` and `Group Abu Bakr`).
That invents placement data for an unassigned participant and must be replaced
with an explicit unassigned state.

## Required Gemini correction

Update only the three components above and their focused component tests. Make
their response types nullable, render an explicit `Unassigned` state, omit
group-derived schedule/fee/attendance labels where absent, and never use sample
fallback placement text. Preserve the established mobile design. No API,
schema, migration, account, database, package, or deployment change is allowed.

## Evidence limits

The latest repository typecheck is still blocked by four existing imports of
`@testing-library/react`, which is absent from the current package manifest.
No full build or browser check has run for the new nullable payload integration.
This is Astra's source review, not independent review, merge, or release
approval.

## Gemini correction review

Gemini's three component files and three focused tests are present in the shared
workspace. Astra re-ran their focused suite: 3 files, 6 tests passed. The run
emitted a React `NaN` attribute warning from the schedule test fixture.

**P1: guardian schedule still dereferences a nullable group.**
`guardian-schedule-page.tsx` declares `ChildData.group` as required and reads
`child.group.name` and `child.group.parkName` while building its flattened
event list. The new unassigned test supplies `events: []`, so it never reaches
that code path. An unassigned child with a nonempty event list from stale or
inconsistent data can still crash. Make `group` nullable, exclude unassigned
children from the flattened event list, and add that nonempty-event fixture.

Remove the trailing blank lines reported by `git diff --check`, and give each
schedule test a complete `weekStart`, `weekEnd`, and `weekLabel` fixture so the
test has no React warning. Re-run the same focused suite. U01 remains in
review.

## Gemini correction acceptance

Gemini corrected the schedule integration. `ChildData.group` is nullable; an
unassigned child is explicitly labelled `Unassigned`; and the calendar and
flattened detail list ignore any group-derived events when there is no group.
The focused schedule test now supplies a nonempty stale-event fixture for an
unassigned child and verifies that it is not rendered. The fixture also carries
a complete week range, removing the earlier React warning.

Verified locally:

- Guardian component tests: 3 files, 6 tests passed.
- Combined U01 server, migration-preflight, and guardian component tests: 7
  files, 60 tests passed.
- `tsc --noEmit`: passed after adding the missing declared test dependency
  `@testing-library/react`.
- `eslint .`: passed with 0 errors and six pre-existing warnings in standalone
  `scripts/*.cjs` files.
- Scoped `git diff --check`: passed; Windows CRLF conversion notices only.
- `npm run build`: passed; 153 static pages generated and the U01 assignment
  route was included in the production route manifest.

The full Vitest suite was attempted twice, including serial execution. Both
runs produced no output or completion for several minutes and were stopped;
they are not passing evidence. No production database, migration, deployment,
or account action occurred.

**Current outcome: U01 is ready for the required bounded DeepSeek clean-code
pass, then Astra's final source and verification review. It is not yet accepted
for merge or release.**

## DeepSeek clean-code review and final U01 outcome

Accepted. DeepSeek made one behavior-preserving server improvement: the
student directory now reuses the existing `hierarchyGroupWhere` helper instead
of duplicating its scope predicate. The test was correctly changed to retain
the real helper while mocking only hierarchy resolution. The guardian changes
are whitespace-only cleanup around the already-reviewed nullable type and
`Unassigned` rendering. No API, authorization, audit, schema, migration, or
visual behavior changed in this pass.

The missing JSDOM test environment was a repository dependency defect, so
Astra added declared development dependency `jsdom` and locked it. This enabled
the existing guardian DOM suites; it was not part of DeepSeek's cleanup scope.

Final verification:

- Student U01 route tests: 4 files, 53 tests passed.
- Guardian DOM tests: 3 files, 7 tests passed.
- TypeScript: passed with zero errors.
- Scoped ESLint and `git diff --check`: passed with zero errors; CRLF notices
  only.
- Production build: passed; 153 static pages generated.

The repository-wide Vitest run remains unverified: two attempts stalled with
no output and were stopped. This does not reduce the focused U01 evidence, but
it must not be reported as a full-suite pass. Disposable SQLite and PostgreSQL
checks previously verified nullable `groupId` plus `ON DELETE SET NULL`; no
production data, migration, deployment, or account action occurred.

**Outcome: accepted as Astra lead review for the integrated local U01
candidate. U01 is ready to unblock A02. This is not independent review, merge,
deployment, or release approval.**
