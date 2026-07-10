"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { DataCard } from "@/components/layout/data-card";
import { EmptyState } from "@/components/layout/empty-state";
import {
  UsersRound,
  GraduationCap,
  CalendarCheck,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export function ParkDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetch("/api/admin/dashboard").then((r) => r.json()),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (data?.todayEvents !== undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Park operations overview" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <DataCard title="Groups" value={data.groups} icon={UsersRound} />
          <DataCard title="Shabab" value={data.participants} icon={GraduationCap} />
          <DataCard title="Today's Events" value={data.todayEvents} icon={CalendarCheck} />
          <DataCard title="Open Events" value={data.openEvents} icon={Clock} />
          <DataCard title="Total Events" value={data.totalEvents} icon={Activity} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/50">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Open Events</p>
                <p className="text-xs text-muted-foreground">Events awaiting closure</p>
              </div>
            </div>
            {data.openEvents > 0 ? (
              <p className="text-3xl font-bold text-amber-600">{data.openEvents}</p>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-4" />
                <span className="text-sm font-medium">All events closed</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/50">
                <Activity className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Today&apos;s Activity</p>
                <p className="text-xs text-muted-foreground">Attendance events for today</p>
              </div>
            </div>
            <p className="text-3xl font-bold">{data.todayEvents}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <EmptyState icon={Activity} title="No data available" description="Dashboard metrics will appear once your park is set up." />
    </div>
  );
}