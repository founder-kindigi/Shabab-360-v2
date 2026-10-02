# Gemini packet — O01 mobile parks

Implement only `src/components/modules/park/mobile-parks-page.tsx` from the
mapped references `Screenshot 2026-09-04 211600.png`, `211624.png`, and
`211712.png`. Preserve the established mobile design, including the add bottom
sheet. Do not add desktop/tablet behavior, new APIs, mock data, or account
workflows.

Use these reviewed endpoints:

- `GET /api/admin/parks`: returns the actor-scoped active parks. It needs
  `organisation.view`.
- `POST /api/admin/parks`: `{ name, address?, cityId? }`; it needs
  `organisation.manage`. For HQ, a cityId is required. For a City Head, the
  server ignores cityId and uses the assigned city. Responses: 201 park, 400
  invalid input/missing HQ city, 403 unscoped, 404 inactive/missing city, 409
  duplicate name, 503 save failure.

Required behavior:

1. Remove `REFERENCE_PARKS` and do not substitute sample cards for a loading,
   empty, denied, or failed API response.
2. Render the real scoped list. Keep the screenshot card treatment and values
   that the endpoint actually returns. Do not invent attendance or murabbi
   counts if they are unavailable.
3. Preserve entered name/address and keep the sheet open on a failed POST;
   show a concise inline error. Close/reset only after 201, then refetch.
4. Hide or disable Add when the user lacks `organisation.manage`; do not infer
   permission from a display role label.
5. Add focused component tests for loading, empty, failure, denied and
   successful create/reload states. Return the actual diff and commands run.

No application change has been made by Gemini yet; this is a prepared packet.
