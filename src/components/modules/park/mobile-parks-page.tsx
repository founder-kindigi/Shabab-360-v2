"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Plus, Package, ChevronRight, MapPin, X, Loader2 } from "lucide-react";
import { useEffectiveCapabilities } from "@/hooks/use-effective-capabilities";

export type ParkNavInfo = {
  parkId: string;
  parkName: string;
  /** Null when the source endpoint does not return a real count. */
  murabbiCount: number | null;
  studentCount: number | null;
};

interface MobileParksPageProps {
  onParkSelect: (park: ParkNavInfo) => void;
  onSelectInventory?: () => void;
}

export function MobileParksPage({ onParkSelect, onSelectInventory }: MobileParksPageProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  // The product-facing label is server-derived and must never be guessed locally.
  const sessionUser = session?.user as { role?: string; roleLabel?: string | null } | undefined;
  const role = sessionUser?.role ?? "";
  const roleLabel: string | null = sessionUser?.roleLabel ?? null;

  const { has } = useEffectiveCapabilities();
  const canManage = has("organisation.manage");

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newParkName, setNewParkName] = useState("");
  const [newParkArea, setNewParkArea] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isHQ = role === "super_admin" || role === "program_admin";
  const { data: citiesList } = useQuery({
    queryKey: ["admin-cities"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cities");
      if (!res.ok) throw new Error("Failed to load cities");
      const json = await res.json();
      return json.data || [];
    },
    enabled: isHQ,
  });

  const { data: parksList, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-parks-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parks");
      if (!res.ok) throw new Error("Failed to load parks");
      return res.json();
    },
    staleTime: 30000,
  });

  const totalParksCount = parksList?.length || 0;

  // A park's real batch association comes from its groups (group.batchId), not
  // from Batch.parkId: one Lahore Batch 4 can be the batch of groups across six
  // parks while only the anchor park owns it directly. This reads the existing
  // organisation/location contract and never infers a batch that is not returned.
  const { data: groupsList } = useQuery({
    queryKey: ["admin-parks-groups"],
    queryFn: async () => {
      const res = await fetch("/api/admin/groups?limit=100");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  const batchesByPark = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const group of (groupsList ?? []) as any[]) {
      const parkId: string | undefined = group?.parkId ?? group?.park?.id ?? group?.batch?.park?.id;
      const batchName: string | undefined = group?.batch?.name;
      if (!parkId || !batchName) continue;
      const names = map.get(parkId) ?? new Set<string>();
      names.add(batchName);
      map.set(parkId, names);
    }
    return map;
  }, [groupsList]);

  const batchLabelFor = (park: any): string => {
    const names = [...(batchesByPark.get(park.id) ?? [])];
    if (names.length > 0) return names.join(", ");
    const direct = park._count?.batches ?? 0;
    if (direct > 0) return `${direct} batch${direct === 1 ? "" : "es"}`;
    return "No batch";
  };

  const handleSavePark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParkName.trim()) return;
    if (isHQ && !selectedCity) {
      setSaveError("Please select a city.");
      return;
    }
    setIsSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/admin/parks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newParkName,
          address: newParkArea,
          ...(isHQ ? { cityId: selectedCity } : {})
        }),
      });
      if (res.status !== 201) {
        let data: any = {};
        try { data = await res.json(); } catch(e) {}
        setSaveError(data.error || data.error?.message || "Failed to save park.");
        setIsSaving(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-parks-list"] });

      setNewParkName("");
      setNewParkArea("");
      setSelectedCity("");
      setShowAddSheet(false);
      setIsSaving(false);
    } catch(err) {
      setSaveError("Network error.");
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] mx-auto flex flex-col min-h-screen w-full bg-[#f8f9fa] dark:bg-[#0c0817] text-slate-900 dark:text-slate-100 pb-28 relative font-sans select-none">
      {/* Header */}
      <div className="px-5 pt-8 pb-3 bg-white dark:bg-[#180E30] border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Parks</h1>
          {roleLabel ? (
            <span className="text-[11px] font-semibold text-[#15803d] dark:text-emerald-400 bg-[#f0fdf4] dark:bg-emerald-950/40 border border-[#bbf7d0] dark:border-emerald-800 px-3 py-1 rounded-full">
              {roleLabel}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-end mt-5 mb-1">
          {!isLoading && !isError && (
            <span className="text-xs text-gray-400 dark:text-gray-400 font-medium">
              {totalParksCount} parks
            </span>
          )}
        </div>
      </div>

      {/* Parks & Store Cards List */}
      <div className="px-4 pt-3 space-y-2.5">
        <div
          onClick={onSelectInventory}
          className="bg-white dark:bg-[#180E30] rounded-2xl p-3.5 border border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer active:scale-[0.99] hover:border-purple-200 dark:hover:border-purple-500/40 transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-gradient-to-br from-[#27084D] to-[#600C60] flex items-center justify-center text-white shadow-sm shrink-0">
              <Package className="size-5 text-white/90" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Central Store</h3>
              <p className="text-xs text-gray-400 dark:text-slate-400 font-normal mt-0.5">
                Master inventory
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-gray-300 dark:text-gray-500 shrink-0" />
        </div>

        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="size-6 animate-spin mb-2" />
            <span className="text-sm">Loading parks...</span>
          </div>
        ) : isError ? (
          <div className="py-10 text-center">
            <p className="text-rose-500 text-sm font-medium">Failed to load parks.</p>
            <button onClick={() => refetch()} className="mt-3 px-4 py-2 rounded-xl bg-[#4B0A8F] text-white text-xs font-bold">
              Retry
            </button>
          </div>
        ) : parksList?.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            No parks found.
          </div>
        ) : (
          parksList?.map((park: any) => {
            const initials = park.name ? park.name.charAt(0).toUpperCase() : "P";
            return (
              <div
                key={park.id}
                onClick={() => onParkSelect({
                  parkId: park.id,
                  parkName: park.name,
                  murabbiCount: null,
                  studentCount: null,
                })}
                className="bg-white dark:bg-[#180E30] rounded-2xl p-3.5 border border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer active:scale-[0.99] hover:border-purple-200 dark:hover:border-purple-500/40 transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="size-11 rounded-xl bg-gradient-to-br from-[#27084D] to-[#600C60] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{park.name}</h3>
                    <p className="text-xs text-gray-400 dark:text-slate-400 font-normal mt-0.5 truncate">
                      {park.city?.name ? park.city.name + " • " : ""}{batchLabelFor(park)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <ChevronRight className="size-4 text-gray-300 dark:text-gray-500 shrink-0 ml-0.5" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (+) */}
      {canManage && (
        <button
          onClick={() => setShowAddSheet(true)}
          aria-label="Add park"
          className="fixed bottom-20 right-6 sm:right-[calc(50%-210px)] size-12 rounded-2xl bg-gradient-to-br from-[#27084D] via-[#5C0A5F] to-[#D90429] text-white flex items-center justify-center shadow-xl shadow-purple-900/35 hover:scale-105 active:scale-95 transition-all z-40"
        >
          <Plus className="size-6 stroke-[2.5]" />
        </button>
      )}

      {/* Add Park Bottom Sheet */}
      {showAddSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => !isSaving && setShowAddSheet(false)}
          />
          <div className="w-full max-w-[460px] bg-white rounded-t-3xl z-10 p-6 shadow-2xl relative animate-in slide-in-from-bottom-5 duration-200">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add park</h2>
              <button
                onClick={() => !isSaving && setShowAddSheet(false)}
                disabled={isSaving}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSavePark} className="space-y-4">
              {saveError && (
                <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-medium border border-rose-100">
                  {saveError}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Park name
                </label>
                <input
                  type="text"
                  value={newParkName}
                  onChange={(e) => setNewParkName(e.target.value)}
                  placeholder="e.g. Johar Park"
                  required
                  disabled={isSaving}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/40 focus:border-[#4B0A8F] disabled:opacity-50"
                />
              </div>

              {isHQ && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    City
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/40 focus:border-[#4B0A8F] disabled:opacity-50 appearance-none"
                  >
                    <option value="" disabled>Select a city</option>
                    {citiesList?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Area
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="text"
                    value={newParkArea}
                    onChange={(e) => setNewParkArea(e.target.value)}
                    placeholder="e.g. Gulistan-e-Johar"
                    disabled={isSaving}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4B0A8F]/40 focus:border-[#4B0A8F] disabled:opacity-50"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Add murabbis and students from the park's Structure tab after saving.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSheet(false)}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#27084D] to-[#5C0A5F] text-white text-sm font-semibold shadow-md active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="size-4 animate-spin" />}
                  Save park
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
