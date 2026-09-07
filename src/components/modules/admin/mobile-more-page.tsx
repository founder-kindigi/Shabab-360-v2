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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileMorePageProps {
  onNavigate: (screen: string) => void;
}

export function MobileMorePage({ onNavigate }: MobileMorePageProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const email = user?.email || "admin@shabab.pk";
  const role = user?.role || "super_admin";

  const displayRole =
    role === "super_admin"
      ? "Main admin"
      : role === "park_lead"
      ? "Park Lead"
      : role === "murabbi"
      ? "Murabbi"
      : "Admin";

  const showComingSoon = (feature: string) => {
    alert(`${feature} is coming soon in the next release.`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 text-slate-900 pb-28 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 bg-white border-b border-slate-100">
        <h1 className="text-2xl font-black text-[#1F0860] tracking-tight">More</h1>
        <Badge
          variant="secondary"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs px-3 py-1 rounded-full"
        >
          {displayRole}
        </Badge>
      </div>

      <div className="p-4 space-y-6">
        {/* Signed In Row */}
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-[#4B0A8F]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Signed in</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {email} • {displayRole}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* ACCESS Section */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            ACCESS
          </h2>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <button
              onClick={() => showComingSoon("Permissions")}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">Permissions</p>
                  <p className="text-xs text-slate-400">Manage app admins</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* SETTINGS Section */}
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            SETTINGS
          </h2>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <SettingRow
              icon={<BarChart2 className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
              title="Analysis"
              subtitle="Attendance by date, park & murabbi"
              onClick={() => onNavigate("analysis")}
            />
            <SettingRow
              icon={<Info className="w-4 h-4 text-sky-600" />}
              iconBg="bg-sky-50"
              title="Program details"
              subtitle="Name and tagline"
              onClick={() => showComingSoon("Program details")}
            />
            <SettingRow
              icon={<Bell className="w-4 h-4 text-amber-600" />}
              iconBg="bg-amber-50"
              title="Post a notice"
              subtitle="Announcement for everyone"
              onClick={() => showComingSoon("Post a notice")}
            />
            <SettingRow
              icon={<Upload className="w-4 h-4 text-purple-600" />}
              iconBg="bg-purple-50"
              title="Import roster (.xlsx)"
              subtitle="Upload the intake template"
              onClick={() => showComingSoon("Import roster")}
            />
            <SettingRow
              icon={<Download className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-50"
              title="Download backup"
              subtitle="Save all data as a file"
              onClick={() => showComingSoon("Download backup")}
            />
            <SettingRow
              icon={<Upload className="w-4 h-4 text-orange-600" />}
              iconBg="bg-orange-50"
              title="Restore backup"
              subtitle="Load data from a file"
              onClick={() => showComingSoon("Restore backup")}
            />
            <SettingRow
              icon={<RefreshCw className="w-4 h-4 text-rose-600" />}
              iconBg="bg-rose-50"
              title="Reload from server"
              subtitle="Refresh latest data"
              onClick={handleReload}
              isLast
            />
          </div>
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
        "w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left",
        !isLast && "border-b border-slate-100"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </button>
  );
}
