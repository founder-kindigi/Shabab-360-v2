import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(), requireAuth: vi.fn(), requireCapability: vi.fn(),
  applicationFindUnique: vi.fn(), applicationUpdateMany: vi.fn(), groupFindUnique: vi.fn(),
  participantCreate: vi.fn(), guardianCreate: vi.fn(), guardianChildCreate: vi.fn(),
  transaction: vi.fn(), logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole, requireAuth: mocks.requireAuth, requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({ db: {
  admissionApplication: { findUnique: mocks.applicationFindUnique }, group: { findUnique: mocks.groupFindUnique },
  $transaction: mocks.transaction,
} }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { POST } from "./route";

const application = {
  id: "application-1", status: "accepted", convertedParticipantId: null,
  applicantName: "Applicant", applicantDOB: null, gender: "male", guardianName: "Guardian",
  guardianPhone: "03001234567", guardianRelation: "Father",
};
const request = (body: unknown) => new NextRequest("http://localhost/api/admin/admissions/application-1/convert", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});
const params = { params: Promise.resolve({ id: "application-1" }) };

describe("POST /api/admin/admissions/[id]/convert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.requireCapability.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.applicationFindUnique.mockResolvedValueOnce(application).mockResolvedValueOnce({ ...application, status: "enrolled" });
    mocks.groupFindUnique.mockResolvedValue({ id: "group-1" });
    mocks.participantCreate.mockResolvedValue({ id: "participant-1" });
    mocks.guardianCreate.mockResolvedValue({ id: "guardian-1" });
    mocks.guardianChildCreate.mockResolvedValue({ id: "link-1" });
    mocks.applicationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation((callback) => callback({
      participant: { create: mocks.participantCreate }, guardian: { create: mocks.guardianCreate },
      guardianChild: { create: mocks.guardianChildCreate }, admissionApplication: { updateMany: mocks.applicationUpdateMany },
    }));
    mocks.logAudit.mockResolvedValue(undefined);
  });

  it("denies the admissions capability before reading or converting the application", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await POST(request({ groupId: "group-1" }), params);
    expect(response.status).toBe(403);
    expect(mocks.applicationFindUnique).not.toHaveBeenCalled();
  });

  it("rejects malformed input before database reads", async () => {
    const response = await POST(request({ createGuardian: true }), params);
    expect(response.status).toBe(400);
    expect(mocks.applicationFindUnique).not.toHaveBeenCalled();
  });

  it("converts accepted applications atomically and records the audit after commit", async () => {
    const response = await POST(request({ groupId: "group-1" }), params);
    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.applicationUpdateMany).toHaveBeenCalledWith({
      where: { id: "application-1", status: "accepted", convertedParticipantId: null },
      data: { convertedParticipantId: "participant-1", status: "enrolled" },
    });
    expect(mocks.guardianChildCreate).toHaveBeenCalledOnce();
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({ entityId: "application-1" }));
  });

  it("does not create a guardian when the operator opts out", async () => {
    await POST(request({ groupId: "group-1", createGuardian: false }), params);
    expect(mocks.guardianCreate).not.toHaveBeenCalled();
    expect(mocks.guardianChildCreate).not.toHaveBeenCalled();
  });

  it("returns 409 and does not audit when a concurrent conversion wins", async () => {
    mocks.applicationUpdateMany.mockResolvedValue({ count: 0 });
    const response = await POST(request({ groupId: "group-1" }), params);
    expect(response.status).toBe(409);
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});
