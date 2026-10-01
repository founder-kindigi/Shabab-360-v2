import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  participant: { findUnique: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: { participant: mocks.participant } }));

import { canAccessParticipantProfile } from "./scope";

describe("participant profile park boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies a Park Admin access to a participant at another park in the same city", async () => {
    mocks.participant.findUnique.mockResolvedValue({
      userId: null,
      groupId: "group-foreign",
      group: { parkId: "park-foreign", batch: { cityId: "city-own", parkId: "park-anchor" } },
    });

    await expect(canAccessParticipantProfile(
      { id: "park-admin", role: "park_admin", assignedParkId: "park-own" },
      "participant-foreign",
      "city-own"
    )).resolves.toBe(false);
  });
});
