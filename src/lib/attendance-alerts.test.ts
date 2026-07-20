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

const currentEvent = {
  id: "event-3",
  title: "Weekly session",
  groupId: "group-1",
  eventDate: new Date("2026-07-14T00:00:00.000Z"),
  group: { batch: { settings: { warningAbsents: 3, dropoutAbsents: 6 } } },
};

describe("attendance alert streaks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventFindUnique.mockResolvedValue(currentEvent);
    mocks.participantFindFirst.mockResolvedValue({
      id: "participant-1",
      name: "Participant",
      guardianLinks: [],
    });
    mocks.eventFindMany.mockResolvedValue([
      { id: "event-3" },
      { id: "event-2" },
      { id: "event-1" },
    ]);
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
      id: "participant-1",
      name: "Participant",
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
    mocks.notificationFindFirst.mockResolvedValue(null);

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
