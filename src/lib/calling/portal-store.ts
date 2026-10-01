export interface PortalLeadState {
  id: string;
  applicationId: string;
  callerStaffMetaId: string | null;
  callerName: string | null;
  callerExternalId: string | null;
  status: "pending" | "contacted" | "interested" | "completed";
  outcome: string | null;
  notes: string | null;
  calledAt: string | null;
  application: { applicantName: string; guardianPhone: string; status: string };
}

// Portal-export leads are deliberately unavailable. Calling must use persisted,
// scoped campaign assignments rather than an in-memory registration-data fallback.
export const CALLERS_LIST: Record<string, string> = {};

export function getPortalCallingLeads(): PortalLeadState[] {
  return [];
}

export function assignPortalCallingLeads(): number {
  return 0;
}

export function logPortalCallInteraction(): boolean {
  return false;
}
