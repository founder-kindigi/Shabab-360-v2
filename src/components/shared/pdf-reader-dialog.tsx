"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PdfReaderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  pdfUrl?: string;
  category?: string;
}

export function PdfReaderDialog({
  open,
  onOpenChange,
  title = "Shabab 360 Official Document.pdf",
  pdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  category = "SOP Manual",
}: PdfReaderDialogProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5;
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = title;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${title}...`);
  };

  const handlePrint = () => {
    const iframe = document.getElementById("pdf-iframe-element") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    } else {
      window.open(pdfUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col bg-slate-900 text-white border-slate-800 transition-all duration-300",
          isFullscreen
            ? "max-w-none w-screen h-screen rounded-none"
            : "sm:max-w-4xl h-[85vh] rounded-2xl"
        )}
      >
        {/* Header Bar */}
        <DialogHeader className="bg-slate-950 p-4 border-b border-slate-800 flex flex-row items-center justify-between shrink-0 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-bold text-white truncate max-w-md">
                  {title}
                </DialogTitle>
                <Badge variant="outline" className="bg-purple-950/60 text-purple-300 border-purple-800 text-[10px] hidden sm:inline-flex">
                  <ShieldCheck className="size-3 mr-1" /> {category}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">Shabab 360 Built-in PDF Reader</p>
            </div>
          </div>

          {/* Close Action */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 size-8 rounded-lg"
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>

        {/* Toolbar Controls */}
        <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          
          {/* Page Navigation */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            <Button
              variant="ghost"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="size-6 text-slate-300 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-slate-300 font-medium px-1">
              Page <strong className="text-white">{currentPage}</strong> of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="size-6 text-slate-300 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              className="size-6 text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="size-3.5" />
            </Button>
            <span className="text-slate-300 font-bold w-12 text-center">
              {zoomLevel}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className="size-6 text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetZoom}
              className="size-6 text-slate-400 hover:text-white ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="size-3" />
            </Button>
          </div>

          {/* Right Actions (Download, Print, Fullscreen, Open external) */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-7 text-xs bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <Download className="size-3.5 mr-1" /> Download
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-7 text-xs bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white hidden sm:inline-flex"
            >
              <Printer className="size-3.5 mr-1" /> Print
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="size-7 text-slate-400 hover:text-white hover:bg-slate-800"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4 flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.2s ease-out",
            }}
            className="w-full h-full max-w-3xl bg-white shadow-2xl rounded-lg overflow-hidden flex flex-col"
          >
            <iframe
              id="pdf-iframe-element"
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full min-h-[600px] border-0"
              title={title}
            />
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>Protected PDF document • Shabab 360 Operations</span>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:underline flex items-center"
          >
            Open raw PDF <ExternalLink className="size-3 ml-1" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
