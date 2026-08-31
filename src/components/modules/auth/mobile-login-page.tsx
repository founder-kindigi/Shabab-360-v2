"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface MobileLoginPageProps {
  onSuccess?: () => void;
  onBackToSplash?: () => void;
  initialRolePrefill?: string;
}

export function MobileLoginPage({ onSuccess, onBackToSplash }: MobileLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Restore remember-me email only if previously saved locally
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("shabab360-remember-email");
      const savedRemember = localStorage.getItem("shabab360-remember-me");
      if (savedRemember === "true" && savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem("shabab360-remember-email", trimmedEmail);
        localStorage.setItem("shabab360-remember-me", "true");
      } else {
        localStorage.removeItem("shabab360-remember-email");
        localStorage.removeItem("shabab360-remember-me");
      }

      const res = await signIn("credentials", {
        email: trimmedEmail,
        password,
        redirect: false,
      });

      if (!res || res.error || !res.ok) {
        setError("Invalid email or password.");
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.assign("/pwa");
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <div className="size-12 rounded-2xl bg-white/10 p-1.5 border border-white/20 shadow-md flex items-center justify-center overflow-hidden shrink-0 backdrop-blur-md">
            <img
              src="/shabab-logo.png"
              alt="Logo"
              className="size-full object-contain"
            />
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mt-1">Welcome Back</h1>
        <p className="text-xs text-purple-200 font-medium mt-1">
          Sign in to access your assigned park or portal
        </p>
      </div>

      {/* ─── Login Card Form ──────────────────────────────────────────────── */}
      <div className="-mt-8 px-5 z-10 w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl p-6 shadow-xl border border-border/80 space-y-5"
        >
          {/* Error Message Box */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold"
                role="alert"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-foreground pl-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@shabab360.pk"
                  required
                  autoComplete="email"
                  className="w-full h-12 rounded-2xl bg-muted/40 border border-border pl-10 pr-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/40 focus:border-[#4B0A8F]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pl-1">
                <label htmlFor="password" className="text-xs font-bold text-foreground">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full h-12 rounded-2xl bg-muted/40 border border-border pl-10 pr-10 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/40 focus:border-[#4B0A8F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
        </motion.div>

        {/* Footer */}
        <p className="text-[11px] text-center text-muted-foreground mt-6 font-medium">
          Protected by Shabab 360 Hierarchy Authorization Engine
        </p>
      </div>
    </div>
  );
}
