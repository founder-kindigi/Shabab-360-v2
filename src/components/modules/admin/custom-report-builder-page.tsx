"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  SlidersHorizontal,
  Bookmark,
  Send,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  Layers,
  Building2,
  TreePine,
  Users,
  DollarSign,
  Phone,
  ClipboardList,
  Package,
  Award,
  Trash2,
  Play,
  PlayCircle,
  Mail,
  MessageSquare,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Data Domains Configuration ───
interface DomainConfig {
  id: string;
  name: string;
  description: string;
  icon: typeof Calendar;
  color: string;
  columns: { id: string; label: string; defaultSelected: boolean }[];
}

const DATA_DOMAINS: DomainConfig[] = [
  {
    id: "attendance",
    name: "Attendance & Participation",
    description: "Session attendance records, participant check-ins, and absence trends across parks.",
    icon: Calendar,
    color: "from-purple-500 to-indigo-600",
    columns: [
      { id: "participant_name", label: "Participant Name", defaultSelected: true },
      { id: "park_name", label: "Park Name", defaultSelected: true },
      { id: "group_name", label: "Youth Group", defaultSelected: true },
      { id: "session_date", label: "Session Date", defaultSelected: true },
      { id: "status", label: "Attendance Status", defaultSelected: true },
      { id: "murabbi_name", label: "Assigned Murabbi", defaultSelected: true },
      { id: "guardian_phone", label: "Guardian Phone", defaultSelected: false },
      { id: "consecutive_absences", label: "Consecutive Absences", defaultSelected: false },
    ],
  },
  {
    id: "fees",
    name: "Fee Collections & Financials",
    description: "Monthly fee payments, outstanding dues, receipt numbers, and collector reports.",
    icon: DollarSign,
    color: "from-emerald-500 to-teal-600",
    columns: [
      { id: "student_name", label: "Student Name", defaultSelected: true },
      { id: "park_name", label: "Park Name", defaultSelected: true },
      { id: "fee_month", label: "Fee Month", defaultSelected: true },
      { id: "amount_due", label: "Amount Due (PKR)", defaultSelected: true },
      { id: "amount_paid", label: "Amount Paid (PKR)", defaultSelected: true },
      { id: "payment_status", label: "Payment Status", defaultSelected: true },
      { id: "receipt_no", label: "Receipt Number", defaultSelected: true },
      { id: "payment_date", label: "Payment Date", defaultSelected: false },
      { id: "collector_name", label: "Collected By", defaultSelected: false },
    ],
  },
  {
    id: "calling",
    name: "Calling & Admissions Pipeline",
    description: "Lead outreach status, call outcomes, follow-up schedules, and conversion metrics.",
    icon: Phone,
    color: "from-blue-500 to-cyan-600",
    columns: [
      { id: "lead_name", label: "Lead / Prospect Name", defaultSelected: true },
      { id: "guardian_name", label: "Guardian Name", defaultSelected: true },
      { id: "phone_number", label: "Phone Number", defaultSelected: true },
      { id: "call_status", label: "Call Status", defaultSelected: true },
      { id: "call_outcome", label: "Call Outcome", defaultSelected: true },
      { id: "assigned_caller", label: "Assigned Caller", defaultSelected: true },
      { id: "campaign_name", label: "Campaign Name", defaultSelected: false },
      { id: "next_followup", label: "Next Follow-up Date", defaultSelected: false },
    ],
  },
  {
    id: "mashwara",
    name: "Weekly Mashwara & Karguzari",
    description: "Leadership meeting rosters, decision logs, action items, and team attendance.",
    icon: ClipboardList,
    color: "from-amber-500 to-orange-600",
    columns: [
      { id: "session_title", label: "Mashwara Title", defaultSelected: true },
      { id: "city_park", label: "City / Park Scope", defaultSelected: true },
      { id: "scheduled_date", label: "Meeting Date", defaultSelected: true },
      { id: "attendee_count", label: "Murabbi Attendees", defaultSelected: true },
      { id: "decisions_count", label: "Decisions Logged", defaultSelected: true },
      { id: "action_items_status", label: "Action Items Progress", defaultSelected: true },
      { id: "organized_by", label: "Session Lead", defaultSelected: false },
    ],
  },
  {
    id: "procurement",
    name: "Procurement & Stock Inventory",
    description: "Item quantities, warehouse stock levels, park distribution, and requisition status.",
    icon: Package,
    color: "from-rose-500 to-pink-600",
    columns: [
      { id: "item_name", label: "Inventory Item Name", defaultSelected: true },
      { id: "category", label: "Category", defaultSelected: true },
      { id: "total_stock", label: "Total Stock Quantity", defaultSelected: true },
      { id: "allocated_park", label: "Allocated Park", defaultSelected: true },
      { id: "reorder_level", label: "Reorder Threshold", defaultSelected: true },
      { id: "condition_status", label: "Item Condition", defaultSelected: true },
      { id: "last_audited", label: "Last Audit Date", defaultSelected: false },
    ],
  },
  {
    id: "gamification",
    name: "Gamification & Badges",
    description: "Badge achievements, student points leaderboard, and park gamification statistics.",
    icon: Award,
    color: "from-violet-500 to-purple-600",
    columns: [
      { id: "student_name", label: "Student Name", defaultSelected: true },
      { id: "park_name", label: "Park Name", defaultSelected: true },
      { id: "group_name", label: "Youth Group", defaultSelected: true },
      { id: "total_points", label: "Earned Points", defaultSelected: true },
      { id: "badges_count", label: "Badges Earned", defaultSelected: true },
      { id: "top_badge", label: "Highest Badge Rank", defaultSelected: true },
      { id: "streak_days", label: "Attendance Streak (Days)", defaultSelected: false },
    ],
  },
];

