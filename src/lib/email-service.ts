import { db } from "@/lib/db";
import {
  assertNotificationContentSafe,
  serializeNotificationMetadata,
  type NotificationChannel,
} from "@/lib/notification-security";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  channel: NotificationChannel;
  recipientId?: string | null;
  data?: Record<string, unknown>;
}

// ─── Core: Queue a notification ───────────────────────────────────────────────

/**
 * Create a Notification record in the database.
 * In a production environment this would trigger an actual email send.
 * For now, notifications are "queued" and viewable in /api/admin/notifications/queue.
 */
export async function sendEmail(params: SendEmailParams): Promise<string> {
  const { to, subject, body, channel, recipientId, data } = params;
  assertNotificationContentSafe(channel, subject, body);
  const serializedData = serializeNotificationMetadata(channel, data);

  const notification = await db.notification.create({
    data: {
      type: "email",
      channel,
      recipientEmail: to,
      recipientId: recipientId || null,
      subject,
      body,
      data: serializedData,
      status: "pending",
    },
  });

  console.log(`[EMAIL-QUEUE] ${channel}: ${notification.id}`);

  return notification.id;
}

// ─── Template: Password Reset ─────────────────────────────────────────────────

export async function sendPasswordReset(
  user: { id: string; email: string; name: string | null }
): Promise<string> {
  const subject = "Shabab360 — Password Reset Request";
  const body = `Salam ${user.name || "User"},

You (or someone else) requested a password reset for your Shabab360 account.

Secure recovery instructions must be delivered separately through the approved reset channel. If you did not request this, please contact your administrator.

— Shabab360 Team`;

  return sendEmail({
    to: user.email,
    subject,
    body,
    channel: "password_reset",
    recipientId: user.id,
  });
}

// ─── Template: Password Change Confirmation ──────────────────────────────────

export async function sendPasswordChangeConfirmation(
  user: { id: string; email: string; name: string | null }
): Promise<string> {
  const subject = "Shabab360 - Your Password Was Changed";
  const body = `Salam ${user.name || "User"},

Your Shabab360 account password was changed successfully.

If you did not make this change, please contact your administrator immediately.

Shabab360 Team`;

  return sendEmail({
    to: user.email,
    subject,
    body,
    channel: "password_changed",
    recipientId: user.id,
  });
}

// ─── Template: Invite Email ───────────────────────────────────────────────────

export async function sendInviteEmail(
  user: { id: string; email: string; name: string | null },
  role: string
): Promise<string> {
  const subject = "Welcome to Shabab360 — Your Account is Ready";
  const body = `Salam ${user.name || "User"},

Your Shabab360 account has been created. Please obtain your temporary sign-in credential from the administrator who invited you.

After signing in, you will be required to set a new password before accessing the application.

Your role: ${role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}

— Shabab360 Team`;

  return sendEmail({
    to: user.email,
    subject,
    body,
    channel: "invite",
    recipientId: user.id,
    data: { role },
  });
}

// ─── Template: Absence Alert ──────────────────────────────────────────────────

export async function sendAbsenceAlert(
  guardian: { id?: string; userId?: string | null; name: string; phone: string; user?: { email: string | null } | null } | null,
  participant: { id: string; name: string },
  eventTitle: string,
  consecutiveAbsents: number,
  level: "warning" | "critical" | "dropout",
  threshold: number
): Promise<string | null> {
  if (!guardian) return null;

  const email = guardian.user?.email;
  if (!email) return null;

  const subject = `Shabab360 — Attendance Alert: ${participant.name}`;
  const body = `Salam ${guardian.name},

This is an automated attendance alert for ${participant.name}.

${participant.name} has been absent for ${consecutiveAbsents} consecutive session(s).
Alert level: ${level.toUpperCase()} (threshold: ${threshold})

Recent event: ${eventTitle}

Please contact the park administration for further details.

— Shabab360 Attendance System`;

  return sendEmail({
    to: email,
    subject,
    body,
    channel: "absence_alert",
    recipientId: guardian.userId || guardian.id,
    data: {
      participantId: participant.id,
      consecutiveAbsents,
      level,
      threshold,
    },
  });
}

// ─── Template: Fee Reminder ───────────────────────────────────────────────────

export async function sendFeeReminder(
  guardian: { id?: string; userId?: string | null; name: string; user?: { email: string | null } | null } | null,
  feeEventTitle: string,
  amountDue: number
): Promise<string | null> {
  if (!guardian) return null;

  const email = guardian.user?.email;
  if (!email) return null;

  const subject = `Shabab360 — Fee Reminder: ${feeEventTitle}`;
  const body = `Salam ${guardian.name},

This is a reminder that a fee payment is due.

  Fee: ${feeEventTitle}
  Amount Due: Rs. ${amountDue.toLocaleString()}

Please ensure timely payment to avoid any penalties.

— Shabab360 Finance`;

  return sendEmail({
    to: email,
    subject,
    body,
    channel: "fee_reminder",
    recipientId: guardian.userId || guardian.id,
  });
}
