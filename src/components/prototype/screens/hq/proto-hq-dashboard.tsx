"use client";

import { motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  Activity, 
  AlertCircle,
  TrendingUp,
  MapPin,
  ClipboardList,
  FileText,
  Megaphone,
  ChevronRight,
  ShieldCheck,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_CITIES } from "@/components/prototype/data/proto-data";

interface ProtoHqDashboardProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoHqDashboard({ onNavigate }: ProtoHqDashboardProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1F0860] to-[#4B0A8F] pt-12 pb-6 px-4 rounded-b-3xl text-white shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">National HQ</h1>
            <p className="text-white/80 text-sm mt-1">Shabab 360 Overview</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white/90">
          Program Head View
        </div>
      </div>

      <motion.div 
        className="flex-1 px-4 py-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Stat Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Cities</span>
            </div>
            <div className="text-2xl font-bold">3</div>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Shabab</span>
            </div>
            <div className="text-2xl font-bold">564</div>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[#D90429]" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Nat. Attnd</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">83%</span>
              <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
            </div>
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#4B0A8F]" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Batches</span>
            </div>
            <div className="text-2xl font-bold">1 <span className="text-sm font-normal text-muted-foreground">Active</span></div>
          </div>
        </motion.div>

        {/* City Comparison */}
        <motion.div variants={itemVariants} className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#4B0A8F]" />
            City Performance
          </h2>
          <div className="space-y-4">
            {PROTO_CITIES.map((city) => (
              <div key={city.id} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{city.name}</span>
                  <span className="font-bold">{city.activeRate}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full",
                      city.activeRate >= 85 ? "bg-emerald-500" : city.activeRate >= 80 ? "bg-[#4B0A8F]" : "bg-amber-500"
                    )} 
                    style={{ width: `${city.activeRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Exceptions */}
        <motion.div variants={itemVariants} className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5">
          <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Attention Required
          </h2>
          <ul className="space-y-2 text-sm text-rose-800 dark:text-rose-300">
            <li className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" />
              <span>2 cities falling below the 80% attendance target this week.</span>
            </li>
            <li className="flex items-start gap-2">
              <Users className="w-4 h-4 mt-0.5 shrink-0" />
              <span>3 active groups currently operating without assigned Murabbis.</span>
            </li>
          </ul>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Management & Oversight
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onNavigate?.('hq-cities')}
              className="flex flex-col items-center justify-center p-4 bg-card border border-border/70 rounded-2xl gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-[#1F0860]/10 flex items-center justify-center text-[#1F0860] dark:text-[#1F0860]/80">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Cities</span>
            </button>
            <button 
              onClick={() => onNavigate?.('hq-admissions')}
              className="flex flex-col items-center justify-center p-4 bg-card border border-border/70 rounded-2xl gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-[#D90429]/10 flex items-center justify-center text-[#D90429]">
                <ClipboardList className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-center">Admissions<br/>Oversight</span>
            </button>
            <button 
              onClick={() => onNavigate?.('hq-reports')}
              className="flex flex-col items-center justify-center p-4 bg-card border border-border/70 rounded-2xl gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-[#4B0A8F]/10 flex items-center justify-center text-[#4B0A8F]">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Reports</span>
            </button>
            <button 
              onClick={() => onNavigate?.('hq-announcements')}
              className="flex flex-col items-center justify-center p-4 bg-card border border-border/70 rounded-2xl gap-2 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Megaphone className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Announcements</span>
            </button>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Recent Activity
            </h2>
            <span className="text-xs text-[#4B0A8F] font-medium">View All</span>
          </div>
          <div className="bg-card border border-border/70 rounded-3xl overflow-hidden divide-y divide-border/50 shadow-sm">
            {[
              { title: 'New City Head assigned for Islamabad', time: '2 hours ago', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { title: 'National attendance report generated', time: 'Yesterday', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { title: 'System announcement sent to all users', time: '2 days ago', icon: Megaphone, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center p-4 gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", activity.bg, activity.color)}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
