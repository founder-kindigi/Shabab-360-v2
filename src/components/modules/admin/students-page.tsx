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
import { ParticipantDetailSheet } from "@/components/modules/admin/participant-detail-sheet";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPKT } from "@/lib/timezone";
import { useTranslation } from "@/lib/i18n";
import { ExportButton } from "@/components/shared/export-button";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  GraduationCap,
  MapPin,
  ChevronLeft,
  ChevronRight,
  User,
  UserCheck,
  UserX,
  FolderInput,
  Download,
  Check,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionToolbar, type BulkAction } from "@/components/shared/bulk-action-toolbar";
import { exportToCSV } from "@/lib/csv-export";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CityOption {
  id: string;
  name: string;
}

interface ParkOption {
  id: string;
  name: string;
  cityId: string;
}

interface GroupOption {
  id: string;
  name: string;
  batch: { id: string; name: string; park: { id: string; name: string } };
}

interface GuardianInfo {
  id: string;
  name: string;
  phone: string;
  relation: string | null;
}

interface Student {
  id: string;
  name: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  state: string;
  joinedAt: string;
  createdAt: string;
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
  guardians: GuardianInfo[];
  attendanceRate: number | null;
  attendanceTotal: number;
  attendancePresent: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
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

function getRateBarColor(rate: number | null) {
  if (rate === null) return "bg-muted";
  if (rate >= 80) return "bg-[#4B0A8F] dark:bg-[#8A40B0]";
  if (rate >= 50) return "bg-amber-500 dark:bg-amber-400";
  return "bg-red-500 dark:bg-red-400";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StudentsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState("");
  const [parkId, setParkId] = useState("");
  const [groupId, setGroupId] = useState("");
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

  const handleCityChange = useCallback((val: string) => {
    setCityId(val);
    setParkId("");
    setGroupId("");
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleParkChange = useCallback((val: string) => {
    setParkId(val);
    setGroupId("");
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleGroupChange = useCallback((val: string) => {
    setGroupId(val);
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
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveGroupOpen, setMoveGroupOpen] = useState(false);
  const [moveGroupId, setMoveGroupId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formDOB, setFormDOB] = useState("");
  const [formState, setFormState] = useState("active");
  const [formGroupId, setFormGroupId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["admin-cities-dropdown"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 60000,
  });

  const { data: parks } = useQuery<ParkOption[]>({
    queryKey: ["admin-parks-dropdown", cityId],
    queryFn: () =>
      fetch(`/api/admin/parks${cityId ? `?cityId=${cityId}` : ""}`).then((r) => r.json()),
    staleTime: 60000,
    enabled: !!cityId,
  });

  // Fetch all groups for filter and dialogs
  const { data: allGroups } = useQuery<GroupOption[]>({
    queryKey: ["admin-groups-all-dropdown"],
    queryFn: () => fetch("/api/admin/groups").then((r) => r.json()),
    staleTime: 60000,
  });

  // Filtered groups for cascading selects
  const filteredGroups = useMemo(() => {
    if (!allGroups) return [];
    return allGroups.filter((g) => {
      if (parkId) return g.batch.park.id === parkId;
      if (cityId) {
        // We don't have cityId on groups, but we have parkId from parks
        const parkIds = parks?.map((p) => p.id) || [];
        return parkIds.includes(g.batch.park.id);
      }
      return true;
    });
  }, [allGroups, parkId, cityId, parks]);

  // Fetch students
  const { data, isLoading } = useQuery<{ data: Student[]; pagination: Pagination }>({
    queryKey: ["admin-students", debouncedSearch, cityId, parkId, groupId, state, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (cityId) params.set("cityId", cityId);
      if (parkId) params.set("parkId", parkId);
      if (groupId) params.set("groupId", groupId);
      if (state && state !== "all") params.set("state", state);
      params.set("page", String(page));
      params.set("pageSize", "20");
      return fetch(`/api/admin/students?${params}`).then((r) => r.json());
    },
    staleTime: 10000,
  });

  const students = data?.data || [];
  const pagination = data?.pagination;

  // Selection helpers
  const allRowIds = students.map((s) => s.id);
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

  // ─── Batch Mutation ──────────────────────────────────────────────────────

  const batchMutation = useMutation({
    mutationFn: (body: { action: string; participantIds: string[]; groupId?: string }) =>
      fetch("/api/admin/students/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      setSelectedIds(new Set());
      const label = vars.action === "activate" ? "activated" : vars.action === "deactivate" ? "deactivated" : vars.action === "change-group" ? "moved" : "exported";
      toast.success(`${result.success} student${result.success !== 1 ? "s" : ""} ${label} successfully`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} operation${result.failed !== 1 ? "s" : ""} failed`);
      }
    },
    onError: (err: any) => {
      toast.error(err.error || "Batch operation failed");
    },
  });

  // ─── Mutations ───────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("Student created successfully");
      closeCreateDialog();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") setFormErrors(err.error);
        else toast.error(err.error);
      } else {
        toast.error("Failed to create student");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) =>
      fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("Student updated successfully");
      closeEditDialog();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") setFormErrors(err.error);
        else toast.error(err.error);
      } else {
        toast.error("Failed to update student");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/students/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("Student deactivated successfully");
      setDeleteOpen(false);
      setSelectedStudent(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to deactivate student");
    },
  });

  // ─── Dialog helpers ──────────────────────────────────────────────────────

  function openCreateDialog() {
    setFormName("");
    setFormPhone("");
    setFormGender("");
    setFormDOB("");
    setFormState("active");
    setFormGroupId("");
    setFormErrors({});
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setFormErrors({});
  }

  function openEditDialog(student: Student) {
    setSelectedStudent(student);
    setFormName(student.name);
    setFormPhone(student.phone || "");
    setFormGender(student.gender || "");
    setFormDOB(
      student.dateOfBirth
        ? new Date(student.dateOfBirth).toISOString().split("T")[0]
        : ""
    );
    setFormState(student.state);
    setFormGroupId(student.group.id);
    setFormErrors({});
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setSelectedStudent(null);
    setFormErrors({});
  }

  function openDetailSheet(student: Student) {
    setSelectedDetailId(student.id);
    setSelectedStudent(student);
    setDetailOpen(true);
  }

  function closeDetailSheet() {
    setDetailOpen(false);
    setSelectedDetailId(null);
  }

  function openDeleteDialog(student: Student) {
    setSelectedStudent(student);
    setDeleteOpen(true);
  }

  // ─── Submit handlers ─────────────────────────────────────────────────────

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});
    createMutation.mutate({
      name: formName.trim(),
      phone: formPhone.trim() || undefined,
      gender: formGender || undefined,
      dateOfBirth: formDOB || undefined,
      groupId: formGroupId,
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setFormErrors({});

    const data: Record<string, string> = {};
    if (formName.trim() !== selectedStudent.name) data.name = formName.trim();
    if ((formPhone.trim() || null) !== (selectedStudent.phone || null))
      data.phone = formPhone.trim() || "";
    if ((formGender || null) !== (selectedStudent.gender || null))
      data.gender = formGender || "";
    if (formState !== selectedStudent.state) data.state = formState;
    if (formGroupId !== selectedStudent.group.id) data.groupId = formGroupId;
    if (formDOB) {
      const current = selectedStudent.dateOfBirth
        ? new Date(selectedStudent.dateOfBirth).toISOString().split("T")[0]
        : "";
      if (formDOB !== current) data.dateOfBirth = formDOB;
    }

    if (Object.keys(data).length === 0) {
      closeEditDialog();
      return;
    }
    updateMutation.mutate({ id: selectedStudent.id, data });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("students.title")}
        description={t("students.manageDesc")}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={students.map((s) => ({
                name: s.name,
                phone: s.phone ?? "",
                gender: s.gender ?? "",
                group: s.group?.name ?? "",
                park: s.group?.batch?.park?.name ?? "",
                city: s.group?.batch?.park?.city?.name ?? "",
                status: s.state,
                joinDate: s.joinedAt ? new Date(s.joinedAt).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" }) : "",
              }))}
              filename="students"
              columns={[
                { key: "name", header: "Name" },
                { key: "phone", header: "Phone" },
                { key: "gender", header: "Gender" },
                { key: "group", header: "Group" },
                { key: "park", header: "Park" },
                { key: "city", header: "City" },
                { key: "status", header: "Status" },
                { key: "joinDate", header: "Join Date" },
              ]}
              disabled={isLoading}
            />
            <Button
              onClick={openCreateDialog}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
            >
              <Plus className="size-4 mr-2" />
              {t("students.addStudent")}
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <Card className="border-[#D4B8E3] dark:border-[#2A0C8F]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("students.searchPlaceholder")}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* City */}
            <Select value={cityId} onValueChange={handleCityChange}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t("students.allCities")} />
              </SelectTrigger>
              <SelectContent>
                {cities?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Park */}
            <Select value={parkId} onValueChange={handleParkChange} disabled={!cityId}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={cityId ? t("students.allParks") : t("students.selectCityFirst")} />
              </SelectTrigger>
              <SelectContent>
                {parks?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Group */}
            <Select value={groupId} onValueChange={handleGroupChange} disabled={!parkId}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={parkId ? t("students.allGroups") : t("students.selectParkFirst")} />
              </SelectTrigger>
              <SelectContent>
                {filteredGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* State */}
            <Select value={state} onValueChange={handleStateChange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("students.allStates")}</SelectItem>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          {pagination && (
            <div className="mt-3 text-xs text-muted-foreground">
              Showing {students.length} of {pagination.totalItems} students
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedIds={Array.from(selectedIds)}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          { key: "activate", label: "Activate", icon: UserCheck, confirmMessage: `Are you sure you want to activate ${selectedIds.size} student${selectedIds.size !== 1 ? "s" : ""}?` },
          { key: "deactivate", label: "Deactivate", icon: UserX, variant: "destructive", confirmMessage: `Are you sure you want to deactivate ${selectedIds.size} student${selectedIds.size !== 1 ? "s" : ""}? This action can be reversed.` },
          { key: "change-group", label: "Move to Group", icon: FolderInput },
          { key: "export", label: "Export CSV", icon: Download },
        ]}
        onAction={(action) => {
          if (action === "change-group") {
            setMoveGroupOpen(true);
          } else if (action === "export") {
            const selected = students.filter((s) => selectedIds.has(s.id));
            exportToCSV(
              selected.map((s) => ({
                name: s.name,
                phone: s.phone ?? "",
                gender: s.gender ?? "",
                group: s.group?.name ?? "",
                park: s.group?.batch?.park?.name ?? "",
                city: s.group?.batch?.park?.city?.name ?? "",
                status: s.state,
                joinDate: s.joinedAt ? new Date(s.joinedAt).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi" }) : "",
              })),
              "selected-students",
              [
                { key: "name", header: "Name" },
                { key: "phone", header: "Phone" },
                { key: "gender", header: "Gender" },
                { key: "group", header: "Group" },
                { key: "park", header: "Park" },
                { key: "city", header: "City" },
                { key: "status", header: "Status" },
                { key: "joinDate", header: "Join Date" },
              ]
            );
            setSelectedIds(new Set());
            toast.success(`${selected.length} student${selected.length !== 1 ? "s" : ""} exported`);
          } else {
            batchMutation.mutate({ action, participantIds: Array.from(selectedIds) });
          }
        }}
        isLoading={batchMutation.isPending}
      />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <AnimatePresence mode="wait">
          {students.length > 0 ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">{t("students.student")}</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">{t("common.phone")}</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">{t("students.gender")}</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">{t("students.hierarchy")}</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">{t("students.guardians")}</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">{t("students.attendance30d")}</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">{t("students.state")}</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">{t("students.joined")}</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow
                        key={student.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => openDetailSheet(student)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(student.id)}
                            onCheckedChange={() => toggleRow(student.id)}
                            aria-label={`Select ${student.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center size-9 text-xs font-semibold text-[#4B0A8F] dark:text-[#8A40B0] shrink-0">
                              {getInitials(student.name)}
                            </div>
                            <span className="font-medium text-sm truncate max-w-[160px]">
                              {student.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {student.phone || "—"}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {student.gender === "male" ? (
                            <User className="size-4 text-[#2A0C8F]" />
                          ) : student.gender === "female" ? (
                            <User className="size-4 text-[#A0006B]" />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap max-w-[200px]">
                            <span className="font-medium text-foreground">{student.group.name}</span>
                            <span>→</span>
                            <span>{student.group.batch.name}</span>
                            <span>→</span>
                            <span>{student.group.batch.park.name}</span>
                            <span>→</span>
                            <span>{student.group.batch.park.city.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {student.guardians.length > 0
                              ? student.guardians.map((g) => g.name).join(", ")
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getRateBarColor(student.attendanceRate)}`}
                                style={{ width: `${student.attendanceRate ?? 0}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getRateColor(student.attendanceRate)}`}>
                              {student.attendanceRate !== null ? `${student.attendanceRate}%` : "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              student.state === "active"
                                ? "text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860]"
                                : "text-muted-foreground border-muted bg-muted/50"
                            }
                          >
                            {student.state === "active" ? t("common.active") : t("common.inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatPKT(new Date(student.joinedAt))}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">{t("common.actions")}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); openDetailSheet(student); }}
                                className="cursor-pointer"
                              >
                                <Eye className="size-4 mr-2" />
                                {t("students.viewDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); openEditDialog(student); }}
                                className="cursor-pointer"
                              >
                                <Pencil className="size-4 mr-2" />
                                {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); openDeleteDialog(student); }}
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="size-4 mr-2" />
                                {t("students.deactivate")}
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
              <div className="lg:hidden space-y-3">
                {students.map((student) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card className="p-4 space-y-3 cursor-pointer hover:border-[#D4B8E3] dark:hover:border-[#2A0C8F] transition-colors" onClick={() => openDetailSheet(student)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(student.id)}
                              onCheckedChange={() => toggleRow(student.id)}
                              className="absolute -top-1 -left-1 size-5"
                              aria-label={`Select ${student.name}`}
                            />
                            <div className="rounded-full bg-[#F3ECF6] dark:bg-[#1F086080] flex items-center justify-center size-10 text-sm font-semibold text-[#4B0A8F] dark:text-[#8A40B0]">
                            {getInitials(student.name)}
                          </div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.phone || t("students.noPhone")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className={
                              student.state === "active"
                                ? "text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860] text-[10px]"
                                : "text-muted-foreground border-muted bg-muted/50 text-[10px]"
                            }
                          >
                            {student.state}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetailSheet(student); }} className="cursor-pointer">
                                <Eye className="size-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(student); }} className="cursor-pointer">
                                <Pencil className="size-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDeleteDialog(student); }} className="text-red-600 focus:text-red-600 cursor-pointer">
                                <Trash2 className="size-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        <MapPin className="size-3 shrink-0" />
                        <span>{student.group.name} → {student.group.batch.name} → {student.group.batch.park.name}</span>
                      </div>

                      {student.guardians.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{t("students.guardian")}: </span>
                          {student.guardians.map((g) => g.name).join(", ")}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getRateBarColor(student.attendanceRate)}`}
                            style={{ width: `${student.attendanceRate ?? 0}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getRateColor(student.attendanceRate)}`}>
                          {student.attendanceRate !== null ? `${student.attendanceRate}%` : "N/A"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">30d</span>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    {t("students.pageOf", { n: pagination.page, total: pagination.totalPages })}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => p - 1)}
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
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState
                icon={GraduationCap}
                title={debouncedSearch || cityId || parkId || groupId ? t("students.noStudentsFound") : t("students.noStudentsYet")}
                description={
                  debouncedSearch || cityId || parkId || groupId
                    ? t("students.tryAdjustingFilters")
                    : t("students.addFirstStudent")
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("students.addStudent")}</DialogTitle>
            <DialogDescription>
              {t("students.createDesc")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">{t("students.fullName")} *</Label>
              <Input
                id="create-name"
                placeholder={t("students.studentName")}
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
              <Label htmlFor="create-phone">{t("common.phone")}</Label>
              <Input
                id="create-phone"
                placeholder={t("students.phoneNumber")}
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-gender">{t("students.gender")}</Label>
                <Select value={formGender} onValueChange={setFormGender}>
                  <SelectTrigger id="create-gender">
                    <SelectValue placeholder={t("students.selectGender")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("students.male")}</SelectItem>
                    <SelectItem value="female">{t("students.female")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-dob">{t("students.dateOfBirth")}</Label>
                <Input
                  id="create-dob"
                  type="date"
                  value={formDOB}
                  onChange={(e) => setFormDOB(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-group">{t("students.group")} *</Label>
              <Select value={formGroupId} onValueChange={setFormGroupId}>
                <SelectTrigger id="create-group">
                  <SelectValue placeholder={t("students.selectGroup")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {allGroups?.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} — {g.batch.name} ({g.batch.park.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.groupId && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.groupId) ? formErrors.groupId[0] : formErrors.groupId}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog} disabled={createMutation.isPending}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
                disabled={createMutation.isPending || !formName.trim() || !formGroupId}
              >
                {createMutation.isPending ? t("students.creating") : t("students.createStudent")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("students.editStudent")}</DialogTitle>
            <DialogDescription>
              {t("students.editDesc")}
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
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-gender">Gender</Label>
                <Select value={formGender} onValueChange={setFormGender}>
                  <SelectTrigger id="edit-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={formDOB}
                  onChange={(e) => setFormDOB(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-state">State</Label>
                <Select value={formState} onValueChange={setFormState}>
                  <SelectTrigger id="edit-state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group">Group *</Label>
                <Select value={formGroupId} onValueChange={setFormGroupId}>
                  <SelectTrigger id="edit-group">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {allGroups?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} — {g.batch.name} ({g.batch.park.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.groupId && (
                  <p className="text-xs text-destructive">
                    {Array.isArray(formErrors.groupId) ? formErrors.groupId[0] : formErrors.groupId}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog} disabled={updateMutation.isPending}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? t("students.saving") : t("students.saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <ParticipantDetailSheet
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetailSheet();
          else setDetailOpen(true);
        }}
        participantId={selectedDetailId}
        participantName={selectedStudent?.name}
        onEdit={selectedStudent ? () => {
          closeDetailSheet();
          openEditDialog(selectedStudent);
        } : undefined}
      />

      {/* Move to Group Dialog */}
      <Dialog open={moveGroupOpen} onOpenChange={(open) => { setMoveGroupOpen(open); if (!open) setMoveGroupId(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("students.moveStudentsToGroup", { n: selectedIds.size })}</DialogTitle>
            <DialogDescription>
              {t("students.moveStudentsDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("students.targetGroup")}</Label>
              <Select value={moveGroupId} onValueChange={setMoveGroupId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("students.selectGroup")} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {allGroups?.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} — {g.batch.name} ({g.batch.park.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveGroupOpen(false)} disabled={batchMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
              disabled={!moveGroupId || batchMutation.isPending}
              onClick={() => {
                batchMutation.mutate({ action: "change-group", participantIds: Array.from(selectedIds), groupId: moveGroupId });
                setMoveGroupOpen(false);
                setMoveGroupId("");
              }}
            >
              {batchMutation.isPending ? t("students.moving") : t("students.moveStudents")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate &ldquo;{selectedStudent?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will set the student&apos;s state to inactive. Their attendance
              records and guardian links will be preserved. You can reactivate
              them later via Edit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedStudent(null);
              }}
            >
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedStudent) deleteMutation.mutate(selectedStudent.id);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("students.deactivating") : t("students.deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}