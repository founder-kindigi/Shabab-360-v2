"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
  BookOpen,
  FileText,
  Download,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Tag,
  ShieldCheck,
  Bookmark,
  TrendingUp,
  FileCode,
  FileCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DigitalResourceRecord {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  category: "curriculum" | "activity_guide" | "policy" | "media";
  allowedRoles: string;
  fileSize: string;
  fileType: string;
  createdAt: string;
}

interface KnowledgeArticleRecord {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: "best_practices" | "operational_guide" | "faq" | "training";
  tags: string;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
}

const MOCK_RESOURCES: DigitalResourceRecord[] = [
  {
    id: "r1",
    title: "Lahore Batch 4 Complete Curriculum Guide",
    description: "Detailed 8-week syllabus covering Sports, Life Skills, and Tarbiyah Ethics.",
    category: "curriculum",
    fileUrl: "/docs/lahore-batch-4-curriculum.pdf",
    allowedRoles: "all",
    fileSize: "2.4 MB",
    fileType: "PDF",
    createdAt: "2026-08-01",
  },
  {
    id: "r2",
    title: "Murabbi Field Operations & Attendance SOP",
    description: "Standard operating procedures for marking group attendance and logging absence alerts.",
    category: "policy",
    fileUrl: "/docs/murabbi-sop.pdf",
    allowedRoles: "murabbi,park_lead",
    fileSize: "1.1 MB",
    fileType: "PDF",
    createdAt: "2026-08-02",
  },
  {
    id: "r3",
    title: "Sports Agility & Physical Fitness Manual",
    description: "Drills, warm-up exercises, and safety protocols for sports leads.",
    category: "activity_guide",
    fileUrl: "/docs/sports-manual.pdf",
    allowedRoles: "all",
    fileSize: "3.8 MB",
    fileType: "PDF",
    createdAt: "2026-08-03",
  },
  {
    id: "r4",
    title: "Parent & Guardian WhatsApp Outreach Guidelines",
    description: "Urdu and English message templates for attendance and fee notifications.",
    category: "policy",
    fileUrl: "/docs/parent-outreach.pdf",
    allowedRoles: "murabbi,park_lead,program_admin",
    fileSize: "850 KB",
    fileType: "PDF",
    createdAt: "2026-08-04",
  },
];

const MOCK_ARTICLES: KnowledgeArticleRecord[] = [
  {
    id: "k1",
    title: "How to Conduct Effective Weekly Mashwara",
    slug: "how-to-conduct-weekly-mashwara",
    category: "operational_guide",
    tags: "mashwara,leadership",
    isPublished: true,
    viewCount: 142,
    content: "Step 1: Review Murabbi attendance log.\nStep 2: Log decisions categorized by collaboration teams.\nStep 3: Assign action items with clear due dates.",
    createdAt: "2026-08-01",
  },
  {
    id: "k2",
    title: "Handling Student Absence & WhatsApp Outreach",
    slug: "handling-student-absence-outreach",
    category: "best_practices",
    tags: "attendance,parents",
    isPublished: true,
    viewCount: 98,
    content: "When a student is marked absent for 2 consecutive sessions, trigger the automated Urdu WhatsApp template to notify the guardian immediately.",
    createdAt: "2026-08-02",
  },
];

