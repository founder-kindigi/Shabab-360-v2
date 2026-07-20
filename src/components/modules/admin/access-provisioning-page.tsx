"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, type MotionProps, type Variants } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  UserPlus,
  ArrowRight,
  Users,
  Mail,
  Phone,
  UserCog,
  Shield,
  Search,
  MoreHorizontal,
  Pencil,
  KeyRound,
  UserCheck,
  UserX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FilterX,
  FolderInput,
} from "lucide-react";
import {
  ImportDialog,
  USER_FIELDS,
  EXAMPLE_ROWS,
} from "@/components/shared/import-dialog";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

// ─── Types ───────────────────────────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────────────

const ALL_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "super_admin", label: "Super Admin", description: "Full system access" },
  { value: "program_admin", label: "Program Admin", description: "Organization-wide management" },
  { value: "city_head", label: "City Head", description: "City-level oversight" },
  { value: "park_admin", label: "Park Admin", description: "Park management" },
  { value: "park_lead", label: "Park Lead", description: "Park operations lead" },
  { value: "murabbi", label: "Murabbi", description: "Group supervisor" },
  { value: "guardian", label: "Guardian", description: "Parent/guardian access" },
  { value: "student", label: "Student", description: "Participant access" },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#4B0A8F",
  program_admin: "#A0006B",
  city_head: "#6B20A0",
  park_admin: "#8A40B0",
  park_lead: "#2A0C8F",
  murabbi: "#E0002A",
  guardian: "#6B5A7A",
  student: "#FF0015",
};

const ROLE_BADGE_DARK: Record<string, string> = {
  super_admin: "#8A40B0",
  program_admin: "#D4B8E3",
  city_head: "#A060D0",
  park_admin: "#B070D0",
  park_lead: "#6040C0",
  murabbi: "#FF4060",
  guardian: "#9A8AAA",
  student: "#FF5050",
};

// Roles that show city selector
const CITY_ROLES = ["city_head", "park_admin", "park_lead", "murabbi", "guardian"];
// Roles that show park selector
const PARK_ROLES = ["park_admin", "park_lead", "murabbi", "student"];
// Roles that show group selector
const GROUP_ROLES = ["murabbi"];

// ─── Helpers ─────────────────────────────────────────────────────

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

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getUserStatus(user: UserWithMeta): "active" | "inactive" | "pending_reset" {
  if (!user.isActive || (user.staffMeta && !user.staffMeta.isActive)) return "inactive";
  if (user.mustResetPwd) return "pending_reset";
  return "active";
}

function StatusBadge({ status }: { status: "active" | "inactive" | "pending_reset" }) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-0 dark:text-emerald-400 dark:bg-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 gap-1">
          <CheckCircle2 className="size-3" />
          Active
        </Badge>
      );
    case "inactive":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-0 dark:text-red-400 dark:bg-red-500/20 text-[10px] font-semibold px-2 py-0.5 gap-1">
          <XCircle className="size-3" />
          Inactive
        </Badge>
      );
    case "pending_reset":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-0 dark:text-amber-400 dark:bg-amber-500/20 text-[10px] font-semibold px-2 py-0.5 gap-1">
          <KeyRound className="size-3" />
          Pending Reset
        </Badge>
      );
  }
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] || "#6B5A7A";
  const darkColor = ROLE_BADGE_DARK[role] || "#9A8AAA";
  const label = role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <Badge
      variant="outline"
      className="text-[10px] px-2 py-0.5 font-semibold leading-tight"
      style={{
        borderColor: `color-mix(in srgb, ${color} 60%, transparent)`,
        color: color,
        backgroundColor: color + "12",
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 shrink-0"
        style={{ backgroundColor: color }}
      />
      {label}
    </Badge>
  );
}

const fadeUp: MotionProps = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const listItem: Variants = {
  hidden: { opacity: 0, x: 8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: "easeOut" },
  }),
};

// ─── Component ───────────────────────────────────────────────────

