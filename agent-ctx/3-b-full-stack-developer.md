# Task 3-b: Murabbi Dashboard

## Summary
Built a focused, action-oriented Murabbi Dashboard for Shabab360. The murabbi role now gets their own dedicated dashboard instead of the generic park dashboard.

## Files Created
1. **`src/app/api/murabbi/dashboard/route.ts`** — GET API endpoint
   - Requires `murabbi` role, gets assigned group from session
   - Returns: group/batch/park/city names, total participants, today's event with P/A/L/E counts, today's rate, 7-day daily trend, this week vs last week rates, top absentees (3+ absences in 7 days)
   - Fires audit log on access

2. **`src/components/modules/murabbi/murabbi-dashboard.tsx`** — Frontend component
   - 6 sections: greeting banner, quick action, 4 metric cards, today's session progress, weekly trend bar chart, needs attention list
   - Gradient greeting with "Assalamu Alaikum"
   - Prominent "Mark Attendance" button with pulse animation when unmarked
   - CSS bar chart for 7-day trend with Framer Motion animations
   - Absentee list with amber/red severity borders (3 vs 4+ absences)
   - Mobile-first, touch-friendly (min 44px targets), dark mode

## Files Modified
3. **`src/stores/useAppStore.ts`** — Added `"murabbi-dashboard"` to PageId type
4. **`src/components/layout/sidebar.tsx`** — Changed murabbi's first nav from `"park-dashboard"` to `"murabbi-dashboard"`
5. **`src/components/layout/app-shell.tsx`** — Import, pageTitles, PageContent case, showPageHeader exclusion

## Verification
- `bun run lint` — zero errors, zero warnings
- Dev server compiles successfully