import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(), requireCapability: vi.fn(), requireResourceScope: vi.fn(),
  findUnique: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({ db: {
  attendanceEvent: { findUnique: mocks.findUnique },
  $transaction: mocks.transaction,
} }));

import { PATCH } from "./route";

const eventId = "event-1";
const request = (body: unknown) => new Request("http://localhost", {
  method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

describe("attendance reopen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role: "park_lead" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "user-1" } });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.findUnique.mockResolvedValue({
      id: eventId, groupId: "group-1", isClosed: true, closedAt: new Date(),
      group: { batch: { cityId: "city-1", parkId: "park-1", park: { cityId: "city-1" } } },
    });
  });

  it("denies a missing correction capability before reading the event", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await PATCH(request({ reason: "Correction required" }), { params: Promise.resolve({ eventId }) });
    expect(response.status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejects reopening an already-open session", async () => {
    mocks.findUnique.mockResolvedValue({
      id: eventId, groupId: "group-1", isClosed: false,
      group: { batch: { cityId: "city-1", parkId: "park-1", park: { cityId: "city-1" } } },
    });
    const response = await PATCH(request({ reason: "Correction required" }), { params: Promise.resolve({ eventId }) });
    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("reopens and audits atomically without reversing dropout decisions", async () => {
    const tx = {
      attendanceEvent: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    const response = await PATCH(request({ reason: "Correction required" }), { params: Promise.resolve({ eventId }) });
    expect(response.status).toBe(200);
    expect(tx.attendanceEvent.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: eventId, isClosed: true },
      data: { isClosed: false, closedAt: null, closedBy: null },
    }));
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });
});
