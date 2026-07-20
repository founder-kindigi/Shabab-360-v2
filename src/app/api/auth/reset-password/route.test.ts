import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  isSameOriginRequest: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
  sendPasswordChangeConfirmation: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/security/origin", () => ({ isSameOriginRequest: mocks.isSameOriginRequest }));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
  },
}));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare, hash: mocks.hash } }));
vi.mock("@/lib/email-service", () => ({
  sendPasswordChangeConfirmation: mocks.sendPasswordChangeConfirmation,
}));

import { POST } from "./route";

const newPassword = "Valid-Password-2026!";
const existingUser = {
  id: "user-1",
  email: "user@example.test",
  name: "User One",
  passwordHash: "old-hash",
  mustResetPwd: false,
};

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSameOriginRequest.mockReturnValue(true);
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.hash.mockResolvedValue("new-hash");
    mocks.userUpdate.mockResolvedValue({ id: "user-1" });
    mocks.sendPasswordChangeConfirmation.mockResolvedValue("notification-1");
  });

  it("lets a forced-reset user choose a new password without providing the old one", async () => {
    mocks.userFindUnique.mockResolvedValue({ ...existingUser, mustResetPwd: true });

    const response = await POST(request({ newPassword, confirmPassword: newPassword }));

    expect(response.status).toBe(200);
    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "new-hash",
        mustResetPwd: false,
        tokenVersion: { increment: 1 },
      },
    });
    expect(mocks.sendPasswordChangeConfirmation).toHaveBeenCalledWith({
      id: "user-1",
      email: "user@example.test",
      name: "User One",
    });
  });

  it("requires an ordinary password change to include the current password", async () => {
    mocks.userFindUnique.mockResolvedValue(existingUser);

    const response = await POST(request({ newPassword, confirmPassword: newPassword }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Current password is required" });
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("accepts an ordinary password change only after verifying the current password", async () => {
    mocks.userFindUnique.mockResolvedValue(existingUser);
    mocks.compare.mockResolvedValue(true);

    const response = await POST(request({
      currentPassword: "Old-Password-2025!",
      newPassword,
      confirmPassword: newPassword,
    }));

    expect(response.status).toBe(200);
    expect(mocks.compare).toHaveBeenCalledWith("Old-Password-2025!", "old-hash");
    expect(mocks.userUpdate).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-origin requests before looking up the session or user", async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(request({ newPassword, confirmPassword: newPassword }));

    expect(response.status).toBe(403);
    expect(mocks.getServerSession).not.toHaveBeenCalled();
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });
});
