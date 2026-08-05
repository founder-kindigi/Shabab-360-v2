import { describe, it, expect } from "vitest";
import {
  filterNotificationsForRole,
  countUnreadNotifications,
  getNotificationStyle,
  NotificationFeedItem,
} from "../feed";

describe("Notifications & Announcement Feed Helper", () => {
  const sampleFeed: NotificationFeedItem[] = [
    { id: "n1", title: "Sunday Halqa Reminder", message: "Halqa starts at 9 AM", category: "halqa_reminder", priority: "normal", targetRole: "all", read: false, createdAt: "2026-08-05T00:00:00Z" },
    { id: "n2", title: "Emergency Meeting", message: "City Head emergency call", category: "announcement", priority: "urgent", targetRole: "city_head", read: false, createdAt: "2026-08-05T00:00:00Z" },
    { id: "n3", title: "Fee Collection Overdue", message: "Monthly fees overdue", category: "fee_due", priority: "high", targetRole: "guardian", read: true, createdAt: "2026-08-05T00:00:00Z" },
  ];

  it("filters notifications by target role correctly", () => {
    const studentNotifications = filterNotificationsForRole(sampleFeed, "student");
    expect(studentNotifications.length).toBe(1);
    expect(studentNotifications[0].id).toBe("n1");

    const cityHeadNotifications = filterNotificationsForRole(sampleFeed, "city_head");
    expect(cityHeadNotifications.length).toBe(2);
  });

  it("counts unread notifications accurately for a role", () => {
    const unreadCount = countUnreadNotifications(sampleFeed, "guardian");
    expect(unreadCount).toBe(1); // n1 is unread for guardian; n3 is read
  });

  it("returns urgent alert style when priority is urgent", () => {
    const style = getNotificationStyle("announcement", "urgent");
    expect(style.label).toBe("Urgent Alert");
    expect(style.badgeColor).toContain("rose");
  });
});
