"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  DollarSign,
  TrendingUp,
  Wallet,
  BarChart3,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Building2,
  TreePine,
  CalendarRange,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Layers,
  Search,
  Printer,
  ShieldCheck,
  Mail,
  Percent,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { ExportButton } from "@/components/shared/export-button";
import { FeeReceipt, type FeeReceiptData } from "@/components/shared/fee-receipt";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CityOption { id: string; name: string; }
interface ParkOption { id: string; name: string; cityId: string; }
interface BatchOption { id: string; name: string; parkId: string; }

interface FeeEventItem {
  id: string;
  batchId: string;
  title: string;
  feeType: string;
  amount: number;
  dueDate: string | null;
  isActive: boolean;
  createdAt: string;
  batch: {
    id: string;
    name: string;
    park: { id: string; name: string; city: { id: string; name: string } };
  };
  totalPaid: number;
  totalExpected: number;
  paidCount: number;
  totalParticipants: number;
  rate: number;
  dueDateStatus: "overdue" | "upcoming" | "paid" | "none";
  discountAmount?: number;
  waiverReason?: string;
  reminderCount?: number;
  reminderSentAt?: string;
}

interface FeeEventDetail extends FeeEventItem {
  updatedAt: string;
  payments: PaymentItem[];
  unpaidParticipants: ParticipantItem[];
}

interface PaymentItem {
  id: string;
  amount: number;
  method: string;
  receiptNo: string | null;
  recordedBy: string | null;
  notes: string | null;
  createdAt: string;
  participant: { id: string; name: string; phone: string | null; group: { name: string } | null };
  isPartial?: boolean;
  remaining?: number;
}

interface ParticipantItem {
  id: string;
  name: string;
  phone: string | null;
  group: { id: string; name: string } | null;
  totalPaid?: number;
  remaining?: number;
  isPartial?: boolean;
}