export function AccessProvisioningPage() {
  const queryClient = useQueryClient();
  const { navigateTo } = useAppStore();
  const { data: session } = useSession();
  const currentUser = session?.user as import("@/types").ShababUser | undefined;
  const isCityHead = currentUser?.role === "city_head";
  const availableRoles = isCityHead
    ? ALL_ROLES.filter((role) => ["park_admin", "park_lead", "murabbi"].includes(role.value))
    : ALL_ROLES;

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<UserRole | "">("");
  const [formCityId, setFormCityId] = useState("");
  const [formParkId, setFormParkId] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [importOpen, setImportOpen] = useState(false);

  // Search state for recent invites
  const [searchQuery, setSearchQuery] = useState("");

  // Quick action dialog
  const [actionDialog, setActionDialog] = useState<{
    type: "deactivate" | "activate" | "reset_pwd";
    user: UserWithMeta;
  } | null>(null);
  const cityScopeId = isCityHead ? currentUser?.assignedCityId || "" : formCityId;

  // ─── Data fetching ─────────────────────────────────────────────

  // Fetch cities
  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["admin-cities-dropdown"],
    queryFn: () =>
      fetch("/api/admin/cities")
        .then((r) => r.json())
        .then((data) => data.map((c: any) => ({ id: c.id, name: c.name }))),
    staleTime: 60000,
    enabled: !isCityHead,
  });

  // Fetch parks filtered by city
  const { data: parks } = useQuery<ParkOption[]>({
    queryKey: ["admin-parks-dropdown", cityScopeId],
    queryFn: () =>
      fetch(`/api/admin/parks${cityScopeId ? `?cityId=${cityScopeId}` : ""}`)
        .then((r) => r.json())
        .then((data) =>
          data.map((p: any) => ({ id: p.id, name: p.name, cityId: p.cityId }))
        ),
    staleTime: 30000,
    enabled: !!cityScopeId,
  });

  // Fetch batches for park → group cascade
  const { data: batches } = useQuery<
    { id: string; name: string; parkId: string }[]
  >({
    queryKey: ["admin-batches-dropdown", formParkId],
    queryFn: () =>
      fetch(`/api/admin/batches?parkId=${formParkId}`)
        .then((r) => r.json())
        .then((data: any[]) =>
          data.map((b) => ({ id: b.id, name: b.name, parkId: b.parkId }))
        ),
    staleTime: 30000,
    enabled: !!formParkId,
  });

  const batchIds = useMemo(() => batches?.map((b) => b.id) || [], [batches]);

  const { data: groups } = useQuery<GroupOption[]>({
    queryKey: ["admin-groups-dropdown", batchIds.join(",")],
    queryFn: () => {
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

  // Fetch recent invites (last 20 users for search/filter)
  const { data: _recentData, isLoading: recentLoading } = useQuery<{ data: UserWithMeta[] }>({
    queryKey: ["admin-recent-invites"],
    queryFn: () =>
      fetch("/api/admin/users?pageSize=20").then((r) => r.json()),
    staleTime: 15000,
  });
  const recentUsers = _recentData?.data || [];

  // Filtered users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return recentUsers;
    const q = searchQuery.toLowerCase().trim();
    return recentUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q)
    );
  }, [recentUsers, searchQuery]);

  // ─── Mutations ─────────────────────────────────────────────────

  const inviteMutation = useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      phone?: string;
      role: UserRole;
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
      queryClient.invalidateQueries({ queryKey: ["admin-recent-invites"] });
      toast.success("User invited successfully", {
        description: `Share this temporary password once: ${data.temporaryPassword}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      if (err.error) {
        if (typeof err.error === "object") {
          // Flatten field errors to string
          const flat: Record<string, string> = {};
          for (const [key, val] of Object.entries(err.error)) {
            flat[key] = Array.isArray(val) ? val[0] : String(val);
          }
          setFormErrors(flat);
        } else {
          toast.error(String(err.error));
        }
      } else {
        toast.error("Failed to create user");
      }
    },
  });

  // Quick action mutations
  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recent-invites"] });
      toast.success(
        variables.isActive
          ? "User activated successfully"
          : "User deactivated successfully"
      );
      setActionDialog(null);
    },
    onError: () => {
      toast.error("Failed to update user status");
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mustResetPwd: true }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recent-invites"] });
      toast.success("Password reset triggered. User will be prompted on next login.");
      setActionDialog(null);
    },
    onError: () => {
      toast.error("Failed to trigger password reset");
    },
  });

  // ─── Form logic ────────────────────────────────────────────────

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

  function handleRoleChange(value: string) {
    setFormRole(value as UserRole);
    // Reset scope selectors when role changes
    setFormCityId("");
    setFormParkId("");
    setFormGroupId("");
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.assignedCityId;
      delete next.assignedParkId;
      delete next.assignedGroupId;
      return next;
    });
  }

  function handleCityChange(value: string) {
    setFormCityId(value);
    setFormParkId("");
    setFormGroupId("");
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.assignedParkId;
      delete next.assignedGroupId;
      return next;
    });
  }

  function handleParkChange(value: string) {
    setFormParkId(value);
    setFormGroupId("");
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.assignedGroupId;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Name is required";
    if (!formEmail.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) errors.email = "Invalid email format";
    if (!formRole) errors.role = "Role is required";

    if (CITY_ROLES.includes(formRole) && !cityScopeId) {
      errors.assignedCityId = "City is required for this role";
    }
    if (PARK_ROLES.includes(formRole) && !formParkId) {
      errors.assignedParkId = "Park is required for this role";
    }
    if (GROUP_ROLES.includes(formRole) && !formGroupId) {
      errors.assignedGroupId = "Group is required for this role";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    inviteMutation.mutate({
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim() || undefined,
      role: formRole as UserRole,
      assignedCityId: cityScopeId || undefined,
      assignedParkId: formParkId || undefined,
      assignedGroupId: formGroupId || undefined,
    });
  }

  const isSubmitting = inviteMutation.isPending;
  const selectedRoleConfig = availableRoles.find((r) => r.value === formRole);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Provisioning"
        description={isCityHead
          ? "Manage Park Leads, Park Admins, and Murabbis in your assigned city"
          : "Create new user accounts and assign roles and permissions"}
        actions={!isCityHead ? (
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="border-[#D4B8E3] text-[#4B0A8F] hover:bg-[#F3ECF6] dark:border-[#2A0C8F] dark:text-[#8A40B0] dark:hover:bg-[#1F086080]"
          >
            <FolderInput className="size-4 mr-2" />
            Import Users
          </Button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── Left Panel: Create User Form (3 cols) ─── */}
        <motion.div {...fadeUp} className="lg:col-span-3 space-y-6">
          {/* Personal Info */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enter the user&apos;s basic details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
                <Label htmlFor="invite-name" className="text-xs font-medium">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="invite-name"
                    placeholder="e.g. Ahmed Khan"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="pl-9 h-10"
                    disabled={isSubmitting}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </motion.div>

              <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                <Label htmlFor="invite-email" className="text-xs font-medium">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="e.g. ahmed@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="pl-9 h-10"
                    disabled={isSubmitting}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </motion.div>

              <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
                <Label htmlFor="invite-phone" className="text-xs font-medium">
                  Phone <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="invite-phone"
                    type="tel"
                    placeholder="e.g. +92 300 1234567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="pl-9 h-10"
                    disabled={isSubmitting}
                  />
                </div>
              </motion.div>
            </CardContent>
          </Card>

          {/* Role & Assignment */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="size-4 text-[#A0006B] dark:text-[#C94D99]" />
                Role & Assignment
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Assign a role and organizational scope
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Role select */}
              <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
                <Label htmlFor="invite-role" className="text-xs font-medium">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select value={formRole} onValueChange={handleRoleChange} disabled={isSubmitting}>
                  <SelectTrigger id="invite-role" className="mt-1.5 h-10">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className="flex flex-col">
                          <span className="font-medium">{r.label}</span>
                          <span className="text-[10px] text-muted-foreground">{r.description}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRoleConfig && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ROLE_COLORS[formRole] }}
                    />
                    {selectedRoleConfig.description}
                  </motion.p>
                )}
                {formErrors.role && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>
                )}
              </motion.div>

              {/* City select */}
              {formRole && CITY_ROLES.includes(formRole) && !isCityHead && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label className="text-xs font-medium">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formCityId} onValueChange={handleCityChange} disabled={isSubmitting}>
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue placeholder={cities ? "Select a city" : "Loading cities..."} />
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
                    <p className="text-xs text-red-500 mt-1">{formErrors.assignedCityId}</p>
                  )}
                </motion.div>
              )}

              {/* Park select */}
              {formRole && PARK_ROLES.includes(formRole) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label className="text-xs font-medium">
                    Park <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formParkId} onValueChange={handleParkChange} disabled={isSubmitting || !cityScopeId}>
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue
                        placeholder={
                          !cityScopeId
                            ? "Select a city first"
                            : parks
                              ? "Select a park"
                              : "Loading parks..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {parks?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.assignedParkId && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.assignedParkId}</p>
                  )}
                </motion.div>
              )}

              {/* Group select — shown for murabbi */}
              {formRole && GROUP_ROLES.includes(formRole) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label className="text-xs font-medium">
                    Group <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formGroupId}
                    onValueChange={setFormGroupId}
                    disabled={isSubmitting || !formParkId}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue
                        placeholder={
                          !formParkId
                            ? "Select a park first"
                            : groups
                              ? "Select a group"
                              : "Loading groups..."
                        }
                      />
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
                    <p className="text-xs text-red-500 mt-1">{formErrors.assignedGroupId}</p>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-11 bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] hover:from-[#3A0870] hover:to-[#800056] text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating User...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  Create User & Send Invite
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* ─── Right Panel: Recent Invites (2 cols) ─── */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2"
        >
          <Card className="border-border/60 bg-card h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold">Recent Invites</CardTitle>
                  <CardDescription className="text-xs mt-0.5 text-muted-foreground">
                    {recentUsers.length > 0
                      ? `${recentUsers.length} users total`
                      : "Last 20 created users"}
                  </CardDescription>
                </div>
                {!isCityHead && <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-[#4B0A8F] hover:text-[#6B20A0] hover:bg-[#F3ECF6] dark:text-[#8A40B0] dark:hover:bg-[#1F086080] shrink-0"
                  onClick={() => navigateTo("admin-users")}
                >
                  View All
                  <ArrowRight className="size-3 ml-1" />
                </Button>}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {/* ─── Search Bar ──────────────────────────────────── */}
              {recentUsers.length > 0 && (
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="h-8 pl-8 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}

              {recentLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar -mx-1 px-1">
                  {/* ─── Desktop Table View ──────────────────────── */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                          <th className="text-left pb-2 pl-2 font-medium">User</th>
                          <th className="text-left pb-2 font-medium">Role</th>
                          <th className="text-left pb-2 font-medium">Status</th>
                          <th className="text-right pb-2 pr-1 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        <AnimatePresence>
                          {filteredUsers.map((user, i) => {
                            const status = getUserStatus(user);
                            const role = user.staffMeta?.role || "";
                            return (
                              <motion.tr
                                key={user.id}
                                custom={i}
                                variants={listItem}
                                initial="hidden"
                                animate="visible"
                                className="group"
                              >
                                <td className="py-2.5 pl-2">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className="flex items-center justify-center size-8 rounded-full text-white text-[10px] font-semibold shrink-0"
                                      style={{ backgroundColor: ROLE_COLORS[role] || "#6B5A7A" }}
                                    >
                                      {getInitials(user.name, user.email)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate text-foreground">
                                        {user.name || "No name"}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {user.email}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5">
                                  {role ? (
                                    <RoleBadge role={role} />
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  <StatusBadge status={status} />
                                </td>
                                <td className="py-2.5 pr-1 text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                      >
                                        <MoreHorizontal className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      {!isCityHead && <DropdownMenuItem
                                        onClick={() => navigateTo("admin-users")}
                                        className="text-xs gap-2"
                                      >
                                        <Pencil className="size-3.5" />
                                        Edit Assignment
                                      </DropdownMenuItem>}
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setActionDialog({ type: "reset_pwd", user })
                                        }
                                        className="text-xs gap-2"
                                      >
                                        <KeyRound className="size-3.5" />
                                        Reset Password
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {status === "active" || status === "pending_reset" ? (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setActionDialog({ type: "deactivate", user })
                                          }
                                          className="text-xs gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                        >
                                          <UserX className="size-3.5" />
                                          Deactivate User
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setActionDialog({ type: "activate", user })
                                          }
                                          className="text-xs gap-2 text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 dark:focus:text-emerald-400"
                                        >
                                          <UserCheck className="size-3.5" />
                                          Activate User
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>

                  {/* ─── Mobile Card View ───────────────────────── */}
                  <div className="md:hidden space-y-2">
                    <AnimatePresence>
                      {filteredUsers.map((user, i) => {
                        const status = getUserStatus(user);
                        const role = user.staffMeta?.role || "";
                        return (
                          <motion.div
                            key={user.id}
                            custom={i}
                            variants={listItem}
                            initial="hidden"
                            animate="visible"
                            className="rounded-lg border border-border/60 bg-card p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className="flex items-center justify-center size-9 rounded-full text-white text-[10px] font-semibold shrink-0"
                                  style={{
                                    backgroundColor: ROLE_COLORS[role] || "#6B5A7A",
                                  }}
                                >
                                  {getInitials(user.name, user.email)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate text-foreground">
                                    {user.name || "No name"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  {!isCityHead && <DropdownMenuItem
                                    onClick={() => navigateTo("admin-users")}
                                    className="text-xs gap-2"
                                  >
                                    <Pencil className="size-3.5" />
                                    Edit Assignment
                                  </DropdownMenuItem>}
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setActionDialog({ type: "reset_pwd", user })
                                    }
                                    className="text-xs gap-2"
                                  >
                                    <KeyRound className="size-3.5" />
                                    Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {status === "active" || status === "pending_reset" ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setActionDialog({ type: "deactivate", user })
                                      }
                                      className="text-xs gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                    >
                                      <UserX className="size-3.5" />
                                      Deactivate User
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setActionDialog({ type: "activate", user })
                                      }
                                      className="text-xs gap-2 text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 dark:focus:text-emerald-400"
                                    >
                                      <UserCheck className="size-3.5" />
                                      Activate User
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {role && <RoleBadge role={role} />}
                              <StatusBadge status={status} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ) : recentUsers.length > 0 && searchQuery ? (
                /* ─── No search results ───────────────────────────── */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="rounded-2xl bg-muted/60 p-4 ring-1 ring-border mb-3">
                    <FilterX className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No matches found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No users match &quot;{searchQuery}&quot;
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs mt-3 text-[#4B0A8F] dark:text-[#8A40B0]"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </Button>
                </motion.div>
              ) : (
                /* ─── Empty state ──────────────────────────────────── */
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-2xl bg-muted/60 p-5 ring-1 ring-border mb-3">
                    <Users className="size-8 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    No users created yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Invite your first team member using the form
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Quick Action Confirmation Dialog ────────────────────── */}
      <Dialog
        open={!!actionDialog}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {actionDialog?.type === "deactivate" && (
                <UserX className="size-4 text-red-500" />
              )}
              {actionDialog?.type === "activate" && (
                <UserCheck className="size-4 text-emerald-500" />
              )}
              {actionDialog?.type === "reset_pwd" && (
                <KeyRound className="size-4 text-amber-500" />
              )}
              {actionDialog?.type === "deactivate" && "Deactivate User"}
              {actionDialog?.type === "activate" && "Activate User"}
              {actionDialog?.type === "reset_pwd" && "Reset Password"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {actionDialog?.type === "deactivate" &&
                `Are you sure you want to deactivate ${actionDialog?.user.name || actionDialog?.user.email}? They will lose access to the system.`}
              {actionDialog?.type === "activate" &&
                `Are you sure you want to activate ${actionDialog?.user.name || actionDialog?.user.email}? They will regain access to the system.`}
              {actionDialog?.type === "reset_pwd" &&
                `Trigger a password reset for ${actionDialog?.user.name || actionDialog?.user.email}? They will be prompted to set a new password on next login.`}
            </DialogDescription>
          </DialogHeader>
          {actionDialog?.type === "deactivate" && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  This action can be reversed by activating the user later.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="text-xs">
                Cancel
              </Button>
            </DialogClose>
            {actionDialog?.type === "deactivate" && (
              <Button
                size="sm"
                className="text-xs bg-red-600 hover:bg-red-700 text-white"
                disabled={toggleActiveMutation.isPending}
                onClick={() =>
                  toggleActiveMutation.mutate({
                    userId: actionDialog.user.id,
                    isActive: false,
                  })
                }
              >
                {toggleActiveMutation.isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            )}
            {actionDialog?.type === "activate" && (
              <Button
                size="sm"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={toggleActiveMutation.isPending}
                onClick={() =>
                  toggleActiveMutation.mutate({
                    userId: actionDialog.user.id,
                    isActive: true,
                  })
                }
              >
                {toggleActiveMutation.isPending ? "Activating..." : "Activate"}
              </Button>
            )}
            {actionDialog?.type === "reset_pwd" && (
              <Button
                size="sm"
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                disabled={resetPwdMutation.isPending}
                onClick={() => resetPwdMutation.mutate(actionDialog.user.id)}
              >
                {resetPwdMutation.isPending ? "Triggering..." : "Reset Password"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="users"
        title="Import Users"
        description="Upload a CSV file to bulk create user accounts with staff roles. Passwords will be auto-generated."
        fields={USER_FIELDS}
        exampleRows={EXAMPLE_ROWS.users}
        apiEndpoint="/api/admin/import/users"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
      />
    </div>
  );
}
