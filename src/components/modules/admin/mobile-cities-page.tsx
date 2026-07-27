"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  MapPin,
  Building2,
  Users,
  X,
  RefreshCw,
} from "lucide-react";

interface City {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  _count: { parks: number };
  cityHeads: { id: string; user: { id: string; name: string | null; email: string } }[];
}

export function MobileCitiesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch cities
  const { data: cities, isLoading, refetch } = useQuery<City[]>({
    queryKey: ["admin-cities"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 30000,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; code: string }) =>
      fetch("/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("City created successfully");
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
        toast.error("Failed to create city");
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; code?: string } }) =>
      fetch(`/api/admin/cities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("City updated successfully");
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
        toast.error("Failed to update city");
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/cities/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("City deactivated successfully");
      setDeleteOpen(false);
      setSelectedCity(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to deactivate city");
    },
  });

  // Dialog helpers
  function openCreateDialog() {
    setFormName("");
    setFormCode("");
    setFormErrors({});
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setFormErrors({});
  }

  function openEditDialog(city: City) {
    setSelectedCity(city);
    setFormName(city.name);
    setFormCode(city.code);
    setFormErrors({});
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setSelectedCity(null);
    setFormErrors({});
  }

  function openDeleteDialog(city: City) {
    setSelectedCity(city);
    setDeleteOpen(true);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});
    createMutation.mutate({ name: formName.trim(), code: formCode.trim() });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCity) return;
    setFormErrors({});
    const data: { name?: string; code?: string } = {};
    if (formName.trim() !== selectedCity.name) data.name = formName.trim();
    if (formCode.trim() !== selectedCity.code) data.code = formCode.trim();
    if (Object.keys(data).length === 0) {
      closeEditDialog();
      return;
    }
    updateMutation.mutate({ id: selectedCity.id, data });
  }

  // Filter cities by search
  const filtered = cities?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 space-y-3 border-b border-border/50 px-4">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">Cities</h1>
            <p className="text-xs text-muted-foreground truncate">
              Manage cities in your program
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-xl size-10"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
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
            placeholder="Search cities..."
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
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Building2 className="size-10 opacity-40" />
            <p className="text-sm font-medium">{search ? "No cities found" : "No cities yet"}</p>
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
            {filtered.map((city, index) => (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                className="rounded-2xl border bg-card p-4 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-[#F3ECF6] flex items-center justify-center dark:bg-[#1F0860]">
                      <Building2 className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">{city.name}</p>
                      <Badge variant="outline" className="text-[10px] font-mono mt-1 bg-muted/50 border-muted-foreground/20">
                        {city.code}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-10 rounded-xl">
                        <MoreHorizontal className="size-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(city)}
                        className="cursor-pointer h-12"
                      >
                        <Pencil className="size-4 mr-3" />
                        Edit City
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(city)}
                        className="text-red-600 focus:text-red-600 cursor-pointer h-12"
                      >
                        <Trash2 className="size-4 mr-3" />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Parks</p>
                      <p className="text-sm font-medium truncate">{city._count.parks}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                    <Users className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">City Head</p>
                      <p className="text-sm font-medium truncate">
                        {city.cityHeads.length > 0
                          ? city.cityHeads[0].user.name || city.cityHeads[0].user.email
                          : "Unassigned"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-1">
                   {city.isActive ? (
                     <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 border-0">
                       Active
                     </Badge>
                   ) : (
                     <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 border-0">
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
            <DialogTitle>Create City</DialogTitle>
            <DialogDescription>
              Add a new city to the program.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">City Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Karachi"
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
              <Label htmlFor="create-code">City Code</Label>
              <Input
                id="create-code"
                placeholder="e.g. khi"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toLowerCase())}
                className="lowercase h-12 rounded-xl text-base"
              />
              {formErrors.code && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.code) ? formErrors.code[0] : formErrors.code}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
                {createMutation.isPending ? "Creating..." : "Create City"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Edit City</DialogTitle>
            <DialogDescription>
              Update the city details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">City Name</Label>
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
              <Label htmlFor="edit-code">City Code</Label>
              <Input
                id="edit-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toLowerCase())}
                className="lowercase h-12 rounded-xl text-base"
              />
              {formErrors.code && (
                <p className="text-xs text-red-500 font-medium">
                  {Array.isArray(formErrors.code) ? formErrors.code[0] : formErrors.code}
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
            <AlertDialogTitle>Deactivate City?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <span className="font-semibold text-foreground">{selectedCity?.name}</span>.
              Existing data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2 flex-row">
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedCity(null);
              }}
              className="h-12 rounded-xl flex-1 mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedCity) deleteMutation.mutate(selectedCity.id);
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
