# Shabab 360 Technical Requirements

**Purpose:** Define the technical qualities, constraints, and verification
criteria required to deliver Shabab 360 safely. This document complements the
[User-Perspective Requirements](USER_PERSPECTIVE_REQUIREMENTS.md): it explains
how the platform must behave and be operated, not which business policy is
approved.

**Status:** Working technical baseline. Requirements marked **current
foundation** reflect the present codebase direction; requirements marked
**release gate** must be evidenced before the relevant pilot/production use.
Requirements marked **future** must be implemented only after the corresponding
programme policy is approved.

## 1. Architecture and technology constraints

| ID | Requirement | Status |
| --- | --- | --- |
| TR-ARC-001 | The application must use the Next.js App Router, React, TypeScript, and Tailwind CSS architecture already established in the repository. New work must preserve strict TypeScript compilation and the `@/*` source alias. | Current foundation |
| TR-ARC-002 | Server mutations and sensitive reads must be implemented through server routes/services; client-side navigation, role-specific menus, and local state must never be the sole enforcement point. | Current foundation |
| TR-ARC-003 | Database access must use Prisma. Generated Prisma clients must never be manually edited. | Current foundation |
| TR-ARC-004 | The active local/runtime schema is SQLite (`prisma/schema.prisma`). The staged deployment schema is PostgreSQL (`prisma/postgres/schema.prisma`). A business-model change that applies to both must keep the schemas and migrations aligned. | Current foundation |
| TR-ARC-005 | PostgreSQL deployments must use the reviewed PostgreSQL schema, generated client, and build path (`npm run build:postgres`). SQLite-to-PostgreSQL migration and reconciliation must be controlled operations, never an implicit application-start action. | Release gate |
| TR-ARC-006 | Components must be modular by domain and reuse shared UI, validation, authorisation, query, and audit helpers rather than duplicating business rules in pages. | Current foundation |

## 2. Identity, authentication, and authorisation

| ID | Requirement | Status |
| --- | --- | --- |
| TR-SEC-001 | Authentication must use the configured NextAuth credentials flow with bcrypt password verification and a strong, unique `NEXTAUTH_SECRET`. Secrets must be supplied through protected environment configuration and must never be logged, committed, or returned by an API. | Current foundation |
| TR-SEC-002 | Internal roles must not self-register. Account creation, activation, deactivation, assignment, and temporary onboarding must be authorised administrative operations. | Current foundation |
| TR-SEC-003 | The system must reject missing credentials, inactive accounts, accounts without a valid linked role, and sessions requiring reset from normal application access. | Current foundation |
| TR-SEC-004 | User-selected and generated passwords must meet the approved 12–128 character policy; temporary credentials or invitations must require a first-use reset. Any invitation sent beyond a controlled administrator handoff must use one-time, hashed, expiry-bound tokens. | Release gate |
| TR-SEC-005 | Sessions must have a bounded lifetime and support immediate invalidation after relevant password, active-status, role, or scope changes. Token-version checks must not disclose account state. | Current foundation |
| TR-SEC-006 | Every protected API read and write must enforce, on the server, the intersection of active status, canonical role, approved capability, and resource scope (city, park, group, and/or self/guardian link). A missing required scope must deny access. | Current foundation |
| TR-SEC-007 | Role-capability configuration must use reviewed capability codes, fail closed for unknown/expired/revoked entries, and remain auditable. A capability grant or named-user exception must never override city, park, group, or self-only scope. | Current foundation |
| TR-SEC-008 | Guardian endpoints must resolve the authenticated guardian and verify the guardian-child link. Student endpoints must resolve the authenticated participant and never accept an arbitrary participant identifier as authority. | Current foundation |
| TR-SEC-009 | The present in-memory login rate limiter is not sufficient for multi-instance deployment. Before horizontally scaled or public use, login throttling must be replaced or supplemented by a shared, observable rate-limiting control. | Release gate |

## 3. Application and API behaviour

