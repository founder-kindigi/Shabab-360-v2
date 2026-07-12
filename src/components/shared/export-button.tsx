"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Loader2,
} from "lucide-react";
import {
  exportToExcel,
  exportToCSV,
  exportToPDF,
  type ExportColumn,
} from "@/lib/export-utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ExportButtonProps {
  /** Array of row objects to export */
  data: Record<string, unknown>[];
  /** Base filename (without extension) */
  filename: string;
  /** Column definitions mapping data keys to display headers */
  columns: ExportColumn[];
  /** Optional: DOM element ID for PDF print export */
  printElementId?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Button size variant */
  size?: "default" | "sm" | "lg" | "icon";
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  /** Render as a compact icon-only button */
  iconOnly?: boolean;
  /** Custom trigger element (overrides default button) */
  trigger?: ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ExportButton({
  data,
  filename,
  columns,
  printElementId,
  disabled = false,
  className,
  size = "sm",
  variant = "outline",
  iconOnly = false,
  trigger,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const isEmpty = !data || data.length === 0;

  async function handleExcel() {
    if (isEmpty || exporting) return;
    setExporting(true);
    try {
      await exportToExcel(data, filename, columns);
    } catch (err) {
      console.error("[ExportButton] Excel export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  function handleCSV() {
    if (isEmpty || exporting) return;
    try {
      exportToCSV(data, filename, columns);
    } catch (err) {
      console.error("[ExportButton] CSV export failed:", err);
    }
  }

  function handlePDF() {
    if (exporting) return;
    try {
      if (printElementId) {
        exportToPDF(printElementId, filename);
      } else {
        // Fallback: print the whole page
        window.print();
      }
    } catch (err) {
      console.error("[ExportButton] PDF export failed:", err);
    }
  }

  if (trigger) {
    // Custom trigger mode
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled || isEmpty || exporting}>
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleExcel} disabled={exporting}>
            <FileSpreadsheet className="size-4 mr-2 text-green-600" />
            Excel (.xlsx)
            {exporting && <Loader2 className="size-3.5 ml-auto animate-spin" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCSV} disabled={exporting}>
            <FileText className="size-4 mr-2 text-blue-600" />
            CSV (.csv)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handlePDF} disabled={exporting}>
            <Printer className="size-4 mr-2 text-[#A0006B]" />
            Print / PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isEmpty || exporting}
          className={className}
        >
          {exporting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          {!iconOnly && <span className="hidden sm:inline ml-1.5">Export</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExcel} disabled={exporting}>
          <FileSpreadsheet className="size-4 mr-2 text-green-600" />
          Excel (.xlsx)
          {exporting && <Loader2 className="size-3.5 ml-auto animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCSV} disabled={exporting}>
          <FileText className="size-4 mr-2 text-blue-600" />
          CSV (.csv)
        </DropdownMenuItem>
        {printElementId && (
          <DropdownMenuItem onClick={handlePDF} disabled={exporting}>
            <Printer className="size-4 mr-2 text-[#A0006B]" />
            Print / PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}