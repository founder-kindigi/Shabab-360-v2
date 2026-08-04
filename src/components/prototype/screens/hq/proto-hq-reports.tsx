"use client";

import { motion } from "framer-motion";
import { 
  ArrowLeft,
  FileText,
  Activity,
  Users,
  Building2,
  DollarSign,
  BookOpen,
  Download,
  Calendar
} from "lucide-react";

interface ProtoHqReportsProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoHqReports({ onNavigate }: ProtoHqReportsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const reportTypes = [
    { id: 'att', title: 'National Attendance Report', desc: 'Detailed attendance breakdown by city, park, and group.', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'adm', title: 'Admissions Funnel', desc: 'Conversion metrics from application to enrollment.', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'city', title: 'City Comparison', desc: 'Performance metrics compared across all active cities.', icon: Building2, color: 'text-[#4B0A8F]', bg: 'bg-[#4B0A8F]/10' },
    { id: 'fin', title: 'Finance Summary', desc: 'Consolidated view of collections and expenses.', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'cont', title: 'Content Delivery', desc: 'Tracking of curriculum delivery against the planned schedule.', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'mem', title: 'National Member Directory', desc: 'Complete list of all enrolled Shabab and Staff.', icon: FileText, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  ];

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
            <h1 className="text-lg font-bold">National Reports</h1>
            <p className="text-xs text-muted-foreground">Analytics & Exports</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <motion.div 
          className="grid grid-cols-1 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {reportTypes.map((report) => (
            <motion.div 
              key={report.id}
              variants={itemVariants}
              className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${report.bg} ${report.color}`}>
                  <report.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">{report.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{report.desc}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-border/50 flex justify-end">
                <button className="h-10 px-4 rounded-xl bg-secondary/80 hover:bg-secondary font-semibold text-sm flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" />
                  Generate CSV
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Exports */}
        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="pt-2"
        >
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Recent Exports
          </h2>
          <div className="bg-card border border-border/70 rounded-3xl overflow-hidden divide-y divide-border/50 shadow-sm">
            {[
              { name: 'attendance_report_jul2026.csv', date: '2026-08-01' },
              { name: 'admissions_pipeline_w17.csv', date: '2026-07-28' },
              { name: 'finance_summary_q2.csv', date: '2026-07-15' },
            ].map((file, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {file.date}
                    </div>
                  </div>
                </div>
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
