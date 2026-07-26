# Shabab 360 v2

Shabab 360 is a role-aware programme operations platform for city, park,
group, staff, participant, guardian, attendance, admissions, finance, and
collaboration workflows.

## Start Here

| Document | Purpose |
| --- | --- |
| [Master Blueprint](docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md) | Product, scope, safety, and delivery authority. |
| [Verified Current State](.agents/memory/current.md) | Concise, evidence-backed baseline and active blockers. |
| [Project Structure](docs/PROJECT_STRUCTURE.md) | Directory ownership, placement rules, and release hygiene. |
| [Product Discovery](docs/product-discovery/README.md) | Research, contracts, and owner-decision material. |
| [Reviews](docs/reviews/) | QA, release-readiness, and review evidence. |

## Development

```text
npm run typecheck
npm run lint
npm test
npm run db:postgres:validate
npm run build:postgres
```

Run focused tests while iterating. Before a release candidate, run the full
verification set above and record browser UAT evidence separately; automated
tests never replace role and mobile workflow verification.
