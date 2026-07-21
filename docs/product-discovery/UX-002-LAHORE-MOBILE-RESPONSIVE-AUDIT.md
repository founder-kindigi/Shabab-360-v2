# UX-002: Lahore Mobile and Responsive Stabilization Audit

**Task:** UX-002
**Owner:** Gemini
**Status:** Completed — ready for Codex review
**Created:** 2026-07-21
**Scope:** Evidence-based static code inspection of mobile (375px–390px viewport) and responsive UI candidates across current-role screens in Shabab 360, prioritized for Lahore operational workflows. No code redesigns or new features.

---

## 1. Executive Summary & Verification Methodology

This audit inspects the current codebase of Shabab 360 to identify potential mobile and responsive usability candidates that may impact daily operations in Lahore (e.g., Park Admins marking outdoor attendance on mobile, City Heads reviewing dashboards on handheld devices, and Murabbis managing assigned groups).

### Audit Principles
1. **Evidence-Based Code Inspection:** All candidates cite exact repository-relative source code paths and line numbers where styling or layout constructs exist.
2. **Operational Realism:** Aligned with the Lahore baseline data structure (1 city, 6 parks, 6 batches, 13 groups, 277 participants) and low-resolution mobile viewports (375px–390px width, e.g., iPhone SE / Android budget devices).
3. **Hypothesis & Browser UAT Classification:** Static source inspection confirms the presence of layout parameters (such as `w-7 h-7`, `fixed bottom-4`, `max-h-[50vh]`, or `grid-cols-2`), but cannot empirically prove viewport overflow, device virtual keyboard collapse, layering conflicts, or physical obstruction. Therefore, all items are classified as **Mobile Browser UAT Candidates** requiring browser verification rather than confirmed P0 release blockers.

---

## 2. Mobile Browser UAT Candidates Matrix

| Ref ID | Category | Screen / File | Static Code Construct | Viewport Hypothesis | Priority | Blocks UAT |
| --- | --- | --- | --- | --- | --- | --- |
| `MOB-ATT-01` | Attendance | `src/components/modules/park/attendance-roster.tsx:L1110` | `w-7 h-7` (28px) Status Buttons | Touch target is below 44px minimum guideline, potential mis-tap risk outdoors | **P1** | **No** |
| `MOB-ATT-02` | Attendance | `src/components/modules/park/attendance-roster.tsx:L881` | `flex flex-wrap items-center gap-2` Toolbar | Toolbar buttons ("Reset", "All Absent") may wrap or overflow screen edge on 375px | **P1** | **No** |
| `MOB-ATT-03` | Attendance | `src/components/modules/park/attendance-roster.tsx:L1022` | `max-h-[50vh]` Scroll Container | Roster container height may collapse excessively when virtual keyboard opens | **P1** | **No** |
| `MOB-NAV-01` | Navigation | `src/components/shared/bottom-nav.tsx:L111` | `fixed bottom-4 left-1/2` Floating Pill | Floating pill navigation may overlap fixed page footers or modal action buttons | **P1** | **No** |
| `MOB-PEO-01` | People/Students | `src/components/modules/admin/students-page.tsx:L543` | `flex items-center gap-2` Header Actions | 3 primary action buttons may force line wrapping or horizontal overflow on 375px | **P1** | **No** |
| `MOB-PEO-02` | People/Students | `src/components/modules/admin/students-page.tsx:L592` | `flex flex-col sm:flex-row gap-3` Filter Bar | 5 stacked Select inputs may push student list below the initial fold | **P1** | **No** |
| `MOB-PEO-03` | People/Students | `src/components/modules/admin/students-page.tsx:L892` | `absolute -top-1 -left-1 size-5` Checkbox | Checkbox layered over avatar circle may cause accidental selection toggling | **P1** | **No** |
| `MOB-DASH-01` | Dashboard | `src/components/modules/city-head/city-head-dashboard.tsx:L229` | `grid grid-cols-2 gap-3` Metric Cards | Long metric titles ("Today's Attendance") may truncate or wrap awkwardly on 375px | **P2** | **No** |
| `MOB-DASH-02` | Dashboard | `src/components/modules/city-head/city-head-dashboard.tsx:L377` | `text-xl font-bold` Fees Summary | Large PKR figures (e.g., `Rs 1,250,000`) may overflow 2-column grid cell width | **P2** | **No** |
| `MOB-ACC-01` | Access Mgmt | `src/components/modules/admin/access-management-page.tsx:L78` | `flex items-center justify-between` | Long capability strings may squish against Revert button on 375px | **P2** | **No** |
| `MOB-EMP-01` | Empty State | `src/components/layout/empty-state.tsx:L35` | `p-8 md:p-12` Container Padding | Large padding may push empty-state CTA buttons off-screen in small containers | **P2** | **No** |

