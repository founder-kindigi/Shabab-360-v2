# DeepSeek — Notifications baseline review

Assignment: first DeepSeek task prepared in `docs/delivery/tasks/DEEPSEEK_PROMPT.md` (contribution to BASE-01; Astra owns acceptance).
Mode: diagnosis and documentation only. No application, schema, migration, UI, task-state, account or spreadsheet change. No commit, push, merge, deployment, data import or message send.
Report status: complete for the inspected revision; `activeTask` was `null`, so no concurrency conflict existed.
Author: DeepSeek backend/clean-code contributor. Reviewer: Astra.

## 1. Identity snapshot

- Branch: `v2`
- Commit: `401ff322726c3ceab9b05db776b2b076e63bbaf5` — `docs: record v2 push and production deployment in current memory`
- Working tree: 22 modified, 1 deleted, 12 untracked. No file in the notifications review scope is modified. Preserved untouched.
- Dirty context files (recorded, not edited):
  - `AGENTS.md` → `45e0e6c060401dbf7c80f06ef77d85c9a823d6ec`
  - `.agents/memory/current.md` → `c15be2b6e37c6845e2d91b57e73d488933829291`
  - `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md` → `cbf164aaecb29ef0218dcbb52634090434e5d448`
- Clean source revision under review (git blob hashes, working tree):
  - `src/app/api/notifications/route.ts` → `f9c13eee78dad70365f9661ac4fb5c8d9583df7f`
  - `src/app/api/notifications/feed/route.ts` → `91df9b8fa30de13f1c85a374a32ed6503c49e8fc`
  - `src/app/api/notifications/history/route.ts` → `91bc67a41bc54090a667e801ca3721ae23b2741c`
  - `src/app/api/notifications/[id]/read/route.ts` → `92702e4cd7e15b4795be9a2ecba841a853d80a82`
  - `src/app/api/admin/notifications/queue/route.ts` → `f76c890b72b81da34197b79ab1efd134dd08100c`
  - `src/lib/notifications/feed.ts` → `68741168809d7e74d26957d00c73ae74c1ef8d25`
  - `src/lib/notification-security.ts` → `ff6e32eca7dc7769194d8b470dcf89c9a69c0604`
  - `src/hooks/use-realtime-notifications.ts` → `80621525dc8c70fab735260d0eae621c24204683`
  - `src/components/layout/notification-bell.tsx` → `ca26fdaa248884eee1c0601b1317c55734f0811d`
  - `src/components/modules/admin/notifications-page.tsx` → `28abf55c4088d2bec8f413cb168929ea1ac04ff2`
  - `src/components/modules/admin/mobile-notifications-page.tsx` → `0abe9c2949338f94d8480f6fc21cf616193fbe9f`
  - `src/lib/email-service.ts` → `38b9c8600979a881057c6dd3882c78266c09d430`
- `docs/delivery/state.json`: `activeTask: null`, `nextTask: BASE-01` (status `ready`). Safe to review without concurrency conflict.

## 2. Method

Read: `AGENTS.md`; `.agents/memory/current.md`; `docs/delivery/state.json`; `docs/delivery/tasks/BASE-01.md`; `.agents/skills/shabab-clean-code/SKILL.md`; blueprint communication sections (§8.11–8.13, §9 table, §12, §13, §15, §18 item 27); all files listed in the assignment plus direct consumers, producers, Prisma models and existing tests.

Not inspected: `.env`; any configured or live database; generated Prisma clients; unrelated modules. No live delivery/provider was contacted.

## 3. Request/auth/surface table

