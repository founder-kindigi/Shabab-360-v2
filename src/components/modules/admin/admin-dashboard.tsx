"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { PageHeader } from "@/components/layout/page-header";
import { DataCard } from "@/components/layout/data-card";
import { EmptyState } from "@/components/layout/empty-state";
import {
  TreePine,
  GraduationCap,
  CalendarCheck,
  UserCog,
  Activity,
  Building2,
  UsersRound,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export function AdminDashboard() {
  const { data: session } = useSession();
  const { selectedCityId, selectedParkId } = useAppStore();
  const user = session?.user as { role?: string } | undefined;
  const isHQ = ["super_admin", "program_admin"].includes(user?.role || "");

  const apiUrl = selectedCityId || selectedParkId
    ? `/api/admin/dashboard?cityId=${selectedCityId || ""}&parkId=${selectedParkId || ""}`
    : "/api/admin/dashboard";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard", selectedCityId, selectedParkId],
    queryFn: () => fetch(apiUrl).then((r) => r.json()),
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // HQ Dashboard
  if (isHQ && data?.cityBreakdown) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="National program overview" />

        {/* Metric cards row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <DataCard title="Cities" value={data.cities} icon={Building2} />
          <DataCard title="Parks" value={data.parks} icon={TreePine} />
          <DataCard title="Batches" value={data.batches} icon={CalendarCheck} />
          <DataCard title="Groups" value={data.groups} icon={UsersRound} />
          <DataCard title="Shabab" value={data.participants} icon={GraduationCap} />
          <DataCard title="Staff" value={data.staff} icon={UserCog} />
        </div>

        {/* City breakdown table */}
        <div className="rounded-xl border bg-card">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold">Cities Overview</h3>
            <p className="text-sm text-muted-foreground">Parks per city</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                    City
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                    Parks
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.cityBreakdown.map((city: any) => (
                  <tr
                    key={city.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium">{city.name}</p>
                      <p className="text-xs text-muted-foreground">{city.code}</p>
                    </td>
                    <td className="text-center py-3">
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                        {city._count.parks}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.cityBreakdown.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-8 text-center text-sm text-muted-foreground"
                    >
                      No cities yet. Create your first city to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // City Head Dashboard
  if (!isHQ && data?.cityParks) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="City operations overview"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <DataCard title="Parks" value={data.parks} icon={TreePine} />
          <DataCard title="Batches" value={data.batches} icon={CalendarCheck} />
          <DataCard title="Groups" value={data.groups} icon={UsersRound} />
          <DataCard
            title="Shabab"
            value={data.participants}
            icon={GraduationCap}
          />
          <DataCard title="Events" value={data.attendanceEvents} icon={Activity} />
        </div>

        <div className="rounded-xl border bg-card">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold">Parks in Your City</h3>
            <p className="text-sm text-muted-foreground">
              Batches and groups per park
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                    Park
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                    Batches
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">
                    Groups
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.cityParks.map((park: any) => (
                  <tr
                    key={park.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium">{park.name}</p>
                    </td>
                    <td className="text-center py-3">
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                        {park._count.batches}
                      </span>
                    </td>
                    <td className="text-center py-3">
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                        {park._count.groups}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Park-level Dashboard
  if (data?.todayEvents !== undefined) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Park operations overview" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <DataCard title="Groups" value={data.groups} icon={UsersRound} />
          <DataCard
            title="Shabab"
            value={data.participants}
            icon={GraduationCap}
          />
          <DataCard
            title="Today's Events"
            value={data.todayEvents}
            icon={CalendarCheck}
          />
          <DataCard
            title="Open Events"
            value={data.openEvents}
            icon={Clock}
          />
          <DataCard
            title="Total Events"
            value={data.totalEvents}
            icon={Activity}
          />
        </div>

        {/* Quick status indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/50">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Open Events</p>
                <p className="text-xs text-muted-foreground">
                  Events awaiting closure
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Attendance events for today
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold">{data.todayEvents}</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <EmptyState
        icon={Activity}
        title="No data available"
        description="Dashboard metrics will appear once your organization is set up."
      />
    </div>
  );
}