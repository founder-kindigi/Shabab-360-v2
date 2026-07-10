# Module 4: Dashboards

> **Priority:** P1
> **Phase:** 4 (Support Systems)
> **Depends On:** Module 1 (Auth & Foundation), Module 2 (City Operations)
> **Parallel Group:** Group B (alongside Module 6, 9, 10)
> **New Database Tables:** None (reads existing tables only)

---

## 1. Module Overview

Module 4 delivers role-specific, personalized dashboards that serve as the landing experience after login. Each role — Program Admin, City Head, and Park Admin — sees a tailored view surface the metrics, attention items, and quick actions most relevant to their daily responsibilities.

The dashboards are **read-only aggregate views** backed by optimized Prisma queries. No new database tables are introduced; this module queries data created by Modules 1–3 (and optionally Modules 6–7 when available).

### Business Context

After a user logs in, they land on their dashboard. The dashboard must immediately answer:
- **"What is the current state of my organization?"** (metrics)
- **"What needs my attention right now?"** (attention items)
- **"What should I do next?"** (quick actions)

For a Program Admin managing 10+ cities nationally, the dashboard provides a bird's-eye view of participation, attendance, and city-level comparisons. For a City Head, it surfaces operational issues like participants in warning state, missing guardian links, or pending attendance events. For a Park Admin, it provides today's event status, offline sync health, and a one-tap path to marking attendance.

### Key Design Principles

1. **First-screen value** — Every role sees actionable data within 1 second of page load.
2. **Attention-driven** — Items requiring action are visually prominent (amber/red indicators).
3. **Zero-setup graceful degradation** — New organizations with no data see friendly onboarding guidance, not empty broken layouts.
4. **Real-time awareness** — Metrics auto-refresh every 30 seconds via TanStack Query's `refetchInterval`.
5. **Mobile-first responsive** — Park dashboards are mobile-optimized; admin dashboards adapt between desktop and mobile layouts.

---

## 2. Dashboard Designs

### 2.1 Program Admin Dashboard

**Target roles:** `program_admin`, `super_admin`
**Landing workspace:** Admin
**API:** `GET /api/admin/dashboard`

#### Metrics Section (DataCard row)

| Card | Label | Value Source | Icon (Lucide) | Trend |
|------|-------|-------------|---------------|-------|
| Total Cities | "Cities" | `COUNT(City)` where active | `Building2` | — |
| Total Parks | "Parks" | `COUNT(Park)` where active | `TreePine` | — |
| Active Batches | "Batches" | `COUNT(Batch)` where active | `CalendarRange` | — |
| Total Groups | "Groups" | `COUNT(Group)` where active | `Users` | — |
| Total Participants | "Participants" | `COUNT(Participant)` | `GraduationCap` | — |
| Today's Attendance Rate | "Attendance Today" | Computed from today's events | `CheckCircle` | % vs. yesterday |

#### City-Level Comparison Table

A sortable table showing per-city breakdown:

| City | Parks | Participants | Groups | Active Batches | Today's Attendance Rate |
|------|-------|-------------|--------|---------------|------------------------|
| Karachi | 5 | 342 | 18 | 3 | 78% |
| Lahore | 4 | 280 | 15 | 3 | 82% |
| Islamabad | 3 | 195 | 10 | 2 | 91% |

- Column headers are sortable (click to sort ascending/descending).
- Attendance rate column highlights: green ≥80%, amber ≥60%, red <60%.
- Clicking a city row navigates to the city detail page (sets `selectedCityId` and navigates to `admin-city-dashboard`).

#### Recent Activity Feed

Displays the last 20 entries from the `audit_log` table, filtered to significant actions:

- New participant created
- Attendance event closed
- City/Park/Batch created
- User account created

Each entry shows: action description, actor name, timestamp (relative, e.g., "2 hours ago").

#### Quick Actions

A grid of 3–4 shortcut buttons:

| Action | Navigates To | Icon |
|--------|-------------|------|
| Manage Cities | `admin-cities` | `Building2` |
| View Reports | `admin-reports` | `BarChart3` |
| Send Announcement | `admin-announcements-new` | `Megaphone` |
| Manage Users | `admin-users` | `UserPlus` |

#### Empty State

When no data exists (zero cities), show an illustrated empty state:
- Title: "Welcome to Shabab360"
- Description: "Start by creating your first city to begin setting up the organization."
- CTA button: "Create First City" → navigates to `admin-cities` page with create dialog open.

---

### 2.2 City Head Dashboard

**Target role:** `city_head`
**Landing workspace:** Admin
**API:** `GET /api/admin/dashboard/city?cityId=<id>`

#### Metrics Section (DataCard row)

| Card | Label | Value Source | Icon (Lucide) | Trend |
|------|-------|-------------|---------------|-------|
| Parks | "Parks" | `COUNT(Park)` where `cityId` and active | `TreePine` | — |
| Active Batches | "Active Batches" | `COUNT(Batch)` where park's city matches and active | `CalendarRange` | — |
| Total Participants | "Participants" | `COUNT(Participant)` via groups in city's parks | `GraduationCap` | — |
| Total Groups | "Groups" | `COUNT(Group)` via batches in city's parks | `Users` | — |
| Attendance Today | "Today's Rate" | Computed from today's events in city | `CheckCircle` | % vs. yesterday |

#### Today's Attendance Summary

A compact status panel for today's attendance events:

| Metric | Value |
|--------|-------|
| Events Created Today | Count of `AttendanceEvent` with today's `eventDate` (PKT) |
| Events Completed | Subset where `isClosed = true` |
| Events Pending | Subset where `isClosed = false` |
| Total Records Marked | `COUNT(AttendanceRecord)` for today's events |

Visual: progress bar showing completed vs. pending.

#### Attention Items (AttentionList)

The most critical section. Shows items needing immediate action, grouped by category:

**Participants in Warning State**
- Participants with `state = 'warning'` in the city's groups.
- Each item shows: participant name, group name, consecutive absences count.
- Click → navigates to participant detail page.
- Badge color: amber.

**Participants in Dropout State**
- Participants with `state = 'dropout'` in the city's groups.
- Each item shows: participant name, group name, dropout date.
- Badge color: red.

**Missing Guardian Links** (conditional on data)
- Participants in the city who have zero entries in `GuardianChild`.
- Each item shows: participant name, group name.
- Click → navigates to participant detail where guardian can be linked.
- Badge color: muted gray.

**Unpaid Fees** (conditional — only if Module 6 is implemented)
- Participants who have outstanding fee events (FeeEvent with `isActive = true`) where no matching Payment exists, or Payment total < FeeEvent amount.
- Each item shows: participant name, fee title, outstanding amount.
- Click → navigates to fee management for that participant.
- Badge color: red.

**Pending Admission Applications** (conditional — only if Module 7 is implemented)
- AdmissionApplications with `status = 'submitted'` and `cityId` matching.
- Each item shows: applicant name, tracking code, submitted date.
- Click → navigates to admissions review page.
- Badge color: blue.

If no attention items exist, display: "No items need your attention right now" with a green checkmark.

#### Recent Admissions (conditional on Module 7)

If Module 7 is built, show the 5 most recently admitted participants:

| Name | Park | Group | Admitted Date |
|------|------|-------|--------------|

#### Quick Actions

| Action | Navigates To | Icon |
|--------|-------------|------|
| Create Event | `admin-attendance-events-new` | `CalendarPlus` |
| Manage People | `admin-people` | `Users` |
| View Reports | `admin-reports` | `BarChart3` |
| View Admissions | `admin-admissions` | `ClipboardList` |

