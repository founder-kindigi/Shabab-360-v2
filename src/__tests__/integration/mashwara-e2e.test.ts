import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* ── Hoisted Mocks ────────────────────────────────────────────────── */
const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCapability: vi.fn(),
  meetingFindUnique: vi.fn(),
  meetingFindMany: vi.fn(),
  meetingCreate: vi.fn(),
  meetingCount: vi.fn(),
  attendeeFindMany: vi.fn(),
  attendeeCreate: vi.fn(),
  decisionFindMany: vi.fn(),
  decisionCreate: vi.fn(),
  actionItemFindMany: vi.fn(),
  actionItemCreate: vi.fn(),
  shareFindUnique: vi.fn(),
  shareFindFirst: vi.fn(),
  shareFindMany: vi.fn(),
  shareCreate: vi.fn(),
  shareUpdate: vi.fn(),
  staffFindFirst: vi.fn(),
  staffFindUnique: vi.fn(),
  staffFindMany: vi.fn(),
  teamFindMany: vi.fn(),
  cityFindFirst: vi.fn(),
  transaction: vi.fn(),
  logAudit: vi.fn(),
  resolveMashwaraAccess: vi.fn(),
  resolveMashwaraActorCity: vi.fn(),
  notifyTaskAssignee: vi.fn(),
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
          findFirst: mocks.shareFindFirst,
          findUnique: mocks.shareFindUnique,
        },
        auditLog: { create: mocks.logAudit },
        collaborationTeam: {
          findMany: mocks.teamFindMany,
        },
        staffMeta: { findMany: mocks.staffFindMany },
      });
    }),
    mashwaraMeeting: {
      findUnique: mocks.meetingFindUnique,
      findMany: mocks.meetingFindMany,
      create: mocks.meetingCreate,
      count: mocks.meetingCount,
    },
    mashwaraAttendee: {
      findMany: mocks.attendeeFindMany,
      create: mocks.attendeeCreate,
    },
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
    city: {
      findFirst: mocks.cityFindFirst,
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
vi.mock("@/lib/mashwara-notifications", () => ({
  notifyTaskAssignee: mocks.notifyTaskAssignee,
}));

/* ── Route imports ──────────────────────────────────────────────────── */
import {
  GET as listGET,
  POST as createPOST,
} from "@/app/api/admin/mashwara/route";
import { GET as detailGET } from "@/app/api/admin/mashwara/[id]/route";
import { POST as grantSharePOST } from "@/app/api/admin/mashwara/[id]/shares/route";
import { DELETE as revokeShareDELETE } from "@/app/api/admin/mashwara/[id]/shares/[shareId]/route";
import { POST as decisionPOST } from "@/app/api/admin/mashwara/[id]/decisions/route";

/* ── Test data ──────────────────────────────────────────────────────── */
const HQ_USER = { id: "admin-1", role: "super_admin", assignedCityId: null };
const CITY_HEAD_LHR = {
  id: "city-head-1",
  role: "city_head",
  assignedCityId: "city-lhr",
};
const CITY_HEAD_KHI = {
  id: "city-head-2",
  role: "city_head",
  assignedCityId: "city-khi",
};
const PARK_STAFF = {
  id: "park-staff-1",
  role: "park_lead",
  assignedParkId: "park-1",
};
const SHARED_USER = {
  id: "shared-user-1",
  role: "park_admin",
  assignedParkId: "park-khi",
};

const BASE_MEETING = {
  id: "meeting-1",
  cityId: "city-lhr",
  title: "Lahore Weekly Mashwara #12",
  scheduledAt: new Date("2026-08-01T10:00:00Z"),
  location: "Gulberg Hall",
  status: "scheduled",
  minutesSummary: null,
  createdAt: new Date("2026-07-24T00:00:00Z"),
  updatedAt: new Date("2026-07-24T00:00:00Z"),
  createdBy: { id: "admin-1", name: "Super Admin" },
};

function req(url: string, init?: Record<string, unknown>) {
  return new NextRequest(url, init as any);
}

/* ── Tests ──────────────────────────────────────────────────────────── */

describe("MASHWARA-E2E-001: End-to-End Mashwara Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ user: HQ_USER });
    mocks.requireCapability.mockResolvedValue({ user: HQ_USER });
    mocks.resolveMashwaraAccess.mockResolvedValue(true);
    mocks.resolveMashwaraActorCity.mockResolvedValue({ cityId: "city-lhr" });
    mocks.meetingFindUnique.mockResolvedValue(BASE_MEETING);
    mocks.meetingFindMany.mockResolvedValue([BASE_MEETING]);
    mocks.meetingCount.mockResolvedValue(1);
    mocks.staffFindFirst.mockResolvedValue({ id: "staff-admin-1" });
    mocks.notifyTaskAssignee.mockResolvedValue("notification-1");
    mocks.staffFindMany.mockImplementation(async (args: any) => {
      const all = [
        { id: "staff-coach", isActive: true, assignedCityId: "city-lhr" },
        { id: "staff-photo", isActive: true, assignedCityId: "city-lhr" },
      ];
      if (args?.where?.id?.in) {
        return all.filter((s) => args.where.id.in.includes(s.id));
      }
      return all;
    });
    mocks.teamFindMany.mockImplementation(async (args: any) => {
      const all = [
        { id: "team-sports", isActive: true, cityId: "city-lhr" },
        { id: "team-media", isActive: true, cityId: "city-lhr" },
      ];
      if (args?.where?.id?.in) {
        return all.filter((team) => args.where.id.in.includes(team.id));
      }
      return all;
    });
  });

  /* ── 1. Meeting Lifecycle ────────────────────────────────────────── */
  describe("Meeting Lifecycle", () => {
    it("creates a scheduled meeting", async () => {
      mocks.meetingCreate.mockResolvedValue({
        id: "meeting-new",
        cityId: "city-lhr",
        title: "Weekly Sync",
        scheduledAt: new Date("2026-08-05T09:00:00Z"),
        location: "Room A",
        status: "scheduled",
        minutesSummary: "Initial agenda",
        createdAt: new Date(),
      });

      const response = await createPOST(
        req("http://localhost/api/admin/mashwara", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cityId: "city-lhr",
            title: "Weekly Sync",
            scheduledAt: "2026-08-05T09:00:00Z",
            location: "Room A",
            minutesSummary: "Initial agenda",
          }),
        }),
      );

      expect(response.status).toBe(201);
      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          entityType: "mashwara_meeting",
        }),
      );
    });

    it("retrieves meeting list with pagination", async () => {
      mocks.meetingFindMany.mockResolvedValue([
        BASE_MEETING,
        { ...BASE_MEETING, id: "meeting-2", title: "Second Meeting" },
      ]);
      mocks.meetingCount.mockResolvedValue(2);

      const response = await listGET(
        req("http://localhost/api/admin/mashwara?page=1&pageSize=20"),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(2);
    });

    it("retrieves meeting detail with all sub-resources", async () => {
      mocks.attendeeFindMany.mockResolvedValue([
        {
          id: "att-1",
          attendanceStatus: "present",
          notes: null,
          checkedInAt: null,
          staffMeta: {
            id: "staff-1",
            role: "city_head",
            user: { id: "u-1", name: "City Head" },
          },
        },
      ]);
      mocks.decisionFindMany.mockResolvedValue([
        {
          id: "dec-1",
          decision: "Approve budget",
          category: "Finance",
          targetTeamId: null,
          assignedToId: null,
          status: "pending",
          createdAt: new Date(),
        },
      ]);
      mocks.actionItemFindMany.mockResolvedValue([
        {
          id: "ai-1",
          description: "Prepare report",
          teamId: "team-1",
          assignedToId: "staff-1",
          dueDate: null,
          status: "open",
          createdAt: new Date(),
        },
      ]);
      mocks.shareFindMany.mockResolvedValue([
        {
          id: "share-1",
          staffMetaId: "staff-ext",
          grantedAt: new Date(),
          revokedAt: null,
          isRevoked: false,
          grantedBy: { id: "admin-1", user: { name: "Admin" } },
        },
      ]);

      const response = await detailGET(
        req("http://localhost/api/admin/mashwara/meeting-1"),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.attendees).toHaveLength(1);
      expect(body.decisions).toHaveLength(1);
      expect(body.actionItems).toHaveLength(1);
      expect(body.shares).toHaveLength(1);
    });

    it("denies detail access via resolveMashwaraAccess", async () => {
      mocks.resolveMashwaraAccess.mockResolvedValue(false);

      const response = await detailGET(
        req("http://localhost/api/admin/mashwara/meeting-1"),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );

      expect(response.status).toBe(403);
    });
  });

  /* ── 2. Share Delegation Lifecycle ─────────────────────────────────── */
  describe("Share Delegation Lifecycle", () => {
    const shareStaff = {
      id: "staff-sharee",
      isActive: true,
      assignedCityId: "city-lhr",
      assignedPark: null,
      assignedGroup: null,
    };

    beforeEach(() => {
      mocks.meetingFindUnique.mockResolvedValue({
        id: "meeting-1",
        cityId: "city-lhr",
      });
      mocks.staffFindUnique.mockResolvedValue(shareStaff);
      mocks.shareFindUnique.mockResolvedValue(null);
      mocks.staffFindFirst.mockResolvedValue({ id: "staff-granter" });
    });

    it("grants a share to same-city active staff (audited)", async () => {
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
          action: "create",
          entityType: "mashwara_meeting_share",
          newValues: expect.objectContaining({
            meetingId: "meeting-1",
            staffMetaId: "staff-sharee",
          }),
        }),
      });
    });

    it("sharee can access meeting via resolveMashwaraAccess", async () => {
      mocks.resolveMashwaraAccess.mockResolvedValue(true);
      mocks.shareFindMany.mockResolvedValue([]);

      const response = await detailGET(
        req("http://localhost/api/admin/mashwara/meeting-1"),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );

      expect(response.status).toBe(200);
      expect(mocks.resolveMashwaraAccess).toHaveBeenCalled();
    });

    it("revokes a share (audited, soft-revoke)", async () => {
      mocks.shareFindFirst.mockResolvedValue({
        id: "share-1",
        isRevoked: false,
        revokedAt: null,
        staffMetaId: "staff-sharee",
      });

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
          action: "delete",
          entityType: "mashwara_meeting_share",
        }),
      });
    });

    it("denies access after share revoked — resolveMashwaraAccess returns false", async () => {
      mocks.resolveMashwaraAccess.mockResolvedValue(false);
      mocks.shareFindUnique.mockResolvedValue({ isRevoked: true });

      const response = await detailGET(
        req("http://localhost/api/admin/mashwara/meeting-1"),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );

      expect(response.status).toBe(403);
    });

    it("prevents duplicate share grant", async () => {
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

    it("rejects share grant to cross-city staff", async () => {
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
  });

  /* ── 3. Decision & Action Item ────────────────────────────────────── */
  describe("Decision & Action Item Propagation", () => {
    beforeEach(() => {
      mocks.meetingFindUnique.mockResolvedValue({
        id: "meeting-1",
        cityId: "city-lhr",
      });
    });

    it("records a decision with linked action item and audits both", async () => {
      mocks.decisionCreate.mockResolvedValue({
        id: "decision-1",
        meetingId: "meeting-1",
        decision: "Organize sports gala for August",
        category: "Activity",
        targetTeamId: "team-sports",
        assignedToId: "staff-coach",
        status: "pending",
        createdAt: new Date(),
      });
      mocks.actionItemCreate.mockResolvedValue({
        id: "ai-1",
        meetingId: "meeting-1",
        description: "Book stadium and coordinate with volunteers",
        teamId: "team-sports",
        assignedToId: "staff-coach",
        dueDate: new Date("2026-08-15"),
        status: "open",
        createdAt: new Date(),
      });

      const response = await decisionPOST(
        req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision: "Organize sports gala for August",
            category: "Activity",
            targetTeamId: "team-sports",
            assignedToId: "staff-coach",
            actionItem: {
              description: "Book stadium and coordinate with volunteers",
              teamId: "team-sports",
              assignedToId: "staff-coach",
              dueDate: "2026-08-15",
            },
          }),
        }),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.decision.id).toBe("decision-1");
      expect(body.actionItem).not.toBeNull();
      expect(body.actionItem.id).toBe("ai-1");
      expect(body.actionItem.dueDate).toBeDefined();
      expect(mocks.logAudit).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: "mashwara_decision",
          newValues: expect.objectContaining({ hasActionItem: true }),
        }),
      });
    });

    it("records standalone decision without action item", async () => {
      mocks.decisionCreate.mockResolvedValue({
        id: "decision-2",
        meetingId: "meeting-1",
        decision: "Approve budget increase",
        category: "Finance",
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
            decision: "Approve budget increase",
            category: "Finance",
          }),
        }),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.decision.id).toBe("decision-2");
      expect(body.actionItem).toBeNull();
      expect(mocks.actionItemCreate).not.toHaveBeenCalled();
    });

    it("target team and assigned staff are recorded for the action item", async () => {
      mocks.decisionCreate.mockResolvedValue({
        id: "decision-3",
        meetingId: "meeting-1",
        decision: "Delegate media coverage",
        category: "Media",
        targetTeamId: null,
        assignedToId: null,
        status: "pending",
        createdAt: new Date(),
      });
      mocks.actionItemCreate.mockResolvedValue({
        id: "ai-2",
        meetingId: "meeting-1",
        description: "Coordinate with photographers",
        teamId: "team-media",
        assignedToId: "staff-photo",
        dueDate: null,
        status: "open",
        createdAt: new Date(),
      });

      const response = await decisionPOST(
        req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision: "Delegate media coverage",
            actionItem: {
              description: "Coordinate with photographers",
              teamId: "team-media",
              assignedToId: "staff-photo",
            },
          }),
        }),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );

      expect(response.status).toBe(201);
      expect(mocks.actionItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            teamId: "team-media",
            assignedToId: "staff-photo",
          }),
        }),
      );
    });
  });

  /* ── 4. Cross-City Scope Boundaries ──────────────────────────────── */
  describe("Cross-City Scope Boundaries", () => {
    it("city_head can list their own city's meetings", async () => {
      mocks.requireAuth.mockResolvedValue({ user: CITY_HEAD_LHR });
      mocks.requireCapability.mockResolvedValue({ user: CITY_HEAD_LHR });
      mocks.meetingFindMany.mockResolvedValue([BASE_MEETING]);
      mocks.meetingCount.mockResolvedValue(1);

      const response = await listGET(
        req("http://localhost/api/admin/mashwara"),
      );
      expect(response.status).toBe(200);
      expect(mocks.meetingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cityId: "city-lhr" },
        }),
      );
    });

    it("city_head is scoped to their assigned city in list", async () => {
      mocks.requireAuth.mockResolvedValue({ user: CITY_HEAD_LHR });
      mocks.requireCapability.mockResolvedValue({ user: CITY_HEAD_LHR });
      mocks.meetingFindMany.mockResolvedValue([]);
      mocks.meetingCount.mockResolvedValue(0);

      await listGET(req("http://localhost/api/admin/mashwara"));

      expect(mocks.meetingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cityId: "city-lhr" }),
        }),
      );
    });

    it("denies share grant from cross-city head via granter scope check", async () => {
      mocks.requireAuth.mockResolvedValue({ user: CITY_HEAD_KHI });
      mocks.requireCapability.mockResolvedValue({ user: CITY_HEAD_KHI });
      mocks.resolveMashwaraActorCity.mockResolvedValue({
        error: "Access denied",
        status: 403,
      });

      const response = await grantSharePOST(
        req("http://localhost/api/admin/mashwara/meeting-1/shares", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ staffMetaId: "staff-any" }),
        }),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );

      expect(response.status).toBe(403);
      expect(mocks.shareCreate).not.toHaveBeenCalled();
    });

    it("denies cross-city detail access via resolveMashwaraAccess", async () => {
      mocks.resolveMashwaraAccess.mockResolvedValue(false);

      const response = await detailGET(
        req("http://localhost/api/admin/mashwara/meeting-khi"),
        { params: Promise.resolve({ id: "meeting-khi" }) },
      );

      expect(response.status).toBe(403);
    });
  });

  /* ── 5. Audit Logging Verification ─────────────────────────────────── */
  describe("Audit Logging", () => {
    it("audits meeting creation", async () => {
      mocks.meetingCreate.mockResolvedValue({
        id: "meeting-new",
        cityId: "city-lhr",
        title: "Audited Meeting",
        scheduledAt: new Date(),
        location: null,
        status: "scheduled",
        minutesSummary: null,
        createdAt: new Date(),
      });

      await createPOST(
        req("http://localhost/api/admin/mashwara", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cityId: "city-lhr",
            title: "Audited Meeting",
            scheduledAt: "2026-08-10T09:00:00Z",
          }),
        }),
      );

      expect(mocks.logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "admin-1",
          action: "create",
          entityType: "mashwara_meeting",
          newValues: expect.objectContaining({
            cityId: "city-lhr",
            title: "Audited Meeting",
          }),
        }),
      );
    });

    it("audits decision creation", async () => {
      mocks.meetingFindUnique.mockResolvedValue({
        id: "meeting-1",
        cityId: "city-lhr",
      });
      mocks.decisionCreate.mockResolvedValue({
        id: "dec-1",
        meetingId: "meeting-1",
        decision: "Test decision",
        category: null,
        targetTeamId: null,
        assignedToId: null,
        status: "pending",
        createdAt: new Date(),
      });

      await decisionPOST(
        req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision: "Test decision" }),
        }),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );

      expect(mocks.logAudit).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "create",
          entityType: "mashwara_decision",
          newValues: expect.objectContaining({
            meetingId: "meeting-1",
            decision: "Test decision",
          }),
        }),
      });
    });

    it("audits share grant", async () => {
      mocks.meetingFindUnique.mockResolvedValue({
        id: "meeting-1",
        cityId: "city-lhr",
      });
      mocks.staffFindUnique.mockResolvedValue({
        id: "staff-1",
        isActive: true,
        assignedCityId: "city-lhr",
        assignedPark: null,
        assignedGroup: null,
      });
      mocks.shareCreate.mockResolvedValue({
        id: "share-1",
        meetingId: "meeting-1",
        staffMetaId: "staff-1",
        grantedAt: new Date(),
        isRevoked: false,
      });
      mocks.staffFindFirst.mockResolvedValue({ id: "staff-granter" });
      mocks.shareFindUnique.mockResolvedValue(null);

      await grantSharePOST(
        req("http://localhost/api/admin/mashwara/meeting-1/shares", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ staffMetaId: "staff-1" }),
        }),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );

      expect(mocks.logAudit).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "create",
          entityType: "mashwara_meeting_share",
          newValues: expect.objectContaining({
            meetingId: "meeting-1",
            staffMetaId: "staff-1",
          }),
        }),
      });
    });

    it("audits share revocation", async () => {
      mocks.meetingFindUnique.mockResolvedValue({
        id: "meeting-1",
        cityId: "city-lhr",
      });
      mocks.shareFindFirst.mockResolvedValue({
        id: "share-1",
        isRevoked: false,
        revokedAt: null,
        staffMetaId: "staff-1",
      });

      await revokeShareDELETE(
        req("http://localhost/api/admin/mashwara/meeting-1/shares/share-1", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "meeting-1", shareId: "share-1" }) },
      );

      expect(mocks.logAudit).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "delete",
          entityType: "mashwara_meeting_share",
          oldValues: expect.objectContaining({ isRevoked: false }),
          newValues: expect.objectContaining({ isRevoked: true }),
        }),
      });
    });
  });

  /* ── 6. Capability Gates ──────────────────────────────────────────── */
  describe("Capability Gates", () => {
    it("denies listing without mashwara.view", async () => {
      mocks.requireCapability.mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );

      const response = await listGET(
        req("http://localhost/api/admin/mashwara"),
      );
      expect(response.status).toBe(403);
      expect(mocks.meetingFindMany).not.toHaveBeenCalled();
    });

    it("denies creation without mashwara.manage", async () => {
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
            scheduledAt: "2026-08-10T09:00:00Z",
          }),
        }),
      );

      expect(response.status).toBe(403);
      expect(mocks.meetingCreate).not.toHaveBeenCalled();
    });

    it("denies share grant without mashwara.manage", async () => {
      mocks.requireCapability.mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );

      const response = await grantSharePOST(
        req("http://localhost/api/admin/mashwara/meeting-1/shares", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ staffMetaId: "staff-1" }),
        }),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );

      expect(response.status).toBe(403);
      expect(mocks.shareCreate).not.toHaveBeenCalled();
    });

    it("denies decision creation without mashwara.manage", async () => {
      mocks.requireCapability.mockResolvedValue(
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      );

      const response = await decisionPOST(
        req("http://localhost/api/admin/mashwara/meeting-1/decisions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision: "Test" }),
        }),
        { params: Promise.resolve({ id: "meeting-1" }) },
      );

      expect(response.status).toBe(403);
      expect(mocks.decisionCreate).not.toHaveBeenCalled();
    });
  });
});
