"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  KeyRound,
  UserCog,
  MapPin,
  Building2,
  Users,
  Trash2,
  Pencil,
  UserCheck,
  UserX,
  Shield,
} from "lucide-react";
import type { StaffRole } from "@/types";
import { useDebounce } from "@/hooks/use-debounce";
import {
  SortableDataTable,
  type Column,
} from "@/components/shared/sortable-data-table";
import { BulkActionToolbar, type BulkAction } from "@/components/shared/bulk-action-toolbar";

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

interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
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
    "bg-[#F3ECF6] text-[#4B0A8F] border-[#D4B8E3] dark:bg-[#1F0860] dark:text-[#8A40B0] dark:border-[#2A0C8F]",
  program_admin:
    "bg-[#F3ECF6] text-[#4B0A8F] border-[#D4B8E3] dark:bg-[#1F0860] dark:text-[#8A40B0] dark:border-[#2A0C8F]",
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
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [assignRole, setAssignRole] = useState<StaffRole | "">("");
  const [selectedUser, setSelectedUser] = useState<UserWithMeta | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<StaffRole | "">("");
  const [formCityId, setFormCityId] = useState("");
  const [formParkId, setFormParkId] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch users
  const { data, isLoading } = useQuery<{ data: UserWithMeta[]; pagination: Pagination }>({
    queryKey: ["admin-users", roleFilter, statusFilter, debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("pageSize", "20");
      const qs = params.toString();
      return fetch(`/api/admin/users${qs ? `?${qs}` : ""}`).then((r) =>
        r.json()
      );
    },
    staleTime: 30000,
  });
  const users = data?.data || [];
  const pagination = data?.pagination;



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
      role: StaffRole;
      phone?: string;
      assignedCityId?: string;
      assignedParkId?: string;
      assignedGroupId?: string;
    }) =>
      fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      closeCreateDialog();
      setTemporaryPassword(data.temporaryPassword);
      toast.success("User created. Share the temporary password securely.");
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

  // Batch mutation
  const batchMutation = useMutation({
    mutationFn: (body: { action: string; userIds: string[]; role?: string }) =>
      fetch("/api/admin/users/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedIds(new Set());
      const label = vars.action === "activate" ? "activated" : vars.action === "deactivate" ? "deactivated" : vars.action === "reset-password" ? "password-reset" : "role-assigned";
      const msg = vars.action === "reset-password"
        ? `Password reset flagged for ${result.success} user${result.success !== 1 ? "s" : ""}`
        : `${result.success} user${result.success !== 1 ? "s" : ""} ${label} successfully`;
      toast.success(msg);
      if (result.failed > 0) {
        toast.warning(`${result.failed} operation${result.failed !== 1 ? "s" : ""} failed`);
      }
    },
    onError: (err: any) => {
      toast.error(err.error || "Batch operation failed");
    },
  });

  // Dialog helpers
  function resetForm() {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("");
    setFormCityId("");
    setFormParkId("");
    setFormGroupId("");
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

  // Column definitions for SortableDataTable
  const columns: Column<UserWithMeta>[] = [
    {
      key: "user",
      header: "User",
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center justify-center size-9 rounded-full bg-[#F3ECF6] dark:bg-[#1F0860] text-[#4B0A8F] dark:text-[#8A40B0] text-xs font-bold shrink-0">
              {getInitials(user.name, user.email)}
            </div>
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
      ),
      mobileRender: (user) => (
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="flex items-center justify-center size-10 rounded-full bg-[#F3ECF6] dark:bg-[#1F0860] text-[#4B0A8F] dark:text-[#8A40B0] text-sm font-bold shrink-0">
                {getInitials(user.name, user.email)}
              </div>
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
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user) => (
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
      ),
    },
    {
      key: "assignment",
      header: "Assignment",
      render: (user) => (
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
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (user) => (
        <Badge
          variant="outline"
          className={
            user.isActive
              ? "text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860]"
              : "text-red-700 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950/50"
          }
        >
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  // Mobile card bottom section rendered inline (badges + assignments)
  // We use mobileRender on the first column to render the full card header
  // and add a second section via the assignment column mobileRender for the body

  // We handle the mobile card body by overriding mobileRender on the "role" column
  // to include badges + status + assignments in the card body
  columns[1].mobileRender = (user) => (
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
            ? "text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860]"
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
  );

  // Mobile render for assignment column: show assignment details
  columns[2].mobileRender = (user) =>
    (user.staffMeta?.assignedCity || user.staffMeta?.assignedPark || user.staffMeta?.assignedGroup) ? (
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
    ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage staff accounts and role assignments"
        actions={
          <Button
            onClick={openCreateDialog}
            className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
          >
            <Plus className="size-4 mr-2" />
            Create User
          </Button>
        }
      />

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedIds={Array.from(selectedIds)}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          { key: "activate", label: "Activate", icon: UserCheck, confirmMessage: `Are you sure you want to activate ${selectedIds.size} user${selectedIds.size !== 1 ? "s" : ""}?` },
          { key: "deactivate", label: "Deactivate", icon: UserX, variant: "destructive", confirmMessage: `Are you sure you want to deactivate ${selectedIds.size} user${selectedIds.size !== 1 ? "s" : ""}? This action can be reversed.` },
          { key: "reset-password", label: "Reset Passwords", icon: KeyRound, confirmMessage: `Force password reset for ${selectedIds.size} user${selectedIds.size !== 1 ? "s" : ""}? They will be prompted on next login.` },
          { key: "assign-role", label: "Assign Role", icon: Shield },
        ]}
        onAction={(action) => {
          if (action === "assign-role") {
            setAssignRoleOpen(true);
          } else {
            batchMutation.mutate({ action, userIds: Array.from(selectedIds) });
          }
        }}
        isLoading={batchMutation.isPending}
      />

      <SortableDataTable<UserWithMeta>
        columns={columns}
        data={users}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); setSelectedIds(new Set()); }}
        searchPlaceholder="Search by name, email, or phone..."
        filters={[
          {
            key: "role",
            label: "Roles",
            options: [
              { value: "super_admin", label: "Super Admin" },
              { value: "program_admin", label: "Program Admin" },
              { value: "city_head", label: "City Head" },
              { value: "park_admin", label: "Park Admin" },
              { value: "park_lead", label: "Park Lead" },
              { value: "murabbi", label: "Murabbi" },
            ],
            value: roleFilter,
            onChange: (v) => { setRoleFilter(v); setPage(1); setSelectedIds(new Set()); },
          },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
            value: statusFilter,
            onChange: (v) => { setStatusFilter(v); setPage(1); setSelectedIds(new Set()); },
          },
        ]}
        pagination={
          pagination
            ? {
                page: pagination.page,
                pageSize: pagination.pageSize,
                totalItems: pagination.totalItems,
                totalPages: pagination.totalPages,
                onPageChange: (p) => { setPage(p); setSelectedIds(new Set()); },
              }
            : undefined
        }
        actions={(user) => {
          const items: { label: string; icon?: React.ComponentType<{ className?: string }>; onClick: () => void; destructive?: boolean }[] = [
            { label: "Edit", icon: Pencil, onClick: () => openEditDialog(user) },
            { label: "Reset Password", icon: KeyRound, onClick: () => openResetPwdDialog(user) },
          ];
          if (user.isActive) {
            items.push({
              label: "Deactivate",
              icon: Trash2,
              onClick: () => openDeleteDialog(user),
              destructive: true,
            });
          } else {
            items.push({
              label: "Activate",
              icon: UserCog,
              onClick: () =>
                toggleActiveMutation.mutate({
                  id: user.id,
                  isActive: true,
                }),
            });
          }
          return items;
        }}
        emptyIcon={UserCog}
        emptyTitle={search || roleFilter !== "all" || statusFilter !== "all" ? "No users found" : "No users yet"}
        emptyDescription={
          search || roleFilter !== "all" || statusFilter !== "all"
            ? "Try adjusting your search or filters."
            : "Create your first user to get started."
        }
        getRowId={(user) => user.id}
        skeletonRows={4}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids)}
      />

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new staff member. A secure temporary password will be shown
              once and must be changed on first login.
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
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create and Generate Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={temporaryPassword !== null}
        onOpenChange={(open) => {
          if (!open) setTemporaryPassword(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
            <DialogDescription>
              Share this credential securely now. It will not be shown again, and
              the user must change it at first login.
            </DialogDescription>
          </DialogHeader>
          <code className="block rounded-md bg-muted px-3 py-3 text-center text-sm break-all">
            {temporaryPassword}
          </code>
          <DialogFooter>
            <Button onClick={() => setTemporaryPassword(null)}>I have saved it</Button>
          </DialogFooter>
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
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
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

      {/* Assign Role Dialog */}
      <Dialog open={assignRoleOpen} onOpenChange={(open) => { setAssignRoleOpen(open); if (!open) setAssignRole(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to {selectedIds.size} User{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Select a new role for all selected users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={assignRole} onValueChange={(v) => setAssignRole(v as StaffRole)}>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRoleOpen(false)} disabled={batchMutation.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
              disabled={!assignRole || batchMutation.isPending}
              onClick={() => {
                batchMutation.mutate({ action: "assign-role", userIds: Array.from(selectedIds), role: assignRole });
                setAssignRoleOpen(false);
                setAssignRole("");
              }}
            >
              {batchMutation.isPending ? "Assigning..." : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
