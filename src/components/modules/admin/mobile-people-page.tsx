"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/sheet";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Search,
  Users,
  MapPin,
  TreePine,
  Mail,
  Phone,
  Filter,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileParticipantDetailSheet } from "./mobile-participant-detail-sheet";
// For guardian detail sheet if needed in the future, import MobileGuardianDetailSheet

// --- Types ---

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

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

export function MobilePeoplePage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  // Pagination for infinite scroll pattern (simplified to simple prev/next for mobile or just load more)
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-people", debouncedSearch, roleFilter, "all", "all", "all", page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "all") params.set("role", roleFilter);
      params.set("page", page.toString());
      
      const res = await fetch(`/api/admin/people?${params}`);
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json() as Promise<{
        data: StaffMember[];
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>;
    },
  });

  const staff = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Staff Directory</h1>
            <p className="text-sm text-muted-foreground">Manage organization users</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-full relative"
            onClick={() => setFilterOpen(true)}
          >
            <Filter className="size-5" />
            {roleFilter !== "all" && (
              <span className="absolute top-0 right-0 size-3 rounded-full bg-[#4B0A8F]" />
            )}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-9 h-11 bg-background rounded-xl"
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

      {/* Main List */}
      <div className="flex-1 p-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border-border/50">
                <CardContent className="p-4 flex gap-3">
                  <Skeleton className="size-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && staff.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Users className="size-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-lg mb-1">No staff found</p>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {search || roleFilter !== "all" ? "Try adjusting your filters" : "Directory is empty"}
            </p>
          </div>
        )}

        <AnimatePresence>
          {!isLoading && staff.map((member, i) => {
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
                <Card className={cn("rounded-2xl overflow-hidden", isInactive && "opacity-60")}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("flex items-center justify-center size-12 rounded-full text-white font-bold shrink-0", colors.avatar)}>
                        {getInitials(member.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h3 className="font-semibold truncate">{member.name || "No Name"}</h3>
                          <span className={cn("size-2 rounded-full shrink-0", isInactive ? "bg-red-500" : "bg-emerald-500")} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-2">{member.email}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className={cn("text-[10px] px-2 py-0", colors.bg, colors.text, colors.border)}>
                            {ROLE_LABELS[role] || role}
                          </Badge>
                          {member.staffMeta.assignedPark && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <TreePine className="size-3" />
                              <span className="truncate max-w-[100px]">{member.staffMeta.assignedPark.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Prev
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <div className="h-6" />

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-6">
          <SheetTitle className="mb-4">Filter Directory</SheetTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setPage(1); }}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-12 rounded-xl bg-[#4B0A8F] hover:bg-[#4B0A8F]/90 text-white mt-4"
              onClick={() => setFilterOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
