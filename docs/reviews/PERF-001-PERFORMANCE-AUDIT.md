# Performance Audit & Remediation Backlog (PERF-001)

**Date:** 2026-07-30
**Status:** Audit Complete
**Base Commit:** `11aadee`
**Target File:** `docs/reviews/PERF-001-PERFORMANCE-AUDIT.md`

---

## 1. Executive Summary & Audit Scope

This performance audit provides a code-level review of active module pages and API handlers across **Shabab 360 v2** (`/admin/mashwara`, `/admin/events`, `/admin/attendance-events`, `/admin/calling`, `/admin/students`, `/admin/admissions`, `/admin/reports`, `/admin/certificates`, and `/admin/dashboard`).

### Audit Methodology
- **Code Inspection:** Analytical analysis of Next.js 16 page routes, API handlers (`src/app/api/...`), Prisma DB queries, TanStack Query client components, and state management hooks (`Zustand`, `useAppStore`).
- **Safety Boundaries:** Zero writes to production/staging data, no external network requests, and no claims of empirical production network latency. All findings are derived directly from source file structures, database call patterns, and client render paths.

---

## 2. Ranked Findings Matrix

| Finding ID | Priority | Module / Area | Category | Impact |
| --- | --- | --- | --- | --- |
| **PERF-001-01** | **P0** | Reports API | Unbounded Query / Missing Pagination | OOM / slow query on large datasets |
| **PERF-001-02** | **P0** | Calling API | Unbounded Query / Missing Pagination | High payload bloat on large campaigns |
| **PERF-001-03** | **P0** | Dashboard API | In-Memory DB Aggregation & Loop Overhead | Memory spikes & CPU spin under load |
| **PERF-001-04** | **P1** | Batch Certificates API | In-Memory Query Aggregation | High memory usage for batch generation |
| **PERF-001-05** | **P1** | Admissions & Students API | High Page Size & Deep Eager Includes | Excess payload transfer over mobile networks |
| **PERF-001-06** | **P1** | Mashwara & Events Client | Client Context Waterfalls & Refresh-Stuck Risk | Delayed initial render & direct navigation stalls |
| **PERF-001-07** | **P2** | Multi-Query Detail Views | Client Component Query Chaining | 3-4 sequential HTTP roundtrips on page load |
| **PERF-001-08** | **P2** | Mobile Viewport Payloads | Un-adapted Mobile List Downloads | Battery drain & viewport lag on low-end mobile devices |

---

## 3. Detailed Audit Findings

### P0 Findings (Critical Performance & Scalability Blockers)

