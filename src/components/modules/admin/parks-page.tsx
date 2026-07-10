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
  MapPin,
  TreePine,
  CalendarCheck,
  Users,
} from "lucide-react";

interface CityOption {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Park {
  id: string;
  name: string;
  cityId: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  city: { id: string; name: string };
  _count: { batches: number };
}

export function ParksPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as
    | { id?: string; role?: string; assignedCityId?: string | null }
    | undefined;
  const isCityHead = user?.role === "city_head";
  const canDelete = ["super_admin", "program_admin"].includes(user?.role || "");

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [formName, setFormName] = useState("");
  const [formCityId, setFormCityId] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch cities for the select dropdown
  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["admin-cities-select"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 60000,
  });

  // Fetch parks
  const { data: parks, isLoading } = useQuery<Park[]>({
    queryKey: ["admin-parks", cityFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (cityFilter && cityFilter !== "all") {
        params.set("cityId", cityFilter);
      }
      const qs = params.toString();
      return fetch(`/api/admin/parks${qs ? `?${qs}` : ""}`).then((r) => r.json());
    },
    staleTime: 30000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { cityId: string; name: string; address?: string }) =>
      fetch("/api/admin/parks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Park created successfully");
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
        toast.error("Failed to create park");
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
      data: { name?: string; address?: string | null };
    }) =>
      fetch(`/api/admin/parks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Park updated successfully");
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
        toast.error("Failed to update park");
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/parks/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-parks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Park deactivated successfully");
      setDeleteOpen(false);
      setSelectedPark(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to deactivate park");
    },
  });

  // Dialog helpers
  function openCreateDialog() {
    setFormName("");
    setFormAddress("");
    setFormCityId(isCityHead && user?.assignedCityId ? user.assignedCityId : "");
    setFormErrors({});
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setFormErrors({});
  }

  function openEditDialog(park: Park) {
    setSelectedPark(park);
    setFormName(park.name);
    setFormAddress(park.address || "");
    setFormCityId(park.cityId);
    setFormErrors({});
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setSelectedPark(null);
    setFormErrors({});
  }

  function openDeleteDialog(park: Park) {
    setSelectedPark(park);
    setDeleteOpen(true);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});

    if (!formCityId) {
      setFormErrors({ cityId: "Please select a city" });
      return;
    }

    createMutation.mutate({
      cityId: formCityId,
      name: formName.trim(),
      address: formAddress.trim() || undefined,
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPark) return;
    setFormErrors({});

    const data: { name?: string; address?: string | null } = {};
    if (formName.trim() !== selectedPark.name) data.name = formName.trim();
    const newAddress = formAddress.trim() || null;
    if (newAddress !== (selectedPark.address || null)) data.address = newAddress;

    if (Object.keys(data).length === 0) {
      closeEditDialog();
      return;
    }
    updateMutation.mutate({ id: selectedPark.id, data });
  }

  // Filter parks by search
  const filtered = parks?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.address && p.address.toLowerCase().includes(search.toLowerCase()))
  );

  // Available cities for select (for city_head, only their assigned city)
  const availableCities = isCityHead
    ? cities?.filter((c) => c.id === user?.assignedCityId) || []
    : cities || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parks"
        description="Manage parks across your cities"
        actions={
          <Button
            onClick={openCreateDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="size-4 mr-2" />
            Create Park
          </Button>
        }
      />

      {/* Search + City filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search parks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {!isCityHead && availableCities.length > 1 && (
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {availableCities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && filtered && filtered.length > 0 && (
        <>
          {/* Desktop view */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Park
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    City
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-center">
                    Batches
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-center">
                    Groups
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Address
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((park) => (
                  <TableRow
                    key={park.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/50">
                          <TreePine className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="font-medium text-sm">{park.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {park.city.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                        {park._count.batches}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        —
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[200px] inline-block">
                        {park.address || (
                          <span className="italic text-xs">Not set</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50"
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
                            onClick={() => openEditDialog(park)}
                            className="cursor-pointer"
                          >
                            <Pencil className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(park)}
                              className="text-red-600 focus:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="size-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
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
            {filtered.map((park) => (
              <div
                key={park.id}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/50">
                      <TreePine className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{park.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {park.city.name}
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
                        onClick={() => openEditDialog(park)}
                        className="cursor-pointer"
                      >
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {canDelete && (
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(park)}
                          className="text-red-600 focus:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {park.address && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{park.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarCheck className="size-3.5" />
                    <span>{park._count.batches} batches</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5" />
                    <span>— groups</span>
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
          icon={TreePine}
          title={search ? "No parks found" : "No parks yet"}
          description={
            search
              ? "Try adjusting your search query."
              : "Create your first park to start organizing your program."
          }
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Park</DialogTitle>
            <DialogDescription>
              Add a new park to a city. Provide an optional address for
              reference.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-city">City</Label>
              <Select
                value={formCityId}
                onValueChange={setFormCityId}
                disabled={isCityHead}
              >
                <SelectTrigger id="create-city" className="w-full">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isCityHead && (
                <p className="text-xs text-muted-foreground">
                  Assigned city (cannot be changed)
                </p>
              )}
              {formErrors.cityId && (
                <p className="text-xs text-destructive">{formErrors.cityId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">Park Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Gulshan-e-Iqbal Park"
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
              <Label htmlFor="create-address">
                Address <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="create-address"
                placeholder="e.g. Block 13, Gulshan-e-Iqbal"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
              {formErrors.address && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.address)
                    ? formErrors.address[0]
                    : formErrors.address}
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Park"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Park</DialogTitle>
            <DialogDescription>
              Update the park name or address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={
                  availableCities.find((c) => c.id === formCityId)?.name || ""
                }
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                City cannot be changed after creation.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Park Name</Label>
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
              <Label htmlFor="edit-address">
                Address <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="edit-address"
                placeholder="e.g. Block 13, Gulshan-e-Iqbal"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
              {formErrors.address && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.address)
                    ? formErrors.address[0]
                    : formErrors.address}
                </p>
              )}
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
              Deactivate &ldquo;{selectedPark?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the park and hide it from the program.
              Existing batches, groups, and data will be preserved. You can
              reactivate it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedPark(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedPark) deleteMutation.mutate(selectedPark.id);
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