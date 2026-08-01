# RTL-001: Module-Scoped Urdu RTL Audit & Component Migration Plan

**Base Commit:** `11aadee` on `codex/lahore-uat-candidate`
**Deliverable Document:** `docs/reviews/RTL-001-URDU-RTL-AUDIT.md`
**Status:** Audit Corrected (Owner Decision Revision) — Zero Code Edits Made
**Author:** AI Engineering / UX Operations
**Date:** 2026-07-30

---

## 1. Executive Summary & Corrected Audit Scope

### Owner Decision Correction
Per explicit product owner requirements, **Urdu / RTL localization is NOT application-wide**.
- **Global Application Default:** Remains strictly **English (LTR)** across all global navigation shells, top headers, main sidebars, user settings, and default module views.
- **Module-Scoped Control:** Localization is enabled **on a per-module basis**, governed exclusively by **Super Admin** server-side configuration.
- **Initial Module Rollout:** **Weekly Mashwara (`admin-mashwara`)** is designated as the first module enabled for Urdu / RTL localization. Additional modules (such as Content Planner, Events, Calling, and Attendance) will remain static English / LTR by default and may be enabled individually in future phases.
- **Strict Scope Boundary:** Global `<html dir="rtl">` is **explicitly prohibited**. RTL layout attributes (`dir="rtl"`, `lang="ur"`) and font/spacing rules must apply **only inside the container of an explicitly enabled module workspace** (e.g., the Mashwara page container). Shared layout elements (AppShell header, main sidebar, global breadcrumbs, notification bell, user dropdown) and all un-enabled modules remain unaffected in English / LTR.

---

## 2. Architecture & Server-Resolved Module Localization Context

### 2.1 Server-Resolved Module Configuration Context
To enforce module-scoped localization without mutating global document state:
1. **Database / Server Config Model:**
   Introduce a server-resolved module configuration context (e.g., `ModuleLocalizationSetting`) stored in the system database:
   ```typescript
   interface ModuleLocalizationConfig {
     moduleKey: "admin-mashwara" | "admin-content-planner" | "admin-events" | "admin-calling" | "admin-attendance-events";
     enabled: boolean;        // Super Admin toggle
     defaultLocale: "ur" | "en";
     rtlEnabled: boolean;
   }
   ```
2. **Super Admin Management Gate:**
   `system.localization.manage` is a **proposed RTL-002 capability**, not a capability available in the current baseline. Module localization changes must require a server-side `user.role === "super_admin"` check. If the proposed capability is added, require it in addition to the role check; role or named-user overrides alone must never grant this global setting.
   All other roles consume only the resolved setting for modules they may already view.
3. **Fail-Closed Fallback:**
   If module configuration cannot be resolved or is unconfigured, the system fails closed to English (`en`) / LTR (`dir="ltr"`).

### 2.2 Workspace-Scoped Direction Boundary (`ModuleLocalizationBoundary`)
Instead of setting `document.documentElement.dir`, module-scoped RTL is implemented via a React context provider and container wrapper:
```tsx
// Example architectural pattern for module-scoped workspace
export function ModuleLocalizationBoundary({
  moduleKey,
  children,
}: {
  moduleKey: string;
  children: React.ReactNode;
}) {
  const { data: config } = useModuleLocalization(moduleKey);
  const isRtl = config?.enabled && config?.defaultLocale === "ur";

  return (
    <ModuleLocalizationContext.Provider value={{ locale: config?.defaultLocale || "en", isRtl }}>
      <div
        data-module-workspace={moduleKey}
        dir={isRtl ? "rtl" : "ltr"}
        lang={config?.defaultLocale || "en"}
        className={cn(
          "w-full h-full",
          isRtl && "font-urdu leading-relaxed" // Scoped Urdu font and line-height
        )}
      >
        {children}
      </div>
    </ModuleLocalizationContext.Provider>
  );
}
```

### 2.3 Portal & Overlay Inheritance Strategy
Radix UI primitives (`Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tooltip`) render in portals appended to `document.body`. When launched from an RTL-enabled module workspace (such as a Share Grant modal inside Weekly Mashwara):
- The `ModuleLocalizationBoundary` must pass `dir="rtl"` down to Radix root primitives (`<DialogPrimitive.Root dir={isRtl ? "rtl" : "ltr"}>`) so that overlay contents, focus traps, and slide animations flip correctly inside the modal without altering global page direction.

---

## 3. Weekly Mashwara Module Audit (First Enabled Module)

Weekly Mashwara (`src/app/admin/mashwara/_client.tsx`, `src/app/admin/mashwara/[id]/_client.tsx`) is the primary target for Phase 1 RTL enablement.