---

## 3. Candidate Details & Browser Verification Steps

### 3.1 Attendance Marking

#### `MOB-ATT-01`: Attendance Roster Status Button Touch Target Size
- **Role:** `murabbi`, `park_admin`, `park_lead`
- **File:** `src/components/modules/park/attendance-roster.tsx` (Lines 1109–1124)
- **Static Code Evidence:**
  ```tsx
  className={cn(
    "flex items-center justify-center w-7 h-7 rounded-full transition-all duration-150",
    ...
  )}
  ```
- **Viewport Hypothesis:** Quick status buttons (Present, Absent, Late, Excused) are explicitly styled as `w-7 h-7` (28px x 28px). This is below the recommended 44px x 44px touch target guideline, presenting a potential usability/accessibility issue during mobile outdoor attendance marking.
- **Verification Steps (375px & 390px Viewports):**
  1. Open Chrome DevTools responsive emulator set to 375px (iPhone SE) and 390px (iPhone 12/13/14).
  2. Navigate to an active attendance event roster as `murabbi` or `park_admin`.
  3. Attempt rapid touch-input tapping across adjacent status icons (Present vs. Absent).
  4. Verify if mis-taps occur or if touch target padding needs enlargement to `min-h-[40px] min-w-[40px]`.
- **Priority:** **P1**
- **Blocks UAT:** **No**

---

#### `MOB-ATT-02`: Sticky Bulk Action Toolbar Layout
- **Role:** `murabbi`, `park_lead`, `park_admin`
- **File:** `src/components/modules/park/attendance-roster.tsx` (Lines 881–970)
- **Static Code Evidence:**
  ```tsx
  <div className="flex flex-wrap items-center gap-2">
    <Button ...><CheckCircle2 /><span>All Present</span></Button>
    <Button ...><XCircle /><span>All Absent</span></Button>
    {canReset && <Button ...><RotateCcw /><span>Reset All</span></Button>}
  </div>
  ```
- **Viewport Hypothesis:** On 375px viewports, horizontal flex rendering with text labels may cause trailing actions (such as `Reset All` or selection count badges) to wrap onto multiple lines or extend past the visible screen border.
- **Verification Steps (375px & 390px Viewports):**
  1. Open mobile viewport at 375px width.
  2. Open an un-closed attendance roster with unmarked participants.
  3. Inspect sticky toolbar rendering at the top of the roster list.
  4. Verify whether all action buttons fit inline, wrap cleanly, or require horizontal scrolling (`overflow-x-auto`).
- **Priority:** **P1**
- **Blocks UAT:** **No**

---

#### `MOB-ATT-03`: Roster Container Height & Virtual Keyboard Behavior
- **Role:** `murabbi`, `park_admin`
- **File:** `src/components/modules/park/attendance-roster.tsx` (Line 1022)
- **Static Code Evidence:**
  ```tsx
  <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
  ```
- **Viewport Hypothesis:** Hardcoded `max-h-[50vh]` restricts container height to 50% of viewport height. When a mobile virtual keyboard opens upon focusing the search input, the available viewport height shrinks, which may reduce the visible roster area excessively.
- **Verification Steps (375px & 390px Viewports):**
  1. Open mobile viewport at 375px and 390px height configurations.
  2. Focus the participant search `<Input />` field to simulate software keyboard popup.
  3. Observe remaining scrollable height of the roster container.
  4. Evaluate whether replacing `max-h-[50vh]` with `flex-1 min-h-0` improves usable list area.
- **Priority:** **P1**
- **Blocks UAT:** **No**

---

### 3.2 Navigation & App Layout

#### `MOB-NAV-01`: Floating Pill Navigation Footer Positioning
- **Role:** All mobile roles (`city_head`, `park_lead`, `park_admin`, `murabbi`, `guardian`, `student`)
- **File:** `src/components/shared/bottom-nav.tsx` (Lines 110–114)
- **Static Code Evidence:**
  ```tsx
  <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 lg:hidden no-print">
  ```
