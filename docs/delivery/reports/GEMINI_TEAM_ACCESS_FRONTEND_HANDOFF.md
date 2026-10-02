# Team Access Frontend Corrections Handoff

## Overview
This correction addresses all Astra review findings for the initial Team Access frontend packet in `D:\iBuild\Shabab-360-v2`. The implementation strictly adheres to the approved mobile UI and bounds.

## Corrections Applied
1. **Unsafe Query Removed**: The unsafe `GET /api/admin/users?pageSize=1000` query was completely removed from the access provisioning page.
2. **Future API Contract Adopted**: The `Assists` dropdown now correctly polls the future endpoint `GET /api/admin/parks/:parkId/eligible-assistants` and accepts the response `{ data: Array<{ id, name, role }> }`.
3. **Endpoint Unready State**: When the endpoint is unavailable or errors out (since it does not exist on the backend yet), the `Assists` dropdown safely degrades. It disables the dropdown and renders the neutral message: *"Eligible assistants are unavailable until access setup is complete"*. It defaults to "None" once it is available.
4. **City Head Policy Enforcement**: `muawin` was explicitly excluded from the role list for City Heads. Only Super Admin and Program Admin can provision Muawin accounts.
5. **UI Reverted for Future Backend Contract**: In `src/components/modules/park/tabs/structure-tab.tsx`, the previously attempted edit/add fields were fully reverted. The UI correctly retains its existing mapping and leaves structural changes bound to the future API's resolved relations.
6. **Mobile Staff Directory**: Previously addressed. Kept safe mapping intact.
7. **Role Hierarchy Alignment**: `muawin` was added to `CITY_ROLES` so that nested selection correctly renders the City and Park dropdowns.

## Affected Files
* `src/components/modules/admin/access-provisioning-page.tsx`
* `src/components/modules/admin/access-provisioning-page.test.tsx`
* `src/components/modules/park/tabs/structure-tab.tsx` (reverted)

## Verification
* `npx vitest run src/components/modules/admin/access-provisioning-page.test.tsx`: **Exit code 0**
* `npx eslint src/components/modules/admin/access-provisioning-page.tsx src/components/modules/admin/access-provisioning-page.test.tsx`: **Exit code 0**
* `npx tsc --noEmit`: **Exit code 0**
* `git diff --check`: **Exit code 0**

## Blocking Dependencies
**IMPORTANT**: The frontend is NOT integrated. The client UI is complete, but it remains blocked by the server.
Integration is blocked by:
a) missing `GET /api/admin/parks/:parkId/eligible-assistants`,
b) the pending safe local database compatibility step for `staff_meta.assistsMurabbiId`,
c) the server endpoint and database gate must be completed before real assistance assignments are enabled.

Note: Backend invite support for `assistsMurabbiId` already exists in `src/app/api/admin/invite/route.ts`. The frontend will maintain its current neutral disabled state until the remaining dependencies are implemented.
