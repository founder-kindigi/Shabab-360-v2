# LAHORE STABILIZATION REPAIR BACKLOG

**Document Version:** 1.1.0
**Target Commit:** `99f9460` (on branch `agent/antigravity/pkg-02-lahore-uat`)
**UAT Blocker Note:** Staging Chrome DevTools and browser connector plugin was unavailable. All findings are registered as **Static Candidates** pending live browser verification.

---

## 1. Summary of Database Baseline Reconciliation

Staging database baseline counts were verified from the active PostgreSQL staging instance using direct Prisma query reconciliation:
* **Cities:** 1 (`LHR`)
* **Parks:** 6
* **Batches:** 6
* **Groups:** 13
* **Participants:** 277 (257 active, 20 dropout)
* **AttendanceEvents:** 180
* **AttendanceRecords:** 2,967
* **StaffMeta / Users:** 54 (Reconciled as 10 active authorized users + 44 inactive placeholders)

All imported Lahore Batch 4 data remains **unaltered** and pristine.

---

## 2. Static Mobile Candidate defects (Pending Browser Verification)

### [CANDIDATE-DEFECT-01] Bottom Navigation Overlay Obstruction (MOB-NAV-01)
* **Severity:** P1 (Major)
* **Role:** All mobile roles
* **Route:** Global shell layout
* **Viewport:** 375px & 390px width
* **Preconditions:** Scrollable lists, modal dialogs, or bottom sheets on small screen height.
* **Observed Behavior:** Statically, the floating bottom navigation bar pill is configured with `fixed bottom-4 left-1/2 -translate-x-1/2 z-40`. Content wrappers, form layouts, and modal panels lack bottom spacing. This can cause the nav bar to overlay primary CTA submit/cancel buttons or list items, preventing touch click actions.
* **Expected Behavior:** Roster list containers and sheet/modal content wrappers must have a minimum bottom padding offset (`pb-24`) to ensure all interactive elements can be scrolled clear of the floating navigation pill.
* **Evidence Reference:** `src/components/shared/bottom-nav.tsx:L110-112`
* **Classification:** Modify

### [CANDIDATE-DEFECT-02] Student Directory Filter Stack Vertical Bloat (MOB-PEO-02)
* **Severity:** P1 (Major)
* **Role:** `super_admin`, `city_head`
* **Route:** `/admin/students` (Student Directory)
* **Viewport:** 375px (iPhone SE height 667px)
* **Preconditions:** Filter panel loaded on short viewports.
* **Observed Behavior:** The filter bar container stacks 5 select dropdowns + 1 search input vertically (`flex flex-col sm:flex-row gap-3`). This layout consumes ~272px of vertical height. In combination with the page header (approx 120px) and bottom nav (approx 80px), the filters consume the entire screen real estate, hiding student records completely below the viewport fold.
* **Expected Behavior:** Filters on mobile viewports must be hidden behind a collapsible "Filter Drawer" trigger button or laid out inside a horizontal swipe/scroll container to keep the roster data visible above the fold.
* **Evidence Reference:** `src/components/modules/admin/students-page.tsx:L592-657`
* **Classification:** Modify

### [CANDIDATE-DEFECT-03] Checkbox Overlap with Avatar Touch Area (MOB-PEO-03)
* **Severity:** P1 (Major)
* **Role:** `super_admin`, `city_head`
* **Route:** `/admin/students` (Mobile card list view)
* **Viewport:** 375px & 390px width
* **Preconditions:** Roster cards loaded in Selection/Check mode.
* **Observed Behavior:** The student selection checkbox is styled with `absolute -top-1 -left-1 size-5` and positioned directly over the `size-10` initials avatar bubble. Because the touch targets overlap, tapping to select a card frequently misses the tiny checkbox bounds and triggers the card click instead, launching the student detail sheet unexpectedly.
* **Expected Behavior:** Separate selection checkbox visually to the left of the card in its own layout column, or introduce a distinct "Selection Mode" toggle.
* **Evidence Reference:** `src/components/modules/admin/students-page.tsx:L892-901`
* **Classification:** Modify

### [CANDIDATE-DEFECT-04] WCAG Mobile Touch Target Violation on Attendance Roster (MOB-ATT-01)
* **Severity:** P1 (Major)
* **Role:** `murabbi`, `park_admin`
* **Route:** `/park/attendance` (Attendance Marking Roster)
* **Viewport:** 375px & 390px width
* **Preconditions:** Attendance roster loaded on mobile screen.
* **Observed Behavior:** Quick status buttons (Present, Absent, Late, Excused) are styled as `w-7 h-7` (28px by 28px) and rendered side-by-side. This falls short of the WCAG mobile touch target standard of at least 44px by 44px (or 24px with sufficient margins). Tapping these small adjacent buttons outdoors or on the move frequently results in registering wrong statuses.
* **Expected Behavior:** Status buttons must be expanded to `w-10 h-10` with increased horizontal gap padding, or placed inside a modal dropdown menu on mobile screens.
* **Evidence Reference:** `src/components/modules/park/attendance-roster.tsx:L1110`
* **Classification:** Modify

### [CANDIDATE-DEFECT-05] Large PKR Financial Figures Grid Overflow (MOB-DASH-02)
* **Severity:** P2 (Minor)
* **Role:** `city_head`
* **Route:** `/city-head/dashboard` (City Head Dashboard)
* **Viewport:** 375px width
* **Preconditions:** Financial sums exceeding 7 digits (e.g. `Rs 12,500,000`).
* **Observed Behavior:** Fees overview cards use a `grid grid-cols-2 gap-4` layout. On a 375px screen, each column is allocated a maximum width of ~147.5px. Text characters at `text-xl` font size for `Rs 12,500,000` consume ~156px width, causing currency text to spill past grid boundaries and clip or overlap the adjacent label.
* **Expected Behavior:** Format values to use shorthand suffixes (e.g., `Rs 12.5M`) or dynamically downscale font size (`text-lg` or `text-base`) for figures above 6 digits on mobile screens.
* **Evidence Reference:** `src/components/modules/city-head/city-head-dashboard.tsx:L377-399`
* **Classification:** Modify

### [CANDIDATE-DEFECT-06] Exception Roster Capability String Overlap (MOB-ACC-01)
* **Severity:** P2 (Minor)
* **Role:** `super_admin`
* **Route:** `/admin/access` (Access Management)
* **Viewport:** 375px & 390px width
* **Preconditions:** Active named-user overrides list rendering.
* **Observed Behavior:** Named-user exception list rows use `flex items-center justify-between gap-2` without line wrapping. The monospace capability string (e.g. `access.role_defaults.manage`) has a rendering width of ~201px, while the badge + "Revoke" button consume ~110px. This exceeds the available row width of ~290px, causing the capability text to collide with and overlap the actions or push them off-screen.
* **Expected Behavior:** Add `truncate` or `break-all` styling to the monospace capability text, or stack it vertically on mobile viewports.
* **Evidence Reference:** `src/components/modules/admin/access-management-page.tsx:L263`
* **Classification:** Modify
