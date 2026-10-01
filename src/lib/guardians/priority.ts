/**
 * Multi-Guardian Matrix & Emergency Contact Priority Helper for Shabab 360
 * Manages priority ordering, relation types, and emergency contact lists for youth safety.
 */

export type GuardianPriority = "primary" | "secondary" | "emergency_only";
export type GuardianRelation = "Father" | "Mother" | "Uncle" | "Guardian" | "Other";

export interface GuardianContactItem {
  id: string;
  guardianName: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
  priorityOrder: number;
}

export function sortGuardianContacts<T extends { isPrimary?: boolean; priorityOrder?: number; relation?: string | null }>(
  contacts: T[]
): T[] {
  return [...contacts].sort((a, b) => {
    // Primary guardian comes first
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;

    // Compare priority order
    const orderA = a.priorityOrder ?? 99;
    const orderB = b.priorityOrder ?? 99;
    if (orderA !== orderB) return orderA - orderB;

    // Prefer Father / Mother over distant relations
    const relA = (a.relation || "").toLowerCase();
    const relB = (b.relation || "").toLowerCase();
    if (relA === "father" || relA === "mother") return -1;
    if (relB === "father" || relB === "mother") return 1;

    return 0;
  });
}

export function formatPrimaryEmergencyContact(contacts: GuardianContactItem[]): {
  primaryName: string;
  primaryPhone: string;
  secondaryName?: string;
  secondaryPhone?: string;
} {
  const sorted = sortGuardianContacts(contacts);
  const primary = sorted[0];
  const secondary = sorted[1];

  return {
    primaryName: primary ? `${primary.guardianName} (${primary.relation || "Primary"})` : "Not specified",
    primaryPhone: primary ? primary.phone : "—",
    secondaryName: secondary ? `${secondary.guardianName} (${secondary.relation || "Secondary"})` : undefined,
    secondaryPhone: secondary ? secondary.phone : undefined,
  };
}
