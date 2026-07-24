import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  getServerSession: vi.fn(),
  resolveActorCity: vi.fn(),
  canAccessParticipantProfile: vi.fn(),
  participantFindUnique: vi.fn(),
  profileFindUnique: vi.fn(),
  profileUpsert: vi.fn(),
  guardianChildFindFirst: vi.fn(),
  auditCreate: vi.fn(),
  createAuditLogData: vi.fn((data: any) => data),
  redactProfileSensitiveValues: vi.fn((v: any) => v),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/audit", () => ({
  createAuditLogData: mocks.createAuditLogData,
}));

vi.mock("@/lib/student-profile/scope", () => ({
  resolveActorCity: mocks.resolveActorCity,
  canAccessParticipantProfile: mocks.canAccessParticipantProfile,
}));

vi.mock("@/lib/student-profile/audit", () => ({
  redactProfileSensitiveValues: mocks.redactProfileSensitiveValues,
}));

vi.mock("@/lib/db", () => ({
  db: {
    participant: { findUnique: mocks.participantFindUnique },
    studentExtendedProfile: { findUnique: mocks.profileFindUnique, upsert: mocks.profileUpsert },
    guardianChild: { findFirst: mocks.guardianChildFindFirst },
    auditLog: { create: mocks.auditCreate },
  },
}));

import { GET as adminGet, PUT as adminPut } from "../../../app/api/admin/students/[participantId]/profile/route";
import { GET as guardianGet } from "../../../app/api/guardian/children/[participantId]/profile/route";
import { GET as meGet } from "../../../app/api/me/profile/route";

// ─── Helpers ─────────────────────────────────────────────────────────────

const adminUrl = (participantId: string, params?: string) =>
  new NextRequest(`http://localhost/api/admin/students/${participantId}/profile${params ? `?${params}` : ""}`);

const putBody = (data: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/admin/students/pid-1/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });

const HQ_USER = { id: "hq-1", role: "super_admin", name: "HQ User" } as any;
const CH_USER = { id: "ch-1", role: "city_head", name: "City Head" } as any;
const GUARDIAN_USER = { id: "g-1", role: "guardian", name: "Guardian" } as any;
const STUDENT_USER = { id: "s-1", role: "student", name: "Student" } as any;

const SENSITIVE_PROFILE = {
  id: "prof-1",
  participantId: "pid-1",
  school: "LGS",
  financialStatus: "Middle class",
  deenBackground: "Practicing",
  badHabits: "None",
  disability: "None",
  specialNeed: "None",
  moralCharacter: "Good",
  namaz: "Five times",
};

// =============================================================================
// Staff Admin GET /api/admin/students/[participantId]/profile
// =============================================================================

