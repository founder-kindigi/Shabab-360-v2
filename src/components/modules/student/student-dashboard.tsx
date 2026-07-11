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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4B0A8F]" />
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
          <div className="border-l-4 border-[#4B0A8F]" />
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-[#F3ECF6] p-3 dark:bg-[#1F086080]">
                <GraduationCap className="size-6 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div>
                <p className="text-lg font-semibold">{p.name}</p>
                <Badge
                  variant="outline"
                  className="text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F086080] capitalize"
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