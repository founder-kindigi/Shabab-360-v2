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

  it("shows collaboration teams only to Super Admin", () => {
    expect(
      getNavItems("super_admin", translate).some(
        (item) => item.id === "admin-collaboration-teams"
      )
    ).toBe(true);

    for (const role of ["program_admin", "city_head", "park_lead", "park_admin", "murabbi"]) {
      expect(
        getNavItems(role, translate).some(
          (item) => item.id === "admin-collaboration-teams"
        )
      ).toBe(false);
    }
  });
});
