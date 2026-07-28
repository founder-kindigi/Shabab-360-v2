import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const configPath = join(__dirname, "../../../vitest.config.ts");
const config = readFileSync(configPath, "utf8");

describe("Vitest isolation configuration", () => {
  it("overrides database configuration with non-routable test-only URLs", () => {
    expect(config).toContain('DATABASE_URL: TEST_DATABASE_URL');
    expect(config).toContain('DIRECT_URL: TEST_DIRECT_URL');
    expect(config).toContain('127.0.0.1:1');
  });

  it("resets and restores mock implementations between tests", () => {
    expect(config).toContain("mockReset: true");
    expect(config).toContain("restoreMocks: true");
  });
});
