# ATT01 mobile role-dashboard and attendance-navigation frontend packet — handoff

Date: 2026-09-18. Task: finalize the ATT01 mobile role-dashboard and
attendance-navigation frontend packet for review. Scope: **frontend only**.

No Prisma schema, migration, API authorization, database file, workbook, `.env`,
provisioning script, Docker or production configuration was touched. Nothing was
committed, pushed, deployed, reset, restored or stashed.

## 1. What was already correct (verified, not re-implemented)

The packet's routing and role screens were reviewed against the six required
behaviours and largely already satisfied them:

- `PwaApp` owns navigation and passes park selection through callbacks
  (`onParkSelect` → `parkNav` state → scoped screens); no hardcoded IDs and no
  route fallbacks.
- Parks tab: Park Lead/Park Admin → `MobileScopedParksPage`; other roles →
  `MobileParksPage`. `park-workspace` renders only for park roles; the generic
  multi-tab `park-detail` renders only for `super_admin`/`program_admin`/`city_head`.
- Assigned Murabbi navigation with and without a scheduled class, back-navigation
  to the originating workspace, and the unassigned-Murabbi denial are covered by
  the existing `pwa-app.test.tsx` (11 tests).
- Muawin never receives attendance/roster controls; the limited Assistant Portal
  is the only surface.
- `MobileCityHeadDashboard` renders only `/api/city-head/dashboard` values
  (its only local literal is the generic `user?.name || "City Head"` greeting).
- HQ park-detail tabs use real API data with loading and truthful
  "Evaluation data unavailable" states (`dashboard-tab.tsx`).
- Operator attendance UI already labels the status **Excuse** while the payload
  stays `excused` (`mobile-attendance-page`, `attendance-edit-dialog`,
  `attendance-report-print`, `heatmap-calendar`, each with a focused assertion).

## 2. Confirmed gaps fixed in this pass

All changes are frontend-only and confined to the packet's own files.

| # | Gap | Fix |
| --- | --- | --- |
| 1 | `mobile-parks-page.tsx` defaulted `role` to `"main_admin"` and mapped `super_admin`/`program_admin`/`main_admin` to the label **"Main admin"**. | Uses the server-derived `session.user.roleLabel`; renders no badge at all when the session has no label. Never guesses. |
| 2 | `mobile-park-detail-page.tsx` had a local `roleLabel()` returning **"Main admin"** for HQ roles. | Uses the server `roleLabel`; badge omitted when absent. |
| 3 | `mobile-parks-page.tsx` rendered a dead, hardcoded **"Batch 4"** filter chip. | Chip removed. |
| 4 | `mobile-parks-page.tsx` rendered a fabricated **"13 item types • master inventory"** count. | Replaced with the neutral label "Master inventory". |
| 5 | `mobile-parks-page.tsx` passed `murabbiCount: 0, studentCount: 0` to the park detail screen, which printed "0 murabbis · 0 students". `/api/admin/parks` returns only `city` and `_count.batches`, so those zeros were invented. | Counts are now `number \| null` across `PwaApp.ParkNav`, `MobileParksPage`, `MobileParkWorkspace` and `MobileParkDetailPage`; the admin list passes `null` and the detail header renders the counts line only for values the server actually returned. |
| 6 | `mobile-park-workspace.tsx` fell back to `0` for a group with no progress and rendered a **0%** badge/bar as if it were a real rate, and printed `0 Shabab` for a missing count. | A group without server progress now shows an explicit **"No session"** badge and no bar; the participant count line renders only when the API returned one. |
| 7 | `mobile-muawin-dashboard.tsx` had a single static state. | Added a truthful **"No assignment yet"** state for a Muawin with no `assignedParkId`, alongside the existing restricted-content state. No data is fetched or invented. |
| 8 | Packet files carried trailing whitespace (a future commit would fail `git diff --check`). | Normalised trailing whitespace in the three affected packet files. |
| 9 | `mobile-park-detail-page.tsx` listed the phantom role `"main_admin"` in `ADMIN_ROLES`, so an unknown role string would have been granted the admin park-detail page. | Removed; the allowlist is now `super_admin`, `program_admin`, `city_head` and any other role fails closed to "Park detail unavailable". |
| 10 | `mobile-parks-page.tsx` rendered a terminal error with no way to recover, leaving the destructured `refetch` unused. | Added a **Retry** button that calls `refetch()`, matching the workspace and scoped-parks error states. |

## 3. Changed files (exact)

1. `src/components/pwa/pwa-app.tsx` — `ParkNav.murabbiCount`/`studentCount` widened to `number | null`; trailing-whitespace normalisation.
2. `src/components/modules/park/mobile-park-detail-page.tsx` — server `roleLabel`, conditional counts line, nullable counts.
3. `src/components/modules/park/mobile-park-detail-page.test.tsx` — asserts the server label, no "Main admin", and no fabricated counts.
4. `src/components/modules/park/mobile-parks-page.tsx` — server `roleLabel`, hardcoded batch chip and inventory count removed, `null` counts on select.
5. `src/components/modules/park/mobile-parks-page.test.tsx` — 4 new tests; prior duplicate `useSession` line restored.
6. `src/components/modules/park/mobile-park-workspace.tsx` — truthful "No session" rate state, conditional participant count, nullable counts.
7. `src/components/modules/park/mobile-park-workspace.test.tsx` — new no-session test.
8. `src/components/modules/muawin/mobile-muawin-dashboard.tsx` — no-assignment state.
9. `src/components/modules/muawin/mobile-muawin-dashboard.test.tsx` — 3 tests (portal, no controls, no-assignment).

