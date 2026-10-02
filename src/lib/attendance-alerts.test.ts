import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
  eventFindMany: vi.fn(),
  participantFindFirst: vi.fn(),
  recordFindMany: vi.fn(),
  notificationFindFirst: vi.fn(),
  sendAbsenceAlert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    attendanceEvent: {
      findUnique: mocks.eventFindUnique,
      findMany: mocks.eventFindMany,
    },
    participant: { findFirst: mocks.participantFindFirst },
    attendanceRecord: { findMany: mocks.recordFindMany },
    notification: { findFirst: mocks.notificationFindFirst },
  },
}));
vi.mock("@/lib/email-service", () => ({ sendAbsenceAlert: mocks.sendAbsenceAlert }));

import { checkAttendanceAlerts } from "./attendance-alerts";

// currentEvent.eventDate is 2026-07-14 UTC (2026-07-14 in PKT +05:00)
const currentEvent = {
  id: "event-3",
  title: "Weekly session",
  groupId: "group-1",
  eventDate: new Date("2026-07-14T00:00:00.000Z"),
  group: { batch: { settings: { warningAbsents: 3, dropoutAbsents: 6 } } },
};

// A fully eligible participant: joined well before any test event, active, no dropout.
const eligibleParticipant = {
  id: "participant-1",
  name: "Participant",
  state: "active",
  joinedAt: new Date("2026-01-01T00:00:00.000Z"),
  dropoutAt: null,
  reactivatedAt: null,
  guardianLinks: [],
};

// Three group events ordered most-recent first, each with an eventDate.
// All fall on or before currentEvent.eventDate (2026-07-14).
const threeEvents = [
  { id: "event-3", eventDate: new Date("2026-07-14T00:00:00.000Z") },
  { id: "event-2", eventDate: new Date("2026-07-07T00:00:00.000Z") },
  { id: "event-1", eventDate: new Date("2026-06-30T00:00:00.000Z") },
];

describe("attendance alert streaks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventFindUnique.mockResolvedValue(currentEvent);
    mocks.participantFindFirst.mockResolvedValue(eligibleParticipant);
    mocks.eventFindMany.mockResolvedValue(threeEvents);
    mocks.notificationFindFirst.mockResolvedValue(null);
  });

  it.each(["present", "excused"])("breaks an absence streak when the prior record is %s", async (status) => {
    mocks.recordFindMany.mockResolvedValue([
      { eventId: "event-3", status: "absent" },
      { eventId: "event-2", status },
      { eventId: "event-1", status: "absent" },
    ]);

    const result = await checkAttendanceAlerts("participant-1", "event-3");

    expect(result).toEqual({ warnings: [], dropouts: [] });
    expect(mocks.notificationFindFirst).not.toHaveBeenCalled();
    expect(mocks.sendAbsenceAlert).not.toHaveBeenCalled();
  });

  it("queues a warning only when the consecutive absence threshold is met", async () => {
    mocks.recordFindMany.mockResolvedValue([
      { eventId: "event-3", status: "absent" },
      { eventId: "event-2", status: "absent" },
      { eventId: "event-1", status: "absent" },
    ]);
    mocks.participantFindFirst.mockResolvedValue({
      ...eligibleParticipant,
      guardianLinks: [
        {
          guardian: {
            id: "guardian-1",
            userId: "guardian-user-1",
            name: "Guardian",
            phone: "03001234567",
            user: { email: "guardian@example.test" },
          },
        },
      ],
    });

    const result = await checkAttendanceAlerts("participant-1", "event-3");

    expect(result.warnings).toHaveLength(1);
    expect(mocks.sendAbsenceAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "guardian-1" }),
      { id: "participant-1", name: "Participant" },
      "Weekly session",
      3,
      "warning",
      3
    );
  });
});

