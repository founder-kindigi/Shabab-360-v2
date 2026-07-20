import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  participantFindMany: vi.fn(),
  guardianFindMany: vi.fn(),
  userFindMany: vi.fn(),
  batchFindMany: vi.fn(),
  groupFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
  isHqRole: (role: string) => role === "super_admin" || role === "program_admin",
  isStaffRole: (role: string) => ["super_admin", "program_admin", "city_head", "park_admin", "park_lead", "murabbi"].includes(role),
}));
vi.mock("@/lib/db", () => ({
  db: {
    participant: { findMany: mocks.participantFindMany },
    guardian: { findMany: mocks.guardianFindMany },
    user: { findMany: mocks.userFindMany },
    batch: { findMany: mocks.batchFindMany },
    group: { findMany: mocks.groupFindMany },
  },
}));

import { GET } from "./route";

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.participantFindMany.mockResolvedValue([]);
    mocks.guardianFindMany.mockResolvedValue([]);
    mocks.userFindMany.mockResolvedValue([]);
    mocks.batchFindMany.mockResolvedValue([]);
    mocks.groupFindMany.mockResolvedValue([]);
  });

  it("applies the assigned park to every searchable resource category", async () => {
    mocks.requireCapability.mockResolvedValue({
      user: { id: "park-admin", role: "park_admin", assignedParkId: "park-1" },
    });

    const response = await GET(new NextRequest("http://localhost/api/search?q=ahmed&limit=10"));

    expect(response.status).toBe(200);
    expect(mocks.participantFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([{ group: { batch: { parkId: "park-1" } } }]),
      }),
    }));
    expect(mocks.guardianFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([{ children: { some: { participant: { group: { batch: { parkId: "park-1" } } } } } }]),
      }),
    }));
    expect(mocks.batchFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: expect.arrayContaining([{ parkId: "park-1" }]) }),
    }));
    expect(mocks.groupFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ AND: expect.arrayContaining([{ batch: { parkId: "park-1" } }]) }),
    }));
  });

  it("rejects a signed-in non-staff account before running any search", async () => {
    mocks.requireCapability.mockResolvedValue({ user: { id: "guardian", role: "guardian" } });

    const response = await GET(new NextRequest("http://localhost/api/search?q=ahmed"));

    expect(response.status).toBe(403);
    expect(mocks.participantFindMany).not.toHaveBeenCalled();
  });

  it("rejects an oversized search before querying the database", async () => {
    mocks.requireCapability.mockResolvedValue({
      user: { id: "program-admin", role: "program_admin" },
    });

    const response = await GET(new NextRequest(`http://localhost/api/search?q=${"a".repeat(101)}`));

    expect(response.status).toBe(400);
    expect(mocks.participantFindMany).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric limit before querying the database", async () => {
    mocks.requireCapability.mockResolvedValue({
      user: { id: "program-admin", role: "program_admin" },
    });

    const response = await GET(new NextRequest("http://localhost/api/search?q=ahmed&limit=all"));

    expect(response.status).toBe(400);
    expect(mocks.participantFindMany).not.toHaveBeenCalled();
  });

  it("requires people capability before running any search", async () => {
    const { NextResponse } = await import("next/server");
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await GET(new NextRequest("http://localhost/api/search?q=ahmed"));

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("people.view");
    expect(mocks.participantFindMany).not.toHaveBeenCalled();
  });
});
