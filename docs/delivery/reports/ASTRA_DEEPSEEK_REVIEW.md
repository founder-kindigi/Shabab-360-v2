# Astra review — DeepSeek Notifications baseline

Date: 2026-09-11. Candidate: `v2`, `401ff322726c3ceab9b05db776b2b076e63bbaf5`, with the existing dirty working tree.

**Outcome: ACCEPTED AS A BASELINE CONTRIBUTION, with the corrections below governing future assignments.** This accepts diagnosis, not implementation, module completion or release readiness. BASE-01 remains unfinished. DeepSeek's original report is preserved.

## Evidence

- Independently read the report, relevant current routes, feed helper, client read/cache code, outbox writer, fee-reminder producer, both model definitions and selected existing test coverage. Followed AGENTS, current memory, module-delivery and verification skills.
- All 15 blob hashes recorded by DeepSeek match the current files (12 source files and three context files). Branch and commit also match. This establishes the recorded snapshot; without a before/after manifest it cannot prove that DeepSeek changed nothing else.
- Freshly reran the exact nine-suite command from the baseline report, section 8: **9 files / 31 tests passed; exit 0; Vitest 3.2.7; duration 3.35 seconds**. The queue tests cover capability denial, not successful delivery or update counts; the feed helper fixtures use scalar roles, not stored JSON arrays.
- No application edits, new tests, schema changes, configured database access, provider calls or browser sessions in this review. Lint/typecheck/build were not rerun for this documentation-only review. Findings below are source-derived unless expressly covered by existing tests. Passing these tests does not reproduce or resolve the identified defects.

## Per-finding verdicts and required corrections

| Finding | Verdict | Correction for the future implementation packet |
| --- | --- | --- |
| F1 | Confirmed, High | Mobile reads `data` while the route returns `notifications` (`mobile-notifications-page.tsx:76`; feed route `:41`). The helper rejects normally serialized role arrays (`feed.ts:86–87`). Say “normal API-created announcement rows” rather than every possible row: legacy scalar `all` or empty values pass the helper. Mobile can also fail from incompatible cached data; see R1. Align one typed contract, without an unnecessary response alias. |
| F2 | Confirmed, High | Read PATCH returns success without persistence (`notifications/[id]/read/route.ts:11–15`); mobile uses POST (`mobile-notifications-page.tsx:95`). Missing ownership validation is a requirement for the future mutation, not evidence of a current unauthorized write because no write exists. |
| F3 | Confirmed, High | Counts/read storage diverge. An outbox `Notification.readAt` alone cannot solve announcement and audit-history read state. Desktop history returns AuditLog IDs (`history/route.ts:54–80`), not Announcement IDs. Define whether it stays an activity history or becomes an inbox before sharing receipt APIs. Include mark-all behavior, account separation and cache invalidation. |
| F4 | Confirmed, Medium; security priority | Root reader fails open (`notifications/route.ts:29–35`). A catch-only fix is insufficient: valid JSON `null`, empty arrays, objects and strings also need explicit shape and audience validation. Follow the approved empty-audience policy and deny malformed values. Do not log private announcement contents. |
| F5 | Broadcast mismatch confirmed, Medium; substring claim overstated | `all`, `murabbis`, `students` fail the exact-role enum. Authorized requests with these values return 400; unauthorized actors can return 403 first. `JSON.stringify(role)` includes quotes, so a role merely being a substring of another token does not establish a membership bug for the eight canonical roles. The final array check also denies malformed/non-member rows. Retain this as a storage/query design concern, not a demonstrated substring authorization bypass. |
| F6 | Confirmed, Medium | Pending insertion is not delivery (`email-service.ts:31–46`). Queue update count ignores actual matches; malformed metadata can fail the entire list (`queue/route.ts:73,111–119`). Manual `sent` is not provider evidence. Also inspect failed transitions retaining an old `sentAt` (`:115`). Keep provider work separate from truthful status/count/error handling. |
| F7 | Confirmed retry gap, Medium | Fee reminders enqueue again on repeated requests (`admin/fees/[id]/remind/route.ts:125`). A day-based key can suppress legitimate distinct reminders; a read-before-insert check races. Design a durable unique identity for one authorized reminder intent, with recipient/source identity and concurrent retry tests. Provider selection does not block this design. |
| F8 | Confirmed; split severity | **High: missing audience scope isolation.** City-head creation has no resource-scope check and Announcement stores no audience scope (`announcements/route.ts:132–165`; SQLite schema `:948`, PostgreSQL `:989`). Role-matched readers can receive city-authored notices across cities. No production exposure was measured. **Medium:** top-20-before-role-filter starvation and missing feed expiry filter (`notifications/route.ts:22–29`; feed route `:15–24`). Do not reopen feeds without resolving visibility or explicitly gating unsupported scoped publishing. |
| F9 | Partly accepted as a cleanup opportunity, Low | Presentation maps and server activity descriptions have different responsibilities; avoid forced consolidation. Deduplicate genuinely equivalent pure behavior only. Durable read-state work will replace some local-storage code, so avoid an interim abstraction that will immediately be discarded. |

