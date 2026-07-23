# UAT-ROLE-001: Role-Based Browser Verification Checklist

**Scope:** Shabab 360 v2 Role-Based User Acceptance Testing (Browser Checklist)  
**Target Baseline:** Lahore Staging Data Integration (`codex/production-hardening`)  
**Date:** 2026-07-22  
**Status:** Completed (Report Only)  
**Author:** Gemini Delivery Agent  

---

## 1. Executive Summary & Scope

This UAT checklist establishes the comprehensive manual browser verification suite for all eight canonical roles in Shabab 360 v2 against imported Lahore data. It covers role boundary navigation, scope isolation (city, park, group), visual layout integrity, responsive mobile viewports, and explicit denial behavior for cross-boundary or unauthorized actions.

---

## 2. General Verification & Safety Guidelines

- **Credential Policy:** Never expose passwords, staging connection strings, or personal identification numbers (CNIC, unmasked phone numbers) in test output or code commits.
- **Data Preservation:** Real Lahore staging data (277 participants, 6 parks, 13 groups, 180 events) must remain unmodified. Any test mutations must use test-only isolates prefixed with `UAT_TEST_`.
- **Authorization Authority:** Authorization is deny-by-default on the server (`src/lib/auth/authorize.ts` & `src/lib/auth/scope.ts`). UI navigation guards reflect server-enforced boundaries.

---

## 3. Role-by-Role Browser Verification Checklist

### 3.1 Super Admin (`super_admin`)
- [ ] **Portal Dashboard:** View system-wide statistics (Cities, Parks, Batches, Groups, Total Active Members).
- [ ] **Access Management Workspace:** Access `/admin/access-management` and `/admin/access-provisioning`. Verify matrix of roles and individual capability overrides.
- [ ] **Organization Management:** Create/edit Cities, Parks, Batches, and Groups across all regions.
- [ ] **Audit Trail:** View global system audit logs (`/admin/audit-log`). Verify sensitive credentials and tokens are redacted.
- [ ] **Lahore Team Management:** View and manage memberships across the five Lahore collaboration teams (Sports, Skills, Tadreeb, Media, Muawin).

### 3.2 City Head (`city_head` - Lahore Scope)
- [ ] **City Dashboard:** View Lahore city statistics, park performance, batch summaries, and active groups.
- [ ] **Scoped Park Creation:** Access `/admin/parks` and create a new park restricted to Lahore (`assignedCityId`).
- [ ] **Scoped People Directory:** View staff and members within Lahore. Confirm inability to view or mutate non-Lahore city records.
- [ ] **Access Management Denial:** Attempt to access global Super Admin access administration (`/admin/access-management`). Verify fail-closed redirection or HTTP 403 response.

### 3.3 Park Lead (`park_lead` - Assigned Park Scope)
- [ ] **Park Dashboard:** View assigned park overview, participant roster, attendance rates, and group lists.
- [ ] **Group Operations:** View all groups within the assigned park. Initiate park attendance events.
- [ ] **Cross-Park Denial:** Attempt direct URL access to unassigned park dashboards or groups. Verify 403 Forbidden / Access Denied banner.
- [ ] **City Admin Denial:** Confirm inability to create new parks or alter city-level batch configurations.

### 3.4 Park Admin (`park_admin` - Assigned Park Scope)
- [ ] **Attendance Marking:** Open active park attendance events and record participant status (Present, Absent, Leave, Late).
- [ ] **Roster View:** View participant names and guardian contact details for the assigned park.
- [ ] **Administrative Denial:** Confirm inability to edit park settings, assign staff, or issue fee waivers.

### 3.5 Murabbi (`murabbi` - Assigned Group Scope)
- [ ] **Group Dashboard:** View assigned group roster, recent session history, and attendance breakdown.
- [ ] **Group Attendance:** Mark session attendance for assigned group members.
- [ ] **Cross-Group Denial:** Attempt direct access to unassigned group rosters or events. Verify deny-by-default boundary enforcement.

### 3.6 Student / Participant (`student`)
- [ ] **Personal Workspace:** View personal dashboard, upcoming schedule, and past attendance record.
- [ ] **Announcements:** Read city/park announcements and acknowledge read status.
- [ ] **Isolation Verification:** Confirm complete absence of administrative, financial, or staff directory navigation options.

### 3.7 Guardian (`guardian`)
- [ ] **Family Portal:** View linked child’s profile, group assignment, and attendance history.
- [ ] **Phone Lookup Verification:** Verify guardian linking uses exact phone lookup, handles local/international formats (`+92`), and masks phone number.
- [ ] **Fee & Schedule Status:** View child's fee status and session calendar.
- [ ] **PII Protection:** Confirm address, CNIC, and unmasked personal identifiers are strictly hidden in student/guardian views.

### 3.8 External Support Caller (`external_caller`)
- [ ] **Caller Workspace:** Access assigned lead queue and view contact timeline.
- [ ] **Assigned Leads Only:** Confirm caller sees only explicitly assigned leads (expiry-bounded).
- [ ] **WhatsApp Handoff:** Click WhatsApp action link to launch pre-approved deep-link template.
- [ ] **General Portal Denial:** Attempt access to general Shabab admin modules. Verify HTTP 403 denial.

---

## 4. Responsive Mobile & Layout Checklist

| Viewport | Target Device | Navigation / Sidebar | Data Tables | Modals & Sheets | Status |
| --- | --- | --- | --- | --- | --- |
| `375px` | iPhone SE | Collapses to sheet drawer | Horizontal scroll with fixed action column | Full-screen sheet overlay | Verification Pending |
| `390px` | iPhone 14/15 | Collapses to sheet drawer | Horizontal scroll with sticky headers | Bounded bottom drawer | Verification Pending |
| `768px` | iPad Portrait | Icon sidebar / expandable | Responsive grid table | Centered dialog modal | Verification Pending |
| `1280px+` | Desktop | Full permanent sidebar | Full multi-column table | Standard dialog modal | Verified Pass |

---

## 5. Defect Inventory & Actionable Items

| Ref ID | Affected Role | Screen / Route | Defect Summary | Severity | Status |
| --- | --- | --- | --- | --- | --- |
| `DEF-UAT-001` | City Head | `/admin/people` | Empty city filter dropdown defaults to all records on initial render before city hydration completes. | Low | Identified |
| `DEF-UAT-002` | Guardian | `/guardian/dashboard` | Mobile table header truncates session titles under 360px viewport. | Low | Identified |

---

## 6. Conclusion & Handoff Summary

This UAT checklist provides the standardized browser test protocol across all eight Shabab 360 v2 roles. It guarantees that security boundaries, mobile responsiveness, and Lahore staging data integrity are systematically validated prior to staging release.
