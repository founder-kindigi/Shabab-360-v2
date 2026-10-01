"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Mail, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtoLoginProps {
  onNavigate?: (screen: string) => void;
  onSuccess?: () => void;
  onBackToSplash?: () => void;
  onForgotPassword?: () => void;
}

const ROLES = [
  "Program Head", "City Head", "Park Lead", "Park Admin", "Murabbi", "Guardian", "Shabab"
];

export function ProtoLogin({ onNavigate, onSuccess, onBackToSplash, onForgotPassword }: ProtoLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setEmail(`${role.toLowerCase().replace(" ", ".")}@demo.com`);
    setPassword("demo123");
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
      {/* Top Bar Gradient */}
      <div className="bg-gradient-to-r from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-12 pb-6 px-4 flex items-center justify-between text-white rounded-b-3xl shrink-0 shadow-md">
        <button onClick={() => (onBackToSplash ? onBackToSplash() : onNavigate?.("splash"))} className="p-2 active:bg-white/10 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg tracking-wide">Shabab 360</span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold mb-2 text-[#1F0860] dark:text-white">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to continue</p>
        </div>

        {/* Roles Horizontal Scroll */}
        <div className="mb-8 -mx-6 px-6 overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-2 w-max">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                  selectedRole === role
                    ? "bg-[#4B0A8F] text-white border-[#4B0A8F]"
                    : "bg-card border-border/70 text-foreground hover:bg-muted"
                )}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-xl border border-border/70 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 rounded-xl border border-border/70 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-8">
          <button 
            onClick={() => (onForgotPassword ? onForgotPassword() : onNavigate?.("forgot-password"))}
            className="text-sm font-semibold text-[#D90429] hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <button
          onClick={() => {
            if (onSuccess) onSuccess();
            else if (selectedRole === "Guardian") onNavigate?.("guardian-dashboard");
            else if (selectedRole === "Shabab") onNavigate?.("student-dashboard");
            else onNavigate?.("hq-dashboard");
          }}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#4B0A8F] to-[#D90429] text-white font-extrabold text-lg shadow-lg active:scale-95 transition-transform"
        >
          Sign In
        </button>

        <div className="mt-auto pt-8">
          <div className="bg-card border border-border/70 p-4 rounded-2xl text-center text-sm text-muted-foreground shadow-sm">
            Select a role above to auto-fill demo credentials
          </div>
        </div>
      </div>
    </div>
  );
}