#### Empty State

When the city has no parks/batches:
- Title: "Your City is Ready"
- Description: "Set up your first park and batch to start managing activities."
- CTA: "Create Park" → navigates to `admin-parks` with create dialog.

---

### 2.3 Park Dashboard (Enhanced from Module 3)

**Target roles:** `park_admin`, `park_lead`, `murabbi`
**Landing workspace:** Park
**API:** `GET /api/park/dashboard` (already exists from Module 3 — enhanced)

The Park dashboard was initially built in Module 3 as a basic view. This module enhances it with:

#### Today's Events Status (existing, retained)

| Event | Group | Status | Marked/Total | Action |
|-------|-------|--------|-------------|--------|
| Daily Session | Group A | Open | 12/18 | "Mark Attendance" |
| Evening Session | Group B | Closed | 16/16 | "View" |

- Status badges: green (closed), amber (open).
- "Mark Attendance" button opens the attendance marking page for that event.
- Quick link: "Open First Open Event" button — auto-navigates to the first unclosed event's attendance marking page.

#### Offline Queue Health (new)

For park_admin and park_lead roles, show the status of the offline attendance queue (Dexie/IndexedDB):

| Metric | Value |
|--------|-------|
| Pending Sync Count | Items in `useOfflineStore` awaiting sync |
| Last Synced At | Timestamp of most recent successful sync |
| Sync Status | "Up to date" (green) / "X items pending" (amber) / "Sync failed" (red) |

Implementation: This is client-only state from `useOfflineStore`, not an API call.

#### This-Week Attendance Trend (new — MiniChart)

A bar chart showing attendance rate per day for the current week (Saturday–Friday, aligned to Islamic/Pakistani work week):

```
Sat  Sun  Mon  Tue  Wed  Thu  Fri
85%  78%  92%  88%  0%  0%   0%
```

- Data: `AttendanceEvent` entries for the current week, grouped by day.
- Computed: `(present + late) / total * 100` per day.
- Future days (no events yet) show as empty/transparent bars.
- Chart type: bar chart using `recharts` (BarChart) wrapped in shadcn's `ChartContainer`.

#### Group-Level Attendance Summary (new)

A compact table showing per-group attendance for the current batch:

| Group | Participants | This Week Rate | Murabbi |
|-------|-------------|---------------|---------|
| Group A | 18 | 84% | Ali Ahmed |
| Group B | 15 | 91% | Bilal Khan |

- Murabbi column only visible to `park_admin` and `park_lead` (not to `murabbi` — they only see their own group).
- Clicking a group row navigates to group detail.

---

## 3. UI Components

All dashboard components live under `src/components/dashboard/`. They are composed from shadcn/ui primitives (`Card`, `Badge`, `Button`, `Table`, `Skeleton`) and follow the project's component pattern.

### 3.1 DataCard

**File:** `src/components/dashboard/data-card.tsx`

A metric display card with label, value, trend indicator, and icon.

```
┌──────────────────────┐
│  🏢  Total Cities    │
│                      │
│  12            ↑ +2  │
│  vs last month       │
└──────────────────────┘
```

**Props:**

```typescript
interface DataCardProps {
  label: string;               // e.g., "Total Cities"
  value: string | number;      // e.g., 12
  icon?: LucideIcon;           // e.g., Building2
  trend?: {
    value: number;             // e.g., +2 or -3
    label?: string;            // e.g., "vs last month"
  };
  color?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
  className?: string;
}
```

**Behavior:**
- When `loading` is true, renders a `Skeleton` placeholder matching the card dimensions.
- `trend.value > 0` shows green up arrow; `trend.value < 0` shows red down arrow; `trend.value === 0` shows gray dash.
- `color` applies a subtle left border accent: default (none), success (green-500), warning (amber-500), danger (red-500).
- Uses shadcn `Card` with `CardHeader` and `CardContent`.

**Composition:**
```tsx
<Card className={cn("relative overflow-hidden", className)}>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardDescription className="text-sm font-medium">{label}</CardDescription>
    {icon && <Icon className="h-4 w-4 text-muted-foreground" />}
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{value}</div>
    {trend && (
      <p className={cn("text-xs", trend.value > 0 ? "text-green-600" : trend.value < 0 ? "text-red-600" : "text-muted-foreground")}>
        {trend.value > 0 && <TrendingUp className="inline h-3 w-3" />}
        {trend.value < 0 && <TrendingDown className="inline h-3 w-3" />}
        {" "}{trend.value > 0 ? "+" : ""}{trend.value}
        {trend.label && <span className="text-muted-foreground"> {trend.label}</span>}
      </p>
    )}
  </CardContent>
</Card>
```

---

### 3.2 AttentionList

**File:** `src/components/dashboard/attention-list.tsx`

A grouped list of items needing action, with category headers, badges, and click-to-navigate behavior.

```
┌─────────────────────────────────────────────┐
│  ⚠ Attention Required                  (5)  │
│                                             │
│  Participants in Warning (3)                │
│  ┌─────────────────────────────────────┐    │
│  │ 🟡 Ahmed Khan   Group A   3 absents│    │
│  │ 🟡 Sara Ali    Group B   4 absents│    │
│  │ 🟡 Bilal Hassan Group A   3 absents│   │
│  └─────────────────────────────────────┘    │
│                                             │
│  Missing Guardian Links (2)                 │
│  ┌─────────────────────────────────────┐    │
│  │ ⚪ Tariq Mehmood  Group C           │    │
│  │ ⚪ Usman Shahid  Group A           │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**Props:**

```typescript
interface AttentionItem {
  id: string;
  title: string;            // e.g., "Ahmed Khan"
  subtitle: string;         // e.g., "Group A · 3 consecutive absences"
  badge?: {
    text: string;           // e.g., "Warning"
    variant: "warning" | "danger" | "info" | "muted";
  };
  onClick?: () => void;     // Navigate to detail
}

interface AttentionGroup {
  category: string;         // e.g., "Participants in Warning"
  items: AttentionItem[];
}

interface AttentionListProps {
  groups: AttentionGroup[];
  emptyMessage?: string;    // e.g., "No items need your attention"
  loading?: boolean;
  className?: string;
}
```

**Behavior:**
- Renders groups in order with category headers.
- Each item is a clickable row (if `onClick` provided) with hover effect.
- Badge variants map to shadcn `Badge` variants: `warning` → amber, `danger` → red, `info` → blue, `muted` → gray.
- When `loading`, renders 3 skeleton rows.
- When `groups` is empty and `emptyMessage` is provided, shows a centered message with `CheckCircle` icon.
- Uses shadcn `Card` for the container.

---

### 3.3 QuickActions

**File:** `src/components/dashboard/quick-actions.tsx`

A responsive grid of shortcut buttons for common tasks.

```
┌──────────────┐  ┌──────────────┐
│  📅           │  │  👥           │
│  Create       │  │  Manage       │
│  Event        │  │  People       │
└──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│  📊           │  │  📋           │
│  View         │  │  View         │
│  Reports      │  │  Admissions   │
└──────────────┘  └──────────────┘
```

**Props:**

```typescript
interface QuickAction {
  label: string;           // e.g., "Create Event"
  description?: string;    // Optional sub-label
  icon: LucideIcon;        // e.g., CalendarPlus
  onClick: () => void;     // Navigate via useAppStore
}

