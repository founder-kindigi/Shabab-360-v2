"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, X, Receipt } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FeeReceiptData {
  receiptNo: string;
  date: string;
  studentName: string;
  groupName: string;
  batchName: string;
  parkName: string;
  city: string;
  feeTitle: string;
  amount: number;
  method: string;
  recordedBy: string;
  notes?: string;
}

interface FeeReceiptProps {
  data: FeeReceiptData;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPKR(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMethod(method: string): string {
  const map: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    jazzcash: "JazzCash",
    easypaisa: "Easypaisa",
    online: "Online",
    cheque: "Cheque",
  };
  return map[method.toLowerCase()] ?? method;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FeeReceipt({ data, onClose }: FeeReceiptProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="print-area">
      {/* Action bar — hidden in print */}
      <div className="no-print flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">Receipt preview</div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-[#4B0A8F] hover:bg-[#3A0870] text-white gap-1.5"
          >
            <Printer className="size-3.5" />
            Print
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Receipt card — printable */}
      <div
        id="fee-receipt-print"
        className="border rounded-lg p-6 sm:p-8 space-y-6 bg-white dark:bg-[#1E1530] max-w-md mx-auto"
      >
        {/* Organization header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Receipt className="size-6 text-[#4B0A8F]" />
            <h1 className="text-xl font-bold text-[#4B0A8F] dark:text-[#B87EE0]">
              Shabab360
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {data.city} &mdash; {data.parkName}
          </p>
        </div>

        <Separator />

        {/* Receipt meta */}
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-muted-foreground">Receipt No:</div>
          <div className="font-semibold text-right">{data.receiptNo}</div>

          <div className="text-muted-foreground">Date:</div>
          <div className="text-right">{data.date}</div>

          <div className="text-muted-foreground">Student:</div>
          <div className="font-semibold text-right">{data.studentName}</div>

          <div className="text-muted-foreground">Group:</div>
          <div className="text-right">{data.groupName}</div>

          <div className="text-muted-foreground">Batch:</div>
          <div className="text-right">{data.batchName}</div>
        </div>

        <Separator />

        {/* Fee details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Description</span>
            <span className="font-medium">{data.feeTitle}</span>
          </div>

          <div className="rounded-lg bg-[#F3ECF6] dark:bg-[#2A1850] p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-2xl font-bold text-[#4B0A8F] dark:text-[#B87EE0]">
              {formatPKR(data.amount)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="font-medium">{formatMethod(data.method)}</span>
          </div>
        </div>

        {data.notes && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              <span>{data.notes}</span>
            </div>
          </>
        )}

        <Separator />

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Recorded by: {data.recordedBy}
          </p>
          <div className="h-8" />
          <div className="border-t border-dashed pt-2">
            <p className="text-[10px] text-muted-foreground">
              This is a computer-generated receipt. No signature required.
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Shabab360 &mdash;{" "}
              {new Date().toLocaleDateString("en-PK", {
                timeZone: "Asia/Karachi",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}