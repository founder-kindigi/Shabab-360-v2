"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  TrendingUp,
  BarChart2,
  Check,
  Search,
  Filter,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
export type PostCategory = "all" | "karguzari" | "inspiration" | "question" | "announcement";

export interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  authorName: string;
  authorRole: string;
  authorPhone?: string;
  category: "karguzari" | "inspiration" | "question" | "announcement";
  audience?: "everyone" | "city" | "park" | "group" | "staff";
  content: string;
  likes: number;
  isLiked?: boolean;
  commentsCount: number;
  comments: Comment[];
  isPinned?: boolean;
  tags: string[];
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  isCorrect?: boolean;
}

export interface PollQuiz {
  id: string;
  title: string;
  description?: string;
  type: "quiz" | "survey";
  authorName: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string;
  expiresIn: string;
  category: string;
}

// --- Initial Mock Data based on real Shabab Batch 4 dataset ---
const INITIAL_POSTS: Post[] = [
  {
    id: "post-1",
    authorName: "Hanzala Tauseef",
    authorRole: "Murabbi & Tadreeb Lead",
    category: "announcement",
    content: "Assalamu Alaikum Shabab team! Super excited for this Saturday's sports gala at Gulberg Park. Please ensure all Group 1 & 2 participants arrive by 7:45 AM sharply.",
    likes: 34,
    isLiked: true,
    commentsCount: 5,
    isPinned: true,
    tags: ["#SportsGala", "#GulbergPark", "#Shabab360"],
    createdAt: "2 hours ago",
    comments: [
      { id: "c-1", authorName: "Ikram Meer", authorRole: "Murabbi & Skills Lead", content: "InshaAllah! Group 1 is ready with equipment.", createdAt: "1 hour ago" },
      { id: "c-2", authorName: "Hasnain Zafar", authorRole: "Murabbi & Tadreeb Muawin", content: "Water and sports kits arranged for Group 3.", createdAt: "45 mins ago" },
    ],
  },
  {
    id: "post-2",
    authorName: "M Abdullah Qureshi",
    authorRole: "Student (Group 1)",
    category: "karguzari",
    content: "Alhamdulillah finished reading the weekly Tadreeb chapter on Ethics in Leadership today. Loved the key takeaway: 'True leadership is serving your team first'.",
    likes: 28,
    isLiked: false,
    commentsCount: 3,
    tags: ["#Tadreeb", "#YouthLeadership", "#Gulberg"],
    createdAt: "4 hours ago",
    comments: [
      { id: "c-3", authorName: "Hasnain Zafar", authorRole: "Murabbi", content: "MashaAllah Abdullah! Keep inspiring your group.", createdAt: "3 hours ago" },
    ],
  },
  {
    id: "post-3",
    authorName: "Imran Amin",
    authorRole: "Sports Lead G12",
    category: "inspiration",
    content: "Cricket bowling drills session was fantastic today at Griffin Park! Discipline and team coordination are improving every single week. MashaAllah to all players!",
    likes: 19,
    isLiked: false,
    commentsCount: 2,
    tags: ["#CricketDrills", "#GriffinPark"],
    createdAt: "Yesterday",
    comments: [],
  },
  {
    id: "post-4",
    authorName: "Muhammad Huzaifa Saif",
    authorRole: "Student (Grade 9th)",
    category: "question",
    content: "Does anyone have the Google Drive link for the Public Speaking Essential Skills slides from Week 3? Want to prepare for Saturday's competition.",
    likes: 12,
    isLiked: false,
    commentsCount: 4,
    tags: ["#PublicSpeaking", "#SkillsModule"],
    createdAt: "Yesterday",
    comments: [
      { id: "c-4", authorName: "Ikram Meer", authorRole: "Skills Lead", content: "Check the Content Planner tab or link badge in your student portal!", createdAt: "Yesterday" },
    ],
  },
];

