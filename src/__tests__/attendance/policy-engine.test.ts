import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isBatchOffDay,
  performManualDropout,
  evaluateAutomaticDropout,
} from "@/lib/attendance/policy-engine";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    participant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    attendanceRecord: {
      findMany: vi.fn(),
    },
    attendanceEvent: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(db)),
  },
}));

vi.mock("@/lib/audit", () => ({ createAuditLogData: vi.fn((data) => data) }));

describe("ATT-002 Attendance Policy Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isBatchOffDay", () => {
    it("returns false if batchSettings is null or undefined", () => {
      expect(isBatchOffDay(null, new Date("2026-08-01"))).toBe(false);
      expect(isBatchOffDay(undefined, new Date("2026-08-01"))).toBe(false);
    });

    it("detects off weekdays correctly", () => {
      // Mon (1) to Fri (5) off weekdays
      const settings = {
        automaticDropoutEnabled: true,
        dropoutConsecutiveWeeks: 3,
        offWeekdays: [{ weekday: 1 }, { weekday: 2 }, { weekday: 3 }, { weekday: 4 }, { weekday: 5 }],
      };

      // 2026-08-01 is Saturday -> not an off weekday
      const saturday = new Date("2026-08-01T10:00:00.000Z");
      expect(isBatchOffDay(settings, saturday)).toBe(false);

      // 2026-08-03 is Monday -> off weekday
      const monday = new Date("2026-08-03T10:00:00.000Z");
      expect(isBatchOffDay(settings, monday)).toBe(true);
    });

    it("detects one-off off dates correctly", () => {
      const settings = {
        automaticDropoutEnabled: true,
        dropoutConsecutiveWeeks: 3,
        offDates: [{ offDate: new Date("2026-08-14T00:00:00.000Z") }],
      };

      const holiday = new Date("2026-08-14T10:00:00.000Z");
      const regularDay = new Date("2026-08-15T10:00:00.000Z");

      expect(isBatchOffDay(settings, holiday)).toBe(true);
      expect(isBatchOffDay(settings, regularDay)).toBe(false);
    });
  });

  describe("performManualDropout", () => {
    it("returns notFound error if participant does not exist", async () => {
      vi.mocked(db.participant.findUnique).mockResolvedValue(null);

      const result = await performManualDropout({
        participantId: "non-existent",
        reason: "Relocated to another city",
        actorUserId: "user-admin-1",
      });

      expect(result).toEqual({
        success: false,
        notFound: true,
        error: "Participant not found",
      });
    });

    it("returns conflict if participant is already dropped out", async () => {
      const droppedParticipant = {
        id: "p-123",
        name: "Ali Ahmed",
        state: "dropout",
        dropoutAt: new Date("2026-07-20"),
        dropoutReason: "Prior dropout",
        dropoutSource: "manual",
      } as any;

      vi.mocked(db.participant.findUnique).mockResolvedValue(droppedParticipant);

      const result = await performManualDropout({
        participantId: "p-123",
        reason: "Duplicate manual request",
        actorUserId: "user-admin-1",
      });

      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
      expect(result.error).toBe("Participant is already dropped out");
    });

    it("successfully transitions active participant to dropout and writes its audit in the transaction", async () => {
      const activeParticipant = {
        id: "p-123",
        name: "Ali Ahmed",
        state: "active",
        group: { batch: { park: { cityId: "city-1" } } },
      } as any;

      vi.mocked(db.participant.findUnique).mockResolvedValue(activeParticipant);
      vi.mocked(db.participant.update).mockResolvedValue({
        ...activeParticipant,
        state: "dropout",
        dropoutAt: new Date(),
        dropoutReason: "3 consecutive absences",
        dropoutSource: "manual",
      });

      const result = await performManualDropout({
        participantId: "p-123",
        reason: "3 consecutive absences",
        source: "manual",
        actorUserId: "user-admin-1",
      });

      expect(result.success).toBe(true);
      expect(result.participant?.state).toBe("dropout");
      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "student_dropout_manual" }) })
      );
    });
  });

  describe("evaluateAutomaticDropout", () => {
    it("returns disabled reason if automaticDropoutEnabled is false", async () => {
      const participant = {
        id: "p-123",
        state: "active",
        group: {
          batch: {
            settings: {
              automaticDropoutEnabled: false,
              dropoutConsecutiveWeeks: 3,
            },
          },
        },
      } as any;

      vi.mocked(db.participant.findUnique).mockResolvedValue(participant);

      const result = await evaluateAutomaticDropout("p-123");
      expect(result).toEqual({
        processed: false,
        droppedOut: false,
        consecutiveWeeks: 0,
        reason: "automatic_dropout_disabled",
      });
    });

    it("triggers automatic dropout after 3 consecutive completed absent weeks excluding off-days and leave", async () => {
      const participant = {
        id: "p-123",
        state: "active",
        group: {
          batch: {
            settings: {
              automaticDropoutEnabled: true,
              dropoutConsecutiveWeeks: 3,
              offWeekdays: [{ weekday: 1 }, { weekday: 2 }, { weekday: 3 }, { weekday: 4 }, { weekday: 5 }],
              offDates: [],
            },
          },
        },
      } as any;

      vi.mocked(db.participant.findUnique).mockResolvedValue(participant);

      // 3 consecutive weekend events (Week 1: Sat July 4, Week 2: Sat July 11, Week 3: Sat July 18)
      const mockRecords = [
        {
          id: "r1",
          participantId: "p-123",
          status: "absent",
          event: { eventDate: new Date("2026-07-04T10:00:00.000Z"), isClosed: true },
        },
        {
          id: "r2",
          participantId: "p-123",
          status: "absent",
          event: { eventDate: new Date("2026-07-11T10:00:00.000Z"), isClosed: true },
        },
        {
          id: "r3",
          participantId: "p-123",
          status: "absent",
          event: { eventDate: new Date("2026-07-18T10:00:00.000Z"), isClosed: true },
        },
      ] as any;

      vi.mocked(db.attendanceEvent.findMany).mockResolvedValue(
        mockRecords.map((record) => ({ eventDate: record.event.eventDate, records: [{ status: record.status }] })) as any
      );
      vi.mocked(db.participant.update).mockResolvedValue({
        ...participant,
        state: "dropout",
        dropoutReason: "3 consecutive completed absent weeks (automatic policy)",
        dropoutSource: "automatic",
      });

      const result = await evaluateAutomaticDropout("p-123");

      expect(result.processed).toBe(true);
      expect(result.droppedOut).toBe(true);
      expect(result.consecutiveWeeks).toBe(3);
      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: "student_dropout_automatic" }) })
      );
    });

    it("resets consecutive absent week count when student attends a week", async () => {
      const participant = {
        id: "p-123",
        state: "active",
        group: {
          batch: {
            settings: {
              automaticDropoutEnabled: true,
              dropoutConsecutiveWeeks: 3,
            },
          },
        },
      } as any;

      vi.mocked(db.participant.findUnique).mockResolvedValue(participant);

      // Week 1: absent, Week 2: present (resets), Week 3: absent, Week 4: absent (total streak 2 < 3)
      const mockRecords = [
        {
          id: "r1",
          participantId: "p-123",
          status: "absent",
          event: { eventDate: new Date("2026-07-04T10:00:00.000Z"), isClosed: true },
        },
        {
          id: "r2",
          participantId: "p-123",
          status: "present",
          event: { eventDate: new Date("2026-07-11T10:00:00.000Z"), isClosed: true },
        },
        {
          id: "r3",
          participantId: "p-123",
          status: "absent",
          event: { eventDate: new Date("2026-07-18T10:00:00.000Z"), isClosed: true },
        },
        {
          id: "r4",
          participantId: "p-123",
          status: "absent",
          event: { eventDate: new Date("2026-07-25T10:00:00.000Z"), isClosed: true },
        },
      ] as any;

      vi.mocked(db.attendanceEvent.findMany).mockResolvedValue(
        mockRecords.map((record) => ({ eventDate: record.event.eventDate, records: [{ status: record.status }] })) as any
      );

      const result = await evaluateAutomaticDropout("p-123");

      expect(result.processed).toBe(true);
      expect(result.droppedOut).toBe(false);
      expect(result.consecutiveWeeks).toBe(2);
      expect(db.participant.update).not.toHaveBeenCalled();
    });
  });
});
