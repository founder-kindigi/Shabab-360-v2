"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPasswordValidationError,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";

export function ResetPasswordPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const user = session?.user as { name?: string; mustResetPwd?: boolean } | undefined;
  const displayName = user?.name || "User";
  const requiresCurrentPassword = !user?.mustResetPwd;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (requiresCurrentPassword && !currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      newErrors.newPassword = passwordError;
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!newPassword) {
      newErrors.newPassword = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: requiresCurrentPassword ? currentPassword : undefined,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);
      toast.success("Password updated successfully");

      // Resetting the password invalidates this session along with every other session.
      setTimeout(() => {
        void signOut({ callbackUrl: "/" });
      }, 1500);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F3ECF6] via-[#F3F1F4] to-[#F5E8EF] dark:from-[#150540] dark:via-background dark:to-[#2A1528]">
        <div className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-[#F3ECF6] p-4 dark:bg-[#1F0860]">
              <CheckCircle2 className="size-10 text-[#4B0A8F] dark:text-[#8A40B0]" />
            </div>
            <h2 className="text-xl font-bold">Password Updated!</h2>
            <p className="text-sm text-muted-foreground">
              Redirecting you to sign in...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F3ECF6] via-[#F3F1F4] to-[#F5E8EF] dark:from-[#150540] dark:via-background dark:to-[#2A1528]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-[#2A0C8F] via-[#A0006B] to-[#FF0015] text-white font-bold text-xl mb-4 shadow-lg shadow-[#4B0A8F4D]">
            S
          </div>
          <h1 className="text-2xl font-bold text-foreground">Shabab360</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set your new password
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2">
            <h2 className="text-lg font-semibold text-center">
              Welcome, {displayName}
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Please set a new password before continuing
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {requiresCurrentPassword && (
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={loading}
                  />
                  {errors.currentPassword && (
                    <p className="text-xs text-destructive">{errors.currentPassword}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    placeholder={`Minimum ${PASSWORD_MIN_LENGTH} characters`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNew ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-destructive">{errors.newPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-br from-[#2A0C8F] via-[#A0006B] to-[#FF0015] hover:opacity-90 text-white"
                disabled={loading}
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? "Updating..." : "Set New Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
