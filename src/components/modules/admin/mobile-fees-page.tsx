"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Banknote,
  CalendarRange,
  Users,
  TrendingUp,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

export function MobileFeesPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("active");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fees", "", "", "", "", statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", "20");
      return fetch(`/api/admin/fees?${params}`).then((r) => r.json());
    },
  });

  const fees = data?.data || [];
  const summary = data?.summary;
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col min-h-screen bg-muted/30 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Fees</h1>
            <p className="text-sm text-muted-foreground">Collection management</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-full relative"
            onClick={() => setFilterOpen(true)}
          >
            <Filter className="size-5" />
          </Button>
        </div>

        {/* Mini Summary */}
        {!isLoading && summary && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            <Card className="rounded-2xl border-none shadow-sm min-w-[140px] shrink-0">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Expected</p>
                <p className="font-bold text-sm">{formatPKR(summary.totalExpected)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-none shadow-sm min-w-[140px] shrink-0 bg-emerald-50">
              <CardContent className="p-3">
                <p className="text-[10px] text-emerald-700 uppercase">Collected</p>
                <p className="font-bold text-sm text-emerald-700">{formatPKR(summary.totalCollected)}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && fees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Banknote className="size-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-lg mb-1">No fee events</p>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              There are no fee events matching your filter.
            </p>
          </div>
        )}

        <AnimatePresence>
          {!isLoading && fees.map((fee: any, i: number) => (
            <motion.div
              key={fee.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              layout
            >
              <Card className="rounded-2xl overflow-hidden active:scale-[0.98] transition-transform">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate leading-tight">{fee.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{fee.batch.name}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                      {fee.feeType}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{fee.paidCount} / {fee.totalParticipants} Paid</span>
                      <span className={cn(fee.rate >= 80 ? "text-emerald-600" : fee.rate >= 50 ? "text-amber-500" : "text-red-500")}>
                        {fee.rate}%
                      </span>
                    </div>
                    <Progress value={fee.rate} className="h-1.5" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                    <div>
                      <p className="text-muted-foreground text-[10px] uppercase">Amount</p>
                      <p className="font-semibold">{formatPKR(fee.amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px] uppercase">Collected</p>
                      <p className="font-semibold text-emerald-600">{formatPKR(fee.totalPaid)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" className="h-10 rounded-xl" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="text-sm font-medium text-muted-foreground">{page} / {pagination.totalPages}</span>
            <Button variant="outline" className="h-10 rounded-xl" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <div className="h-6" />

      {/* Filter Sheet */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-8 pt-6">
          <SheetTitle className="mb-4">Filter Fees</SheetTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full h-12 rounded-xl bg-[#4B0A8F] text-white mt-4" onClick={() => setFilterOpen(false)}>
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
