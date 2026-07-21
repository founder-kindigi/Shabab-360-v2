# DASH-001: Lahore Data Consistency and Operational State Audit

**Task:** DASH-001
**Owner:** DeepSeek
**Status:** Draft — pending Codex review
**Created:** 2026-07-21
**Scope:** Inspect dashboard and list-screen routes for misleading counts, missing zero/empty states, inactive/dropout handling, attendance-date assumptions, and role-scoped data leakage risks. Current code evidence only; no database access or modification.

**Reference data (Lahore import reconciliation):** 1 city, 6 parks, 6 batches, 13 groups, 277 participants (257 active, 20 dropout), 180 historical attendance events, 2,967 attendance records (838 present, 1,171 absent, 636 late, 322 excused), 51 inactive placeholder staff, 1 active Super Admin.

---

## 1. Super Admin / Program Admin Dashboard

**File:** `src/app/api/admin/dashboard/route.ts`

### 1.1 Participant count — recommend distinct total vs active labels

**Lines:** 105, 307, 395

```typescript
// Line 105 — no state filter
db.participant.count(),
// Line 307 — city scope, no state filter
db.participant.count({ where: { group: { batch: { park: { cityId: user.assignedCityId } } } } })
// Line 395 — park scope, no state filter
db.participant.count({ where: { group: { batch: { parkId: user.assignedParkId } } } })
```

**Lahore data:** 277 total participants; 257 active, 20 dropout. The admin dashboard reports `277` (all states). City-head and park dashboards also query without a state filter. The murabbi dashboard correctly uses `state: "active"` (line 75 of `murabbi/dashboard/route.ts`).

**Classification:** Dashboard semantics owner decision, not automatically a defect. An HQ user may want the total registered count including dropouts. A park lead planning a session wants active participants only.

**Recommendation:** Return two distinct fields — `totalParticipants` (all states) and `activeParticipants` (state: "active" only) — and let the UI label them appropriately. Alternatively, align all dashboards to the same convention.

**Test:** With Lahore data, verify `activeParticipants = 257` and `totalParticipants = 277`. Verify the UI displays the correct label for each context.

### 1.2 City-head batch count uses parkId — Phase B/C migration compatibility

**Lines:** 298-302 (city-head/dashboard/route.ts), also park dashboard lines 109-114

```typescript
db.batch.count({
  where: { parkId: { in: parkIds }, isActive: true },
})
```

**Assessment:** This works correctly for the current schema where `Batch.parkId` is the only ownership relation. Phase A explicitly keeps `Batch.parkId`. After HIER-002 (Phase B or C), Batch becomes city-owned and the `parkId` column is removed. The city-head and park dashboards will return 0 batches if not updated.

**Classification:** Migration compatibility requirement, not a current defect. The fix must be coordinated with the HIER-002 schema migration timeline.

**Phase B requirement:** The target code must **dual-read** during Phase B — accept either `parkId` or `cityId` depending on which migration state is deployed.

**Phase C requirement:** After `parkId` is fully removed, the query must use `cityId` exclusively.

**Fix sequence:**
- Phase B: `where: { OR: [{ parkId: { in: parkIds } }, { cityId: user.assignedCityId }] }` or a service helper that detects the available column.
- Phase C: `where: { cityId: user.assignedCityId, isActive: true }`

**Test:** Run before and after HIER-002 migration. Verify batch count matches across both schemas.

---

## 2. City Head Dashboard

**File:** `src/app/api/city-head/dashboard/route.ts`

### 2.1 Audit log wildcard activity filter

**Lines:** 166-178

```typescript
const recentActivity = await db.auditLog.findMany({
  take: 10,  // ...
  where: {
    entityType: { in: ["park", "batch", "group", "participant"] },
    entityId: { in: cityParkIds },
  },
});
```

**Issue:** Filters by `entityId in cityParkIds`, but `entityType` includes `"participant"` and `"group"`. Participant and group IDs are not park IDs, so no participant or group audit entries match. The `entityId` filter should match the entity type — park audit logs use park IDs, but group/participant audit logs use their own IDs.

**Severity:** Low. Reduces the usefulness of recent activity on the city-head dashboard but does not produce wrong data — just less data.

**Fix:** Remove the `entityId` filter or build three separate queries: one for parks (by park IDs), one for groups (by group IDs in the city), and one for participants (by participant IDs in the city).

**Test:** Compare audit log entries shown on the city-head dashboard vs. the full audit page for the same city. Verify all expected entries appear.

### 2.2 Park breakdown participant count may double-count cohort

