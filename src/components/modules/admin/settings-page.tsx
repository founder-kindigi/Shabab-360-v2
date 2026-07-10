"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/useAppStore";
import {
  User,
  Lock,
  Building2,
  Sun,
  Moon,
  Monitor,
  PanelLeftClose,
  PanelLeft,
  ArrowRight,
  Mail,
  Phone,
  Shield,
  MapPin,
  TreePine,
  Users,
  UserCog,
  Save,
  Loader2,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
}

function ProfileTab() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const sessionUser = session?.user as {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | undefined;

  // Fetch full profile from API (includes phone)
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: () => fetch("/api/user/profile").then((r) => r.json()),
  });

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Open edit mode with current values
  function startEditing() {
    setEditName(profile?.name || "");
    setEditPhone(profile?.phone || "");
    setIsEditing(true);
  }

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; phone?: string }) =>
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error(err.error || "Failed to update profile");
    },
  });

  // Change password mutation
  const pwdMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      setPwdError("");
    },
    onError: (err: any) => {
      setPwdError(err.error || "Failed to change password");
    },
  });

  function handleProfileSave() {
    updateMutation.mutate({ name: editName.trim() || undefined, phone: editPhone.trim() || undefined });
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");

    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      setPwdError("All password fields are required");
      return;
    }
    if (pwdNew.length < 8) {
      setPwdError("New password must be at least 8 characters");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError("New passwords do not match");
      return;
    }

    pwdMutation.mutate({
      currentPassword: pwdCurrent,
      newPassword: pwdNew,
      confirmPassword: pwdConfirm,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-2xl"
    >
      {/* Profile info card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Profile Information</h2>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={startEditing}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleProfileSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Save className="size-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {profileLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="size-4" /> Name
              </Label>
              {isEditing ? (
                <div className="col-span-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              ) : (
                <span className="col-span-2 text-sm font-medium">
                  {profile?.name || "—"}
                </span>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="size-4" /> Email
              </Label>
              <span className="col-span-2 text-sm text-muted-foreground">
                {profile?.email || sessionUser?.email || "—"}
              </span>
            </div>

            {/* Phone */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="size-4" /> Phone
              </Label>
              {isEditing ? (
                <div className="col-span-2">
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
              ) : (
                <span className="col-span-2 text-sm font-medium">
                  {profile?.phone || "—"}
                </span>
              )}
            </div>

            {/* Role (read-only) */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="size-4" /> Role
              </Label>
              <div className="col-span-2">
                <Badge
                  variant="outline"
                  className="capitalize text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50"
                >
                  {sessionUser?.role?.replace(/_/g, " ") || "—"}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change password card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/50">
            <Lock className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Change Password</h2>
            <p className="text-xs text-muted-foreground">
              Update your password to keep your account secure
            </p>
          </div>
        </div>

        <Separator />

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pwd" className="text-sm">
              Current Password
            </Label>
            <Input
              id="current-pwd"
              type="password"
              value={pwdCurrent}
              onChange={(e) => setPwdCurrent(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pwd" className="text-sm">
              New Password
            </Label>
            <Input
              id="new-pwd"
              type="password"
              value={pwdNew}
              onChange={(e) => setPwdNew(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pwd" className="text-sm">
              Confirm New Password
            </Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>

          {pwdError && (
            <p className="text-sm text-destructive">{pwdError}</p>
          )}

          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={pwdMutation.isPending}
          >
            {pwdMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Changing...
              </>
            ) : (
              <>
                <Lock className="size-4 mr-2" />
                Change Password
              </>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}

function OrganizationTab() {
  const { navigateTo } = useAppStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard", "org-settings"],
    queryFn: () => fetch("/api/admin/dashboard").then((r) => r.json()),
  });

  const orgStats = stats
    ? [
        { label: "Cities", value: stats.cities ?? "—", icon: MapPin, page: "admin-cities" as const },
        { label: "Parks", value: stats.parks ?? "—", icon: TreePine, page: "admin-parks" as const },
        { label: "Staff", value: stats.staff ?? "—", icon: UserCog, page: "admin-users" as const },
        { label: "Participants", value: stats.participants ?? "—", icon: Users, page: "admin-students" as const },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-2xl"
    >
      {/* Org info */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950/50">
            <Building2 className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Shabab360</h2>
            <p className="text-xs text-muted-foreground">Program Operations Platform</p>
          </div>
        </div>

        <Separator />

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {orgStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Quick Links</h2>
        <Separator />
        <div className="space-y-2">
          {[
            { label: "Manage Cities", page: "admin-cities" as const, desc: "Add, edit, and manage cities" },
            { label: "Manage Parks", page: "admin-parks" as const, desc: "View and manage parks" },
            { label: "Manage Users", page: "admin-users" as const, desc: "Staff accounts and roles" },
          ].map((link) => (
            <button
              key={link.page}
              onClick={() => navigateTo(link.page)}
              className="w-full flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors text-left cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PreferencesTab() {
  const { theme, setTheme } = useTheme();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-2xl"
    >
      {/* Theme */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <Separator />

        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">Theme</Label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const isActive = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all cursor-pointer ${
                    isActive
                      ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/30"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <opt.icon
                    className={`size-5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`text-xs font-medium ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Sidebar</h2>
        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {sidebarOpen ? (
              <PanelLeftClose className="size-5 text-muted-foreground" />
            ) : (
              <PanelLeft className="size-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {sidebarOpen ? "Expanded" : "Collapsed"}
              </p>
              <p className="text-xs text-muted-foreground">
                {sidebarOpen
                  ? "Show full sidebar with labels"
                  : "Show only icons in the sidebar"}
              </p>
            </div>
          </div>
          <Switch
            checked={sidebarOpen}
            onCheckedChange={toggleSidebar}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="size-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="size-4" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Sun className="size-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="organization" className="mt-6">
          <OrganizationTab />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <PreferencesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}