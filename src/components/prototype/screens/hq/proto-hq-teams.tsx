"use client";

import React from "react";
import { ArrowLeft, Users, BookOpen, Mic, Dumbbell, Video, Tent, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtoHqTeamsProps {
  onNavigate?: (screen: string) => void;
}

const TEAMS = [
  { id: 1, title: "Tadreeb", desc: "Curriculum & Character", lead: "Br. Ali Raza", members: 12, project: "Batch 4 Week 18 Planner", icon: BookOpen, color: "text-[#4B0A8F] bg-[#4B0A8F]/10 border-[#4B0A8F]/20" },
  { id: 2, title: "Skills", desc: "Public Speaking & Leadership", lead: "Br. Imran Shah", members: 9, project: "Speech Contest", icon: Mic, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  { id: 3, title: "Sports", desc: "Physical & Outdoor", lead: "Br. Usman Ali", members: 15, project: "Swimming & Hike", icon: Dumbbell, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { id: 4, title: "Media & Communications", desc: "Digital & Print", lead: "Br. Bilal Ahmed", members: 6, project: "Closing Ceremony Video", icon: Video, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { id: 5, title: "Muawin", desc: "Support & Logistics", lead: "Br. Kamran Asif", members: 8, project: "Venue Setup", icon: Tent, color: "text-[#D90429] bg-[#D90429]/10 border-[#D90429]/20" },
];

export function ProtoHqTeams({ onNavigate }: ProtoHqTeamsProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate?.("hq")}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Collaboration Teams</h1>
            <p className="text-xs text-muted-foreground">Sports, Skills, Tadreeb, Media, and Muawin</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {TEAMS.map(team => {
          const Icon = team.icon;
          return (
            <div key={team.id} className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", team.color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-lg">{team.title}</h3>
                  <p className="text-sm text-muted-foreground">{team.desc}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Lead</div>
                  <div className="text-sm font-semibold text-foreground truncate">{team.lead}</div>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Members</div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {team.members} Active
                  </div>
                </div>
              </div>

              <div className="bg-[#4B0A8F]/5 border border-[#4B0A8F]/10 rounded-xl p-3 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-[#4B0A8F] uppercase tracking-wider mb-0.5">Active Project</div>
                  <div className="text-sm font-medium text-foreground">{team.project}</div>
                </div>
              </div>

              <button className="w-full h-11 rounded-xl bg-muted/50 hover:bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-colors border border-border/50">
                <Plus className="w-4 h-4" />
                Manage Team
              </button>
            </div>
          );
        })}
      </main>
    </div>
  );
}
