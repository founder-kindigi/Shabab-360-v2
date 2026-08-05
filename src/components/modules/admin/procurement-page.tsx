"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  BookOpen,
  ShoppingBag,
  Truck,
  Building2,
  Check,
  X,
  Eye,
  Loader2,
  Layers,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ParkStockRecord {
  id: string;
  sku: string;
  itemName: string;
  category: "sports_equipment" | "stationery" | "apparel" | "event_materials" | "general";
  parkName: string;
  quantity: number;
  minThreshold: number;
  unitCost: number;
  unit: string;
}

interface StockRequestRecord {
  id: string;
  parkName: string;
  itemName: string;
  sku: string;
  quantity: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  requestedBy: string;
  createdAt: string;
}

interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  supplierName: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: "issued" | "received" | "cancelled";
  issuedBy: string;
  createdAt: string;
}

const MOCK_PARK_STOCKS: ParkStockRecord[] = [
  {
    id: "ps1",
    sku: "SKU-FB-01",
    itemName: "Standard Match Football (Size 5)",
    category: "sports_equipment",
    parkName: "Gulberg Park",
    quantity: 3,
    minThreshold: 5,
    unitCost: 1200,
    unit: "piece",
  },
  {
    id: "ps2",
    sku: "SKU-CR-02",
    itemName: "Cricket Leather Balls (Pack of 6)",
    category: "sports_equipment",
    parkName: "Gulberg Park",
    quantity: 12,
    minThreshold: 4,
    unitCost: 2500,
    unit: "pack",
  },
  {
    id: "ps3",
    sku: "SKU-FA-01",
    itemName: "First Aid Trauma Kit",
    category: "general",
    parkName: "Gulberg Park",
    quantity: 2,
    minThreshold: 3,
    unitCost: 3500,
    unit: "set",
  },
  {
    id: "ps4",
    sku: "SKU-ST-05",
    itemName: "Public Speaking Workshop Markers & Charts",
    category: "stationery",
    parkName: "Gulberg Park",
    quantity: 15,
    minThreshold: 5,
    unitCost: 450,
    unit: "pack",
  },
  {
    id: "ps5",
    sku: "SKU-VB-01",
    itemName: "Volleyball Net & Posts",
    category: "sports_equipment",
    parkName: "Griffin Park",
    quantity: 1,
    minThreshold: 2,
    unitCost: 4500,
    unit: "set",
  },
];

const MOCK_REQUESTS: StockRequestRecord[] = [
  {
    id: "req1",
    parkName: "Gulberg Park",
    itemName: "Standard Match Football (Size 5)",
    sku: "SKU-FB-01",
    quantity: 10,
    reason: "Replacement for worn-out balls during Group 1 & 2 practice sessions",
    status: "pending",
    requestedBy: "Imran Amin (Sports Lead)",
    createdAt: "2026-08-04",
  },
  {
    id: "req2",
    parkName: "Griffin Park",
    itemName: "First Aid Trauma Kit",
    sku: "SKU-FA-01",
    quantity: 2,
    reason: "Emergency replacement for expired supplies",
    status: "approved",
    requestedBy: "Umar Rohail (Park Lead)",
    createdAt: "2026-08-02",
  },
];

const MOCK_ORDERS: PurchaseOrderRecord[] = [
  {
    id: "po1",
    poNumber: "PO-2026-0089",
    supplierName: "Lahore Sports Goods Co.",
    itemName: "Standard Match Football (Size 5)",
    quantity: 25,
    unitCost: 1200,
    totalCost: 30000,
    status: "issued",
    issuedBy: "Program Admin",
    createdAt: "2026-08-03",
  },
];

