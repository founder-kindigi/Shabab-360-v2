"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export function AttendanceTab({ parkId }: { parkId: string }) {
  const [murabbiAtt, setMurabbiAtt] = useState<Record<string, "P" | "A">>({});
  const [studentAtt, setStudentAtt] = useState<Record<string, "P" | "A">>({});

  const { data: attendanceData } = useQuery({
    queryKey: ["park-attendance", parkId],
    queryFn: async () => {
      // Mocked response for now
      return {
        date: "04/09/2026",
        stats: { studentsPresent: 0, studentsTotal: 69, murabbisPresent: 0, murabbisTotal: 12 },
        murabbis: [
          {
            id: "m1",
            name: "Hassan Safi",
            role: "MURABBI",
            studentsCount: 12,
            students: [
              { id: "s1", name: "Ali Ahmed", allTime: 80 },
              { id: "s2", name: "Zaid Khan", allTime: 60 },
              { id: "s3", name: "Omar Tariq", allTime: 40 },
            ],
          },
        ],
      };
    },
    initialData: {
      date: "04/09/2026",
      stats: { studentsPresent: 0, studentsTotal: 69, murabbisPresent: 0, murabbisTotal: 12 },
      murabbis: [
        {
          id: "m1",
          name: "Hassan Safi",
          role: "MURABBI",
          studentsCount: 12,
          students: [
            { id: "s1", name: "Ali Ahmed", allTime: 80 },
            { id: "s2", name: "Zaid Khan", allTime: 60 },
            { id: "s3", name: "Omar Tariq", allTime: 40 },
          ],
        },
      ],
    },
  });

  const toggleMurabbi = (id: string, status: "P" | "A") => {
    setMurabbiAtt((prev) => ({ ...prev, [id]: status }));
  };

  const toggleStudent = (id: string, status: "P" | "A") => {
    setStudentAtt((prev) => ({ ...prev, [id]: status }));
  };

  const getBarColor = (val: number) => {
    if (val < 50) return "bg-[#D90429]";
    if (val < 75) return "bg-orange-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="font-semibold">{attendanceData.date}</span>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          Students {attendanceData.stats.studentsPresent}/{attendanceData.stats.studentsTotal} · Murabbis{" "}
          {attendanceData.stats.murabbisPresent}/{attendanceData.stats.murabbisTotal}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 tracking-wider">MURABBI ATTENDANCE</h3>
        <div className="space-y-3">
          {attendanceData.murabbis.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-[#1F0860] text-white">
                    {m.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.role}</p>
                </div>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => toggleMurabbi(m.id, "P")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    murabbiAtt[m.id] === "P"
                      ? "bg-green-500 text-white shadow"
                      : "text-gray-600"
                  }`}
                >
                  Present
                </button>
                <button
                  onClick={() => toggleMurabbi(m.id, "A")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    murabbiAtt[m.id] === "A"
                      ? "bg-[#D90429] text-white shadow"
                      : "text-gray-600"
                  }`}
                >
                  Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {attendanceData.murabbis.map((m) => (
        <div key={m.id} className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">
            {m.name} — {m.role} ({m.studentsCount})
          </h3>
          <div className="space-y-3">
            {m.students.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-[#4B0A8F] text-white text-xs">
                      {s.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${getBarColor(s.allTime)}`}
                        style={{ width: `${s.allTime}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => toggleStudent(s.id, "P")}
                    className={`w-8 py-1 rounded-md text-xs font-bold transition-colors ${
                      studentAtt[s.id] === "P"
                        ? "bg-green-500 text-white shadow"
                        : "text-gray-600"
                    }`}
                  >
                    P
                  </button>
                  <button
                    onClick={() => toggleStudent(s.id, "A")}
                    className={`w-8 py-1 rounded-md text-xs font-bold transition-colors ${
                      studentAtt[s.id] === "A"
                        ? "bg-[#D90429] text-white shadow"
                        : "text-gray-600"
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

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium">All saved</span>
        <Button className="bg-gradient-to-r from-[#1F0860] to-[#4B0A8F] text-white border-0">
          Save attendance
        </Button>
      </div>
    </div>
  );
}
