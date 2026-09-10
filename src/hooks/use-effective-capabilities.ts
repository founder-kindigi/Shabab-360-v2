"use client";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import type { AccessCapability } from "@/lib/auth/capabilities";
export function useEffectiveCapabilities() {
  const { data: session } = useSession();
  const user = session?.user;
  const query = useQuery({
    queryKey: ["effective-capabilities", user?.id, user?.role, user?.tokenVersion],
    enabled: Boolean(user?.id && !user.mustResetPwd),
    queryFn: async () => {
      const response = await fetch("/api/auth/capabilities", { cache: "no-store" });
      if (!response.ok) throw new Error("Permissions unavailable");
      const result = await response.json();
      if (result.userId !== user?.id) throw new Error("Session changed");
      return result.capabilities as AccessCapability[];
    },
    refetchInterval: 30_000,
    staleTime: 0,
    retry: false,
  });
  return { ...query, has: (capability: AccessCapability) => !query.isError && Boolean(query.data?.includes(capability)) };
}