### 3.1 Mashwara Page & Detail Layout Analysis
| Component / View | Current LTR Hardcoding | RTL Violation / Defect | Scoped Remediation |
| :--- | :--- | :--- | :--- |
| **Meeting Header Action Bar** | `Share2 className="size-4 mr-1.5"`, `Plus className="size-4 mr-1.5"` (L275, 280) | Hardcoded right margin pushes icon into text in RTL | Use logical margin `me-1.5` or `gap-2` flex container |
| **Action Items & Decisions List** | `span className="text-xs text-muted-foreground ml-2 capitalize"` (L409) | `ml-2` pushes text left; in RTL `ms-2` pushes inline-end | Update to `ms-2` |
| **Add Decision Button** | `Plus className="size-4 mr-1.5"` (L456) | Fixed right margin | Update to `me-1.5` |
| **Share Grant Modal Trigger** | `Share2 className="size-4 mr-1"` (L566) | Fixed right margin | Update to `me-1` |
| **Revoke Share Action** | `XCircle className="size-4 mr-1.5"` (L599) | Fixed right margin | Update to `me-1.5` |
| **View Details Link** | `Eye className="size-3.5 ml-1"` (L594) | `ml-1` places space on wrong side in RTL | Update to `ms-1` |
| **Schedule Mashwara Button** | `Loader2 className="size-4 mr-2"`, `Plus className="size-4 mr-1.5"` (`_client.tsx` L280, 432) | Hardcoded right margins on icons | Update to `me-2`, `me-1.5` |

### 3.2 Mashwara Modals & Drawers
- **Share Grant Modal & Add Decision Modal:**
  - When opened from `admin-mashwara`, modal portals must inherit `dir="rtl"`.
  - Dialog close button (`src/components/ui/dialog.tsx` L72: `right-4`) must use `end-4` so it sits at the top-left of the modal in RTL mode, leaving the right side clear for Urdu header text.
  - Dialog header text alignment (`sm:text-left`) must use `sm:text-start`.

---

## 4. UI Primitives Adaptability Audit (Shared Component Rules)

Shared UI components (`Dialog`, `Sheet`, `Table`, `Input`, `DataCard`) must support dual-mode execution: **rendering LTR by default in global/un-enabled views, and rendering RTL when rendered inside an enabled module workspace like Mashwara**.

### 4.1 UI Component Migration Standard
| Component | File Path | Current Physical Utility | Logical / Dual-Mode Utility |
| :--- | :--- | :--- | :--- |
| **Dialog Close Button** | `src/components/ui/dialog.tsx` (L72) | `absolute top-4 right-4` | `absolute top-4 end-4` |
| **Dialog Header** | `src/components/ui/dialog.tsx` (L87) | `sm:text-left` | `sm:text-start` |
| **Sheet Content** | `src/components/ui/sheet.tsx` (L63-65) | `right-0 border-l` / `left-0 border-r` | Use logical `side` prop or `end-0 border-e` / `start-0 border-s` |
| **Table Head** | `src/components/ui/table.tsx` (L73) | `text-left`, `pr-0` | `text-start`, `pe-0` |
| **Table Cell** | `src/components/ui/table.tsx` (L86) | `pr-0` | `pe-0` |
| **Form Input Padding** | `src/components/ui/input.tsx` | `pl-9`, `pr-3` | `ps-9`, `pe-3` |
| **Search Icon Placement** | `src/components/ui/input.tsx` | `left-3` | `start-3` |
| **Card Accent Border** | `src/components/layout/data-card.tsx` (L39,72) | `border-l-amber-300` | `border-s-amber-300` |
| **Card Decoration** | `src/components/layout/data-card.tsx` (L117) | `-top-4 -right-4` | `-top-4 -end-4` |

---

## 5. BiDi Text, Numbers & Urdu Typography inside Enabled Workspaces

### 5.1 BiDi (Bidirectional) Text Isolation
Inside Weekly Mashwara, meeting topics, Karguzari notes, and decision descriptions frequently mix Urdu text with English IDs or codes (e.g. `LHR-PK1-MASH-01 - ہفتہ وار مشورہ`).
- **Defect:** Standard text tags without BiDi boundaries cause the browser to flip parentheses, hyphens, and numeric codes to the wrong side of Urdu sentences.
- **Mandatory Requirement:** All dynamic user-entered strings inside module workspaces must be wrapped in HTML `<bdi>` (Bidirectional Isolation) tags or CSS `unicode-bidi: isolate; dir="auto"`.

### 5.2 Number Systems & Currency Rules
- **Operational Policy:** Meeting IDs, date timestamps, phone numbers, and attendance counts inside Mashwara **must remain in Western Arabic digits (`0-9`)** to preserve searchability and data integrity.
- **Urdu Date Formatting:** Formal display dates inside the Mashwara workspace should use a localized date helper `formatModuleDate(date, locale)` that formats dates as `ur-PK` (e.g., `30 جولائی 2026`) when `locale === "ur"`.

