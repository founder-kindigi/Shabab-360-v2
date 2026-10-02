"use client";
import { useSession, signOut } from "next-auth/react";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";
import { canOpenScreen } from "@/lib/auth/screen-access";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Lock, LogOut, Users, TreePine, UserPlus, PhoneCall, CalendarCheck, Wallet, Award, BookOpen, RefreshCw, Calendar, Library, Package, ShieldCheck, Upload, BarChart2, ScrollText, Bell, ChevronRight, Database, Settings, ClipboardList, type LucideIcon } from "lucide-react";
import { moduleCard } from "@/components/modules/shared/module-presentation";
import { cn } from "@/lib/utils";
const links: [string, string, string, LucideIcon, string][] = [
  ["student-profile", "Student profiles", "Shabab directory", Users, "People & programme"], ["parks", "Parks", "Groups & locations", TreePine, "People & programme"],
  ["admissions", "Admissions", "Intake & cohorts", UserPlus, "People & programme"], ["calling", "Calling", "Outreach pipeline", PhoneCall, "People & programme"],
  ["registration-forms", "Registration forms", "Build forms & review responses", ClipboardList, "People & programme"],
  ["mashwara", "Meetings", "Mashwara & actions", CalendarCheck, "People & programme"], ["content-planner", "Content planner", "Lessons & curriculum", BookOpen, "People & programme"],
  ["events", "Events", "Activities & camps", Calendar, "People & programme"], ["teams", "Teams", "Team workspaces", Users, "People & programme"], ["staff-directory", "Staff directory", "Programme staff", Users, "People & programme"],
  ["fees", "Fees", "Payments & receipts", Wallet, "Operations & records"], ["certificates", "Certificate previews", "Participant records", Award, "Operations & records"],
  ["sync", "Attendance sync", "Offline queue & recovery", RefreshCw, "Operations & records"], ["knowledge-base", "Knowledge base", "Learning resources", Library, "Operations & records"],
  ["procurement", "Procurement", "Park stock & requests", Package, "Operations & records"], ["portal-import", "Import status", "Import availability", Upload, "Operations & records"], ["custom-reports", "Reports", "Reporting workspace", BarChart2, "Operations & records"],
  ["security-access", "Access management", "Roles & permissions", ShieldCheck, "Administration"], ["audit-log", "Audit log", "Recorded activity", ScrollText, "Administration"], ["notifications", "Notifications", "Your notifications", Bell, "Administration"],
];
const colors = ["bg-purple-50 text-purple-600 dark:bg-purple-950/40", "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40", "bg-amber-50 text-amber-600 dark:bg-amber-950/40", "bg-sky-50 text-sky-600 dark:bg-sky-950/40"];
export function MobileMorePage({ onNavigate }: { onNavigate: (screen: string) => void; role?: string }) {
  const { data: session } = useSession(); const access = useEffectiveCapabilities(); const { theme, setTheme } = useTheme();
  const role = session?.user?.role ?? "";
  return <section className="w-full max-w-[460px] mx-auto min-h-screen bg-slate-50 dark:bg-[#0c0817] text-slate-900 dark:text-slate-100 pb-28">
    <header className="flex items-center justify-between px-5 pt-6 pb-4 bg-white dark:bg-[#180E30] border-b border-slate-100 dark:border-white/10"><h1 className="text-2xl font-black text-[#1F0860] dark:text-purple-200 tracking-tight">More</h1><span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs font-bold capitalize">{role.replaceAll("_", " ")}</span></header>
    <div className="p-4 space-y-6">
      <div className={cn(moduleCard, "p-4 flex items-center gap-3")}><span className="size-10 shrink-0 rounded-full bg-purple-50 dark:bg-white/10 flex items-center justify-center text-[#4B0A8F] dark:text-purple-300"><Lock className="size-5" /></span><div className="min-w-0"><p className="text-xs font-bold">{session?.user?.name || "Signed in"}</p><p className="text-[11px] text-slate-500 dark:text-slate-400 break-all">{session?.user?.email}</p></div><ChevronRight className="size-4 text-slate-400 ml-auto shrink-0" /></div>
      <section className="space-y-2"><h2 className="px-2 text-[11px] uppercase tracking-wider font-bold text-slate-400">Appearance & theme</h2><div className={cn(moduleCard, "p-3")}><div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-white/5">{([{ id: "light", label: "Light", icon: Sun }, { id: "dark", label: "Dark", icon: Moon }, { id: "system", label: "System", icon: Monitor }] as const).map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={theme === id} onClick={() => setTheme(id)} className={cn("py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold", theme === id ? "bg-white dark:bg-[#251545] text-[#4B0A8F] dark:text-purple-200 shadow-sm" : "text-slate-500")}><Icon className="size-3.5" />{label}</button>)}</div></div></section>
      {access.isLoading ? <p>Loading available tools…</p> : access.isError ? <p role="alert">Permissions could not be loaded. <button onClick={() => access.refetch()}>Retry</button></p> : ["People & programme", "Operations & records", "Administration"].map(group => {
        const available = links.filter(([screen, , , , category]) => category === group && canOpenScreen(screen, role, access.has));
        return available.length ? <section key={group} className="space-y-2"><h2 className="px-2 text-[11px] uppercase tracking-wider font-bold text-slate-400">{group}</h2><nav className="grid grid-cols-2 gap-2.5">{available.map(([screen, label, detail, Icon], i) => <button key={screen} aria-label={label} onClick={() => onNavigate(screen)} className={cn(moduleCard, "p-3 flex items-center gap-2.5 text-left active:scale-[0.98] transition-all hover:border-purple-300")}><span className={cn("size-8 rounded-xl flex items-center justify-center shrink-0", colors[i % colors.length])}><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-xs font-bold">{label}</span><span className="block text-[10px] text-slate-400 mt-0.5">{detail}</span></span></button>)}</nav></section> : null;
      })}
      <section className="space-y-2"><h2 className="px-2 text-[11px] uppercase tracking-wider font-bold text-slate-400">System tools</h2><div className={cn(moduleCard, "divide-y divide-slate-100 dark:divide-white/10")}>{[{ title: "Backup & restore", icon: Database, text: "Database backup and restore are unavailable here." }, { title: "Program settings", icon: Settings, text: "Program configuration and roster import are unavailable here." }].map(({ title, icon: Icon, text }) => <div key={title} className="p-4 flex items-start gap-3"><Icon className="size-4 text-slate-400 mt-1 shrink-0" /><div><p className="text-xs font-bold">{title}</p><p className="text-[11px] text-slate-500 mt-1">{text}</p></div><span className="ml-auto text-[9px] uppercase font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-1">Unavailable</span></div>)}</div></section>
      <Button variant="outline" className="w-full h-11 rounded-xl text-rose-600 border-rose-200 dark:border-rose-900 gap-2 font-bold" onClick={() => signOut()}><LogOut className="size-4" />Sign out</Button>
    </div>
  </section>;
}