// ─── Executive Report Presets ───
interface ReportPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  domainId: string;
  icon: typeof FileSpreadsheet;
  badge: string;
  lastGenerated: string;
  downloadsCount: number;
}

const PRESET_TEMPLATES: ReportPreset[] = [
  {
    id: "preset-1",
    title: "Monthly Executive Operations Summary",
    category: "Executive Rollup",
    description: "Comprehensive monthly performance overview covering attendance, fee collections, calling pipeline, and park activities.",
    domainId: "attendance",
    icon: FileText,
    badge: "Most Popular",
    lastGenerated: "Yesterday, 05:30 PM",
    downloadsCount: 142,
  },
  {
    id: "preset-2",
    title: "Inter-Park Attendance Comparative Benchmark",
    category: "Operations",
    description: "Side-by-side attendance percentage comparison across all 6 Lahore & Rawalpindi parks for Batch 4.",
    domainId: "attendance",
    icon: BarChart3,
    badge: "Benchmarking",
    lastGenerated: "10 Aug 2026",
    downloadsCount: 89,
  },
  {
    id: "preset-3",
    title: "Fee Collection & Outstanding Dues Fulfillment",
    category: "Financials",
    description: "Detailed breaking down collected fees vs outstanding dues per group with collector receipt logs.",
    domainId: "fees",
    icon: DollarSign,
    badge: "Financial",
    lastGenerated: "09 Aug 2026",
    downloadsCount: 64,
  },
  {
    id: "preset-4",
    title: "Calling Outreach & Admissions Funnel Report",
    category: "Admissions",
    description: "Conversion metrics for phone call leads, scheduled visits, and enrolled student registrations.",
    domainId: "calling",
    icon: Phone,
    badge: "Pipeline",
    lastGenerated: "08 Aug 2026",
    downloadsCount: 51,
  },
  {
    id: "preset-5",
    title: "Weekly Leadership Mashwara Karguzari Tracker",
    category: "Leadership",
    description: "Summary of decisions logged, action items completed, and Murabbi meeting attendance percentages.",
    domainId: "mashwara",
    icon: ClipboardList,
    badge: "Executive",
    lastGenerated: "07 Aug 2026",
    downloadsCount: 38,
  },
  {
    id: "preset-6",
    title: "Student Gamification Points & Badge Leaderboard",
    category: "Gamification",
    description: "Park-wide leaderboard showing top performing students, earned badges, and active attendance streaks.",
    domainId: "gamification",
    icon: Award,
    badge: "Engagement",
    lastGenerated: "05 Aug 2026",
    downloadsCount: 76,
  },
];

// ─── Scheduled Auto-Digests Mock Data ───
interface ScheduledDigest {
  id: string;
  name: string;
  domain: string;
  frequency: string;
  channel: "Email" | "WhatsApp" | "Both";
  recipients: string;
  status: "Active" | "Paused";
  nextRun: string;
}

