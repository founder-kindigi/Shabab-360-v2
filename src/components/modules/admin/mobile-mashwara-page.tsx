"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  CalendarCheck,
  Clock,
  MapPin,
  RefreshCw,
  Plus,
  CheckCircle2,
  Calendar,
  Users,
  CheckSquare,
  FileText,
  ChevronRight,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileMashwaraPageProps {
  onBack?: () => void;
}

const STATUS_TABS = [
  { id: "all", label: "All Sessions" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
];

const MOCK_MEETINGS_FALLBACK = [
  {
    id: "m1",
    title: "Lahore Weekly Leadership Mashwara #14",
    scheduledAt: "2026-08-08T17:00:00.000Z",
    location: "Gulberg Central Office / Conference Hall",
    city: { name: "Lahore" },
    status: "scheduled",
    decisionsCount: 5,
    actionItemsCount: 8,
    minutesSummary: "Discussion on Batch 4 attendance metrics, Murabbi team coordination, and upcoming Sports Gala.",
  },
  {
    id: "m2",
    title: "Gulshan Iqbal Park Lead Review #12",
    scheduledAt: "2026-08-01T16:00:00.000Z",
    location: "Gulshan Iqbal Park Desk",
    city: { name: "Lahore" },
    status: "completed",
    decisionsCount: 4,
    actionItemsCount: 6,
    minutesSummary: "Reviewed sports equipment allocations and Tadreeb curriculum progress for Senior cohort.",
  },
  {
    id: "m3",
    title: "Johar Town & Griffin Executive Mashwara",
    scheduledAt: "2026-07-25T17:30:00.000Z",
    location: "Johar Town Main Desk",
    city: { name: "Lahore" },
    status: "completed",
    decisionsCount: 6,
    actionItemsCount: 7,
    minutesSummary: "Evaluated admissions intake targets and calling workload dispatch for Round 2 follow-ups.",
  },
];

export function MobileMashwaraPage({ onBack }: MobileMashwaraPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const user = session?.user as any;
  const userCityId = user?.assignedCityId || "city-lahore-01";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);

  // Sheets state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // New Meeting Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDateTime, setNewDateTime] = useState("2026-09-12T17:00");
  const [newLocation, setNewLocation] = useState("Central Office / Conference Hall");
  const [newMinutes, setNewMinutes] = useState("");

  // ─── Query Meetings ────────────────────────────────────────────────────
  const { data: mashwaraData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["mashwara-list-mobile", statusFilter],
    queryFn: async () => {
      const url = new URL("/api/admin/mashwara", window.location.origin);
      if (statusFilter !== "all") {
        url.searchParams.set("status", statusFilter);
      }
      url.searchParams.set("pageSize", "50");
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 15000,
  });

  const apiMeetings: any[] = mashwaraData?.data ?? mashwaraData?.meetings ?? [];
  const displayMeetings = apiMeetings.length > 0 ? apiMeetings : MOCK_MEETINGS_FALLBACK;

  const filteredMeetings = displayMeetings.filter((m) => {
    const matchSearch =
      !searchQuery.trim() ||
      m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ─── Schedule Meeting Mutation ─────────────────────────────────────────
  const scheduleMeetingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/mashwara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule mashwara");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Mashwara session scheduled successfully!");
      setIsScheduleOpen(false);
      setNewTitle("");
      setNewMinutes("");
      queryClient.invalidateQueries({ queryKey: ["mashwara-list-mobile"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not schedule meeting");
    },
  });

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }
    scheduleMeetingMutation.mutate({
      cityId: userCityId,
      title: newTitle.trim(),
      scheduledAt: new Date(newDateTime).toISOString(),
      location: newLocation.trim(),
      minutesSummary: newMinutes.trim() || undefined,
    });
  };

  const handleOpenDetail = (meeting: any) => {
    setSelectedMeeting(meeting);
    setIsDetailOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
          label: "Completed",
        };
      case "in_progress":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
          label: "In Progress",
        };
      default:
        return {
          bg: "bg-purple-50 text-[#4B0A8F] border-purple-200",
          icon: Calendar,
          label: "Scheduled",
        };
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 text-slate-900 pb-28 select-none">
      {/* ─── Header matching docs/pwa screens style ───────────────────────── */}
      <div className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-black text-[#1F0860] tracking-tight flex items-center gap-1.5">
                <span>Mashwara</span>
                <span className="text-sm font-bold text-slate-400 font-sans">مشورہ</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {filteredMeetings.length} sessions • Weekly Executive Shura
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-[#4B0A8F]")} />
            </button>
            <Button
              onClick={() => setIsScheduleOpen(true)}
              size="sm"
              className="h-8 bg-[#4B0A8F] hover:bg-[#3d0875] text-white text-xs font-bold px-3 rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Schedule</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Mashwara agenda, location, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F] focus:bg-white transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          {STATUS_TABS.map((t) => {
            const isActive = statusFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all",
                  isActive
                    ? "bg-[#1F0860] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Sessions List ────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4B0A8F]" />
            Loading Mashwara sessions…
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-900 text-sm">No Mashwara sessions found</p>
            <p className="text-xs text-slate-500 mt-1">
              No sessions match the current status filter or search parameters.
            </p>
          </div>
        ) : (
          filteredMeetings.map((meeting: any) => {
            const badge = getStatusBadge(meeting.status);
            const StatusIcon = badge.icon;
            const decisionsCount = meeting.decisionsCount ?? meeting._count?.decisions ?? 0;
            const actionItemsCount = meeting.actionItemsCount ?? meeting._count?.actionItems ?? 0;
            const dateStr = meeting.scheduledAt
              ? new Date(meeting.scheduledAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Upcoming Session";

            return (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleOpenDetail(meeting)}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 space-y-3 cursor-pointer hover:border-purple-200 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-[#4B0A8F] font-black text-sm flex items-center justify-center shrink-0 border border-purple-100">
                      <CalendarCheck className="w-5 h-5 text-[#4B0A8F]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 leading-tight">
                        {meeting.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#4B0A8F]" />
                        <span>{dateStr}</span>
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 border",
                      badge.bg
                    )}
                  >
                    <StatusIcon className="w-3 h-3 mr-1 inline" />
                    {badge.label}
                  </Badge>
                </div>

                {meeting.location && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{meeting.location}</span>
                  </p>
                )}

                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#4B0A8F] bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100 text-[10px]">
                      {decisionsCount} Decisions
                    </span>
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 text-[10px]">
                      {actionItemsCount} Actions
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── Schedule Mashwara Bottom Sheet ───────────────────────────────── */}
      <Sheet open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4 border-b border-slate-100">
            <SheetTitle className="text-lg font-black text-[#1F0860]">
              Schedule Weekly Mashwara
            </SheetTitle>
            <p className="text-xs text-slate-500 font-medium">
              Call an executive shura session for Murabbis and Park Leads
            </p>
          </SheetHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Mashwara Title *</Label>
              <Input
                placeholder="e.g. Weekly Leadership Mashwara #15"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Scheduled Date & Time *</Label>
              <Input
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Location / Meeting Link</Label>
              <Input
                placeholder="e.g. Gulberg Central Office / Conference Hall"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Initial Agenda & Topics</Label>
              <Textarea
                placeholder="Outline discussion items: attendance review, sports gala preparations, curriculum pacing..."
                value={newMinutes}
                onChange={(e) => setNewMinutes(e.target.value)}
                className="rounded-xl text-xs resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScheduleOpen(false)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={scheduleMeetingMutation.isPending}
                className="flex-1 bg-[#4B0A8F] hover:bg-[#3d0875] text-white rounded-xl h-11 text-xs font-bold"
              >
                {scheduleMeetingMutation.isPending ? "Scheduling..." : "Schedule Session"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ─── Detail Bottom Sheet ──────────────────────────────────────────── */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-[460px] mx-auto p-6 max-h-[90vh] overflow-y-auto">
          {selectedMeeting && (
            <div className="space-y-4">
              <SheetHeader className="text-left pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <Badge className="bg-purple-50 text-[#4B0A8F] border border-purple-200 text-[10px] font-bold">
                    {selectedMeeting.status?.toUpperCase() || "SCHEDULED"}
                  </Badge>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedMeeting.city?.name || "Lahore"} City Shura
                  </span>
                </div>
                <SheetTitle className="text-base font-black text-[#1F0860]">
                  {selectedMeeting.title}
                </SheetTitle>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1 pt-1">
                  <Clock className="w-3.5 h-3.5 text-[#4B0A8F]" />
                  <span>{new Date(selectedMeeting.scheduledAt || Date.now()).toLocaleString()}</span>
                </p>
              </SheetHeader>

              {selectedMeeting.location && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-xs text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedMeeting.location}</span>
                </div>
              )}

              {selectedMeeting.minutesSummary && (
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#4B0A8F] tracking-wider block">
                    Karguzari & Minutes Summary
                  </span>
                  <p className="text-slate-700 leading-relaxed font-medium text-[11px]">
                    {selectedMeeting.minutesSummary}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Decisions Logged
                  </span>
                  <span className="text-lg font-black text-[#4B0A8F]">
                    {selectedMeeting.decisionsCount || selectedMeeting._count?.decisions || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Action Items
                  </span>
                  <span className="text-lg font-black text-amber-600">
                    {selectedMeeting.actionItemsCount || selectedMeeting._count?.actionItems || 0}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                  className="w-full rounded-xl font-bold h-11 text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
