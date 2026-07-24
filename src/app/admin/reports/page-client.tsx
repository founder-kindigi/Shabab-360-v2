"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type ReportTab = "attendance" | "admissions" | "fees";

type AttendanceSummary = {
  summary: {
    totalEvents: number;
    totalRecords: number;
    overallRate: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    uniqueGroups: number;
  };
  statusBreakdown: { status: string; count: number }[];
};

type AdmissionsSummary = {
  summary: {
    totalApplications: number;
    statusBreakdown: { status: string; count: number }[];
    cityBreakdown: { cityId: string | null; count: number }[];
  };
};

type FeesSummary = {
  summary: {
    totalFeeEvents: number;
    totalPayments: number;
    totalCollected: number;
    paymentCount: number;
  };
  methodBreakdown: { method: string; total: number; count: number }[];
};

export default function ReportsPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isHq = userRole === "super_admin" || userRole === "program_admin";

  const [activeTab, setActiveTab] = useState<ReportTab>("attendance");
  const [cityId, setCityId] = useState<string>("");
  const [parkId, setParkId] = useState<string>("");

  const queryClient = useQueryClient();

  const attendanceQuery = useQuery<AttendanceSummary>({
    queryKey: ["reports-attendance", cityId, parkId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cityId) params.set("cityId", cityId);
      if (parkId) params.set("parkId", parkId);
      const res = await fetch(`/api/admin/reports/attendance?${params}`);
      if (!res.ok) throw new Error("Failed to fetch attendance report");
      return res.json();
    },
    enabled: activeTab === "attendance",
  });

  const admissionsQuery = useQuery<AdmissionsSummary>({
    queryKey: ["reports-admissions", cityId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cityId) params.set("cityId", cityId);
      const res = await fetch(`/api/admin/reports/admissions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch admissions report");
      return res.json();
    },
    enabled: activeTab === "admissions",
  });

  const feesQuery = useQuery<FeesSummary>({
    queryKey: ["reports-fees", cityId, parkId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cityId) params.set("cityId", cityId);
      if (parkId) params.set("parkId", parkId);
      const res = await fetch(`/api/admin/reports/fees?${params}`);
      if (!res.ok) throw new Error("Failed to fetch fees report");
      return res.json();
    },
    enabled: activeTab === "fees",
  });

  const handleExport = useCallback(async (reportType: ReportTab) => {
    try {
      const res = await fetch("/api/admin/reports/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportType, format: "csv", cityId: cityId || undefined, parkId: parkId || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${reportType} report exported`);
    } catch {
      toast.error("Export failed");
    }
  }, [cityId, parkId]);

  const tabs: { id: ReportTab; label: string }[] = [
    { id: "attendance", label: "Attendance Summary" },
    { id: "admissions", label: "Admissions Funnel" },
    { id: "fees", label: "Fees & Receipts" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operational Reports</h1>
          <p className="text-muted-foreground text-sm">
            View and export aggregated operational data
          </p>
        </div>
        <Button onClick={() => handleExport(activeTab)} variant="default">
          Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-md transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {isHq && (
        <div className="flex gap-4 flex-wrap">
          <div className="w-48">
            <Select value={cityId} onValueChange={(v) => { setCityId(v); setParkId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All cities</SelectItem>
                <SelectItem value="city-lhr">Lahore</SelectItem>
                <SelectItem value="city-khi">Karachi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cityId && (
            <div className="w-48">
              <Select value={parkId} onValueChange={setParkId}>
                <SelectTrigger>
                  <SelectValue placeholder="All parks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All parks</SelectItem>
                  <SelectItem value="park-1">Park 1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : attendanceQuery.error ? (
              <p className="text-destructive">Failed to load attendance data</p>
            ) : attendanceQuery.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{attendanceQuery.data.summary.overallRate}%</p>
                    <p className="text-xs text-muted-foreground">Attendance Rate</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{attendanceQuery.data.summary.totalEvents}</p>
                    <p className="text-xs text-muted-foreground">Total Events</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{attendanceQuery.data.summary.totalRecords}</p>
                    <p className="text-xs text-muted-foreground">Total Records</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{attendanceQuery.data.summary.uniqueGroups}</p>
                    <p className="text-xs text-muted-foreground">Groups</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Status Breakdown</h4>
                  <div className="flex gap-2 flex-wrap">
                    {attendanceQuery.data.statusBreakdown.map((s) => (
                      <Badge key={s.status} variant="outline" className="text-sm px-3 py-1">
                        {s.status}: {s.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Admissions Tab */}
      {activeTab === "admissions" && (
        <Card>
          <CardHeader>
            <CardTitle>Admissions Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {admissionsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : admissionsQuery.error ? (
              <p className="text-destructive">Failed to load admissions data</p>
            ) : admissionsQuery.data ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted inline-block">
                  <p className="text-2xl font-bold">{admissionsQuery.data.summary.totalApplications}</p>
                  <p className="text-xs text-muted-foreground">Total Applications</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Status Breakdown</h4>
                  <div className="flex gap-2 flex-wrap">
                    {admissionsQuery.data.summary.statusBreakdown.map((s) => (
                      <Badge key={s.status} variant="outline" className="text-sm px-3 py-1">
                        {s.status}: {s.count}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">By City</h4>
                  <div className="flex gap-2 flex-wrap">
                    {admissionsQuery.data.summary.cityBreakdown.map((c) => (
                      <Badge key={c.cityId ?? "none"} variant="secondary" className="text-sm px-3 py-1">
                        {c.cityId ?? "Unassigned"}: {c.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Fees Tab */}
      {activeTab === "fees" && (
        <Card>
          <CardHeader>
            <CardTitle>Fees & Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            {feesQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : feesQuery.error ? (
              <p className="text-destructive">Failed to load fees data</p>
            ) : feesQuery.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{feesQuery.data.summary.totalCollected.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Collected</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{feesQuery.data.summary.totalPayments}</p>
                    <p className="text-xs text-muted-foreground">Total Payments</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{feesQuery.data.summary.totalFeeEvents}</p>
                    <p className="text-xs text-muted-foreground">Fee Events</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{feesQuery.data.summary.paymentCount}</p>
                    <p className="text-xs text-muted-foreground">Payment Count</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Payment Method Breakdown</h4>
                  <div className="flex gap-2 flex-wrap">
                    {feesQuery.data.methodBreakdown.map((m) => (
                      <Badge key={m.method} variant="outline" className="text-sm px-3 py-1">
                        {m.method}: {m.count} (${m.total.toLocaleString()})
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
