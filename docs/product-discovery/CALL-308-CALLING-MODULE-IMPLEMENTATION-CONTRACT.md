# CALL-308: Calling Module Implementation Contract

- **Document Version:** 1.3.0
- **Task ID:** `PKG-08-CALLING-MODULE-IMPLEMENTATION-CONTRACT`
- **Agent Identity:** Antigravity
- **Complexity:** C3
- **Base Commit:** `be29368` (on branch `agent/antigravity/pkg-08-calling-module-contract`)
- **Status:** `PROPOSED` — Pending Owner Review & Approval

---

## 1. Scope, Boundaries, and Reconciled Inventory

This contract defines the implementation-ready specifications for the Calling Module in Shabab 360 v2. It reconciles the requirements from `CALL-304`, `CALL-305`, `CALL-306`, `CALL-307`, and `EVENT-303`.

### 1.1 Verified Current Model Inventory
The following models are verified as existing in the repository-relative schema [schema.prisma](prisma/schema.prisma):
* `User` (lines 12-33): Mapped user credentials and statuses. Incorporates `mustResetPwd` (boolean, defaults to `true`) and `tokenVersion` (integer, defaults to `0`) for forced password reset tracking.
* `StaffMeta` (lines 175-194): Canonical roles (`role`) and scopes (`assignedCityId`, `assignedParkId`, `assignedGroupId`).
* `AdmissionApplication` (lines 519-546): Mapped applicant details (`applicantName`, `guardianPhone`, `cityId`).
* `AdmissionInterview` (lines 548-566): Scheduled interviews linked to admission applications.
* `EventResponsibility` (defined in [EVENT-303-IMPLEMENTATION-CONTRACT.md](docs/product-discovery/EVENT-303-IMPLEMENTATION-CONTRACT.md#L182-L210)): Temporary operational responsibility assigned to staff.

---

## 2. Proposed Additive Prisma Models

The following proposed models are strictly additive and must be defined identically in SQLite (`prisma/schema.prisma`) and PostgreSQL (`prisma/postgres/schema.prisma`).

```prisma
// ========== CALLING MODULE ADDITIVE MODELS ==========

model CallingCampaign {
  id          String   @id @default(cuid())
  cityId      String
  name        String
  description String?
  status      String   @default("draft") // "draft" | "active" | "completed" | "archived"
  startDate   DateTime
  endDate     DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  city           City                  @relation(fields: [cityId], references: [id], onDelete: Cascade)
  pocAssignments CallingPOCAssignment[]
  assignments    CallingAssignment[]
  templates      CallingTemplate[]

  @@unique([cityId, name])
  @@index([cityId, status])
  @@map("calling_campaigns")
}

// Calling POC is a temporary event/Mashwara responsibility, never a login role or city-wide post.
model CallingPOCAssignment {
  id                    String   @id @default(cuid())
  campaignId            String
  eventResponsibilityId String   // References EventResponsibility
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  campaign            CallingCampaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  eventResponsibility EventResponsibility @relation(fields: [eventResponsibilityId], references: [id], onDelete: Cascade)

  @@unique([campaignId, eventResponsibilityId])
  @@map("calling_poc_assignments")
}

// External support callers are campaign-specific, same-city active users.
model ExternalSupportCaller {
  id              String    @id @default(cuid())
  userId          String
  campaignId      String    // Mandatory campaign binding
  isActive        Boolean   @default(true)
  expiresAt       DateTime  // Mandatory validity limit (max 30 days)
  revokedAt       DateTime? // Audited revocation
  revokedBy       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaign    CallingCampaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  assignments CallingAssignment[]

  @@index([userId, isActive])
  @@index([campaignId, isActive])
  @@map("external_support_callers")
}

model CallingTemplate {
  id         String   @id @default(cuid())
  cityId     String
  campaignId String?  // Nullable only for city-wide templates, otherwise campaign-bound
  title      String
  body       String   // Text content containing approved merge variables
  status     String   @default("draft") // "draft" | "approved" | "retired"
  version    Int      @default(1)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  city     City                 @relation(fields: [cityId], references: [id], onDelete: Cascade)
  campaign CallingCampaign?     @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  uses     CallingTemplateUse[]

  @@unique([cityId, title, version])
  @@map("calling_templates")
}

// CallingTemplateUse is an immutable audit trail. Prohibit cascade deletions.
model CallingTemplateUse {
  id              String   @id @default(cuid())
  templateId      String
  templateVersion Int
  callerUserId    String
  assignmentId    String
  variablesUsed   String   // JSON stringified list of variable-key names, e.g. '["parentName", "applicantName"]'
  valuesHmac      String   // HMAC of values used (to check authenticity without exposing PII)
  usedAt          DateTime @default(now())

  template   CallingTemplate   @relation(fields: [templateId], references: [id], onDelete: Restrict)
  caller     User              @relation(fields: [callerUserId], references: [id], onDelete: Restrict)
  assignment CallingAssignment @relation(fields: [assignmentId], references: [id], onDelete: Restrict)

  @@index([templateId])
  @@index([callerUserId])
  @@map("calling_template_uses")
}

model CallingAssignment {
  id                String    @id @default(cuid())
  campaignId        String
  applicationId     String
  callerStaffMetaId String?
  callerExternalId  String?
  status            String    @default("pending") // "pending" | "in_progress" | "completed" | "reassigned"
  isActive          Boolean   @default(true)
  startedAt         DateTime  @default(now())
  endedAt           DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  campaign     CallingCampaign        @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  application  AdmissionApplication   @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  staffCaller  StaffMeta?             @relation(fields: [callerStaffMetaId], references: [id], onDelete: SetNull)
  externalCaller ExternalSupportCaller? @relation(fields: [callerExternalId], references: [id], onDelete: SetNull)
  interactions CallInteraction[]
  templateUses CallingTemplateUse[]

  @@index([callerStaffMetaId, isActive])
  @@index([callerExternalId, isActive])
  @@map("calling_assignments")
}

model CallInteraction {
  id           String   @id @default(cuid())
  assignmentId String
  callerUserId String
  outcome      String   // "reached" | "no_answer" | "busy" | "wrong_number" | "not_interested" | "callback_requested"
  notes        String?
  scheduledFor DateTime? // Mandatory if outcome is callback_requested
  createdAt    DateTime @default(now())

  assignment CallingAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  caller     User              @relation(fields: [callerUserId], references: [id], onDelete: Cascade)

  @@index([assignmentId, createdAt])
  @@map("call_interactions")
}
```

### 2.2 Dual Prisma Migration Plan
1. **Development Environment (SQLite):**
   - Edit `prisma/schema.prisma` to append the proposed models and relation fields.
   - Run the local migration command:
     ```bash
     npx prisma migrate dev --name add_calling_tables
     ```
2. **Staging & Production Environment (PostgreSQL):**
   - Edit `prisma/postgres/schema.prisma` to append the identical model definitions and relation fields.
   - Run the PostgreSQL migration locally against a development database to generate the migration file:
     ```bash
     npx prisma migrate dev --schema=prisma/postgres/schema.prisma --create-only --name add_calling_tables
     ```
   - Commit the generated migration folder to the repository.
   - Apply PostgreSQL migration in staging using:
     ```bash
     npx prisma migrate deploy --schema=prisma/postgres/schema.prisma
     ```
   - > [!WARNING]
     > **NEVER run `migrate dev` against staging or production environments.** Staging/production must exclusively apply committed migrations via `migrate deploy`.

3. **Safe Rollback Protocol:**
   - In case of critical regression, route access must be disabled immediately by revoking calling capabilities and setting feature flag toggles.
   - Database tables and columns **must not** be dropped or undone in production. Existing rows are preserved to prevent data loss. Full database backup restore procedures are reserved for Codex-and-owner incident recovery scenarios only.

---

## 3. Temporary Responsibility & Reassignment Specifications

### 3.1 Calling POC Responsibility
* **Event Gating:** Calling POC is a temporary responsibility under `EVENT-303`. It must reference exactly one `EventResponsibility` record.
* **Mandatory Boundaries:**
  - Mandatory start and end dates (responsibilities are time-bounded and expire automatically).
  - Calling POCs only have authority to allocate leads and select templates *within* their assigned campaign/event and within their active dates.
  - Active Calling POC authorization requires dynamic runtime checks on every request: `EventResponsibility.isActive === true` AND `EventResponsibility.startDate <= now` AND `EventResponsibility.endDate >= now` AND `EventResponsibility.revokedAt === null` AND `CallingPOCAssignment.isActive === true`.
  - **City Scope Matching Constraint:** The server validates that `EventResponsibility.cityId` exactly equals `CallingCampaign.cityId` before any assignment is authorized.
  - Revocation is audited, requiring `revokedAt`, `revokedBy`, and `revokedReason`.

### 3.2 External Support Caller Sandbox
* **Campaign Gating:** Support callers are campaign-specific. Each record in `ExternalSupportCaller` binds a `User` to exactly one `CallingCampaign`.
* **Database Contraints:** The server enforces that there is at most **one** active (`isActive: true` AND `revokedAt == null` AND `expiresAt > now`) record in `ExternalSupportCaller` per `userId` and `campaignId` to prevent duplicate active caller entries while preserving historical records.
* **Dynamic Expiry:** The caller's validity is governed by `expiresAt` (max 30 days). The server must validate expiry dynamically on every route execution: `expiresAt > now` and `revokedAt === null`.
* **Lead Boundary:** Support callers have no global city-level access. They can view and log interactions **only** for leads explicitly assigned to them in `CallingAssignment`.
* **Forced Reset Integration:** Support callers use the repository's existing forced-password-reset mechanism by setting `User.mustResetPwd = true` upon caller provisioning, forcing a password change on first login.
* **Historic Reuse:** A portal user can be reused across campaigns. Revoking an external caller record sets `revokedAt: new Date()` without losing the historical log.

### 3.3 Bounded Reassignment History
* **Database Constraint:** `@@unique([campaignId, applicationId, isActive])` is **removed** from the database to allow multiple historic assignments.
* **Server Transaction Enforcement:** A database transaction must enforce that **exactly one** assignment is active (`isActive === true` and `status !== "reassigned"`) per campaign and application.
* **Reassignment Action:** When a lead is reassigned, the server atomically:
  1. Updates the active assignment setting `isActive: false`, `status: "reassigned"`, and `endedAt: new Date()`.
  2. Creates a new active assignment with `isActive: true` and `status: "pending"`.
* **Caller Target Validation:** The server validates that `callerStaffMetaId` and `callerExternalId` are mutually exclusive (`staff XOR external caller`).

---

## 4. Templates, Merge Allowlist, and City Rules

### 4.1 Campaign Scoping of Templates
* `campaignId` is nullable **only** for city-wide templates. Otherwise, templates must be bound to a specific `CallingCampaign`.
* **City Boundary:** The server enforces that a campaign-specific template's `cityId` must match the campaign's `cityId`.
* **Lifecycle:** Templates progress through states `draft` -> `approved` -> `retired`. Only `approved` templates can be used to contact leads.
* **Capability Control:** Introducing, approving, or retiring templates requires a dynamic `calling.templates.manage` capability plus city scope validation. POCs may only select approved templates and cannot create or modify them unless explicitly granted `calling.templates.manage`.

### 4.2 Versioning & Immutable Template Use Logs
* **Versioning:** Templates utilize an incremental `version` field. When a template body is updated, a new record is created with an incremented version number, keeping past versions immutable.
* **TemplateUse Logs:** Every manual contact event using a template writes to `CallingTemplateUse`.
* **PII Redaction Safeguards:** The `valuesHmac` field stores a SHA-256 HMAC of the template values used (using `IMPORT_HMAC_SECRET`), and `variablesUsed` records the key names. Raw or masked candidate PII is **never** saved inside this model.
* **No Deletion / Cascades:** There is no API DELETE endpoint for `CallingTemplateUse`. The relations are set to `onDelete: Restrict` to prevent cascade deletes. In the event of campaign archival, the template uses and their HMAC logs remain preserved in place.

### 4.3 Server-Side City Scope & Date Integrity
* **HQ vs Scoped Actors:** HQ capability holders (Super Admin) must supply `cityId` explicitly in request payloads (otherwise returning 400). Scoped actors (City Head) derive their city scope server-side via `StaffMeta`.
* **GET Campaign List Query Parameter Rules:**
  - **HQ-Capable Users:** Must explicitly supply a valid, existing `cityId` parameter in the request query string. Omission or invalid parameters yield HTTP 400.
  - **Scoped Actors:**
    - If they omit `cityId`, the server derives their city scope automatically via their `StaffMeta` profile.
    - If they supply a `cityId`, it must match their derived city scope. Supplying a foreign `cityId` yields HTTP 403.
* **Request Narrowing:** Client-supplied scopes can only narrow, never expand, the derived city scope.
* **Date Validation:** In Zod and on the server, campaigns must satisfy `startDate <= endDate`.
* **City Boundary:** The server enforces that a candidate lead's `AdmissionApplication.cityId` must match the campaign's `CallingCampaign.cityId` before any assignment can be created.

---

## 5. Bounded Zod Contracts

```typescript
import { z } from "zod";

const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, "Invalid CUID");

export const createCampaignSchema = z.object({
  cityId: cuidSchema.optional(), // Mandatory only for HQ capability holders
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: "startDate must be less than or equal to endDate",
  path: ["startDate"],
});

export const inviteExternalCallerSchema = z.object({
  campaignId: cuidSchema,
  email: z.string().email(),
  name: z.string().trim().min(3).max(120),
  expiresAt: z.string().datetime().refine((val) => {
    const expiry = new Date(val);
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return expiry <= limit && expiry > new Date();
  }, "Expiry cannot exceed 30 days or be in the past"),
});

export const logInteractionSchema = z.object({
  assignmentId: cuidSchema,
  outcome: z.enum(["reached", "no_answer", "busy", "wrong_number", "not_interested", "callback_requested"]),
  notes: z.string().trim().max(1000).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
}).refine((data) => data.outcome !== "callback_requested" || !!data.scheduledFor, {
  message: "scheduledFor date is required when outcome is callback_requested",
  path: ["scheduledFor"],
});

export const assignLeadsSchema = z.object({
  campaignId: cuidSchema,
  applicationIds: z.array(cuidSchema).min(1, "At least one lead is required"),
  callerStaffMetaId: cuidSchema.optional().nullable(),
  callerExternalId: cuidSchema.optional().nullable(),
}).refine((data) => !!data.callerStaffMetaId !== !!data.callerExternalId, {
  message: "Provide either a staff caller or an external caller, not both",
});

export const createTemplateSchema = z.object({
  cityId: cuidSchema.optional(), // Mandatory only for HQ capability holders
  campaignId: cuidSchema.optional().nullable(), // Nullable for city-wide
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(5).max(1000).refine((val) => {
    const vars = val.match(/{{(.*?)}}/g) || [];
    const allowed = ["{{parentName}}", "{{applicantName}}", "{{trackingCode}}"];
    return vars.every((v) => allowed.includes(v));
  }, "Template contains unauthorized merge variables"),
});


export const updateTemplateSchema = z.object({
  status: z.enum(["draft", "approved", "retired"]),
  body: z.string().trim().min(5).max(1000).optional(),
});

export const exportCallingSchema = z.object({
  campaignId: cuidSchema,
  cityId: cuidSchema.optional(), // Mandatory only for HQ capability holders
  purpose: z.string().trim().min(10, "Purpose must explain PII extraction").max(500),
  format: z.enum(["csv", "xlsx"]),
});
```

---

## 6. API Matrix with Deterministic Outcomes

All scope evaluations are derived server-side. Query parameters may only narrow, never expand, the scope.

| Route | Method | Payload / Query | Access Level (Required Capabilities) | Expected Outcomes | Description |
| --- | --- | --- | --- | --- | --- |
| `/api/calling/campaigns` | GET | `cityId` | `calling.leads.view` | **200** Success<br>**400** HQ missing cityId<br>**403** Scope Mismatch | List campaigns for user's derived/supplied city. |
| `/api/calling/campaigns` | POST | Zod Campaign Create | `calling.campaign.manage` | **201** Created<br>**400** Invalid Zod Payload / Dates / Missing HQ cityId<br>**409** Name Conflict in City | Create a new city campaign. |
| `/api/calling/campaigns/[id]/leads` | GET | None | `calling.leads.view` | **200** Masked Roster<br>**404** Campaign Not Found | Fetch roster. Assigned caller sees raw PII for their leads; others see masked names/phones. |
| `/api/calling/campaigns/[id]/assign-poc` | POST | Zod POC Assign | `calling.poc.manage` | **200** Success<br>**400** Staff/Campaign City Mismatch<br>**404** Record Not Found | Assign a staff member as Calling POC. |
| `/api/calling/assignments` | POST | Zod Lead Assign | **Dynamic Assignment Gate** | **200** Success<br>**400** Caller/Lead City Scope Mismatch / Mutually Exclusive Caller<br>**403** Expired POC / Caller Scope Violation<br>**409** Active Assignment Exists | Assign leads to a caller. Requester must hold `calling.campaign.manage` OR `calling.leads.assign` + active campaign POC responsibility. |
| `/api/calling/assignments/my-leads` | GET | None | `calling.leads.view` | **200** Success | List active assigned leads (PII unmasked). |
| `/api/calling/interactions` | POST | Zod Interaction Log | `calling.leads.interact` | **201** Created<br>**400** Callback Date Missing / Outcome Schema Error<br>**403** Expired Caller Scope | Log call interaction results. |
| `/api/calling/external-callers` | POST | Zod Caller Invite | `calling.poc.manage` | **201** Created<br>**400** Validity Exceeds 30 Days<br>**409** Active Caller Already Exists / Email Exists | Register/invite support caller. |
| `/api/calling/templates` | GET | `campaignId`, `cityId` | `calling.leads.view` | **200** Success<br>**400** HQ missing cityId<br>**403** Scope Mismatch | List active templates for the user's derived/supplied city scope (filters optional). |
| `/api/calling/templates` | POST | Zod Template Create | `calling.templates.manage` | **201** Created<br>**400** Variables Error / Missing HQ cityId<br>**403** Scope Violation (Campaign City Mismatch / User Scope Mismatch) | Create a template in draft status. Campaign-bound templates verify template city equals campaign city. City-wide templates store derived/supplied city. |

| `/api/calling/templates/[id]` | PATCH | Zod Template Update | `calling.templates.manage` | **200** Success<br>**400** Invalid state transition<br>**403** Scope Violation | Approve or retire template, or update draft. |

| `/api/calling/exports` | POST | Zod Export Request | `calling.export.manage` | **200** File Stream<br>**400** Purpose Too Short<br>**403** Forbidden (Scope Mismatch) | Export campaign lists with audit logging. Gated by capability + derived city scope (no role gates). |

---

## 7. Privacy, Audit, Export, Retention, and Rollback Rules

### 7.1 PII Masking and Privacy Safeguards
* **Unassigned Views Masking:** If a lead is not actively assigned to the requesting user, sensitive data fields (names, phones, CNICs, notes) must be masked.
  * Name: `Mu***** Za**`
  * Phone: `+92300*****12`
  * Address/Notes: Completely redacted (`[REDACTED]`).
* **Assigned Leads:** Callers only see raw contact details for leads explicitly assigned to them.
* **No Automated Communications:** System integrations with SMS, automatic emails, or automated WhatsApp gateways are disabled. WhatsApp interactions must use client-side manual deep-links (`https://wa.me/923XXXXXXXXX?text=...`) utilizing pre-approved templates.

### 7.2 Export Controls
To satisfy audit requirements, any calling list export triggers the following enforcements:
1. **Audit Logs:** Logged under `export` action for entity `calling_campaign` containing:
   - Requesting `userId` and timestamp.
   - Purpose string parsed from the payload.
   - Query filters applied and total row count exported.
   - **Scope validation:** Rejects export requests if the user lacks `calling.export.manage` or target campaign falls outside their derived city scope.

### 7.3 Read-Only Dry-Run Imports
* **Importers Gating:** All imports remain strictly read-only dry-runs utilizing the parser.
* **Write Deferral:** Database transaction writes are prohibited. The dry-run report output (summary, duplicate clusters) must be displayed to the user as a preview without database persistency.

### 7.4 Rollback Strategy
* **Route Disabling:** If a security regression is identified, rollback is performed by setting the feature flags to disabled or revoking the calling capabilities.
* **Preservation of Rows:** Database tables and schema structures must not be rolled back or dropped in production. Staging and production databases utilize committed migration logs.

---

## 8. Allow, Deny, Error, and Audit Test Matrix

### 8.1 Test Cases

| Case ID | Actor Capabilities | Context / Parameters | Action Attempted | Expected Outcome | Audit Log Recorded? |
| --- | --- | --- | --- | --- | --- |
| `TC-CL-001` | `calling.campaign.manage` | Active City: Lahore | Create campaign "Lahore Batch 4" | **Allow** (HTTP 201) | Yes (`create`) |
| `TC-CL-002` | `calling.campaign.manage` | Active City: Islamabad | Create campaign for Lahore | **Deny** (HTTP 403 - Scoped actor scope mismatch) | No |
| `TC-CL-003` | None | Active City: Lahore | Create campaign | **Deny** (HTTP 403 - Missing capability) | No |
| `TC-CL-004` | `calling.poc.manage` | Campaign: LHR Campaign, Staff: LHR Staff | Assign campaign Calling POC | **Allow** (HTTP 200) | Yes (`assign_poc`) |
| `TC-CL-005` | `calling.poc.manage` | Campaign: LHR Campaign, Staff: ISB Staff | Assign campaign Calling POC | **Deny** (HTTP 400 - City Scope Mismatch) | No |
| `TC-CL-006` | `calling.leads.view` (Assigned Caller)| Fetch assigned lead details | GET `/api/calling/assignments/my-leads` | **Allow** (HTTP 200 - Unmasked PII) | No |
| `TC-CL-007` | `calling.leads.view` (Unassigned Member)| Fetch unassigned candidate list | GET `/api/calling/campaigns/[id]/leads` | **Allow** (HTTP 200 - Masked PII) | No |
| `TC-CL-008` | `calling.export.manage` | Purpose: "Audit outreach list for LHR", Format: CSV | POST `/api/calling/exports` | **Allow** (HTTP 200 - CSV stream) | Yes (`export_campaign_leads`) |
| `TC-CL-009` | `calling.export.manage` | Purpose: "Short" (5 chars) | POST `/api/calling/exports` | **Deny** (HTTP 400 - Purpose too short) | No |
| `TC-CL-010` | `calling.leads.interact` (Assigned Caller) | Invalid call outcome "disconnected" | POST `/api/calling/interactions` | **Deny** (HTTP 400 - Invalid enum) | No |
| `TC-CL-011` | `calling.poc.manage` | Invite external caller with 40-day expiry | POST `/api/calling/external-callers` | **Deny** (HTTP 400 - Exceeds 30 days) | No |
| `TC-CL-012` | `calling.export.manage` (HQ/SuperAdmin) | Omit `cityId` | POST `/api/calling/exports` | **Deny** (HTTP 400 - Missing cityId) | No |
| `TC-CL-013` | `calling.campaign.manage` | startDate > endDate | POST `/api/calling/campaigns` | **Deny** (HTTP 400 - Invalid date range) | No |
| `TC-CL-014` | `calling.leads.assign` | Lead City: ISB, Campaign City: LHR | POST `/api/calling/assignments` | **Deny** (HTTP 400 - City boundary mismatch) | No |
| `TC-CL-015` | `calling.leads.assign` | Caller: Staff AND External both set | POST `/api/calling/assignments` | **Deny** (HTTP 400 - Mutually exclusive caller fields) | No |
| `TC-CL-016` | `calling.leads.interact` (Expired External) | `expiresAt` < now | POST `/api/calling/interactions` | **Deny** (HTTP 403 - Expired caller access) | No |
| `TC-CL-017` | `calling.leads.assign` (Revoked POC) | `calling.leads.assign` + active status check fails on revoked POC responsibility | POST `/api/calling/assignments` | **Deny** (HTTP 403 - Revoked/Expired POC permissions) | No |
| `TC-CL-018` | `calling.leads.view` (Active member) | Fetch template with draft status | GET `/api/calling/templates/[id]` | **Deny** (HTTP 403 - Template not approved) | No |
| `TC-CL-019` | `calling.templates.manage` (Active member) | Create template with draft status | POST `/api/calling/templates` | **Allow** (HTTP 201) | Yes (`create_template`) |
| `TC-CL-020` | `calling.leads.assign` (No Active POC) | Attempt to assign lead | POST `/api/calling/assignments` | **Deny** (HTTP 403 - Requires active campaign POC/Admin) | No |
| `TC-CL-021` | `calling.poc.manage` | Assign POC LHR event to campaign ISB | POST `/api/calling/campaigns/[id]/assign-poc` | **Deny** (HTTP 400 - EventResponsibility city mismatch) | No |
| `TC-CL-022` | `calling.poc.manage` | Assign external caller when active exists | POST `/api/calling/external-callers` | **Deny** (HTTP 409 - Active caller already exists) | No |
| `TC-CL-023` | `calling.campaign.manage` (LHR Scoped) | Provide `cityId: ISB` query on list | GET `/api/calling/campaigns` | **Deny** (HTTP 403 - Scope Mismatch) | No |
| `TC-CL-024` | `calling.templates.manage` (Active member) | Approve template outside user's city scope | PATCH `/api/calling/templates/[id]` | **Deny** (HTTP 403 - Scope Mismatch) | No |
| `TC-CL-025` | `calling.templates.manage` (Active member) | Transition template approved -> retired | PATCH `/api/calling/templates/[id]` | **Allow** (HTTP 200) | Yes (`retire_template`) |
| `TC-CL-026` | `calling.leads.interact` | Active assignment to the caller + approved campaign-eligible template | POST `/api/calling/interactions` (log interaction using template) | **Allow** (HTTP 201 - Caller selects approved template) | Yes (`log_template_use`) |

| `TC-CL-027` | `calling.campaign.manage` (HQ/Global) | Omit `cityId` query parameter | GET `/api/calling/campaigns` | **Deny** (HTTP 400 - Missing cityId) | No |
| `TC-CL-028` | `calling.templates.manage` (HQ/Global) | Omit `cityId` in payload | POST `/api/calling/templates` | **Deny** (HTTP 400 - Missing cityId) | No |
| `TC-CL-029` | `calling.templates.manage` (LHR Scoped) | Provide `cityId: ISB` in payload | POST `/api/calling/templates` | **Deny** (HTTP 403 - Scope Mismatch) | No |
| `TC-CL-030` | `calling.templates.manage` (LHR Scoped) | Create city-wide template (`campaignId` null) | POST `/api/calling/templates` | **Allow** (HTTP 201 - City LHR derived/stored) | Yes (`create_template`) |
| `TC-CL-031` | `calling.templates.manage` (LHR Scoped) | Create campaign-bound template where campaign city is ISB (outside user scope) | POST `/api/calling/templates` | **Deny** (HTTP 403 - Campaign Scope Mismatch) | No |



---

## 9. Exact Subsequent Implementation Packages and Files

The following files and paths will be introduced in follow-up packages:

### 9.1 API Routes
* **[NEW]** `src/app/api/calling/campaigns/route.ts`: Core campaigns endpoints.
* **[NEW]** `src/app/api/calling/campaigns/[id]/leads/route.ts`: Leads listing inside campaigns (with masking logic).
* **[NEW]** `src/app/api/calling/campaigns/[id]/assign-poc/route.ts`: Calling POC allocation.
* **[NEW]** `src/app/api/calling/assignments/route.ts`: Leads assignment endpoint.
* **[NEW]** `src/app/api/calling/assignments/my-leads/route.ts`: Personal caller dashboard lead fetch.
* **[NEW]** `src/app/api/calling/interactions/route.ts`: Call logs insertion.
* **[NEW]** `src/app/api/calling/external-callers/route.ts`: External callers provisioning.
* **[NEW]** `src/app/api/calling/templates/route.ts`: Template creation and listing.
* **[NEW]** `src/app/api/calling/templates/[id]/route.ts`: Template state updates.
* **[NEW]** `src/app/api/calling/exports/route.ts`: Protected campaign list export endpoint.

### 9.2 Shared Utilities and Components
* **[NEW]** `src/lib/calling/scope.ts`: Server-side scope derivation utility.
* **[NEW]** `src/lib/calling/pii-mask.ts`: Reusable name and phone masking utilities.
* **[MODIFY]** `src/lib/auth/capabilities.ts`: Include the calling capability catalogue keys.
* **[NEW]** `src/components/modules/calling/caller-dashboard.tsx`: Workspace component for callers.

---

## 10. Owner Decisions Clearly Marked

The following decisions must be resolved by the product owner before implementation begins:

1. **Campaign Creation Provisioning:** Are campaigns strictly manually created by City Heads/Admins, or should they be auto-initialized? (Dry-run imports never create campaigns).
2. **Approved Domain Whitelist for External Callers:** Define the email address whitelist rules (e.g. `*.unregistered.invalid`) allowed for external callers.
3. **WhatsApp Message Content Templates:** Define the exact list of approved message template texts to be populated in deep-links.
4. **PII Masking Rules:** Confirm the exact character counts to hide when masking names (e.g., leaving first and last initials visible).
5. **Interaction History Retention Policy:** Retain interaction logs for 12 months, then automatically archive, per default approved guidelines.
