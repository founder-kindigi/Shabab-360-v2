"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Globe,
  Key,
  History,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface OverrideRecord {
  id: string;
  userName: string;
  email: string;
  role: string;
  overrideCapability: string;
  scopePark: string;
  grantedBy: string;
  expiresAt: string;
  status: "active" | "expired";
}

interface DomainRecord {
  id: string;
  domain: string;
  category: "oauth" | "webhook" | "cors";
  addedBy: string;
  status: "active";
}

interface AuditRecord {
  id: string;
  action: string;
  actorName: string;
  ipAddress: string;
  details: string;
  timestamp: string;
}

const MOCK_OVERRIDES: OverrideRecord[] = [
  {
    id: "ov1",
    userName: "Umar Rohail",
    email: "umar.rohail@shabab360.org",
    role: "park_lead",
    overrideCapability: "attendance.override",
    scopePark: "Gulberg Park",
    grantedBy: "Super Admin",
    expiresAt: "2026-12-31",
    status: "active",
  },
  {
    id: "ov2",
    userName: "Basit Ahsan",
    email: "basit.ahsan@shabab360.org",
    role: "park_admin",
    overrideCapability: "fees.record_payment",
    scopePark: "Gulberg Park",
    grantedBy: "Super Admin",
    expiresAt: "2026-09-30",
    status: "active",
  },
];

const MOCK_DOMAINS: DomainRecord[] = [
  {
    id: "dom1",
    domain: "auth.shabab360.org",
    category: "oauth",
    addedBy: "Super Admin",
    status: "active",
  },
  {
    id: "dom2",
    domain: "api.whatsapp.com",
    category: "webhook",
    addedBy: "Super Admin",
    status: "active",
  },
];

const MOCK_AUDIT: AuditRecord[] = [
  {
    id: "aud1",
    action: "capability_override_granted",
    actorName: "Super Admin",
    ipAddress: "192.168.1.45",
    details: "Granted attendance.override capability to Umar Rohail for Gulberg Park",
    timestamp: "2026-08-04 14:30",
  },
];

export function SecurityAccessPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"overrides" | "domains" | "audit">("overrides");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);

  // Form State
  const [formUser, setFormUser] = useState("umar.rohail@shabab360.org");
  const [formCap, setFormCap] = useState("attendance.override");
  const [formScope, setFormScope] = useState("Gulberg Park");

  const { data: healthData } = useQuery({
    queryKey: ["admin-security-health"],
    queryFn: () => fetch("/api/admin/pilot/health").then((r) => r.json()),
  });

  const overrides = MOCK_OVERRIDES;

  const filteredOverrides = useMemo(() => {
    return overrides.filter((item) => {
      return (
        !search ||
        item.userName.toLowerCase().includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase()) ||
        item.overrideCapability.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [overrides, search]);

  const totalPages = Math.ceil(filteredOverrides.length / pageSize) || 1;
  const paginatedOverrides = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOverrides.slice(start, start + pageSize);
  }, [filteredOverrides, page]);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      <PageHeader
        title="System Health, Security & Scoped Access Desk"
        description="Manage user role capability overrides, zero-trust domain allowlists, audit logging trails, and system health status."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setOverrideModalOpen(true)}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold rounded-xl h-11 px-5 shadow-md gap-2"
            >
              <Plus className="size-5" />
              Grant Scoped Role Override
            </Button>
          </div>
        }
      />

      {/* ─── 4 Top KPI Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-300 shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Health</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">99.9% Uptime</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-300 shrink-0">
              <Key className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Role Overrides</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{overrides.length} active</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-300 shrink-0">
              <Globe className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Domain Allowlist</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{MOCK_DOMAINS.length} allowed</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-300 shrink-0">
              <History className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Security Audit Logs</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">1,240 events</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Tabs Switcher ────────────────────────────────────────── */}
      <Tabs defaultValue="overrides" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
            <TabsTrigger value="overrides" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <Key className="size-4 mr-2" /> Scoped Role Overrides
            </TabsTrigger>
            <TabsTrigger value="domains" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <Globe className="size-4 mr-2" /> Security Domain Allowlist
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <History className="size-4 mr-2" /> System Audit Logs
            </TabsTrigger>
          </TabsList>

          {activeTab === "overrides" && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search user or override..."
                  className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Tab 1: Scoped Role Overrides ───────────────────────────────── */}
        <TabsContent value="overrides" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">User & Email</th>
                    <th className="p-4">Base Role</th>
                    <th className="p-4">Override Capability</th>
                    <th className="p-4">Scoped Location</th>
                    <th className="p-4">Expiration</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedOverrides.map((item) => (
                    <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                        <div>{item.userName}</div>
                        <span className="text-xs text-muted-foreground font-medium">{item.email}</span>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-purple-100 text-purple-700 font-bold text-[10px] uppercase">
                          {item.role}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                        {item.overrideCapability}
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {item.scopePark}
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-600">
                        {item.expiresAt}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toast.success(`Revoked override for ${item.userName}`)}
                          className="h-8 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
                        >
                          Revoke Capability
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Page {page} of {totalPages} ({filteredOverrides.length} total overrides)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  <ChevronLeft className="size-4 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Security Domain Allowlist ───────────────────────────── */}
        <TabsContent value="domains" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 space-y-4 rounded-2xl">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Globe className="size-5 text-indigo-600" /> Zero-Trust Security Domain Allowlist
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_DOMAINS.map((dom) => (
                <div key={dom.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm font-bold">{dom.domain}</div>
                    <span className="text-xs text-muted-foreground">Category: {dom.category} • Added by {dom.addedBy}</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                    Allowed
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: System Audit Logs ───────────────────────────────────── */}
        <TabsContent value="audit" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 space-y-4 rounded-2xl">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <History className="size-5 text-amber-500" /> Security Authorization Audit Trail
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_AUDIT.map((aud) => (
                <div key={aud.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{aud.details}</div>
                    <span className="text-xs text-muted-foreground">Actor: {aud.actorName} ({aud.ipAddress})</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono font-medium">{aud.timestamp}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Grant Role Override Modal ────────────────────────────────────── */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-2xl shadow-2xl">
          <div className="p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                <Key className="size-5 text-purple-600" /> Grant Scoped Role Override
              </DialogTitle>
              <DialogDescription className="text-xs font-medium">
                Grant targeted capability overrides to staff users with explicit expiration limits.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("Role capability override granted successfully!");
                setOverrideModalOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">User Email</Label>
                <Input
                  value={formUser}
                  onChange={(e) => setFormUser(e.target.value)}
                  placeholder="e.g. user@shabab360.org"
                  className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Override Capability</Label>
                <Select value={formCap} onValueChange={setFormCap}>
                  <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold">
                    <SelectValue placeholder="Capability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendance.override">attendance.override (Mark Staff & Student)</SelectItem>
                    <SelectItem value="fees.record_payment">fees.record_payment (Record Fees & Issue Receipt)</SelectItem>
                    <SelectItem value="admissions.interview">admissions.interview (Grade Admissions)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setOverrideModalOpen(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-6">
                  Grant Override
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
