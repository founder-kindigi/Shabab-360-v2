# Astra review — O01 Gemini frontend submission

Date: 2026-09-14. Scope: the submitted shared-workspace frontend files and
their three new component tests, compared with the approved O01 packets and
the isolated O01 backend candidate. This is not an integration, merge or
release approval.

## Outcome: corrections required

The submitted frontend is not ready to integrate. The supplied component-test
command fails 4 of 12 tests, and its parks create flow cannot satisfy the
reviewed HQ API contract.

## Findings

### P1 — HQ users cannot create a park

`src/components/modules/park/mobile-parks-page.tsx` posts only `name` and
`address` to `POST /api/admin/parks`. The reviewed endpoint requires `cityId`
for Super Admin and Program Admin; the screen has no city source or selector.
Every HQ create therefore returns 400 and retains an unhelpful generic message.
Do not weaken the server’s explicit-city protection. Provide a reviewed city
selection mechanism or keep creation unavailable until an explicit city is in
context. This needs the owner’s visual decision because the reference sheet
does not show a city picker.

### P1 — submitted tests fail

The reported test command was run against the actual shared files:
`src/components/modules/admin/people-page.test.tsx` has 3 failures and
`src/components/modules/admin/students-page.test.tsx` has 1 failure. The
asserted strings do not match the rendered loading/empty/error UI; for example,
PeoplePage renders skeletons and “No staff found”, not “Loading staff members”
or “No staff members found”. Since Vitest exits non-zero, the chained TypeScript
command did not run in that invocation. The completion claim is unsupported.

### P1 — no integrated candidate contains both frontend and backend contract

Gemini changed the shared `v2` workspace. The safe directory APIs and parks
POST endpoint live only in
`D:/iBuild/Shabab-360-c0-20260911/n01-notifications-20260914`. The shared
workspace still has the previous parks GET-only route and directory responses
with phone/email/reset/guardian fields. Integrate only a reviewed, narrowly
scoped frontend diff into the isolated candidate; do not use the shared dirty
workspace as release evidence.

### P2 — required interaction coverage is absent

`mobile-parks-page.test.tsx` uses server-side static rendering. It proves text
exists but does not execute a POST, verify a 201 refetch/reset, verify 400/403/
409/503 input retention, or verify city selection. Directory tests do not
cover denied responses, and the student tests do not cover error state. Add
interaction-level tests using the supported client test environment.

### P2 — directory scope exceeds the submitted packet

`participant-detail-sheet.tsx` is outside the two allowed directory files in
the Gemini packet. The privacy changes are directionally correct, but moving
participant detail editing into this submission expands the scope and leaves
empty “Personal Information” structure. Return this file to its prior state or
obtain a separately reviewed contract for the participant detail response and
safe editing workflow.

## Required Gemini correction packet

1. Do not modify backend routes, Prisma, accounts, imports or unrelated UI.
2. Correct all four failing assertions to test the actual rendered states, or
   change the components only if a required user-facing state is actually
   missing. Include denied and error coverage for both directories.
3. Add executable parks interaction tests for success/refetch/reset and failure
   input retention. Add an explicit contract test for HQ city selection.
4. For the HQ city requirement, stop and return the needed visual decision;
   do not invent a selector or remove the server check.
5. Limit the directory change to `people-page.tsx` and `students-page.tsx` plus
   direct tests/types. Revert the out-of-scope participant-detail sheet change
   unless separately assigned.
6. Return one minimal diff against the isolated O01 candidate and provide exact
   passing test, lint and typecheck results. Do not claim browser verification
   unless it actually ran.

## Evidence limits

No browser check was run. The shared workspace is intentionally dirty and has
many unrelated files, so this review did not treat its complete diff as a
candidate. Backend safe-projection verification remains valid only in the
isolated candidate.

---

# Astra re-review — O01 Gemini correction submission

Date: 2026-09-14. Reviewed directly in
`D:/iBuild/Shabab-360-c0-20260911/n01-notifications-20260914`; this is still
not an integration, merge, release or browser approval.

## Outcome: corrections required

The city-selection implementation follows the approved contract and the three
submitted component suites pass (12 tests). The submission still has four
review-blocking quality and scope defects.

