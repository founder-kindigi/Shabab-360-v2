"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, MapPin, Users, CalendarCheck } from "lucide-react";

export function StudentDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => fetch("/api/admin/dashboard").then((r) => r.json()),
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const p = data?.participant;

  if (!p) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <EmptyState
          icon={GraduationCap}
          title="No profile found"
          description="Your participant profile could not be found. Contact your admin."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Your program profile" />

      <div className="max-w-lg">
        <Card className="overflow-hidden">
          <div className="border-l-4 border-emerald-500" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-950/50">
                <GraduationCap className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-lg font-semibold">{p.name}</p>
                <Badge
                  variant="outline"
                  className="text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50 capitalize"
                >
                  {p.state || "active"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {p.group && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  <span>
                    Group: <span className="text-foreground font-medium">{p.group.name}</span>
                  </span>
                </div>
              )}
              {p.group?.batch && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarCheck className="size-4" />
                  <span>
                    Batch: <span className="text-foreground font-medium">{p.group.batch.name}</span>
                  </span>
                </div>
              )}
              {p.group?.batch?.park && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>
                    Park: <span className="text-foreground font-medium">{p.group.batch.park.name}</span>
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}