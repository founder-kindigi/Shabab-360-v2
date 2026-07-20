import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn(), requireCapability: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({ db: {} }));

import { GET, POST } from "./route";

describe("/api/park/participants capability access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "staff-1", role: "park_admin" } });
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  });
  it("denies participant listing without people.view", async () => {
    const response = await GET(new NextRequest("http://localhost/api/park/participants"));
    expect(response.status).toBe(403);
  });
  it("denies participant creation without students.manage", async () => {
    const response = await POST(new NextRequest("http://localhost/api/park/participants", { method: "POST" }));
    expect(response.status).toBe(403);
  });
});