| ID | Requirement | Status |
| --- | --- | --- |
| TR-API-001 | APIs must follow explicit HTTP semantics: `401` for no valid session, `403` for role/capability/scope denial, `404` only where the caller may safely learn that a resource is absent, `400` for invalid input, and an appropriate 5xx response for unexpected server failure. | Current foundation |
| TR-API-002 | All untrusted route, query, form, import, and integration input must use bounded schemas. Validation must constrain identifiers, pagination, sorting, dates, search text, enums, file metadata, and monetary values appropriate to the operation. | Current foundation |
| TR-API-003 | List and report endpoints must use bounded pagination and filters. They must not load an unbounded population or reveal records outside the caller's permitted scope. | Current foundation |
| TR-API-004 | Mutating endpoints must use same-origin/CSRF protections appropriate to the NextAuth session model and must reject unsupported methods. | Current foundation |
| TR-API-005 | Public, staff, guardian, and Shabab responses must disclose only the minimum fields needed for the active view. Sensitive fields must never be included merely because the requesting role has access to a related record. | Current foundation |
| TR-API-006 | Imports must validate each row, identify actionable errors without exposing unnecessary personal data, preserve duplicate-handling rules, and be atomic where a partial import would leave an unusable business state. | Current foundation |
| TR-API-007 | Any external integration must use server-side credentials, scoped outbound payloads, retries/failure state where needed, and an auditable integration boundary. Browser code must not contain provider secrets. | Future/release gate |

## 4. Data integrity, privacy, and audit

| ID | Requirement | Status |
| --- | --- | --- |
| TR-DATA-001 | Cities, parks, batches, groups, participants, guardians, attendance, fees, admissions, and access records must maintain the approved hierarchy and relationship invariants. In particular, a group must link one batch and one park in the same city. | Current foundation |
| TR-DATA-002 | Person, guardian, participant, staff, and user-account records must remain distinct but explicitly linked. A guardian may have multiple linked children; family/self views must never rely on a client-supplied relationship alone. | Current foundation |
| TR-DATA-003 | High-impact workflows—access provisioning, enrolment conversion, attendance state changes, payments/receipts, stock transactions, and imports—must be transactional where partial completion could corrupt programme data. | Current foundation |
| TR-DATA-004 | Financial calculations and persistence must use exact PKR arithmetic. Receipt numbering, payment totals, refunds/adjustments, and overpayment controls must be concurrency safe and auditable. | Current foundation |
| TR-DATA-005 | Dates must be stored and compared consistently in UTC, then displayed according to the approved Asia/Karachi business convention. Date boundaries and exports must make the applied time zone explicit. | Current foundation |
| TR-DATA-006 | Medical, emergency, safeguarding, incident, consent, staff-clearance, and private-file data must not be stored or exposed until their data classification, minimum fields, role/scope access, retention, and deletion/archival rules are approved. | Future policy gate |
| TR-DATA-007 | Important access, admission, attendance, finance, procurement, and configuration mutations must create an audit event that records actor, action, time, permitted context, and safe change summary. Audit data must redact secrets and avoid duplicating unnecessary personal information. | Current foundation |
| TR-DATA-008 | User-facing reports and Excel exports must apply the same server-side scope and field-level privacy rules as on-screen views. | Current foundation |

## 5. Security headers, files, and communications

| ID | Requirement | Status |
| --- | --- | --- |
| TR-PLAT-001 | The application must emit a restrictive Content Security Policy and the configured anti-framing, content-type, referrer, permissions, DNS-prefetch, and production HSTS headers. Any CSP relaxation requires a documented need and security review. | Current foundation |
| TR-PLAT-002 | Private uploads must not be enabled until approved private storage is available. Access must use authorisation-checked/signed delivery, object ownership/purpose metadata, type/size validation, malware scanning where applicable, and retention rules. | Release gate |
| TR-PLAT-003 | Notifications must be an authenticated, privacy-minimised outbox with channel-specific metadata validation. It must never store credentials, password-reset URLs, token material, hashes, or unnecessary duplicate content. | Current foundation |
| TR-PLAT-004 | Email, WhatsApp, SMS, or other external delivery must remain a separately configured provider integration with consent/eligibility checks, templates, attempt and failure recording, and delivery reconciliation. It must not depend on an unauthenticated real-time service. | Release gate |
| TR-PLAT-005 | Messaging, community features, adult-to-minor communication, and media sharing must remain disabled until participant-combination rules, consent, moderation, reporting, blocking, retention, staff oversight, and safeguarding escalation are implemented and accepted. | Future policy gate |

## 6. Mobile, offline, accessibility, and resilience

