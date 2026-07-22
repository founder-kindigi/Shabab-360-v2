# CALL-306-IMPLEMENTATION-PLAN: Normalised Calling System Plan

- **Document Version:** 1.3.1
- **Task ID:** `CALL-306-IMPLEMENTATION-PLAN`
- **Status:** `PREPARED` / Pending Codex Approval
- **Integration Base:** `2a3fcc7`
- **Scope:** Technical implementation design for the normalised Calling System module, including temporary assignments, scope controls, templates, schema changes, Zod contracts, auth matrix, and phased delivery plan.

---

## 1. Scope & System Architecture

This plan implements a privacy-safe calling queue and prospect history portal, replacing Excel-based tracking for Lahore Phase 2 admissions. All features align strictly with the privacy guidelines of `CALL-305`.

---

## 2. Model Design & Additive Dual-Prisma Schema

Schema modifications are strictly additive. They must be applied synchronously to SQLite `prisma/schema.prisma` and staged PostgreSQL `prisma/postgres/schema.prisma`.

```prisma
// Proposed additions to database schemas

model CallingPOC {
  id         String   @id @default(cuid())
  userId     String
  cityId     String
  campaignId String
  startDate  DateTime
  endDate    DateTime
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user     User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  city     City            @relation(fields: [cityId], references: [id], onDelete: Cascade)
  campaign CallingCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([userId, cityId, campaignId, isActive])
  @@map("calling_pocs")
}

model CallingCampaign {
  id        String   @id @default(cuid())
  name      String
  cityId    String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  city                 City                  @relation(fields: [cityId], references: [id], onDelete: Cascade)
  externalCallers      ExternalSupportCaller[]
  campaignAssignments  CallingAssignment[]
  callInteractions     CallInteraction[]
  callingPOCs          CallingPOC[]

  @@map("calling_campaigns")
}

model ExternalSupportCaller {
  id         String   @id @default(cuid())
  userId     String
  campaignId String
  expiresAt  DateTime
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user     User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaign CallingCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([userId, campaignId, isActive, expiresAt])
  @@map("external_support_callers")
}

model CallingTemplate {
  id        String   @id @default(cuid())
  name      String
  content   String
  variables String   // JSON string of allowed placeholders
  status    String   @default("draft") // "draft" | "approved" | "retired"
  version   Int      @default(1)
  cityId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  city City @relation(fields: [cityId], references: [id], onDelete: Cascade)

  @@unique([cityId, name, version])
  @@map("calling_templates")
}

model CallInteraction {
  id               String   @id @default(cuid())
  applicationId    String
  callerId         String
  campaignId       String
  channel          String   // "phone" | "whatsapp" | "in_person" | "other"
  attemptOutcome   String   // "answered" | "unanswered" | "busy" | "wrong_number" | "whatsapp_sent"
  prospectResponse String   // "coming" | "not_coming" | "reschedule" | "confused" | "interested" | "not_interested" | "pending"
  note             String?
  interviewId      String?  // Optional reference to matched AdmissionInterview
  createdAt        DateTime @default(now())

  application        AdmissionApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  caller             User                 @relation(fields: [callerId], references: [id], onDelete: Cascade)
  campaign           CallingCampaign      @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  admissionInterview AdmissionInterview?  @relation(fields: [interviewId], references: [id], onDelete: SetNull)

  @@index([applicationId])
  @@index([callerId])
  @@index([campaignId])
  @@map("call_interactions")
}

model CallingAssignment {
  id            String   @id @default(cuid())
  campaignId    String
  applicationId String
  userId        String
  assignedById  String
  isActive      Boolean  @default(true)
  assignedAt    DateTime @default(now())

  campaign    CallingCampaign      @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  application AdmissionApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  user        User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignedBy  User                 @relation("AssignedBy", fields: [assignedById], references: [id])

  @@unique([campaignId, applicationId, userId])
  @@map("calling_assignments")
}
```

---

## 3. Operational Role & Scope Hierarchy

We enforce strict data limits and scope boundaries at the server route level:

### 3.1 Calling POC (Point of Contact)
- **Role Definition:** The Calling POC is an operational assignment, not a campaign creator. Campaigns are created and the POC is appointed/revoked by a City Head or Super Admin.
- **Scope & Validation:** An active POC is scoped to their designated `campaignId` and manages allocations only within that campaign. The server must explicitly validate that `CallingPOC.cityId === CallingCampaign.cityId` before enabling any manager actions.
- **Capabilities:** Manage caller and lead allocations only within their explicitly assigned campaign and date range.

### 3.2 City-Scoped Internal Callers
- **Scope:** Bounded strictly to their assigned city.
- **Capabilities:** Perform calls, update contact interaction outcomes, request templates. No cross-city lead viewing or reassignments allowed.

