"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, ExternalLink, Calendar as CalendarIcon, UploadCloud } from "lucide-react";

interface LessonsTabProps {
  parkId: string;
}

export function LessonsTab({ parkId }: LessonsTabProps) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("All");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"Tarbiyah" | "Activity">("Tarbiyah");
  const [lessonDate, setLessonDate] = useState("2026-09-04");
  const [driveLink, setDriveLink] = useState("");

  // Fetch real lessons from database API
  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["park-lessons", parkId],
    queryFn: async () => {
      const res = await fetch(`/api/park/lessons?parkId=${parkId}`);
      if (!res.ok) return [];
      return res.json();
    },
    initialData: [
      { id: "l1", title: "Importance of Discipline & Character", type: "Tarbiyah", lessonDate: "2026-09-04T00:00:00.000Z", driveLink: "https://drive.google.com" },
      { id: "l2", title: "Football Agility & Relay Drills", type: "Activity", lessonDate: "2026-09-05T00:00:00.000Z" },
    ],
  });

  // Create lesson mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/park/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create lesson");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["park-lessons", parkId] });
      setShowAddSheet(false);
      setTitle("");
      setDriveLink("");
    },
  });

  // Delete lesson mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/park/lessons?id=${id}&parkId=${parkId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete lesson");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["park-lessons", parkId] });
    },
  });

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      parkId,
      title: title.trim(),
      type,
      lessonDate: new Date(lessonDate).toISOString(),
      driveLink: driveLink.trim() || undefined,
    });
  };

  const filteredLessons = lessons.filter(
    (l: any) => filter === "All" || l.type === filter
  );

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
    } catch {
      return "Fri 4 Sept";
    }
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* ─── Filter Pills Bar ────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {["All", "Tarbiyah", "Activity"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filter === f
                ? "bg-[#180A40] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ─── Lessons List ─────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {filteredLessons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-xs text-gray-400 font-medium">No lessons yet.</p>
          </div>
        ) : (
          filteredLessons.map((lesson: any) => (
            <div
              key={lesson.id}
              className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      lesson.type === "Tarbiyah"
                        ? "bg-purple-50 text-[#4B0A8F] border border-purple-200/60"
                        : "bg-amber-50 text-amber-700 border border-amber-200/60"
                    }`}
                  >
                    {lesson.type}
                  </span>
                  <span className="text-[11px] text-gray-400 font-normal">
                    {formatDate(lesson.lessonDate)}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-gray-900 truncate">{lesson.title}</h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {lesson.driveLink ? (
                  <a
                    href={lesson.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition-colors"
                  >
                    <span>Open</span>
                    <ExternalLink className="size-3 text-gray-400" />
                  </a>
                ) : (
                  <button
                    type="button"
                    className="px-3 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Open
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(lesson.id)}
                  aria-label="Delete lesson"
                  className="p-1 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Full-Width Gradient + Add Lesson Button ──────────────────────── */}
      <button
        type="button"
        onClick={() => setShowAddSheet(true)}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D90429] to-[#4B0A8F] text-white font-bold text-sm shadow-lg shadow-purple-900/25 active:scale-98 transition-all flex items-center justify-center gap-1.5"
      >
        <Plus className="size-4 stroke-[3]" />
        <span>Add lesson</span>
      </button>

      {/* ─── Add Lesson Bottom Sheet ──────────────────────────────────────── */}
      {showAddSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowAddSheet(false)}
          />
          <div className="w-full max-w-[460px] bg-white rounded-t-3xl z-10 p-6 shadow-2xl relative animate-in slide-in-from-bottom-5 duration-200">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add lesson</h2>
              <button
                type="button"
                onClick={() => setShowAddSheet(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddLesson} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Islamic History & Governance"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/40 focus:border-[#4B0A8F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
                  >
                    <option value="Tarbiyah">Tarbiyah</option>
                    <option value="Activity">Activity</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Google Drive link
                </label>
                <input
                  type="url"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/40 focus:border-[#4B0A8F]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  PDF document (optional)
                </label>
                <div className="border border-dashed border-gray-200 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100/80 cursor-pointer">
                  <UploadCloud className="size-4 text-gray-400" />
                  <span>Choose PDF file</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSheet(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#27084D] to-[#5C0A5F] text-white text-sm font-semibold shadow-md active:scale-98 transition-all"
                >
                  {createMutation.isPending ? "Adding..." : "Add lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
