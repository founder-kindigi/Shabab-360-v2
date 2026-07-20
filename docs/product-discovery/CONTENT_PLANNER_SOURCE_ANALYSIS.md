# Batch 4 Content Planner Source Analysis

**Source:** `B4_ Shabab Content Plan.xlsx`  
**Reviewed:** 2026-07-20  
**Status:** Source understood; no portal import performed.

## Workbook Structure

The workbook contains two date-based session plans with these columns:

| Workbook column | Portal meaning | Responsible collaboration team |
| --- | --- | --- |
| Week | Display sequence | Programme plan |
| Day | Display sequence | Programme plan |
| Date | Scheduled session date | Programme plan |
| Exercises | Physical preparation and drills | Sports |
| Sports | Sport or activity | Sports |
| Skills | Skill lesson and activity | Skills |
| Tadreeb | Training or Islamic-learning content | Tadreeb |
| Areas to Focus | Optional theme or focus area | Programme plan |

### `All Parks`

- 68 dated rows from 2026-05-23 to 2027-01-10.
- 18 rows contain Exercises, 15 Sports, 14 Skills, and 11 Tadreeb entries.
- Two explicit off days and 19 linked external resources.
- Many future dated rows are intentionally placeholders with no content yet.
- This should become a Lahore or Batch 4 **template plan**, not duplicated
  independently into every park.

### `State Life School`

- 25 dated rows from 2026-06-28 to 2026-12-13.
- The first four rows contain a park-specific variation; later rows are dated
  placeholders.
- This must be mapped to the exact imported park before any import. The name
  match must be reviewed, never assumed.

## Confirmed Team Relationship

- Sports owns Exercises and Sports entries.
- Skills owns Skills entries.
- Tadreeb owns Tadreeb entries.
- Media and Muawin are valid Lahore collaboration teams but have no source
  column in this workbook. Their work items and membership must come from the
  management sheet or future planning entries.
- Team membership is an additional staff responsibility only. It never changes
  a user's login role, city, park, or group authorization.

## Portal Design

1. A **content plan** belongs to a city and optionally a batch or park. A city
   template can be overridden by an approved park plan without changing the
   original template.
2. A **planned session** stores week, day, date, status (`draft`, `published`,
   `delivered`, `cancelled`), optional focus area, and source provenance.
3. Each planned session has one or more **content blocks** for Exercises,
   Sports, Skills, Tadreeb, Media, or Muawin. A block keeps the current
   narrative content intact, plus structured title, timing, materials, links,
   owner team, and delivery notes as they become available.
4. Existing Google Drive and YouTube references import as external links. They
   are not copied or publicly exposed.
5. Private uploaded documents require Supabase Storage, object-level
   authorization, file type and size validation, and an audit record. They must
   not use Vercel or public filesystem storage.
6. Team chat is staff-only. It needs explicit retention, reporting, moderation,
   and attachment policy before enabling it for Guardians or Shabab.
7. Activity planning is a team-owned work item with title, date, assignee,
   linked content block, status, notes, and optional evidence link. It is not
   attendance until the separate activity/session attendance model is approved.

## Safe Import Rules

- Import only rows containing actual content or an explicit off-day/cancelled
  marker; retain empty future rows as spreadsheet source, not portal sessions.
- Preserve raw narrative text and source worksheet/row for reconciliation.
- Treat template and park-specific rows as separate plans. Do not overwrite a
  template with a park variation.
- Run a dry run with counts and a reviewed mapping before writing staging data.
- Do not assign team members from this workbook; it contains no authoritative
  staff-team membership table.

## Owner Inputs Needed Before Import

1. Upload the team management sheet so staff can be mapped to Sports, Skills,
   Tadreeb, Media, and Muawin.
2. Confirm whether `State Life School` maps to an existing Lahore park and
   whether it is an override or an independent plan.
3. Confirm who may draft, publish, revise, and mark delivery for each team.
4. Approve the staff-only chat retention and moderation policy before chat is
   enabled.
