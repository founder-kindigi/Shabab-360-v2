import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireAuth: mocks.requireAuth,
}));

import { POST, GET, DELETE } from "./route";

function mockReq(method: string) {
  const url = "http://localhost/api/upload/document";
  return new NextRequest(url, { method });
}

describe("POST /api/upload/document", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.requireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await POST(mockReq("POST"));
    expect(response.status).toBe(401);
  });

  it("returns 503 when authenticated (disabled)", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST(mockReq("POST"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("temporarily disabled");
  });
});

describe("GET /api/upload/document", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.requireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await GET(mockReq("GET"));
    expect(response.status).toBe(401);
  });

  it("returns 503 when authenticated (disabled)", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1" } });

    const response = await GET(mockReq("GET"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("temporarily disabled");
  });
});

describe("DELETE /api/upload/document", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.requireAuth.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await DELETE(mockReq("DELETE"));
    expect(response.status).toBe(401);
  });

  it("returns 503 when authenticated (disabled)", async () => {
    mocks.requireAuth.mockResolvedValue({ user: { id: "user-1" } });

    const response = await DELETE(mockReq("DELETE"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("temporarily disabled");
  });
});
