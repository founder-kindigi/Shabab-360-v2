import { describe, expect, it } from "vitest";

const bootstrap = await import("../../scripts/bootstrap-super-admin.cjs");

describe("Super Admin bootstrap command", () => {
  it("defaults to a non-writing dry run", () => {
    expect(bootstrap.normalizeOptions(bootstrap.parseArgs([
      "--email", "owner@example.com",
      "--name", "Owner Account",
    ]))).toMatchObject({ execute: false, revealTemporaryPassword: false });
  });

  it("requires explicit execution before revealing a credential", () => {
    expect(() => bootstrap.normalizeOptions(bootstrap.parseArgs([
      "--email", "owner@example.com",
      "--name", "Owner Account",
      "--reveal-temporary-password",
    ]))).toThrow("can only be used with --execute");
  });

  it("requires explicit execution before allowing a Super Admin replacement", () => {
    expect(() => bootstrap.normalizeOptions(bootstrap.parseArgs([
      "--email", "owner@example.com",
      "--name", "Owner Account",
      "--replace-existing-super-admin",
    ]))).toThrow("can only be used with --execute");
  });

  it("rejects malformed account input and unsupported arguments", () => {
    expect(() => bootstrap.normalizeOptions(bootstrap.parseArgs([
      "--email", "not-an-email",
      "--name", "Owner Account",
    ]))).toThrow("valid --email");
    expect(() => bootstrap.parseArgs(["--force"])).toThrow("Unexpected argument");
  });

  it("creates a strong URL-safe temporary password without making database calls", () => {
    const temporaryPassword = bootstrap.createTemporaryPassword();
    expect(temporaryPassword).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});