### 3.3 Restricted External Support Callers
- **Scope:** External support callers do not possess `StaffMeta` records. Their privileges are derived strictly from their active same-city campaign assignment and assigned leads.
- **Enforcement & Audit History:** Every server authorization query must verify that the caller is active (`isActive === true`) and the current time is before `expiresAt`. If this assignment is absent, expired, or revoked, access fails closed.
- **Historical Logs:** No database unique constraint is applied to `ExternalSupportCaller` to allow retaining full reassignment and revocation logs. The constraint of "one active assignment per user" is enforced dynamically in code on the server side.
- **Workspace Access:** Authorized callers are granted access to the actual, unmasked contact details (raw name, phone) of their assigned leads inside the active caller workspace to perform calls.

### 3.4 PII & Privacy Isolation
- **Caller Workspace:** Authorized callers see actual contact details for their assigned leads.
- **Scope Validation:** The server must explicitly validate that the lead (`CallingAssignment.applicationId`) belongs to the assignment's `campaignId` city scope.
- **Reports & Auditing:** PII is masked (e.g. `+92300*****67`, `Al* K**n`) or fingerprint-keyed in reports, system logs, and unassigned-list views. Keyed fingerprinting uses the approved secret configuration at implementation time.

---

## 4. CallingTemplate Approval Workflow

To prevent unapproved templates or raw text leaks:
1. **Creation:** A Calling POC or City Head drafts a template (`status: "draft"`).
2. **Approval:** Super Admin or City Head reviews and flags status to `"approved"`.
3. **Versioning:** Modifying an approved template creates a new database record with incremented `version` number, keeping history intact.
4. **Execution:** Callers may only select and use `"approved"` templates.

---

## 5. Call Log & existing AdmissionInterview Linkage

- **Linkage Rule:** When a caller records a `CallInteraction` with response `reschedule` or `coming`, the system matches the prospect's application to existing `AdmissionInterview` records.
- **Null Target handling:** If an interview record does not exist for the applicant, `interviewId` is set to null, and the log is recorded as `unresolvedInterviewLink` in reconciliation. Importers/APIs must never dynamically create or infer new interview sessions.

---

## 6. Reports & Audit Trails

- **Audited Exports:** CSV/Excel contact exports are strictly restricted to the `City Head` role. Exports may contain necessary contact details, but only after a purpose confirmation input is provided by the user.
- **Audit Specification:** The export route generates a critical system audit log specifying the user, timestamp, filter constraints, count of records exported, and the confirmed export purpose.
- **PII Protection:** Raw PII is kept completely out of reports, system logs, and unassigned lists. Keyed fingerprinting uses the approved secret configuration at implementation time.

---

## 7. Bounded Zod API Contracts

API routes validate payload constraints and enforce model scope mappings:

```typescript
import { z } from "zod";

export const createInteractionSchema = z.object({
  applicationId: z.string().cuid(),
  campaignId: z.string().cuid(),
  channel: z.enum(["phone", "whatsapp", "in_person", "other"]),
  attemptOutcome: z.enum(["answered", "unanswered", "busy", "wrong_number", "whatsapp_sent"]),
  prospectResponse: z.enum(["coming", "not_coming", "reschedule", "confused", "interested", "not_interested", "pending"]),
  note: z.string().max(500).optional(),
});

export const updateAssignmentSchema = z.object({
  campaignId: z.string().cuid(),
  applicationId: z.string().cuid(),
  userId: z.string().cuid(),
  isActive: z.boolean(),
});

export const exportRequestSchema = z.object({
  exportPurpose: z.string().trim().min(10).max(500),
  campaignId: z.string().cuid().optional(),
  cityId: z.string().cuid(),
});
```

---

## 8. Authorization Test Matrix

| Route Endpoint | Method | Caller Role | Scope Input | Expected Result |
| --- | --- | --- | --- | --- |
| `/api/calling/interactions` | `POST` | Internal Caller | Same City | **201 Created** |
| `/api/calling/interactions` | `POST` | Internal Caller | Foreign City | **403 Forbidden** |
| `/api/calling/campaigns` | `POST` | Calling POC | Same City | **403 Forbidden** (Created by City Head/Super Admin only) |
| `/api/calling/campaigns` | `POST` | City Head | Same City | **201 Created** |
| `/api/calling/campaigns` | `POST` | Calling POC | Foreign City | **403 Forbidden** |
| `/api/calling/export` | `GET` | Calling POC | Same City | **403 Forbidden** (Exports restricted to City Head) |
| `/api/calling/export` | `GET` | City Head | Same City | **200 OK (Audited after purpose confirmation)** |

---

## 9. Phased Implementation Tasks

To facilitate clean code reviews:

- **Task 1 (Database):** Dual-Prisma schema definitions and migrations.
- **Task 2 (Security & Auth):** Implement audit logging decorators and Calling POC session middleware.
- **Task 3 (API Routes):** Implementation of validated call log interaction and assignment routes.
- **Task 4 (UI - Caller Workspace):** Queue dashboards, template selectors, and timeline viewports.
- **Task 5 (Staging UAT):** Read-only dry-run importer execution, and validation checklists.

---
*End of CALL-306 Implementation Plan.*