interface QuickActionsProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;    // Default: 2 on mobile, 4 on desktop
  className?: string;
}
```

**Behavior:**
- Responsive grid: 2 columns on mobile (`grid-cols-2`), 4 columns on desktop (`lg:grid-cols-4`).
- Each action is a `Button` variant="outline" with icon above label.
- Uses `framer-motion` for subtle hover scale animation (scale 1.02 on hover).
- Clicking triggers the `onClick` handler which calls `useAppStore().navigateTo()`.

**Composition:**
```tsx
<div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
  {actions.map((action) => (
    <motion.button
      key={action.label}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={action.onClick}
      className="flex flex-col items-center gap-2 rounded-xl border p-4 hover:bg-accent transition-colors"
    >
      <action.icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm font-medium text-center">{action.label}</span>
      {action.description && (
        <span className="text-xs text-muted-foreground text-center">{action.description}</span>
      )}
    </motion.button>
  ))}
</div>
```

---

### 3.4 MiniChart

**File:** `src/components/dashboard/mini-chart.tsx`

A compact trend chart for displaying attendance data over a week. Built on top of `recharts` and shadcn's `ChartContainer`.

```
┌──────────────────────────────┐
│  This Week's Attendance      │
│                              │
│  100%┤                       │
│   80%┤  ████                 │
│   60%┤  ████  ████           │
│   40%┤  ████  ████  ████     │
│   20%┤  ████  ████  ████     │
│    0%┤──████──████──████────  │
│       Sat   Sun   Mon  ...   │
└──────────────────────────────┘
```

**Props:**

```typescript
interface MiniChartProps {
  title: string;                  // e.g., "This Week's Attendance"
  data: Array<{
    label: string;                // e.g., "Sat", "Sun"
    value: number;                // e.g., 85 (percentage)
  }>;
  type?: "bar" | "line";         // Default: "bar"
  color?: string;                 // e.g., "hsl(var(--chart-1))" — defaults to chart-1
  height?: number;                // Default: 200
  showValue?: boolean;            // Show value on top of bars — default: true
  className?: string;
}
```

**Behavior:**
- Renders a `BarChart` (or `LineChart`) from `recharts` inside shadcn's `ChartContainer`.
- Configures `ChartTooltip` with `ChartTooltipContent` for hover details.
- Bars are colored using the provided `color` prop or the default chart theme color.
- When `showValue` is true, renders `Label` on top of each bar showing the percentage.
- Empty data (all zeros or empty array) shows a subtle "No data" message.
- Height is constrained to the `height` prop for consistent sizing within dashboard layouts.

**Composition:**
```tsx
<ChartContainer config={chartConfig} className={className}>
  <BarChart data={data}>
    <XAxis dataKey="label" tickLine={false} axisLine={false} />
    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} hide />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="value" fill="var(--color-attendance)" radius={[4, 4, 0, 0]}>
      {showValue && <LabelList dataKey="value" position="top" formatter={(v: number) => `${v}%`} />}
    </Bar>
  </BarChart>
</ChartContainer>
```

---

### 3.5 ActivityFeed

**File:** `src/components/dashboard/activity-feed.tsx`

A chronological list of recent actions/changes, sourced from the `audit_log` table.

```
┌─────────────────────────────────────────────┐
│  Recent Activity                            │
│                                             │
│  📝 Ali created participant "Ahmed Khan"    │
│     Group A · 2 hours ago                   │
│                                             │
│  ✅ Sara closed attendance event             │
│     Group B · Daily Session · 5 hours ago   │
│                                             │
│  🏢 Admin created park "Gulshan Park"       │
│     Karachi · Yesterday                      │
└─────────────────────────────────────────────┘
```

**Props:**

```typescript
interface ActivityEntry {
  id: string;
  action: string;              // e.g., "created_participant"
  description: string;         // e.g., 'Ali created participant "Ahmed Khan"'
  metadata: string;            // e.g., "Group A" or "Karachi"
  actorName: string;           // e.g., "Ali"
  timestamp: string;           // ISO 8601
}

interface ActivityFeedProps {
  entries: ActivityEntry[];
  maxItems?: number;           // Default: 10, max: 50
  loading?: boolean;
  className?: string;
}
```

**Behavior:**
- Displays entries in reverse chronological order (newest first).
- Each entry shows: action icon (based on `action` field), description, metadata, and relative timestamp.
- Relative timestamp formatting: "just now", "5 min ago", "2 hours ago", "Yesterday", "3 days ago".
- Uses `Separator` between entries.
- When `loading`, renders 5 skeleton rows.
- When empty, shows "No recent activity" with a subtle icon.

**Action-to-Icon Mapping:**
| Action prefix | Icon | Color |
|--------------|------|-------|
| `create_` | `PlusCircle` | green-500 |
| `update_` | `Edit` | blue-500 |
| `delete_` | `Trash2` | red-500 |
| `close_` | `CheckCircle` | green-500 |
| `login` | `LogIn` | gray-500 |

---

## 4. API Endpoints

### 4.1 `GET /api/admin/dashboard`

**Purpose:** Returns aggregate national metrics for Program Admin and Super Admin roles.

**Authorization:** `["super_admin", "program_admin"]`

**Query Parameters:** None.

**Response Shape:**

```typescript
interface ProgramAdminDashboardResponse {
  metrics: {
    totalCities: number;
    totalParks: number;
    activeBatches: number;
    totalGroups: number;
    totalParticipants: number;
    attendanceRateToday: number | null;     // null if no events today
    attendanceRateYesterday: number | null; // for trend comparison
  };
  cityComparison: Array<{
    cityId: string;
    cityName: string;
    cityCode: string;
    parksCount: number;
    participantsCount: number;
    groupsCount: number;
    activeBatchesCount: number;
    attendanceRateToday: number | null;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    description: string;
    metadata: string | null;
    actorName: string | null;
    timestamp: string;
  }>;
}
```

**Implementation Notes:**

1. **Metrics query** — Use a single Prisma transaction with multiple `count()` calls:
   ```typescript
   const [
     totalCities,
     totalParks,
     activeBatches,
     totalGroups,
     totalParticipants,
   ] = await db.$transaction([
     db.city.count({ where: { isActive: true } }),
     db.park.count({ where: { isActive: true } }),
     db.batch.count({ where: { isActive: true } }),
     db.group.count({ where: { isActive: true } }),
     db.participant.count(),
   ]);
   ```

2. **Attendance rate today** — Query today's events (PKT timezone), count present+late vs total records:
   ```typescript
   const todayStart = startOfDay(toPKT(new Date()));
   const todayEnd = endOfDay(toPKT(new Date()));

   const todayRecords = await db.attendanceRecord.findMany({
     where: {
       event: { eventDate: { gte: todayStart, lte: todayEnd } },
     },
     select: { status: true },
   });

   const present = todayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
   const total = todayRecords.length;
   const attendanceRateToday = total > 0 ? Math.round((present / total) * 100) : null;
   ```

3. **City comparison** — Use `db.city.findMany` with `include` for counts, or use a raw aggregation query for performance:
   ```typescript
   const cities = await db.city.findMany({
     where: { isActive: true },
     include: {
       parks: {
         where: { isActive: true },
         include: {
           batches: {
             where: { isActive: true },
             include: {
               groups: { where: { isActive: true }, include: { participants: true } },
             },
           },
         },
       },
     },
     orderBy: { name: 'asc' },
   });
   // Flatten and aggregate per city
   ```

4. **Recent activity** — Query `audit_log` ordered by `createdAt desc`, limited to 20:
   ```typescript
   const activity = await db.auditLog.findMany({
     take: 20,
     orderBy: { createdAt: 'desc' },
     include: { user: { select: { name: true } } },
   });
   ```

**Performance Considerations:**
- The city comparison query with nested includes can be expensive. For large datasets, consider using raw SQL with GROUP BY.
- Cache the response on the server for 10 seconds using a simple in-memory cache (not Redis — SQLite project).
- The `audit_log` query should have an index on `createdAt`.

---

### 4.2 `GET /api/admin/dashboard/city`

**Purpose:** Returns city-level metrics and attention items for City Head role.

**Authorization:** `["city_head"]`

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `cityId` | string | Yes | The city to load metrics for (must match the user's `assignedCityId`) |

**Scope Enforcement:**
```typescript
const authError = await authorize(["city_head"]);
if (authError) return authError;

