# HIER-003: City-Batch / Park-Group Browser UAT Plan

**Task:** HIER-003
**Owner:** Gemini
**Status:** Revised — ready for Codex review
**Created:** 2026-07-21
**Scope:** Manual browser UAT scenarios for the city-owned Batch and park-specific Group hierarchy model. No code changes.

---

## 1. Purpose

This document defines the manual browser UAT scenarios required to verify the city-owned Batch and park-specific Group hierarchy after the Codex-approved hierarchy migration deployed to staging. The hierarchy rule to preserve is:

> **Batch belongs to City; Group belongs to exactly one Batch and one Park in that same City.**

Every scenario must be verified against the Lahore staging data (1 city, 6 parks, 6 batches, 13 groups) and any additional test cities/parks created during UAT. The plan covers five staff roles: Super Admin, City Head, Park Lead, Park Admin, and Murabbi.

---

## 2. Preconditions

### 2.1 Staging Environment

- Codex-approved hierarchy migration deployed to staging.
- The Lahore import data is present and reconciled (1 city, 6 parks, 6 batches, 13 groups, 277 participants, 180 events, 2,967 attendance records).
- A second test city ("Islamabad" / code `ISB`) exists or can be created for cross-city denial testing.

### 2.2 Test Accounts

All test accounts must be provisioned by Super Admin before UAT begins. No passwords are shared in this document.

| # | Role | Alias | Assigned Scope | Purpose |
| --- | --- | --- | --- | --- |
| 1 | `super_admin` | SA-1 | Global | Full CRUD, cross-city verification |
| 2 | `program_admin` | PA-1 | Global (HQ) | National view and CRUD |
| 3 | `city_head` | CH-LHR | Lahore city | City-scoped CRUD within Lahore |
| 4 | `city_head` | CH-ISB | Islamabad city | Cross-city denial testing |
| 5 | `park_lead` | PL-SLS | State Life School park (Lahore) | View assigned-park groups & attendance; create/edit/delete denied |
| 6 | `park_admin` | PA-SLS | State Life School park (Lahore) | Attendance in assigned park only; Batches & Groups navigation/API denied |
| 7 | `park_lead` | PL-ISB | A park in Islamabad | Cross-park/cross-city denial |
| 8 | `murabbi` | MU-G1 | An active group in State Life School | Group-only view and attendance |
| 9 | `murabbi` | MU-NONE | No assigned group | Denial baseline |

### 2.3 Data Prerequisites

Before starting UAT, verify these records exist:

- **Lahore** city with at least 2 active parks (e.g., State Life School, Iqbal Park).
- **Islamabad** city with at least 1 park and 1 batch.
- At least 1 batch in Lahore with groups.
- At least 1 batch in Lahore with zero groups (empty-state testing).
- At least 1 inactive batch in Lahore.
- At least 1 group with zero participants (empty-state testing).
- At least 1 group with participants assigned.

---

## 3. Batch CRUD Scenarios

### 3.1 List Batches (GET `/api/admin/batches`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| B-L01 | SA-1 | Navigate to Batches page | Sees all active batches across all cities. City column shows each batch's owning city. | ☐ |
| B-L02 | PA-1 | Navigate to Batches page | Same as SA-1: sees all active batches across all cities. | ☐ |
| B-L03 | CH-LHR | Navigate to Batches page | Sees only Lahore batches. No Islamabad batches appear. City filter is either locked to Lahore or absent. | ☐ |
| B-L04 | CH-ISB | Navigate to Batches page | Sees only Islamabad batches. No Lahore batches appear. | ☐ |
| B-L05 | PL-SLS | Navigate to Batches page | Sees batches for Lahore (the city containing the assigned park). Batches outside the park's city do not appear. | ☐ |
| B-L06 | PA-SLS | Navigate to Batches page | **403 Forbidden** (or page/nav hidden; 403 API access). Park Admin is denied Batches access. Approved scope is attendance in assigned park only. | ☐ |
| B-L07 | MU-G1 | Navigate to Batches page (if accessible) | **403 Forbidden.** Murabbi is denied Batches access. | ☐ |
| B-L08 | MU-NONE | Attempt to access Batches page | **403 Forbidden.** No data is returned. | ☐ |

