# Task T2 — Brand Color System Applied to Shared Layout Components

## Summary
Replaced all emerald green theme colors with the Shabab360 violet/magenta/red brand system across 9 shared layout and shared component files.

## Files Modified (4 files with actual changes)
1. **`src/components/layout/sidebar.tsx`** — 11 color replacements
2. **`src/components/layout/data-card.tsx`** — 3 variant style objects updated
3. **`src/components/layout/empty-state.tsx`** — 4 color replacements (phase badges + progress)
4. **`src/components/layout/loading-state.tsx`** — 1 replacement (spinner color)

## Files Verified Clean (no changes needed)
5. **`src/components/layout/page-header.tsx`** — No emerald references
6. **`src/components/layout/error-state.tsx`** — Uses `text-destructive` (red)
7. **`src/components/layout/confirm-dialog.tsx`** — No emerald references
8. **`src/components/layout/notification-bell.tsx`** — Already had brand colors
9. **`src/components/shared/keyboard-shortcuts-dialog.tsx`** — Already had brand colors

## Color Mapping Applied
| Old (Emerald) | New (Brand) |
|---|---|
| `bg-emerald-600` (logo) | `bg-[var(--brand-gradient)]` |
| `bg-emerald-50 text-emerald-700` (active) | `bg-[var(--brand-surface)] text-[var(--brand-violet)]` |
| `text-emerald-600` (icons) | `text-[var(--brand-violet)]` |
| `bg-emerald-600` (indicator bar) | `bg-[var(--brand-magenta)]` |
| `focus-visible:ring-emerald-500` | `focus-visible:ring-[var(--brand-magenta)]` |
| `bg-emerald-500` (progress) | `bg-[var(--brand-magenta)]` |
| `bg-sky-*` (sky variant) | `bg-[var(--brand-surface-rose)]` / `text-[var(--brand-magenta)]` |

## Notes
- `data-card.tsx` retains `"emerald"` as the variant type name/prop key (structural identifier, not CSS)
- `amber`, `rose`, `slate` DataCard variants kept unchanged
- Phase 3 (amber) in empty-state kept unchanged
- Red colors (sign-out hover, errors, delete actions, notification badges) kept unchanged
- Dark mode uses `dark:bg-[var(--brand-900)]`, `dark:text-[var(--brand-400)]` pattern
- Lint: 0 errors