const session = await getServerSession(authOptions);
const staffMeta = await db.staffMeta.findUnique({
  where: { userId: session.user.id },
});
if (!staffMeta?.assignedCityId || staffMeta.assignedCityId !== cityId) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**Response Shape:**

```typescript
interface CityHeadDashboardResponse {
  city: {
    id: string;
    name: string;
    code: string;
  };
  metrics: {
    parksCount: number;
    activeBatchesCount: number;
    totalParticipants: number;
    totalGroups: number;
    attendanceRateToday: number | null;
    attendanceRateYesterday: number | null;
  };
  todayAttendanceSummary: {
    eventsCreated: number;
    eventsCompleted: number;
    eventsPending: number;
    totalRecordsMarked: number;
  };
  attentionItems: {
    warningParticipants: Array<{
      id: string;
      name: string;
      groupName: string;
      groupId: string;
      consecutiveAbsents: number;
    }>;
    dropoutParticipants: Array<{
      id: string;
      name: string;
      groupName: string;
      groupId: string;
      droppedAt: string;
    }>;
    missingGuardianLinks: Array<{
      id: string;
      name: string;
      groupName: string;
      groupId: string;
    }>;
    unpaidFees: Array<{                  // Only if Module 6 tables exist
      participantId: string;
      participantName: string;
      feeTitle: string;
      outstandingAmount: number;
      feeEventId: string;
    }> | null;
    pendingAdmissions: Array<{           // Only if Module 7 tables exist
      id: string;
      applicantName: string;
      trackingCode: string;
      submittedAt: string;
    }> | null;
  };
  recentAdmissions: Array<{              // Only if Module 7 tables exist
    name: string;
    parkName: string;
    groupName: string;
    admittedAt: string;
  }> | null;
}
```

**Implementation Notes:**

1. **Attention items — warning/dropout participants:**
   ```typescript
   const warningParticipants = await db.participant.findMany({
     where: {
       state: { in: ['warning', 'dropout'] },
       group: {
         batch: {
           park: { cityId, isActive: true },
         },
         isActive: true,
       },
     },
     include: {
       group: { select: { name: true, batchId: true } },
     },
   });
   ```
   Compute `consecutiveAbsents` by counting recent absent records for the participant (last N events where status = 'absent', counting backwards from most recent event).

2. **Missing guardian links:**
   ```typescript
   const participantsWithGuardians = await db.guardianChild.findMany({
     where: {
       participant: {
         group: { batch: { park: { cityId } } },
       },
     },
     select: { participantId: true },
   });
   const linkedIds = new Set(participantsWithGuardians.map(g => g.participantId));

   const allParticipants = await db.participant.findMany({
     where: {
       group: { batch: { park: { cityId, isActive: true } }, isActive: true },
       state: 'active',
     },
     include: { group: { select: { name: true } } },
   });
   const missingGuardians = allParticipants.filter(p => !linkedIds.has(p.id));
   ```

3. **Conditional Module 6/7 data:**
   Use Prisma's `$queryRaw` with `SELECT name FROM sqlite_master WHERE type='table' AND name='fee_events'` to check if Module 6 tables exist. If not, return `null` for those fields. This allows Module 4 to work independently.

4. **Today's attendance summary:**
   ```typescript
   const todayEvents = await db.attendanceEvent.findMany({
     where: {
       eventDate: { gte: todayStart, lte: todayEnd },
       group: { batch: { park: { cityId } } },
     },
     select: {
       id: true,
       isClosed: true,
       _count: { select: { records: true } },
     },
   });
   ```

---

### 4.3 Park Dashboard API (Enhancement)

**File:** `src/app/api/park/dashboard/route.ts` (modify existing)

The Park dashboard API already exists from Module 3. This module **enhances** it by adding two new fields to the response:

```typescript
// Add to existing response:
weekAttendanceTrend: Array<{
  date: string;      // ISO date string
  dayLabel: string;  // "Sat", "Sun", etc.
  rate: number;      // 0-100 percentage
}>;

groupAttendanceSummary: Array<{
  groupId: string;
  groupName: string;
  participantsCount: number;
  weekRate: number;  // attendance rate for current week
  murabbiName: string | null;  // only for park_admin/park_lead
}>;
```

**Authorization remains unchanged:** `["park_admin", "park_lead", "murabbi"]` with park scope enforcement.

**New Query Logic:**

1. **Week attendance trend** — Get all events for the current week (Saturday to Friday) in PKT:
   ```typescript
   const weekStart = startOfWeek(toPKT(new Date()), { weekStartsOn: 6 }); // Saturday
   const weekEnd = endOfWeek(toPKT(new Date()), { weekStartsOn: 6 });     // Friday

   const weekEvents = await db.attendanceEvent.findMany({
     where: {
       eventDate: { gte: weekStart, lte: weekEnd },
       group: { batch: { parkId, isActive: true }, isActive: true },
     },
     include: { records: true },
   });

   // Group by day, compute rate per day
   ```

2. **Group attendance summary** — Aggregate per group for the current week:
   ```typescript
   const groups = await db.group.findMany({
     where: {
       batch: { parkId, isActive: true },
       isActive: true,
     },
     include: {
       participants: true,
       murabbis: { include: { user: { select: { name: true } } } },
       attendanceEvents: {
         where: { eventDate: { gte: weekStart, lte: weekEnd } },
         include: { records: true },
       },
     },
   });
   ```

---

## 5. Task Breakdown

### Task 1: DataCard Component

**File:** `src/components/dashboard/data-card.tsx`
**Effort:** Small (1–2 hours)

Build the `DataCard` component as specified in Section 3.1.

**Requirements:**
- Accept `label`, `value`, `icon`, `trend`, `color`, `loading`, `className` props.
- Render skeleton state when `loading={true}` using shadcn `Skeleton`.
- Display trend indicator with `TrendingUp`/`TrendingDown` icons from Lucide.
- Apply color accent via left border (4px): green for success, amber for warning, red for danger.
- Use shadcn `Card`, `CardHeader`, `CardContent`, `CardDescription` primitives.
- Export the component and its `DataCardProps` type.

**Testing:** Render with sample data in a story/test page. Verify skeleton, trend up, trend down, no-trend, and color variants.

---

### Task 2: AttentionList Component

**File:** `src/components/dashboard/attention-list.tsx`
**Effort:** Medium (2–3 hours)

Build the `AttentionList` component as specified in Section 3.2.

**Requirements:**
- Accept `groups`, `emptyMessage`, `loading`, `className` props.
- Render grouped sections with category headers showing item counts.
- Each item row is a flex container with badge, title, subtitle.
- Badge maps to shadcn `Badge` with variant-based colors: `warning` → `bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200`, `danger` → `bg-red-100 text-red-800`, etc.
- Items with `onClick` render as `button` elements with hover and focus states.
- Loading state renders skeleton rows per group (3 per group).
- Empty state renders centered message with `CheckCircle2` icon in green.
- Uses shadcn `Card`, `CardHeader`, `CardContent`, `CardTitle`, `Separator`.

