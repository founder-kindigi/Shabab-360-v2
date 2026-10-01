import { describe, expect, it } from "vitest";
import { PRODUCT_ROLE_LABELS, productRoleLabel } from "./role-labels";

describe("product role labels", () => {
  it("uses the approved product hierarchy wording", () => {
    expect(productRoleLabel("program_admin")).toBe("Program Head");
    expect(productRoleLabel("city_head")).toBe("City Head");
    expect(productRoleLabel("park_lead")).toBe("Park Lead");
    expect(productRoleLabel("park_admin")).toBe("Park Admin");
    expect(productRoleLabel("murabbi")).toBe("Murabbi");
    expect(productRoleLabel("muawin")).toBe("Muawin");
    expect(productRoleLabel("student")).toBe("Shabab");
    expect(productRoleLabel("guardian")).toBe("Guardian");
  });

  it("never presents the technical system owner as an operating role", () => {
    expect(productRoleLabel("super_admin")).toBe("System Owner");
    expect(Object.values(PRODUCT_ROLE_LABELS)).not.toContain("Main admin");
    expect(Object.values(PRODUCT_ROLE_LABELS)).not.toContain("Admin");
  });

  it("normalises internal role casing and whitespace", () => {
    expect(productRoleLabel("  CITY_HEAD ")).toBe("City Head");
  });

  it("returns null for missing or unknown roles instead of guessing a label", () => {
    expect(productRoleLabel(null)).toBeNull();
    expect(productRoleLabel(undefined)).toBeNull();
    expect(productRoleLabel("")).toBeNull();
    expect(productRoleLabel("main_admin")).toBeNull();
  });

  it("labels every internal role exactly once", () => {
    const labels = Object.values(PRODUCT_ROLE_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
