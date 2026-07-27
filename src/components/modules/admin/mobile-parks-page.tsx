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
  TreePine,
  CalendarCheck,
  Users,
  MapPin,
  X,
  RefreshCw,
  Building2,
} from "lucide-react";
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

export function MobileParksPage() {
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
    queryFn: () => fetchJsonArray<CityOption>("/api/admin/cities"),
    staleTime: 60000,
    enabled: !isCityHead,
  });

  // Fetch parks
  const { data: parks, isLoading, refetch } = useQuery<Park[]>({
    queryKey: ["admin-parks", cityFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (cityFilter && cityFilter !== "all") {
        params.set("cityId", cityFilter);
      }
      const qs = params.toString();
      return fetchJsonArray<Park>(`/api/admin/parks${qs ? \`?\${qs}\` : ""}`);
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
  ) ?? [];

  const availableCities = cities || [];
  const assignedCityName = parks?.[0]?.city.name || "Assigned city";

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 space-y-3 border-b border-border/50 px-4">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">Parks</h1>
            <p className="text-xs text-muted-foreground truncate">
              Manage parks across your cities
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-xl size-10"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["admin-parks"] });
            }}
          >
            <RefreshCw className="size-5" />
          </Button>
          <Button
            onClick={openCreateDialog}
            className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white rounded-xl h-10 px-3"
          >
            <Plus className="size-4 mr-2" />
            <span className="text-sm font-semibold">Add</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search parks..."
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

        {/* City Filter (if applicable) */}
        {!isCityHead && availableCities.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setCityFilter("all")}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 h-9",
                cityFilter === "all"
                  ? "bg-[#4B0A8F] text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              All Cities
            </button>
            {availableCities.map((city) => (
              <button
                key={city.id}
                onClick={() => setCityFilter(city.id)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 h-9",
                  cityFilter === city.id
                    ? "bg-[#4B0A8F] text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {city.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto space-y-3 px-4 pt-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <TreePine className="size-10 opacity-40" />
            <p className="text-sm font-medium">{search ? "No parks found" : "No parks yet"}</p>
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
            {filtered.map((park, index) => (
              <motion.div
                key={park.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                className="rounded-2xl border bg-card p-4 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-[#F3ECF6] flex items-center justify-center dark:bg-[#1F0860]">
                      <TreePine className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">{park.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="size-3" />
                        <span>{park.city.name}</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-10 rounded-xl shrink-0">
                        <MoreHorizontal className="size-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(park)}
                        className="cursor-pointer h-12"
                      >
                        <Pencil className="size-4 mr-3" />
                        Edit Park
                      </DropdownMenuItem>
                      {canDelete && (
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(park)}
                          className="text-red-600 focus:text-red-600 cursor-pointer h-12"
                        >
                          <Trash2 className="size-4 mr-3" />
                          Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                    <CalendarCheck className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Batches</p>
                      <p className="text-sm font-medium truncate">{park._count.batches}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                    <Users className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Groups</p>
                      <p className="text-sm font-medium truncate">—</p>
                    </div>
                  </div>
                </div>

                {/* Address & Status */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 pr-2">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{park.address || "No address set"}</span>
                  </div>
                  {park.isActive ? (
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
            <DialogTitle>Create Park</DialogTitle>
            <DialogDescription>
              Add a new park to a city.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-city">City</Label>
              {isCityHead ? (
                <>
                  <Input value={assignedCityName} disabled className="bg-muted h-12 rounded-xl text-base" />
                  <p className="text-xs text-muted-foreground">
                    Assigned city (cannot be changed)
                  </p>
                </>
              ) : (
                <Select value={formCityId} onValueChange={setFormCityId}>
                  <SelectTrigger id="create-city" className="w-full h-12 rounded-xl text-base">
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableCities.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="h-11">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {formErrors.cityId && (
                <p className="text-xs text-red-500 font-medium">{formErrors.cityId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">Park Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Gulshan-e-Iqbal Park"
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
              <Label htmlFor="create-address">
                Address <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="create-address"
                placeholder="e.g. Block 13, Gulshan-e-Iqbal"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
              {formErrors.address && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.address) ? formErrors.address[0] : formErrors.address}
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
                {createMutation.isPending ? "Creating..." : "Create Park"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Edit Park</DialogTitle>
            <DialogDescription>
              Update the park details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={selectedPark?.city.name || ""}
                disabled
                className="bg-muted h-12 rounded-xl text-base"
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
                className="h-12 rounded-xl text-base"
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.name) ? formErrors.name[0] : formErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">
                Address <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="edit-address"
                placeholder="e.g. Block 13, Gulshan-e-Iqbal"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="h-12 rounded-xl text-base"
              />
              {formErrors.address && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.address) ? formErrors.address[0] : formErrors.address}
                </p>
              )}
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
            <AlertDialogTitle>Deactivate Park?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <span className="font-semibold text-foreground">{selectedPark?.name}</span>.
              Existing data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2 flex-row">
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedPark(null);
              }}
              className="h-12 rounded-xl flex-1 mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedPark) deleteMutation.mutate(selectedPark.id);
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
