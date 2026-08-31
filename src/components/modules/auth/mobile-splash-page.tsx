"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, ShieldCheck, Users, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileSplashPageProps {
  onContinue?: () => void;
  onSelectRole?: (role: string) => void;
}

export function MobileSplashPage({ onContinue, onSelectRole }: MobileSplashPageProps) {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-[#1F0860] via-[#4B0A8F] to-[#2E055B] text-white overflow-hidden p-6 select-none">
      {/* Dynamic Background Glow & Ambient Elements */}
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[50%] bg-gradient-to-br from-[#8A40B0]/30 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[40%] bg-[#4B0A8F]/40 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Geometric Patterns */}
      <div className="absolute top-12 right-6 opacity-10 pointer-events-none">
        <div className="size-32 rounded-full border-4 border-white/40 border-dashed animate-spin-slow" />
      </div>

      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="pt-8 flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
          <Sparkles className="size-4 text-amber-300 animate-pulse" />
          <span className="text-xs font-bold tracking-wider uppercase text-amber-200">Shabab 360 v2</span>
        </div>

        <div className="text-[11px] font-medium text-white/70 bg-black/20 px-2.5 py-1 rounded-lg backdrop-blur-sm">
          Mobile Edition
        </div>
      </motion.div>

      {/* ─── Main Hero Branding & Logo ────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center z-10 my-auto py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, type: "spring", stiffness: 120 }}
          className="relative mb-6"
        >
          {/* Outer glowing ring */}
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-red-500/50 via-purple-500/50 to-indigo-500/50 blur-lg animate-pulse" />
          
          {/* Official Logo Container */}
          <div className="relative size-28 rounded-3xl bg-white/10 border-2 border-white/20 shadow-2xl p-2 flex items-center justify-center overflow-hidden backdrop-blur-md">
            <img
              src="/shabab-logo.png"
              alt="Logo"
              className="size-full object-contain drop-shadow-md"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl font-extrabold tracking-tight text-white mb-2"
        >
          شباب 360
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-sm font-medium text-purple-200 max-w-[280px] leading-relaxed mb-6"
        >
          Youth Development, Attendance & Operations Platform
        </motion.p>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold bg-white/10 border border-white/15 px-3 py-1 rounded-full backdrop-blur-sm text-purple-100">
            <CheckCircle2 className="size-3 text-emerald-400" />
            Fast Attendance
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold bg-white/10 border border-white/15 px-3 py-1 rounded-full backdrop-blur-sm text-purple-100">
            <ShieldCheck className="size-3 text-amber-400" />
            Role Scoped
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold bg-white/10 border border-white/15 px-3 py-1 rounded-full backdrop-blur-sm text-purple-100">
            <Users className="size-3 text-sky-400" />
            Real-time Sync
          </span>
        </motion.div>
      </div>

      {/* ─── Bottom Actions ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="w-full space-y-4 z-10 pb-4"
      >
        {/* Main CTA */}
        <button
          onClick={onContinue}
          className="w-full h-14 rounded-2xl bg-white text-[#4B0A8F] font-bold text-base shadow-xl hover:bg-purple-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
        >
          <span>Get Started / Sign In</span>
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>
    </div>
  );
}
