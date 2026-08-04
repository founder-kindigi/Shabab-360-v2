import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: mocks.useSession,
  signOut: mocks.signOut,
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ResetPasswordPage } from "./reset-password-page";

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires the current password for a normal password change", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { name: "Staff Member", mustResetPwd: false } },
    });

    expect(renderToString(React.createElement(ResetPasswordPage))).toContain("Current Password");
  });

  it("does not request the old password during a forced reset", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { name: "Staff Member", mustResetPwd: true } },
    });

    expect(renderToString(React.createElement(ResetPasswordPage))).not.toContain("Current Password");
  });
});
