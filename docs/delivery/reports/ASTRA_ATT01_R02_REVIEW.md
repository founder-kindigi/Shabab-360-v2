# Astra review — ATT01-R02

Date: 2026-09-17. Outcome: **changes required**.

## Accepted

- Renaming the eligible-assistants dynamic segment from `[parkId]` to `[id]` removes the conflicting dynamic slug while preserving the URL shape.
- The Muawin home branch now renders a limited, content-only screen instead of a blank page.
- The fake Park and Murabbi roster arrays were removed.
- The focused role and route suites pass locally: 5 files and 14 tests.

## Required corrections

### P1 — preserve the selected park when a Murabbi opens attendance

`pwa-app.tsx` renders `MobileMurabbiDashboard` with `onNavigate` only. The new `onSelectPark` handler therefore never runs, `parkNav` stays unset, and `MobileAttendancePage` receives an empty `parkId`. This leaves the reported assigned-Murabbi attendance failure in place.

Pass the same park-selection callback used by the Park Lead branch, then add an interaction test that clicks **Mark Group Attendance** and proves both the real park id and the `attendance` screen are selected. Do not use a fallback park id.

### P1 — remove static session and batch claims from the Park dashboard

`mobile-park-dashboard.tsx` still renders `Batch 4`, `Sunday Training Session`, `Full Park Attendance Roster`, and `Live Session` regardless of the response. It also shows an enabled attendance action when there are no returned sessions and retains `park-lhr-2` as an action fallback. These are sample claims and can send staff into an invalid flow.

Use `parkData.batch` and an actual returned event for the label/action. When there is no park, active batch, or actionable event, show a clear loading, error, no-assignment, or no-scheduled-class state and omit the action. Add tests for the no-event and failed-query states.

### P1 — show a useful no-scheduled-class state for an assigned Murabbi

The Murabbi page hides the action when no open event exists, but leaves no explanation. It also still labels every real event `Sunday Group Session` rather than using that event's data. Render a truthful no-scheduled-class state and use the returned event title/date for an actionable session.

### P2 — complete the requested visible terminology change

`attendance-report-print.tsx` still renders the operator-visible label `Excused`. Replace that display text with `Leave` without changing the `excused` status key. Add or update a focused assertion.

## Review limits

No browser/device run, local-data refresh, account change, full suite, production build, or deployment was performed. The local phantom participants remain a separate backup-gated data repair.

## Correction review — 2026-09-17

The Murabbi callback, no-scheduled-class panel, dynamic event title, and report label correction are now present and their focused tests pass. Those parts are accepted.

The Park dashboard correction is **not accepted**. The current file still defines and uses `FALLBACK_GROUPS`, `Gulberg Park`, `Lahore`, `Assigned Murabbi`, fallback group counts/rates, and a fallback Murabbi total. A failed or empty query can therefore still display fabricated operational data. The file also contains a broad blank-line-only rewrite (377 additions for 29 removals), rather than the requested bounded edit.

Remove every remaining fallback/data fabrication and restore normal file formatting. Add a failed-query/no-park test proving no fabricated park, group, manager, count, rate, batch, or attendance control appears. Re-run the focused suite, scoped lint, typecheck, and scoped diff check before resubmission.

## Final acceptance — 2026-09-17

The final Park dashboard correction removes the remaining sample values and provides separate loading, failed-query, no-park, real-data, no-session, and empty-group states. The focused dashboard suite passes 5/5 independently; scoped lint, whitespace check, and repository typecheck pass.

ATT01-R02 is accepted. This accepts the frontend role-repair packet only. It does not approve the still-required local attendance-data rebuild, operational staff rollout, deployment, or release.