**Testing:** Render with warning/danger/info/muted items. Verify click handlers, loading skeleton, empty state.

---

### Task 3: QuickActions Component

**File:** `src/components/dashboard/quick-actions.tsx`
**Effort:** Small (1–2 hours)

Build the `QuickActions` component as specified in Section 3.3.

**Requirements:**
- Accept `actions` array and optional `columns` prop.
- Responsive grid: `grid-cols-2` on mobile, `lg:grid-cols-4` on desktop (override via `columns` prop).
- Each action button has: icon (rendered above label), label text, optional description.
- Use `framer-motion` for `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`.
- Buttons styled as `rounded-xl border p-4 hover:bg-accent transition-colors` (outline card style, not filled buttons).
- Export `QuickAction` and `QuickActionsProps` types.

**Testing:** Render with 4 actions. Verify responsive grid (test at 375px and 1280px widths). Verify hover animation and click navigation.

---

### Task 4: MiniChart Component

**File:** `src/components/dashboard/mini-chart.tsx`
**Effort:** Medium (2–3 hours)

Build the `MiniChart` component as specified in Section 3.4.

**Requirements:**
- Accept `title`, `data`, `type`, `color`, `height`, `showValue`, `className` props.
- Use `recharts` (`BarChart`, `LineChart`, `Bar`, `Line`, `XAxis`, `YAxis`, `LabelList`) and shadcn `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`.
- Wrap in a `Card` with title in `CardHeader`.
- Bar chart as default; `type="line"` renders a line chart with dots.
- Show percentage values on top of bars when `showValue={true}`.
- Y-axis domain fixed to `[0, 100]` with percentage tick formatting.
- When data is empty, show a centered "No data yet" message with `BarChart3` icon.
- Height constrained via wrapper div style.

**Recharts Notes:**
- Import `recharts` components directly — the library is available via shadcn's `chart.tsx` dependency.
- Use `ChartContainer` with a typed `ChartConfig` for theming consistency.
- No axis lines or tick lines (clean minimal look): `tickLine={false} axisLine={false}`.

**Testing:** Render with a full week of data. Render with partial data (3 days). Render with empty data. Verify tooltip on hover.

---

### Task 5: Program Admin Dashboard API

**File:** `src/app/api/admin/dashboard/route.ts` (create new)
**Effort:** Medium (3–4 hours)

Implement the `GET /api/admin/dashboard` endpoint as specified in Section 4.1.

**Requirements:**
- Authorization: `requireRole(["super_admin", "program_admin"])`.
- Run all metric queries in a single `db.$transaction()` for consistency.
- Compute today's and yesterday's attendance rates using PKT timezone (`toPKT()` from `src/lib/timezone.ts`).
- Build city comparison array by querying all active cities with nested includes for parks → batches → groups → participants.
- Query `audit_log` for 20 most recent entries with user names.
- Return response matching the `ProgramAdminDashboardResponse` type.

**Performance:**
- For city comparison with many cities, use a raw SQL approach if the nested include becomes slow:
  ```sql
  SELECT c.id, c.name, c.code,
    COUNT(DISTINCT p.id) as parksCount,
    COUNT(DISTINCT g.id) as groupsCount,
    COUNT(DISTINCT pt.id) as participantsCount,
    COUNT(DISTINCT b.id) as activeBatchesCount
  FROM cities c
  LEFT JOIN parks p ON p.cityId = c.id AND p.isActive = 1
  LEFT JOIN batches b ON b.parkId = p.id AND b.isActive = 1
  LEFT JOIN groups g ON g.batchId = b.id AND g.isActive = 1
  LEFT JOIN participants pt ON pt.groupId = g.id
  WHERE c.isActive = 1
  GROUP BY c.id
  ORDER BY c.name ASC
  ```
- Cache the full response in a module-level variable with a 10-second TTL to handle rapid refreshes.

**Error handling:**
- Return 500 with a generic error message on database failures.
- Never expose internal error details to the client.

---

### Task 6: Program Admin Dashboard UI

**Files:**
- `src/components/modules/admin/program-admin-dashboard.tsx` (create new)
- `src/types/api.ts` (add response type)

**Effort:** Medium (3–4 hours)

Build the Program Admin dashboard page component.

**Requirements:**
- Follow the standard page component pattern (Section 7.2 of Master Plan).
- Use TanStack Query to fetch from `GET /api/admin/dashboard` with `refetchInterval: 30000` (30 seconds).
- Layout sections in order:
  1. `PageHeader` with title "Dashboard" and user greeting.
  2. Metrics row: 6 `DataCard` components in a `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4`.
  3. City comparison table using shadcn `Table`. Columns are sortable via client-side sort state.
  4. `ActivityFeed` component with recent entries.
  5. `QuickActions` grid at the bottom.
- Empty state: When `metrics.totalCities === 0`, render `EmptyState` with onboarding CTA.
- Loading state: `LoadingState` skeleton matching the layout structure.
- Error state: `ErrorState` with retry button.
- Attendance rate coloring: green text for ≥80%, amber for ≥60%, red for <60%.

**Quick Action Wiring:**
```typescript
const quickActions: QuickAction[] = [
  { label: "Manage Cities", icon: Building2, onClick: () => navigateTo("admin-cities") },
  { label: "View Reports", icon: BarChart3, onClick: () => navigateTo("admin-reports") },
  { label: "Send Announcement", icon: Megaphone, onClick: () => navigateTo("admin-announcements-new") },
  { label: "Manage Users", icon: UserPlus, onClick: () => navigateTo("admin-users") },
];
```

---

### Task 7: City Head Dashboard API

**File:** `src/app/api/admin/dashboard/city/route.ts` (create new)
**Effort:** Large (4–5 hours)

Implement the `GET /api/admin/dashboard/city` endpoint as specified in Section 4.2.

**Requirements:**
- Authorization: `requireRole(["city_head"])`.
- Validate that `cityId` matches the authenticated user's `assignedCityId`.
- Compute all metrics scoped to the city's parks.
- Build attention items array:
  - Query participants in `warning` and `dropout` states.
  - Compute consecutive absences for warning participants by counting backwards from most recent event.
  - Query participants with no `GuardianChild` entries (missing guardian links).
  - Conditionally query unpaid fees (check if `fee_events` table exists first).
  - Conditionally query pending admission applications (check if `admission_applications` table exists).
- Build today's attendance summary.
- Conditionally query recent admissions (last 5).
- Return response matching `CityHeadDashboardResponse`.

**Consecutive Absences Computation:**
```typescript
async function getConsecutiveAbsents(participantId: string): Promise<number> {
  const events = await db.attendanceEvent.findMany({
    where: { groupId: /* participant's group */ },
    orderBy: { eventDate: 'desc' },
    include: {
      records: {
        where: { participantId },
        select: { status: true },
      },
    },
  });

  let count = 0;
  for (const event of events) {
    const record = event.records[0];
    if (!record || record.status === 'absent') {
      count++;
    } else {
      break;
    }
  }
  return count;
}
```

**Conditional Module Detection:**
```typescript
async function moduleTableExists(tableName: string): Promise<boolean> {
  const result = await db.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
  );
  return Array.isArray(result) && result.length > 0;
}
```

---

### Task 8: City Head Dashboard UI

**Files:**
- `src/components/modules/admin/city-head-dashboard.tsx` (create new)
- `src/types/api.ts` (add response type)

**Effort:** Medium (3–4 hours)

Build the City Head dashboard page component.

