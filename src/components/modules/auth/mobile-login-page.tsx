"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/stores/useAppStore";
import { Eye, EyeOff, Shield, Lock, Mail, XCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function MobileLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { navigateTo } = useAppStore();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedEmail = localStorage.getItem("shabab360-remember-email");
      const savedRemember = localStorage.getItem("shabab360-remember-me");
      if (savedRemember === "true" && savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(t("auth.enterBoth"));
      return;
    }

    if (rememberMe) {
      localStorage.setItem("shabab360-remember-email", email.trim());
      localStorage.setItem("shabab360-remember-me", "true");
    } else {
      localStorage.removeItem("shabab360-remember-email");
      localStorage.removeItem("shabab360-remember-me");
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? t("auth.invalidCredentials") : t("auth.loginFailed"));
      }
    } catch {
      setError(t("auth.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center px-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm mx-auto"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-[#4B0A8F] to-[#8A40B0] w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center mb-4">
            <Shield className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Shabab360</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {t("auth.welcomeBack")}
          </p>
        </div>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("auth.email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@shabab360.pk"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border bg-background text-base focus-visible:ring-2 focus-visible:ring-[#4B0A8F]/30 focus-visible:border-[#4B0A8F] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("auth.password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    className="w-full h-12 pl-11 pr-11 rounded-xl border bg-background text-base focus-visible:ring-2 focus-visible:ring-[#4B0A8F]/30 focus-visible:border-[#4B0A8F] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#4B0A8F] hover:bg-[#3d0875] text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("auth.signIn")}
              </button>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm text-muted-foreground">{t("auth.rememberMe")}</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigateTo("reset-password")}
                  className="text-sm font-medium text-[#4B0A8F] hover:underline"
                >
                  {t("auth.resetPassword")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <div className="h-6" />
      </motion.div>
    </div>
  );
}
