"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Package, Download } from "lucide-react";
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

  return <ParkInventoryView parkId={parkId} parkName={parkName!} onBack={onBack} />;
}

// -----------------------------------------
// CENTRAL STORE VIEW
// -----------------------------------------
function CentralStoreView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"List" | "Tracking">("List");

  const { data: centralData } = useQuery({
    queryKey: ["inventory-central"],
    queryFn: async () => {
      // Mock data
      return {
        list: [
          { category: "SPORTS", items: [{ name: "Cones", inStore: 20, out: 10 }, { name: "Football", inStore: 5, out: 2 }] },
          { category: "CAMPING", items: [{ name: "Tents", inStore: 2, out: 0 }] }
        ],
        tracking: [
          { parkName: "Umme Hani", summary: "1 item type, 1 total", details: ["Football 1 pcs"] },
          { parkName: "Al Huda", summary: "2 item types, 12 total", details: ["Cones 10 pcs", "Football 2 pcs"] },
        ]
      };
    },
    initialData: {
      list: [
        { category: "SPORTS", items: [{ name: "Cones", inStore: 20, out: 10 }, { name: "Football", inStore: 5, out: 2 }] },
        { category: "CAMPING", items: [{ name: "Tents", inStore: 2, out: 0 }] }
      ],
      tracking: [
        { parkName: "Umme Hani", summary: "1 item type, 1 total", details: ["Football 1 pcs"] },
        { parkName: "Al Huda", summary: "2 item types, 12 total", details: ["Cones 10 pcs", "Football 2 pcs"] },
      ]
    }
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="px-4 pt-4 pb-2 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 -ml-1 text-gray-500 hover:text-gray-900">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-[#1F0860]">Central Store</h1>
          </div>
          <Badge variant="secondary" className="bg-[#4B0A8F]/10 text-[#4B0A8F]">
            Admin
          </Badge>
        </div>
        <div className="flex gap-4 border-b">
          <button 
            onClick={() => setTab("List")}
            className={`pb-2 text-sm font-semibold border-b-2 px-1 ${tab === "List" ? "border-[#4B0A8F] text-[#4B0A8F]" : "border-transparent text-gray-500"}`}
          >
            List
          </button>
          <button 
            onClick={() => setTab("Tracking")}
            className={`pb-2 text-sm font-semibold border-b-2 px-1 ${tab === "Tracking" ? "border-[#4B0A8F] text-[#4B0A8F]" : "border-transparent text-gray-500"}`}
          >
            Tracking
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {tab === "List" && centralData.list.map((group, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 tracking-wider">{group.category}</h3>
            <div className="space-y-2">
              {group.items.map((item, i) => (
                <Card key={i} className="shadow-sm border-gray-200">
                  <CardContent className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <Package className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="font-semibold text-sm">{item.name}</span>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-bold text-gray-900">{item.inStore} in store</p>
                      <p className="text-gray-500">{item.out} out</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {tab === "Tracking" && centralData.tracking.map((park, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">{park.parkName}</h3>
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500 font-medium mb-2">{park.summary}</p>
                <div className="space-y-1">
                  {park.details.map((detail, i) => (
                    <div key={i} className="text-sm font-semibold flex items-center before:content-[''] before:w-1.5 before:h-1.5 before:bg-[#4B0A8F] before:rounded-full before:mr-2">
                      {detail}
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
function ParkInventoryView({ parkId, parkName, onBack }: { parkId: string, parkName: string, onBack: () => void }) {
  const [filter, setFilter] = useState("All");

  const { data: parkInv } = useQuery({
    queryKey: ["inventory-park", parkId],
    queryFn: async () => {
      return [
        { id: "1", name: "Football", category: "Sports", quantity: 2 },
        { id: "2", name: "First Aid Kit", category: "Medical", quantity: 1 },
      ];
    },
    initialData: [
      { id: "1", name: "Football", category: "Sports", quantity: 2 },
      { id: "2", name: "First Aid Kit", category: "Medical", quantity: 1 },
    ]
  });

  const filtered = parkInv.filter(item => filter === "All" || item.category === filter);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      <div className="px-4 pt-4 pb-2 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="p-1 -ml-1 text-gray-500 hover:text-gray-900">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-[#1F0860] line-clamp-1">Inventory — {parkName}</h1>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === cat
                  ? "bg-[#1F0860] text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">No items found.</div>
        ) : (
          filtered.map(item => (
            <Card key={item.id} className="shadow-sm border-gray-200">
              <CardContent className="p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-[#4B0A8F]/10 p-2 rounded-lg">
                    <Package className="w-4 h-4 text-[#4B0A8F]" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm">{item.name}</span>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                </div>
                <div className="font-bold text-lg text-[#1F0860]">
                  {item.quantity}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <Button variant="outline" className="flex-none px-3 text-gray-600">
          <Download className="w-4 h-4" />
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="flex-1 bg-gradient-to-r from-[#1F0860] to-[#4B0A8F] text-white">
              + Add local item
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="mb-4">
              <SheetTitle>Add Local Item</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Item name</Label>
                <Input placeholder="E.g. Extra cones" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter(c => c !== "All").map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" defaultValue="1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Comment (optional)</Label>
                <Textarea placeholder="Bought from local store" className="resize-none" />
              </div>
              <Button className="w-full bg-[#4B0A8F] mt-2">Save Item</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