#### PERF-001-01: Unbounded Query & Missing Pagination in Attendance Report API
- **File Path:** [src/app/api/admin/reports/attendance-report/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/reports/attendance-report/route.ts#L112-L137)
- **Lines:** L112–L137
- **Root Cause:**
  ```typescript
  const records = await db.attendanceRecord.findMany({
    where: { event: eventWhere },
    include: {
      event: {
        include: {
          group: {
            include: {
              batch: {
                include: {
                  park: { include: { city: true } },
                },
              },
            },
          },
        },
      },
      participant: true,
    },
    orderBy: [{ event: { eventDate: "desc" } }, { participant: { name: "asc" } }],
  });
  ```
  `findMany` contains **no `take` or `skip` parameters**. It executes a 5-level deep relation join (`city -> park -> batch -> group -> event -> record -> participant`) and loads every single attendance record matching the date range into Node.js memory. In a city with 20,000+ attendance records over a 3-month period, this query can return tens of megabytes of JSON data in a single response, leading to server OOM and response timeouts.
- **Remediation Task:**
  Enforce required pagination parameters (`page`, `pageSize` with max 100) or structured date-bounded streaming/chunking. Flatten relational includes to return scalar IDs or essential display strings only.

---

#### PERF-001-02: Missing Pagination in Calling Campaign Leads API
- **File Path:** [src/app/api/calling/campaigns/[id]/leads/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/calling/campaigns/%5Bid%5D/leads/route.ts#L115-L130)
- **Lines:** L115–L130
- **Root Cause:**
  ```typescript
  const assignments = await db.callingAssignment.findMany({
    where: whereClause,
    include: {
      application: { select: { ... } },
      notes: { orderBy: { createdAt: "desc" }, take: 1 },
      ...
    },
  });
  ```
  `findMany` fetches **all assignments** for a campaign without pagination bounds (`skip`/`take`). For large call center campaigns containing 2,000+ assigned applicants, a single GET call downloads the entire lead database for the campaign into the client's memory.
- **Remediation Task:**
  Integrate `paginatedQuerySchema` (`page` and `pageSize`, default 50, max 100). Return standard pagination metadata `{ data, pagination: { page, pageSize, total, totalPages } }`.

---

#### PERF-001-03: In-Memory Aggregations & Loop Counting in Admin Dashboard API
- **File Path:** [src/app/api/admin/dashboard/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/dashboard/route.ts#L20-L44)
- **Lines:** L20–L44, L67–L86, L145–L152, L222–L238, L246–L262
- **Root Cause:**
  The dashboard handler uses `db.findMany` to pull full record sets into Node.js memory and iterates through them using JS loops/reducers to calculate counts and aggregates:
  - **Attendance Trend (L20–L44):** Fetches all `attendanceEvent` rows and nested `records` array, then manually counts `present`/`late`/`absent` status in JS.
  - **Today's Attendance (L67–L86):** Fetches all `attendanceRecord` objects for today to run `if (rec.status === "present") present++`.
  - **Staff per City (L145–L152):** Fetches all `staffMeta` rows to execute `allCityStaff.reduce(...)` instead of `db.staffMeta.groupBy`.
  - **Registration Trend (L222–L238):** Fetches all participants joined in the last 12 months (`db.participant.findMany({ select: { joinedAt: true } })`) to group by month in a JS `Map`.
  - **Fee Collection Trend (L246–L262):** Fetches all `payment` rows in the last 6 months to aggregate totals per month in JS.
- **Remediation Task:**
  Replace in-memory array iterations with native Prisma aggregations (`db.attendanceRecord.groupBy`, `db.staffMeta.groupBy`, `db.payment.aggregate`).

---

### P1 Findings (High Priority UX & Performance Issues)

#### PERF-001-04: In-Memory Record Aggregation in Batch Certificates API
- **File Path:** [src/app/api/admin/certificates/batch/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/certificates/batch/route.ts#L96-L108)
- **Lines:** L96–L108
- **Root Cause:**
  ```typescript
  const attendanceRecords = await db.attendanceRecord.findMany({
    where: {
      eventId: { in: eventIds },
      status: { in: ["present", "late"] },
    },
    select: { eventId: true, participantId: true },
  });
  ```
  To evaluate certificate eligibility across a batch, the handler loads all historical `present` and `late` attendance records into a JS `Set` in memory. For a batch with 10 groups over a 6-month term, this pulls 15,000+ rows into memory to perform client-side matching.
- **Remediation Task:**
  Refactor eligibility calculation to use SQL/Prisma `groupBy` by `participantId` with `_count` filtering.

---

#### PERF-001-05: Excessive Page Sizes & Deep Eager Includes in Admissions & Students APIs
- **File Paths:**
  - [src/app/api/admin/admissions/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/admissions/route.ts#L30) (L30, L72–L81)
  - [src/app/api/admin/students/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/students/route.ts#L86-L113) (L86–L113)
- **Lines:** Admissions L30, L72–L81; Students L86–L113
- **Root Cause:**
  - Admissions API allows `maxPageSize: 200` and eagerly includes all `interviews`, `convertedParticipant`, `group`, `batch`, `preferredPark`, and `city` objects on every list request.
  - Students API eagerly includes nested `group -> batch -> park -> city`, `guardianLinks -> guardian`, and `attendanceRecords` (last 30 days) for every student item in the paginated list.
  - Transmitting nested objects for up to 200 items generates response payloads exceeding 500KB per request.
- **Remediation Task:**
  Lower default page size from 200 to 25/50. Select scalar fields explicitly and defer nested arrays (e.g. `interviews`, detailed attendance records) to detail drawers/routes.

---

#### PERF-001-06: Client Context Waterfalls & Refresh-Stuck Vulnerability in Mashwara & Events Modules
- **File Paths:**
  - [src/app/admin/mashwara/_client.tsx](file:///D:/iBuild/Shabab-360-v2/src/app/admin/mashwara/_client.tsx#L307-L369) (L307–L369)
  - [src/app/admin/mashwara/[id]/_client.tsx](file:///D:/iBuild/Shabab-360-v2/src/app/admin/mashwara/%5Bid%5D/_client.tsx#L96-L129) (L96–L129)
  - [src/app/admin/events/_client.tsx](file:///D:/iBuild/Shabab-360-v2/src/app/admin/events/_client.tsx#L162-L210) (L162–L210)
- **Lines:** Mashwara List L307–L369; Mashwara Detail L96–L129; Events List L162–L210
- **Root Cause:**
  - **Waterfall Execution:** Main list and detail queries depend on `enabled: !!ctx && !ctxError`. The client first issues `fetch("/api/admin/mashwara/ui-context")` (or `/api/admin/events/ui-context`), waits for the server response, and only then triggers the primary page query (`/api/admin/mashwara`). This introduces a 2-hop network waterfall on every cold load.
  - **Direct-Refresh Edge Case:** On direct browser refresh (e.g. nav to `/admin/mashwara/m-123`), if `ui-context` returns an unhandled error state or Zustand `selectedEventId` hydration lags, the detail query remains disabled (`enabled: false`) without displaying a clear error boundary, causing the page to remain stuck in a skeleton/loading state indefinitely.
- **Remediation Task:**
  Refactor client components to handle `ui-context` loading/error states gracefully with explicit timeout fallbacks and error boundaries. Explore embedding essential UI capability flags into the initial server page render context or unifying `ui-context` with the primary list payload.

---

### P2 Findings (Medium / Polish Performance Considerations)

#### PERF-001-07: Multi-Query Sequential Fetching on Detail Pages
- **File Path:** [src/app/admin/events/[id]/_client.tsx](file:///D:/iBuild/Shabab-360-v2/src/app/admin/events/%5Bid%5D/_client.tsx)
- **Root Cause:**
  Event detail view fires 4 separate TanStack Query hooks in parallel/series (`event-detail`, `event-planner-items`, `event-responsibilities`, `event-teams`). Each query makes a distinct HTTP request over the network.
- **Remediation Task:**
  Consolidate event detail GET handler to return a unified composite payload `{ detail, plannerItems, responsibilities, teams }` in a single HTTP request.

---

#### PERF-001-08: Un-adapted Mobile Viewport Payloads & Large List Renders
- **File Paths:**
  - [src/app/admin/students/_client.tsx](file:///D:/iBuild/Shabab-360-v2/src/app/admin/students/_client.tsx)
  - [src/app/admin/attendance-events/_client.tsx](file:///D:/iBuild/Shabab-360-v2/src/app/admin/attendance-events/_client.tsx)
- **Root Cause:**
  Mobile viewports (375px/390px) receive the exact same 50–200 item payload as desktop screens. On mobile, rendered DOM nodes for hidden table columns consume layout memory and cause touch scroll stutter.
- **Remediation Task:**
  Implement responsive list payload adapters or virtualization for mobile views, limiting initial mobile list rendering to top 15 items with infinite scroll or concise card view structures.

---

## 4. Proposed Performance Budget

To enforce consistent performance across all modules, future development must adhere to the following target thresholds:

| Metric | Target Threshold | Maximum Threshold | Measurement Rule |
| --- | --- | --- | --- |
| **API Response Payload Size** | `< 50 KB` | `< 150 KB` | Compressed JSON response payload per GET request |
| **DB Queries per API Request** | `< 5 queries` | `< 10 queries` | Total Prisma DB queries executed in single handler |
| **Client Network Roundtrips** | `1 roundtrip` | `2 roundtrips` | HTTP calls required before initial page content render |
| **Max Page Size Bounds** | `50 items` | `100 items` | Hard limit enforced by `paginatedQuerySchema` |
| **In-Memory Row Processing** | `0 unpaginated rows` | `0 unpaginated rows` | Zero full-table `findMany` queries for manual JS aggregation |

---

## 5. Evidence & Verification Plan

Future performance remediation tasks (PERF-002 and related updates) will be validated using concrete, non-production evidence gates:

1. **Automated Route & Schema Tests (Vitest):**
   - Assert `pageSize` schema validation caps at maximum 100.
   - Assert query responses return expected `pagination` object with `totalPages` calculation.
   - Verify 400 Bad Request error returns when unpaginated or invalid query bounds are supplied.
2. **Prisma Query Counting Tests:**
   - Mock/spy Prisma DB client methods in integration tests to verify query count per endpoint remains within budget (`<= 5` queries).
   - Assert zero unbounded `findMany()` invocations (must include `take` or `groupBy`).
3. **Payload Size Verification Tests:**
   - Create route unit tests asserting payload JSON string length for 50 items remains under target limit (`< 150 KB`).
4. **Hydration & Direct-Refresh Component Tests:**
   - React Testing Library tests for client components simulating direct refresh (`params` provided, `ui-context` delayed or errored) to confirm proper error boundary display rather than infinite loading spinner.

---

## 6. Ranked Remediation Backlog

The following isolated remediation tasks are queued for implementation in **PERF-002**:

### Task PERF-002-A: Reports & Calling Unbounded Query Fixes (P0)
- **Scope:** [src/app/api/admin/reports/attendance-report/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/reports/attendance-report/route.ts), [src/app/api/calling/campaigns/[id]/leads/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/calling/campaigns/%5Bid%5D/leads/route.ts)
- **Deliverable:** Add bounded pagination schema (`page`/`pageSize`), limit default response sizes, select required scalar fields only. Add regression tests for page bounds and response structure.

### Task PERF-002-B: Dashboard & Certificates DB Aggregation Refactor (P0/P1)
- **Scope:** [src/app/api/admin/dashboard/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/dashboard/route.ts), [src/app/api/admin/certificates/batch/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/certificates/batch/route.ts)
- **Deliverable:** Replace JS `filter`/`reduce`/`map` array aggregations with Prisma `groupBy` and SQL `aggregate` functions. Verify zero unpaginated `findMany` calls in dashboard handlers.

### Task PERF-002-C: Admissions & Students Payload Trimming (P1)
- **Scope:** [src/app/api/admin/admissions/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/admissions/route.ts), [src/app/api/admin/students/route.ts](file:///D:/iBuild/Shabab-360-v2/src/app/api/admin/students/route.ts)
- **Deliverable:** Reduce max allowed `pageSize` to 100. Remove heavy eager includes (`interviews`, detailed `attendanceRecords`) from list queries.

### Task PERF-002-D: Client Waterfall Elimination & Direct-Refresh Resilience (P1/P2)
- **Scope:** [src/app/admin/mashwara/_client.tsx](file:///D:/iBuild/Shabab-360-v2/src/app/admin/mashwara/_client.tsx), [src/app/admin/mashwara/[id]/_client.tsx](file:///D:/iBuild/Shabab-360-v2/src/app/admin/mashwara/%5Bid%5D/_client.tsx), [src/app/admin/events/_client.tsx](file:///D:/iBuild/Shabab-360-v2/src/app/admin/events/_client.tsx)
- **Deliverable:** Implement explicit error state handling and fallback timeouts for `ui-context` dependency. Consolidate multi-endpoint detail queries into single composite handlers.

---
