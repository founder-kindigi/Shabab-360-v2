"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  FileText,
  Presentation,
  ExternalLink,
  Search,
  Check,
  Globe,
  Sparkles,
  Maximize2,
  RefreshCw,
  Eye,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GoogleDocPreset {
  id: string;
  title: string;
  type: "sheet" | "doc" | "slide";
  url: string;
  description: string;
}

const SAMPLE_PRESETS: GoogleDocPreset[] = [
  {
    id: "p-1",
    title: "Shabab Batch 4 Content Plan 2026",
    type: "sheet",
    url: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing",
    description: "Official 8-week Sports, Skills, and Tadreeb activity curriculum sheet.",
  },
  {
    id: "p-2",
    title: "Murabbi Leadership & Safeguarding SOPs",
    type: "doc",
    url: "https://docs.google.com/document/d/19pL4pHMyc0B28TgU80M3bSgD38JpE67YlK3q3R0J2Kk/edit?usp=sharing",
    description: "Standard operating procedures and child safety guidelines for Park Leads.",
  },
  {
    id: "p-3",
    title: "Lahore Inter-Park Sports Gala Presentation",
    type: "slide",
    url: "https://docs.google.com/presentation/d/11QjB8vH3x0JpE67YlK3q3R0J2Kk/edit?usp=sharing",
    description: "Event fixtures, tournament structure, and awards slides.",
  },
];

export function GoogleDocsSheetsViewer() {
  const [selectedPreset, setSelectedPreset] = useState<GoogleDocPreset>(SAMPLE_PRESETS[0]);
  const [inputUrl, setInputUrl] = useState("");
  const [activeEmbedUrl, setActiveEmbedUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview"
  );
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to convert Google URL to Embed iframe URL
  const formatGoogleEmbedUrl = (rawUrl: string, viewMode: "preview" | "edit") => {
    if (!rawUrl.includes("docs.google.com")) {
      return rawUrl;
    }
    // Remove trailing parameters
    let baseUrl = rawUrl.split("/edit")[0].split("/preview")[0].split("/view")[0];
    if (viewMode === "preview") {
      return `${baseUrl}/preview`;
    }
    return `${baseUrl}/edit?embedded=true`;
  };

  const handleSelectPreset = (preset: GoogleDocPreset) => {
    setSelectedPreset(preset);
    setInputUrl(preset.url);
    setActiveEmbedUrl(formatGoogleEmbedUrl(preset.url, mode));
    toast.success(`Loaded "${preset.title}"`);
  };

  const handleLoadCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      toast.error("Please enter a valid Google Docs or Sheets URL");
      return;
    }
    if (!inputUrl.includes("docs.google.com")) {
      toast.error("URL must be a valid docs.google.com link");
      return;
    }

    const formatted = formatGoogleEmbedUrl(inputUrl.trim(), mode);
    setActiveEmbedUrl(formatted);

    // Detect type
    let docType: "sheet" | "doc" | "slide" = "doc";
    if (inputUrl.includes("spreadsheets")) docType = "sheet";
    else if (inputUrl.includes("presentation")) docType = "slide";

    setSelectedPreset({
      id: `custom-${Date.now()}`,
      title: "Custom Google Document",
      type: docType,
      url: inputUrl.trim(),
      description: "User pasted Google document.",
    });

    toast.success("Loaded custom Google document");
  };

  const handleToggleMode = (newMode: "preview" | "edit") => {
    setMode(newMode);
    if (selectedPreset) {
      setActiveEmbedUrl(formatGoogleEmbedUrl(selectedPreset.url, newMode));
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    const current = activeEmbedUrl;
    setActiveEmbedUrl("");
    setTimeout(() => {
      setActiveEmbedUrl(current);
      setIsRefreshing(false);
      toast.success("Document view refreshed");
    }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Top Presets & Link Input Bar */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Globe className="size-5 text-[#4B0A8F]" /> Live Google Docs & Sheets Viewer
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                View or edit shared Google Sheets, Docs, and Presentations live inside Shabab 360.
              </CardDescription>
            </div>

            {/* Mode Switcher & Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <Button
                  variant={mode === "preview" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleToggleMode("preview")}
                  className={cn("h-7 text-xs font-semibold px-2.5 rounded-md", mode === "preview" && "bg-[#4B0A8F] text-white")}
                >
                  <Eye className="size-3.5 mr-1" /> Preview
                </Button>
                <Button
                  variant={mode === "edit" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleToggleMode("edit")}
                  className={cn("h-7 text-xs font-semibold px-2.5 rounded-md", mode === "edit" && "bg-[#4B0A8F] text-white")}
                >
                  <Edit3 className="size-3.5 mr-1" /> Edit Mode
                </Button>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="size-8"
                title="Refresh Frame"
              >
                <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              </Button>

              <a
                href={selectedPreset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Open in Google Drive"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {SAMPLE_PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              const Icon = preset.type === "sheet" ? FileSpreadsheet : preset.type === "doc" ? FileText : Presentation;

              return (
                <Button
                  key={preset.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    "text-xs font-semibold rounded-lg h-8 px-3 transition-all",
                    isSelected
                      ? "bg-[#4B0A8F] text-white hover:bg-[#3b0873]"
                      : "text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                  )}
                >
                  <Icon className="size-3.5 mr-1.5 shrink-0" />
                  <span className="truncate max-w-[180px]">{preset.title}</span>
                </Button>
              );
            })}
          </div>

          {/* Paste Custom Google Link Form */}
          <form onSubmit={handleLoadCustomUrl} className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Paste any Google Docs, Sheets, or Slides link..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 text-xs bg-[#4B0A8F] hover:bg-[#3b0873] text-white font-semibold">
              Load URL
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Embedded iFrame Frame */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-md rounded-xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold px-2 py-0.5">
              Live Google Frame
            </Badge>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-md">
              {selectedPreset.title}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Mode: {mode.toUpperCase()}</span>
        </div>

        <div className="w-full h-[650px] bg-slate-50 dark:bg-slate-950 relative">
          {activeEmbedUrl ? (
            <iframe
              src={activeEmbedUrl}
              className="w-full h-full border-0"
              title={selectedPreset.title}
              allow="autoplay"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs font-medium">
              Loading Google Document Frame...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
