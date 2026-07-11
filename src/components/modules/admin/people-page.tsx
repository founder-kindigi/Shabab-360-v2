"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  MapPin,
  TreePine,
  Users,
  Mail,
  Phone,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  UserCog,
  ScrollText,
  Pencil,
  KeyRound,
  UserX,
  ShieldCheck,
  ShieldX,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPKT } from "@/lib/timezone";
import { toast } from "sonner";
import { DonutChart } from "@/components/shared/donut-chart";
import { AvatarUpload } from "@/components/shared/avatar-upload";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffMetaInfo {
  id: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  assignedCity: { id: string; name: string } | null;
  assignedPark: { id: string; name: string } | null;
  assignedGroup: { id: string; name: string } | null;
}

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  mustResetPwd: boolean;
  createdAt: string;
  updatedAt: string;
  staffMeta: StaffMetaInfo;
}

interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  byRole: { role: string; count: number }[];
}

interface CityOption {
  id: string;
  name: string;
}

interface ParkOption {
  id: string;
  name: string;
  cityId: string;
}

interface GroupOption {
  id: string;
  name: string;
  batchId: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_ROLES = [
  "super_admin",
  "program_admin",
  "city_head",
  "park_admin",
  "park_lead",
  "murabbi",
  "guardian",
  "student",
] as const;

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  program_admin: "Program Admin",
  city_head: "City Head",
  park_admin: "Park Admin",
  park_lead: "Park Lead",
  murabbi: "Murabbi",
  guardian: "Guardian",
  student: "Student",
};

const ROLE_COLORS: Record<string, { bg: string; text: string; avatar: string; border: string }> = {
  super_admin: { bg: "bg-[#4B0A8F]/10", text: "text-[#4B0A8F]", avatar: "bg-[#4B0A8F]", border: "border-[#4B0A8F]/20" },
  program_admin: { bg: "bg-[#A0006B]/10", text: "text-[#A0006B]", avatar: "bg-[#A0006B]", border: "border-[#A0006B]/20" },
  city_head: { bg: "bg-[#6B20A0]/10", text: "text-[#6B20A0]", avatar: "bg-[#6B20A0]", border: "border-[#6B20A0]/20" },
  park_admin: { bg: "bg-[#8A40B0]/10", text: "text-[#8A40B0]", avatar: "bg-[#8A40B0]", border: "border-[#8A40B0]/20" },
  park_lead: { bg: "bg-[#2A0C8F]/10", text: "text-[#2A0C8F]", avatar: "bg-[#2A0C8F]", border: "border-[#2A0C8F]/20" },
  murabbi: { bg: "bg-[#E0002A]/10", text: "text-[#E0002A]", avatar: "bg-[#E0002A]", border: "border-[#E0002A]/20" },
  guardian: { bg: "bg-[#6B5A7A]/10", text: "text-[#6B5A7A]", avatar: "bg-[#6B5A7A]", border: "border-[#6B5A7A]/20" },
  student: { bg: "bg-[#FF0015]/10", text: "text-[#FF0015]", avatar: "bg-[#FF0015]", border: "border-[#FF0015]/20" },
};

const ROLE_CHART_COLORS = [
  "#4B0A8F", "#A0006B", "#6B20A0", "#8A40B0", "#2A0C8F", "#E0002A", "#6B5A7A", "#FF0015",
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

/** Resolve avatar URL from localStorage for a given user ID */
function useUserAvatar(userId: string | undefined): string | null {
  const [avatar, setAvatar] = useState<string | null>(() => {
    if (typeof window === "undefined" || !userId) return null;
    return localStorage.getItem(`avatar-${userId}`);
  });
  // Update when userId changes (deferred to avoid synchronous setState in effect)
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => {
      setAvatar(localStorage.getItem(`avatar-${userId}`));
    }, 0);
    return () => clearTimeout(timer);
  }, [userId]);
  return avatar;
}

