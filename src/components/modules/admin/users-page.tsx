"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  KeyRound,
  UserCog,
  Users,
  Eye,
  EyeOff,
  MapPin,
  Building2,
} from "lucide-react";
import type { StaffRole } from "@/types";

interface UserWithMeta {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  mustResetPwd: boolean;
  createdAt: string;
  staffMeta: {
    id: string;
    role: string;
    assignedCityId: string | null;
    assignedParkId: string | null;
    assignedGroupId: string | null;
    isActive: boolean;
    assignedCity: { id: string; name: string } | null;
    assignedPark: { id: string; name: string } | null;
    assignedGroup: { id: string; name: string } | null;
  } | null;
}

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
  batchId: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  program_admin: "Program Admin",
  city_head: "City Head",
  park_admin: "Park Admin",
  park_lead: "Park Lead",
  murabbi: "Murabbi",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
  program_admin:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
  city_head:
    "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800",
  park_admin:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  park_lead:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  murabbi:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800",
};

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithMeta | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<StaffRole | "">("");
  const [formCityId, setFormCityId] = useState("");
  const [formParkId, setFormParkId] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch users
  const { data: users, isLoading } = useQuery<UserWithMeta[]>({
    queryKey: ["admin-users", roleFilter, statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const qs = params.toString();
      return fetch(`/api/admin/users${qs ? `?${qs}` : ""}`).then((r) =>
        r.json()
      );
    },
    staleTime: 30000,
  });

  // Fetch cities for dropdowns
  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["admin-cities-dropdown"],
    queryFn: () =>
      fetch("/api/admin/cities")
        .then((r) => r.json())
        .then((data) => data.map((c: any) => ({ id: c.id, name: c.name }))),
    staleTime: 60000,
  });

  // Fetch parks for dropdowns (filtered by city)
  const { data: parks } = useQuery<ParkOption[]>({
    queryKey: ["admin-parks-dropdown", formCityId],
    queryFn: () =>
      fetch(`/api/admin/parks${formCityId ? `?cityId=${formCityId}` : ""}`)
        .then((r) => r.json())
        .then((data) =>
          data.map((p: any) => ({ id: p.id, name: p.name, cityId: p.cityId }))
        ),
    staleTime: 30000,
    enabled: !!formCityId || !!selectedUser?.staffMeta?.assignedCityId,
  });

  // Fetch groups for dropdowns (filtered by park — need batch first)
  // For groups, we need batches belonging to the selected park
  const { data: batches } = useQuery<
    { id: string; name: string; parkId: string }[]
  >({
    queryKey: ["admin-batches-dropdown", formParkId || selectedUser?.staffMeta?.assignedParkId],
    queryFn: () => {
      const parkId = formParkId || selectedUser?.staffMeta?.assignedParkId;
      return fetch(`/api/admin/batches?parkId=${parkId}`)
        .then((r) => r.json())
        .then((data: any[]) =>
          data.map((b) => ({ id: b.id, name: b.name, parkId: b.parkId }))
        );
    },
    staleTime: 30000,
    enabled: !!formParkId || !!selectedUser?.staffMeta?.assignedParkId,
  });

  const batchIds = useMemo(
    () => batches?.map((b) => b.id) || [],
    [batches]
  );

  const { data: groups } = useQuery<GroupOption[]>({
    queryKey: ["admin-groups-dropdown", batchIds.join(",")],
    queryFn: () => {
      // Use the first batch for simplicity (or fetch all)
      const batchId = batchIds[0];
      if (!batchId) return Promise.resolve([]);
      return fetch(`/api/admin/groups?batchId=${batchId}`)
        .then((r) => r.json())
        .then((data: any[]) =>
          data.map((g) => ({ id: g.id, name: g.name, batchId: g.batchId }))
        );
    },
    staleTime: 30000,
    enabled: batchIds.length > 0,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      password: string;
      role: StaffRole;
      phone?: string;
      assignedCityId?: string;
      assignedParkId?: string;
      assignedGroupId?: string;
    }) =>
      fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created successfully");
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
        toast.error("Failed to create user");
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
      data: Record<string, any>;
    }) =>
      fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated successfully");
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
        toast.error("Failed to update user");
      }
    },
  });

  // Reset password mutation
  const resetPwdMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mustResetPwd: true }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Password reset flag set. User will be prompted on next login.");
      setResetPwdOpen(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to reset password");
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive, staffMetaIsActive: isActive }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(
        vars.isActive ? "User activated successfully" : "User deactivated successfully"
      );
      setDeleteOpen(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to update user status");
    },
  });

  // Dialog helpers
  function resetForm() {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormPhone("");
    setFormRole("");
    setFormCityId("");
    setFormParkId("");
    setFormGroupId("");
    setShowPassword(false);
    setFormErrors({});
  }

  function openCreateDialog() {
    resetForm();
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setFormErrors({});
  }

  function openEditDialog(user: UserWithMeta) {
    setSelectedUser(user);
    setFormName(user.name || "");
    setFormEmail(user.email);
    setFormPhone(user.phone || "");
    setFormRole((user.staffMeta?.role as StaffRole) || "");
    setFormCityId(user.staffMeta?.assignedCityId || "");
    setFormParkId(user.staffMeta?.assignedParkId || "");
    setFormGroupId(user.staffMeta?.assignedGroupId || "");
    setFormPassword("");
    setShowPassword(false);
    setFormErrors({});
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setSelectedUser(null);
    setFormErrors({});
  }

  function openDeleteDialog(user: UserWithMeta) {
    setSelectedUser(user);
    setDeleteOpen(true);
  }

  function openResetPwdDialog(user: UserWithMeta) {
    setSelectedUser(user);
    setResetPwdOpen(true);
  }

  // Determines if a role requires city/park/group assignments
  function needsCity(role: string) {
    return ["city_head", "park_admin", "park_lead", "murabbi"].includes(role);
  }
  function needsPark(role: string) {
    return ["park_admin", "park_lead", "murabbi"].includes(role);
  }
  function needsGroup(role: string) {
    return role === "murabbi";
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});

    const payload: any = {
      name: formName.trim(),
      email: formEmail.trim(),
      password: formPassword,
      role: formRole,
    };
    if (formPhone.trim()) payload.phone = formPhone.trim();
    if (formCityId) payload.assignedCityId = formCityId;
    if (formParkId) payload.assignedParkId = formParkId;
    if (formGroupId) payload.assignedGroupId = formGroupId;

    createMutation.mutate(payload);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setFormErrors({});

    const data: Record<string, any> = {};
    if (formName.trim() !== (selectedUser.name || ""))
      data.name = formName.trim();
    if (formEmail.trim() !== selectedUser.email) data.email = formEmail.trim();
    if (formPhone.trim() !== (selectedUser.phone || ""))
      data.phone = formPhone.trim() || null;
    if (formRole !== (selectedUser.staffMeta?.role || ""))
      data.role = formRole;

    // Assignment changes
    const meta = selectedUser.staffMeta;
    if (formCityId !== (meta?.assignedCityId || "")) {
      data.assignedCityId = formCityId || null;
    }
    if (formParkId !== (meta?.assignedParkId || "")) {
      data.assignedParkId = formParkId || null;
    }
    if (formGroupId !== (meta?.assignedGroupId || "")) {
      data.assignedGroupId = formGroupId || null;
    }

    if (Object.keys(data).length === 0) {
      closeEditDialog();
      return;
    }

    updateMutation.mutate({ id: selectedUser.id, data });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage staff accounts and role assignments"
        actions={
          <Button
            onClick={openCreateDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="size-4 mr-2" />
            Create User
          </Button>
        }
      />

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="program_admin">Program Admin</SelectItem>
            <SelectItem value="city_head">City Head</SelectItem>
            <SelectItem value="park_admin">Park Admin</SelectItem>
            <SelectItem value="park_lead">Park Lead</SelectItem>
            <SelectItem value="murabbi">Murabbi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Desktop table */}
      {!isLoading && users && users.length > 0 && (
        <>
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    User
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Role
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">
                    Assignment
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                          {getInitials(user.name, user.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.name || "No name"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {user.staffMeta ? (
                          <Badge
                            variant="outline"
                            className={ROLE_COLORS[user.staffMeta.role] || ""}
                          >
                            {ROLE_LABELS[user.staffMeta.role] || user.staffMeta.role}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No role
                          </span>
                        )}
                        {user.mustResetPwd && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
                          >
                            <KeyRound className="size-3 mr-1" />
                            Reset Pwd
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-0.5">
                        {user.staffMeta?.assignedCity && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="size-3" />
                            <span className="truncate">
                              {user.staffMeta.assignedCity.name}
                            </span>
                          </div>
                        )}
                        {user.staffMeta?.assignedPark && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Building2 className="size-3" />
                            <span className="truncate">
                              {user.staffMeta.assignedPark.name}
                            </span>
                          </div>
                        )}
                        {user.staffMeta?.assignedGroup && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="size-3" />
                            <span className="truncate">
                              {user.staffMeta.assignedGroup.name}
                            </span>
                          </div>
                        )}
                        {!user.staffMeta?.assignedCity &&
                          !user.staffMeta?.assignedPark &&
                          !user.staffMeta?.assignedGroup && (
                            <span className="text-xs text-muted-foreground italic">
                              No assignment
                            </span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          user.isActive
                            ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50"
                            : "text-red-700 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950/50"
                        }
                      >
                        {user.isActive ? "Active" : "Inactive"}
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
                            onClick={() => openEditDialog(user)}
                            className="cursor-pointer"
                          >
                            <Pencil className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openResetPwdDialog(user)}
                            className="cursor-pointer"
                          >
                            <KeyRound className="size-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          {user.isActive ? (
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(user)}
                              className="text-red-600 focus:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="size-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  id: user.id,
                                  isActive: true,
                                })
                              }
                              className="cursor-pointer"
                            >
                              <UserCog className="size-4 mr-2" />
                              Activate
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
            {users.map((user) => (
              <motion.div
                key={user.id}
                initial={false}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.15 }}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-sm font-bold shrink-0">
                      {getInitials(user.name, user.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.name || "No name"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
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
                        onClick={() => openEditDialog(user)}
                        className="cursor-pointer"
                      >
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openResetPwdDialog(user)}
                        className="cursor-pointer"
                      >
                        <KeyRound className="size-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                      {user.isActive ? (
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(user)}
                          className="text-red-600 focus:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: user.id,
                              isActive: true,
                            })
                          }
                          className="cursor-pointer"
                        >
                          <UserCog className="size-4 mr-2" />
                          Activate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {user.staffMeta ? (
                    <Badge
                      variant="outline"
                      className={ROLE_COLORS[user.staffMeta.role] || ""}
                    >
                      {ROLE_LABELS[user.staffMeta.role] || user.staffMeta.role}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      No role
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      user.isActive
                        ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50"
                        : "text-red-700 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950/50"
                    }
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {user.mustResetPwd && (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
                    >
                      <KeyRound className="size-3 mr-1" />
                      Reset Pwd
                    </Badge>
                  )}
                </div>
                {(user.staffMeta?.assignedCity || user.staffMeta?.assignedPark || user.staffMeta?.assignedGroup) && (
                  <div className="text-sm space-y-0.5 text-muted-foreground">
                    {user.staffMeta?.assignedCity && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3" />
                        <span>{user.staffMeta.assignedCity.name}</span>
                      </div>
                    )}
                    {user.staffMeta?.assignedPark && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="size-3" />
                        <span>{user.staffMeta.assignedPark.name}</span>
                      </div>
                    )}
                    {user.staffMeta?.assignedGroup && (
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3" />
                        <span>{user.staffMeta.assignedGroup.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && users && users.length === 0 && (
        <EmptyState
          icon={UserCog}
          title={search || roleFilter !== "all" || statusFilter !== "all" ? "No users found" : "No users yet"}
          description={
            search || roleFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Create your first user to get started."
          }
        />
      )}

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new staff member. They will be prompted to change their
              password on first login.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Ahmad Khan"
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
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="e.g. ahmad@shabab.org"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
              {formErrors.email && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.email)
                    ? formErrors.email[0]
                    : formErrors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </Button>
              </div>
              {formErrors.password && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.password)
                    ? formErrors.password[0]
                    : formErrors.password}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">Phone (optional)</Label>
              <Input
                id="create-phone"
                placeholder="e.g. +92 300 1234567"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formRole}
                onValueChange={(v) => {
                  setFormRole(v as StaffRole);
                  // Clear lower-level assignments if role changes
                  if (!needsPark(v)) {
                    setFormParkId("");
                    setFormGroupId("");
                  }
                  if (!needsCity(v)) {
                    setFormCityId("");
                    setFormParkId("");
                    setFormGroupId("");
                  }
                  if (!needsGroup(v)) {
                    setFormGroupId("");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="program_admin">Program Admin</SelectItem>
                  <SelectItem value="city_head">City Head</SelectItem>
                  <SelectItem value="park_admin">Park Admin</SelectItem>
                  <SelectItem value="park_lead">Park Lead</SelectItem>
                  <SelectItem value="murabbi">Murabbi</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.role)
                    ? formErrors.role[0]
                    : formErrors.role}
                </p>
              )}
            </div>
            {needsCity(formRole) && (
              <div className="space-y-2">
                <Label>City</Label>
                <Select
                  value={formCityId}
                  onValueChange={(v) => {
                    setFormCityId(v);
                    setFormParkId("");
                    setFormGroupId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.assignedCityId && (
                  <p className="text-xs text-destructive">
                    {Array.isArray(formErrors.assignedCityId)
                      ? formErrors.assignedCityId[0]
                      : formErrors.assignedCityId}
                  </p>
                )}
              </div>
            )}
            {needsPark(formRole) && formCityId && (
              <div className="space-y-2">
                <Label>Park</Label>
                <Select
                  value={formParkId}
                  onValueChange={(v) => {
                    setFormParkId(v);
                    setFormGroupId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a park" />
                  </SelectTrigger>
                  <SelectContent>
                    {parks
                      ?.filter((p) => p.cityId === formCityId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formErrors.assignedParkId && (
                  <p className="text-xs text-destructive">
                    {Array.isArray(formErrors.assignedParkId)
                      ? formErrors.assignedParkId[0]
                      : formErrors.assignedParkId}
                  </p>
                )}
              </div>
            )}
            {needsGroup(formRole) && formParkId && (
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={formGroupId} onValueChange={setFormGroupId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.assignedGroupId && (
                  <p className="text-xs text-destructive">
                    {Array.isArray(formErrors.assignedGroupId)
                      ? formErrors.assignedGroupId[0]
                      : formErrors.assignedGroupId}
                  </p>
                )}
              </div>
            )}
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
                {createMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and role assignments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g. Ahmad Khan"
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
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
              {formErrors.email && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.email)
                    ? formErrors.email[0]
                    : formErrors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                placeholder="e.g. +92 300 1234567"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formRole}
                onValueChange={(v) => {
                  setFormRole(v as StaffRole);
                  if (!needsPark(v)) {
                    setFormParkId("");
                    setFormGroupId("");
                  }
                  if (!needsCity(v)) {
                    setFormCityId("");
                    setFormParkId("");
                    setFormGroupId("");
                  }
                  if (!needsGroup(v)) {
                    setFormGroupId("");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="program_admin">Program Admin</SelectItem>
                  <SelectItem value="city_head">City Head</SelectItem>
                  <SelectItem value="park_admin">Park Admin</SelectItem>
                  <SelectItem value="park_lead">Park Lead</SelectItem>
                  <SelectItem value="murabbi">Murabbi</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-xs text-destructive">
                  {Array.isArray(formErrors.role)
                    ? formErrors.role[0]
                    : formErrors.role}
                </p>
              )}
            </div>
            {needsCity(formRole) && (
              <div className="space-y-2">
                <Label>City</Label>
                <Select
                  value={formCityId}
                  onValueChange={(v) => {
                    setFormCityId(v);
                    setFormParkId("");
                    setFormGroupId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.assignedCityId && (
                  <p className="text-xs text-destructive">
                    {Array.isArray(formErrors.assignedCityId)
                      ? formErrors.assignedCityId[0]
                      : formErrors.assignedCityId}
                  </p>
                )}
              </div>
            )}
            {needsPark(formRole) && formCityId && (
              <div className="space-y-2">
                <Label>Park</Label>
                <Select
                  value={formParkId}
                  onValueChange={(v) => {
                    setFormParkId(v);
                    setFormGroupId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a park" />
                  </SelectTrigger>
                  <SelectContent>
                    {parks
                      ?.filter((p) => p.cityId === formCityId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formErrors.assignedParkId && (
                  <p className="text-xs text-destructive">
                    {Array.isArray(formErrors.assignedParkId)
                      ? formErrors.assignedParkId[0]
                      : formErrors.assignedParkId}
                  </p>
                )}
              </div>
            )}
            {needsGroup(formRole) && formParkId && (
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={formGroupId} onValueChange={setFormGroupId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.assignedGroupId && (
                  <p className="text-xs text-destructive">
                    {Array.isArray(formErrors.assignedGroupId)
                      ? formErrors.assignedGroupId[0]
                      : formErrors.assignedGroupId}
                  </p>
                )}
              </div>
            )}
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

      {/* Deactivate Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate &ldquo;{selectedUser?.name || selectedUser?.email}
              &rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the user and revoke their access to the
              system. Their data will be preserved. You can reactivate them
              later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser)
                  toggleActiveMutation.mutate({
                    id: selectedUser.id,
                    isActive: false,
                  });
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={toggleActiveMutation.isPending}
            >
              {toggleActiveMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reset password for &ldquo;{selectedUser?.name || selectedUser?.email}
              &rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will require the user to set a new password on their next
              login. They will be redirected to the password reset page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setResetPwdOpen(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser)
                  resetPwdMutation.mutate({ id: selectedUser.id });
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={resetPwdMutation.isPending}
            >
              {resetPwdMutation.isPending ? "Setting..." : "Require Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}