const INITIAL_POLLS: PollQuiz[] = [
  {
    id: "poll-1",
    title: "Weekly Tarbiyah Quiz: What is the primary focus of Shabab Leadership Ethics?",
    description: "Select the most accurate principle discussed in Week 3 Tadreeb session.",
    type: "quiz",
    authorName: "Hanzala Tauseef (Tadreeb Lead)",
    category: "Tarbiyah Quiz",
    expiresIn: "Ends in 2 days",
    totalVotes: 142,
    options: [
      { id: "opt-1", text: "Personal dominance and control", votes: 8, isCorrect: false },
      { id: "opt-2", text: "Servant leadership and humility", votes: 118, isCorrect: true },
      { id: "opt-3", text: "Individual competition above team", votes: 10, isCorrect: false },
      { id: "opt-4", text: "Task execution without consultation", votes: 6, isCorrect: false },
    ],
  },
  {
    id: "poll-2",
    title: "Poll: Which Sports Activity do you want for next month's Inter-Park Tournament?",
    description: "Cast your vote to help the Sports Collaboration Team plan the upcoming fixtures.",
    type: "survey",
    authorName: "Imran Amin (Sports Lead)",
    category: "Sports Poll",
    expiresIn: "Ends in 4 days",
    totalVotes: 215,
    options: [
      { id: "opt-201", text: "Football Tournament (Gulberg / Griffin)", votes: 98 },
      { id: "opt-202", text: "Tape Ball Cricket Championship", votes: 84 },
      { id: "opt-203", text: "Table Tennis & Badminton Singles", votes: 21 },
      { id: "opt-204", text: "Athletics & Tug of War", votes: 12 },
    ],
  },
];

