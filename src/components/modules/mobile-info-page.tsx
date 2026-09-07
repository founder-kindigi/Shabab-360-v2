"use client";

import { Mail, Phone, ExternalLink, Shield } from "lucide-react";

export function MobileInfoPage() {
  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen w-full bg-background pb-24">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-8">Info</h1>
        
        {/* ─── Brand Card ────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] rounded-[2rem] p-8 text-center shadow-xl shadow-[#4B0A8F]/20 mb-6">
          <div className="size-20 bg-white rounded-3xl mx-auto flex items-center justify-center p-3 shadow-inner mb-6">
            <img src="/shabab-logo.png" alt="Shabab 360 Logo" className="size-full object-contain" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Shabab 360</h2>
          <p className="text-sm font-bold text-purple-200 uppercase tracking-widest">
            Revolutionary Youth Training Program
          </p>
        </div>

        {/* ─── About Section ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm mb-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">About the Program</h3>
          <p className="text-sm text-foreground/80 font-medium leading-relaxed">
            Shabab 360 is a comprehensive youth training and development program designed to nurture the next generation of leaders. Through structured park activities, mashwaras, and continuous evaluation, we aim to build character, skills, and community engagement.
          </p>
          
          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Cohort</p>
              <p className="text-base font-black text-foreground">Batch 4</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Region</p>
              <p className="text-base font-black text-foreground">Lahore</p>
            </div>
          </div>
        </div>

        {/* ─── Help & Support ────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-3xl p-2 shadow-sm space-y-1">
          <a href="mailto:support@shabab360.org" className="flex items-center gap-4 p-4 rounded-2xl active:bg-muted transition-colors">
            <div className="size-10 bg-[#4B0A8F]/10 rounded-xl flex items-center justify-center">
              <Mail className="size-5 text-[#4B0A8F]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Email Support</p>
              <p className="text-xs text-muted-foreground font-medium">Get help with app issues</p>
            </div>
          </a>
          
          <div className="h-px bg-border/50 mx-4" />
          
          <a href="tel:+923000000000" className="flex items-center gap-4 p-4 rounded-2xl active:bg-muted transition-colors">
            <div className="size-10 bg-[#4B0A8F]/10 rounded-xl flex items-center justify-center">
              <Phone className="size-5 text-[#4B0A8F]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Helpline</p>
              <p className="text-xs text-muted-foreground font-medium">Available 9 AM - 5 PM</p>
            </div>
          </a>

          <div className="h-px bg-border/50 mx-4" />
          
          <div className="flex items-center gap-4 p-4 rounded-2xl active:bg-muted transition-colors cursor-pointer">
            <div className="size-10 bg-[#4B0A8F]/10 rounded-xl flex items-center justify-center">
              <Shield className="size-5 text-[#4B0A8F]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Privacy Policy</p>
              <p className="text-xs text-muted-foreground font-medium">Read our data guidelines</p>
            </div>
            <ExternalLink className="size-4 text-muted-foreground" />
          </div>
        </div>

        {/* ─── Footer ────────────────────────────────────────────────────── */}
        <div className="mt-8 text-center">
          <p className="text-xs font-bold text-muted-foreground">Version 2.0.0 (PWA)</p>
          <p className="text-[10px] text-muted-foreground/60 font-medium mt-1">© {new Date().getFullYear()} Shabab 360. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
