"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ChevronLeft, Package, Download, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface MobileInventoryPageProps {
  parkId?: string;
  parkName?: string;
  onBack: () => void;
}

const CATEGORIES = ["All", "Sports", "Camping", "Medical", "Electronics", "Training"];

export function MobileInventoryPage({ parkId, parkName, onBack }: MobileInventoryPageProps) {
  const isCentral = !parkId;

  if (isCentral) {
    return <CentralStoreView onBack={onBack} />;
  }

  return <ParkInventoryView parkId={parkId} parkName={parkName || "Park"} onBack={onBack} />;
}

// -----------------------------------------
// CENTRAL STORE VIEW
// -----------------------------------------
function CentralStoreView({ onBack }: { onBack: () => void }) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"List" | "Tracking">("List");

  const { data } = useQuery({
    queryKey: ["inventory-central"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/central");
      if (!res.ok) throw new Error("Failed to load central inventory");
      return res.json();
    },
  });

  const defaultList = [
    {
      category: "SPORTS",
      items: [
        { name: "Cones", inStore: 20, out: 10 },
        { name: "Football", inStore: 5, out: 2 },
        { name: "Rugby ball", inStore: 4, out: 1 },
        { name: "Bibs (Sets)", inStore: 6, out: 4 },
        { name: "Agility Ladder", inStore: 3, out: 2 },
      ],
    },
    {
      category: "CAMPING",
      items: [
        { name: "Tents (4-person)", inStore: 8, out: 0 },
        { name: "Sleeping Bags", inStore: 24, out: 0 },
        { name: "Cooking Stoves", inStore: 4, out: 0 },
      ],
    },
    {
      category: "MEDICAL",
      items: [
        { name: "First Aid Kit (Major)", inStore: 6, out: 6 },
        { name: "Ice Packs (Rechargeable)", inStore: 12, out: 4 },
      ],
    },
    {
      category: "ELECTRONICS",
      items: [
        { name: "Megaphone", inStore: 6, out: 3 },
        { name: "Digital Stopwatches", inStore: 12, out: 6 },
      ],
    },
  ];

  const defaultTracking = [
    { parkName: "Umme Hani", summary: "2 item types · 3 items out", details: ["Football 1 pcs", "Megaphone 1 pcs", "First Aid Kit 1 pcs"] },
    { parkName: "Nazimabad", summary: "3 item types · 12 items out", details: ["Cones 10 pcs", "Football 1 pcs", "Stopwatch 1 pcs"] },
    { parkName: "Bufferzone", summary: "1 item type · 1 item out", details: ["Rugby ball 1 pcs"] },
    { parkName: "Gulshan", summary: "2 item types · 5 items out", details: ["Bibs 4 pcs", "Megaphone 1 pcs"] },
    { parkName: "Johar", summary: "2 item types · 3 items out", details: ["Football 1 pcs", "Agility Ladder 2 pcs"] },
    { parkName: "Saddar", summary: "1 item type · 1 item out", details: ["First Aid Kit 1 pcs"] },
  ];

  const listData = defaultList;
  const trackingData = defaultTracking;

  const userRole = (session?.user as any)?.role || "super_admin";
  const displayRole = userRole === "super_admin" ? "Main admin" : "Admin";

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <div className="px-4 pt-4 pb-0 border-b border-slate-100 bg-white sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 -ml-1 text-slate-600 hover:text-slate-900 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black text-[#1F0860]">Central Store</h1>
          </div>
          <Badge
            variant="secondary"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px] px-2.5 py-0.5"
          >
            {displayRole}
          </Badge>
        </div>

        {/* Tab switchers: List | Tracking */}
        <div className="flex gap-6 pt-1">
          <button
            onClick={() => setActiveTab("List")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all px-1 ${
              activeTab === "List"
                ? "border-[#4B0A8F] text-[#4B0A8F]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setActiveTab("Tracking")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all px-1 ${
              activeTab === "Tracking"
                ? "border-[#4B0A8F] text-[#4B0A8F]"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Tracking
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-6 flex-1 pb-24">
        {activeTab === "List" &&
          listData.map((group, idx) => (
            <div key={idx} className="space-y-2.5">
              <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((item, i) => (
                  <Card key={i} className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
                    <CardContent className="p-3.5 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">{item.name}</span>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-black text-slate-900">{item.inStore} in store</p>
                        <p className="text-slate-400 font-medium">{item.out} out</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

        {activeTab === "Tracking" &&
          trackingData.map((park, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                {park.parkName}
              </h3>
              <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
                <CardContent className="p-4 space-y-2.5">
                  <p className="text-xs text-slate-400 font-medium">{park.summary}</p>
                  <div className="space-y-1.5 pt-1">
                    {park.details.map((detail, i) => (
                      <div
                        key={i}
                        className="text-xs font-bold text-slate-800 flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#4B0A8F] shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
      </div>
    </div>
  );
}

// -----------------------------------------
// PARK INVENTORY VIEW
// -----------------------------------------
function ParkInventoryView({
  parkId,
  parkName,
  onBack,
}: {
  parkId: string;
  parkName: string;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState("All");
  const [isAddLocalOpen, setIsAddLocalOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Sports");
  const [quantity, setQuantity] = useState("1");
  const [comment, setComment] = useState("");

  const [localItems, setLocalItems] = useState([
    { id: "1", name: "Football", category: "Sports", quantity: 2 },
    { id: "2", name: "First Aid Kit", category: "Medical", quantity: 1 },
    { id: "3", name: "Cones", category: "Sports", quantity: 10 },
  ]);

  const handleAddLocalItem = () => {
    if (!itemName) return;
    setLocalItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: itemName,
        category,
        quantity: parseInt(quantity, 10) || 1,
      },
    ]);
    setItemName("");
    setQuantity("1");
    setComment("");
    setIsAddLocalOpen(false);
  };

  const filtered = localItems.filter((item) => filter === "All" || item.category === filter);

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen bg-slate-50 pb-36">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onBack} className="p-1 -ml-1 text-slate-600 hover:text-slate-900 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black text-[#1F0860] line-clamp-1">Inventory — {parkName}</h1>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filter === cat
                  ? "bg-[#1F0860] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items list */}
      <div className="p-4 space-y-2.5 flex-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-200">
            No items in this category.
          </div>
        ) : (
          filtered.map((item) => (
            <Card key={item.id} className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardContent className="p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-50 p-2.5 rounded-xl text-[#4B0A8F]">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900">{item.name}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{item.category}</p>
                  </div>
                </div>
                <div className="font-black text-lg text-[#1F0860] pr-2">{item.quantity}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Bottom Centered Action Bar (Positioned directly above bottom nav bar) */}
      <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-[460px] bg-white/95 dark:bg-[#120B24]/95 backdrop-blur-md border-t border-slate-100 dark:border-white/10 p-3 flex items-center gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-30">
        <Button
          variant="outline"
          onClick={() => alert("Inventory exported as CSV.")}
          className="h-11 px-4 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-98 transition-all"
        >
          <Download className="w-4 h-4" />
        </Button>

        <Sheet open={isAddLocalOpen} onOpenChange={setIsAddLocalOpen}>
          <SheetTrigger asChild>
            <Button className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#1F0860] via-[#4B0A8F] to-[#D90429] text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-98 transition-all">
              <Plus className="w-4 h-4 mr-2" /> + Add local item
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto max-w-[460px] mx-auto p-6">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left font-bold text-lg text-slate-900 dark:text-white">Add Local Item</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Item name</Label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="E.g. Extra cones, First aid tape"
                  className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Quantity</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-11 rounded-xl bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Comment (optional)</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Purchased from local market / temporary borrow..."
                  className="resize-none rounded-xl text-sm bg-slate-50/50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                />
              </div>
              <Button
                onClick={handleAddLocalItem}
                disabled={!itemName}
                className="w-full h-11 bg-[#4B0A8F] hover:bg-[#3d0874] text-white font-bold rounded-xl mt-3"
              >
                Save Item
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
