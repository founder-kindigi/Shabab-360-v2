"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Phone,
  ShieldCheck,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  MapPin,
  CreditCard,
  X,
  Link2,
  User,
  Baby,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ==================== TYPES ====================

type Attendance30Day = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
};

type GuardianChild = {
  participantId: string;
  name: string;
  groupName: string;
  batchName: string;
  relation: string | null;
  state: string;
  attendance30Day: Attendance30Day;
};

type Guardian = {
  id: string;
  name: string;
  phone: string;
  cnic: string | null;
  address: string | null;
  childrenCount: number;
  children: GuardianChild[];
};

type GuardiansResponse = {
  data: Guardian[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  park: { id: string; name: string; city: string };
};

type GuardianSearchResult = {
  id: string;
  name: string;
  phone: string;
  cnic: string | null;
  address: string | null;
};

// ==================== CONSTANTS ====================

const AVATAR_COLORS = [
  "#4B0A8F", "#A0006B", "#2A0C8F", "#6B21A8",
  "#7C3AED", "#9333EA", "#C026D3", "#DB2777",
  "#A21CAF", "#86198F",
];

const CHILD_AVATAR_COLORS = [
  "#8A40B0", "#A0006B", "#2A0C8F", "#9333EA",
  "#C026D3", "#DB2777", "#6B21A8", "#A21CAF",
];

const PAGE_SIZES = [20, 40, 60];

// ==================== HELPERS ====================

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getRateBadgeBg(rate: number): string {
  if (rate >= 80) return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
  if (rate >= 50) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
}

function getStateBadge(state: string) {
  switch (state) {
    case "active":
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-[10px] px-1.5 py-0">
          Active
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] px-1.5 py-0">
          Inactive
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {state}
        </Badge>
      );
  }
}

function maskCnic(cnic: string | null): string {
  if (!cnic || cnic.length < 13) return cnic || "—";
  return cnic.slice(0, 5) + "-" + cnic.slice(5, 12) + "-" + cnic.slice(12);
}

// ==================== SKELETON LOADING ====================

function GuardiansSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-full sm:max-w-sm" />
        <Skeleton className="h-9 w-32 shrink-0" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Separator />
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="size-6 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-5 w-12 rounded-full ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== LINK GUARDIAN DIALOG ====================

