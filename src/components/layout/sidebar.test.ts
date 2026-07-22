import { describe, expect, it } from "vitest";
import { getNavItems } from "./sidebar";

const translate = (key: string) => key;

describe("collaboration team navigation", () => {
  it("is visible only to super administrators", () => {
    expect(getNavItems("super_admin", translate).some((item) => item.id === "admin-collaboration-teams")).toBe(true);

    for (const role of ["program_admin", "city_head", "park_lead", "park_admin", "murabbi"]) {
      expect(getNavItems(role, translate).some((item) => item.id === "admin-collaboration-teams")).toBe(false);
    }
  });
});
