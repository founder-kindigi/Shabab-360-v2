import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Calling UI validation schemas", () => {
  const logInteractionSchema = z.object({
    assignmentId: z.string().min(1),
    outcome: z.enum(["reached", "no_answer", "busy", "wrong_number", "callback_requested"]),
    notes: z.string().max(2000).optional(),
    scheduledFor: z.string().optional(),
  });

  it("accepts a valid call interaction", () => {
    const result = logInteractionSchema.safeParse({
      assignmentId: "c123456789012345678901234",
      outcome: "reached",
      notes: "Spoke with guardian",
    });
    expect(result.success).toBe(true);
  });

  it("accepts interaction with follow-up date", () => {
    const result = logInteractionSchema.safeParse({
      assignmentId: "c123456789012345678901234",
      outcome: "callback_requested",
      scheduledFor: "2026-08-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid outcome", () => {
    const result = logInteractionSchema.safeParse({
      assignmentId: "c123456789012345678901234",
      outcome: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty assignmentId", () => {
    const result = logInteractionSchema.safeParse({
      assignmentId: "",
      outcome: "reached",
    });
    expect(result.success).toBe(false);
  });
});

describe("Campaign creation schema", () => {
  const createCampaignSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    cityId: z.string().optional(),
  });

  it("accepts valid campaign", () => {
    const result = createCampaignSchema.safeParse({
      name: "Lahore Batch 4",
      startDate: "2026-08-01T00:00:00Z",
      endDate: "2026-09-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createCampaignSchema.safeParse({
      name: "",
      startDate: "2026-08-01T00:00:00Z",
      endDate: "2026-09-01T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});
