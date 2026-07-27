"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  User,
  Phone,
  MapPin,
  Mail,
  CalendarDays,
  GraduationCap,
  TreePine,
  Building2,
  Users,
  CalendarCheck,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
};

type ProfileResponse = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  participant: {
    id: string;
    name: string;
    phone: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    age: number | null;
    gradeClass: string | null;
    address: string | null;
    state: string;
    joinedAt: string;
    group: string;
    batch: string;
    park: string;
    city: string | null;
  } | null;
  attendanceSummary: AttendanceSummary | null;
};

// ─── Animation Config ────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Helpers ─────────────────────────────────────────────────────────

const genderLabel = (g: string | null | undefined) => {
  if (!g) return "—";
  return g.charAt(0).toUpperCase() + g.slice(1);
};

// ─── Component ───────────────────────────────────────────────────────

export function MobileStudentProfilePage() {
  const { data, isLoading, error } = useQuery<ProfileResponse>({
    queryKey: ["user-profile"],
    queryFn: () =>
      fetch("/api/user/profile").then((r) => {
        if (!r.ok) throw new Error("Failed to load profile");
        return r.json();
      }),
    staleTime: 15000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="h-6" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 space-y-4">
        <Card className="rounded-2xl border-red-200 dark:border-red-800/50 bg-card">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="size-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Failed to load profile
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const p = data?.participant;
  const initials = (p?.name || data?.name || "Student")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border/50">
        <h1 className="text-lg font-bold">My Profile</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          
          {/* Profile Header Card */}
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border bg-card overflow-hidden shadow-sm">
              <div className="h-20 bg-gradient-to-r from-[#4B0A8F] to-[#A0006B]" />
              <CardContent className="p-4 pt-0">
                <div className="flex flex-col items-center -mt-10 mb-2">
                  <div className="size-20 rounded-full bg-card border-4 border-background shadow-sm shrink-0 flex items-center justify-center text-[#4B0A8F] text-2xl font-bold bg-[#F3ECF6]">
                    {initials}
                  </div>
                  <h2 className="text-xl font-bold mt-2">{p?.name || data?.name || "Student"}</h2>
                  <Badge className={cn("text-[10px] mt-1", p?.state === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                    {p?.state || "Unknown"}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2 flex flex-col items-center text-center">
                    <span>{p?.group || "No group"} · {p?.batch || "No batch"}</span>
                    <span>{p?.park || "No park"}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Personal Information */}
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="size-4 text-[#4B0A8F]" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <InfoRow label="Email" value={data?.email || "—"} icon={Mail} />
                <Separator />
                <InfoRow label="Phone" value={p?.phone || data?.phone || "Not set"} icon={Phone} />
                <Separator />
                <InfoRow label="Date of Birth" value={p?.dateOfBirth || "Not set"} icon={CalendarDays} />
                <Separator />
                <InfoRow label="Gender" value={genderLabel(p?.gender)} icon={ShieldCheck} />
                <Separator />
                <InfoRow label="Address" value={p?.address || "Not set"} icon={MapPin} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Organization Details */}
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border bg-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="size-4 text-[#4B0A8F]" />
                  Organization Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <InfoRow label="Group" value={p?.group || "—"} icon={Users} />
                <Separator />
                <InfoRow label="Batch" value={p?.batch || "—"} icon={CalendarDays} />
                <Separator />
                <InfoRow label="Park" value={p?.park || "—"} icon={TreePine} />
                <Separator />
                <InfoRow label="City" value={p?.city || "—"} icon={Building2} />
                <Separator />
                <InfoRow label="Joined" value={p?.joinedAt || "—"} icon={CalendarCheck} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Bottom spacer */}
          <div className="h-6" />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="size-4 shrink-0" />}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
