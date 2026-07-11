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
import { useTranslation } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Bell,
  BellOff,
  AlertTriangle,
  Trash2,
  Download,
  HardDrive,
  Smartphone,
  CalendarCheck,
  Receipt,
  Megaphone,
  Globe,
} from "lucide-react";
import { AvatarUpload } from "@/components/shared/avatar-upload";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function ProfileTab() {
  const { t } = useTranslation();
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
      toast.success(t("settings.profileUpdated"));
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error(err.error || t("settings.profileUpdateFailed"));
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
      toast.success(t("settings.pwdChanged"));
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
      setPwdError("");
    },
    onError: (err: any) => {
      setPwdError(err.error || t("settings.pwdChangeFailed"));
    },
  });

  function handleProfileSave() {
    updateMutation.mutate({ name: editName.trim() || undefined, phone: editPhone.trim() || undefined });
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwdError("");

    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      setPwdError(t("settings.allPwdRequired"));
      return;
    }
    if (pwdNew.length < 8) {
      setPwdError(t("auth.passwordMinLength"));
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError(t("auth.passwordsMatch"));
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
      {/* Profile header card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Avatar */}
          <AvatarUpload
            userId={sessionUser?.id || ""}
            name={profile?.name || sessionUser?.name || ""}
            size="lg"
          />
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2">
              <h2 className="text-lg font-semibold">
                {profile?.name || sessionUser?.name || "—"}
              </h2>
              <Badge
                variant="outline"
                className="capitalize text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860]"
              >
                {sessionUser?.role?.replace(/_/g, " ") || "—"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile?.email || sessionUser?.email || "—"}
            </p>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={startEditing}>
              {t("common.edit")}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
                onClick={handleProfileSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : (
                  <Save className="size-4 mr-1" />
                )}
                {t("common.save")}
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
                <User className="size-4" /> {t("common.name")}
              </Label>
              {isEditing ? (
                <div className="col-span-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t("settings.yourName")}
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
                <Mail className="size-4" /> {t("common.email")}
              </Label>
              <span className="col-span-2 text-sm text-muted-foreground">
                {profile?.email || sessionUser?.email || "—"}
              </span>
            </div>

            {/* Phone */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="size-4" /> {t("common.phone")}
              </Label>
              {isEditing ? (
                <div className="col-span-2">
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder={t("settings.phonePlaceholder")}
                  />
                </div>
              ) : (
                <span className="col-span-2 text-sm font-medium">
                  {profile?.phone || "—"}
                </span>
              )}
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
            <h2 className="text-lg font-semibold">{t("auth.changePassword")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("settings.updatePwdSecure")}
            </p>
          </div>
        </div>

        <Separator />

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pwd" className="text-sm">
              {t("auth.currentPassword")}
            </Label>
            <Input
              id="current-pwd"
              type="password"
              value={pwdCurrent}
              onChange={(e) => setPwdCurrent(e.target.value)}
              placeholder={t("settings.enterCurrentPwd")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pwd" className="text-sm">
              {t("auth.newPassword")}
            </Label>
            <Input
              id="new-pwd"
              type="password"
              value={pwdNew}
              onChange={(e) => setPwdNew(e.target.value)}
              placeholder={t("settings.min8Chars")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pwd" className="text-sm">
              {t("auth.confirmPassword")}
            </Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={pwdConfirm}
              onChange={(e) => setPwdConfirm(e.target.value)}
              placeholder={t("settings.reenterPwd")}
            />
          </div>

          {pwdError && (
            <p className="text-sm text-destructive">{pwdError}</p>
          )}

          <Button
            type="submit"
            className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white"
            disabled={pwdMutation.isPending}
          >
            {pwdMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {t("settings.changing")}
              </>
            ) : (
              <>
                <Lock className="size-4 mr-2" />
                {t("auth.changePassword")}
              </>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}

function OrganizationTab() {
  const { t } = useTranslation();
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
          <div className="rounded-lg bg-[#F3ECF6] p-2.5 dark:bg-[#1F0860]">
            <Building2 className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Shabab360</h2>
            <p className="text-xs text-muted-foreground">{t("settings.platformDesc")}</p>
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
        <h2 className="text-lg font-semibold">{t("settings.quickLinks")}</h2>
        <Separator />
        <div className="space-y-2">
          {[
            { label: t("settings.manageCities"), page: "admin-cities" as const, desc: t("settings.manageCitiesDesc") },
            { label: t("settings.manageParks"), page: "admin-parks" as const, desc: t("settings.manageParksDesc") },
            { label: t("settings.manageUsers"), page: "admin-users" as const, desc: t("settings.manageUsersDesc") },
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
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, sidebarOpen, toggleSidebar } = useAppStore();

  const themeOptions = [
    { value: "light", label: t("settings.lightMode"), icon: Sun },
    { value: "dark", label: t("settings.darkMode"), icon: Moon },
    { value: "system", label: t("common.system"), icon: Monitor },
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
        <h2 className="text-lg font-semibold">{t("settings.appearance")}</h2>
        <Separator />

        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">{t("settings.theme")}</Label>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const isActive = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all cursor-pointer ${
                    isActive
                      ? "border-[#4B0A8F] bg-[#F3ECF6] dark:border-[#4B0A8F] dark:bg-[#1F0860]"
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <opt.icon
                    className={`size-5 ${isActive ? "text-[#4B0A8F] dark:text-[#8A40B0]" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`text-xs font-medium ${isActive ? "text-[#4B0A8F] dark:text-[#8A40B0]" : "text-muted-foreground"}`}
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
        <h2 className="text-lg font-semibold">{t("settings.sidebar")}</h2>
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
                {sidebarOpen ? t("settings.expanded") : t("settings.collapsed")}
              </p>
              <p className="text-xs text-muted-foreground">
                {sidebarOpen
                  ? t("settings.showFullSidebar")
                  : t("settings.showIconsOnly")}
              </p>
            </div>
          </div>
          <Switch
            checked={sidebarOpen}
            onCheckedChange={toggleSidebar}
          />
        </div>
      </div>

      {/* Language */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Globe className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t("settings.language")}</p>
            </div>
          </div>
          <Select value={language} onValueChange={(v) => { setLanguage(v as "en" | "ur"); toast.success(t("settings.languageChanged")); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ur">اردو</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notification Preferences */}
      <NotificationPreferencesSection />
    </motion.div>
  );
}

function NotificationPreferencesSection() {
  const { t } = useTranslation();
  type PrefKey = "email" | "inApp" | "push" | "attendance" | "fees" | "announcements";

  function getStoredPrefs() {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem("shabab360-notif-prefs");
    if (stored) {
      try {
        return JSON.parse(stored) as Record<string, boolean>;
      } catch {
        // ignore parse errors
      }
    }
    return {};
  }

  const [emailNotifs, setEmailNotifs] = useState(() => getStoredPrefs().email ?? true);
  const [inAppNotifs, setInAppNotifs] = useState(() => getStoredPrefs().inApp ?? true);
  const [pushNotifs, setPushNotifs] = useState(() => getStoredPrefs().push ?? false);
  const [attendanceAlerts, setAttendanceAlerts] = useState(() => getStoredPrefs().attendance ?? true);
  const [feeReminders, setFeeReminders] = useState(() => getStoredPrefs().fees ?? true);
  const [announcementAlerts, setAnnouncementAlerts] = useState(() => getStoredPrefs().announcements ?? true);

  function updatePref(key: PrefKey, value: boolean) {
    const prefs = getStoredPrefs();
    prefs[key] = value;
    localStorage.setItem("shabab360-notif-prefs", JSON.stringify(prefs));

    if (key === "email") setEmailNotifs(value);
    else if (key === "inApp") setInAppNotifs(value);
    else if (key === "push") setPushNotifs(value);
    else if (key === "attendance") setAttendanceAlerts(value);
    else if (key === "fees") setFeeReminders(value);
    else if (key === "announcements") setAnnouncementAlerts(value);

    toast.success(t("settings.saved"));
  }

  const toggleItems = [
    { key: "email" as PrefKey, label: t("settings.emailNotif"), desc: t("settings.emailNotifDesc"), icon: Mail, checked: emailNotifs },
    { key: "push" as PrefKey, label: t("settings.pushNotif"), desc: t("settings.pushNotifDesc"), icon: Smartphone, checked: pushNotifs },
    { key: "attendance" as PrefKey, label: t("settings.attendanceAlerts"), desc: t("settings.attendanceAlertsDesc"), icon: CalendarCheck, checked: attendanceAlerts },
    { key: "fees" as PrefKey, label: t("settings.feeReminders"), desc: t("settings.feeRemindersDesc"), icon: Receipt, checked: feeReminders },
    { key: "announcements" as PrefKey, label: t("settings.announcementAlerts"), desc: t("settings.announcementAlertsDesc"), icon: Megaphone, checked: announcementAlerts },
    { key: "inApp" as PrefKey, label: t("settings.inAppNotifications"), desc: t("settings.inAppNotifDesc"), icon: Bell, checked: inAppNotifs },
  ];

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
        <div>
          <h2 className="text-lg font-semibold">{t("settings.notificationPreferences")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("settings.controlNotifications")}
          </p>
        </div>
      </div>
      <Separator />

      <div className="space-y-4">
        {toggleItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#F3ECF6] dark:bg-[#1F086080]">
                <item.icon className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </div>
            <Switch
              checked={item.checked}
              onCheckedChange={(v) => updatePref(item.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DangerZoneSection() {
  const { t } = useTranslation();

  function handleExportData() {
    try {
      const data: Record<string, unknown> = {};
      // Gather all localStorage data related to the app
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("shabab360-"));
      for (const key of keys) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || "");
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shabab360-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("settings.dataExported"));
    } catch {
      toast.error(t("settings.exportFailed"));
    }
  }

  function handleClearLocalData() {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("shabab360-"));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      toast.success(t("settings.localDataCleared"));
    } catch {
      toast.error(t("settings.clearFailed"));
    }
  }

  return (
    <div className="rounded-xl border-2 border-red-200 dark:border-red-800/50 bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center size-9 rounded-lg bg-red-100 dark:bg-red-950/50">
          <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">{t("settings.dangerZone")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("settings.dangerZoneDesc")}
          </p>
        </div>
      </div>
      <Separator />

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{t("settings.requestAccountDeletion")}</p>
            <p className="text-xs text-muted-foreground">
              {t("settings.requestAccountDeletionDesc")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-400 shrink-0"
            onClick={() => toast.info(t("settings.contactAdmin"))}
          >
            <Trash2 className="size-4 mr-1.5" />
            {t("settings.deleteAccount")}
          </Button>
        </div>

        <Separator />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{t("settings.exportData")}</p>
            <p className="text-xs text-muted-foreground">
              {t("settings.exportMyDataDesc")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
          >
            <Download className="size-4 mr-1.5" />
            {t("settings.exportDataBtn")}
          </Button>
        </div>

        <Separator />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{t("settings.clearData")}</p>
            <p className="text-xs text-muted-foreground">
              {t("settings.clearLocalDataDesc")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            onClick={handleClearLocalData}
          >
            <HardDrive className="size-4 mr-1.5" />
            {t("settings.clearDataBtn")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.profileDesc")}
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="size-4" />
            <span className="hidden sm:inline">{t("settings.profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="size-4" />
            <span className="hidden sm:inline">{t("settings.organization")}</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Sun className="size-4" />
            <span className="hidden sm:inline">{t("settings.preferences")}</span>
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

      {/* Danger Zone — always visible below all tabs */}
      <div className="max-w-2xl">
        <DangerZoneSection />
      </div>
    </div>
  );
}