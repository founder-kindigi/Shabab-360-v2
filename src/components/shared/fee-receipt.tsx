"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { motion } from "framer-motion";

export interface FeeReceiptData {
  receiptNo: string;
  date: string;
  studentName: string;
  groupName: string;
  batchName: string;
  parkName: string;
  city?: string;
  feeTitle: string;
  amount: number;
  method: string;
  recordedBy: string;
  notes?: string;
  organizationName?: string;
}

function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface FeeReceiptProps {
  data: FeeReceiptData;
  onClose?: () => void;
}

export function FeeReceipt({ data, onClose }: FeeReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const receiptEl = receiptRef.current;
    if (!receiptEl) return;

    const printWindow = window.open("", "_blank", "width=400,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt ${data.receiptNo}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    width: 80mm; margin: 0 auto; padding: 6mm 4mm;
    color: #1F1638; background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .receipt-container { border: 2px solid #4B0A8F; border-radius: 6px; overflow: hidden; }
  .header { background: #4B0A8F; color: #fff; text-align: center; padding: 10px 8px 8px; }
  .header h1 { font-size: 16px; font-weight: 800; letter-spacing: 3px; margin-bottom: 2px; }
  .header p { font-size: 10px; font-weight: 400; opacity: 0.9; letter-spacing: 1px; }
  .divider {
    height: 1.5px;
    background: repeating-linear-gradient(90deg, #4B0A8F 0px, #4B0A8F 4px, transparent 4px, transparent 8px);
    margin: 0;
  }
  .body { padding: 10px 10px 6px; }
  .meta-row { display: flex; justify-content: space-between; font-size: 9px; color: #6B5A7A; margin-bottom: 8px; }
  .meta-row strong { color: #1F1638; }
  table.info { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px; }
  table.info td { padding: 4px 0; vertical-align: top; }
  table.info td.label { color: #6B5A7A; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; padding-right: 8px; white-space: nowrap; width: 30%; }
  table.info td.value { color: #1F1638; font-weight: 600; word-break: break-word; }
  .fee-section { background: #F3ECF6; border-radius: 4px; padding: 8px 10px; margin: 8px 0; }
  .fee-section .fee-title { font-size: 10px; color: #4B0A8F; font-weight: 600; margin-bottom: 4px; }
  .fee-amount { font-size: 20px; font-weight: 800; color: #4B0A8F; font-family: 'Courier New', Courier, monospace; text-align: center; padding: 4px 0; }
  .footer { text-align: center; padding: 10px 10px 14px; }
  .footer .thank-you { font-size: 11px; color: #4B0A8F; font-weight: 600; letter-spacing: 1px; margin-bottom: 2px; }
  .footer .system-name { font-size: 8px; color: #6B5A7A; letter-spacing: 0.5px; }
</style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h1>SHABAB 360</h1>
      <p>${data.organizationName || "Youth Organization"}</p>
    </div>
    <div class="divider"></div>
    <div class="body">
      <div class="meta-row">
        <span><strong>Receipt:</strong> ${data.receiptNo}</span>
        <span><strong>Date:</strong> ${data.date}</span>
      </div>
      <table class="info">
        <tr><td class="label">Student</td><td class="value">${data.studentName}</td></tr>
        <tr><td class="label">Group</td><td class="value">${data.groupName}</td></tr>
        <tr><td class="label">Batch</td><td class="value">${data.batchName}</td></tr>
        <tr><td class="label">Park</td><td class="value">${data.parkName}</td></tr>
        ${data.city ? `<tr><td class="label">City</td><td class="value">${data.city}</td></tr>` : ""}
        ${data.notes ? `<tr><td class="label">Notes</td><td class="value" style="word-break:break-word;">${data.notes}</td></tr>` : ""}
      </table>
      <div class="divider"></div>
      <div class="fee-section">
        <div class="fee-title">${data.feeTitle}</div>
        <div class="fee-amount">${formatPKR(data.amount)}</div>
      </div>
      <div class="divider"></div>
      <table class="info">
        <tr><td class="label">Method</td><td class="value">${capitalize(data.method)}</td></tr>
        <tr><td class="label">Recorded By</td><td class="value">${data.recordedBy}</td></tr>
      </table>
    </div>
    <div class="divider"></div>
    <div class="footer">
      <div class="thank-you">&#x2500;&#x2500; Thank you &#x2500;&#x2500;</div>
      <div class="system-name">Shabab360 Management System</div>
    </div>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Action buttons — hidden when printing */}
      <div className="flex items-center gap-3 w-full justify-end print:hidden">
        <Button
          onClick={handlePrint}
          className="bg-[#4B0A8F] hover:bg-[#3A0870] text-white gap-2"
        >
          <Printer className="size-4" />
          Print Receipt
        </Button>
        {onClose && (
          <Button
            variant="outline"
            onClick={onClose}
            className="gap-2 border-[#4B0A8F]/30 text-[#4B0A8F] dark:text-[#B87EE0] hover:bg-[#4B0A8F]/10"
          >
            <X className="size-4" />
            Close
          </Button>
        )}
      </div>

      {/* Receipt preview — this is what gets printed */}
      <motion.div
        ref={receiptRef}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-[320px] mx-auto"
      >
        <div className="border-2 border-[#4B0A8F] rounded-md overflow-hidden bg-white shadow-lg">
          {/* Header */}
          <div className="bg-[#4B0A8F] text-white text-center px-4 py-3">
            <h1 className="text-lg font-extrabold tracking-[0.2em]">
              SHABAB 360
            </h1>
            <p className="text-[10px] font-normal opacity-90 tracking-wider mt-0.5">
              {data.organizationName || "Youth Organization"}
            </p>
          </div>

          {/* Dashed divider */}
          <div
            className="h-[1.5px]"
            style={{
              background:
                "repeating-linear-gradient(90deg, #4B0A8F 0px, #4B0A8F 4px, transparent 4px, transparent 8px)",
            }}
          />

          {/* Body */}
          <div className="px-4 py-3 space-y-2">
            {/* Meta row */}
            <div className="flex justify-between text-[9px] text-[#6B5A7A]">
              <span>
                <span className="font-semibold text-[#1F1638]">Receipt:</span>{" "}
                {data.receiptNo}
              </span>
              <span>
                <span className="font-semibold text-[#1F1638]">Date:</span>{" "}
                {data.date}
              </span>
            </div>

            {/* Info rows */}
            <div className="space-y-1">
              <ReceiptRow label="Student" value={data.studentName} />
              <ReceiptRow label="Group" value={data.groupName} />
              <ReceiptRow label="Batch" value={data.batchName} />
              <ReceiptRow label="Park" value={data.parkName} />
              {data.city && <ReceiptRow label="City" value={data.city} />}
            </div>

            {/* Dashed divider */}
            <div
              className="h-[1.5px]"
              style={{
                background:
                  "repeating-linear-gradient(90deg, #4B0A8F 0px, #4B0A8F 4px, transparent 4px, transparent 8px)",
              }}
            />

            {/* Fee section */}
            <div className="bg-[#F3ECF6] rounded-md px-3 py-2 my-2">
              <p className="text-[10px] text-[#4B0A8F] font-semibold">
                {data.feeTitle}
              </p>
              <p className="text-xl font-extrabold text-[#4B0A8F] font-mono text-center py-1">
                {formatPKR(data.amount)}
              </p>
            </div>

            {/* Dashed divider */}
            <div
              className="h-[1.5px]"
              style={{
                background:
                  "repeating-linear-gradient(90deg, #4B0A8F 0px, #4B0A8F 4px, transparent 4px, transparent 8px)",
              }}
            />

            {/* Method and recorded by */}
            <div className="space-y-1">
              <ReceiptRow
                label="Method"
                value={capitalize(data.method)}
              />
              <ReceiptRow label="Recorded By" value={data.recordedBy} />
            </div>

            {/* Notes */}
            {data.notes && (
              <div className="mt-1">
                <ReceiptRow label="Notes" value={data.notes} />
              </div>
            )}
          </div>

          {/* Dashed divider */}
          <div
            className="h-[1.5px]"
            style={{
              background:
                "repeating-linear-gradient(90deg, #4B0A8F 0px, #4B0A8F 4px, transparent 4px, transparent 8px)",
            }}
          />

          {/* Footer */}
          <div className="text-center px-4 py-3">
            <p className="text-[11px] text-[#4B0A8F] font-semibold tracking-wider">
              &#x2500;&#x2500; Thank you &#x2500;&#x2500;
            </p>
            <p className="text-[8px] text-[#6B5A7A] tracking-wider mt-0.5">
              Shabab360 Management System
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex text-[10px] leading-tight">
      <span className="text-[#6B5A7A] uppercase tracking-wide text-[9px] pr-2 whitespace-nowrap w-[30%] shrink-0">
        {label}
      </span>
      <span className="font-semibold text-[#1F1638] break-words">{value}</span>
    </div>
  );
}