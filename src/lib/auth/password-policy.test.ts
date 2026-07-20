import { describe, expect, it } from "vitest";
import { getPasswordValidationError } from "./password-policy";

describe("password policy", () => {
  it("accepts a 12-character password", () => {
    expect(getPasswordValidationError("strong-pass1")).toBeNull();
  });

  it("rejects short, blank, and oversized passwords", () => {
    expect(getPasswordValidationError("short-pass")).toMatch("at least");
    expect(getPasswordValidationError("            ")).toBe("Password cannot be blank");
    expect(getPasswordValidationError("a".repeat(129))).toMatch("not exceed");
  });
});
