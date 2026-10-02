import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  staffMetaFindUnique: vi.fn(),
  participantFindUnique: vi.fn(),
  parkFindUnique: vi.fn(),
  groupFindMany: vi.fn(),
  participantFindMany: vi.fn(),
  attendanceRecordFindMany: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({
  db: {
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
    participant: { findUnique: mocks.participantFindUnique, findMany: mocks.participantFindMany },
    park: { findUnique: mocks.parkFindUnique },
    group: { findMany: mocks.groupFindMany },
    attendanceRecord: { findMany: mocks.attendanceRecordFindMany },
  },
}));

import { GET, POST } from "./route";

describe("/api/park/guardians capability access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "staff-1", role: "park_admin" } });
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
  });
  it("denies guardian listing before loading family records", async () => {
    const response = await GET(new NextRequest("http://localhost/api/park/guardians"));
    expect(response.status).toBe(403);
  });
  it("denies guardian linking before parsing the request", async () => {
    const response = await POST(new NextRequest("http://localhost/api/park/guardians", { method: "POST" }));
    expect(response.status).toBe(403);
  });

  it("rejects an unassigned participant before linking a guardian", async () => {
    mocks.requireCapability.mockResolvedValue(null);
    mocks.staffMetaFindUnique.mockResolvedValue({
      assignedParkId: "park-1", assignedGroupId: "group-1", role: "park_admin",
    });
    mocks.participantFindUnique.mockResolvedValue({ id: "participant-1", groupId: null, group: null });

    const response = await POST(
      new NextRequest("http://localhost/api/park/guardians", {
        method: "POST",
        body: JSON.stringify({ guardianId: "guardian-1", participantId: "participant-1", relation: "father" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(400);
  });

  it("excludes an unassigned participant and its guardian link from the directory", async () => {
    mocks.requireCapability.mockResolvedValue(null);
    mocks.getServerSession.mockResolvedValue({ user: { id: "staff-1", role: "park_admin" } });
    mocks.staffMetaFindUnique.mockResolvedValue({ role: "park_admin", assignedParkId: "park-1", assignedGroupId: null });
    mocks.parkFindUnique.mockResolvedValue({ id: "park-1", name: "Park", city: { name: "Lahore" } });
    mocks.groupFindMany.mockResolvedValue([{ id: "g-1", name: "Group 1", batch: { name: "Batch 1" } }]);
    mocks.participantFindMany.mockResolvedValue([
      { id: "p-assigned", name: "Assigned", state: "active", groupId: "g-1", guardianLinks: [] },
      {
        id: "p-unassigned", name: "Unassigned", state: "active", groupId: null,
        guardianLinks: [{ relation: "father", guardian: { id: "guardian-x", name: "Guardian X", phone: "0300", cnic: null, address: null } }],
      },
    ]);
    mocks.attendanceRecordFindMany.mockResolvedValue([]);

    const response = await GET(new NextRequest("http://localhost/api/park/guardians"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(0);
    expect(JSON.stringify(body.data)).not.toContain("Guardian X");
  });
});
