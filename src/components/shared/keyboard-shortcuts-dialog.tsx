"use client";

import { useShortcutsDialogStore } from "@/hooks/use-keyboard-shortcuts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, Navigation, ArrowRight, Search, Command } from "lucide-react";
import { useSession } from "next-auth/react";

// ---------------------------------------------------------------------------
// Shortcut definitions
// ---------------------------------------------------------------------------

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  icon: React.ElementType;
  shortcuts: ShortcutItem[];
}

function useShortcutGroups(): ShortcutGroup[] {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const baseGroups: ShortcutGroup[] = [
    {
      title: "General",
      icon: Command,
      shortcuts: [
        {
          keys: ["⌘", "/"],
          description: "Show keyboard shortcuts",
        },
        {
          keys: ["⌘", "K"],
          description: "Open command palette",
        },
        {
          keys: ["Esc"],
          description: "Close dialog / popover",
        },
      ],
    },
    {
      title: "Navigation",
      icon: Navigation,
      shortcuts: [
        {
          keys: ["⌘", "1"],
          description: "Go to Dashboard",
        },
        {
          keys: ["⌘", "2"],
          description: role === "guardian" || role === "student" ? "Go to History" : role === "murabbi" ? "Go to Attendance" : "Go to Cities",
        },
        {
          keys: ["⌘", "3"],
          description: role === "guardian" || role === "student" ? "Go to Schedule" : role === "murabbi" ? "Go to Roster" : "Go to Parks",
        },
        {
          keys: ["⌘", "4"],
          description: role === "guardian" || role === "student" ? "Go to Announcements" : role === "murabbi" ? "Go to My Group" : "Go to Batches",
        },
      ],
    },
  ];

  return baseGroups;
}

// ---------------------------------------------------------------------------
// Kbd styled badge
// ---------------------------------------------------------------------------

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-border bg-muted/80 text-xs font-mono font-medium text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

// ---------------------------------------------------------------------------
// Single shortcut row
// ---------------------------------------------------------------------------

function ShortcutRow({ item, index }: { item: ShortcutItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.2 }}
      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <span className="text-sm text-muted-foreground">{item.description}</span>
      <div className="flex items-center gap-1">
        {item.keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-muted-foreground text-xs">+</span>
            )}
            <Kbd>{key}</Kbd>
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function KeyboardShortcutsDialog() {
  const { open, setOpen } = useShortcutsDialogStore();
  const groups = useShortcutGroups();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <DialogHeader className="px-6 pt-6 pb-0">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#F3ECF6] dark:bg-[#1F0860]">
                <Keyboard className="size-4 text-[#4B0A8F] dark:text-[#8A40B0]" />
              </div>
              <div>
                <DialogTitle className="text-base">Keyboard Shortcuts</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Navigate faster with keyboard shortcuts
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-4 py-4 space-y-4 max-h-80 overflow-y-auto">
            {groups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.title}>
                  <div className="flex items-center gap-2 px-3 mb-1.5">
                    <GroupIcon className="size-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </h3>
                  </div>
                  <div className="space-y-0.5">
                    {group.shortcuts.map((item, i) => (
                      <ShortcutRow key={item.description} item={item} index={i} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t px-6 py-3 bg-muted/30">
            <p className="text-[11px] text-muted-foreground text-center">
              Press <Kbd>⌘</Kbd><span className="text-muted-foreground text-xs mx-0.5">+</span><Kbd>/</Kbd> anytime to open this dialog
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}