export function ProcurementPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"stocks" | "catalog" | "requests" | "orders">("stocks");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);

  // Form State
  const [formItem, setFormItem] = useState("SKU-FB-01");
  const [formQty, setFormQty] = useState(10);
  const [formReason, setFormReason] = useState("");

  const { data: stockData, isLoading } = useQuery({
    queryKey: ["admin-procurement-stocks"],
    queryFn: () => fetch("/api/admin/procurement/stock").then((r) => r.json()),
  });

  const stocks = MOCK_PARK_STOCKS;

  const filteredStocks = useMemo(() => {
    return stocks.filter((item) => {
      const matchSearch =
        !search ||
        item.itemName.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
      const isLow = item.quantity <= item.minThreshold;
      const matchAlert =
        alertFilter === "all" ||
        (alertFilter === "low" && isLow) ||
        (alertFilter === "healthy" && !isLow);
      return matchSearch && matchCategory && matchAlert;
    });
  }, [stocks, search, categoryFilter, alertFilter]);

  const totalPages = Math.ceil(filteredStocks.length / pageSize) || 1;
  const paginatedStocks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStocks.slice(start, start + pageSize);
  }, [filteredStocks, page]);

  const lowStockCount = stocks.filter((s) => s.quantity <= s.minThreshold).length;
  const totalValuation = stocks.reduce((acc, s) => acc + s.quantity * s.unitCost, 0);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      <PageHeader
        title="Procurement & Park Stock Inventory Desk"
        description="Manage sports equipment, workshop materials, park stock thresholds, stock requests, and purchase orders."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setRequestModalOpen(true)}
              className="bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white font-bold rounded-xl h-11 px-5 shadow-md gap-2"
            >
              <Plus className="size-5" />
              Request Stock Refill
            </Button>
          </div>
        }
      />

      {/* ─── 4 Top KPI Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-300 shrink-0">
              <Package className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Inventory SKUs</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{stocks.length} items</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-300 shrink-0">
              <AlertTriangle className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Low Stock Warnings</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{lowStockCount} items</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-300 shrink-0">
              <ShoppingBag className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Requests</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{MOCK_REQUESTS.length} requests</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-300 shrink-0">
              <Truck className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock Valuation</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">PKR {totalValuation.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Tabs Switcher ────────────────────────────────────────── */}
      <Tabs defaultValue="stocks" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
            <TabsTrigger value="stocks" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <Package className="size-4 mr-2" /> Park Stock Inventory
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <ShoppingBag className="size-4 mr-2" /> Stock Requests Pipeline
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg font-bold text-xs sm:text-sm px-4">
              <Truck className="size-4 mr-2" /> Purchase Orders (POs)
            </TabsTrigger>
          </TabsList>

          {activeTab === "stocks" && (
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search equipment or SKU..."
                  className="pl-9 h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-medium"
                />
              </div>

              <Select
                value={alertFilter}
                onValueChange={(v) => {
                  setAlertFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold">
                  <SelectValue placeholder="Alert Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="low">Low Stock Only</SelectItem>
                  <SelectItem value="healthy">Healthy Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ─── Tab 1: Park Stock Inventory Roster ──────────────────────────── */}
        <TabsContent value="stocks" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Equipment & SKU</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Park Location</th>
                    <th className="p-4">Quantity vs Min Threshold</th>
                    <th className="p-4">Unit Cost</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedStocks.map((item) => {
                    const isLow = item.quantity <= item.minThreshold;
                    return (
                      <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors">
                        <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                          <div>{item.itemName}</div>
                          <span className="text-xs font-mono text-muted-foreground">{item.sku}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                            {item.category.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {item.parkName}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{item.quantity}</span>
                            <span className="text-xs text-muted-foreground font-medium">(Min: {item.minThreshold})</span>
                            <Badge
                              className={cn(
                                "text-[10px] font-bold border px-2 py-0.5 rounded-full ml-1",
                                isLow
                                  ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              )}
                            >
                              {isLow ? "Low Stock Warning" : "Healthy"}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                          PKR {item.unitCost.toLocaleString()} / {item.unit}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toast.info(`Requesting stock refill for ${item.itemName}`)}
                            className="h-8 px-3 text-xs font-bold text-purple-600 dark:text-purple-300 hover:bg-purple-50 rounded-xl"
                          >
                            <Plus className="size-3.5 mr-1" /> Request Refill
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Page {page} of {totalPages} ({filteredStocks.length} total items)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  <ChevronLeft className="size-4 mr-1" /> Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Stock Requests Pipeline ───────────────────────────── */}
        <TabsContent value="requests" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 space-y-4 rounded-2xl">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <ShoppingBag className="size-5 text-purple-600" /> Park Stock Requests Pipeline
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_REQUESTS.map((req) => (
                <div key={req.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 font-bold text-[10px]">
                        {req.parkName}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize text-[10px] font-bold border",
                          req.status === "pending"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border-emerald-200"
                        )}
                      >
                        {req.status}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {req.itemName} (Qty: {req.quantity})
                    </h4>
                    <p className="text-xs text-muted-foreground">{req.reason}</p>
                    <span className="text-[11px] text-slate-400 font-medium">Requested by {req.requestedBy} on {req.createdAt}</span>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => toast.success(`Approved stock request for ${req.itemName}`)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 px-4"
                      >
                        <Check className="size-4 mr-1" /> Approve Request
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: Purchase Orders (POs) ───────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4 m-0">
          <Card className="border-0 shadow-md ring-1 ring-slate-200 dark:ring-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 space-y-4 rounded-2xl">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Truck className="size-5 text-indigo-600" /> Active Supplier Purchase Orders
            </h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_ORDERS.map((po) => (
                <div key={po.id} className="py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs font-bold">{po.poNumber}</Badge>
                      <Badge className="bg-emerald-100 text-emerald-700 font-bold text-[10px] uppercase">{po.status}</Badge>
                    </div>
                    <div className="text-sm font-bold mt-1">{po.supplierName} — {po.itemName} ({po.quantity} pcs)</div>
                    <span className="text-xs text-muted-foreground">Issued by {po.issuedBy} on {po.createdAt}</span>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-indigo-600">PKR {po.totalCost.toLocaleString()}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toast.success(`Marked ${po.poNumber} as Received`)}
                      className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 h-8 mt-1"
                    >
                      Mark Received
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Request Stock Modal ────────────────────────────────────────── */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-2xl shadow-2xl">
          <div className="p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                <ShoppingBag className="size-5 text-purple-600" /> Request Park Stock Refill
              </DialogTitle>
              <DialogDescription className="text-xs font-medium">
                Submit a formal stock refill request to HQ Procurement.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("Stock refill request submitted to HQ!");
                setRequestModalOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Select Equipment Item</Label>
                <Select value={formItem} onValueChange={setFormItem}>
                  <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold">
                    <SelectValue placeholder="Select Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKU-FB-01">Standard Match Football (Size 5)</SelectItem>
                    <SelectItem value="SKU-CR-02">Cricket Leather Balls (Pack of 6)</SelectItem>
                    <SelectItem value="SKU-FA-01">First Aid Trauma Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Quantity Needed</Label>
                <Input
                  type="number"
                  value={formQty}
                  onChange={(e) => setFormQty(Number(e.target.value))}
                  className="h-11 rounded-xl bg-white dark:bg-slate-800 text-sm font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Reason / Purpose</Label>
                <Input
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Replacement for damaged equipment in Group 1"
                  className="h-11 rounded-xl bg-white dark:bg-slate-800 text-xs font-medium"
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setRequestModalOpen(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-6">
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
