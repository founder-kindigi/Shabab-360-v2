import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(), requireCapability: vi.fn(),
  guardianFindMany: vi.fn(), guardianCount: vi.fn(),
}));
vi.mock("@/lib/auth/authorize", () => ({ requireRole: mocks.requireRole, requireCapability: mocks.requireCapability, requireAuth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { guardian: { findMany: mocks.guardianFindMany, count: mocks.guardianCount } },
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { GET } from "./route";

describe("GET /api/admin/guardians", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireRole.mockResolvedValue(null); });
  it("denies guardian management before querying family records", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await GET(new NextRequest("http://localhost/api/admin/guardians"));
    expect(response.status).toBe(403);
  });

  it("omits an unassigned child from the guardian projection", async () => {
    mocks.requireCapability.mockResolvedValue(null);
    mocks.guardianFindMany.mockResolvedValue([{
      id: "guardian-1", name: "Guardian", phone: "03000000000", isActive: true,
      userId: null, user: null, createdAt: new Date("2026-01-01"),
      children: [
        {
          relation: "father",
          participant: {
            id: "assigned", name: "Assigned", state: "active", attendanceRecords: [],
            group: {
              id: "group-1", name: "Group A",
              batch: { id: "batch-1", name: "Batch", park: { id: "park-1", name: "Park", city: { id: "city-1", name: "City" } } },
            },
          },
        },
        {
          relation: "father",
          participant: { id: "unassigned", name: "Unassigned", state: "active", attendanceRecords: [], group: null },
        },
      ],
    }]);
    mocks.guardianCount.mockResolvedValue(1);

    const response = await GET(new NextRequest("http://localhost/api/admin/guardians"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data[0].children.map((child: any) => child.id)).toEqual(["assigned"]);
  });
});
