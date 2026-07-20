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
import { fetchJsonArray } from "@/lib/api/fetch-json-array";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  CalendarRange,
  TreePine,
} from "lucide-react";

interface BatchOption {
  id: string;
  name: string;
  park: { id: string; name: string };
}

interface Group {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  batch: {
    id: string;
    name: string;
    park: { id: string; name: string };
  };
  _count: { participants: number };
}

export function GroupsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as {
    role?: string;
    assignedParkId?: string | null;
    assignedGroupId?: string | null;
  } | undefined;

  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [formName, setFormName] = useState("");
  const [formBatchId, setFormBatchId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch batches for dropdown
  const { data: batchOptions } = useQuery<BatchOption[]>({
    queryKey: ["admin-batches-dropdown"],
    queryFn: () => fetchJsonArray<BatchOption>("/api/admin/batches"),
    staleTime: 30000,
  });

  // Fetch groups
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["admin-groups"],
    queryFn: () => fetchJsonArray<Group>("/api/admin/groups"),
    staleTime: 30000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; batchId: string }) =>
      fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Group created successfully");
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
        toast.error("Failed to create group");
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
      data: { name?: string; isActive?: boolean };
    }) =>
      fetch(`/api/admin/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Group updated successfully");
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
        toast.error("Failed to update group");
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/groups/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Group deactivated successfully");
      setDeleteOpen(false);
      setSelectedGroup(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to deactivate group");
    },
  });

  // Dialog helpers
  function openCreateDialog() {
    setFormName("");
    setFormBatchId("");
    setFormErrors({});
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setFormErrors({});
  }

  function openEditDialog(group: Group) {
    setSelectedGroup(group);
    setFormName(group.name);
    setFormErrors({});
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setSelectedGroup(null);
    setFormErrors({});
  }

  function openDeleteDialog(group: Group) {
    setSelectedGroup(group);
    setDeleteOpen(true);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});
    createMutation.mutate({ name: formName.trim(), batchId: formBatchId });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroup) return;
    setFormErrors({});
    const data: { name?: string } = {};
    if (formName.trim() !== selectedGroup.name) data.name = formName.trim();
    if (Object.keys(data).length === 0) {
      closeEditDialog();
      return;
    }
    updateMutation.mutate({ id: selectedGroup.id, data });
  }

  // Filter groups by search and batch
  const filtered = groups?.filter((g) => {
    const matchesSearch =
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.batch.name.toLowerCase().includes(search.toLowerCase()) ||
      g.batch.park.name.toLowerCase().includes(search.toLowerCase());
    const matchesBatch = !batchFilter || g.batch.id === batchFilter;
    return matchesSearch && matchesBatch;
  });

  // Determine if user can create/edit/delete groups
  const canCreate = ["super_admin", "program_admin", "city_head"].includes(user?.role || "");
  const canEditDelete = canCreate;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Groups"
        description="Manage groups within batches"
        actions={
          canCreate ? (
            <Button
              onClick={openCreateDialog}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
            >
              <Plus className="size-4 mr-2" />
              Create Group
            </Button>
          ) : undefined
        }
      />

      {/* Search + Batch filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={batchFilter || "__all__"}
          onValueChange={(v) => setBatchFilter(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Batches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Batches</SelectItem>
            {batchOptions?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} — {b.park.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                    Group
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Batch
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Park
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-center">
                    Participants
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((group) => (
                  <TableRow
                    key={group.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860]">
                          <Users className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                        </div>
                        <span className="font-medium text-sm">
                          {group.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{group.batch.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {group.batch.park.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-[#F3ECF6] px-2.5 py-0.5 text-xs font-medium text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]">
                        {group._count.participants}
                      </span>
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
                      {canEditDelete && (
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
                              onClick={() => openEditDialog(group)}
                              className="cursor-pointer"
                            >
                              <Pencil className="size-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {canEditDelete && (
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(group)}
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="size-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860]">
                      <Users className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.batch.name} · {group.batch.park.name}
                      </p>
                    </div>
                  </div>
                  {canEditDelete && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(group)}
                          className="cursor-pointer"
                        >
                          <Pencil className="size-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {canEditDelete && (
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(group)}
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5" />
                    <span>{group._count.participants} participants</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarRange className="size-3.5" />
                    <span>{group.batch.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && filtered && filtered.length === 0 && (
        <EmptyState
          icon={Users}
          title={search ? "No groups found" : "No groups yet"}
          description={
            search
              ? "Try adjusting your search query."
              : "Create your first group to organize participants within a batch."
          }
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Add a new group to a batch. Groups organize participants for
              attendance tracking.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Group Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Group A"
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
              <Label htmlFor="create-batch">Batch</Label>
              <Select value={formBatchId} onValueChange={setFormBatchId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batchOptions?.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name} — {batch.park.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.batchId && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.batchId)
                    ? formErrors.batchId[0]
                    : formErrors.batchId}
                </p>
              )}
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
                {createMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group name.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Group Name</Label>
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
              <Label htmlFor="edit-batch">Batch</Label>
              <Input
                id="edit-batch"
                value={
                  selectedGroup
                    ? `${selectedGroup.batch.name} — ${selectedGroup.batch.park.name}`
                    : ""
                }
                disabled
                className="bg-muted"
              />
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
              Deactivate &ldquo;{selectedGroup?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the group and hide it from the program.
              Existing participants and attendance data will be preserved. You
              can reactivate it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedGroup(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedGroup) deleteMutation.mutate(selectedGroup.id);
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
