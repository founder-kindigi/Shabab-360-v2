// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AttendanceEditDialog } from "./attendance-edit-dialog";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "park_lead" } } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("framer-motion", () => ({
  motion: new Proxy({}, {
    get: (_target, tag: string) => ({ children, ...props }: any) => React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

afterEach(() => cleanup());

describe("AttendanceEditDialog terminology", () => {
  it("offers Excuse for the excused status while the payload value stays excused", () => {
    render(
      <AttendanceEditDialog
        open
        onOpenChange={vi.fn()}
        eventId="event-1"
        recordId="record-1"
        participantName="Alpha Student"
        currentStatus="present"
      />
    );

    expect(document.body.textContent).toContain("Excuse");
    expect(document.body.textContent).not.toContain("Leave");

    // Selecting the Excuse option carries the unchanged `excused` code.
    fireEvent.click(screen.getByText("Excuse"));
    expect(document.body.textContent).toContain("excused");
  });
});
