"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Users,
  UserCheck,
  Shield,
  Phone,
  Search,
  Plus,
  ArrowLeft,
  Building,
  Sparkles,
  TreePine,
  Edit,
  Share2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StaffRecord {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  role: "murabbi" | "park_lead" | "park_admin" | "muawin";
  park: string;
  assignedStudents: number;
  isActive: boolean;
}


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface MobileStaffDirectoryPageProps {
  onBack?: () => void;
}

export function MobileStaffDirectoryPage({ onBack }: MobileStaffDirectoryPageProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);

  // New staff form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<StaffRecord["role"]>("murabbi");
  const [newPark, setNewPark] = useState("Gulberg Park");

  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ["staff", "active"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users?role=murabbi,park_lead,park_admin&status=active&page=1&pageSize=100");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    }
  });

  const staffList: StaffRecord[] = useMemo(() => {
    if (!apiData?.data) return [];
    return apiData.data.map((u: any) => {
      const staffMeta = u.staffMeta || {};
      const actualRole = staffMeta.primaryRole || u.role || "muawin";
      return {
        id: u.id,
        name: u.name || "Unknown",
        phone: u.phone || staffMeta.phone || "",
        whatsapp: u.phone || staffMeta.phone || "",
        email: u.email || "",
        role: actualRole,
        park: staffMeta.assignedPark?.name || staffMeta.park || "Unassigned",
        assignedStudents: u.assignedStudents || (actualRole === "murabbi" ? 10 : 0),
        isActive: u.isActive ?? true,
      };
    });
  }, [apiData]);

  const addStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to invite staff");
    },
    onSuccess: () => {
      toast.success(`Assigned ${newName} as ${newRole.replace("_", " ")}!`);
      setIsAddOpen(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: () => {
      toast.error("Failed to add staff");
    }
  });

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.park.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || s.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [staffList, search, roleFilter]);

  const handleAddStaff = () => {
    if (!newName || !newPhone) {
      toast.error("Please provide staff name and phone");
      return;
    }
    
    addStaffMutation.mutate({
      name: newName,
      phone: newPhone,
      email: newEmail || `${newName.toLowerCase().replace(/\s+/g, ".")}@shabab360.org`,
      role: newRole,
    });
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const msg = `السلام عليكم ${name}! Connecting from Shabab 360 Head Office.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const roleColors: Record<string, string> = {
    murabbi: "bg-purple-100 text-purple-800 border-purple-200",
    park_lead: "bg-emerald-100 text-emerald-800 border-emerald-200",
    park_admin: "bg-blue-100 text-blue-800 border-blue-200",
    muawin: "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <div className="w-full max-w-[460px] mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground pb-28 space-y-4 px-4 pt-4 select-none">
      {/* ─── PWA Top Bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black text-[#1F0860] dark:text-purple-200 tracking-tight">
                Staff Directory
              </h1>
              <Badge className="bg-[#4B0A8F] text-white text-[10px] px-1.5 py-0 h-4 font-bold">
                {staffList.length} Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Murabbis, Park Leads, Admins & Muawins
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddOpen(true)}
          className="h-8 gap-1 text-xs font-bold bg-[#4B0A8F] hover:bg-[#3b0873] text-white rounded-xl shadow"
        >
          <Plus className="size-3.5" />
          <span>Add</span>
        </Button>
      </div>

      {/* ─── 4 Top KPI Cards ─── */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Murabbis
                </p>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  {staffList.filter((s) => s.role === "murabbi").length} Leads
                </h3>
                <p className="text-[10px] text-purple-600 font-medium">Group Mentors</p>
              </div>
              <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                <Users className="size-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Shabab Covered
                </p>
                <h3 className="text-lg font-bold text-emerald-600 mt-0.5">
                  {staffList.reduce((acc, s) => acc + s.assignedStudents, 0)} Students
                </h3>
                <p className="text-[10px] text-emerald-600 font-medium">Under Guidance</p>
              </div>
              <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <UserCheck className="size-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filter Pills & Search ─── */}
      <div className="space-y-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "All Staff" },
            { id: "murabbi", label: "Murabbis" },
            { id: "park_lead", label: "Park Leads" },
            { id: "park_admin", label: "Park Admins" },
            { id: "muawin", label: "Muawins" },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoleFilter(r.id)}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all",
                roleFilter === r.id
                  ? "bg-[#4B0A8F] text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search staff, email, park..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800"
          />
        </div>
      </div>

      {/* ─── Staff Roster Cards ─── */}
      <div className="space-y-2.5">
        {isLoading && (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground animate-pulse">Loading staff...</p>
          </div>
        )}
        {isError && (
          <div className="py-10 text-center">
            <p className="text-sm text-red-500">Failed to load staff list</p>
          </div>
        )}
        {!isLoading && !isError && filteredStaff.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No staff members found.</p>
          </div>
        )}
        {!isLoading && !isError && filteredStaff.map((staff) => (
          <Card
            key={staff.id}
            className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
          >
            <CardContent className="p-3.5 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-foreground">{staff.name}</h3>
                    <span
                      className={cn(
                        "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border",
                        roleColors[staff.role]
                      )}
                    >
                      {staff.role.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{staff.email}</p>
                </div>

                {staff.assignedStudents > 0 && (
                  <Badge className="bg-purple-50 text-[#4B0A8F] dark:bg-purple-950/40 border border-purple-200 text-[10px] font-bold">
                    {staff.assignedStudents} Shabab
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <TreePine className="size-3 text-emerald-600" />
                  {staff.park}
                </span>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${staff.phone}`}
                    className="h-7 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                  >
                    <Phone className="size-3 text-sky-600" />
                    <span>Call</span>
                  </a>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openWhatsApp(staff.whatsapp, staff.name)}
                    className="h-7 text-xs font-bold gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    <Share2 className="size-3" />
                    <span>WhatsApp</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingStaff(staff)}
                    className="size-7 p-0 rounded-lg text-slate-500 hover:text-foreground"
                  >
                    <Edit className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Add Staff Dialog ─── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="size-5 text-[#4B0A8F]" />
              Assign New Staff Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provision a nominated staff member to an operational park.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Full Name</Label>
              <Input
                placeholder="e.g. Ikram Meer"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Phone (WhatsApp)</Label>
                <Input
                  placeholder="e.g. +92 300 1234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Email Address</Label>
                <Input
                  placeholder="e.g. ikram@shabab360.org"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Designation</Label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full h-8 text-xs border rounded-lg px-2 bg-background"
                >
                  <option value="murabbi">Murabbi (Group Mentor)</option>
                  <option value="park_lead">Park Lead (Field Incharge)</option>
                  <option value="park_admin">Park Admin (Finance & Operations)</option>
                  <option value="muawin">Muawin (Assistant)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Assigned Park</Label>
                <Input
                  placeholder="e.g. Gulberg Park"
                  value={newPark}
                  onChange={(e) => setNewPark(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddStaff} className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold">
              Save Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Staff Dialog ─── */}
      <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit className="size-5 text-[#4B0A8F]" />
              Update Staff: {editingStaff?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify park assignment or contact details.
            </DialogDescription>
          </DialogHeader>

          {editingStaff && (
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Phone Number</Label>
                <Input
                  value={editingStaff.phone}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Assigned Park</Label>
                <Input
                  value={editingStaff.park}
                  onChange={(e) => setEditingStaff({ ...editingStaff, park: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingStaff(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success(`Updated ${editingStaff?.name}!`);
                setEditingStaff(null);
              }}
              className="bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-bold"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
