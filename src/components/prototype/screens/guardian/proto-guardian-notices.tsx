"use client";

import React, { useState } from "react";
import { ChevronLeft, FileText, Check, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProtoGuardianNoticesProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoGuardianNotices({ onNavigate }: ProtoGuardianNoticesProps) {
  const [showConsent, setShowConsent] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <div className="pt-12 pb-4 px-4 flex items-center border-b border-border/50 sticky top-0 bg-background z-20">
        <button onClick={() => onNavigate?.("guardian-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="font-bold text-lg ml-2">Notices & Consent</h1>
      </div>

      <div className="flex-1 p-5 space-y-6">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Action Required</h3>
        
        <AnimatePresence mode="wait">
          {!showConsent && !isSigned ? (
            <motion.div 
              key="alert"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => setShowConsent(true)}
              className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 shadow-sm active:scale-95 transition-transform cursor-pointer"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-100">Swimming Activity Consent</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Required by 12-Aug for Muhammad Abdullah</p>
                </div>
              </div>
              <button className="w-full bg-amber-600 text-white font-bold h-10 rounded-xl text-sm">
                Review & Sign
              </button>
            </motion.div>
          ) : showConsent && !isSigned ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm space-y-4"
            >
              <div className="border-b border-border/50 pb-4">
                <h2 className="font-bold text-lg mb-1">Swimming Activity Consent</h2>
                <p className="text-sm text-muted-foreground">Please read carefully before signing</p>
              </div>
              
              <div className="space-y-3 text-sm">
                <p><strong>Date:</strong> Saturday, 15-Aug-2026</p>
                <p><strong>Venue:</strong> Model Town Club Pool</p>
                <p><strong>Details:</strong> The shabab will participate in a guided swimming session supervised by certified instructors and Murabbis.</p>
                <p className="text-muted-foreground italic bg-muted p-3 rounded-lg">
                  "I acknowledge the risks associated with this activity and confirm my child is fit to participate."
                </p>
              </div>

              <label className="flex items-start gap-3 py-2">
                <input 
                  type="checkbox" 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-[#4B0A8F] focus:ring-[#4B0A8F]"
                />
                <span className="text-sm font-medium">I give consent for Muhammad Abdullah to participate.</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowConsent(false)}
                  className="flex-1 h-12 rounded-xl font-bold border border-border/70 hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  disabled={!agreed}
                  onClick={() => setIsSigned(true)}
                  className="flex-1 h-12 rounded-xl font-bold bg-[#1F0860] text-white disabled:opacity-50 transition-colors"
                >
                  Submit Consent
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {isSigned && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3 text-green-800 dark:text-green-300"
          >
            <Check className="w-5 h-5" />
            <span className="text-sm font-bold">Swimming consent submitted successfully.</span>
          </motion.div>
        )}

        <div className="pt-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Past Notices</h3>
          <div className="space-y-3">
            {[
              { title: "Term 1 Registration", date: "01-Jul-2026" },
              { title: "Sports Gala Participation", date: "15-Jun-2026" },
              { title: "Emergency Contact Update", date: "10-Jun-2026" }
            ].map((notice, i) => (
              <div key={i} className="bg-card border border-border/70 rounded-2xl p-4 flex items-center justify-between opacity-75">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{notice.title}</h4>
                    <p className="text-xs text-muted-foreground">{notice.date}</p>
                  </div>
                </div>
                <Check className="w-5 h-5 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