No other file was modified by this pass.

## 4. Test evidence

All Vitest runs with `NODE_ENV` cleared.

| Command | Result | Exit |
| --- | --- | --- |
| `npx vitest run src/components` (baseline before this pass) | 31 files, 146 tests passed | 0 |
| `npx vitest run src/components` (after this pass) | **31 files, 157 tests passed** | 0 |
| `npx vitest run` (5 role/navigation suites: pwa-app, parks-page, workspace, park-detail, muawin) | **5 files, 49 tests passed** | 0 |
| `npx tsc --noEmit` | pass | 0 |
| `npx eslint` (9 changed files) | clean, 0 errors/warnings | 0 |
| `git diff --check` (scoped to the 3 tracked changed files) | clean | 0 |
| trailing-whitespace + non-ASCII scan (9 changed files) | 0 trailing; only intended `—`, `─`, `•`, `·`, `…`, `→` | — |

New/updated coverage maps to the required checks:

- **Park Lead Parks → workspace → group attendance**: `pwa-app.test.tsx` (routing + back-navigation + no generic admin page for park roles), `mobile-parks-page.test.tsx` (real batch from groups, truthful "No batch", role label, no fabricated counts).
- **Murabbi attendance with and without a scheduled class**: `pwa-app.test.tsx` (both cases) and `mobile-murabbi-dashboard.test.tsx`.
- **Muawin cannot see attendance controls**: `mobile-muawin-dashboard.test.tsx` (no attendance/roster/input/select; no-assignment state).
- **City Head uses only API values**: `mobile-city-head-dashboard.test.tsx` (11 tests: loading, error/retry, no-city, no-batch, real data).
- **Terminology**: `attendance-edit-dialog.test.tsx`, `attendance-report-print.test.tsx`, `heatmap-calendar.test.tsx` assert "Excuse" renders and "Leave" does not, with the payload value still `excused`.
- **Truthful rates**: `mobile-park-workspace.test.tsx` asserts "No session" and the absence of "0%"/"0 Shabab".

## 5. Backend / API dependencies discovered (not modified)

1. **`session.user.roleLabel`** — the UI now depends on the server-derived product
   label and no longer guesses. Already provided by the accepted City Head
   backend change (`src/lib/auth.ts`). If an unknown role yields `null`, the badge
   is omitted (no guessed label).
2. **`/api/admin/parks`** returns only `city` and `_count.batches` — no murabbi or
   participant counts. The frontend now omits those counts instead of printing
   zeros. Restoring them needs a small additive server field; **no route was
   changed**.
3. **`/api/park/dashboard`** must keep returning `park`, `groupBreakdown`
   (`latestProgress` / `todayProgress` / `totalParticipants`) and
   `recentSummary.totalParticipants` — used by the scoped parks selector and the
   Park Lead workspace. Absent values now degrade to explicit states rather than
   zeros.
4. **No city-level attendance roll-up endpoint exists**
   (`/api/park/attendance/summaries` requires a park context and returns 400
   without one). A city-wide summary would be a new approved contract, not a
   frontend repair — the UI does not fabricate one.
5. **`/api/city-head/dashboard`** remains the sole City Head data source; used
   unchanged.

## 6. Out-of-scope items flagged, not changed

- `src/components/modules/park/mobile-inventory-page.tsx:98` and
  `mobile-evaluation-page.tsx:136` still derive a local **"Main admin"** label.
  They are tracked, unmodified files outside this packet; the same server
  `roleLabel` swap applies if the owner wants them included.
- Pre-existing fabricated fallbacks remain in non-ATT01 modules:
  `mobile-student-dashboard.tsx` (`"Gulberg Park, Lahore"`, a `"Sunday Morning …"`
  event label), `student-profile-page.tsx` (`"Batch 4 · Lahore"`),
  `guardian-dashboard.tsx` (`"Gulberg Park"`, `"Group 1"`), `mobile-info-page.tsx`
  (`"Batch 4"`), and the `src/components/prototype/**` sample screens. None were
  touched.
- Pre-existing "Excused" wording in non-operator summaries
  (`attendance-roster.tsx`, `reports-page.tsx`, student/guardian history) is left
  as-is; the terminology decision scoped the rename to operator attendance
  surfaces, which already comply.

## 7. Design and safety notes

- The established mobile design was preserved: only state text, conditional
  rendering and one dead control were changed; existing classes, gradients,
  typography and card/bottom-sheet conventions were reused (`docs/pwa screens/`
  references unchanged).
