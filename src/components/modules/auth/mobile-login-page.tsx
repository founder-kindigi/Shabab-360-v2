"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileLoginPageProps {
  onSuccess?: () => void;
  onBackToSplash?: () => void;
  initialRolePrefill?: string;
}

export function MobileLoginPage({ onSuccess, onBackToSplash, initialRolePrefill }: MobileLoginPageProps) {
  const [email, setEmail] = useState(() => {
    if (initialRolePrefill === "murabbi") return "murabbi.lhr@shabab360.org";
    if (initialRolePrefill === "park_lead") return "lead.statelife@shabab360.org";
    if (initialRolePrefill === "guardian") return "guardian.ahmed@shabab360.org";
    if (initialRolePrefill === "student") return "student.ali@shabab360.org";
    return "";
  });
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeRole, setActiveRole] = useState(initialRolePrefill || "");

  const DEMO_ACCOUNTS = [
    { role: "super_admin", label: "Super Admin", email: "admin@shabab360.org" },
    { role: "murabbi", label: "Murabbi", email: "murabbi.lhr@shabab360.org" },
    { role: "park_lead", label: "Park Lead", email: "lead.statelife@shabab360.org" },
    { role: "guardian", label: "Guardian", email: "guardian.ahmed@shabab360.org" },
    { role: "student", label: "Student", email: "student.ali@shabab360.org" },
  ];

  function handleRolePrefill(acc: { role: string; email: string }) {
    setActiveRole(acc.role);
    setEmail(acc.email);
    setPassword("Password123!");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (onSuccess) onSuccess();
    }, 500);
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-12 select-none">
      {/* ─── Top Brand Background Header ──────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-10 pb-16 px-6 overflow-hidden rounded-b-[2.5rem] shadow-xl">
        <div className="absolute top-0 right-0 size-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* Navigation / Back Button */}
        {onBackToSplash && (
          <button
            onClick={onBackToSplash}
            className="mb-4 text-xs font-semibold text-purple-200 hover:text-white flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm w-fit transition-all active:scale-95"
          >
            ← Back to Splash
          </button>
        )}

        <div className="flex items-center gap-3 mb-2">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] p-1 border border-white/20 shadow-md flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/shabab-logo.png"
              alt="Shabab 360 Logo"
              className="size-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Shabab 360</h1>
            <p className="text-xs text-purple-200 font-medium">Youth Operations & Attendance</p>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-white mt-4">Welcome Back</h2>
        <p className="text-xs text-purple-200">Sign in to access your assigned park or portal</p>
      </div>

      {/* ─── Login Form Container ────────────────────────────────────────── */}
      <div className="-mt-8 px-5 z-10 w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl bg-card border border-border/80 shadow-2xl p-6 space-y-5 backdrop-blur-xl"
        >
          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium dark:bg-red-950/40 dark:border-red-800"
              >
                <AlertCircle className="size-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 pl-1">
                Email Address / Phone
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 size-5 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@shabab360.org"
                  className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/50 border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4B0A8F] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pl-1">
                <label className="text-xs font-semibold text-foreground/80">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-[#4B0A8F] dark:text-purple-400 hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 size-5 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-11 rounded-2xl bg-muted/50 border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4B0A8F] focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-1 pl-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-gray-300 text-[#4B0A8F] focus:ring-[#4B0A8F]"
              />
              <label htmlFor="remember" className="text-xs font-medium text-muted-foreground cursor-pointer">
                Keep me signed in on this mobile device
              </label>
            </div>

            {/* Primary Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold text-sm shadow-lg shadow-[#4B0A8F]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Shabab 360</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Account Selector */}
          <div className="pt-3 border-t border-border/60">
            <p className="text-[11px] font-bold text-muted-foreground text-center mb-2.5 uppercase tracking-wider">
              Test Prefill Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleRolePrefill(acc)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left",
                    activeRole === acc.role
                      ? "border-[#4B0A8F] bg-[#F3ECF6] text-[#4B0A8F] dark:bg-purple-950/40 dark:text-purple-300 font-bold"
                      : "border-border/60 bg-muted/30 text-foreground hover:bg-muted/70"
                  )}
                >
                  <ShieldCheck className={cn("size-3.5 shrink-0", activeRole === acc.role ? "text-[#4B0A8F]" : "text-muted-foreground")} />
                  <span className="truncate">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-[11px] text-center text-muted-foreground mt-6 font-medium">
          Protected by Shabab 360 Hierarchy Authorization Engine
        </p>
      </div>
    </div>
  );
}