### 5.3 Font Stack & Line-Height Scaling
- Scope Urdu font loading specifically to module workspaces with `dir="rtl"`:
  ```css
  /* globals.css */
  [dir="rtl"] {
    font-family: var(--font-urdu), var(--font-geist-sans), system-ui, sans-serif;
    line-height: 1.6;
  }
  ```

---

## 6. Phased Module Implementation Plan (RTL-002 Roadmap)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Server Config & Module Scope Infrastructure                       │
│ - Database schema & server API for ModuleLocalizationConfig                 │
│ - Super Admin role gate plus proposed system.localization.manage capability │
│ - Create ModuleLocalizationBoundary & Radix dir context bridge              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Shared UI Primitives Logical Migration                             │
│ - Migrate Dialog, Sheet, Table, Input, Card utilities to logical (start/end)│
│ - Verify LTR backward compatibility on un-enabled modules                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Weekly Mashwara RTL Enablement (Pilot Module)                      │
│ - Wrap Mashwara page in ModuleLocalizationBoundary                         │
│ - Update Mashwara client components (_client.tsx, [id]/_client.tsx)         │
│ - Add BiDi <bdi> isolation & ur-PK date formatting                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: On-Demand Module Expansion (Future Phases)                         │
│ - Super Admin opt-in enablement for Content Planner, Events, Calling        │
│ - Module-by-module browser UAT verification at 375px/390px/1280px           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Capability & Governance Matrix

| Action / Setting | Minimum Role | Required Capability | Boundary Scope |
| :--- | :--- | :--- | :--- |
| View Module Localization Status | All Authenticated Staff | `mashwara.view` (or module view) | Resolved for assigned city/park |
| Toggle Module RTL/Urdu Setting | `super_admin` | Proposed `system.localization.manage`, required in addition to server role check | Global Super Admin only |
| View resolved Mashwara localization | Authorized Mashwara viewer | Existing `mashwara.view` | Same scope as Mashwara access; never exposes global settings |
| Create/Edit Mashwara in Urdu | Scoped staff with existing meeting authority | Existing `mashwara.manage` | Enforced assigned city/park scope |

---

## 8. Verification & Testing Protocol

### 8.1 Automated Tests (RTL-002 Gate)
1. **Server API & Gate Tests:**
   Verify that non-Super-Admin roles receive `403 Forbidden` when attempting to mutate module localization settings.
2. **Isolation Tests:**
   Verify that enabling RTL for `admin-mashwara` applies `dir="rtl"` **only** to `div[data-module-workspace="admin-mashwara"]`, while `html`, AppShell header, sidebar, and `admin-dashboard` remain `dir="ltr"`.
3. **Primitive Dual-Mode Tests:**
   Verify `Dialog` and `Table` render LTR in un-enabled modules and RTL in Mashwara.

### 8.2 Browser Visual UAT Matrix (Mashwara Module)
| Viewport | Check Item | Expected Result | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **Desktop (1280px)** | AppShell Header & Sidebar | Left-aligned LTR header; sidebar on left edge | Static LTR preserved |
| **Desktop (1280px)** | Mashwara Workspace | Agenda, action items, and buttons flow Right-to-Left | Workspace RTL verified |
| **Desktop (1280px)** | Share Grant Modal | Modal opens with close 'X' on top-left (`end-4`) | Modal RTL verified |
| **Mobile (375px)** | Mashwara Meeting Detail | Touch targets >= 44px; zero horizontal main page scroll | Mobile layout verified |
| **Mobile (375px)** | Mixed Urdu/English IDs | Code `LHR-PK1-MASH-01` renders cleanly without punctuation flip | BiDi `<bdi>` verified |

---

## 9. File Remediation Scope Matrix

| Target File Path | Category | Scoped Remediation Plan |
| :--- | :--- | :--- |
| `src/app/admin/mashwara/page.tsx` | Mashwara Entry | Wrap in `ModuleLocalizationBoundary` |
| `src/app/admin/mashwara/_client.tsx` | Mashwara List | Convert icons & text margins to logical (`me-`, `ms-`) |
| `src/app/admin/mashwara/[id]/_client.tsx` | Mashwara Detail | Convert action item margins, share modal triggers to logical |
| `src/components/ui/dialog.tsx` | Shared Primitive | Convert `right-4` to `end-4`, `sm:text-left` to `sm:text-start` |
| `src/components/ui/sheet.tsx` | Shared Primitive | Add dual-mode `side` support (`start`/`end`), close `end-4` |
| `src/components/ui/table.tsx` | Shared Primitive | Convert `text-left` to `text-start`, `pr-0` to `pe-0` |
| `src/components/ui/input.tsx` | Shared Primitive | Convert `left-3` to `start-3`, `pl-9` to `ps-9` |
| `src/components/layout/data-card.tsx` | Shared Primitive | Convert `border-l-` to `border-s-`, `-right-` to `-end-` |

---
*End of Corrected Audit Document `docs/reviews/RTL-001-URDU-RTL-AUDIT.md`*
