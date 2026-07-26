---
name: shabab-code-quality
description: Apply pragmatic clean-code and maintainability standards to Shabab 360 TypeScript, Next.js, Prisma, and Vitest changes. Use for refactoring, code review, feature work, and bug fixes.
---

# Shabab 360 Code Quality

Use this skill together with the repository working agreements. Correctness,
security, safeguarding, and scope enforcement always take priority over a
generic clean-code rule.

## Design Rules

1. Prefer a modular monolith: place domain rules in `src/lib/<domain>/`, HTTP
   adapters in `src/app/api/`, and feature UI in `src/components/modules/`.
2. Keep routes thin: authenticate, parse bounded input, derive scope on the
   server, call domain logic, return a safe response.
3. Use the smallest useful abstraction. Prefer local duplication over a shared
   helper until three real callers demonstrate the same stable rule.
4. Name booleans as predicates, functions as actions or questions, and
   constants with their unit or policy meaning.
5. Use comments only for non-obvious decisions, security constraints, or
   external behavior. Do not restate code.

## Type And Error Rules

- Treat request data as `unknown` until a bounded Zod schema validates it.
- Avoid `any`; use a concrete type, `unknown` with narrowing, or a small
  typed adapter around an unavoidable third-party boundary.
- Do not expose `err.message`, credentials, tokens, CNIC, phone, email, names,
  notes, or raw import rows in client responses or logs.
- A missing city, park, or group scope is denial, never global access.
- Capability grants and team membership never bypass hierarchy scope.

## Testing Rules

- Write tests in Arrange-Act-Assert form with one behavioural concept per test.
- Cover success, permission denial, foreign scope, malformed input, and the
  relevant not-found, conflict, or transaction failure paths.
- Keep unit tests deterministic; mock time, network, and external services.
- Add a regression test whenever correcting a security, data-integrity, or
  role-boundary defect.

## Refactoring Rules

- Do not mix a broad refactor with feature or schema behaviour changes.
- Do not split a component only to meet a line-count target. Extract only when
  the new unit has a clear responsibility and name.
- Never introduce base classes, service layers, dependency injection, or
  generic factories without demonstrated need in this codebase.
- Shared Prisma model changes require both schemas, forward migrations, and
  the matching release validation.

## Completion Gate

Run focused tests while iterating. For substantive changes run lint, typecheck,
the relevant full suite, and PostgreSQL validation/build when routes, schema,
configuration, or deployment behavior changes. Record what could not run; do
not substitute a claim for evidence.
