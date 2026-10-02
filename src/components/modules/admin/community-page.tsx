"use client";
import { useState } from "react";
import { Users, MessageSquare, BarChart2, Heart, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModuleFrame, ModuleMetric, ModuleTabs, ModuleSearch, ModuleEmpty, WorkflowNotice, moduleCard, moduleAction } from "@/components/modules/shared/module-presentation";
export function CommunityPage({ onBack, mobile = false }: { onBack?: () => void; mobile?: boolean } = {}) {
  const [category, setCategory] = useState("all"); const [search, setSearch] = useState("");
  return <ModuleFrame mobile={mobile} onBack={onBack} title={mobile ? "Community Hub" : "Community & Interactive Quizzes"} subtitle="Field karguzari, Q&A, and community discussions" actions={<Button disabled className={cn(moduleAction, "text-xs gap-1")} title="Posting is currently unavailable"><Plus className="size-4" />Post</Button>}>
    {!mobile && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><ModuleMetric label="Members" value="—" icon={Users} /><ModuleMetric label="Posts" value="—" icon={MessageSquare} tone="emerald" /><ModuleMetric label="Polls & quizzes" value="—" icon={BarChart2} /><ModuleMetric label="Participation" value="—" icon={Heart} tone="amber" /></div>}
    <WorkflowNotice>Community posting, comments, reactions and polls are currently unavailable. No posts or engagement totals are shown until the service is enabled.</WorkflowNotice>
    <div className={cn("grid grid-cols-1 gap-5", !mobile && "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}><div className="min-w-0 space-y-4">
      <ModuleSearch label="Search community" placeholder="Search community posts…" value={search} onChange={setSearch} />
      <ModuleTabs tabs={[{ id: "all", label: "All posts" }, { id: "karguzari", label: "Karguzari" }, { id: "qa", label: "Q&A" }, { id: "experiences", label: "Experiences" }, { id: "polls", label: "Polls & quizzes" }]} value={category} onChange={setCategory} />
      <ModuleEmpty title={category === "polls" ? "Polls & quizzes are unavailable" : "The community feed is unavailable"} icon={category === "polls" ? BarChart2 : MessageSquare}>Your community workspace will show recorded posts here when posting and moderation are enabled.</ModuleEmpty>
    </div>{!mobile && <aside className="space-y-4"><div className={cn(moduleCard, "p-5 space-y-3")}><h2 className="font-bold flex items-center gap-2 text-sm"><BarChart2 className="size-4 text-purple-600" />Polls & interactive quizzes</h2><p className="text-xs text-muted-foreground">Creation, voting and results are currently unavailable.</p><Button disabled variant="outline" className="w-full rounded-xl text-xs">Create poll quiz</Button></div><div className={cn(moduleCard, "p-5 space-y-3")}><ShieldCheck className="size-6 text-emerald-600" /><h2 className="font-bold text-sm">Community space</h2><p className="text-xs text-muted-foreground">Audience and moderation settings will apply when this workflow is enabled.</p></div></aside>}</div>
  </ModuleFrame>;
}
