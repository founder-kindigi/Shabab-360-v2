import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse, NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  requireAuth: vi.fn(),
  userHasCapability: vi.fn(),
  dbEventCreate: vi.fn(),
  dbEventUpdate: vi.fn(),
  dbEventFindUnique: vi.fn(),
  dbEventFindMany: vi.fn(),
  dbTeamMembershipCreate: vi.fn(),
  dbTeamMembershipFindFirst: vi.fn(),
  dbTeamMembershipUpdate: vi.fn(),
  dbTeamFindUnique: vi.fn(),
  dbResponsibilityCreate: vi.fn(),
  dbPlannerItemCreate: vi.fn(),
  dbStaffMetaFindUnique: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireCapability: mocks.requireCapability,
  requireAuth: mocks.requireAuth,
}));

vi.mock("@/lib/auth/capability-access", () => ({
  userHasCapability: mocks.userHasCapability,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
}));

vi.mock("@/lib/db", () => ({
  db: {
    event: {
      create: mocks.dbEventCreate,
      update: mocks.dbEventUpdate,
      findUnique: mocks.dbEventFindUnique,
      findMany: mocks.dbEventFindMany,
    },
    eventTeamMembership: {
      create: mocks.dbTeamMembershipCreate,
      findFirst: mocks.dbTeamMembershipFindFirst,
      update: mocks.dbTeamMembershipUpdate,
    },
    temporaryEventTeam: {
      findUnique: mocks.dbTeamFindUnique,
    },
    eventResponsibility: {
      create: mocks.dbResponsibilityCreate,
    },
    eventPlannerItem: {
      create: mocks.dbPlannerItemCreate,
    },
    staffMeta: {
      findUnique: mocks.dbStaffMetaFindUnique,
    },
    city: {
      findUnique: vi.fn().mockResolvedValue({ id: "city-1", isActive: true }),
    },
  },
}));

import { GET as GETEvents, POST as POSTEvents } from "./route";
import { GET as GETEventDetail, PATCH as PATCHEvent, DELETE as DELETEEvent } from "./[id]/route";
import { POST as POSTMembership } from "./teams/[teamId]/memberships/route";
import { POST as POSTResponsibility } from "./[id]/responsibilities/route";
import { POST as POSTPlannerItem } from "./[id]/planner-items/route";

