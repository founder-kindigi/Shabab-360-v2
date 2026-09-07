"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Calendar as CalendarIcon, FileText, Trash2 } from "lucide-react";

export function PlannerTab({ parkId }: { parkId: string }) {
  const { data: planner = { routine: [], specialEvents: [] } } = useQuery({
    queryKey: ["park-planner", parkId],
    queryFn: async () => {
      return {
        routine: [
          { id: "1", timeRange: "10:00 AM - 11:00 AM", activity: "Tarbiyah" },
          { id: "2", timeRange: "11:00 AM - 12:30 PM", activity: "Football" },
        ],
        specialEvents: []
      };
    },
    initialData: {
      routine: [
        { id: "1", timeRange: "10:00 AM - 11:00 AM", activity: "Tarbiyah" },
        { id: "2", timeRange: "11:00 AM - 12:30 PM", activity: "Football" },
      ],
      specialEvents: []
    }
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Weekly Routine */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 tracking-wider">WEEKLY ROUTINE</h3>
        {planner.routine.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No routine set.
          </div>
        ) : (
          <div className="space-y-2">
            {planner.routine.map((slot) => (
              <Card key={slot.id} className="shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#1F0860]/10 p-2 rounded-lg">
                      <Clock className="w-4 h-4 text-[#1F0860]" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{slot.timeRange}</p>
                      <p className="text-xs text-gray-500">{slot.activity}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full border-dashed border-2 text-[#4B0A8F] font-semibold py-6">
              + Add routine slot
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="mb-4">
              <SheetTitle>Add Routine Slot</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Time start</Label>
                  <Input type="time" defaultValue="10:00" />
                </div>
                <div className="space-y-2">
                  <Label>Time end</Label>
                  <Input type="time" defaultValue="11:00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Activity</Label>
                <Input placeholder="E.g. Tarbiyah, Football, etc." />
              </div>
              <div className="space-y-2">
                <Label>PDF link (optional)</Label>
                <Input placeholder="https://..." />
              </div>
              <Button className="w-full bg-[#4B0A8F] mt-2">Save Slot</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Special Events */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400 tracking-wider">SPECIAL EVENTS</h3>
        {planner.specialEvents.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No events. Add camping, swimming, or a full-day override.
          </div>
        ) : (
          <div className="space-y-2">
            {planner.specialEvents.map((ev: any) => (
              <Card key={ev.id} className="shadow-sm">
                <CardContent className="p-3">
                  <p className="font-semibold">{ev.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full border-dashed border-2 text-[#D90429] font-semibold py-6">
              + Add special event
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="mb-4">
              <SheetTitle>Add Special Event</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Event Title</Label>
                <Input placeholder="E.g. Summer Camp" />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-gray-50">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Select Date...</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Activity Details</Label>
                <Input placeholder="Details..." />
              </div>
              <Button className="w-full bg-[#D90429] hover:bg-red-700 mt-2">Save Event</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
