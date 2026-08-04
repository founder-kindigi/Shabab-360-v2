"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Home,
  CheckSquare,
  PhoneCall,
  Calendar,
  User,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobilePwaShellProps {
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  showBottomNav?: boolean;
}

export function MobilePwaShell({
  children,
  activeTab = "home",
  onTabChange,
  showBottomNav = true,
}: MobilePwaShellProps) {
  const navItems = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "roster", label: "Attendance", icon: CheckSquare },
    { id: "calling", label: "Calls", icon: PhoneCall },
    { id: "events", label: "Events", icon: Calendar },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col justify-between select-none font-sans antialiased overflow-x-hidden">
      {/* ─── Main Viewport Area ─────────────────────────────────────────── */}
      <main className="flex-1 w-full pb-20 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full"
        >
          {children}
        </motion.div>
      </main>

      {/* ─── Floating PWA Bottom Navigation Bar (Mobile / PWA) ───────────── */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/85 backdrop-blur-xl border-t border-border/70 px-4 py-2 flex items-center justify-around shadow-2xl max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange && onTabChange(item.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all duration-200 relative",
                  isActive
                    ? "text-[#4B0A8F] dark:text-purple-300 font-bold scale-105"
                    : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="pwa-nav-active-pill"
                    className="absolute inset-0 bg-[#4B0A8F]/10 dark:bg-purple-400/15 rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={cn("size-5 transition-transform", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
