"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";
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
import {
  Search,
  Filter,
  X,
  Users,
  Phone,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileGuardianDetailSheet } from "./mobile-guardian-detail-sheet";
import { MobileParticipantDetailSheet } from "./mobile-participant-detail-sheet";

// --- Types ---

interface Guardian {
  id: string;
  name: string;
  phone: string;
  cnic: string | null;
  isActive: boolean;
  children: { id: string }[];
}

// --- Helpers ---
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

export function MobileGuardiansPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState("all");
  
  const [selectedGuardianId, setSelectedGuardianId] = useState<string | null>(null);
  const [childDetailId, setChildDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-guardians", debouncedSearch, "", stateFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (stateFilter !== "all") params.set("state", stateFilter);
      params.set("page", String(page));
      params.set("pageSize", "20");
      return fetch(`/api/admin/guardians?${params}`).then((r) => r.json());
    },
  });

  const guardians = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Guardians</h1>
            <p className="text-sm text-muted-foreground">Family contacts</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-full relative"
            onClick={() => setFilterOpen(true)}
          >
            <Filter className="size-5" />
            {stateFilter !== "all" && (
              <span className="absolute top-0 right-0 size-3 rounded-full bg-[#4B0A8F]" />
            )}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name or phone..."
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && guardians.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Users className="size-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-lg mb-1">No guardians found</p>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              {search ? "Try adjusting your search" : "No guardians available"}
            </p>
          </div>
        )}

        <AnimatePresence>
          {!isLoading && guardians.map((g: Guardian, i: number) => (
            <motion.div
              key={g.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              layout
            >
              <Card 
                className={cn("rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform", !g.isActive && "opacity-75")}
                onClick={() => setSelectedGuardianId(g.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center size-12 rounded-full bg-emerald-100 text-emerald-700 font-bold shrink-0">
                      {getInitials(g.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold truncate leading-tight">{g.name}</h3>
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shrink-0", g.isActive ? "text-[#4B0A8F] bg-[#F3ECF6] border-[#D4B8E3]" : "text-muted-foreground")}>
                          {g.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Phone className="size-3" /> {g.phone}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="size-3" /> {g.children?.length || 0} Children
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" className="h-10 rounded-xl" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="text-sm font-medium text-muted-foreground">{page} / {pagination.totalPages}</span>
            <Button variant="outline" className="h-10 rounded-xl" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <div className="h-6" />

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8 pt-6">
          <SheetTitle className="mb-4">Filter Guardians</SheetTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={stateFilter} onValueChange={(val) => { setStateFilter(val); setPage(1); }}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-12 rounded-xl bg-[#4B0A8F] text-white mt-4" onClick={() => setFilterOpen(false)}>
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <MobileGuardianDetailSheet
        open={!!selectedGuardianId}
        onOpenChange={(open) => !open && setSelectedGuardianId(null)}
        guardianId={selectedGuardianId}
        onChildClick={(id) => setChildDetailId(id)}
      />

      <MobileParticipantDetailSheet
        open={!!childDetailId}
        onOpenChange={(open) => !open && setChildDetailId(null)}
        participantId={childDetailId}
      />
    </div>
  );
}
