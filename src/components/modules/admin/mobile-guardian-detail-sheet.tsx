"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPKT } from "@/lib/timezone";
import {
  Phone,
  Mail,
  MapPin,
  Users,
  ShieldAlert,
  CreditCard,
  X,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface GuardianDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardianId: string | null;
  onChildClick?: (id: string, name: string) => void;
}

interface DetailData {
  guardian: {
    id: string;
    name: string;
    phone: string;
    cnic: string | null;
    address: string | null;
    isActive: boolean;
    user: { id: string; email: string; name: string | null } | null;
    children: {
      participant: {
        id: string;
        name: string;
        state: string;
      };
      relation: string | null;
      group: {
        id: string;
        name: string;
        batch: {
          id: string;
          name: string;
          park: { id: string; name: string; city: { id: string; name: string } };
        };
      };
    }[];
  };
  feeSummary: {
    totalChildren: number;
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
    overdueFees: number;
  };
}

// --- Helpers ---
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getStatusVariant(state: string) {
  switch (state) {
    case "active":
      return "text-[#4B0A8F] border-[#D4B8E3] bg-[#F3ECF6]";
    case "dropped":
      return "text-red-600 border-red-200 bg-red-50";
    default:
      return "text-muted-foreground border-muted bg-muted/50";
  }
}

// --- Component ---
export function MobileGuardianDetailSheet({
  open,
  onOpenChange,
  guardianId,
  onChildClick,
}: GuardianDetailSheetProps) {
  const { data, isLoading, isError } = useQuery<DetailData>({
    queryKey: ["guardian-detail", guardianId],
    queryFn: () =>
      fetch(`/api/admin/guardians/${guardianId}/detail`).then((r) => {
        if (!r.ok) throw new Error("Failed to load details");
        return r.json();
      }),
    enabled: open && !!guardianId,
    staleTime: 30000,
  });

  const g = data?.guardian;
  const fees = data?.feeSummary;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl p-0 flex flex-col bg-muted/30">
        <SheetHeader className="p-4 border-b bg-background sticky top-0 z-10 flex flex-row justify-between items-center text-left">
          <SheetTitle className="text-lg">Guardian Details</SheetTitle>
          <Button variant="ghost" size="icon" className="rounded-full size-8" onClick={() => onOpenChange(false)}>
            <X className="size-5" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-background p-4 rounded-2xl">
                <Skeleton className="size-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          )}

          {isError && !isLoading && (
            <div className="py-12 text-center text-muted-foreground">
              Failed to load details.
            </div>
          )}

          {data && g && fees && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 pb-6"
            >
              {/* Profile Card */}
              <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold shrink-0">
                    {getInitials(g.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg truncate leading-tight">{g.name}</h3>
                    <div className="mt-1">
                      <Badge variant="outline" className={cn("px-2 py-0 text-[10px]", g.isActive ? "text-[#4B0A8F] bg-[#F3ECF6] border-[#D4B8E3]" : "text-muted-foreground")}>
                        {g.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="size-3" /> {g.phone}
                      </p>
                      {g.user && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                          <Mail className="size-3 shrink-0" /> {g.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Children Card */}
              <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Users className="size-3.5" /> Children ({fees.totalChildren})
                  </h4>
                  {g.children.length > 0 ? (
                    <div className="space-y-2">
                      {g.children.map((c) => (
                        <div key={c.participant.id} className="p-3 bg-muted/50 rounded-xl flex items-center gap-3 active:scale-[0.98] transition-transform" onClick={() => onChildClick?.(c.participant.id, c.participant.name)}>
                          <div className="size-10 rounded-full bg-[#D4B8E3]/30 flex items-center justify-center text-[#4B0A8F] text-xs font-bold shrink-0">
                            {getInitials(c.participant.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{c.participant.name}</p>
                              <Badge variant="outline" className={cn("px-1.5 py-0 text-[9px]", getStatusVariant(c.participant.state))}>
                                {c.participant.state}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {c.relation && <span className="mr-1 font-medium">{c.relation} ·</span>}
                              {c.group.batch.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No children linked.</p>
                  )}
                </CardContent>
              </Card>

              {/* Fees Card */}
              <Card className="rounded-2xl border-none shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                      <CreditCard className="size-3.5" /> Fees Overview
                    </h4>
                    {fees.overdueFees > 0 && (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[9px] px-1.5 py-0">
                        <AlertTriangle className="size-2.5 mr-1" /> Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded-xl p-2">
                      <p className="font-bold text-sm">Rs {fees.totalExpected.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Expected</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-2">
                      <p className="font-bold text-sm text-emerald-600">Rs {fees.totalPaid.toLocaleString()}</p>
                      <p className="text-[9px] text-emerald-700">Paid</p>
                    </div>
                    <div className={cn("rounded-xl p-2", fees.outstanding > 0 ? "bg-red-50" : "bg-muted/50")}>
                      <p className={cn("font-bold text-sm", fees.outstanding > 0 ? "text-red-600" : "text-muted-foreground")}>
                        Rs {fees.outstanding.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Outstanding</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="h-6" />
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