### 3.2 Create Batch (POST `/api/admin/batches`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| B-C01 | SA-1 | Open Create Batch dialog, select Lahore, fill valid name and start date, submit | Batch created, appears in list with city = Lahore. Toast success. | ☐ |
| B-C02 | SA-1 | Open Create Batch dialog, select Islamabad, fill valid data, submit | Batch created in Islamabad. Appears in Islamabad's batch list. | ☐ |
| B-C03 | PA-1 | Create a batch for Lahore | Succeeds. Same as SA-1. | ☐ |
| B-C04 | CH-LHR | Open Create Batch dialog | City dropdown is either pre-set to Lahore and locked, or only shows Lahore. | ☐ |
| B-C05 | CH-LHR | Submit valid batch for Lahore | Batch created in Lahore. | ☐ |
| B-C06 | CH-LHR | Attempt to create batch for Islamabad (API direct if UI prevents it) | **403 Forbidden.** The batch is not created. | ☐ |
| B-C07 | CH-ISB | Attempt to create batch for Lahore | **403 Forbidden.** | ☐ |
| B-C08 | PL-SLS | Attempt to open Create Batch dialog or POST to the API | **403 Forbidden.** Park Lead cannot create batches (batches are city-level). | ☐ |
| B-C09 | PA-SLS | Attempt to create a batch | **403 Forbidden.** Park Admin is denied Batches access. | ☐ |
| B-C10 | MU-G1 | Attempt to create a batch | **403 Forbidden.** | ☐ |

#### Validation edge cases

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| B-V01 | SA-1 | Submit Create Batch with empty name | 400 validation error, field-level error shown. | ☐ |
| B-V02 | SA-1 | Submit Create Batch with name = "A" (1 char, below min 2) | 400 validation error. | ☐ |
| B-V03 | SA-1 | Submit Create Batch with no city selected | 400 validation error. | ☐ |
| B-V04 | SA-1 | Submit Create Batch with no start date | 400 validation error. | ☐ |
| B-V05 | SA-1 | Submit Create Batch with end date before start date | **400 validation error** (end date must be after or equal to start date). | ☐ |
| B-V06 | SA-1 | Submit Create Batch with a non-existent city ID (API) | 404 "City not found". | ☐ |

### 3.3 Read/Detail Batch (GET `/api/admin/batches/[id]`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| B-R01 | SA-1 | View details of a Lahore batch | Sees batch name, city (Lahore), start/end dates, group count, status. | ☐ |
| B-R02 | CH-LHR | View details of a Lahore batch | Same as SA-1 for a Lahore batch. | ☐ |
| B-R03 | CH-LHR | Attempt to view an Islamabad batch by direct URL/API | **403 Forbidden.** | ☐ |
| B-R04 | CH-ISB | Attempt to view a Lahore batch by direct URL/API | **403 Forbidden.** | ☐ |
| B-R05 | PL-SLS | View details of a Lahore batch (their city) | Sees batch details for Lahore (the city containing the assigned park). | ☐ |
| B-R06 | PA-SLS | Attempt to view a batch by direct URL/API | **403 Forbidden.** Park Admin is denied Batches access. | ☐ |
| B-R07 | MU-G1 | Attempt to view a batch by direct API | **403 Forbidden.** | ☐ |

