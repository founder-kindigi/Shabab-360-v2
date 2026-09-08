"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  User,
  Search,
  GraduationCap,
  Sparkles,
  BookOpen,
  CalendarCheck,
  Award,
  Users,
  Building2,
  Phone,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StudentProfilePage as ExtendedProfilePage } from "@/components/modules/student-profile/profile-page";
import { StudentProfilePage as SelfProfilePage } from "@/components/modules/student/student-profile-page";
import { cn } from "@/lib/utils";

interface MobileStudentProfileViewProps {
  participantId?: string | null;
  participantName?: string | null;
  effectiveRole: string;
  onBack: () => void;
  onSelectParticipant?: (id: string, name: string) => void;
}

export function MobileStudentProfileView({
  participantId: initialParticipantId,
  participantName: initialParticipantName,
  effectiveRole,
  onBack,
  onSelectParticipant,
}: MobileStudentProfileViewProps) {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(
    initialParticipantId || null
  );
  const [activeParticipantName, setActiveParticipantName] = useState<string | null>(
    initialParticipantName || null
  );
  const [viewMode, setViewMode] = useState<"extended" | "overview">("extended");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParkFilter, setSelectedParkFilter] = useState("all");

  // Determine effective participant ID for students
  const isStudentSelf = effectiveRole === "student";
  const targetParticipantId = activeParticipantId || (isStudentSelf ? user?.participantId || "" : "");

  // Query for student directory list when no participant is selected yet
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["all-students-directory", selectedParkFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await fetch(`/api/admin/students?${params}`);
      if (!res.ok) return null;
      return res.json() as Promise<{
        students: Array<{
          id: string;
          name: string;
          phone: string | null;
          state: string;
          group?: {
            name: string;
            batch?: {
              park?: { id: string; name: string };
            };
          };
        }>;
      }>;
    },
    enabled: !targetParticipantId && !isStudentSelf,
    staleTime: 60000,
  });

  const studentsList = studentsData?.students || [];
  const filteredStudents = selectedParkFilter === "all"
    ? studentsList
    : studentsList.filter((s) =>
        s.group?.batch?.park?.name?.toLowerCase().includes(selectedParkFilter.toLowerCase())
      );

  const capabilities = {
    canView: true,
    canManage: ["super_admin", "program_admin", "city_head", "park_lead", "murabbi"].includes(effectiveRole),
    canViewSensitive: true,
    canManageSensitive: ["super_admin", "program_admin"].includes(effectiveRole),
  };

  // ─── IF NO PARTICIPANT SELECTED & NOT SELF-STUDENT: SHABAB SELECTOR ──────────
  if (!targetParticipantId && !isStudentSelf) {
    return (
      <div className="w-full max-w-[460px] mx-auto min-h-screen bg-slate-50 dark:bg-[#0c0817] text-slate-900 dark:text-slate-100 pb-28 select-none flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-[#180E30] border-b border-slate-100 dark:border-white/10 px-5 pt-6 pb-4 sticky top-0 z-20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="p-1 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="size-6" />
              </button>
              <div>
                <h1 className="text-xl font-black text-[#1F0860] dark:text-purple-200 tracking-tight">
                  Shabab Profiles
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  Select any of the 288 Shabab to view 6-tab profile
                </p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-purple-50 dark:bg-purple-950/40 text-[#4B0A8F] dark:text-purple-300 border-purple-200 dark:border-purple-800 font-bold text-xs"
            >
              Tarbiyah Desk
            </Badge>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="size-4 absolute left-3 top-3 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Shabab by name or phone..."
              className="pl-9 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border-transparent text-sm"
            />
          </div>

          {/* Park Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 pb-1">
            {[
              { id: "all", label: "All Parks" },
              { id: "gulberg", label: "Gulberg" },
              { id: "gulshan iqbal", label: "Gulshan Iqbal" },
              { id: "griffin", label: "Griffin" },
              { id: "johar", label: "Johar Town" },
              { id: "ravi", label: "Gulshan Ravi" },
              { id: "state life", label: "State Life" },
            ].map((p) => {
              const isSelected = selectedParkFilter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedParkFilter(p.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all active:scale-95",
                    isSelected
                      ? "bg-[#4B0A8F] text-white shadow-sm"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shabab List */}
        <div className="p-4 flex-1 space-y-2.5 overflow-y-auto">
          {isLoadingStudents ? (
            <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
              <div className="size-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading Shabab directory...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No Shabab matching your search.
            </div>
          ) : (
            filteredStudents.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setActiveParticipantId(s.id);
                  setActiveParticipantName(s.name);
                  if (onSelectParticipant) onSelectParticipant(s.id, s.name);
                }}
                className="p-3 rounded-2xl bg-white dark:bg-[#180E30] border border-slate-100 dark:border-white/10 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:border-purple-300 dark:hover:border-purple-800 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-10 border border-slate-100 dark:border-white/10 shrink-0">
                    <AvatarFallback className="bg-purple-100 dark:bg-purple-950/60 text-[#4B0A8F] dark:text-purple-300 font-bold text-xs">
                      {s.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {s.group?.name || "Group"} • {s.group?.batch?.park?.name || "Lahore"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-[#4B0A8F] dark:text-purple-300 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800">
                    Open Profile →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── SHABAB PROFILE VIEW (EXTENDED OR SELF) ─────────────────────────────────
  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-slate-50 dark:bg-[#0c0817] text-slate-900 dark:text-slate-100 pb-28 select-none flex flex-col">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#180E30] border-b border-slate-100 dark:border-white/10 px-5 pt-5 pb-3 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeParticipantId && !initialParticipantId && !isStudentSelf) {
                  // If picked from directory, return to directory
                  setActiveParticipantId(null);
                  setActiveParticipantName(null);
                } else {
                  onBack();
                }
              }}
              className="p-1 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="size-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-[#1F0860] dark:text-purple-200 tracking-tight truncate">
                {activeParticipantName || "Shabab Profile"}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {isStudentSelf ? "Personal Shabab Record" : "Tarbiyah & Character Evaluation"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isStudentSelf && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveParticipantId(null);
                  setActiveParticipantName(null);
                }}
                className="text-xs font-bold text-[#4B0A8F] dark:text-purple-300 hover:bg-purple-50 h-8 px-2"
              >
                Change Shabab
              </Button>
            )}
            <Badge
              variant="secondary"
              className="bg-purple-50 dark:bg-purple-950/40 text-[#4B0A8F] dark:text-purple-300 border-purple-200 dark:border-purple-800 font-bold text-xs"
            >
              Shabab
            </Badge>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setViewMode("extended")}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
              viewMode === "extended"
                ? "bg-[#180A40] text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            )}
          >
            <Sparkles className="size-3.5" />
            <span>6-Tab Tarbiyah Profile</span>
          </button>
          <button
            onClick={() => setViewMode("overview")}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
              viewMode === "overview"
                ? "bg-[#180A40] text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            )}
          >
            <User className="size-3.5" />
            <span>Overview & Attendance</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "extended" ? (
          targetParticipantId ? (
            <ExtendedProfilePage
              participantId={targetParticipantId}
              capabilities={capabilities}
            />
          ) : (
            <div className="p-6 text-center text-slate-400 text-sm">
              No participant ID found for extended profile.
            </div>
          )
        ) : (
          <SelfProfilePage />
        )}
      </div>
    </div>
  );
}
