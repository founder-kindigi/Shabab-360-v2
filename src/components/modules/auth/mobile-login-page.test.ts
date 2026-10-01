import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

const mocks = vi.hoisted(() => ({signIn: vi.fn()}));

vi.mock("next-auth/react", () => ({signIn: mocks.signIn}));

import { MobileLoginPage } from "./mobile-login-page";

describe("MobileLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty password field and no embedded demo credentials", () => {
    const html = renderToString(React.createElement(MobileLoginPage, {}));
    expect(html).contain("Welcome Back");
    expect(html).contain("Sign In to Shabab 360");
    expect(html).not.contain("password123");
    expect(html).not.contain("Password123!");
    expect(html).not.contain("Test Prefill Accounts");
  });
});
