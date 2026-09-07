"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  FileText,
  Search,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileKnowledgeBasePageProps {
  onBack?: () => void;
}

const CATEGORIES = [
  { id: "all", label: "All Topics" },
  { id: "best_practices", label: "Best Practices" },
  { id: "operational_guide", label: "Operational Guides" },
  { id: "faq", label: "FAQs" },
  { id: "training", label: "Training" },
];

export function MobileKnowledgeBasePage({ onBack }: MobileKnowledgeBasePageProps) {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  // ─── Real DB Queries ───────────────────────────────────────────────────
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ["mobile-knowledge", activeCategory],
    queryFn: async () => {
      const url = activeCategory === "all" ? "/api/knowledge" : `/api/knowledge?category=${activeCategory}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const apiArticles: any[] = Array.isArray(articlesData) ? articlesData : [];

  const filteredArticles = apiArticles.filter((a) => {
    return (
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[460px] mx-auto bg-slate-50 dark:bg-slate-950 text-foreground pb-28 select-none">
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

      {/* ─── Category Filter Pills & Search ──────────────────────────────────────── */}
      <div className="-mt-7 px-4 z-10 space-y-4">
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

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border",
                activeCategory === cat.id
                  ? "bg-[#4B0A8F] text-white border-[#4B0A8F] shadow-sm"
                  : "bg-white dark:bg-slate-900 text-muted-foreground border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="space-y-3">
          {filteredArticles.length === 0 && !isLoading && (
            <div className="text-center py-12 px-4 border border-dashed rounded-3xl bg-card border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <BookOpen className="size-8 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No articles found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try another category or term</p>
            </div>
          )}

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
                    {art.category?.replace(/_/g, " ") || "Article"}
                  </Badge>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {art.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 font-medium">
                  <Eye className="size-3.5" /> {art.viewCount || 0}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-purple-600 font-bold">
                <span>Read Full Guide</span>
                <ChevronRight className="size-4" />
              </div>
            </motion.div>
          ))}
        </div>
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
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase border-purple-200 text-purple-700 bg-purple-50">
                    {selectedArticle.category?.replace(/_/g, " ") || "Article"}
                  </Badge>
                  {(() => {
                    let tags: string[] = [];
                    if (Array.isArray(selectedArticle.tags)) {
                      tags = selectedArticle.tags;
                    } else if (typeof selectedArticle.tags === "string") {
                      try {
                        const parsed = JSON.parse(selectedArticle.tags);
                        tags = Array.isArray(parsed) ? parsed : [selectedArticle.tags];
                      } catch {
                        tags = selectedArticle.tags.split(",").map((t: string) => t.trim());
                      }
                    }
                    return tags.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">
                        {t}
                      </Badge>
                    ));
                  })()}
                </div>
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
