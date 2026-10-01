# Architecture
- Derive organization scope server-side from active StaffMeta assignment paths (assignedCityId, assignedParkId, assignedGroupId) on every request; client query params may only narrow, never broaden scope. Confidence: 0.80
- Require HQ roles (Super Admin, Program Admin) to supply an explicit cityId (else 400); scoped actors deriving a foreign/missing city return 403. Never trust session scope as authority - always query active StaffMeta. Confidence: 0.80
- Use dynamic capability gates (server-resolved, e.g. `teams.memberships.manage`, `mashwara.manage`) instead of hard-coded role arrays, both in API authorization and UI visibility; pass capability booleans from server components to clients, never `useSession` role checks. Confidence: 0.80
- Make authorization fail closed: inactive/expired/revoked records deny access; no fallback to mock on operational failure. Confidence: 0.75
- Protect PII: mask/fingerprint sensitive data in reports and logs, expose raw details only to directly assigned/authorized users, redact sensitive fields in audits. Confidence: 0.75
- For any city-scoped list/detail, block unfiltered cross-city results; enforce boundaries before any database query. Confidence: 0.70
- Persisted entity IDs mix CUID (new Prisma rows) and UUID (legacy/reconciled Lahore rows); Zod identifier validators for persisted IDs must accept both formats (z.union([z.string().cuid(), z.string().uuid()])), never CUID-only. Confidence: 0.70
- Off-day/weekday schedule settings are global and module-agnostic (single shared batch-off-days helper); never create per-module off-day configuration. Confidence: 0.70