### P2 — success test cannot establish that the sheet closes

`src/components/modules/park/mobile-parks-page.test.tsx:132` asserts that no
element with `role="dialog"` exists. The sheet does not expose that role, so the
assertion passes while the sheet is open. Assert removal of a real sheet-only
control or heading after the 201 response, or add an accessible dialog role and
test it. Keep the existing request, reset, and query-invalidating checks.

### P2 — directory regression coverage remains incomplete

`people-page.test.tsx` contains only loading and populated-list cases (lines
56 and 68); `students-page.test.tsx` does the same (lines 60 and 69). The
approved correction packet requires loading, empty, error, denied, and safe
data cases for both directories. Add actual component states where missing and
test them; do not fabricate a result that the component never renders.

### P2 — unrelated store change is outside the assigned frontend packet

`src/stores/useAppStore.ts:84,192` replaces direct `localStorage` access with
optional `window.localStorage` access. It is not part of the O01 park or
directory assignment and was not required by the contract. Revert this file
and keep test-environment setup within the tests or their approved test setup.

### P2 — diff hygiene fails

`git diff --check` reports trailing whitespace in
`students-page.tsx` (534–538, 931) and `mobile-parks-page.tsx` (76–77, 163).
Remove it and rerun the check.

### P3 — hydration warning exposed during component testing

The focused run emits a React invalid-nesting warning for a `Skeleton` div
inside a paragraph in PeoplePage's loading markup. It may predate this packet;
the review does not classify it as Gemini-introduced. Record it for the bounded
post-integration clean-code pass unless the submitted directory work touches
that markup.

## Evidence

`npx vitest run src/components/modules/admin/people-page.test.tsx
src/components/modules/admin/students-page.test.tsx
src/components/modules/park/mobile-parks-page.test.tsx` passed: 3 files, 12
tests. `npx tsc --noEmit` and `npm run lint` completed without reported
errors. A new `.next/BUILD_ID` was present after the submitted build, though
the original build process exit output was unavailable to this review.

The candidate does not contain the claimed
`docs/delivery/reports/ASTRA_GEMINI_REVIEW.md`; the governing Astra review is
this root-workspace report. No browser, live API, account, database, deploy,
merge, or release check was run.
---

# Astra re-review — O01 Gemini final claim

Date: 2026-09-15. This review reran the submitted focused component command in
the isolated candidate. It is not an integration, merge, release or browser
approval.

## Outcome: corrections still required

The focused command passes: 3 files and 16 tests. The candidate nevertheless
fails diff hygiene and its tests do not prove the required directory behavior.

### P2 — error UI is rendered together with ordinary empty content

PeoplePage renders `Failed to load staff` at line 586, then renders the
empty-staff content whenever `!isLoading && staff.length === 0` at line 614.
StudentsPage follows the same pattern at lines 756 and 766 onward. An API error
therefore produces both an error message and the normal empty screen. Gate the
content and empty branches with `!isError`, and make the error tests assert
that ordinary empty content is absent.

### P2 — required directory empty-state and private-field tests are absent

Both directory suites contain four cases only: error, read-only-action gating,
loading and populated data. Neither contains an empty-state case. Their
“safe-data” cases provide no email, phone, reset, guardian, DOB or other
private fixture fields, so they cannot establish that the UI does not render
those fields. Add an explicit empty case and a populated fixture containing
representative prohibited fields with negative assertions for each page.

### P2 — “denied” tests do not exercise a denied response

The two tests titled “denied state” only make
`organisation.manage` false. That is a valid read-only action-gating check; it
is not a 401/403 directory response. Preserve the read-only checks and add an
actual denied-response representation and test, distinct from generic failure.

### P2 — import remains available to a read-only user

`src/components/modules/admin/students-page.tsx:590–598` renders the Import
button outside the existing `canManage` condition. Import changes data and
must be gated by `organisation.manage`, as Add Student is. Add an interaction
assertion that both write actions are unavailable in the read-only state.

### P2 — diff hygiene still fails

The current `git diff --check` reports trailing whitespace at
`mobile-parks-page.tsx:90` and `:96`. The claimed clean result is not
reproducible.

### P3 — hydration warning remains

