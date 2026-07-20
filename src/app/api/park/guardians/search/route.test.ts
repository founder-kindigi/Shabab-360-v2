import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn(), requireCapability: vi.fn(), guardianFindFirst: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({ db: { guardian: { findFirst: mocks.guardianFindFirst } } }));

import { GET } from "./route";

describe("GET /api/park/guardians/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "staff-1", role: "park_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
  });
  it("denies guardian search before querying personal data", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/park/guardians/search?phone=030"));
    expect(response.status).toBe(403);
  });

  it("rejects partial phone searches before querying guardians", async () => {
    const response = await GET(new NextRequest("http://localhost/api/park/guardians/search?phone=030"));
    expect(response.status).toBe(400);
    expect(mocks.guardianFindFirst).not.toHaveBeenCalled();
  });

  it("uses exact normalized candidates and returns minimal masked data", async () => {
    mocks.guardianFindFirst.mockResolvedValue({
      id: "guardian-1",
      name: "Guardian One",
      phone: "03001234567",
    });

    const response = await GET(new NextRequest("http://localhost/api/park/guardians/search?phone=%2B923001234567"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.guardianFindFirst).toHaveBeenCalledWith({
      where: {
        isActive: true,
        OR: [
          { phone: "923001234567" },
          { phone: "03001234567" },
          { phone: "+923001234567" },
        ],
      },
      select: { id: true, name: true, phone: true },
    });
    expect(body).toEqual({
      results: [{ id: "guardian-1", name: "Guardian One", phone: "*******4567" }],
    });
  });
});
