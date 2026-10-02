import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { POST as importGuardians } from "./guardians/route";
import { POST as importParticipants } from "./participants/route";
import { POST as importUsers } from "./users/route";

const request = () => new NextRequest("http://localhost/api/admin/import", { method: "POST" });

const importHandlers: Array<[string, (request: NextRequest) => Promise<Response>]> = [
  ["participants", importParticipants],
  ["guardians", importGuardians],
  ["users", importUsers],
];

const requestWithFile = (file: FormDataEntryValue) =>
  ({
    formData: vi.fn().mockResolvedValue({ get: vi.fn().mockReturnValue(file) }),
  }) as unknown as NextRequest;

describe("bulk import capability gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(null);
    mocks.requireCapability.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  });

  it.each([
    ["staff", importUsers, "access.scope.manage"],
    ["participants", importParticipants, "students.manage"],
    ["guardians", importGuardians, "guardians.manage"],
  ])("blocks %s imports without %s capability", async (_name, handler, capability) => {
    const response = await handler(request());

    expect(response.status).toBe(403);
    expect(mocks.requireCapability).toHaveBeenCalledWith(capability);
  });

  it.each(importHandlers)(
    "rejects an oversized %s CSV before reading its content",
    async (_name, handler) => {
      mocks.requireCapability.mockResolvedValue({ user: { id: "admin-1" } });
      const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "import.csv", {
        type: "text/csv",
      });
      const readFile = vi.spyOn(file, "text");

      const response = await handler(requestWithFile(file));

      expect(response.status).toBe(413);
      expect(readFile).not.toHaveBeenCalled();
    }
  );

  it.each(importHandlers)(
    "returns a safe error when %s form data processing fails",
    async (_name, handler) => {
      mocks.requireCapability.mockResolvedValue({ user: { id: "admin-1" } });
      const failedRequest = {
        formData: vi.fn().mockRejectedValue(new Error("database details must not reach the client")),
      } as unknown as NextRequest;

      const response = await handler(failedRequest);

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "Import processing failed" });
    }
  );
});