describe("EVENT-304: Event Route API Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ user: { id: "u-1" } });
    mocks.requireAuth.mockResolvedValue({ user: { id: "u-1" } });
    mocks.userHasCapability.mockResolvedValue(true);
    mocks.dbStaffMetaFindUnique.mockResolvedValue({ id: "sm-1", isActive: true, assignedCityId: "city-1" });
  });

  const createReq = (body?: any) =>
    new NextRequest("http://localhost/api/admin/events", {
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
    });

  describe("Authentication & Capability", () => {
    it("denies unauthenticated request before database mutation", async () => {
      mocks.requireCapability.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const res = await POSTEvents(createReq({ title: "Test Event", eventType: "trip", startDate: new Date().toISOString() }));
      expect(res.status).toBe(403);
      expect(mocks.dbEventCreate).not.toHaveBeenCalled();
    });
  });

  describe("Scope & Visibility", () => {
    it("rejects HQ request missing cityId with 400", async () => {
      // Mock HQ user
      mocks.requireCapability.mockResolvedValue({ user: { id: "hq-1", role: "super_admin" } });
      const req = new NextRequest("http://localhost/api/admin/events"); // no ?cityId=
      const res = await GETEvents(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/valid cityId/i);
    });

    it("denies scoped user accessing foreign city with 403", async () => {
      // Scoped user with city-1 trying to patch event in city-2
      mocks.dbEventFindUnique.mockResolvedValue({ id: "evt-1", cityId: "city-2" });
      const req = new NextRequest("http://localhost/api/admin/events/evt-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "New Title" }),
      });
      const res = await PATCHEvent(req, { params: Promise.resolve({ id: "evt-1" }) });
      expect(res.status).toBe(403);
    });

    it("denies non-manager from viewing planned events", async () => {
      mocks.userHasCapability.mockResolvedValue(false);
      mocks.dbEventFindUnique.mockResolvedValue({ id: "evt-1", cityId: "city-1", status: "planned" });
      const req = new NextRequest("http://localhost/api/admin/events/evt-1");
      const res = await GETEventDetail(req, { params: Promise.resolve({ id: "evt-1" }) });
      expect(res.status).toBe(403);
    });

    it("prevents transferring event to another city", async () => {
      mocks.dbEventFindUnique.mockResolvedValue({ id: "evt-1", cityId: "city-1" });
      const req = new NextRequest("http://localhost/api/admin/events/evt-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "New", cityId: "city-2" }),
      });
      const res = await PATCHEvent(req, { params: Promise.resolve({ id: "evt-1" }) });
      expect(res.status).toBe(400); // 400 Validation failed due to Zod strip/immutable check
    });
  });

  describe("Lifecycle & Audit", () => {
    it("creates an event successfully and logs audit", async () => {
      mocks.dbEventCreate.mockResolvedValue({ id: "evt-1", cityId: "city-1", title: "New Event" });
      const req = createReq({ title: "New Event", eventType: "trip", startDate: new Date().toISOString() });
      const res = await POSTEvents(req);
      expect(res.status).toBe(201);
      expect(mocks.dbEventCreate).toHaveBeenCalled();
      expect(mocks.logAudit).toHaveBeenCalled();
    });

    it("cancels an event using DELETE and logs audit", async () => {
      mocks.dbEventFindUnique.mockResolvedValue({ id: "evt-1", cityId: "city-1", status: "planned" });
      mocks.dbEventUpdate.mockResolvedValue({ id: "evt-1", status: "cancelled" });
      const req = new NextRequest("http://localhost/api/admin/events/evt-1", { method: "DELETE" });
      const res = await DELETEEvent(req, { params: Promise.resolve({ id: "evt-1" }) });
      expect(res.status).toBe(200);
      expect(mocks.dbEventUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "cancelled" } }));
      expect(mocks.logAudit).toHaveBeenCalled();
    });

    it("rejects PATCH on a cancelled event with 409", async () => {
      mocks.dbEventFindUnique.mockResolvedValue({ id: "evt-1", cityId: "city-1", status: "cancelled" });
      const req = new NextRequest("http://localhost/api/admin/events/evt-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      });
      const res = await PATCHEvent(req, { params: Promise.resolve({ id: "evt-1" }) });
      expect(res.status).toBe(409);
    });
  });

  describe("Temporary Teams & Planner Invariants", () => {
    it("assigns same-city temporary team member successfully", async () => {
      mocks.dbTeamFindUnique.mockResolvedValue({ id: "team-1", event: { cityId: "city-1" } });
      mocks.dbStaffMetaFindUnique.mockResolvedValue({ id: "sm-1", isActive: true, assignedCityId: "city-1" });
      mocks.dbTeamMembershipFindFirst.mockResolvedValue(null);
      mocks.dbTeamMembershipCreate.mockResolvedValue({ id: "mem-1" });

      const req = new NextRequest("http://localhost/api/admin/events/teams/team-1/memberships", {
        method: "POST",
        body: JSON.stringify({ staffMetaId: "sm-1" }),
      });
      const res = await POSTMembership(req, { params: Promise.resolve({ teamId: "team-1" }) });
      expect(res.status).toBe(201);
    });

    it("assigns same-city team member when city is derived from assignedGroup", async () => {
      mocks.dbTeamFindUnique.mockResolvedValue({ id: "team-1", event: { cityId: "city-1" } });
      mocks.dbStaffMetaFindUnique.mockResolvedValue({
        id: "sm-1",
        isActive: true,
        assignedCityId: null,
        assignedGroup: { batch: { park: { cityId: "city-1" } } }
      });
      mocks.dbTeamMembershipFindFirst.mockResolvedValue(null);
      mocks.dbTeamMembershipCreate.mockResolvedValue({ id: "mem-1" });

      const req = new NextRequest("http://localhost/api/admin/events/teams/team-1/memberships", {
        method: "POST",
        body: JSON.stringify({ staffMetaId: "sm-1" }),
      });
      const res = await POSTMembership(req, { params: Promise.resolve({ teamId: "team-1" }) });
      expect(res.status).toBe(201);
    });

    it("denies cross-city team member assignment", async () => {
      mocks.dbTeamFindUnique.mockResolvedValue({ id: "team-1", event: { cityId: "city-1" } });
      // Assignee in city-2
      mocks.dbStaffMetaFindUnique.mockResolvedValue({ id: "sm-1", isActive: true, assignedCityId: "city-2" });

      const req = new NextRequest("http://localhost/api/admin/events/teams/team-1/memberships", {
        method: "POST",
        body: JSON.stringify({ staffMetaId: "sm-1" }),
      });
      const res = await POSTMembership(req, { params: Promise.resolve({ teamId: "team-1" }) });
      expect(res.status).toBe(403);
    });

    it("denies creating planner item with invalid cross-event team link", async () => {
      mocks.dbEventFindUnique.mockResolvedValue({ id: "evt-1", cityId: "city-1" });
      // Team belongs to another event
      mocks.dbTeamFindUnique.mockResolvedValue({ id: "team-1", eventId: "evt-99", isActive: true });
      const req = new NextRequest("http://localhost/api/admin/events/evt-1/planner-items", {
        method: "POST",
        body: JSON.stringify({ title: "Setup", teamId: "team-1" }),
      });
      const res = await POSTPlannerItem(req, { params: Promise.resolve({ id: "evt-1" }) });
      expect(res.status).toBe(404); // "not found or does not belong"
    });
  });

  describe("Validation & Errors", () => {
    it("rejects malformed JSON body with 400", async () => {
      const req = new NextRequest("http://localhost/api/admin/events", {
        method: "POST",
        body: "invalid-json {",
      });
      const res = await POSTEvents(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 for missing resource in planner items", async () => {
      mocks.dbEventFindUnique.mockResolvedValue({ id: "evt-1", cityId: "city-1" });
      mocks.dbStaffMetaFindUnique.mockImplementation((args: any) => {
        if (args.where.id === "sm-999") return null;
        return { id: "sm-1", isActive: true, assignedCityId: "city-1" };
      });
      const req = new NextRequest("http://localhost/api/admin/events/evt-1/planner-items", {
        method: "POST",
        body: JSON.stringify({ title: "Setup", assignedToStaffMetaId: "sm-999" }),
      });
      const res = await POSTPlannerItem(req, { params: Promise.resolve({ id: "evt-1" }) });
      expect(res.status).toBe(404);
    });

    it("returns 409 for duplicate active membership", async () => {
      mocks.dbTeamFindUnique.mockResolvedValue({ id: "team-1", event: { cityId: "city-1" } });
      mocks.dbStaffMetaFindUnique.mockResolvedValue({ id: "sm-1", isActive: true, assignedCityId: "city-1" });
      mocks.dbTeamMembershipFindFirst.mockResolvedValue({ id: "mem-existing", isActive: true });

      const req = new NextRequest("http://localhost/api/admin/events/teams/team-1/memberships", {
        method: "POST",
        body: JSON.stringify({ staffMetaId: "sm-1" }),
      });
      const res = await POSTMembership(req, { params: Promise.resolve({ teamId: "team-1" }) });
      expect(res.status).toBe(409);
    });

    it("reactivates a previously revoked membership instead of creating a new one", async () => {
      mocks.dbTeamFindUnique.mockResolvedValue({ id: "team-1", event: { cityId: "city-1" } });
      mocks.dbStaffMetaFindUnique.mockResolvedValue({ id: "sm-1", isActive: true, assignedCityId: "city-1" });
      mocks.dbTeamMembershipFindFirst.mockResolvedValue({ id: "mem-revoked", isActive: false });
      mocks.dbTeamMembershipUpdate.mockResolvedValue({ id: "mem-revoked", isActive: true });

      const req = new NextRequest("http://localhost/api/admin/events/teams/team-1/memberships", {
        method: "POST",
        body: JSON.stringify({ staffMetaId: "sm-1", title: "New Title" }),
      });
      const res = await POSTMembership(req, { params: Promise.resolve({ teamId: "team-1" }) });

      expect(res.status).toBe(200);
      expect(mocks.dbTeamMembershipUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "mem-revoked" },
          data: expect.objectContaining({ isActive: true, title: "New Title", revokedAt: null }),
        })
      );
      expect(mocks.dbTeamMembershipCreate).not.toHaveBeenCalled();
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "event.team_member.reactivate" })
      );
    });
  });
});
