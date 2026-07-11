"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, MapPin, Users } from "lucide-react";

export function GuardianDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["guardian-dashboard"],
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

  const guardian = data?.guardian;
  const children = guardian?.children || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your children's program overview"
      />

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No children linked"
          description="Your account is not yet linked to any participants. Contact your park admin."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child: any) => {
            const p = child.participant;
            return (
              <Card key={p.id} className="overflow-hidden">
                <div className="border-l-4 border-[#4B0A8F]" />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-[#F3ECF6] p-2.5 dark:bg-[#1F086080]">
                      <GraduationCap className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.group?.batch?.park && (
                        <p className="text-xs text-muted-foreground">
                          {p.group.batch.park.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {p.group && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                        <Users className="size-3" />
                        {p.group.name}
                      </span>
                    )}
                    {p.group?.batch && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                        <MapPin className="size-3" />
                        {p.group.batch.name}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}