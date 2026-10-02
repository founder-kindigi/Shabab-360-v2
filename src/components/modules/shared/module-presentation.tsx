"use client";
import type { ReactNode } from "react";
import { ArrowLeft, Inbox, LockKeyhole, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Presentation tokens retained from the pre-remediation v2 module screens.
export const moduleCard = "rounded-2xl bg-white dark:bg-[#180E30] border border-slate-100 dark:border-white/10 shadow-sm";
export const moduleInput = "w-full min-w-0 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-300";
export const moduleAction = "rounded-xl bg-[#4B0A8F] hover:bg-[#3d0875] text-white font-bold shadow-sm";
export function ModuleFrame({ title, subtitle, onBack, mobile = false, gradient = false, actions, children }: { title: string; subtitle: string; onBack?: () => void; mobile?: boolean; gradient?: boolean; actions?: ReactNode; children: ReactNode }) {
  return <section className={cn("w-full mx-auto min-h-screen pb-28 text-slate-900 dark:text-slate-100", mobile ? "max-w-[460px] bg-slate-50 dark:bg-[#0c0817]" : "max-w-7xl px-4 sm:px-6 space-y-5")}>
    <header className={cn("px-5 pt-6", gradient ? "relative overflow-hidden bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white rounded-b-[2.5rem] pb-10 shadow-xl" : "bg-white dark:bg-[#180E30] border-b border-slate-100 dark:border-white/10 pb-4", !mobile && "rounded-2xl border shadow-sm")}>
      {gradient && <div className="absolute -top-20 -right-20 size-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />}
      <div className="relative flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0">{onBack && <button onClick={onBack} aria-label="Back" className={cn("size-9 shrink-0 rounded-full flex items-center justify-center active:scale-95", gradient ? "bg-white/10 border border-white/15" : "bg-slate-100 dark:bg-white/10")}><ArrowLeft className="size-4" /></button>}<div className="min-w-0"><h1 className={cn("text-2xl font-black tracking-tight", !gradient && "text-[#1F0860] dark:text-purple-200")}>{title}</h1><p className={cn("text-[11px] font-medium mt-1", gradient ? "text-purple-200" : "text-slate-500 dark:text-slate-400")}>{subtitle}</p></div></div>{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}</div>
    </header><div className={cn("space-y-4", mobile && "px-4 pt-4", gradient && "relative -mt-7")}>{children}</div>
  </section>;
}
export function ModuleMetric({ label, value, icon: Icon, tone = "purple", detail }: { label: string; value: ReactNode; icon: LucideIcon; tone?: "purple" | "emerald" | "amber"; detail?: string }) {
  const color = { purple: "bg-purple-50 text-[#4B0A8F] dark:bg-purple-950/40 dark:text-purple-300", emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" }[tone];
  return <div className={cn(moduleCard, "p-3 sm:p-4 min-w-0")}><div className="flex flex-col items-start gap-2 mb-2 sm:flex-row sm:items-center"><span className={cn("p-2 rounded-xl shrink-0", color)}><Icon className="size-4" /></span><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p></div><p className={cn("font-black break-words", typeof value === "string" && value.length > 10 ? "text-xs sm:text-lg" : "text-lg sm:text-xl")}>{value}</p>{detail && <p className="text-[10px] text-muted-foreground mt-1">{detail}</p>}</div>;
}
export function ModuleSearch({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return <div className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input aria-label={label} className={cn(moduleInput, "pl-9")} maxLength={100} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} /></div>;
}
export function ModuleEmpty({ title, children, icon: Icon = Inbox }: { title: string; children?: ReactNode; icon?: LucideIcon }) {
  return <div className={cn(moduleCard, "px-5 py-10 text-center")}><span className="inline-flex rounded-2xl bg-purple-50 dark:bg-white/5 p-4 text-purple-400 mb-3"><Icon className="size-7" /></span><h2 className="font-bold text-sm">{title}</h2>{children && <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">{children}</p>}</div>;
}
export function WorkflowNotice({ children }: { children: ReactNode }) {
  return <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-amber-900 dark:text-amber-200"><LockKeyhole className="size-4 shrink-0 mt-0.5" /><p className="text-xs leading-relaxed">{children}</p></div>;
}
export function ModuleTabs<T extends string>({ tabs, value, onChange }: { tabs: readonly { id: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <div role="tablist" className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">{tabs.map(tab => <button key={tab.id} role="tab" aria-selected={value === tab.id} onClick={() => onChange(tab.id)} className={cn("rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-colors", value === tab.id ? "bg-[#4B0A8F] text-white shadow-sm" : "bg-white dark:bg-[#180E30] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-300")}>{tab.label}</button>)}</div>;
}
