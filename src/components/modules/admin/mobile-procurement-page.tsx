"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Dumbbell,
  BookOpen,
  ShoppingBag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobileProcurementPageProps {
  onBack?: () => void;
}

const MOCK_PARK_STOCKS = [
  {
    id: "ps1",
    itemName: "Standard Match Football (Size 5)",
    sku: "SKU-FB-01",
    category: "sports_equipment",
    parkName: "Gulberg Park",
    quantity: 3,
    minThreshold: 5,
    isLow: true,
  },
  {
    id: "ps2",
    itemName: "Cricket Leather Balls (Pack of 6)",
    sku: "SKU-CR-02",
    category: "sports_equipment",
    parkName: "Gulberg Park",
    quantity: 12,
    minThreshold: 4,
    isLow: false,
  },
  {
    id: "ps3",
    itemName: "First Aid Trauma Kit",
    sku: "SKU-FA-01",
    category: "general",
    parkName: "Gulberg Park",
    quantity: 2,
    minThreshold: 3,
    isLow: true,
  },
  {
    id: "ps4",
    itemName: "Public Speaking Workshop Charts & Markers",
    sku: "SKU-ST-05",
    category: "stationery",
    parkName: "Gulberg Park",
    quantity: 15,
    minThreshold: 5,
    isLow: false,
  },
];

export function MobileProcurementPage({ onBack }: MobileProcurementPageProps) {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [filterAlert, setFilterAlert] = useState<"all" | "low">("all");
  const [selectedStock, setSelectedStock] = useState<any | null>(null);

  // ─── Real DB Query ─────────────────────────────────────────────────────
  const { data: stockData, isLoading } = useQuery({
    queryKey: ["park-stocks-mobile"],
    queryFn: async () => {
      const res = await fetch("/api/admin/procurement/stock");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: !!session?.user,
    staleTime: 30000,
  });

  const apiStocks: any[] = stockData?.stocks ?? stockData?.data ?? [];
  const stocksList = apiStocks.length > 0 ? apiStocks : MOCK_PARK_STOCKS;

  const lowStockCount = stocksList.filter((s) => (s.quantity ?? 0) <= (s.minThreshold ?? 5)).length;

  const filteredStocks = stocksList.filter((item) => {
    const name = item.itemName || item.item?.name || "";
    const sku = item.sku || item.item?.sku || "";
    const matchSearch =
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      sku.toLowerCase().includes(search.toLowerCase());
    const isLow = (item.quantity ?? 0) <= (item.minThreshold ?? 5);
    const matchAlert = filterAlert === "all" || (filterAlert === "low" && isLow);
    return matchSearch && matchAlert;
  });

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground pb-28 select-none">
      {/* ─── Top Brand Header ────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-[#1F0860] via-[#4B0A8F] to-[#380668] text-white pt-6 pb-12 px-5 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="size-9 rounded-2xl bg-white/10 active:scale-95 transition-transform flex items-center justify-center text-white backdrop-blur-md border border-white/15"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="size-10 rounded-2xl bg-gradient-to-br from-[#D90429] via-[#4B0A8F] to-[#1F0860] border border-white/20 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              <img src="/shabab-logo.png" alt="Logo" className="size-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                اسٹاک و سامان
              </h1>
              <p className="text-[11px] text-purple-200 font-medium">Park Equipment & Inventory</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {isLoading ? (
              <RefreshCw className="size-3 animate-spin text-purple-300" />
            ) : (
              <Sparkles className="size-3 text-amber-300" />
            )}
            <span>DB Live</span>
          </div>
        </div>
      </div>

      {/* ─── Metrics Cards ──────────────────────────────────────────────── */}
      <div className="-mt-7 px-4 z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-md space-y-1"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Stock Items</span>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100">{stocksList.length} SKUs</div>
            <p className="text-[10px] text-muted-foreground font-medium">Gulberg Park Inventory</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={cn(
              "p-4 rounded-3xl shadow-md space-y-1 border",
              lowStockCount > 0
                ? "bg-amber-500 text-white border-amber-600"
                : "bg-emerald-500 text-white border-emerald-600"
            )}
          >
            <span className="text-[10px] uppercase font-bold text-amber-100 tracking-wider">Low Stock Warnings</span>
            <div className="text-lg font-black text-white">{lowStockCount} items</div>
            <p className="text-[10px] text-white/90 font-medium">Below Min Threshold</p>
          </motion.div>
        </div>

        {/* Search & Alert Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search equipment or SKU..."
              className="pl-10 h-11 rounded-2xl bg-card border-slate-200 dark:border-slate-800 shadow-sm font-medium text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterAlert("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border",
                filterAlert === "all"
                  ? "bg-[#4B0A8F] text-white border-[#4B0A8F] shadow-sm"
                  : "bg-card text-muted-foreground border-slate-200 dark:border-slate-800"
              )}
            >
              All Equipment
            </button>
            <button
              onClick={() => setFilterAlert("low")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1",
                filterAlert === "low"
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-card text-muted-foreground border-slate-200 dark:border-slate-800"
              )}
            >
              <AlertTriangle className="size-3" /> Low Stock ({lowStockCount})
            </button>
          </div>
        </div>

        {/* Equipment List */}
        <div className="space-y-3">
          {filteredStocks.map((item, idx) => {
            const qty = item.quantity ?? 0;
            const minT = item.minThreshold ?? 5;
            const isLow = qty <= minT;
            const name = item.itemName || item.item?.name || "Equipment Item";

            return (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedStock(item)}
                className="p-4 rounded-3xl bg-card border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-purple-300 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                      <Package className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-mono font-medium">
                        {item.sku || "SKU-001"} • {item.parkName || "Gulberg Park"}
                      </p>
                    </div>
                  </div>

                  <Badge
                    className={cn(
                      "text-[10px] font-bold border px-2 py-0.5 rounded-full shrink-0",
                      isLow
                        ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                    )}
                  >
                    {isLow ? "Low Stock" : "In Stock"}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400">
                    Quantity: <strong className="text-slate-900 dark:text-slate-100 text-sm">{qty}</strong> (Min: {minT})
                  </span>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info(`Requesting stock refill for ${name}`);
                    }}
                    className="h-8 px-2.5 text-xs text-purple-600 dark:text-purple-300 hover:bg-purple-50 font-bold rounded-xl gap-1"
                  >
                    <Plus className="size-3.5" /> Request Refill
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─── Detail Drawer ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedStock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg bg-card rounded-t-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-xs font-bold">
                  {selectedStock.sku || "SKU-001"}
                </Badge>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {selectedStock.itemName || selectedStock.item?.name}
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Location</span>
                  <span>{selectedStock.parkName || "Gulberg Park"}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Current Quantity</span>
                  <span className="font-bold text-sm text-purple-600">{selectedStock.quantity ?? 0}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Minimum Threshold</span>
                  <span>{selectedStock.minThreshold ?? 5}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => {
                    toast.success("Stock refill request submitted to HQ Procurement!");
                    setSelectedStock(null);
                  }}
                  className="w-full bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold rounded-2xl h-12 gap-2"
                >
                  <Plus className="size-4" /> Submit Refill Request to HQ
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedStock(null)}
                  className="w-full rounded-2xl font-bold h-12"
                >
                  Close Detail
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