export function CommunityPage() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string; role?: string } | undefined;

  // --- States ---
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [polls, setPolls] = useState<PollQuiz[]>(INITIAL_POLLS);
  const [activeCategory, setActiveCategory] = useState<PostCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal controls
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isNewPollOpen, setIsNewPollOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  // New post form
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState<"karguzari" | "inspiration" | "question" | "announcement">("karguzari");
  const [newPostAudience, setNewPostAudience] = useState<"everyone" | "city" | "park" | "group" | "staff">("everyone");
  const [newPostTags, setNewPostTags] = useState("");

  // New poll form
  const [newPollTitle, setNewPollTitle] = useState("");
  const [newPollCategory, setNewPollCategory] = useState("Weekly Quiz");
  const [newPollType, setNewPollType] = useState<"quiz" | "survey">("quiz");
  const [newPollOpt1, setNewPollOpt1] = useState("");
  const [newPollOpt2, setNewPollOpt2] = useState("");
  const [newPollOpt3, setNewPollOpt3] = useState("");
  const [newPollOpt4, setNewPollOpt4] = useState("");
  const [correctOptionIdx, setCorrectOptionIdx] = useState<number>(1);

  // New comment text
  const [commentText, setCommentText] = useState("");

  // --- Filtered Posts ---
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesCategory = activeCategory === "all" || p.category === activeCategory;
      const matchesSearch =
        searchQuery === "" ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [posts, activeCategory, searchQuery]);

  // --- Handlers ---
  const handleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked;
          return {
            ...post,
            isLiked,
            likes: isLiked ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      })
    );
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) {
      toast.error("Please enter your post content");
      return;
    }

    const formattedTags = newPostTags
      .split(",")
      .map((t) => (t.trim().startsWith("#") ? t.trim() : `#${t.trim()}`))
      .filter((t) => t !== "#");

    const newPostItem: Post = {
      id: `post-${Date.now()}`,
      authorName: user?.name || "Shabab Member",
      authorRole: user?.role?.replace(/_/g, " ") || "Member",
      category: newPostCategory,
      audience: newPostAudience,
      content: newPostContent.trim(),
      likes: 0,
      isLiked: false,
      commentsCount: 0,
      comments: [],
      tags: formattedTags.length > 0 ? formattedTags : ["#Shabab360"],
      createdAt: "Just now",
    };

    setPosts([newPostItem, ...posts]);
    setNewPostContent("");
    setNewPostTags("");
    setIsNewPostOpen(false);
    toast.success("Status post published successfully!");
  };

  const handleAddComment = (postId: string) => {
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      authorName: user?.name || "Shabab Member",
      authorRole: user?.role?.replace(/_/g, " ") || "Member",
      content: commentText.trim(),
      createdAt: "Just now",
    };

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            commentsCount: post.commentsCount + 1,
            comments: [...post.comments, newComment],
          };
        }
        return post;
      })
    );

    setCommentText("");
    toast.success("Comment added!");
  };

  const handleVotePoll = (pollId: string, optionId: string) => {
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id === pollId) {
          if (poll.userVotedOptionId) {
            toast.info("You have already voted in this poll!");
            return poll;
          }
          const updatedOptions = poll.options.map((opt) =>
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
          );
          toast.success("Vote recorded successfully!");
          return {
            ...poll,
            options: updatedOptions,
            totalVotes: poll.totalVotes + 1,
            userVotedOptionId: optionId,
          };
        }
        return poll;
      })
    );
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollTitle.trim() || !newPollOpt1.trim() || !newPollOpt2.trim()) {
      toast.error("Question title and at least 2 options are required.");
      return;
    }

    const optionsList: PollOption[] = [
      { id: "o-1", text: newPollOpt1.trim(), votes: 0, isCorrect: newPollType === "quiz" && correctOptionIdx === 1 },
      { id: "o-2", text: newPollOpt2.trim(), votes: 0, isCorrect: newPollType === "quiz" && correctOptionIdx === 2 },
    ];
    if (newPollOpt3.trim()) {
      optionsList.push({ id: "o-3", text: newPollOpt3.trim(), votes: 0, isCorrect: newPollType === "quiz" && correctOptionIdx === 3 });
    }
    if (newPollOpt4.trim()) {
      optionsList.push({ id: "o-4", text: newPollOpt4.trim(), votes: 0, isCorrect: newPollType === "quiz" && correctOptionIdx === 4 });
    }

    const newPollItem: PollQuiz = {
      id: `poll-${Date.now()}`,
      title: newPollTitle.trim(),
      type: newPollType,
      authorName: user?.name || "Murabbi Lead",
      category: newPollCategory || "Weekly Quiz",
      expiresIn: "Ends in 7 days",
      totalVotes: 0,
      options: optionsList,
    };

    setPolls([newPollItem, ...polls]);
    setNewPollTitle("");
    setNewPollOpt1("");
    setNewPollOpt2("");
    setNewPollOpt3("");
    setNewPollOpt4("");
    setIsNewPollOpen(false);
    toast.success("Poll quiz published to community!");
  };

  const activeCommentPost = useMemo(() => {
    return posts.find((p) => p.id === activeCommentPostId);
  }, [posts, activeCommentPostId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 space-y-6">
      
      {/* Page Header & Actions */}
      <PageHeader
        title="Community & Interactive Quizzes"
        description="Engage with youth groups, share status updates, take poll-based quizzes, and participate in community discussions."
        actions={
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <Button
              variant="outline"
              className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300"
              onClick={() => setIsNewPollOpen(true)}
            >
              <BarChart2 className="w-4 h-4 mr-2" /> + Create Poll Quiz
            </Button>
            <Button
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white shadow-md"
              onClick={() => setIsNewPostOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> + New Status Post
            </Button>
          </div>
        }
      />

      {/* --- Top 4 KPI Metrics --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-[#4B0A8F] shrink-0">
              <Users className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Community Members</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">1,248</h3>
              <p className="text-[11px] text-emerald-600 font-medium flex items-center mt-0.5">
                <TrendingUp className="size-3 mr-1" /> Active across 6 Parks
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-purple-50/40 to-white dark:from-purple-950/20 dark:to-slate-900 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-700 shrink-0">
              <MessageSquare className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Posts</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{posts.length + 138}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">This Month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-amber-50/40 to-white dark:from-amber-950/20 dark:to-slate-900 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 shrink-0">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Poll Quizzes</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{polls.length}</h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Live for voting</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-slate-900 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 shrink-0">
              <Award className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Participation Rate</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">94%</h3>
              <p className="text-[11px] text-emerald-600 font-medium flex items-center mt-0.5">
                <CheckCircle2 className="size-3 mr-1" /> High engagement
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- Main Tabs Section --- */}
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="feed" className="rounded-lg font-medium text-xs sm:text-sm">
            <MessageSquare className="size-4 mr-2 hidden sm:inline" /> Community Feed
          </TabsTrigger>
          <TabsTrigger value="polls" className="rounded-lg font-medium text-xs sm:text-sm">
            <Sparkles className="size-4 mr-2 hidden sm:inline" /> Poll Quizzes
          </TabsTrigger>
          <TabsTrigger value="announcements" className="rounded-lg font-medium text-xs sm:text-sm">
            <Pin className="size-4 mr-2 hidden sm:inline" /> Pinned Updates
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: COMMUNITY FEED & STATUS POSTS --- */}
        <TabsContent value="feed" className="space-y-4 focus-visible:outline-none">
          
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {(["all", "karguzari", "inspiration", "question", "announcement"] as PostCategory[]).map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "capitalize text-xs font-semibold rounded-lg px-3 h-8 shrink-0 transition-all",
                    activeCategory === cat
                      ? "bg-[#4B0A8F] text-white hover:bg-[#3b0873]"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  )}
                >
                  {cat === "all" ? "All Posts" : cat}
                </Button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search posts or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs rounded-lg border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          {/* Post Feed List */}
          <div className="space-y-4">
            <AnimatePresence>
              {filteredPosts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={cn(
                    "border shadow-sm rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md",
                    post.isPinned ? "border-purple-300 dark:border-purple-800 bg-gradient-to-r from-purple-50/30 to-white dark:from-purple-950/10" : "border-slate-200 dark:border-slate-800"
                  )}>
                    <CardContent className="p-5 space-y-4">
                      
                      {/* Post Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-[#F3ECF6] dark:bg-[#1F0860] flex items-center justify-center text-[#4B0A8F] dark:text-[#8A40B0] font-bold text-sm shrink-0 border border-purple-200">
                            {post.authorName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{post.authorName}</h4>
                              {post.isPinned && (
                                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px] px-1.5 py-0 border-0 flex items-center">
                                  <Pin className="size-3 mr-0.5" /> Pinned
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium">{post.authorRole} • {post.createdAt}</p>
                          </div>
                        </div>

                        {/* Category & Audience Badges */}
                        <div className="flex items-center gap-1.5">
                          {post.audience && (
                            <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">
                              {post.audience === "everyone" && "🌐 Public"}
                              {post.audience === "city" && "🏙️ City Only"}
                              {post.audience === "park" && "🌳 Park Only"}
                              {post.audience === "group" && "👥 Group Only"}
                              {post.audience === "staff" && "🛡️ Staff Only"}
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn(
                            "capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                            post.category === "announcement" && "bg-purple-50 text-purple-700 border-purple-200",
                            post.category === "karguzari" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            post.category === "inspiration" && "bg-amber-50 text-amber-700 border-amber-200",
                            post.category === "question" && "bg-blue-50 text-blue-700 border-blue-200"
                          )}>
                            {post.category}
                          </Badge>
                        </div>
                      </div>

                      {/* Post Content */}
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-line">
                        {post.content}
                      </p>

                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <span key={tag} className="text-xs font-semibold text-[#4B0A8F] dark:text-[#8A40B0] hover:underline cursor-pointer">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Bar (Likes, Comments, Share) */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30",
                              post.isLiked ? "text-rose-600 font-bold" : "text-slate-600 dark:text-slate-400"
                            )}
                          >
                            <Heart className={cn("size-4", post.isLiked && "fill-rose-600 text-rose-600")} />
                            <span>{post.likes} Likes</span>
                          </button>

                          <button
                            onClick={() => setActiveCommentPostId(post.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <MessageCircle className="size-4 text-indigo-500" />
                            <span>{post.commentsCount} Comments</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success("Post link copied to clipboard!");
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <Share2 className="size-3.5 mr-1" /> Share
                        </button>
                      </div>

                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* --- TAB 2: POLL-BASED QUIZZES & SURVEYS --- */}
        <TabsContent value="polls" className="space-y-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {polls.map((poll) => (
              <Card key={poll.id} className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden flex flex-col justify-between">
                <CardHeader className="bg-slate-50/60 dark:bg-slate-900/60 p-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline" className={cn(
                      "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                      poll.type === "quiz" ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-amber-100 text-amber-700 border-amber-200"
                    )}>
                      {poll.type === "quiz" ? "Weekly Quiz" : "Poll Survey"}
                    </Badge>
                    <span className="text-xs text-slate-500 flex items-center font-medium">
                      <Clock className="size-3 mr-1 text-amber-500" /> {poll.expiresIn}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
                    {poll.title}
                  </CardTitle>
                  {poll.description && (
                    <CardDescription className="text-xs mt-1 text-slate-600 dark:text-slate-400">
                      {poll.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {poll.options.map((opt) => {
                      const percentage = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                      const isUserVoted = poll.userVotedOptionId === opt.id;

                      return (
                        <button
                          key={opt.id}
                          disabled={!!poll.userVotedOptionId}
                          onClick={() => handleVotePoll(poll.id, opt.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all relative overflow-hidden group",
                            isUserVoted ? "border-[#4B0A8F] bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-[#4B0A8F]" : "border-slate-200 dark:border-slate-800 hover:border-purple-300"
                          )}
                        >
                          {/* Vote Progress Fill */}
                          {poll.userVotedOptionId && (
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-purple-100/60 dark:bg-purple-900/30 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          )}

                          <div className="relative z-10 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                              {isUserVoted && <Check className="size-3.5 text-[#4B0A8F] mr-1.5 shrink-0" />}
                              {opt.text}
                            </span>
                            {poll.userVotedOptionId && (
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                {percentage}% ({opt.votes})
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-100 dark:border-slate-800">
                    <span>{poll.totalVotes} Total Votes</span>
                    <span>By {poll.authorName}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* --- TAB 3: PINNED UPDATES & ANNOUNCEMENTS --- */}
        <TabsContent value="announcements" className="space-y-4 focus-visible:outline-none">
          <Card className="border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/30 dark:from-purple-950/20 dark:to-slate-900 rounded-xl">
            <CardHeader className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#4B0A8F] text-white text-xs px-2.5 py-0.5 rounded-full flex items-center">
                  <Megaphone className="size-3 mr-1" /> Official Announcement
                </Badge>
                <span className="text-xs text-slate-500 font-medium">Pinned by Program Admin</span>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Lahore Batch 4 Mid-Term Karguzari & Sports Gala Date Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p>
                Respected Murabbis, Leads, and Shabab Participants! The official Mid-Term Karguzari Review and Inter-Park Sports Gala for Lahore Batch 4 will take place on **Saturday, 22nd August 2026**.
              </p>
              <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg border border-purple-100 dark:border-purple-900 text-xs space-y-1.5 font-medium">
                <p>📍 **Venue**: Main Sports Pavilion, Gulberg Park Lahore</p>
                <p>⏰ **Time**: 08:00 AM – 02:00 PM</p>
                <p>🏆 **Events**: Inter-Group Football Final, Public Speaking Showcase, and Tarbiyah Awards.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- MODAL 1: CREATE STATUS POST --- */}
      <Dialog open={isNewPostOpen} onOpenChange={setIsNewPostOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="size-5 text-[#4B0A8F]" /> Create Community Status Post
            </DialogTitle>
            <DialogDescription className="text-xs">
              Share your activity status, karguzari, thoughts, or questions with the community.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePost} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Post Category *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["karguzari", "inspiration", "question", "announcement"] as const).map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={newPostCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewPostCategory(cat)}
                    className={cn(
                      "capitalize text-xs font-semibold justify-start h-9",
                      newPostCategory === cat && "bg-[#4B0A8F] text-white hover:bg-[#3b0873]"
                    )}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Audience *</Label>
              <Select value={newPostAudience} onValueChange={(v) => setNewPostAudience(v as any)}>
                <SelectTrigger className="h-9 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Select Target Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">🌐 Public / Everyone (All Members)</SelectItem>
                  <SelectItem value="city">🏙️ My City Only (Lahore / City Scope)</SelectItem>
                  <SelectItem value="park">🌳 My Park Only (Assigned Park Scope)</SelectItem>
                  <SelectItem value="group">👥 My Group Only (Youth Group Scope)</SelectItem>
                  <SelectItem value="staff">🛡️ Staff & Leadership Only (Murabbis & Admins)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-content" className="text-xs font-semibold">Post Content *</Label>
              <Textarea
                id="post-content"
                placeholder="What is on your mind or what did your group achieve today?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={4}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-tags" className="text-xs font-semibold">Tags (comma separated)</Label>
              <Input
                id="post-tags"
                placeholder="e.g. #Tadreeb, #GulbergPark, #YouthLeadership"
                value={newPostTags}
                onChange={(e) => setNewPostTags(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewPostOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white">
                <Send className="size-3.5 mr-1.5" /> Publish Post
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 2: CREATE POLL QUIZ --- */}
      <Dialog open={isNewPollOpen} onOpenChange={setIsNewPollOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" /> Create Poll Quiz or Survey
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish an interactive poll or quiz to test knowledge or gather feedback from members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePoll} className="space-y-3.5 pt-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={newPollType === "quiz" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewPollType("quiz")}
                className={cn("flex-1 text-xs font-semibold", newPollType === "quiz" && "bg-[#4B0A8F] text-white")}
              >
                Weekly Quiz (with correct answer)
              </Button>
              <Button
                type="button"
                variant={newPollType === "survey" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewPollType("survey")}
                className={cn("flex-1 text-xs font-semibold", newPollType === "survey" && "bg-amber-600 text-white")}
              >
                Poll Survey
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Question / Poll Title *</Label>
              <Input
                placeholder="e.g. Which team responsibility model did we study in Week 3?"
                value={newPollTitle}
                onChange={(e) => setNewPollTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Options *</Label>
              <Input placeholder="Option 1" value={newPollOpt1} onChange={(e) => setNewPollOpt1(e.target.value)} className="text-xs" />
              <Input placeholder="Option 2" value={newPollOpt2} onChange={(e) => setNewPollOpt2(e.target.value)} className="text-xs" />
              <Input placeholder="Option 3 (optional)" value={newPollOpt3} onChange={(e) => setNewPollOpt3(e.target.value)} className="text-xs" />
              <Input placeholder="Option 4 (optional)" value={newPollOpt4} onChange={(e) => setNewPollOpt4(e.target.value)} className="text-xs" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewPollOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white">
                Publish Poll Quiz
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 3: COMMENTS DRAWER --- */}
      <Dialog open={!!activeCommentPostId} onOpenChange={(v) => !v && setActiveCommentPostId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageCircle className="size-4 text-indigo-500" /> Comments ({activeCommentPost?.commentsCount || 0})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-72 overflow-y-auto py-2">
            {activeCommentPost?.comments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No comments yet. Be the first to reply!</p>
            ) : (
              activeCommentPost?.comments.map((c) => (
                <div key={c.id} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{c.authorName}</span>
                    <span className="text-[10px] text-slate-400">{c.createdAt}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{c.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && activeCommentPostId) {
                  handleAddComment(activeCommentPostId);
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => activeCommentPostId && handleAddComment(activeCommentPostId)}
              className="bg-[#4B0A8F] text-white shrink-0"
            >
              Post
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