const INITIAL_SCHEDULED_DIGESTS: ScheduledDigest[] = [
  {
    id: "digest-1",
    name: "Weekly Executive Operations Summary",
    domain: "Attendance & Fees",
    frequency: "Every Monday at 08:00 AM",
    channel: "Both",
    recipients: "cityhead@shabab360.org, +923001234567",
    status: "Active",
    nextRun: "17 Aug 2026, 08:00 AM",
  },
  {
    id: "digest-2",
    name: "Bi-Weekly Calling Pipeline Status",
    domain: "Calling Outreach",
    frequency: "Every 2nd Friday at 05:00 PM",
    channel: "Email",
    recipients: "calling.lead@shabab360.org",
    status: "Active",
    nextRun: "14 Aug 2026, 05:00 PM",
  },
  {
    id: "digest-3",
    name: "Monthly Fee Collection Audit",
    domain: "Fee Collections",
    frequency: "1st of every month at 09:00 AM",
    channel: "Both",
    recipients: "finance@shabab360.org, +923219876543",
    status: "Active",
    nextRun: "01 Sep 2026, 09:00 AM",
  },
  {
    id: "digest-4",
    name: "Weekly Mashwara Action Items Summary",
    domain: "Mashwara Leadership",
    frequency: "Every Sunday at 09:00 PM",
    channel: "WhatsApp",
    recipients: "+923060221997, +923047178171",
    status: "Paused",
    nextRun: "Paused",
  },
];

