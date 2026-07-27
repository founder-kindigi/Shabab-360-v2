"use client";

import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { formatPKT } from "@/lib/timezone";
import {
  Plus,
  Megaphone,
  Trash2,
  CalendarIcon,
  AlertTriangle,
  Clock,
  X,
  Search,
} from "lucide-react";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

// --- Types ---

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: string;
  targetRoles: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
}

// --- Constants ---

const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "program_admin", label: "Program Admin" },
  { value: "city_head", label: "City Head" },
  { value: "park_admin", label: "Park Admin" },
  { value: "park_lead", label: "Park Lead" },
  { value: "murabbi", label: "Murabbi" },
  { value: "guardian", label: "Guardian" },
  { value: "student", label: "Student" },
];

const PRIORITY_CONFIG: Record<
  string,
  { label: string; className: string; iconBg: string }
> = {
  urgent: {
    label: "Urgent",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    iconBg: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
  },
  normal: {
    label: "Normal",
    className:
      "bg-[#F3ECF6] text-[#4B0A8F] border-[#D4B8E3] dark:bg-[#1F0860] dark:text-[#8A40B0] dark:border-[#2A0C8F]",
    iconBg: "bg-[#F3ECF6] text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]",
  },
  low: {
    label: "Low",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

const CAN_CREATE_ROLES = ["super_admin", "program_admin", "city_head"];

// --- Animation variants ---

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// --- Helpers ---

function parseTargetRoles(jsonStr: string): string[] {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

function formatRoleLabel(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "…";
}

// --- Component ---

export function MobileAnnouncementsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;
  const userRole = user?.role as UserRole | undefined;
  const userId = user?.id;
  const canCreate = userRole ? CAN_CREATE_ROLES.includes(userRole) : false;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPriority, setFormPriority] = useState<"urgent" | "normal" | "low">("normal");
  const [formTargetRoles, setFormTargetRoles] = useState<UserRole[]>([]);
  const [formExpiresAt, setFormExpiresAt] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: announcements, isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ["announcements", userRole],
    queryFn: () => {
      const params = new URLSearchParams();
      if (userRole) params.set("role", userRole);
      const qs = params.toString();
      return fetch(`/api/announcements${qs ? `?${qs}` : ""}`).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch announcements");
        return r.json();
      });
    },
    staleTime: 15000,
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      content: string;
      priority: string;
      targetRoles: UserRole[];
      expiresAt: string | null;
    }) =>
      fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement published successfully");
      closeCreateDialog();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") {
          setFormErrors(err.error);
        } else {
          toast.error(err.error);
        }
      } else {
        toast.error("Failed to publish announcement");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted");
      setDeleteOpen(false);
      setSelectedAnnouncement(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to delete announcement");
    },
  });

  function resetForm() {
    setFormTitle("");
    setFormContent("");
    setFormPriority("normal");
    setFormTargetRoles([]);
    setFormExpiresAt(undefined);
    setFormErrors({});
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    resetForm();
  }

  function toggleTargetRole(role: UserRole) {
    setFormTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.targetRoles;
      return next;
    });
  }

  function handleCreate() {
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) errors.title = "Title is required";
    if (!formContent.trim()) errors.content = "Content is required";
    if (formTargetRoles.length === 0)
      errors.targetRoles = "Select at least one target role";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    createMutation.mutate({
      title: formTitle.trim(),
      content: formContent.trim(),
      priority: formPriority,
      targetRoles: formTargetRoles,
      expiresAt: formExpiresAt ? formExpiresAt.toISOString() : null,
    });
  }

  function handleDelete(announcement: AnnouncementItem) {
    setSelectedAnnouncement(announcement);
    setDeleteOpen(true);
  }

  function confirmDelete() {
    if (selectedAnnouncement) {
      deleteMutation.mutate(selectedAnnouncement.id);
    }
  }

  const filteredAnnouncements = announcements?.filter((a) =>
    !debouncedSearch || a.title.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  function PriorityIndicator({ priority }: { priority: string }) {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
    if (priority === "urgent") {
      return (
        <div className={`flex items-center justify-center size-10 rounded-full ${config.iconBg}`}>
          <AlertTriangle className="size-5" />
        </div>
      );
    }
    if (priority === "low") {
      return (
        <div className={`flex items-center justify-center size-10 rounded-full ${config.iconBg}`}>
          <Clock className="size-5" />
        </div>
      );
    }
    return (
      <div className={`flex items-center justify-center size-10 rounded-full ${config.iconBg}`}>
        <Megaphone className="size-5" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Announcements</h1>
            <p className="text-sm text-muted-foreground">Updates and notices</p>
          </div>
          {canCreate && (
            <Button
              size="icon"
              className="size-11 rounded-full bg-gradient-to-r from-[#2A0C8F] to-[#A0006B] text-white shadow-md active:scale-95 transition-transform"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-5" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 h-11 bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center justify-center size-8 rounded-full"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4">
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="size-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredAnnouncements?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Megaphone className="size-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-1">No Announcements</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "No matching announcements found." : "There are no active announcements."}
            </p>
          </div>
        )}

        {!isLoading && filteredAnnouncements && filteredAnnouncements.length > 0 && (
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {filteredAnnouncements.map((announcement) => {
                const priorityConfig = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.normal;
                const targetRoles = parseTargetRoles(announcement.targetRoles);
                const canDelete = announcement.authorId === userId || userRole === "super_admin";

                return (
                  <motion.div
                    key={announcement.id}
                    variants={itemVariants}
                    layout
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  >
                    <Card
                      className={cn(
                        "rounded-2xl border-border/50 overflow-hidden",
                        announcement.isExpired && "opacity-60",
                        announcement.priority === "urgent" && "border-red-200 dark:border-red-900/50"
                      )}
                    >
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start gap-4">
                          <PriorityIndicator priority={announcement.priority} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px]", priorityConfig.className)}>
                                {priorityConfig.label}
                              </Badge>
                              {announcement.isExpired && (
                                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">
                                  Expired
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {formatPKT(new Date(announcement.createdAt))}
                              </span>
                            </div>
                            <h3 className="font-semibold text-foreground text-base leading-tight">
                              {announcement.title}
                            </h3>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {announcement.content}
                        </p>

                        <div className="flex flex-col gap-2 pt-2 border-t text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{announcement.authorName}</span>
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(announcement)}
                                className="flex items-center justify-center size-8 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-foreground/80">To: </span>
                            {targetRoles.map(formatRoleLabel).join(", ")}
                          </div>
                          {announcement.expiresAt && (
                            <div className={announcement.isExpired ? "text-red-500" : ""}>
                              Expires: {formatPKT(new Date(announcement.expiresAt))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <div className="h-6" />

      {/* Create Dialog via Sheet for Mobile */}
      <Sheet open={createOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0 flex flex-col">
          <SheetHeader className="p-4 border-b text-left sticky top-0 bg-background z-10">
            <SheetTitle>New Announcement</SheetTitle>
            <SheetDescription>Publish to specific roles.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                placeholder="Title"
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  setFormErrors((prev) => { const next = { ...prev }; delete next.title; return next; });
                }}
                className={cn("h-11", formErrors.title && "border-red-500")}
              />
              {formErrors.title && <p className="text-xs text-red-500">{formErrors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ann-content">Content</Label>
              <Textarea
                id="ann-content"
                placeholder="Content..."
                value={formContent}
                onChange={(e) => {
                  setFormContent(e.target.value);
                  setFormErrors((prev) => { const next = { ...prev }; delete next.content; return next; });
                }}
                rows={5}
                className={cn("resize-none", formErrors.content && "border-red-500")}
              />
              {formErrors.content && <p className="text-xs text-red-500">{formErrors.content}</p>}
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formPriority} onValueChange={(v) => setFormPriority(v as "urgent" | "normal" | "low")}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent"><span className="text-red-500 font-medium">Urgent</span></SelectItem>
                  <SelectItem value="normal"><span className="text-[#4B0A8F] font-medium">Normal</span></SelectItem>
                  <SelectItem value="low"><span>Low</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Target Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_ROLES.map((role) => {
                  const checked = formTargetRoles.includes(role.value);
                  return (
                    <label
                      key={role.value}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-3 text-sm transition-colors",
                        checked ? "bg-[#F3ECF6] border-[#D4B8E3] text-[#4B0A8F]" : "border-border"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleTargetRole(role.value)}
                      />
                      <span className="font-medium">{role.label}</span>
                    </label>
                  );
                })}
              </div>
              {formErrors.targetRoles && <p className="text-xs text-red-500">{formErrors.targetRoles}</p>}
            </div>

            <div className="space-y-2 pb-6">
              <Label>Expiry Date (optional)</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-11 justify-start font-normal">
                    <CalendarIcon className="size-4 mr-2" />
                    {formExpiresAt ? formatPKT(formExpiresAt) : "No expiry"}
                    {formExpiresAt && (
                      <div
                        className="ml-auto p-1"
                        onClick={(e) => { e.stopPropagation(); setFormExpiresAt(undefined); }}
                      >
                        <X className="size-4" />
                      </div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formExpiresAt}
                    onSelect={(date) => { setFormExpiresAt(date || undefined); setCalendarOpen(false); }}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <SheetFooter className="p-4 border-t sticky bottom-0 bg-background z-10">
            <Button
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#2A0C8F] to-[#A0006B] text-white"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Publishing..." : "Publish"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="w-[90vw] max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedAnnouncement?.title}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 mt-4 sm:flex-col">
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-11 rounded-xl mt-0" disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
