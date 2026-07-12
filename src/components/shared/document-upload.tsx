"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Loader2, Trash2, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface UploadedFile {
  name: string;
  originalName: string;
  url: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="size-4 text-red-500" />;
  if (["jpg", "jpeg", "png"].includes(ext || "")) return <FileIcon className="size-4 text-blue-500" />;
  if (["doc", "docx"].includes(ext || "")) return <FileText className="size-4 text-blue-600" />;
  return <FileText className="size-4 text-muted-foreground" />;
}

interface DocumentUploadProps {
  entityType: string;
  entityId: string;
  maxFiles?: number;
  onUpload?: (file: { url: string; name: string }) => void;
}

export function DocumentUpload({
  entityType,
  entityId,
  maxFiles = 5,
  onUpload,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const queryClient = useQueryClient();

  // Fetch existing documents
  const { data: meta, isLoading } = useQuery<{ files: UploadedFile[] }>({
    queryKey: ["documents", entityType, entityId],
    queryFn: () =>
      fetch(
        `/api/upload/document?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
      ).then((r) => r.json()),
    enabled: !!entityId,
  });

  const files = meta?.files || [];
  const canUpload = files.length < maxFiles;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (fileName: string) =>
      fetch(
        `/api/upload/document?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}&fileName=${encodeURIComponent(fileName)}`,
        { method: "DELETE" }
      ).then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      toast.success("Document removed");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to delete document";
      toast.error(msg);
    },
  });

  const uploadFile = useCallback(async (file: File) => {
    const ALLOWED = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ];

    if (!ALLOWED.includes(file.type)) {
      toast.error(`"${file.name}" is not a supported file type`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds the 5MB limit`);
      return;
    }
    if (files.length >= maxFiles) {
      toast.error(`Maximum of ${maxFiles} files reached`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 10, 90));
      }, 100);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId);

      const res = await fetch("/api/upload/document", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
      onUpload?.({ url: data.url, name: data.name });
      toast.success(`"${data.name}" uploaded`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload document";
      toast.error(msg);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  }, [entityType, entityId, files.length, maxFiles, queryClient, onUpload]);

  const handleFileSelect = useCallback((filesList: FileList | null) => {
    if (!filesList) return;
    Array.from(filesList).forEach(uploadFile);
    // Reset input
    if (inputRef.current) inputRef.current.value = "";
  }, [uploadFile]);

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      {canUpload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-2
            border-2 border-dashed rounded-lg p-6 cursor-pointer
            transition-colors duration-200
            ${isDragging
              ? "border-[#4B0A8F] bg-[#4B0A8F]/5 dark:bg-[#4B0A8F]/10"
              : "border-border hover:border-[#4B0A8F]/50 hover:bg-muted/50"
            }
            ${isUploading ? "pointer-events-none" : ""}
          `}
        >
          {isUploading ? (
            <div className="w-full space-y-2 px-4">
              <Loader2 className="size-5 text-[#4B0A8F] animate-spin mx-auto" />
              <Progress value={uploadProgress} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-center">Uploading…</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center size-10 rounded-full bg-[#F3ECF6] dark:bg-[#1F086080]">
                <Upload className="size-5 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop files or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PDF, DOC, DOCX, JPG, PNG — max 5MB each
                </p>
              </div>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </motion.div>
      )}

      {!canUpload && files.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Maximum of {maxFiles} files reached
        </p>
      )}

      {/* File list */}
      <AnimatePresence mode="popLayout">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : files.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2 max-h-48 overflow-y-auto"
          >
            {files.map((file, i) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg border bg-card p-2.5 group"
              >
                <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                  {getFileIcon(file.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                  onClick={() => deleteMutation.mutate(file.name)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  <span className="sr-only">Delete {file.originalName}</span>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}