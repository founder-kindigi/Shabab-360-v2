# Shabab 360 v2 — Doable Action Items & Enhancement Roadmap

**Document:** `docs/reviews/DOABLE_ACTION_ITEMS_ROADMAP.md`  
**Date:** 2026-07-25  
**Target Repository:** `Shabab-360-v2`  
**Status:** Approved for Future Implementation Sprints  

---

## Executive Overview

This roadmap compiles legitimate, high-value technical enhancements extracted from the platform audit. These action items focus on cryptographic standardization, database query indexing, production observability, user interface accessibility, and automated log retention tooling.

---

## 1. Security & Cryptography Hardening

| Action Item | Target File(s) | Description & Implementation Guidance | Effort |
| :--- | :--- | :--- | :---: |
| **Standardize Bcrypt Cost Factor** | `src/app/api/admin/import/users/route.ts` | Update bulk CSV user import hashing from cost factor `10` to **`12`** to match `invite/route.ts`, `reset-password/route.ts`, and core authentication hashing. | 1 Hour |
| **Admin Temporary Credential Output Strategy** | `src/app/api/admin/invite/route.ts`<br>`src/app/api/admin/import/users/route.ts` | Offer an optional configuration flag allowing temporary password display to be suppressed in API JSON responses when SMTP/email delivery is enabled in production. | 0.5 Days |

---

## 2. Database Indexing & Query Optimization

| Action Item | Target File(s) | Description & Implementation Guidance | Effort |
| :--- | :--- | :--- | :---: |
| **Composite Database Indexing** | `prisma/schema.prisma`<br>`prisma/postgres/schema.prisma` | Add composite indexes on high-frequency query filters:<br>• `StaffMeta`: `@@index([assignedCityId, isActive])`<br>• `Group`: `@@index([batchId, isActive])`<br>• `Participant`: `@@index([groupId, state])`<br>• `AttendanceEvent`: `@@index([cityId, status, date])` | 0.5 Days |
| **Prisma Select Projection Optimization** | `src/app/api/admin/people/route.ts`<br>`src/app/api/admin/students/route.ts` | Audit relational `.findMany()` queries to ensure explicit `select` blocks are passed instead of fetching full un-indexed records on large city-wide roster queries. | 1 Day |

---

## 3. Production Observability & Monitoring

| Action Item | Target File(s) | Description & Implementation Guidance | Effort |
| :--- | :--- | :--- | :---: |
| **Dedicated Liveness & Readiness Health Endpoint** | `src/app/api/health/route.ts` | Add a public `/api/health` endpoint returning database connectivity status, schema version, and timestamp (`{ status: "ok", db: "connected", timestamp }`) for load balancers (AWS ALB / Vercel / Railway) and uptime monitors. | 0.5 Days |
| **API Contract & OpenAPI Documentation** | `docs/api/OPENAPI_SPECIFICATION.md` | Generate an OpenAPI 3.0 specification covering all `/api/admin/*` and `/api/park/*` endpoints for frontend developers and integration partners. | 1.5 Days |

---

## 4. UX, Accessibility & Resilience Polish

| Action Item | Target File(s) | Description & Implementation Guidance | Effort |
| :--- | :--- | :--- | :---: |
| **Form Button Disabled Guards & Skeletons** | `src/components/mashwara/MashwaraDecisionModal.tsx`<br>`src/components/mashwara/MashwaraShareModal.tsx`<br>`src/components/calling/CallingImportModal.tsx` | Enforce `isSubmitting` disabled state guards and spinner skeletons on form submit buttons to prevent accidental user double-clicks during slow network conditions. | 1 Day |
| **ARIA & Keyboard Navigation Polish** | `/src/app/admin/mashwara/*`<br>`/src/app/admin/events/*`<br>`/src/app/admin/calling/*` | Add explicit `aria-label`, `aria-expanded`, and keyboard focus trap management on custom dialog modals and drawer navigation. | 1 Day |

---

## 5. Data Lifecycle & Retention Tooling

| Action Item | Target File(s) | Description & Implementation Guidance | Effort |
| :--- | :--- | :--- | :---: |
| **Audit Log Archival & Retention Utility** | `scripts/prune-audit-logs.ts` | Add an administrative CLI maintenance script to archive or prune append-only `AuditLog` records older than 365 days. | 1 Day |

---

## Summary Matrix

* **Total Doable Items**: 8 High-Value Enhancements
* **Estimated Cumulative Effort**: ~6 Developer Days
* **Core Code Integrity Impact**: Purely additive (0 breaking changes required to existing architecture or authorization models).
