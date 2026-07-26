import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { PASSWORD_HASH_ROUNDS } from "@/lib/auth/password-policy";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireCapability: vi.fn(),
  requireResourceScope: vi.fn(),
  cityFindMany: vi.fn(),
  parkFindMany: vi.fn(),
  groupFindMany: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  staffMetaCreate: vi.fn(),
  transaction: vi.fn(),
  bcryptHash: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth/authorize", () => ({
  requireRole: mocks.requireRole,
  requireCapability: mocks.requireCapability,
  requireResourceScope: mocks.requireResourceScope,
}));
vi.mock("@/lib/db", () => ({
  db: {
    city: { findMany: mocks.cityFindMany },
    park: { findMany: mocks.parkFindMany },
    group: { findMany: mocks.groupFindMany },
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));
vi.mock("bcryptjs", () => ({ default: { hash: mocks.bcryptHash } }));

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
    mocks.cityFindMany.mockResolvedValue([]);
    mocks.parkFindMany.mockResolvedValue([]);
    mocks.groupFindMany.mockResolvedValue([]);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.bcryptHash.mockResolvedValue("bcrypt-hash");
    mocks.userCreate.mockResolvedValue({ id: "new-user" });
    mocks.staffMetaCreate.mockResolvedValue({ id: "staff-meta" });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: { create: mocks.userCreate },
        staffMeta: { create: mocks.staffMetaCreate },
      })
    );
    mocks.logAudit.mockResolvedValue(undefined);
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

  it("hashes imported staff passwords with the approved bcrypt work factor", async () => {
    mocks.requireCapability.mockResolvedValue({ user: { id: "admin-1" } });
    const file = new File([], "users.csv", { type: "text/csv" });
    vi.spyOn(file, "text").mockResolvedValue(
      ["name,email,role", "Test User,test.user@example.invalid,park_lead"].join(
        String.fromCharCode(10)
      )
    );

    const response = await importUsers(requestWithFile(file));

    const body = await response.json();
    expect(body).toMatchObject({ success: 1, errors: [] });
    expect(response.status).toBe(200);
    expect(mocks.bcryptHash).toHaveBeenCalledWith(expect.any(String), PASSWORD_HASH_ROUNDS);
    expect(mocks.bcryptHash).not.toHaveBeenCalledWith(expect.any(String), 10);
  });
});
