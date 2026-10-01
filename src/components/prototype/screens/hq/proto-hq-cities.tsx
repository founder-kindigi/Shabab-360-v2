"use client";

import { motion } from "framer-motion";
import { 
  Building2, 
  MapPin, 
  Users, 
  Activity,
  Plus,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROTO_CITIES } from "@/components/prototype/data/proto-data";

interface ProtoHqCitiesProps {
  onNavigate?: (screen: string) => void;
}

export function ProtoHqCities({ onNavigate }: ProtoHqCitiesProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border/70 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate?.('hq-dashboard')}
              className="p-2 -ml-2 rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Cities & City Heads</h1>
              <p className="text-xs text-muted-foreground">National Overview</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full bg-[#1F0860]/10 text-[#1F0860] dark:text-[#1F0860]/80 flex items-center justify-center hover:bg-[#1F0860]/20 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <motion.div 
        className="flex-1 p-4 space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {PROTO_CITIES.map((city) => (
          <motion.div 
            key={city.id} 
            variants={itemVariants}
            className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1F0860]/20 to-[#4B0A8F]/20 flex items-center justify-center text-[#1F0860] border border-[#1F0860]/10">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{city.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {city.head}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-secondary/50 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold uppercase">Parks</span>
                </div>
                <span className="font-bold">{city.parks}</span>
              </div>
              <div className="bg-secondary/50 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold uppercase">Shabab</span>
                </div>
                <span className="font-bold">{city.shabab}</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Attendance Rate
                </span>
                <span className="font-bold">{city.activeRate}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-4">
                <div 
                  className={cn(
                    "h-full rounded-full",
                    city.activeRate >= 85 ? "bg-emerald-500" : city.activeRate >= 80 ? "bg-[#4B0A8F]" : "bg-amber-500"
                  )} 
                  style={{ width: `${city.activeRate}%` }}
                />
              </div>
              
              <button className="w-full h-11 flex items-center justify-center gap-2 bg-secondary/80 hover:bg-secondary text-foreground font-semibold rounded-xl transition-colors">
                View City Details
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
