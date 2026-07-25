"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarRange,
  Award,
  Printer,
} from "lucide-react";
import {
  SortableDataTable,
  type Column,
} from "@/components/shared/sortable-data-table";
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

export function BatchesPage() {
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

  // Certificate state
  const [certBatchId, setCertBatchId] = useState<string | null>(null);

  // Fetch parks for dropdown
  const { data: parks } = useQuery<ParkOption[]>({
    queryKey: ["admin-parks-dropdown"],
    queryFn: () => fetch("/api/admin/parks").then((r) => r.json()),
    staleTime: 30000,
  });

  // Fetch batches
  const { data: batches, isLoading } = useQuery<Batch[]>({
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
  );

  // Determine if user can create batches
  const userRole = (user?.role || "").toLowerCase().trim();
  const canCreate = ["super_admin", "program_admin", "city_head"].includes(userRole);

  // Column definitions for SortableDataTable
  const columns: Column<Batch>[] = [
    {
      key: "name",
      header: "Batch",
      render: (batch) => (
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860]">
            <CalendarRange className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
          </div>
          <span className="font-medium text-sm">
            {batch.name}
          </span>
        </div>
      ),
      mobileRender: (batch) => (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860]">
              <CalendarRange className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
            </div>
            <div>
              <p className="font-medium text-sm">{batch.name}</p>
              <p className="text-xs text-muted-foreground">
                {batch.city?.name ?? batch.park.city.name}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "park",
      header: "Compatibility Anchor",
      render: (batch) => (
        <div className="text-sm">
          <span className="font-medium">{batch.park.name}</span>
          <span className="text-muted-foreground ml-1.5">
            {batch.park.city.name}
          </span>
        </div>
      ),
    },
    {
      key: "groups",
      header: "Groups",
      className: "text-center",
      render: (batch) => (
        <span className="inline-flex items-center justify-center rounded-full bg-[#F3ECF6] px-2.5 py-0.5 text-xs font-medium text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]">
          {batch._count.groups}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Start Date",
      render: (batch) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(batch.startDate)}
        </span>
      ),
    },
    {
      key: "endDate",
      header: "End Date",
      render: (batch) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(batch.endDate)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: () => (
        <Badge
          variant="outline"
          className="text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860]"
        >
          Active
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description="Manage city-owned batches and their compatibility anchor parks"
        actions={
          canCreate ? (
            <Button
              onClick={openCreateDialog}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
            >
              <Plus className="size-4 mr-2" />
              Create Batch
            </Button>
          ) : undefined
        }
      />

      <SortableDataTable<Batch>
        columns={columns}
        data={filtered || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search batches..."
        actions={(batch) => canCreate ? [
          { label: "Edit", icon: Pencil, onClick: () => openEditDialog(batch) },
          {
            label: "Certificates",
            icon: Award,
            onClick: () => openCertificatesDialog(batch),
          },
          {
            label: "Deactivate",
            icon: Trash2,
            onClick: () => openDeleteDialog(batch),
            destructive: true,
          },
        ] : []}
        emptyIcon={CalendarRange}
        emptyTitle={search ? "No batches found" : "No batches yet"}
        emptyDescription={
          search
            ? "Try adjusting your search query."
            : "Create your first city-owned batch, then assign groups to its parks."
        }
        getRowId={(batch) => batch.id}
        skeletonRows={3}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Batch</DialogTitle>
            <DialogDescription>
              Create a city-owned batch. Select a same-city compatibility anchor
              park for the transition; group allocations set operational park scope.
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
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.name)
                    ? formErrors.name[0]
                    : formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-park">Compatibility Anchor Park</Label>
              <Select value={formParkId} onValueChange={setFormParkId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a same-city anchor park" />
                </SelectTrigger>
                <SelectContent>
                  {parks?.map((park) => (
                    <SelectItem key={park.id} value={park.id}>
                      {park.name} — {park.city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.parkId && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.parkId)
                    ? formErrors.parkId[0]
                    : formErrors.parkId}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-start">Start Date</Label>
              <Input
                id="create-start"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                required
              />
              {formErrors.startDate && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.startDate)
                    ? formErrors.startDate[0]
                    : formErrors.startDate}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-end">End Date (optional)</Label>
              <Input
                id="create-end"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                min={formStartDate || undefined}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeCreateDialog}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
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
        <DialogContent>
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
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.name)
                    ? formErrors.name[0]
                    : formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-park">Compatibility Anchor Park</Label>
              <Input
                id="edit-park"
                value={
                  selectedBatch
                    ? `${selectedBatch.park.name} — ${selectedBatch.park.city.name}`
                    : ""
                }
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start Date</Label>
              <Input
                id="edit-start"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                required
              />
              {formErrors.startDate && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.startDate)
                    ? formErrors.startDate[0]
                    : formErrors.startDate}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End Date</Label>
              <Input
                id="edit-end"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                min={formStartDate || undefined}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no end date.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
                disabled={updateMutation.isPending}
              >
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

      {/* Certificate List Dialog */}
      <Dialog
        open={certListOpen}
        onOpenChange={(open) => {
          if (!open) closeCertListDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="size-5 text-[#4B0A8F]" />
              Certificates — {selectedBatch?.name}
            </DialogTitle>
            <DialogDescription>
              {batchCertificates
                ? `${batchCertificates.totalParticipants} participant(s) in ${batchCertificates.park}, ${batchCertificates.city}`
                : "Loading participants..."}
            </DialogDescription>
          </DialogHeader>

          {certLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : batchCertificates && batchCertificates.certificates.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {batchCertificates.certificates.map((cert) => (
                <div
                  key={cert.participantId}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-full bg-[#F3ECF6] p-1.5 dark:bg-[#1F0860]">
                      <Award className="size-3.5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {cert.participant}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cert.group} · Attendance: {cert.attendanceRate}%
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 ml-3"
                    onClick={() => openCertView(cert)}
                  >
                    <Printer className="size-3.5 mr-1.5" />
                    Print
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No active participants found in this batch.
            </div>
          )}

          {batchCertificates && batchCertificates.certificates.length > 0 && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeCertListDialog}
              >
                Close
              </Button>
              <Button
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
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
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Certificate View Dialog */}
      <Dialog open={certViewOpen} onOpenChange={setCertViewOpen}>
        <DialogContent className="max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle>Completion Certificate</DialogTitle>
            <DialogDescription>
              Preview and print the certificate. Use the Print button below or
              Ctrl+P.
            </DialogDescription>
          </DialogHeader>
          {selectedCert && (
            <CompletionCertificate
              data={selectedCert}
              onClose={closeCertView}
              showActions={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate &ldquo;{selectedBatch?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the batch and hide it from the program.
              Existing groups and data will be preserved. You can reactivate it
              later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedBatch(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedBatch) deleteMutation.mutate(selectedBatch.id);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
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
