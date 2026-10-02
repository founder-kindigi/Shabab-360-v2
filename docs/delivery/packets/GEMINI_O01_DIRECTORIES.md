# Gemini packet — O01 safe directory fields

Adjust only the existing directory presentations in
`src/components/modules/admin/people-page.tsx` and
`src/components/modules/admin/students-page.tsx`. Preserve their current
visual design; no new layout, desktop/tablet behavior, API, or sample data.

The approved safe default now provides:

- Staff list: name, active state, role and current city/park/group. Email and
  phone are absent. Reset state is absent except for Super Admin.
- Participant list: name, active state, current group/batch/park/city and
  attendance summary. Phone, date of birth, age, education, guardian names,
  guardian phones and relations are absent.

Required work:

1. Remove or hide UI cells, filters, detail-sheet sections and client types
   that require an absent private field.
2. Keep existing loading, empty, error, denied and pagination behavior.
3. Do not infer permission from role text. Use the existing access capability
   information where an action needs permission.
4. Do not modify account invitation, reset, linking or deactivation workflows;
   they remain separately gated.
5. Add focused component tests for a safe response with all private fields
   absent. Return the actual diff and commands run.

No Gemini implementation has been dispatched; this is a prepared packet.