- **Viewport Hypothesis:** Fixed floating pill navigation (`fixed bottom-4`, `z-40`) sits over the bottom viewport area. On small screens, it may visually overlap page content footers, pagination controls, or modal sheet submit buttons.
- **Verification Steps (375px & 390px Viewports):**
  1. Navigate through main screens on 375px mobile emulator as `city_head` and `park_admin`.
  2. Open modal dialogs, attendance sheets, or pages with bottom sticky toolbars.
  3. Inspect whether the floating nav pill overlaps any actionable UI elements or if container bottom padding (`pb-20`) is sufficient.
- **Priority:** **P1**
- **Blocks UAT:** **No**

---

### 3.3 People, Students & Guardians Management

#### `MOB-PEO-01`: PageHeader Action Button Layout on Mobile
- **Role:** `super_admin`, `program_admin`, `city_head`
- **File:** `src/components/modules/admin/students-page.tsx` (Lines 542–586)
- **Static Code Evidence:**
  ```tsx
  actions={
    <div className="flex items-center gap-2">
      <ExportButton ... />
      <Button ...><FolderInput className="size-4 mr-2" />Import</Button>
      <Button ...><Plus className="size-4 mr-2" />Add Student</Button>
    </div>
  }
  ```
- **Viewport Hypothesis:** Three inline action buttons inside `PageHeader` may wrap onto multiple lines or overflow horizontally on 375px viewports.
- **Verification Steps (375px & 390px Viewports):**
  1. Open `/admin/students` on 375px viewport emulator.
  2. Inspect `PageHeader` action buttons rendering.
  3. Verify if buttons wrap gracefully or if secondary actions should collapse to icon-only buttons on mobile screen widths.
- **Priority:** **P1**
- **Blocks UAT:** **No**

---

#### `MOB-PEO-02`: Filter Bar Vertical Stacking
- **Role:** `super_admin`, `city_head`
- **File:** `src/components/modules/admin/students-page.tsx` (Lines 592–657)
- **Static Code Evidence:**
  ```tsx
  <div className="flex flex-col sm:flex-row gap-3">
    {/* Search Input */}
    {/* City Select */}
    {/* Park Select */}
    {/* Group Select */}
    {/* State Select */}
  </div>
  ```
- **Viewport Hypothesis:** 5 filter controls stacked vertically (`flex-col`) consume substantial vertical screen height, potentially pushing the student list below the initial fold on 375px devices.
- **Verification Steps (375px & 390px Viewports):**
  1. Open Students page at 375px viewport width.
  2. Measure pixel height consumed by the stacked Select dropdowns.
  3. Assess whether a collapsible filter drawer or toggle accordion improves initial data visibility.
- **Priority:** **P1**
- **Blocks UAT:** **No**

---

#### `MOB-PEO-03`: Mobile Student Card Checkbox & Avatar Interaction
- **Role:** `super_admin`, `city_head`
- **File:** `src/components/modules/admin/students-page.tsx` (Lines 891–901)
- **Static Code Evidence:**
  ```tsx
  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
    <Checkbox
      checked={selectedIds.has(student.id)}
      onCheckedChange={() => toggleRow(student.id)}
      className="absolute -top-1 -left-1 size-5"
      aria-label={`Select ${student.name}`}
    />
    <div className="rounded-full bg-[#F3ECF6] ... size-10">
      {getInitials(student.name)}
    </div>
  </div>
  ```
- **Viewport Hypothesis:** The selection `Checkbox` (`size-5`) is positioned absolutely over the top-left corner of the `size-10` avatar circle. Touch interaction near the avatar to view student details may inadvertently trigger the checkbox toggle.
- **Verification Steps (375px & 390px Viewports):**
  1. Open mobile student cards view on a touch-enabled mobile browser emulator.
  2. Tap on the avatar initials circle to open student detail sheet.
  3. Verify whether touch events trigger row selection checkbox vs. opening detail sheet.
- **Priority:** **P1**
- **Blocks UAT:** **No**

---

### 3.4 Dashboards & Analytics