**Requirements:**
- Follow the standard page component pattern.
- Use TanStack Query to fetch from `GET /api/admin/dashboard/city?cityId=...` with `refetchInterval: 30000`.
- Get `cityId` from the authenticated session (via `useSession()`) or from `useAppStore().selectedCityId`.
- Layout sections:
  1. `PageHeader` with title "City Dashboard" and city name.
  2. Metrics row: 5 `DataCard` components in a responsive grid.
  3. Today's attendance summary card with progress bar.
  4. `AttentionList` with all attention item groups. Items with actionable counts > 0 are expanded by default; groups with 0 items are collapsed/hidden.
  5. Conditional: Recent admissions table (only rendered if `recentAdmissions` is non-null).
  6. `QuickActions` grid.
- Empty state: When `metrics.parksCount === 0`, render setup guidance CTA.
- Attention item clicks navigate to the relevant detail page using `navigateTo()` with appropriate context (e.g., `setSelectedGroupId()` then `navigateTo("admin-group-detail")`).

**Quick Action Wiring:**
```typescript
const quickActions: QuickAction[] = [
  { label: "Create Event", icon: CalendarPlus, onClick: () => navigateTo("admin-attendance-events-new") },
  { label: "Manage People", icon: Users, onClick: () => navigateTo("admin-people") },
  { label: "View Reports", icon: BarChart3, onClick: () => navigateTo("admin-reports") },
  { label: "View Admissions", icon: ClipboardList, onClick: () => navigateTo("admin-admissions") },
];
```

---

### Task 9: Park Dashboard Enhancement

**Files:**
- `src/app/api/park/dashboard/route.ts` (modify existing)
- `src/components/modules/park/park-dashboard.tsx` (modify existing)

**Effort:** Medium (3–4 hours)

Enhance the existing Park dashboard from Module 3 with new sections.

**API Changes (`route.ts`):**
- Add `weekAttendanceTrend` computation (Section 4.3, logic item 1).
- Add `groupAttendanceSummary` computation (Section 4.3, logic item 2).
- For `murabbi` role, filter the group summary to only include the murabbi's assigned group.
- Existing fields (`todayEvents`, etc.) remain unchanged — this is purely additive.

**UI Changes (`park-dashboard.tsx`):**
- Add a "This Week's Attendance" section using the `MiniChart` component (bar chart).
- Add a "Group Attendance Summary" section using shadcn `Table`.
  - Columns: Group Name, Participants, Week Rate (with color coding), Murabbi (hidden for murabbi role).
- Add "Open First Open Event" prominent button at the top of the event list:
  ```tsx
  {todayEvents.some(e => !e.isClosed) && (
    <Button onClick={() => openFirstEvent(todayEvents)} size="lg">
      <CalendarCheck className="mr-2 h-4 w-4" />
      Mark Attendance — {todayEvents.find(e => !e.isClosed)?.title}
    </Button>
  )}
  ```
- Add "Offline Queue" card (client-side only, reads from `useOfflineStore`):
  ```tsx
  function OfflineQueueCard() {
    const { pendingRecords, lastSyncAt } = useOfflineStore();
    const pendingCount = pendingRecords.length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Offline Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <StatusBadge variant={pendingCount === 0 ? "success" : "warning"} />
            <span className="text-sm">
              {pendingCount === 0 ? "Up to date" : `${pendingCount} items pending sync`}
            </span>
          </div>
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last synced: {formatRelativeTime(lastSyncAt)}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
  ```

---

### Task 10: Dashboard Responsive Layout

**Files:**
- `src/components/dashboard/data-card.tsx` (verify responsive)
- `src/components/dashboard/quick-actions.tsx` (verify responsive)
- `src/components/modules/admin/program-admin-dashboard.tsx`
- `src/components/modules/admin/city-head-dashboard.tsx`
- `src/components/modules/park/park-dashboard.tsx`

**Effort:** Small (2–3 hours)

Ensure all dashboard pages are fully responsive across breakpoints.

**Requirements:**

| Breakpoint | Width | Layout Adjustments |
|-----------|-------|-------------------|
| Mobile | < 640px | Single column. DataCards stack vertically (1 per row). QuickActions 2 columns. Tables become horizontally scrollable. ActivityFeed full width. |
| Tablet | 640–1024px | DataCards 2 per row. QuickActions 2–3 columns. Tables show priority columns. |
| Desktop | > 1024px | DataCards 3–6 per row (depending on count). QuickActions 4 columns. Full table visible. |

**Specifics:**
- All DataCard grids use: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4`.
- City comparison table wraps in `overflow-x-auto` container.
- City Head attention items stack in single column on mobile.
- Park dashboard's event list remains single column on all sizes (already mobile-first from Module 3).
- Test at: 375px (iPhone SE), 768px (iPad), 1280px (laptop), 1536px (desktop).

---

### Task 11: Empty States for New Organizations

**Files:**
- `src/components/layout/empty-state.tsx` (verify exists from Module 1, possibly extend)
- `src/components/modules/admin/program-admin-dashboard.tsx`
- `src/components/modules/admin/city-head-dashboard.tsx`
- `src/components/modules/park/park-dashboard.tsx`

**Effort:** Small (1–2 hours)

Design and implement helpful empty states for organizations that have not yet set up their data.

**Scenarios and Messages:**

| Role | Condition | Empty State |
|------|-----------|-------------|
| Program Admin | `totalCities === 0` | "Welcome to Shabab360! Start by creating your first city." CTA: "Create City" |
| City Head | `parksCount === 0` | "Your city is set up. Create your first park to begin." CTA: "Create Park" |
| City Head | `parksCount > 0 && activeBatchesCount === 0` | "Parks are ready. Create a batch to start organizing sessions." CTA: "Create Batch" |
| Park Admin | `todayEvents.length === 0 && groups.length > 0` | "No events scheduled for today. Create an event to start marking attendance." CTA: "Create Event" |
| Park Admin | `groups.length === 0` | "No groups in the active batch. Set up groups first." CTA: "Manage Groups" |

**Implementation:**
- Use the existing `EmptyState` component from Module 1 (in `src/components/layout/empty-state.tsx`).
- If it needs additional variants (e.g., `icon`, `ctaLabel`, `ctaAction`), extend its props.
- Empty states replace the main content area — no skeleton or broken layout should show.
- CTA buttons call `navigateTo()` with the appropriate page.

---

### Task 12: Dashboard Refresh Logic

**Files:**
- `src/components/modules/admin/program-admin-dashboard.tsx`
- `src/components/modules/admin/city-head-dashboard.tsx`
- `src/components/modules/park/park-dashboard.tsx`
- `src/hooks/use-dashboard-refresh.ts` (create new — optional utility)

**Effort:** Small (1–2 hours)

Implement automatic data refresh and manual pull-to-refresh for all dashboards.

**Requirements:**

1. **Auto-refresh via TanStack Query:**
   ```typescript
   const { data, isLoading, error, refetch } = useQuery({
     queryKey: ["dashboard", "admin", role],
     queryFn: () => fetch("/api/admin/dashboard").then(r => r.json()),
     refetchInterval: 30_000,       // Auto-refresh every 30 seconds
     refetchIntervalInBackground: true,  // Continue when tab is in background
     staleTime: 15_000,             // Consider data stale after 15 seconds
   });
   ```

2. **Manual refresh indicator:**
   - Show a subtle "Last updated: X seconds ago" timestamp below the page header.
   - On `refetch`, show a brief loading shimmer on the DataCards only (not the entire page).
   - Use TanStack Query's `isFetching` (not `isLoading`) for the shimmer — `isFetching` is true during background refreshes too.

   ```tsx
   <p className="text-xs text-muted-foreground">
     {isFetching && <Loader2 className="inline h-3 w-3 animate-spin mr-1" />}
     Last updated: {formatRelativeTime(dataUpdatedAt)}
   </p>
   ```

3. **Visibility-based refetch:**
   ```typescript
   // In the page component, refetch when the page becomes visible
   useEffect(() => {
     const handleVisibility = () => {
       if (document.visibilityState === 'visible') {
         refetch();
       }
     };
     document.addEventListener('visibilitychange', handleVisibility);
     return () => document.removeEventListener('visibilitychange', handleVisibility);
   }, [refetch]);
   ```

4. **Pull-to-refresh on mobile:**
   - Not implementing native pull-to-refresh (complex, unreliable on web).
   - Instead, add a visible "Refresh" button in the `PageHeader` actions area on mobile:
     ```tsx
     <PageHeader
       title="Dashboard"
       actions={
         <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
           <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
         </Button>
       }
     />
     ```

5. **Offline handling:**
   - If the fetch fails (network error), show the last successfully cached data from TanStack Query (default behavior with `keepPreviousData: true`).
   - Display a small "Offline — showing cached data" banner using shadcn `Alert` variant.

---

## 6. Types

**File:** `src/types/api.ts` (add to existing)

```typescript
// ─── Dashboard Types ───────────────────────────────────────────────

