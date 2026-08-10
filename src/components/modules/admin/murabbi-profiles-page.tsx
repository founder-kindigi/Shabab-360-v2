"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  UserCheck,
  Users,
  Search,
  Plus,
  Building,
  Sparkles,
  MessageSquare,
  Loader2,
  TrendingUp,
  Eye,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MurabbiRecord {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email?: string;
  park: string;
  city: string;
  primaryRole: string;
  secondaryRole?: string;
  assignedGroup: string;
  assignedStudentsCount: number;
  callingAssignedCount: number;
  callingContactedCount: number;
  mashwaraAttendanceRate: number;
  attendanceVerificationRate: number;
  karguzariStatus: string;
  avatar?: string;
}

export function MurabbiProfilesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const canManage = ["super_admin", "program_admin", "city_head"].includes(userRole || "");
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("directory");
  const [search, setSearch] = useState("");
  const [parkFilter, setParkFilter] = useState("all");

  const [selectedMurabbi, setSelectedMurabbi] = useState<MurabbiRecord | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Form states for registering Murabbi
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPark, setFormPark] = useState("Gulberg Park");
  const [formPrimaryRole, setFormPrimaryRole] = useState("Murabbi & Tadreeb Lead");
  const [formGroup, setFormGroup] = useState("");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (parkFilter !== "all") params.set("park", parkFilter);

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["murabbis-list", search, parkFilter],
    queryFn: () => fetch(`/api/admin/murabbis?${params}`).then((r) => r.json()),
  });

  const murabbisList: MurabbiRecord[] = responseData?.murabbis || [];
  const summary = responseData?.summary || {
    totalActiveMurabbis: 8,
    parksCovered: 6,
    totalStudentsAssigned: 387,
    averageMashwaraAttendance: 91,
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/murabbis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          email: formEmail || undefined,
          park: formPark,
          city: "Lahore",
          primaryRole: formPrimaryRole,
          assignedGroup: formGroup || `Group | Murabbi: ${formName}`,
        }),
      });
      if (!res.ok) throw new Error("Failed to register Murabbi");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Murabbi Staff Profile Created!");
      setIsRegisterOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["murabbis-list"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormGroup("");
  };

  return (
    <div className="w-full space-y-6 pb-24 max-w-7xl mx-auto p-4 md:p-6">
      <PageHeader
        title="Murabbi Profiles & Leadership Workspace"
        description="Manage official Murabbi profiles, youth group allocations, weekly Mashwara attendance, and session verification metrics."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Button
                onClick={() => {
                  resetForm();
                  setIsRegisterOpen(true);
                }}
                className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl h-10 px-4 text-xs shadow-md transition-transform hover:scale-[1.02]"
              >
                <Plus className="size-4 mr-1.5" /> Add Murabbi Leader
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-600">
                <UserCheck className="size-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{summary.totalActiveMurabbis}</p>
                <p className="text-xs font-bold text-muted-foreground">Active Murabbi Leaders</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
          <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                <Building className="size-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{summary.parksCovered} Parks</p>
                <p className="text-xs font-bold text-muted-foreground">Lahore Parks Supervised</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
          <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                <Users className="size-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{summary.totalStudentsAssigned}</p>
                <p className="text-xs font-bold text-muted-foreground">Shabab Students Managed</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }}>
          <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-amber-600/10 flex items-center justify-center text-amber-600">
                <TrendingUp className="size-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{summary.averageMashwaraAttendance}%</p>
                <p className="text-xs font-bold text-muted-foreground">Avg Mashwara Rate</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl flex flex-wrap gap-1">
          <TabsTrigger value="directory" className="rounded-xl text-xs font-bold px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <UserCheck className="size-4 mr-1.5 text-purple-600" /> Murabbi Leadership Roster ({murabbisList.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl text-xs font-bold px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Activity className="size-4 mr-1.5 text-emerald-600" /> Karguzari & Performance Matrix
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Directory */}
        <TabsContent value="directory" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Murabbi name, role, phone..."
                className="pl-9 h-10 rounded-xl text-xs font-medium"
              />
            </div>

            <Select value={parkFilter} onValueChange={setParkFilter}>
              <SelectTrigger className="w-44 h-10 rounded-xl text-xs font-bold"><SelectValue placeholder="All Parks" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parks (6 Lahore)</SelectItem>
                <SelectItem value="Gulberg">Gulberg Park</SelectItem>
                <SelectItem value="Gulshan Iqbal">Gulshan Iqbal</SelectItem>
                <SelectItem value="Griffin">Griffin Park</SelectItem>
                <SelectItem value="Johar Town">Johar Town</SelectItem>
                <SelectItem value="Gulshan Ravi">Gulshan Ravi</SelectItem>
                <SelectItem value="State Life">State Life</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {murabbisList.map((murabbi, idx) => (
                <motion.div
                  key={murabbi.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                >
                  <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden h-full flex flex-col justify-between">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={murabbi.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"}
                          alt={murabbi.name}
                          className="size-12 rounded-2xl object-cover ring-2 ring-purple-600/20 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 truncate">{murabbi.name}</h3>
                          <p className="text-xs font-bold text-purple-600">{murabbi.primaryRole}</p>
                          <p className="text-[11px] text-muted-foreground font-medium truncate">{murabbi.park}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Assigned Youth Group:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">{murabbi.assignedGroup}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Shabab Students:</span>
                          <Badge className="bg-purple-100 text-purple-800 font-bold text-[10px]">
                            {murabbi.assignedStudentsCount} Students
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Mashwara Attendance:</span>
                          <span className="font-bold text-emerald-600">{murabbi.mashwaraAttendanceRate}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 gap-2">
                        <a
                          href={`https://wa.me/${murabbi.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 text-xs font-bold"
                        >
                          <MessageSquare className="size-3.5" /> WhatsApp
                        </a>

                        <Button
                          size="sm"
                          onClick={() => setSelectedMurabbi(murabbi)}
                          className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold text-xs h-8 px-3 rounded-xl transition-transform hover:scale-[1.02]"
                        >
                          <Eye className="size-3.5 mr-1" /> View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Tab 2: Performance Matrix */}
        <TabsContent value="performance" className="mt-6 space-y-4">
          <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Murabbi Leader</th>
                    <th className="p-4">Primary Role & Park</th>
                    <th className="p-4">Assigned Students</th>
                    <th className="p-4">Outreach Call Progress</th>
                    <th className="p-4">Mashwara Rate</th>
                    <th className="p-4">Karguzari Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {murabbisList.map((m) => {
                    const callPercent = Math.round((m.callingContactedCount / m.callingAssignedCount) * 100) || 75;
                    return (
                      <tr key={m.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <img src={m.avatar} alt={m.name} className="size-8 rounded-xl object-cover" />
                          <div>
                            <div>{m.name}</div>
                            <span className="text-[10px] text-purple-600 font-mono font-medium">{m.phone}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <div className="font-bold">{m.primaryRole}</div>
                          <span className="text-muted-foreground">{m.park}</span>
                        </td>
                        <td className="p-4 text-xs font-extrabold text-slate-900 dark:text-slate-100">
                          {m.assignedStudentsCount} Students
                        </td>
                        <td className="p-4 text-xs font-semibold">
                          <div className="space-y-1 w-32">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>{m.callingContactedCount}/{m.callingAssignedCount}</span>
                              <span className="text-purple-600">{callPercent}%</span>
                            </div>
                            <Progress value={callPercent} className="h-1.5" />
                          </div>
                        </td>
                        <td className="p-4 text-xs font-bold text-emerald-600">
                          {m.mashwaraAttendanceRate}%
                        </td>
                        <td className="p-4">
                          <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {m.karguzariStatus}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Murabbi Profile Drawer ────────────────────────────────────────────── */}
      <Sheet open={!!selectedMurabbi} onOpenChange={(open) => !open && setSelectedMurabbi(null)}>
        <SheetContent className="w-full sm:max-w-lg p-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-black flex items-center gap-2 text-purple-700">
              <UserCheck className="size-5" /> Murabbi Leadership Profile
            </SheetTitle>
            <SheetDescription className="text-xs">
              Detailed performance metrics, assigned youth groups, and weekly Karguzari log.
            </SheetDescription>
          </SheetHeader>

          {selectedMurabbi && (
            <div className="space-y-6 pt-4 text-xs">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <img src={selectedMurabbi.avatar} alt={selectedMurabbi.name} className="size-14 rounded-2xl object-cover ring-2 ring-purple-600/30" />
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{selectedMurabbi.name}</h2>
                  <p className="font-bold text-purple-600 text-xs">{selectedMurabbi.primaryRole}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{selectedMurabbi.park} · Lahore</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider">Contact & Assignment Details</h4>
                <div className="p-4 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 space-y-2.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mobile Phone:</span>
                    <span className="font-bold font-mono text-purple-600">{selectedMurabbi.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Official Email:</span>
                    <span className="font-bold">{selectedMurabbi.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allocated Youth Group:</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">{selectedMurabbi.assignedGroup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Managed Students Roster:</span>
                    <span className="font-bold text-emerald-600">{selectedMurabbi.assignedStudentsCount} Active Students</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider">Leadership & Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900">
                    <span className="text-muted-foreground text-[11px] font-bold">Weekly Mashwara Rate:</span>
                    <p className="text-xl font-black text-purple-700 dark:text-purple-400 mt-0.5">{selectedMurabbi.mashwaraAttendanceRate}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
                    <span className="text-muted-foreground text-[11px] font-bold">Attendance Verification:</span>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{selectedMurabbi.attendanceVerificationRate}%</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider">Outreach Call Workload</h4>
                <div className="p-4 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between font-bold text-xs">
                    <span>Campaign Outreach Calls Contacted:</span>
                    <span className="text-purple-600">{selectedMurabbi.callingContactedCount} / {selectedMurabbi.callingAssignedCount}</span>
                  </div>
                  <Progress value={Math.round((selectedMurabbi.callingContactedCount / selectedMurabbi.callingAssignedCount) * 100)} className="h-2" />
                </div>
              </div>

              <Button onClick={() => setSelectedMurabbi(null)} className="w-full font-bold rounded-xl bg-[#4B0A8F] text-white h-11">
                Close Murabbi Profile
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Murabbi Modal */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Add Murabbi Leader</DialogTitle>
            <DialogDescription className="text-xs">Create a new Murabbi staff profile and assign primary role & park.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Full Name *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Ikram Meer" className="rounded-xl text-xs font-medium mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Mobile Phone *</label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="e.g. +923364543324" className="rounded-xl text-xs font-medium mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Primary Role *</label>
                <Select value={formPrimaryRole} onValueChange={setFormPrimaryRole}>
                  <SelectTrigger className="w-full h-10 rounded-xl text-xs font-bold mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Murabbi & Skills Lead">Murabbi & Skills Lead</SelectItem>
                    <SelectItem value="Murabbi & Tadreeb Lead">Murabbi & Tadreeb Lead</SelectItem>
                    <SelectItem value="Sports Lead & Muawin">Sports Lead & Muawin</SelectItem>
                    <SelectItem value="Park Admin & Muawin">Park Admin & Muawin</SelectItem>
                    <SelectItem value="Media Lead & Muawin">Media Lead & Muawin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Assigned Park *</label>
                <Select value={formPark} onValueChange={setFormPark}>
                  <SelectTrigger className="w-full h-10 rounded-xl text-xs font-bold mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gulberg Park">Gulberg Park</SelectItem>
                    <SelectItem value="Gulshan Iqbal Park">Gulshan Iqbal</SelectItem>
                    <SelectItem value="Griffin Park">Griffin Park</SelectItem>
                    <SelectItem value="Johar Town Park">Johar Town</SelectItem>
                    <SelectItem value="Gulshan Ravi Park">Gulshan Ravi</SelectItem>
                    <SelectItem value="State Life Park">State Life</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Assigned Youth Group Name</label>
              <Input value={formGroup} onChange={(e) => setFormGroup(e.target.value)} placeholder="e.g. Group 1 | Murabbi: Ikram" className="rounded-xl text-xs font-medium mt-1" />
            </div>
          </div>
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button
              onClick={() => registerMutation.mutate()}
              disabled={!formName || !formPhone || registerMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl px-5"
            >
              {registerMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save Murabbi Leader"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
