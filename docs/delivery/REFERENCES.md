# Reference intake

Inspected 2026-09-11. [Machine inventory](REFERENCE_INVENTORY.json) records SHA-256 identities, image dimensions, workbook format, worksheet indices and recognized header locations. No private source rows were copied into this document.

## Screens

There are 34 PNG files. Seven were visually sampled during planning; full view-by-view classification is BASE-01 work. Some images are data/reference screenshots rather than UI designs.

| Filename suffix (2026-09-04) | Observed reference |
| --- | --- |
| 211139 | Home, purple-to-red brand header, analytics cards and fixed bottom navigation |
| 211423 | Spreadsheet roster reference; not a product screen |
| 211600 | Parks list, batch selection, central store and park cards |
| 211712 | Add park bottom sheet |
| 212239 | Edit Murabbi sheet with role/assistant fields |
| 212643 | Add lesson sheet with date, category and resource input |
| 212955 | Analysis range filters and park summaries |

Gemini must receive exact image filenames for each active view, not just the directory. Inspect remaining images only as needed for intake/module work, then record their mapping. Real-looking names/contacts in references are not fixtures to copy into tests or bundles. Do not treat the prior restoration gallery as the new visual authority where these owner-supplied screens differ.

## Source workbooks

| Workbook | Worksheets | Initial mapping direction |
| --- | ---: | --- |
| B4_ Shabab Content Plan (2).xlsx | 2 | Replacement content source: programme weeks/dates/content → existing content plans, sessions and blocks; inspect full headings and merged layout |
| Batch 2 _ Profiles (1).xlsx | 2 | Student/guardian/phone/school/address fields → reviewed people/profile mappings; preserve historical batch membership and avoid name-only merging |
| Murabbi Training Lahore.xlsx | 1 | Training operations/content reference → staff training plans and completion; inspect full layout before choosing model fields |
| Calls for Phase 2 (1).xlsx | 38 | Applicant/contact/scope/call responses → shared applications, campaigns, assignments/interactions; distinguish repeated source rows, operational tabs and summaries |
| RegistrationRequests-06-08-2026.xls | 1 | Applicant/guardian/contact/batch/city/group fields → applications and reviewed identity links |
| Shabab_Batch_4_Attendance (1).xlsx | 13 | Roster identity, park/group, date/day/status → participants, groups, events and attendance; inspect schedule/summary tabs |

All six contain OOXML/XLSX content (57 worksheets), including the file named `.xls`. The parser should detect content. Stored row counts include blank/formatted rows and are not person/registration totals. Header recognition in the inventory is partial, not a complete field map or data-quality result. Full mappings, duplicate analysis and reconciliation belong to the relevant tasks.

The content-plan replacement and two additional workbooks appeared during planning. Their changes were preserved and the inventory refreshed; the removed `(1)` content-plan file was not restored.

## Current gaps to verify

- Community posts/polls routes are explicit unavailable gates (`src/app/api/community/`). No complete messaging route family was found in the initial path scan; confirm schema/UI/branch parity before declaring a complete absence.
- Notifications has multiple APIs and consumers. `src/app/api/notifications/feed/route.ts` builds announcement items with `read: false`; `src/app/api/notifications/route.ts` derives unread count from returned announcements. Trace read/history/outbox behavior together before changing contracts. These are source observations, not a fresh end-to-end diagnosis of the owner's deployed issue.
- Existing catalogue statuses predate substantial implementation. Refresh status from source and behavior, preserving work already verified.
