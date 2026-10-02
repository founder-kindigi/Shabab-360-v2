# C1 Events functional browser check

Recorded 2026-09-12 during C1. Outcome: **F10 reproduced; no fix verified.**

The local harness `scripts/delivery/c1-browser.mjs` bundled the actual immutable v2 `src/components/modules/admin/mobile-events-page.tsx` with React and React Query. Source identity is recorded in C1_SOURCE_INDEX.json and the C0 manifest. Generated files were confined to the new external `D:\iBuild\Shabab-360-c0-20260911\c1-browser` scratch directory. The preserved candidate was read-only.

The Codex in-app browser opened `http://127.0.0.1:4319/?scenario=array`, then the `empty` and `denied` scenarios. The session boundary supplied a synthetic `city_head`; the local server supplied synthetic `/api/admin/events` responses. C1_BROWSER_REQUESTS.json retains the three request/response records. Browser DOM observations were:

| Scenario | HTTP response | Viewport | Observed component result |
| --- | --- | --- | --- |
| array | 200, one event titled C1 SYNTHETIC API EVENT | 1280 × 720 | API event absent; three sample events displayed with DB Live label |
| empty | 200, empty array | 1280 × 720 | Same three samples; no truthful empty state |
| denied | 403, synthetic error object | 1280 × 720 | Same three samples; no denied/error state |
| denied, narrow viewport | Same denied scenario | 390 × 844 | Same three samples and DB Live label |

The observed sample titles were Youth Agility & Survival Camp 2026, Inter-Park Football Championship, and Annual Murabbi Leadership Retreat, with displayed counts 48, 96 and 32. The array response shape mismatch and unconditional sample fallback explain these observations; see C1_FINDINGS.md F10. The browser tab was closed and the loopback server was stopped after inspection.

Limits: functional component preview only. Session/API boundaries were synthetic; no production login, real role resolution, database persistence, compiled application routing, service worker, complete stylesheet or exact visual parity was tested. Only denied state was checked at the narrow viewport. DOM observations were inspected during the run; screenshots and a replayable browser assertion trace were not captured. The request log independently records supplied responses, not rendered DOM. This evidence neither verifies a correction nor approves replacing the established mobile design.
