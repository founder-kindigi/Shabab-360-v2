# Shabab360 Implementation Plan

This document is the working baseline for the current project. It follows a stricter pre-implementation format so future work is judged against real requirements, not convenience.

## 1. Plain-English Requirements

Shabab360 is an internal program operations system for running Shabab activities across cities, parks, batches, groups, and attendance workflows in Pakistan.

The system must let HQ oversee the full network, let city heads run city-level operations, let park teams mark attendance reliably on mobile devices, and let guardians and students see only their own linked information.

The app must work well on phones, especially for attendance marking. Offline-first attendance is a core requirement, not a nice-to-have.

The system must also support controlled account creation from the admin side. Internal roles do not self-register.

## 2. Roles / Users

Current role model:

- `super_admin`
- `program_admin`
- `city_head`
- `park_admin`
- `park_lead`
- `murabbi`
- `guardian`
- `student`

Operational interpretation:

- `super_admin` / `program_admin`: HQ oversight, city governance, national reporting
- `city_head`: city operations, people assignments, attendance setup, fee and batch controls
- `park_admin` / `park_lead` / `murabbi`: park attendance and session workflow
- `guardian`: child-linked read-only portal
- `student`: own-data read-only portal

## 3. Core Workflows

### HQ / Program Head

- log in and land on national dashboard
- view network exceptions across cities
- create cities
- edit city metadata
- assign or reassign city heads
- run national or city-focused reports
- send announcements, including city-head-targeted announcements
- manage access accounts

### City Head

- log in and land on city operations dashboard
- configure parks, batches, groups, attendance events, rules, fees
- create and manage Shabab and Murabbis
- create and link guardians
- manage student and guardian access setup
- review city exceptions such as missing batches, missing groups, or missing attendance events

### Park Team

- log in and land on park dashboard
- see today’s attendance readiness
- see queue health for offline attendance
- open the most urgent event
- mark attendance on mobile
- continue working offline and sync later

### Guardian

- log in and see only linked children
- view attendance
- view fee status
- read announcements

### Student

- log in and see only own data
- view attendance
- view fee status
- read announcements

## 4. Constraints

### Product Constraints

- offline-first attendance is mandatory
- internal users are admin-created
- access must stay scoped by role and city/park boundaries
- guardian and student access must remain read-only for personal data

### Delivery Constraints

- use proven managed services by default
- avoid self-hosting unless there is a hard blocker
- minimize operational overhead
- prefer maintainability over short-term convenience

### Device Constraints

- mobile-first for park operations
- desktop and mobile support for admin workflows
- browser-based deployment, not native mobile

### Scale Assumptions

- current rollout spans multiple cities and parks
- growth to broader nationwide usage should not require replatforming
- v1 does not need social/community complexity

## 5. Success Criteria

The project is successful when:

- HQ can govern cities and city-head assignments from one workspace
- city heads can run operational setup without developer intervention
- park roles can mark attendance reliably on mobile, including offline
- guardians and students can only see their own linked data
- account provisioning is understandable and safe for admins
- exports and scoped dashboards work without cross-scope leakage
- operational maintenance remains low

## 6. Critic Review

### What is risky

- RLS-heavy designs become fragile when business logic spreads across client, server, and policy layers
- account provisioning becomes messy if person/guardian linking is ambiguous
- park attendance becomes unreliable if offline queue state is treated as secondary
- generic “admin can do everything” shortcuts create long-term security and support cost
- UI polish can hide workflow gaps if actions are not tied to real operations

### What becomes expensive later if done cheaply now

- weak scope enforcement becomes expensive once more roles and cities are added
- hand-wavy access creation becomes expensive once support issues start around wrong linked accounts
- skipping offline-first rigor becomes expensive because attendance is the most time-sensitive workflow
- generic dashboard summaries without exception routing become expensive because operations teams still need manual follow-up

### Weak assumptions to avoid