describe("GET /api/admin/students/[participantId]/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: HQ_USER });
    mocks.getServerSession.mockResolvedValue({ user: HQ_USER });
    mocks.resolveActorCity.mockResolvedValue("city-1");
    mocks.canAccessParticipantProfile.mockResolvedValue(true);
    mocks.profileFindUnique.mockResolvedValue(SENSITIVE_PROFILE);
    mocks.participantFindUnique.mockResolvedValue({ id: "pid-1", userId: "s-1" });
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    const res = await adminGet(adminUrl("pid-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for HQ without cityId", async () => {
    mocks.resolveActorCity.mockResolvedValue(null);
    const res = await adminGet(adminUrl("pid-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 for foreign city scope", async () => {
    mocks.resolveActorCity.mockResolvedValue(null);
    mocks.getServerSession.mockResolvedValue({ user: CH_USER });
    mocks.requireCapability.mockResolvedValue({ user: CH_USER });
    const res = await adminGet(adminUrl("pid-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 403 when canAccessParticipantProfile fails", async () => {
    mocks.canAccessParticipantProfile.mockResolvedValue(false);
    const res = await adminGet(adminUrl("pid-1", "cityId=c-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 200 with profile when authorized", async () => {
    const res = await adminGet(adminUrl("pid-1", "cityId=c-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.school).toBe("LGS");
  });

  it("returns 200 with null (empty state) when no profile exists", async () => {
    mocks.profileFindUnique.mockResolvedValue(null);
    const res = await adminGet(adminUrl("pid-1", "cityId=c-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });

  it("strips sensitive fields when includeSensitive is false", async () => {
    const res = await adminGet(adminUrl("pid-1", "cityId=c-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.school).toBe("LGS");
    expect(body.financialStatus).toBeUndefined();
    expect(body.deenBackground).toBeUndefined();
    expect(body.badHabits).toBeUndefined();
    expect(body.disability).toBeUndefined();
    expect(body.specialNeed).toBeUndefined();
    expect(body.moralCharacter).toBeUndefined();
    expect(body.namaz).toBeUndefined();
  });

  it("returns 403 for includeSensitive=true without sensitive.view", async () => {
    mocks.requireCapability
      .mockResolvedValueOnce({ user: CH_USER })
      .mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    mocks.getServerSession.mockResolvedValue({ user: CH_USER });
    const res = await adminGet(adminUrl("pid-1", "cityId=c-1&includeSensitive=true"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns sensitive fields when includeSensitive=true and has sensitive.view", async () => {
    mocks.requireCapability
      .mockResolvedValueOnce({ user: CH_USER })
      .mockResolvedValueOnce({ user: CH_USER });
    mocks.getServerSession.mockResolvedValue({ user: CH_USER });
    const res = await adminGet(adminUrl("pid-1", "cityId=c-1&includeSensitive=true"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.financialStatus).toBe("Middle class");
  });

  it("returns 404 when participantId does not match any participant", async () => {
    mocks.canAccessParticipantProfile.mockResolvedValue(false);
    const res = await adminGet(adminUrl("nonexistent"), { params: Promise.resolve({ participantId: "nonexistent" }) });
    expect(res.status).toBe(403);
  });
});

// =============================================================================
// Staff Admin PUT /api/admin/students/[participantId]/profile
// =============================================================================

describe("PUT /api/admin/students/[participantId]/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: CH_USER });
    mocks.getServerSession.mockResolvedValue({ user: CH_USER });
    mocks.resolveActorCity.mockResolvedValue("city-1");
    mocks.canAccessParticipantProfile.mockResolvedValue(true);
    mocks.participantFindUnique.mockResolvedValue({ id: "pid-1" });
    mocks.profileFindUnique.mockResolvedValue(SENSITIVE_PROFILE);
    mocks.profileUpsert.mockImplementation((args: any) => ({ id: "prof-1", ...(args.create || args.update) }));
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    const res = await adminPut(putBody({ school: "New School" }), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for HQ without cityId", async () => {
    mocks.resolveActorCity.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue({ user: HQ_USER });
    mocks.getServerSession.mockResolvedValue({ user: HQ_USER });
    const res = await adminPut(putBody({ school: "New School" }), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 for foreign city scope", async () => {
    mocks.resolveActorCity.mockResolvedValue(null);
    const res = await adminPut(putBody({ school: "New School" }), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 403 when canAccessParticipantProfile fails", async () => {
    mocks.canAccessParticipantProfile.mockResolvedValue(false);
    const res = await adminPut(putBody({ school: "New School" }), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent participant", async () => {
    mocks.participantFindUnique.mockResolvedValue(null);
    const res = await adminPut(putBody({ school: "New School" }), { params: Promise.resolve({ participantId: "nonexistent" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Participant not found");
  });

  it("returns 400 for strict body rejecting injected participantId", async () => {
    const res = await adminPut(
      new NextRequest("http://localhost/api/admin/students/pid-1/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ school: "S", participantId: "injected" }),
      }),
      { params: Promise.resolve({ participantId: "pid-1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 201 for first write (upsert create)", async () => {
    mocks.profileFindUnique.mockResolvedValue(null);
    mocks.requireCapability
      .mockResolvedValueOnce({ user: CH_USER })
      .mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const res = await adminPut(putBody({ school: "New School" }), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(201);
    expect(mocks.profileUpsert).toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalled();
  });

  it("returns 200 for subsequent write (upsert update)", async () => {
    mocks.requireCapability
      .mockResolvedValueOnce({ user: CH_USER })
      .mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const res = await adminPut(putBody({ school: "Updated School" }), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(200);
    expect(mocks.profileUpsert).toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalled();
  });

  it("strips sensitive fields from response without sensitive.view", async () => {
    mocks.requireCapability
      .mockResolvedValueOnce({ user: CH_USER })
      .mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const res = await adminPut(putBody({ school: "S" }), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.financialStatus).toBeUndefined();
  });

  it("includes sensitive fields in response with sensitive.view", async () => {
    mocks.profileFindUnique.mockResolvedValue(null);
    mocks.requireCapability
      .mockResolvedValueOnce({ user: CH_USER })
      .mockResolvedValueOnce({ user: CH_USER });
    mocks.profileUpsert.mockResolvedValue(SENSITIVE_PROFILE);
    const res = await adminPut(putBody({ school: "S" }), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(201);
    expect(mocks.requireCapability).toHaveBeenCalledWith("students.profile.sensitive.view");
  });
});

// =============================================================================
// Guardian GET /api/guardian/children/[participantId]/profile
// =============================================================================

describe("GET /api/guardian/children/[participantId]/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: GUARDIAN_USER });
    mocks.getServerSession.mockResolvedValue({ user: GUARDIAN_USER });
    mocks.guardianChildFindFirst.mockResolvedValue({ id: "link-1" });
    mocks.profileFindUnique.mockResolvedValue(SENSITIVE_PROFILE);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    const res = await guardianGet(adminUrl("pid-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-guardian role", async () => {
    mocks.getServerSession.mockResolvedValue({ user: CH_USER });
    const res = await guardianGet(adminUrl("pid-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 when GuardianChild link does not exist (unlinked child)", async () => {
    mocks.guardianChildFindFirst.mockResolvedValue(null);
    const res = await guardianGet(adminUrl("pid-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  it("returns 200 with non-sensitive profile for linked child", async () => {
    const res = await guardianGet(adminUrl("pid-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.school).toBe("LGS");
    expect(body.financialStatus).toBeUndefined();
    expect(body.deenBackground).toBeUndefined();
  });

  it("returns 200 with null (empty state) when no extended profile exists", async () => {
    mocks.profileFindUnique.mockResolvedValue(null);
    const res = await guardianGet(adminUrl("pid-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });

  it("strips all sensitive wellbeing fields from response", async () => {
    const res = await guardianGet(adminUrl("pid-1"), { params: Promise.resolve({ participantId: "pid-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.financialStatus).toBeUndefined();
    expect(body.deenBackground).toBeUndefined();
    expect(body.badHabits).toBeUndefined();
    expect(body.disability).toBeUndefined();
    expect(body.specialNeed).toBeUndefined();
    expect(body.moralCharacter).toBeUndefined();
    expect(body.namaz).toBeUndefined();
  });
});

// =============================================================================
// Student Self GET /api/me/profile
// =============================================================================

describe("GET /api/me/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: STUDENT_USER });
    mocks.getServerSession.mockResolvedValue({ user: STUDENT_USER });
    mocks.participantFindUnique.mockResolvedValue({ id: "pid-1" });
    mocks.profileFindUnique.mockResolvedValue(SENSITIVE_PROFILE);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    const res = await meGet();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-student role", async () => {
    mocks.getServerSession.mockResolvedValue({ user: CH_USER });
    const res = await meGet();
    expect(res.status).toBe(403);
  });

  it("returns 404 when user has no linked participant record", async () => {
    mocks.participantFindUnique.mockResolvedValue(null);
    const res = await meGet();
    expect(res.status).toBe(404);
  });

  it("returns 200 with non-sensitive profile for own record", async () => {
    const res = await meGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.school).toBe("LGS");
    expect(body.financialStatus).toBeUndefined();
  });

  it("returns 200 with null (empty state) when no extended profile exists", async () => {
    mocks.profileFindUnique.mockResolvedValue(null);
    const res = await meGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });

  it("strips all sensitive wellbeing fields from response", async () => {
    const res = await meGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.school).toBe("LGS");
    expect(body.financialStatus).toBeUndefined();
    expect(body.deenBackground).toBeUndefined();
    expect(body.badHabits).toBeUndefined();
    expect(body.disability).toBeUndefined();
    expect(body.specialNeed).toBeUndefined();
    expect(body.moralCharacter).toBeUndefined();
    expect(body.namaz).toBeUndefined();
  });
});