### 3.4 Edit Batch (PATCH `/api/admin/batches/[id]`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| B-E01 | SA-1 | Edit a Lahore batch: change name | Updated. Toast success. Audit log records the change. | ☐ |
| B-E02 | SA-1 | Edit a Lahore batch: change start date | Updated. | ☐ |
| B-E03 | SA-1 | Edit a Lahore batch: set end date | Updated. | ☐ |
| B-E04 | SA-1 | Edit a Lahore batch: clear end date | Updated. End date shows "—". | ☐ |
| B-E05 | CH-LHR | Edit a Lahore batch | Succeeds. | ☐ |
| B-E06 | CH-LHR | Attempt to edit an Islamabad batch | **403 Forbidden.** | ☐ |
| B-E07 | CH-ISB | Attempt to edit a Lahore batch | **403 Forbidden.** | ☐ |
| B-E08 | PL-SLS | Attempt to edit a batch | **403 Forbidden.** | ☐ |
| B-E09 | PA-SLS | Attempt to edit a batch | **403 Forbidden.** | ☐ |
| B-E10 | MU-G1 | Attempt to edit a batch | **403 Forbidden.** | ☐ |

### 3.5 Delete/Deactivate Batch (DELETE `/api/admin/batches/[id]`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| B-D01 | SA-1 | Delete a batch (with no groups) | Batch deactivated. Disappears from default list. Audit log created. | ☐ |
| B-D02 | SA-1 | Delete a batch (with active groups) | Batch deactivated. Verify groups also become hidden from default views. Record cascading behavior. | ☐ |
| B-D03 | CH-LHR | Delete a Lahore batch | Succeeds. | ☐ |
| B-D04 | CH-LHR | Attempt to delete an Islamabad batch | **403 Forbidden.** | ☐ |
| B-D05 | PL-SLS | Attempt to delete a batch | **403 Forbidden.** | ☐ |
| B-D06 | PA-SLS | Attempt to delete a batch | **403 Forbidden.** | ☐ |
| B-D07 | MU-G1 | Attempt to delete a batch | **403 Forbidden.** | ☐ |

---

## 4. Group CRUD Scenarios

### 4.1 List Groups (GET `/api/admin/groups`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| G-L01 | SA-1 | Navigate to Groups page, no filters | Sees all active groups across all cities. Each row shows group name, park name, city, batch, and participant count. | ☐ |
| G-L02 | SA-1 | Filter by a specific park | Only groups in that park appear. | ☐ |
| G-L03 | SA-1 | Filter by a specific batch | Only groups in that batch appear. | ☐ |
| G-L04 | SA-1 | Filter by park + batch | Only groups matching both filters appear. | ☐ |
| G-L05 | SA-1 | Search by group name | Matches appear; non-matching are hidden. | ☐ |
| G-L06 | SA-1 | Filter status = "inactive" | Only inactive groups appear. | ☐ |
| G-L07 | SA-1 | Filter status = "all" | Both active and inactive groups appear. | ☐ |
| G-L08 | CH-LHR | Navigate to Groups page | Sees only groups in Lahore parks. No Islamabad groups. | ☐ |
| G-L09 | CH-LHR | Filter by a Lahore park | Only groups in that park appear. | ☐ |
| G-L10 | CH-LHR | Attempt to filter by an Islamabad park ID (API) | Returns empty or **403**. No Islamabad data. | ☐ |
| G-L11 | CH-ISB | Navigate to Groups page | Sees only Islamabad groups. No Lahore groups. | ☐ |
| G-L12 | PL-SLS | Navigate to Groups page | Sees only groups in State Life School park. Groups from Iqbal Park or other parks do not appear. | ☐ |
| G-L13 | PA-SLS | Navigate to Groups page | **403 Forbidden** (or page/nav hidden; 403 API access). Park Admin is denied Groups access. Approved scope is attendance in assigned park only. | ☐ |
| G-L14 | MU-G1 | Navigate to Groups page | Sees only the assigned group. No other groups. | ☐ |
| G-L15 | MU-NONE | Navigate to Groups page | **403 Forbidden** or empty result. No groups shown. | ☐ |

