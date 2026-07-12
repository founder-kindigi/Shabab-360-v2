"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const SIZES = {
  sm: { container: "size-10", text: "text-sm", icon: "size-3.5", cameraSize: "size-4" },
  md: { container: "size-16", text: "text-xl", icon: "size-4", cameraSize: "size-5" },
  lg: { container: "size-24", text: "text-3xl", icon: "size-5", cameraSize: "size-6" },
} as const;

interface AvatarUploadProps {
  currentAvatar?: string;
  userId: string;
  name: string;
  size?: "sm" | "md" | "lg";
  onUpload?: (url: string) => void;
  avatarColor?: string;
}

export function AvatarUpload({
  currentAvatar,
  userId,
  name,
  size = "md",
  onUpload,
  avatarColor = "bg-[#4B0A8F]",
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatar || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = SIZES[size];

  // Sync with external currentAvatar changes
  useEffect(() => {
    if (currentAvatar) setAvatarUrl(currentAvatar);
  }, [currentAvatar]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      const url = data.url as string;

      // Add cache-buster to force reload
      const bustUrl = `${url}?t=${Date.now()}`;
      setAvatarUrl(bustUrl);

      // Persist to localStorage for current user
      localStorage.setItem(`avatar-${userId}`, bustUrl);

      // Dispatch event so AppShell header updates
      window.dispatchEvent(new CustomEvent("avatar-updated"));

      onUpload?.(bustUrl);
      toast.success("Avatar updated");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar";
      toast.error(message);
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [userId, onUpload]);

  // On mount, check localStorage for a saved avatar
  useEffect(() => {
    if (!avatarUrl) {
      const timer = setTimeout(() => {
        const saved = localStorage.getItem(`avatar-${userId}`);
        if (saved) setAvatarUrl(saved);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [userId, avatarUrl]);

  return (
    <div className="relative inline-flex">
      <motion.div
        className={`${s.container} rounded-full overflow-hidden cursor-pointer relative group ${avatarColor} flex items-center justify-center shrink-0 shadow-lg`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name || "Avatar"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={`${s.text} text-white font-bold select-none`}>
            {getInitials(name)}
          </span>
        )}

        {/* Upload overlay */}
        <AnimatePresence>
          {isHovered && !isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full"
            >
              <Camera className="size-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading spinner */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
            <Loader2 className="size-5 text-white animate-spin" />
          </div>
        )}
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}