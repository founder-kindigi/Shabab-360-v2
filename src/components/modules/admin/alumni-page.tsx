"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
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
import { toast } from "sonner";
import {
  GraduationCap,
  Users,
  Briefcase,
  Award,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  Building2,
  TreePine,
  UserCheck,
  TrendingUp,
  BookOpen,
  Calendar,
  ExternalLink,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlumniRecord {
  id: string;
  name: string;
  phone: string;
  batch: string; // e.g. "Lahore Batch 1", "Lahore Batch 2"
  originalPark: string;
  currentStatus: "higher_ed" | "employed" | "freelance" | "entrepreneur";
  institutionOrCompany: string;
  fieldOfStudyOrRole: string;
  isMentor: boolean;
  activeMenteesCount: number;
  graduationYear: string;
}

export interface MentorshipPair {
  id: string;
  mentorName: string;
  mentorPhone: string;
  mentorField: string;
  studentName: string;
  studentGroup: string;
  studentPark: string;
  domain: string;
  frequency: string;
  status: "active" | "completed";
  startDate: string;
}

export interface CareerOpportunity {
  id: string;
  title: string;
  organization: string;
  type: "internship" | "full_time" | "part_time" | "scholarship";
  location: string;
  postedBy: string;
  deadline: string;
  contactEmail: string;
}

const MOCK_ALUMNI: AlumniRecord[] = [
  {
    id: "alm-1",
    name: "Muhammad Hamza Khan",
    phone: "923001234567",
    batch: "Lahore Batch 1 (2024)",
    originalPark: "Gulberg Park",
    currentStatus: "higher_ed",
    institutionOrCompany: "UET Lahore",
    fieldOfStudyOrRole: "B.Sc Electrical Engineering",
    isMentor: true,
    activeMenteesCount: 2,
    graduationYear: "2024",
  },
  {
    id: "alm-2",
    name: "Bilal Ahmad Qureshi",
    phone: "923214567890",
    batch: "Lahore Batch 2 (2025)",
    originalPark: "Gulshan Iqbal Park",
    currentStatus: "employed",
    institutionOrCompany: "Systems Limited",
    fieldOfStudyOrRole: "Junior Software Engineer",
    isMentor: true,
    activeMenteesCount: 3,
    graduationYear: "2025",
  },
  {
    id: "alm-3",
    name: "Usman Ali Raza",
    phone: "923339876543",
    batch: "Lahore Batch 1 (2024)",
    originalPark: "Griffin Park",
    currentStatus: "freelance",
    institutionOrCompany: "Upwork Top Rated",
    fieldOfStudyOrRole: "UI/UX & Web Developer",
    isMentor: true,
    activeMenteesCount: 1,
    graduationYear: "2024",
  },
  {
    id: "alm-4",
    name: "Zubair Hassan",
    phone: "923026543210",
    batch: "Lahore Batch 3 (2025)",
    originalPark: "Johar Town Park",
    currentStatus: "higher_ed",
    institutionOrCompany: "FAST NUTES Lahore",
    fieldOfStudyOrRole: "BS Computer Science",
    isMentor: false,
    activeMenteesCount: 0,
    graduationYear: "2025",
  },
  {
    id: "alm-5",
    name: "Saad Abdullah",
    phone: "923127890123",
    batch: "Lahore Batch 2 (2025)",
    originalPark: "State Life Park",
    currentStatus: "entrepreneur",
    institutionOrCompany: "TechVibe Solutions",
    fieldOfStudyOrRole: "Founder & CEO",
    isMentor: true,
    activeMenteesCount: 2,
    graduationYear: "2025",
  },
];

const MOCK_MENTORSHIPS: MentorshipPair[] = [
  {
    id: "mnt-1",
    mentorName: "Muhammad Hamza Khan",
    mentorPhone: "923001234567",
    mentorField: "Electrical Engineering",
    studentName: "Muhammad Umair",
    studentGroup: "Group 1",
    studentPark: "Gulberg Park",
    domain: "Engineering & STEM",
    frequency: "Bi-Weekly",
    status: "active",
    startDate: "2026-06-01",
  },
  {
    id: "mnt-2",
    mentorName: "Bilal Ahmad Qureshi",
    mentorPhone: "923214567890",
    mentorField: "Software Engineering",
    studentName: "M Abdullah Qureshi",
    studentGroup: "Group 1",
    studentPark: "Gulberg Park",
    domain: "Computer Science & IT",
    frequency: "Weekly",
    status: "active",
    startDate: "2026-06-15",
  },
  {
    id: "mnt-3",
    mentorName: "Saad Abdullah",
    mentorPhone: "923127890123",
    mentorField: "Entrepreneurship",
    studentName: "Muaz Zakariya Majid",
    studentGroup: "Group 2",
    studentPark: "Gulberg Park",
    domain: "Business & Leadership",
    frequency: "Monthly",
    status: "active",
    startDate: "2026-07-01",
  },
];

const MOCK_OPPORTUNITIES: CareerOpportunity[] = [
  {
    id: "opp-1",
    title: "Junior Web Development Internship",
    organization: "TechVibe Solutions",
    type: "internship",
    location: "Lahore (Hybrid)",
    postedBy: "Saad Abdullah (Alumni Batch 2)",
    deadline: "2026-08-30",
    contactEmail: "careers@techvibe.pk",
  },
  {
    id: "opp-2",
    title: "Need Assessment Merit Scholarship 2026",
    organization: "Shabab Educational Foundation",
    type: "scholarship",
    location: "Lahore",
    postedBy: "HQ Program Office",
    deadline: "2026-09-15",
    contactEmail: "scholarships@shabab360.org",
  },
];

export function AlumniPage() {
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"directory" | "mentorship" | "opportunities">("directory");
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [alumniList, setAlumniList] = useState<AlumniRecord[]>(MOCK_ALUMNI);
  const [mentorships, setMentorships] = useState<MentorshipPair[]>(MOCK_MENTORSHIPS);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniRecord | null>(null);

  // Form State - Register Alumni
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBatch, setFormBatch] = useState("Lahore Batch 1 (2024)");
  const [formPark, setFormPark] = useState("Gulberg Park");
  const [formStatus, setFormStatus] = useState<"higher_ed" | "employed" | "freelance" | "entrepreneur">("higher_ed");
  const [formInstitution, setFormInstitution] = useState("");
  const [formField, setFormField] = useState("");
  const [formIsMentor, setFormIsMentor] = useState(true);

  // Form State - Assign Mentorship
  const [pairMentor, setPairMentor] = useState(MOCK_ALUMNI[0].name);
  const [pairStudent, setPairStudent] = useState("");
  const [pairDomain, setPairDomain] = useState("Computer Science & IT");
  const [pairFrequency, setPairFrequency] = useState("Bi-Weekly");

  const filteredAlumni = useMemo(() => {
    return alumniList.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.institutionOrCompany.toLowerCase().includes(search.toLowerCase()) ||
        item.fieldOfStudyOrRole.toLowerCase().includes(search.toLowerCase());
      const matchBatch = batchFilter === "all" || item.batch.includes(batchFilter);
      const matchStatus = statusFilter === "all" || item.currentStatus === statusFilter;
      return matchSearch && matchBatch && matchStatus;
    });
  }, [alumniList, search, batchFilter, statusFilter]);

  const totalPages = Math.ceil(filteredAlumni.length / pageSize) || 1;
  const paginatedAlumni = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAlumni.slice(start, start + pageSize);
  }, [filteredAlumni, page]);

  const handleRegisterAlumni = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      toast.error("Please provide Alumni Name and Phone");
      return;
    }

    const newRecord: AlumniRecord = {
      id: `alm-${Date.now()}`,
      name: formName.trim(),
      phone: formPhone.trim(),
      batch: formBatch,
      originalPark: formPark,
      currentStatus: formStatus,
      institutionOrCompany: formInstitution.trim() || "University of Lahore",
      fieldOfStudyOrRole: formField.trim() || "Higher Education Student",
      isMentor: formIsMentor,
      activeMenteesCount: 0,
      graduationYear: "2025",
    };

    setAlumniList([newRecord, ...alumniList]);
    setIsRegisterModalOpen(false);
    setFormName("");
    setFormPhone("");
    setFormInstitution("");
    setFormField("");
    toast.success("Alumni record registered successfully!");
  };

  const handleCreatePairing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairStudent.trim()) {
      toast.error("Please enter student name");
      return;
    }

    const newPair: MentorshipPair = {
      id: `mnt-${Date.now()}`,
      mentorName: pairMentor,
      mentorPhone: "923001234567",
      mentorField: "Specialized Field",
      studentName: pairStudent.trim(),
      studentGroup: "Group 1",
      studentPark: "Gulberg Park",
      domain: pairDomain,
      frequency: pairFrequency,
      status: "active",
      startDate: new Date().toISOString().split("T")[0],
    };

    setMentorships([newPair, ...mentorships]);
    setIsPairModalOpen(false);
    setPairStudent("");
    toast.success(`Paired ${pairMentor} with ${pairStudent}!`);
  };

  const getStatusBadge = (status: AlumniRecord["currentStatus"]) => {
    switch (status) {
      case "higher_ed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">🎓 Higher Ed</Badge>;
      case "employed":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">💼 Employed</Badge>;
      case "freelance":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">💻 Freelancing</Badge>;
      case "entrepreneur":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">🚀 Entrepreneur</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 space-y-6">
      <PageHeader
        title="Alumni Network & Mentorship Tracker"
        description="Track graduated participants, higher education & career placements, and Alumni-to-Student mentorship pairings."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setIsPairModalOpen(true)}
              variant="outline"
              className="border-slate-200 dark:border-slate-800 h-10 px-4 text-xs font-semibold gap-1.5"
            >
              <HeartHandshake className="size-4 text-[#4B0A8F]" />
              Assign Mentorship Pair
            </Button>
            <Button
              onClick={() => setIsRegisterModalOpen(true)}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white shadow-md rounded-lg h-10 px-4 text-xs font-semibold gap-2"
            >
              <Plus className="size-4" />
              Register Alumni Record
            </Button>
          </div>
        }
      />

      {/* ─── 4 Top KPI Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-300 shrink-0">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Alumni</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">342 Alumni</h3>
              <p className="text-[11px] text-emerald-600 font-medium flex items-center mt-0.5">
                <TrendingUp className="size-3 mr-1" /> Batches 1 to 3
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-purple-50/40 to-white dark:from-purple-950/20 dark:to-slate-900 rounded-xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-300 shrink-0">
              <BookOpen className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Higher Education Rate</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">88%</h3>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">Universities & Colleges</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-slate-900 rounded-xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-300 shrink-0">
              <HeartHandshake className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Mentors</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">45 Mentors</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Guiding Batch 4 Shabab</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-amber-50/40 to-white dark:from-amber-950/20 dark:to-slate-900 rounded-xl overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-300 shrink-0">
              <Briefcase className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Career Placements</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">128 Professionals</h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Employed & Freelancers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Tabs Switcher ────────────────────────────────────────── */}
      <Tabs defaultValue="directory" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="directory" className="rounded-lg font-medium text-xs sm:text-sm px-4">
              <GraduationCap className="size-4 mr-2" /> Alumni Directory ({alumniList.length})
            </TabsTrigger>
            <TabsTrigger value="mentorship" className="rounded-lg font-medium text-xs sm:text-sm px-4">
              <HeartHandshake className="size-4 mr-2" /> Mentorship Pairings ({mentorships.length})
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="rounded-lg font-medium text-xs sm:text-sm px-4">
              <Briefcase className="size-4 mr-2" /> Job & Opportunity Board
            </TabsTrigger>
          </TabsList>

          {activeTab === "directory" && (
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search alumni by name, university..."
                  className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="higher_ed">Higher Ed</SelectItem>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="freelance">Freelancing</SelectItem>
                  <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ─── Tab 1: Alumni Network Directory ────────────────────────────── */}
        <TabsContent value="directory" className="space-y-4 m-0">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Alumni Name & Phone</th>
                    <th className="p-4">Graduation Batch</th>
                    <th className="p-4">Original Park</th>
                    <th className="p-4">Status & Institution</th>
                    <th className="p-4">Mentorship Role</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedAlumni.map((item) => (
                    <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                        <div>{item.name}</div>
                        <span className="text-xs text-muted-foreground font-mono flex items-center mt-0.5">
                          <Phone className="size-3 mr-1 text-emerald-600" /> {item.phone}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {item.batch}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <TreePine className="size-3.5 text-emerald-600" /> {item.originalPark}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {getStatusBadge(item.currentStatus)}
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {item.institutionOrCompany}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            {item.fieldOfStudyOrRole}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {item.isMentor ? (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px] font-bold border-0">
                            🛡️ Mentor ({item.activeMenteesCount} Mentees)
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Member</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`https://wa.me/${item.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1"
                          >
                            <MessageSquare className="size-3.5" /> WA
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAlumni(item)}
                            className="h-8 px-3 text-xs border-slate-200 dark:border-slate-800 font-bold rounded-lg"
                          >
                            View Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Page {page} of {totalPages} ({filteredAlumni.length} total records)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  <ChevronLeft className="size-4 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Mentorship Matching & Assignments ──────────────────── */}
        <TabsContent value="mentorship" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mentorships.map((pair) => (
              <Card key={pair.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-5 space-y-3 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <Badge className="bg-purple-100 text-purple-700 font-bold text-[10px] uppercase">
                    {pair.domain}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {pair.frequency}
                  </Badge>
                </div>

                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900 space-y-2">
                  <div className="text-xs font-semibold text-slate-500">ALUMNI MENTOR</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{pair.mentorName}</div>
                  <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">{pair.mentorField}</div>
                </div>

                <div className="flex items-center justify-center text-xs font-bold text-slate-400">
                  ⬇️ Mentoring Current Participant
                </div>

                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900 space-y-1">
                  <div className="text-xs font-semibold text-slate-500">BATCH 4 STUDENT</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{pair.studentName}</div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{pair.studentPark} • {pair.studentGroup}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 font-medium">
                  <span>Since {pair.startDate}</span>
                  <span className="text-emerald-600 font-bold flex items-center">
                    <CheckCircle2 className="size-3.5 mr-1" /> Active Pair
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── Tab 3: Career & Job Opportunities Board ────────────────────── */}
        <TabsContent value="opportunities" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_OPPORTUNITIES.map((opp) => (
              <Card key={opp.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-5 space-y-3 bg-white dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                      {opp.type.replace(/_/g, " ")}
                    </Badge>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                      {opp.title}
                    </h3>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{opp.organization}</p>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">{opp.location}</span>
                </div>

                <div className="text-xs text-muted-foreground font-medium">
                  Posted by: <strong className="text-slate-800 dark:text-slate-200">{opp.postedBy}</strong>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[11px] font-medium text-slate-500">Deadline: {opp.deadline}</span>
                  <a
                    href={`mailto:${opp.contactEmail}`}
                    className="inline-flex items-center justify-center h-8 px-3 text-xs bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold rounded-lg gap-1"
                  >
                    Apply Now <ExternalLink className="size-3 ml-1" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Register Alumni Modal ──────────────────────────────────────── */}
      <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="size-5 text-[#4B0A8F]" /> Register Alumni Record
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a graduated Shabab participant to the central Alumni Network registry.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterAlumni} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alumni Full Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Muhammad Hamza Khan"
                className="h-10 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number *</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 923001234567"
                  className="h-10 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Graduation Batch</Label>
                <Select value={formBatch} onValueChange={setFormBatch}>
                  <SelectTrigger className="h-10 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lahore Batch 1 (2024)">Lahore Batch 1 (2024)</SelectItem>
                    <SelectItem value="Lahore Batch 2 (2025)">Lahore Batch 2 (2025)</SelectItem>
                    <SelectItem value="Lahore Batch 3 (2025)">Lahore Batch 3 (2025)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Original Park</Label>
                <Select value={formPark} onValueChange={setFormPark}>
                  <SelectTrigger className="h-10 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Park" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gulberg Park">Gulberg Park</SelectItem>
                    <SelectItem value="Gulshan Iqbal Park">Gulshan Iqbal Park</SelectItem>
                    <SelectItem value="Griffin Park">Griffin Park</SelectItem>
                    <SelectItem value="Johar Town Park">Johar Town Park</SelectItem>
                    <SelectItem value="State Life Park">State Life Park</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Current Status</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as any)}>
                  <SelectTrigger className="h-10 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="higher_ed">Higher Education</SelectItem>
                    <SelectItem value="employed">Employed</SelectItem>
                    <SelectItem value="freelance">Freelancing</SelectItem>
                    <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Institution / University / Company Name</Label>
              <Input
                value={formInstitution}
                onChange={(e) => setFormInstitution(e.target.value)}
                placeholder="e.g. UET Lahore / Systems Ltd"
                className="h-10 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Degree / Field of Study / Job Title</Label>
              <Input
                value={formField}
                onChange={(e) => setFormField(e.target.value)}
                placeholder="e.g. B.Sc Electrical Engineering"
                className="h-10 text-xs rounded-lg"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRegisterModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white">
                Register Alumni Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Mentorship Pair Modal ───────────────────────────────── */}
      <Dialog open={isPairModalOpen} onOpenChange={setIsPairModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <HeartHandshake className="size-5 text-[#4B0A8F]" /> Create Mentorship Pairing
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pair an Alumni Mentor with a current Batch 4 participant for guidance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePairing} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Alumni Mentor *</Label>
              <Select value={pairMentor} onValueChange={setPairMentor}>
                <SelectTrigger className="h-10 text-xs font-semibold rounded-lg">
                  <SelectValue placeholder="Select Mentor" />
                </SelectTrigger>
                <SelectContent>
                  {alumniList.map((alm) => (
                    <SelectItem key={alm.id} value={alm.name}>
                      {alm.name} ({alm.institutionOrCompany})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Batch 4 Student Name *</Label>
              <Input
                value={pairStudent}
                onChange={(e) => setPairStudent(e.target.value)}
                placeholder="e.g. Muhammad Umair (Gulberg Group 1)"
                className="h-10 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mentorship Domain</Label>
                <Select value={pairDomain} onValueChange={setPairDomain}>
                  <SelectTrigger className="h-10 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer Science & IT">Computer Science & IT</SelectItem>
                    <SelectItem value="Engineering & STEM">Engineering & STEM</SelectItem>
                    <SelectItem value="Business & Leadership">Business & Leadership</SelectItem>
                    <SelectItem value="Vocational & Skills">Vocational & Skills</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Meeting Frequency</Label>
                <Select value={pairFrequency} onValueChange={setPairFrequency}>
                  <SelectTrigger className="h-10 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPairModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white">
                Create Mentorship Pair
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Alumni Detail Drawer ───────────────────────────────────────── */}
      <Dialog open={!!selectedAlumni} onOpenChange={(open) => !open && setSelectedAlumni(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{selectedAlumni?.name}</DialogTitle>
            <DialogDescription className="text-xs font-mono">{selectedAlumni?.batch} • {selectedAlumni?.originalPark}</DialogDescription>
          </DialogHeader>

          {selectedAlumni && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1.5">
                <div className="font-semibold text-slate-500">INSTITUTION / COMPANY</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{selectedAlumni.institutionOrCompany}</div>
                <div className="text-purple-700 dark:text-purple-300 font-medium">{selectedAlumni.fieldOfStudyOrRole}</div>
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                <span className="font-medium">Active Mentorships</span>
                <Badge className="bg-purple-100 text-purple-700 font-bold">
                  {selectedAlumni.activeMenteesCount} Mentees Paired
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAlumni(null)} className="w-full rounded-lg font-bold">
              Close Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
