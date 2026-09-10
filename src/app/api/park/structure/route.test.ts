import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  db: {
    user: { create: vi.fn(), findUnique: vi.fn() },
    staffMeta: { upsert: vi.fn() },
    participant: { create: vi.fn() },
    group: { findFirst: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { POST } from "./route";

describe("POST /api/park/structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "murabbi-1", role: "murabbi" } });
  });

  it("does not provision or reassign staff from the park structure desk", async () => {
    const response = await POST(new Request("http://localhost/api/park/structure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_murabbi",
        parkId: "park-foreign",
        name: "Synthetic Target",
        email: "target@example.invalid",
        role: "Park Admin",
      }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Staff provisioning is unavailable from Park Structure. Use authorized access provisioning.",
    });
    expect(mocks.db.user.create).not.toHaveBeenCalled();
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.staffMeta.upsert).not.toHaveBeenCalled();
  });
});
