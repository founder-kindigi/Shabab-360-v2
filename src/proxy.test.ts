import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const request = (path: string, method: string, headers?: HeadersInit) =>
  new NextRequest(`https://pilot.shabab360.pk${path}`, { method, headers });

describe("API origin proxy", () => {
  it("rejects a cross-origin application mutation", () => {
    const response = proxy(
      request("/api/admin/cities", "POST", { origin: "https://attacker.example" })
    );

    expect(response.status).toBe(403);
  });

  it("rejects an application mutation with no browser-origin evidence", () => {
    const response = proxy(request("/api/admin/cities", "DELETE"));

    expect(response.status).toBe(403);
  });

  it("allows a same-origin application mutation", () => {
    const response = proxy(
      request("/api/admin/cities", "PATCH", { origin: "https://pilot.shabab360.pk" })
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not apply the mutation policy to safe application reads", () => {
    const response = proxy(request("/api/admin/cities", "GET"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("leaves auth endpoints for their route-specific protections", () => {
    const response = proxy(
      request("/api/auth/reset-password", "POST", { origin: "https://attacker.example" })
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
