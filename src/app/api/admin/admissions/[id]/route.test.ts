import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
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
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));

import { GET, PATCH } from "./route";

const existingApplication = {
  id: "application-1",
  status: "submitted",
  emergencyContact: "Bilal Ahmed",
  emergencyPhone: "03111234567",
  previousEducation: "Crescent School",
  reference: "Community referral",
};

function patchApplication(body: Record<string, unknown>) {
  return PATCH(
    new NextRequest("http://localhost/api/admin/admissions/application-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "application-1" }) }
  );
}

describe("/api/admin/admissions/[id] additional fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireAuth.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.requireCapability.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue(existingApplication);
    mocks.update.mockImplementation(async ({ data }) => ({
      ...existingApplication,
      ...data,
    }));
    mocks.logAudit.mockResolvedValue(undefined);
  });

  it("returns all four persisted values from the detail endpoint", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/admissions/application-1"),
      { params: Promise.resolve({ id: "application-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        emergencyContact: "Bilal Ahmed",
        emergencyPhone: "03111234567",
        previousEducation: "Crescent School",
        reference: "Community referral",
      })
    );
  });

  it("updates all four fields and trims their values", async () => {
    const response = await patchApplication({
      emergencyContact: "  Saad Khan  ",
      emergencyPhone: "  03221234567  ",
      previousEducation: "  Model School  ",
      reference: "  Walk-in  ",
    });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: {
        emergencyContact: "Saad Khan",
        emergencyPhone: "03221234567",
        previousEducation: "Model School",
        reference: "Walk-in",
      },
    });
  });

  it("normalizes blank edited values to null", async () => {
    const response = await patchApplication({
      emergencyContact: " ",
      emergencyPhone: "",
      previousEducation: "  ",
      reference: null,
    });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: {
        emergencyContact: null,
        emergencyPhone: null,
        previousEducation: null,
        reference: null,
      },
    });
  });

  it("does not clear omitted admission fields during a partial edit", async () => {
    const response = await patchApplication({ reference: "Updated referral" });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { reference: "Updated referral" },
    });
  });

  it("denies the admissions capability before reading the application", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const response = await patchApplication({ reference: "Blocked update" });
    expect(response.status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
