"use client";

import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
      staggerChildren: 0.06,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
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

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;
  const userRole = user?.role as UserRole | undefined;
  const userId = user?.id;
  const canCreate = userRole ? CAN_CREATE_ROLES.includes(userRole) : false;

  // Search state
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<AnnouncementItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPriority, setFormPriority] = useState<"urgent" | "normal" | "low">("normal");
  const [formTargetRoles, setFormTargetRoles] = useState<UserRole[]>([]);
  const [formExpiresAt, setFormExpiresAt] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch announcements (filtered by user role)
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

  // Create mutation
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

  // Delete mutation
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

  // Form helpers
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

  // Filter announcements by search
  const filteredAnnouncements = announcements?.filter((a) =>
    !debouncedSearch || a.title.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Priority icon
  function PriorityIndicator({ priority }: { priority: string }) {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
    if (priority === "urgent") {
      return (
        <div className={`flex items-center justify-center size-8 rounded-full ${config.iconBg}`}>
          <AlertTriangle className="size-4" />
        </div>
      );
    }
    if (priority === "low") {
      return (
        <div className={`flex items-center justify-center size-8 rounded-full ${config.iconBg}`}>
          <Clock className="size-4" />
        </div>
      );
    }
    return (
      <div className={`flex items-center justify-center size-8 rounded-full ${config.iconBg}`}>
        <Megaphone className="size-4" />
      </div>
    );
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Page header with create button */}
      <PageHeader
        title="Announcements"
        description="Organization-wide notices and updates"
        actions={
          canCreate ? (
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] text-white hover:opacity-90 shadow-md"
            >
              <Plus className="size-4 mr-2" />
              New Announcement
            </Button>
          ) : undefined
        }
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="size-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!announcements || announcements.length === 0) && (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description={
            canCreate
              ? "Create your first announcement to keep everyone informed."
              : "There are no announcements at this time."
          }
        />
      )}

      {/* Announcements list */}
      {!isLoading && announcements && announcements.length > 0 && (
        <motion.div
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {announcements.map((announcement) => {
              const priorityConfig =
                PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.normal;
              const targetRoles = parseTargetRoles(announcement.targetRoles);
              const canDelete =
                announcement.authorId === userId || userRole === "super_admin";

              return (
                <motion.div
                  key={announcement.id}
                  variants={cardVariants}
                  layout
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                >
                  <Card
                    className={`border-border/50 transition-shadow hover:shadow-md ${
                      announcement.isExpired
                        ? "opacity-60"
                        : announcement.priority === "urgent"
                        ? "border-red-200 dark:border-red-900/50"
                        : ""
                    }`}
                  >
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-start gap-4">
                        {/* Priority indicator */}
                        <div className="shrink-0 pt-0.5">
                          <PriorityIndicator priority={announcement.priority} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Top row: priority badge + date */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={priorityConfig.className}
                            >
                              {priorityConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatPKT(new Date(announcement.createdAt))}
                            </span>
                            {announcement.isExpired && (
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-700 text-[10px]"
                              >
                                Expired
                              </Badge>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-base font-semibold leading-tight">
                            {announcement.title}
                          </h3>

                          {/* Content (truncated) */}
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {truncate(announcement.content, 200)}
                          </p>

                          {/* Footer: author + target roles + expiry */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                            <span className="font-medium text-foreground/80">
                              {announcement.authorName}
                            </span>
                            <Separator orientation="vertical" className="h-3" />
                            <span>
                              Target:{" "}
                              {targetRoles
                                .slice(0, 3)
                                .map(formatRoleLabel)
                                .join(", ")}
                              {targetRoles.length > 3 &&
                                ` +${targetRoles.length - 3} more`}
                            </span>
                            {announcement.expiresAt && (
                              <>
                                <Separator
                                  orientation="vertical"
                                  className="h-3"
                                />
                                <span
                                  className={
                                    announcement.isExpired
                                      ? "text-red-500"
                                      : ""
                                  }
                                >
                                  Expires:{" "}
                                  {formatPKT(
                                    new Date(announcement.expiresAt)
                                  )}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Delete button */}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                            onClick={() => handleDelete(announcement)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete announcement</span>
                          </Button>
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

      {/* ===== CREATE DIALOG ===== */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">New Announcement</DialogTitle>
            <DialogDescription>
              Publish an announcement targeting specific roles in the organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                placeholder="Announcement title"
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  setFormErrors((prev) => {
                    const next = { ...prev };
                    delete next.title;
                    return next;
                  });
                }}
                maxLength={200}
                className={formErrors.title ? "border-red-500" : ""}
              />
              {formErrors.title && (
                <p className="text-xs text-red-500">{formErrors.title}</p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="ann-content">Content</Label>
              <Textarea
                id="ann-content"
                placeholder="Write the announcement content..."
                value={formContent}
                onChange={(e) => {
                  setFormContent(e.target.value);
                  setFormErrors((prev) => {
                    const next = { ...prev };
                    delete next.content;
                    return next;
                  });
                }}
                rows={4}
                maxLength={5000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {formContent.length}/5000
              </p>
              {formErrors.content && (
                <p className="text-xs text-red-500">{formErrors.content}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formPriority}
                onValueChange={(v) =>
                  setFormPriority(v as "urgent" | "normal" | "low")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-red-500" />
                      Urgent
                    </span>
                  </SelectItem>
                  <SelectItem value="normal">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#4B0A8F]" />
                      Normal
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-slate-500" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Roles */}
            <div className="space-y-2">
              <Label>Target Roles</Label>
              <p className="text-xs text-muted-foreground">
                Select who will see this announcement.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {ALL_ROLES.map((role) => {
                  const checked = formTargetRoles.includes(role.value);
                  return (
                    <label
                      key={role.value}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                        checked
                          ? "bg-[#F3ECF6] border-[#D4B8E3] text-[#4B0A8F] dark:bg-[#1F0860] dark:border-[#2A0C8F] dark:text-[#8A40B0]"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleTargetRole(role.value)}
                        className={checked ? "border-[#4B0A8F] data-[state=checked]:bg-[#4B0A8F] dark:border-[#8A40B0] dark:data-[state=checked]:bg-[#8A40B0]" : ""}
                      />
                      {role.label}
                    </label>
                  );
                })}
              </div>
              {formErrors.targetRoles && (
                <p className="text-xs text-red-500">{formErrors.targetRoles}</p>
              )}
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label>Expiry Date (optional)</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="size-4 mr-2 text-muted-foreground" />
                    {formExpiresAt ? (
                      formatPKT(formExpiresAt)
                    ) : (
                      <span className="text-muted-foreground">No expiry</span>
                    )}
                    {formExpiresAt && (
                      <X
                        className="size-3 ml-auto text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormExpiresAt(undefined);
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formExpiresAt}
                    onSelect={(date) => {
                      setFormExpiresAt(date || undefined);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeCreateDialog}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-[#2A0C8F] via-[#A0006B] to-[#FF0015] text-white hover:opacity-90"
            >
              {createMutation.isPending ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRMATION ===== */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedAnnouncement?.title}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
