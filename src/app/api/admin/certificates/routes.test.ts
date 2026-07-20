import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  participantFindUnique: vi.fn(),
  batchFindUnique: vi.fn(),
  eventFindMany: vi.fn(),
  recordCount: vi.fn(),
  recordFindMany: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    participant: { findUnique: mocks.participantFindUnique },
    batch: { findUnique: mocks.batchFindUnique },
    attendanceEvent: { findMany: mocks.eventFindMany },
    attendanceRecord: { count: mocks.recordCount, findMany: mocks.recordFindMany },
  },
}));

import { GET as getParticipantCertificate } from "./[participantId]/route";
import { GET as getBatchCertificates } from "./batch/route";

const participantParams = { params: Promise.resolve({ participantId: "participant-1" }) };
const participantRequest = new NextRequest("http://localhost/api/admin/certificates/participant-1");
const batchRequest = new NextRequest("http://localhost/api/admin/certificates/batch?batchId=batch-1");
const park = { id: "park-1", name: "Model Town", cityId: "city-1", city: { id: "city-1", name: "Lahore" } };

describe("certificate authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({
      user: { id: "city-head-1", role: "city_head", assignedCityId: null },
    });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.participantFindUnique.mockResolvedValue({
      id: "participant-1",
      name: "Student",
      groupId: "group-1",
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
      group: {
        id: "group-1",
        name: "Group A",
        batch: { id: "batch-1", name: "Batch 4", startDate: new Date("2026-01-01T00:00:00.000Z"), endDate: null, park },
      },
    });
    mocks.batchFindUnique.mockResolvedValue({
      id: "batch-1",
      name: "Batch 4",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: null,
      park,
      groups: [],
    });
  });

  it.each([
    ["participant", () => getParticipantCertificate(participantRequest, participantParams)],
    ["batch", () => getBatchCertificates(batchRequest)],
  ])("requires reports capability before loading a %s certificate", async (_name, run) => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await run();

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith("reports.view");
    expect(mocks.participantFindUnique).not.toHaveBeenCalled();
    expect(mocks.batchFindUnique).not.toHaveBeenCalled();
  });

  it("denies a participant certificate outside resource scope", async () => {
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await getParticipantCertificate(participantRequest, participantParams);

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "city-head-1" }),
      { cityId: "city-1", parkId: "park-1", groupId: "group-1" }
    );
    expect(mocks.eventFindMany).not.toHaveBeenCalled();
  });

  it("denies a batch certificate outside resource scope", async () => {
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const response = await getBatchCertificates(batchRequest);

    expect(response.status).toBe(403);
    expect(mocks.requireResourceScope).toHaveBeenCalledWith(
      expect.objectContaining({ id: "city-head-1" }),
      { cityId: "city-1", parkId: "park-1" }
    );
    expect(mocks.eventFindMany).not.toHaveBeenCalled();
  });
});
