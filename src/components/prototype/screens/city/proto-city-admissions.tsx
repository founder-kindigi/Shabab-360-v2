"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { PROTO_ADMISSIONS, STATUS_COLORS } from "@/components/prototype/data/proto-data";
import { 
  ClipboardList, Search, Plus, Calendar,
  CheckCircle, XCircle, Clock, MapPin, Phone
} from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onNavigate?: (screen: string) => void;
}

const STAGES = [
  { id: "New", label: "New", count: 2 },
  { id: "Interview Scheduled", label: "Interview Scheduled", count: 1 },
  { id: "Interviewed", label: "Interviewed", count: 1 },
  { id: "Approved", label: "Approved", count: 1 },
  { id: "Enrolled", label: "Enrolled", count: 1 },
  { id: "Hold", label: "Hold", count: 1 },
  { id: "Rejected", label: "Rejected", count: 1 },
];

export function ProtoCityAdmissions({ onNavigate }: Props) {
  const [activeStage, setActiveStage] = useState("New");

  const filteredAdmissions = PROTO_ADMISSIONS?.filter(a => a.status === activeStage) || [];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="bg-card border-b border-border/70 px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1F0860]/10 text-[#1F0860] rounded-xl">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admissions</h1>
              <p className="text-xs text-muted-foreground">Pipeline & Processing</p>
            </div>
          </div>
          <button className="h-10 w-10 rounded-full border border-border flex items-center justify-center bg-background">
            <Search size={18} />
          </button>
        </div>

        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 -mx-4 px-4">
          {STAGES.map((stage) => (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                activeStage === stage.id 
                  ? "bg-[#1F0860] text-white border-[#1F0860]" 
                  : "bg-background text-foreground border-border hover:bg-secondary"
              )}
            >
              {stage.label}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-bold",
                activeStage === stage.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {stage.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 pb-24">
        {filteredAdmissions.length > 0 ? (
          filteredAdmissions.map((applicant) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={applicant.id} 
              className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#4B0A8F] to-[#D90429] flex items-center justify-center text-white font-bold text-lg shadow-inner">
                    {applicant.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight">{applicant.name}</h3>
                    <p className="text-sm text-muted-foreground">Age {applicant.age} • Grade {applicant.grade}</p>
                  </div>
                </div>
                <span className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", STATUS_COLORS[applicant.status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800")}>
                  {applicant.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm bg-secondary/50 p-3 rounded-2xl">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone size={14} />
                  <span className="font-medium text-foreground">{applicant.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={14} />
                  <span className="font-medium text-foreground truncate">{applicant.parkAssigned || "Unassigned"}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {applicant.status === "New" && (
                  <>
                    <button className="flex-1 h-11 bg-[#1F0860] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                      <Calendar size={16} /> Schedule
                    </button>
                    <button className="h-11 px-4 bg-secondary text-foreground rounded-xl font-medium text-sm border border-border">
                      View
                    </button>
                  </>
                )}
                {applicant.status === "Interviewed" && (
                  <>
                    <button className="flex-1 h-11 bg-green-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button className="h-11 px-4 bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium text-sm">
                      Reject
                    </button>
                  </>
                )}
                {(applicant.status !== "New" && applicant.status !== "Interviewed") && (
                  <button className="w-full h-11 bg-secondary text-foreground rounded-xl font-medium text-sm border border-border">
                    View Application Detail
                  </button>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center text-muted-foreground mb-4">
              <ClipboardList size={32} />
            </div>
            <h3 className="text-lg font-bold text-foreground">No applications</h3>
            <p className="text-sm text-muted-foreground mt-1">There are no applications in the '{activeStage}' stage currently.</p>
          </div>
        )}
      </div>

      <button className="fixed bottom-6 right-4 h-14 bg-[#D90429] text-white px-6 rounded-full shadow-lg flex items-center justify-center gap-2 font-bold text-sm z-50 hover:bg-[#b00320] active:scale-95 transition-all">
        <Plus size={20} />
        New Application
      </button>
    </div>
  );
}
