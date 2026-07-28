import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  meetingFindUnique: vi.fn(),
  meetingFindMany: vi.fn(),
  meetingCreate: vi.fn(),
  meetingCount: vi.fn(),
  attendeeFindMany: vi.fn(),
  decisionFindMany: vi.fn(),
  decisionCreate: vi.fn(),
  actionItemFindMany: vi.fn(),
  actionItemCreate: vi.fn(),
  teamFindMany: vi.fn(),
  shareFindUnique: vi.fn(),
  shareFindFirst: vi.fn(),
  shareFindMany: vi.fn(),
  shareCreate: vi.fn(),
  shareUpdate: vi.fn(),
  staffFindFirst: vi.fn(),
  staffFindUnique: vi.fn(),
  staffFindMany: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
  resolveMashwaraAccess: vi.fn(),
  resolveMashwaraActorCity: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
  requireCapability: mocks.requireCapability,
}));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(async (callback) => {
      return callback({
        mashwaraDecision: { create: mocks.decisionCreate },
        mashwaraActionItem: { create: mocks.actionItemCreate },
        mashwaraMeetingShare: {
          create: mocks.shareCreate,
          update: mocks.shareUpdate,
          findUnique: mocks.shareFindUnique,
          findFirst: mocks.shareFindFirst,
        },
        auditLog: { create: mocks.logAudit },
        collaborationTeam: { findMany: mocks.teamFindMany },
        staffMeta: { findMany: mocks.staffFindMany },
      });
    }),
    mashwaraMeeting: {
      findUnique: mocks.meetingFindUnique,
      findMany: mocks.meetingFindMany,
      create: mocks.meetingCreate,
      count: mocks.meetingCount,
    },
    mashwaraAttendee: { findMany: mocks.attendeeFindMany },
    mashwaraDecision: {
      findMany: mocks.decisionFindMany,
      create: mocks.decisionCreate,
    },
    mashwaraActionItem: {
      findMany: mocks.actionItemFindMany,
      create: mocks.actionItemCreate,
    },
    mashwaraMeetingShare: {
      findUnique: mocks.shareFindUnique,
      findFirst: mocks.shareFindFirst,
      findMany: mocks.shareFindMany,
      create: mocks.shareCreate,
      update: mocks.shareUpdate,
    },
    staffMeta: {
      findFirst: mocks.staffFindFirst,
      findUnique: mocks.staffFindUnique,
      findMany: mocks.staffFindMany,
    },
  },
}));
vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
  createAuditLogData: (data: any) => data,
}));
vi.mock("@/lib/auth/mashwara-scope", () => ({
  resolveMashwaraAccess: mocks.resolveMashwaraAccess,
  resolveMashwaraActorCity: mocks.resolveMashwaraActorCity,
}));

import { GET as listGET, POST as createPOST } from "./route";
import { GET as detailGET } from "./[id]/route";
import { POST as grantSharePOST } from "./[id]/shares/route";
import { DELETE as revokeShareDELETE } from "./[id]/shares/[shareId]/route";
import { POST as decisionPOST } from "./[id]/decisions/route";

const hqUser = { id: "admin-1", role: "super_admin", assignedCityId: null };
const cityHeadUser = {
  id: "city-head",
  role: "city_head",
  assignedCityId: "city-lhr",
};
const crossCityUser = {
  id: "cross-city",
  role: "city_head",
  assignedCityId: "city-khi",
};

const sampleMeeting = {
  id: "meeting-1",
  cityId: "city-lhr",
  title: "Weekly Mashwara",
  scheduledAt: new Date("2026-07-28T10:00:00Z"),
  location: "Main Hall",
  status: "scheduled",
  minutesSummary: null,
  createdAt: new Date("2026-07-24T00:00:00Z"),
  updatedAt: new Date("2026-07-24T00:00:00Z"),
  createdBy: { id: "admin-1", name: "Admin" },
};

