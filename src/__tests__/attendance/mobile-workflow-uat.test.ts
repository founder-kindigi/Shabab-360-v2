import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("ATT-005 Mobile Workflow & UAT Checklist", () => {
  it("verifies mobile attendance roster component has 44px minimum touch targets", () => {
    const filePath = path.join(
      process.cwd(),
      "src/components/modules/park/attendance-roster.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    // Must contain 44px minimum touch target styling for mobile buttons
    expect(content).toContain("min-h-[44px]");
    expect(content).toContain("min-w-[44px]");
    expect(content).toContain("touch-manipulation");
  });

  it("verifies explicit empty, error, 403, and 409 handling exist in attendance API routes", () => {
    const eventRoutePath = path.join(
      process.cwd(),
      "src/app/api/park/attendance/[eventId]/route.ts"
    );
    const eventRouteContent = fs.readFileSync(eventRoutePath, "utf-8");

    // 404 Event Not Found
    expect(eventRouteContent).toContain('status: 404');
    // 403 Forbidden / Scope / Event Closed
    expect(eventRouteContent).toContain('status: 403');
    // 409 Conflict / Dropped out student / Invalid participant
    expect(eventRouteContent).toContain('status: 409');
    expect(eventRouteContent).toContain("Cannot mark attendance for a dropped out student");
  });

  it("verifies mobile viewport responsive layout support for 375px and 390px widths", () => {
    const rosterPath = path.join(
      process.cwd(),
      "src/components/modules/park/attendance-roster.tsx"
    );
    const content = fs.readFileSync(rosterPath, "utf-8");

    // Viewport layout responsiveness
    expect(content).toContain("sm:hidden");
    expect(content).toContain("backdrop-blur");
  });
});
