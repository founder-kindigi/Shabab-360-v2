"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { fetchJsonArray } from "@/lib/api/fetch-json-array";
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
  Users,
  CalendarRange,
  X,
  RefreshCw,
  Building2,
} from "lucide-react";

interface BatchOption {
  id: string;
  name: string;
  park: { id: string; name: string };
}

interface ParkOption {
  id: string;
  name: string;
  city: { id: string; name: string };
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

export function MobileGroupsPage() {
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
  const [formParkId, setFormParkId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch batches for dropdown
  const { data: batchOptions } = useQuery<BatchOption[]>({
    queryKey: ["admin-batches-dropdown"],
    queryFn: () => fetchJsonArray<BatchOption>("/api/admin/batches"),
    staleTime: 30000,
  });

  const { data: parkOptions } = useQuery<ParkOption[]>({
    queryKey: ["admin-parks-dropdown"],
    queryFn: () => fetchJsonArray<ParkOption>("/api/admin/parks"),
    staleTime: 30000,
  });

  // Fetch groups
  const { data: groups, isLoading, refetch } = useQuery<Group[]>({
    queryKey: ["admin-groups"],
    queryFn: () => fetchJsonArray<Group>("/api/admin/groups"),
    staleTime: 30000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; batchId: string; parkId: string }) =>
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
    setFormParkId("");
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
    createMutation.mutate({ name: formName.trim(), batchId: formBatchId, parkId: formParkId });
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
  }) ?? [];

  // Determine if user can create/edit/delete groups
  const canCreate = ["super_admin", "program_admin", "city_head"].includes(user?.role || "");
  const canEditDelete = canCreate;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 space-y-3 border-b border-border/50 px-4">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">Groups</h1>
            <p className="text-xs text-muted-foreground truncate">
              Manage groups within batches
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-xl size-10"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
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

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
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
          
          <Select
            value={batchFilter || "__all__"}
            onValueChange={(v) => setBatchFilter(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-14 rounded-xl h-11 bg-card [&>span]:hidden [&>svg]:mx-auto border px-0">
              <CalendarRange className="size-4 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="__all__">All Batches</SelectItem>
              {batchOptions?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto space-y-3 px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Users className="size-10 opacity-40" />
            <p className="text-sm font-medium">{search || batchFilter ? "No groups found" : "No groups yet"}</p>
            {(search || batchFilter) && (
              <button
                onClick={() => { setSearch(""); setBatchFilter(""); }}
                className="text-xs underline text-[#4B0A8F]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                className="rounded-2xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-[#F3ECF6] flex items-center justify-center dark:bg-[#1F0860]">
                      <Users className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">{group.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span>{group.batch.name}</span>
                        <span>·</span>
                        <span>{group.batch.park.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {group.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 border-0 h-6">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 border-0 h-6">
                        Inactive
                      </Badge>
                    )}

                    {canEditDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 rounded-xl -mr-2">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(group)}
                            className="cursor-pointer h-12"
                          >
                            <Pencil className="size-4 mr-3" />
                            Edit Group
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(group)}
                            className="text-red-600 focus:text-red-600 cursor-pointer h-12"
                          >
                            <Trash2 className="size-4 mr-3" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2 border border-border/50">
                  <Users className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{group._count.participants} Participants</span>
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
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Add a new group to organize participants.
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
                className="h-12 rounded-xl text-base"
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-batch">Batch</Label>
              <Select value={formBatchId} onValueChange={setFormBatchId}>
                <SelectTrigger className="w-full h-12 rounded-xl text-base">
                  <SelectValue placeholder="Select a batch" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {batchOptions?.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id} className="h-11">
                      {batch.name} — {batch.park.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.batchId && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.batchId) ? formErrors.batchId[0] : formErrors.batchId}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-park">Park</Label>
              <Select value={formParkId} onValueChange={setFormParkId}>
                <SelectTrigger className="w-full h-12 rounded-xl text-base">
                  <SelectValue placeholder="Select the group's park" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {parkOptions?.map((park) => (
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
                {createMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
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
                className="h-12 rounded-xl text-base"
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-batch">Batch</Label>
              <Input
                id="edit-batch"
                value={selectedGroup ? `${selectedGroup.batch.name} — ${selectedGroup.batch.park.name}` : ""}
                disabled
                className="bg-muted h-12 rounded-xl text-base"
              />
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <span className="font-semibold text-foreground">{selectedGroup?.name}</span>.
              Existing participants will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2 flex-row">
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedGroup(null);
              }}
              className="h-12 rounded-xl flex-1 mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedGroup) deleteMutation.mutate(selectedGroup.id);
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