- assuming all internal users can operate from desktop
- assuming park internet is reliable
- assuming self-registration is acceptable for internal roles
- assuming a frontend-only role abstraction is enough for security

## 7. Proposed Stack

### Chosen Stack

- Frontend: `Next.js App Router`
- Language: `TypeScript`
- Styling: `Tailwind CSS`
- Backend: `Supabase`
- Offline queue: `Dexie` / IndexedDB
- Excel export: `exceljs`
- Hosting: `Vercel`

### Why this stack fits

- `Next.js` already matches the implemented app and supports route protection, server-side data access, and deployment simplicity
- `Supabase` fits the managed-service requirement and covers auth, database, storage, and RLS
- `Dexie` is the right fit for offline attendance queueing in a browser app
- `exceljs` fits the export requirement directly
- `Vercel` keeps frontend deployment low-maintenance

### Trade-offs

- `Next.js` is more opinionated than a plain SPA stack
- server/client separation is more complex than a pure Vite app
- Supabase RLS requires discipline and careful helper design

### What we are giving up

- no self-hosted DB or custom auth flexibility
- no raw SPA simplicity from React + Vite
- no native mobile app behavior beyond what the browser and PWA model can provide

## 8. Alternatives Considered

### Alternative 1. React + Vite + React Router

**Why it is attractive**

- simpler mental model for SPA development
- fast local builds
- familiar React composition model

**Why it is not the better choice here**

- the current product is already implemented in `Next.js`
- switching now is a rewrite, not an optimization
- it weakens the path already built for protected routes and server-side scope checks
- it does not improve the hardest business problem, which is offline attendance and scoped operations

### Alternative 2. Self-hosted backend or custom auth

**Why it is attractive**

- more control
- no vendor dependence

**Why it is not the better choice here**

- adds backup, monitoring, patching, and uptime burden
- increases team skill requirements
- does not solve a real current blocker
- violates the default managed-services rule without sufficient upside

## 9. Requirement Cross-Check

### Does the chosen direction match roles and workflows?

Yes. The implemented route model, role guards, and scoped workspaces align with HQ, city, park, guardian, and student workflows.

### Does it match budget and maintenance capacity?

Yes. `Supabase + Vercel` is low-maintenance compared to self-hosting, and the current architecture avoids introducing new infrastructure.

### Does it support scale?

Yes for the current and near-term scale. The architecture supports more cities and parks without a forced rewrite.

### Does it reduce operational overhead?

Yes. Managed auth, managed Postgres, managed hosting, and browser-based offline queueing keep the ops burden low.

### Is it over-engineered for v1?

Not materially. The system already has some complexity because the business rules demand it, especially around roles, attendance, and scoped data. The right move is to keep tightening boundaries, not restart with a “simpler” stack that would still need the same workflow complexity.

## 10. MVP Scope

### MVP Must-Haves

- internal login and role-based landing
- HQ dashboard and city management
- city operations dashboard
- parks, batches, groups, attendance-event management
- park attendance marking with offline queue
- guardian and student read-only portals
- access creation and update by admins
- reports and Excel exports

### Phase 2

- admissions workflow
- content/resources module
- procurement/inventory module
- richer finance analysis beyond current fee workflows

### Nice-to-Have / Optional

- WhatsApp deep-link helpers beyond current operational need
- broader notification refinements
- deeper analytics layers

## 11. What We Are Intentionally Not Building Yet

- self-service signup for internal roles
- real-time chat or community feed
- native mobile app
- payment gateway integration
- self-hosted infrastructure
- speculative microservices split
- full procurement stack before admissions and UAT closure

## 12. Step-by-Step Implementation Plan

### Phase A. Stabilize Core Operations

- complete browser UAT for admin, park, guardian, and student paths
- fix defects found in live role testing
- verify offline queue behavior against real data

### Phase B. Finish UI / UX Upgrade

- continue upgrading operational screens to match the new shell
- tighten mobile interaction on filter-heavy pages
- improve action hierarchy on main workflows