function req(url: string, init?: Record<string, unknown>) {
  return new NextRequest(url, init as any);
}

describe("GET /api/admin/mashwara", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.resolveMashwaraActorCity.mockResolvedValue({ cityId: "city-lhr" });
  });

  it("denies access when not authenticated", async () => {
    mocks.requireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await listGET(req("http://localhost/api/admin/mashwara"));

    expect(response.status).toBe(401);
    expect(mocks.meetingFindMany).not.toHaveBeenCalled();
  });

  it("denies access without mashwara.view capability", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const response = await listGET(req("http://localhost/api/admin/mashwara"));

    expect(response.status).toBe(403);
    expect(mocks.meetingFindMany).not.toHaveBeenCalled();
  });

  it("requires cityId for HQ", async () => {
    mocks.resolveMashwaraActorCity.mockResolvedValue({
      error: "HQ must specify cityId",
      status: 400,
    });

    const response = await listGET(
      req("http://localhost/api/admin/mashwara?page=1&pageSize=20"),
    );

    expect(response.status).toBe(400);
    expect(mocks.meetingFindMany).not.toHaveBeenCalled();
  });

  it("filters by cityId for HQ", async () => {
    mocks.meetingFindMany.mockResolvedValue([sampleMeeting]);
    mocks.meetingCount.mockResolvedValue(1);

    const response = await listGET(
      req("http://localhost/api/admin/mashwara?cityId=city-lhr"),
    );

    expect(response.status).toBe(200);
    expect(mocks.meetingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cityId: "city-lhr" }),
      }),
    );
  });

  it("scopes city_head to their assigned city", async () => {
    mocks.requireAuth.mockResolvedValue({ user: cityHeadUser });
    mocks.requireCapability.mockResolvedValue({ user: cityHeadUser });
    mocks.meetingFindMany.mockResolvedValue([sampleMeeting]);
    mocks.meetingCount.mockResolvedValue(1);

    await listGET(req("http://localhost/api/admin/mashwara"));

    expect(mocks.meetingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cityId: "city-lhr" },
      }),
    );
  });

  it("rejects invalid query params", async () => {
    const response = await listGET(
      req("http://localhost/api/admin/mashwara?page=-1"),
    );

    expect(response.status).toBe(400);
    expect(mocks.meetingFindMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/mashwara", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.resolveMashwaraActorCity.mockResolvedValue({ cityId: "city-lhr" });
    mocks.staffFindFirst.mockResolvedValue({ id: "staff-admin-1" });
  });

  it("creates a meeting when authorized", async () => {
    mocks.meetingCreate.mockResolvedValue({
      id: "meeting-new",
      cityId: "city-lhr",
      title: "Test Meeting",
      scheduledAt: new Date("2026-07-28T10:00:00Z"),
      location: "Room 1",
      status: "scheduled",
      minutesSummary: null,
      createdAt: new Date(),
    });

    const response = await createPOST(
      req("http://localhost/api/admin/mashwara", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cityId: "city-lhr",
          title: "Test Meeting",
          scheduledAt: "2026-07-28T10:00:00Z",
          location: "Room 1",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.meetingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cityId: "city-lhr",
          title: "Test Meeting",
        }),
      }),
    );
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "mashwara_meeting",
        action: "create",
      }),
    );
  });

  it("rejects a missing title", async () => {
    const response = await createPOST(
      req("http://localhost/api/admin/mashwara", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cityId: "city-lhr",
          scheduledAt: "2026-07-28T10:00:00Z",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.meetingCreate).not.toHaveBeenCalled();
  });

  it("denies without mashwara.manage", async () => {
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const response = await createPOST(
      req("http://localhost/api/admin/mashwara", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cityId: "city-lhr",
          title: "Test",
          scheduledAt: "2026-07-28T10:00:00Z",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.meetingCreate).not.toHaveBeenCalled();
  });

  it("rejects when staff record not found", async () => {
    mocks.resolveMashwaraActorCity.mockResolvedValue({
      error: "Staff record not found",
      status: 403,
    });

    const response = await createPOST(
      req("http://localhost/api/admin/mashwara", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cityId: "city-lhr",
          title: "Test",
          scheduledAt: "2026-07-28T10:00:00Z",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.meetingCreate).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/mashwara/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.resolveMashwaraAccess.mockResolvedValue(true);
    mocks.meetingFindUnique.mockResolvedValue(sampleMeeting);
    mocks.attendeeFindMany.mockResolvedValue([]);
    mocks.decisionFindMany.mockResolvedValue([]);
    mocks.actionItemFindMany.mockResolvedValue([]);
    mocks.shareFindMany.mockResolvedValue([]);
  });

  it("returns meeting detail with sub-resources", async () => {
    const response = await detailGET(
      req("http://localhost/api/admin/mashwara/meeting-1"),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("meeting-1");
    expect(body).toHaveProperty("attendees");
    expect(body).toHaveProperty("decisions");
    expect(body).toHaveProperty("actionItems");
    expect(body).toHaveProperty("shares");
  });

  it("returns 404 for non-existent meeting", async () => {
    mocks.meetingFindUnique.mockResolvedValue(null);

    const response = await detailGET(
      req("http://localhost/api/admin/mashwara/meeting-404"),
      { params: Promise.resolve({ id: "meeting-404" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 403 when resolveMashwaraAccess denies", async () => {
    mocks.resolveMashwaraAccess.mockResolvedValue(false);

    const response = await detailGET(
      req("http://localhost/api/admin/mashwara/meeting-1"),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );

    expect(response.status).toBe(403);
  });
});

describe("POST /api/admin/mashwara/[id]/shares", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.resolveMashwaraActorCity.mockResolvedValue({ cityId: "city-lhr" });
    mocks.meetingFindUnique.mockResolvedValue({
      id: "meeting-1",
      cityId: "city-lhr",
    });
    mocks.staffFindUnique.mockResolvedValue({
      id: "staff-sharee",
      isActive: true,
      assignedCityId: "city-lhr",
      assignedPark: null,
      assignedGroup: null,
    });
    mocks.shareFindUnique.mockResolvedValue(null);
    mocks.staffFindFirst.mockResolvedValue({ id: "staff-granter" });
  });

  it("grants a share to same-city active staff", async () => {
    mocks.shareCreate.mockResolvedValue({
      id: "share-1",
      meetingId: "meeting-1",
      staffMetaId: "staff-sharee",
      grantedAt: new Date(),
      isRevoked: false,
    });

    const response = await grantSharePOST(
      req("http://localhost/api/admin/mashwara/meeting-1/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffMetaId: "staff-sharee" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );

    expect(response.status).toBe(201);
    expect(mocks.logAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "mashwara_meeting_share",
        action: "create",
      }),
    });
  });

  it("rejects when target staff belongs to a different city", async () => {
    mocks.staffFindUnique.mockResolvedValue({
      id: "staff-other",
      isActive: true,
      assignedCityId: "city-khi",
      assignedPark: null,
      assignedGroup: null,
    });

    const response = await grantSharePOST(
      req("http://localhost/api/admin/mashwara/meeting-1/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffMetaId: "staff-other" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.shareCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate active share", async () => {
    mocks.shareFindUnique.mockResolvedValue({
      id: "share-1",
      isRevoked: false,
      revokedAt: null,
    });

    const response = await grantSharePOST(
      req("http://localhost/api/admin/mashwara/meeting-1/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffMetaId: "staff-sharee" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );

    expect(response.status).toBe(409);
    expect(mocks.shareCreate).not.toHaveBeenCalled();
  });

  it("rejects a city_head from another city", async () => {
    mocks.requireAuth.mockResolvedValue({ user: crossCityUser });
    mocks.requireCapability.mockResolvedValue({ user: crossCityUser });
    mocks.resolveMashwaraActorCity.mockResolvedValue({
      error: "Access denied",
      status: 403,
    });

    const response = await grantSharePOST(
      req("http://localhost/api/admin/mashwara/meeting-1/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffMetaId: "staff-sharee" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.shareCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when meeting not found", async () => {
    mocks.meetingFindUnique.mockResolvedValue(null);

    const response = await grantSharePOST(
      req("http://localhost/api/admin/mashwara/meeting-404/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffMetaId: "staff-sharee" }),
      }),
      { params: Promise.resolve({ id: "meeting-404" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.shareCreate).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/mashwara/[id]/shares/[shareId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.resolveMashwaraActorCity.mockResolvedValue({ cityId: "city-lhr" });
    mocks.meetingFindUnique.mockResolvedValue({
      id: "meeting-1",
      cityId: "city-lhr",
    });
    mocks.shareFindFirst.mockResolvedValue({
      id: "share-1",
      isRevoked: false,
      revokedAt: null,
      staffMetaId: "staff-sharee",
    });
  });

  it("revokes an active share", async () => {
    const response = await revokeShareDELETE(
      req("http://localhost/api/admin/mashwara/meeting-1/shares/share-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "meeting-1", shareId: "share-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.shareUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "share-1" },
        data: expect.objectContaining({
          isRevoked: true,
          revokedAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.logAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "mashwara_meeting_share",
        action: "delete",
      }),
    });
  });

  it("rejects when share not found", async () => {
    mocks.shareFindFirst.mockResolvedValue(null);

    const response = await revokeShareDELETE(
      req("http://localhost/api/admin/mashwara/meeting-1/shares/share-404", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "meeting-1", shareId: "share-404" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.shareUpdate).not.toHaveBeenCalled();
  });

  it("rejects already revoked share", async () => {
    mocks.shareFindFirst.mockResolvedValue({
      id: "share-1",
      isRevoked: true,
      revokedAt: new Date(),
      staffMetaId: "staff-sharee",
    });

    const response = await revokeShareDELETE(
      req("http://localhost/api/admin/mashwara/meeting-1/shares/share-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "meeting-1", shareId: "share-1" }) },
    );

    expect(response.status).toBe(409);
    expect(mocks.shareUpdate).not.toHaveBeenCalled();
  });

  it("rejects malformed historical-row share (isRevoked false but revokedAt not null)", async () => {
    mocks.shareFindFirst.mockResolvedValue({
      id: "share-1",
      isRevoked: false,
      revokedAt: new Date(),
      staffMetaId: "staff-sharee",
    });

    const response = await revokeShareDELETE(
      req("http://localhost/api/admin/mashwara/meeting-1/shares/share-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "meeting-1", shareId: "share-1" }) },
    );

    expect(response.status).toBe(409);
    expect(mocks.shareUpdate).not.toHaveBeenCalled();
  });

  it("rejects malformed historical-row share (isRevoked true but revokedAt null)", async () => {
    mocks.shareFindFirst.mockResolvedValue({
      id: "share-1",
      isRevoked: true,
      revokedAt: null,
      staffMetaId: "staff-sharee",
    });

    const response = await revokeShareDELETE(
      req("http://localhost/api/admin/mashwara/meeting-1/shares/share-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "meeting-1", shareId: "share-1" }) },
    );

    expect(response.status).toBe(409);
    expect(mocks.shareUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/mashwara/[id]/decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: hqUser });
    mocks.requireCapability.mockResolvedValue({ user: hqUser });
    mocks.resolveMashwaraAccess.mockResolvedValue(true);
    mocks.meetingFindUnique.mockResolvedValue({
      id: "meeting-1",
      cityId: "city-lhr",
    });
    mocks.teamFindMany.mockResolvedValue([
      { id: "team-1", isActive: true, cityId: "city-lhr" },
    ]);
    mocks.staffFindMany.mockResolvedValue([
      { id: "staff-1", isActive: true, assignedCityId: "city-lhr" },
    ]);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ this is not valid JSON }",
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    expect(response.status).toBe(400);
    expect(mocks.decisionCreate).not.toHaveBeenCalled();
  });

  it("records a decision without action item", async () => {
    mocks.decisionCreate.mockResolvedValue({
      id: "decision-1",
      meetingId: "meeting-1",
      decision: "Approve budget",
      category: "finance",
      targetTeamId: null,
      assignedToId: null,
      status: "pending",
      createdAt: new Date(),
    });

    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision: "Approve budget",
          category: "finance",
        }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.decision.id).toBe("decision-1");
    expect(body.actionItem).toBeNull();
    expect(mocks.logAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "mashwara_decision",
      }),
    });
  });

  it("records a decision with inline action item", async () => {
    mocks.staffFindMany.mockResolvedValue([
      { id: "staff-1", isActive: true, assignedCityId: "city-lhr" },
    ]);
    mocks.decisionCreate.mockResolvedValue({
      id: "decision-2",
      meetingId: "meeting-1",
      decision: "Assign task",
      category: "operations",
      targetTeamId: "team-1",
      assignedToId: "staff-1",
      status: "pending",
      createdAt: new Date(),
    });
    mocks.actionItemCreate.mockResolvedValue({
      id: "action-1",
      meetingId: "meeting-1",
      description: "Prepare report",
      teamId: "team-1",
      assignedToId: "staff-1",
      dueDate: null,
      status: "open",
      createdAt: new Date(),
    });

    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision: "Assign task",
          category: "operations",
          targetTeamId: "team-1",
          assignedToId: "staff-1",
          actionItem: {
            teamId: "team-1",
            assignedToId: "staff-1",
            description: "Prepare report",
          },
        }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.decision.id).toBe("decision-2");
    expect(body.actionItem).not.toBeNull();
    expect(body.actionItem.id).toBe("action-1");
    expect(mocks.actionItemCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects when resolveMashwaraAccess denies", async () => {
    mocks.resolveMashwaraAccess.mockResolvedValue(false);

    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "Test decision" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.decisionCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when meeting not found", async () => {
    mocks.meetingFindUnique.mockResolvedValue(null);

    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-404/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "Test decision" }),
      }),
      { params: Promise.resolve({ id: "meeting-404" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.decisionCreate).not.toHaveBeenCalled();
  });

  it("returns 404 if target team is not found", async () => {
    mocks.teamFindMany.mockResolvedValue([]);
    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "Test", targetTeamId: "team-404" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 403 if target team is inactive", async () => {
    mocks.teamFindMany.mockResolvedValue([
      { id: "team-1", isActive: false, cityId: "city-lhr" },
    ]);
    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "Test", targetTeamId: "team-1" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 403 if target team belongs to a different city", async () => {
    mocks.teamFindMany.mockResolvedValue([
      { id: "team-1", isActive: true, cityId: "city-khi" },
    ]);
    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "Test", targetTeamId: "team-1" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 if assignee is not found", async () => {
    mocks.staffFindMany.mockResolvedValue([]);
    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "Test", assignedToId: "staff-404" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 403 if assignee is inactive", async () => {
    mocks.staffFindMany.mockResolvedValue([
      { id: "staff-1", isActive: false, assignedCityId: "city-lhr" },
    ]);
    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "Test", assignedToId: "staff-1" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 403 if assignee belongs to a different city", async () => {
    mocks.staffFindMany.mockResolvedValue([
      { id: "staff-1", isActive: true, assignedCityId: "city-khi" },
    ]);
    const response = await decisionPOST(
      req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "Test", assignedToId: "staff-1" }),
      }),
      { params: Promise.resolve({ id: "meeting-1" }) },
    );
    expect(response.status).toBe(403);
  });
});
