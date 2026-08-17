import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  participantFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({ db: {
  participant: { findUnique: mocks.participantFindUnique },
  $transaction: mocks.transaction,
} }));

import { GET, POST } from "./route";

const participantId = "ckggggggggggggggggggggggg";
const participant = {
  id: participantId,
  state: "active",
  dropoutAt: null,
  dropoutReason: null,
  dropoutSource: null,
  reactivatedAt: null,
  groupId: "group-1",
  group: { batch: { cityId: "city-1", parkId: "park-1", park: { cityId: "city-1" } } },
};
const post = (body: unknown) => POST(new Request("http://localhost", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
}), { params: Promise.resolve({ id: participantId }) });

describe("participant dropout lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1", role: "city_head" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "user-1", role: "city_head" } });
    mocks.requireResourceScope.mockReturnValue(null);
    mocks.participantFindUnique.mockResolvedValue(participant);
  });

  it("returns the current status without exposing unrelated participant data", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: participantId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ participantId, state: "active" }));
  });

  it("denies foreign-scope mutations before a transaction", async () => {
    mocks.requireResourceScope.mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    expect((await post({ action: "dropout", reason: "Confirmed manual withdrawal" })).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects malformed or short-reason requests", async () => {
    expect((await post({ action: "dropout", reason: "short", unexpected: true })).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("persists manual dropout and its sanitized audit atomically", async () => {
    const tx = {
      participant: { update: vi.fn().mockResolvedValue({ ...participant, state: "dropout", dropoutAt: new Date("2026-08-17"), dropoutSource: "manual" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    const response = await post({ action: "dropout", reason: "Confirmed manual withdrawal", effectiveDate: "2026-08-17" });
    expect(response.status).toBe(200);
    expect(tx.participant.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "dropout", dropoutSource: "manual" }) }));
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });

  it("reactivates only an existing dropout", async () => {
    mocks.participantFindUnique.mockResolvedValue({ ...participant, state: "dropout", dropoutAt: new Date("2026-08-01"), dropoutSource: "manual" });
    const tx = {
      participant: { update: vi.fn().mockResolvedValue({ ...participant, state: "active", reactivatedAt: new Date() }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));
    expect((await post({ action: "reactivate", reason: "Participant has formally rejoined" })).status).toBe(200);
    expect(tx.participant.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "active", dropoutAt: null }) }));
  });
});
