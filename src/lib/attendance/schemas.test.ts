import { describe, expect, it } from "vitest";
import {
  closeAttendanceEventSchema,
  markAttendanceSchema,
  syncAttendanceRequestSchema,
} from "./schemas";

describe("attendance mutation schemas", () => {
  it("rejects unknown fields on an attendance mark", () => {
    expect(markAttendanceSchema.safeParse({
      participantId: "ckggggggggggggggggggggggg",
      status: "present",
      cityId: "client-must-not-control-scope",
    }).success).toBe(false);
  });

  it("rejects unknown fields in offline sync mutations", () => {
    expect(syncAttendanceRequestSchema.safeParse({
      mutations: [{
        mutationId: "offline-1",
        eventId: "ckggggggggggggggggggggggg",
        participantId: "ckhhhhhhhhhhhhhhhhhhhhhhh",
        status: "present",
        actorId: "client-must-not-control-actor",
      }],
    }).success).toBe(false);
  });

  it("requires a bounded close reason and rejects extra fields", () => {
    expect(closeAttendanceEventSchema.safeParse({
      reason: "Attendance complete",
      force: true,
    }).success).toBe(false);
  });
});
