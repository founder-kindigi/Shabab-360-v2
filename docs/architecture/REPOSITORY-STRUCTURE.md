# Repository Structure And Code Ownership

**Status:** Adopt for new work; migrate existing code incrementally

## Purpose

This convention makes Shabab 360 easier for senior developers to navigate,
review, and extend without changing working behavior merely to move files.
Current code remains the source of truth until a separately reviewed migration
package moves it with focused tests.

## Current Baseline

The repository already has a sound Next.js foundation:

- `src/app/` contains App Router pages and route handlers.
- `src/components/ui/` contains reusable UI primitives.
- `src/components/layout/` contains shell and navigation components.
- `src/lib/auth/`, `src/lib/security/`, and `src/lib/validations/` contain
  cross-cutting server rules.
- `prisma/` and `prisma/postgres/` hold the aligned SQLite and PostgreSQL
  schema and migration chains.

Older modules also use `src/components/modules/` and some feature-specific
component folders. They are supported during transition and must not be moved
as incidental work.

## Target Layout

```text
src/
  app/                         # Routes, pages, layouts, route-handler adapters
  features/
    <feature>/
      components/              # Feature-owned React components
      server/                  # Services, repositories, authorization predicates
      schemas/                 # Bounded Zod request/query schemas
      hooks/                   # Feature-owned client hooks
      types.ts                 # Feature-owned TypeScript types
      __tests__/               # Cross-file feature tests when colocation is unclear
  components/
    ui/                        # Reusable design-system primitives only
    layout/                    # Application shell and navigation
    shared/                    # Reusable product components with no feature ownership
  lib/
    auth/                      # Authentication, capabilities, scope resolution
    security/                  # Cross-cutting request and response safeguards
    db/                        # Database client and shared transaction helpers
    validations/               # Cross-feature validation primitives
  hooks/                       # Cross-feature React hooks only
  stores/                      # Cross-feature client state only
  types/                       # Cross-feature types only
  __tests__/
    integration/               # Multi-feature integration tests
    release/                   # Release and deployment contract tests
    uat/                       # Automated UAT boundary tests
```

The `features/` layout is mandatory for new modules, including Media. It is a
target for existing domains, not a reason to move stable code before a release.

## Ownership Rules

### App Routes

`src/app/` owns URL composition, metadata, page composition, and thin route
handlers. A route handler may parse a request, invoke authorization and a
feature service, and serialize a response. It must not become the only place
for reusable domain rules.

### Features

Each feature owns its UI, schemas, domain services, and feature-specific types.
Feature code may depend on `components/ui`, `components/layout`, `components/shared`,
and `lib/*`. It must not import another feature's private implementation.
Share a dependency only by extracting a genuinely cross-feature primitive into
`lib/` or `components/shared/` with tests.

### Shared Libraries

`src/lib/` is reserved for cross-feature infrastructure. It is not a general
dumping ground. New files belong in `lib/` only if at least two unrelated
features need them or they implement an application-wide concern such as auth,
security, database access, audit logging, or localization.

### Components

- `components/ui`: presentational primitives with no product-domain rules.
- `components/layout`: shell, navigation, global page chrome.
- `components/shared`: reusable product patterns that remain domain-neutral.
- `features/<feature>/components`: all feature-specific UI.

Do not add new feature screens to `src/components/modules/`. That folder is a
legacy transition area and remains supported until each contained domain has a
dedicated migration package.

## Server And Security Rules

1. Route handlers enforce authentication, dynamic capabilities, and
   server-derived city, park, and group scope. Client parameters may narrow a
   result but never broaden it.
2. Validate untrusted bodies and query parameters with bounded Zod schemas at
   the route boundary.
3. Keep request-wide safeguards in `src/lib/security/` and the active
   `src/proxy.ts`; do not duplicate them across unrelated route handlers.
4. Keep Prisma models aligned in `prisma/schema.prisma` and
   `prisma/postgres/schema.prisma` when a model applies to both runtimes.
5. Never import from `prisma/generated/`; use project generation commands.

## Test Placement

- Keep a route test beside its route: `route.ts` and `route.test.ts`.
- Keep a component test beside its component when it only exercises that
  component.
- Put cross-file feature tests in `features/<feature>/__tests__/`.
- Put multi-feature, release, and UAT tests only in their existing dedicated
  `src/__tests__/` folders.
- Every security, authorization, migration, or data change needs success,
  denial, and relevant failure-path coverage.

## Documentation Taxonomy

Use the following locations for all new documents:

| Location | Purpose |
| --- | --- |
| `docs/architecture/` | Repository conventions, diagrams, and technical boundaries |
| `docs/adr/` | Short approved architecture decision records |
| `docs/runbooks/` | Operator and deployment procedures |
| `docs/verification/` | Current repeatable verification evidence |
| `docs/product-discovery/` | Product contracts, proposals, and implementation plans |
| `docs/reviews/` | Time-bound audit and review findings |

Existing documents remain where they are. New files follow this taxonomy;
moving historical material requires a dedicated documentation-only change.

## Adoption Plan

### Phase 1: Now

- Follow this layout for all new modules and material feature additions.
- Keep existing imports and public paths unchanged.
- Add this document to code-review expectations.

### Phase 2: After Release Stabilization

- Migrate one stable domain at a time, beginning with a small isolated module.
- Preserve route URLs and component exports during each migration.
- Require focused tests, lint, typecheck, and a no-behavior-change review.

### Phase 3: Cleanup

- Retire `src/components/modules/` only after its domains have moved.
- Consolidate duplicate helpers only after callers and behavior are proven
  equivalent.

## Review Checklist

- Is the code owned by the correct feature or shared layer?
- Does the route remain a thin adapter around validated, authorized domain code?
- Are imports one-directional: app -> feature -> shared libraries?
- Are tests colocated unless they are genuinely cross-feature or release-wide?
- Does the change preserve dynamic capability checks and server-derived scope?
- Are schema, migration, deployment, and personal-data impacts stated?