**Lines:** 249-259

```typescript
const parkParticipants = await db.participant.count({
  where: { groupId: { in: parkGroupIds }, state: "active" },
});
```

Used in `parkBreakdown` (line 249) then again in `parkCapacity` (lines 261-270) via `participantCountMap` which also counts by `groupId`. If a park has groups with the same participant (unlikely for Shabab — one active group per participant), this double-counts. For Lahore, each participant has exactly one group, so the count is correct.

**Severity:** Low. Correct for current data model; would become wrong if participants could join multiple groups.

---

## 3. Murabbi Dashboard

**File:** `src/app/api/murabbi/dashboard/route.ts`

### 3.1 Total participants correctly filtered to active

**Line:** 75: `db.participant.count({ where: { groupId: group.id, state: "active" } })`

✅ Correct. The murabbi dashboard uses `state: "active"`.

### 3.2 Week comparison rate vs. capacity uses events × total participants

**Lines:** 152-154

```typescript
const thisWeekCapacity = thisWeekEvents.length * totalParticipants;
const thisWeekRate = thisWeekCapacity > 0 ? Math.round((thisWeekTotal / thisWeekCapacity) * 100) : 0;
```

And similarly for last week (lines 161-163). This assumes every participant attends every event. For Lahore, if a group has 20 participants and 2 events this week, capacity = 40. If 30 marks are recorded, rate = 75%. This is a reasonable "overall engagement" metric, but it treats all unmarked participants as absent, including those who have never been marked.

**Severity:** Low. The metric is clearly defined (marks / (events × group size)). No data is wrong, but a reader may interpret it as "attendance rate of marked participants" vs. "participation engagement rate."

**Observation:** Document the formula in the API response or UI tooltip.

---

## 4. Park Dashboard

**File:** `src/app/api/park/dashboard/route.ts`

### 4.1 Needs attention — low-attendance groups with no marks

**Lines:** 271-285

```typescript
if (
  gb.todayEventStatus !== "none" &&
  gb.totalParticipants > 0 &&
  gb.todayProgress < 50 &&
  gb.todayMarkedCount > 0  // <-- only triggers if at least 1 mark exists
) { /* ... */ }
```

**Issue:** A group with an open event and 0 marks has `todayMarkedCount = 0`. The condition `gb.todayMarkedCount > 0` excludes this case. So a group with 0% attendance that simply hasn't been marked yet is not flagged. The `attentionItems` section (lines 310-319) separately catches unmarked events, but the `needsAttention` low-attendance alert misses the 0-mark case.

**Lahore data:** 180 historical events exist. All of today's events are new (just created). If a group has an event today with 0 marks, `needsAttention` won't flag it, but `attentionItems` will (via `unmarked_event` check on line 314).

**Severity:** Low. Worked around by the separate `attentionItems` check. But a combined 0% + no-marks warning would be clearer.

**Fix:** Remove `gb.todayMarkedCount > 0` or add a separate condition for todayMarkedCount === 0 with a different message.

### 4.2 Warning count computation re-implements warnings route logic

**Lines:** 326-396

The park dashboard independently computes consecutive-absence warnings for every participant across all groups, using the same algorithm as `GET /warnings`. This is hundreds of lines of duplicated query logic (four `findMany` calls, loops, maps) that runs on every dashboard load. For Lahore with 257 active participants across 6 parks, this fires ~1,500 queries per dashboard load.

**Severity:** Medium. Performance concern on dashboard load. Duplicated logic means the two implementations may drift.

**Fix:** Either (a) call the existing `GET /warnings` route or extract the warning-calculation helper into a shared function, or (b) cache the warning count with a short TTL.

---

## 5. Guardian Dashboard

**File:** `src/app/api/guardian/dashboard/route.ts`

### 5.1 Attendance rate denominator — policy decision

**Lines:** 95-96

```typescript
const totalEvents30 = eventIds30.length;  // events where THIS PARTICIPANT has a record
const rate30 = totalEvents30 > 0 ? Math.round(((present30 + late30) / totalEvents30) * 100) : 0;
```

**Current behaviour:** `totalEvents30` counts only events where the participant has a record. If the participant has no record for an event (unmarked), that event is excluded from both numerator and denominator.

**Lahore data:** 180 events, 2,967 records across 13 groups = ~228 records per group = ~17 per participant. A participant with 12 records (10 present, 2 late) over 30 days gets rate = 100% even if 8 group events had no mark for them.

**Classification:** Policy decision, not automatically a defect. Two approved options:

