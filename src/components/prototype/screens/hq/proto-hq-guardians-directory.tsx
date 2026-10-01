"use client";

import React, { useState } from "react";
import { ArrowLeft, Search, Phone, MessageCircle, Users, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtoHqGuardiansDirectoryProps {
  onNavigate?: (screen: string) => void;
}

const GUARDIANS = [
  { id: 1, name: "Br. Ahmad Abdullah", child: "Muhammad Abdullah", childAge: 16, childGroup: "A", phone: "0300-1234567", status: "verified" },
  { id: 2, name: "Br. Tariq Usman", child: "Usman Tariq", childAge: 15, childGroup: "A", phone: "0301-2345678", status: "verified" },
  { id: 3, name: "Br. Ali Hamza", child: "Hamza Ali", childAge: 16, childGroup: "A", phone: "0302-3456789", status: "pending" },
  { id: 4, name: "Br. Hassan Ibrahim", child: "Ibrahim Hassan", childAge: 15, childGroup: "A", phone: "0303-4567890", status: "verified" },
  { id: 5, name: "Br. Mahmood Saad", child: "Saad Mahmood", childAge: 17, childGroup: "A", phone: "0304-5678901", status: "verified" },
];

export function ProtoHqGuardiansDirectory({ onNavigate }: ProtoHqGuardiansDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = GUARDIANS.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.child.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button 
            onClick={() => onNavigate?.("hq")}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Guardians Directory</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search guardians or children..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/50 text-sm"
          />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {filtered.map(guardian => (
          <div key={guardian.id} className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{guardian.name}</h3>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{guardian.phone}</div>
                </div>
              </div>
              {guardian.status === 'verified' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-green-500/10 text-green-600 border border-green-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              )}
            </div>

            <div className="bg-muted/30 rounded-xl p-3 border border-border/50 mb-4">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Linked Shabab</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{guardian.child}</span>
                <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/50">
                  {guardian.childAge} yrs • Group {guardian.childGroup}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button className="h-10 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors border border-border/50">
                <Phone className="w-3.5 h-3.5" />
                Call
              </button>
              <button className="h-10 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors border border-green-500/20">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button className="h-10 rounded-xl bg-[#4B0A8F]/10 text-[#4B0A8F] hover:bg-[#4B0A8F]/20 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors border border-[#4B0A8F]/20">
                <Users className="w-3.5 h-3.5" />
                Children
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
