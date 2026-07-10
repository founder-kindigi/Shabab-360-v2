"use client";

import { useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  X,
  Building2,
  TreePine,
  CalendarCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types matching API response shapes
// ---------------------------------------------------------------------------

interface CityItem {
  id: string;
  name: string;
  _count: { parks: number };
}

interface ParkItem {
  id: string;
  name: string;
  cityId: string;
  city: { id: string; name: string };
}

interface BatchItem {
  id: string;
  name: string;
  parkId: string;
  _count: { groups: number };
}

interface GroupItem {
  id: string;
  name: string;
  batchId: string;
  _count: { participants: number };
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

type ScopeMode = "full" | "city_locked" | "park_locked" | "read_only";

function getScopeMode(role: string | undefined): { mode: ScopeMode; visible: boolean } {
  if (!role || ["guardian", "student"].includes(role)) {
    return { mode: "full", visible: false };
  }
  if (["super_admin", "program_admin"].includes(role)) {
    return { mode: "full", visible: true };
  }
  if (role === "city_head") {
    return { mode: "city_locked", visible: true };
  }
  if (["park_admin", "park_lead"].includes(role)) {
    return { mode: "park_locked", visible: true };
  }
  if (role === "murabbi") {
    return { mode: "read_only", visible: true };
  }
  return { mode: "full", visible: false };
}

// ---------------------------------------------------------------------------
// Skeleton for a single select trigger
// ---------------------------------------------------------------------------

function SelectSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-4 rounded-sm" />
      <Skeleton className="h-4 w-28 rounded-sm" />
      <Skeleton className="h-4 w-8 rounded-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single scope level select
// ---------------------------------------------------------------------------

interface ScopeLevelProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  disabled?: boolean;
  loading: boolean;
  items: Array<{ id: string; name: string; count?: number }>;
  placeholder: string;
  onChange: (id: string) => void;
  onClear?: () => void;
}

function ScopeLevel({
  icon,
  label,
  value,
  disabled = false,
  loading,
  items,
  placeholder,
  onChange,
  onClear,
}: ScopeLevelProps) {
  const selectedItem = items.find((i) => i.id === value);

  return (
    <div className="relative">
      <Select
        value={value ?? ""}
        onValueChange={onChange}
        disabled={disabled || loading}
      >
        <SelectTrigger
          className={cn(
            "h-9 min-w-[140px] gap-1.5 pr-7 transition-all duration-200",
            value && !disabled && "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30",
            disabled && "opacity-80"
          )}
        >
          <span className="text-muted-foreground mr-0.5">{icon}</span>
          <SelectValue placeholder={placeholder}>
            {selectedItem ? (
              <span className="flex items-center gap-1.5">
                <span className="truncate max-w-[120px]">{selectedItem.name}</span>
                {selectedItem.count !== undefined && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] px-1.5 py-0 h-4 font-semibold"
                  >
                    {selectedItem.count}
                  </Badge>
                )}
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              <span className="flex items-center gap-2">
                <span className="truncate">{item.name}</span>
                {item.count !== undefined && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {item.count}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading && (
        <div className="absolute inset-0 flex items-center px-3">
          <SelectSkeleton />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arrow connector between levels
// ---------------------------------------------------------------------------

function Connector({ className }: { className?: string }) {
  return (
    <ChevronRight
      className={cn(
        "size-4 text-muted-foreground/50 shrink-0 hidden md:block",
        className
      )}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Main ScopeSelector component
// ---------------------------------------------------------------------------

export function ScopeSelector() {
  const { data: session, status: sessionStatus } = useSession();
  const user = session?.user;
  const role = user?.role;

  const {
    mode,
    visible,
  } = useMemo(() => getScopeMode(role), [role]);

  // Zustand selectors
  const selectedCityId = useAppStore((s) => s.selectedCityId);
  const selectedParkId = useAppStore((s) => s.selectedParkId);
  const selectedBatchId = useAppStore((s) => s.selectedBatchId);
  const selectedGroupId = useAppStore((s) => s.selectedGroupId);
  const setSelectedCity = useAppStore((s) => s.setSelectedCity);
  const setSelectedPark = useAppStore((s) => s.setSelectedPark);
  const setSelectedBatch = useAppStore((s) => s.setSelectedBatch);
  const setSelectedGroup = useAppStore((s) => s.setSelectedGroup);

  // Track initialization for locked roles
  const initializedRef = useRef(false);

  // -----------------------------------------------------------------------
  // Data queries
  // -----------------------------------------------------------------------

  // Cities – only needed for HQ roles
  const {
    data: cities = [],
    isLoading: citiesLoading,
  } = useQuery<CityItem[]>({
    queryKey: ["scope-cities"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    enabled: visible && mode === "full" && sessionStatus === "authenticated",
    staleTime: 5 * 60 * 1000,
  });

  // Parks – always fetch for staff roles
  const {
    data: allParks = [],
    isLoading: parksLoading,
  } = useQuery<ParkItem[]>({
    queryKey: ["scope-parks"],
    queryFn: () => fetch("/api/admin/parks").then((r) => r.json()),
    enabled: visible && sessionStatus === "authenticated",
    staleTime: 5 * 60 * 1000,
  });

  // Filter parks client-side for HQ by selected city
  const parks = useMemo(() => {
    if (mode === "full" && selectedCityId) {
      return allParks.filter((p) => p.cityId === selectedCityId);
    }
    return allParks;
  }, [allParks, mode, selectedCityId]);

  // Batches – fetch when a park is selected
  const {
    data: batches = [],
    isLoading: batchesLoading,
  } = useQuery<BatchItem[]>({
    queryKey: ["scope-batches", selectedParkId],
    queryFn: () =>
      fetch(`/api/admin/batches?parkId=${selectedParkId}`).then((r) => r.json()),
    enabled: visible && !!selectedParkId && sessionStatus === "authenticated",
    staleTime: 5 * 60 * 1000,
  });

  // Groups – fetch when a batch is selected
  const {
    data: groups = [],
    isLoading: groupsLoading,
  } = useQuery<GroupItem[]>({
    queryKey: ["scope-groups", selectedBatchId],
    queryFn: () =>
      fetch(`/api/admin/groups?batchId=${selectedBatchId}`).then((r) => r.json()),
    enabled: visible && !!selectedBatchId && sessionStatus === "authenticated",
    staleTime: 5 * 60 * 1000,
  });

  // For murabbi: fetch their group to discover the batchId
  const {
    data: murabbiGroups = [],
    isLoading: murabbiGroupsLoading,
  } = useQuery<GroupItem[]>({
    queryKey: ["scope-murabbi-group"],
    queryFn: () => fetch("/api/admin/groups").then((r) => r.json()),
    enabled: visible && mode === "read_only" && sessionStatus === "authenticated",
    staleTime: 5 * 60 * 1000,
  });

  // -----------------------------------------------------------------------
  // Initialization: pre-select locked values from session assignments
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !user) return;
    if (initializedRef.current) return;

    if (mode === "city_locked") {
      // city_head: lock city
      if (user.assignedCityId) {
        setSelectedCity(user.assignedCityId);
      }
      initializedRef.current = true;
    } else if (mode === "park_locked") {
      // park_admin / park_lead: lock city + park
      if (user.assignedCityId && user.assignedParkId) {
        setSelectedCity(user.assignedCityId);
        setSelectedPark(user.assignedParkId);
      }
      initializedRef.current = true;
    } else if (mode === "read_only") {
      // murabbi: lock city + park + group (batch discovered from group)
      if (user.assignedCityId && user.assignedParkId && user.assignedGroupId) {
        setSelectedCity(user.assignedCityId);
        setSelectedPark(user.assignedParkId);
        setSelectedGroup(user.assignedGroupId);
      }
      initializedRef.current = true;
    }
  }, [sessionStatus, user, mode, setSelectedCity, setSelectedPark, setSelectedGroup]);

  // For murabbi: set batchId once we have the group data
  useEffect(() => {
    if (mode !== "read_only") return;
    if (murabbiGroupsLoading || murabbiGroups.length === 0) return;
    if (!selectedGroupId) return;

    const myGroup = murabbiGroups.find((g) => g.id === selectedGroupId);
    if (myGroup && myGroup.batchId && !selectedBatchId) {
      setSelectedBatch(myGroup.batchId);
    }
  }, [mode, murabbiGroups, murabbiGroupsLoading, selectedGroupId, selectedBatchId, setSelectedBatch]);

  // -----------------------------------------------------------------------
  // Don't render for non-staff roles
  // -----------------------------------------------------------------------

  if (!visible || sessionStatus === "loading") return null;

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleCityChange = (id: string) => {
    setSelectedCity(id);
  };

  const handleParkChange = (id: string) => {
    setSelectedPark(id);
  };

  const handleBatchChange = (id: string) => {
    setSelectedBatch(id);
  };

  const handleGroupChange = (id: string) => {
    setSelectedGroup(id);
  };

  const handleClear = () => {
    if (mode === "full") {
      setSelectedCity(null);
    } else if (mode === "city_locked") {
      setSelectedPark(null);
    } else if (mode === "park_locked") {
      setSelectedBatch(null);
    }
    // read_only: no clear
  };

  const showClear =
    mode !== "read_only" &&
    (selectedCityId || selectedParkId || selectedBatchId || selectedGroupId);

  // -----------------------------------------------------------------------
  // Look up display names for locked levels
  // -----------------------------------------------------------------------

  const cityDisplay = cities.find((c) => c.id === selectedCityId)?.name
    ?? allParks.find((p) => p.id === selectedParkId)?.city.name
    ?? "";

  const parkDisplay = allParks.find((p) => p.id === selectedParkId)?.name ?? "";

  const batchDisplay = batches.find((b) => b.id === selectedBatchId)?.name
    ?? murabbiGroups.find((g) => g.id === selectedGroupId)?.batch?.name
    ?? ""; // Note: group response has batch.name

  const groupDisplay = groups.find((g) => g.id === selectedGroupId)?.name
    ?? murabbiGroups.find((g) => g.id === selectedGroupId)?.name
    ?? "";

  // -----------------------------------------------------------------------
  // Determine locked state per level
  // -----------------------------------------------------------------------

  const cityDisabled = mode !== "full";
  const parkDisabled = mode === "park_locked" || mode === "read_only";
  const batchDisabled = mode === "read_only";
  const groupDisabled = mode === "read_only";

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <nav
      aria-label="Scope selector"
      className="rounded-xl border bg-card p-3 md:p-4"
    >
      {/* Desktop: horizontal breadcrumb chain */}
      <div className="hidden md:flex md:items-center md:gap-2">
        {/* City */}
        <ScopeLevel
          icon={<Building2 className="size-3.5" />}
          label="City"
          value={selectedCityId}
          disabled={cityDisabled}
          loading={mode === "full" && citiesLoading}
          items={cities.map((c) => ({ id: c.id, name: c.name, count: c._count.parks }))}
          placeholder="Select City..."
          onChange={handleCityChange}
        />

        <Connector />

        {/* Park */}
        <ScopeLevel
          icon={<TreePine className="size-3.5" />}
          label="Park"
          value={selectedParkId}
          disabled={parkDisabled || !selectedCityId}
          loading={parksLoading && !!selectedCityId}
          items={parks.map((p) => ({ id: p.id, name: p.name }))}
          placeholder="Select Park..."
          onChange={handleParkChange}
        />

        <Connector />

        {/* Batch */}
        <ScopeLevel
          icon={<CalendarCheck className="size-3.5" />}
          label="Batch"
          value={selectedBatchId}
          disabled={batchDisabled || !selectedParkId}
          loading={batchesLoading && !!selectedParkId}
          items={batches.map((b) => ({
            id: b.id,
            name: b.name,
            count: b._count.groups,
          }))}
          placeholder="Select Batch..."
          onChange={handleBatchChange}
        />

        <Connector />

        {/* Group */}
        <ScopeLevel
          icon={<Users className="size-3.5" />}
          label="Group"
          value={selectedGroupId}
          disabled={groupDisabled || !selectedBatchId}
          loading={groupsLoading && !!selectedBatchId}
          items={groups.map((g) => ({
            id: g.id,
            name: g.name,
            count: g._count.participants,
          }))}
          placeholder="Select Group..."
          onChange={handleGroupChange}
        />

        {/* Clear button */}
        {showClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="ml-1 size-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear scope selection"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Mobile: stacked selects */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* City */}
        <ScopeLevel
          icon={<Building2 className="size-3.5" />}
          label="City"
          value={selectedCityId}
          disabled={cityDisabled}
          loading={mode === "full" && citiesLoading}
          items={cities.map((c) => ({ id: c.id, name: c.name, count: c._count.parks }))}
          placeholder="Select City..."
          onChange={handleCityChange}
        />

        {/* Park */}
        <div className={cn(!selectedCityId && "opacity-40 pointer-events-none")}>
          <ScopeLevel
            icon={<TreePine className="size-3.5" />}
            label="Park"
            value={selectedParkId}
            disabled={parkDisabled}
            loading={parksLoading}
            items={parks.map((p) => ({ id: p.id, name: p.name }))}
            placeholder="Select Park..."
            onChange={handleParkChange}
          />
        </div>

        {/* Batch */}
        <div className={cn(!selectedParkId && "opacity-40 pointer-events-none")}>
          <ScopeLevel
            icon={<CalendarCheck className="size-3.5" />}
            label="Batch"
            value={selectedBatchId}
            disabled={batchDisabled}
            loading={batchesLoading}
            items={batches.map((b) => ({
              id: b.id,
              name: b.name,
              count: b._count.groups,
            }))}
            placeholder="Select Batch..."
            onChange={handleBatchChange}
          />
        </div>

        {/* Group */}
        <div className={cn(!selectedBatchId && "opacity-40 pointer-events-none")}>
          <ScopeLevel
            icon={<Users className="size-3.5" />}
            label="Group"
            value={selectedGroupId}
            disabled={groupDisabled}
            loading={groupsLoading}
            items={groups.map((g) => ({
              id: g.id,
              name: g.name,
              count: g._count.participants,
            }))}
            placeholder="Select Group..."
            onChange={handleGroupChange}
          />
        </div>

        {/* Clear button */}
        {showClear && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="self-end text-muted-foreground hover:text-foreground"
            aria-label="Clear scope selection"
          >
            <X className="size-3.5 mr-1.5" />
            Clear
          </Button>
        )}
      </div>
    </nav>
  );
}