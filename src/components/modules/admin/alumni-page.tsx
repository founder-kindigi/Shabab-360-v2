"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  GraduationCap,
  Users,
  Briefcase,
  Award,
  Search,
  Plus,
  Phone,
  Mail,
  Linkedin,
  Calendar,
  Building,
  CheckCircle2,
  Sparkles,
  BookOpen,
  UserCheck,
  MessageSquare,
  ExternalLink,
  MapPin,
  Loader2,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AlumniRecord {
  id: string;
  fullName: string;
  fatherName?: string;
  mobile: string;
  email?: string;
  graduationBatch: string;
  graduationYear: number;
  park: string;
  city: string;
  currentProfession: string;
  organization?: string;
  higherEducation?: string;
  linkedinUrl?: string;
  isMentorAvailable: boolean;
  mentorshipTopics?: string[];
  avatar?: string;
}

export function AlumniPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const canManage = ["super_admin", "program_admin", "city_head"].includes(userRole || "");
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("directory");
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [parkFilter, setParkFilter] = useState("all");

  const [selectedAlumni, setSelectedAlumni] = useState<AlumniRecord | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isMentorshipModalOpen, setIsMentorshipModalOpen] = useState(false);
  const [targetMentor, setTargetMentor] = useState<AlumniRecord | null>(null);

  // Form states for registering alumni
  const [formFullName, setFormFullName] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formBatch, setFormBatch] = useState("Lahore Batch 3");
  const [formYear, setFormYear] = useState("2025");
  const [formPark, setFormPark] = useState("Gulberg Park");
  const [formProfession, setFormProfession] = useState("");
  const [formOrg, setFormOrg] = useState("");
  const [formEdu, setFormEdu] = useState("");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (batchFilter !== "all") params.set("batch", batchFilter);
  if (parkFilter !== "all") params.set("park", parkFilter);

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["alumni-list", search, batchFilter, parkFilter],
    queryFn: () => fetch(`/api/admin/alumni?${params}`).then((r) => r.json()),
  });

  const alumniList: AlumniRecord[] = responseData?.alumni || [];
  const stats = responseData?.stats || {
    totalGraduated: 1240,
    activeMentors: 340,
    universitiesRepresented: 28,
    reunionsOrganized: 12,
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formFullName,
          mobile: formMobile,
          email: formEmail || undefined,
          graduationBatch: formBatch,
          graduationYear: parseInt(formYear) || 2025,
          park: formPark,
          city: "Lahore",
          currentProfession: formProfession,
          organization: formOrg || undefined,
          higherEducation: formEdu || undefined,
          isMentorAvailable: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to register alumni");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Alumnus Registered Successfully!");
      setIsRegisterOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["alumni-list"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormFullName("");
    setFormMobile("");
    setFormEmail("");
    setFormProfession("");
    setFormOrg("");
    setFormEdu("");
  };

  const handleRequestMentorship = (mentor: AlumniRecord) => {
    setTargetMentor(mentor);
    setIsMentorshipModalOpen(true);
  };

  return (
    <div className="w-full space-y-6 pb-24 max-w-7xl mx-auto p-4 md:p-6">
      <PageHeader
        title="Alumni Portal & Network Hub"
        description="Connect graduated Shabab alumni, facilitate peer mentorship & tarbiyah, and manage alumni reunions."
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <Button
                onClick={() => {
                  resetForm();
                  setIsRegisterOpen(true);
                }}
                className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl h-10 px-4 text-xs shadow-md"
              >
                <Plus className="size-4 mr-1.5" /> Register Alumnus
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-purple-500/5 to-indigo-500/5">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-600">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.totalGraduated}</p>
              <p className="text-xs font-bold text-muted-foreground">Total Graduated Alumni</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
              <UserCheck className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.activeMentors}</p>
              <p className="text-xs font-bold text-muted-foreground">Active Alumni Mentors</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
              <Building className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.universitiesRepresented}</p>
              <p className="text-xs font-bold text-muted-foreground">Universities & Companies</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-amber-600/10 flex items-center justify-center text-amber-600">
              <Award className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.reunionsOrganized}</p>
              <p className="text-xs font-bold text-muted-foreground">Reunions & Gatherings</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl flex flex-wrap gap-1">
          <TabsTrigger value="directory" className="rounded-xl text-xs font-bold px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Users className="size-4 mr-1.5 text-purple-600" /> Alumni Directory ({alumniList.length})
          </TabsTrigger>
          <TabsTrigger value="mentorship" className="rounded-xl text-xs font-bold px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <BookOpen className="size-4 mr-1.5 text-emerald-600" /> Mentorship & Counseling Hub
          </TabsTrigger>
          <TabsTrigger value="reunions" className="rounded-xl text-xs font-bold px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
            <Calendar className="size-4 mr-1.5 text-blue-600" /> Reunions & Events
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Alumni Directory */}
        <TabsContent value="directory" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search alumni name, company, or profession..."
                className="pl-9 h-10 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={batchFilter} onValueChange={setBatchFilter}>
                <SelectTrigger className="w-36 h-10 rounded-xl text-xs font-bold"><SelectValue placeholder="Batch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  <SelectItem value="Batch 1">Batch 1 (2023)</SelectItem>
                  <SelectItem value="Batch 2">Batch 2 (2024)</SelectItem>
                  <SelectItem value="Batch 3">Batch 3 (2025)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={parkFilter} onValueChange={setParkFilter}>
                <SelectTrigger className="w-40 h-10 rounded-xl text-xs font-bold"><SelectValue placeholder="Park" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parks</SelectItem>
                  <SelectItem value="Gulberg">Gulberg Park</SelectItem>
                  <SelectItem value="Gulshan Iqbal">Gulshan Iqbal</SelectItem>
                  <SelectItem value="Griffin">Griffin Park</SelectItem>
                  <SelectItem value="Johar Town">Johar Town</SelectItem>
                  <SelectItem value="Gulshan Ravi">Gulshan Ravi</SelectItem>
                  <SelectItem value="State Life">State Life</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alumniList.map((alumnus) => (
              <Card
                key={alumnus.id}
                className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={alumnus.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                      alt={alumnus.fullName}
                      className="size-12 rounded-2xl object-cover ring-2 ring-purple-600/20"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 truncate">{alumnus.fullName}</h3>
                        {alumnus.isMentorAvailable && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                            Mentor
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-bold text-purple-600">{alumnus.currentProfession}</p>
                      <p className="text-[11px] text-muted-foreground font-medium truncate">{alumnus.organization || alumnus.higherEducation}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Graduation:</span>
                      <span className="font-bold">{alumnus.graduationBatch} ({alumnus.graduationYear})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Park:</span>
                      <span className="font-bold">{alumnus.park}</span>
                    </div>
                    {alumnus.higherEducation && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px]">Education:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">{alumnus.higherEducation}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/${alumnus.mobile.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                      >
                        <MessageSquare className="size-4" />
                      </a>
                      {alumnus.linkedinUrl && (
                        <a
                          href={alumnus.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                        >
                          <Linkedin className="size-4" />
                        </a>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleRequestMentorship(alumnus)}
                      className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold text-xs h-8 px-3 rounded-xl"
                    >
                      Book Guidance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Mentorship Hub */}
        <TabsContent value="mentorship" className="mt-6 space-y-4">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white space-y-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-400 fill-amber-400" />
              <h2 className="text-lg font-black">Shabab Alumni Mentorship Network</h2>
            </div>
            <p className="text-xs text-purple-100 max-w-2xl font-medium">
              Active Batch 4 Shabab participants can connect directly with experienced Alumni Mentors for academic guidance, career prep, and personal Tarbiyah counseling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alumniList.filter((a) => a.isMentorAvailable).map((mentor) => (
              <Card key={mentor.id} className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <img src={mentor.avatar} alt={mentor.fullName} className="size-12 rounded-2xl object-cover ring-2 ring-emerald-500/20" />
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">{mentor.fullName}</h3>
                    <p className="text-xs font-bold text-emerald-600">{mentor.currentProfession} · {mentor.organization}</p>
                    <p className="text-[11px] text-muted-foreground">{mentor.graduationBatch} ({mentor.park})</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Mentorship Focus Areas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(mentor.mentorshipTopics || ["Career Counseling", "Tarbiyah", "Leadership"]).map((topic, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 border-purple-200">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleRequestMentorship(mentor)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 text-xs shadow-sm mt-2"
                >
                  <UserCheck className="size-4 mr-1.5" /> Request Mentorship Session
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Alumni Events */}
        <TabsContent value="reunions" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-purple-100 text-purple-800 font-bold text-xs">Upcoming Reunion</Badge>
                <span className="text-xs text-muted-foreground font-mono font-bold">25th August 2026</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Shabab Annual Alumni Summit & Tarbiyah Dinner</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Grand reunion for Batches 1, 2, and 3 alumni across all 6 Lahore parks with guest lectures and awards.</p>
              </div>
              <div className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2"><MapPin className="size-4 text-purple-600" /> Executive Hall, Al-Burhan Campus Lahore</div>
                <div className="flex items-center gap-2"><Users className="size-4 text-emerald-600" /> Expected Attendees: 450+ Alumni</div>
              </div>
              <Button onClick={() => toast.success("RSVP Submitted for Alumni Summit!")} className="w-full bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl h-10 text-xs">
                Confirm RSVP Attendance
              </Button>
            </Card>

            <Card className="rounded-2xl border-0 ring-1 ring-slate-200 dark:ring-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-100 text-emerald-800 font-bold text-xs">Career Workshop</Badge>
                <span className="text-xs text-muted-foreground font-mono font-bold">12th September 2026</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Alumni Career Guidance & Tech Leadership Panel</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Panel session hosted by senior alumni working at Systems Ltd, KEMU, and PwC for graduating students.</p>
              </div>
              <div className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2"><MapPin className="size-4 text-purple-600" /> Gulberg Park Sports Complex Auditorium</div>
                <div className="flex items-center gap-2"><Users className="size-4 text-emerald-600" /> Speaker Panel: 6 Alumni Leaders</div>
              </div>
              <Button onClick={() => toast.success("RSVP Submitted for Career Panel!")} className="w-full bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl h-10 text-xs">
                Confirm RSVP Attendance
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Register Alumnus Modal */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Register Graduated Alumnus</DialogTitle>
            <DialogDescription className="text-xs">Add a new graduated student to the Alumni Directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Full Name *</label>
              <Input value={formFullName} onChange={(e) => setFormFullName(e.target.value)} placeholder="e.g. Hassan Raza" className="rounded-xl text-xs font-medium mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Mobile Number *</label>
              <Input value={formMobile} onChange={(e) => setFormMobile(e.target.value)} placeholder="e.g. +923001234567" className="rounded-xl text-xs font-medium mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Batch *</label>
                <Select value={formBatch} onValueChange={setFormBatch}>
                  <SelectTrigger className="w-full h-10 rounded-xl text-xs font-bold mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lahore Batch 1">Lahore Batch 1</SelectItem>
                    <SelectItem value="Lahore Batch 2">Lahore Batch 2</SelectItem>
                    <SelectItem value="Lahore Batch 3">Lahore Batch 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground">Park *</label>
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
              <label className="text-[11px] font-bold text-muted-foreground">Current Profession *</label>
              <Input value={formProfession} onChange={(e) => setFormProfession(e.target.value)} placeholder="e.g. Software Engineer / Doctor" className="rounded-xl text-xs font-medium mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Company / Organization</label>
              <Input value={formOrg} onChange={(e) => setFormOrg(e.target.value)} placeholder="e.g. Systems Ltd / KEMU" className="rounded-xl text-xs font-medium mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Higher Education Degree</label>
              <Input value={formEdu} onChange={(e) => setFormEdu(e.target.value)} placeholder="e.g. BS Computer Science (FAST)" className="rounded-xl text-xs font-medium mt-1" />
            </div>
          </div>
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setIsRegisterOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button
              onClick={() => registerMutation.mutate()}
              disabled={!formFullName || !formMobile || !formProfession || registerMutation.isPending}
              className="bg-[#4B0A8F] hover:bg-[#380668] text-white font-bold rounded-xl px-5"
            >
              {registerMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Register Alumnus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Mentorship Modal */}
      <Dialog open={isMentorshipModalOpen} onOpenChange={setIsMentorshipModalOpen}>
        <DialogContent className="rounded-2xl max-w-sm p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-purple-700">
              <UserCheck className="size-5" /> Book Guidance Session
            </DialogTitle>
            <DialogDescription className="text-xs">
              Request a 1-on-1 mentorship session with {targetMentor?.fullName} ({targetMentor?.currentProfession}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Select Discussion Topic</label>
              <Select defaultValue="career">
                <SelectTrigger className="w-full h-10 rounded-xl font-bold text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="career">Career & Job Prep</SelectItem>
                  <SelectItem value="admission">University Admissions</SelectItem>
                  <SelectItem value="tarbiyah">Tarbiyah & Personal Growth</SelectItem>
                  <SelectItem value="leadership">Sports & Public Speaking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-bold text-muted-foreground">Preferred Date & Time</label>
              <Input type="datetime-local" className="rounded-xl font-medium mt-1" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              onClick={() => {
                toast.success(`Mentorship Request Sent to ${targetMentor?.fullName}!`);
                setIsMentorshipModalOpen(false);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11"
            >
              Submit Mentorship Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
