"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const roles = ["program_admin", "city_head", "park_lead", "park_admin", "murabbi", "guardian", "student"] as const;
const capabilities = ["dashboard.view", "organisation.manage", "people.view", "students.manage", "guardians.manage", "admissions.manage", "attendance.mark", "attendance.correct", "fees.manage", "announcements.manage", "reports.view", "audit.view", "settings.manage"] as const;

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Access update failed");
  return data;
}

export function AccessManagementPage() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<(typeof roles)[number]>("park_admin");
  const [capability, setCapability] = useState<(typeof capabilities)[number]>("attendance.mark");
  const [effect, setEffect] = useState<"allow" | "deny">("allow");
  const [reason, setReason] = useState("");
  const [userId, setUserId] = useState("");
  const [userCapability, setUserCapability] = useState<(typeof capabilities)[number]>("attendance.mark");
  const [userEffect, setUserEffect] = useState<"allow" | "deny">("allow");
  const [userReason, setUserReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const policy = useQuery({ queryKey: ["access-role-overrides"], queryFn: () => request("/api/admin/access/role-overrides") });
  const save = useMutation({
    mutationFn: () => request("/api/admin/access/role-overrides", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ role, capability, effect, reason }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["access-role-overrides"] }); setReason(""); toast.success("Role access updated. Affected sessions were refreshed."); },
    onError: (error: Error) => toast.error(error.message),
  });
  const revert = useMutation({
    mutationFn: (override: { role: string; capability: string }) => request("/api/admin/access/role-overrides", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...override, reason: "Role exception no longer required" }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-role-overrides"] });
      toast.success("Role access reverted to its default. Affected sessions were refreshed.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const overrides = policy.data?.overrides ?? [];
  const users = useQuery({ queryKey: ["access-management-users"], queryFn: () => request("/api/admin/users?pageSize=100") });
  const userAccess = useQuery({ queryKey: ["access-user-overrides", userId], queryFn: () => request(`/api/admin/access/users/${userId}/overrides`), enabled: Boolean(userId) });
  const saveUser = useMutation({
    mutationFn: () => request(`/api/admin/access/users/${userId}/overrides`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ capability: userCapability, effect: userEffect, reason: userReason, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["access-user-overrides", userId] }); setUserReason(""); setExpiresAt(""); toast.success("User override updated. The user must sign in again."); },
    onError: (error: Error) => toast.error(error.message),
  });
  const revokeUser = useMutation({
    mutationFn: (capability: string) => request(`/api/admin/access/users/${userId}/overrides`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ capability, reason: "Override no longer required" }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["access-user-overrides", userId] }); toast.success("User override revoked."); },
    onError: (error: Error) => toast.error(error.message),
  });

  return <div className="space-y-6">
    <p className="text-sm text-muted-foreground">Super Admin controls. Module access never expands a user&apos;s organization scope.</p>
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"><CardContent className="flex gap-3 p-4 text-sm"><ShieldCheck className="mt-0.5 size-5 text-amber-700" /><p>Every change is audited and invalidates affected sessions. City, park, group, finance, and safeguarding checks remain on the server.</p></CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-4" />Role exception</CardTitle><CardDescription>Set one approved capability for a role. Access-administration capabilities are protected.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div><Label>Role</Label><Select value={role} onValueChange={(value) => setRole(value as typeof role)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{roles.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Capability</Label><Select value={capability} onValueChange={(value) => setCapability(value as typeof capability)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{capabilities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Effect</Label><Select value={effect} onValueChange={(value) => setEffect(value as "allow" | "deny")}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="allow">Allow</SelectItem><SelectItem value="deny">Deny</SelectItem></SelectContent></Select></div>
        <div><Label htmlFor="access-reason">Reason</Label><Input id="access-reason" className="mt-1" value={reason} maxLength={300} placeholder="Document the operational need" onChange={(event) => setReason(event.target.value)} /></div>
        <Button className="w-full" disabled={reason.trim().length < 3 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving..." : "Save role exception"}</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Current role exceptions</CardTitle><CardDescription>Individual user denials still take priority over these role settings.</CardDescription></CardHeader><CardContent>{policy.isLoading ? <p className="text-sm text-muted-foreground">Loading access policy...</p> : policy.isError ? <p className="text-sm text-destructive">Unable to load access policy.</p> : overrides.length === 0 ? <p className="text-sm text-muted-foreground">No role exceptions are active. Defaults are in effect.</p> : <div className="space-y-2">{overrides.map((item: any) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border p-3"><div><p className="text-sm font-medium">{item.role.replaceAll("_", " ")}</p><p className="font-mono text-xs text-muted-foreground">{item.capability}</p></div><div className="flex items-center gap-2"><Badge variant={item.effect === "allow" ? "default" : "destructive"}>{item.effect}</Badge><Button size="sm" variant="outline" aria-label={`Revert ${item.role} ${item.capability}`} disabled={revert.isPending} onClick={() => revert.mutate({ role: item.role, capability: item.capability })}>Revert</Button></div></div>)}</div>}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Named-user override</CardTitle><CardDescription>Use only for a documented temporary operational need. Overrides never change city, park, or group scope.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4"><div><Label>User</Label><Select value={userId} onValueChange={setUserId}><SelectTrigger className="mt-1"><SelectValue placeholder="Select an active account" /></SelectTrigger><SelectContent>{(users.data?.data ?? []).filter((item: any) => item.isActive).map((item: any) => <SelectItem key={item.id} value={item.id}>{item.name || item.email}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Capability</Label><Select value={userCapability} onValueChange={(value) => setUserCapability(value as typeof userCapability)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{capabilities.filter((item) => !["audit.view", "settings.manage"].includes(item)).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Effect</Label><Select value={userEffect} onValueChange={(value) => setUserEffect(value as "allow" | "deny")}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="allow">Allow</SelectItem><SelectItem value="deny">Deny</SelectItem></SelectContent></Select></div>
      <div><Label htmlFor="access-expiry">Expiry (optional)</Label><Input id="access-expiry" className="mt-1" type="datetime-local" value={expiresAt} onInput={(event) => setExpiresAt(event.currentTarget.value)} /></div>
      <div><Label htmlFor="user-access-reason">Reason</Label><Input id="user-access-reason" className="mt-1" value={userReason} maxLength={300} placeholder="Document the operational need" onChange={(event) => setUserReason(event.target.value)} /></div>
      <Button disabled={!userId || userReason.trim().length < 3 || saveUser.isPending} onClick={() => saveUser.mutate()}>{saveUser.isPending ? "Saving..." : "Save user override"}</Button></div>
      <div className="rounded-lg border bg-muted/20 p-4"><p className="text-sm font-medium">Effective access</p>{!userId ? <p className="mt-2 text-sm text-muted-foreground">Select a user to review their role defaults and overrides.</p> : userAccess.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Loading access...</p> : userAccess.isError ? <p className="mt-2 text-sm text-destructive">Unable to load user access.</p> : <div className="mt-3 space-y-2"><Badge variant="outline">{userAccess.data.role?.replaceAll("_", " ")}</Badge>{(userAccess.data.userOverrides ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No active named-user overrides.</p> : userAccess.data.userOverrides.map((item: any) => <div key={item.id} className="flex items-center justify-between gap-2 text-sm"><span><span className="block font-mono text-xs">{item.capability}</span>{item.expiresAt && <span className="text-xs text-muted-foreground">Expires {new Date(item.expiresAt).toLocaleString()}</span>}</span><span className="flex items-center gap-2"><Badge variant={item.effect === "allow" ? "default" : "destructive"}>{item.effect}</Badge><Button size="sm" variant="ghost" disabled={revokeUser.isPending} onClick={() => revokeUser.mutate(item.capability)}>Revoke</Button></span></div>)}</div>}</div>
    </CardContent></Card>
  </div>;
}
