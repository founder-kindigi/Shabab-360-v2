"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useAppStore } from "@/stores/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, Shield, Lock, Mail } from "lucide-react";

// Shake animation keyframes
const shakeVariants = {
  initial: { x: 0 },
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};

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

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { setUserRole, navigateTo } = useAppStore();

  function handleQuickLogin(accountEmail: string) {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setError("");
    // Use setTimeout to ensure state updates before submit
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        triggerShake();
        return;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F3ECF6] via-[#F3F1F4] to-[#F5E8EF] dark:from-[#150540] dark:via-background dark:to-[#2A1528] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#A0006B33] dark:bg-[#A0006B1A] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[#A0006B33] dark:bg-[#A0006B1A] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#4B0A8F1A] dark:bg-[#4B0A8F0D] blur-3xl" />
      </div>

      {/* Subtle geometric pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234B0A8F' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            whileHover={{ scale: 1.05 }}
            className="relative cursor-default"
          >
            <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-[#2A0C8F] via-[#A0006B] to-[#FF0015] text-white font-bold text-2xl mb-4 shadow-xl shadow-[#4B0A8F] transition-shadow duration-300 hover:shadow-[#A0006B] hover:shadow-2xl">
              S
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-[#A0006B33] blur-xl -z-10 transition-opacity duration-300 group-hover:opacity-100" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Shabab360
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-sm text-muted-foreground mt-1.5"
          >
            Program Operations Platform
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            variants={shakeVariants}
            animate={shaking ? "shake" : "initial"}
          >
            <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/5 backdrop-blur-sm bg-card/80">
              <CardHeader className="pb-2 pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="rounded-xl bg-[#F3ECF6] dark:bg-[#1F086080] p-2.5 mb-3">
                    <Shield className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
                  </div>
                  <h2 className="text-lg font-semibold">Welcome Back</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your credentials to access your account
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@shabab360.pk"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        autoComplete="email"
                        autoFocus
                        className="pl-9 h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        autoComplete="current-password"
                        className="pl-9 pr-10 h-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, height: 0, y: -8 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3.5 py-2.5">
                          <p className="text-sm text-destructive">{error}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-br from-[#2A0C8F] via-[#A0006B] to-[#FF0015] hover:opacity-90 text-white font-medium shadow-md shadow-[#4B0A8F4D] transition-all duration-200"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => navigateTo("reset-password")}
                      className="text-xs text-muted-foreground hover:text-[#4B0A8F] dark:hover:text-[#8A40B0] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Demo Accounts Quick Login */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowDemo(!showDemo)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
                    >
                      Demo Accounts
                      <motion.span
                        animate={{ rotate: showDemo ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        ▾
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {showDemo && (
                        <motion.div
                          key="demo-accounts"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="bg-muted/30 rounded-lg p-3 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {DEMO_ACCOUNTS.map((account) => (
                              <button
                                key={account.email}
                                type="button"
                                disabled={loading}
                                onClick={() => handleQuickLogin(account.email)}
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground/60 mt-8"
        >
          Shabab360 v2 &middot; Built for the Shabab program
        </motion.p>
      </div>
    </div>
  );
}