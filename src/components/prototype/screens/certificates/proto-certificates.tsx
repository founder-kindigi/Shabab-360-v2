"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Download, Mail, Filter, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNavigate?: (screen: string) => void;
}

const STUDENTS = [
  { id: 1, name: "Muhammad Abdullah", park: "State Life Park", status: "Issued" },
  { id: 2, name: "Hamid Raza", park: "Johar Park", status: "Issued" },
  { id: 3, name: "Zain Ali", park: "Gulberg Park", status: "Pending Sign-off" },
  { id: 4, name: "Usman Tariq", park: "State Life Park", status: "Pending Sign-off" },
];

export function ProtoCertificates({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState("Issued");

  const filtered = STUDENTS.filter(s => s.status === activeTab);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center gap-3">
        <button onClick={() => onNavigate?.("home")} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1F0860] dark:text-white">Certificates</h1>
          <p className="text-xs text-muted-foreground">Graduation & Achievements</p>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-6">
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-[#1F0860] to-[#4B0A8F] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Award className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h2 className="text-sm font-medium text-white/80 uppercase tracking-wider mb-1">Batch 4 Completion</h2>
            <div className="text-4xl font-extrabold mb-4">254 <span className="text-lg font-normal text-white/70">Total Shabab</span></div>
            <div className="flex gap-4">
              <div>
                <div className="text-xl font-bold">210</div>
                <div className="text-xs text-white/70">Issued</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[#D90429]">44</div>
                <div className="text-xs text-white/70">Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Preview */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Template Preview</h3>
          <div className="aspect-[1.414] bg-card border-2 border-border/70 rounded-2xl shadow-sm relative p-4 flex flex-col items-center justify-center text-center overflow-hidden">
            <div className="absolute inset-0 border-8 border-double border-muted/50 m-2 rounded-xl pointer-events-none" />
            <Award className="w-12 h-12 text-[#D90429] mb-4" />
            <h4 className="font-serif text-xl font-bold text-[#1F0860] dark:text-white mb-2">Certificate of Completion</h4>
            <p className="text-xs text-muted-foreground mb-4">Shabab Alburhan Batch 4</p>
            <p className="text-sm font-medium italic mb-2">Awarded to</p>
            <p className="text-lg font-bold border-b border-border pb-1 px-4 mb-4">Muhammad Abdullah</p>
            <div className="flex w-full justify-between px-8 mt-auto text-[10px] text-muted-foreground font-medium">
              <div className="flex flex-col items-center">
                <div className="w-16 h-4 border-b border-muted-foreground/30 mb-1" />
                Program Head
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-4 border-b border-muted-foreground/30 mb-1" />
                City Head
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          {["Issued", "Pending Sign-off"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                activeTab === tab
                  ? "bg-[#D90429] text-white border-[#D90429]"
                  : "bg-card text-foreground border-border/70 hover:bg-muted"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Student List */}
        <div className="flex flex-col gap-3">
          {filtered.map((student, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={student.id}
              className="bg-card border border-border/70 rounded-2xl p-4 flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold">{student.name}</h4>
                <p className="text-xs text-muted-foreground">{student.park}</p>
              </div>
              <div className="flex gap-2">
                <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 text-[#1F0860] dark:text-white">
                  <Download className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 text-[#1F0860] dark:text-white">
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50 z-20">
        <button className="w-full h-12 bg-[#1F0860] hover:bg-[#2a0b80] text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
          <Download className="w-5 h-5" /> Batch Generate PDFs
        </button>
      </div>
    </div>
  );
}
