"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
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
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  TreePine,
  CalendarCheck,
  Users,
  MapPin,
} from "lucide-react";
import {
  SortableDataTable,
  type Column,
} from "@/components/shared/sortable-data-table";
import { fetchJsonArray } from "@/lib/api/fetch-json-array";

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
  const userRole = (user?.role || "").toLowerCase().trim();
  const isCityHead = userRole === "city_head";
  const canDelete = ["super_admin", "program_admin"].includes(userRole);

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
    queryFn: () => fetchJsonArray<CityOption>("/api/admin/cities"),
    staleTime: 60000,
    enabled: !isCityHead,
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
      return fetchJsonArray<Park>(`/api/admin/parks${qs ? `?${qs}` : ""}`);
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

  const availableCities = cities || [];
  const assignedCityName = parks?.[0]?.city.name || "Assigned city";

  // Column definitions for SortableDataTable
  const columns: Column<Park>[] = [
    {
      key: "name",
      header: "Park",
      render: (park) => (
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860]">
            <TreePine className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
          </div>
          <span className="font-medium text-sm">{park.name}</span>
        </div>
      ),
      mobileRender: (park) => (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#F3ECF6] p-2 dark:bg-[#1F0860]">
              <TreePine className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
            </div>
            <div>
              <p className="font-medium text-sm">{park.name}</p>
              <p className="text-xs text-muted-foreground">
                {park.city.name}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      render: (park) => (
        <span className="text-sm text-muted-foreground">
          {park.city.name}
        </span>
      ),
    },
    {
      key: "batches",
      header: "Batches",
      className: "text-center",
      render: (park) => (
        <span className="inline-flex items-center justify-center rounded-full bg-[#F3ECF6] px-2.5 py-0.5 text-xs font-medium text-[#4B0A8F] dark:bg-[#1F0860] dark:text-[#8A40B0]">
          {park._count.batches}
        </span>
      ),
    },
    {
      key: "groups",
      header: "Groups",
      className: "text-center",
      render: () => (
        <span className="inline-flex items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          —
        </span>
      ),
    },
    {
      key: "address",
      header: "Address",
      render: (park) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] inline-block">
          {park.address || (
            <span className="italic text-xs">Not set</span>
          )}
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

  // Filter definitions
  const filterDefs = !isCityHead && availableCities.length > 1
    ? [
        {
          key: "city",
          label: "Cities",
          options: availableCities.map((c) => ({ value: c.id, label: c.name })),
          value: cityFilter,
          onChange: setCityFilter,
        },
      ]
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parks"
        description="Manage parks across your cities"
        actions={
          <Button
            onClick={openCreateDialog}
            className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
          >
            <Plus className="size-4 mr-2" />
            Create Park
          </Button>
        }
      />

      <SortableDataTable<Park>
        columns={columns}
        data={filtered || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search parks..."
        filters={filterDefs}
        actions={(park) => {
          const items: { label: string; icon?: React.ComponentType<{ className?: string }>; onClick: () => void; destructive?: boolean }[] = [
            { label: "Edit", icon: Pencil, onClick: () => openEditDialog(park) },
          ];
          if (canDelete) {
            items.push({
              label: "Deactivate",
              icon: Trash2,
              onClick: () => openDeleteDialog(park),
              destructive: true,
            });
          }
          return items;
        }}
        emptyIcon={TreePine}
        emptyTitle={search ? "No parks found" : "No parks yet"}
        emptyDescription={
          search
            ? "Try adjusting your search query."
            : "Create your first park to start organizing your program."
        }
        getRowId={(park) => park.id}
        skeletonRows={3}
      />

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
              {isCityHead ? <>
                <Input value={assignedCityName} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Assigned city (cannot be changed)
                </p>
              </> : <Select value={formCityId} onValueChange={setFormCityId}>
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
              </Select>}
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
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
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
                value={selectedPark?.city.name || ""}
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
