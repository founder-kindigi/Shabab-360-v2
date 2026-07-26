# Project Structure

This guide defines where new Shabab 360 work belongs. It is a repository
hygiene guide, not a replacement for the master product blueprint.

## Authority And Working Rules

1. [CODEX_SHABAB360_MASTER_BLUEPRINT.md](CODEX_SHABAB360_MASTER_BLUEPRINT.md)
   is the product and delivery authority.
2. [.agents/memory/current.md](../.agents/memory/current.md) records only
   verified durable state and active blockers.
3. [CONTRIBUTING.md](../CONTRIBUTING.md) defines the shared developer workflow.
4. Current code and fresh test or browser evidence win when older documents
   disagree.
5. Capability checks never replace server-derived city, park, or group scope.

## Application Layout

| Location | Owns |
| --- | --- |
| `src/app/` | Next.js pages, layouts, and route handlers. Keep page-specific clients adjacent using `_client.tsx` where needed. |
| `src/app/api/` | HTTP contracts only. Authenticate, validate bounded input, derive scope server-side, call domain helpers, and return safe responses. |
| `src/components/ui/` | Reusable design-system primitives. No feature data fetching or authorization decisions. |
| `src/components/shared/` | Reusable application-level presentation components. |
| `src/components/modules/<domain>/` | Domain-specific screens and components such as attendance, calling, events, or student profiles. |
| `src/lib/<domain>/` | Server-safe domain rules, schemas, scope helpers, and testable business logic. Do not create duplicate capability or scope logic in routes. |
| `src/hooks/` | Reusable client hooks. |
| `src/stores/` | Client state only; never authorization truth. |
| `src/types/` | Shared TypeScript types that do not belong to one domain. |
| `src/__tests__/` | Cross-module API, governance, integration, UAT-support, and release verification tests. Co-locate focused route/component tests with the code they protect when that is the established local pattern. |

## Data And Configuration Layout

| Location | Owns |
| --- | --- |
| `prisma/schema.prisma` | Local SQLite schema. |
| `prisma/postgres/schema.prisma` | Staged PostgreSQL schema. Keep shared model changes aligned. |
| `prisma/*/migrations/` | Forward, committed migrations only. Never edit generated Prisma clients. |
| `scripts/` | Guarded operational scripts and non-writing dry runs. Scripts that can write must be explicit, environment-bound, and documented. |
| `public/` | Deliberate public runtime assets only. Never put source workbooks, QA captures, exports, or private uploads here. |

## Documentation Layout

| Location | Owns |
| --- | --- |
| `docs/product-discovery/` | Product research, module contracts, design decisions, and implementation plans. |
| `docs/reviews/` | Code review, QA reports, release readiness, and UAT evidence indexes. |
| `docs/modules/` | Stable module reference documents when maintained. |
| `docs/reference/` | External/reference material that informs the project but does not define current behavior. |
| `worklog.md` | Historical chronology only. Do not use as planning authority. |

New screenshots and browser evidence belong under a dated folder inside
`docs/reviews/`, with no personal data or credentials. Root-level `qa-*.png`
and `upload/` files are legacy captures; do not add new files there.

## Clean-Code Boundaries

- Keep route handlers thin. Put reusable validation, authorization predicates,
  transformations, and transaction logic in the owning `src/lib/<domain>/`.
- Use strict, bounded Zod schemas at API boundaries. Client input can only
  narrow a server-derived scope.
- Keep fixed capability codes in the central catalogue. Super Admin may change
  approved defaults and overrides, but no free-text capability can become an
  authorization gate.
- Add success, authorization-denial, malformed-input, and integrity regression
  tests with each substantive server-side change.
- Do not move working route or component files merely for aesthetics during a
  release window. Refactors must be small, independently tested, and free of
  behavior changes.

## Release Hygiene

1. Work on a named branch or isolated worktree, never directly on `main`.
2. Keep `main` clean; do not commit local SQLite databases, logs, captures,
   `.env` files, temporary workbooks, or generated Prisma clients.
3. Validate SQLite and PostgreSQL schemas for shared data-model changes.
4. Run focused tests while iterating, then full release gates before merging.
5. Browser UAT at the required role and mobile viewports remains mandatory for
   release acceptance.
