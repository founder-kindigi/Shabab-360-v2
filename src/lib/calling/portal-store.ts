import rawDataset from "@/lib/import-framework/portal-raw-dataset.json";

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
  application: {
    applicantName: string;
    guardianPhone: string;
    status: string;
  };
}

export const CALLERS_LIST: Record<string, string> = {
  c1: "Ikram Meer (Gulberg Lead)",
  c2: "Hanzala Tauseef (Gulberg Murabbi)",
  c3: "Hasnain Zafar (Tadreeb Lead)",
  c4: "Imran Amin (Johar Town Lead)",
  c5: "Basit Ahsan (Gulshan Ravi Lead)",
  c6: "Abdul Kabeer (State Life Lead)",
  c7: "Hammad Raza (Sports Lead)",
  c8: "Haseeb Ahmad (Sports Officer)",
};

const CALLER_KEYS = Object.keys(CALLERS_LIST);

function initPortalLeads(): PortalLeadState[] {
  return rawDataset.map((r, idx) => {
    const appId = `portal-app-${r.sr}`;
    const leadId = `lead-portal-${r.sr}`;

    // 300 leads start as UNASSIGNED so user can test single & bulk assignment
    if (idx < 300) {
      return {
        id: leadId,
        applicationId: appId,
        callerStaffMetaId: null,
        callerName: null,
        callerExternalId: null,
        status: "pending",
        outcome: null,
        notes: null,
        calledAt: null,
        application: {
          applicantName: r.name,
          guardianPhone: r.mobile,
          status: "submitted",
        },
      };
    }

    // 200 leads start as ASSIGNED (pending call)
    const callerId = CALLER_KEYS[idx % CALLER_KEYS.length];
    const callerName = CALLERS_LIST[callerId];

    if (idx < 500) {
      return {
        id: leadId,
        applicationId: appId,
        callerStaffMetaId: callerId,
        callerName,
        callerExternalId: null,
        status: "pending",
        outcome: null,
        notes: `Assigned to ${callerName}. Awaiting initial contact.`,
        calledAt: null,
        application: {
          applicantName: r.name,
          guardianPhone: r.mobile,
          status: "submitted",
        },
      };
    }

    // 259 leads start as CALLED (contacted with outcome & remarks)
    const isApproved = r.status === "Approved";
    const outcome = isApproved ? "reached" : idx % 3 === 0 ? "callback_requested" : "no_answer";
    const status = isApproved ? "interested" : "contacted";

    const remarksText = r.remarks
      ? `Token & Remarks: ${r.remarks} | Logged by ${callerName}`
      : isApproved
      ? `Spoke with guardian (${r.fatherName || "Father"}). Confirmed attendance for ${r.park || "Gulberg"} Park sports session.`
      : `Attempted call to ${r.mobile}. Requested callback after 5:00 PM.`;

    return {
      id: leadId,
      applicationId: appId,
      callerStaffMetaId: callerId,
      callerName,
      callerExternalId: null,
      status,
      outcome,
      notes: remarksText,
      calledAt: new Date(Date.now() - (idx % 7) * 86400000).toISOString(),
      application: {
        applicantName: r.name,
        guardianPhone: r.mobile,
        status: isApproved ? "approved" : "submitted",
      },
    };
  });
}

// Global persistent in-memory store for portal leads
declare global {
  var __portalCallingLeads: PortalLeadState[] | undefined;
}

if (!globalThis.__portalCallingLeads) {
  globalThis.__portalCallingLeads = initPortalLeads();
}

export function getPortalCallingLeads(): PortalLeadState[] {
  if (!globalThis.__portalCallingLeads) {
    globalThis.__portalCallingLeads = initPortalLeads();
  }
  return globalThis.__portalCallingLeads;
}

export function assignPortalCallingLeads(appIds: string[], targetCallerId: string): number {
  const leads = getPortalCallingLeads();
  const callerName = CALLERS_LIST[targetCallerId] || "Staff Caller";
  let count = 0;

  for (const lead of leads) {
    if (appIds.includes(lead.applicationId) || appIds.includes(lead.id)) {
      lead.callerStaffMetaId = targetCallerId;
      lead.callerName = callerName;
      lead.status = "pending";
      lead.outcome = null;
      lead.notes = `Assigned to ${callerName}. Awaiting initial contact.`;
      count++;
    }
  }

  return count;
}

export function logPortalCallInteraction(assignmentIdOrAppId: string, outcome: string, notes?: string | null): boolean {
  const leads = getPortalCallingLeads();
  const lead = leads.find((l) => l.id === assignmentIdOrAppId || l.applicationId === assignmentIdOrAppId);

  if (lead) {
    lead.outcome = outcome;
    lead.status = outcome === "reached" ? "interested" : "contacted";
    lead.notes = notes || `Call outcome recorded: ${outcome.replace(/_/g, " ")}`;
    lead.calledAt = new Date().toISOString();
    return true;
  }

  return false;
}