function LinkGuardianDialog({
  open,
  onClose,
  parkParticipants,
}: {
  open: boolean;
  onClose: () => void;
  parkParticipants: { id: string; name: string; groupName: string }[];
}) {
  const queryClient = useQueryClient();
  const [phoneSearch, setPhoneSearch] = useState("");
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianSearchResult | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [relation, setRelation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: searchResults, isLoading: searchLoading } = useQuery<{
    results: GuardianSearchResult[];
  }>({
    queryKey: ["guardian-search", phoneSearch],
    queryFn: async () => {
      const res = await fetch(`/api/park/guardians/search?phone=${encodeURIComponent(phoneSearch)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: phoneSearch.length >= 3,
    staleTime: 5000,
  });

  const handleClose = () => {
    setPhoneSearch("");
    setSelectedGuardian(null);
    setSelectedParticipantId("");
    setRelation("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedGuardian || !selectedParticipantId) {
      toast.error("Please select a guardian and a participant");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/park/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guardianId: selectedGuardian.id,
          participantId: selectedParticipantId,
          relation: relation || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to link guardian");
      }

      toast.success("Guardian linked successfully");
      queryClient.invalidateQueries({ queryKey: ["park-guardians"] });
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to link guardian");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Guardian to Participant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Search guardian by phone */}
          <div className="space-y-2">
            <Label>Search Guardian by Phone</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Type phone number (min 3 chars)..."
                value={phoneSearch}
                onChange={(e) => {
                  setPhoneSearch(e.target.value);
                  setSelectedGuardian(null);
                }}
                className="pl-9 h-9 text-sm"
              />
              {phoneSearch && (
                <button
                  onClick={() => { setPhoneSearch(""); setSelectedGuardian(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {selectedGuardian && (
              <div className="rounded-lg border bg-[#F3ECF6] dark:bg-[#1F086080] p-3 flex items-center gap-3">
                <div
                  className="size-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: "#A0006B" }}
                >
                  {getInitials(selectedGuardian.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{selectedGuardian.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedGuardian.phone}</p>
                </div>
                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Selected</span>
              </div>
            )}

            {phoneSearch.length >= 3 && !selectedGuardian && (
              <div className="max-h-40 overflow-y-auto rounded-lg border">
                {searchLoading ? (
                  <div className="p-3 text-center">
                    <Loader2 className="size-4 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : (searchResults?.results?.length || 0) === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No guardians found with this phone
                  </div>
                ) : (
                  <div className="divide-y">
                    {searchResults?.results.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGuardian(g)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 text-left hover:bg-muted/50 transition-colors",
                          selectedGuardian?.id === g.id && "bg-[#F3ECF6] dark:bg-[#1F086080]"
                        )}
                      >
                        <div
                          className="size-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: AVATAR_COLORS[g.name.length % AVATAR_COLORS.length] }}
                        >
                          {getInitials(g.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{g.name}</p>
                          <p className="text-[11px] text-muted-foreground">{g.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Select participant */}
          <div className="space-y-2">
            <Label>Select Participant</Label>
            <Select value={selectedParticipantId} onValueChange={setSelectedParticipantId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Choose participant..." />
              </SelectTrigger>
              <SelectContent>
                {parkParticipants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.groupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 3: Relation (optional) */}
          <div className="space-y-2">
            <Label>Relation (optional)</Label>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select relation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="father">Father</SelectItem>
                <SelectItem value="mother">Mother</SelectItem>
                <SelectItem value="brother">Brother</SelectItem>
                <SelectItem value="sister">Sister</SelectItem>
                <SelectItem value="uncle">Uncle</SelectItem>
                <SelectItem value="aunt">Aunt</SelectItem>
                <SelectItem value="grandfather">Grandfather</SelectItem>
                <SelectItem value="grandmother">Grandmother</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !selectedGuardian || !selectedParticipantId}
            className="bg-[#4B0A8F] hover:bg-[#3A0872] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link2 className="size-3.5 mr-1.5" />
                Link Guardian
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== FAMILY CARD ====================

function FamilyCard({
  guardian,
  index,
  onView,
}: {
  guardian: Guardian;
  index: number;
  onView: () => void;
}) {
  const displayChildren = guardian.children.slice(0, 3);
  const moreCount = guardian.children.length - 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(75,10,143,0.12)" }}
      className="rounded-xl border bg-card overflow-hidden transition-colors hover:border-[#4B0A8F]/30 dark:hover:border-[#8A40B0]/30 cursor-pointer"
      style={{ borderLeftWidth: "3px", borderLeftColor: "#4B0A8F" }}
      onClick={onView}
    >
      {/* Guardian Info */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="size-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
          >
            {getInitials(guardian.name)}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-sm font-semibold truncate">{guardian.name}</h3>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {guardian.phone}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Baby className="size-3" />
                <Badge
                  variant="secondary"
                  className="bg-[#A0006B]/10 text-[#A0006B] dark:text-[#D4B8E3] text-[10px] px-1.5 py-0 border-0 font-semibold"
                >
                  {guardian.childrenCount} {guardian.childrenCount === 1 ? "child" : "children"}
                </Badge>
              </span>
            </div>
            {guardian.cnic && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CreditCard className="size-3" />
                <span>{maskCnic(guardian.cnic)}</span>
              </div>
            )}
            {guardian.address && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{guardian.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children Section */}
      <div className="border-t bg-muted/20 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Children ({guardian.childrenCount})
          </span>
          {moreCount > 0 && (
            <span className="text-[10px] text-[#4B0A8F] dark:text-[#8A40B0]">
              +{moreCount} more
            </span>
          )}
        </div>
        <div className="space-y-2">
          {displayChildren.map((child, cIdx) => (
            <div key={child.participantId} className="flex items-center gap-2">
              <div
                className="size-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                style={{ backgroundColor: CHILD_AVATAR_COLORS[cIdx % CHILD_AVATAR_COLORS.length] }}
              >
                {getInitials(child.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium truncate block">{child.name}</span>
                  {getStateBadge(child.state)}
                </div>
                <span className="text-[10px] text-muted-foreground">{child.groupName}</span>
              </div>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 shrink-0 font-semibold tabular-nums", getRateBadgeBg(child.attendance30Day.rate))}
              >
                {child.attendance30Day.rate}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== DETAIL SHEET ====================

function GuardianDetailSheet({
  guardian,
  open,
  onClose,
}: {
  guardian: Guardian | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!guardian) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4">
          <div className="flex items-center gap-4">
            <div
              className="size-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
              style={{ backgroundColor: "#4B0A8F" }}
            >
              {getInitials(guardian.name)}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-lg truncate">{guardian.name}</SheetTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <ShieldCheck className="size-3 text-[#A0006B]" />
                Guardian · {guardian.childrenCount} children
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Contact Info */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact Information</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">{guardian.phone}</span>
              </div>
              {guardian.cnic && (
                <div className="flex items-center gap-2">
                  <CreditCard className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{maskCnic(guardian.cnic)}</span>
                </div>
              )}
              {guardian.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{guardian.address}</span>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Children List */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Children ({guardian.childrenCount})
            </h4>
            <div className="space-y-3">
              {guardian.children.map((child, cIdx) => (
                <div
                  key={child.participantId}
                  className="rounded-lg border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="size-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: CHILD_AVATAR_COLORS[cIdx % CHILD_AVATAR_COLORS.length] }}
                    >
                      {getInitials(child.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{child.name}</span>
                        {getStateBadge(child.state)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {child.groupName}{" "}
                        <span className="text-muted-foreground/50">· {child.batchName}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0 font-bold tabular-nums", getRateBadgeBg(child.attendance30Day.rate))}
                    >
                      {child.attendance30Day.rate}%
                    </Badge>
                  </div>

                  {/* Attendance breakdown */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <div className="text-center">
                      <p className="text-xs font-bold text-green-600 dark:text-green-400">{child.attendance30Day.present}</p>
                      <p className="text-[9px] text-muted-foreground">P</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-red-600 dark:text-red-400">{child.attendance30Day.absent}</p>
                      <p className="text-[9px] text-muted-foreground">A</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{child.attendance30Day.late}</p>
                      <p className="text-[9px] text-muted-foreground">L</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-sky-600 dark:text-sky-400">{child.attendance30Day.excused}</p>
                      <p className="text-[9px] text-muted-foreground">E</p>
                    </div>
                  </div>

                  {child.relation && (
                    <p className="text-[10px] text-muted-foreground pt-0.5">
                      Relation: {child.relation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== EMPTY STATE ====================

function EmptyState({ isSearch }: { isSearch: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="size-16 rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center mb-4">
        <ShieldCheck className="size-8 text-[#4B0A8F] dark:text-[#D4B8E3]" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {isSearch ? "No families match your search" : "No families linked yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {isSearch
          ? "Try a different name or phone number."
          : "Families will appear here once guardians are linked to participants. Use the 'Link Guardian' button to get started."}
      </p>
      {!isSearch && (
        <div className="mt-4 px-4 py-2 rounded-lg border border-dashed border-muted-foreground/30 text-xs text-muted-foreground flex items-center gap-2">
          <Link2 className="size-3.5" />
          <span>Click &quot;Link Guardian&quot; above to connect a guardian to a participant</span>
        </div>
      )}
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export function ParkGuardiansPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailGuardian, setDetailGuardian] = useState<Guardian | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<GuardiansResponse>({
    queryKey: ["park-guardians", search, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/park/guardians?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load families");
      }
      return res.json();
    },
    staleTime: 30000,
  });

  const handleSearchSubmit = useCallback(() => {
    setSearch(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const totalPages = data?.pagination.totalPages || 0;
  const guardians = data?.data || [];

  // ==================== RENDER ====================

  if (isLoading) return <GuardiansSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
          <span className="text-red-500 text-lg">!</span>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Failed to load families</p>
        <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Families</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.park.name}{" "}
            <span className="text-muted-foreground/60">· {data.park.city}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{data.pagination.total}</span> famil{data.pagination.total !== 1 ? "ies" : "y"} linked to park participants
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setLinkDialogOpen(true)}
          className="bg-[#4B0A8F] hover:bg-[#3A0872] text-white shrink-0"
        >
          <Link2 className="size-3.5 mr-1.5" />
          Link Guardian
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
          className="pl-9 h-9 text-sm"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {guardians.length === 0 ? (
        <EmptyState isSearch={!!search} />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`guardians-${search}-${page}`}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {guardians.map((g, idx) => (
              <FamilyCard
                key={g.id}
                guardian={g}
                index={idx}
                onView={() => setDetailGuardian(g)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-16 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <GuardianDetailSheet
        guardian={detailGuardian}
        open={!!detailGuardian}
        onClose={() => setDetailGuardian(null)}
      />

      {/* Link Guardian Dialog */}
      <LinkGuardianDialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        parkParticipants={[]}
      />
    </div>
  );
}