export interface DashboardMetrics {
  totalCities?: number;
  totalParks?: number;
  activeBatches?: number;
  totalGroups?: number;
  totalParticipants?: number;
  attendanceRateToday: number | null;
  attendanceRateYesterday: number | null;
}

export interface CityComparisonRow {
  cityId: string;
  cityName: string;
  cityCode: string;
  parksCount: number;
  participantsCount: number;
  groupsCount: number;
  activeBatchesCount: number;
  attendanceRateToday: number | null;
}

export interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  metadata: string | null;
  actorName: string | null;
  timestamp: string;
}

export interface ProgramAdminDashboardResponse {
  metrics: DashboardMetrics & { totalCities: number; totalParks: number; activeBatches: number; totalGroups: number; totalParticipants: number };
  cityComparison: CityComparisonRow[];
  recentActivity: ActivityEntry[];
}

export interface AttentionParticipant {
  id: string;
  name: string;
  groupName: string;
  groupId: string;
}

export interface WarningParticipant extends AttentionParticipant {
  consecutiveAbsents: number;
}

export interface DropoutParticipant extends AttentionParticipant {
  droppedAt: string;
}

export interface UnpaidFeeItem {
  participantId: string;
  participantName: string;
  feeTitle: string;
  outstandingAmount: number;
  feeEventId: string;
}

export interface PendingAdmissionItem {
  id: string;
  applicantName: string;
  trackingCode: string;
  submittedAt: string;
}

export interface CityHeadDashboardResponse {
  city: { id: string; name: string; code: string };
  metrics: DashboardMetrics & { parksCount: number };
  todayAttendanceSummary: {
    eventsCreated: number;
    eventsCompleted: number;
    eventsPending: number;
    totalRecordsMarked: number;
  };
  attentionItems: {
    warningParticipants: WarningParticipant[];
    dropoutParticipants: DropoutParticipant[];
    missingGuardianLinks: AttentionParticipant[];
    unpaidFees: UnpaidFeeItem[] | null;
    pendingAdmissions: PendingAdmissionItem[] | null;
  };
  recentAdmissions: Array<{
    name: string;
    parkName: string;
    groupName: string;
    admittedAt: string;
  }> | null;
}

export interface WeekTrendPoint {
  date: string;
  dayLabel: string;
  rate: number;
}

