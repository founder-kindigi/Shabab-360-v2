"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bell,
  BellRing,
  CalendarCheck,
  DollarSign,
  Megaphone,
  ArrowLeft,
  CheckCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationType = "all" | "attendance" | "fees" | "announcement" | "system";

export interface MobileNotificationItem {
  id: string;
  title: string;
  description: string;
  type: "attendance" | "fees" | "announcement" | "system";
  timestamp: string;
  isRead: boolean;
  priority?: "normal" | "urgent";
}

const MOCK_NOTIFICATIONS: MobileNotificationItem[] = [
  {
    id: "notif-1",
    title: "Gulberg Park Attendance Finalized",
    description: "Murabbi Ikram marked all 12 cadets for Today's session. 11 Present, 1 Absent logged.",
    type: "attendance",
    timestamp: "15 mins ago",
    isRead: false,
    priority: "normal",
  },
  {
    id: "notif-2",
    title: "Urgent: Fee Challans Due in 3 Days",
    description: "42 student fee challans remain unpaid for Batch 4 August dues. Guardian alerts sent via WhatsApp.",
    type: "fees",
    timestamp: "1 hour ago",
    isRead: false,
    priority: "urgent",
  },
  {
    id: "notif-3",
    title: "Central Shura Notice: Monthly Karguzari Meeting",
    description: "All park leads and murabbis must attend Saturday 9:00 PM online zoom conference.",
    type: "announcement",
    timestamp: "3 hours ago",
    isRead: true,
    priority: "normal",
  },
  {
    id: "notif-4",
    title: "Offline Sync Engine: 128 Mutations Synced",
    description: "Local Dexie cache reconciled successfully with cloud PostgreSQL database without conflicts.",
    type: "system",
    timestamp: "Yesterday",
    isRead: true,
    priority: "normal",
  },
];

interface MobileNotificationsPageProps {
  onBack?: () => void;
}

export function MobileNotificationsPage({ onBack }: MobileNotificationsPageProps) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<MobileNotificationItem[]>(MOCK_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<NotificationType>("all");
  const [search, setSearch] = useState("");
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // Broadcast Form State
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("all");

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchSearch =
        !search ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.description.toLowerCase().includes(search.toLowerCase());
      const matchFilter = activeFilter === "all" || n.type === activeFilter;
      return matchSearch && matchFilter;
    });
  }, [notifications, search, activeFilter]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read!");
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const handleSendBroadcast = () => {
    if (!broadcastTitle || !broadcastMessage) {
      toast.error("Please provide both title and message");
      return;
    }
    const newNotice: MobileNotificationItem = {
      id: `notif-${Date.now()}`,
      title: broadcastTitle,
      description: broadcastMessage,
      type: "announcement",
      timestamp: "Just now",
      isRead: false,
      priority: "normal",
    };
    setNotifications([newNotice, ...notifications]);
    toast.success(`Broadcasted announcement to ${broadcastAudience}!`);
    setIsBroadcastOpen(false);
    setBroadcastTitle("");
    setBroadcastMessage("");
  };

  const typeIcons: Record<string, { icon: any; color: string; bg: string }> = {
    attendance: { icon: CalendarCheck, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-950" },
    fees: { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-950" },
    announcement: { icon: Megaphone, color: "text-sky-600", bg: "bg-sky-100 dark:bg-sky-950" },
    system: { icon: BellRing, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-950" },
  };

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground pb-28 space-y-4 px-4 pt-4 select-none">
      {/* ─── PWA Top Bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-[#1F0860] dark:text-purple-200 tracking-tight">
                Notifications Hub
              </h1>
              {unreadCount > 0 && (
                <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                  {unreadCount} New
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Field alerts, fee notices, and program announcements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={markAllAsRead}
            className="h-8 px-2 text-xs font-bold gap-1 border-slate-300"
          >
            <CheckCheck className="size-3.5 text-purple-600" />
            <span>Read All</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsBroadcastOpen(true)}
            className="h-8 px-2.5 text-xs font-bold bg-[#4B0A8F] hover:bg-[#3b0873] text-white rounded-xl shadow"
          >
            <Plus className="size-3.5" />
            <span>Broadcast</span>
          </Button>
        </div>
      </div>

      {/* ─── Filter Pills & Search ─── */}
      <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Alerts" },
            { id: "attendance", label: "Attendance" },
            { id: "fees", label: "Fees" },
            { id: "announcement", label: "Announcements" },
            { id: "system", label: "System" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id as any)}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all",
                activeFilter === f.id
                  ? "bg-[#4B0A8F] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search notification text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800"
          />
        </div>
      </div>

      {/* ─── Notification Cards Feed ─── */}
      <div className="space-y-2.5">
        {filteredNotifications.map((item) => {
          const style = typeIcons[item.type] || typeIcons.system;
          const Icon = style.icon;

          return (
            <Card
              key={item.id}
              onClick={() => toggleRead(item.id)}
              className={cn(
                "border rounded-2xl overflow-hidden shadow-sm transition-all cursor-pointer",
                !item.isRead
                  ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              )}
            >
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("size-8 rounded-xl flex items-center justify-center shrink-0", style.bg, style.color)}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        {item.title}
                        {item.priority === "urgent" && (
                          <Badge className="bg-red-600 text-white text-[8px] px-1 py-0 h-3.5 font-bold">
                            URGENT
                          </Badge>
                        )}
                      </h4>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-2.5" />
                        {item.timestamp}
                      </p>
                    </div>
                  </div>

                  {!item.isRead && (
                    <span className="size-2 rounded-full bg-[#4B0A8F] shrink-0 mt-1" />
                  )}
                </div>

                <p className="text-xs text-muted-foreground pl-10 leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Broadcast Dialog ─── */}
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Megaphone className="size-5 text-[#4B0A8F]" />
              Send Push Broadcast
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dispatch an official announcement to targeted user cohorts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Audience</Label>
              <select
                value={broadcastAudience}
                onChange={(e) => setBroadcastAudience(e.target.value)}
                className="w-full h-8 text-xs border rounded-lg px-2 bg-background"
              >
                <option value="all">Everyone (All Parks & Cadets)</option>
                <option value="murabbis">Murabbis & Park Leads Only</option>
                <option value="students">Cadets & Students Only</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Title</Label>
              <Input
                placeholder="e.g. Schedule Change for Sunday Session..."
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Announcement Content</Label>
              <Textarea
                placeholder="Write message details..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="text-xs min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsBroadcastOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSendBroadcast} className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold">
              Dispatch Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