// ─── Mock Preview Records Generator ───
function generateMockRecords(domainId: string, count: number = 10) {
  if (domainId === "attendance") {
    return [
      { participant_name: "Muhammad Umair", park_name: "Gulberg Park", group_name: "Group 1 (Ikram)", session_date: "2026-08-09", status: "Present", murabbi_name: "Ikram Meer", guardian_phone: "923274088002", consecutive_absences: 0 },
      { participant_name: "Muhammad Ahmad", park_name: "Gulberg Park", group_name: "Group 1 (Ikram)", session_date: "2026-08-09", status: "Present", murabbi_name: "Ikram Meer", guardian_phone: "923001122334", consecutive_absences: 0 },
      { participant_name: "M Abdullah Qureshi", park_name: "Gulberg Park", group_name: "Group 1 (Ikram)", session_date: "2026-08-09", status: "Absent", murabbi_name: "Ikram Meer", guardian_phone: "923334455667", consecutive_absences: 2 },
      { participant_name: "Hassan Raza", park_name: "Gulshan Iqbal", group_name: "Group 1 (Fahad)", session_date: "2026-08-09", status: "Present", murabbi_name: "Fahad bhai", guardian_phone: "923129876543", consecutive_absences: 0 },
      { participant_name: "Zaid Ali", park_name: "Gulshan Iqbal", group_name: "Group 2 (Danish)", session_date: "2026-08-09", status: "Late", murabbi_name: "Danish Qureshi", guardian_phone: "923456789012", consecutive_absences: 0 },
      { participant_name: "Bilal Hussain", park_name: "Griffin Park", group_name: "Group 1 (Hamza)", session_date: "2026-08-09", status: "Present", murabbi_name: "Hamza Tanveer", guardian_phone: "923012345678", consecutive_absences: 0 },
      { participant_name: "Hamza Tariq", park_name: "Johar Town", group_name: "Group 1 (Usman)", session_date: "2026-08-09", status: "Present", murabbi_name: "Usman Ghani", guardian_phone: "923112233445", consecutive_absences: 0 },
      { participant_name: "Usman Khalid", park_name: "Gulshan Ravi", group_name: "Group 1 (Ali)", session_date: "2026-08-09", status: "Leave", murabbi_name: "Ali Raza", guardian_phone: "923223344556", consecutive_absences: 0 },
    ];
  }
  if (domainId === "fees") {
    return [
      { student_name: "Muhammad Umair", park_name: "Gulberg Park", fee_month: "August 2026", amount_due: 1500, amount_paid: 1500, payment_status: "Paid", receipt_no: "REC-2026-0841", payment_date: "2026-08-03", collector_name: "Basit Ahsan" },
      { student_name: "M Abdullah Qureshi", park_name: "Gulberg Park", fee_month: "August 2026", amount_due: 1500, amount_paid: 0, payment_status: "Pending", receipt_no: "-", payment_date: "-", collector_name: "-" },
      { student_name: "Hassan Raza", park_name: "Gulshan Iqbal", fee_month: "August 2026", amount_due: 1500, amount_paid: 1500, payment_status: "Paid", receipt_no: "REC-2026-0842", payment_date: "2026-08-04", collector_name: "Fahad bhai" },
      { student_name: "Zaid Ali", park_name: "Gulshan Iqbal", fee_month: "August 2026", amount_due: 1500, amount_paid: 750, payment_status: "Partial", receipt_no: "REC-2026-0843", payment_date: "2026-08-05", collector_name: "Danish Qureshi" },
      { student_name: "Bilal Hussain", park_name: "Griffin Park", fee_month: "August 2026", amount_due: 1500, amount_paid: 1500, payment_status: "Paid", receipt_no: "REC-2026-0844", payment_date: "2026-08-02", collector_name: "Hamza Tanveer" },
    ];
  }
  if (domainId === "calling") {
    return [
      { lead_name: "Omer Tariq", guardian_name: "Tariq Mahmood", phone_number: "923001234567", call_status: "Completed", call_outcome: "Enrolled", assigned_caller: "Hanzala Tauseef", campaign_name: "Batch 4 Recruitment", next_followup: "Completed" },
      { lead_name: "Saad Rehman", guardian_name: "Abid Rehman", phone_number: "923119876543", call_status: "Pending", call_outcome: "Callback Requested", assigned_caller: "Hasnain Zafar", campaign_name: "Batch 4 Recruitment", next_followup: "2026-08-11" },
      { lead_name: "Kashif Ali", guardian_name: "Ali Ahmed", phone_number: "923224567890", call_status: "Completed", call_outcome: "Interested", assigned_caller: "Ikram Meer", campaign_name: "Batch 4 Recruitment", next_followup: "2026-08-12" },
      { lead_name: "Daniyal Shah", guardian_name: "Shahid Shah", phone_number: "923338765432", call_status: "Completed", call_outcome: "Not Interested", assigned_caller: "Imran Amin", campaign_name: "Batch 4 Recruitment", next_followup: "-" },
    ];
  }
  if (domainId === "mashwara") {
    return [
      { session_title: "Gulberg Weekly Leadership Mashwara", city_park: "Gulberg Park", scheduled_date: "2026-08-08", attendee_count: 11, decisions_count: 4, action_items_status: "3 Done / 1 Pending", organized_by: "Umar Rohail" },
      { session_title: "Gulshan Iqbal Karguzari Session", city_park: "Gulshan Iqbal", scheduled_date: "2026-08-07", attendee_count: 9, decisions_count: 3, action_items_status: "2 Done / 1 Pending", organized_by: "Fahad bhai" },
      { session_title: "Lahore City Central Mashwara", city_park: "All Lahore Parks", scheduled_date: "2026-08-04", attendee_count: 24, decisions_count: 8, action_items_status: "6 Done / 2 Pending", organized_by: "City Head Lahore" },
    ];
  }
  if (domainId === "procurement") {
    return [
      { item_name: "Football Official Size 5", category: "Sports Equipment", total_stock: 45, allocated_park: "Gulberg Park (12)", reorder_level: 10, condition_status: "Good", last_audited: "2026-08-01" },
      { item_name: "Cricket Leather Balls", category: "Sports Equipment", total_stock: 60, allocated_park: "Gulshan Iqbal (15)", reorder_level: 15, condition_status: "Good", last_audited: "2026-08-01" },
      { item_name: "Shabab Batch 4 Tracksuits", category: "Uniforms & Merch", total_stock: 180, allocated_park: "All Parks", reorder_level: 30, condition_status: "New", last_audited: "2026-07-28" },
      { item_name: "First Aid Portable Kits", category: "Safety & Health", total_stock: 12, allocated_park: "2 Per Park", reorder_level: 5, condition_status: "Operational", last_audited: "2026-08-02" },
    ];
  }
  // Default / Gamification
  return [
    { student_name: "Muhammad Umair", park_name: "Gulberg Park", group_name: "Group 1", total_points: 480, badges_count: 6, top_badge: "Punctuality Master", streak_days: 14 },
    { student_name: "Muhammad Ahmad", park_name: "Gulberg Park", group_name: "Group 1", total_points: 420, badges_count: 5, top_badge: "Tadreeb Star", streak_days: 12 },
    { student_name: "Hassan Raza", park_name: "Gulshan Iqbal", group_name: "Group 1", total_points: 510, badges_count: 7, top_badge: "Overall Champ", streak_days: 18 },
    { student_name: "Bilal Hussain", park_name: "Griffin Park", group_name: "Group 1", total_points: 390, badges_count: 4, top_badge: "Sports Ace", streak_days: 9 },
  ];
}

