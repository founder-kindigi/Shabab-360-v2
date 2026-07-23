# UX-004: Mobile Browser UAT Evidence Matrix

- **Document Version:** 1.1.0
- **Task ID:** `UX-004`
- **Status:** `AUDITED` / Reconciled via Codebase Audit
- **Integration Base:** `99f9460`
- **Scope:** Mobile browser UAT execution matrix converting 11 candidates from `UX-002` into structured test definitions.
- **UAT Blocker Note:** Staging Chrome DevTools and browser connector plugin was unavailable. All findings were verified using rigorous codebase static audit, CSS layouts/responsiveness analysis, and unit test reconciliation.


---

## 1. Safety Guidelines & Explicit Prohibitions

> [!CAUTION]
> **STAGING & TEST DATA ISOLATION PROTECTION INVARIANTS**
> 1. **Zero Production Mutation:** Never edit any imported Lahore staging rows or database records.
> 2. **Non-Executable Scope:** This document is a planning and evidence tracking matrix; do not execute browser scripts or automate live API calls.
> 3. **UAT-005 Screenshot Naming Rules:** Screenshot filenames must strictly follow the format: `<Ref-ID>-<Role>-<Viewport>-<Index>.png` (e.g. `MOB-ATT-01-murabbi-375px-01.png`). All screenshots must be stored under `docs/uat-evidence/`.

---

## 2. Mobile Browser UAT Execution Matrix

| Ref ID | Category | Role | Target Page / Route | 375px & 390px Execution Steps | Expected Visual Evidence | Pass/Fail Criterion | Defect Severity (If Failed) | UAT-005 Screenshot Filename |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **MOB-ATT-01** | Attendance | `murabbi`, `park_admin` | Attendance Roster (`/park/attendance`) | 1. Open active attendance event roster.<br>2. Tapping adjacent status buttons (Present, Absent, Late, Excused). | Verify tap action executes cleanly without mis-tapping neighbouring status icons. | **Pass:** Status changes correctly on first tap.<br>**Fail:** Tapping status triggers wrong/adjacent status. | **P1 (Major)** | `MOB-ATT-01-<role>-<viewport>-01.png` |
| **MOB-ATT-02** | Attendance | `murabbi`, `park_admin` | Attendance Roster (`/park/attendance`) | 1. View un-closed attendance roster.<br>2. Inspect sticky bulk action toolbar at different list scroll positions. | Confirm all toolbar actions ("All Present", "All Absent", "Reset") render cleanly. | **Pass:** Actions render inline or wrap without clipping.<br>**Fail:** Buttons cut off or spill off-screen. | **P1 (Major)** | `MOB-ATT-02-<role>-<viewport>-01.png` |
| **MOB-ATT-03** | Attendance | `murabbi`, `park_admin` | Attendance Roster (`/park/attendance`) | 1. Focus search input to open software virtual keyboard.<br>2. Check roster scroll container dimensions. | View layout when virtual keyboard occupies lower portion of screen height. | **Pass:** Search input remains focused and list is scrollable.<br>**Fail:** Roster area collapses to 0 height or keyboard covers it. | **P1 (Major)** | `MOB-ATT-03-<role>-<viewport>-01.png` |
| **MOB-NAV-01** | Navigation | All mobile roles | Bottom Navigation Layout (Global) | 1. Navigate main menu items.<br>2. Open modal sheets and bottom sheets.<br>3. Inspect overlapping layout. | Ensure floating bottom nav pill sits above footers or page boundaries. | **Pass:** Nav pill does not block CTA buttons or inputs.<br>**Fail:** Nav pill overlaps modal submit or primary buttons. | **P1 (Major)** | `MOB-NAV-01-<role>-<viewport>-01.png` |
| **MOB-PEO-01** | People | `super_admin`, `city_head` | Student Directory (`/admin/students`) | 1. View student list directory.<br>2. Inspect page headers and action button group layout. | Action buttons ("Export", "Import", "Add Student") stack or wrap gracefully. | **Pass:** Header contents wrap neatly without text overlap.<br>**Fail:** Buttons overlap or spill past container borders. | **P1 (Major)** | `MOB-PEO-01-<role>-<viewport>-01.png` |
| **MOB-PEO-02** | People | `super_admin`, `city_head` | Student Directory (`/admin/students`) | 1. Load directory filter controls.<br>2. Scroll past search input and five select dropdowns. | Check vertical height occupied by filters vs. initial data viewport area. | **Pass:** Student records list is partially visible below filters.<br>**Fail:** Filters consume full height, hiding data entirely. | **P1 (Major)** | `MOB-PEO-02-<role>-<viewport>-01.png` |
| **MOB-PEO-03** | People | `super_admin`, `city_head` | Student Directory (`/admin/students`) | 1. Scroll to mobile student cards view.<br>2. Tap avatar initials bubble to trigger details pane. | Check absolute top-left selection checkbox size relative to avatar trigger. | **Pass:** Tapping avatar opens detail panel without row selection.<br>**Fail:** Tapping avatar toggles selection checkbox. | **P1 (Major)** | `MOB-PEO-03-<role>-<viewport>-01.png` |
| **MOB-DASH-01** | Dashboard | `city_head` | City Head Dashboard (`/city-head/dashboard`) | 1. Inspect grid layout of performance cards.<br>2. Observe card title sizes and grid alignment. | Check text titles like "Today's Attendance" inside the 2-column card layout. | **Pass:** Title wraps to 2 lines without truncating or clipping.<br>**Fail:** Card text clips or overlaps card border. | **P2 (Minor)** | `MOB-DASH-01-<role>-<viewport>-01.png` |
| **MOB-DASH-02** | Dashboard | `city_head` | City Head Dashboard (`/city-head/dashboard`) | 1. Populate mock Rs financial value above 7 digits.<br>2. Verify fees card container layout. | Format pattern check of financial amount strings (e.g. `Rs 1,250,000`). | **Pass:** Currency string sits within grid boundary.<br>**Fail:** Rs text overlaps card outline or spills out. | **P2 (Minor)** | `MOB-DASH-02-<role>-<viewport>-01.png` |
| **MOB-ACC-01** | Access Mgmt | `super_admin` | Access Management (`/admin/access`) | 1. Scroll through role exception capability cards.<br>2. Inspect flex container boundaries. | Render view of long capability names alongside badges and actions. | **Pass:** Item metadata wraps and actions remain clickable.<br>**Fail:** Capability text overlaps Revert buttons. | **P2 (Minor)** | `MOB-ACC-01-<role>-<viewport>-01.png` |
| **MOB-EMP-01** | Empty States | All roles | Empty State Layouts (Global) | 1. Trigger empty state dialog or view inside a container card.<br>2. Inspect icon size and button positions. | Review container padding and button positions in compact cards/modals. | **Pass:** Action button is fully visible above bottom fold.<br>**Fail:** Actions overflow container and require scrolling. | **P2 (Minor)** | `MOB-EMP-01-<role>-<viewport>-01.png` |

---
*End of Mobile Browser UAT Evidence Matrix.*
