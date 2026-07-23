# LAHORE STABILIZATION IMPLEMENTATION CONTRACT

- **Document Version:** 1.1.0
- **Task ID:** `PKG-07`
- **Status:** Ready for Implementation Review
- **Base Commit:** `be29368` on `codex/production-hardening`
- **Branch:** `agent/antigravity/pkg-07-lahore-stabilization-contract`
- **Author:** Antigravity (Claude Sonnet 4.6)

---

## 1. Purpose and Scope

This contract translates the integrated UAT and static-review evidence from PKG-02 into a set of small, non-overlapping repair packages for the existing Lahore-backed app, ahead of any broad redesign or new module work.

**Strict constraints on this contract:**

- No Prisma schema changes, migrations, new API routes, UI code, or tests are written here. An existing scoped API response may be modified only where verified necessary (see RP-08).
- No database reads or writes.
- No secrets or personal data.
- This document only defines what shall be implemented, the evidence for each item, and the acceptance criteria an implementer must satisfy.

**Evidence base:**

| Source | Summary |
|--------|---------|
| `LAHORE_STABILIZATION_REPAIR_BACKLOG.md` | 6 static mobile candidates (CANDIDATE-DEFECT-01 through 06); browser UAT blocked |
| `UAT-002` | 18 UAT scenarios; all executed as static audit; none required live browser; scope-denial logic confirmed correct |
| `UAT-003-EXECUTION-CHECKLIST.md` | Execution procedures preserved for future browser UAT |
| `UAT-004-TEST-DATA-ISOLATION-RUNBOOK.md` | Data-isolation constraints preserved for future live UAT |
| `UAT-005-EXECUTION-EVIDENCE-LOG.md` | Static audit complete; 6 mobile candidates logged; browser UAT blocked and pending |
| `UX-001-LAHORE-SCREEN-INVENTORY.md` | 44-screen inventory; 3 code-confirmed findings: batch end-date validation (`B-V05`), report table scroll, access-pending guidance |
| `UX-002-LAHORE-MOBILE-RESPONSIVE-AUDIT.md` | 11 mobile candidates with exact file/line references and code evidence |
| `UX-004-MOBILE-EVIDENCE-MATRIX.md` | Structured test definitions for 11 candidates; browser UAT pending |


---

## 2. Evidence Classification and Eligibility Rules

Per the task requirements, items must meet one of:

1. **Ready to implement** — statically confirmed code defect with exact file and line evidence; no live browser required to reproduce the class of problem.
2. **Implementation-eligible static candidate; browser UAT required for final acceptance** — static code evidence is sufficient to proceed with the layout improvement as a low-risk change, but the repair must not be reported as a confirmed defect or marked complete until mobile browser evidence exists.
3. **Browser-UAT-required candidate** — code evidence supports the hypothesis but live browser validation is required before any implementation is commissioned.
4. **Owner decision required** — policy, priority, or scope question that cannot be resolved from available evidence.

Items that are only "blocked browser UAT" observations with no corroborating static code evidence are **not included** as ready-to-implement repairs.

---

## 3. Repair Packages

### RP-01: Batch End-Date Server Validation

**Classification:** Ready to implement

**Category:** Data display / validation

| Field | Detail |
|-------|--------|
| Evidence source | UX-001 Section 4.1 Finding #1; `src/app/api/admin/batches/route.ts` Zod `batchSchema` |
| Severity | High — data integrity defect |
| Affected roles | `super_admin`, `program_admin`, `city_head` |
| Affected routes | `POST /api/admin/batches`, `PATCH /api/admin/batches/[id]` |
| Lahore data impact | None — repair affects input validation only; no existing Lahore batch records are modified |

**Exact allowed files:**

- `src/app/api/admin/batches/route.ts`
- `src/app/api/admin/batches/[id]/route.ts` (if PATCH exists)
- `src/lib/validations/batch.ts` or inline schema in the route file

**Expected behavior:**

- `POST /api/admin/batches` and `PATCH /api/admin/batches/[id]` must return `400` with a descriptive validation error when `endDate < startDate`.
- `endDate >= startDate` refinement must be added to the Zod schema used in both the create and update handlers.
- Existing Lahore batch records must be unaffected.

**Acceptance tests:**