Source paths in the table are under `src/app/api/`, `src/components/modules/admin/` or `src/lib/notifications/` as identified in the baseline; schema references are repository-relative. Additional exact paths follow below.

## Additional gaps found by Astra

**R1 — High, incompatible shared query cache (source-confirmed; runtime trigger unverified).** `src/components/layout/notification-bell.tsx:208–222` stores an object under `["notifications"]`; `src/components/modules/admin/mobile-notifications-page.tsx:70–82` uses the same key for an array. When that object reaches the mobile observer, `.map` throws. Mobile optimistic updates also assume an array (`:101–102`, `:153–154`), while array data makes the bell lose its object fields. Require distinct typed keys or one canonical response shape, plus navigation/mount-order verification in the actual shared-provider layouts. Do not claim every mobile visit crashes.

**R2 — High, mark-all suppresses future unread notices.** `src/components/layout/notification-bell.tsx:68–78` persists a global timestamp, but `isSeen` returns true for every item whenever that timestamp exists. It never compares the announcement creation time. New notices consequently appear read after mark-all. Mobile mark-all (`src/components/modules/admin/mobile-notifications-page.tsx:151–156`) only changes the cache and reports success without a server request. Cover a notice created after mark-all, refetch/reload, another account and another device.

**R3 — Medium, producer wording confuses queuing with sending.** `src/app/api/admin/fees/[id]/remind/route.ts:125–149` increments `sentCount` when an outbox ID is returned and updates `reminderSentAt`; its subsequent audit action is `fee_reminder_sent`. Reconcile API/UI/audit terminology with actual queued/provider-accepted/delivered states. Keep existing secret-exclusion protections in `src/lib/notification-security.ts`; connecting a provider must not reintroduce persisted reset/invitation credentials.

## Lead decisions and assignment boundaries

- Astra owns receipt schema selection, API method/response contracts, query keys, transactional idempotency and migration design. These do not all need separate owner permission questions. In-app read state and external delivery status remain distinct concepts.
- Product clarification is still needed where existing authority is insufficient: exact broadcast audience semantics/global-publishing authority, channels/provider and operational delivery expectations, retention and urgent-notice escalation. Existing scope-denial requirements already apply; no policy question authorizes fail-open behavior.
- C1 fixes role matching and is **functional remediation**, not behavior-preserving cleanup. C2's priority normalizer also needs an explicit decision: announcements allow `low`, while the feed type allows `high`. Do not silently change stored priority semantics. C3–C6 remain bounded recommendations, not approved edits.
- Do not authorize a standalone F1/F4 patch that exposes the still-unscoped feed. Prepare the Notifications packet after baseline/reference and consolidation dependencies, with success, wrong-role, missing/cross-scope, malformed-audience, expiry, pagination, ownership, retries and read-state cases. Schema work requires both providers and disposable-database migration checks; frontend integration requires actual browser verification.

## Next task

Assign Gemini the existing `docs/delivery/tasks/GEMINI_PROMPT.md`: inspect all current reference images and write only `docs/delivery/reports/GEMINI_FRONTEND_REFERENCE_MAP.md`. No UI implementation or redesign yet. This assignment is prepared, not dispatched. DeepSeek waits for a bounded implementation packet; no extra report-rewrite round is needed because this review records the corrections.

BASE-01 and the main/v2 consolidation work remain open. No task-state completion, deployment, merge or release approval is implied.
