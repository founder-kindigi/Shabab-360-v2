import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  resolveMashwaraAccess: vi.fn(),
  logAudit: vi.fn(),
  meetingFindUnique: vi.fn(),
  actionItemFindFirst: vi.fn(),
  actionItemUpdate: vi.fn(),
  staffMetaFindUnique: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));

vi.mock("@/lib/auth/mashwara-scope", () => ({
  resolveMashwaraAccess: mocks.resolveMashwaraAccess,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
}));

vi.mock("@/lib/db", () => ({
  db: {
    mashwaraMeeting: { findUnique: mocks.meetingFindUnique },
    mashwaraActionItem: { findFirst: mocks.actionItemFindFirst, update: mocks.actionItemUpdate },
    staffMeta: { findUnique: mocks.staffMetaFindUnique },
    notification: { create: mocks.notificationCreate },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "./[itemId]/route";

function patchReq(url: string, body: any) {
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

import { NextResponse } from "next/server";

describe("MASH-006 Task Lifecycle and Notifications API", () => {
  const user = { id: "user-lead-1", email: "lead@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user });
    mocks.requireCapability.mockResolvedValue(true);
    mocks.resolveMashwaraAccess.mockResolvedValue(true);
    mocks.transaction.mockImplementation(async (cb: any) =>
      cb({
        mashwaraActionItem: { update: mocks.actionItemUpdate },
        staffMeta: { findUnique: mocks.staffMetaFindUnique },
        notification: { create: mocks.notificationCreate },
      })
    );
  });

  it("denies unauthenticated requests with 401", async () => {
    mocks.requireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const res = await PATCH(patchReq("http://localhost/api/admin/mashwara/m-1/action-items/item-1", { status: "completed" }), {
      params: Promise.resolve({ id: "m-1", itemId: "item-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("denies access with 403 when foreign scope resolves to no view access", async () => {
    mocks.meetingFindUnique.mockResolvedValue({ id: "m-1", cityId: "city-khi" });
    mocks.resolveMashwaraAccess.mockResolvedValue(false);

    const res = await PATCH(patchReq("http://localhost/api/admin/mashwara/m-1/action-items/item-1", { status: "completed" }), {
      params: Promise.resolve({ id: "m-1", itemId: "item-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("rejects task reassignment to an inactive staff member with 400", async () => {
    mocks.meetingFindUnique.mockResolvedValue({ id: "m-1", cityId: "city-lhr" });
    mocks.actionItemFindFirst.mockResolvedValue({ id: "item-1", meetingId: "m-1", assignedToId: "staff-old" });
    mocks.staffMetaFindUnique.mockResolvedValue({ id: "staff-inactive", isActive: false });

    const res = await PATCH(patchReq("http://localhost/api/admin/mashwara/m-1/action-items/item-1", { assignedToId: "staff-inactive" }), {
      params: Promise.resolve({ id: "m-1", itemId: "item-1" }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("inactive");
  });

  it("updates task lifecycle status, logs redacted audit, and notifies only actual assignee", async () => {
    mocks.meetingFindUnique.mockResolvedValue({ id: "m-1", cityId: "city-lhr" });
    mocks.actionItemFindFirst.mockResolvedValue({
      id: "item-1",
      meetingId: "m-1",
      description: "Prepare park attendance report",
      assignedToId: "staff-active-1",
      status: "open",
      dueDate: new Date("2026-08-10"),
    });
    mocks.staffMetaFindUnique.mockResolvedValue({
      id: "staff-active-1",
      userId: "user-assignee-1",
      isActive: true,
      user: { name: "Murabbi Lead", email: "murabbi@example.com" },
    });
    mocks.actionItemUpdate.mockResolvedValue({
      id: "item-1",
      meetingId: "m-1",
      description: "Prepare park attendance report",
      assignedToId: "staff-active-1",
      status: "completed",
      dueDate: new Date("2026-08-10"),
    });
    mocks.notificationCreate.mockResolvedValue({ id: "notif-1" });

    const res = await PATCH(patchReq("http://localhost/api/admin/mashwara/m-1/action-items/item-1", { status: "completed" }), {
      params: Promise.resolve({ id: "m-1", itemId: "item-1" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.actionItem.status).toBe("completed");

    // Verify audit log
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "mashwara_action_item_update",
        entityId: "item-1",
        oldValues: expect.objectContaining({ status: "open" }),
        newValues: expect.objectContaining({ status: "completed" }),
      })
    );

    // Verify in-app notification sent strictly to actual assignee
    expect(mocks.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: "user-assignee-1",
          channel: "mashwara_task_updated",
          status: "sent",
        }),
      })
    );
  });
});
