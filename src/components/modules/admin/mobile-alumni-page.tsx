"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Users,
  Briefcase,
  Award,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Phone,
  MessageSquare,
  Building2,
  TreePine,
  UserCheck,
  TrendingUp,
  BookOpen,
  Calendar,
  ExternalLink,
  Share2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlumniRecord {
  id: string;
  name: string;
  phone: string;
  batch: string;
  originalPark: string;
  currentStatus: "higher_ed" | "employed" | "freelance" | "entrepreneur";
  institutionOrCompany: string;
  fieldOfStudyOrRole: string;
  willingToMentor: boolean;
  activeMenteeCount: number;
}

// MOCK_ALUMNI removed

interface MobileAlumniPageProps {
  onBack?: () => void;
}

export function MobileAlumniPage({ onBack }: MobileAlumniPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  const { data, isLoading, isError } = useQuery<{ success: boolean; data: AlumniRecord[] }>({
    queryKey: ["alumni"],
    queryFn: async () => {
      const res = await fetch("/api/admin/alumni");
      if (!res.ok) throw new Error("Failed to fetch alumni");
      return res.json();
    },
  });
  
  const alumniList = data?.data || [];

  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<AlumniRecord | null>(null);

  // New Alumni Form State
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBatch, setNewBatch] = useState("Batch 3");
  const [newPark, setNewPark] = useState("Gulberg Park");
  const [newStatus, setNewStatus] = useState<AlumniRecord["currentStatus"]>("higher_ed");
  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newMentorCheck, setNewMentorCheck] = useState(true);

  const filteredAlumni = useMemo(() => {
    return alumniList.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.institutionOrCompany.toLowerCase().includes(search.toLowerCase()) ||
        item.fieldOfStudyOrRole.toLowerCase().includes(search.toLowerCase());
      const matchesBatch = selectedBatch === "all" || item.batch === selectedBatch;
      const matchesStatus = selectedStatus === "all" || item.currentStatus === selectedStatus;
      return matchesSearch && matchesBatch && matchesStatus;
    });
  }, [alumniList, search, selectedBatch, selectedStatus]);

  const createAlumni = useMutation({
    mutationFn: async (newEntry: Omit<AlumniRecord, "id" | "activeMenteeCount">) => {
      const res = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });
      if (!res.ok) throw new Error("Failed to create alumni");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni"] });
      toast.success(`Added ${newName} to Alumni Directory!`);
      setIsAddOpen(false);
      setNewName("");
      setNewPhone("");
      setNewCompany("");
      setNewRole("");
    },
    onError: () => {
      toast.error("Failed to add alumni");
    },
  });

  const handleAddAlumni = () => {
    if (!newName || !newPhone) {
      toast.error("Please enter a name and phone number");
      return;
    }
    createAlumni.mutate({
      name: newName,
      phone: newPhone,
      batch: newBatch,
      originalPark: newPark,
      currentStatus: newStatus,
      institutionOrCompany: newCompany || "Self-employed / Student",
      fieldOfStudyOrRole: newRole || "General",
      willingToMentor: newMentorCheck,
    });
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const msg = `السلام عليكم ${name}! Connecting from Shabab 360 Alumni Network.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
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
                Alumni Network
              </h1>
              <Badge className="bg-[#4B0A8F] text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                Batch 1–3
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Graduate tracking, career paths & mentorship
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddOpen(true)}
          className="h-8 gap-1 text-xs font-bold bg-[#4B0A8F] hover:bg-[#3b0873] text-white rounded-xl shadow"
        >
          <Plus className="size-3.5" />
          <span>Add</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="text-center p-4 text-sm text-destructive">Failed to load alumni</div>
      ) : (
        <>
          {/* ─── 4 Top KPI Cards ─── */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Graduates
                </p>
                <h3 className="text-lg font-bold text-foreground mt-0.5">{alumniList.length} Total</h3>
                <p className="text-[10px] text-purple-600 font-medium">Batches 1, 2, 3</p>
              </div>
              <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                <GraduationCap className="size-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Mentors
                </p>
                <h3 className="text-lg font-bold text-emerald-600 mt-0.5">
                  {alumniList.filter((a) => a.willingToMentor).length} Active
                </h3>
                <p className="text-[10px] text-emerald-600 font-medium">Ready to guide</p>
              </div>
              <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <UserCheck className="size-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filter Pills & Search ─── */}
      <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Batch Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {["all", "Batch 1", "Batch 2", "Batch 3"].map((batch) => (
            <button
              key={batch}
              type="button"
              onClick={() => setSelectedBatch(batch)}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all",
                selectedBatch === batch
                  ? "bg-[#4B0A8F] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              )}
            >
              {batch === "all" ? "All Batches" : batch}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search alumni, company, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800"
          />
        </div>
      </div>

      {/* ─── Alumni Roster List ─── */}
      <div className="space-y-2.5">
        {filteredAlumni.map((alum) => {
          const statusColors: Record<string, string> = {
            higher_ed: "bg-blue-50 text-blue-700 border-blue-200",
            employed: "bg-emerald-50 text-emerald-700 border-emerald-200",
            entrepreneur: "bg-amber-50 text-amber-700 border-amber-200",
            freelance: "bg-purple-50 text-purple-700 border-purple-200",
          };

          return (
            <Card
              key={alum.id}
              className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
            >
              <CardContent className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-foreground">{alum.name}</h3>
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] px-1.5 py-0">
                        {alum.batch}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {alum.fieldOfStudyOrRole} • <span className="font-semibold">{alum.institutionOrCompany}</span>
                    </p>
                  </div>

                  <span
                    className={cn(
                      "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border",
                      statusColors[alum.currentStatus]
                    )}
                  >
                    {alum.currentStatus.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <TreePine className="size-3 text-emerald-600" />
                    {alum.originalPark}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openWhatsApp(alum.phone, alum.name)}
                      className="h-7 text-xs font-bold gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      <Share2 className="size-3" />
                      <span>Chat</span>
                    </Button>

                    {alum.willingToMentor && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedMentor(alum)}
                        className="h-7 text-xs font-bold gap-1 bg-[#4B0A8F] hover:bg-[#3b0873] text-white"
                      >
                        <UserCheck className="size-3" />
                        <span>Pair ({alum.activeMenteeCount})</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
        </>
      )}

      {/* ─── Add Alumni Dialog ─── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <GraduationCap className="size-5 text-[#4B0A8F]" />
              Register Graduate Alumni
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record Shabab 360 graduate details for career tracking & mentor network.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Full Name</Label>
              <Input
                placeholder="e.g. Bilal Ahmed"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Phone Number</Label>
              <Input
                placeholder="e.g. +92 300 1234567"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Graduation Batch</Label>
                <select
                  value={newBatch}
                  onChange={(e) => setNewBatch(e.target.value)}
                  className="w-full h-8 text-xs border rounded-lg px-2 bg-background"
                >
                  <option value="Batch 1">Batch 1</option>
                  <option value="Batch 2">Batch 2</option>
                  <option value="Batch 3">Batch 3</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Original Park</Label>
                <Input
                  placeholder="e.g. Gulberg Park"
                  value={newPark}
                  onChange={(e) => setNewPark(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Current Career Status</Label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full h-8 text-xs border rounded-lg px-2 bg-background"
              >
                <option value="higher_ed">Higher Education / University</option>
                <option value="employed">Employed (Full/Part Time)</option>
                <option value="entrepreneur">Entrepreneur / Business</option>
                <option value="freelance">Freelance / Remote</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Company / University</Label>
                <Input
                  placeholder="e.g. FAST Lahore"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Degree / Role</Label>
                <Input
                  placeholder="e.g. BS Computer Science"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddAlumni} className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold">
              Save Alumni
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Mentorship Drawer ─── */}
      <Dialog open={!!selectedMentor} onOpenChange={() => setSelectedMentor(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="size-5 text-emerald-600" />
              Pair Shabab with Mentor: {selectedMentor?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign an active Shabab member to receive career & spiritual guidance.
            </DialogDescription>
          </DialogHeader>

          {selectedMentor && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1">
                <p className="font-bold text-foreground">{selectedMentor.name}</p>
                <p className="text-muted-foreground text-[11px]">
                  {selectedMentor.fieldOfStudyOrRole} at {selectedMentor.institutionOrCompany}
                </p>
                <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">
                  Currently Mentoring {selectedMentor.activeMenteeCount} Shabab
                </Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Select Shabab to Pair</Label>
                <select className="w-full h-8 text-xs border rounded-lg px-2 bg-background">
                  <option>Muhammad Umair (Gulberg Park • Year 2)</option>
                  <option>M Abdullah Qureshi (Gulberg Park • Year 1)</option>
                  <option>Hamza Tariq (Model Town • Year 1)</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedMentor(null)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success(`Successfully assigned Shabab to ${selectedMentor?.name}!`);
                setSelectedMentor(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Confirm Mentorship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
