"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface ShababBrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textClassName?: string;
}

export function ShababBrandLogo({
  className,
  size = "md",
  showText = false,
  textClassName,
}: ShababBrandLogoProps) {
  const sizeMap = {
    sm: "size-8",
    md: "size-11",
    lg: "size-16",
    xl: "size-24",
  };

  const pxMap = {
    sm: 32,
    md: 44,
    lg: 64,
    xl: 96,
  };

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden shadow-lg border border-white/20 bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] shrink-0 p-1 flex items-center justify-center",
          sizeMap[size]
        )}
      >
        <Image
          src="/shabab-logo.png"
          alt="Shabab 360 Logo"
          width={pxMap[size]}
          height={pxMap[size]}
          className="object-contain size-full"
          priority
        />
      </div>

      {showText && (
        <div className={cn("flex flex-col", textClassName)}>
          <span className="text-base font-black tracking-tight text-white leading-none">
            SHABAB <span className="text-amber-300 font-extrabold">360</span>
          </span>
          <span className="text-[10px] font-bold text-purple-200 uppercase tracking-widest mt-0.5">
            شباب ۳۶۰
          </span>
        </div>
      )}
    </div>
  );
}
