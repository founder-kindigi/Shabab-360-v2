import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(), requireCapability: vi.fn(), resolveRequestedHierarchy: vi.fn(),
  groupFindFirst: vi.fn(), participantFindUnique: vi.fn(), participantUpdate: vi.fn(),
  auditCreate: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/auth/hierarchy", () => ({ resolveRequestedHierarchy: mocks.resolveRequestedHierarchy }));
vi.mock("@/lib/db", () => ({
  db: {
    group: { findFirst: mocks.groupFindFirst },
    participant: { findUnique: mocks.participantFindUnique },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "./route";

const params = { params: Promise.resolve({ id: "participant-1" }) };
const HQ_SCOPE = { kind: "hq", cityId: null, parkId: null, groupId: null };
const CENTRAL = { user: { id: "central", role: "program_admin" } };
const SCOPED = { user: { id: "scoped", role: "park_admin" } };

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/students/participant-1/assignment", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function forbiddenFor(groupId: string) {
  mocks.resolveRequestedHierarchy.mockImplementation(
    async (_user: unknown, requested: { groupId?: string } | undefined) =>
      requested?.groupId === groupId
        ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
        : HQ_SCOPE
  );
}

describe("PATCH /api/admin/students/[id]/assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue(CENTRAL);
    mocks.requireCapability.mockResolvedValue(null);
    mocks.resolveRequestedHierarchy.mockResolvedValue(HQ_SCOPE);
    mocks.groupFindFirst.mockResolvedValue({ id: "group-2", isActive: true });
    mocks.participantFindUnique.mockResolvedValue({ id: "participant-1", groupId: null });
    mocks.participantUpdate.mockResolvedValue({ id: "participant-1", groupId: "group-2" });
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        participant: { update: mocks.participantUpdate },
        auditLog: { create: mocks.auditCreate },
      })
    );
  });

  it("lets central staff place an unassigned participant and audits the group ids", async () => {
    const response = await PATCH(patchRequest({ groupId: "group-2" }), params);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ participantId: "participant-1", groupId: "group-2" });
    expect(mocks.groupFindFirst).toHaveBeenCalledWith({ where: { id: "group-2", isActive: true } });
    expect(mocks.participantUpdate).toHaveBeenCalledWith({
      where: { id: "participant-1" },
      data: { groupId: "group-2" },
    });
    const audit = mocks.auditCreate.mock.calls[0][0].data;
    expect(audit.action).toBe("student.assignGroup");
    expect(JSON.parse(audit.oldValues)).toEqual({ groupId: null });
    expect(JSON.parse(audit.newValues)).toEqual({ groupId: "group-2" });
  });

  it("denies a scoped actor the unassigned record", async () => {
    mocks.requireAuth.mockResolvedValue(SCOPED);

    const response = await PATCH(patchRequest({ groupId: "group-2" }), params);

    expect(response.status).toBe(403);
    expect(mocks.groupFindFirst).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies a scoped actor when the existing assignment is outside their scope", async () => {
    mocks.requireAuth.mockResolvedValue(SCOPED);
    mocks.participantFindUnique.mockResolvedValue({ id: "participant-1", groupId: "group-other" });
    forbiddenFor("group-other");

    const response = await PATCH(patchRequest({ groupId: "group-2" }), params);

    expect(response.status).toBe(403);
    expect(mocks.groupFindFirst).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("allows a scoped actor to re-place a participant already inside their scope", async () => {
    mocks.requireAuth.mockResolvedValue(SCOPED);
    mocks.participantFindUnique.mockResolvedValue({ id: "participant-1", groupId: "group-1" });

    const response = await PATCH(patchRequest({ groupId: "group-2" }), params);

    expect(response.status).toBe(200);
    expect(mocks.resolveRequestedHierarchy).toHaveBeenCalledWith(SCOPED.user, {
      groupId: "group-1",
    });
    expect(mocks.resolveRequestedHierarchy).toHaveBeenCalledWith(SCOPED.user, {
      groupId: "group-2",
    });
  });

  it("derives scope from the group and ignores client park or city values", async () => {
    await PATCH(patchRequest({ groupId: "group-2", parkId: "park-x", cityId: "city-x" }), params);

    expect(mocks.resolveRequestedHierarchy).toHaveBeenCalledWith(expect.anything(), {
      groupId: "group-2",
    });
    expect(mocks.participantUpdate).toHaveBeenCalledWith({
      where: { id: "participant-1" },
      data: { groupId: "group-2" },
    });
  });

  it("denies a cross-scope destination group without updating", async () => {
    forbiddenFor("group-2");

    const response = await PATCH(patchRequest({ groupId: "group-2" }), params);

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies an unknown or inactive group without updating", async () => {
    mocks.groupFindFirst.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ groupId: "group-gone" }), params);

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("denies an unauthenticated caller", async () => {
    mocks.requireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await PATCH(patchRequest({ groupId: "group-2" }), params);

    expect(response.status).toBe(401);
    expect(mocks.participantFindUnique).not.toHaveBeenCalled();
  });

  it("denies a caller without students.manage", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await PATCH(patchRequest({ groupId: "group-2" }), params);

    expect(response.status).toBe(403);
    expect(mocks.participantFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a missing, blank or non-textual group id", async () => {
    for (const body of [{}, { groupId: "" }, { groupId: "   " }, { groupId: 12 }]) {
      const response = await PATCH(patchRequest(body), params);
      expect(response.status).toBe(400);
    }
    expect(mocks.participantFindUnique).not.toHaveBeenCalled();
    expect(mocks.groupFindFirst).not.toHaveBeenCalled();
  });

  it("denies a participant that does not exist", async () => {
    mocks.participantFindUnique.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ groupId: "group-2" }), params);

    expect(response.status).toBe(404);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