1. `POST /api/admin/batches` with `endDate < startDate` returns `400` and an error message referencing end-date ordering.
2. `POST /api/admin/batches` with `endDate === startDate` succeeds (single-day batch is valid).
3. `POST /api/admin/batches` with `endDate > startDate` succeeds.
4. Existing Lahore batch records are unaffected by adding the validation.

**Rollback / data / security impact:**

- No data written; validation-only change.
- Rollback: revert the Zod refinement line.
- No authorization surface change.

---

### RP-02: Mobile Bottom Navigation Padding Offset (MOB-NAV-01)

**Category:** Mobile attendance / navigation layout

**Classification:** Implementation-eligible static candidate; browser UAT required for final acceptance

| Field | Detail |
|-------|--------|
| Evidence source | LAHORE_STABILIZATION_REPAIR_BACKLOG CANDIDATE-DEFECT-01; UAT-005 CANDIDATE-BUG-01; UX-002 `MOB-NAV-01`; `src/components/shared/bottom-nav.tsx:L110-112` |
| Severity | P1 — floating pill at `fixed bottom-4 z-40` with no guaranteed bottom padding on scroll containers |
| Affected roles | All mobile roles (`city_head`, `park_lead`, `park_admin`, `murabbi`, `guardian`, `student`) |
| Affected routes | Global shell layout — all routes that render the bottom navigation pill |
| Lahore data impact | None — layout-only change |

**Exact allowed files:**

- `src/components/shared/bottom-nav.tsx`
- `src/components/layout/app-shell.tsx` (or equivalent wrapper that sets the page scroll container)
- Individual page wrapper components **only** if no shared scroll container exists (to be confirmed by implementer before editing)

**Expected behavior:**

- All scroll container wrappers that appear below the bottom navigation pill must have a minimum bottom padding of `pb-24` (or equivalent offset that keeps interactive elements scrollable clear of the floating pill).
- The bottom navigation pill position, z-index, and visual appearance must remain unchanged.
- Desktop layouts (`lg:` breakpoints and above) must be unaffected.

**Acceptance tests (browser UAT required to confirm):**

1. On a 375px viewport, scroll to the bottom of the People list, Students list, or Attendance Roster. The last row of the list is scrollable clear of the floating nav pill.
2. Open any modal sheet or bottom sheet. Primary CTA (Submit/Cancel) buttons are reachable without the floating nav pill overlapping them.
3. Desktop layout at 1024px+ shows no regression in page scroll behavior.

**Rollback / data / security impact:**

- Layout-only change; no data, auth, or API surface change.
- Rollback: remove the `pb-24` class additions.

---

### RP-03: Attendance Status Button Touch Target Expansion (MOB-ATT-01)

**Classification:** Implementation-eligible static candidate; browser UAT required for final acceptance

**Category:** Mobile attendance

| Field | Detail |
|-------|--------|
| Evidence source | LAHORE_STABILIZATION_REPAIR_BACKLOG CANDIDATE-DEFECT-04; UAT-005 CANDIDATE-BUG-06; UX-002 `MOB-ATT-01`; `src/components/modules/park/attendance-roster.tsx:L1110` |
| Severity | P1 — 28px status buttons below 44px WCAG mobile touch target guideline |
| Affected roles | `murabbi`, `park_admin`, `park_lead` |
| Affected routes | `/park/attendance` |
| Lahore data impact | None — UI-only change |

**Exact allowed files:**

- `src/components/modules/park/attendance-roster.tsx`

**Expected behavior:**

- Status toggle buttons (Present, Absent, Late, Excused) must have a minimum touch target of `w-10 h-10` (40px × 40px) on mobile viewports, or equivalent padding increase to meet at least 40px in both dimensions.
- The visual appearance of the button (icon size, color, shape) may differ between mobile and desktop breakpoints; the core icon styling `w-7 h-7` may remain for desktop.
- Sufficient horizontal gap between adjacent status buttons must prevent accidental mis-taps.

**Acceptance tests (browser UAT required to confirm final result):**

1. Static check: status button elements include `w-10 h-10` or `min-w-[40px] min-h-[40px]` in mobile responsive CSS.
2. Browser UAT: on a 375px viewport, tapping the Absent button consistently changes only the Absent status without triggering adjacent buttons.
3. Desktop layout at `sm:` breakpoint and above retains existing button appearance.

