// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { HeatmapCalendar } from "./heatmap-calendar";

vi.mock("@/components/providers/theme-provider", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

vi.mock("framer-motion", () => ({
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: any) => React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

afterEach(() => cleanup());

describe("HeatmapCalendar terminology", () => {
  it("labels the excused status Excuse and never Leave", () => {
    const { container } = render(<HeatmapCalendar data={{ "2026-08-16": "excused" }} />);

    expect(container.textContent).toContain("Excuse");
    expect(container.textContent).not.toContain("Leave");
  });
});
