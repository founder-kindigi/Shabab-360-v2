import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({ requireAuth: mocks.requireAuth, requireCapability: mocks.requireCapability }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/fees/fee-1/payments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/fees/[id]/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1", role: "super_admin" } });
    mocks.requireCapability.mockResolvedValue(null);
  });

  it("rejects amounts with fractions of a paisa before opening a transaction", async () => {
    const response = await POST(
      request({ participantId: "participant-1", amount: 10.001, method: "cash" }),
      { params: Promise.resolve({ id: "fee-1" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies fee management before opening a financial transaction", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await POST(request({ participantId: "participant-1", amount: 10, method: "cash" }), { params: Promise.resolve({ id: "fee-1" }) });
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a participant outside the fee event batch", async () => {
    const transaction = {
      feeEvent: {
        findUnique: vi.fn().mockResolvedValue({
          batchId: "batch-1",
          amount: 100,
          discountAmount: 0,
          batch: { name: "Batch 1", park: { name: "Park 1" } },
        }),
      },
      participant: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    mocks.transaction.mockImplementation(async (callback) => callback(transaction));

    const response = await POST(
      request({ participantId: "participant-other-batch", amount: 25, method: "cash" }),
      { params: Promise.resolve({ id: "fee-1" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: { amount: ["Participant is not active in this fee event's batch"] },
    });
    expect(transaction.participant.findFirst).toHaveBeenCalledWith({
      where: {
        id: "participant-other-batch",
        state: "active",
        group: { batchId: "batch-1" },
      },
    });
  });

  it("rejects an amount that exceeds the participant's remaining balance", async () => {
    const transaction = {
      feeEvent: {
        findUnique: vi.fn().mockResolvedValue({
          batchId: "batch-1",
          amount: 100,
          discountAmount: 0,
          batch: { name: "Batch 1", park: { name: "Park 1" } },
        }),
      },
      participant: { findFirst: vi.fn().mockResolvedValue({ id: "participant-1" }) },
      payment: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 95 } }) },
    };
    mocks.transaction.mockImplementation(async (callback) => callback(transaction));

    const response = await POST(
      request({ participantId: "participant-1", amount: 10, method: "cash" }),
      { params: Promise.resolve({ id: "fee-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { amount: ["Amount exceeds remaining balance of Rs. 5"] },
    });
  });

  it("asks the caller to refresh when the serializable transaction conflicts", async () => {
    mocks.transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Serialization conflict", {
        code: "P2034",
        clientVersion: "test",
      })
    );

    const response = await POST(
      request({ participantId: "participant-1", amount: 10, method: "cash" }),
      { params: Promise.resolve({ id: "fee-1" }) }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: { amount: ["A concurrent payment was recorded. Refresh the balance and try again."] },
    });
  });
});
