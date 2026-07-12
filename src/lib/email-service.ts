import { db } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationChannel =
  | "password_reset"
  | "invite"
  | "fee_reminder"
  | "absence_alert"
  | "admission_status";

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

  const notification = await db.notification.create({
    data: {
      type: "email",
      channel,
      recipientEmail: to,
      recipientId: recipientId || null,
      subject,
      body,
      data: data ? JSON.stringify(data) : null,
      status: "pending",
    },
  });

  // In sandbox mode, log the notification for visibility
  console.log(`[EMAIL-QUEUE] ${channel}: ${subject} → ${to}`);

  return notification.id;
}

// ─── Template: Password Reset ─────────────────────────────────────────────────

export async function sendPasswordReset(
  user: { id: string; email: string; name: string | null },
  resetUrl: string
): Promise<string> {
  const subject = "Shabab360 — Password Reset Request";
  const body = `Salam ${user.name || "User"},

You (or someone else) requested a password reset for your Shabab360 account.

Click the link below to set a new password:
${resetUrl}

This link will expire in 1 hour. If you did not request this, you can safely ignore this email.

— Shabab360 Team`;

  return sendEmail({
    to: user.email,
    subject,
    body,
    channel: "password_reset",
    recipientId: user.id,
    data: { resetUrl, userName: user.name },
  });
}

// ─── Template: Invite Email ───────────────────────────────────────────────────

export async function sendInviteEmail(
  user: { id: string; email: string; name: string | null },
  tempPassword: string,
  role: string
): Promise<string> {
  const subject = "Welcome to Shabab360 — Your Account is Ready";
  const body = `Salam ${user.name || "User"},

Your Shabab360 account has been created. Here are your login credentials:

  Email: ${user.email}
  Password: ${tempPassword}

Please log in at Shabab360 and change your password immediately after signing in.

Your role: ${role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}

— Shabab360 Team`;

  return sendEmail({
    to: user.email,
    subject,
    body,
    channel: "invite",
    recipientId: user.id,
    data: { tempPassword, role, userName: user.name },
  });
}

// ─── Template: Absence Alert ──────────────────────────────────────────────────

export async function sendAbsenceAlert(
  guardian: { id?: string; userId?: string; name: string; phone: string; user?: { email: string | null } | null } | null,
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
      participantName: participant.name,
      consecutiveAbsents,
      level,
      threshold,
      eventTitle,
    },
  });
}

// ─── Template: Fee Reminder ───────────────────────────────────────────────────

export async function sendFeeReminder(
  guardian: { id?: string; userId?: string; name: string; user?: { email: string | null } | null } | null,
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
    data: { feeEventTitle, amountDue },
  });
}