### Phase C. Access Workflow Hardening

- confirm all student, guardian, and murabbi provisioning paths work live
- validate first-login reset
- validate role and target-link correctness in production data

### Phase D. Next Functional Modules

- admissions
- content/resources
- procurement

Each new module should start with the same checklist used in this document before implementation begins.

## 13. Module-Wise Plan

### Module 1. HQ Governance

- dashboard
- exception board
- city management
- city-head assignments
- HQ announcements

### Module 2. City Operations

- parks, batches, groups
- people operations
- students
- guardians
- rules and fees
- city exceptions

### Module 3. Park Attendance

- park dashboard
- event board
- roster marking
- offline queue
- sync health

### Module 4. Access Management

- account import
- single-account setup
- status lookup
- target-aware provisioning

### Module 5. Reports and Exports

- scoped reports
- report presets
- Excel exports

## 14. Clean-Code Working Rules

These rules apply to all future project work:

- use meaningful domain names
- keep functions small and focused
- separate UI, business logic, and data access
- comment only when reasoning is not obvious
- validate inputs at boundaries
- avoid duplication without over-abstracting
- prefer simple readable code over clever shortcuts
- test permission rules, workflow transitions, and critical business logic
- leave touched code cleaner than before

## 15. Current Execution Status

Already implemented:

- role-based login and guarded routing
- HQ and city dashboards
- city management
- people, students, guardians, and access workspaces
- park dashboard and offline attendance flow
- guardian and student portals
- reports and exports
- branded shell and upgraded visual system
- production deployment on Vercel

Still required before go-live confidence:

- full browser UAT with real role accounts
- live workflow verification across role-specific paths
- defect fixes found during that testing

## 16. Decision

The current `Next.js + Supabase + Dexie + exceljs + Vercel` direction remains the correct plan for this project.

The project should continue by:

1. stabilizing the existing architecture
2. finishing UAT
3. fixing confirmed defects
4. only then moving into later modules such as admissions and procurement

## 17. Next 5 Sprints

### Sprint 1. Admissions Foundation

**Goal:** Add the first missing business module without destabilizing the existing operations stack.

- add admission schema and migrations
- add public application intake page
- add admin admissions pipeline page
- support scheduling interviews
- support moving applications through basic pipeline stages

**Execution in this pass:**

- admissions schema groundwork added
- public `/apply` intake route added
- `/admin/admissions` pipeline page added
- admin admissions API added

### Sprint 2. Admissions Completion and UAT Hardening

**Goal:** Turn admissions from foundation into an operational workflow and close live defects.

- add interview completion and scoring
- add approval flow into batch/group placement
- add admissions dashboard metrics
- run browser UAT across admin, park, guardian, and student flows
- patch defects found in real role testing

### Sprint 3. Content and Resources Module

**Goal:** Add structured content access for Shabab and Murabbi workflows.

- content categories
- content items directory
- admin content publishing workspace
- role-scoped read views for Murabbis and students
- lightweight managed link/file support

**Execution in this pass:**

- content publishing workspace upgraded with search, category, audience, and state filters
- featured-resource publishing added
- student and park resource libraries now surface featured resources and content-type filtering
- admin test center now includes content routes in the QA checklist

### Sprint 4. Procurement and Finance Expansion

**Goal:** Close remaining operational gaps beyond core attendance and admissions.

- procurement catalog
- park allocations
- stock warnings
- stronger fee analysis and finance views
- operational reporting around finance and inventory

**Execution in this pass:**

- procurement workspace upgraded with inventory search and stock-state filtering
- stock adjustment ledger added for HQ roles
- city roles remain allocation-focused while HQ owns central stock control
- park procurement view now supports searchable low-stock review

### Sprint 5. Go-Live Closure

**Goal:** Move from “feature-rich” to “deployment-ready”.

- full role-based browser UAT
- production defect fixes
- copy and consistency cleanup
- final mobile checks
- go-live checklist and release stabilization
