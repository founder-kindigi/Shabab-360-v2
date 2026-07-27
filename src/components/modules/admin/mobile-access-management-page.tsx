"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, KeyRound, LockKeyhole, RotateCcw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AccessCapability } from "@/lib/auth/capabilities";

const roles = ["program_admin", "city_head", "park_lead", "park_admin", "murabbi", "guardian", "student"] as const;
const userCapabilities = [
  "dashboard.view",
  "organisation.view",
  "organisation.manage",
  "people.view",
  "students.manage",
  "guardians.manage",
  "admissions.manage",
  "attendance.mark",
  "attendance.correct",
  "fees.manage",
  "announcements.manage",
  "reports.view",
] as const;

const capabilityGroups: readonly {
  module: string;
  capabilities: readonly (readonly [AccessCapability, string])[];
}[] = [
  {
    module: "Workspace",
    capabilities: [
      ["dashboard.view", "View dashboards"],
      ["organisation.view", "View organization records"],
      ["organisation.manage", "Manage parks, batches, and groups"],
    ],
  },
  {
    module: "People and Admissions",
    capabilities: [
      ["people.view", "View people directory"],
      ["students.manage", "Manage Shabab records"],
      ["guardians.manage", "Manage guardian records"],
      ["admissions.manage", "Manage admissions"],
    ],
  },
  {
    module: "Operations",
    capabilities: [
      ["attendance.mark", "Mark attendance"],
      ["attendance.correct", "Correct attendance"],
      ["fees.manage", "Manage fees and payments"],
      ["announcements.manage", "Manage announcements"],
      ["reports.view", "View reports"],
    ],
  },
  {
    module: "Protected Administration",
    capabilities: [
      ["audit.view", "View audit records"],
      ["settings.manage", "Manage system settings"],
      ["access.city_staff.manage", "Manage city staff assignments"],
      ["access.role_defaults.manage", "Manage role permissions"],
      ["access.user_overrides.manage", "Manage individual overrides"],
      ["access.scope.manage", "Manage hierarchy scope"],
    ],
  },
] as const;

type Role = (typeof roles)[number];
type Capability = AccessCapability;
type Effect = "allow" | "deny";

function roleLabel(role: string) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Access update failed");
  }
  return data;
}

