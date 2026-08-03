import { describe, expect, it } from "vitest";
import { canLoadCollaborationTeams } from "./collaboration-teams-page";

describe("Collaboration Teams query gate", () => {
  it("waits for session resolution before issuing any teams request", () => {
    expect(canLoadCollaborationTeams(false, false, "")).toBe(false);
  });

  it("requires an HQ city context before listing teams", () => {
    expect(canLoadCollaborationTeams(true, true, "")).toBe(false);
    expect(canLoadCollaborationTeams(true, true, "city-lahore")).toBe(true);
  });

  it("allows scoped users to rely on server-derived city scope", () => {
    expect(canLoadCollaborationTeams(true, false, "")).toBe(true);
  });
});
