"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
  Send,
  ArrowLeft,
  Sparkles,
  Users,
  DollarSign,
  Heart,
  Package,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DomainId = "attendance" | "admissions" | "fees" | "inventory" | "mamulat";

interface DomainConfig {
  id: DomainId;
  name: string;
  icon: any;
  color: string;
  columns: { key: string; label: string; defaultChecked: boolean }[];
  summaryKpi: { label: string; value: string; sub: string };
}

const REPORT_DOMAINS: DomainConfig[] = [
  {
    id: "attendance",
    name: "Attendance & Rosters",
    icon: Users,
    color: "text-purple-600 bg-purple-50",
    columns: [
      { key: "studentName", label: "Cadet Name", defaultChecked: true },
      { key: "park", label: "Park Base", defaultChecked: true },
      { key: "murabbi", label: "Murabbi Halqa", defaultChecked: true },
      { key: "attendanceRate", label: "Attendance Rate (%)", defaultChecked: true },
      { key: "streakDays", label: "Streak Count", defaultChecked: true },
    ],
    summaryKpi: { label: "Average Attendance", value: "88.4%", sub: "Across 6 Parks" },
  },
  {
    id: "admissions",
    name: "Admissions & Screening",
    icon: FileSpreadsheet,
    color: "text-blue-600 bg-blue-50",
    columns: [
      { key: "applicantName", label: "Candidate Name", defaultChecked: true },
      { key: "cohort", label: "Recommended Cohort", defaultChecked: true },
      { key: "interviewScore", label: "Interview Rubric /300", defaultChecked: true },
      { key: "emergencyContact", label: "Emergency Contact", defaultChecked: true },
      { key: "status", label: "Admission Status", defaultChecked: true },
    ],
    summaryKpi: { label: "Total Applicants", value: "759", sub: "Batch 4 Intake" },
  },
  {
    id: "fees",
    name: "Fees & Collections",
    icon: DollarSign,
    color: "text-emerald-600 bg-emerald-50",
    columns: [
      { key: "studentName", label: "Cadet Name", defaultChecked: true },
      { key: "challanNo", label: "Challan #", defaultChecked: true },
      { key: "amount", label: "Amount (PKR)", defaultChecked: true },
      { key: "paymentStatus", label: "Status (Paid/Pending)", defaultChecked: true },
      { key: "receiptNo", label: "Receipt #", defaultChecked: true },
    ],
    summaryKpi: { label: "Collection Rate", value: "92.1%", sub: "PKR 450,000 Collected" },
  },
  {
    id: "inventory",
    name: "Central Equipment Stock",
    icon: Package,
    color: "text-amber-600 bg-amber-50",
    columns: [
      { key: "itemName", label: "Equipment Name", defaultChecked: true },
      { key: "category", label: "Category", defaultChecked: true },
      { key: "quantity", label: "In Store Count", defaultChecked: true },
      { key: "assignedPark", label: "Allocated Park", defaultChecked: true },
      { key: "thresholdStatus", label: "Low Stock Alert", defaultChecked: true },
    ],
    summaryKpi: { label: "Master SKUs", value: "13 Items", sub: "Sports & Camps" },
  },
  {
    id: "mamulat",
    name: "Islah-i-Mamulat Habits",
    icon: Heart,
    color: "text-red-600 bg-red-50",
    columns: [
      { key: "cadetName", label: "Cadet Name", defaultChecked: true },
      { key: "fajrJamaat", label: "Fajr Jama'at Compliance", defaultChecked: true },
      { key: "tilawatMinutes", label: "Daily Tilawat Minutes", defaultChecked: true },
      { key: "streakDays", label: "40-Day Challenge Day", defaultChecked: true },
      { key: "murabbiNote", label: "Murabbi Guidance Log", defaultChecked: true },
    ],
    summaryKpi: { label: "40-Day Champions", value: "48 Cadets", sub: "Active Spiritual Regimen" },
  },
];

interface MobileReportsBuilderPageProps {
  onBack?: () => void;
}