### 4.2 Create Group (POST `/api/admin/groups`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| G-C01 | SA-1 | Create a group: select a Lahore park, select a Lahore batch, valid name | Group created. Appears in list under the selected park and batch. | ☐ |
| G-C02 | SA-1 | Create a group: select Lahore park, Islamabad batch | **400 or 403.** The same-city invariant is violated: a group cannot link a park in one city to a batch in another. | ☐ |
| G-C03 | SA-1 | Create a group: select Islamabad park, Lahore batch | **400 or 403.** Same-city invariant violation. | ☐ |
| G-C04 | PA-1 | Create a group: Lahore park + Lahore batch | Succeeds. | ☐ |
| G-C05 | CH-LHR | Create a group in a Lahore park with a Lahore batch | Succeeds. | ☐ |
| G-C06 | CH-LHR | Attempt to create a group in an Islamabad park | **403 Forbidden.** | ☐ |
| G-C07 | CH-LHR | Attempt to create a group with an Islamabad batch (API) | **403 Forbidden** (batch.cityId ≠ assignedCityId). | ☐ |
| G-C08 | CH-ISB | Attempt to create a group in a Lahore park | **403 Forbidden.** | ☐ |
| G-C09 | PL-SLS | Attempt to create a group in their assigned park (State Life School) | **403 Forbidden.** Park Lead may view assigned-park groups; create/edit/delete is denied unless Codex later approves an explicit change. | ☐ |
| G-C10 | PL-SLS | Attempt to create a group in a different park | **403 Forbidden.** | ☐ |
| G-C11 | PA-SLS | Attempt to create a group in their assigned park | **403 Forbidden.** Park Admin is denied Groups access. Approved scope is attendance in assigned park only. | ☐ |
| G-C12 | MU-G1 | Attempt to create a group | **403 Forbidden.** Murabbis cannot create groups. | ☐ |

#### Same-City Invariant Enforcement

This is the **critical new invariant** introduced by the hierarchy migration.

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| G-INV01 | SA-1 | UI: verify that when a park is selected, the batch dropdown only shows batches belonging to the same city as the selected park | Batch list is filtered to matching city. | ☐ |
| G-INV02 | SA-1 | UI: verify that when a batch is selected, the park dropdown only shows parks belonging to the same city as the selected batch | Park list is filtered to matching city. | ☐ |
| G-INV03 | SA-1 | API: POST with `parkId` from Lahore and `batchId` from Islamabad | **400 or 403.** Server rejects the same-city violation. | ☐ |
| G-INV04 | SA-1 | API: POST with `parkId` from Islamabad and `batchId` from Lahore | **400 or 403.** Server rejects the same-city violation. | ☐ |
| G-INV05 | SA-1 | API: POST with valid same-city park and batch IDs | 201 Created. Group is created successfully. | ☐ |

#### Validation edge cases

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| G-V01 | SA-1 | Submit Create Group with empty name | 400 validation error. | ☐ |
| G-V02 | SA-1 | Submit Create Group with name = "A" (below min 2) | 400 validation error. | ☐ |
| G-V03 | SA-1 | Submit Create Group with no park selected | 400 validation error. | ☐ |
| G-V04 | SA-1 | Submit Create Group with no batch selected | 400 validation error. | ☐ |
| G-V05 | SA-1 | Submit Create Group with non-existent park ID (API) | 404 "Park not found". | ☐ |
| G-V06 | SA-1 | Submit Create Group with non-existent batch ID (API) | 404 "Batch not found". | ☐ |
| G-V07 | SA-1 | Submit Create Group with an inactive park (API) | 404 "Park not found". | ☐ |
| G-V08 | SA-1 | Submit Create Group with an inactive batch (API) | 404 "Batch not found". | ☐ |

