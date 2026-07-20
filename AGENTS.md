# Shabab 360 working agreements

- Treat `docs/CODEX_SHABAB360_MASTER_BLUEPRINT.md` as the planning authority. Prefer current code plus fresh evidence when documents disagree.
- Use `.agents/memory/current.md` for the concise verified baseline. Read large plans or `worklog.md` only when the task needs their history or detail.
- Preserve unrelated working-tree changes. Re-read a file immediately before editing and stop if it changed unexpectedly.
- Never expose `.env`, credentials, production data, or unnecessary personal data.
- Use `$shabab-build-feature` for feature, API, UI, authorization, or database work.
- Enforce authorization on the server. Scoped roles must be denied when required city, park, or group context is missing.
- Validate untrusted inputs with bounded schemas and cover success plus relevant denial and failure paths.
- Treat auth, payments, safeguarding, migrations, and deployment as high-risk; state data, security, and rollback impact.
- Keep SQLite `prisma/schema.prisma` and staged PostgreSQL `prisma/postgres/schema.prisma` aligned when a model change applies to both. Never edit generated Prisma clients.
- Prefer focused tests while iterating. Before claiming substantive work complete, run relevant tests plus `npm run lint` and `npm run typecheck`; run the appropriate build for routing, schema, configuration, or deployment changes.
- Do not claim completion without evidence or a precise explanation of what could not run.
- Use `$shabab-verify-change` after implementation.
- Update `.agents/memory/current.md` only for verified durable state or owner-approved decisions. Keep it concise; put history in `worklog.md` or the relevant document.
