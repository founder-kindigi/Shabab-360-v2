"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Phone, Activity, FileWarning, ShieldAlert, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNavigate?: (screen: string) => void;
}

export function ProtoSafetyMedical({ onNavigate }: Props) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24">
      <header className="sticky top-0 z-10 bg-[#D90429] text-white px-4 py-4 flex items-center gap-3 shadow-md">
        <button onClick={() => onNavigate?.("home")} className="p-2 -ml-2 rounded-full hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Safety & Safeguarding</h1>
          <p className="text-xs text-white/80">Participant Medical Records</p>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6">
        {/* Selected Student Medical Card */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Medical Profile</h2>
          <div className="bg-card border-2 border-border/70 rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4B0A8F] to-[#D90429] text-white flex items-center justify-center font-bold">
                  MA
                </div>
                <div>
                  <h3 className="font-bold">Muhammad Abdullah</h3>
                  <p className="text-xs text-muted-foreground">State Life Park</p>
                </div>
              </div>
              <div className="text-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-xl font-bold">
                <span className="text-[10px] uppercase block leading-none mb-1 opacity-80">Blood</span>
                B+
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Medical Notes / Allergies</h4>
                  <p className="text-sm text-muted-foreground">None reported in current record.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Emergency Contact</h4>
                  <p className="text-sm text-foreground">Br. Ahmad Abdullah (Father)</p>
                  <p className="text-sm font-medium text-[#1F0860] dark:text-blue-400">0300-1234567</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Guardian Consents</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                      Swimming ✓
                    </span>
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                      Hiking Trip ✓
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full mt-5 h-10 bg-muted text-foreground border border-border/70 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-muted-foreground/10">
              <PenLine className="w-4 h-4" /> Update Emergency Info
            </button>
          </div>
        </div>

        {/* First Aid POC */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">Assembly & First Aid POC</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">Br. Usman Ali (Park Lead)</p>
          </div>
        </div>

        {/* Incident Report Form */}
        <div className="mt-4">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl overflow-hidden">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 flex items-start gap-3">
              <FileWarning className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-red-900 dark:text-red-200">Safeguarding Incident Report</h4>
                <p className="text-xs text-red-700 dark:text-red-300/80 leading-tight mt-1">
                  Confidential reports are escalated directly to the central safety committee per policy.
                </p>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <input type="text" placeholder="Incident Type (e.g. Injury, Disciplinary)" className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm" />
              <textarea placeholder="Describe incident briefly..." className="w-full p-3 rounded-xl border border-input bg-background text-sm min-h-[80px]" />
              <button className="w-full h-11 bg-[#D90429] text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-2">
                <AlertTriangle className="w-4 h-4" /> Submit Confidential Report
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