**Rollback / data / security impact:**

- UI-only; no data, auth, or API change.
- Rollback: revert the size class change in the button element.

---

### RP-04: Student Directory Filter Drawer for Mobile (MOB-PEO-02)

**Classification:** Implementation-eligible static candidate; browser UAT required for final acceptance

**Category:** Navigation / layout

| Field | Detail |
|-------|--------|
| Evidence source | LAHORE_STABILIZATION_REPAIR_BACKLOG CANDIDATE-DEFECT-02; UAT-005 CANDIDATE-BUG-02; UX-002 `MOB-PEO-02`; `src/components/modules/admin/students-page.tsx:L592-657` |
| Severity | P1 — 5 vertically stacked filter controls consume ~272px, hiding student data on 375px screens |
| Affected roles | `super_admin`, `program_admin`, `city_head` |
| Affected routes | `/admin/students` |
| Lahore data impact | None — layout-only change |

**Exact allowed files:**

- `src/components/modules/admin/students-page.tsx`

**Expected behavior:**

- On mobile viewports (below `sm:` breakpoint), the five filter controls (Search, City, Park, Group, State) must be hidden behind a collapsible "Filters" trigger button or displayed in a horizontal scroll container so that the student roster data is visible above the fold on initial page load.
- On `sm:` breakpoints and above, the existing `flex-col sm:flex-row` filter layout must remain unchanged.
- All five filter controls must remain fully functional; collapsing them behind a drawer does not remove filter state or reset applied filters on close.

**Acceptance tests (browser UAT required to confirm):**

1. Static check: a collapsible filter panel or equivalent exists in the component, controlled by a toggle visible on mobile.
2. Browser UAT: on a 375px viewport, the initial Students page load shows at least one student record row above the fold without scrolling.
3. Applying filters from the collapsed drawer still filters the student list correctly.
4. Desktop layout at `sm:` and above shows the full filter row in line, unchanged.

**Rollback / data / security impact:**

- UI-only; no data, auth, schema, or API surface change.
- Rollback: remove the mobile-conditional drawer wrapper and restore the original `flex flex-col sm:flex-row gap-3` layout.

---

### RP-05: Student Card Checkbox and Avatar Touch Area Separation (MOB-PEO-03)

**Classification:** Implementation-eligible static candidate; browser UAT required for final acceptance

**Category:** Navigation / layout

| Field | Detail |
|-------|--------|
| Evidence source | LAHORE_STABILIZATION_REPAIR_BACKLOG CANDIDATE-DEFECT-03; UAT-005 CANDIDATE-BUG-03; UX-002 `MOB-PEO-03`; `src/components/modules/admin/students-page.tsx:L892-901` |
| Severity | P1 — `absolute -top-1 -left-1 size-5` checkbox overlaps `size-10` avatar; touch misfires open detail sheet |
| Affected roles | `super_admin`, `program_admin`, `city_head` |
| Affected routes | `/admin/students` (mobile card view) |
| Lahore data impact | None — UI-only change |

**Exact allowed files:**

- `src/components/modules/admin/students-page.tsx`

**Expected behavior:**

- On mobile viewports, the selection checkbox must be visually and spatially separated from the avatar initials bubble, so that tapping the avatar opens the student detail sheet without toggling row selection.
- Acceptable implementations include: placing the checkbox in its own layout column to the left of the avatar, or introducing a distinct Selection Mode toggle that reveals checkboxes only when activated.
- The existing `e.stopPropagation()` handler on the checkbox container must remain so that card-level click does not interfere with checkbox interactions.
- Desktop layout must be unaffected.

**Acceptance tests (browser UAT required to confirm):**

1. Static check: the checkbox element is no longer `absolute -top-1 -left-1` overlapping the avatar on mobile viewports.
2. Browser UAT: on a 375px viewport, tapping the avatar initials opens the student detail sheet without toggling the checkbox.
3. Tapping the checkbox area selects the row without opening the detail sheet.
4. Desktop layout at `sm:` and above is unaffected.

**Rollback / data / security impact:**

- UI-only; no data, auth, or API change.
- Rollback: revert positioning class change to `absolute -top-1 -left-1`.

---

