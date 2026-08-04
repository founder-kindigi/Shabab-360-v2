"use client";

import { motion } from "framer-motion";
import { 
  ArrowLeft,
  Plus,
  Megaphone,
  Calendar,
  Users,
  AlertCircle
} from "lucide-react";
import { PROTO_ANNOUNCEMENTS } from "@/components/prototype/data/proto-data";
import { cn } from "@/lib/utils";

interface ProtoHqAnnouncementsProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoHqAnnouncements({ onNavigate }: ProtoHqAnnouncementsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const getPriorityColors = (priority: string) => {
    switch(priority) {
      case 'High': return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'Medium': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border/70 sticky top-0 z-20">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate?.('hq-dashboard')}
              className="p-2 -ml-2 rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Announcements</h1>
              <p className="text-xs text-muted-foreground">National Broadcasts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <button className="w-full h-12 flex items-center justify-center gap-2 bg-[#1F0860] text-white rounded-xl font-bold shadow-sm active:scale-95 transition-transform">
          <Plus className="w-5 h-5" />
          New Announcement
        </button>

        <motion.div 
          className="space-y-4 pt-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {PROTO_ANNOUNCEMENTS.map((ann) => (
            <motion.div 
              key={ann.id}
              variants={itemVariants}
              className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <h3 className="font-bold text-base leading-tight flex-1">{ann.title}</h3>
                <span className={cn(
                  "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                  getPriorityColors(ann.priority)
                )}>
                  {ann.priority === 'High' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {ann.priority}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {ann.body}
              </p>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-border/50">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {ann.date}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5" />
                    {ann.audience}
                  </span>
                </div>
                <span className="font-medium text-foreground">By {ann.author}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
