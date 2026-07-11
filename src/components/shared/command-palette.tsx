"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { create } from "zustand";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { useAppStore, type PageId } from "@/stores/useAppStore";
import { getNavItems, type NavItem } from "@/components/layout/sidebar";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LogOut,
  Moon,
  Sun,
  PanelLeft,
  PanelLeftClose,
  Users,
  CornerDownLeft,
  GraduationCap,
  Shield,
  UserCog,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Open state store
// ---------------------------------------------------------------------------

interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

// ---------------------------------------------------------------------------
// Action item type
// ---------------------------------------------------------------------------

interface PaletteAction {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  onSelect: () => void;
  danger?: boolean;
}

// ---------------------------------------------------------------------------
// Entity search result type
// ---------------------------------------------------------------------------

interface EntitySearchResult {
  type: "participant" | "guardian" | "staff" | "batch" | "group";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Brand-colored item class
// ---------------------------------------------------------------------------

const itemActiveClass = [
  "data-[selected=true]:bg-[#F3ECF6] data-[selected=true]:text-[#4B0A8F]",
  "dark:data-[selected=true]:bg-[#1F086080] dark:data-[selected=true]:text-[#8A40B0]",
  "cursor-pointer",
].join(" ");

const dangerItemActiveClass = [
  "data-[selected=true]:bg-red-50 data-[selected=true]:text-red-600",
  "dark:data-[selected=true]:bg-red-950/50 dark:data-[selected=true]:text-red-400",
  "cursor-pointer",
].join(" ");

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.19, 1, 0.22, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -8,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

// ---------------------------------------------------------------------------
// Entity type config
// ---------------------------------------------------------------------------

const entityTypeConfig: Record<
  EntitySearchResult["type"],
  { label: string; icon: LucideIcon; colorClass: string }
> = {
  participant: {
    label: "Students",
    icon: GraduationCap,
    colorClass: "text-rose-600 dark:text-rose-400",
  },
  guardian: {
    label: "Guardians",
    icon: Shield,
    colorClass: "text-amber-600 dark:text-amber-400",
  },
  staff: {
    label: "Staff",
    icon: UserCog,
    colorClass: "text-sky-600 dark:text-sky-400",
  },
  batch: {
    label: "Batches",
    icon: Layers,
    colorClass: "text-violet-600 dark:text-violet-400",
  },
  group: {
    label: "Groups",
    icon: Users,
    colorClass: "text-[#4B0A8F] dark:text-[#8A40B0]",
  },
};

// ---------------------------------------------------------------------------
// Skeleton loader for entity search
// ---------------------------------------------------------------------------

function SearchSkeleton() {
  return (
    <div className="space-y-1 px-2 py-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
        Searching entities...
      </p>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 px-2 py-2.5 animate-pulse"
        >
          <div className="size-4 rounded bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-3/5 rounded bg-muted" />
            <div className="h-2.5 w-2/5 rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Command Palette Dialog
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const { open, setOpen } = useCommandPaletteStore();
  const navigateTo = useAppStore((s) => s.navigateTo);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const user = session?.user as { role?: string } | undefined;
  const role = user?.role;

  // Entity search state
  const [searchQuery, setSearchQuery] = useState("");
  const [entityResults, setEntityResults] = useState<EntitySearchResult[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Navigation items from sidebar
  const navItems: NavItem[] = getNavItems(role);

  // Actions
  const actions: PaletteAction[] = [
    {
      id: "toggle-sidebar",
      label: sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar",
      icon: sidebarOpen ? PanelLeftClose : PanelLeft,
      shortcut: "⌘B",
      onSelect: () => toggleSidebar(),
    },
    {
      id: "toggle-theme",
      label: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      icon: theme === "dark" ? Sun : Moon,
      onSelect: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
    {
      id: "sign-out",
      label: "Sign Out",
      icon: LogOut,
      onSelect: () => signOut({ callbackUrl: "/" }),
      danger: true,
    },
  ];

  // Debounced entity search
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setEntityResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const q = searchQuery.trim();

    if (q.length < 2) {
      setEntityResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`);
        const data = await res.json();
        setEntityResults(data.results || []);
      } catch {
        setEntityResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, open]);

  // Close on Escape (capture phase — intercept before cmdk)
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, setOpen]);

  // Close on Escape custom event (from useKeyboardShortcuts)
  useEffect(() => {
    if (!open) return;

    function handleShortcutEscape() {
      setOpen(false);
    }

    document.addEventListener("shortcut:escape", handleShortcutEscape);
    return () =>
      document.removeEventListener("shortcut:escape", handleShortcutEscape);
  }, [open, setOpen]);

  // Close when clicking outside (on backdrop)
  const handleBackdropClick = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  // Handle page navigation
  const handlePageSelect = useCallback(
    (pageId: PageId) => {
      navigateTo(pageId);
      setOpen(false);
    },
    [navigateTo, setOpen]
  );

  // Handle action execution
  const handleActionSelect = useCallback(
    (action: PaletteAction) => {
      action.onSelect();
      setOpen(false);
    },
    [setOpen]
  );

  // Handle entity result click
  const handleEntitySelect = useCallback(
    (result: EntitySearchResult) => {
      navigateTo(result.url as PageId);
      setOpen(false);
    },
    [navigateTo, setOpen]
  );

  // Group entity results by type
  const groupedResults = entityResults.reduce<
    Record<string, EntitySearchResult[]>
  >((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const hasEntityResults = entityResults.length > 0;
  const showEntitySection = hasSearched && searchQuery.trim().length >= 2;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cmd-backdrop"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="cmd-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-x-0 top-[15%] z-50 mx-auto w-full max-w-lg px-4"
          >
            <div
              role="dialog"
              aria-label="Command palette"
              aria-modal="true"
              className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/20"
            >
              <Command
                className=" [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-11 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]]:gap-2.5 [&_[cmdk-item]_svg]:size-4"
              >
                <div className="flex items-center border-b border-border/60 px-3">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <CommandInput
                    placeholder="Search pages, actions, entities..."
                    className="text-sm"
                    onValueChange={setSearchQuery}
                    value={searchQuery}
                  />
                </div>

                <CommandList className="max-h-80 px-1.5 py-1">
                  <CommandEmpty>
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <div className="flex items-center justify-center size-10 rounded-full bg-muted/80 mb-3">
                        <Search className="size-5 opacity-50" />
                      </div>
                      <p className="text-sm font-medium">No results found</p>
                      <p className="text-xs mt-1 opacity-70">
                        Try a different search term
                      </p>
                    </div>
                  </CommandEmpty>

                  {/* Pages group */}
                  {navItems.length > 0 && (
                    <CommandGroup heading="Pages">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <CommandItem
                            key={item.id}
                            value={item.label}
                            onSelect={() => handlePageSelect(item.id)}
                            className={cn(itemActiveClass)}
                          >
                            <Icon className="shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}

                  {/* Entity search results */}
                  {showEntitySection && (
                    <>
                      {navItems.length > 0 && (
                        <CommandSeparator className="my-1" />
                      )}

                      {/* Loading skeleton */}
                      {isSearching && <SearchSkeleton />}

                      {/* Grouped results */}
                      {!isSearching && hasEntityResults && (
                        <CommandGroup heading="Search Entities">
                          {Object.entries(groupedResults).map(
                            ([type, items]) => {
                              const config = entityTypeConfig[type as EntitySearchResult["type"]];
                              if (!config) return null;
                              const TypeIcon = config.icon;
                              return (
                                <div key={type}>
                                  {items.map((result) => (
                                    <CommandItem
                                      key={`${result.type}-${result.id}`}
                                      value={`entity-${result.type}-${result.id}-${result.title}`}
                                      onSelect={() =>
                                        handleEntitySelect(result)
                                      }
                                      className={cn(itemActiveClass)}
                                    >
                                      <TypeIcon
                                        className={cn(
                                          "shrink-0",
                                          config.colorClass
                                        )}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="truncate text-sm">
                                          {result.title}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {result.subtitle}
                                        </p>
                                      </div>
                                      <span className="shrink-0 text-[10px] font-medium text-muted-foreground/70 capitalize">
                                        {config.label}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </div>
                              );
                            }
                          )}
                        </CommandGroup>
                      )}

                      {/* No entity results */}
                      {!isSearching &&
                        showEntitySection &&
                        !hasEntityResults && (
                          <div className="px-3 py-4 text-center">
                            <p className="text-xs text-muted-foreground">
                              No entities match &ldquo;
                              <span className="font-medium text-foreground">
                                {searchQuery}
                              </span>
                              &rdquo;
                            </p>
                          </div>
                        )}
                    </>
                  )}

                  {/* Actions group */}
                  {actions.length > 0 && navItems.length > 0 && (
                    <CommandSeparator className="my-1" />
                  )}
                  {actions.length > 0 && (
                    <CommandGroup heading="Actions">
                      {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <CommandItem
                            key={action.id}
                            value={action.label}
                            onSelect={() => handleActionSelect(action)}
                            className={cn(
                              action.danger
                                ? dangerItemActiveClass
                                : itemActiveClass
                            )}
                          >
                            <Icon className="shrink-0" />
                            <span className="truncate">{action.label}</span>
                            {action.shortcut && (
                              <span className="ml-auto text-[11px] font-mono text-muted-foreground tracking-wide">
                                {action.shortcut}
                              </span>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>

                {/* Footer */}
                <div className="border-t border-border/60 px-3 py-2 flex items-center gap-4 text-[11px] text-muted-foreground bg-muted/30">
                  <span className="flex items-center gap-1.5">
                    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] font-medium shadow-sm">
                      ↵
                    </kbd>
                    <span>Select</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] font-medium shadow-sm">
                      esc
                    </kbd>
                    <span>Close</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] font-medium shadow-sm">
                      ↑↓
                    </kbd>
                    <span>Navigate</span>
                  </span>
                </div>
              </Command>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Trigger Button (for the header)
// ---------------------------------------------------------------------------

export function CommandPaletteTrigger() {
  const { setOpen } = useCommandPaletteStore();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "flex items-center gap-2 h-9 rounded-lg border border-border/60 bg-muted/40 px-3",
        "text-sm text-muted-foreground transition-colors",
        "hover:bg-muted hover:border-border/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A0006B] focus-visible:ring-offset-1",
        "w-full max-w-xs",
        "cursor-pointer"
      )}
    >
      <Search className="size-4 shrink-0 opacity-70" />
      <span className="flex-1 text-left text-[13px]">Search...</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Mobile trigger (icon only)
// ---------------------------------------------------------------------------

export function CommandPaletteMobileTrigger() {
  const { setOpen } = useCommandPaletteStore();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "flex items-center justify-center size-9 rounded-lg",
        "text-muted-foreground transition-colors",
        "hover:bg-muted/80 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A0006B] focus-visible:ring-offset-1",
        "cursor-pointer"
      )}
      aria-label="Open search"
    >
      <Search className="size-[18px]" />
    </button>
  );
}