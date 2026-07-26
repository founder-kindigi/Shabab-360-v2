# Code Quality Standard

**Status:** Adopt for new and materially changed code; improve existing code incrementally.

## Purpose

This guide gives contributors a shared, practical standard for Shabab 360.
It supports safe delivery, readable reviews, and future domain-by-domain
refactoring without changing working behavior merely for style.

## Core Rules

1. Make each unit do one clear job. Extract a helper only when it has a stable
   name, a focused contract, and more than one meaningful caller.
2. Prefer names that express intent. Use domain terms such as `participant`,
   `assignedParkId`, and `resolvedCityId`; avoid unexplained abbreviations and
   boolean flags with ambiguous meaning.
3. Keep route handlers thin: parse input, authenticate, authorize, call a
   feature or shared service, then serialize a safe response.
4. Keep client components focused on interaction and presentation. Do not move
   server authorization, private data filtering, or database rules to the
   browser.
5. Add comments only for non-obvious decisions, invariants, or tradeoffs. Do
   not restate code in comments.

## TypeScript And React

- Use explicit types at system boundaries: API input/output, database mapping,
  external payloads, and public component props.
- Prefer `unknown` plus bounded validation over `any` for untrusted values.
- Keep feature-specific types next to their feature. Promote a type to
  `src/types/` only when it is genuinely cross-feature.
- Prefer small, composable components. Keep business rules outside JSX where
  they can be tested independently.
- Preserve established React patterns in an existing feature. Do not introduce
  memoization or abstraction solely as a stylistic preference.

## Server Boundaries

- Validate every untrusted request body, query, and path input with a bounded
  Zod schema before data access or mutation.
- Enforce dynamic capability checks and server-derived city, park, and group
  scope on the server. Client-supplied scope may narrow a result, never expand
  it.
- Return deterministic, safe errors. Do not expose stack traces, Prisma errors,
  credentials, tokens, or unnecessary personal data.
- Use a transaction for multi-record writes, financial operations, and
  concurrency-sensitive changes. Test the relevant rollback or conflict path.
- Redact audit payloads deliberately before writing them. Do not rely on UI
  masking as a privacy control.

## Database And Migrations

- Treat Prisma schema and migration work as high-risk. Keep SQLite and
  PostgreSQL schemas aligned when a model applies to both runtimes.
- Use forward-only migrations. Do not alter an applied migration or use a
  destructive rollback as a normal recovery mechanism.
- State data impact, deployment order, and rollback/containment behavior in
  every schema-change handoff.
- Never edit generated Prisma clients.

## Testing And Verification

- Add focused tests for changed behavior: success, authorization denial, input
  failure, and any important integrity or concurrency path.
- Keep tests beside routes/components when they cover one unit; use
  `src/__tests__/integration`, `release`, or `uat` only for genuinely broader
  contracts.
- Before handoff, run the smallest relevant test suite first, then applicable
  lint and type checks. State precisely when a project-wide command cannot run
  and why.
- Use `git diff --check` and verify the changed-file list before requesting
  review.

## Review Checklist

- Is the code owned by the correct feature or shared layer?
- Are authorization and scope derived on the server and fail closed?
- Are inputs bounded and error responses safe?
- Does the change avoid duplicate sources of truth and speculative abstraction?
- Are data, privacy, migration, and rollback effects documented?
- Do tests prove the expected behavior and meaningful denials?

## Incremental Adoption

Do not reformat or relocate unrelated code in a feature change. Record a
separate refactor task when an existing area needs structural improvement, keep
public routes and exports stable, and move one tested domain at a time after
release stabilization.
