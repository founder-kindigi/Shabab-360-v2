import { describe, expect, it } from "vitest";
import { canOpenScreen } from "./screen-access";
import type { AccessCapability } from "./capabilities";

const allowAll = (capability: AccessCapability) => ["dashboard.view", "attendance.mark", "organisation.view", "students.profile.view"].includes(capability);
const allowNone = () => false;

describe("canOpenScreen — scoped park workspace", () => {
  it.each(["park_lead", "park_admin"])("allows the scoped Park workspace for %s", (role) => {
    expect(canOpenScreen("park-workspace", role, allowAll)).toBe(true);
    expect(canOpenScreen("park-workspace", role, allowNone)).toBe(false);
  });

  it.each(["super_admin", "program_admin", "city_head", "murabbi", "muawin", "student", "guardian"])(
    "does not grant the scoped Park workspace to %s",
    (role) => {
      expect(canOpenScreen("park-workspace", role, allowAll)).toBe(false);
    }
  );

  it("keeps the reviewed gate rules unchanged", () => {
    // The generic admin park detail needs organisation.view for every role.
    expect(canOpenScreen("park-detail", "super_admin", allowAll)).toBe(true);
    expect(canOpenScreen("park-detail", "super_admin", allowNone)).toBe(false);
    // Attendance still needs attendance.mark.
    expect(canOpenScreen("attendance", "park_lead", allowAll)).toBe(true);
    expect(canOpenScreen("attendance", "park_lead", allowNone)).toBe(false);
    expect(canOpenScreen("attendance", "muawin", allowNone)).toBe(false);
    // Universal tabs stay available.
    for (const screen of ["home", "info", "more"]) {
      expect(canOpenScreen(screen, "park_lead", allowAll)).toBe(true);
    }
  });
});
