"use client";

import { useState } from "react";
import { ChevronLeft, Check, Plus } from "lucide-react";
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

const MONTHS = ["Sep 2026", "Aug 2026", "Jul 2026", "Jun 2026", "May 2026", "Apr 2026"];

export function MobileEvaluationPage({ parkId, parkName, onBack }: MobileEvaluationPageProps) {
  const [activeMonth, setActiveMonth] = useState(MONTHS[0]);
  
  // Mock data
  const students = [
    { id: "1", name: "Ali Ahmed", year: "1st Year", murabbi: "Hassan Safi", phone: "07700900000", done: true },
    { id: "2", name: "Omar Tariq", year: "2nd Year", murabbi: "Hassan Safi", phone: "07700900001", done: false },
    { id: "3", name: "Zaid Khan", year: "1st Year", murabbi: "Zaid Omar", phone: "07700900002", done: false },
  ];

  const doneCount = students.filter(s => s.done).length;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 -ml-1 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#1F0860]">Evaluation</h1>
              <p className="text-xs text-gray-500 font-medium">{parkName}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-[#4B0A8F]/10 text-[#4B0A8F] hover:bg-[#4B0A8F]/20 font-semibold">
            Murabbi
          </Badge>
        </div>

        {/* Month Selector */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {MONTHS.map((month) => (
            <button
              key={month}
              onClick={() => setActiveMonth(month)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeMonth === month
                  ? "bg-[#1F0860] text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {month}
            </button>
          ))}
        </div>
        
        <p className="text-xs font-bold text-gray-400 tracking-wider mt-4 pb-2 uppercase">
          {activeMonth} · {doneCount} of {students.length} evaluated
        </p>
      </div>

      {/* Student List */}
      <div className="p-4 space-y-3">
        {students.map((student) => (
          <Sheet key={student.id}>
            <SheetTrigger asChild>
              <div className="flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-[#4B0A8F] text-white">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{student.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {student.done ? (
                        <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Done
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-orange-500">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  {student.done ? <Check className="w-4 h-4 text-green-600" /> : <Plus className="w-4 h-4" />}
                </div>
              </div>
            </SheetTrigger>
            
            {/* Evaluation Form Bottom Sheet */}
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-left text-[#1F0860]">Evaluate Student</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6 pb-6">
                {/* Student Info Card */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="font-bold text-lg">{student.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {student.year} · {student.murabbi} · {student.phone}
                  </p>
                  <div className="mt-3 inline-block bg-white px-3 py-1 rounded-md text-xs font-bold border">
                    {activeMonth}
                  </div>
                </div>

                {/* Sliders */}
                <div className="space-y-5">
                  <EvaluationSlider label="Discipline" subtitle="Punctuality, conduct, routine" />
                  <EvaluationSlider label="Farmabardari" subtitle="Obedience, responsiveness" />
                  <EvaluationSlider label="Islah" subtitle="Character & akhlaq improvement" />
                  <EvaluationSlider label="Ibadah" subtitle="Salah & religious practice" />
                  <EvaluationSlider label="Participation" subtitle="Exercise, sports, activities" />
                </div>

                {/* Comment Textarea */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Comments</label>
                  <Textarea 
                    placeholder="Minimum 200 characters — describe progress and what needs work."
                    className="min-h-[120px] resize-none"
                  />
                </div>

                <Button className="w-full bg-[#4B0A8F] hover:bg-[#1F0860] py-6 text-md font-bold shadow-md">
                  Update evaluation
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        ))}
      </div>
    </div>
  );
}

function EvaluationSlider({ label, subtitle }: { label: string, subtitle: string }) {
  const [val, setVal] = useState(5);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <span className="font-bold text-[#1F0860] text-lg w-8 text-right">{val}</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={val}
        onChange={(e) => setVal(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4B0A8F]"
      />
      <div className="flex justify-between text-xs text-gray-400 font-medium px-1">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}
