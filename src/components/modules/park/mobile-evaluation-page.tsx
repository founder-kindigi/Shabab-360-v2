"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ChevronLeft, Check, Plus, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

interface MobileEvaluationPageProps {
  parkId: string;
  parkName: string;
  onBack: () => void;
}

const MONTH_OPTIONS = [
  { label: "Sep 2026", month: 9, year: 2026 },
  { label: "Aug 2026", month: 8, year: 2026 },
  { label: "Jul 2026", month: 7, year: 2026 },
  { label: "Jun 2026", month: 6, year: 2026 },
  { label: "May 2026", month: 5, year: 2026 },
  { label: "Apr 2026", month: 4, year: 2026 },
];

interface ParticipantWithEvaluation {
  id: string;
  name: string;
  group?: { name: string };
  evaluations?: Array<{
    id: string;
    discipline: number;
    farmabardari: number;
    islah: number;
    ibadah: number;
    participation: number;
    comment: string;
  }>;
}

export function MobileEvaluationPage({ parkId, parkName, onBack }: MobileEvaluationPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const activeMonth = MONTH_OPTIONS[selectedMonthIndex];

  // Selected student for evaluation
  const [activeStudent, setActiveStudent] = useState<ParticipantWithEvaluation | null>(null);

  // Form states for slider values
  const [discipline, setDiscipline] = useState(7);
  const [farmabardari, setFarmabardari] = useState(8);
  const [islah, setIslah] = useState(7);
  const [ibadah, setIbadah] = useState(8);
  const [participation, setParticipation] = useState(9);
  const [comment, setComment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["park-evaluations", parkId, activeMonth.month, activeMonth.year],
    queryFn: async () => {
      const res = await fetch(
        `/api/park/evaluations?parkId=${encodeURIComponent(parkId)}&month=${activeMonth.month}&year=${activeMonth.year}`
      );
      if (!res.ok) throw new Error("Failed to load evaluations");
      return res.json() as Promise<{ participants: ParticipantWithEvaluation[] }>;
    },
  });

  const saveEvaluationMutation = useMutation({
    mutationFn: async () => {
      if (!activeStudent) return;
      setErrorMessage("");
      const res = await fetch("/api/park/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: activeStudent.id,
          parkId,
          month: activeMonth.month,
          year: activeMonth.year,
          discipline,
          farmabardari,
          islah,
          ibadah,
          participation,
          comment: comment.trim() || "Consistently performing well in tarbiyah and physical fitness.",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to save evaluation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["park-evaluations", parkId, activeMonth.month, activeMonth.year],
      });
      setActiveStudent(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to submit evaluation");
    },
  });

  const participants = data?.participants || [];
  const evaluatedCount = participants.filter((p) => p.evaluations && p.evaluations.length > 0).length;

  const handleOpenStudentSheet = (student: ParticipantWithEvaluation) => {
    setActiveStudent(student);
    const existing = student.evaluations?.[0];
    if (existing) {
      setDiscipline(existing.discipline);
      setFarmabardari(existing.farmabardari);
      setIslah(existing.islah);
      setIbadah(existing.ibadah);
      setParticipation(existing.participation);
      setComment(existing.comment);
    } else {
      setDiscipline(7);
      setFarmabardari(8);
      setIslah(7);
      setIbadah(8);
      setParticipation(9);
      setComment("");
    }
  };

  const userRole = (session?.user as any)?.role || "park_lead";
  const displayRole =
    userRole === "super_admin"
      ? "Main admin"
      : userRole === "park_lead"
      ? "Park Lead"
      : userRole === "murabbi"
      ? "Murabbi"
      : "Admin";

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-white">
      {/* Sticky Top Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 bg-white sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 -ml-1 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-black text-[#1F0860]">Evaluation</h1>
              <p className="text-xs text-slate-500 font-medium">{parkName}</p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px] px-2.5 py-0.5"
          >
            {displayRole}
          </Badge>
        </div>

        {/* Month Selector Pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {MONTH_OPTIONS.map((m, idx) => (
            <button
              key={m.label}
              onClick={() => setSelectedMonthIndex(idx)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedMonthIndex === idx
                  ? "bg-[#1F0860] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] font-bold text-slate-400 tracking-wider mt-3 uppercase">
          {activeMonth.label} · {evaluatedCount} of {participants.length} evaluated
        </p>
      </div>

      {/* Student List */}
      <div className="p-4 space-y-2.5 flex-1 pb-24">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No students registered in this park.
          </div>
        ) : (
          participants.map((student) => {
            const hasDone = Boolean(student.evaluations && student.evaluations.length > 0);
            return (
              <div
                key={student.id}
                onClick={() => handleOpenStudentSheet(student)}
                className="flex items-center justify-between p-3.5 border border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors bg-white shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 border border-slate-100">
                    <AvatarFallback className="bg-gradient-to-br from-[#1F0860] to-[#4B0A8F] text-white font-bold text-xs">
                      {student.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{student.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {student.group?.name || "Group"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasDone ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <Check className="w-3.5 h-3.5" /> Done
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                      Pending
                    </span>
                  )}
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    {hasDone ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Plus className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Evaluation Bottom Sheet */}
      {activeStudent && (
        <Sheet open={!!activeStudent} onOpenChange={(open) => !open && setActiveStudent(null)}>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto max-w-[460px] mx-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left text-[#1F0860] font-black text-xl">
                Evaluate Student
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 pb-6">
              {/* Student Info Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="font-black text-lg text-slate-900">{activeStudent.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeStudent.group?.name || "Group"} · {parkName}
                </p>
                <div className="mt-2.5 inline-block bg-white px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 text-[#1F0860]">
                  {activeMonth.label}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-5">
                <SliderRow
                  label="Discipline"
                  subtitle="Punctuality, conduct, routine"
                  value={discipline}
                  onChange={setDiscipline}
                />
                <SliderRow
                  label="Farmabardari"
                  subtitle="Obedience, responsiveness"
                  value={farmabardari}
                  onChange={setFarmabardari}
                />
                <SliderRow
                  label="Islah"
                  subtitle="Character & akhlaq improvement"
                  value={islah}
                  onChange={setIslah}
                />
                <SliderRow
                  label="Ibadah"
                  subtitle="Salah & religious practice"
                  value={ibadah}
                  onChange={setIbadah}
                />
                <SliderRow
                  label="Participation"
                  subtitle="Exercise, sports, activities"
                  value={participation}
                  onChange={setParticipation}
                />
              </div>

              {/* Comment Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase">Comments</label>
                  <span className="text-[11px] text-slate-400">{comment.length} chars</span>
                </div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe progress, areas needing work, attitude, and engagement..."
                  className="min-h-[100px] resize-none rounded-xl text-sm"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                onClick={() => saveEvaluationMutation.mutate()}
                disabled={saveEvaluationMutation.isPending}
                className="w-full h-12 bg-gradient-to-r from-[#1F0860] via-[#4B0A8F] to-[#D90429] hover:opacity-95 text-white font-bold rounded-xl shadow-lg"
              >
                {saveEvaluationMutation.isPending ? "Saving..." : "Update evaluation"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function SliderRow({
  label,
  subtitle,
  value,
  onChange,
}: {
  label: string;
  subtitle: string;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-sm text-slate-900">{label}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <span className="font-black text-[#1F0860] text-lg w-8 text-right">{value}</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4B0A8F]"
      />
      <div className="flex justify-between text-[11px] text-slate-400 font-medium px-1">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}
