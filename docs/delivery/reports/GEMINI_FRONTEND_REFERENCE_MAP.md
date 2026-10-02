# Gemini Frontend Reference Map (Corrected - Second Submission)

## Inspection Context
- **Branch**: v2
- **Commit**: 401ff322726c3ceab9b05db776b2b076e63bbaf5
- **Mapped Source File Hashes**:
  - pwa-app.tsx: 752ba2563c20960de99f7a698cdaa502e365cc86
  - dmin/mobile-home-dashboard.tsx: 27016168cef285e48a72a879d4736a7f460d0861
  - park/mobile-parks-page.tsx: d60f62c5ce34bb26ede44b58938019008b9353c3
  - park/mobile-park-detail-page.tsx: 67424dbfd32f19975d4893354181d2cc452d6f3a
  - park/tabs/dashboard-tab.tsx: 538635fd23c1560dddf0bcec05358c65d77d7c75
  - park/tabs/attendance-tab.tsx: 1c9ee0b383a08395e348fd2859cd14568e10a49a
  - park/mobile-attendance-page.tsx: 201017556041644923eb656733bc35718fde4205
  - park/mobile-inventory-page.tsx: 3d12f4be74eea017ed00cca308e7e83ad9e76799
  - park/tabs/structure-tab.tsx: 2724f2cbcadfe295d31c9cc97371e26bf3bf9f6e
  - park/tabs/lessons-tab.tsx: 472e9063f19c919f137e6cfc35f8dc9c03584948
  - park/tabs/planner-tab.tsx: a8ff92e8d448a0b110e1b60447ad81e0ef308ab7
  - park/mobile-evaluation-page.tsx: 471be8b15e931d326728dca1bfdad07723c10d2c
  - dmin/mobile-more-page.tsx: c31bb089c57e7fb0386a6dc97393777e88c6e884
  - dmin/mobile-analysis-page.tsx: ad0056807fb792f07ac5bd2330bbd07b8b59402b
- **Dirty Files Noted**: Yes, several application files remain dirty in the tree; unrelated dirty work is preserved.
- **Active Task Conflict**: No conflicts. Current state reports next task BASE-01 is ready but not started.
- **Coverage Totals**: 34 images inspected in total (25 primary product views/interaction states, 1 source-data reference, 8 variants/duplicates).
- **Evidence Limits**: Comparison was a source-only read without execution. No browser preview was launched. Source inspection does not establish visual parity with the designs. Visual mappings are based on explicit component checks, preserving current UI (no component global rebuilds initiated). Score ranges (e.g., 0-10 vs 1-10) are contract questions and backend validation is not inferred from images.

## Image Reference Mapping

