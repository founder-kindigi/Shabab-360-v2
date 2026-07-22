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

export function AccessManagementPage() {
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
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-4 text-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>
            Super Admin controls approved module, feature, and action permissions.
            Every change is audited and invalidates affected sessions. Permissions
            never expand a user&apos;s city, park, or group scope.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-4" />Role Permission Matrix</CardTitle>
          <CardDescription>Choose a role, document the operational reason, then allow, deny, or reset one approved capability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-sm">
            <Label htmlFor="access-role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="access-role" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{roles.map((item) => <SelectItem key={item} value={item}>{roleLabel(item)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="access-reason">Reason for this role change</Label>
            <Input id="access-reason" className="mt-1" value={reason} maxLength={300} placeholder="Document the operational need" onChange={(event) => setReason(event.target.value)} />
          </div>
          {policy.isLoading ? <p className="text-sm text-muted-foreground">Loading permission matrix...</p> : policy.isError ? <p className="text-sm text-destructive">Unable to load the permission matrix.</p> : (
            <div className="space-y-5">
              {capabilityGroups.map((group) => (
                <section key={group.module} className="overflow-hidden rounded-xl border">
                  <div className="border-b bg-muted/40 px-4 py-3"><h3 className="text-sm font-semibold">{group.module}</h3></div>
                  <div className="divide-y">
                    {group.capabilities.map(([capability, label]) => {
                      const isProtected = capability.startsWith("access.") || capability === "audit.view" || capability === "settings.manage";
                      const override = overrides.get(capability);
                      const defaultAllowed = defaults.includes(capability);
                      const allowed = override ? override === "allow" : defaultAllowed;
                      return <div key={capability} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div><p className="text-sm font-medium">{label}</p><p className="font-mono text-xs text-muted-foreground">{capability}</p></div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={allowed ? "default" : "secondary"}>{allowed ? "Allowed" : "Denied"}</Badge>
                          {override && <Badge variant="outline">Role override</Badge>}
                          {isProtected ? <Badge variant="outline" className="gap-1"><LockKeyhole className="size-3" />Protected</Badge> : <>
                            <Button size="sm" variant="outline" disabled={!canChangeRole} onClick={() => roleChange.mutate({ capability, effect: "allow" })}><Check className="mr-1 size-3.5" />Allow</Button>
                            <Button size="sm" variant="outline" disabled={!canChangeRole} onClick={() => roleChange.mutate({ capability, effect: "deny" })}><X className="mr-1 size-3.5" />Deny</Button>
                            {override && <Button size="sm" variant="ghost" disabled={roleReset.isPending} onClick={() => roleReset.mutate(capability)}><RotateCcw className="mr-1 size-3.5" />Reset</Button>}
                          </>}
                        </div>
                      </div>;
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Named-User Override</CardTitle>
          <CardDescription>Use a temporary, documented exception only. It cannot change hierarchy scope or protected administration powers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div><Label>User</Label><Select value={userId} onValueChange={setUserId}><SelectTrigger className="mt-1"><SelectValue placeholder="Select an active account" /></SelectTrigger><SelectContent>{(users.data?.data ?? []).filter((item: { isActive: boolean }) => item.isActive).map((item: { id: string; name: string | null; email: string }) => <SelectItem key={item.id} value={item.id}>{item.name || item.email}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Capability</Label><Select value={userCapability} onValueChange={(value) => setUserCapability(value as typeof userCapability)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{userCapabilities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Effect</Label><Select value={userEffect} onValueChange={(value) => setUserEffect(value as Effect)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="allow">Allow</SelectItem><SelectItem value="deny">Deny</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="access-expiry">Expiry (optional)</Label><Input id="access-expiry" className="mt-1" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></div>
            <div><Label htmlFor="user-access-reason">Reason</Label><Input id="user-access-reason" className="mt-1" value={userReason} maxLength={300} placeholder="Document the operational need" onChange={(event) => setUserReason(event.target.value)} /></div>
            <Button disabled={!userId || userReason.trim().length < 3 || userChange.isPending} onClick={() => userChange.mutate()}>{userChange.isPending ? "Saving..." : "Save user override"}</Button>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-medium">Effective named-user exceptions</p>
            {!userId ? <p className="mt-2 text-sm text-muted-foreground">Select a user to review active overrides.</p> : userAccess.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Loading user access...</p> : userAccess.isError ? <p className="mt-2 text-sm text-destructive">Unable to load user access.</p> : <div className="mt-3 space-y-2">{(userAccess.data.userOverrides ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No active named-user overrides.</p> : userAccess.data.userOverrides.map((item: { id: string; capability: string; effect: Effect; expiresAt: string | null }) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3 text-sm"><span><span className="block font-mono text-xs">{item.capability}</span>{item.expiresAt && <span className="text-xs text-muted-foreground">Expires {new Date(item.expiresAt).toLocaleString()}</span>}</span><span className="flex items-center gap-2"><Badge variant={item.effect === "allow" ? "default" : "secondary"}>{item.effect}</Badge><Button size="sm" variant="ghost" disabled={userReset.isPending} onClick={() => userReset.mutate(item.capability)}>Revoke</Button></span></div>)}</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
