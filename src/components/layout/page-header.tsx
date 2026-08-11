"use client";

import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/useAppStore";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Building2, TreePine, CalendarCheck, Users } from "lucide-react";
import { fetchJsonArray } from "@/lib/api/fetch-json-array";

interface PageHeaderProps {
  /**
   * Page identity is shown in the app top bar. Keep these legacy props so
   * module callers remain compatible while this component only renders
   * actions and the optional scope trail.
   */
  title?: string;
  description?: string;
  actions?: ReactNode;
  /**
   * Scope labels require four list endpoints. Most module pages already show
   * their own context, so keep the expensive breadcrumb opt-in only.
   */
  showScopeBreadcrumb?: boolean;
}

// Types matching API responses
interface CityItem { id: string; name: string }
interface ParkItem { id: string; name: string; cityId: string; city: { name: string } }
interface BatchItem { id: string; name: string }
interface GroupItem { id: string; name: string }

// Simple icon components for breadcrumb
function CityIcon() {
  return <Building2 className="size-3.5 shrink-0" />;
}
function ParkIcon() {
  return <TreePine className="size-3.5 shrink-0" />;
}
function BatchIcon() {
  return <CalendarCheck className="size-3.5 shrink-0" />;
}
function GroupIcon() {
  return <Users className="size-3.5 shrink-0" />;
}

export function PageHeader({ actions, showScopeBreadcrumb = false }: PageHeaderProps) {
  const selectedCityId = useAppStore((s) => s.selectedCityId);
  const selectedParkId = useAppStore((s) => s.selectedParkId);
  const selectedBatchId = useAppStore((s) => s.selectedBatchId);
  const selectedGroupId = useAppStore((s) => s.selectedGroupId);

  // Only show breadcrumb when at least a city is selected
  const hasScope = showScopeBreadcrumb && !!selectedCityId;

  // Fetch names for breadcrumb
  const { data: cities = [] } = useQuery<CityItem[]>({
    queryKey: ["header-cities"],
    queryFn: () => fetchJsonArray<CityItem>("/api/admin/cities"),
    enabled: hasScope,
    staleTime: 5 * 60 * 1000,
  });

  const { data: parks = [] } = useQuery<ParkItem[]>({
    queryKey: ["header-parks"],
    queryFn: () => fetchJsonArray<ParkItem>("/api/admin/parks"),
    enabled: hasScope,
    staleTime: 5 * 60 * 1000,
  });

  const { data: batches = [] } = useQuery<BatchItem[]>({
    queryKey: ["header-batches", selectedParkId],
    queryFn: () => fetchJsonArray<BatchItem>(`/api/admin/batches?parkId=${selectedParkId}`),
    enabled: !!selectedParkId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: groups = [] } = useQuery<GroupItem[]>({
    queryKey: ["header-groups", selectedBatchId],
    queryFn: () => fetchJsonArray<GroupItem>(`/api/admin/groups?batchId=${selectedBatchId}`),
    enabled: !!selectedBatchId,
    staleTime: 5 * 60 * 1000,
  });

  const cityName = cities.find((c) => c.id === selectedCityId)?.name
    ?? parks.find((p) => p.id === selectedParkId)?.city?.name;

  const parkName = parks.find((p) => p.id === selectedParkId)?.name;

  const batchName = batches.find((b) => b.id === selectedBatchId)?.name;

  const groupName = groups.find((g) => g.id === selectedGroupId)?.name;

  const showBreadcrumb = hasScope && cityName;

  if (!showBreadcrumb && !actions) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {showBreadcrumb && (
        <div className="mr-auto max-w-full overflow-x-auto scrollbar-none px-1">
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink className="flex items-center gap-1 text-xs">
                  <CityIcon />
                  <span>{cityName}</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {parkName && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink className="flex items-center gap-1 text-xs">
                      <ParkIcon />
                      <span>{parkName}</span>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              {batchName && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink className="flex items-center gap-1 text-xs">
                      <BatchIcon />
                      <span>{batchName}</span>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              {groupName && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="flex items-center gap-1 text-xs">
                      <GroupIcon />
                      <span>{groupName}</span>
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
