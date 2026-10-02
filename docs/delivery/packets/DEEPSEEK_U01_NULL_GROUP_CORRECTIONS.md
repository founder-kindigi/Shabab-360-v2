# DeepSeek packet — U01 null-group route corrections

Task: U01 people placement. Owner: Astra. Status: ready for DeepSeek; this
packet is not completion evidence.

## Goal

Make every listed server route safe when `Participant.groupId` is null. An
unassigned participant must never enter group attendance, park/group reporting,
or scoped operations. Central-only records may be shown only where the existing
U01 contract expressly permits it; group-derived fields must be `null` or empty.

## Allowed source files

- `src/app/api/admin/certificates/[participantId]/route.ts`
- `src/app/api/admin/guardians/[id]/detail/route.ts`
- `src/app/api/admin/home-analytics/route.ts`
- `src/app/api/admin/reports/export/route.ts`
- `src/app/api/guardian/dashboard/route.ts`
- `src/app/api/guardian/schedule/route.ts`
- `src/app/api/park/dashboard/route.ts`
- `src/app/api/park/guardians/route.ts`
- `src/app/api/park/participants/route.ts`
- `src/app/api/park/roster/route.ts`
- Closest route tests for only those files.

Do not change Prisma schemas, migrations, generated clients, package manifests,
authentication defaults, UI components, real accounts, database data, or other
working-tree files. Preserve unrelated changes.

## Required behavior

1. Certificate preparation returns the existing conflict/denial for an
   unassigned participant and never supplies a nullable group ID to an
   attendance query.
2. Guardian administrative detail denies scoped staff when any child is
   unassigned. Central staff may receive that child with `group: null`; fee
   summaries use assigned children only.
3. Home analytics, report export, park dashboard, park guardians, park
   participants, and park roster exclude unassigned participants. Add defensive
   null narrowing even when an ORM `in` filter logically excludes them.
4. Guardian dashboard and schedule retain the guardian's child, but return no
   group attendance, group schedule, park/city, or fee-event data for an
   unassigned child. Their group ID and group-derived display fields are null.
5. Do not use non-null assertions to silence checks. Use an explicit guard,
   narrow a local value, or filter with a type predicate.

## Tests

Add focused synthetic tests for meaningful affected paths: unassigned input
must produce the safe denial, conflict, exclusion, or null/empty response above.
Keep existing assigned behavior covered. No database, `.env`, provider, browser,
deployment, migration, or generated-client action is authorized.

Run the affected route tests only. Report exact changed files, test command and
exit, unrun checks, and remaining risks. Do not claim review, acceptance, merge,
or release approval.