### 4.3 Read/Detail Group (GET `/api/admin/groups/[id]`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| G-R01 | SA-1 | View a Lahore group detail | Shows group name, park (with city), batch, participant count, active status. | ☐ |
| G-R02 | CH-LHR | View a Lahore group detail | Succeeds; shows correct park and batch. | ☐ |
| G-R03 | CH-LHR | Attempt to view an Islamabad group by direct URL/API | **403 Forbidden.** | ☐ |
| G-R04 | CH-ISB | Attempt to view a Lahore group | **403 Forbidden.** | ☐ |
| G-R05 | PL-SLS | View a group in their assigned park | Succeeds. Park Lead may view assigned-park groups. | ☐ |
| G-R06 | PL-SLS | Attempt to view a group in a different Lahore park | **403 Forbidden.** | ☐ |
| G-R07 | PA-SLS | Attempt to view a group in their assigned park by URL/API | **403 Forbidden.** Park Admin is denied Groups access. Approved scope is attendance in assigned park only. | ☐ |
| G-R08 | PA-SLS | Attempt to view a group in a different park | **403 Forbidden.** | ☐ |
| G-R09 | MU-G1 | View their assigned group detail | Succeeds. | ☐ |
| G-R10 | MU-G1 | Attempt to view a different group in the same park | **403 Forbidden.** | ☐ |
| G-R11 | MU-G1 | Attempt to view a group in a different park | **403 Forbidden.** | ☐ |

### 4.4 Edit Group (PATCH `/api/admin/groups/[id]`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| G-E01 | SA-1 | Edit a group name | Updated. Audit log records the change. | ☐ |
| G-E02 | CH-LHR | Edit a Lahore group name | Succeeds. | ☐ |
| G-E03 | CH-LHR | Attempt to edit an Islamabad group | **403 Forbidden.** | ☐ |
| G-E04 | PL-SLS | Attempt to edit a group in their assigned park | **403 Forbidden.** Park Lead may view assigned-park groups; create/edit/delete is denied unless Codex later approves an explicit change. | ☐ |
| G-E05 | PL-SLS | Attempt to edit a group in a different park | **403 Forbidden.** | ☐ |
| G-E06 | PA-SLS | Attempt to edit a group in their assigned park | **403 Forbidden.** Park Admin is denied Groups access. | ☐ |
| G-E07 | MU-G1 | Attempt to edit any group | **403 Forbidden.** | ☐ |

### 4.5 Delete/Deactivate Group (DELETE `/api/admin/groups/[id]`)

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| G-D01 | SA-1 | Delete a group (with no participants) | Deactivated. Removed from default list. Audit log. | ☐ |
| G-D02 | SA-1 | Delete a group with participants | Deactivated. Verify participants are not deleted but the group is hidden. Record participant visibility behavior. | ☐ |
| G-D03 | CH-LHR | Delete a Lahore group | Succeeds. | ☐ |
| G-D04 | CH-LHR | Attempt to delete an Islamabad group | **403 Forbidden.** | ☐ |
| G-D05 | PL-SLS | Attempt to delete a group in their assigned park | **403 Forbidden.** Park Lead may view assigned-park groups; create/edit/delete is denied unless Codex later approves an explicit change. | ☐ |
| G-D06 | PA-SLS | Attempt to delete a group in their assigned park | **403 Forbidden.** Park Admin is denied Groups access. | ☐ |
| G-D07 | MU-G1 | Attempt to delete any group | **403 Forbidden.** | ☐ |

---

## 5. Park CRUD Scenarios (Hierarchy Context)

These scenarios focus on park operations relevant to the batch/group hierarchy.

### 5.1 List Parks

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| P-L01 | SA-1 | Navigate to Parks page | Sees all active parks across all cities. Group count per park is visible. | ☐ |
| P-L02 | CH-LHR | Navigate to Parks page | Sees only Lahore parks. | ☐ |
| P-L03 | CH-ISB | Navigate to Parks page | Sees only Islamabad parks. No Lahore data. | ☐ |
| P-L04 | PL-SLS | Navigate to Parks page | Sees only their assigned park (State Life School). | ☐ |

### 5.2 Create Park

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| P-C01 | SA-1 | Create park in Lahore | Succeeds. New park appears with zero groups. | ☐ |
| P-C02 | CH-LHR | Create park in Lahore | Succeeds. City is pre-set or restricted to Lahore. | ☐ |
| P-C03 | CH-LHR | Attempt to create park in Islamabad | **403 Forbidden.** | ☐ |
| P-C04 | PL-SLS | Attempt to create a park | **403 Forbidden.** | ☐ |

