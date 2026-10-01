// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { MobileMuawinDashboard } from "./mobile-muawin-dashboard";

const mocks = vi.hoisted(() => ({ useSession: vi.fn() }));

vi.mock("next-auth/react", () => ({
  useSession: () => mocks.useSession(),
}));

vi.mock("@/components/providers/theme-provider", () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: "light" }),
}));

describe("MobileMuawinDashboard", () => {
  afterEach(() => cleanup());

  it("renders the limited content-only Assistant Portal when a park is assigned", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { name: "Test Muawin", role: "muawin", roleLabel: "Muawin", assignedParkId: "park-1" } },
    });
    render(<MobileMuawinDashboard />);

    expect(screen.getByText("Test Muawin")).toBeDefined();
    expect(screen.getByText("Assistant Portal")).toBeDefined();
    expect(screen.getByText(/Park operations and attendance are restricted/)).toBeDefined();
  });

  it("never exposes attendance, roster or group controls", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { name: "Test Muawin", role: "muawin", assignedParkId: "park-1" } },
    });
    const { container } = render(<MobileMuawinDashboard />);
    const text = container.textContent ?? "";

    for (const forbidden of ["Mark", "Attendance Roster", "Present", "Absent", "Group", "Shabab count"]) {
      expect(text).not.toContain(forbidden);
    }
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("select")).toBeNull();
  });

  it("shows a truthful no-assignment state when the account has no park", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { name: "Test Muawin", role: "muawin", assignedParkId: null } },
    });
    render(<MobileMuawinDashboard />);

    expect(screen.getByText("No assignment yet")).toBeDefined();
    expect(screen.queryByText(/approved content modules/)).toBeNull();
  });
});
