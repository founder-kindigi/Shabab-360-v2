# v2 UI restoration — 2026-09-10

Status: implementation and verification complete; ready for owner visual review.

The owner requested restoration of the pre-remediation v2 visual design while
retaining necessary fixes. Visual reference: `a25260321abe28673db4337bdc2074b55ee0d836`.
Functional baseline: `401ff322726c3ceab9b05db776b2b076e63bbaf5` on `v2`.
This is a local candidate, not a deployment or independent release approval.

## Restored presentation

| Module | Presentation restored | Behavior retained |
| --- | --- | --- |
| More | Role badge, appearance controls, grouped icon cards, system-tool cards | Actual session, capability-filtered navigation, sign-out |
| Fees, desktop/mobile | Summary cards, outstanding/receipt/payment tabs, participant cards, styled form | Exact payment values, owner-bound pending attempts, Web Locks, idempotency, confirmed receipts |
| Calling | Campaign desk, lead cards, status pills, expandable details, outcome sheet | Real campaigns/leads/templates, bounded pagination, actual notes and callback validation |
| Procurement, desktop/mobile | Purple mobile header, stock metrics/cards, stock/request/order tabs, refill sheet | Existing scoped reads, request submission and approve/reject APIs; no simulated stock receipt |
| Certificates, desktop/mobile | Participant cards, summary cards, bordered purple/gold certificate preview | Preview-only records; no invented issuance numbers, signatures or sharing success |
| Community, desktop/mobile | Feed categories, search, post control, desktop poll/sidebar cards | Posting, reactions, comments and polls visibly unavailable; no sample activity |
| Islah | Daily/routine/guidance tabs, prayer/habit cards, reflection area | Sensitive logging remains disabled; no fabricated progress, streaks or private records |
| Custom reports, desktop/mobile | Domain tabs, field/filter cards, preview, preset and schedule tabs | Standard reports remain reachable; custom execution/export/persistence/delivery stay gated |
| Attendance sync | Queue metrics, empty state, privacy/recovery cards | Existing account-bound queue, retries, acknowledgements and conflict handling |
| Profile directory | Original purple header, scoped park/search controls, avatar cards, profile tabs | Real selected participant, pagination, scoped context and profile editor |

Sixteen existing component files and one shared presentation component changed.
No API route, database schema, migration, authorization hook, session provider or
offline synchronization algorithm was modified. Existing main/v2 consolidation
planning documents remain preserved separately.

The smaller remediation diffs in guardian dashboards, attendance roster/mobile
attendance, import/settings, analysis, profile editor, PWA and providers were
inspected. Their existing layouts remain; server-data, identity, scope, empty-state
and unavailable-workflow corrections are retained. The park attendance tab continues
to use the existing styled attendance screen instead of the historical fixture roster.

## Necessary differences from the historical UI

This restores the design language and module structure around the repaired data
flows. It is not a byte-for-byte rollback or a pixel-perfect historical reproduction.
Historical sample people, invented metrics, role previews and simulated saves are
excluded. Unavailable features retain explanatory states and disabled actions.
Native selectors remain where they carry current real-data and scope selection.
Certificate content is explicitly a draft preview. Standard reports use their
existing implementation under the restored reporting workspace.

## Verification

- Full suite: `npx vitest run --maxWorkers=2 --no-file-parallelism --reporter=json --outputFile=docs/reviews/ui-restoration-2026-09-10/test-results.json` — **1,375/1,375 tests, 187 files passed**. This ran before the final CSS-only grid/metric spacing corrections; no business logic changed afterward.
- Focused recovery/gating/offline checks: **36/36 tests passed** across `v2-editor-recovery.test.tsx`, `v2-unavailable-workflows.test.ts` and `sync-attendance.test.ts`. Gating tests establish unavailable behavior, not completion of those workflows.
- `npm run lint` — **0 errors, 6 existing unused-disable warnings** in scripts. Focused lint of the final grid/metric changes also passed.
- `npm run typecheck` — **exit 0**, including after the final source changes.
- Isolated SQLite production build — **exit 0** after refreshing the final component source. `astra-build-sqlite-results.json` records the source manifest. No environment files or real database were used.
- `node docs/reviews/ui-restoration-2026-09-10/verify-preservation.mjs` — **18 query/mutation expressions preserved** against the functional baseline. Only procurement's successful-save callback additionally closes its sheet.
- `node docs/reviews/ui-restoration-2026-09-10/verify-visuals.mjs` — **37 browser captures passed**, no page errors, no writes, no document overflow. Ten modules at 390px in light/dark, five desktop views at 1280px, plus fee denial/empty/read-error/offline states. Disabled post, custom export and preset-save controls verified. Offline payment submission stays disabled.
- `git diff --check` — **exit 0**.
- Compiled PWA with disposable SQLite and synthetic accounts — **12/12 checks passed**: sign-in/reset/sign-out, lost-acknowledgement payment recovery without duplication, paginated profile save, attendance replay without duplication, restored standard reports, refreshed-session rejection for revoked/inactive/deleted/unscoped identities, and capability revocation in both UI and API.

Visual inspection found and corrected Community tab overflow and cramped metric
labels on narrow certificate cards. Representative light/dark screenshots and
form/sheet states were opened and inspected, beyond automatic width checks.

Open [GALLERY.html](GALLERY.html) for all retained synthetic screenshots.
The fixture bundles actual components and compiled application Tailwind CSS but
stubs session/API data; it does not establish real API persistence or reproduce
Next's font loading. The compiled-PWA checks provide the separate route/database
evidence. Neither fixture establishes pixel parity, all-role visual acceptance,
live deployment behavior, native PostgreSQL or operational workflow approval.

## Data, security and rollback

This candidate changes presentation and local UI selection only. It does not
migrate data, modify real accounts, send messages or deploy. Financial recovery,
scope checks and offline ownership remain required. Rollback consists of reverting
these component changes to the functional baseline while preserving backend
remediation and unrelated working-tree documentation. Do not revert the entire
remediation commit to undo visual changes.

The master blueprint now records the owner's instruction to preserve the design
during backend work and assign future frontend design through the owner. Main/v2
consolidation remains a separate subsequent task.