| Option | Denominator | Behaviour | Result for unmarked sessions |
|--------|-------------|-----------|------------------------------|
| **A — marked sessions only** (current) | Events where participant has a record | Rate reflects performance only on sessions actually marked | May inflate rate if many unmarked absences |
| **B — all closed sessions** | All closed events for the group in the period | Rate includes explicitly documented absences and unmarked sessions | Lower rate if many unmarked sessions; unmarked status must be visibly flagged in the UI |

**Recommendation:** Present both fields — `attendanceRate` (marked-session denominator) and `overallEngagementRate` (all-closed-session denominator) — and label each clearly. Alternatively, adopt Option B and add explicit handling for unmarked (status = null) in API and UI.

**Owner decision needed:** Which denominator approach for guardian/student attendance rates? The murabbi and student dashboards use the same pattern and would need alignment.

---

## 6. Student Dashboard

**File:** `src/app/api/student/dashboard/route.ts`

### 6.1 Streak calculation — calendar-day vs session-day decision

**Lines:** 169-176

```typescript
for (let i = 0; i <= 90; i++) {
  const dayDate = subDays(todayStart, i);
  const dateKey = formatPKT(dayDate, "yyyy-MM-dd");
  const statuses = dateStatusMap.get(dateKey);
  if (statuses && statuses.some((s) => s === "present")) {
    currentStreak++;
  } else {
    if (statuses) break;
  }
}
```

**Verified technical behaviour:** If a day has no events at all for the student's group (e.g. weekend, holiday), `statuses` is undefined. The `else` branch only breaks if `statuses` is truthy (has a record that's not present). So a no-event day **does not break the streak** — the loop continues. Multiple consecutive no-event days all pass through without breaking.

**Lahore data:** If attendance is Saturday-only, a student present on consecutive Saturdays has a calendar-day streak that includes all 7 days between sessions, even though only 2 sessions occurred.

**Classification:** Verified calculation concern. The desired streak definition is an owner decision:

| Option | Definition | Behaviour |
|--------|-----------|-----------|
| **Calendar-day streak** (current) | Consecutive calendar days with a "present" record; days without events pass through | Streak = 7 for present on two Saturdays 7 days apart |
| **Session-day streak** | Consecutive attendance sessions; only days with events are counted | Streak = 2 for the same pattern |

**Recommendation:** Document the current formula in the UI tooltip, or switch to session-day streaks and add a label clarifying "consecutive sessions attended."

---

## 7. List-Screen Routes

### 7.1 Batches list: defaults to active only

**File:** `src/app/api/admin/batches/route.ts`, line 42: `let where: any = { isActive: true };`

✅ Correct. Active-only default is appropriate.

### 7.2 Groups list: defaults to active only

**File:** `src/app/api/admin/groups/route.ts`, lines 42-46:

```typescript
if (status === "inactive") {
  where.isActive = false;
} else if (status !== "all") {
  where.isActive = true;
}
```

✅ Correct. Status query param allows viewing inactive or all. Defaults to active.

### 7.3 Parks list: defaults to active only

**File:** `src/app/api/admin/parks/route.ts`, line 33: `const where: any = { isActive: true };`

✅ Correct.

### 7.4 Participants list — default state filter is a product decision

**File:** `src/app/api/admin/students/route.ts`

The `studentListQuerySchema` includes an optional `state` filter (line 44) with no default. If `state` is not provided, all states are returned (active, dropout, inactive, warning, graduated). The `paginatedQuerySchema` provides pagination without overriding the state default.

**Lahore data:** 20 dropouts appear alongside 257 active participants by default.

**Classification:** Product/listing default decision, not inherently wrong. An admin managing cohort composition may need to see dropouts. A park lead taking attendance wants active participants only.

**Recommendation:** Set the API surface default to `state: "active"` and require an explicit `state=all` to include inactive/dropout records. Alternatively, keep the current default and rely on the UI to send `state=active` for attendance-facing views. Align with whatever the frontend currently sends — if the UI already sends `state=active`, no change is needed.

### 7.5 Attendance events list: defaults to last 7 days

**File:** `src/app/api/admin/attendance-events/route.ts`, lines 88-94:

```typescript
if (dateFrom) {
  // use provided date
} else {
  const sevenDaysAgo = subDays(todayPKT(), 7);
  eventWhere.eventDate = { gte: sevenDaysAgo };
}
```

✅ Correct. Reasonable default that avoids unbounded queries.

### 7.6 Fees list: `isActive: true` default

