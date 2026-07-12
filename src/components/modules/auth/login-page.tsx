"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/stores/useAppStore";
import { Eye, EyeOff, Shield, Lock, Mail, XCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const DEMO_ACCOUNTS = [
  { email: "super_admin@shabab360.pk", role: "Super Admin", color: "#4B0A8F" },
  { email: "program_admin@shabab360.pk", role: "Program Admin", color: "#A0006B" },
  { email: "city_head@shabab360.pk", role: "City Head", color: "#6B20A0" },
  { email: "park_admin@shabab360.pk", role: "Park Admin", color: "#8A40B0" },
  { email: "park_lead@shabab360.pk", role: "Park Lead", color: "#2A0C8F" },
  { email: "murabbi@shabab360.pk", role: "Murabbi", color: "#E0002A" },
  { email: "guardian@shabab360.pk", role: "Guardian", color: "#6B5A7A" },
  { email: "student@shabab360.pk", role: "Student", color: "#FF0015" },
] as const;

const DEMO_PASSWORD = "password123";

function doQuickLogin(accountEmail: string, setLoading: (v: boolean) => void, setError: (v: string) => void, triggerShake: () => void) {
  setLoading(true);
  setError("");
  signIn("credentials", {
    email: accountEmail,
    password: DEMO_PASSWORD,
    redirect: false,
  }).then((result) => {
    if (result?.error) {
      setError("Login failed. Please try again.");
      triggerShake();
    }
  }).catch(() => {
    setError("An unexpected error occurred.");
    triggerShake();
  }).finally(() => {
    setLoading(false);
  });
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { navigateTo } = useAppStore();
  const { t } = useTranslation();

  // Restore remember me and email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("shabab360-remember-email");
    const savedRemember = localStorage.getItem("shabab360-remember-me");
    if (savedRemember === "true" && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(t("auth.enterBoth"));
      triggerShake();
      return;
    }

    // Persist email if remember me is checked
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

      if (result.error) {
        setError(result.error === "CredentialsSignin" ? t("auth.invalidCredentials") : t("auth.loginFailed"));
        triggerShake();
      }
    } catch {
      setError(t("auth.unexpectedError"));
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F3ECF6] via-background to-[#F5E8EF]" />
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-[#4B0A8F]/5 blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-[#A0006B]/5 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#D4B8E3]/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md mx-4 px-4"
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-6"
          whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(75,10,143,0.15)" }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-gradient-to-br from-[#4B0A8F] to-[#A0006B] w-11 h-11 rounded-xl shadow-[#4B0A8F]/40 flex items-center justify-center">
            <Shield className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] bg-clip-text text-transparent">
            Shabab360
          </h1>
        </motion.div>

        {/* Card */}
        <motion.div
          animate={shaking ? { x: [0, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border-border/60 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-card/80">
            <CardContent className="p-6 pt-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-foreground">{t("auth.welcomeBack")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("auth.enterCredentials")}</p>
              </div>

              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground leading-none">{t("auth.email")}</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@shabab360.pk"
                      className="w-full h-11 pl-10 pr-4 rounded-lg border border-input bg-background/50 text-sm focus-visible:ring-[#A0006B]/30 focus-visible:border-[#A0006B] focus-visible:ring-2 focus-visible:ring-offset-1 outline-none transition-colors placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground leading-none">{t("auth.password")}</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="w-full h-11 pl-10 pr-10 rounded-lg border border-input bg-background/50 text-sm focus-visible:ring-[#A0006B]/30 focus-visible:border-[#A0006B] focus-visible:ring-2 focus-visible:ring-offset-1 outline-none transition-colors placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-start gap-2.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2.5"
                    >
                      <XCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-[#4B0A8F] to-[#A0006B] hover:opacity-90 text-white font-medium rounded-lg shadow-[#4B0A8F]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("auth.signingIn")}
                    </>
                  ) : (
                    t("auth.signIn")
                  )}
                </button>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={rememberMe}
                      onCheckedChange={(v) => setRememberMe(v === true)}
                      className="size-4"
                    />
                    <span className="text-xs text-muted-foreground">{t("auth.rememberMe")}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => navigateTo("reset-password")}
                    className="text-xs text-muted-foreground hover:text-[#4B0A8F] dark:hover:text-[#8A40B0] transition-colors"
                  >
                    {t("auth.resetPassword")}
                  </button>
                </div>

                {/* Demo Accounts Quick Login */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground text-center mb-2">{t("auth.quickLogin")}</p>
                  <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {DEMO_ACCOUNTS.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        disabled={loading}
                        onClick={() => doQuickLogin(account.email, setLoading, setError, () => setShaking(true))}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors border-l-[3px] text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderLeftColor: account.color }}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {account.role}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {account.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground/60 mt-8"
        >
          Shabab360 v2 · {t("auth.builtFor")}
        </motion.p>
      </motion.div>
    </div>
  );
}