| Method & path | Auth enforced | Actor | Request | Success response | Errors |
| --- | --- | --- | --- | --- | --- |
| GET `/api/notifications` | `requireAuth` | any authed | – | `{ notifications[], unreadCount }` | 401; 403 if `mustResetPwd` |
| GET `/api/notifications/feed` | `requireAuth` | any authed | `?unreadOnly=true` | `{ unreadCount, notifications[] }` | 401; 403 if `mustResetPwd` |
| GET `/api/notifications/history` | `requireAuth`; HQ also `requireCapability("audit.view")` | any authed; HQ needs capability | `?page,pageSize,type` | `{ data[], pagination }` | 400 invalid query; 401; 403 |
| PATCH `/api/notifications/[id]/read` | `requireAuth` | any authed | id in path | `{ success, id }` — no state change | 401; 403. `POST` → 405 (not exported) |
| GET `/api/admin/notifications/queue` | `requireRole([super_admin,program_admin])` + `requireCapability("settings.manage")` | HQ admin | `?status,channel,page,pageSize` | `{ data[], pagination }` | 400; 401; 403; 500 |
| PATCH `/api/admin/notifications/queue` | same as GET | HQ admin | `{ ids[], status }` | `{ success, updatedCount }` | 400; 401; 403; 500 |
| GET `/api/announcements` | `requireAuth`; role must be in `VALID_ROLES` | any authed valid role | `?role,search,priority` | `Announcement[]` | 400; 401; 403 |
| POST `/api/announcements` | `requireRole([super_admin,program_admin,city_head])` + `requireCapability("announcements.manage")` | HQ/city head | `{ title,content,priority,targetRoles[],expiresAt? }` | `201 Announcement` | 400; 401; 403 |
| DELETE `/api/announcements/[id]` | `requireAuth` + `announcements.manage`; author or `super_admin` | author/HQ | id in path | `{ success }` | 401; 403; 404 |

## 4. Lifecycle traces

**Announcement path (in-app feed).**
create (`POST /api/announcements`, `announcements` row, `targetRoles` stored as a JSON string) → storage → audience selection is role-only (no city/park/group) → feed read by three different endpoints:
- `NotificationBell` → `GET /api/notifications` (`notification-bell.tsx:214`).
- `MobileNotificationsPage` → `GET /api/notifications/feed` (`mobile-notifications-page.tsx:73`).
- `NotificationsPage` (desktop) → `GET /api/notifications/history` (`notifications-page.tsx:197`), which reads **`AuditLog`**, not announcements.

unread count is computed **client-side from browser localStorage**, not from the API:
- Bell: key `shabab360_seen_announcements` (`notification-bell.tsx:44,57,68,77`).
- Desktop page: key `shabab360_read_notifications` (`notifications-page.tsx:49,71`).

mark-read: desktop fires `PATCH /api/notifications/[id]/read` fire-and-forget (`notifications-page.tsx:218`) against a no-op route; mobile fires `POST` to the same path (`mobile-notifications-page.tsx:95`) which the route does not export.

refresh: `useNotificationPolling` invalidates only `queryKey: ["notifications"]` every 60s and on focus/visibility (`use-realtime-notifications.ts:13-48`). `["notifications-history", …]` and `["activity-feed", …]` are not polled.

**Outbox / external-delivery path.**
producer (`sendEmail`, `email-service.ts:26`) → insert `notifications` row `status="pending"` (`:31-43`) → `console.log` only (`:44`) → admin views queue (`GET /api/admin/notifications/queue`) → admin manually flips `sent`/`failed` (`PATCH`, queue route `:111-115`). No provider call, no attempt counter, no failure reason stored, no retry.

Producer call sites: `sendPasswordReset`/`sendPasswordChangeConfirmation` (auth flows), `sendInviteEmail` (`admin/invite/route.ts:239`), `sendAbsenceAlert` (`attendance-alerts.ts:136`), `sendFeeReminder` (`admin/fees/[id]/remind/route.ts:125`).

**ID identity.** Announcement IDs (feed) and Notification IDs (outbox) are independent `cuid()` values; `Notification.data` carries no `announcementId`. A `sent` row therefore cannot prove any announcement was delivered, and vice versa. This matches the assignment's warning.

## 5. Findings

Severity: **High** = broken user-visible behavior or privacy/trust risk; **Medium** = incorrect behavior on a reachable edge; **Low** = cleanliness/robustness.

