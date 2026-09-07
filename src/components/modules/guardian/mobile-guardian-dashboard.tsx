"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  PhoneCall,
  Sun,
  Moon,
  Bell,
  DollarSign,
  RefreshCw,
  Calendar,
  MessageSquare,
  Sparkles,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

export interface MobileGuardianDashboardProps {
  onNavigate?: (screen: string) => void;
}

export function MobileGuardianDashboard({ onNavigate }: MobileGuardianDashboardProps = {}) {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const { setTheme, resolvedTheme } = useTheme();
  const queryClient = useQueryClient();

  const user = session?.user as any;
  const guardianName = user?.name || "Tariq Ahmed Qureshi";

  const handleNav = (screen: string) => {
    if (onNavigate) {
      onNavigate(screen);
    } else {
      navigateTo(screen as any);
    }
  };

  // Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveChildId, setLeaveChildId] = useState("part-1");
  const [leaveStartDate, setLeaveStartDate] = useState("2026-09-10");
  const [leaveEndDate, setLeaveEndDate] = useState("2026-09-12");
  const [leaveReason, setLeaveReason] = useState("out_of_town");
  const [leaveNotes, setLeaveNotes] = useState("");

  // ─── Real DB API Queries ───────────────────────────────────────────────
  const { data: guardianDashData, isLoading } = useQuery({
    queryKey: ["guardian-dash-real"],
    queryFn: async () => {
      const res = await fetch("/api/guardian/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const { data: leaveData } = useQuery({
    queryKey: ["guardian-leave-requests-mobile"],
    queryFn: async () => {
      const res = await fetch("/api/guardian/leave-requests");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/guardian/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to submit leave request");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Leave request submitted for Murabbi review!");
      setIsLeaveModalOpen(false);
      setLeaveNotes("");
      queryClient.invalidateQueries({ queryKey: ["guardian-leave-requests-mobile"] });
    },
  });

  const childrenList: any[] = guardianDashData?.children ?? [
    {
      id: "part-1",
      name: "Muhammad Umair",
      groupName: "Halqa Abu Bakr (RA)",
      parkName: "Gulberg Park",
      cityName: "Lahore",
      todayStatus: "Present",
      attendance: { rate30: 92 },
      fees: { outstanding: 0 },
      murabbiPhone: "923001234567",
    },
    {
      id: "part-2",
      name: "Abdullah Tariq",
      groupName: "Halqa Abu Bakr (RA)",
      parkName: "Gulberg Park",
      cityName: "Lahore",
      todayStatus: "Absent",
      attendance: { rate30: 85 },
      fees: { outstanding: 1500 },
      murabbiPhone: "923217654321",
    },
  ];

  const leaveList = leaveData || [];

  const avgAttendance = childrenList.length > 0
    ? Math.round(
        childrenList.reduce((acc, c) => acc + (c.attendance?.rate30 || c.rate || 0), 0) /
          childrenList.length
      )
    : 88;

  const totalOutstanding = childrenList.reduce((acc, c) => acc + (c.fees?.outstanding || 0), 0);

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-12 pb-8 rounded-b-[2.5rem] shadow-2xl relative z-10 px-5 text-white">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white/10 border border-white/20 p-1.5 shadow-inner backdrop-blur-sm flex items-center justify-center shrink-0">
              <img src="/logo-white.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight leading-none text-white">SHABAB 360</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Guardian
                </span>
              </div>
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-1">
                Parent & Safety Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-4 text-amber-300" />
              ) : (
                <Moon className="size-4 text-purple-200" />
              )}
            </button>
            <button
              onClick={() => handleNav("notifications")}
              className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white relative active:scale-95 transition-transform"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 bg-[#D90429] rounded-full border border-white"></span>
            </button>
          </div>
        </div>

        {/* Guardian Info */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Assalam-o-Alaikum</h1>
            <p className="text-xs text-purple-200 font-medium mt-0.5">
              {guardianName} • Lahore Chapter
            </p>
          </div>
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-1.5 bg-white/15 border border-white/20 px-3 py-1.5 rounded-full text-white text-xs font-bold backdrop-blur-md active:scale-95 transition-transform"
          >
            <Calendar className="size-3.5 text-purple-200" />
            <span>Request Leave</span>
          </button>
        </div>

        {/* 3 Glassmorphic KPI Pills */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <Users className="size-4 text-purple-200 mb-1" />
            <span className="text-xl font-black text-white">{childrenList.length}</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Children</span>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <TrendingUp className="size-4 text-emerald-300 mb-1" />
            <span className="text-xl font-black text-white">{avgAttendance}%</span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Avg Att.</span>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-3 backdrop-blur-sm flex flex-col items-center justify-center text-center">
            <DollarSign className="size-4 text-amber-300 mb-1" />
            <span className="text-xl font-black text-white">
              {totalOutstanding === 0 ? "Clear" : `Rs ${totalOutstanding}`}
            </span>
            <span className="text-[9px] font-bold text-purple-200 uppercase tracking-wider">Fees</span>
          </div>
        </div>
      </div>

      {/* ─── Content Body ────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 space-y-5">
        {/* Quick Guardian Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center gap-3 active:scale-95 transition-all hover:bg-muted/40"
          >
            <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Calendar className="size-4" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-foreground">Leave Request</h4>
              <p className="text-[10px] text-muted-foreground">Notify Murabbi</p>
            </div>
          </button>

          <button
            onClick={() => handleNav("fees")}
            className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center gap-3 active:scale-95 transition-all hover:bg-muted/40"
          >
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="size-4" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-foreground">Fee Receipts</h4>
              <p className="text-[10px] text-muted-foreground">Vouchers & Ledger</p>
            </div>
          </button>
        </div>

        {/* ─── Enrolled Children Cards ────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Users className="size-4 text-[#4B0A8F] dark:text-purple-400" />
            Linked Children ({childrenList.length})
          </h3>

          <div className="space-y-3">
            {childrenList.map((child: any, index: number) => {
              const rate = child.attendance?.rate30 ?? child.rate ?? 85;
              const outstanding = child.fees?.outstanding ?? 0;
              const isPresent = child.todayStatus === "Present";

              return (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-foreground">{child.name}</h4>
                        <span
                          className={cn(
                            "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase",
                            isPresent
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                          )}
                        >
                          {isPresent ? "Present Today" : "Absent Today"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {child.parkName || "Gulberg Park"} • {child.groupName || "Halqa Abu Bakr"}
                      </p>
                    </div>

                    <span className="text-xs font-black text-[#4B0A8F] dark:text-purple-300 px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60">
                      {rate}% Att.
                    </span>
                  </div>

                  {/* Attendance Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">30-Day Attendance Score</span>
                      <span className="font-bold text-foreground">{rate}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#4B0A8F] to-emerald-500 rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>

                  {/* Fee status & Contact Murabbi row */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <div className="text-xs">
                      {outstanding > 0 ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="size-3.5" />
                          Rs. {outstanding} Due
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" />
                          Fee Paid
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        const phone = child.murabbiPhone || "923001234567";
                        const text = encodeURIComponent(
                          `Assalam-o-Alaikum, I am the guardian of ${child.name}.`
                        );
                        window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>WhatsApp Murabbi</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── Recent Leave Requests ──────────────────────────────────────── */}
        {leaveList.length > 0 && (
          <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="size-4 text-[#4B0A8F] dark:text-purple-400" />
              Recent Leave Requests ({leaveList.length})
            </h3>
            {leaveList.slice(0, 2).map((l: any) => (
              <div
                key={l.id}
                className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-foreground">{l.childName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.startDate} to {l.endDate}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                    l.status === "approved"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : l.status === "rejected"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  )}
                >
                  {l.status || "Pending Review"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Submit Leave Request Modal ───────────────────────────────────── */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">Submit Leave Request</DialogTitle>
            <DialogDescription className="text-xs">
              Notify the assigned Murabbi in advance for approved absence.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Select Child</Label>
              <select
                value={leaveChildId}
                onChange={(e) => setLeaveChildId(e.target.value)}
                className="w-full text-xs h-10 px-3 rounded-xl border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
              >
                {childrenList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.parkName || "Park"})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Start Date</Label>
                <Input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="text-xs h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">End Date</Label>
                <Input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="text-xs h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Reason</Label>
              <select
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full text-xs h-10 px-3 rounded-xl border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
              >
                <option value="illness">Illness / Health</option>
                <option value="out_of_town">Out of Town / Travel</option>
                <option value="exam">Academic Exam</option>
                <option value="family_emergency">Family Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Notes for Murabbi (Optional)</Label>
              <Textarea
                value={leaveNotes}
                onChange={(e) => setLeaveNotes(e.target.value)}
                placeholder="Details regarding the absence..."
                className="text-xs min-h-[60px] rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLeaveModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                leaveMutation.mutate({
                  participantId: leaveChildId,
                  startDate: leaveStartDate,
                  endDate: leaveEndDate,
                  reason: leaveReason,
                  notes: leaveNotes,
                });
              }}
              disabled={leaveMutation.isPending}
              className="text-xs rounded-xl bg-gradient-to-r from-[#4B0A8F] to-[#D90429] text-white font-bold"
            >
              {leaveMutation.isPending ? "Submitting..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
