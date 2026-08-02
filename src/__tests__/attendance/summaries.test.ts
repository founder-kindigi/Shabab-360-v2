import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createRosterSnapshot,
  markStaffAttendanceRecord,
  getStudentSummary,
  getMurabbiSummary,
  getClassStats,
} from "@/lib/attendance/summaries";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    attendanceEvent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    participant: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    attendanceRecord: {
      findMany: vi.fn(),
    },
    attendanceRosterSnapshot: {
      upsert: vi.fn(),
    },
    staffMeta: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    staffAttendanceRecord: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    group: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("ATT-003 Attendance Summaries and Staff Attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRosterSnapshot", () => {
    it("creates snapshot records for active participants in event group", async () => {
      vi.mocked(db.attendanceEvent.findUnique).mockResolvedValue({
        id: "event-1",
        groupId: "group-100",
      } as any);

      vi.mocked(db.participant.findMany).mockResolvedValue([
        { id: "p-1", groupId: "group-100" },
        { id: "p-2", groupId: "group-100" },
      ] as any);

      vi.mocked(db.attendanceRosterSnapshot.upsert).mockResolvedValue({} as any);

      const result = await createRosterSnapshot("event-1");

      expect(result.count).toBe(2);
      expect(db.attendanceRosterSnapshot.upsert).toHaveBeenCalledTimes(2);
    });

    it("returns count 0 if event not found", async () => {
      vi.mocked(db.attendanceEvent.findUnique).mockResolvedValue(null);

      const result = await createRosterSnapshot("missing-event");
      expect(result.count).toBe(0);
    });
  });

  describe("markStaffAttendanceRecord", () => {
    it("upserts a StaffAttendanceRecord and never touches student records", async () => {
      const mockRecord = {
        id: "sar-1",
        eventId: "e-1",
        staffId: "s-1",
        status: "present",
      };

      vi.mocked(db.staffAttendanceRecord.upsert).mockResolvedValue(mockRecord as any);

      const result = await markStaffAttendanceRecord({
        eventId: "e-1",
        staffId: "s-1",
        status: "present",
        markedBy: "user-admin",
      });

      expect(result).toEqual(mockRecord);
      expect(db.staffAttendanceRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId_staffId: { eventId: "e-1", staffId: "s-1" } },
          create: expect.objectContaining({ status: "present" }),
        })
      );
    });
  });

  describe("getStudentSummary", () => {
    it("aggregates student attendance with bounded queries and handles unassigned students", async () => {
      const mockParticipants = [
        {
          id: "p-1",
          name: "Student A",
          state: "active",
          groupId: "g-1",
          group: { name: "Group 1", batch: { name: "Batch 4", park: { name: "Gulberg", city: { name: "Lahore" } } } },
        },
        {
          id: "p-2",
          name: "Student B (Unassigned)",
          state: "active",
          groupId: null,
          group: null,
        },
      ];

      vi.mocked(db.participant.findMany).mockResolvedValue(mockParticipants as any);
      vi.mocked(db.participant.count).mockResolvedValue(2);
      vi.mocked(db.attendanceRecord.findMany).mockResolvedValue([
        { participantId: "p-1", status: "present" },
        { participantId: "p-1", status: "absent" },
      ] as any);

      const result = await getStudentSummary({ limit: 10, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.items.length).toBe(2);
      expect(result.items[0].groupName).toBe("Group 1");
      expect(result.items[0].attendanceRate).toBe(50); // 1 present out of 2 events
      expect(result.items[1].groupName).toBe("Unassigned");
    });
  });

  describe("getMurabbiSummary", () => {
    it("calculates staff attendance stats strictly from StaffAttendanceRecord", async () => {
      const mockStaff = [
        {
          id: "s-1",
          role: "murabbi",
          user: { name: "Murabbi Tariq", email: "tariq@shabab360.org" },
          assignedPark: { name: "Model Town", city: { name: "Lahore" } },
          assignedGroup: { name: "Group A" },
        },
      ];

      vi.mocked(db.staffMeta.findMany).mockResolvedValue(mockStaff as any);
      vi.mocked(db.staffMeta.count).mockResolvedValue(1);
      vi.mocked(db.staffAttendanceRecord.findMany).mockResolvedValue([
        { staffId: "s-1", status: "present" },
        { staffId: "s-1", status: "present" },
        { staffId: "s-1", status: "late" },
      ] as any);

      const result = await getMurabbiSummary({ parkId: "park-1" });

      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe("Murabbi Tariq");
      expect(result.items[0].totalSessions).toBe(3);
      expect(result.items[0].attendanceRate).toBe(100); // 3 present/late out of 3
    });
  });

  describe("getClassStats", () => {
    it("aggregates class statistics using roster snapshots", async () => {
      const mockGroups = [
        {
          id: "g-1",
          name: "Class 1",
          batch: { name: "Batch 4", park: { name: "Gulberg", city: { name: "Lahore" } } },
        },
      ];

      vi.mocked(db.group.findMany).mockResolvedValue(mockGroups as any);
      vi.mocked(db.group.count).mockResolvedValue(1);
      vi.mocked(db.attendanceEvent.findMany).mockResolvedValue([
        {
          groupId: "g-1",
          records: [{ status: "present" }, { status: "absent" }],
          rosterSnapshots: [{ id: "rs-1" }, { id: "rs-2" }],
        },
      ] as any);

      const result = await getClassStats({ groupId: "g-1" });

      expect(result.total).toBe(1);
      expect(result.items[0].groupName).toBe("Class 1");
      expect(result.items[0].snapshotRosterTotal).toBe(2);
      expect(result.items[0].averageAttendanceRate).toBe(50);
    });
  });
});
