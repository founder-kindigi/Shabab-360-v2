"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPKT } from "@/lib/timezone";
import { toast } from "sonner";

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
  createdAt: string;
  staffMeta: StaffMetaInfo;
}

interface CityOption {
  id: string;
  name: string;
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

// ─── Helper ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PeoplePage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
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
    setPage(1);
  }, []);

  const handleActiveChange = useCallback((val: string) => {
    setActiveFilter(val);
    setPage(1);
  }, []);

  // Fetch staff
  const { data, isLoading } = useQuery({
    queryKey: ["admin-people", debouncedSearch, roleFilter, cityFilter, activeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (cityFilter !== "all") params.set("cityId", cityFilter);
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

  // Fetch cities for dropdown
  const { data: cities } = useQuery({
    queryKey: ["cities-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cities");
      if (!res.ok) return [];
      return res.json() as Promise<CityOption[]>;
    },
  });

  const staff = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;

  // Open detail sheet
  const openDetail = useCallback((member: StaffMember) => {
    setSelectedStaff(member);
    setDetailOpen(true);
  }, []);

  // Navigation from detail sheet
  const navigateTo = useAppStore((s) => s.navigateTo);

  const handleEditUser = useCallback(() => {
    if (selectedStaff) {
      setDetailOpen(false);
      toast.info("Navigate to Users page to edit this staff member");
    }
  }, [selectedStaff]);

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

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── Search & Filter Bar ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
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
            {search || roleFilter !== "all" || cityFilter !== "all" || activeFilter !== "all"
              ? "Try adjusting your search or filters to find what you're looking for."
              : "No staff members have been added yet."}
          </p>
        </motion.div>
      )}

      {/* ─── Staff Cards Grid ─────────────────────────────────────────────── */}
      {!isLoading && staff.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                        <div
                          className={`flex items-center justify-center size-10 rounded-full ${colors.avatar} text-white text-sm font-bold shrink-0`}
                        >
                          {getInitials(member.name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground truncate">
                              {member.name || "No Name"}
                            </h3>
                            {/* Status dot */}
                            <span
                              className={`shrink-0 size-2 rounded-full ${isInactive ? "bg-muted-foreground/40" : "bg-[#22C55E]"}`}
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

                      {/* Footer: Join date */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          Joined {formatPKT(new Date(member.createdAt), "dd MMM yyyy")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
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
              onViewAudit={handleViewAudit}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Staff Detail Sheet Sub-component ─────────────────────────────────────────

function StaffDetailSheet({
  staff,
  onEditUser,
  onViewAudit,
}: {
  staff: StaffMember;
  onEditUser: () => void;
  onViewAudit: () => void;
}) {
  const role = staff.staffMeta.role;
  const colors = ROLE_COLORS[role] || ROLE_COLORS.student;
  const isInactive = !staff.isActive || !staff.staffMeta.isActive;

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          {/* Large Avatar */}
          <div
            className={`flex items-center justify-center size-12 rounded-full ${colors.avatar} text-white text-lg font-bold shrink-0`}
          >
            {getInitials(staff.name)}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span>{staff.name || "No Name"}</span>
              <span
                className={`size-2.5 rounded-full ${isInactive ? "bg-muted-foreground/40" : "bg-[#22C55E]"}`}
              />
            </div>
            <SheetDescription className="text-xs mt-0.5">
              {staff.email}
            </SheetDescription>
          </div>
        </SheetTitle>
      </SheetHeader>

      <Separator />

      {/* Status & Role */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <Badge
            variant="outline"
            className={
              isInactive
                ? "border-[#6B5A7A]/30 text-[#6B5A7A] bg-[#6B5A7A]/10"
                : "border-[#22C55E]/30 text-[#22C55E] bg-[#22C55E]/10"
            }
          >
            {isInactive ? "Inactive" : "Active"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Role</span>
          <Badge
            variant="outline"
            className={`${colors.bg} ${colors.text} ${colors.border} border`}
          >
            {ROLE_LABELS[role] || role}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Contact Information</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="size-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{staff.email}</span>
          </div>
          {staff.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{staff.phone}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Assignment Chain */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Assignment</h4>
        <div className="space-y-2">
          {staff.staffMeta.assignedCity && (
            <div className="flex items-center gap-2 text-sm bg-[#F3ECF6] dark:bg-[#1F086080] rounded-lg px-3 py-2">
              <MapPin className="size-4 text-[#6B20A0] shrink-0" />
              <div>
                <span className="text-[11px] text-muted-foreground block">City</span>
                <span className="text-foreground font-medium">{staff.staffMeta.assignedCity.name}</span>
              </div>
            </div>
          )}
          {staff.staffMeta.assignedPark && (
            <div className="flex items-center gap-2 text-sm bg-[#F3ECF6] dark:bg-[#1F086080] rounded-lg px-3 py-2">
              <TreePine className="size-4 text-[#8A40B0] shrink-0" />
              <div>
                <span className="text-[11px] text-muted-foreground block">Park</span>
                <span className="text-foreground font-medium">{staff.staffMeta.assignedPark.name}</span>
              </div>
            </div>
          )}
          {staff.staffMeta.assignedGroup && (
            <div className="flex items-center gap-2 text-sm bg-[#F3ECF6] dark:bg-[#1F086080] rounded-lg px-3 py-2">
              <Users className="size-4 text-[#A0006B] shrink-0" />
              <div>
                <span className="text-[11px] text-muted-foreground block">Group</span>
                <span className="text-foreground font-medium">{staff.staffMeta.assignedGroup.name}</span>
              </div>
            </div>
          )}
          {!staff.staffMeta.assignedCity && !staff.staffMeta.assignedPark && !staff.staffMeta.assignedGroup && (
            <p className="text-sm text-muted-foreground italic">No assignments configured</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Dates */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Timeline</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Account created</span>
            <span className="text-foreground">{formatPKT(new Date(staff.createdAt), "dd MMM yyyy")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Staff role assigned</span>
            <span className="text-foreground">{formatPKT(new Date(staff.staffMeta.createdAt), "dd MMM yyyy")}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Quick Actions</h4>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="justify-start gap-2 text-sm"
            onClick={onEditUser}
          >
            <Pencil className="size-4 text-[#4B0A8F]" />
            Edit User
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 text-sm"
            onClick={onViewAudit}
          >
            <ScrollText className="size-4 text-[#A0006B]" />
            View Audit Log
          </Button>
        </div>
      </div>
    </div>
  );
}