export interface GroupAttendanceSummary {
  groupId: string;
  groupName: string;
  participantsCount: number;
  weekRate: number;
  murabbiName: string | null;
}
```

---

## 7. Dependencies

### Hard Dependencies (must be built first)

| Module | What Module 4 Needs |
|--------|--------------------|
| **Module 1** | Auth system, `users` table, `staff_meta` table, `audit_log` table, `requireRole()` authorization, `useSession()`, `useAppStore` |
| **Module 2** | `cities`, `parks`, `batches`, `groups`, `participants`, `guardians`, `guardian_children` tables, city/park CRUD APIs, timezone utilities (`toPKT()`) |

### Soft Dependencies (conditional features)

| Module | What Module 4 Gains | Behavior Without It |
|--------|--------------------|--------------------|
| **Module 3** | Park dashboard API base, `attendance_events`, `attendance_records` tables, offline store | Dashboard sections using attendance data are empty/hidden. Park dashboard enhancement cannot be applied. |
| **Module 5** | User management data | "Manage Users" quick action works but shows minimal data. |
| **Module 6** | `fee_events`, `payments` tables | Unpaid fees attention items are hidden (`null` in response). |
| **Module 7** | `admission_applications`, `admission_interviews` tables | Pending admissions and recent admissions sections are hidden (`null` in response). |

### Shared Components (from Module 1)

- `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription` (shadcn)
- `Badge` (shadcn)
- `Button` (shadcn)
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (shadcn)
- `Skeleton` (shadcn)
- `Separator` (shadcn)
- `Progress` (shadcn)
- `Alert` (shadcn)
- `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` (shadcn chart primitives)
- `PageHeader` (from `src/components/layout/page-header.tsx`)
- `EmptyState` (from `src/components/layout/empty-state.tsx`)
- `LoadingState` (from `src/components/layout/loading-state.tsx`)
- `ErrorState` (from `src/components/layout/error-state.tsx`)

---

## 8. Navigation Integration

Module 4 pages are registered in the SPA navigation system via Zustand. The following page keys are used:

| Page Key | Component | Condition |
|----------|-----------|-----------|
| `admin-dashboard` | `ProgramAdminDashboard` | User role is `program_admin` or `super_admin` |
| `admin-city-dashboard` | `CityHeadDashboard` | User role is `city_head` |
| `park-dashboard` | `ParkDashboard` | User role is `park_admin`, `park_lead`, or `murabbi` |

**Auto-routing on login:** In the `AppRouter` component (inside `src/app/page.tsx`), after authentication, the default landing page is determined by role:

```typescript
// In AppRouter or auth callback:
function getDefaultPage(role: string): string {
  switch (role) {
    case 'super_admin':
    case 'program_admin':
      return 'admin-dashboard';
    case 'city_head':
      return 'admin-city-dashboard';
    case 'park_admin':
    case 'park_lead':
    case 'murabbi':
      return 'park-dashboard';
    default:
      return 'admin-dashboard'; // fallback
  }
}
```

**PageRenderer registration** (in the main `pageRenderer` switch/map):
```typescript
case 'admin-dashboard': return <ProgramAdminDashboard />;
case 'admin-city-dashboard': return <CityHeadDashboard />;
// 'park-dashboard' is already registered from Module 3
```

---

## 9. Acceptance Criteria

### AC-1: Role-Based Dashboard Routing
- [ ] Program Admin (`program_admin`) lands on `admin-dashboard` after login.
- [ ] Super Admin (`super_admin`) lands on `admin-dashboard` after login.
- [ ] City Head (`city_head`) lands on `admin-city-dashboard` after login.
- [ ] Park Admin (`park_admin`) lands on `park-dashboard` after login.
- [ ] Park Lead (`park_lead`) lands on `park-dashboard` after login.
- [ ] Murabbi (`murabbi`) lands on `park-dashboard` after login.

### AC-2: Metrics Accuracy
- [ ] Program Admin sees correct total counts for cities, parks, batches, groups, and participants matching the database.
- [ ] City Head sees correct counts scoped to their assigned city only.
- [ ] Attendance rates are computed correctly: `(present + late) / total * 100`, rounded to nearest integer.
- [ ] Attendance rates use PKT timezone for "today" determination.

### AC-3: Attention Items
- [ ] City Head sees participants in `warning` state with correct consecutive absence counts.
- [ ] City Head sees participants in `dropout` state.
- [ ] City Head sees participants without guardian links.
- [ ] Each attention item links to the relevant detail page when clicked.
- [ ] Attention items are hidden when count is zero (category not rendered).
- [ ] Unpaid fees section appears only if Module 6 fee tables exist.
- [ ] Pending admissions section appears only if Module 7 admission tables exist.

### AC-4: Quick Actions
- [ ] All quick action buttons navigate to the correct page via `navigateTo()`.
- [ ] Quick actions are visually distinct and labeled clearly.
- [ ] Hover/focus states are visible and accessible.

### AC-5: Real-Time Updates
- [ ] Dashboard data auto-refreshes every 30 seconds via TanStack Query `refetchInterval`.
- [ ] A "Last updated" timestamp is visible on each dashboard.
- [ ] Background refetch shows a subtle loading indicator without disrupting the view.
- [ ] Visibility change (tab focus) triggers an immediate refetch.

### AC-6: Responsiveness
- [ ] Program Admin dashboard renders correctly at 375px, 768px, 1280px, and 1536px widths.
- [ ] City Head dashboard renders correctly at all breakpoints.
- [ ] Park dashboard renders correctly at all breakpoints (mobile-first).
- [ ] Tables are horizontally scrollable on mobile.
- [ ] DataCard grid adapts from 1 column (mobile) to 6 columns (desktop).

### AC-7: Empty States
- [ ] New Program Admin (no cities) sees onboarding empty state with "Create City" CTA.
- [ ] New City Head (no parks) sees setup guidance with "Create Park" CTA.
- [ ] Park Admin with no groups sees guidance to set up groups.
- [ ] No empty state shows broken layout, skeleton, or errors.

### AC-8: API Authorization
- [ ] `GET /api/admin/dashboard` returns 401 for unauthenticated requests.
- [ ] `GET /api/admin/dashboard` returns 403 for non-admin roles (city_head, park_admin).
- [ ] `GET /api/admin/dashboard/city` returns 403 if `cityId` does not match the user's `assignedCityId`.
- [ ] `GET /api/park/dashboard` returns 403 if park does not match the user's `assignedParkId`.

### AC-9: Offline & Error Handling
- [ ] If the network is unavailable, the dashboard shows the last cached data with an "Offline" banner.
- [ ] If the API returns an error, `ErrorState` component is displayed with a retry button.
- [ ] Retry button re-triggers the TanStack Query fetch.

### AC-10: Performance
- [ ] Program Admin dashboard API responds within 2 seconds for up to 20 cities.
- [ ] City Head dashboard API responds within 1 second.
- [ ] Park dashboard API responds within 500ms.
- [ ] No N+1 query patterns in any dashboard API endpoint.

---

## 10. Files to Create/Modify

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `src/components/dashboard/data-card.tsx` | DataCard metric display component |
| 2 | `src/components/dashboard/attention-list.tsx` | AttentionList grouped action items component |
| 3 | `src/components/dashboard/quick-actions.tsx` | QuickActions shortcut grid component |
| 4 | `src/components/dashboard/mini-chart.tsx` | MiniChart trend chart component (recharts) |
| 5 | `src/components/dashboard/activity-feed.tsx` | ActivityFeed recent actions list component |
| 6 | `src/app/api/admin/dashboard/route.ts` | Program Admin dashboard API endpoint |
| 7 | `src/app/api/admin/dashboard/city/route.ts` | City Head dashboard API endpoint |
| 8 | `src/components/modules/admin/program-admin-dashboard.tsx` | Program Admin dashboard page |
| 9 | `src/components/modules/admin/city-head-dashboard.tsx` | City Head dashboard page |

### Modified Files

| # | File | Changes |
|---|------|---------|
| 1 | `src/app/api/park/dashboard/route.ts` | Add `weekAttendanceTrend` and `groupAttendanceSummary` to response |
| 2 | `src/components/modules/park/park-dashboard.tsx` | Add MiniChart section, group summary table, offline queue card, "Open First Event" button |
| 3 | `src/types/api.ts` | Add all dashboard response types (`ProgramAdminDashboardResponse`, `CityHeadDashboardResponse`, etc.) |
| 4 | `src/app/page.tsx` | Register `admin-dashboard` and `admin-city-dashboard` page keys in PageRenderer; update default page routing logic |
| 5 | `src/stores/useAppStore.ts` | Verify page keys are supported (no new state fields needed — navigation uses existing `navigateTo`) |
| 6 | `src/components/layout/empty-state.tsx` | Extend props if needed for dashboard empty state CTAs (add optional `ctaLabel` and `ctaAction` props) |

---

## 11. Implementation Order

Tasks should be executed in this sequence:

```
Task 1: DataCard component           ─── foundational, no deps
Task 2: AttentionList component      ─── foundational, no deps
Task 3: QuickActions component       ─── foundational, no deps
Task 4: MiniChart component          ─── foundational, no deps

   (Tasks 1–4 can be done in parallel)

Task 5: Program Admin API            ─── needs DB schema from Module 2
Task 7: City Head API                ─── needs DB schema from Module 2

   (Tasks 5 and 7 can be done in parallel after 1–4)

Task 6: Program Admin UI             ─── needs Task 5 + Tasks 1–4 components
Task 8: City Head UI                 ─── needs Task 7 + Tasks 1–4 components

   (Tasks 6 and 8 can be done in parallel)

Task 9:  Park Dashboard Enhancement  ─── needs Module 3 code to exist
Task 10: Responsive Layout           ─── needs Tasks 6, 8, 9
Task 11: Empty States                ─── needs Tasks 6, 8, 9
Task 12: Dashboard Refresh Logic     ─── needs Tasks 6, 8, 9
```

Tasks 10, 11, 12 can be done in parallel after the corresponding UI tasks are complete.

**Total estimated effort:** 24–34 hours

---

## 12. Testing Checklist

After implementation, verify the following manually:

1. **Login as `program_admin`** → lands on admin dashboard → all 6 metrics display → city comparison table shows all cities → activity feed shows recent entries → quick actions navigate correctly.

2. **Login as `city_head`** → lands on city dashboard → metrics show city-scoped data → attention items list shows warning/dropout participants → clicking an attention item navigates to the right page → empty state shows when city has no data.

3. **Login as `park_admin`** → lands on park dashboard → today's events show → MiniChart displays weekly trend → group summary shows per-group attendance → "Open First Event" button navigates to attendance marking → offline queue card shows sync status.

4. **Create test data** in Modules 1–3 (cities, parks, batches, groups, participants, attendance events) → verify all dashboards update with accurate counts.

5. **Test responsive layouts** at 375px, 768px, 1280px.

6. **Test auto-refresh** → leave dashboard open → make a change in another tab → verify dashboard updates within 30 seconds.

7. **Test empty states** → use a fresh database → login as each role → verify appropriate empty states with CTAs.

8. **Test authorization** → attempt to access `/api/admin/dashboard` as `city_head` → expect 403 → attempt to access `/api/admin/dashboard/city?cityId=X` with a different city → expect 403.

9. **Run `bun run lint`** → no errors.

10. **Check `/home/z/my-project/dev.log`** for runtime errors.