---

## 6. Cross-Entity Hierarchy Verification

These scenarios verify that the hierarchy invariants hold across entity boundaries.

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| H-01 | SA-1 | View a group and verify its batch's city matches its park's city | Both cityId values are identical. | ☐ |
| H-02 | SA-1 | Check every existing Lahore group via API and verify batch.cityId === park.cityId | All groups pass the same-city invariant. | ☐ |
| H-03 | SA-1 | Create a batch in Lahore, then create a group linking a Lahore park to that batch | Succeeds. Group is correctly linked. | ☐ |
| H-04 | SA-1 | Create a batch in Islamabad, attempt to create a group linking a Lahore park to that batch | **Rejected** by same-city invariant. | ☐ |
| H-05 | SA-1 | Delete/deactivate a park. Verify its groups are still accessible as deactivated records | Groups should not be orphaned. Record whether groups are automatically deactivated or remain with an inactive park. | ☐ |
| H-06 | SA-1 | Delete/deactivate a batch. Verify its groups are still accessible as deactivated records | Groups should not be orphaned. Record cascading behavior. | ☐ |
| H-07 | CH-LHR | View groups filtered by a Lahore batch, then view the same batch's detail page. Verify consistency. | Group count matches. Batch shows correct city. | ☐ |

---

## 7. Empty and Error State Scenarios

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| E-01 | SA-1 | View Batches page when a city has zero batches | Page loads. Empty state message displayed (e.g., "No batches found"). Create button is visible and functional. | ☐ |
| E-02 | SA-1 | View Groups page when a park has zero groups | Empty state message. Create button visible. | ☐ |
| E-03 | SA-1 | View Groups page when a batch has zero groups | Empty state when filtered by that batch. | ☐ |
| E-04 | SA-1 | View a batch with zero groups and open the Certificates dialog | Shows "No active participants found in this batch." | ☐ |
| E-05 | SA-1 | Attempt to access a non-existent batch ID via URL | 404 "Batch not found". | ☐ |
| E-06 | SA-1 | Attempt to access a non-existent group ID via URL | 404 "Group not found". | ☐ |
| E-07 | CH-LHR | View Batches when all Lahore batches are deactivated | Empty state. "No batches found." | ☐ |
| E-08 | MU-NONE | Access groups page with no assigned group | Empty state or "Forbidden". No error crash. | ☐ |
| E-09 | Any | Disconnect network, attempt to load Batches page | Loading state → error state with retry option. No crash. | ☐ |
| E-10 | Any | API returns 500 (simulated server error) | User-friendly error message. No raw error leaked. | ☐ |

---

## 8. Audit Log Verification

| # | Actor | Action | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| A-01 | SA-1 | Create a batch, then check audit log | Audit entry with action="create", entityType="batch", entityId=new batch ID. | ☐ |
| A-02 | SA-1 | Edit a batch name, then check audit log | Audit entry with action="update", old and new values recorded. Name change visible. No PII leaked. | ☐ |
| A-03 | SA-1 | Delete a batch, then check audit log | Audit entry with action="delete". | ☐ |
| A-04 | SA-1 | Create a group, then check audit log | Audit entry with action="create", entityType="group". | ☐ |
| A-05 | SA-1 | Edit a group, then check audit log | Audit entry with action="update". | ☐ |
| A-06 | SA-1 | Delete a group, then check audit log | Audit entry with action="delete". | ☐ |
| A-07 | CH-LHR | Perform a batch operation, verify audit shows correct actor | Audit userId matches CH-LHR's user ID. | ☐ |

---

## 9. Mobile and Responsive Checks

All scenarios below should be tested on a mobile viewport (≤ 430px width) using browser DevTools device simulation or a real mobile device.