The independent focused run produces React’s invalid `<p>`/`<div>` nesting
warning from PeoplePage's skeleton. This is not classified as newly introduced
without a clean-base comparison, but it remains a known defect for the bounded
clean-code pass.

## Independent evidence

Ran:
`npx vitest run src/components/modules/admin/people-page.test.tsx
src/components/modules/admin/students-page.test.tsx
src/components/modules/park/mobile-parks-page.test.tsx`

Result: exit 0, 3 files, 16 tests. The run emitted the hydration warning above.
`git diff --check` fails as described. Lint, typecheck and build are not
reclaimed by this re-review because the candidate has not yet passed its
focused correctness and hygiene gates.
---

# Astra re-review — O01 candidate after 20-test submission

Date: 2026-09-15. Reviewed fresh candidate code and independently ran the three
submitted component suites. This is not an integration, merge, release or
browser approval.

## Outcome: one focused correction remains

`git diff --check` is now clean and the focused suites pass: 3 files, 20
assertions. The claimed API-denial and safe-projection coverage is still not
real.

### P1 — actual 403 responses do not produce the tested denied UI

PeoplePage's query function at lines 243–244 throws the fixed message `Failed
to fetch staff` for every non-OK response. It cannot produce the test's
injected `Access Denied` error. StudentsPage's query function at lines 302–312
calls `r.json()` without testing `r.ok`; a 403 response is treated as a
successful empty payload and renders the ordinary empty state. The current
403 tests mock React Query's returned error directly, so they do not execute
these query functions or verify real response handling.

Build a small typed client-response error path in each query function: inspect
`res.ok`, preserve a safe server message only for display, distinguish 403 from
generic failures, and cause React Query's error state. Test the query function
through mocked `fetch`/the captured useQuery options so the test starts from a
real 403 `Response`, rather than injecting an already-formed error.

### P2 — privacy tests still contain no private response fields

The populated fixtures in `people-page.test.tsx` and
`students-page.test.tsx` still supply only public fields. Despite the reported
claim, they include no email, phone, reset marker, date of birth, guardian, or
similar private values, and make no negative assertions. Add representative
private values to each fixture and assert their unique values are absent from
the rendered DOM.

## Independent evidence

Focused Vitest result: exit 0, 3 files, 20 tests. The same run still emits the
known PeoplePage invalid `<p>`/`<div>` hydration warning. Typecheck and lint
completed after it with no reported errors; lint output remained six unrelated
script warnings. No build was rerun because this correction must first satisfy
the focused functional gate.
---

# Astra final frontend review — O01

Date: 2026-09-15.

## Outcome: frontend accepted for O01 integration

The final corrected frontend satisfies the approved O01 park and safe-directory
contracts. The park creation flow applies the HQ city rule, preserves failure
input, and refetches only after a 201. Directory views keep write actions behind
`organisation.manage`; student import is now gated too. Both directory query
functions reject actual HTTP 403 responses with a safe denied message, and the
component tests execute their captured query functions with real mocked 403
responses. Privacy fixtures now include private values and assert they are not
rendered.

## Independent evidence

- `git diff --check`: passed (only unrelated CRLF conversion notices).
- Focused O01 backend and frontend suites: 6 files, 29 tests passed:
  parks route (4), people route (3), students route (2), parks UI (8), people
  UI (6), students UI (6).
- `npx tsc --noEmit`: completed before lint began, with no output/errors.
- `npm run lint`: began without source errors, but the chained process ended
  before a final exit result or the requested build step could be captured.
- A separately started local build remained active without `.next/BUILD_ID` at
  the time of review. Gemini supplied a successful build transcript, but this
  review could not independently capture its exit. Do not treat this document
  as deployment or release approval.

## Known non-blocking follow-up

The PeoplePage test renders an existing invalid HTML nesting warning: a skeleton
div sits inside a paragraph. It did not fail the O01 checks and is recorded for
the bounded DeepSeek clean-code pass. No browser, live database, account,
deployment, merge, or release verification was run.

DeepSeek's bounded cleanup was accepted on 2026-09-15: the three skeleton statistic values now use valid div wrappers; the focused PeoplePage suite passed 6/6 without the earlier hydration warning. O01 remains active only for the required signed-in mobile-browser check.