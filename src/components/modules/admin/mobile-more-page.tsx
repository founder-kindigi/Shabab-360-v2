"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Lock,
  BarChart2,
  Info,
  Bell,
  Upload,
  Download,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMorePageProps {
  onNavigate: (screen: string) => void;
}

export function MobileMorePage({ onNavigate }: MobileMorePageProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const email = user?.email || "No email";
  const role = user?.role || "ADMIN";

  const showComingSoon = () => alert("Coming soon");

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-6">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">More</h1>
        <div className="flex items-center gap-1.5 text-[11px] font-bold bg-purple-100 dark:bg-purple-900/40 text-[#4B0A8F] dark:text-purple-300 px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800/40">
          <span>{role}</span>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Signed In Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-between"
          onClick={showComingSoon}
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Lock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Signed in</p>
              <p className="text-[11px] text-muted-foreground">{email} • {role}</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </motion.div>

        {/* ACCESS Section */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest px-2">Access</h2>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl bg-card border border-border/50 shadow-sm"
          >
            <button
              onClick={showComingSoon}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Lock className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">Permissions</p>
                  <p className="text-[11px] text-muted-foreground">Manage app admins</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </motion.div>
        </div>

        {/* SETTINGS Section */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest px-2">Settings</h2>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card border border-border/50 shadow-sm flex flex-col"
          >
            <SettingRow
              icon={<BarChart2 className="size-4 text-emerald-600 dark:text-emerald-400" />}
              iconBg="bg-emerald-50 dark:bg-emerald-900/20"
              title="Analysis"
              subtitle="Attendance by date, park & murabbi"
              onClick={() => onNavigate("analysis")}
            />
            <SettingRow
              icon={<Info className="size-4 text-sky-600 dark:text-sky-400" />}
              iconBg="bg-sky-50 dark:bg-sky-900/20"
              title="Program details"
              subtitle="Name and tagline"
              onClick={showComingSoon}
            />
            <SettingRow
              icon={<Bell className="size-4 text-amber-600 dark:text-amber-400" />}
              iconBg="bg-amber-50 dark:bg-amber-900/20"
              title="Post a notice"
              subtitle="Announcement for everyone"
              onClick={showComingSoon}
            />
            <SettingRow
              icon={<Upload className="size-4 text-purple-600 dark:text-purple-400" />}
              iconBg="bg-purple-50 dark:bg-purple-900/20"
              title="Import roster (.xlsx)"
              subtitle="Upload the intake template"
              onClick={showComingSoon}
            />
            <SettingRow
              icon={<Download className="size-4 text-indigo-600 dark:text-indigo-400" />}
              iconBg="bg-indigo-50 dark:bg-indigo-900/20"
              title="Download backup"
              subtitle="Save all data as a file"
              onClick={showComingSoon}
            />
            <SettingRow
              icon={<Upload className="size-4 text-orange-600 dark:text-orange-400" />}
              iconBg="bg-orange-50 dark:bg-orange-900/20"
              title="Restore backup"
              subtitle="Load data from a file"
              onClick={showComingSoon}
            />
            <SettingRow
              icon={<RefreshCw className="size-4 text-rose-600 dark:text-rose-400" />}
              iconBg="bg-rose-50 dark:bg-rose-900/20"
              title="Reload from server"
              subtitle="Refresh latest data"
              onClick={showComingSoon}
              isLast
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  iconBg,
  title,
  subtitle,
  onClick,
  isLast,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  isLast?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left",
        !isLast && "border-b border-border/40"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("size-8 rounded-full flex items-center justify-center shrink-0", iconBg)}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
}
