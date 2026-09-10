import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const clientComponents = [
  "mobile-portal-import-page.tsx",
  "portal-import-page.tsx",
  "fees-page.tsx",
];

describe("admin client data boundary", () => {
  it("does not import the raw registration dataset into browser components", () => {
    for (const file of clientComponents) {
      const source = fs.readFileSync(path.join(process.cwd(), "src/components/modules/admin", file), "utf8");
      expect(source).not.toMatch(/import\s+.*portal-raw-dataset\.json/);
    }
  });
});
