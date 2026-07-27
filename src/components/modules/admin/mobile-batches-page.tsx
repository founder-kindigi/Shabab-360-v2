"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarRange,
  Award,
  Printer,
  Users,
  Calendar,
  X,
  RefreshCw,
} from "lucide-react";
import {
  CompletionCertificate,
  type CertificateData,
} from "@/components/shared/completion-certificate";

interface ParkOption {
  id: string;
  name: string;
  city: { id: string; name: string };
}

interface Batch {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  park: { id: string; name: string; city: { id: string; name: string } };
  city: { id: string; name: string } | null;
  _count: { groups: number };
}

interface BatchCertificatesResponse {
  batchId: string;
  batch: string;
  park: string;
  city: string;
  totalParticipants: number;
  certificates: CertificateData[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MobileBatchesPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as {
    role?: string;
    assignedCityId?: string | null;
    assignedParkId?: string | null;
  } | undefined;

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [certListOpen, setCertListOpen] = useState(false);
  const [certViewOpen, setCertViewOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);
  const [formName, setFormName] = useState("");
  const [formParkId, setFormParkId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [certBatchId, setCertBatchId] = useState<string | null>(null);

  // Fetch parks for dropdown
  const { data: parks } = useQuery<ParkOption[]>({
    queryKey: ["admin-parks-dropdown"],
    queryFn: () => fetch("/api/admin/parks").then((r) => r.json()),
    staleTime: 30000,
  });

  // Fetch batches
  const { data: batches, isLoading, refetch } = useQuery<Batch[]>({
    queryKey: ["admin-batches"],
    queryFn: () => fetch("/api/admin/batches").then((r) => r.json()),
    staleTime: 30000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      parkId: string;
      startDate: string;
      endDate?: string;
    }) =>
      fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Batch created successfully");
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
        toast.error("Failed to create batch");
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; startDate?: string; endDate?: string | null; isActive?: boolean };
    }) =>
      fetch(`/api/admin/batches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Batch updated successfully");
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
        toast.error("Failed to update batch");
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/batches/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Batch deactivated successfully");
      setDeleteOpen(false);
      setSelectedBatch(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to deactivate batch");
    },
  });

  // Certificates query
  const {
    data: batchCertificates,
    isLoading: certLoading,
  } = useQuery<BatchCertificatesResponse>({
    queryKey: ["batch-certificates", certBatchId],
    queryFn: () =>
      fetch(`/api/admin/certificates/batch?batchId=${certBatchId}`).then(
        (r) => r.json()
      ),
    enabled: !!certBatchId && certListOpen,
  });

  // Dialog helpers
  function openCreateDialog() {
    setFormName("");
    setFormParkId("");
    setFormStartDate("");
    setFormEndDate("");
    setFormErrors({});
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setFormErrors({});
  }

  function openEditDialog(batch: Batch) {
    setSelectedBatch(batch);
    setFormName(batch.name);
    setFormStartDate(batch.startDate ? batch.startDate.split("T")[0] : "");
    setFormEndDate(batch.endDate ? batch.endDate.split("T")[0] : "");
    setFormErrors({});
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setSelectedBatch(null);
    setFormErrors({});
  }

  function openDeleteDialog(batch: Batch) {
    setSelectedBatch(batch);
    setDeleteOpen(true);
  }

  function openCertificatesDialog(batch: Batch) {
    setSelectedBatch(batch);
    setCertBatchId(batch.id);
    setCertListOpen(true);
  }

  function closeCertListDialog() {
    setCertListOpen(false);
    setCertBatchId(null);
    setSelectedBatch(null);
  }

  function openCertView(cert: CertificateData) {
    setSelectedCert(cert);
    setCertViewOpen(true);
  }

  function closeCertView() {
    setCertViewOpen(false);
    setSelectedCert(null);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});
    const payload: {
      name: string;
      parkId: string;
      startDate: string;
      endDate?: string;
    } = {
      name: formName.trim(),
      parkId: formParkId,
      startDate: formStartDate,
    };
    if (formEndDate) payload.endDate = formEndDate;
    createMutation.mutate(payload);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatch) return;
    setFormErrors({});
    const data: {
      name?: string;
      startDate?: string;
      endDate?: string | null;
    } = {};
    if (formName.trim() !== selectedBatch.name) data.name = formName.trim();
    const startStr = formStartDate;
    const existingStart = selectedBatch.startDate
      ? selectedBatch.startDate.split("T")[0]
      : "";
    if (startStr !== existingStart) data.startDate = startStr;
    const endStr = formEndDate || null;
    const existingEnd = selectedBatch.endDate
      ? selectedBatch.endDate.split("T")[0]
      : null;
    if (endStr !== existingEnd) data.endDate = endStr;
    if (Object.keys(data).length === 0) {
      closeEditDialog();
      return;
    }
    updateMutation.mutate({ id: selectedBatch.id, data });
  }

  // Filter batches by search
  const filtered = batches?.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.park.name.toLowerCase().includes(search.toLowerCase()) ||
      b.park.city.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  // Determine if user can create batches
  const canCreate =
    user?.role === "super_admin" ||
    user?.role === "program_admin" ||
    user?.role === "city_head";

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 space-y-3 border-b border-border/50 px-4">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">Batches</h1>
            <p className="text-xs text-muted-foreground truncate">
              Manage city-owned batches
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-xl size-10"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
            }}
          >
            <RefreshCw className="size-5" />
          </Button>
          {canCreate && (
            <Button
              onClick={openCreateDialog}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white rounded-xl h-10 px-3"
            >
              <Plus className="size-4 mr-2" />
              <span className="text-sm font-semibold">Add</span>
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search batches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 rounded-xl h-11 text-base bg-card"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-11 w-11 flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto space-y-3 px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <CalendarRange className="size-10 opacity-40" />
            <p className="text-sm font-medium">{search ? "No batches found" : "No batches yet"}</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs underline text-[#4B0A8F]"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((batch, index) => (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                className="rounded-2xl border bg-card p-4 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-[#F3ECF6] flex items-center justify-center dark:bg-[#1F0860]">
                      <CalendarRange className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">{batch.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {batch.city?.name ?? batch.park.city.name}
                      </p>
                    </div>
                  </div>
                  {canCreate && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-10 rounded-xl shrink-0">
                          <MoreHorizontal className="size-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(batch)}
                          className="cursor-pointer h-12"
                        >
                          <Pencil className="size-4 mr-3" />
                          Edit Batch
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openCertificatesDialog(batch)}
                          className="cursor-pointer h-12"
                        >
                          <Award className="size-4 mr-3" />
                          Certificates
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(batch)}
                          className="text-red-600 focus:text-red-600 cursor-pointer h-12"
                        >
                          <Trash2 className="size-4 mr-3" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-sm border border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs uppercase font-semibold">Anchor Park</span>
                    <span className="font-medium text-right">{batch.park.name}</span>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                    <Calendar className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Dates</p>
                      <p className="text-xs font-medium truncate">
                         {formatDate(batch.startDate)} - {formatDate(batch.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                    <Users className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Groups</p>
                      <p className="text-sm font-medium truncate">{batch._count.groups}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                   {batch.isActive ? (
                     <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 border-0 shrink-0">
                       Active
                     </Badge>
                   ) : (
                     <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 border-0 shrink-0">
                       Inactive
                     </Badge>
                   )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Create Batch</DialogTitle>
            <DialogDescription>
              Create a city-owned batch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Batch Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Summer 2025"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-park">Compatibility Anchor Park</Label>
              <Select value={formParkId} onValueChange={setFormParkId}>
                <SelectTrigger className="w-full h-12 rounded-xl text-base">
                  <SelectValue placeholder="Select a same-city anchor park" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {parks?.map((park) => (
                    <SelectItem key={park.id} value={park.id} className="h-11">
                      {park.name} — {park.city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.parkId && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.parkId) ? formErrors.parkId[0] : formErrors.parkId}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-start">Start Date</Label>
                <Input
                  id="create-start"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="h-12 rounded-xl text-base block w-full"
                  required
                />
                {formErrors.startDate && (
                  <p className="text-xs text-red-500 font-medium">
                    {Array.isArray(formErrors.startDate) ? formErrors.startDate[0] : formErrors.startDate}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-end">End Date <span className="font-normal text-muted-foreground">(Opt)</span></Label>
                <Input
                  id="create-end"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  min={formStartDate || undefined}
                  className="h-12 rounded-xl text-base block w-full"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2 flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={closeCreateDialog}
                disabled={createMutation.isPending}
                className="h-12 rounded-xl flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white h-12 rounded-xl flex-1"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>
              Update the batch details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Batch Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-park">Compatibility Anchor Park</Label>
              <Input
                id="edit-park"
                value={selectedBatch ? `${selectedBatch.park.name} — ${selectedBatch.park.city.name}` : ""}
                disabled
                className="bg-muted h-12 rounded-xl text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Date</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="h-12 rounded-xl text-base block w-full"
                  required
                />
                {formErrors.startDate && (
                  <p className="text-xs text-red-500 font-medium">
                    {Array.isArray(formErrors.startDate) ? formErrors.startDate[0] : formErrors.startDate}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Date <span className="font-normal text-muted-foreground">(Opt)</span></Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  min={formStartDate || undefined}
                  className="h-12 rounded-xl text-base block w-full"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2 flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
                disabled={updateMutation.isPending}
                className="h-12 rounded-xl flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white h-12 rounded-xl flex-1"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Certificate List Dialog */}
      <Dialog
        open={certListOpen}
        onOpenChange={(open) => {
          if (!open) closeCertListDialog();
        }}
      >
        <DialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)] max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Award className="size-5 text-[#4B0A8F]" />
              Certificates — {selectedBatch?.name}
            </DialogTitle>
            <DialogDescription>
              {batchCertificates
                ? `${batchCertificates.totalParticipants} participant(s) in ${batchCertificates.park}`
                : "Loading participants..."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 py-2">
            {certLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-9 w-20 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : batchCertificates && batchCertificates.certificates.length > 0 ? (
              <div className="space-y-2 pb-2">
                {batchCertificates.certificates.map((cert) => (
                  <div
                    key={cert.participantId}
                    className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-full bg-[#F3ECF6] p-2 dark:bg-[#1F0860]">
                        <Award className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {cert.participant}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {cert.group} · Attendance: {cert.attendanceRate}%
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl w-full"
                      onClick={() => openCertView(cert)}
                    >
                      <Printer className="size-4 mr-2" />
                      Print Certificate
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active participants found in this batch.
              </div>
            )}
          </div>

          <div className="shrink-0 pt-4 mt-auto border-t">
            {batchCertificates && batchCertificates.certificates.length > 0 ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-12 rounded-xl flex-1"
                  onClick={closeCertListDialog}
                >
                  Close
                </Button>
                <Button
                  className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white h-12 rounded-xl flex-1"
                  onClick={() => {
                    if (batchCertificates.certificates.length > 0) {
                      setSelectedCert(batchCertificates.certificates[0]);
                      setCertViewOpen(true);
                    }
                  }}
                >
                  <Printer className="size-4 mr-2" />
                  Print All
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="h-12 rounded-xl w-full"
                onClick={closeCertListDialog}
              >
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate View Dialog */}
      <Dialog open={certViewOpen} onOpenChange={setCertViewOpen}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completion Certificate</DialogTitle>
            <DialogDescription>
              Preview and print the certificate.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedCert && (
              <CompletionCertificate
                data={selectedCert}
                onClose={closeCertView}
                showActions={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <span className="font-semibold text-foreground">{selectedBatch?.name}</span>.
              Existing data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2 flex-row">
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedBatch(null);
              }}
              className="h-12 rounded-xl flex-1 mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedBatch) deleteMutation.mutate(selectedBatch.id);
              }}
              className="bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl flex-1"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
