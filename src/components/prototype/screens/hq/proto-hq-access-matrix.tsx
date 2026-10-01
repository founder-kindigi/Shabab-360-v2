"use client";

import React, { useState } from "react";
import { ArrowLeft, Save, Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtoHqAccessMatrixProps {
  onNavigate?: (screen: string) => void;
}

const ROLES = [
  { id: "super_admin", label: "Super Admin", color: "text-[#D90429] bg-[#D90429]/10" },
  { id: "program_admin", label: "Program Admin", color: "text-[#4B0A8F] bg-[#4B0A8F]/10" },
  { id: "city_head", label: "City Head", color: "text-[#1F0860] bg-[#1F0860]/10" },
  { id: "park_lead", label: "Park Lead", color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30" },
  { id: "park_admin", label: "Park Admin", color: "text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30" },
  { id: "murabbi", label: "Murabbi", color: "text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30" },
  { id: "guardian", label: "Guardian", color: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30" },
  { id: "student", label: "Student", color: "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800" },
];

const CAPABILITIES = [
  { id: "admissions.view", label: "Admissions View", group: "Admissions" },
  { id: "admissions.edit", label: "Admissions Edit", group: "Admissions" },
  { id: "attendance.mark", label: "Attendance Mark", group: "Attendance" },
  { id: "attendance.close", label: "Attendance Close", group: "Attendance" },
  { id: "content.manage", label: "Content Manage", group: "Content" },
  { id: "finance.view", label: "Finance View", group: "Finance" },
  { id: "finance.manage", label: "Finance Manage", group: "Finance" },
  { id: "mashwara.manage", label: "Mashwara Manage", group: "Mashwara" },
  { id: "reports.export", label: "Reports Export", group: "Reports" },
  { id: "access.admin", label: "Access Admin", group: "System" },
];

const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
  super_admin: Object.fromEntries(CAPABILITIES.map(c => [c.id, true])),
  program_admin: { ...Object.fromEntries(CAPABILITIES.map(c => [c.id, true])), "access.admin": false },
  city_head: { "admissions.view": true, "attendance.mark": true, "attendance.close": true, "content.manage": false, "finance.view": true, "finance.manage": false, "mashwara.manage": true, "reports.export": true, "access.admin": false },
  park_lead: { "admissions.view": true, "attendance.mark": true, "attendance.close": true, "content.manage": false, "finance.view": false, "finance.manage": false, "mashwara.manage": true, "reports.export": true, "access.admin": false },
  park_admin: { "admissions.view": true, "admissions.edit": true, "attendance.mark": true, "attendance.close": false, "content.manage": false, "finance.view": true, "finance.manage": true, "mashwara.manage": false, "reports.export": true, "access.admin": false },
  murabbi: { "admissions.view": true, "attendance.mark": true, "attendance.close": false, "content.manage": false, "finance.view": false, "finance.manage": false, "mashwara.manage": false, "reports.export": false, "access.admin": false },
  guardian: { "admissions.view": false, "attendance.mark": false, "attendance.close": false, "content.manage": false, "finance.view": false, "finance.manage": false, "mashwara.manage": false, "reports.export": false, "access.admin": false },
  student: { "admissions.view": false, "attendance.mark": false, "attendance.close": false, "content.manage": false, "finance.view": false, "finance.manage": false, "mashwara.manage": false, "reports.export": false, "access.admin": false },
};

export function ProtoHqAccessMatrix({ onNavigate }: ProtoHqAccessMatrixProps) {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(DEFAULT_MATRIX);
  const [hasChanges, setHasChanges] = useState(false);

  const togglePermission = (roleId: string, capId: string) => {
    if (roleId === "super_admin") return;
    
    setMatrix(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [capId]: !prev[roleId]?.[capId]
      }
    }));
    setHasChanges(true);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate?.("hq")}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Access & Permission Matrix</h1>
            <p className="text-xs text-muted-foreground">Super Admin capability configuration</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 overflow-x-auto">
        <div className="mb-4 flex items-center gap-2">
          <div className="inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-muted/50 border-border/70 text-muted-foreground">
            <AlertCircle className="w-3 h-3 mr-1.5" />
            Last modified 2 days ago by Super Admin
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl overflow-hidden min-w-[800px]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border/70">
                <tr>
                  <th className="p-3 font-semibold text-foreground border-r border-border/50">Capability</th>
                  {ROLES.map(role => (
                    <th key={role.id} className="p-3 font-semibold text-center border-r border-border/50 last:border-r-0">
                      <div className={cn("inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold whitespace-nowrap", role.color)}>
                        {role.label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((cap, idx) => (
                  <tr key={cap.id} className={cn(
                    "border-b border-border/50 hover:bg-muted/30 transition-colors",
                    idx === CAPABILITIES.length - 1 && "border-b-0"
                  )}>
                    <td className="p-3 border-r border-border/50">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{cap.label}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{cap.id}</span>
                      </div>
                    </td>
                    {ROLES.map(role => {
                      const isGranted = matrix[role.id]?.[cap.id] || false;
                      const isSuperAdmin = role.id === "super_admin";
                      
                      return (
                        <td key={`${role.id}-${cap.id}`} className="p-3 text-center border-r border-border/50 last:border-r-0">
                          <button
                            onClick={() => togglePermission(role.id, cap.id)}
                            disabled={isSuperAdmin}
                            className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all",
                              isGranted 
                                ? "bg-[#4B0A8F] text-white" 
                                : "bg-muted text-muted-foreground/30 hover:bg-muted-foreground/10",
                              isSuperAdmin && "opacity-80 cursor-not-allowed"
                            )}
                          >
                            {isGranted ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50">
        <button 
          disabled={!hasChanges}
          className={cn(
            "w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-white transition-all",
            hasChanges 
              ? "bg-gradient-to-r from-[#D90429] to-[#4B0A8F] shadow-lg shadow-[#D90429]/20" 
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
          onClick={() => setHasChanges(false)}
        >
          <Save className="w-5 h-5" />
          Save Matrix Changes
        </button>
      </div>
    </div>
  );
}
