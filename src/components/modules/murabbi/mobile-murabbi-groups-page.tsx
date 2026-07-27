"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Search,
  CheckCircle2,
  TreePine,
  CalendarCheck,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type GroupParticipant = {
  id: string;
  name: string;
};

type MurabbiGroup = {
  id: string;
  name: string;
  batchName: string;
  parkName: string;
  cityName: string;
  participantCount: number;
  participants: GroupParticipant[];
  lastAttendanceDate: string | null;
  lastAttendanceRate: number | null;
  lastEventId: string | null;
  lastEventClosed: boolean;
  totalEvents: number;
};

type GroupsData = {
  groups: MurabbiGroup[];
};

function MobileGroupCard({
  group,
  onMarkAttendance,
  index
}: {
  group: MurabbiGroup;
  onMarkAttendance: (g: MurabbiGroup) => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl bg-card border overflow-hidden"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#4B0A8F] dark:text-purple-300">{group.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{group.batchName}</p>
          </div>
          <Badge className="bg-[#4B0A8F]/10 text-[#4B0A8F] hover:bg-[#4B0A8F]/20 border-0 text-[10px] font-bold">
            <Users className="size-3 mr-1" />
            {group.participantCount}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2 min-h-[44px]">
            <TreePine className="size-4 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Park</p>
              <p className="text-xs font-semibold truncate">{group.parkName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-2 min-h-[44px]">
            <CalendarCheck className="size-4 text-sky-600" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Last Session</p>
              <p className="text-xs font-semibold truncate">{group.lastAttendanceDate || "N/A"}</p>
            </div>
          </div>
        </div>

        {group.lastAttendanceRate !== null && (
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-[10px] font-medium">
              <span className="text-muted-foreground">Last Attendance</span>
              <span className={group.lastAttendanceRate >= 80 ? "text-emerald-600" : group.lastAttendanceRate >= 50 ? "text-amber-600" : "text-red-600"}>
                {group.lastAttendanceRate}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full", group.lastAttendanceRate >= 80 ? "bg-emerald-500" : group.lastAttendanceRate >= 50 ? "bg-amber-500" : "bg-red-500")}
                style={{ width: `${group.lastAttendanceRate}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            className="flex-1 bg-[#4B0A8F] hover:bg-[#3A0870] text-white h-11 rounded-xl"
            onClick={() => onMarkAttendance(group)}
          >
            <CheckCircle2 className="size-4 mr-2" />
            Mark
          </Button>
          <Button 
            variant="outline"
            className="w-11 h-11 rounded-xl p-0 shrink-0"
            onClick={() => setExpanded(!expanded)}
          >
            <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
              <ChevronDown className="size-4" />
            </motion.div>
          </Button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t mt-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Members List
                </p>
                {group.participants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="size-6 rounded-full bg-[#4B0A8F]/10 text-[#4B0A8F] flex items-center justify-center text-[10px] font-bold">
                      {p.name.charAt(0)}
                    </div>
                    <span className="text-xs font-medium">{p.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function MobileMurabbiGroupsPage() {
  const { navigateTo, setSelectedGroup, setSelectedEventId } = useAppStore();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<GroupsData>({
    queryKey: ["murabbi-groups"],
    queryFn: () =>
      fetch("/api/murabbi/groups").then((r) => {
        if (!r.ok) throw new Error("Failed to load groups");
        return r.json();
      }),
    staleTime: 30000,
  });

  const groups = data?.groups ?? [];
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const handleMarkAttendance = (group: MurabbiGroup) => {
    if (group.lastEventId && !group.lastEventClosed) {
      setSelectedEventId(group.lastEventId);
    } else {
      setSelectedEventId(null);
    }
    setSelectedGroup(group.id);
    toast.success("Navigating to attendance for " + group.name);
    navigateTo("park-attendance-roster");
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-4 pb-3 px-4 border-b border-border/50 space-y-3">
        <h1 className="text-lg font-bold text-[#4B0A8F] dark:text-purple-300">My Groups</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 rounded-xl h-11 bg-card"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-2xl" />
          ))
        ) : filteredGroups.length > 0 ? (
          filteredGroups.map((group, index) => (
            <MobileGroupCard 
              key={group.id} 
              group={group} 
              onMarkAttendance={handleMarkAttendance} 
              index={index} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="size-12 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-sm">No groups found</p>
          </div>
        )}
        
        <div className="h-6" />
      </div>
    </div>
  );
}
