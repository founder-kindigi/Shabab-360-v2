"use client";

import React from "react";
import { ChevronLeft, LogOut, Settings, Edit3, MapPin, User, Mail, Phone, Trophy } from "lucide-react";

interface ProtoStudentProfileProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoStudentProfile({ onNavigate }: ProtoStudentProfileProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-10">
      {/* Header Area */}
      <div className="bg-gradient-to-b from-[#1F0860] to-background pt-12 pb-20 px-4 relative">
        <div className="flex justify-between items-center text-white mb-6">
          <button onClick={() => onNavigate?.("student-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button className="p-2 -mr-2 rounded-full hover:bg-white/10">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4B0A8F] to-[#D90429] flex items-center justify-center text-3xl font-extrabold text-white border-4 border-background shadow-xl mb-4">
            MA
          </div>
          <h1 className="text-2xl font-bold text-foreground">Muhammad Abdullah</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Batch 4 • Senior Group</p>
        </div>
      </div>

      <div className="flex-1 px-5 -mt-10 space-y-6">
        
        {/* Info Card */}
        <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-border/50 pb-4">
            <h3 className="font-bold text-lg">Personal Info</h3>
            <button className="text-[#4B0A8F] dark:text-purple-400 p-2">
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Age & Grade</p>
                <p className="font-semibold text-sm">16 Years • 10th Grade</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Park & City</p>
                <p className="font-semibold text-sm">State Life Park • Lahore</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-semibold text-sm">m.abdullah@demo.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Programme Progress */}
        <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm">
          <h3 className="font-bold mb-4">Programme Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Week 18</span>
              <span className="text-muted-foreground">24 Weeks Total</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#4B0A8F] to-[#D90429] w-[75%]" />
            </div>
          </div>
        </div>

        {/* Teams & Roles */}
        <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm">
          <h3 className="font-bold mb-4">Teams & Roles</h3>
          <div className="flex flex-wrap gap-2">
            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Tadreeb Team
            </div>
            <div className="bg-muted px-3 py-1.5 rounded-lg text-sm font-semibold">
              Event Volunteer
            </div>
          </div>
        </div>

        {/* Logout */}
        <button 
          onClick={() => onNavigate?.("login")}
          className="w-full h-14 rounded-2xl border-2 border-red-500/20 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>

      </div>
    </div>
  );
}
