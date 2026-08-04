"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNavigate?: (screen: string) => void;
}

export function ProtoPublicApplication({ onNavigate }: Props) {
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-background items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border/70 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Jazakallah for applying. Your application reference is:
          </p>
          <div className="bg-muted py-3 px-6 rounded-xl font-mono text-lg font-bold tracking-wider mb-8">
            #ADM-2026-089
          </div>
          <button
            onClick={() => onNavigate?.("home")}
            className="w-full h-12 bg-[#1F0860] text-white rounded-2xl font-bold"
          >
            Return to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center gap-3">
        <button onClick={() => step > 1 ? prevStep() : onNavigate?.("home")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#1F0860] dark:text-white">Admissions Form</h1>
          <p className="text-xs text-muted-foreground">Shabab Alburhan Batch 5</p>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-md w-full mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1 relative z-10">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                  step >= i ? "bg-[#D90429] border-[#D90429] text-white" : "bg-card border-border text-muted-foreground"
                )}>
                  {i}
                </div>
              </div>
            ))}
            <div className="absolute left-10 right-10 h-0.5 bg-border top-[88px] -z-0">
              <div 
                className="h-full bg-[#D90429] transition-all duration-300"
                style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase px-1">
            <span>Candidate</span>
            <span>Guardian</span>
            <span>Education</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                <h2 className="text-xl font-bold mb-2">1. Candidate Info</h2>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Candidate Full Name</label>
                  <input required type="text" className="w-full h-12 px-4 rounded-xl border border-input bg-transparent" placeholder="Enter full name" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Age</label>
                  <input required type="number" className="w-full h-12 px-4 rounded-xl border border-input bg-transparent" placeholder="Years" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Mobile Number (Optional)</label>
                  <input type="tel" className="w-full h-12 px-4 rounded-xl border border-input bg-transparent" placeholder="03XX-XXXXXXX" />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                <h2 className="text-xl font-bold mb-2">2. Guardian Info</h2>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Guardian Name (Father/Mother)</label>
                  <input required type="text" className="w-full h-12 px-4 rounded-xl border border-input bg-transparent" placeholder="Guardian name" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Guardian Mobile Number</label>
                  <input required type="tel" className="w-full h-12 px-4 rounded-xl border border-input bg-transparent" placeholder="03XX-XXXXXXX" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">City & Preferred Park</label>
                  <select required className="w-full h-12 px-4 rounded-xl border border-input bg-transparent">
                    <option value="">Select a location...</option>
                    <option value="lahore-statelife">Lahore - State Life Park</option>
                    <option value="lahore-gulberg">Lahore - Gulberg</option>
                    <option value="karachi-johar">Karachi - Johar</option>
                  </select>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                <h2 className="text-xl font-bold mb-2">3. Education Details</h2>
                <div className="space-y-1">
                  <label className="text-sm font-medium">School Name</label>
                  <input required type="text" className="w-full h-12 px-4 rounded-xl border border-input bg-transparent" placeholder="Current school" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Grade / Class</label>
                  <select required className="w-full h-12 px-4 rounded-xl border border-input bg-transparent">
                    <option value="">Select grade...</option>
                    <option value="8">8th Grade</option>
                    <option value="9">9th Grade</option>
                    <option value="10">10th Grade</option>
                    <option value="11">11th Grade / O Levels</option>
                    <option value="12">12th Grade / A Levels</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Reference (How did you hear about us?)</label>
                  <input type="text" className="w-full h-12 px-4 rounded-xl border border-input bg-transparent" placeholder="Social Media, Friend, etc." />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50">
        <div className="max-w-md mx-auto flex gap-3">
          {step < 3 ? (
            <button 
              type="button"
              onClick={nextStep}
              className="flex-1 h-12 bg-[#1F0860] text-white rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              type="button"
              onClick={handleSubmit}
              className="flex-1 h-12 bg-[#D90429] text-white rounded-2xl font-bold shadow-lg"
            >
              Submit Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