- Navigation stays callback-based through `PwaApp`; no IDs are hardcoded and
  attendance still returns to the originating scoped workspace.
- No server route was changed to compensate for a frontend issue, and no sample
  data, fallback name, fallback percentage or fake event was added.

## 8. Unrelated files preserved

The working tree was left otherwise untouched: 132 modified tracked files and the
remaining untracked packet/tooling paths are unchanged, including the O01/U01
admin and guardian modules, attendance reliability routes, Prisma schemas and
migrations, `prisma/dev.db`, workbooks, `.env*`, `tool-results/**` and all
configuration. No `git reset`/`restore`/`clean`, stash, rebase or force operation
was used.

## 9. Process disclosure

To make the packet commit-clean, trailing whitespace was normalised in three
files with a scripted read/join/write. The first pass read the files as
Windows-1252 and corrupted their non-ASCII characters (a bullet `•` and em
dash/box-drawing characters). The damage was detected immediately, reversed by a
round-trip re-encode, and re-verified: the affected suites pass and the files now
contain only the intended characters. No other file was written by that script.
No production build was run.

## 10. Commit-readiness inventory

Reviewed against the working tree at `HEAD 2948622`. Every path below was
confirmed trackable (`git check-ignore -v` returns nothing).

**Belongs in the frontend commit — tracked modifications (3):**

1. `src/components/pwa/pwa-app.tsx`
2. `src/components/modules/park/mobile-parks-page.tsx`
3. `src/components/modules/park/mobile-park-detail-page.tsx`

**Belongs in the frontend commit — new sources (3):**

4. `src/components/modules/park/mobile-park-workspace.tsx`
5. `src/components/modules/park/mobile-scoped-parks-page.tsx` — **required dependency**:
   `pwa-app.tsx` imports it for the Park Lead/Park Admin Parks route, so the
   commit is not buildable without it. It is part of this packet even though it
   was not listed in the review scope.
6. `src/components/modules/muawin/mobile-muawin-dashboard.tsx`

**Belongs in the frontend commit — focused tests (5):**

7. `src/components/pwa/pwa-app.test.tsx`
8. `src/components/modules/park/mobile-parks-page.test.tsx`
9. `src/components/modules/park/mobile-park-workspace.test.tsx`
10. `src/components/modules/park/mobile-park-detail-page.test.tsx`
11. `src/components/modules/muawin/mobile-muawin-dashboard.test.tsx`

**Belongs in the frontend commit — evidence (1):**

12. `docs/delivery/reports/ATT01_FRONTEND_ROLE_PACKET_HANDOFF.md` (this file)

**Required test infrastructure for the commit (owner decision, tracked-modified):**
`package.json` and `package-lock.json` (declare `@testing-library/react` and
`jsdom`) and `vitest.setup.ts` (localStorage shim). Without them the new `.tsx`
suites cannot run. They are broader than this packet, so they are flagged rather
than silently included.

**Must be excluded (unrelated / generated / local / sensitive):**

- Other modules' frontend work: `admin/{access-provisioning,batches,certificates,community,custom-report-builder,fees,guardian-detail-sheet,islah-mamulat,mobile-*,participant-detail-sheet,people,procurement,students,sync-conflicts}-page*.tsx`,
  `guardian/**`, `student-profile/**`, `student/mobile-student-profile-view.tsx`,
  `park/mobile-park-dashboard.tsx`, `park/tabs/**`, `park/attendance-roster.tsx`,
  `park/offline-queue-panel.tsx`, `shared/{attendance-edit-dialog,attendance-report-print,heatmap-calendar}`.
- Non-frontend changes: API routes, `src/lib/**`, Prisma schemas and migrations.
- Local/sensitive/generated artefacts: `prisma/dev.db`, `docs/sheets/*.xlsx`,
  `docs/pwa screens/*.png`, `tool-results/**`, `db/`, `prisma/generated/`,
  `.env*`, `*.log`, `*.tsbuildinfo`, `qa-*.png`, the root `.py` litter,
  `$null`, `-`, `diff.txt`, `knip_output.txt`.
- Other ATT01 handoffs/reports (separate documents, not this packet).

**Remaining frontend issues outside this packet (not fixed):**

- `mobile-inventory-page.tsx:98` and `mobile-evaluation-page.tsx:136` still derive
  a local **"Main admin"** label (tracked, unmodified, outside scope).
- Pre-existing fabricated fallbacks in student/guardian/prototype screens
  (`"Gulberg Park"`, `"Group 1"`, `"Batch 4 · Lahore"`, `"Sunday Morning …"`).
- Pre-existing "Excused" wording in non-operator summaries.
- `mobile-parks-page.tsx` still issues one broad list query,
  `/api/admin/groups?limit=100`, to label each park's batch. Its route is
  server-scoped (`organisation.view` + role-scoped `where`; non-organisation roles
  receive 403 and the page degrades to no batch label), so it exposes no
  out-of-scope rows — but it is the only broad query in the packet and is recorded
  here rather than changed.

No commit, push, deployment or production claim is made.
