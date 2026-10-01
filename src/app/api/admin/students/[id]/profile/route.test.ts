import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireCapability: vi.fn(),
  resolveActorCity: vi.fn(),
  canAccessParticipantProfile: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  create: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth/authorize", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/lib/student-profile/scope", () => ({
  resolveActorCity: mocks.resolveActorCity,
  canAccessParticipantProfile: mocks.canAccessParticipantProfile,
}));
vi.mock("@/lib/db", () => ({
  db: {
    studentExtendedProfile: { findUnique: mocks.findUnique, upsert: mocks.upsert },
    participant: { findUnique: mocks.findUnique },
    auditLog: { create: mocks.create },
  },
}));

import { GET, PUT } from "./route";

const params = { params: Promise.resolve({ participantId: "p-1" }) };

describe("Admin Student Extended Profile Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue(null);
    mocks.getServerSession.mockResolvedValue({ user: { id: "admin-1", role: "program_admin" } });
    mocks.resolveActorCity.mockResolvedValue("city-1");
    mocks.canAccessParticipantProfile.mockResolvedValue(true);
    mocks.findUnique.mockResolvedValue(null);
  });

  describe("GET", () => {
    it("denies unauthenticated or missing capability before data access", async () => {
      mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const response = await GET(new NextRequest("http://localhost/api/admin/students/p-1/profile"), params);
      expect(response.status).toBe(403);
      expect(mocks.resolveActorCity).not.toHaveBeenCalled();
    });

    it("HQ missing cityId returns 400", async () => {
      mocks.resolveActorCity.mockResolvedValue(null);
      const response = await GET(new NextRequest("http://localhost/api/admin/students/p-1/profile"), params);
      expect(response.status).toBe(400); // Because role is program_admin (HQ) and cityId is missing
    });

    it("Park Lead foreign park denied (dynamic grant outside scope)", async () => {
      mocks.getServerSession.mockResolvedValue({ user: { id: "staff-1", role: "park_lead" } });
      mocks.canAccessParticipantProfile.mockResolvedValue(false);
      const response = await GET(new NextRequest("http://localhost/api/admin/students/p-1/profile?cityId=city-1"), params);
      expect(response.status).toBe(403);
    });

    it("Murabbi own-group allowed, foreign group denied", async () => {
      mocks.getServerSession.mockResolvedValue({ user: { id: "staff-1", role: "murabbi" } });
      mocks.canAccessParticipantProfile.mockResolvedValue(false);
      const response = await GET(new NextRequest("http://localhost/api/admin/students/p-1/profile?cityId=city-1"), params);
      expect(response.status).toBe(403);
    });

    it("student cannot access another participant on admin route", async () => {
      mocks.getServerSession.mockResolvedValue({ user: { id: "student-1", role: "student" } });
      mocks.canAccessParticipantProfile.mockResolvedValue(false);
      const response = await GET(new NextRequest("http://localhost/api/admin/students/p-1/profile"), params);
      expect(response.status).toBe(403);
    });

    it("standard GET omits sensitive fields", async () => {
      mocks.findUnique.mockResolvedValue({
        participantId: "p-1",
        school: "School A",
        financialStatus: "Poor", // Sensitive
      });
      const response = await GET(new NextRequest("http://localhost/api/admin/students/p-1/profile?cityId=city-1"), params);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.school).toBe("School A");
      expect(data.financialStatus).toBeUndefined();
    });

    it("includeSensitive without sensitive.view returns 403", async () => {
      // First call is students.profile.view, second is students.profile.sensitive.view
      mocks.requireCapability.mockImplementation(async (cap: string) => {
        if (cap === "students.profile.sensitive.view") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return null;
      });
      const response = await GET(new NextRequest("http://localhost/api/admin/students/p-1/profile?includeSensitive=true&cityId=city-1"), params);
      expect(response.status).toBe(403);
    });
  });

  describe("PUT", () => {
    beforeEach(() => {
      // Mock participant exists
      mocks.findUnique.mockImplementation(async (args) => {
        if (args.where.id === "p-1") return { id: "p-1" };
        return null;
      });
      mocks.upsert.mockResolvedValue({ participantId: "p-1", school: "School B", badHabits: "None" });
    });

    it("unknown-field strict-schema returns 400", async () => {
      const response = await PUT(
        new NextRequest("http://localhost/api/admin/students/p-1/profile?cityId=city-1", {
          method: "PUT",
          body: JSON.stringify({ unknownField: "test" }),
        }),
        params
      );
      expect(response.status).toBe(400);
      expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("malformed JSON returns 400", async () => {
      const response = await PUT(
        new NextRequest("http://localhost/api/admin/students/p-1/profile?cityId=city-1", {
          method: "PUT",
          body: "invalid-json",
        }),
        params
      );
      expect(response.status).toBe(400);
      expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("zero-field update returns 400", async () => {
      const response = await PUT(
        new NextRequest("http://localhost/api/admin/students/p-1/profile?cityId=city-1", {
          method: "PUT",
          body: JSON.stringify({}),
        }),
        params
      );
      expect(response.status).toBe(400);
      expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("sensitive audit fields are redacted", async () => {
      mocks.requireCapability.mockResolvedValue(null);
      await PUT(
        new NextRequest("http://localhost/api/admin/students/p-1/profile?cityId=city-1", {
          method: "PUT",
          body: JSON.stringify({ school: "School B", badHabits: "Testing" }),
        }),
        params
      );
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            newValues: expect.stringContaining("[REDACTED]"),
          }),
        })
      );
    });

    it("PUT projection respects sensitive.view", async () => {
      // caller has sensitive.manage but not sensitive.view
      mocks.requireCapability.mockImplementation(async (cap: string) => {
        if (cap === "students.profile.sensitive.view") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return null;
      });

      const response = await PUT(
        new NextRequest("http://localhost/api/admin/students/p-1/profile?cityId=city-1", {
          method: "PUT",
          body: JSON.stringify({ school: "School B", badHabits: "Testing" }),
        }),
        params
      );
      expect(response.status).toBe(201); // upsert created
      const data = await response.json();
      expect(data.school).toBe("School B");
      expect(data.badHabits).toBeUndefined(); // Redacted from response
    });
  });
});
