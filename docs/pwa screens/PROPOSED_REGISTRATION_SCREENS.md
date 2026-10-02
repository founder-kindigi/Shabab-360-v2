# Proposed Designs: Registration Form Builder & Public Forms

As indicated in `MTI-01-GEMINI-PENDING.md`, exact new visual screenshots are still pending. Astra reviewed this **screen structure and API mapping** on 2026-09-29. Implement with established Shabab components and styling; this document does not approve a new visual theme or a live publication.

## 1. Portal: Form List (Staff View)
**Path:** `/admin/registration-forms` or `/city/registration-forms` (scoped)
**Layout:** Standard Shabab data table/list layout.
- **Header:** "Registration Forms" + "Create New" primary button.
- **List/Table columns:** Title, owning city, Status (Draft, Published, Closed), Actions. The current list API does not return submission counts or last-updated time; do not fabricate them. A per-form submission count is available from its paginated submissions endpoint.
- **Empty State:** "No registration forms found." with a "Create your first form" CTA.

## 2. Portal: Create / Edit Form Draft
**Path:** `/admin/registration-forms/new` and `/admin/registration-forms/[id]/edit`
**Layout:** Multi-step wizard or tabbed interface to manage complexity.

**Tabs:**
1. **General:** Slug and active operational owning city on creation, blank or Atfal-style starter choice, Title, Intro Text, Success Text, Registration Window (Start/End Date). Slug and owning city are not editable through the current PATCH API.
2. **Rules & Fees:** Eligibility text, Fee text, optional minimum age with a required number-field mapping, and optional allowed gender values with a required single-choice-field mapping. Fee text describes the policy; this API does not collect payment.
3. **Questions (Builder):**
   - Drag-and-drop or ordered list of fields.
   - For each field: stable unique key, Label, Type (Short text, Long text, Phone, Number, Single choice, City), help text, Options (if choice), Required toggle, optional number bounds, and optional Other City free text for city fields.
   - "Add Question" button at the bottom.
4. **Consent:** Separate privacy notice and contact-consent text. Both are required before publication.

**Actions (Sticky Footer):**
- "Save Draft"
- "Preview"
- "Publish" (only available if validation passes, triggers a confirm dialog)
- "Close" for a published form. Publishing a revised draft creates a new immutable public version; editing a draft alone does not change the live form. Show the public link only after successful publication.
- Save, publish and close must send the current `version`; a stale version shows an explicit reload-and-review state. Draft preview uses local unsaved configuration, clearly marked as a preview.

## 3. Portal: Form Submissions & Detail
**Path:** `/admin/registration-forms/[id]/submissions` and `/admin/registration-forms/[id]/submissions/[sub_id]`
**Layout:**
- **List:** Paginated table of submissions. Columns: Date, receipt reference, Status and published form version. The API currently records `submitted` only; do not imply a review workflow or actions.
- **Detail:** Read-only view of the applicant's answers using the original published revision's field labels. Keep this authorized data out of browser storage and analytics.

## 4. Public Form: Landing & Questions
**Path:** `/register/forms/[slug]`
**Layout:** Mobile-first, card-based layout matching Shabab's design system.

- **Header:** Form Title.
- **Intro Card:** Intro text, Eligibility, and Fee text clearly highlighted.
- **Questions:** Rendered sequentially or all-on-one-page depending on length.
  - Standard inputs for text, number, phone.
  - Dropdown/Radio for Single Choice.
  - City dropdown (with "Other City" showing a free-text input conditionally).
- **Footer:** "Review & Continue" button.

## 5. Public Form: Review, Consent & Success
**Layout:**
- **Review:** Read-only summary of all provided answers. "Edit" button next to each section.
- **Consent:** Display the configured privacy notice and separate contact-consent text beside an unchecked required acknowledgment. Send `consent: true` only after acknowledgment.
- **Submit Action:** "Submit Application" button. Disables and shows loading spinner on click.
- **Success State:** Replaces form content. Shows the configured Success Text and returned random `REG-...` reference. The receipt is not a UUID or a public status-lookup token. Instruct the user to save it.

## 6. Error & Edge States
- **Closed Form:** "This registration form is no longer accepting submissions."
- **Invalid Link:** "Form not found. Please check the link and try again."
- **Conflict (409):** Distinguish a changed/closed public form from a reused request key with different answers. Reload the latest form only when the published version changed; preserve entered answers in memory for review. A closed form cannot submit.
- **Network Retry:** Submissions will use a consistent `requestKey` to allow safe retries if the network drops.
- **Other errors:** Show scoped access denial on staff screens, invalid field answers, temporary server failure and 429 busy/rate-limit responses. Keep answers in memory during a retry; do not claim offline success.