### F1 (High, confirmed) — Mobile notifications feed is always empty
- Evidence: `src/app/api/notifications/feed/route.ts:41-44` returns `{ unreadCount, notifications }`; `src/components/modules/admin/mobile-notifications-page.tsx:76` reads `json.data || []`. Combined with `feed.ts:86-87`, `filterNotificationsForRole` compares `item.targetRole === userRole`, but `feed/route.ts:34` passes `a.targetRoles`, the raw JSON string (e.g. `["student"]`), so no announcement ever matches.
- Trigger: open the mobile notifications hub as any role.
- Expected: role-targeted active announcements. Actual: empty list; `unreadCount` = 0.
- Smallest correction: return `notifications` (and/or a `data` alias) consistently, parse `targetRoles` before role matching (see C1). Two independent fixes required.
- Consumers: `MobileNotificationsPage` only.
- Verification: unit test `filterNotificationsForRole` with the real storage shape `targetRole='["student"]'`, `userRole="student"` — currently excluded, proving the mismatch. Note the existing `src/lib/notifications/__tests__/feed.test.ts` uses literal `"all"`/`"city_head"` fixtures that do not represent the serialized DB shape, so it passes while the real feed fails.

### F2 (High, confirmed) — Mark-as-read is inert and method-mismatched; no ownership check
- Evidence: `src/app/api/notifications/[id]/read/route.ts` exports only `PATCH` and returns `{ success, id }` without touching any store (lines 5-15). `mobile-notifications-page.tsx:95` calls `POST` → 405. `notifications-page.tsx:218` calls `PATCH` but it is a no-op.
- Trigger: tap a notification on mobile or desktop.
- Expected: durable read state for the caller. Actual: no state change; mobile request fails.
- Smallest correction: implement one exported method used by both clients and reject ids the caller cannot own once server read state exists. Do not add a mutation until the read-state model is approved (see D1).
- Consumers: `NotificationBell`, `NotificationsPage`, `MobileNotificationsPage`.
- Verification: route has no test; add a focused route test in a later accepted packet.

### F3 (High, confirmed) — No durable per-user read state; unread counts are inconsistent
- Evidence: `Notification` model has no read column (both schemas, `prisma/schema.prisma:964`, `prisma/postgres/schema.prisma:1004`). Read state lives in two different localStorage keys (F1 consumers above) and is per-browser, not per-user. `GET /api/notifications` returns `unreadCount: notifications.length` (`route.ts:50`), i.e. "all", never unread. `feed/route.ts:35` hardcodes `read: false`, so mobile always shows everything unread. The Bell ignores the server count and recomputes locally.
- Trigger: new device, cleared cache, shared browser, or second tab.
- Expected: one per-user unread truth. Actual: three divergent counts; read state lost on cache clear and shared across users on one browser.
- Smallest correction: decide the read-state model (D1) before code. Minimum later step: a per-user read marker (e.g. `AnnouncementRead` or per-recipient receipt) plus a single unread query reused by all three endpoints.
- Consumers: all three feed surfaces + polling hook.
- Verification: inspect localStorage keys in a clean profile; server count vs client count comparison.

### F4 (Medium, confirmed) — Fail-open on malformed `targetRoles` in `/api/notifications`
- Evidence: `src/app/api/notifications/route.ts:34-35` `catch { return true; }`, so a row with corrupt/unparseable `targetRoles` is shown to every user. `POST /api/announcements` writes valid JSON, but legacy or externally written rows are not guaranteed. The sibling reader `/api/announcements/route.ts` fails closed (its parse-catch returns `false`), so behavior is inconsistent.
- Trigger: any announcement row whose `targetRoles` is not valid JSON/array.
- Expected: deny on malformed audience data. Actual: over-exposure to all roles.
- Smallest correction: return `false` (deny) and log once; align with the announcements reader.
- Consumers: `NotificationBell` (and any future reader of this endpoint).
- Verification: synthetic row with `targetRoles="not-json"` should not appear in the response.

