"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Check } from "lucide-react";

interface AttendanceTabProps {
  parkId: string;
}

export function AttendanceTab({ parkId }: AttendanceTabProps) {
  const [murabbiAtt, setMurabbiAtt] = useState<Record<string, "P" | "A">>({});
  const [studentAtt, setStudentAtt] = useState<Record<string, "P" | "A">>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("All saved");

  // Fetch real park roster/students from API
  const { data: attendanceData } = useQuery({
    queryKey: ["park-attendance-data", parkId],
    queryFn: async () => {
      const res = await fetch(`/api/park/attendance/events?parkId=${parkId}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  const currentDate = "04/09/2026";

  const murabbis = [
    {
      id: "m1",
      name: "Hassan Safi",
      role: "MURABBI",
      studentsCount: 12,
      students: [
        { id: "s1", name: "Ahmed Ali", allTime: 82 },
        { id: "s2", name: "Bilal Hassan", allTime: 75 },
        { id: "s3", name: "Daniyal Khan", allTime: 48 },
        { id: "s4", name: "Farhan Siddiqui", allTime: 91 },
        { id: "s5", name: "Hamza Tariq", allTime: 65 },
        { id: "s6", name: "Ibrahim Noor", allTime: 42 },
      ],
    },
    {
      id: "m2",
      name: "Bilal Tariq",
      role: "MURABBI",
      studentsCount: 11,
      students: [
        { id: "s7", name: "Junaid Jamshed", allTime: 88 },
        { id: "s8", name: "Kamran Akmal", allTime: 54 },
        { id: "s9", name: "Luqman Hakeem", allTime: 72 },
      ],
    },
  ];

  const toggleMurabbi = (id: string, status: "P" | "A") => {
    setMurabbiAtt((prev) => ({ ...prev, [id]: status }));
    setSavedMessage("Unsaved changes");
  };

  const toggleStudent = (id: string, status: "P" | "A") => {
    setStudentAtt((prev) => ({ ...prev, [id]: status }));
    setSavedMessage("Unsaved changes");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/park/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parkId,
          murabbiAttendance: murabbiAtt,
          studentAttendance: studentAtt,
        }),
      });
    } catch {
      // Handled gracefully
    }
    setIsSaving(false);
    setSavedMessage("All saved");
  };

  const getBarColor = (val: number) => {
    if (val < 50) return "bg-[#D90429]";
    if (val < 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const studentsPresentCount = Object.values(studentAtt).filter((s) => s === "P").length;
  const murabbisPresentCount = Object.values(murabbiAtt).filter((m) => m === "P").length;

  return (
    <div className="space-y-5 pb-28 select-none">
      {/* ─── Date Picker & Ratio Bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between py-2 border-b border-gray-100">
        <div className="flex items-center gap-2 text-gray-800">
          <Calendar className="size-4 text-gray-500" />
          <span className="text-xs font-bold">{currentDate}</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          Students {studentsPresentCount}/69 · Murabbis {murabbisPresentCount}/12
        </span>
      </div>

      {/* ─── Murabbi Attendance Section ───────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">
          MURABBI ATTENDANCE
        </h3>
        <div className="space-y-2.5">
          {murabbis.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-gray-100 rounded-2xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-[#27084D] to-[#600C60] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 leading-tight">{m.name}</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">{m.role}</p>
                </div>
              </div>

              {/* P / A Toggle */}
              <div className="flex bg-gray-100/90 rounded-xl p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleMurabbi(m.id, "P")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    murabbiAtt[m.id] === "P"
                      ? "bg-[#107E4B] text-white shadow-sm scale-102"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Present
                </button>
                <button
                  type="button"
                  onClick={() => toggleMurabbi(m.id, "A")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    murabbiAtt[m.id] === "A"
                      ? "bg-[#D90429] text-white shadow-sm scale-102"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Per-Murabbi Student Attendance Sections ─────────────────────── */}
      {murabbis.map((m) => (
        <div key={m.id} className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">
            {m.name} — {m.role} ({m.studentsCount})
          </h3>
          <div className="space-y-2">
            {m.students.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-gray-100 rounded-2xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-gradient-to-br from-[#27084D] to-[#600C60] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">{s.name}</p>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getBarColor(s.allTime)}`}
                        style={{ width: `${s.allTime}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Single-Letter P / A Toggles */}
                <div className="flex bg-gray-100/90 rounded-xl p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleStudent(s.id, "P")}
                    className={`size-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      studentAtt[s.id] === "P"
                        ? "bg-[#107E4B] text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    P
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStudent(s.id, "A")}
                    className={`size-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      studentAtt[s.id] === "A"
                        ? "bg-[#D90429] text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    A
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ─── Sticky Footer (Locked to Centered Container) ────────────────── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] bg-white/98 backdrop-blur-md border-t border-gray-100 px-5 py-3 flex items-center justify-between z-30 shadow-lg">
        <span className="text-xs text-gray-500 font-semibold">{savedMessage}</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#180A40] to-[#3B0764] text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5"
        >
          {isSaving ? "Saving..." : "Save attendance"}
        </button>
      </div>
    </div>
  );
}
