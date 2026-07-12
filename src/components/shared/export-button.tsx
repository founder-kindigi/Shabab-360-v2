"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2 } from "lucide-react";
import { exportToCSV } from "@/lib/csv-export";

interface ExportButtonProps {
  /** The data rows to export */
  data: Record<string, unknown>[];
  /** File name (without .csv extension) */
  filename: string;
  /** Column definitions — `key` maps to a property in the data row, `header` is the CSV column heading */
  columns: { key: string; header: string }[];
  /** Optional disabled state (e.g. while data is loading) */
  disabled?: boolean;
  /** Optional extra class names on the trigger button */
  className?: string;
}

export function ExportButton({
  data,
  filename,
  columns,
  disabled = false,
  className,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  // Memoize the flat data array passed to the CSV utility
  const exportData = useMemo(
    () => data as unknown as Record<string, unknown>[],
    [data]
  );

  async function handleExport() {
    setExporting(true);
    // Small delay so the UI can show the spinner before the main thread blocks on blob creation
    await new Promise((r) => setTimeout(r, 50));
    try {
      exportToCSV(exportData, filename, columns);
    } finally {
      setExporting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || exportData.length === 0 || exporting}
          className={`h-9 gap-1.5 text-sm bg-[#4B0A8F] hover:bg-[#4B0A8FE6] text-white border-[#4B0A8F] hover:text-white disabled:opacity-50 ${className ?? ""}`}
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExport} disabled={exportData.length === 0}>
          <Download className="size-4 mr-2" />
          Export CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}