describe("attendance alert eligibility filtering (F-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventFindUnique.mockResolvedValue(currentEvent);
    mocks.notificationFindFirst.mockResolvedValue(null);
    mocks.recordFindMany.mockResolvedValue([]);
  });

  it("does not count absences from sessions before the participant joined", async () => {
    // Participant joined on 2026-07-07 — only event-2 and event-3 are eligible.
    mocks.participantFindFirst.mockResolvedValue({
      ...eligibleParticipant,
      joinedAt: new Date("2026-07-07T00:00:00.000Z"),
    });
    // event-1 (2026-06-30) is before joinedAt — ineligible; events 2 and 3 are eligible.
    mocks.eventFindMany.mockResolvedValue(threeEvents);
    // All three sessions have absent records, but only 2 are in the eligible window.
    mocks.recordFindMany.mockResolvedValue([
      { eventId: "event-3", status: "absent" },
      { eventId: "event-2", status: "absent" },
      { eventId: "event-1", status: "absent" },
    ]);

    const result = await checkAttendanceAlerts("participant-1", "event-3");

    // streak = 2 (event-3 and event-2), below warning threshold of 3 → no alert
    expect(result).toEqual({ warnings: [], dropouts: [] });
    expect(mocks.sendAbsenceAlert).not.toHaveBeenCalled();
  });

  it("does not count absences inside a dropout→rejoin interruption gap", async () => {
    // Participant dropped out on 2026-07-07 and rejoined on 2026-07-14.
    // event-2 (2026-07-07) falls on the dropout day — ineligible.
    // event-3 (2026-07-14) is the rejoin day — eligible.
    // event-1 (2026-06-30) precedes the dropout — eligible.
    mocks.participantFindFirst.mockResolvedValue({
      ...eligibleParticipant,
      state: "active",
      dropoutAt: new Date("2026-07-07T00:00:00.000Z"),
      reactivatedAt: new Date("2026-07-14T00:00:00.000Z"),
    });
    mocks.eventFindMany.mockResolvedValue(threeEvents);
    // Three absent records but only event-1 and event-3 are eligible.
    mocks.recordFindMany.mockResolvedValue([
      { eventId: "event-3", status: "absent" },
      { eventId: "event-2", status: "absent" },
      { eventId: "event-1", status: "absent" },
    ]);

    const result = await checkAttendanceAlerts("participant-1", "event-3");

    // event-3 (rejoin day) is absent, then the next eligible is event-1 which
    // was before the dropout; the streak resets when the ordering skips event-2.
    // Streak from most-recent: event-3 absent (1), event-1 absent (2) — but event-2
    // is ineligible so it is skipped. Streak = 1 absent then event-1 = 2 absent
    // with gap — actually they are both absent so streak = 2, still below 3.
    expect(result).toEqual({ warnings: [], dropouts: [] });
    expect(mocks.sendAbsenceAlert).not.toHaveBeenCalled();
  });

  it("normal consecutive absent streak counts correctly for a fully eligible participant", async () => {
    mocks.participantFindFirst.mockResolvedValue({
      ...eligibleParticipant,
      guardianLinks: [
        {
          guardian: {
            id: "guardian-2",
            userId: "guardian-user-2",
            name: "Guardian Two",
            phone: "03009876543",
            user: { email: "g2@example.test" },
          },
        },
      ],
    });
    mocks.eventFindMany.mockResolvedValue(threeEvents);
    mocks.recordFindMany.mockResolvedValue([
      { eventId: "event-3", status: "absent" },
      { eventId: "event-2", status: "absent" },
      { eventId: "event-1", status: "absent" },
    ]);

    const result = await checkAttendanceAlerts("participant-1", "event-3");

    // All three sessions eligible, all three absent → streak = 3 = warning threshold
    expect(result.warnings).toHaveLength(1);
    expect(result.dropouts).toHaveLength(0);
    expect(mocks.sendAbsenceAlert).toHaveBeenCalledOnce();
  });

  it("does not count sessions after a current dropout (no reactivatedAt)", async () => {
    // Participant dropped out on event-2's date — event-2 and event-3 are ineligible.
    // Only event-1 is eligible (before dropout day).
    mocks.participantFindFirst.mockResolvedValue({
      ...eligibleParticipant,
      state: "dropout",
      dropoutAt: new Date("2026-07-07T00:00:00.000Z"),
      reactivatedAt: null,
    });
    mocks.eventFindMany.mockResolvedValue(threeEvents);
    mocks.recordFindMany.mockResolvedValue([
      { eventId: "event-3", status: "absent" },
      { eventId: "event-2", status: "absent" },
      { eventId: "event-1", status: "absent" },
    ]);

    const result = await checkAttendanceAlerts("participant-1", "event-3");

    // Only event-1 eligible → streak = 1, no alert
    expect(result).toEqual({ warnings: [], dropouts: [] });
    expect(mocks.sendAbsenceAlert).not.toHaveBeenCalled();
  });
});
