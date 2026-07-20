import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { ADMISSION_FIELD_LIMITS } from "@/lib/admissions/fields";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    admissionApplication: {
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { POST } from "./route";

const requiredApplication = {
  applicantName: "Ali Ahmed",
  guardianName: "Ahmed Khan",
  guardianPhone: "03001234567",
};

function postApplication(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/admin/admissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/admin/admissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockImplementation(async ({ data }) => ({ id: "application-1", ...data }));
    mocks.logAudit.mockResolvedValue(undefined);
  });

  it("persists all four bounded admission fields after trimming", async () => {
    const response = await postApplication({
      ...requiredApplication,
      emergencyContact: "  Bilal Ahmed  ",
      emergencyPhone: "  03111234567  ",
      previousEducation: "  Crescent School  ",
      reference: "  Community referral  ",
    });

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        emergencyContact: "Bilal Ahmed",
        emergencyPhone: "03111234567",
        previousEducation: "Crescent School",
        reference: "Community referral",
      }),
    });
  });

  it("stores omitted optional fields as null", async () => {
    const response = await postApplication(requiredApplication);

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        emergencyContact: null,
        emergencyPhone: null,
        previousEducation: null,
        reference: null,
      }),
    });
  });

  it.each([
    ["emergencyContact", ADMISSION_FIELD_LIMITS.emergencyContact],
    ["emergencyPhone", ADMISSION_FIELD_LIMITS.emergencyPhone],
    ["previousEducation", ADMISSION_FIELD_LIMITS.previousEducation],
    ["reference", ADMISSION_FIELD_LIMITS.reference],
  ])("rejects %s above its maximum length", async (field, maxLength) => {
    const response = await postApplication({
      ...requiredApplication,
      [field]: "x".repeat(maxLength + 1),
    });

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a malformed non-empty emergency phone", async () => {
    const response = await postApplication({
      ...requiredApplication,
      emergencyPhone: "1234",
    });

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not read or write admissions when authorization fails", async () => {
    mocks.requireRole.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await postApplication(requiredApplication);

    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not read or write admissions when the capability is denied", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );

    const response = await postApplication(requiredApplication);

    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
