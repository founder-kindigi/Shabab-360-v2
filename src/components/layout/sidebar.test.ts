import { describe, expect, it } from "vitest";
import { getNavItems } from "./sidebar";

const translate = (key: string) => key;

describe("sidebar navigation access boundaries", () => {
  it("shows Cities only to Super Admin and Program Admin", () => {
    expect(
      getNavItems("super_admin", translate).some((item) => item.id === "admin-cities")
    ).toBe(true);
    expect(
      getNavItems("program_admin", translate).some((item) => item.id === "admin-cities")
    ).toBe(true);
  });

  it("hides Cities from City Head and park-scoped roles", () => {
    for (const role of ["city_head", "park_admin", "park_lead", "murabbi"]) {
      expect(
        getNavItems(role, translate).some((item) => item.id === "admin-cities")
      ).toBe(false);
    }
  });

  it("shows collaboration teams only to roles with organisation.view", () => {
    for (const role of ["super_admin", "program_admin", "city_head", "park_lead"]) {
      expect(
        getNavItems(role, translate).some(
          (item) => item.id === "admin-collaboration-teams"
        )
      ).toBe(true);
    }

    for (const role of ["park_admin", "murabbi"]) {
      expect(
        getNavItems(role, translate).some(
          (item) => item.id === "admin-collaboration-teams"
        )
      ).toBe(false);
    }
  });

  it("shows Content Planner to every role with its default content.view access", () => {
    for (const role of ["super_admin", "program_admin", "city_head", "park_lead", "murabbi"]) {
      expect(
        getNavItems(role, translate).some((item) => item.id === "admin-content-planner")
      ).toBe(true);
    }

    expect(
      getNavItems("park_admin", translate).some((item) => item.id === "admin-content-planner")
    ).toBe(false);
  });

  it("exposes each released admin workspace to Super Admin", () => {
    const visible = getNavItems("super_admin", translate).map((item) => item.id);

    for (const page of [
      "admin-content-planner",
      "admin-events",
      "admin-calling",
      "admin-mashwara",
      "admin-procurement",
      "admin-gamification",
      "admin-knowledge-base",
      "admin-certificates",
      "admin-collaboration-teams",
    ]) {
      expect(visible).toContain(page);
    }
  });
});
