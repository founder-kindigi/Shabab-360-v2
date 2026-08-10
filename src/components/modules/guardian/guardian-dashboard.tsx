"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  FileText,
  Calendar,
  Clock,
  Send,
  Plus,
  Heart,
  FileSpreadsheet,
  Download,
  Check,
  XCircle,
  MessageSquare,
  Sparkles,
  MapPin,
  Megaphone,
  UserCheck,
  FileCheck2,
  Stethoscope,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function GuardianDashboard() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const queryClient = useQueryClient();

  const user = session?.user as any;
  const guardianName = user?.name || "Tariq Ahmed Qureshi";

  // Active view tab
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "consents" | "medical" | "fees">("overview");

  // Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<any>(null);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);

  // Form states - Leave Request
  const [leaveChildId, setLeaveChildId] = useState("part-1");
  const [leaveStartDate, setLeaveStartDate] = useState("2026-08-14");
  const [leaveEndDate, setLeaveEndDate] = useState("2026-08-16");
  const [leaveReason, setLeaveReason] = useState<"sick" | "out_of_town" | "academic_exam" | "family_event" | "other">("out_of_town");
  const [leaveNotes, setLeaveNotes] = useState("");

  // Form states - Consent
  const [consentSignature, setConsentSignature] = useState(guardianName);
  const [consentStatus, setConsentStatus] = useState<"approved" | "declined">("approved");

  // Form states - Medical Info
  const [medicalChildId, setMedicalChildId] = useState("part-1");
  const [emergencyContact, setEmergencyContact] = useState("Tariq Ahmed Qureshi");
  const [emergencyPhone, setEmergencyPhone] = useState("923001234567");
  const [relationship, setRelationship] = useState("Father");
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [allergies, setAllergies] = useState("No known allergies");
  const [dietary, setDietary] = useState("Standard Halal Diet");
  const [medicalNotes, setMedicalNotes] = useState("Wears prescription glasses.");

  // ─── Fetch Guardian Real Dashboard Data ───
  const { data: dashData, isLoading: isDashLoading } = useQuery({
    queryKey: ["guardian-dashboard-data"],
    queryFn: async () => {
      const res = await fetch("/api/guardian/dashboard");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // ─── Fetch Leave Requests ───
  const { data: leaveData } = useQuery({
    queryKey: ["guardian-leave-requests"],
    queryFn: async () => {
      const res = await fetch("/api/guardian/leave-requests");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // ─── Fetch Event Consents ───
  const { data: consentData } = useQuery({
    queryKey: ["guardian-consents"],
    queryFn: async () => {
      const res = await fetch("/api/guardian/consents");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // ─── Fetch Emergency Profiles ───
  const { data: medicalData } = useQuery({
    queryKey: ["guardian-emergency-info"],
    queryFn: async () => {
      const res = await fetch("/api/guardian/emergency-info");
      if (!res.ok) return {};
      const json = await res.json();
      return json.data || {};
    },
  });

  // ─── Mutations ───
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
      toast.success("Leave request submitted successfully for Murabbi review!");
      setIsLeaveModalOpen(false);
      setLeaveNotes("");
      queryClient.invalidateQueries({ queryKey: ["guardian-leave-requests"] });
    },
    onError: () => {
      toast.error("Failed to submit leave request.");
    },
  });

  const consentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/guardian/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update consent status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Digital permission slip signed & submitted successfully!");
      setIsConsentModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["guardian-consents"] });
    },
    onError: () => {
      toast.error("Failed to submit consent.");
    },
  });

  const medicalMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/guardian/emergency-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update medical profile");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Child emergency contact & medical profile updated!");
      setIsMedicalModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["guardian-emergency-info"] });
    },
    onError: () => {
      toast.error("Failed to update medical profile.");
    },
  });

  // Children Roster (real DB data or fallback)
  const childrenList = dashData?.children || [
    {
      id: "part-1",
      name: "Muhammad Umair",
      groupName: "Group 1 (Murabbi: Ikram)",
      parkName: "Gulberg Park",
      cityName: "Lahore",
      todayStatus: "Present",
      attendance: { rate30: 92, rate7: 100, last5: [] },
      fees: { outstanding: 0, totalPaid: 1500 },
      murabbiName: "Ikram Meer",
      murabbiPhone: "923364543324",
    },
    {
      id: "part-2",
      name: "M Abdullah Qureshi",
      groupName: "Group 1 (Murabbi: Ikram)",
      parkName: "Gulberg Park",
      cityName: "Lahore",
      todayStatus: "Absent",
      attendance: { rate30: 84, rate7: 80, last5: [] },
      fees: { outstanding: 1500, totalPaid: 0 },
      murabbiName: "Ikram Meer",
      murabbiPhone: "923364543324",
    },
  ];

  const leaveList = leaveData || [];
  const consentList = consentData || [];
  const medicalProfiles = medicalData || {};

  const handleOpenConsentModal = (consent: any) => {
    setSelectedConsent(consent);
    setConsentStatus("approved");
    setIsConsentModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 space-y-6">
      {/* ─── Page Header & Quick Actions ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Assalam-o-Alaikum, {guardianName}
            </h1>
            <Badge className="bg-[#4B0A8F] text-white">Family Portal</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Interactive Parent Portal • Real-Time Attendance, Leave Requests, Digital Consents & Medical Safety.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLeaveModalOpen(true)}
            className="gap-2 border-slate-300 dark:border-slate-700"
          >
            <Calendar className="size-4 text-purple-600 dark:text-purple-400" />
            <span>Request Leave</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("consents")}
            className="gap-2 border-slate-300 dark:border-slate-700"
          >
            <FileCheck2 className="size-4 text-blue-600 dark:text-blue-400" />
            <span>Review Consents ({consentList.filter((c: any) => c.status === "pending").length})</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsMedicalModalOpen(true)}
            className="gap-2 bg-[#4B0A8F] hover:bg-[#3b0873] text-white shadow"
          >
            <Stethoscope className="size-4" />
            <span>Update Safety Profile</span>
          </Button>
        </div>
      </div>

      {/* ─── 4 Top KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Enrolled Children
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{childrenList.length} Linked</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                  Active in Gulberg Park
                </p>
              </div>
              <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Users className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  30-Day Attendance Rate
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {Math.round(
                    childrenList.reduce((acc: number, c: any) => acc + (c.attendance?.rate30 || 0), 0) /
                      (childrenList.length || 1)
                  )}
                  %
                </h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  Consistent Attendance
                </p>
              </div>
              <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Leave Requests
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {leaveList.filter((l: any) => l.status === "pending").length} Pending
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                  Murabbi Review Status
                </p>
              </div>
              <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Calendar className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Digital Consents
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {consentList.filter((c: any) => c.status === "pending").length} Required
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  Trip & Camp Slips
                </p>
              </div>
              <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <FileCheck2 className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-5 w-full bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="overview" className="gap-2 text-xs font-medium rounded-lg">
            <Users className="size-3.5" />
            <span>Children Overview</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-medium rounded-lg">
            <CalendarCheck className="size-3.5" />
            <span>Attendance & Leave Log</span>
          </TabsTrigger>
          <TabsTrigger value="consents" className="gap-2 text-xs font-medium rounded-lg">
            <FileCheck2 className="size-3.5" />
            <span>Event Consents ({consentList.filter((c: any) => c.status === "pending").length})</span>
          </TabsTrigger>
          <TabsTrigger value="medical" className="gap-2 text-xs font-medium rounded-lg">
            <Stethoscope className="size-3.5" />
            <span>Safety & Medical Profiles</span>
          </TabsTrigger>
          <TabsTrigger value="fees" className="gap-2 text-xs font-medium rounded-lg">
            <DollarSign className="size-3.5" />
            <span>Fee Transparency</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: CHILDREN OVERVIEW ─── */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {childrenList.map((child: any) => {
              const rate = child.attendance?.rate30 || 0;
              const outstanding = child.fees?.outstanding || 0;
              return (
                <Card key={child.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-gradient-to-br from-[#4B0A8F] to-[#1F0860] text-white flex items-center justify-center text-lg font-extrabold shadow-sm">
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">{child.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {child.parkName || "Gulberg Park"} • {child.groupName || "Group 1"}
                          </CardDescription>
                        </div>
                      </div>

                      <Badge
                        className={cn(
                          "text-xs px-2.5 py-1",
                          child.todayStatus === "Present"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                            : child.todayStatus === "Absent"
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        Today: {child.todayStatus || "Present"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Attendance Rate */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">30-Day Attendance Score</span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold">{rate}%</span>
                      </div>
                      <Progress value={rate} className="h-2 bg-slate-100 dark:bg-slate-800" />
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Assigned Murabbi</p>
                        <p className="text-xs font-bold text-foreground mt-0.5">
                          {child.murabbiName || "Ikram Meer"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Fee Status</p>
                        <p className={cn("text-xs font-bold mt-0.5", outstanding > 0 ? "text-amber-600" : "text-emerald-600")}>
                          {outstanding > 0 ? `Rs. ${outstanding} Pending` : "Fully Paid"}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLeaveChildId(child.id);
                          setIsLeaveModalOpen(true);
                        }}
                        className="flex-1 text-xs h-8 border-slate-300 dark:border-slate-700 gap-1.5"
                      >
                        <Calendar className="size-3.5 text-purple-600" />
                        <span>Request Leave</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const phone = child.murabbiPhone || "923364543324";
                          const text = encodeURIComponent(
                            `Assalam-o-Alaikum ${child.murabbiName || "Murabbi Ikram"}, I am the guardian of ${child.name}.`
                          );
                          window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                        }}
                        className="flex-1 text-xs h-8 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
                      >
                        <MessageSquare className="size-3.5" />
                        <span>Contact Murabbi</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── TAB 2: ATTENDANCE & LEAVE LOG ─── */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Leave Requests & Absence Notice History</h3>
              <p className="text-xs text-muted-foreground">
                Track submitted advance leave applications and Murabbi review status.
              </p>
            </div>
            <Button
              onClick={() => setIsLeaveModalOpen(true)}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white gap-2 text-xs"
            >
              <Plus className="size-3.5" />
              <span>Submit Leave Request</span>
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-muted-foreground font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Child Name</th>
                    <th className="py-3 px-4">Date Range</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Submitted Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
                  {leaveList.map((req: any) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-foreground">{req.childName}</td>
                      <td className="py-3 px-4 font-medium">
                        {req.startDate} to {req.endDate}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {req.reasonLabel || req.reason}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">{req.notes || "-"}</td>
                      <td className="py-3 px-4">
                        <Badge
                          className={cn(
                            "text-[10px]",
                            req.status === "approved"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                              : req.status === "declined"
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          )}
                        >
                          {req.status === "pending" ? "Pending Murabbi Review" : req.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {req.submittedAt ? req.submittedAt.slice(0, 10) : "2026-08-09"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 3: DIGITAL CONSENT FORMS ─── */}
        <TabsContent value="consents" className="mt-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Digital Permission Slips & Event Consents</h3>
            <p className="text-xs text-muted-foreground">
              Review and sign permission slips for outdoor trips, camps, and athletic tournaments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consentList.map((consent: any) => (
              <Card key={consent.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 mb-1.5 text-[10px]">
                        Permission Slip
                      </Badge>
                      <CardTitle className="text-base font-bold text-foreground">{consent.eventTitle}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Child: <span className="font-semibold text-foreground">{consent.childName}</span>
                      </CardDescription>
                    </div>

                    <Badge
                      className={cn(
                        "text-[10px]",
                        consent.status === "approved"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : consent.status === "declined"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      )}
                    >
                      {consent.status === "pending" ? "Action Required" : consent.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
                    <p className="text-muted-foreground">
                      📅 Date: <span className="font-semibold text-foreground">{consent.eventDate}</span>
                    </p>
                    <p className="text-muted-foreground">
                      📍 Location: <span className="font-semibold text-foreground">{consent.location}</span>
                    </p>
                    <p className="text-muted-foreground mt-1 line-clamp-2">{consent.instructions}</p>
                  </div>

                  {consent.status === "pending" ? (
                    <Button
                      onClick={() => handleOpenConsentModal(consent)}
                      className="w-full bg-[#4B0A8F] hover:bg-[#3b0873] text-white text-xs h-8 gap-2"
                    >
                      <FileCheck2 className="size-3.5" />
                      <span>Review & Sign Consent</span>
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-slate-100 dark:border-slate-800 pt-2">
                      <span>Signed by: {consent.signature}</span>
                      <span>Date: {consent.signedAt ? consent.signedAt.slice(0, 10) : "2026-08-08"}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── TAB 4: SAFETY & MEDICAL PROFILES ─── */}
        <TabsContent value="medical" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Emergency & Medical Safety Profiles</h3>
              <p className="text-xs text-muted-foreground">
                Keep emergency contacts, blood groups, and medical restrictions up-to-date for youth safety.
              </p>
            </div>
            <Button
              onClick={() => setIsMedicalModalOpen(true)}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white gap-2 text-xs"
            >
              <Stethoscope className="size-3.5" />
              <span>Update Safety Profile</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {childrenList.map((child: any) => {
              const profile = medicalProfiles[child.id] || {
                primaryEmergencyContactName: "Tariq Ahmed Qureshi",
                primaryEmergencyPhone: "923001234567",
                relationshipToChild: "Father",
                bloodGroup: "B+",
                allergies: "No known allergies",
                dietaryRestrictions: "Standard Halal Diet",
                medicalNotes: "Wears prescription glasses.",
                lastUpdated: "2026-08-05",
              };

              return (
                <Card key={child.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="size-5 text-[#4B0A8F]" />
                        <CardTitle className="text-base font-bold text-foreground">{child.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Updated: {profile.lastUpdated || "2026-08-05"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                        <p className="text-[11px] text-muted-foreground">Emergency Contact</p>
                        <p className="font-bold text-foreground mt-0.5">{profile.primaryEmergencyContactName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{profile.primaryEmergencyPhone}</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                        <p className="text-[11px] text-muted-foreground">Blood Group</p>
                        <p className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                          {profile.bloodGroup || "B+"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-semibold text-muted-foreground">Allergies & Dietary Constraints:</p>
                      <p className="text-xs font-medium text-foreground bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                        ⚠️ Allergies: {profile.allergies} | Dietary: {profile.dietaryRestrictions}
                      </p>
                    </div>

                    {profile.medicalNotes && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-muted-foreground">Special Instructions:</p>
                        <p className="text-xs text-muted-foreground italic">{profile.medicalNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── TAB 5: FEE TRANSPARENCY ─── */}
        <TabsContent value="fees" className="mt-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Fee Transparency & Payment Receipts</h3>
            <p className="text-xs text-muted-foreground">
              Official records of fee receipts and contributions for your enrolled children.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-muted-foreground font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Child Name</th>
                    <th className="py-3 px-4">Fee Month</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Date Paid</th>
                    <th className="py-3 px-4 text-right">Collector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-purple-600">REC-2026-0841</td>
                    <td className="py-3 px-4 font-bold text-foreground">Muhammad Umair</td>
                    <td className="py-3 px-4">August 2026</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">PKR 1,500</td>
                    <td className="py-3 px-4 text-muted-foreground">2026-08-03</td>
                    <td className="py-3 px-4 text-right font-medium">Basit Ahsan</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── LEAVE REQUEST MODAL ─── */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Calendar className="size-5 text-[#4B0A8F]" />
              Submit Advance Leave Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Notify the Murabbi of an upcoming absence for your child.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Select Child *</Label>
              <select
                value={leaveChildId}
                onChange={(e) => setLeaveChildId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
              >
                {childrenList.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.parkName || "Gulberg Park"})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Start Date *</Label>
                <Input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">End Date *</Label>
                <Input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Reason for Absence *</Label>
              <select
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="out_of_town">Out of Town / Traveling</option>
                <option value="sick">Sick / Health Issue</option>
                <option value="academic_exam">Academic School Exams</option>
                <option value="family_event">Family Event / Function</option>
                <option value="other">Other Reason</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Additional Notes (Optional)</Label>
              <Textarea
                placeholder="Brief explanation for Murabbi..."
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
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DIGITAL CONSENT MODAL ─── */}
      <Dialog open={isConsentModalOpen} onOpenChange={setIsConsentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <FileCheck2 className="size-5 text-[#4B0A8F]" />
              Digital Permission Slip
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedConsent?.eventTitle}
            </DialogDescription>
          </DialogHeader>

          {selectedConsent && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
                <p className="font-bold text-foreground">{selectedConsent.eventTitle}</p>
                <p className="text-muted-foreground">📅 {selectedConsent.eventDate}</p>
                <p className="text-muted-foreground">📍 {selectedConsent.location}</p>
                <p className="text-slate-600 dark:text-slate-300 mt-1">{selectedConsent.instructions}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Permission Decision *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={consentStatus === "approved" ? "default" : "outline"}
                    onClick={() => setConsentStatus("approved")}
                    className={cn("h-8 text-xs", consentStatus === "approved" && "bg-emerald-600 hover:bg-emerald-700")}
                  >
                    I Give Permission
                  </Button>
                  <Button
                    type="button"
                    variant={consentStatus === "declined" ? "default" : "outline"}
                    onClick={() => setConsentStatus("declined")}
                    className={cn("h-8 text-xs", consentStatus === "declined" && "bg-rose-600 hover:bg-rose-700")}
                  >
                    I Decline Permission
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Parent / Guardian Signature (Full Name) *</Label>
                <Input
                  value={consentSignature}
                  onChange={(e) => setConsentSignature(e.target.value)}
                  className="text-xs font-semibold"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConsentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                consentMutation.mutate({
                  consentId: selectedConsent?.id,
                  status: consentStatus,
                  guardianSignature: consentSignature,
                })
              }
              disabled={consentMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white"
            >
              Sign & Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MEDICAL / EMERGENCY INFO MODAL ─── */}
      <Dialog open={isMedicalModalOpen} onOpenChange={setIsMedicalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Stethoscope className="size-5 text-[#4B0A8F]" />
              Update Safety & Medical Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ensure emergency contacts and health info are current.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Select Child *</Label>
              <select
                value={medicalChildId}
                onChange={(e) => setMedicalChildId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
              >
                {childrenList.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Primary Contact Name *</Label>
                <Input
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Emergency Phone *</Label>
                <Input
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Relationship</Label>
                <Input
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Blood Group</Label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="O+">O+</option>
                  <option value="AB+">AB+</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Allergies</Label>
              <Input
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Dietary Restrictions</Label>
              <Input
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMedicalModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                medicalMutation.mutate({
                  participantId: medicalChildId,
                  primaryEmergencyContactName: emergencyContact,
                  primaryEmergencyPhone: emergencyPhone,
                  relationshipToChild: relationship,
                  bloodGroup,
                  allergies,
                  dietaryRestrictions: dietary,
                  medicalNotes,
                })
              }
              disabled={medicalMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white"
            >
              Save Profile Updates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