### RP-06: City Head Dashboard Currency Overflow (MOB-DASH-02)

**Classification:** Implementation-eligible static candidate; browser UAT required for final acceptance

**Category:** Dashboard consistency

| Field | Detail |
|-------|--------|
| Evidence source | LAHORE_STABILIZATION_REPAIR_BACKLOG CANDIDATE-DEFECT-05; UAT-005 CANDIDATE-BUG-04; UX-002 `MOB-DASH-02`; `src/components/modules/city-head/city-head-dashboard.tsx:L377-399` |
| Severity | P2 — large PKR amounts exceed ~147px column width in `grid-cols-2` at 375px |
| Affected roles | `city_head` |
| Affected routes | `/city-head/dashboard` |
| Lahore data impact | None — display formatting only |

**Exact allowed files:**

- `src/components/modules/city-head/city-head-dashboard.tsx`

**Expected behavior:**

- Currency values in the Fees Overview `grid-cols-2` section must not overflow their column boundaries at 375px viewport width.
- Acceptable implementations include: adding `truncate` or `break-words` to the currency `<p>` element, reducing font size to `text-base` or `text-lg` for mobile breakpoints, or formatting values with shorthand suffixes (e.g. `Rs 12.5M` for amounts ≥ 1,000,000).
- The two-column grid layout itself must remain unchanged.

**Acceptance tests (browser UAT required to confirm):**

1. Static check: the currency `<p>` element includes `truncate`, a responsive font-size class, or a formatting function for large values.
2. Browser UAT: on a 375px viewport, a fee total of `Rs 12,500,000` renders within its grid column without spilling into the adjacent column.
3. Desktop layout at `sm:` and above is unaffected.

**Rollback / data / security impact:**

- Display-only; no data, auth, schema, or API change.
- Rollback: remove the added class or formatting function.

---

### RP-07: Access Management Capability String Overflow (MOB-ACC-01)

**Classification:** Implementation-eligible static candidate; browser UAT required for final acceptance

**Category:** Role UX boundaries / data display

| Field | Detail |
|-------|--------|
| Evidence source | LAHORE_STABILIZATION_REPAIR_BACKLOG CANDIDATE-DEFECT-06; UAT-005 CANDIDATE-BUG-05; UX-002 `MOB-ACC-01`; `src/components/modules/admin/access-management-page.tsx:L263` |
| Severity | P2 — monospace capability string collides with Revoke/Revert button at 375px |
| Affected roles | `super_admin` |
| Affected routes | `/admin/access` |
| Lahore data impact | None — display-only change |

**Exact allowed files:**

- `src/components/modules/admin/access-management-page.tsx`

**Expected behavior:**

- The named-user exception list item layout must prevent the monospace capability identifier from colliding with or pushing off-screen the badge and action button.
- Acceptable implementations include: adding `truncate` or `min-w-0 overflow-hidden` to the capability text container, stacking the capability string above the action row on narrow viewports, or wrapping the item using `flex-wrap`.
- The action button (Revert/Revoke) must remain clickable and fully visible on 375px viewports.

**Acceptance tests (browser UAT required to confirm):**

1. Static check: the capability text element includes `truncate`, `min-w-0`, or `flex-wrap` to prevent overflow.
2. Browser UAT: on a 375px viewport, the Revert button for a long capability like `access.role_defaults.manage` is fully visible and clickable.
3. Desktop layout at `sm:` and above is unaffected.

**Rollback / data / security impact:**

- UI-only; no data, auth, or API change.
- Rollback: remove the added overflow class.

---

### RP-08: Student Profile Age and Grade Class Display (STU-106)

**Category:** Data display

| Field | Detail |
|-------|--------|
| Evidence source | UX-001 Section 4.2 Finding #3 (Lahore participant enriched fields); `src/components/modules/student/student-profile-page.tsx`; `src/app/api/user/profile/route.ts` |
| Severity | P2 — enriched Lahore Batch 4 `age` and `gradeClass` fields are imported but not surfaced on the Student Profile screen |
| Affected roles | `student` |
| Affected routes | `/student/profile` — rendered by `src/components/modules/student/student-profile-page.tsx`, which fetches `GET /api/user/profile` |
| Lahore data impact | Read-only display; no database writes |

**Code-verified finding:**

