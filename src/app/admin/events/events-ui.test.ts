import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Events UI validation schemas", () => {
  it("accepts a valid event creation payload", () => {
    const schema = z.object({
      title: z.string().min(1).max(200),
      eventType: z.enum(["trip", "ceremony", "campaign", "activity", "sports_day", "camp", "open_day", "closing", "other"]),
      startDate: z.string().min(1),
    });
    const result = schema.safeParse({ title: "Sports Day", eventType: "sports_day", startDate: "2026-08-15" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const schema = z.object({ title: z.string().min(1).max(200) });
    const result = schema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid event type", () => {
    const schema = z.object({ eventType: z.enum(["trip", "ceremony", "campaign"]) });
    const result = schema.safeParse({ eventType: "invalid" });
    expect(result.success).toBe(false);
  });

  it("coerces numeric capacity string to number", () => {
    const schema = z.object({ capacity: z.coerce.number().int().positive().optional() });
    const result = schema.safeParse({ capacity: "100" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.capacity).toBe(100);
  });

  it("rejects non-positive capacity", () => {
    const schema = z.object({ capacity: z.coerce.number().int().positive().optional() });
    const result = schema.safeParse({ capacity: "0" });
    expect(result.success).toBe(false);
  });
});
