"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MapPin, Target, Dumbbell, BookOpen, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNavigate?: (screen: string) => void;
}

const FAQS = [
  { q: "Who can apply?", a: "Batch 5 is open for boys currently enrolled in Grades 9 to 12. Exceptional 8th graders may be considered upon interview." },
  { q: "What is the cost?", a: "The program is heavily subsidized. A nominal monthly commitment fee applies to cover materials and park activities." },
  { q: "Weekend schedule?", a: "Activities usually take place on Sunday mornings (8 AM - 11 AM) at your designated local park." },
];

export function ProtoPublicHome({ onNavigate }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground">
      {/* Navbar */}
      <header className="flex items-center justify-between p-4 sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D90429] to-[#4B0A8F] flex items-center justify-center text-white font-bold text-xs">
            SA
          </div>
          <span className="font-bold text-[#1F0860] dark:text-white tracking-tight">Shabab Alburhan</span>
        </div>
        <button 
          onClick={() => onNavigate?.("login")}
          className="px-4 py-1.5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          Portal Login
        </button>
      </header>

      <main className="flex-1 pb-24">
        {/* Hero */}
        <section className="relative px-4 py-12 flex flex-col items-center text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#4B0A8F]/5 to-background z-0" />
          <div className="relative z-10 flex flex-col items-center">
            <span className="inline-flex items-center text-[11px] font-bold px-3 py-1 rounded-full border border-[#D90429]/30 bg-[#D90429]/10 text-[#D90429] mb-6 uppercase tracking-widest">
              Admissions Open
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#1F0860] dark:text-white leading-tight mb-4">
              Empowering Youth with <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D90429] to-[#4B0A8F]">
                Character & Purpose
              </span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base mb-8">
              A comprehensive leadership and physical fitness program designed for the next generation of confident, responsible young men.
            </p>
          </div>
        </section>

        {/* Admissions Teaser */}
        <section className="px-4 mb-12">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-[#1F0860] to-[#4B0A8F] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Target className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-2">Batch 5 Registration Opening Soon</h2>
              <p className="text-white/80 text-sm mb-6 max-w-[80%]">For Boys (Grades 9-12). Secure your spot for the upcoming cohort.</p>
              <button 
                onClick={() => onNavigate?.("application")}
                className="bg-white text-[#1F0860] px-6 h-11 rounded-full font-bold text-sm shadow-sm hover:bg-white/90 transition-colors flex items-center gap-2"
              >
                Apply For Batch 5
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* Pillars */}
        <section className="px-4 mb-12">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 text-center">Program Pillars</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: BookOpen, title: "Character Development", desc: "Tadreeb modules focusing on ethics and responsibility." },
              { icon: Target, title: "Practical Skills", desc: "Leadership, communication, and real-world problem solving." },
              { icon: Dumbbell, title: "Physical Fitness", desc: "Sports, outdoor survival, and team-building exercises." },
            ].map((pillar, i) => (
              <div key={i} className="bg-card border border-border/70 rounded-2xl p-5 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#D90429]/10 flex items-center justify-center mb-4">
                  <pillar.icon className="w-6 h-6 text-[#D90429]" />
                </div>
                <h4 className="font-bold mb-2">{pillar.title}</h4>
                <p className="text-sm text-muted-foreground">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Locations */}
        <section className="px-4 mb-12">
          <div className="bg-muted/50 rounded-3xl p-6 border border-border/50 text-center">
            <MapPin className="w-8 h-8 text-[#4B0A8F] mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-2">Operating Cities</h3>
            <p className="text-sm text-muted-foreground mb-4">Currently active parks and training centers in:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Lahore", "Karachi", "Islamabad"].map(city => (
                <span key={city} className="px-4 py-1.5 bg-background border border-border rounded-full text-sm font-medium shadow-sm">
                  {city}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4">
          <h3 className="text-xl font-bold mb-4 text-center">Frequently Asked Questions</h3>
          <div className="flex flex-col gap-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-card border border-border/70 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-semibold"
                >
                  {faq.q}
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", openFaq === i && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border/30 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50">
        <button 
          onClick={() => onNavigate?.("application")}
          className="w-full h-12 bg-[#D90429] hover:bg-[#b00322] text-white rounded-2xl font-bold shadow-lg transition-colors"
        >
          Apply For Batch 5
        </button>
      </div>
    </div>
  );
}