interface FeesResponse {
  data: FeeEventItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { totalFeeEvents: number; totalExpected: number; totalCollected: number; collectionRate: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Karachi",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}

function getRateColor(rate: number): string {
  if (rate >= 80) return "bg-green-500 dark:bg-green-600";
  if (rate >= 50) return "bg-amber-500 dark:bg-amber-600";
  return "bg-[#FF0015] dark:bg-[#FF4D4D]";
}

function getFeeTypeBadgeColor(type: string): string {
  switch (type) {
    case "tuition":
      return "bg-[#4B0A8F]/10 text-[#4B0A8F] dark:bg-[#4B0A8F]/20 dark:text-[#B87EE0] border-[#4B0A8F]/20";
    case "admission":
      return "bg-[#A0006B]/10 text-[#A0006B] dark:bg-[#A0006B]/20 dark:text-[#E06BAF] border-[#A0006B]/20";
    default:
      return "bg-[#2A0C8F]/10 text-[#2A0C8F] dark:bg-[#2A0C8F]/20 dark:text-[#8A6DD6] border-[#2A0C8F]/20";
  }
}

function getMethodBadge(method: string): string {
  switch (method) {
    case "cash":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "bank":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "online":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Filter state
  const [filterCityId, setFilterCityId] = useState<string>("");
  const [filterParkId, setFilterParkId] = useState<string>("");
  const [filterBatchId, setFilterBatchId] = useState<string>("");
  const [filterFeeType, setFilterFeeType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [page, setPage] = useState(1);

  // Dialog / Sheet state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [batchGenOpen, setBatchGenOpen] = useState(false);

  // Receipt dialog state
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

  // Batch generate state
  const [bgTitle, setBgTitle] = useState("");
  const [bgFeeType, setBgFeeType] = useState("");
  const [bgAmount, setBgAmount] = useState("");
  const [bgDueDate, setBgDueDate] = useState("");
  const [bgSelectedIds, setBgSelectedIds] = useState<string[]>([]);
  const [bgCityId, setBgCityId] = useState("");
  const [bgParkId, setBgParkId] = useState("");
  const [bgSearch, setBgSearch] = useState("");
  const [bgErrors, setBgErrors] = useState<Record<string, string>>({});

  // Form state
  const [formBatchId, setFormBatchId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formFeeType, setFormFeeType] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Payment form
  const [payParticipantId, setPayParticipantId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payErrors, setPayErrors] = useState<Record<string, string>>({});

  // Edit form
  const [editTitle, setEditTitle] = useState("");
  const [editFeeType, setEditFeeType] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const [selectedFeeEvent, setSelectedFeeEvent] = useState<FeeEventItem | null>(null);

  // Waiver state
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [waiverAmount, setWaiverAmount] = useState("");
  const [waiverReason, setWaiverReason] = useState("");
  const [waiverErrors, setWaiverErrors] = useState<Record<string, string>>({});

  // Session for role check
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  // ---- Queries ----

  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["admin-cities-dropdown"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 60000,
  });

  const { data: parks } = useQuery<ParkOption[]>({
    queryKey: ["admin-parks-dropdown", filterCityId],
    queryFn: () => {
      const url = filterCityId
        ? `/api/admin/parks?cityId=${filterCityId}`
        : "/api/admin/parks";
      return fetch(url).then((r) => r.json());
    },
    staleTime: 30000,
  });

  const { data: batches } = useQuery<BatchOption[]>({
    queryKey: ["admin-batches-dropdown", filterParkId],
    queryFn: () => {
      const url = filterParkId
        ? `/api/admin/batches?parkId=${filterParkId}`
        : "/api/admin/batches";
      return fetch(url).then((r) => r.json());
    },
    staleTime: 30000,
  });

  // Form cascading batches
  const [formCityId, setFormCityId] = useState("");
  const [formParkId, setFormParkId] = useState("");

  const { data: formParks } = useQuery<ParkOption[]>({
    queryKey: ["fees-form-parks", formCityId],
    queryFn: () => {
      const url = formCityId
        ? `/api/admin/parks?cityId=${formCityId}`
        : "/api/admin/parks";
      return fetch(url).then((r) => r.json());
    },
    staleTime: 30000,
    enabled: createOpen,
  });

  const { data: formBatches } = useQuery<BatchOption[]>({
    queryKey: ["fees-form-batches", formParkId],
    queryFn: () => {
      const url = formParkId
        ? `/api/admin/batches?parkId=${formParkId}`
        : "/api/admin/batches";
      return fetch(url).then((r) => r.json());
    },
    staleTime: 30000,
    enabled: createOpen && !!formParkId,
  });

  // Batch generate queries
  const { data: bgParks } = useQuery<ParkOption[]>({
    queryKey: ["batch-gen-parks", bgCityId],
    queryFn: () => {
      const url = bgCityId
        ? `/api/admin/parks?cityId=${bgCityId}`
        : "/api/admin/parks";
      return fetch(url).then((r) => r.json());
    },
    staleTime: 30000,
    enabled: batchGenOpen,
  });

  const { data: bgBatches } = useQuery<BatchOption[]>({
    queryKey: ["batch-gen-batches", bgParkId],
    queryFn: () => {
      const url = bgParkId
        ? `/api/admin/batches?parkId=${bgParkId}`
        : "/api/admin/batches";
      return fetch(url).then((r) => r.json());
    },
    staleTime: 30000,
    enabled: batchGenOpen && !!bgParkId,
  });

  // Filtered batches for the generate dialog
  const filteredBgBatches = useMemo(() => {
    let list = bgBatches || [];
    if (bgCityId && bgParks) {
      const parkIds = new Set(bgParks.filter(p => p.cityId === bgCityId).map(p => p.id));
      list = list.filter(b => parkIds.has(b.parkId));
    }
    if (bgSearch.trim()) {
      const s = bgSearch.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(s));
    }
    return list;
  }, [bgBatches, bgParks, bgCityId, bgSearch]);

  const filteredBgParks = useMemo(() => {
    if (!bgParks) return [];
    if (!bgCityId) return bgParks;
    return bgParks.filter(p => p.cityId === bgCityId);
  }, [bgParks, bgCityId]);

  // Fee events
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filterCityId) p.set("cityId", filterCityId);
    if (filterParkId) p.set("parkId", filterParkId);
    if (filterBatchId) p.set("batchId", filterBatchId);
    if (filterFeeType) p.set("feeType", filterFeeType);
    if (filterStatus) p.set("status", filterStatus);
    p.set("page", String(page));
    return p.toString();
  }, [filterCityId, filterParkId, filterBatchId, filterFeeType, filterStatus, page]);

  const { data: feesData, isLoading } = useQuery<FeesResponse>({
    queryKey: ["admin-fees", queryParams],
    queryFn: () => fetch(`/api/admin/fees?${queryParams}`).then((r) => r.json()),
    staleTime: 10000,
  });

  // Fee event detail
  const { data: feeDetail, isLoading: detailLoading } = useQuery<FeeEventDetail>({
    queryKey: ["admin-fee-detail", selectedFeeEvent?.id],
    queryFn: () =>
      fetch(`/api/admin/fees/${selectedFeeEvent!.id}`).then((r) => r.json()),
    enabled: detailOpen && !!selectedFeeEvent?.id,
  });

  // ---- Mutations ----

  const createMutation = useMutation({
    mutationFn: (data: {
      batchId: string;
      title: string;
      feeType: string;
      amount: number;
      dueDate?: string;
    }) =>
      fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fees"] });
      toast.success("Fee event created successfully");
      closeCreateDialog();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") {
          setFormErrors(err.error);
        } else {
          toast.error(err.error);
        }
      } else {
        toast.error("Failed to create fee event");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        feeType?: string;
        amount?: number;
        dueDate?: string | null;
      };
    }) =>
      fetch(`/api/admin/fees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fees"] });
      toast.success("Fee event updated successfully");
      closeEditDialog();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") {
          setFormErrors(err.error);
        } else {
          toast.error(err.error);
        }
      } else {
        toast.error("Failed to update fee event");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/fees/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fees"] });
      toast.success("Fee event deactivated successfully");
      setDeleteOpen(false);
      setSelectedFeeEvent(null);
      setDetailOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to deactivate fee event");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({
      feeEventId,
      data,
    }: {
      feeEventId: string;
      data: {
        participantId: string;
        amount: number;
        method: string;
        notes?: string;
      };
    }) =>
      fetch(`/api/admin/fees/${feeEventId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fee-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fees"] });
      resetPaymentForm();

      if (res.receiptData) {
        toast.success("Payment recorded successfully", {
          action: {
            label: "Print Receipt",
            onClick: () => generateReceipt(res.receiptData as ReceiptData),
          },
          duration: 8000,
        });
      } else {
        toast.success("Payment recorded successfully");
      }
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") {
          setPayErrors(err.error);
        } else {
          toast.error(err.error);
        }
      } else {
        toast.error("Failed to record payment");
      }
    },
  });

  // Batch generate mutation
  const batchGenMutation = useMutation({
    mutationFn: (data: {
      batchIds: string[];
      title: string;
      feeType: string;
      amount: number;
      dueDate?: string;
    }) =>
      fetch("/api/admin/fees/batch-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fees"] });
      toast.success(`Generated ${res.created} fee events successfully${res.failed > 0 ? ` (${res.failed} failed)` : ""}`);
      closeBatchGenDialog();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") {
          setBgErrors(err.error);
        } else {
          toast.error(err.error);
        }
      } else {
        toast.error("Failed to generate fee events");
      }
    },
  });

  // Waiver mutation (apply)
  const waiverMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { discountAmount: number; waiverReason: string };
    }) =>
      fetch(`/api/admin/fees/${id}/waiver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fee-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fees"] });
      toast.success("Waiver applied successfully");
      closeWaiverDialog();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") {
          setWaiverErrors(err.error);
        } else {
          toast.error(err.error);
        }
      } else {
        toast.error("Failed to apply waiver");
      }
    },
  });

  // Waiver mutation (remove)
  const removeWaiverMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/fees/${id}/waiver`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fee-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fees"] });
      toast.success("Waiver removed successfully");
      closeWaiverDialog();
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to remove waiver");
    },
  });

  // Reminder mutation
  const reminderMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/fees/${id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fee-detail"] });
      toast.success(`Fee reminders sent to ${res.count ?? 0} guardian(s)`);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to send reminders");
    },
  });

  // ---- Filter cascading ----
  const filteredParks = useMemo(() => {
    if (!parks) return [];
    if (!filterCityId) return parks;
    return parks.filter((p) => p.cityId === filterCityId);
  }, [parks, filterCityId]);

  const filteredBatches = useMemo(() => {
    if (!batches) return [];
    if (!filterParkId) return batches;
    return batches.filter((b) => b.parkId === filterParkId);
  }, [batches, filterParkId]);

  function handleFilterCityChange(val: string) {
    setFilterCityId(val);
    setFilterParkId("");
    setFilterBatchId("");
    setPage(1);
  }

  function handleFilterParkChange(val: string) {
    setFilterParkId(val);
    setFilterBatchId("");
    setPage(1);
  }

  function handleFilterBatchChange(val: string) {
    setFilterBatchId(val);
    setPage(1);
  }

  // Receipt data query
  const { data: receiptData, isLoading: receiptLoading } = useQuery<FeeReceiptData>({
    queryKey: ["payment-receipt", receiptPaymentId],
    queryFn: () =>
      fetch(`/api/admin/payments/${receiptPaymentId}/receipt`).then((r) => {
        if (!r.ok) throw new Error("Failed to load receipt");
        return r.json();
      }),
    enabled: receiptOpen && !!receiptPaymentId,
  });

  function openReceiptDialog(paymentId: string) {
    setReceiptPaymentId(paymentId);
    setReceiptOpen(true);
  }

  function closeReceiptDialog() {
    setReceiptOpen(false);
    setReceiptPaymentId(null);
  }

  // ---- Dialog helpers ----
  function closeCreateDialog() {
    setCreateOpen(false);
    setFormCityId("");
    setFormParkId("");
    setFormBatchId("");
    setFormTitle("");
    setFormFeeType("");
    setFormAmount("");
    setFormDueDate("");
    setFormErrors({});
  }

  function closeBatchGenDialog() {
    setBatchGenOpen(false);
    setBgTitle("");
    setBgFeeType("");
    setBgAmount("");
    setBgDueDate("");
    setBgSelectedIds([]);
    setBgCityId("");
    setBgParkId("");
    setBgSearch("");
    setBgErrors({});
  }

  function toggleBgBatch(batchId: string) {
    setBgSelectedIds((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId]
    );
  }

  function toggleAllBgBatches() {
    if (bgSelectedIds.length === filteredBgBatches.length) {
      setBgSelectedIds([]);
    } else {
      setBgSelectedIds(filteredBgBatches.map((b) => b.id));
    }
  }

  function handleBatchGenSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBgErrors({});
    if (bgSelectedIds.length === 0) {
      setBgErrors({ batchIds: "Select at least one batch" });
      return;
    }
    const payload: any = {
      batchIds: bgSelectedIds,
      title: bgTitle.trim(),
      feeType: bgFeeType,
      amount: parseFloat(bgAmount),
    };
    if (bgDueDate) payload.dueDate = bgDueDate;
    batchGenMutation.mutate(payload);
  }

  function openEditDialog(fe: FeeEventItem) {
    setSelectedFeeEvent(fe);
    setEditTitle(fe.title);
    setEditFeeType(fe.feeType);
    setEditAmount(String(fe.amount));
    setEditDueDate(fe.dueDate ? fe.dueDate.split("T")[0] : "");
    setFormErrors({});
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setSelectedFeeEvent(null);
    setFormErrors({});
  }

  function openDeleteDialog(fe: FeeEventItem) {
    setSelectedFeeEvent(fe);
    setDeleteOpen(true);
  }

  function openDetailSheet(fe: FeeEventItem) {
    setSelectedFeeEvent(fe);
    resetPaymentForm();
    setDetailOpen(true);
  }

  function resetPaymentForm() {
    setPayParticipantId("");
    setPayAmount("");
    setPayMethod("");
    setPayNotes("");
    setPayErrors({});
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});
    const payload: any = {
      batchId: formBatchId,
      title: formTitle.trim(),
      feeType: formFeeType,
      amount: parseFloat(formAmount),
    };
    if (formDueDate) payload.dueDate = formDueDate;
    createMutation.mutate(payload);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});
    if (!selectedFeeEvent) return;
    const payload: any = {};
    if (editTitle !== selectedFeeEvent.title) payload.title = editTitle.trim();
    if (editFeeType !== selectedFeeEvent.feeType) payload.feeType = editFeeType;
    if (editAmount !== String(selectedFeeEvent.amount)) payload.amount = parseFloat(editAmount);
    if (editDueDate !== (selectedFeeEvent.dueDate?.split("T")[0] || "")) {
      payload.dueDate = editDueDate || null;
    }
    if (Object.keys(payload).length === 0) {
      toast.info("No changes made");
      return;
    }
    updateMutation.mutate({ id: selectedFeeEvent.id, data: payload });
  }

  function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPayErrors({});
    if (!selectedFeeEvent) return;
    paymentMutation.mutate({
      feeEventId: selectedFeeEvent.id,
      data: {
        participantId: payParticipantId,
        amount: parseFloat(payAmount),
        method: payMethod,
        notes: payNotes || undefined,
      },
    });
  }

  function handleQuickPay(participant: ParticipantItem) {
    if (!selectedFeeEvent) return;
    setPayParticipantId(participant.id);
    const effectiveAmount = (selectedFeeEvent.discountAmount && selectedFeeEvent.discountAmount > 0)
      ? selectedFeeEvent.amount - selectedFeeEvent.discountAmount
      : selectedFeeEvent.amount;
    const remaining = participant.remaining ?? (participant.isPartial ? effectiveAmount - (participant.totalPaid ?? 0) : effectiveAmount);
    setPayAmount(String(remaining));
    setPayMethod("cash");
    setPayNotes("");
  }

  function openWaiverDialog() {
    const fd = feeDetail as FeeEventDetail | undefined;
    if (fd?.discountAmount && fd.discountAmount > 0) {
      setWaiverAmount(String(fd.discountAmount));
      setWaiverReason(fd.waiverReason || "");
    } else {
      setWaiverAmount("");
      setWaiverReason("");
    }
    setWaiverErrors({});
    setWaiverOpen(true);
  }

  function closeWaiverDialog() {
    setWaiverOpen(false);
    setWaiverAmount("");
    setWaiverReason("");
    setWaiverErrors({});
  }

  function handleWaiverSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWaiverErrors({});
    if (!selectedFeeEvent) return;

    const amount = parseFloat(waiverAmount);
    if (!amount || amount <= 0) {
      setWaiverErrors({ discountAmount: "Enter a valid discount amount" });
      return;
    }
    if (amount >= selectedFeeEvent.amount) {
      setWaiverErrors({ discountAmount: "Discount must be less than the fee amount" });
      return;
    }
    if (!waiverReason.trim() || waiverReason.trim().length < 5) {
      setWaiverErrors({ waiverReason: "Reason must be at least 5 characters" });
      return;
    }

    waiverMutation.mutate({
      id: selectedFeeEvent.id,
      data: { discountAmount: amount, waiverReason: waiverReason.trim() },
    });
  }

  const feeEvents = feesData?.data || [];
  const summary = feesData?.summary || {
    totalFeeEvents: 0,
    totalExpected: 0,
    totalCollected: 0,
    collectionRate: 0,
  };
  const pagination = feesData?.pagination || { page: 1, totalPages: 1, total: 0 };

  // ---- Render ----
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[#4B0A8F]/10">
              <DollarSign className="size-4 text-[#4B0A8F] dark:text-[#B87EE0]" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Fee Events</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-xl font-bold tabular-nums">{summary.totalFeeEvents}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[#A0006B]/10">
              <BarChart3 className="size-4 text-[#A0006B] dark:text-[#E06BAF]" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Total Expected</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className="text-xl font-bold tabular-nums">{formatPKR(summary.totalExpected)}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[#2A0C8F]/10">
              <Wallet className="size-4 text-[#2A0C8F] dark:text-[#8A6DD6]" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Total Collected</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className="text-xl font-bold tabular-nums">{formatPKR(summary.totalCollected)}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080]">
              <TrendingUp className="size-4 text-[#4B0A8F] dark:text-[#B87EE0]" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">{t("fees.collectionProgress")}</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-xl font-bold tabular-nums">
              {summary.collectionRate}%
            </p>
          )}
        </motion.div>
      </div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm"
      >
        <div className="min-w-[140px] flex-1 sm:flex-none">
          <Label className="text-xs text-muted-foreground mb-1 block">City</Label>
          <Select value={filterCityId} onValueChange={handleFilterCityChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={t("fees.allCitiesFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Cities</SelectItem>
              {cities?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[140px] flex-1 sm:flex-none">
          <Label className="text-xs text-muted-foreground mb-1 block">{t("fees.park")}</Label>
          <Select value={filterParkId} onValueChange={handleFilterParkChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={t("fees.allParks")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("fees.allParks")}</SelectItem>
              {filteredParks.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[140px] flex-1 sm:flex-none">
          <Label className="text-xs text-muted-foreground mb-1 block">{t("fees.batch")}</Label>
          <Select value={filterBatchId} onValueChange={handleFilterBatchChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={t("fees.allBatches")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("fees.allBatches")}</SelectItem>
              {filteredBatches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[130px]">
          <Label className="text-xs text-muted-foreground mb-1 block">{t("fees.feeType")}</Label>
          <Select value={filterFeeType} onValueChange={(v) => { setFilterFeeType(v === "__all__" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={t("fees.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("fees.allTypes")}</SelectItem>
              <SelectItem value="tuition">{t("fees.tuition")}</SelectItem>
              <SelectItem value="admission">{t("fees.admission")}</SelectItem>
              <SelectItem value="other">{t("fees.other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[110px]">
          <Label className="text-xs text-muted-foreground mb-1 block">{t("common.status")}</Label>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("fees.active")}</SelectItem>
              <SelectItem value="all">{t("common.all")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="no-print"
            onClick={() => window.print()}
          >
            <Printer className="size-4 mr-1.5" />
            {t("common.print")}
          </Button>
          <ExportButton
            data={feeEvents.map((f) => ({
              title: f.title,
              batch: f.batch?.name ?? "",
              feeType: f.feeType,
              amount: f.amount,
              dueDate: f.dueDate
                ? new Date(f.dueDate).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" })
                : "",
              status: f.isActive ? "Active" : "Inactive",
              totalPaid: f.totalPaid,
              totalParticipants: f.totalParticipants,
            }))}
            filename="fees"
            columns={[
              { key: "title", header: "Fee Title" },
              { key: "batch", header: "Batch" },
              { key: "feeType", header: "Type" },
              { key: "amount", header: "Amount" },
              { key: "dueDate", header: "Due Date" },
              { key: "status", header: "Status" },
              { key: "totalPaid", header: "Total Paid" },
              { key: "totalParticipants", header: "Total Participants" },
            ]}
            disabled={isLoading}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-9 border-[#A0006B]/40 text-[#A0006B] hover:bg-[#A0006B]/10 dark:text-[#E06BAF] dark:border-[#A0006B]/40 dark:hover:bg-[#A0006B]/20"
            onClick={() => setBatchGenOpen(true)}
          >
            <Layers className="size-4 mr-1.5" />
            <span className="hidden sm:inline">{t("fees.generate")}</span>
          </Button>
          <Button
            size="sm"
            className="h-9 bg-[#4B0A8F] hover:bg-[#3A0870] text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4 mr-1.5" />
            <span className="hidden sm:inline">{t("fees.create")}</span>
          </Button>
        </div>
      </motion.div>

      {/* Fee Events Table / Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl border bg-card shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : feeEvents.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title={t("fees.noFeeEvents")}
            description={t("fees.noFeeEventsDesc")}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F3ECF6]/50 dark:bg-[#1F086080]/50 hover:bg-[#F3ECF6]/50 dark:hover:bg-[#1F086080]/50">
                    <TableHead className="text-xs font-semibold">{t("fees.titleCol")}</TableHead>
                    <TableHead className="text-xs font-semibold">{t("fees.batchParkCity")}</TableHead>
                    <TableHead className="text-xs font-semibold">{t("fees.typeCol")}</TableHead>
                    <TableHead className="text-xs font-semibold text-right">{t("fees.amount")}</TableHead>
                    <TableHead className="text-xs font-semibold">{t("fees.dueDate")}</TableHead>
                    <TableHead className="text-xs font-semibold">{t("fees.progress")}</TableHead>
                    <TableHead className="text-xs font-semibold text-center">{t("fees.paid")}</TableHead>
                    <TableHead className="text-xs font-semibold w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeEvents.map((fe) => (
                    <TableRow
                      key={fe.id}
                      className={cn(
                        "group cursor-pointer",
                        fe.dueDateStatus === "overdue" && "border-l-4 border-l-[#FF0015] dark:border-l-[#FF4D4D]"
                      )}
                      onClick={() => openDetailSheet(fe)}
                    >
                      <TableCell className="font-medium text-sm">{fe.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                        <span className="truncate block">
                          {fe.batch.name} / {fe.batch.park.name} / {fe.batch.park.city.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-semibold px-2 py-0.5", getFeeTypeBadgeColor(fe.feeType))}
                        >
                          {fe.feeType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatPKR(fe.amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {fe.dueDateStatus === "overdue" && (
                            <AlertTriangle className="size-3.5 text-[#FF0015] dark:text-[#FF4D4D] shrink-0" />
                          )}
                          {fe.dueDateStatus === "upcoming" && (
                            <CalendarClock className="size-3.5 text-amber-500 shrink-0" />
                          )}
                          {fe.dueDateStatus === "paid" && (
                            <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                          )}
                          <span>{formatDate(fe.dueDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="font-mono">{formatPKR(fe.totalPaid)}</span>
                            <span className="font-mono">{formatPKR(fe.totalExpected)}</span>
                          </div>
                          <Progress value={fe.rate} className="h-2 [&>div]:rounded-full" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-semibold tabular-nums">{fe.paidCount}</span>
                        <span className="text-xs text-muted-foreground">/{fe.totalParticipants}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetailSheet(fe); }}>
                              <Eye className="size-4 mr-2" /> {t("fees.viewDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetailSheet(fe); }}>
                              <CreditCard className="size-4 mr-2" /> {t("fees.recordPayment")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(fe); }}>
                              <Pencil className="size-4 mr-2" /> {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={(e) => { e.stopPropagation(); openDeleteDialog(fe); }}
                            >
                              <Trash2 className="size-4 mr-2" /> {t("fees.deactivateFeeBtn")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y">
              {feeEvents.map((fe) => (
                <motion.div
                  key={fe.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "p-4 space-y-3 cursor-pointer",
                    fe.dueDateStatus === "overdue" && "border-l-4 border-l-[#FF0015] dark:border-l-[#FF4D4D]"
                  )}
                  onClick={() => openDetailSheet(fe)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm truncate">{fe.title}</h4>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {fe.batch.name} / {fe.batch.park.name} / {fe.batch.park.city.name}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-semibold px-2 py-0.5 ml-2 shrink-0", getFeeTypeBadgeColor(fe.feeType))}
                    >
                      {fe.feeType}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-mono font-bold">{formatPKR(fe.amount)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {fe.dueDateStatus === "overdue" && <AlertTriangle className="size-3 text-[#FF0015]" />}
                      {fe.dueDateStatus === "upcoming" && <CalendarClock className="size-3 text-amber-500" />}
                      {formatDate(fe.dueDate)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-mono">{formatPKR(fe.totalPaid)}</span>
                      <span className="font-mono">{formatPKR(fe.totalExpected)}</span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(fe.rate, 100)}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={cn("h-full rounded-full", getRateColor(fe.rate))}
                      />
                    </div>
                    <div className="text-right text-[10px] tabular-nums">
                      {fe.paidCount}/{fe.totalParticipants} paid · {fe.rate}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs flex-1"
                      onClick={(e) => { e.stopPropagation(); openDetailSheet(fe); }}
                    >
                      <Eye className="size-3 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs flex-1"
                      onClick={(e) => { e.stopPropagation(); openDetailSheet(fe); }}
                    >
                      <CreditCard className="size-3 mr-1" /> Pay
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(fe); }}>
                          <Pencil className="size-4 mr-2" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={(e) => { e.stopPropagation(); openDeleteDialog(fe); }}
                        >
                          <Trash2 className="size-4 mr-2" /> {t("fees.deactivateFeeBtn")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-[#F3ECF6]/30 dark:bg-[#1F086080]/30">
                <p className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ============ BATCH GENERATE FEES DIALOG ============ */}
      <Dialog open={batchGenOpen} onOpenChange={(open) => { if (!open) closeBatchGenDialog(); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Layers className="size-5 text-[#A0006B] dark:text-[#E06BAF]" />
              {t("fees.generateFeesForMultiple")}
            </DialogTitle>
            <DialogDescription>{t("fees.generateFeesDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBatchGenSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-2">
              <Label className="text-sm">Title</Label>
              <Input
                className="h-9"
                placeholder="e.g., January 2025 Tuition"
                value={bgTitle}
                onChange={(e) => setBgTitle(e.target.value)}
              />
              {bgErrors.title && (
                <p className="text-xs text-[#FF0015]">{bgErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Fee Type</Label>
                <Select value={bgFeeType} onValueChange={setBgFeeType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="registration">Registration</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {bgErrors.feeType && (
                  <p className="text-xs text-[#FF0015]">{bgErrors.feeType}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Amount (PKR)</Label>
                <Input
                  type="number"
                  className="h-9 font-mono"
                  placeholder="0"
                  min="1"
                  step="1"
                  value={bgAmount}
                  onChange={(e) => setBgAmount(e.target.value)}
                />
                {bgErrors.amount && (
                  <p className="text-xs text-[#FF0015]">{bgErrors.amount}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Due Date (optional)</Label>
              <Input
                type="date"
                className="h-9"
                value={bgDueDate}
                onChange={(e) => setBgDueDate(e.target.value)}
              />
            </div>

            <Separator />

            {/* Batch selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Target Batches</Label>
                {bgSelectedIds.length > 0 && (
                  <Badge variant="outline" className="text-xs font-mono border-[#4B0A8F]/30 text-[#4B0A8F] dark:text-[#B87EE0]">
                    {bgSelectedIds.length} selected
                  </Badge>
                )}
              </div>

              {/* City / Park filters */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={bgCityId} onValueChange={(v) => { setBgCityId(v === "__all__" ? "" : v); setBgParkId(""); setBgSelectedIds([]); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Filter by City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Cities</SelectItem>
                      {cities?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select value={bgParkId} onValueChange={(v) => { setBgParkId(v === "__all__" ? "" : v); setBgSelectedIds([]); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Filter by Park" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Parks</SelectItem>
                      {filteredBgParks.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  className="h-8 pl-8 text-xs"
                  placeholder="Search batches..."
                  value={bgSearch}
                  onChange={(e) => setBgSearch(e.target.value)}
                />
              </div>

              {bgErrors.batchIds && (
                <p className="text-xs text-[#FF0015]">{bgErrors.batchIds}</p>
              )}

              {/* Batch list */}
              <div className="rounded-lg border max-h-48 overflow-y-auto">
                {!bgParkId ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Select a park to see batches
                  </div>
                ) : filteredBgBatches.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No batches found
                  </div>
                ) : (
                  <>
                    <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-3 py-2 border-b flex items-center gap-2">
                      <Checkbox
                        checked={bgSelectedIds.length === filteredBgBatches.length && filteredBgBatches.length > 0}
                        onCheckedChange={toggleAllBgBatches}
                        className="size-3.5"
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        Select All ({filteredBgBatches.length})
                      </span>
                    </div>
                    <div className="divide-y">
                      {filteredBgBatches.map((b) => (
                        <label
                          key={b.id}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={bgSelectedIds.includes(b.id)}
                            onCheckedChange={() => toggleBgBatch(b.id)}
                            className="size-3.5"
                          />
                          <span className="text-xs font-medium truncate">{b.name}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeBatchGenDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={batchGenMutation.isPending || bgSelectedIds.length === 0}
                className="bg-[#A0006B] hover:bg-[#800055] text-white"
              >
                {batchGenMutation.isPending ? t("fees.generating") : t("fees.generateFor", { n: bgSelectedIds.length, plural: bgSelectedIds.length !== 1 ? "es" : "" })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ CREATE FEE EVENT DIALOG ============ */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) closeCreateDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{t("fees.createFeeEvent")}</DialogTitle>
            <DialogDescription>{t("fees.createFeeDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">City</Label>
              <Select value={formCityId} onValueChange={(v) => { setFormCityId(v === "__all__" ? "" : v); setFormParkId(""); setFormBatchId(""); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Park</Label>
              <Select value={formParkId} onValueChange={(v) => { setFormParkId(v === "__all__" ? "" : v); setFormBatchId(""); }} disabled={!formCityId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={formCityId ? "Select park" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {(formParks || [])
                    .filter((p) => !formCityId || p.cityId === formCityId)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Batch</Label>
              <Select value={formBatchId} onValueChange={setFormBatchId} disabled={!formParkId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={formParkId ? "Select batch" : "Select park first"} />
                </SelectTrigger>
                <SelectContent>
                  {(formBatches || [])
                    .filter((b) => !formParkId || b.parkId === formParkId)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formErrors.batchId && (
                <p className="text-xs text-[#FF0015]">{formErrors.batchId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Title</Label>
              <Input
                className="h-9"
                placeholder="e.g., January 2025 Tuition"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              {formErrors.title && (
                <p className="text-xs text-[#FF0015]">{formErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Fee Type</Label>
                <Select value={formFeeType} onValueChange={setFormFeeType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tuition">Tuition</SelectItem>
                    <SelectItem value="admission">Admission</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.feeType && (
                  <p className="text-xs text-[#FF0015]">{formErrors.feeType}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Amount (PKR)</Label>
                <Input
                  type="number"
                  className="h-9 font-mono"
                  placeholder="0"
                  min="1"
                  step="1"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                />
                {formErrors.amount && (
                  <p className="text-xs text-[#FF0015]">{formErrors.amount}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Due Date (optional)</Label>
              <Input
                type="date"
                className="h-9"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-[#4B0A8F] hover:bg-[#3A0870] text-white"
              >
                {createMutation.isPending ? t("fees.creating") : t("fees.createFeeEvent")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ EDIT FEE EVENT DIALOG ============ */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{t("fees.editFee")}</DialogTitle>
            <DialogDescription>{t("fees.editFeeDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Title</Label>
              <Input
                className="h-9"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              {formErrors.title && (
                <p className="text-xs text-[#FF0015]">{formErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Fee Type</Label>
                <Select value={editFeeType} onValueChange={setEditFeeType}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tuition">Tuition</SelectItem>
                    <SelectItem value="admission">Admission</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Amount (PKR)</Label>
                <Input
                  type="number"
                  className="h-9 font-mono"
                  min="1"
                  step="1"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
                {formErrors.amount && (
                  <p className="text-xs text-[#FF0015]">{formErrors.amount}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Due Date</Label>
              <Input
                type="date"
                className="h-9"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-[#4B0A8F] hover:bg-[#3A0870] text-white"
              >
                {updateMutation.isPending ? t("fees.saving") : t("students.saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE CONFIRMATION ============ */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!open) { setDeleteOpen(false); setSelectedFeeEvent(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("fees.deactivateFee")}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate &ldquo;{selectedFeeEvent?.title}&rdquo;?
              This will mark it as inactive. Existing payment records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#FF0015] hover:bg-[#CC0010] text-white"
              onClick={() => selectedFeeEvent && deleteMutation.mutate(selectedFeeEvent.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("fees.deactivating") : t("fees.deactivateFeeBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ FEE EVENT DETAIL SHEET ============ */}
      <Sheet open={detailOpen} onOpenChange={(open) => { if (!open) { setDetailOpen(false); setSelectedFeeEvent(null); } }}>
        <SheetContent className="w-full sm:max-w-lg p-0 overflow-y-auto">
          {detailLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : feeDetail ? (
            <div className="space-y-0">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-card border-b px-6 py-4">
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-lg font-bold flex-1">{feeDetail.title}</SheetTitle>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0 border-[#4B0A8F]/30 text-[#4B0A8F] hover:bg-[#4B0A8F]/10 dark:text-[#B87EE0] dark:border-[#4B0A8F]/40 dark:hover:bg-[#4B0A8F]/20"
                        onClick={openWaiverDialog}
                        title="Waiver / Discount"
                      >
                        <ShieldCheck className="size-4" />
                      </Button>
                    )}
                  </div>
                  <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold px-2 py-0.5", getFeeTypeBadgeColor(feeDetail.feeType))}>
                      {feeDetail.feeType}
                    </Badge>
                    <span className="text-muted-foreground">
                      {feeDetail.batch.name} / {feeDetail.batch.park.name} / {feeDetail.batch.park.city.name}
                    </span>
                  </SheetDescription>
                </SheetHeader>
              </div>

              <div className="px-6 py-4 space-y-6">
                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 bg-[#F3ECF6]/30 dark:bg-[#1F086080]/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
                    {feeDetail.discountAmount && feeDetail.discountAmount > 0 ? (
                      <>
                        <p className="font-mono text-sm text-muted-foreground line-through">{formatPKR(feeDetail.amount)}</p>
                        <p className="font-mono font-bold text-lg">{formatPKR(feeDetail.amount - feeDetail.discountAmount)}</p>
                        <Badge className="mt-1 text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                          WAIVER
                        </Badge>
                      </>
                    ) : (
                      <p className="font-mono font-bold text-lg">{formatPKR(feeDetail.amount)}</p>
                    )}
                  </div>
                  <div className="rounded-lg border p-3 bg-[#F3ECF6]/30 dark:bg-[#1F086080]/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      {feeDetail.dueDateStatus === "overdue" && <AlertTriangle className="size-3.5 text-[#FF0015]" />}
                      {feeDetail.dueDateStatus === "upcoming" && <CalendarClock className="size-3.5 text-amber-500" />}
                      {feeDetail.dueDateStatus === "paid" && <CheckCircle2 className="size-3.5 text-green-500" />}
                      {formatDate(feeDetail.dueDate)}
                    </p>
                  </div>
                  {feeDetail.discountAmount && feeDetail.discountAmount > 0 ? (
                    <div className="rounded-lg border p-3 bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20">
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Percent className="size-3" /> Waiver
                      </p>
                      <p className="font-mono font-bold text-sm text-amber-700 dark:text-amber-300">
                        -{formatPKR(feeDetail.discountAmount)}
                      </p>
                      {feeDetail.waiverReason && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{feeDetail.waiverReason}</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border p-3 bg-[#F3ECF6]/30 dark:bg-[#1F086080]/30">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold",
                          feeDetail.isActive
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                            : "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
                        )}
                      >
                        {feeDetail.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Collection Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{t("fees.collectionProgress")}</h4>
                    <span className={cn(
                      "text-lg font-bold tabular-nums",
                      feeDetail.rate >= 80 ? "text-green-600 dark:text-green-400" :
                      feeDetail.rate >= 50 ? "text-amber-600 dark:text-amber-400" :
                      "text-[#FF0015] dark:text-[#FF4D4D]"
                    )}>
                      {feeDetail.rate}%
                    </span>
                  </div>
                  <Progress value={Math.min(feeDetail.rate, 100)} className="h-3 [&>div]:rounded-full" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      <span className="font-mono font-semibold text-foreground">{formatPKR(feeDetail.totalPaid)}</span> {t("fees.collected")}
                    </span>
                    <span>
                      {t("common.of")} <span className="font-mono font-semibold text-foreground">{formatPKR(feeDetail.totalExpected)}</span> {t("fees.expected")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {feeDetail.totalParticipants} {t("fees.participants")}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3 text-green-500" />
                      {feeDetail.paidCount} {t("fees.paid")}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="size-3 text-[#FF0015]" />
                      {feeDetail.totalParticipants - feeDetail.paidCount} {t("fees.unpaid")}
                    </span>
                  </div>

                  {/* Send Reminders Button */}
                  {feeDetail.totalParticipants - feeDetail.paidCount > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-[#4B0A8F]/30 text-[#4B0A8F] hover:bg-[#4B0A8F]/10 dark:text-[#B87EE0] dark:border-[#4B0A8F]/40 dark:hover:bg-[#4B0A8F]/20"
                        disabled={reminderMutation.isPending}
                        onClick={() => selectedFeeEvent && reminderMutation.mutate(selectedFeeEvent.id)}
                      >
                        <Mail className="size-3.5 mr-1.5" />
                        {reminderMutation.isPending ? "Sending..." : "Send Reminders"}
                      </Button>
                      {feeDetail.reminderSentAt && (
                        <span className="text-[10px] text-muted-foreground">
                          Last: {formatDateTime(feeDetail.reminderSentAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Record Payment Form */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="size-4 text-[#4B0A8F] dark:text-[#B87EE0]" />
                    {t("fees.recordPayment")}
                  </h4>
                  <form onSubmit={handlePaymentSubmit} className="space-y-3 p-3 rounded-lg border bg-[#F3ECF6]/20 dark:bg-[#1F086080]/20">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Participant</Label>
                      <Select value={payParticipantId} onValueChange={(val) => {
                        setPayParticipantId(val);
                        const participant = feeDetail.unpaidParticipants.find((p) => p.id === val);
                        if (participant) {
                          const effectiveAmount = (feeDetail.discountAmount && feeDetail.discountAmount > 0)
                            ? feeDetail.amount - feeDetail.discountAmount
                            : feeDetail.amount;
                          const remaining = participant.remaining ?? (participant.isPartial ? effectiveAmount - (participant.totalPaid ?? 0) : effectiveAmount);
                          setPayAmount(String(remaining));
                        }
                      }}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select participant (unpaid)" />
                        </SelectTrigger>
                        <SelectContent>
                          {feeDetail.unpaidParticipants.length === 0 ? (
                            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                              {t("fees.allParticipantsHavePaid")}
                            </div>
                          ) : (
                            feeDetail.unpaidParticipants.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate">{p.name}</span>
                                  {p.isPartial && (
                                    <Badge className="text-[8px] px-1 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                                      PARTIAL
                                    </Badge>
                                  )}
                                  {p.group && (
                                    <span className="text-muted-foreground">({p.group.name})</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {payErrors.participantId && (
                        <p className="text-xs text-[#FF0015]">{payErrors.participantId}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Amount (PKR)</Label>
                        <Input
                          type="number"
                          className="h-9 text-sm font-mono"
                          min="1"
                          step="1"
                          placeholder="0"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                        />
                        {payErrors.amount && (
                          <p className="text-xs text-[#FF0015]">{payErrors.amount}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Method</Label>
                        <Select value={payMethod} onValueChange={setPayMethod}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {payErrors.method && (
                          <p className="text-xs text-[#FF0015]">{payErrors.method}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes (optional)</Label>
                      <Textarea
                        className="text-sm min-h-[60px] resize-none"
                        placeholder="Any additional notes..."
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={paymentMutation.isPending || !payParticipantId || !payAmount || !payMethod}
                      className="w-full bg-[#4B0A8F] hover:bg-[#3A0870] text-white"
                    >
                      {paymentMutation.isPending ? t("fees.recording") : t("fees.recordPayment")}
                    </Button>
                  </form>
                </div>

                <Separator />

                {/* Payment History */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Receipt className="size-4 text-[#A0006B] dark:text-[#E06BAF]" />
                    {t("fees.paymentHistoryCount", { n: feeDetail.payments.length })}
                  </h4>
                  {feeDetail.payments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      {t("fees.noPaymentsRecorded")}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {feeDetail.payments.map((payment) => (
                        <div key={payment.id} className="rounded-lg border p-3 space-y-1.5">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate flex items-center gap-1.5">
                                {payment.participant.name}
                                {payment.isPartial && (
                                  <Badge className="text-[8px] px-1 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                                    PARTIAL
                                  </Badge>
                                )}
                              </p>
                              {payment.participant.group && (
                                <p className="text-[10px] text-muted-foreground">
                                  {payment.participant.group.name}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 ml-2 text-right">
                              <p className="font-mono font-bold text-sm">
                                {formatPKR(payment.amount)}
                              </p>
                              {payment.isPartial && payment.remaining != null && payment.remaining > 0 && (
                                <p className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                  {formatPKR(payment.remaining)} remaining
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", getMethodBadge(payment.method))}>
                                {payment.method}
                              </Badge>
                              {payment.receiptNo && (
                                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                  {payment.receiptNo}
                                </span>
                              )}
                            </div>
                            <span>{formatDateTime(payment.createdAt)}</span>
                          </div>
                          {payment.notes && (
                            <p className="text-[10px] text-muted-foreground italic mt-1">{payment.notes}</p>
                          )}
                          <div className="flex justify-end pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-[#4B0A8F] dark:hover:text-[#B87EE0]"
                              onClick={() => openReceiptDialog(payment.id)}
                              title="View Receipt"
                            >
                              <Receipt className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Unpaid Participants */}
                <div className="space-y-3 pb-6">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="size-4 text-[#FF0015] dark:text-[#FF4D4D]" />
                    {t("fees.unpaidParticipants")} ({feeDetail.unpaidParticipants.length})
                  </h4>
                  {feeDetail.unpaidParticipants.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 py-3">
                      <CheckCircle2 className="size-4" />
                      {t("fees.allParticipantsHavePaid")}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {feeDetail.unpaidParticipants.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              {p.isPartial && (
                                <Badge className="text-[8px] px-1 py-0 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                                  PARTIAL
                                </Badge>
                              )}
                            </div>
                            {p.isPartial ? (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                Rs. {p.totalPaid ?? 0} / Rs. {((feeDetail.discountAmount && feeDetail.discountAmount > 0) ? feeDetail.amount - feeDetail.discountAmount : feeDetail.amount)} paid
                                {p.remaining != null && p.remaining > 0 && (
                                  <span className="text-muted-foreground ml-1">· {formatPKR(p.remaining)} remaining</span>
                                )}
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                {p.group?.name || t("fees.noGroup")}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2 shrink-0 ml-2 border-[#4B0A8F]/30 text-[#4B0A8F] dark:text-[#B87EE0] hover:bg-[#4B0A8F]/10 dark:hover:bg-[#4B0A8F]/20"
                            onClick={() => handleQuickPay(p)}
                          >
                            Record
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={(open) => { if (!open) closeReceiptDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#4B0A8F] dark:text-[#B87EE0]">
              <Receipt className="size-5" />
              Fee Receipt
            </DialogTitle>
            <DialogDescription>
              View and print the payment receipt
            </DialogDescription>
          </DialogHeader>
          {receiptLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-muted-foreground animate-pulse">Loading receipt…</div>
            </div>
          )}
          {!receiptLoading && receiptData && (
            <FeeReceipt data={receiptData} onClose={closeReceiptDialog} />
          )}
        </DialogContent>
      </Dialog>

      {/* ============ WAIVER / DISCOUNT DIALOG ============ */}
      <Dialog open={waiverOpen} onOpenChange={(open) => { if (!open) closeWaiverDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#4B0A8F] dark:text-[#B87EE0]" />
              Waiver / Discount
            </DialogTitle>
            <DialogDescription>
              Apply a waiver or discount to &ldquo;{selectedFeeEvent?.title}&rdquo;
            </DialogDescription>
          </DialogHeader>
          {feeDetail?.discountAmount && feeDetail.discountAmount > 0 ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Waiver</span>
                  <Badge className="text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20">
                    {formatPKR(feeDetail.discountAmount)} off
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{feeDetail.waiverReason}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="line-through font-mono">{formatPKR(feeDetail.amount)}</span>
                  <span>→</span>
                  <span className="font-mono font-bold text-foreground">{formatPKR(feeDetail.amount - feeDetail.discountAmount)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeWaiverDialog}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#FF0015] hover:bg-[#CC0010] text-white"
                  disabled={removeWaiverMutation.isPending}
                  onClick={() => selectedFeeEvent && removeWaiverMutation.mutate(selectedFeeEvent.id)}
                >
                  {removeWaiverMutation.isPending ? "Removing..." : "Remove Waiver"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleWaiverSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Discount Amount (PKR)</Label>
                <Input
                  type="number"
                  className="h-9 font-mono"
                  placeholder="0"
                  min="1"
                  step="1"
                  max={selectedFeeEvent ? selectedFeeEvent.amount - 1 : undefined}
                  value={waiverAmount}
                  onChange={(e) => setWaiverAmount(e.target.value)}
                />
                {waiverErrors.discountAmount && (
                  <p className="text-xs text-[#FF0015]">{waiverErrors.discountAmount}</p>
                )}
                {waiverAmount && selectedFeeEvent && parseFloat(waiverAmount) < selectedFeeEvent.amount && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Effective: {formatPKR(selectedFeeEvent.amount - parseFloat(waiverAmount))}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Reason *</Label>
                <Textarea
                  className="text-sm min-h-[80px] resize-none"
                  placeholder="Reason for waiver (min 5 characters)..."
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                />
                {waiverErrors.waiverReason && (
                  <p className="text-xs text-[#FF0015]">{waiverErrors.waiverReason}</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeWaiverDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={waiverMutation.isPending || !waiverAmount || !waiverReason}
                  className="bg-[#4B0A8F] hover:bg-[#3A0870] text-white"
                >
                  {waiverMutation.isPending ? "Applying..." : "Apply Waiver"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}