# Gemini packet — ATT01 required batch dates

Work in `D:\iBuild\Shabab-360-v2`. Preserve unrelated dirty work. Read
`AGENTS.md`, `docs/delivery/tasks/ATT01.md`, and the existing batch API
contract before editing.

Scope is only:

- `src/components/modules/admin/batches-page.tsx`
- its focused test, if one exists or a new narrowly scoped test is needed
- your handoff report in `docs/delivery/reports/`

The approved API change will require a batch end date on creation. Preserve the
current visual design. In the Create Batch dialog, make **End Date** required,
keep its `min` value aligned with Start Date, prevent submit until both values
are present, and use clear field-level feedback. Existing batches that lack an
end date must remain editable so an authorized manager can add one. Do not
change APIs, schemas, packages, authentication, navigation, or unrelated UI.

Test the visible required state and exact create payload. Report changed files,
commands/exits, visual limits, and any blocked item. Do not claim deployment,
release, or backend verification.