export function CustomReportBuilderPage() {
  const { data: session } = useSession();

  // Active view tab
  const [activeTab, setActiveTab] = useState<"builder" | "presets" | "digests">("builder");

  // Selected Data Domain
  const [selectedDomainId, setSelectedDomainId] = useState<string>("attendance");
  const activeDomain = useMemo(
    () => DATA_DOMAINS.find((d) => d.id === selectedDomainId) || DATA_DOMAINS[0],
    [selectedDomainId]
  );

  // Selected Columns per domain state
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    DATA_DOMAINS.forEach((domain) => {
      initial[domain.id] = domain.columns
        .filter((col) => col.defaultSelected)
        .map((col) => col.id);
    });
    return initial;
  });

  // Current domain selected columns
  const currentDomainColumns = selectedColumns[selectedDomainId] || [];

  const toggleColumn = (colId: string) => {
    setSelectedColumns((prev) => {
      const current = prev[selectedDomainId] || [];
      const updated = current.includes(colId)
        ? current.filter((id) => id !== colId)
        : [...current, colId];
      return { ...prev, [selectedDomainId]: updated };
    });
  };

  const selectAllColumns = () => {
    setSelectedColumns((prev) => ({
      ...prev,
      [selectedDomainId]: activeDomain.columns.map((c) => c.id),
    }));
  };

  const deselectAllColumns = () => {
    setSelectedColumns((prev) => ({
      ...prev,
      [selectedDomainId]: [],
    }));
  };

  // Scope Filters
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [parkFilter, setParkFilter] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>("batch-4");
  const [startDate, setStartDate] = useState<string>("2026-08-01");
  const [endDate, setEndDate] = useState<string>("2026-08-10");

  // Live Preview Modal / Drawer
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Save Preset Modal State
  const [isSavePresetOpen, setIsSavePresetOpen] = useState<boolean>(false);
  const [presetTitle, setPresetTitle] = useState<string>("");
  const [presetDescription, setPresetDescription] = useState<string>("");

  // Scheduled Digests State
  const [digests, setDigests] = useState<ScheduledDigest[]>(INITIAL_SCHEDULED_DIGESTS);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [digestName, setDigestName] = useState<string>("");
  const [digestFrequency, setDigestFrequency] = useState<string>("Weekly on Mondays");
  const [digestChannel, setDigestChannel] = useState<"Email" | "WhatsApp" | "Both">("Both");
  const [digestRecipients, setDigestRecipients] = useState<string>("");

  // Presets State
  const [presets, setPresets] = useState<ReportPreset[]>(PRESET_TEMPLATES);

  // Preview Data
  const previewRecords = useMemo(() => generateMockRecords(selectedDomainId), [selectedDomainId]);

  // Handlers
  const handleExport = (format: "csv" | "xlsx" | "pdf") => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      const filename = `Shabab360_${activeDomain.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.${format}`;
      toast.success(`Export generated successfully! Downloaded: ${filename}`);
    }, 1200);
  };

  const handleSavePreset = () => {
    if (!presetTitle.trim()) {
      toast.error("Please enter a title for your preset");
      return;
    }
    const newPreset: ReportPreset = {
      id: `preset-${Date.now()}`,
      title: presetTitle,
      category: activeDomain.name.split("&")[0].trim(),
      description: presetDescription || `Custom template for ${activeDomain.name} reporting.`,
      domainId: selectedDomainId,
      icon: activeDomain.icon,
      badge: "Custom",
      lastGenerated: "Just now",
      downloadsCount: 1,
    };
    setPresets([newPreset, ...presets]);
    setIsSavePresetOpen(false);
    setPresetTitle("");
    setPresetDescription("");
    toast.success(`Saved custom preset: "${newPreset.title}"`);
  };

  const handleScheduleDigest = () => {
    if (!digestName.trim() || !digestRecipients.trim()) {
      toast.error("Please provide digest name and recipient contact details.");
      return;
    }
    const newDigest: ScheduledDigest = {
      id: `digest-${Date.now()}`,
      name: digestName,
      domain: activeDomain.name,
      frequency: digestFrequency,
      channel: digestChannel,
      recipients: digestRecipients,
      status: "Active",
      nextRun: "Upcoming on schedule",
    };
    setDigests([newDigest, ...digests]);
    setIsScheduleModalOpen(false);
    setDigestName("");
    setDigestRecipients("");
    toast.success(`Scheduled auto-digest "${newDigest.name}" created!`);
  };

  const toggleDigestStatus = (id: string) => {
    setDigests((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextStatus = d.status === "Active" ? "Paused" : "Active";
          toast.info(`Digest "${d.name}" is now ${nextStatus}`);
          return { ...d, status: nextStatus, nextRun: nextStatus === "Active" ? "Upcoming on schedule" : "Paused" };
        }
        return d;
      })
    );
  };

  const runPreset = (preset: ReportPreset) => {
    setSelectedDomainId(preset.domainId);
    setActiveTab("builder");
    setIsPreviewOpen(true);
    toast.info(`Loaded configuration for "${preset.title}"`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-6 space-y-6">
      {/* ─── Page Title & Actions ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Advanced Analytics & Custom Report Builder
            </h1>
            <Badge className="bg-[#4B0A8F] text-white hover:bg-[#3b0873]">v2.5 Studio</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Design dynamic custom reports, pick metrics & columns, filter across scopes, and export PDF/Excel or schedule auto-digests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSavePresetOpen(true)}
            className="gap-2 border-slate-300 dark:border-slate-700"
          >
            <Bookmark className="size-4 text-purple-600 dark:text-purple-400" />
            <span>Save Preset</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDigestName(`${activeDomain.name} Weekly Digest`);
              setIsScheduleModalOpen(true);
            }}
            className="gap-2 border-slate-300 dark:border-slate-700"
          >
            <Send className="size-4 text-blue-600 dark:text-blue-400" />
            <span>Schedule Digest</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            className="gap-2 bg-[#4B0A8F] hover:bg-[#3b0873] text-white shadow"
          >
            <Eye className="size-4" />
            <span>Live Report Preview</span>
          </Button>
        </div>
      </div>

      {/* ─── 4 Top KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saved Presets
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{presets.length} Templates</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                  Executive & Operational
                </p>
              </div>
              <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Bookmark className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Data Records Analyzed
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">12,450 Records</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  Across 6 Parks & 4 Batches
                </p>
              </div>
              <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Layers className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Scheduled Digests
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {digests.filter((d) => d.status === "Active").length} Active Digests
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                  Email & WhatsApp Delivery
                </p>
              </div>
              <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Send className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly Exports
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-1">84 Exports</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  PDF, XLSX & CSV Formats
                </p>
              </div>
              <div className="size-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <FileSpreadsheet className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="builder" className="gap-2 text-xs font-medium rounded-lg">
            <SlidersHorizontal className="size-3.5" />
            <span>Report Builder</span>
          </TabsTrigger>
          <TabsTrigger value="presets" className="gap-2 text-xs font-medium rounded-lg">
            <Bookmark className="size-3.5" />
            <span>Presets ({presets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="digests" className="gap-2 text-xs font-medium rounded-lg">
            <Send className="size-3.5" />
            <span>Auto-Digests ({digests.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: INTERACTIVE REPORT BUILDER ─── */}
        <TabsContent value="builder" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Data Domain & Column Selection (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Data Domain Selection */}
              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <span className="size-6 rounded-full bg-[#4B0A8F] text-white flex items-center justify-center text-xs font-bold">1</span>
                        Select Data Domain
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Choose the primary dataset module to build your report from.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {DATA_DOMAINS.length} Domains Available
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DATA_DOMAINS.map((domain) => {
                      const Icon = domain.icon;
                      const isSelected = domain.id === selectedDomainId;
                      return (
                        <div
                          key={domain.id}
                          onClick={() => setSelectedDomainId(domain.id)}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden",
                            isSelected
                              ? "border-[#4B0A8F] bg-purple-50/50 dark:bg-purple-950/20 shadow-sm ring-1 ring-[#4B0A8F]"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "size-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br",
                                domain.color
                              )}
                            >
                              <Icon className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-foreground truncate">{domain.name}</h4>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                                {domain.description}
                              </p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 text-[#4B0A8F] dark:text-purple-400">
                              <CheckCircle2 className="size-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Dynamic Column Selector */}
              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <span className="size-6 rounded-full bg-[#4B0A8F] text-white flex items-center justify-center text-xs font-bold">2</span>
                        Configure Report Columns
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Select which data fields to include in the exported report ({currentDomainColumns.length} of {activeDomain.columns.length} selected).
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllColumns}
                        className="h-7 text-xs text-purple-600 dark:text-purple-400"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllColumns}
                        className="h-7 text-xs text-muted-foreground"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {activeDomain.columns.map((col) => {
                      const isChecked = currentDomainColumns.includes(col.id);
                      return (
                        <label
                          key={col.id}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                            isChecked
                              ? "bg-white dark:bg-slate-800 text-foreground shadow-2xs border border-purple-200 dark:border-purple-900/40"
                              : "text-muted-foreground hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleColumn(col.id)}
                            className="size-4 data-[state=checked]:bg-[#4B0A8F] data-[state=checked]:border-[#4B0A8F]"
                          />
                          <span className="truncate">{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Scope Filters & Export Actions (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Step 3: Scope & Date Filters */}
              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span className="size-6 rounded-full bg-[#4B0A8F] text-white flex items-center justify-center text-xs font-bold">3</span>
                    Scope & Date Range Filters
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Narrow your query by organizational entity and timeframe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* City Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      City Scope
                    </Label>
                    <select
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="all">🌐 All Cities (Lahore & Rawalpindi)</option>
                      <option value="lahore">📍 Lahore Region</option>
                      <option value="rawalpindi">📍 Rawalpindi Region</option>
                    </select>
                  </div>

                  {/* Park Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <TreePine className="size-3.5 text-muted-foreground" />
                      Park Scope
                    </Label>
                    <select
                      value={parkFilter}
                      onChange={(e) => setParkFilter(e.target.value)}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="all">🌳 All Parks (6 Active Parks)</option>
                      <option value="gulberg">Gulberg Park</option>
                      <option value="gulshan-iqbal">Gulshan Iqbal Park</option>
                      <option value="griffin">Griffin Park</option>
                      <option value="johar-town">Johar Town Park</option>
                      <option value="gulshan-ravi">Gulshan Ravi Park</option>
                      <option value="state-life">State Life Park</option>
                    </select>
                  </div>

                  {/* Batch Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Layers className="size-3.5 text-muted-foreground" />
                      Batch Cohort
                    </Label>
                    <select
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="batch-4">Lahore Batch 4 (Current Active)</option>
                      <option value="batch-3">Lahore Batch 3 (Alumni)</option>
                      <option value="all">All Cohorts & Batches</option>
                    </select>
                  </div>

                  {/* Date Range Picker */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        Start Date
                      </Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        End Date
                      </Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 4: Export & Output Actions */}
              <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl bg-gradient-to-br from-purple-50/40 via-background to-slate-50/50 dark:from-purple-950/10 dark:to-slate-900/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span className="size-6 rounded-full bg-[#4B0A8F] text-white flex items-center justify-center text-xs font-bold">4</span>
                    Generate & Export Output
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Preview live data on-screen or download ready-to-share export formats.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <Button
                    onClick={() => setIsPreviewOpen(true)}
                    className="w-full bg-[#4B0A8F] hover:bg-[#3b0873] text-white gap-2 shadow"
                  >
                    <Eye className="size-4" />
                    <span>View Live On-Screen Preview</span>
                  </Button>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExporting}
                      onClick={() => handleExport("csv")}
                      className="gap-1.5 text-xs border-slate-300 dark:border-slate-700"
                    >
                      <Download className="size-3.5 text-slate-600 dark:text-slate-400" />
                      <span>CSV</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExporting}
                      onClick={() => handleExport("xlsx")}
                      className="gap-1.5 text-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <FileSpreadsheet className="size-3.5" />
                      <span>Excel (.xlsx)</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExporting}
                      onClick={() => handleExport("pdf")}
                      className="gap-1.5 text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <FileText className="size-3.5" />
                      <span>PDF</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 2: EXECUTIVE REPORT PRESETS ─── */}
        <TabsContent value="presets" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Pre-Configured Report Presets</h3>
              <p className="text-xs text-muted-foreground">
                Instant executive templates ready to run or schedule with one click.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSavePresetOpen(true)}
              className="gap-2 text-xs"
            >
              <Plus className="size-3.5" />
              <span>Create New Preset</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((preset) => {
              const Icon = preset.icon;
              return (
                <Card
                  key={preset.id}
                  className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="size-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#4B0A8F] dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Icon className="size-5" />
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {preset.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground mt-2 line-clamp-1">
                      {preset.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {preset.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5">
                      <span>Last generated: {preset.lastGenerated}</span>
                      <span className="font-medium">{preset.downloadsCount} runs</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        onClick={() => runPreset(preset)}
                        className="flex-1 bg-[#4B0A8F] hover:bg-[#3b0873] text-white text-xs h-8 gap-1.5"
                      >
                        <Play className="size-3 fill-current" />
                        <span>Run & Preview</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDigestName(preset.title);
                          setSelectedDomainId(preset.domainId);
                          setIsScheduleModalOpen(true);
                        }}
                        className="h-8 text-xs border-slate-300 dark:border-slate-700"
                        title="Schedule Digest"
                      >
                        <Send className="size-3 text-blue-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── TAB 3: SCHEDULED AUTO-DIGESTS ─── */}
        <TabsContent value="digests" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Automated Scheduled Report Delivery</h3>
              <p className="text-xs text-muted-foreground">
                Configure recurring report dispatches delivered directly to Email or WhatsApp.
              </p>
            </div>
            <Button
              onClick={() => {
                setDigestName("");
                setIsScheduleModalOpen(true);
              }}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white gap-2 text-xs"
            >
              <Plus className="size-3.5" />
              <span>Schedule New Digest</span>
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-muted-foreground border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Digest Name</th>
                    <th className="py-3 px-4">Data Domain</th>
                    <th className="py-3 px-4">Schedule Frequency</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Recipients</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
                  {digests.map((digest) => (
                    <tr key={digest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{digest.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{digest.domain}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-slate-400" />
                          <span>{digest.frequency}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          {digest.channel === "Email" && <Mail className="size-3 text-blue-500" />}
                          {digest.channel === "WhatsApp" && <MessageSquare className="size-3 text-emerald-500" />}
                          {digest.channel === "Both" && <Sparkles className="size-3 text-purple-500" />}
                          <span>{digest.channel}</span>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px] truncate max-w-[200px]">
                        {digest.recipients}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={cn(
                            "text-[10px]",
                            digest.status === "Active"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-100"
                          )}
                        >
                          {digest.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDigestStatus(digest.id)}
                            className="h-7 text-xs"
                          >
                            {digest.status === "Active" ? "Pause" : "Resume"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.success(`Triggered instant manual dispatch for "${digest.name}"`)}
                            className="h-7 text-xs text-purple-600 dark:text-purple-400"
                          >
                            Trigger Now
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── LIVE REPORT PREVIEW DRAWER / MODAL ─── */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Eye className="size-5 text-[#4B0A8F]" />
                  Live Report On-Screen Preview
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {activeDomain.name} | Filters: {cityFilter.toUpperCase()} City, {parkFilter.toUpperCase()} Park, {batchFilter.toUpperCase()} Batch
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("csv")}
                  className="h-8 text-xs gap-1"
                >
                  <Download className="size-3.5" />
                  <span>CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("xlsx")}
                  className="h-8 text-xs gap-1 text-emerald-600 border-emerald-200"
                >
                  <FileSpreadsheet className="size-3.5" />
                  <span>Excel</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExport("pdf")}
                  className="h-8 text-xs gap-1 bg-[#4B0A8F] hover:bg-[#3b0873] text-white"
                >
                  <FileText className="size-3.5" />
                  <span>PDF Export</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-muted-foreground font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      {activeDomain.columns
                        .filter((col) => currentDomainColumns.includes(col.id))
                        .map((col) => (
                          <th key={col.id} className="py-3 px-4 whitespace-nowrap">
                            {col.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-foreground">
                    {previewRecords.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                        {activeDomain.columns
                          .filter((col) => currentDomainColumns.includes(col.id))
                          .map((col) => (
                            <td key={col.id} className="py-2.5 px-4 whitespace-nowrap font-medium">
                              {(row as any)[col.id] !== undefined ? (
                                String((row as any)[col.id])
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Showing {previewRecords.length} mock sample rows (Full export includes all matched database records).</span>
              <span className="font-mono">Columns Included: {currentDomainColumns.length}</span>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SAVE CUSTOM PRESET MODAL ─── */}
      <Dialog open={isSavePresetOpen} onOpenChange={setIsSavePresetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Bookmark className="size-5 text-[#4B0A8F]" />
              Save Custom Report Preset
            </DialogTitle>
            <DialogDescription className="text-xs">
              Save your current data domain ({activeDomain.name}), selected columns ({currentDomainColumns.length}), and filter criteria as a reusable template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Preset Title *</Label>
              <Input
                placeholder="e.g. Weekly Gulberg Attendance & Absence Summary"
                value={presetTitle}
                onChange={(e) => setPresetTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description (Optional)</Label>
              <Input
                placeholder="Brief summary of what this preset tracks..."
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSavePresetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white">
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SCHEDULE AUTO-DIGEST MODAL ─── */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Send className="size-5 text-[#4B0A8F]" />
              Schedule Automated Report Digest
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set up automated dispatches of this report to executive stakeholders via Email or WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Digest Name *</Label>
              <Input
                placeholder="e.g. Weekly Executive Operations Summary"
                value={digestName}
                onChange={(e) => setDigestName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Schedule Frequency</Label>
                <select
                  value={digestFrequency}
                  onChange={(e) => setDigestFrequency(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="Daily at 08:00 AM">Daily at 08:00 AM</option>
                  <option value="Weekly on Mondays">Weekly on Mondays</option>
                  <option value="Bi-Weekly on Fridays">Bi-Weekly on Fridays</option>
                  <option value="Monthly on 1st">Monthly on 1st</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Delivery Channel</Label>
                <select
                  value={digestChannel}
                  onChange={(e) => setDigestChannel(e.target.value as any)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value="Both">Both Email & WhatsApp</option>
                  <option value="Email">Email Only</option>
                  <option value="WhatsApp">WhatsApp Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Recipients (Email or WhatsApp #s) *</Label>
              <Input
                placeholder="e.g. cityhead@shabab360.org, +923001234567"
                value={digestRecipients}
                onChange={(e) => setDigestRecipients(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Separate multiple recipients with commas.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleDigest} className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white">
              Create Digest Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
