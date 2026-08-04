"use client";

import React, { useState } from "react";
import { ChevronLeft, Mail, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProtoForgotPasswordProps {
  onNavigate?: (screen: string) => void;
  onBackToLogin?: () => void;
}

export function ProtoForgotPassword({ onNavigate, onBackToLogin }: ProtoForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);

  const goBack = () => (onBackToLogin ? onBackToLogin() : onNavigate?.("login"));

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Top Bar */}
      <div className="pt-12 pb-4 px-4 flex items-center border-b border-border/50">
        <button onClick={goBack} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-lg ml-2">Reset Password</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col">
        <AnimatePresence mode="wait">
          {!isSent ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col"
            >
              <p className="text-muted-foreground mb-8 text-base">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div className="relative mb-8">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 rounded-xl border border-border/70 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
                />
              </div>

              <button
                onClick={() => setIsSent(true)}
                disabled={!email}
                className="w-full h-14 rounded-2xl bg-[#1F0860] disabled:opacity-50 text-white font-bold text-lg shadow-md active:scale-95 transition-all mt-auto mb-8"
              >
                Send Reset Link
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center pb-20"
            >
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check your email</h2>
              <p className="text-muted-foreground mb-8 px-4">
                We've sent a password reset link to <br/>
                <span className="font-semibold text-foreground">{email}</span>
              </p>

              <button
                onClick={() => onNavigate?.("login")}
                className="w-full max-w-[280px] h-14 rounded-xl border border-border/70 font-bold hover:bg-muted transition-colors"
              >
                Back to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
