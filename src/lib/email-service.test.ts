import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ notificationCreate: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { notification: { create: mocks.notificationCreate } },
}));

import {
  sendAbsenceAlert,
  sendEmail,
  sendFeeReminder,
  sendInviteEmail,
  sendPasswordChangeConfirmation,
  sendPasswordReset,
} from "./email-service";

describe("notification outbox privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notificationCreate.mockResolvedValue({ id: "notification-1" });
  });

  it("queues a password-reset notice without a URL or metadata", async () => {
    await expect(sendPasswordReset({
      id: "user-1",
      email: "user@example.test",
      name: "User One",
    })).resolves.toBe("notification-1");

    const queued = mocks.notificationCreate.mock.calls[0][0].data;
    expect(queued.channel).toBe("password_reset");
    expect(queued.body).toContain("requested a password reset");
    expect(queued.body).not.toMatch(/https?:\/\/|www\.|[?&]token=/i);
    expect(queued.data).toBeNull();
  });

  it("queues a password-change confirmation without reset or user metadata", async () => {
    await expect(sendPasswordChangeConfirmation({
      id: "user-1",
      email: "user@example.test",
      name: "User One",
    })).resolves.toBe("notification-1");

    const queued = mocks.notificationCreate.mock.calls[0][0].data;
    expect(queued.channel).toBe("password_changed");
    expect(queued.body).toContain("password was changed successfully");
    expect(queued.body).not.toMatch(/reset link|password123|token/i);
    expect(queued.data).toBeNull();
  });

  it("queues an invitation with role-only metadata and no credential value", async () => {
    await expect(sendInviteEmail({
      id: "user-2",
      email: "invitee@example.test",
      name: "Invitee",
    }, "park_admin")).resolves.toBe("notification-1");

    const queued = mocks.notificationCreate.mock.calls[0][0].data;
    expect(queued.channel).toBe("invite");
    expect(queued.body).not.toMatch(/https?:\/\/|[?&]token=/i);
    expect(queued.body).not.toMatch(/(?:password|token|code)\s*(?:is|:|=)\s*\S+/i);
    expect(queued.data).toBe(JSON.stringify({ role: "park_admin" }));
  });

  it("keeps absence metadata operational and excludes duplicate names or titles", async () => {
    await expect(sendAbsenceAlert(
      {
        id: "guardian-1",
        userId: "guardian-user-1",
        name: "Guardian One",
        phone: "03000000000",
        user: { email: "guardian@example.test" },
      },
      { id: "participant-1", name: "Student One" },
      "Weekly Class",
      3,
      "warning",
      3
    )).resolves.toBe("notification-1");

    const queued = mocks.notificationCreate.mock.calls[0][0].data;
    expect(queued.data).toBe(JSON.stringify({
      participantId: "participant-1",
      consecutiveAbsents: 3,
      level: "warning",
      threshold: 3,
    }));
    expect(queued.data).not.toMatch(/participantName|eventTitle|Student One|Weekly Class/);
  });

  it("does not duplicate fee details in metadata", async () => {
    await expect(sendFeeReminder(
      {
        id: "guardian-1",
        userId: "guardian-user-1",
        name: "Guardian One",
        user: { email: "guardian@example.test" },
      },
      "Swimming Fee",
      2500
    )).resolves.toBe("notification-1");

    const queued = mocks.notificationCreate.mock.calls[0][0].data;
    expect(queued.channel).toBe("fee_reminder");
    expect(queued.data).toBeNull();
  });

  it("rejects secret-like metadata before writing to the database", async () => {
    await expect(sendEmail({
      to: "user@example.test",
      subject: "Password reset requested",
      body: "A password reset was requested.",
      channel: "password_reset",
      recipientId: "user-1",
      data: { resetUrl: "https://example.test/reset?token=secret" },
    })).rejects.toThrow("Unsafe notification metadata for channel password_reset");

    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });

  it("rejects reset URLs and credential assignments before database writes", async () => {
    await expect(sendEmail({
      to: "user@example.test",
      subject: "Password reset requested",
      body: "Continue at https://example.test/reset?token=secret",
      channel: "password_reset",
      recipientId: "user-1",
    })).rejects.toThrow("Unsafe notification content for channel password_reset");

    await expect(sendEmail({
      to: "invitee@example.test",
      subject: "Your invitation",
      body: "Temporary password: password123",
      channel: "invite",
      recipientId: "user-2",
      data: { role: "park_admin" },
    })).rejects.toThrow("Unsafe notification content for channel invite");

    await expect(sendEmail({
      to: "user@example.test",
      subject: "Password reset requested",
      body: "Token hash - persisted-hash-value",
      channel: "password_reset",
      recipientId: "user-1",
    })).rejects.toThrow("Unsafe notification content for channel password_reset");

    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });
});
