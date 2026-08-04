# Shabab 360 - Mobile-First Responsive Design Review Suite

## Overview
This document outlines the complete 15-screen mobile-first responsive redesign for Shabab 360 v2, built strictly on the isolated branch [`design/shabab-brand-mobile-screens`](https://github.com/founder-kindigi/Shabab-360-v2/pull/new/design/shabab-brand-mobile-screens).

All components adhere to `MOBILE_DESIGN_SYSTEM.md` and feature:
- Primary Brand Color: `#4B0A8F` (Deep Violet) & `#1F0860` (Dark Accent)
- Minimum Touch Target: `44px+` (`h-11`, `h-12`, `size-11`)
- Fluid Responsiveness: Mobile-first layout with smooth desktop/tablet card adaptation
- Live Interactive Device Frame Preview Route: `http://localhost:3000/mobile-preview`

---

## 📱 Complete 15 Screen Review Inventory

| # | Screen Name | Component File Path | Core Role & Highlights |
|---|---|---|---|
| 1 | **Splash Screen** | [`mobile-splash-page.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/auth/mobile-splash-page.tsx) | Shabab 360 emblem, Urdu tagline, role prefill launchers |
| 2 | **Login Screen** | [`mobile-login-page.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/auth/mobile-login-page.tsx) | 44px+ touch inputs, password toggle, 5 demo role pills |
| 3 | **Attendance Roster** | [`mobile-attendance-page.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/park/mobile-attendance-page.tsx) | Sticky header, progress bar, `P`/`A`/`L`/`E` quick mark buttons |
| 4 | **Murabbi Dashboard** | [`mobile-murabbi-dashboard.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/murabbi/mobile-murabbi-dashboard.tsx) | Group attendance rate, dropout warning watchlist & call CTAs |
| 5 | **Park Lead Dashboard** | [`mobile-park-dashboard.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/park/mobile-park-dashboard.tsx) | Park capacity KPI, group progress cards & roster action FAB |
| 6 | **City Head Dashboard** | [`mobile-city-head-dashboard.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/city-head/mobile-city-head-dashboard.tsx) | Executive city director metrics, park ranking ranking list |
| 7 | **Admin HQ Dashboard** | [`mobile-admin-dashboard.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/admin/mobile-admin-dashboard.tsx) | System control panel, access matrix shortcuts & audit trail |
| 8 | **Student Dashboard** | [`mobile-student-dashboard.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/student/mobile-student-dashboard.tsx) | Student attendance %, gold rank badge & schedule card |
| 9 | **Guardian Portal** | [`mobile-guardian-dashboard.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/guardian/mobile-guardian-dashboard.tsx) | Parent portal, linked children cards & last session status |
| 10 | **Calling Desk** | [`mobile-calling-page.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/admin/mobile-calling-page.tsx) | Retention calling desk, redacted leads & call/WhatsApp actions |
| 11 | **Weekly Mashwara** | [`mobile-mashwara-page.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/admin/mobile-mashwara-page.tsx) | هفتہ وار مشورہ (Mashwara) meeting agenda & action task tracking |
| 12 | **Special Events** | [`mobile-events-page.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/admin/mobile-events-page.tsx) | Youth leadership camps & inter-park sports tournament portal |
| 13 | **Content Planner** | [`mobile-content-planner-page.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/content-planner/mobile-content-planner-page.tsx) | Sports, Skills & Tadreeb weekly curriculum module viewer |
| 14 | **Admissions** | [`mobile-admissions-page.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/admin/mobile-admissions-page.tsx) | Student onboarding applications & approval workflow |
| 15 | **Fees Desk** | [`mobile-fees-page.tsx`](file:///D:/iBuild/Shabab-360-v2/src/components/modules/admin/mobile-fees-page.tsx) | Monthly membership fee collections & financial records |

---

## 🔍 How to Review Locally
1. Start local dev server: `npm run dev`
2. Navigate browser to: **`http://localhost:3000/mobile-preview`**
3. Use the top switcher bar to toggle through all 15 screens inside the simulated mobile viewport.