| Filename | Classification (Variant Parent) | Component | App Screen ID | Role Evidence | Existing Method/Endpoint | Proposed Data Need | Gap Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Screenshot 2026-09-04 211139.png | Product Screen | admin/mobile-home-dashboard.tsx | home | dashboard.view (or fallback) | /api/admin/home-analytics (L20) | totalParks, totalStudents, attendance lists | Visually unverified; structurally existing |
| Screenshot 2026-09-04 211423.png | Source-Data | N/A | N/A | N/A | N/A | Roster import format | N/A |
| Screenshot 2026-09-04 211600.png | Product Screen | park/mobile-parks-page.tsx | parks | organisation.view | /api/admin/home-analytics (L45), /api/park (L63) | parks list with stats | Visually unverified; structurally existing |
| Screenshot 2026-09-04 211624.png | Interaction State (211600) | park/mobile-parks-page.tsx | parks | organisation.view | local/no request | N/A | Existing |
| Screenshot 2026-09-04 211640.png | Variant (211600) Mobile on Desktop | park/mobile-parks-page.tsx | parks | organisation.view | local/no request | N/A | Existing (Deferred Desktop UI) |
| Screenshot 2026-09-04 211712.png | Interaction State (211600) | park/mobile-parks-page.tsx | parks | organisation.view | local/no request | New park form fields | Existing |
| Screenshot 2026-09-04 211724.png | Product Screen | park/tabs/dashboard-tab.tsx | park-detail | organisation.view | /api/park/evaluations (L19) | Park metrics, evaluation status | Existing (Visually unverified) |
| Screenshot 2026-09-04 211804.png | Product Screen | park/mobile-attendance-page.tsx | park-detail | organisation.view | /api/park/attendance/prepare (L164), /api/park/staff-attendance (L258) | Attendance by date | Existing |
| Screenshot 2026-09-04 211823.png | Product Screen | park/mobile-inventory-page.tsx | inventory | organisation.view | /api/inventory/central (L44) | Inventory items | Existing |
| Screenshot 2026-09-04 211851.png | Product Screen | park/mobile-inventory-page.tsx | inventory | organisation.view | local/no request | Inventory tracking | Existing |
| Screenshot 2026-09-04 211921.png | Product Screen | park/mobile-inventory-page.tsx | inventory | organisation.view | local/no request | Local inventory | Existing |
| Screenshot 2026-09-04 211928.png | Interaction State (211921) | park/mobile-inventory-page.tsx | inventory | organisation.view | local/no request | Add item fields | Existing |
| Screenshot 2026-09-04 212033.png | Variant (211804) Scrolled | park/mobile-attendance-page.tsx | park-detail | organisation.view | local/no request | More staff attendance | Existing |
| Screenshot 2026-09-04 212138.png | Variant (211804) Date changed | park/mobile-attendance-page.tsx | park-detail | organisation.view | /api/park/attendance/* | Historical attendance | Existing |
| Screenshot 2026-09-04 212205.png | Product Screen | park/tabs/structure-tab.tsx | park-detail | organisation.view | /api/park/structure (L60, L78) | Staff hierarchy, students | Existing |
| Screenshot 2026-09-04 212219.png | Interaction State (212205) | park/tabs/structure-tab.tsx | park-detail | organisation.view | local/no request | Edit murabbi form | Existing |
| Screenshot 2026-09-04 212239.png | Interaction State (212205) | park/tabs/structure-tab.tsx | park-detail | organisation.view | local/no request | Edit muawin form | Existing |
| Screenshot 2026-09-04 212250.png | Variant (212205) Scrolled | park/tabs/structure-tab.tsx | park-detail | organisation.view | local/no request | Students/Add buttons | Existing |
| Screenshot 2026-09-04 212314.png | Interaction State (212205) | park/tabs/structure-tab.tsx | park-detail | organisation.view | /api/park/structure | Add murabbi fields | Existing |
| Screenshot 2026-09-04 212343.png | Interaction State (212205) | park/tabs/structure-tab.tsx | park-detail | organisation.view | /api/park/structure | Add student fields | Existing |
| Screenshot 2026-09-04 212350.png | Interaction State (212205) | park/tabs/structure-tab.tsx | park-detail | organisation.view | local/no request | Import roster trigger | Existing |
| Screenshot 2026-09-04 212418.png | Product Screen | park/tabs/lessons-tab.tsx | park-detail | organisation.view | /api/park/lessons (L24) | Empty lessons list | Existing |
| Screenshot 2026-09-04 212435.png | Interaction State (212418) | park/tabs/lessons-tab.tsx | park-detail | organisation.view | /api/park/lessons (L37) | Add lesson fields | Existing |
| Screenshot 2026-09-04 212621.png | Variant (212418) Hover state | park/tabs/lessons-tab.tsx | park-detail | organisation.view | local/no request | Empty lessons list | Existing |
| Screenshot 2026-09-04 212643.png | Interaction State (212418) | park/tabs/lessons-tab.tsx | park-detail | organisation.view | local/no request | Typing lesson form | Existing |
| Screenshot 2026-09-04 212752.png | Product Screen | park/tabs/planner-tab.tsx | park-detail | organisation.view | /api/park/planner (L48) | Empty planner | Existing |
| Screenshot 2026-09-04 212800.png | Interaction State (212752) | park/tabs/planner-tab.tsx | park-detail | organisation.view | /api/park/planner (L65) | Add routine slot form | Existing |
| Screenshot 2026-09-04 212811.png | Variant (211724) Scrolled | park/tabs/dashboard-tab.tsx | park-detail | organisation.view | local/no request | Upcoming/Evaluations | Existing |
| Screenshot 2026-09-04 212838.png | Product Screen | park/mobile-evaluation-page.tsx | evaluation | students.manage | /api/park/evaluations (L65) | Evaluables list | Existing |
| Screenshot 2026-09-04 212900.png | Product Screen | park/mobile-evaluation-page.tsx | evaluation | students.manage | local/no request | Evaluation sliders | Existing |
| Screenshot 2026-09-04 212912.png | Variant (212900) Scrolled | park/mobile-evaluation-page.tsx | evaluation | students.manage | /api/park/evaluations (L76) | More sliders/comment | Existing |
| Screenshot 2026-09-04 212942.png | Product Screen | admin/mobile-more-page.tsx | more | (Any role) | local/no request | Menu items | Existing |
| Screenshot 2026-09-04 212949.png | Product Screen | admin/mobile-analysis-page.tsx | analysis | reports.view | /api/admin/home-analytics (L74) | Month analysis | Existing |
| Screenshot 2026-09-04 212955.png | Variant (212949) Custom date| admin/mobile-analysis-page.tsx | analysis | reports.view | /api/admin/home-analytics | Custom date analysis | Existing |

## State Table (Source Inspection)

| Screen ID | Component | Loading | Empty | Error | Denied | Offline | Success |
| --- | --- | --- | --- | --- | --- | --- | --- |
| home | mobile-home-dashboard.tsx | Source-present | Source-present | Source-present | Unverified | Unverified | Source-present |
| parks | mobile-parks-page.tsx | Source-present | Source-present | Source-present | Unverified | Unverified | Source-present |
| park-detail | mobile-park-detail-page.tsx | Source-present | Source-present | Source-present | Unverified | Source-present | Source-present |
| inventory | mobile-inventory-page.tsx | Unverified | Source-present | Source-present | Unverified | Unverified | Source-present |
| evaluation | mobile-evaluation-page.tsx | Source-present | Source-present | Source-present | Unverified | Unverified | Source-present |
| more | mobile-more-page.tsx | Source-present | Unverified | Source-present | Unverified | Unverified | Source-present |
| analysis | mobile-analysis-page.tsx | Source-present | Source-present | Source-present | Unverified | Unverified | Source-present |

*(Note: State combinations denote existence in source via flags like isLoading, isError, or length === 0. Functional runtime verification is explicitly unverified during this documentation phase).*

## Observed Design Rules
- **Brand Gradient**: Purple (#4B0A8F) to Red (#D90429) is heavily used. Source check shows it is already present in mobile-home-dashboard.tsx.
- **Desktop/Tablet**: Explicitly deferred to Settings-controlled later work. All layout builds preserve the mobile viewport flow.
- **Evaluation Range**: Visible reference indicates a scored range. Backend validation (e.g., 0-10 vs 1-10) is a contract question and is not inferred purely from screenshots.
- **Components**: Pill tabs, bottom sheets, and empty states already exist and are structurally in place across park-detail tabs, ui/sheet.tsx, etc. No rebuild task is needed.