export function MobileReportsBuilderPage({ onBack }: MobileReportsBuilderPageProps) {
  const { data: session } = useSession();
  const [selectedDomain, setSelectedDomain] = useState<DomainId>("attendance");
  const [dateRange, setDateRange] = useState("month");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const domain = useMemo(() => {
    return REPORT_DOMAINS.find((d) => d.id === selectedDomain) || REPORT_DOMAINS[0];
  }, [selectedDomain]);

  const [activeColumns, setActiveColumns] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    REPORT_DOMAINS.forEach((d) => {
      d.columns.forEach((c) => {
        init[`${d.id}-${c.key}`] = c.defaultChecked;
      });
    });
    return init;
  });

  const toggleColumn = (key: string) => {
    setActiveColumns((prev) => ({
      ...prev,
      [`${selectedDomain}-${key}`]: !prev[`${selectedDomain}-${key}`],
    }));
  };

  const handleDownloadCsv = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      const csvHeader = domain.columns
        .filter((c) => activeColumns[`${domain.id}-${c.key}`] !== false)
        .map((c) => c.label)
        .join(",");

      const sampleRow = domain.columns
        .filter((c) => activeColumns[`${domain.id}-${c.key}`] !== false)
        .map(() => "Sample Data")
        .join(",");

      const csvContent = `${csvHeader}\n${sampleRow}\n`;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shabab360-${domain.id}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${domain.name} CSV successfully!`);
    }, 1000);
  };

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground pb-28 space-y-4 px-4 pt-4 select-none">
      {/* ─── PWA Top Bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-[#1F0860] dark:text-purple-200 tracking-tight">
                Report Builder
              </h1>
              <Badge className="bg-[#4B0A8F] text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                CSV & Audit
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Custom cross-domain aggregation & data exports
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsShareOpen(true)}
          className="h-8 gap-1 text-xs font-bold bg-[#4B0A8F] hover:bg-[#3b0873] text-white rounded-xl shadow"
        >
          <Share2 className="size-3.5" />
          <span>Share</span>
        </Button>
      </div>

      {/* ─── Domain Horizontal Switcher ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {REPORT_DOMAINS.map((d) => {
          const Icon = d.icon;
          const isActive = selectedDomain === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedDomain(d.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-sm",
                isActive
                  ? "bg-[#4B0A8F] text-white shadow-[#4B0A8F]/20"
                  : "bg-white dark:bg-slate-900 text-muted-foreground border border-slate-200 dark:border-slate-800"
              )}
            >
              <Icon className="size-3.5" />
              <span>{d.name.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Domain KPI Banner ─── */}
      <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {domain.summaryKpi.label}
              </p>
              <h2 className="text-2xl font-black text-[#1F0860] dark:text-purple-200 mt-0.5">
                {domain.summaryKpi.value}
              </h2>
              <p className="text-xs text-purple-600 font-medium">{domain.summaryKpi.sub}</p>
            </div>
            <div className={cn("size-12 rounded-2xl flex items-center justify-center", domain.color)}>
              <domain.icon className="size-6" />
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {[
              { id: "today", label: "Today" },
              { id: "week", label: "Week" },
              { id: "month", label: "Month" },
              { id: "all", label: "All Time" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateRange(preset.id)}
                className={cn(
                  "py-1 text-[10px] font-bold rounded-lg transition-all",
                  dateRange === preset.id
                    ? "bg-[#4B0A8F] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── Column Selector ─── */}
      <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Export Fields
            </h3>
            <span className="text-[10px] text-[#4B0A8F] font-bold">
              {domain.columns.filter((c) => activeColumns[`${domain.id}-${c.key}`] !== false).length} of{" "}
              {domain.columns.length} Fields
            </span>
          </div>

          <div className="space-y-2">
            {domain.columns.map((col) => {
              const isChecked = activeColumns[`${domain.id}-${col.key}`] !== false;
              return (
                <label
                  key={col.key}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer text-xs font-medium"
                >
                  <span>{col.label}</span>
                  <Checkbox checked={isChecked} onCheckedChange={() => toggleColumn(col.key)} />
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Export Action Button ─── */}
      <Button
        size="lg"
        disabled={isGenerating}
        onClick={handleDownloadCsv}
        className="w-full gap-2 bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold rounded-2xl shadow-lg h-12"
      >
        <Download className="size-4" />
        <span>{isGenerating ? "Compiling Dataset..." : "Generate & Download CSV Report"}</span>
      </Button>

      {/* ─── Share Dialog ─── */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="size-5 text-[#4B0A8F]" />
              Share Report Summary
            </DialogTitle>
            <DialogDescription className="text-xs">
              Transmit an executive report brief to city leadership or park leads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 space-y-1">
              <p className="font-bold text-foreground">
                {domain.name} ({dateRange.toUpperCase()})
              </p>
              <p className="text-muted-foreground text-[11px]">
                Key Metric: {domain.summaryKpi.value} • Generated for Super Admin review.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Recipient Email / WhatsApp</Label>
              <Input placeholder="e.g. city.head@shabab360.org" className="text-xs h-8" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsShareOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success(`Dispatched report summary!`);
                setIsShareOpen(false);
              }}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold"
            >
              Send Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
