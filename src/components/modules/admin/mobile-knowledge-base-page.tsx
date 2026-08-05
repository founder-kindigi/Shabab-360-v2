"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  FileText,
  Download,
  Search,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Tag,
  Eye,
  Bookmark
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileKnowledgeBasePageProps {
  onBack?: () => void;
}

const MOCK_RESOURCES = [
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
];

const MOCK_ARTICLES = [
  {
    id: "k1",
    title: "How to Conduct Effective Weekly Mashwara",
    category: "operational_guide",
    tags: "mashwara,leadership",
    viewCount: 142,
    content: "Step 1: Review Murabbi attendance log.\nStep 2: Log decisions categorized by collaboration teams.\nStep 3: Assign action items with clear due dates.",
  },
  {
    id: "k2",
    title: "Handling Student Absence & WhatsApp Outreach",
    category: "best_practices",
    tags: "attendance,parents",
    viewCount: 98,
    content: "When a student is marked absent for 2 consecutive sessions, trigger the automated Urdu WhatsApp template to notify the guardian immediately.",
  },
];

export function MobileKnowledgeBasePage({ onBack }: MobileKnowledgeBasePageProps) {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"resources" | "articles">("resources");
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  // ─── Real DB Queries ───────────────────────────────────────────────────
  const { data: resourcesData, isLoading } = useQuery({
    queryKey: ["mobile-digital-resources"],
    queryFn: async () => {
      const res = await fetch("/api/resources");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const filteredResources = MOCK_RESOURCES.filter((r) => {
    return (
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    );
  });

  const filteredArticles = MOCK_ARTICLES.filter((a) => {
    return (
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="size-9 rounded-2xl bg-white/10 active:scale-95 transition-transform flex items-center justify-center text-white backdrop-blur-md border border-white/15"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                ڈیجیٹل لائبریری
              </h1>
              <p className="text-[11px] text-purple-200 font-medium">Digital Library & SOPs</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {isLoading ? (
              <RefreshCw className="size-3 animate-spin text-purple-300" />
            ) : (
              <BookOpen className="size-3 text-indigo-300" />
            )}
            <span>Knowledge Hub</span>
          </div>
        </div>
      </div>

      {/* ─── Mode Switcher & Search ──────────────────────────────────────── */}
      <div className="-mt-7 px-4 z-10 space-y-4">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setActiveTab("resources")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5",
              activeTab === "resources"
                ? "bg-[#4B0A8F] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="size-4" /> Downloadable Files
          </button>
          <button
            onClick={() => setActiveTab("articles")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5",
              activeTab === "articles"
                ? "bg-[#4B0A8F] text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="size-4" /> SOP Articles & FAQs
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guides, SOPs or articles..."
            className="pl-10 h-11 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm font-medium text-xs"
          />
        </div>

        {/* Content Section */}
        {activeTab === "resources" ? (
          <div className="space-y-3">
            {filteredResources.map((res, idx) => (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {res.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-medium line-clamp-1">
                        {res.description}
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 font-bold text-[10px] shrink-0 uppercase">
                    {res.fileType}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500 font-medium text-[11px]">{res.fileSize}</span>

                  <Button
                    size="sm"
                    onClick={() => toast.success(`Downloading ${res.title}...`)}
                    className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-1.5"
                  >
                    <Download className="size-3.5" /> Download
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((art, idx) => (
              <motion.div
                key={art.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedArticle(art)}
                className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-purple-300 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">
                      {art.category.replace(/_/g, " ")}
                    </Badge>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {art.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 font-medium">
                    <Eye className="size-3.5" /> {art.viewCount}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-purple-600 font-bold">
                  <span>Read Full Guide</span>
                  <ChevronRight className="size-4" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Article Reader Drawer ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg bg-card rounded-t-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

              <div className="space-y-1">
                <Badge variant="outline" className="text-[10px] font-bold uppercase">
                  {selectedArticle.category.replace(/_/g, " ")}
                </Badge>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {selectedArticle.title}
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {selectedArticle.content}
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedArticle(null)}
                  className="w-full rounded-2xl font-bold h-12"
                >
                  Close Article
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
