import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn(), requireCapability: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({ db: {} }));

import { GET } from "./route";

describe("GET /api/park/roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "staff-1", role: "park_admin" } });
  });
  it("denies roster access before querying member data", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/park/roster"));
    expect(response.status).toBe(403);
  });
});
