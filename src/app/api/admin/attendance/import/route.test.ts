import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: "user-1", role: "super_admin" },
  }),
  isHqRole: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/db", () => ({
  db: {
    city: {
      findFirst: vi.fn().mockResolvedValue({ id: "city-1", name: "Lahore" }),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

describe("POST /api/admin/attendance/import", () => {
  it("rejects request missing file parameter", async () => {
    const req = new Request("http://localhost:3000/api/admin/attendance/import?dryRun=true", {
      method: "POST",
      body: new FormData(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Missing file parameter");
  });
});