export function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"resources" | "articles">("resources");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticleRecord | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("curriculum");
  const [formRoles, setFormRoles] = useState("all");
  const [formFileUrl, setFormFileUrl] = useState("");

  const { data: apiResources, isLoading } = useQuery({
    queryKey: ["admin-digital-resources"],
    queryFn: () => fetch("/api/resources").then((r) => r.json()),
  });

  const resources = MOCK_RESOURCES;

  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [resources, search, categoryFilter]);

  const totalPages = Math.ceil(filteredResources.length / pageSize) || 1;
  const paginatedResources = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredResources.slice(start, start + pageSize);
  }, [filteredResources, page]);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      <PageHeader
        title="Digital Library & Operational Knowledge Base"
        description="Access curriculum guides, Tarbiyah policies, sports manuals, operational SOPs, and training articles."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setResourceModalOpen(true)}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold rounded-xl h-11 px-5 shadow-md gap-2"
            >
              <Plus className="size-5" />
              Upload Digital Resource
            </Button>
          </div>
        }
      />

      {/* ─── 4 Top KPI Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-300 shrink-0">
              <FileText className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Digital Resources</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{resources.length} files</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-300 shrink-0">
              <BookOpen className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SOP Articles & FAQs</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{MOCK_ARTICLES.length} articles</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-300 shrink-0">
              <Download className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Downloads</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">340 downloads</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-300 shrink-0">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Top Category</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Curriculum</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Tabs Switcher ────────────────────────────────────────── */}
      <Tabs defaultValue="resources" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
            <TabsTrigger value="resources" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <FileText className="size-4 mr-2" /> Digital Resource Library
            </TabsTrigger>
            <TabsTrigger value="articles" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <BookOpen className="size-4 mr-2" /> SOP Articles & Guides
            </TabsTrigger>
          </TabsList>

          {activeTab === "resources" && (
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search files or guides..."
                  className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium"
                />
              </div>

              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  setCategoryFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="curriculum">Curriculum</SelectItem>
                  <SelectItem value="activity_guide">Activity Guides</SelectItem>
                  <SelectItem value="policy">Policies & SOPs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ─── Tab 1: Digital Resources Roster ────────────────────────────── */}
        <TabsContent value="resources" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Resource Title & Description</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Allowed Roles</th>
                    <th className="p-4">Format & Size</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedResources.map((item) => (
                    <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                        <div>{item.title}</div>
                        <span className="text-xs text-muted-foreground font-medium">{item.description}</span>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                          {item.category.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="capitalize text-[10px] font-bold">
                          {item.allowedRoles}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {item.fileType} • {item.fileSize}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => toast.success(`Downloading ${item.title}...`)}
                          className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-1.5"
                        >
                          <Download className="size-3.5" /> Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Page {page} of {totalPages} ({filteredResources.length} total files)
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

        {/* ─── Tab 2: SOP Articles & Guides ──────────────────────────────── */}
        <TabsContent value="articles" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_ARTICLES.map((art) => (
              <Card key={art.id} className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge className="bg-purple-100 text-purple-700 font-bold text-[10px] uppercase">
                      {art.category.replace(/_/g, " ")}
                    </Badge>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                      {art.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                    <Eye className="size-3.5" /> {art.viewCount}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-medium line-clamp-2">{art.content}</p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[11px] font-mono text-muted-foreground">Tags: {art.tags}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedArticle(art)}
                    className="text-xs font-bold text-purple-600 hover:bg-purple-50 h-8"
                  >
                    Read Guide
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Upload Resource Modal ──────────────────────────────────────── */}
      <Dialog open={resourceModalOpen} onOpenChange={setResourceModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-2xl shadow-2xl">
          <div className="p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                <FileText className="size-5 text-purple-600" /> Upload Digital Resource
              </DialogTitle>
              <DialogDescription className="text-xs font-medium">
                Upload curriculum PDFs, Tarbiyah policies, or sports manuals for staff access.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("Digital resource uploaded successfully!");
                setResourceModalOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Resource Title</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Lahore Batch 4 Tarbiyah Manual"
                  className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curriculum">Curriculum</SelectItem>
                      <SelectItem value="activity_guide">Activity Guide</SelectItem>
                      <SelectItem value="policy">Policy / SOP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Allowed Roles</Label>
                  <Select value={formRoles} onValueChange={setFormRoles}>
                    <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold">
                      <SelectValue placeholder="Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="murabbi,park_lead">Murabbi & Park Leads</SelectItem>
                      <SelectItem value="super_admin">Super Admins Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setResourceModalOpen(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-6">
                  Upload Resource
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Article Reader Drawer Modal ────────────────────────────────── */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">{selectedArticle?.title}</DialogTitle>
          </DialogHeader>

          {selectedArticle && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {selectedArticle.content}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedArticle(null)} className="w-full rounded-xl font-bold">
              Close Guide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
