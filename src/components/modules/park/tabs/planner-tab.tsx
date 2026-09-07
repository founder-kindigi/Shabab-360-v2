"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Calendar as CalendarIcon, FileText, Trash2, CalendarDays } from "lucide-react";

interface PlannerTabProps {
  parkId: string;
}

interface RoutineSlot {
  id: string;
  parkId: string;
  timeStart: string;
  timeEnd: string;
  activity: string;
  pdfLink?: string | null;
  sortOrder: number;
  isSpecialEvent: boolean;
}

export function PlannerTab({ parkId }: PlannerTabProps) {
  const queryClient = useQueryClient();

  // Modal open states
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  // Form states - Routine Slot
  const [timeStart, setTimeStart] = useState("10:00");
  const [timeEnd, setTimeEnd] = useState("11:00");
  const [activity, setActivity] = useState("");
  const [pdfLink, setPdfLink] = useState("");

  // Form states - Special Event
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDetails, setEventDetails] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["park-planner", parkId],
    queryFn: async () => {
      const res = await fetch(`/api/park/planner?parkId=${encodeURIComponent(parkId)}`);
      if (!res.ok) throw new Error("Failed to load planner data");
      return res.json() as Promise<{
        routineSlots: RoutineSlot[];
        specialEvents: RoutineSlot[];
      }>;
    },
  });

  const addSlotMutation = useMutation({
    mutationFn: async (payload: {
      timeStart: string;
      timeEnd: string;
      activity: string;
      pdfLink?: string;
      isSpecialEvent: boolean;
    }) => {
      const res = await fetch("/api/park/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parkId,
          ...payload,
        }),
      });
      if (!res.ok) throw new Error("Failed to create slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["park-planner", parkId] });
      setIsAddSlotOpen(false);
      setIsAddEventOpen(false);
      setActivity("");
      setPdfLink("");
      setEventTitle("");
      setEventDetails("");
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/park/planner?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete slot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["park-planner", parkId] });
    },
  });

  const routineSlots = data?.routineSlots || [];
  const specialEvents = data?.specialEvents || [];

  return (
    <div className="space-y-8 pb-24">
      {/* Weekly Routine */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            WEEKLY ROUTINE
          </h3>
          <span className="text-xs text-slate-400">{routineSlots.length} slots</span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : routineSlots.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
            No routine set for this park yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {routineSlots.map((slot) => (
              <Card key={slot.id} className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#1F0860]/10 p-2.5 rounded-xl">
                      <Clock className="w-4 h-4 text-[#1F0860]" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {slot.timeStart} – {slot.timeEnd}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">{slot.activity}</p>
                      {slot.pdfLink && (
                        <a
                          href={slot.pdfLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#4B0A8F] hover:underline mt-0.5"
                        >
                          <FileText className="w-3 h-3" /> View attachment
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSlotMutation.mutate(slot.id)}
                    className="text-slate-400 hover:text-red-600 rounded-full h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Sheet open={isAddSlotOpen} onOpenChange={setIsAddSlotOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-dashed border-2 border-purple-200 text-[#4B0A8F] hover:bg-purple-50/50 font-bold py-5 rounded-2xl text-sm"
            >
              + Add routine slot
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left font-bold text-lg">Add Routine Slot</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Time start</Label>
                  <Input
                    type="time"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">Time end</Label>
                  <Input
                    type="time"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Activity</Label>
                <Input
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="E.g. Tarbiyah, Football, Nazm"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">PDF / Guide link (optional)</Label>
                <Input
                  value={pdfLink}
                  onChange={(e) => setPdfLink(e.target.value)}
                  placeholder="https://..."
                  className="h-11"
                />
              </div>
              <Button
                onClick={() =>
                  addSlotMutation.mutate({
                    timeStart,
                    timeEnd,
                    activity,
                    pdfLink: pdfLink || undefined,
                    isSpecialEvent: false,
                  })
                }
                disabled={!activity || addSlotMutation.isPending}
                className="w-full h-11 bg-[#4B0A8F] hover:bg-[#3d0874] text-white font-bold rounded-xl mt-3"
              >
                {addSlotMutation.isPending ? "Saving..." : "Save Slot"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Special Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            SPECIAL EVENTS
          </h3>
          <span className="text-xs text-slate-400">{specialEvents.length} events</span>
        </div>

        {specialEvents.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
            No events. Add camping, swimming, or a full-day override.
          </div>
        ) : (
          <div className="space-y-2.5">
            {specialEvents.map((ev) => (
              <Card key={ev.id} className="border border-red-100 shadow-sm rounded-2xl overflow-hidden bg-red-50/20">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#D90429]/10 p-2.5 rounded-xl">
                      <CalendarDays className="w-4 h-4 text-[#D90429]" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{ev.activity}</p>
                      <p className="text-xs text-slate-500">
                        {ev.timeStart} {ev.timeEnd ? `– ${ev.timeEnd}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSlotMutation.mutate(ev.id)}
                    className="text-slate-400 hover:text-red-600 rounded-full h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Sheet open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-dashed border-2 border-red-200 text-[#D90429] hover:bg-red-50/50 font-bold py-5 rounded-2xl text-sm"
            >
              + Add special event
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left font-bold text-lg">Add Special Event</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Event Title</Label>
                <Input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="E.g. Summer Camp, Swimming Day"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Date / Timing</Label>
                <Input
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="E.g. Sunday 15 Sept (Full Day)"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Activity Details</Label>
                <Input
                  value={eventDetails}
                  onChange={(e) => setEventDetails(e.target.value)}
                  placeholder="Details, venue, instructions..."
                  className="h-11"
                />
              </div>
              <Button
                onClick={() =>
                  addSlotMutation.mutate({
                    timeStart: eventDate || "Full Day",
                    timeEnd: "",
                    activity: `${eventTitle} - ${eventDetails}`,
                    isSpecialEvent: true,
                  })
                }
                disabled={!eventTitle || addSlotMutation.isPending}
                className="w-full h-11 bg-[#D90429] hover:bg-red-700 text-white font-bold rounded-xl mt-3"
              >
                {addSlotMutation.isPending ? "Saving..." : "Save Event"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
