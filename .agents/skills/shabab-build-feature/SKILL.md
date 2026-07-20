---
name: shabab-build-feature
description: Implement or modify Shabab 360 product features safely. Use for Next.js pages, React components, API routes, role or scope authorization, Prisma models and migrations, admissions, attendance, fees, notifications, reports, offline behavior, and other end-to-end application changes in this repository. Do not use for a verification-only request.
---

# Build a Shabab 360 feature

## Establish scope

1. Read `AGENTS.md` and `.agents/memory/current.md`.
2. Inspect current code and tests in the affected area before reading large plans.
3. Read [references/context-map.md](references/context-map.md) and load only the documents relevant to the requested module or risk.
4. Confirm the outcome, roles, hierarchy scope, data ownership, failure states, and out-of-scope boundary from available evidence. Ask only when a missing decision would materially change the implementation.
5. Check the working tree and preserve unrelated changes. Re-read every target file immediately before editing.

## Implement narrowly

1. Follow nearby patterns instead of introducing a parallel architecture.
2. Enforce authentication, allowed roles, and complete resource scope on the server. Treat missing scope as denial.
3. Validate query and body inputs with bounded Zod schemas. Avoid leaking internal errors or personal data.
4. Use transactions for multi-write integrity, financial operations, and concurrency-sensitive state changes.
5. Add or update tests for the success path and meaningful authorization, validation, integrity, and regression failures.
6. For a shared data-model change, update both Prisma schemas and add a forward PostgreSQL migration. Describe data and rollback impact. Do not edit generated clients.
7. Preserve mobile and offline behavior when the affected workflow supports it.

## Verify and hand off

1. Invoke `$shabab-verify-change` with the affected files or feature area.
2. Update authoritative documentation when behavior, permissions, schema, deployment, or an owner-approved decision changes.
3. Update `.agents/memory/current.md` only for durable verified state, invariants, or blockers; keep history elsewhere.
4. Report outcome, exact scope, evidence, security/data impact, rollback considerations, and remaining risks.