Code inspection confirms that `age` and `gradeClass` are not included in the current response.

- `src/app/api/user/profile/route.ts` lines 82–98: the `GET` handler queries `db.participant.findFirst` using `include` (all fields available in the Prisma result), but the JSON response object explicitly maps only `id`, `name`, `phone`, `dateOfBirth`, `gender`, `address`, `state`, `joinedAt`, `group`, `batch`, `park`, and `city`. The fields `age` and `gradeClass` are omitted from the returned participant object.
- `src/components/modules/student/student-profile-page.tsx` lines 54–75: the `ProfileResponse` TypeScript type declares the `participant` sub-object without `age` or `gradeClass` fields, so even if the API returned them, the component would not consume or display them.

**Exact allowed files:**

- `src/app/api/user/profile/route.ts` — add `age` and `gradeClass` to the participant object in the `GET` response (lines 82–98); no new route, no schema change.
- `src/components/modules/student/student-profile-page.tsx` — add `age: number | null` and `gradeClass: string | null` to the `ProfileResponse.participant` type and render both fields in the Personal Information card.

**Expected behavior:**

- The `GET /api/user/profile` response must include `age` and `gradeClass` in the `participant` sub-object alongside the already-returned fields.
- The Student Profile page must display `age` and `gradeClass` when non-null. When either is null, the field must display a graceful empty value (e.g. `"—"`) rather than crashing or rendering blank.
- These fields are read-only. The edit dialog (`PATCH /api/user/profile`) must not be modified to accept `age` or `gradeClass`.

**Acceptance tests:**

1. `GET /api/user/profile` response includes `participant.age` and `participant.gradeClass` for a linked student account.
2. A Lahore participant with `age = 17` and `gradeClass = "Grade 10"` displays both values in the Personal Information card.
3. A participant with `age = null` and `gradeClass = null` shows `"—"` for both fields without errors.
4. The `PATCH /api/user/profile` schema is unchanged; submitting `age` or `gradeClass` in the body returns `400` (strict schema rejects unknown fields).
5. No new database writes are issued by this change.

**Rollback / data / security impact:**

- Read-only display addition; no data writes, no schema changes, no new routes, no authorization surface change.
- Rollback: remove `age` and `gradeClass` from the `GET /api/user/profile` response object in `src/app/api/user/profile/route.ts` and remove the corresponding fields from the `ProfileResponse` type and render output in `src/components/modules/student/student-profile-page.tsx`.
- The existing participant-scoped access check on `GET /api/user/profile` covers the new fields; no additional capability gate is needed.

---

## 4. Browser-UAT-Required Candidates

The following items cannot be classified as confirmed defects because live browser evidence is not available. They are defined as structured test candidates. Each must be executed in Chrome DevTools mobile emulation (375px and 390px viewports) before a repair implementation is commissioned.

| Candidate ID | Description | Evidence source | Test procedure |
|---|---|---|---|
| MOB-ATT-02 | Sticky bulk action toolbar wrapping | UX-002 `MOB-ATT-02`; `attendance-roster.tsx:L881` | Open un-closed attendance roster at 375px; inspect if "All Present", "All Absent", "Reset All" buttons wrap cleanly or overflow |
| MOB-ATT-03 | Roster container height with virtual keyboard | UX-002 `MOB-ATT-03`; `attendance-roster.tsx:L1022` | Focus search input on 375px to open virtual keyboard; verify roster scroll container remains usable |
| MOB-PEO-01 | Student directory header action buttons | UX-002 `MOB-PEO-01`; `students-page.tsx:L543` | Open `/admin/students` at 375px; verify Export, Import, Add Student buttons wrap without overflow |
| MOB-DASH-01 | City Head dashboard metric card text wrapping | UX-002 `MOB-DASH-01`; `city-head-dashboard.tsx:L229` | Load City Head Dashboard at 375px; verify "Today's Attendance" card title wraps cleanly |
| MOB-EMP-01 | Empty state CTA button visibility in compact containers | UX-002 `MOB-EMP-01`; `empty-state.tsx:L35` | Trigger empty state inside a modal dialog at 375px; verify CTA button is above the bottom fold |

**Note:** RP-02 through RP-07 above also require browser UAT for final confirmation of pass/fail. The difference is that RP-02 through RP-07 have static code evidence strong enough to proceed with implementation ahead of live browser evidence, while this section's items do not.