export function MobileAccessManagementPage() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role>("park_admin");
  const [reason, setReason] = useState("");
  const [userId, setUserId] = useState("");
  const [userCapability, setUserCapability] = useState<(typeof userCapabilities)[number]>("attendance.mark");
  const [userEffect, setUserEffect] = useState<Effect>("allow");
  const [userReason, setUserReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const policy = useQuery({
    queryKey: ["access-role-overrides"],
    queryFn: () => request("/api/admin/access/role-overrides"),
  });
  const users = useQuery({
    queryKey: ["access-management-users"],
    queryFn: () => request("/api/admin/users?pageSize=100"),
  });
  const userAccess = useQuery({
    queryKey: ["access-user-overrides", userId],
    queryFn: () => request(`/api/admin/access/users/${userId}/overrides`),
    enabled: Boolean(userId),
  });

  const roleChange = useMutation({
    mutationFn: ({ capability, effect }: { capability: Capability; effect: Effect }) =>
      request("/api/admin/access/role-overrides", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, capability, effect, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-role-overrides"] });
      setReason("");
      toast.success("Role permission updated. Affected users must sign in again.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const roleReset = useMutation({
    mutationFn: (capability: Capability) =>
      request("/api/admin/access/role-overrides", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, capability, reason: "Role permission restored to the approved default" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-role-overrides"] });
      toast.success("Role permission restored to its approved default.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const userChange = useMutation({
    mutationFn: () => request(`/api/admin/access/users/${userId}/overrides`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        capability: userCapability,
        effect: userEffect,
        reason: userReason,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-user-overrides", userId] });
      setUserReason("");
      setExpiresAt("");
      toast.success("Individual override updated. The user must sign in again.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const userReset = useMutation({
    mutationFn: (capability: string) => request(`/api/admin/access/users/${userId}/overrides`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ capability, reason: "Individual override is no longer required" }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-user-overrides", userId] });
      toast.success("Individual override revoked.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const defaults = policy.data?.defaults?.[role] ?? [];
  const overrides = new Map<string, Effect>(
    (policy.data?.overrides ?? [])
      .filter((item: { role: string }) => item.role === role)
      .map((item: { capability: string; effect: Effect }) => [item.capability, item.effect] as [string, Effect])
  );
  const canChangeRole = reason.trim().length >= 3 && !roleChange.isPending;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 border-b border-border/50 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">Access Mgmt</h1>
            <p className="text-xs text-muted-foreground truncate">
              Manage system permissions
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-4 pt-4">
        <Card className="border-primary/20 bg-primary/5 rounded-2xl shadow-sm">
          <CardContent className="flex gap-3 p-4 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-primary/90">
              Super Admin controls approved permissions. Changes invalidate affected sessions.
            </p>
          </CardContent>
        </Card>

        {/* Role Matrix */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" /> Role Matrix
            </CardTitle>
            <CardDescription className="text-xs">
              Select a role and document changes below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access-role" className="text-xs font-semibold">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="access-role" className="h-12 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {roles.map((item) => (
                    <SelectItem key={item} value={item}>{roleLabel(item)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="access-reason" className="text-xs font-semibold">Reason for change</Label>
              <Input
                id="access-reason"
                className="h-12 rounded-xl text-sm"
                value={reason}
                maxLength={300}
                placeholder="Required operational need"
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            
            {policy.isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading matrix...</p>
            ) : policy.isError ? (
              <p className="text-sm text-red-500 text-center py-4">Error loading matrix</p>
            ) : (
              <div className="space-y-4 pt-2">
                {capabilityGroups.map((group) => (
                  <section key={group.module} className="overflow-hidden rounded-xl border border-border/50">
                    <div className="border-b bg-muted/40 px-3 py-2">
                      <h3 className="text-xs font-semibold text-[#4B0A8F] dark:text-[#8A40B0]">{group.module}</h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {group.capabilities.map(([capability, label]) => {
                        const isProtected = capability.startsWith("access.");
                        const override = overrides.get(capability);
                        const defaultAllowed = defaults.includes(capability);
                        const allowed = override ? override === "allow" : defaultAllowed;
                        
                        return (
                          <div key={capability} className="flex flex-col gap-2 p-3 text-sm">
                            <div className="flex justify-between items-start gap-2">
                              <p className="font-medium text-xs leading-tight">{label}</p>
                              <Badge variant={allowed ? "default" : "secondary"} className="shrink-0 h-5 text-[10px] px-1.5 font-semibold">
                                {allowed ? "Allowed" : "Denied"}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1.5 justify-between">
                              <p className="font-mono text-[10px] text-muted-foreground truncate w-full">
                                {capability}
                              </p>
                              
                              <div className="flex items-center gap-1.5 w-full justify-end mt-1">
                                {override && (
                                  <Badge variant="outline" className="text-[9px] h-6 px-1.5">Override</Badge>
                                )}
                                {isProtected ? (
                                  <Badge variant="outline" className="gap-1 h-6 text-[10px] px-2 bg-muted/50 border-muted">
                                    <LockKeyhole className="size-3" /> Protected
                                  </Badge>
                                ) : (
                                  <div className="flex gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!canChangeRole}
                                      onClick={() => roleChange.mutate({ capability, effect: "allow" })}
                                      className="h-7 px-2 rounded-lg text-[11px]"
                                    >
                                      <Check className="mr-1 size-3" /> Allow
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!canChangeRole}
                                      onClick={() => roleChange.mutate({ capability, effect: "deny" })}
                                      className="h-7 px-2 rounded-lg text-[11px]"
                                    >
                                      <X className="mr-1 size-3" /> Deny
                                    </Button>
                                    {override && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={roleReset.isPending}
                                        onClick={() => roleReset.mutate(capability)}
                                        className="h-7 px-2 rounded-lg text-[11px]"
                                      >
                                        <RotateCcw className="mr-1 size-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Named-User Override */}
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="size-4" /> Named-User Override
            </CardTitle>
            <CardDescription className="text-xs">
              Temporary exception for an individual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 border border-border/50 p-4 rounded-xl">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">User</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="h-11 rounded-xl text-sm">
                    <SelectValue placeholder="Select active user" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {(users.data?.data ?? []).filter((item: { isActive: boolean }) => item.isActive).map((item: { id: string; name: string | null; email: string }) => (
                      <SelectItem key={item.id} value={item.id}>{item.name || item.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Capability</Label>
                <Select value={userCapability} onValueChange={(value) => setUserCapability(value as typeof userCapability)}>
                  <SelectTrigger className="h-11 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {userCapabilities.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Effect</Label>
                  <Select value={userEffect} onValueChange={(value) => setUserEffect(value as Effect)}>
                    <SelectTrigger className="h-11 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="allow">Allow</SelectItem>
                      <SelectItem value="deny">Deny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="access-expiry" className="text-xs font-semibold">Expiry <span className="font-normal text-muted-foreground">(Opt)</span></Label>
                  <Input id="access-expiry" className="h-11 rounded-xl text-sm px-2" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-access-reason" className="text-xs font-semibold">Reason</Label>
                <Input id="user-access-reason" className="h-11 rounded-xl text-sm" value={userReason} maxLength={300} placeholder="Operational need" onChange={(event) => setUserReason(event.target.value)} />
              </div>

              <Button
                disabled={!userId || userReason.trim().length < 3 || userChange.isPending}
                onClick={() => userChange.mutate()}
                className="w-full h-11 rounded-xl mt-2 bg-[#4B0A8F] text-white"
              >
                {userChange.isPending ? "Saving..." : "Save Override"}
              </Button>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <p className="text-sm font-semibold text-[#4B0A8F] dark:text-[#8A40B0] border-b pb-2 mb-2">Effective Exceptions</p>
              {!userId ? (
                <p className="text-xs text-muted-foreground text-center py-2">Select a user to review overrides.</p>
              ) : userAccess.isLoading ? (
                <p className="text-xs text-muted-foreground text-center py-2">Loading...</p>
              ) : userAccess.isError ? (
                <p className="text-xs text-red-500 text-center py-2">Error loading access.</p>
              ) : (
                <div className="space-y-2">
                  {(userAccess.data.userOverrides ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No active overrides.</p>
                  ) : (
                    userAccess.data.userOverrides.map((item: { id: string; capability: string; effect: Effect; expiresAt: string | null }) => (
                      <div key={item.id} className="flex flex-col gap-2 rounded-lg border bg-background p-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-semibold">{item.capability}</span>
                          <Badge variant={item.effect === "allow" ? "default" : "secondary"} className="h-5 text-[9px] px-1.5">{item.effect}</Badge>
                        </div>
                        <div className="flex items-center justify-between border-t pt-2 mt-1">
                           <span className="text-[10px] text-muted-foreground">
                             {item.expiresAt ? `Expires ${new Date(item.expiresAt).toLocaleDateString()}` : "No expiry"}
                           </span>
                           <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500 hover:text-red-600 px-2" disabled={userReset.isPending} onClick={() => userReset.mutate(item.capability)}>Revoke</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
