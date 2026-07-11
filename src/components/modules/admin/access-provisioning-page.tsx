"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
import { toast } from "sonner";
import { UserPlus, ArrowRight, Users, Mail, Phone, UserCog, Shield } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
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

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

// ─── Component ───────────────────────────────────────────────────

export function AccessProvisioningPage() {
  const queryClient = useQueryClient();
  const { navigateTo } = useAppStore();

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<UserRole | "">("");
  const [formCityId, setFormCityId] = useState("");
  const [formParkId, setFormParkId] = useState("");
  const [formGroupId, setFormGroupId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ─── Data fetching ─────────────────────────────────────────────

  // Fetch cities
  const { data: cities } = useQuery<CityOption[]>({
    queryKey: ["admin-cities-dropdown"],
    queryFn: () =>
      fetch("/api/admin/cities")
        .then((r) => r.json())
        .then((data) => data.map((c: any) => ({ id: c.id, name: c.name }))),
    staleTime: 60000,
  });

  // Fetch parks filtered by city
  const { data: parks } = useQuery<ParkOption[]>({
    queryKey: ["admin-parks-dropdown", formCityId],
    queryFn: () =>
      fetch(`/api/admin/parks${formCityId ? `?cityId=${formCityId}` : ""}`)
        .then((r) => r.json())
        .then((data) =>
          data.map((p: any) => ({ id: p.id, name: p.name, cityId: p.cityId }))
        ),
    staleTime: 30000,
    enabled: !!formCityId,
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

  // Fetch recent invites (last 10 users)
  const { data: recentUsers, isLoading: recentLoading } = useQuery<UserWithMeta[]>({
    queryKey: ["admin-recent-invites"],
    queryFn: () =>
      fetch("/api/admin/users?limit=10").then((r) => r.json()),
    staleTime: 15000,
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recent-invites"] });
      toast.success("User invited successfully. Default password: Shabab@2024");
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

    if (CITY_ROLES.includes(formRole) && !formCityId) {
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
      assignedCityId: formCityId || undefined,
      assignedParkId: formParkId || undefined,
      assignedGroupId: formGroupId || undefined,
    });
  }

  const isSubmitting = inviteMutation.isPending;
  const selectedRoleConfig = ALL_ROLES.find((r) => r.value === formRole);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Provisioning"
        description="Create new user accounts and assign roles and permissions"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── Left Panel: Create User Form (3 cols) ─── */}
        <motion.div {...fadeUp} className="lg:col-span-3 space-y-6">
          {/* Personal Info */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="size-4 text-[#4B0A8F]" />
                Personal Information
              </CardTitle>
              <CardDescription className="text-xs">
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
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="size-4 text-[#A0006B]" />
                Role & Assignment
              </CardTitle>
              <CardDescription className="text-xs">
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
                    {ALL_ROLES.map((r) => (
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

              {/* City select — shown for city_head, park_admin, park_lead, murabbi, guardian */}
              {formRole && CITY_ROLES.includes(formRole) && (
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

              {/* Park select — shown for park_admin, park_lead, murabbi, student */}
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
                  <Select value={formParkId} onValueChange={handleParkChange} disabled={isSubmitting || !formCityId}>
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue
                        placeholder={
                          !formCityId
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
          <Card className="border-border/60 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Recent Invites</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Last 10 created users
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-[#4B0A8F] hover:text-[#6B20A0] hover:bg-[#F3ECF6] dark:text-[#8A40B0] dark:hover:bg-[#1F086080]"
                  onClick={() => navigateTo("admin-users")}
                >
                  View All
                  <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
              ) : recentUsers && recentUsers.length > 0 ? (
                <div className="space-y-1 max-h-[480px] overflow-y-auto custom-scrollbar">
                  {recentUsers.map((user) => {
                    const roleColor = ROLE_COLORS[user.staffMeta?.role || ""] || "#6B5A7A";
                    const roleLabel = user.staffMeta?.role
                      ? user.staffMeta.role
                          .split("_")
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(" ")
                      : "Unknown";
                    return (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        {/* Avatar initials */}
                        <div
                          className="flex items-center justify-center size-9 rounded-full text-white text-xs font-semibold shrink-0"
                          style={{ backgroundColor: roleColor }}
                        >
                          {getInitials(user.name, user.email)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.name || "No name"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>

                        {/* Role badge + date */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 leading-tight font-medium"
                            style={{
                              borderColor: roleColor,
                              color: roleColor,
                              backgroundColor: roleColor + "15",
                            }}
                          >
                            {roleLabel}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No users created yet</p>
                  <p className="text-xs mt-0.5">Invite your first team member</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}