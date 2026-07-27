# Shabab 360 - Product Requirements Document

**Status:** Draft - Consolidating both the verified current system baseline and the target features to be built in upcoming phases.
**Purpose:** Provides a holistic view of the Shabab 360 platform, outlining the strong foundations currently in place alongside the new modules planned for development.

---

## Part 1: Currently Built System (Verified Baseline)

The current platform is a robust Single Page Application (SPA) built with Next.js 16.1, React 19, TypeScript, Tailwind CSS 4, and Prisma (SQLite/PostgreSQL schema setup), secured by NextAuth. It already supports eight role-based workspaces.

### 1. Core Architecture & Security
- **Role-Aware Workspaces:** Dedicated dashboards and navigation for Super Admin, Program Admin, City Head, Park Admin, Park Lead, Murabbi, Guardian, and Student.
- **Security Hardening:** Strictly enforced server-side resource-scope checks (City, Park, Group boundaries), atomic token invalidation, forced first-login password resets for admin-provisioned accounts, and cryptographic temporary passwords.
- **Audit & Protection:** Redacted audit helper, PII-safe visibility, bounded navigation history, and security headers (CSP, private indexing policy).

### 2. Organizational Model & Administration
- **Hierarchy Management:** Complete APIs and UI screens for managing Cities, Parks, Batches, Groups, People, Students, and Guardians.
- **Access Provisioning:** Admin screens for managing user access and roles.
- **Operational Settings:** Management of settings and report presets.

### 3. Park & Murabbi Operations
- **Park Dashboard:** Overview of park operations, attendance metrics, roster management, and scheduling.
- **Murabbi Workspace:** Dedicated view for mentors to manage their assigned groups and schedules.
- **Offline-Capable Attendance:** A mobile-first attendance queue that allows authorized offline marking and automatically syncs when online.

### 4. Family & Student Portals
- **Guardian Portal:** Read-only access to view linked children, attendance history, schedule, fees, and announcements.
- **Student Portal:** Read-only access to view personal attendance history, schedule, fees, profile, and announcements.

### 5. Utilities
- **Announcements Engine:** Broadcast announcements to specific roles and scopes.
- **Notifications Foundation:** Authenticated notification polling (every 60 seconds and on browser focus) and database outbox.
- **Basic Fee Engine:** Transactional exact-money payment checks, overpayment protection, and unique receipt generation.
- **Reporting:** Scoped search, date validation on list APIs, and database-neutral reports.

---

## Part 2: Target Features to Build

The following modules represent the next phase of development, transforming the application into a complete end-to-end program delivery platform.

### 1. Content Planner & Curriculum Delivery
**Objective:** Replace external spreadsheets with an integrated, structured planner for batch content and Murabbi training.
- **Four-Category Content Model:** Support the approved categories (Sports, Skills, Tadreeb, plus one to be defined) across batches and weeks.
- **Hierarchical Planning:** Plans are scoped by Batch, Week, Session, and Age/Class Band.
- **State Life School Overrides:** Support specific park-level content overrides without modifying the base Lahore template.
- **Content Lifecycle:** Implement `draft`, `review`, `approved`, `published`, and `archived` states for curriculum blocks.
- **Murabbi Workspace Integration:** Deliver session objectives, materials, delivery guidance, and reflection prompts directly to Murabbis for their scheduled sessions.
- **Dry-Run Import CLI:** A safe importer that parses Excel workbooks, provides a masked reconciliation report, and guarantees zero database writes during preview (PKG-01).

### 2. Events & Responsibility Assignment (Mashwara)
**Objective:** Differentiate standard classes from one-off operational events, recurring staff meetings, and temporary event teams.
- **Mashwara (Staff Meetings):** 
  - Scoped by city, park, or collaboration team.
  - Record immutable Karguzari / Minutes of Meeting (MoM).
  - Track action items with assignees, due dates, and completion evidence.
  - Controlled read access and ability to share specific meetings.
- **Operational Events:** Support campaigns, inaugurations, and ceremonies with configurable venue, capacity, costs, and safety checklists.
- **Temporary Responsibilities:** Introduce time-bounded assignments (e.g., Calling POC, Security, Parking, Welcome). These are independent of login roles and automatically expire.
- **Venue Management:** Track primary/backup locations, capacity, operating hours, emergency assembly guidance, and safety facilities.

### 3. Advanced Admissions & "Calling" Pipeline
**Objective:** Build a robust, end-to-end recruitment, interview, and enrollment tracking system.
- **Calling Import Foundation:** Safely parse, normalize (Pakistani phone formats), and deduplicate applicant lead sheets.
- **Calling Assignments:** Allow a designated "Calling POC" to assign specific leads to approved Shabab callers within a city queue. 
- **Application Workflow:** Support the exact lifecycle: `New` -> `Interview Scheduled` -> `Interviewed` -> `Approved` -> `Enrolled` (with `Hold` and `Rejected` terminal states).
- **Interview Rubrics:** Record structured scores across multiple dimensions, reviewer remarks, and final decisions.
- **Atomic Conversion:** A one-click operation to securely transform an approved application into canonical Participant, Guardian, and Group Assignment records without data loss.

### 4. Multi-Context Attendance & Offline Resiliency
**Objective:** Expand attendance beyond basic participant groups to cover staff and offline edge cases.
- **Cross-Context Marking:** Introduce distinct attendance workflows for Group Classes, Team Meetings, Mashwara, and Special Activities.
- **Advanced Offline Queueing:** 
  - Cache roster data for authorized offline marking.
  - Maintain a local mutation queue that syncs automatically when online.
  - Present clear UI indicators for queue depth, failed syncs, and conflicting records that require manual resolution.

### 5. Procurement & Inventory
**Objective:** Manage the physical assets and consumables required for program delivery.
- **Item Catalog:** Maintain units, categories, conditions, and stock totals.
- **Location Tracking:** Assign and audit stock quantities per park.
- **Lifecycle Management:** Support purchase orders, receiving, allocations, transfers, returns, and loss/damage adjustments.

### 6. Finance & Payments
**Objective:** Transition from a simple fee engine to a compliant program finance module.
- **Fee Types:** Distinguish between optional event/trip fees, potential registration charges, and donations.
- **Reconciliation:** Process exact PKR arithmetic, track discounts, waivers, and adjustments with strict approval history.

### 7. Safe Community, Messaging, and Resources
**Objective:** Foster participant engagement under strict, approved safeguarding rules.
- **Internal Messaging:** Build a strictly bounded mini-messenger supporting 1:1 or group chats exclusively between approved role combinations. No unmonitored adult-to-minor channels.
- **Notification Engine:** Support in-app polling notifications alongside email and WhatsApp templates with delivery state tracking.
- **Online Resources Library:** Create segmented repositories for public vs. logged-in resources (courses, books, articles) with proper copyright and private storage rules.
- **Community (Let's Vibe It):** (Deferred until safeguarding rules are approved) Implement posts, media sharing, reactions, and moderation workflows.
