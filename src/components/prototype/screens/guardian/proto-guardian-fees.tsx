"use client";

import React from "react";
import { ChevronLeft, Receipt, CreditCard, ExternalLink, CheckCircle2 } from "lucide-react";

interface ProtoGuardianFeesProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoGuardianFees({ onNavigate }: ProtoGuardianFeesProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="pt-12 pb-4 px-4 flex items-center border-b border-border/50 sticky top-0 bg-background z-20">
        <button onClick={() => onNavigate?.("guardian-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-lg ml-2">Fees & Payments</h1>
      </div>

      <div className="flex-1 p-5 space-y-8">
        
        {/* Pending */}
        <section>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Pending Dues</h3>
          <div className="bg-card border-2 border-amber-500/30 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              DUE 12-AUG
            </div>
            <div className="flex items-start gap-4 mb-4 mt-2">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Swimming Activity</h4>
                <p className="text-sm text-muted-foreground">For Muhammad Abdullah</p>
                <p className="text-xl font-extrabold mt-1">PKR 300</p>
              </div>
            </div>
            <div className="bg-muted p-3 rounded-xl text-xs space-y-2 mb-4">
              <p className="font-semibold">Payment Instructions:</p>
              <p className="text-muted-foreground">Please transfer to Bank Al-Falah A/C 123456789 and share the receipt via WhatsApp with the Park Admin.</p>
            </div>
            <button className="w-full h-12 rounded-xl font-bold bg-[#1F0860] text-white flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" />
              <span>Send WhatsApp Message</span>
            </button>
          </div>
        </section>

        {/* History */}
        <section>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Payment History</h3>
          <div className="space-y-3">
            <div className="bg-card border border-border/70 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Term Registration</h4>
                    <p className="text-xs text-muted-foreground">01-Jul-2026</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">PKR 500</p>
                  <p className="text-[10px] text-green-600 font-bold bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full inline-block mt-1">PAID</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border/50 flex justify-end">
                <button className="text-xs font-bold text-[#4B0A8F] dark:text-purple-400 flex items-center gap-1">
                  <Receipt className="w-3 h-3" />
                  View Receipt RCP-001
                </button>
              </div>
            </div>
            
            <div className="bg-card border border-border/70 rounded-2xl p-4 flex flex-col gap-3 opacity-75">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Camp Fee</h4>
                    <p className="text-xs text-muted-foreground">15-Mar-2026</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">PKR 1500</p>
                  <p className="text-[10px] text-green-600 font-bold bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full inline-block mt-1">PAID</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
