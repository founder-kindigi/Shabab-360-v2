# Shabab360 v2 - Technical Documentation

## 1. Architecture Overview
Shabab360 is a Single Page Application (SPA) built using Next.js App Router. The core constraint of the system is that all UI is served from a single route (`/`), with client-side navigation managed entirely by Zustand state, ensuring a seamless app-like experience without full page reloads.

## 2. Technology Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 & shadcn/ui (New York style)
- **Database:** Prisma ORM with SQLite
- **Authentication:** NextAuth.js v4 (Credentials provider, JWT sessions)
- **Client State:** Zustand
- **Server State:** TanStack Query
- **UI Libraries:** Lucide React (Icons), Framer Motion (Animations)
- **Utilities:** exceljs (Exports), Dexie/IndexedDB (Offline queue)

## 3. Directory Structure
```
src/
├── app/
│   ├── page.tsx            # Single entry point for all UI
│   ├── layout.tsx          # Root layout and context providers
│   └── api/                # Backend APIs (Admin, Park, Guardian)
├── components/
│   ├── layout/             # Shell, Sidebar, Headers
│   ├── forms/              # Inputs, Filters, Validation
│   ├── data/               # Tables, Badges, Lists
│   ├── business/           # Domain-specific UI (RoleBadge, ScopeSelector)
│   └── modules/            # UI components separated by workspace
├── stores/                 # Zustand stores (useAppStore, useAuthStore, useOfflineStore)
├── lib/                    # Core utilities (Auth, DB singleton, Timezone, Receipts)
└── types/                  # Shared TypeScript interfaces
```

## 4. State Management & Navigation
Navigation does not utilize standard Next.js routing. Instead, `src/app/page.tsx` renders an `AppRouter` that observes `useAppStore`'s `currentPage` state to switch between active module views.
Key Zustand stores:
- `useAppStore`: Handles active page, sidebar state, and selected scope (City, Park, Batch, Group).
- `useAuthStore`: Exposes the current user's session and roles safely.
- `useOfflineStore`: Manages the local Dexie queue for offline attendance marking.

## 5. Security & Authentication
- **Authentication:** Managed by NextAuth.js using JWTs.
- **Authorization:** Handled exclusively server-side within the `/api` routes using custom middleware (`requireRole`, `requireCityScope`). The client UI adjusts based on role but does not enforce security.

## 6. Database Schema Summary
The database is structured to support the core organizational hierarchy:
National HQ → City → Park → Batch → Group → Participant
- **Auth:** `users`, `staff_meta`, `audit_log`
- **City Operations:** `cities`, `parks`, `batches`, `groups`, `guardians`, `participants`
- **Attendance:** `attendance_events`, `attendance_records`
- **Finance:** `fee_events`, `payments`, `receipt_sequences`
- **Admissions:** `admission_applications`, `admission_interviews`
- **Communication:** `announcements`

## 7. Parallel Build & Modularity
The codebase is structured into distinct modules designed to be built in parallel once the Auth & Foundation (Module 1) and City Operations (Module 2) are completed.
