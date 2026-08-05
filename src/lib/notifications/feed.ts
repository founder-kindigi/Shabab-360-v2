/**
 * Real-Time In-App Notifications & Announcement Feed Helper
 * Handles target-role filtering, priority styling, and unread notification counts.
 */

export type NotificationCategory =
  | "announcement"
  | "halqa_reminder"
  | "fee_due"
  | "retention_alert"
  | "system";

export type NotificationPriority = "urgent" | "high" | "normal";

export interface NotificationFeedItem {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  targetRole?: string | null;
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

export function getNotificationStyle(
  category: NotificationCategory,
  priority: NotificationPriority
): {
  badgeColor: string;
  iconName: string;
  label: string;
} {
  if (priority === "urgent") {
    return {
      badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300",
      iconName: "AlertTriangle",
      label: "Urgent Alert",
    };
  }

  switch (category) {
    case "announcement":
      return {
        badgeColor: "bg-purple-100 text-[#4B0A8F] dark:bg-purple-950/40 dark:text-purple-300 border-purple-300",
        iconName: "Bell",
        label: "Announcement",
      };
    case "halqa_reminder":
      return {
        badgeColor: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-300",
        iconName: "Calendar",
        label: "Halqa Reminder",
      };
    case "fee_due":
      return {
        badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300",
        iconName: "CreditCard",
        label: "Fee Due",
      };
    case "retention_alert":
      return {
        badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300",
        iconName: "PhoneCall",
        label: "Retention Alert",
      };
    default:
      return {
        badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300",
        iconName: "Info",
        label: "System Notice",
      };
  }
}

export function filterNotificationsForRole(
  items: NotificationFeedItem[],
  userRole?: string | null,
  unreadOnly = false
): NotificationFeedItem[] {
  return items.filter((item) => {
    if (unreadOnly && item.read) return false;
    if (!item.targetRole || item.targetRole === "all") return true;
    return item.targetRole === userRole;
  });
}

export function countUnreadNotifications(
  items: NotificationFeedItem[],
  userRole?: string | null
): number {
  return filterNotificationsForRole(items, userRole, true).length;
}
