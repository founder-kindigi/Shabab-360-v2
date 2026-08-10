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
  DollarSign,
  RefreshCw,
  Calendar,
  FileCheck2,
  Stethoscope,
  Plus,
  MessageSquare,
  Sparkles,
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

export function MobileGuardianDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const queryClient = useQueryClient();

  const user = session?.user as any;
  const guardianName = user?.name || "Tariq Ahmed Qureshi";

  // Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveChildId, setLeaveChildId] = useState("part-1");
  const [leaveStartDate, setLeaveStartDate] = useState("2026-08-14");
  const [leaveEndDate, setLeaveEndDate] = useState("2026-08-16");
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

  const { data: consentData } = useQuery({
    queryKey: ["guardian-consents-mobile"],
    queryFn: async () => {
      const res = await fetch("/api/guardian/consents");
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
      groupName: "Group 1",
      parkName: "Gulberg Park",
      cityName: "Lahore",
      todayStatus: "Present",
      attendance: { rate30: 92 },
      fees: { outstanding: 0 },
      murabbiPhone: "923364543324",
    },
    {
      id: "part-2",
      name: "M Abdullah Qureshi",
      groupName: "Group 1",
      parkName: "Gulberg Park",
      cityName: "Lahore",
      todayStatus: "Absent",
      attendance: { rate30: 84 },
      fees: { outstanding: 1500 },
      murabbiPhone: "923364543324",
    },
  ];

  const leaveList = leaveData || [];
  const consentList = consentData || [];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <span className="text-xs font-bold text-purple-200 tracking-wider uppercase">Guardian PWA</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
            {isLoading ? (
              <RefreshCw className="size-3 text-purple-300 animate-spin" />
            ) : (
              <ShieldCheck className="size-3 text-emerald-400" />
            )}
            <span>{childrenList.length} Linked</span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-white">Assalam-o-Alaikum, {guardianName}</h1>
        <p className="text-xs text-purple-200 mt-0.5">Real-Time Attendance, Leave Requests & Safety</p>

        {/* Quick Mobile Action Buttons */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex-1 bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs h-9 gap-1.5 rounded-xl backdrop-blur"
          >
            <Calendar className="size-3.5 text-purple-300" />
            <span>Request Leave</span>
          </Button>

          <Button
            onClick={() => navigateTo("guardian-fees")}
            className="flex-1 bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs h-9 gap-1.5 rounded-xl backdrop-blur"
          >
            <DollarSign className="size-3.5 text-emerald-300" />
            <span>View Fees</span>
          </Button>
        </div>
      </div>

      {/* ─── Children Attendance Cards ───────────────────────────────────── */}
      <div className="-mt-6 px-4 z-10 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="size-4 text-[#4B0A8F]" />
              Enrolled Children ({childrenList.length})
            </h3>
          </div>

          <div className="space-y-3">
            {childrenList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                {isLoading ? "Loading linked children…" : "No enrolled children linked to this guardian account"}
              </p>
            ) : (
              childrenList.map((child: any) => {
                const rate = child.attendance?.rate30 ?? child.rate ?? 0;
                const outstanding = child.fees?.outstanding ?? 0;
                return (
                  <div
                    key={child.id}
                    className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-extrabold text-foreground">{child.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {child.parkName || child.park || "Park"} • {child.groupName || child.group || "Group"}
                        </p>
                      </div>
                      <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs">
                        {rate}% Attendance
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">30-Day Score</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{rate}%</span>
                      </div>
                      <Progress value={rate} className="h-1.5" />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="font-semibold text-muted-foreground">{child.cityName || "Lahore"}</span>
                      {outstanding > 0 ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="size-3.5" />
                          Rs. {outstanding} Pending
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" />
                          Fees Paid
                        </span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const phone = child.murabbiPhone || "923364543324";
                        const text = encodeURIComponent(
                          `Assalam-o-Alaikum, I am the guardian of ${child.name}.`
                        );
                        window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                      }}
                      className="w-full text-xs h-8 gap-1.5 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>WhatsApp Murabbi</span>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* ─── Pending Leave Requests Mobile Card ─── */}
        {leaveList.length > 0 && (
          <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="size-4 text-purple-600" />
              Recent Leave Requests ({leaveList.length})
            </h3>
            {leaveList.slice(0, 2).map((l: any) => (
              <div key={l.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{l.childName}</p>
                  <p className="text-[11px] text-muted-foreground">{l.startDate} to {l.endDate}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {l.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── LEAVE REQUEST MOBILE DIALOG ─── */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="size-5 text-[#4B0A8F]" />
              Submit Advance Leave Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Notify Murabbi of upcoming absence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Select Child</Label>
              <select
                value={leaveChildId}
                onChange={(e) => setLeaveChildId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
              >
                {childrenList.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Start Date</Label>
                <Input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">End Date</Label>
                <Input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Reason</Label>
              <select
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="out_of_town">Out of Town</option>
                <option value="sick">Sick / Health Issue</option>
                <option value="academic_exam">School Exams</option>
                <option value="family_event">Family Event</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Notes (Optional)</Label>
              <Textarea
                placeholder="Brief reason for Murabbi..."
                value={leaveNotes}
                onChange={(e) => setLeaveNotes(e.target.value)}
                className="text-xs h-16"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                leaveMutation.mutate({
                  participantId: leaveChildId,
                  startDate: leaveStartDate,
                  endDate: leaveEndDate,
                  reason: leaveReason,
                  notes: leaveNotes,
                })
              }
              disabled={leaveMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white"
            >
              Submit Leave Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