### F5 (Medium, confirmed) — Broadcast audience options fail API validation; role filter is a fragile substring match
- Evidence: `mobile-notifications-page.tsx:174` sends `targetRoles: [broadcastAudience]` where options are `all|murabbis|students` (`:363`), but `POST /api/announcements` validates against the eight exact roles (`announcements/route.ts:28-33`). Every mobile broadcast returns 400.
- Also `GET /api/announcements` filters with `targetRoles: { contains: JSON.stringify(user.role) }` (`announcements/route.ts:66-67`) — substring matching on serialized JSON is not role membership and is non-indexable; the JS re-filter compensates but the DB clause can over/under-match.
- Trigger: send a broadcast from the mobile hub; or request announcements for a role whose name is a substring of another stored token.
- Expected: valid audience selection persisted and precise membership filtering. Actual: 400 on broadcast; imprecise DB prefilter.
- Smallest correction: map audience values to real role arrays in the client (or add an approved audience abstraction), and replace `contains` with a reviewed membership representation. Business input needed (D2/D3).
- Consumers: `MobileNotificationsPage` broadcast dialog; guardian/student/admin announcement pages.

### F6 (Medium, confirmed) — Outbox is not delivered; status and counts are misleading
- Evidence: `email-service.ts:31-44` only inserts `pending` and logs; no provider, no attempts/`failureReason` columns (both schemas). `PATCH /api/admin/notifications/queue` sets `sentAt` and `status="sent"` with no send (`queue/route.ts:111-115`) and returns `updatedCount: ids.length` (`:119`) even when fewer rows matched; it writes no audit entry. `queue/route.ts:73` does `JSON.parse(n.data)` unguarded → a malformed row 500s the whole list.
- Trigger: mark queue rows sent; or any corrupt `data` value.
- Expected (blueprint §8.12, §15): provider send, attempts, failure reason, reconciliation. Actual: manual status flips only; a "sent" field is not proof of delivery. Consistent with `.agents/memory/current.md` "No external notification-delivery guarantee is established."
- Smallest correction: use `result.count` from `updateMany`, guard `JSON.parse`, add audit for status changes; provider delivery remains a separate gated task.
- Consumers: admin queue UI; downstream reporting ("notification delivery and failure summaries", blueprint §8.14).

### F7 (Medium, confirmed) — No idempotency/dedupe on outbox producers
- Evidence: fee reminders loop each guardian and call `sendFeeReminder` per request (`admin/fees/[id]/remind/route.ts:125`); repeated clicks create duplicate `pending` rows. No unique/retry key on `Notification`.
- Trigger: press "send reminders" twice, or retry after a partial failure.
- Expected: one outbox row per recipient per reminder intent. Actual: duplicates.
- Smallest correction: an idempotency key (channel + recipient + source id + day) with a unique constraint, or a dedupe check before insert — requires the accepted packet.
- Consumers: fees reminder flow; guardian notification volume.

### F8 (Low, confirmed) — Feed query cost, expiry and scope gaps
- Evidence: `/api/notifications` applies `take: 20` (`route.ts:22`) **before** the role filter (`:29`), so role-relevant announcements beyond the newest 20 are permanently invisible. `/api/notifications/feed` has no `expiresAt` filter at all (`feed/route.ts:12-24`), so expired notices can surface. Neither feed applies city/park scope; blueprint §8.11–8.12 require city/park/team-scoped visibility and notification scoping.
- Trigger: >20 announcements where the caller's role matches older rows; expired announcement; scoped user.
- Expected: correct, unexpired, scope-correct feed. Actual: starvation, expired leakage, no scope.
- Smallest correction: filter in the database (`targetRoles` membership + `expiresAt`), then page; scoping depends on D3.

### F9 (Low, confirmed) — Notification vocabulary duplicated across server and clients
- Evidence: verb/description mapping exists in `history/route.ts` (`buildDescription`/`describeVerb`) and again in `notifications-page.tsx` (`getActionBadge`, `getActionBorder`, `getEntityTypeIcon`) and `notification-bell.tsx` (icon map, priority map). Read/mark helpers are duplicated between `notification-bell.tsx:44-80` and `notifications-page.tsx:49-76`.
- Impact: divergent labels/colors when one copy changes.
- Smallest correction: extract one shared pure module for action vocabulary and one for read-state storage. No contract change.

## 6. Bounded clean-code plan (recommendations only)

Behavior-preserving, in-scope, no new dependency/layer:

- **C1 — Role matching type/naming.** In `feed.ts`, rename `targetRole` → `targetRoles` and accept the serialized roles (or a parsed array) with one exported membership helper reused by `/api/notifications` and `/api/notifications/feed`. Removes the string-vs-JSON bug class behind F1. Update the lib test fixtures to the real serialized shape.
- **C2 — Remove `as any`.** `feed/route.ts:33` `(a.priority as any) || "normal"` → a small typed normalizer with an explicit union. Keep current fallback behavior.
- **C3 — Deduplicate action vocabulary.** Move `describeVerb`/`buildDescription` and the client action label/color maps into one shared module; keep outputs byte-identical.
- **C4 — Deduplicate read-state storage.** One helper for the localStorage read/mark logic; keep the existing keys during the pass to avoid a functional change, and note the mixed key format in `notification-bell.tsx` (array at `:62` vs object at `:71` with `getSeenIds` throwing-then-caught) as the known wart.
- **C5 — Dead imports.** `mobile-notifications-page.tsx` imports `Bell` (`:22`), `CheckCircle2` (`:31`), `AlertTriangle` (`:32`), `Sparkles` (`:34`) with no usage. Remove after re-confirming. Do not reformat the file.
- **C6 — Query typing.** Replace `where: Record<string, unknown>` with the model `where` input type in the two queue/history handlers where it is a straight substitution.

Explicitly out of scope for cleanup (functional, needs an accepted packet): read-state persistence, endpoint methods, audience validation, provider delivery, scoping, pagination semantics.

## 7. Missing business decisions (block implementation)

- **D1 — Read-state model.** Per-user durable read marker vs per-announcement receipt; and whether in-app "unread" is the same concept as outbox delivery status. Blocks F2/F3.
- **D2 — Audience model.** Are announcements role-only, or city/park/group scoped? What do `all|murabbis|students` mean as stored target roles? Blocks F5/F8.
- **D3 — Scope authority.** Which capabilities govern reading announcements/queue per role, and whether `settings.manage` is the correct gate for the notification queue.
- **D4 — Delivery provider and failure policy.** Provider (e.g. Resend), retry/attempt rules, failure-reason storage, escalation for unread urgent notices (blueprint §18 item 27). Blocks F6/F7.
- **D5 — Read-state retention/privacy** for minors and shared devices.

## 8. Checks and limits

Executed (existing, synthetic-fixture tests only; no code or test changed to pass this review):
```
npx vitest run \
  src/lib/notifications/__tests__/feed.test.ts \
  src/app/api/notifications/history/route.test.ts \
  src/app/api/admin/notifications/queue/route.test.ts \
  src/lib/email-service.test.ts \
  src/lib/attendance-alerts.test.ts \
  src/app/api/announcements/route.test.ts \
  "src/app/api/announcements/[id]/route.test.ts" \
  src/app/api/admin/invite/route.test.ts \
  src/app/api/auth/reset-password/route.test.ts
```
Result: **9 test files, 31 tests, all passed** (vitest 3.2.7, ~10.4s). Exit code 0.

Not run (labelled honestly):
- No test exists for `GET /api/notifications`, `GET /api/notifications/feed`, or `PATCH /api/notifications/[id]/read` — F1/F2/F4 are code-read findings, not reproducing tests.
- `lint`, `typecheck`, `build` not run: this task changes no source and the assignment scopes checks to existing focused tests.
- No browser, role, live-DB, provider or delivery verification. All `/api/notifications/feed` and read-state behavior is inferred from source and unit-level helper behavior.
- No `.env` or configured database accessed.

## 9. Blockers / handoff to Astra

- No blocker to producing this review. No active task conflict; nothing was modified outside this report.
- Blockers to implementation: D1–D5 must be decided before F2/F3/F5/F6/F7 are coded.
- Key findings (five): **F1** mobile feed always empty (contract + role-match); **F2/F3** mark-read inert/method-mismatched and no durable per-user read state; **F4** fail-open on malformed `targetRoles`; **F5** mobile broadcast audience fails validation + fragile role substring filter; **F6** outbox not delivered and status/counts misleading (with F7 duplicate producers).
- Requested next step: an explicit module packet listing allowed files. On acceptance, apply the F1/F4 minimal corrections plus C1–C6 in a bounded clean-code pass; treat F2/F3/F5/F6/F7 as functional work with owner decisions. BASE-01 is not claimed complete.