/** Small component: show avatar image or colored initials circle */
function AvatarOrInitials({
  userId,
  name,
  size = "sm",
  avatarColor,
}: {
  userId: string;
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  avatarColor?: string;
}) {
  const avatar = useUserAvatar(userId);
  const s = size === "sm" ? "size-8 text-xs" : size === "md" ? "size-10 text-sm" : "size-20 text-2xl";
  const colors = avatarColor || "bg-[#4B0A8F]";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || "Avatar"}
        className={`${s} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${s} rounded-full ${colors} text-white font-bold shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

function formatDateRel(dateStr: string): string {
  try {
    return formatPKT(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PeoplePage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [parkFilter, setParkFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Reset page on filter change
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleRoleChange = useCallback((val: string) => {
    setRoleFilter(val);
    setPage(1);
  }, []);

  const handleCityChange = useCallback((val: string) => {
    setCityFilter(val);
    setParkFilter("all");
    setPage(1);
  }, []);

  const handleParkChange = useCallback((val: string) => {
    setParkFilter(val);
    setPage(1);
  }, []);

  const handleActiveChange = useCallback((val: string) => {
    setActiveFilter(val);
    setPage(1);
  }, []);

  // Fetch staff
  const { data, isLoading } = useQuery({
    queryKey: ["admin-people", debouncedSearch, roleFilter, cityFilter, parkFilter, activeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (cityFilter !== "all") params.set("cityId", cityFilter);
      if (parkFilter !== "all") params.set("parkId", parkFilter);
      if (activeFilter !== "all") params.set("isActive", activeFilter);
      params.set("page", page.toString());

      const res = await fetch(`/api/admin/people?${params}`);
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json() as Promise<{
        data: StaffMember[];
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>;
    },
  });

  // Fetch staff stats
  const { data: stats } = useQuery<StaffStats>({
    queryKey: ["admin-people-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/people?stats=true");
      if (!res.ok) return { total: 0, active: 0, inactive: 0, byRole: [] };
      return res.json();
    },
  });

  // Fetch cities for dropdown
  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["cities-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cities");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch parks for cascading filter
  const { data: allParks } = useQuery<ParkOption[]>({
    queryKey: ["parks-dropdown-people"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parks");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filteredParks = cityFilter !== "all"
    ? allParks?.filter((p) => p.cityId === cityFilter) ?? []
    : allParks ?? [];

  const staff = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;

  // Open detail sheet
  const openDetail = useCallback((member: StaffMember) => {
    setSelectedStaff(member);
    setDetailOpen(true);
  }, []);

  const queryClient = useQueryClient();

  // Navigation from detail sheet
  const navigateTo = useAppStore((s) => s.navigateTo);

  // Edit assignment dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditUser = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  // Reset password mutation
  const resetPwdMutation = useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/admin/invite?resetFor=${userId}`, { method: "POST" }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Password reset link sent");
      queryClient.invalidateQueries({ queryKey: ["admin-people"] });
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to send password reset");
    },
  });

  const handleResetPassword = useCallback(() => {
    if (selectedStaff) {
      resetPwdMutation.mutate(selectedStaff.id);
    }
  }, [selectedStaff, resetPwdMutation]);

  // Deactivate / Activate mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive, staffMetaIsActive: isActive }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Staff status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-people"] });
      queryClient.invalidateQueries({ queryKey: ["admin-people-stats"] });
      setDetailOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to update staff status");
    },
  });

  const handleDeactivate = useCallback(() => {
    if (selectedStaff) {
      const newActive = !selectedStaff.isActive;
      const action = newActive ? "activate" : "deactivate";
      toggleActiveMutation.mutate({ userId: selectedStaff.id, isActive: newActive });
    }
  }, [selectedStaff, toggleActiveMutation]);

  const handleViewAudit = useCallback(() => {
    if (selectedStaff) {
      setDetailOpen(false);
      navigateTo("admin-audit-log");
    }
  }, [selectedStaff, navigateTo]);

  // ─── Card animation variants ─────────────────────────────────────────────

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
    }),
  };

  // Build donut segments for role breakdown
  const roleDonutSegments = (stats?.byRole ?? [])
    .filter((r) => r.count > 0)
    .map((r, i) => ({
      label: ROLE_LABELS[r.role] || r.role,
      value: r.count,
      color: ROLE_CHART_COLORS[i % ROLE_CHART_COLORS.length],
    }));

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── Statistics Bar ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
      >
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Staff</p>
                <p className="text-2xl font-bold text-[#4B0A8F] dark:text-[#8A40B0]">
                  {stats?.total ?? <Skeleton className="h-7 w-12 inline-block" />}
                </p>
              </div>
              <div className="flex items-center justify-center size-10 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080]">
                <Users className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4B0A8F] via-[#A0006B] to-[#FF0015]" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
                <p className="text-2xl font-bold text-[#22C55E]">
                  {stats?.active ?? <Skeleton className="h-7 w-12 inline-block" />}
                </p>
              </div>
              <div className="flex items-center justify-center size-10 rounded-lg bg-[#22C55E]/10">
                <ShieldCheck className="size-5 text-[#22C55E]" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#22C55E]" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inactive</p>
                <p className="text-2xl font-bold text-[#ef4444]">
                  {stats?.inactive ?? <Skeleton className="h-7 w-12 inline-block" />}
                </p>
              </div>
              <div className="flex items-center justify-center size-10 rounded-lg bg-[#ef4444]/10">
                <ShieldX className="size-5 text-[#ef4444]" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ef4444]" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4 flex items-center justify-center">
            <DonutChart
              segments={roleDonutSegments}
              size={80}
              strokeWidth={14}
              centerLabel="Roles"
              centerValue={String(stats?.byRole?.length ?? 0)}
            />
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4B0A8F] to-[#A0006B]" />
        </Card>
      </motion.div>

      {/* ─── Search & Filter Bar ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Role filter */}
          <Select value={roleFilter} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* City filter */}
          <Select value={cityFilter} onValueChange={handleCityChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Park filter (cascading) */}
          <Select value={parkFilter} onValueChange={handleParkChange} disabled={cityFilter === "all"}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={cityFilter === "all" ? "Select city first" : "All Parks"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parks</SelectItem>
              {filteredParks.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active/Inactive toggle */}
          <Select value={activeFilter} onValueChange={handleActiveChange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isLoading ? (
              <Skeleton className="h-4 w-32 inline-block" />
            ) : (
              <>
                Showing <span className="font-medium text-foreground">{staff.length}</span> of{" "}
                <span className="font-medium text-foreground">{total}</span> staff members
              </>
            )}
          </span>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-xs">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Loading Skeletons ────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-48" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-2 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Empty State ──────────────────────────────────────────────────── */}
      {!isLoading && staff.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="flex items-center justify-center size-16 rounded-2xl bg-[#F3ECF6] dark:bg-[#1F086080] mb-4">
            <Users className="size-8 text-[#4B0A8F] dark:text-[#8A40B0]" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No staff found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {search || roleFilter !== "all" || cityFilter !== "all" || parkFilter !== "all" || activeFilter !== "all"
              ? "Try adjusting your search or filters to find what you're looking for."
              : "No staff members have been added yet."}
          </p>
        </motion.div>
      )}

      {/* ─── Desktop Table View ─────────────────────────────────────────── */}
      {!isLoading && staff.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground w-10">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phone</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Assignment</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {staff.map((member, i) => {
                        const role = member.staffMeta.role;
                        const colors = ROLE_COLORS[role] || ROLE_COLORS.student;
                        const isInactive = !member.isActive || !member.staffMeta.isActive;
                        return (
                          <motion.tr
                            key={member.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className={`border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50 ${isInactive ? "opacity-60" : ""}`}
                            onClick={() => openDetail(member)}
                          >
                            <td className="py-2.5 px-4">
                              <span
                                className={`block size-2.5 rounded-full ${isInactive ? "bg-[#ef4444]" : "bg-[#22C55E]"}`}
                                title={isInactive ? "Inactive" : "Active"}
                              />
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-3">
                                <AvatarOrInitials
                                  userId={member.id}
                                  name={member.name}
                                  avatarColor={colors.avatar}
                                  size="sm"
                                />
                                <span className="font-medium text-foreground truncate max-w-[180px]">
                                  {member.name || "No Name"}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground truncate max-w-[200px]">{member.email}</td>
                            <td className="py-2.5 px-4 text-muted-foreground">{member.phone || "—"}</td>
                            <td className="py-2.5 px-4">
                              <Badge
                                variant="outline"
                                className={`${colors.bg} ${colors.text} ${colors.border} text-[11px] font-medium border`}
                              >
                                {ROLE_LABELS[role] || role}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground text-xs">
                              <div className="flex flex-wrap items-center gap-1">
                                {member.staffMeta.assignedCity && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <MapPin className="size-3 text-[#6B20A0]" />
                                    {member.staffMeta.assignedCity.name}
                                  </span>
                                )}
                                {member.staffMeta.assignedPark && (
                                  <>
                                    <span className="text-muted-foreground/40">›</span>
                                    <span className="inline-flex items-center gap-0.5">
                                      <TreePine className="size-3 text-[#8A40B0]" />
                                      {member.staffMeta.assignedPark.name}
                                    </span>
                                  </>
                                )}
                                {member.staffMeta.assignedGroup && (
                                  <>
                                    <span className="text-muted-foreground/40">›</span>
                                    <span className="inline-flex items-center gap-0.5">
                                      <Users className="size-3 text-[#A0006B]" />
                                      {member.staffMeta.assignedGroup.name}
                                    </span>
                                  </>
                                )}
                                {!member.staffMeta.assignedCity && !member.staffMeta.assignedPark && !member.staffMeta.assignedGroup && (
                                  <span className="italic">Unassigned</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground text-xs">
                              {formatDateRel(member.updatedAt)}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {staff.map((member, i) => {
                const role = member.staffMeta.role;
                const colors = ROLE_COLORS[role] || ROLE_COLORS.student;
                const isInactive = !member.isActive || !member.staffMeta.isActive;

                return (
                  <motion.div
                    key={member.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                  >
                    <Card
                      className={`overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-[#4B0A8F]/20 ${isInactive ? "opacity-60" : ""}`}
                      onClick={() => openDetail(member)}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Top row: Avatar + Name + Status */}
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <AvatarOrInitials
                            userId={member.id}
                            name={member.name}
                            avatarColor={colors.avatar}
                            size="md"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-foreground truncate">
                                {member.name || "No Name"}
                              </h3>
                              {/* Status dot */}
                              <span
                                className={`shrink-0 size-2 rounded-full ${isInactive ? "bg-[#ef4444]" : "bg-[#22C55E]"}`}
                                title={isInactive ? "Inactive" : "Active"}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="size-3 shrink-0" />
                              {member.email}
                            </p>
                            {member.phone && (
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Phone className="size-3 shrink-0" />
                                {member.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Role badge */}
                        <Badge
                          variant="outline"
                          className={`${colors.bg} ${colors.text} ${colors.border} text-[11px] font-medium border`}
                        >
                          {ROLE_LABELS[role] || role}
                        </Badge>

                        {/* Assignment chain */}
                        {(member.staffMeta.assignedCity || member.staffMeta.assignedPark || member.staffMeta.assignedGroup) && (
                          <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                            {member.staffMeta.assignedCity && (
                              <span className="inline-flex items-center gap-1 bg-muted/60 rounded-md px-1.5 py-0.5">
                                <MapPin className="size-3 text-[#6B20A0]" />
                                {member.staffMeta.assignedCity.name}
                              </span>
                            )}
                            {member.staffMeta.assignedPark && (
                              <>
                                <span className="text-muted-foreground/50">→</span>
                                <span className="inline-flex items-center gap-1 bg-muted/60 rounded-md px-1.5 py-0.5">
                                  <TreePine className="size-3 text-[#8A40B0]" />
                                  {member.staffMeta.assignedPark.name}
                                </span>
                              </>
                            )}
                            {member.staffMeta.assignedGroup && (
                              <>
                                <span className="text-muted-foreground/50">→</span>
                                <span className="inline-flex items-center gap-1 bg-muted/60 rounded-md px-1.5 py-0.5">
                                  <Users className="size-3 text-[#A0006B]" />
                                  {member.staffMeta.assignedGroup.name}
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Footer: Last active date */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="size-3" />
                            Last active {formatDateRel(member.updatedAt)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* ─── Bottom Pagination (desktop) ──────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && !isLoading && staff.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, idx) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = idx + 1;
              } else if (page <= 3) {
                pageNum = idx + 1;
              } else if (page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + idx;
              } else {
                pageNum = page - 2 + idx;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="icon"
                  className="size-8"
                  onClick={() => setPage(pageNum)}
                  style={
                    page === pageNum
                      ? { backgroundColor: "#4B0A8F", color: "#fff" }
                      : undefined
                  }
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ─── Staff Detail Sheet ───────────────────────────────────────────── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedStaff && (
            <StaffDetailSheet
              staff={selectedStaff}
              onEditUser={handleEditUser}
              onResetPassword={handleResetPassword}
              onDeactivate={handleDeactivate}
              onViewAudit={handleViewAudit}
              isResettingPwd={resetPwdMutation.isPending}
              isToggling={toggleActiveMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Edit Assignment Dialog ─────────────────────────────────────── */}
      {selectedStaff && (
        <EditAssignmentDialog
          staff={selectedStaff}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          cities={cities ?? []}
          allParks={allParks ?? []}
        />
      )}
    </div>
  );
}

// ─── Staff Detail Sheet Sub-component ─────────────────────────────────────────

function StaffDetailSheet({
  staff,
  onEditUser,
  onResetPassword,
  onDeactivate,
  onViewAudit,
  isResettingPwd,
  isToggling,
}: {
  staff: StaffMember;
  onEditUser: () => void;
  onResetPassword: () => void;
  onDeactivate: () => void;
  onViewAudit: () => void;
  isResettingPwd: boolean;
  isToggling: boolean;
}) {
  const role = staff.staffMeta.role;
  const colors = ROLE_COLORS[role] || ROLE_COLORS.student;
  const isInactive = !staff.isActive || !staff.staffMeta.isActive;

  return (
    <div className="space-y-6 pb-6">
      {/* ── Profile Header ──────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center gap-3 pt-2">
        <AvatarUpload
          userId={staff.id}
          name={staff.name}
          size="lg"
          avatarColor={colors.avatar}
        />
        <div>
          <h3 className="text-lg font-semibold text-foreground leading-tight">
            {staff.name || "No Name"}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{staff.email}</p>
          <Badge
            variant="outline"
            className={`mt-2 ${colors.bg} ${colors.text} ${colors.border} border`}
          >
            {ROLE_LABELS[role] || role}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* ── Assignment Details ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Assignment Details</h4>
        <div className="space-y-2">
          {staff.staffMeta.assignedCity ? (
            <div className="flex items-center gap-3 text-sm bg-[#F3ECF6] dark:bg-[#1F086080] rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-center size-8 rounded-md bg-[#6B20A0]/10 shrink-0">
                <MapPin className="size-4 text-[#6B20A0]" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">City</span>
                <span className="text-foreground font-medium">{staff.staffMeta.assignedCity.name}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm rounded-lg px-3 py-2.5 bg-muted/50">
              <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                <MapPin className="size-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">City</span>
                <span className="text-muted-foreground italic">Unassigned</span>
              </div>
            </div>
          )}

          {staff.staffMeta.assignedPark ? (
            <div className="flex items-center gap-3 text-sm bg-[#F3ECF6] dark:bg-[#1F086080] rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-center size-8 rounded-md bg-[#8A40B0]/10 shrink-0">
                <TreePine className="size-4 text-[#8A40B0]" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Park</span>
                <span className="text-foreground font-medium">{staff.staffMeta.assignedPark.name}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm rounded-lg px-3 py-2.5 bg-muted/50">
              <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                <TreePine className="size-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Park</span>
                <span className="text-muted-foreground italic">Unassigned</span>
              </div>
            </div>
          )}

          {staff.staffMeta.assignedGroup ? (
            <div className="flex items-center gap-3 text-sm bg-[#F3ECF6] dark:bg-[#1F086080] rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-center size-8 rounded-md bg-[#A0006B]/10 shrink-0">
                <Users className="size-4 text-[#A0006B]" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Group</span>
                <span className="text-foreground font-medium">{staff.staffMeta.assignedGroup.name}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm rounded-lg px-3 py-2.5 bg-muted/50">
              <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                <Users className="size-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Group</span>
                <span className="text-muted-foreground italic">Unassigned</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Account Info ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Account Information</h4>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant="outline"
              className={
                isInactive
                  ? "border-[#ef4444]/30 text-[#ef4444] bg-[#ef4444]/10"
                  : "border-[#22C55E]/30 text-[#22C55E] bg-[#22C55E]/10"
              }
            >
              {isInactive ? "Inactive" : "Active"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5" /> Created
            </span>
            <span className="text-foreground">{formatDateRel(staff.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3.5" /> Phone
            </span>
            <span className="text-foreground">{staff.phone || "Not set"}</span>
          </div>
          {staff.mustResetPwd && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Must reset password on next login</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Quick Actions</h4>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="justify-start gap-2.5 text-sm"
            onClick={onEditUser}
          >
            <UserCog className="size-4 text-[#4B0A8F]" />
            Edit Assignment
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2.5 text-sm"
            onClick={onResetPassword}
            disabled={isResettingPwd}
          >
            {isResettingPwd ? (
              <Loader2 className="size-4 text-[#A0006B] animate-spin" />
            ) : (
              <KeyRound className="size-4 text-[#A0006B]" />
            )}
            {isResettingPwd ? "Sending..." : "Reset Password"}
          </Button>
          <Button
            variant="outline"
            className={`justify-start gap-2.5 text-sm ${isInactive ? "border-[#22C55E]/30 hover:bg-[#22C55E]/10" : "border-[#ef4444]/30 hover:bg-[#ef4444]/10"}`}
            onClick={onDeactivate}
            disabled={isToggling}
          >
            {isToggling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isInactive ? (
              <UserCheck className="size-4 text-[#22C55E]" />
            ) : (
              <UserX className="size-4 text-[#ef4444]" />
            )}
            {isToggling
              ? "Updating..."
              : isInactive
                ? "Activate Account"
                : "Deactivate Account"}
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2.5 text-sm"
            onClick={onViewAudit}
          >
            <ScrollText className="size-4 text-[#6B20A0]" />
            View Audit Log
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Assignment Dialog ─────────────────────────────────────────────

function EditAssignmentDialog({
  staff,
  open,
  onOpenChange,
  cities,
  allParks,
}: {
  staff: StaffMember;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cities: CityOption[];
  allParks: ParkOption[];
}) {
  const queryClient = useQueryClient();

  const [selCity, setSelCity] = useState(staff.staffMeta.assignedCity?.id ?? "__none__");
  const [selPark, setSelPark] = useState(staff.staffMeta.assignedPark?.id ?? "__none__");
  const [selGroup, setSelGroup] = useState(staff.staffMeta.assignedGroup?.id ?? "__none__");

  // Fetch groups when park changes
  const { data: groups } = useQuery<GroupOption[]>({
    queryKey: ["groups-assign-dialog", selPark],
    queryFn: async () => {
      if (!selPark || selPark === "__none__") return [];
      const res = await fetch(`/api/admin/groups?parkId=${selPark}&status=all`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && selPark !== "__none__",
  });

  // Cascading: reset park when city changes
  function handleCityChange(val: string) {
    setSelCity(val);
    setSelPark("__none__");
    setSelGroup("__none__");
  }

  // Cascading: reset group when park changes
  function handleParkChange(val: string) {
    setSelPark(val);
    setSelGroup("__none__");
  }

  const filteredParks = selCity !== "__none__"
    ? allParks.filter((p) => p.cityId === selCity)
    : allParks;

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/admin/users/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedCityId: selCity === "__none__" ? null : selCity,
          assignedParkId: selPark === "__none__" ? null : selPark,
          assignedGroupId: selGroup === "__none__" ? null : selGroup,
        }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Assignment updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-people"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to update assignment");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Update city, park, and group assignment for {staff.name || staff.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* City Select */}
          <div className="space-y-2">
            <Label className="text-sm">City</Label>
            <Select value={selCity} onValueChange={handleCityChange}>
              <SelectTrigger>
                <SelectValue placeholder="No city assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No City —</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Park Select */}
          <div className="space-y-2">
            <Label className="text-sm">Park</Label>
            <Select value={selPark} onValueChange={handleParkChange} disabled={selCity === "__none__" && !staff.staffMeta.assignedPark}>
              <SelectTrigger>
                <SelectValue placeholder={selCity === "__none__" ? "Select city first" : "No park assigned"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No Park —</SelectItem>
                {filteredParks.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group Select */}
          <div className="space-y-2">
            <Label className="text-sm">Group</Label>
            <Select value={selGroup} onValueChange={setSelGroup} disabled={selPark === "__none__" && !staff.staffMeta.assignedGroup}>
              <SelectTrigger>
                <SelectValue placeholder={selPark === "__none__" ? "Select park first" : "No group assigned"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— No Group —</SelectItem>
                {groups?.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}