"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPKT } from "@/lib/timezone";
import { ExportButton } from "@/components/shared/export-button";
import {
  ImportDialog,
  GUARDIAN_FIELDS,
  EXAMPLE_ROWS,
} from "@/components/shared/import-dialog";
import { GuardianDetailSheet } from "@/components/modules/admin/guardian-detail-sheet";
import { ParticipantDetailSheet } from "@/components/modules/admin/participant-detail-sheet";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ShieldCheck,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Users,
  IdCard,
  User,
  X,
  Eye,
  UserCheck,
  UserX,
  Send,
  Check,
  FolderInput,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionToolbar, type BulkAction } from "@/components/shared/bulk-action-toolbar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CityOption {
  id: string;
  name: string;
}

interface ChildInfo {
  id: string;
  name: string;
  state: string;
  relation: string | null;
  group: {
    id: string;
    name: string;
    batch: {
      id: string;
      name: string;
      park: {
        id: string;
        name: string;
        city: { id: string; name: string };
      };
    };
  };
  attendanceRate: number | null;
}

interface Guardian {
  id: string;
  name: string;
  phone: string;
  cnic: string | null;
  address: string | null;
  isActive: boolean;
  userId: string | null;
  user: { id: string; name: string; email: string } | null;
  createdAt: string;
  children: ChildInfo[];
}

interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface ParticipantSearchResult {
  id: string;
  name: string;
  state: string;
  group: {
    id: string;
    name: string;
    batch: { name: string; park: { name: string } };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRateColor(rate: number | null) {
  if (rate === null) return "bg-muted text-muted-foreground";
  if (rate >= 80) return "bg-[#4B0A8F]/10 text-[#4B0A8F] dark:bg-[#1F086080] dark:text-[#8A40B0]";
  if (rate >= 50) return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
  return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GuardiansPage() {
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState("");
  const [state, setState] = useState("all");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset page on filter change
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleCityFilterChange = useCallback((val: string) => {
    setCityId(val);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleStateChange = useCallback((val: string) => {
    setState(val);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [linkChildOpen, setLinkChildOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Invite form
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteCnic, setInviteCnic] = useState("");
  const [inviteAddress, setInviteAddress] = useState("");
  const [inviteRelationship, setInviteRelationship] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // Participant detail sheet (child click)
  const [childDetailOpen, setChildDetailOpen] = useState(false);
  const [childDetailId, setChildDetailId] = useState<string | null>(null);
  const [childDetailName, setChildDetailName] = useState("");

  // Create/Edit form
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCnic, setFormCnic] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Batch Mutation ─────────────────────────────────────────────────────

  const batchMutation = useMutation({
    mutationFn: (body: { action: string; guardianIds: string[] }) =>
      fetch("/api/admin/guardians/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-guardians"] });
      setSelectedIds(new Set());
      const label = vars.action === "activate" ? "activated" : vars.action === "deactivate" ? "deactivated" : "invited";
      toast.success(`${result.success} guardian${result.success !== 1 ? "s" : ""} ${label} successfully`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} operation${result.failed !== 1 ? "s" : ""} failed`);
      }
    },
    onError: (err: any) => {
      toast.error(err.error || "Batch operation failed");
    },
  });

  // ─── Invite Mutation ─────────────────────────────────────────────────────

  const inviteMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      fetch("/api/admin/guardians/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (data) => {
      setInviteCode(data.invitationCode);
      queryClient.invalidateQueries({ queryKey: ["admin-guardians"] });
      toast.success("Guardian invited successfully", {
        description: `Invitation code: ${data.invitationCode}`,
      });
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") setInviteErrors(err.error);
        else toast.error(err.error);
      } else {
        toast.error("Failed to invite guardian");
      }
    },
  });

  function closeInviteDialog() {
    setInviteOpen(false);
    setInviteName("");
    setInviteEmail("");
    setInvitePhone("");
    setInviteCnic("");
    setInviteAddress("");
    setInviteRelationship("");
    setInviteCode("");
    setInviteErrors({});
  }

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInviteErrors({});
    setInviteCode("");
    inviteMutation.mutate({
      name: inviteName.trim(),
      email: inviteEmail.trim() || undefined,
      phone: invitePhone.trim(),
      cnic: inviteCnic.trim() || undefined,
      address: inviteAddress.trim() || undefined,
      relationship: inviteRelationship,
    });
  }

  // Link child
  const [childSearch, setChildSearch] = useState("");
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const debouncedChildSearch = useDebounce(childSearch, 300);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["admin-cities-dropdown"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 60000,
  });

  const { data, isLoading } = useQuery<{ data: Guardian[]; pagination: Pagination }>({
    queryKey: ["admin-guardians", debouncedSearch, cityId, state, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (cityId) params.set("cityId", cityId);
      if (state && state !== "all") params.set("state", state);
      params.set("page", String(page));
      params.set("pageSize", "12");
      return fetch(`/api/admin/guardians?${params}`).then((r) => r.json());
    },
    staleTime: 10000,
  });

  // Search participants for linking
  const { data: participantResults, isLoading: searchingParticipants } = useQuery<{
    data: ParticipantSearchResult[];
    pagination: Pagination;
  }>({
    queryKey: ["admin-students-search", debouncedChildSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedChildSearch) params.set("search", debouncedChildSearch);
      params.set("state", "active");
      params.set("pageSize", "20");
      return fetch(`/api/admin/students?${params}`).then((r) => r.json());
    },
    staleTime: 5000,
    enabled: linkChildOpen,
  });

  const guardians = data?.data || [];
  const pagination = data?.pagination;

  // Selection helpers (after data is available)
  const allRowIds = guardians.map((g) => g.id);
  const allSelected = selectedIds.size > 0 && allRowIds.length > 0 && allRowIds.every((id) => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allRowIds));
    }
  }, [allSelected, allRowIds]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      fetch("/api/admin/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-guardians"] });
      toast.success("Guardian created successfully");
      closeCreateDialog();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") setFormErrors(err.error);
        else toast.error(err.error);
      } else {
        toast.error("Failed to create guardian");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetch(`/api/admin/guardians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-guardians"] });
      toast.success("Guardian updated successfully");
      closeEditDialog();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") setFormErrors(err.error);
        else toast.error(err.error);
      } else {
        toast.error("Failed to update guardian");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/guardians/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-guardians"] });
      toast.success("Guardian deactivated successfully");
      setDeleteOpen(false);
      setSelectedGuardian(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to deactivate guardian");
    },
  });

  const linkChildMutation = useMutation({
    mutationFn: ({ id, participantIds }: { id: string; participantIds: string[] }) =>
      fetch(`/api/admin/guardians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-guardians"] });
      toast.success("Children updated successfully");
      closeLinkChildDialog();
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to update children");
    },
  });

  // ─── Dialog helpers ──────────────────────────────────────────────────────

  function openCreateDialog() {
    setFormName("");
    setFormPhone("");
    setFormCnic("");
    setFormAddress("");
    setFormErrors({});
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setFormErrors({});
  }

  function openEditDialog(guardian: Guardian) {
    setSelectedGuardian(guardian);
    setFormName(guardian.name);
    setFormPhone(guardian.phone);
    setFormCnic(guardian.cnic || "");
    setFormAddress(guardian.address || "");
    setFormErrors({});
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setSelectedGuardian(null);
    setFormErrors({});
  }

  function openLinkChildDialog(guardian: Guardian) {
    setSelectedGuardian(guardian);
    setSelectedChildIds(guardian.children.map((c) => c.id));
    setChildSearch("");
    setLinkChildOpen(true);
  }

  function closeLinkChildDialog() {
    setLinkChildOpen(false);
    setSelectedGuardian(null);
    setChildSearch("");
    setSelectedChildIds([]);
  }

  function openDeleteDialog(guardian: Guardian) {
    setSelectedGuardian(guardian);
    setDeleteOpen(true);
  }

  function openDetailSheet(guardian: Guardian) {
    setSelectedDetailId(guardian.id);
    setSelectedGuardian(guardian);
    setDetailOpen(true);
  }

  function closeDetailSheet() {
    setDetailOpen(false);
    setSelectedDetailId(null);
  }

  function handleChildClick(participantId: string, participantName: string) {
    setChildDetailId(participantId);
    setChildDetailName(participantName);
    setChildDetailOpen(true);
  }

  // ─── Submit handlers ─────────────────────────────────────────────────────

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});
    createMutation.mutate({
      name: formName.trim(),
      phone: formPhone.trim(),
      cnic: formCnic.trim() || undefined,
      address: formAddress.trim() || undefined,
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGuardian) return;
    setFormErrors({});

    const data: Record<string, unknown> = {};
    if (formName.trim() !== selectedGuardian.name) data.name = formName.trim();
    if (formPhone.trim() !== selectedGuardian.phone) data.phone = formPhone.trim();
    if ((formCnic.trim() || null) !== (selectedGuardian.cnic || null)) data.cnic = formCnic.trim() || null;
    if ((formAddress.trim() || null) !== (selectedGuardian.address || null)) data.address = formAddress.trim() || null;

    if (Object.keys(data).length === 0) {
      closeEditDialog();
      return;
    }
    updateMutation.mutate({ id: selectedGuardian.id, data });
  }

  function handleLinkChildSubmit() {
    if (!selectedGuardian) return;
    linkChildMutation.mutate({ id: selectedGuardian.id, participantIds: selectedChildIds });
  }

  function toggleChild(id: string) {
    setSelectedChildIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guardians"
        description="Manage family contacts and participant links"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setInviteOpen(true)}
              className="border-[#D4B8E3] text-[#4B0A8F] hover:bg-[#F3ECF6] dark:border-[#2A0C8F] dark:text-[#8A40B0] dark:hover:bg-[#1F086080]"
            >
              <UserPlus className="size-4 mr-2" />
              Invite Guardian
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="border-[#D4B8E3] text-[#4B0A8F] hover:bg-[#F3ECF6] dark:border-[#2A0C8F] dark:text-[#8A40B0] dark:hover:bg-[#1F086080]"
            >
              <FolderInput className="size-4 mr-2" />
              Import
            </Button>
            <ExportButton
              data={guardians.map((g) => ({
                name: g.name,
                phone: g.phone,
                cnic: g.cnic ?? "",
                address: g.address ?? "",
                childrenCount: g.children?.length ?? 0,
                status: g.isActive ? "Active" : "Inactive",
              }))}
              filename="guardians"
              columns={[
                { key: "name", header: "Name" },
                { key: "phone", header: "Phone" },
                { key: "cnic", header: "CNIC" },
                { key: "address", header: "Address" },
                { key: "childrenCount", header: "Children Count" },
                { key: "status", header: "Status" },
              ]}
              disabled={isLoading}
            />
            <Button
              onClick={openCreateDialog}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
            >
              <Plus className="size-4 mr-2" />
              Add Guardian
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <Card className="border-[#D4B8E3] dark:border-[#2A0C8F]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={cityId} onValueChange={handleCityFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                {cities?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={state} onValueChange={handleStateChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {pagination && (
            <div className="mt-3 text-xs text-muted-foreground">
              Showing {guardians.length} of {pagination.totalItems} guardians
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedIds={Array.from(selectedIds)}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          { key: "activate", label: "Activate", icon: UserCheck, confirmMessage: `Are you sure you want to activate ${selectedIds.size} guardian${selectedIds.size !== 1 ? "s" : ""}?` },
          { key: "deactivate", label: "Deactivate", icon: UserX, variant: "destructive", confirmMessage: `Are you sure you want to deactivate ${selectedIds.size} guardian${selectedIds.size !== 1 ? "s" : ""}? This action can be reversed.` },
          { key: "send-invite", label: "Send Invites", icon: Send, confirmMessage: `Send portal invitations to ${selectedIds.size} guardian${selectedIds.size !== 1 ? "s" : ""}?` },
        ]}
        onAction={(action) => {
          batchMutation.mutate({ action, guardianIds: Array.from(selectedIds) });
        }}
        isLoading={batchMutation.isPending}
      />

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <AnimatePresence mode="wait">
          {guardians.length > 0 ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select all row (desktop) */}
                <div className="hidden md:flex items-center gap-2 col-span-2 pb-1">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all guardians"
                  />
                  <span className="text-xs text-muted-foreground">Select all on this page</span>
                </div>
                {guardians.map((guardian, idx) => (
                  <motion.div
                    key={guardian.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.03 }}
                  >
                    <Card className="border-[#D4B8E3] dark:border-[#2A0C8F] overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetailSheet(guardian)}>
                      {/* Header */}
                      <div className="flex items-start justify-between p-4 pb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(guardian.id)}
                              onCheckedChange={() => toggleRow(guardian.id)}
                              className="absolute -top-1 -left-1 size-5"
                              aria-label={`Select ${guardian.name}`}
                            />
                            <div className="rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center size-11 text-sm font-semibold text-[#4B0A8F] dark:text-[#8A40B0]">
                            {getInitials(guardian.name)}
                          </div>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{guardian.name}</p>
                              <Badge
                                variant="outline"
                                className={
                                  guardian.isActive
                                    ? "text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860] text-[10px] shrink-0"
                                    : "text-muted-foreground border-muted bg-muted/50 text-[10px] shrink-0"
                                }
                              >
                                {guardian.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="size-3" />
                                {guardian.phone}
                              </span>
                              {guardian.cnic && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <IdCard className="size-3" />
                                  {guardian.cnic}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="size-7 shrink-0">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetailSheet(guardian); }} className="cursor-pointer">
                              <Eye className="size-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(guardian); }} className="cursor-pointer">
                              <Pencil className="size-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openLinkChildDialog(guardian); }} className="cursor-pointer">
                              <UserPlus className="size-4 mr-2" />
                              Manage Children
                            </DropdownMenuItem>
                            {guardian.isActive && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDeleteDialog(guardian); }} className="text-red-600 focus:text-red-600 cursor-pointer">
                                <Trash2 className="size-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Address */}
                      {guardian.address && (
                        <div className="px-4 pb-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{guardian.address}</span>
                          </span>
                        </div>
                      )}

                      {/* Children Section */}
                      <div className="border-t bg-muted/30 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Children ({guardian.children.length})
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-6 text-[#4B0A8F] dark:text-[#8A40B0] h-auto p-0"
                            onClick={(e) => { e.stopPropagation(); openLinkChildDialog(guardian); }}
                          >
                            <UserPlus className="size-3.5" />
                          </Button>
                        </div>

                        {guardian.children.length > 0 ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {guardian.children.map((child) => (
                              <div
                                key={child.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="rounded-full bg-[#D4B8E3] dark:bg-[#1F086080] flex items-center justify-center size-6 text-[10px] font-semibold text-[#4B0A8F] dark:text-[#8A40B0] shrink-0">
                                    {getInitials(child.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{child.name}</p>
                                    <p className="text-muted-foreground truncate">
                                      {child.group.name} · {child.group.batch.park.name}
                                    </p>
                                  </div>
                                </div>
                                {child.attendanceRate !== null && (
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${getRateColor(child.attendanceRate)}`}>
                                    {child.attendanceRate}%
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No children linked
                          </p>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={pagination.page <= 1}
                      onClick={() => { setPage((p) => p - 1); setSelectedIds(new Set()); }}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => { setPage((p) => p + 1); setSelectedIds(new Set()); }}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState
                icon={ShieldCheck}
                title={debouncedSearch || cityId ? "No guardians found" : "No guardians yet"}
                description={
                  debouncedSearch || cityId
                    ? "Try adjusting your filters."
                    : "Add your first guardian to link family contacts."
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Guardian</DialogTitle>
            <DialogDescription>
              Create a new guardian contact. You can link children later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name *</Label>
              <Input
                id="create-name"
                placeholder="Guardian name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">Phone *</Label>
              <Input
                id="create-phone"
                placeholder="Phone number"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
              {formErrors.phone && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.phone) ? formErrors.phone[0] : formErrors.phone}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-cnic">CNIC</Label>
              <Input
                id="create-cnic"
                placeholder="e.g. 35201-XXXXXXX-X"
                value={formCnic}
                onChange={(e) => setFormCnic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-address">Address</Label>
              <Input
                id="create-address"
                placeholder="Street address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
                disabled={createMutation.isPending || !formName.trim() || !formPhone.trim()}
              >
                {createMutation.isPending ? "Creating..." : "Create Guardian"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Guardian</DialogTitle>
            <DialogDescription>
              Update guardian contact information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone *</Label>
              <Input
                id="edit-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
              {formErrors.phone && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.phone) ? formErrors.phone[0] : formErrors.phone}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cnic">CNIC</Label>
              <Input
                id="edit-cnic"
                value={formCnic}
                onChange={(e) => setFormCnic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Child Dialog */}
      <Dialog open={linkChildOpen} onOpenChange={setLinkChildOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Children</DialogTitle>
            <DialogDescription>
              Search and select participants to link with {selectedGuardian?.name}.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search participants by name..."
              value={childSearch}
              onChange={(e) => setChildSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected count */}
          <div className="text-xs text-muted-foreground">
            {selectedChildIds.length} participant{selectedChildIds.length !== 1 ? "s" : ""} linked
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
            {searchingParticipants ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : participantResults?.data && participantResults.data.length > 0 ? (
              participantResults.data.map((p) => {
                const isSelected = selectedChildIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleChild(p.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-[#F3ECF6] dark:bg-[#1F086080] border border-[#D4B8E3] dark:border-[#2A0C8F]"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="rounded-full bg-[#D4B8E3] dark:bg-[#1F086080] flex items-center justify-center size-7 text-[10px] font-semibold text-[#4B0A8F] dark:text-[#8A40B0] shrink-0">
                      {getInitials(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {p.group.name} · {p.group.batch.name} · {p.group.batch.park.name}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="rounded-full bg-[#4B0A8F] dark:bg-[#8A40B0] size-5 flex items-center justify-center shrink-0">
                        <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {debouncedChildSearch ? "No participants found" : "Type to search participants"}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeLinkChildDialog} disabled={linkChildMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLinkChildSubmit}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
              disabled={linkChildMutation.isPending}
            >
              {linkChildMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate &ldquo;{selectedGuardian?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the guardian. Their child links will be
              preserved. You can reactivate them later via Edit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedGuardian(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedGuardian) deleteMutation.mutate(selectedGuardian.id);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Guardian Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) closeInviteDialog(); else setInviteOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center">
                <UserPlus className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              Invite Guardian
            </DialogTitle>
            <DialogDescription>
              Create a guardian account with login credentials. An invitation code will be generated.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name" className="text-xs font-medium">Full Name *</Label>
              <Input
                id="invite-name"
                placeholder="Guardian name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                autoFocus
              />
              {inviteErrors.name && (
                <p className="text-xs text-destructive">
                  {Array.isArray(inviteErrors.name) ? inviteErrors.name[0] : inviteErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-xs font-medium">Email (optional)</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="guardian@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              {inviteErrors.email && (
                <p className="text-xs text-destructive">
                  {Array.isArray(inviteErrors.email) ? inviteErrors.email[0] : inviteErrors.email}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">If not provided, a system email will be generated from the phone number.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-phone" className="text-xs font-medium">Phone *</Label>
              <Input
                id="invite-phone"
                placeholder="Phone number"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
              />
              {inviteErrors.phone && (
                <p className="text-xs text-destructive">
                  {Array.isArray(inviteErrors.phone) ? inviteErrors.phone[0] : inviteErrors.phone}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-cnic" className="text-xs font-medium">CNIC (optional)</Label>
              <Input
                id="invite-cnic"
                placeholder="e.g. 35201-XXXXXXX-X"
                value={inviteCnic}
                onChange={(e) => setInviteCnic(e.target.value)}
              />
              {inviteErrors.cnic && (
                <p className="text-xs text-destructive">
                  {Array.isArray(inviteErrors.cnic) ? inviteErrors.cnic[0] : inviteErrors.cnic}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-address" className="text-xs font-medium">Address (optional)</Label>
              <Input
                id="invite-address"
                placeholder="Street address"
                value={inviteAddress}
                onChange={(e) => setInviteAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-relationship" className="text-xs font-medium">Relationship *</Label>
              <Select value={inviteRelationship} onValueChange={setInviteRelationship}>
                <SelectTrigger id="invite-relationship">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {inviteErrors.relationship && (
                <p className="text-xs text-destructive">
                  {Array.isArray(inviteErrors.relationship) ? inviteErrors.relationship[0] : inviteErrors.relationship}
                </p>
              )}
            </div>

            {/* Invitation Code Display */}
            {inviteCode && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border-2 border-dashed border-[#4B0A8F]/30 bg-[#F3ECF6] dark:bg-[#1F086080] p-4 text-center"
              >
                <p className="text-xs text-muted-foreground mb-1">Invitation Code</p>
                <p className="text-2xl font-mono font-bold tracking-[0.3em] text-[#4B0A8F] dark:text-[#8A40B0]">{inviteCode}</p>
                <p className="text-[10px] text-muted-foreground mt-2">Share this code with the guardian. They can use it as their initial password to log in.</p>
              </motion.div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeInviteDialog} disabled={inviteMutation.isPending}>
                {inviteCode ? "Close" : "Cancel"}
              </Button>
              {!inviteCode && (
                <Button
                  type="submit"
                  className="bg-[#A0006B] hover:bg-[#A0006B]/90 text-white"
                  disabled={inviteMutation.isPending || !inviteName.trim() || !invitePhone.trim() || !inviteRelationship}
                >
                  {inviteMutation.isPending ? "Inviting..." : "Send Invitation"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Guardian Detail Sheet */}
      <GuardianDetailSheet
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetailSheet();
          else setDetailOpen(true);
        }}
        guardianId={selectedDetailId}
        guardianName={selectedGuardian?.name}
        onEdit={selectedGuardian ? () => {
          closeDetailSheet();
          openEditDialog(selectedGuardian);
        } : undefined}
        onLinkChild={selectedGuardian ? () => {
          closeDetailSheet();
          openLinkChildDialog(selectedGuardian);
        } : undefined}
        onChildClick={(participantId, participantName) => {
          handleChildClick(participantId, participantName);
        }}
      />

      {/* Child (Participant) Detail Sheet */}
      <ParticipantDetailSheet
        open={childDetailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setChildDetailOpen(false);
            setChildDetailId(null);
          } else {
            setChildDetailOpen(true);
          }
        }}
        participantId={childDetailId}
        participantName={childDetailName}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="guardians"
        title="Import Guardians"
        description="Upload a CSV file to bulk import guardians. Each row creates a guardian record."
        fields={GUARDIAN_FIELDS}
        exampleRows={EXAMPLE_ROWS.guardians}
        apiEndpoint="/api/admin/import/guardians"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-guardians"] })}
      />
    </div>
  );
}