| # | Scenario | Expected Result | Pass |
| --- | --- | --- | --- |
| M-01 | Batches page list view on mobile | Mobile-optimized card layout is used. Batch name, city, group count visible. No horizontal scrolling. | ☐ |
| M-02 | Create Batch dialog on mobile | Dialog fills screen width. All form fields are usable. Date inputs work with native mobile pickers. Submit/Cancel buttons reachable. | ☐ |
| M-03 | Edit Batch dialog on mobile | Same as M-02. | ☐ |
| M-04 | Delete Batch confirmation on mobile | Confirmation dialog is readable. Both buttons are tappable. | ☐ |
| M-05 | Groups page list view on mobile | Mobile card layout. Group name, park, batch, participant count visible. | ☐ |
| M-06 | Create Group dialog on mobile | Dropdown selectors for park and batch work on mobile. Fields don't overflow. | ☐ |
| M-07 | Groups search on mobile | Search input is accessible. Results filter correctly. Keyboard dismisses properly. | ☐ |
| M-08 | Certificates dialog on mobile | Certificate list is scrollable. Preview button works. Individual certificate renders legibly on mobile. | ☐ |
| M-09 | Navigate between Batches and Groups on mobile | Navigation is smooth. Back button works as expected. | ☐ |
| M-10 | Touch targets on action buttons (edit, delete, certificates) | All action buttons meet minimum 44×44px touch target or have adequate spacing. | ☐ |

---

## 10. Cross-City / Cross-Park Denial Matrix

This matrix summarizes the expected access control for every role across city and park boundaries.

### Batch Operations

| Operation | SA-1 | PA-1 | CH-LHR (own) | CH-LHR (other) | CH-ISB (own) | CH-ISB (other) | PL-SLS | PA-SLS | MU-G1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| List | ✅ all | ✅ all | ✅ own city | ❌ | ✅ own city | ❌ | ✅ own city | ❌ | ❌ |
| Create | ✅ any | ✅ any | ✅ own city | ❌ | ✅ own city | ❌ | ❌ | ❌ | ❌ |
| Read detail | ✅ any | ✅ any | ✅ own city | ❌ | ✅ own city | ❌ | ✅ own city | ❌ | ❌ |
| Edit | ✅ any | ✅ any | ✅ own city | ❌ | ✅ own city | ❌ | ❌ | ❌ | ❌ |
| Delete | ✅ any | ✅ any | ✅ own city | ❌ | ✅ own city | ❌ | ❌ | ❌ | ❌ |

### Group Operations

| Operation | SA-1 | PA-1 | CH-LHR (own) | CH-LHR (other) | PL-SLS (own park) | PL-SLS (other park) | PA-SLS (own park) | PA-SLS (other park) | MU-G1 (own group) | MU-G1 (other) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| List | ✅ all | ✅ all | ✅ city groups | ❌ | ✅ park groups | ❌ | ❌ | ❌ | ✅ own group | ❌ |
| Create | ✅ any | ✅ any | ✅ city parks | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read detail | ✅ any | ✅ any | ✅ city groups | ❌ | ✅ park groups | ❌ | ❌ | ❌ | ✅ own group | ❌ |
| Edit | ✅ any | ✅ any | ✅ city groups | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete | ✅ any | ✅ any | ✅ city groups | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Note:** All policies in the matrix above are deterministic. Park Lead may view assigned-park groups; group create/edit/delete is denied unless Codex later approves an explicit change. Park Admin is denied Batches and Groups navigation/API access (approved scope is attendance in assigned park only).

---

## 11. Downstream Impact Checks

After the hierarchy migration, verify that dependent features still work.