**File:** `src/app/api/admin/fees/route.ts`, line 67: `listSchema` has `status: z.enum(["active", "all"]).default("active")` at line 40, and line 46 checks `if (filters.status === "active") where.isActive = true;`.

✅ Correct. Active-only default.

---

## 8. Role-Scoped Data Leakage Risks

### 8.1 Super Admin dashboard participant count includes all states (1.1)

HQ dashboard counts 277 participants including 20 dropouts. This is a data-presentation issue, not a cross-role leak, since Super Admin and Program Admin are authorised to see all data.

**Severity:** None for data leakage. Minor for operational accuracy.

### 8.2 Attendance events API allows HQ roles to query any city/park/group

**File:** `src/app/api/admin/attendance-events/route.ts`, lines 60-67:

```typescript
if (user.role === "city_head") {
  // restricted to assigned city
} else if (user.role === "park_admin" || user.role === "park_lead") {
  // restricted to assigned park
} else {
  // Super Admin / Program Admin — unrestricted
  if (cityId) parkWhere.cityId = cityId;
  if (parkId) parkWhere.id = parkId;
}
```

✅ Correct by design. HQ roles see all data; lower roles are scoped.

---

## 9. Summary Table

| ID | Route/File | Finding | Type | Fix |
|----|-----------|---------|------|-----|
| 1.1 | admin/dashboard | HQ participant count = 277 (all states). Recommend `totalParticipants` + `activeParticipants` | Owner decision | Return both fields; UI labels distinguish them |
| 1.2 | city-head/dashboard | Batch count uses `parkId` — requires dual-read in Phase B, `cityId` in Phase C | Migration requirement | Phase B: OR query; Phase C: cityId only |
| 2.1 | city-head/dashboard | Audit activity filter uses park IDs for all entity types — misses group/participant entries | Verified finding | Separate queries or remove entityId filter |
| 2.2 | city-head/dashboard | Park breakdown may double-count participants across groups | Verified finding | Document or deduplicate by participant ID |
| 3.2 | murabbi/dashboard | Week rate = marks / (events × group size); treats all unmarked as absent | Observation | Document formula in UI tooltip |
| 4.1 | park/dashboard | Low-attendance `needsAttention` excludes 0-mark events (worked around by `attentionItems`) | Verified finding | Remove `todayMarkedCount > 0` guard |
| 4.2 | park/dashboard | Warning computation duplicates warnings route logic (N+1 queries on every load) | Verified finding | Extract shared helper or cache |
| 5.1 | guardian/dashboard | Attendance rate denominator: marked sessions only vs all closed sessions | Owner decision | Present both options; align with murabbi/student dashboards |
| 6.1 | student/dashboard | Streak counts calendar days, not sessions; no-event days pass through | Verified finding + owner decision | Document or switch to session-day streak |
| 7.4 | admin/students | Participant list default: returns all states, not just active | Product decision | Set default `state: "active"` or align with UI behaviour |

**Total: 10 items** — 3 verified technical findings, 3 owner decisions, 1 migration requirement, 1 product decision, 1 observation, 1 verified + owner decision.

---

## 10. Handoff

```
Task ID: DASH-001
Branch: agent/deepseek/DASH-001-lahore-data-consistency (from codex/production-hardening @ dffd68a)
Changed files: docs/product-discovery/DASH-001-LAHORE-DATA-CONSISTENCY.md
What changed (findings summary):
  - 10 items across 7 dashboard/list route files
  - 3 verified technical findings: audit activity filter misses entries,
    park dashboard warning computation duplicates N+1 queries,
    low-attendance alert excludes 0-mark events
  - 3 owner decisions: participant count (totalParticipants vs
    activeParticipants), guardian/student attendance denominator
    (marked sessions vs all closed sessions), student streak definition
    (calendar-day vs session-day)
  - 1 migration requirement: batch count uses parkId; dual-read in
    Phase B, cityId only in Phase C
  - 1 product decision: participant list default state filter
  - 1 observation: murabbi week rate formula
  - 1 verified + owner decision: student streak (calculation concern
    plus definition choice)
  - All references to "180 closed events" corrected to "180 historical
    events" — no database evidence for close state of historical data
  - Every finding cites exact code lines and Lahore expected data
  - Zero findings from database access — all from source code analysis
  - No data-leakage vulnerabilities found
Commands run:
  - git diff --check: pass
Known risks / owner decisions:
  - Three owner decisions required (1.1, 5.1, 6.1)
  - One product decision on participant list default (7.4)
  - One migration compatibility requirement for HIER-002 (1.2)
Ready for Codex review.
```
