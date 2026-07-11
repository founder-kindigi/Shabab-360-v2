"use client";

import { useState, useCallback, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  /** Custom desktop cell renderer */
  render?: (row: T, index: number) => ReactNode;
  /** Custom mobile card renderer (for complex layouts) */
  mobileRender?: (row: T) => ReactNode;
}

export interface RowAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
}

interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange: (value: string) => void;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface SortConfig {
  field: string;
  order: "asc" | "desc";
}

export interface SortableDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  /** Server-side pagination (controlled via props) */
  pagination?: PaginationConfig;
  /** Sorting */
  sort?: SortConfig;
  onSortChange?: (field: string) => void;
  /** Search */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Filters */
  filters?: FilterDef[];
  /** Row actions */
  actions?: (row: T) => RowAction[];
  /** Empty state */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  /** Selection */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  getRowId: (row: T) => string;
  /** Extra */
  className?: string;
  /** Skeleton row height (h-14 by default) */
  skeletonRows?: number;
}

// ── Component ──────────────────────────────────────────────────────────────

export function SortableDataTable<T>({
  columns,
  data,
  isLoading = false,
  pagination,
  sort,
  onSortChange,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  actions,
  emptyTitle = "No data yet",
  emptyDescription = "There is nothing to display at this time.",
  emptyIcon: EmptyIcon,
  selectable = false,
  selectedIds,
  onSelectionChange,
  getRowId,
  className,
  skeletonRows = 4,
}: SortableDataTableProps<T>) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ── Selection helpers ──────────────────────────────────────────────────
  const allRowIds = data.map(getRowId);
  const allSelected =
    selectable &&
    selectedIds &&
    allRowIds.length > 0 &&
    allRowIds.every((id) => selectedIds.has(id));

  const toggleAll = useCallback(() => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allRowIds));
    }
  }, [allSelected, allRowIds, onSelectionChange, selectedIds]);

  const toggleRow = useCallback(
    (id: string) => {
      if (!onSelectionChange || !selectedIds) return;
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange(next);
    },
    [onSelectionChange, selectedIds]
  );

  // ── Sort handler ──────────────────────────────────────────────────────
  const handleSort = (field: string) => {
    if (!onSortChange) return;
    onSortChange(field);
  };

  // ── Pagination calculations ───────────────────────────────────────────
  const showStart =
    pagination && data.length > 0
      ? (pagination.page - 1) * pagination.pageSize + 1
      : 0;
  const showEnd =
    pagination && data.length > 0
      ? Math.min(pagination.page * pagination.pageSize, pagination.totalItems)
      : 0;

  // ── Render: Sort icon ─────────────────────────────────────────────────
  function SortIcon({ columnKey }: { columnKey: string }) {
    if (!sort || sort.field !== columnKey) return null;
    return sort.order === "asc" ? (
      <ArrowUp className="size-3 text-[#4B0A8F] dark:text-[#8A40B0]" />
    ) : (
      <ArrowDown className="size-3 text-[#4B0A8F] dark:text-[#8A40B0]" />
    );
  }

  // ── Render: Row actions dropdown ──────────────────────────────────────
  function RowActionsDropdown({ row }: { row: T }) {
    const rowActions = actions?.(row);
    if (!rowActions || rowActions.length === 0) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {rowActions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "cursor-pointer",
                  action.destructive &&
                    "text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                )}
              >
                {Icon && <Icon className="size-4 mr-2" />}
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ── Render: Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // ── Render: Empty ─────────────────────────────────────────────────────
  const hasData = data && data.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center p-6">
        <div className="rounded-2xl bg-muted/60 p-5 ring-1 ring-border">
          {EmptyIcon ? (
            <EmptyIcon className="size-8 text-muted-foreground/60" />
          ) : (
            <SlidersHorizontal className="size-8 text-muted-foreground/60" />
          )}
        </div>
        <div className="max-w-sm">
          <p className="font-medium text-foreground">{emptyTitle}</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {emptyDescription}
          </p>
        </div>
      </div>
    );
  }

  // ── Render: Toolbar (search + filters) ────────────────────────────────
  const hasToolbar =
    (onSearchChange !== undefined) || (filters && filters.length > 0);

  const toolbarContent = (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      {onSearchChange !== undefined && (
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      {/* Desktop filters */}
      {filters && filters.length > 0 && (
        <div className="hidden sm:flex items-center gap-2">
          {filters.map((f) => (
            <Select
              key={f.key}
              value={f.value ?? "all"}
              onValueChange={f.onChange}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {f.label}</SelectItem>
                {f.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}
      {/* Mobile filter toggle */}
      {filters && filters.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="sm:hidden w-fit"
          onClick={() => setMobileFiltersOpen((v) => !v)}
        >
          <Filter className="size-4 mr-2" />
          Filters
        </Button>
      )}
    </div>
  );

  const mobileFiltersContent =
    filters && filters.length > 0 ? (
      <AnimatePresence>
        {mobileFiltersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden sm:hidden"
          >
            <div className="flex flex-col gap-2 pt-2">
              {filters.map((f) => (
                <Select
                  key={f.key}
                  value={f.value ?? "all"}
                  onValueChange={f.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={f.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {f.label}</SelectItem>
                    {f.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    ) : null;

  // ── Render: Desktop Table ─────────────────────────────────────────────
  const desktopTable = (
    <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "text-xs font-medium text-muted-foreground transition-colors",
                  col.className,
                  col.sortable && onSortChange && "cursor-pointer select-none hover:text-foreground",
                  sort?.field === col.key && "text-foreground"
                )}
                onClick={
                  col.sortable && onSortChange
                    ? () => handleSort(col.key)
                    : undefined
                }
              >
                <div className="flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && <SortIcon columnKey={col.key} />}
                </div>
              </TableHead>
            ))}
            {actions && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => {
            const rowId = getRowId(row);
            return (
              <TableRow
                key={rowId}
                className="hover:bg-muted/30 transition-colors"
              >
                {selectable && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds?.has(rowId) ?? false}
                      onCheckedChange={() => toggleRow(rowId)}
                      aria-label={`Select row ${rowId}`}
                    />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render
                      ? col.render(row, idx)
                      : (row as Record<string, unknown>)[col.key] as ReactNode}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell>
                    <RowActionsDropdown row={row} />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  // ── Render: Mobile Cards ──────────────────────────────────────────────
  // Collect all columns that have a mobileRender
  const mobileRenderCols = columns.filter((c) => c.mobileRender);
  const hasAnyMobileRender = mobileRenderCols.length > 0;

  const mobileCards = (
    <div className="md:hidden space-y-3">
      <AnimatePresence mode="popLayout">
        {data.map((row) => {
          const rowId = getRowId(row);
          return (
            <motion.div
              key={rowId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border bg-card p-4 space-y-3"
            >
              {selectable && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds?.has(rowId) ?? false}
                    onCheckedChange={() => toggleRow(rowId)}
                    aria-label={`Select row ${rowId}`}
                  />
                </div>
              )}
              {hasAnyMobileRender
                ? // Render all mobileRender sections in order
                  mobileRenderCols.map((col) => (
                    <div key={col.key}>{col.mobileRender!(row)}</div>
                  ))
                : // Fallback: render each column as label + value
                  columns.map((col, idx) => (
                    <div key={col.key} className="flex items-start justify-between gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">
                        {col.header}
                      </span>
                      <span className="text-sm text-right">
                        {col.render
                          ? col.render(row, idx)
                          : ((row as Record<string, unknown>)[col.key] as ReactNode) ?? "—"}
                      </span>
                    </div>
                  ))}
              {/* Action row at bottom */}
              {actions && (
                <div className="flex justify-end">
                  <RowActionsDropdown row={row} />
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  // ── Render: Pagination ────────────────────────────────────────────────
  const paginationBar =
    pagination && pagination.totalPages > 0 ? (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
        <p className="text-xs text-muted-foreground">
          Showing {showStart}–{showEnd} of {pagination.totalItems}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            className="h-8"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            className="h-8"
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    ) : null;

  // ── Final assembly ────────────────────────────────────────────────────
  return (
    <div className={cn("space-y-4", className)}>
      {hasToolbar && toolbarContent}
      {mobileFiltersContent}
      {desktopTable}
      {mobileCards}
      {paginationBar}
    </div>
  );
}