---

## 5. Owner Decisions Required

The following items require an explicit owner decision before any implementation can proceed.

| Item | Context | Decision needed |
|------|---------|----------------|
| Report table horizontal scroll on mobile | UX-001 Finding #2; `reports-page.tsx` and `audit-log-page.tsx` wide tables; referenced as `UX-003` | Confirm whether wide tables should be replaced with responsive card list alternatives on mobile, or whether horizontal scroll is acceptable. This is a significant UI restructure that goes beyond a small repair. |
| Access Pending screen contact guidance | UX-001 Finding #3; `auth/access-pending-page.tsx`; referenced as `AUTH-103` | Confirm whether a City Head contact link should appear on the Access Pending screen, and if so, whether the link should be static text or a dynamic lookup of the assigned City Head for the account. |
| Staff reconciliation variance (54 vs. 51 inactive placeholders) | UAT-005 Section 3.1; 44 inactive placeholders observed vs. prior baseline of 51 | Confirm whether the 44-placeholder count is the correct reconciled baseline, and whether `current.md` should be updated to reflect this. |

---

## 6. Permission-Related Items and Dynamic Capabilities

All repair items in this contract are layout, display, or input-validation changes. None introduce new capability codes, new route gates, or new role assignments.

**Preservation invariant:** Dynamic capability resolution from `src/lib/auth/capabilities.ts` and server-enforced hierarchy scope from `src/lib/auth/authorize.ts` and `src/lib/auth/scope.ts` must not be changed by any repair listed in this contract. No repair may broaden or narrow role defaults or named-user override behavior.

Items RP-02 through RP-07 are purely visual. RP-01 adds server-side input validation that is fail-closed (rejects invalid input). RP-08 is a read-only display addition within an existing scoped endpoint.

---

## 7. What Is Explicitly Out of Scope

The following are **not** included in this contract because no sufficient evidence exists in the listed evidence sources:

- New feature modules (Mashwara, Calling System) — these are future modules, not stabilization repairs.
- Any Prisma schema changes or database migrations.
- Deployment, staging configuration, or environment changes.
- New API routes or new capability codes.
- Any change to the import pipeline or historical attendance data.
- Redesign of existing screens beyond the specific layout issues listed.
- Guardian portal, Murabbi portal, and Student portal screens beyond RP-08 (all static reviews of those portals returned "Retain" status with no code-confirmed defects).

---

## 8. Implementation Sequence Recommendation

1. **RP-01** (Batch end-date validation) first — server-side, self-contained, no browser UAT required.
2. **RP-02** (Bottom nav padding) — single-component change, affects all mobile roles, highest leverage.
3. **RP-03** (Attendance button touch target) — core operational workflow, affects field use.
4. **RP-04** (Student filter drawer) — improves usability for City Head and admin roles.
5. **RP-05** (Checkbox/avatar separation) — same file as RP-04; implement together or immediately after.
6. **RP-06** (Currency overflow) — City Head Dashboard display fix.
7. **RP-07** (Capability string overflow) — Super Admin Access Management display fix.
8. **RP-08** (Student profile enriched fields) — read-only display addition, dependent on profile API response including `age`/`gradeClass`.
9. Execute browser UAT candidates (Section 4) after RP-02 through RP-07 are live to confirm remaining candidates.

---

## 9. Verification Gates per Repair Package

Every repair package must satisfy the following gates before handoff:

1. `npm run lint` passes with zero errors on the modified files.
2. `npm run typecheck` passes with zero errors.
3. `git diff --check` against `be29368` shows zero trailing whitespace warnings.
4. Existing test suite passes without regression (`npm test` or targeted `npx vitest run`).
5. Acceptance tests listed in the repair package definition are satisfied (static checks inline; browser UAT items to be signed off separately).

---

## 10. Rollback Policy

All repair packages in this contract are layout or display changes (RP-02 through RP-07), input-validation (RP-01), or a read-only display addition that modifies an existing scoped API response shape (RP-08). There are no database writes, schema changes, or authorization surface changes. Rollback for any package is a revert of the changed file(s). No data rollback procedures are needed.

---

*End of Lahore Stabilization Implementation Contract.*
