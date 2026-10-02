// Main-only behavior characterization; authorization identity/capability and DB
// are synthetic, while the route, media city checks and schemas are real.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const h = vi.hoisted(() => ({ db: {}, capability: false, row: null }));
vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/lib/auth/authorize", () => ({ requireAuth: async () => ({ user: { id: "synthetic-hq", role: "program_admin" } }) }));
vi.mock("@/lib/auth/scope", () => ({ isHqRole: role => ["program_admin", "super_admin"].includes(role) }));
vi.mock("@/lib/auth/capability-access", () => ({ userHasCapability: async () => h.capability }));
import { GET, PATCH } from "@c1-media";
const context = { params: Promise.resolve({ id: "brief-a" }) };
const patch = body => PATCH(new NextRequest("http://localhost/api/admin/media/briefs/brief-a", { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } }), context);
beforeEach(() => {
  h.capability = false;
  h.row = { id: "brief-a", cityId: "city-a", version: 1, status: "draft", title: "Synthetic brief", description: "Synthetic private description", contentBlockId: null };
  Object.assign(h.db, {
    city: { findUnique: async () => ({ id: "city-a", isActive: true }) },
    staffMeta: { findUnique: async () => ({ id: "staff-a" }) },
    mediaBrief: {
      findUnique: async () => ({ ...h.row }),
      updateMany: vi.fn(async ({ data }) => { Object.assign(h.row, data, { version: h.row.version + 1 }); return { count: 1 }; }),
    },
    auditLog: { create: async () => ({ id: "audit-a" }) },
    $transaction: async fn => fn(h.db),
  });
});
describe("C1 main Media Briefs characterization", () => {
  it("denies detail reads when the actor has no media capabilities", async () => {
    expect((await GET(new NextRequest("http://localhost/api/admin/media/briefs/brief-a"), context)).status).toBe(403);
  });
  it("denies a title write without media capabilities", async () => {
    expect((await patch({ version: 1, title: "Changed" })).status).toBe(403);
    expect(h.db.mediaBrief.updateMany).not.toHaveBeenCalled();
  });
  it("exposes a version-only write and response despite absent media capabilities", async () => {
    const response = await patch({ version: 1 });
    expect(response.status).toBe(200);
    expect(h.row.version).toBe(2);
    expect(await response.json()).toMatchObject({ description: "Synthetic private description" });
  });
  it("exposes silently discarded contentBlockId on an authorized write", async () => {
    h.capability = true;
    expect((await patch({ version: 1, contentBlockId: "block-a" })).status).toBe(200);
    expect(h.row.contentBlockId).toBeNull();
    expect(h.row.version).toBe(2);
  });
});
