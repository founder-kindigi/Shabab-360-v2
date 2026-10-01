"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileEdit,
  MapPin,
  Calendar,
  Phone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_ADMISSIONS, STATUS_COLORS } from "@/components/prototype/data/proto-data";

interface ProtoHqAdmissionsProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoHqAdmissions({ onNavigate }: ProtoHqAdmissionsProps) {
  const [activeTab, setActiveTab] = useState("All");

  const tabs = ["All", "New", "Interview", "Approved", "Enrolled", "Hold/Rejected"];

  const filteredAdmissions = PROTO_ADMISSIONS.filter(adm => {
    if (activeTab === "All") return true;
    if (activeTab === "Interview" && (adm.status === "Interview Scheduled" || adm.status === "Interviewed")) return true;
    if (activeTab === "Hold/Rejected" && (adm.status === "Hold" || adm.status === "Rejected")) return true;
    return adm.status === activeTab;
  });

  const stats = {
    total: PROTO_ADMISSIONS.length,
    enrolled: PROTO_ADMISSIONS.filter(a => a.status === "Enrolled").length,
    pipeline: PROTO_ADMISSIONS.filter(a => ["New", "Interview Scheduled", "Interviewed", "Approved"].includes(a.status)).length,
    rejected: PROTO_ADMISSIONS.filter(a => ["Hold", "Rejected"].includes(a.status)).length,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border/70 sticky top-0 z-20">
        <div className="flex items-center gap-3 p-4">
          <button 
            onClick={() => onNavigate?.('hq-dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Admissions Oversight</h1>
            <p className="text-xs text-muted-foreground">National View</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Summary Strip */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card border border-border/70 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total</span>
            <span className="text-xl font-bold">{stats.total}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Enrolled</span>
            <span className="text-xl font-bold text-teal-600">{stats.enrolled}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Pipeline</span>
            <span className="text-xl font-bold text-blue-600">{stats.pipeline}</span>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Hold/Rej</span>
            <span className="text-xl font-bold text-rose-600">{stats.rejected}</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                  activeTab === tab 
                    ? "bg-foreground text-background border-foreground" 
                    : "bg-card text-muted-foreground border-border/70 hover:bg-secondary"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <motion.div 
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={activeTab}
        >
          {filteredAdmissions.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-3">
                <FileEdit className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No applications found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try selecting a different filter.</p>
            </div>
          ) : (
            filteredAdmissions.map((adm) => (
              <motion.div 
                key={adm.id} 
                variants={itemVariants}
                className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-base">{adm.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <span>Age {adm.age}</span>
                      <span>•</span>
                      <span>{adm.grade} Grade</span>
                    </div>
                  </div>
                  <span className={cn(
                    "inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                    STATUS_COLORS[adm.status] || "bg-secondary text-foreground"
                  )}>
                    {adm.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="font-medium text-foreground">{adm.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-medium text-foreground">{adm.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="font-medium text-foreground">
                      {adm.park ? `${adm.park}` : "Unassigned"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