| # | Feature | Scenario | Expected Result | Pass |
| --- | --- | --- | --- | --- |
| DI-01 | Attendance events | Create an attendance event for a Lahore group | Event is linked to the group's park. Session works normally. | ☐ |
| DI-02 | Attendance events | Verify existing Lahore attendance events still reference correct groups | All 180 historical events and 2,967 records are intact and accessible. | ☐ |
| DI-03 | Participants | View a participant's group and verify the batch/city chain | Participant → Group → (Park + Batch) → City. All references are consistent. | ☐ |
| DI-04 | Fees | View fee events for a batch and verify correct city linkage | Fee events show the correct batch and city. | ☐ |
| DI-05 | Certificates | Generate a certificate for a batch and verify city/park data | Certificate data includes correct city, park, and batch names. | ☐ |
| DI-06 | Dashboard | Super Admin dashboard counts | Verify batch/group/participant counts match the staging data. | ☐ |
| DI-07 | City Head dashboard | CH-LHR dashboard | Shows correct Lahore batch, group, and participant counts. | ☐ |
| DI-08 | Park dashboard | PL-SLS dashboard | Shows correct State Life School groups and related data. | ☐ |
| DI-09 | Reports | Attendance report filtered by batch | Reports return data scoped to the selected batch's groups only. | ☐ |
| DI-10 | Admissions | Verify admission applications link to correct city/park | Applications still reference valid city and park IDs. | ☐ |

---

## 12. Test-Data Isolation and Cleanup

To preserve the integrity of production/staging data, manual browser testing must strictly isolate test records from real operational data.

### 12.1 Isolation Principles

- **Prefixed Test Records:** All test records created during UAT (cities, parks, batches, groups) must use the prefix `UAT_TEST_` or `[UAT]` (e.g., `UAT_TEST_Batch_01`, `UAT_TEST_Group_01`, `UAT_TEST_Park_01`, city code `UAT_TEST_ISB`).
- **Lahore Real Data Protection:** Existing Lahore real data (1 city, 6 parks, 6 batches, 13 groups, 277 participants, 180 events, 2,967 attendance records) must NOT be modified, edited, or deleted during UAT. Real Lahore records are strictly read-only.
- **Scoped Mutations:** All mutation scenarios (Create, Edit, Delete, Deactivate) must target only newly created `UAT_TEST_` records (including `UAT_TEST_ISB`).

### 12.2 Cleanup Procedure

- **Post-Test Cleanup:** Following completion of UAT scenarios, only test records explicitly created for UAT and carrying the `UAT_TEST_` prefix (including `UAT_TEST_ISB`) must be purged. Never purge records merely because they belong to city code `ISB`, as Islamabad may later contain real operational data.
- **Staging Reset Safeguard:** If un-prefixed Lahore data is accidentally altered, restore staging to the reconciled Lahore baseline state using the approved staging reset/import workflow.

---

## 13. Execution Checklist

| Step | Action | Done |
| --- | --- | --- |
| 1 | Verify Codex-approved hierarchy migration deployed to staging | ☐ |
| 2 | Verify test accounts are provisioned | ☐ |
| 3 | Verify Lahore data is present and reconciled | ☐ |
| 4 | Verify second test city exists | ☐ |
| 5 | Verify test-data isolation prefixes (`UAT_TEST_`) are configured | ☐ |
| 6 | Execute Section 3 (Batch CRUD) | ☐ |
| 7 | Execute Section 4 (Group CRUD) | ☐ |
| 8 | Execute Section 5 (Park Context) | ☐ |
| 9 | Execute Section 6 (Cross-Entity Hierarchy) | ☐ |
| 10 | Execute Section 7 (Empty/Error States) | ☐ |
| 11 | Execute Section 8 (Audit Log) | ☐ |
| 12 | Execute Section 9 (Mobile/Responsive) | ☐ |
| 13 | Execute Section 10 (Denial Matrix) as cross-check | ☐ |
| 14 | Execute Section 11 (Downstream Impact) | ☐ |
| 15 | Execute Section 12 (Test-Data Isolation and Cleanup) post-test teardown | ☐ |
| 16 | Record all observations and defects | ☐ |
| 17 | UAT sign-off by Codex | ☐ |

---

## 14. Defect Recording Template

For each defect found during UAT:

```
Defect ID: HIER-UAT-NNN
Scenario: (reference the scenario #)
Actor/Role:
Steps to reproduce:
Expected result:
Actual result:
Severity: P0 / P1 / P2
Screenshot/evidence:
```

---

## 15. Observations And Notes

This section is populated during UAT execution.

_(Empty — to be filled during execution.)_
