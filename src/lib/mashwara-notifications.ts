import { db } from "@/lib/db";
import { assertNotificationContentSafe, serializeNotificationMetadata } from "@/lib/notification-security";

export interface TaskNotificationParams {
  actionItemId: string;
  meetingId: string;
  assignedToStaffMetaId: string;
  description: string;
  dueDate?: Date | string | null;
  status?: string;
  type: "assigned" | "updated";
}

/**
 * Notifies ONLY the actual assignee of a Mashwara action item.
 * Notification never exposes secrets or grants access.
 */
export async function notifyTaskAssignee(
  params: TaskNotificationParams,
  txPrisma: any = db
): Promise<string | null> {
  const {
    actionItemId,
    meetingId,
    assignedToStaffMetaId,
    description,
    dueDate,
    status,
    type,
  } = params;

  // Find staff recipient
  const staff = await txPrisma.staffMeta.findUnique({
    where: { id: assignedToStaffMetaId },
    select: { id: true, userId: true, isActive: true, user: { select: { email: true, name: true } } },
  });

  if (!staff || !staff.isActive || !staff.userId) {
    return null; // Do not notify inactive or unlinked staff
  }

  const channel = type === "assigned" ? "mashwara_task_assigned" : "mashwara_task_updated";
  const dueDateStr = dueDate ? new Date(dueDate).toISOString().split("T")[0] : undefined;

  const subject = type === "assigned"
    ? `New Task Assigned: ${description.slice(0, 40)}`
    : `Task Updated: ${description.slice(0, 40)}`;

  const body = type === "assigned"
    ? `Salam ${staff.user.name || "Team Member"},\n\nYou have been assigned a new Mashwara action item:\n"${description}"\n${dueDateStr ? `Due Date: ${dueDateStr}` : ""}\n\nPlease complete this task by the due date.`
    : `Salam ${staff.user.name || "Team Member"},\n\nYour assigned Mashwara action item status has been updated:\n"${description}"\nStatus: ${status || "updated"}\n${dueDateStr ? `Due Date: ${dueDateStr}` : ""}`;

  assertNotificationContentSafe(channel, subject, body);

  const metadata = type === "assigned"
    ? { actionItemId, meetingId, ...(dueDateStr ? { dueDate: dueDateStr } : {}) }
    : { actionItemId, meetingId, ...(status ? { status } : {}), ...(dueDateStr ? { dueDate: dueDateStr } : {}) };

  const serializedData = serializeNotificationMetadata(channel, metadata);

  const notification = await txPrisma.notification.create({
    data: {
      type: "in_app",
      channel,
      recipientId: staff.userId,
      recipientEmail: staff.user.email,
      subject,
      body,
      data: serializedData,
      status: "sent",
      sentAt: new Date(),
    },
  });

  return notification.id;
}
