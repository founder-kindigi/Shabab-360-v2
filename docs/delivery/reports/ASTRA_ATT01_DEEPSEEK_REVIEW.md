# Astra review — ATT01 attendance lifecycle correction

Outcome: **one correction required before backend acceptance.**

## Accepted source findings

The close route no longer changes participant lifecycle state. It preserves
authorization, concurrent-close handling, and the event-close audit while
returning the compatibility field `automaticDropouts: 0`.

The reactivation route now requires and bounds an effective rejoin date,
retains the original interruption data, writes `reactivatedAt`, and audits the
change. The shared eligibility helper, roster, marking path, and attendance
summary route correctly use the interruption window. The submitted focused
tests are meaningful regression coverage for these paths.

## P1 — home analytics omits the rejoin date

`src/app/api/admin/home-analytics/route.ts:27` passes participant projections
to `attendanceOpportunities` but selects no `reactivatedAt`. The helper then
correctly treats the value as absent and excludes every session on or after a
stored dropout date, even after an approved rejoin. This makes dashboard and
park/Murabbi attendance totals wrong for a returning student.

Add `reactivatedAt` to the projection and a focused regression test that proves
an active participant with a past dropout and valid rejoin contributes only to
pre-dropout and post-rejoin opportunities. Preserve its privacy-safe response,
scope behavior, pagination bounds, and all other route behavior.

## Evidence limits

DeepSeek reported 20 attendance files/101 tests and 26 files/144 tests,
typecheck and scoped lint as passing. Astra has inspected the actual diff but
has not yet accepted those claims as final module evidence. No browser,
database, migration, deployment, production data, or team-release verification
has run. ATT01 remains active.

## Analytics correction review

Accepted. `home-analytics` now selects `reactivatedAt`, and the regression
test proves a returning participant contributes only before the interruption
and from the rejoin date onward. Astra re-ran the focused test: 1 file, 2 tests
passed. Scoped ESLint and TypeScript passed.

## Attendance contact exception

The owner clarified that scoped attendance staff must call or send a WhatsApp
message to the guardian of an absent student. The roster phone field and the
existing absence-follow-up controls are therefore accepted as a narrowly
scoped operational-contact exception. They must remain limited to the
server-authorized attendance workflow and must not expand into exports, general
directories, or unrelated client data.

## Frontend integration review

Accepted. The student profile now requires a labelled rejoin date before the
authorized reactivation request can be sent. The exact selected `effectiveDate`
is included only for reactivation; ordinary manual dropout requests retain their
existing body. The interaction tests cover the disabled state, request body,
success reset, and ordinary-dropout path.

The mobile attendance screen retained the current established layout. Astra
added the missing absence-only Call control beside the existing WhatsApp control.
It accepts only a normalized 7–15 digit guardian number and launches a `tel:`
link; invalid and absent values are rejected locally. Neither control appears
for any attendance state other than absent. This stays within the owner-approved
attendance contact exception.

Focused integrated evidence, with `NODE_ENV` cleared:

- 6 files / 37 tests passed: attendance eligibility, event roster, close,
  dropout/reactivation, mobile attendance, and student profile.
- Scoped ESLint and `npx tsc --noEmit` passed.
- Scoped `git diff --check` passed; Windows CRLF conversion notices only.

No browser, database, migration, production, deployment, or full-suite run is
claimed. The remaining ATT01 work is the bounded DeepSeek clean-code pass,
Astra review, build verification, and the operator handoff.

## DeepSeek cleanup review

Accepted. The actual cleanup diff removes only unused imports from four
in-scope ATT01 files. It leaves all lifecycle, scope, audit, offline, Call, and
WhatsApp logic intact. Although the working-tree diff also contains the earlier
ATT01 functional work in those files, Astra verified that DeepSeek's own edits
were import-only.

Astra independently re-ran the focused integrated suite with `NODE_ENV`
cleared: **22 files / 110 tests passed**. Scoped ESLint, `npx tsc --noEmit`,
and scoped `git diff --check` passed. The ATT01 production build passed after
the existing font download was available; it compiled, typechecked, generated
153 static pages, and exited 0.

The module is ready for the team operator check. No database, production
browser, deployment, or full-repository test suite was run, and no release or
deployment approval is implied.

## Backend slice outcome

Accepted for integrated cleanup. This remains Astra lead review only, not merge,
deployment, or team-release approval.
