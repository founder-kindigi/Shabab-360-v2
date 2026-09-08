"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Sparkles,
  HelpCircle,
  Megaphone,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  Users,
  Award,
  Pin,
  Search,
  ArrowLeft,
  User,
  Flame,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PostCategory = "all" | "karguzari" | "inspiration" | "question" | "announcement";

export interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  category: "karguzari" | "inspiration" | "question" | "announcement";
  authorName: string;
  authorRole: string;
  parkName: string;
  isPinned: boolean;
  likeCount: number;
  isLiked?: boolean;
  comments: Comment[];
  createdAt: string;
}

// MOCK_POSTS removed

interface MobileCommunityPageProps {
  onBack?: () => void;
}

export function MobileCommunityPage({ onBack }: MobileCommunityPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ success: boolean; data: CommunityPost[] }>({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const res = await fetch("/api/community/posts");
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  // Local state for optimistic like counts
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  
  // Sync API data to local state when it loads (for local like toggling)
  useEffect(() => {
    if (data?.data) {
      setPosts(data.data);
    }
  }, [data?.data]);

  const [categoryFilter, setCategoryFilter] = useState<PostCategory>("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<CommunityPost | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  // Create Post Form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<CommunityPost["category"]>("karguzari");
  const [newContent, setNewContent] = useState("");

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.content.toLowerCase().includes(search.toLowerCase()) ||
        p.authorName.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [posts, search, categoryFilter]);

  const handleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const isLiked = !p.isLiked;
        return {
          ...p,
          isLiked,
          likeCount: isLiked ? p.likeCount + 1 : p.likeCount - 1,
        };
      })
    );
  };

  const createPost = useMutation({
    mutationFn: async (newEntry: { title: string; content: string; category: string; tags: string[] }) => {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });
      if (!res.ok) throw new Error("Failed to create post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      toast.success("Community post shared successfully!");
      setIsCreateOpen(false);
      setNewTitle("");
      setNewContent("");
    },
    onError: () => {
      toast.error("Failed to share post");
    },
  });

  const handleCreatePost = () => {
    if (!newTitle || !newContent) {
      toast.error("Please fill in both title and content");
      return;
    }
    createPost.mutate({
      title: newTitle,
      content: newContent,
      category: newCategory,
      tags: [],
    });
  };

  const handleAddComment = () => {
    if (!activeCommentPost || !newCommentText.trim()) return;
    const comment: Comment = {
      id: `c-${Date.now()}`,
      authorName: (session?.user as any)?.name || "Active Murabbi",
      authorRole: "Mentor",
      content: newCommentText.trim(),
      createdAt: "Just now",
    };
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== activeCommentPost.id) return p;
        return {
          ...p,
          comments: [...p.comments, comment],
        };
      })
    );
    setActiveCommentPost((prev) => (prev ? { ...prev, comments: [...prev.comments, comment] } : null));
    setNewCommentText("");
    toast.success("Comment added!");
  };

  const categoryBadges: Record<string, { label: string; color: string; icon: any }> = {
    karguzari: { label: "کارگزاری (Field Report)", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: Sparkles },
    inspiration: { label: "روحانی ترغیب (Inspiration)", color: "bg-amber-100 text-amber-800 border-amber-300", icon: Flame },
    question: { label: "سوال و مشورہ (Q&A)", color: "bg-blue-100 text-blue-800 border-blue-300", icon: HelpCircle },
    announcement: { label: "مرکزی اعلان (Announcement)", color: "bg-purple-100 text-purple-800 border-purple-300", icon: Megaphone },
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
                Community Hub
              </h1>
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                Live Feed
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Field karguzari, Q&A, and murabbi experiences
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="h-8 gap-1 text-xs font-bold bg-[#4B0A8F] hover:bg-[#3b0873] text-white rounded-xl shadow"
        >
          <Plus className="size-3.5" />
          <span>Post</span>
        </Button>
      </div>

      {/* ─── Filter Pills & Search ─── */}
      <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Posts" },
            { id: "karguzari", label: "Karguzari" },
            { id: "inspiration", label: "Inspiration" },
            { id: "question", label: "Q&A" },
            { id: "announcement", label: "Notices" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id as any)}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all",
                categoryFilter === cat.id
                  ? "bg-[#4B0A8F] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search karguzari, questions, authors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="text-center p-4 text-sm text-destructive">Failed to load community posts</div>
      ) : (
        <>
          {/* ─── Posts Feed ─── */}
      <div className="space-y-3">
        {filteredPosts.map((post) => {
          const badge = categoryBadges[post.category];
          const Icon = badge.icon;

          return (
            <Card
              key={post.id}
              className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
            >
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-[#4B0A8F] font-bold text-xs">
                      {post.authorName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
                        {post.authorName}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          • {post.authorRole}
                        </span>
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {post.parkName} • {post.createdAt}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "text-[9px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1",
                      badge.color
                    )}
                  >
                    <Icon className="size-2.5" />
                    {badge.label.split(" ")[0]}
                  </span>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-sm font-black text-foreground">{post.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {post.content}
                  </p>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={cn(
                        "flex items-center gap-1 font-bold text-xs transition-colors",
                        post.isLiked ? "text-red-600" : "text-slate-500 hover:text-red-500"
                      )}
                    >
                      <Heart className={cn("size-4", post.isLiked && "fill-red-600 text-red-600")} />
                      <span>{post.likeCount}</span>
                    </button>

                    <button
                      onClick={() => setActiveCommentPost(post)}
                      className="flex items-center gap-1 text-slate-500 hover:text-foreground font-bold text-xs"
                    >
                      <MessageCircle className="size-4" />
                      <span>{post.comments.length}</span>
                    </button>
                  </div>

                  <span className="text-[10px] font-medium text-muted-foreground">
                    Shabab 360 Community
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
        </>
      )}

      {/* ─── Create Post Dialog ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-[#4B0A8F]" />
              Share with Community
            </DialogTitle>
            <DialogDescription className="text-xs">
              Post an inspiring field karguzari, spiritual reflection, or ask murabbis for advice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Category</Label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full h-8 text-xs border rounded-lg px-2 bg-background"
              >
                <option value="karguzari">کارگزاری (Field Karguzari)</option>
                <option value="inspiration">روحانی ترغیب (Spiritual Inspiration)</option>
                <option value="question">سوال و مشورہ (Question / Advice)</option>
                <option value="announcement">اعلان (Announcement)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Title</Label>
              <Input
                placeholder="e.g. 100% Fajr Jama'at Karguzari..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Content</Label>
              <Textarea
                placeholder="Share full details of the session, student engagement, or spiritual progress..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="text-xs min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreatePost} className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold">
              Publish Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Comments Dialog / Drawer ─── */}
      <Dialog open={!!activeCommentPost} onOpenChange={() => setActiveCommentPost(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageCircle className="size-5 text-[#4B0A8F]" />
              Discussion: {activeCommentPost?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Murabbi remarks and constructive advice.
            </DialogDescription>
          </DialogHeader>

          {activeCommentPost && (
            <div className="space-y-3 py-2 text-xs max-h-[320px] overflow-y-auto">
              {activeCommentPost.comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No comments yet. Be the first to share your thoughts!
                </p>
              ) : (
                activeCommentPost.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1 border border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">
                        {c.authorName}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({c.authorRole})
                        </span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">{c.createdAt}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.content}</p>
                  </div>
                ))
              )}

              <div className="pt-2 flex items-center gap-2">
                <Input
                  placeholder="Write a supportive comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="text-xs h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddComment();
                  }}
                />
                <Button size="sm" onClick={handleAddComment} className="h-8 bg-[#4B0A8F] text-white">
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveCommentPost(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