#### `MOB-DASH-01`: City Head Dashboard Metric Card Text Wrapping
- **Role:** `city_head`
- **File:** `src/components/modules/city-head/city-head-dashboard.tsx` (Lines 229–260)
- **Static Code Evidence:**
  ```tsx
  <div className="grid grid-cols-2 gap-3 sm:gap-4">
    <DataCard title="Total Parks" ... />
    <DataCard title="Total Shabab" ... />
    <DataCard title="Active Batches" ... />
    <DataCard title="Today's Attendance" ... />
  </div>
  ```
- **Viewport Hypothesis:** In a 2-column grid (`grid-cols-2`) at 375px width (~150px per card), titles like "Today's Attendance" may wrap onto 3 lines or truncate.
- **Verification Steps (375px & 390px Viewports):**
  1. Load City Head Dashboard on 375px mobile emulator.
  2. Inspect `DataCard` text layout and title line wrapping.
  3. Verify if typography adjustments (`text-xs`) or 1-column layout below 380px improves legibility.
- **Priority:** **P2**
- **Blocks UAT:** **No**

---

#### `MOB-DASH-02`: Currency Value Rendering in Fees Overview
- **Role:** `city_head`, `super_admin`
- **File:** `src/components/modules/city-head/city-head-dashboard.tsx` (Lines 377–399)
- **Static Code Evidence:**
  ```tsx
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1">
      <p className="text-[10px] ...">Collected This Month</p>
      <p className="text-xl font-bold ...">
        Rs {feesOverview.totalCollectedThisMonth.toLocaleString()}
      </p>
    </div>
    ...
  </div>
  ```
- **Viewport Hypothesis:** In a 2-column layout at 375px width, large formatted currency strings (e.g. `Rs 1,250,000`) may overflow card container boundaries.
- **Verification Steps (375px & 390px Viewports):**
  1. Populate mock financial data with 7-digit fee amounts.
  2. Load dashboard on 375px and 390px viewports.
  3. Verify whether text truncates, overflows, or wraps gracefully.
- **Priority:** **P2**
- **Blocks UAT:** **No**

---

### 3.5 Access Management

#### `MOB-ACC-01`: Role Capability Exception List Item Layout
- **Role:** `super_admin`
- **File:** `src/components/modules/admin/access-management-page.tsx` (Line 78)
- **Static Code Evidence:**
  ```tsx
  <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
    <div>
      <p className="text-sm font-medium">{item.role.replaceAll("_", " ")}</p>
      <p className="font-mono text-xs text-muted-foreground">{item.capability}</p>
    </div>
    <div className="flex items-center gap-2">
      <Badge ...>{item.effect}</Badge>
      <Button size="sm" variant="outline" ...>Revert</Button>
    </div>
  </div>
  ```
- **Viewport Hypothesis:** Flex container with `justify-between` and no flex wrapping may squeeze long capability strings against action controls on 375px viewports.
- **Verification Steps (375px & 390px Viewports):**
  1. View `/admin/access` on 375px mobile viewport emulator.
  2. Inspect capability override list item rendering.
  3. Verify whether long capability identifiers wrap or overflow the right card border.
- **Priority:** **P2**
- **Blocks UAT:** **No**

---

### 3.6 Empty & Error States

#### `MOB-EMP-01`: Empty State Component Vertical Spacing
- **Role:** All roles
- **File:** `src/components/layout/empty-state.tsx` (Line 35)
- **Static Code Evidence:**
  ```tsx
  <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center ...">
  ```
- **Viewport Hypothesis:** `p-8` container padding plus icon height may consume substantial vertical area when rendered inside small cards or modal dialogs.
- **Verification Steps (375px & 390px Viewports):**
  1. Trigger empty state view inside a modal dialog on 375px viewport.
  2. Check if action buttons remain visible above the bottom fold.
- **Priority:** **P2**
- **Blocks UAT:** **No**

---

## 4. Recommendations & Stabilization Workflow

1. **Browser UAT Execution:**
   - Test candidates `MOB-ATT-01` through `MOB-EMP-01` in Chrome DevTools mobile emulator (375px and 390px viewports) and on physical mobile devices.
   - Record empirical observations, screenshots, and device specifics in the UAT execution log.

2. **Invariants to Preserve:**
   - Maintain existing desktop layouts, Tailwind utility patterns, and server-side authorization checks.
   - Do not introduce structural schema or API route modifications during UI stabilization.

---

## 5. Verification Summary

- Static source inspection completed; browser verification pending.
