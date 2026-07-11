"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarRange,
  TreePine,
  MapPin,
  Users,
} from "lucide-react";

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
  _count: { groups: number };
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
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [formName, setFormName] = useState("");
  const [formParkId, setFormParkId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
  const canCreate =
    user?.role === "super_admin" ||
    user?.role === "program_admin" ||
    user?.role === "city_head" ||
    user?.role === "park_admin" ||
    user?.role === "park_lead";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description="Manage batches across parks"
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search batches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Desktop table + Mobile cards */}
      {!isLoading && filtered && filtered.length > 0 && (
        <>
          {/* Desktop view */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Batch
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Park
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-center">
                    Groups
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Start Date
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    End Date
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860]">
                          <CalendarRange className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                        </div>
                        <span className="font-medium text-sm">
                          {batch.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{batch.park.name}</span>
                        <span className="text-muted-foreground ml-1.5">
                          {batch.park.city.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-[#F3ECF6] px-2.5 py-0.5 text-xs font-medium text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]">
                        {batch._count.groups}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(batch.startDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(batch.endDate)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860]"
                      >
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(batch)}
                            className="cursor-pointer"
                          >
                            <Pencil className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(batch)}
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((batch) => (
              <div
                key={batch.id}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860]">
                      <CalendarRange className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{batch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {batch.park.name} · {batch.park.city.name}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(batch)}
                        className="cursor-pointer"
                      >
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(batch)}
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="size-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5" />
                    <span>{batch._count.groups} groups</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TreePine className="size-3.5" />
                    <span>{formatDate(batch.startDate)}</span>
                  </div>
                  {batch.endDate && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarRange className="size-3.5" />
                      <span>to {formatDate(batch.endDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && filtered && filtered.length === 0 && (
        <EmptyState
          icon={CalendarRange}
          title={search ? "No batches found" : "No batches yet"}
          description={
            search
              ? "Try adjusting your search query."
              : "Create your first batch to organize groups within a park."
          }
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Batch</DialogTitle>
            <DialogDescription>
              Add a new batch to a park. Batches organize groups within a park's
              program cycle.
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
              <Label htmlFor="create-park">Park</Label>
              <Select value={formParkId} onValueChange={setFormParkId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a park" />
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
              <Label htmlFor="edit-park">Park</Label>
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