"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, type MotionProps } from "framer-motion";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  Mail,
  Phone,
  UserCog,
  Shield,
  Search,
  MoreHorizontal,
  Pencil,
  KeyRound,
  CheckCircle2,
  XCircle,
  FolderInput,
  X,
  MapPin,
  Building2,
} from "lucide-react";
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

const CITY_ROLES = ["city_head", "park_admin", "park_lead", "murabbi", "guardian"];
const PARK_ROLES = ["park_admin", "park_lead", "murabbi", "student"];
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

const fadeUp: MotionProps = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export function MobileAccessProvisioningPage() {
  const queryClient = useQueryClient();
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
  const [searchQuery, setSearchQuery] = useState("");

  const [actionDialog, setActionDialog] = useState<{
    type: "deactivate" | "activate" | "reset_pwd";
    user: UserWithMeta;
  } | null>(null);
  
  const cityScopeId = isCityHead ? currentUser?.assignedCityId || "" : formCityId;

  // Fetch data
  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["admin-cities-dropdown"],
    queryFn: () => fetch("/api/admin/cities").then((r) => r.json()),
    staleTime: 60000,
    enabled: !isCityHead,
  });

  const { data: parks } = useQuery<ParkOption[]>({
    queryKey: ["admin-parks-dropdown", cityScopeId],
    queryFn: () =>
      fetch(`/api/admin/parks${cityScopeId ? `?cityId=${cityScopeId}` : ""}`).then((r) => r.json()),
    staleTime: 30000,
    enabled: !!cityScopeId,
  });

  const { data: batches } = useQuery<
    { id: string; name: string; parkId: string }[]
  >({
    queryKey: ["admin-batches-dropdown", formParkId],
    queryFn: () => fetch(`/api/admin/batches?parkId=${formParkId}`).then((r) => r.json()),
    staleTime: 30000,
    enabled: !!formParkId,
  });

  const batchIds = useMemo(() => batches?.map((b) => b.id) || [], [batches]);

  const { data: groups } = useQuery<GroupOption[]>({
    queryKey: ["admin-groups-dropdown", batchIds.join(",")],
    queryFn: () => {
      const batchId = batchIds[0];
      if (!batchId) return Promise.resolve([]);
      return fetch(`/api/admin/groups?batchId=${batchId}`).then((r) => r.json());
    },
    staleTime: 30000,
    enabled: batchIds.length > 0,
  });

  const { data: _recentData, isLoading: recentLoading } = useQuery<{ data: UserWithMeta[] }>({
    queryKey: ["admin-recent-invites"],
    queryFn: () => fetch("/api/admin/users?pageSize=20").then((r) => r.json()),
    staleTime: 15000,
  });
  const recentUsers = _recentData?.data || [];

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return recentUsers;
    const q = searchQuery.toLowerCase().trim();
    return recentUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q)
    );
  }, [recentUsers, searchQuery]);

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: (data: any) =>
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
        variables.isActive ? "User activated" : "User deactivated"
      );
      setActionDialog(null);
    },
    onError: () => toast.error("Failed to update user status"),
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
      toast.success("Password reset triggered.");
      setActionDialog(null);
    },
    onError: () => toast.error("Failed to trigger password reset"),
  });

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

    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Name is required";
    if (!formEmail.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) errors.email = "Invalid email format";
    if (!formRole) errors.role = "Role is required";

    if (CITY_ROLES.includes(formRole) && !cityScopeId) errors.assignedCityId = "City is required for this role";
    if (PARK_ROLES.includes(formRole) && !formParkId) errors.assignedParkId = "Park is required for this role";
    if (GROUP_ROLES.includes(formRole) && !formGroupId) errors.assignedGroupId = "Group is required for this role";

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
    <div className="flex flex-col min-h-screen pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 border-b border-border/50 px-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">Access Provisioning</h1>
            <p className="text-xs text-muted-foreground truncate">
              {isCityHead ? "Manage staff in your city" : "Create new user accounts"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 px-4 pt-4">
        {/* Create User Form */}
        <div className="space-y-4">
          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCog className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name" className="text-xs font-semibold">Full Name *</Label>
                <div className="relative">
                  <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="invite-name" placeholder="Ahmed Khan" value={formName} onChange={(e) => setFormName(e.target.value)} className="pl-9 h-12 rounded-xl text-sm" disabled={isSubmitting} />
                </div>
                {formErrors.name && <p className="text-xs text-red-500 font-medium">{formErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-xs font-semibold">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="invite-email" type="email" placeholder="ahmed@example.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="pl-9 h-12 rounded-xl text-sm" disabled={isSubmitting} />
                </div>
                {formErrors.email && <p className="text-xs text-red-500 font-medium">{formErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-phone" className="text-xs font-semibold">Phone <span className="font-normal text-muted-foreground">(Opt)</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input id="invite-phone" type="tel" placeholder="+92 300 1234567" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="pl-9 h-12 rounded-xl text-sm" disabled={isSubmitting} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="size-4 text-[#A0006B] dark:text-[#C94D99]" />
                Role & Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Role *</Label>
                <Select value={formRole} onValueChange={handleRoleChange} disabled={isSubmitting}>
                  <SelectTrigger className="h-12 rounded-xl text-sm"><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.role && <p className="text-xs text-red-500 font-medium">{formErrors.role}</p>}
              </div>

              {formRole && CITY_ROLES.includes(formRole) && !isCityHead && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">City *</Label>
                  <Select value={formCityId} onValueChange={handleCityChange} disabled={isSubmitting}>
                    <SelectTrigger className="h-12 rounded-xl text-sm"><SelectValue placeholder={cities ? "Select city" : "Loading..."} /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {cities?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {formErrors.assignedCityId && <p className="text-xs text-red-500 font-medium">{formErrors.assignedCityId}</p>}
                </div>
              )}

              {formRole && PARK_ROLES.includes(formRole) && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Park *</Label>
                  <Select value={formParkId} onValueChange={handleParkChange} disabled={isSubmitting || !cityScopeId}>
                    <SelectTrigger className="h-12 rounded-xl text-sm"><SelectValue placeholder={!cityScopeId ? "Select city first" : parks ? "Select park" : "Loading..."} /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {parks?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {formErrors.assignedParkId && <p className="text-xs text-red-500 font-medium">{formErrors.assignedParkId}</p>}
                </div>
              )}

              {formRole && GROUP_ROLES.includes(formRole) && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Group *</Label>
                  <Select value={formGroupId} onValueChange={setFormGroupId} disabled={isSubmitting || !formParkId}>
                    <SelectTrigger className="h-12 rounded-xl text-sm"><SelectValue placeholder={!formParkId ? "Select park first" : groups ? "Select group" : "Loading..."} /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {groups?.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {formErrors.assignedGroupId && <p className="text-xs text-red-500 font-medium">{formErrors.assignedGroupId}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] text-white font-medium shadow-md"
          >
            {isSubmitting ? "Inviting User..." : "Invite User"}
            {!isSubmitting && <UserPlus className="ml-2 size-4" />}
          </Button>
        </div>

        {/* Recent Invites */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-[#4B0A8F] dark:text-purple-300">Recent Invites</h3>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search recent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-11 rounded-xl bg-card"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-11 w-11 flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {recentLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center bg-card rounded-2xl border border-dashed">
                <Users className="size-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                <p className="text-sm text-muted-foreground">No recent users found.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredUsers.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-full bg-[#F3ECF6] flex items-center justify-center text-[#4B0A8F] font-bold text-sm shrink-0">
                          {getInitials(user.name, user.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{user.name || "Pending Name"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 rounded-xl shrink-0 -mr-2">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem onClick={() => setActionDialog({ type: "reset_pwd", user })} className="h-12 cursor-pointer">
                            <KeyRound className="size-4 mr-3" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.isActive ? (
                            <DropdownMenuItem onClick={() => setActionDialog({ type: "deactivate", user })} className="h-12 cursor-pointer text-red-600 focus:text-red-600">
                              <XCircle className="size-4 mr-3" /> Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setActionDialog({ type: "activate", user })} className="h-12 cursor-pointer">
                              <CheckCircle2 className="size-4 mr-3" /> Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex gap-2 items-center text-[10px]">
                      {user.staffMeta ? (
                        <Badge variant="outline" className="h-5 px-1.5 font-medium" style={{ backgroundColor: (ROLE_COLORS[user.staffMeta.role] || "#ccc") + "15", color: ROLE_COLORS[user.staffMeta.role] || "#333", borderColor: (ROLE_COLORS[user.staffMeta.role] || "#ccc") + "50" }}>
                          {ALL_ROLES.find(r => r.value === user.staffMeta?.role)?.label || user.staffMeta.role}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-5 px-1.5 font-medium bg-muted/50">No Role</Badge>
                      )}
                      
                      <Badge variant="outline" className={cn("h-5 px-1.5 font-medium border-0", user.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {(user.staffMeta?.assignedCity || user.staffMeta?.assignedPark || user.staffMeta?.assignedGroup) && (
                      <div className="bg-muted/40 rounded-xl p-2.5 space-y-1 text-[11px] text-muted-foreground border border-border/50">
                        {user.staffMeta.assignedCity && (
                          <div className="flex items-center gap-1.5"><MapPin className="size-3" /><span className="truncate">{user.staffMeta.assignedCity.name}</span></div>
                        )}
                        {user.staffMeta.assignedPark && (
                          <div className="flex items-center gap-1.5"><Building2 className="size-3" /><span className="truncate">{user.staffMeta.assignedPark.name}</span></div>
                        )}
                        {user.staffMeta.assignedGroup && (
                          <div className="flex items-center gap-1.5"><Users className="size-3" /><span className="truncate">{user.staffMeta.assignedGroup.name}</span></div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Action Dialogs */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-md mx-4 w-[calc(100%-2rem)]">
          {actionDialog && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {actionDialog.type === "deactivate" ? "Deactivate User" : actionDialog.type === "activate" ? "Activate User" : "Reset Password"}
                </DialogTitle>
                <DialogDescription>
                  {actionDialog.type === "reset_pwd" ? (
                     <>Force a password reset for <span className="font-semibold">{actionDialog.user.name || actionDialog.user.email}</span>?</>
                  ) : (
                    <>Are you sure you want to {actionDialog.type} <span className="font-semibold">{actionDialog.user.name || actionDialog.user.email}</span>?</>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row gap-2 pt-2 mt-2">
                <Button variant="outline" onClick={() => setActionDialog(null)} className="h-12 rounded-xl flex-1">Cancel</Button>
                <Button
                  className={cn("h-12 rounded-xl flex-1 text-white", actionDialog.type === "deactivate" ? "bg-red-600 hover:bg-red-700" : "bg-[#4B0A8F] hover:bg-[#4B0A8FE6]")}
                  onClick={() => {
                    if (actionDialog.type === "reset_pwd") {
                      resetPwdMutation.mutate(actionDialog.user.id);
                    } else {
                      toggleActiveMutation.mutate({ userId: actionDialog.user.id, isActive: actionDialog.type === "activate" });
                    }
                  }}
                  disabled={toggleActiveMutation.isPending || resetPwdMutation.isPending}
                >
                  {toggleActiveMutation.isPending || resetPwdMutation.isPending ? "Processing..." : "Confirm"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
