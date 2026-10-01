"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, MessageCircle, Calendar as CalendarIcon, User, MapPin, X } from "lucide-react";

interface Props {
  onNavigate?: (screen: string) => void;
}

export function ProtoCallingDetail({ onNavigate }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center gap-3">
        <button onClick={() => onNavigate?.("home")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1F0860] dark:text-white">Lead Interaction</h1>
          <p className="text-xs text-muted-foreground">Admissions Pipeline</p>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6">
        {/* Profile Card */}
        <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Asad Khalil</h2>
              <p className="text-sm text-muted-foreground">Guardian (Father)</p>
            </div>
            <span className="inline-flex items-center text-[11px] font-bold px-3 py-1 rounded-full border bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
              Interview Confirmed
            </span>
          </div>

          <div className="bg-muted/50 rounded-2xl p-4 flex flex-col gap-3 text-sm mb-4">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-[#4B0A8F]" />
              <span className="font-medium">Applicant: Hamid Nawaz</span>
              <span className="text-muted-foreground ml-auto">Grade 9th</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#4B0A8F]" />
              <span className="font-medium">0320-1111111</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-[#4B0A8F]" />
              <span className="font-medium text-muted-foreground">State Life Society, Lahore</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button className="h-11 bg-card border border-border/70 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors">
              <Phone className="w-4 h-4" /> Call
            </button>
            <button 
              onClick={() => setDrawerOpen(true)}
              className="h-11 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#25D366]/20 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </div>

        {/* History Timeline */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Interaction History</h3>
          <div className="relative pl-6 border-l-2 border-muted-foreground/20 flex flex-col gap-6">
            
            {/* Timeline Item 1 */}
            <div className="relative">
              <div className="absolute -left-[31px] bg-background p-1">
                <div className="w-3 h-3 rounded-full bg-[#1F0860]" />
              </div>
              <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-sm">Call 2 (Connected)</span>
                  <span className="text-xs text-muted-foreground">2026-08-03</span>
                </div>
                <p className="text-sm text-foreground/90 mb-3">
                  Spoke with father. Confirmed interview slot for Sunday 10-Aug 10:00 AM.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-muted px-2 py-1 rounded font-medium">Outcome: Interview Confirmed</span>
                  <span className="bg-muted px-2 py-1 rounded font-medium">Caller: Br. Zain</span>
                </div>
              </div>
            </div>

            {/* Timeline Item 2 */}
            <div className="relative">
              <div className="absolute -left-[31px] bg-background p-1">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
              </div>
              <div className="bg-card/50 border border-border/50 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-sm text-muted-foreground">Call 1 (No Answer)</span>
                  <span className="text-xs text-muted-foreground">2026-08-01</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  No answer. Left SMS template.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-muted px-2 py-1 rounded text-muted-foreground font-medium">Caller: Br. Zain</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50 flex flex-col gap-3 z-20">
        <button className="w-full h-12 bg-[#1F0860] text-white rounded-2xl font-bold flex items-center justify-center gap-2">
          <Phone className="w-4 h-4" /> Log New Call
        </button>
        <button className="w-full h-12 bg-muted text-foreground rounded-2xl font-bold flex items-center justify-center gap-2 border border-border/50">
          <CalendarIcon className="w-4 h-4" /> Schedule Interview Slot
        </button>
      </div>

      {/* WhatsApp Templates Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl p-6 z-50 border-t border-border shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Send WhatsApp Template</h3>
                <button onClick={() => setDrawerOpen(false)} className="p-2 bg-muted rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  "Interview Invite & Location Pin", 
                  "Follow-up Reminder", 
                  "Orientation Information"
                ].map((template, i) => (
                  <button key={i} className="w-full p-4 bg-card border border-border/70 rounded-2xl text-left font-semibold flex justify-between items-center hover:bg-muted transition-colors">
                    {template}
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
