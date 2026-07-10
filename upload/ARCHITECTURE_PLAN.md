# Shabab 360 v1 Critique and Architecture Plan

## Step 1 - Critique First

### 10 failure points and targeted mitigations

1. Offline duplicate attendance writes cause inconsistent status.
- Mitigation: store a `mutation_id` per queued action and persist it in `attendance_records.last_client_mutation_id`; sync API treats identical mutation IDs as already processed.

2. Park Admin modifies attendance after close due weak policy checks.
- Mitigation: enforce at two layers: RLS policy permits Park Admin writes only when `attendance_events.is_closed = false`; trigger rejects after-close write attempts from Park Admin even if policy is bypassed by mistake.

3. After-close edits by Park Lead/Program Admin without reason.
- Mitigation: trigger on `attendance_records` requires non-empty `edit_reason` when event is closed and status changes; `audit_log` captures old/new values and reason.

4. Participant state (warning/dropout) drifts from attendance history.
- Mitigation: after insert/update trigger recomputes state from most recent attendance streak using per-batch thresholds (`batch_settings.warning_absents`, `dropout_absents`).

5. RLS leaks data to guardians outside linked children.
- Mitigation: guardian policies on attendance, payments, and announcements use `guardian_children` link checks; no broad park-level guardian access.

6. Receipt collisions under concurrent payments.
- Mitigation: DB-side `receipt_sequences` table with UPSERT increment and unique `payments.receipt_no` constraint; generation happens in trigger only.

7. Excel exports diverge from expected operational layout.
- Mitigation: central export module with fixed header structure and dynamic event columns from data model; report buttons map one-to-one with legacy report names.

8. Role ambiguity across HQ and park-level staff leads to accidental over-access.
- Mitigation: single source of truth in `staff_meta.staff_role` plus `assigned_park_id`; helper SQL function `can_access_park()` used in all park-scoped policies.

9. Sync error handling drops failed items silently.
- Mitigation: sync endpoint returns per-mutation result (`processed`/`failed`), Dexie keeps failed mutations with retry count + error message and preserves queue integrity.

10. PKT date boundaries cause wrong “today” event behavior.
- Mitigation: store timestamps UTC, but compute event date and display in `Asia/Karachi`; API uses explicit PKT day filters for “today”.

### Challenge the plan with alternatives

1. Alternative: Firebase (Auth + Firestore + Cloud Functions).
- Pros: strong offline SDK on mobile/web.
- Cons for this project: weaker SQL/reporting ergonomics for Excel-style exports, more custom code for relational constraints (single group assignment, one-event-per-day), and less direct parity with strict RLS patterns.

2. Alternative: Self-hosted Postgres + Keycloak + custom API.
- Pros: full control.
- Cons for this project: violates managed-service preference, increases operational burden, and slows delivery for nationwide rollout.

Why Supabase is still the right choice:
- Native Postgres constraints/triggers for attendance/receipt rules.
- First-class Auth + RLS for role/guardian isolation.
- Managed storage and operational simplicity aligned with the “no self-hosting” rule.
- Works naturally with Next.js App Router and server-side/report workloads.

### Scope guard - what NOT to implement in v1

- Per-session attendance inside a day (MVP remains once-per-day event status).
- WhatsApp/SMS gateway integrations.
- Biometric/face attendance.
- Complex gamification/ranking engines.
- Multi-country or multi-timezone support beyond PKT.
- Advanced financial accounting (refund workflows, split payments, arrears engine v2).
- Real-time push fanout service (optional push subscription table only).
- Custom report designer UI.
- Low-code workflow builder.
- AI prediction/forecasting modules.

## A) Architecture Plan

### System diagram (text)

```text
Android/Web PWA (Next.js, Dexie offline queue)
  |
  | HTTPS (cookie-authenticated requests)
  v
Next.js App Router
  - Route groups: /(auth), /(admin), /(park), /(guardian)
  - API routes for writes/exports/sync
  - Data access layer (feature modules)
  |
  v
Supabase
  - Auth (OTP email/phone)
  - Postgres (core tables, triggers, RLS)
  - Storage (future receipts/assets)
```

### Attendance data flow

#### Online flow
1. Park Admin opens today’s event on `/park/attendance/[eventId]`.
2. UI sends mutation to `/api/park/attendance/[eventId]`.
3. API validates with zod, applies idempotent upsert.
4. DB triggers:
- enforce close/edit reason rules
- recompute participant state
- write audit log on update
5. UI refreshes roster status.

#### Offline flow
1. Park Admin marks attendance while offline.
2. Mutation saved to Dexie queue with `mutationId`, `eventId`, `participantId`, `status`, `markedAt`.
3. Sync worker posts queued batch to `/api/park/attendance/sync`.
4. API returns partial results (`processedMutationIds`, `failed`).
5. Client removes processed actions, keeps failures with retry metadata.

### Role-based route map

- `/(auth)/login` -> `/login`
- `/(admin)/admin` -> `/admin` (Super Admin, Program Admin)
- `/(admin)/admin/parks` -> `/admin/parks`
- `/(admin)/admin/attendance-events` -> `/admin/attendance-events`
- `/(admin)/admin/reports` -> `/admin/reports`
- `/(park)/park/attendance` -> `/park/attendance` (Park Admin, Park Lead)
- `/(park)/park/attendance/[eventId]` -> `/park/attendance/:eventId`
- `/(guardian)/guardian` -> `/guardian` (guardian-linked view only)

### API approach choice

v1 uses API routes consistently for all write operations and report generation.
- Reason: offline queue, retries, and batch sync are naturally request/response workflows.
- Security: API routes use authenticated user context with Supabase anon key + RLS (no client service-role key).
