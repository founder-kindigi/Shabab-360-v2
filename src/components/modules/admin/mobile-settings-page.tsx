"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
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
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";
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
  Save,
  Loader2,
  Bell,
  AlertTriangle,
  Trash2,
  Download,
  HardDrive,
  Smartphone,
  CalendarCheck,
  Receipt,
  Megaphone,
  Globe,
  Settings,
} from "lucide-react";

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

  function startEditing() {
    setEditName(profile?.name || "");
    setEditPhone(profile?.phone || "");
    setIsEditing(true);
  }

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
    if (pwdNew.length < PASSWORD_MIN_LENGTH) {
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
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="rounded-2xl border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#4B0A8F] text-xl font-bold text-white shadow-md">
            {getInitials(profile?.name || sessionUser?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold truncate">
              {profile?.name || sessionUser?.name || "—"}
            </h2>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {profile?.email || sessionUser?.email || "—"}
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="capitalize text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6] dark:text-[#8A40B0] dark:border-[#2A0C8F] dark:bg-[#1F0860] text-[10px] px-2 h-5">
                {sessionUser?.role?.replace(/_/g, " ") || "—"}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {profileLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <User className="size-3.5" /> {t("common.name")}
              </Label>
              {isEditing ? (
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-11 rounded-xl text-sm" placeholder={t("settings.yourName")} />
              ) : (
                <p className="text-sm font-medium">{profile?.name || "—"}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <Mail className="size-3.5" /> {t("common.email")}
              </Label>
              <p className="text-sm font-medium">{profile?.email || sessionUser?.email || "—"}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <Phone className="size-3.5" /> {t("common.phone")}
              </Label>
              {isEditing ? (
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-11 rounded-xl text-sm" placeholder={t("settings.phonePlaceholder")} />
              ) : (
                <p className="text-sm font-medium">{profile?.phone || "—"}</p>
              )}
            </div>
            
            <div className="pt-2">
              {!isEditing ? (
                <Button variant="outline" className="w-full h-11 rounded-xl" onClick={startEditing}>
                  {t("common.edit")}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setIsEditing(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button className="flex-1 h-11 rounded-xl bg-[#4B0A8F] text-white" onClick={handleProfileSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                    {t("common.save")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5 dark:bg-amber-950/50">
            <Lock className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold">{t("auth.changePassword")}</h2>
            <p className="text-xs text-muted-foreground">{t("settings.updatePwdSecure")}</p>
          </div>
        </div>
        
        <Separator />
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("auth.currentPassword")}</Label>
            <Input type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} className="h-11 rounded-xl text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("auth.newPassword")}</Label>
            <Input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} className="h-11 rounded-xl text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("auth.confirmPassword")}</Label>
            <Input type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} className="h-11 rounded-xl text-sm" />
          </div>
          
          {pwdError && <p className="text-xs text-red-500 font-medium">{pwdError}</p>}
          
          <Button type="submit" className="w-full h-11 rounded-xl bg-[#4B0A8F] text-white" disabled={pwdMutation.isPending}>
            {pwdMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Lock className="size-4 mr-2" />}
            {t("auth.changePassword")}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useAppStore();

  const themeOptions = [
    { value: "light", label: t("settings.lightMode"), icon: Sun },
    { value: "dark", label: t("settings.darkMode"), icon: Moon },
    { value: "system", label: t("common.system"), icon: Monitor },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold">{t("settings.appearance")}</h2>
        <Separator />
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all cursor-pointer ${
                  isActive
                    ? "border-[#4B0A8F] bg-[#F3ECF6] dark:border-[#4B0A8F] dark:bg-[#1F0860]"
                    : "border-transparent bg-muted/50"
                }`}
              >
                <opt.icon className={`size-5 ${isActive ? "text-[#4B0A8F] dark:text-[#8A40B0]" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-[#4B0A8F] dark:text-[#8A40B0]" : "text-muted-foreground"}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-bold">{t("settings.language")}</p>
            </div>
          </div>
          <Select value={language} onValueChange={(v) => { setLanguage(v as "en" | "ur"); toast.success(t("settings.languageChanged")); }}>
            <SelectTrigger className="w-[100px] h-10 rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ur">اردو</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <NotificationPreferencesSection />
    </div>
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
        return {};
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
    <div className="rounded-2xl border bg-card p-4 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[#F3ECF6] p-2.5 dark:bg-[#1F0860]">
          <Bell className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
        </div>
        <div>
          <h2 className="text-sm font-bold">{t("settings.notificationPreferences")}</h2>
          <p className="text-xs text-muted-foreground">{t("settings.controlNotifications")}</p>
        </div>
      </div>
      <Separator />
      <div className="space-y-4">
        {toggleItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div className="flex items-center gap-3 pr-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-muted/50 shrink-0">
                <item.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold">{item.label}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{item.desc}</p>
              </div>
            </div>
            <Switch checked={item.checked} onCheckedChange={(v) => updatePref(item.key, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DangerZoneTab() {
  const { t } = useTranslation();

  function handleExportData() {
    try {
      const data: Record<string, unknown> = {};
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
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-red-200 dark:border-red-800/50 bg-card p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-red-100 p-2.5 dark:bg-red-950/50">
            <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-red-700 dark:text-red-400">{t("settings.dangerZone")}</h2>
            <p className="text-xs text-muted-foreground">{t("settings.dangerZoneDesc")}</p>
          </div>
        </div>
        <Separator className="bg-red-200 dark:bg-red-900/30" />
        
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-xs font-bold">{t("settings.requestAccountDeletion")}</p>
              <p className="text-[10px] text-muted-foreground">{t("settings.requestAccountDeletionDesc")}</p>
            </div>
            <Button
              variant="outline"
              className="w-full h-10 rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 text-xs"
              onClick={() => toast.info(t("settings.contactAdmin"))}
            >
              <Trash2 className="size-4 mr-1.5" />
              {t("settings.deleteAccount")}
            </Button>
          </div>
          
          <Separator className="bg-red-200 dark:bg-red-900/30" />
          
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-xs font-bold">{t("settings.exportData")}</p>
              <p className="text-[10px] text-muted-foreground">{t("settings.exportMyDataDesc")}</p>
            </div>
            <Button variant="outline" className="w-full h-10 rounded-xl text-xs" onClick={handleExportData}>
              <Download className="size-4 mr-1.5" />
              {t("settings.exportDataBtn")}
            </Button>
          </div>
          
          <Separator className="bg-red-200 dark:bg-red-900/30" />
          
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-xs font-bold">{t("settings.clearData")}</p>
              <p className="text-[10px] text-muted-foreground">{t("settings.clearLocalDataDesc")}</p>
            </div>
            <Button
              variant="outline"
              className="w-full h-10 rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 text-xs"
              onClick={handleClearLocalData}
            >
              <HardDrive className="size-4 mr-1.5" />
              {t("settings.clearDataBtn")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-2 pb-3 border-b border-border/50 px-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-[#4B0A8F] dark:text-purple-300">{t("settings.title")}</h1>
            <p className="text-xs text-muted-foreground truncate">{t("settings.profileDesc")}</p>
          </div>
          <div className="p-2 rounded-xl bg-muted/50">
            <Settings className="size-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-12 rounded-xl bg-muted/50 mb-4 p-1">
            <TabsTrigger value="profile" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="size-3.5 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Settings className="size-3.5 mr-1.5" /> Prefs
            </TabsTrigger>
            <TabsTrigger value="danger" className="rounded-lg text-xs font-semibold data-[state=active]:bg-red-50 data-[state=active]:text-red-600 data-[state=active]:shadow-sm">
              <AlertTriangle className="size-3.5 mr-1.5" /> Danger
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-2">
            <TabsContent value="profile" className="m-0 focus-visible:outline-none">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <ProfileTab />
              </motion.div>
            </TabsContent>
            
            <TabsContent value="preferences" className="m-0 focus-visible:outline-none">
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <PreferencesTab />
              </motion.div>
            </TabsContent>
            
            <TabsContent value="danger" className="m-0 focus-visible:outline-none">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <DangerZoneTab />
              </motion.div>
            </TabsContent>
          </div>
        </Tabs>
        <div className="h-6" />
      </div>
    </div>
  );
}
