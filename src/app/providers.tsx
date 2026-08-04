"use client";

import { useState, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import {
  QUERY_CACHE_TIME,
  QUERY_RETRY_COUNT,
  QUERY_STALE_TIMES,
} from "@/lib/query-config";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIMES.DEFAULT,
        gcTime: QUERY_CACHE_TIME,
        retry: QUERY_RETRY_COUNT,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider basePath="/api/auth" refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
        {children}
        <Toaster position="top-right" />
      </SessionProvider>
    </QueryClientProvider>
  );
}
