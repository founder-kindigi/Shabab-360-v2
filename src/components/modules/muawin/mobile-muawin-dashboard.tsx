"use client";
import Image from "next/image";

import { useSession } from "next-auth/react";
import { BookOpen, Info, Settings, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

export function MobileMuawinDashboard() {
  const { data: session } = useSession();
  const { setTheme, resolvedTheme } = useTheme();

  const user = session?.user as any;
  const userName = user?.name || "Muawin";

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-background text-foreground pb-24 select-none">
      <div className="w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#D90429] pt-12 pb-8 rounded-b-[2.5rem] shadow-2xl relative z-10 px-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white/10 border border-white/20 p-1.5 shadow-inner backdrop-blur-sm flex items-center justify-center shrink-0">
              <Image src="/logo-white.png" alt="Logo" width={160} height={160} className="size-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight leading-none text-white">SHABAB 360</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-100 border border-amber-300/30">
                  Muawin
                </span>
              </div>
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-1">
                Assistant Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              {resolvedTheme === "dark" ? <Sun className="size-4 text-amber-300" /> : <Moon className="size-4 text-purple-200" />}
            </button>
            <button className="size-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white relative active:scale-95 transition-transform">
              <Bell className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Assalam-o-Alaikum</h1>
            <p className="text-xs text-purple-200 font-medium mt-0.5">
              {userName}
            </p>
          </div>
        </div>
      </div>

      {user?.assignedParkId ? (
        <div className="px-5 pt-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-16 rounded-3xl bg-[#4B0A8F]/10 text-[#4B0A8F] dark:text-purple-400 flex items-center justify-center">
            <BookOpen className="size-8" />
          </div>
          <h2 className="text-lg font-black text-foreground">Welcome to Shabab 360</h2>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            You have access to approved content modules. Park operations and attendance are restricted for your role.
          </p>
        </div>
      ) : (
        <div className="px-5 pt-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground">
            <Info className="size-8" />
          </div>
          <h2 className="text-lg font-black text-foreground">No assignment yet</h2>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            This account has no park assignment, so no content is available yet. Contact your administrator.
          </p>
        </div>
      )}
    </div>
  );
}
