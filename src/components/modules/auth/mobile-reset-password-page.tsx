"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  getPasswordValidationError,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password-policy";
import { useAppStore } from "@/stores/useAppStore";

export function MobileResetPasswordPage() {
  const { data: session } = useSession();
  const { navigateTo } = useAppStore();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const user = session?.user as { name?: string } | undefined;
  const displayName = user?.name || "User";

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="rounded-full bg-[#4B0A8F]/10 p-5">
            <CheckCircle2 className="w-12 h-12 text-[#4B0A8F]" />
          </div>
          <h2 className="text-2xl font-bold">Password Updated!</h2>
          <p className="text-muted-foreground">
            Redirecting you to sign in...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
        <button 
          onClick={() => navigateTo("login")}
          className="p-2 -ml-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Reset Password</h1>
      </div>

      <div className="flex-1 p-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm mx-auto space-y-6"
        >
          <div className="text-center">
            <h2 className="text-xl font-bold">Hello, {displayName}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Please set a new password to continue.
            </p>
          </div>

          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      placeholder={`Min ${PASSWORD_MIN_LENGTH} chars`}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      className="h-12 pl-4 pr-12 rounded-xl focus-visible:ring-[#4B0A8F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground"
                    >
                      {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-xs text-red-500 font-medium">{errors.newPassword}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="h-12 pl-4 pr-12 rounded-xl focus-visible:ring-[#4B0A8F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground"
                    >
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500 font-medium">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-[#4B0A8F] hover:bg-[#3d0875] text-white text-base font-semibold mt-2"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {loading ? "Updating..." : "Set New Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
        
        <div className="h-6" />
      </div>
    </div>
  );
}
