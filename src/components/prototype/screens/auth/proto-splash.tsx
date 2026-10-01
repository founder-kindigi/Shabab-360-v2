"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtoSplashProps {
  onNavigate?: (screen: string) => void;
  onContinue?: () => void;
}

export function ProtoSplash({ onNavigate, onContinue }: ProtoSplashProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] relative overflow-hidden">
      {/* Animated pulse ring */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/10 blur-3xl"
      />

      <div className="flex-1 flex flex-col items-center justify-center z-10 px-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl size-28 flex items-center justify-center p-4 mb-8"
        >
          {/* Logo placeholder if actual image is missing */}
          <div className="w-full h-full bg-white/20 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-3xl">360</span>
          </div>
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl font-extrabold text-white mb-2"
        >
          Shabab 360
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-purple-200 text-center font-medium"
        >
          Alburhan Youth Programme
        </motion.p>
      </div>

      <motion.div 
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="w-full px-6 pb-12 z-10 flex flex-col items-center gap-6"
      >
        <button
          onClick={() => (onContinue ? onContinue() : onNavigate?.("login"))}
          className="w-full bg-white/10 backdrop-blur-xl border border-white/20 text-white h-14 rounded-2xl flex items-center justify-between px-6 font-bold text-lg active:scale-95 transition-transform"
        >
          <span>Login to your workspace</span>
          <ChevronRight className="w-6 h-6" />
        </button>

        <span className="text-white/50 text-sm font-medium">v2.0 Prototype</span>
      </motion.div>
    </div>
  );
}
