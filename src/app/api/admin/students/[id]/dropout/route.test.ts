import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { formatPKT } from "@/lib/timezone";

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
const dropoutParticipant = { ...participant, state: "dropout", dropoutAt: new Date("2026-08-01T00:00:00.000Z"), dropoutSource: "manual" };
const rejoin = { action: "reactivate", reason: "Participant has formally rejoined", effectiveDate: "2026-08-20" };

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

  it("reactivates with an approved rejoin date while keeping the interruption start", async () => {
    mocks.participantFindUnique.mockResolvedValue(dropoutParticipant);
    const tx = {
      participant: { update: vi.fn().mockResolvedValue({ ...dropoutParticipant, state: "active", reactivatedAt: new Date("2026-08-20T00:00:00.000Z") }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation((callback) => callback(tx));

    const response = await post(rejoin);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ participantId, state: "active" });
    const data = tx.participant.update.mock.calls[0][0].data;
    expect(data.state).toBe("active");
    expect(data.reactivatedAt).toBeInstanceOf(Date);
    expect(formatPKT(data.reactivatedAt, "yyyy-MM-dd")).toBe("2026-08-20");
    expect(data).not.toHaveProperty("dropoutAt");
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
    const audit = tx.auditLog.create.mock.calls[0][0].data;
    expect(audit.action).toBe("student.reactivate");
    expect(JSON.parse(audit.newValues)).toMatchObject({ state: "active", reactivatedAt: expect.any(String) });
  });

  it("denies a reactivation without a rejoin date", async () => {
    mocks.participantFindUnique.mockResolvedValue(dropoutParticipant);
    const response = await post({ action: "reactivate", reason: "Participant has formally rejoined" });
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies a rejoin date before the recorded dropout date", async () => {
    mocks.participantFindUnique.mockResolvedValue(dropoutParticipant);
    const response = await post({ ...rejoin, effectiveDate: "2026-07-15" });
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies a rejoin date in the future", async () => {
    mocks.participantFindUnique.mockResolvedValue(dropoutParticipant);
    const response = await post({ ...rejoin, effectiveDate: "2099-01-01" });
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies a reactivation when the dropout date is missing", async () => {
    mocks.participantFindUnique.mockResolvedValue({ ...participant, state: "dropout", dropoutAt: null });
    const response = await post(rejoin);
    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