| ID | Requirement | Status |
| --- | --- | --- |
| TR-UX-001 | Role workspaces and core operational forms must remain usable on common mobile widths as well as desktop. Content, actions, scope indicators, loading, empty, validation, denial, and failure states must be clear. | Current foundation |
| TR-UX-002 | Attendance must support authorised offline operation using the established local queue. The user must see queue depth, last successful sync, failed items, conflicts, and the next recovery action. | Current foundation |
| TR-UX-003 | The latest local mutation for a session/person must be queued safely, successful sync must clear the queue item, and failed or conflicting mutations must remain recoverable rather than being silently discarded. Server rules remain authoritative for close, reopen, edit, and correction rights. | Current foundation |
| TR-UX-004 | The PWA/service-worker path must not cache or expose another user's private data after logout, account invalidation, role/scope changes, or device handover. | Release gate |
| TR-UX-005 | UI controls must provide keyboard focus visibility, accessible labels, semantic status feedback, and sufficient readable contrast. New screens must not depend solely on colour to convey attendance, financial, or security state. | Current foundation |

## 7. Operations, environments, and deployment

| ID | Requirement | Status |
| --- | --- | --- |
| TR-OPS-001 | Local development, shared staging, and pilot production must use separate configuration and data. Local development may use only synthetic or sanitised data; pilot production may use only owner-approved minimum real data. | Release gate |
| TR-OPS-002 | Application start must fail safely if the production authentication secret is absent, placeholder, or too weak. Environment files and live connection strings must remain untracked and undisclosed. | Current foundation |
| TR-OPS-003 | Database migrations must be reviewed, versioned, and rehearsed on staging. Deployments must not automatically apply migrations to a shared/pilot database. A migration change must document data, downtime, compatibility, and rollback impact. | Release gate |
| TR-OPS-004 | Before pilot release, PostgreSQL backup and non-destructive restore evidence, storage access checks, monitoring, quota checks, operational smoke tests, incident contacts, and a rollback procedure must be documented and exercised. | Release gate |
| TR-OPS-005 | Production dependencies must be monitored for high/critical known vulnerabilities. Remediation must be compatible with the application and verified rather than applied blindly. | Current foundation |
| TR-OPS-006 | Application logs, monitoring, error reports, and support artefacts must not expose passwords, secrets, full sensitive forms, unnecessary identifiers, or private file URLs. | Release gate |

## 8. Verification and release quality

| ID | Requirement | Status |
| --- | --- | --- |
| TR-VER-001 | Every substantive change must run focused tests while it is developed, then `npm run lint` and `npm run typecheck`. Routing, schema, configuration, and deployment changes must also run the appropriate build, including `npm run build:postgres` when PostgreSQL compatibility is affected. | Current foundation |
| TR-VER-002 | Automated tests must cover success, unauthenticated, wrong-role, and wrong-scope paths for each protected API or workflow. New capability gates and access changes must include negative tests. | Current foundation |
| TR-VER-003 | CI must install locked dependencies, generate Prisma, lint, typecheck, run tests, build, audit production dependencies, and reject tracked environment/database-sensitive files. | Current foundation |
| TR-VER-004 | Role-based browser UAT must include the eight supported roles, direct-URL denial checks, empty/error states, mobile use, and state-changing operations where applicable. Browser UAT must use controlled staging data and avoid recording credentials in evidence. | Release gate |
| TR-VER-005 | Before a restricted pilot, the release candidate must have evidence for database validation/generation, relevant builds, security/authorisation checks, role UAT, offline attendance, export privacy, backup/restore, deployment configuration, monitoring, and rollback. | Release gate |

## 9. Technical acceptance criteria

A change or release satisfies this document only when:

1. the approved business workflow persists correct data without silent loss;
2. server-side authorisation denies missing, wrong-role, and wrong-scope access;
3. sensitive values are minimised in responses, logs, audits, exports, and
   browser storage;
4. the expected mobile and offline behaviour works and offers recovery from
   failure;
5. both SQLite and PostgreSQL remain aligned where the change applies to both;
6. the required automated checks and role/UAT evidence are current; and
7. data, security, operational, deployment, and rollback impacts are recorded
   before release.

## 10. Source and maintenance notes

This document is based on the [Master Blueprint](CODEX_SHABAB360_MASTER_BLUEPRINT.md),
[User-Perspective Requirements](USER_PERSPECTIVE_REQUIREMENTS.md), current
Next.js/NextAuth/Prisma configuration, and the repository CI workflow. Current
code and fresh verification evidence outrank legacy documents when they differ.

Update this document when the platform architecture, authentication approach,
database strategy, security controls, integration model, release process, or
operational risk decision changes.
