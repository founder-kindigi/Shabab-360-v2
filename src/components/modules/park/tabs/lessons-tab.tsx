"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Calendar as CalendarIcon, FileText } from "lucide-react";

export function LessonsTab({ parkId }: { parkId: string }) {
  const [filter, setFilter] = useState("All");

  const { data: lessons = [] } = useQuery({
    queryKey: ["park-lessons", parkId],
    queryFn: async () => {
      // Mock fetch
      return [
        { id: "1", title: "Islamic History", type: "Tarbiyah", date: "Fri 4 Sept" },
        { id: "2", title: "Football Drills", type: "Activity", date: "Sat 5 Sept" },
      ];
    },
    initialData: [
      { id: "1", title: "Islamic History", type: "Tarbiyah", date: "Fri 4 Sept" },
      { id: "2", title: "Football Drills", type: "Activity", date: "Sat 5 Sept" },
    ],
  });

  const filteredLessons = lessons.filter(
    (l) => filter === "All" || l.type === filter
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {["All", "Tarbiyah", "Activity"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-[#1F0860] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredLessons.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">
            No lessons yet.
          </div>
        ) : (
          filteredLessons.map((lesson) => (
            <Card key={lesson.id} className="shadow-sm">
              <CardContent className="p-4 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {lesson.type}
                    </Badge>
                    <span className="text-xs text-gray-400 font-medium">
                      {lesson.date}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
                    Open
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Lesson Button & Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button className="w-full bg-gradient-to-r from-[#D90429] to-[#4B0A8F] text-white border-0 py-6 font-bold shadow-lg">
            + Add lesson
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Add lesson</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="E.g. Seerah Part 1" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tarbiyah">Tarbiyah</SelectItem>
                  <SelectItem value="Activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-gray-50">
                <CalendarIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Select Date...</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Google Drive Link</Label>
              <Input placeholder="https://drive.google.com/..." />
            </div>
            <div className="space-y-2">
              <Label>PDF File</Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-gray-500">
                <FileText className="w-6 h-6" />
                <span className="text-xs">Tap to upload PDF</span>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button className="flex-1 bg-[#4B0A8F] hover:bg-[#1F0860]">
                Add lesson
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
