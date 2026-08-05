import { describe, it, expect } from "vitest";
import {
  isCollaborationTeamCode,
  getCollaborationTeamMeta,
  canManageTeamMemberships,
  COLLABORATION_TEAM_CODES,
} from "../membership";

describe("Collaboration Teams Membership Helper", () => {
  it("validates all 5 approved collaboration team codes", () => {
    expect(COLLABORATION_TEAM_CODES).toEqual(["sports", "skills", "tadreeb", "media", "muawin"]);
    expect(isCollaborationTeamCode("sports")).toBe(true);
    expect(isCollaborationTeamCode("tadreeb")).toBe(true);
    expect(isCollaborationTeamCode("invalid_code")).toBe(false);
  });

  it("returns correct team metadata and badge colors", () => {
    const meta = getCollaborationTeamMeta("sports");
    expect(meta.name).toBe("Sports & Physical Fitness");
    expect(meta.badgeColor).toContain("amber");
  });

  it("handles fallback metadata for custom team codes", () => {
    const meta = getCollaborationTeamMeta("custom_team");
    expect(meta.name).toBe("custom_team");
    expect(meta.badgeColor).toContain("slate");
  });

  it("checks authorization roles for team management", () => {
    expect(canManageTeamMemberships("super_admin")).toBe(true);
    expect(canManageTeamMemberships("city_head")).toBe(true);
    expect(canManageTeamMemberships("murabbi")).toBe(false);
    expect(canManageTeamMemberships(null)).toBe(false);
  });
});
