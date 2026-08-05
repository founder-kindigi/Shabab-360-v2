import { describe, expect, it } from "vitest";
import { orderSyncItems } from "./db";

describe("orderSyncItems", () => {
  it("preserves chronological order for conflicting queued attendance mutations", () => {
    const items = orderSyncItems([
      { mutationId: "later", queuedAt: "2026-07-15T10:05:00.000Z" },
      { mutationId: "earlier", queuedAt: "2026-07-15T10:00:00.000Z" },
    ]);

    expect(items.map((item) => item.mutationId)).toEqual(["earlier", "later"]);
  });

  it("handles identical timestamp ordering safely", () => {
    const ts = "2026-08-05T09:00:00.000Z";
    const items = orderSyncItems([
      { mutationId: "m1", queuedAt: ts },
      { mutationId: "m2", queuedAt: ts },
    ]);
    expect(items.length).toBe(2);
  });
});
