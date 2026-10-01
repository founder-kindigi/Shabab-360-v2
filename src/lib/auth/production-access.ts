/**
 * Guarded production Team Access provisioning — planning and preflight only.
 *
 * This module opens no connection, reads no environment file and writes nothing by
 * itself. An authorised operator injects a read-only lookup port; a later reviewed
 * pass supplies the protected-handoff and activation ports. Every failure mode fails
 * closed, no plaintext password is returned or logged, and the protected password
 * handoff must succeed before a single activation is attempted.
 *
 * The production contract deliberately NOT decided here: which concrete writer and
 * connection the operator supplies, and the owner approval for a live run. Until
 * that is reviewed, `applyAccessPlan` can only be called with injected ports and
 * never reaches a real database from this repository.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { productRoleLabel } from "./role-labels";

/** A deliberate refusal. Messages never echo an email, scope value or credential. */
export class AccessRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessRefusedError";
  }
}

/** Roles this path may create a staff account for. */
export const STAFF_PROVISIONABLE_ROLES = [
  "program_admin",
  "city_head",
  "park_lead",
  "park_admin",
  "murabbi",
  "muawin",
] as const;

export type StaffProvisionableRole = (typeof STAFF_PROVISIONABLE_ROLES)[number];

/** Roles whose accounts come from participant or guardian records, never from here. */
export const NON_STAFF_ROLES = ["student", "guardian"] as const;

/** Roles that must never be created by an access workflow. */
export const NEVER_PROVISIONABLE_ROLES = ["super_admin"] as const;

export type ScopeKind = "organisation" | "city" | "park";

export interface RoleScopeRule {
  readonly role: StaffProvisionableRole;
  readonly scope: ScopeKind;
  /** True when a group code may be supplied (teaching Park Lead, Murabbi). */
  readonly allowsGroup: boolean;
}

export const ROLE_SCOPE_RULES: Readonly<Record<StaffProvisionableRole, RoleScopeRule>> = {
  program_admin: { role: "program_admin", scope: "organisation", allowsGroup: false },
  city_head: { role: "city_head", scope: "city", allowsGroup: false },
  park_lead: { role: "park_lead", scope: "park", allowsGroup: true },
  park_admin: { role: "park_admin", scope: "park", allowsGroup: false },
  murabbi: { role: "murabbi", scope: "park", allowsGroup: true },
  muawin: { role: "muawin", scope: "park", allowsGroup: false },
};

/** One approved access request. `ref` is an opaque workbook row reference. */
export interface AccessRequestRow {
  readonly ref: string;
  readonly email: string;
  readonly role: string;
  readonly cityCode?: string | null;
  readonly parkName?: string | null;
  readonly groupCode?: string | null;
  /** Muawin only: the `ref` of the same-park Murabbi or teaching Park Lead it assists. */
  readonly assistsRef?: string | null;
}

export interface ExistingAccount {
  readonly userId: string;
  readonly role: string;
  readonly isActive: boolean;
  readonly assignedCityId: string | null;
  readonly assignedParkId: string | null;
  readonly assignedGroupId: string | null;
}

/** Read-only lookups the operator supplies. This module never opens a connection. */
export interface AccessLookupPort {
  findCity(code: string): Promise<{ id: string; isActive: boolean } | null>;
  findPark(cityId: string, name: string): Promise<{ id: string; isActive: boolean } | null>;
  findGroup(parkId: string, code: string): Promise<{ id: string; isActive: boolean } | null>;
  findAccount(email: string): Promise<ExistingAccount | null>;
}

export type AccessRefusalCode =
  | "unknown_role"
  | "system_owner_role"
  | "non_staff_role"
  | "missing_work_email"
  | "duplicate_email"
  | "city_required"
  | "city_not_found"
  | "city_inactive"
  | "park_required"
  | "park_not_found"
  | "park_inactive"
  | "group_not_allowed"
  | "group_not_found"
  | "assistance_not_allowed"
  | "assistance_target_invalid"
  | "existing_account_conflict";

export interface AccessRefusal {
  readonly ref: string;
  readonly code: AccessRefusalCode;
}

/** Internal plan entry. It carries the email because activation needs it; the
 * aggregate summary never does. */
export interface AccessPlanEntry {
  readonly ref: string;
  readonly email: string;
  readonly role: StaffProvisionableRole;
  readonly cityId: string | null;
  readonly parkId: string | null;
  readonly groupId: string | null;
  /** True when the role may later receive a group and is denied group data until then. */
  readonly groupUndecided: boolean;
  readonly assistsRef: string | null;
  readonly outcome: "create-active" | "already-configured";
}

export interface AccessPlan {
  readonly entries: readonly AccessPlanEntry[];
  readonly refusals: readonly AccessRefusal[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KNOWN_ROLES = [...STAFF_PROVISIONABLE_ROLES, ...NON_STAFF_ROLES, ...NEVER_PROVISIONABLE_ROLES];
const ROLE_BY_LABEL = new Map<string, string>(
  KNOWN_ROLES.map((role) => [(productRoleLabel(role) ?? role).toLowerCase(), role])
);

function normalizeRole(value: string): string {
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  return ROLE_BY_LABEL.get(key) ?? key.replace(/\s+/g, "_");
}

function isStaffRole(role: string): role is StaffProvisionableRole {
  return (STAFF_PROVISIONABLE_ROLES as readonly string[]).includes(role);
}

/**
 * Builds a provisioning plan from approved request rows. Nothing is written; every
 * unresolvable or conflicting row becomes a refusal, and a non-empty refusal list
 * must be treated as a stop by the caller.
 */
export async function buildAccessPlan(
  rows: readonly AccessRequestRow[],
  lookup: AccessLookupPort
): Promise<AccessPlan> {
  const entries: AccessPlanEntry[] = [];
  const refusals: AccessRefusal[] = [];
  const seenEmails = new Set<string>();
  const acceptedRefs = new Map<string, AccessPlanEntry>();

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    const role = normalizeRole(row.role);

    if (role === "super_admin") {
      refusals.push({ ref: row.ref, code: "system_owner_role" });
      continue;
    }
    if ((NON_STAFF_ROLES as readonly string[]).includes(role)) {
      refusals.push({ ref: row.ref, code: "non_staff_role" });
      continue;
    }
    if (!isStaffRole(role)) {
      refusals.push({ ref: row.ref, code: "unknown_role" });
      continue;
    }
    if (!email || !EMAIL_PATTERN.test(email)) {
      refusals.push({ ref: row.ref, code: "missing_work_email" });
      continue;
    }
    if (seenEmails.has(email)) {
      refusals.push({ ref: row.ref, code: "duplicate_email" });
      continue;
    }
    seenEmails.add(email);

    const rule = ROLE_SCOPE_RULES[role];
    const cityCode = row.cityCode?.trim() || null;
    const parkName = row.parkName?.trim() || null;
    const groupCode = row.groupCode?.trim() || null;

    if (groupCode && !rule.allowsGroup) {
      // Muawin in particular never receives a group.
      refusals.push({ ref: row.ref, code: "group_not_allowed" });
      continue;
    }
    if (row.assistsRef && role !== "muawin") {
      refusals.push({ ref: row.ref, code: "assistance_not_allowed" });
      continue;
    }

    let cityId: string | null = null;
    let parkId: string | null = null;
    let groupId: string | null = null;

    if (rule.scope === "city" || rule.scope === "park") {
      if (!cityCode) {
        refusals.push({ ref: row.ref, code: "city_required" });
        continue;
      }
      const city = await lookup.findCity(cityCode);
      if (!city) {
        refusals.push({ ref: row.ref, code: "city_not_found" });
        continue;
      }
      if (!city.isActive) {
        refusals.push({ ref: row.ref, code: "city_inactive" });
        continue;
      }
      cityId = city.id;
    }

    if (rule.scope === "park") {
      if (!parkName) {
        refusals.push({ ref: row.ref, code: "park_required" });
        continue;
      }
      const park = await lookup.findPark(cityId as string, parkName);
      if (!park) {
        refusals.push({ ref: row.ref, code: "park_not_found" });
        continue;
      }
      if (!park.isActive) {
        refusals.push({ ref: row.ref, code: "park_inactive" });
        continue;
      }
      parkId = park.id;

      if (groupCode) {
        const group = await lookup.findGroup(parkId, groupCode);
        if (!group || !group.isActive) {
          refusals.push({ ref: row.ref, code: "group_not_found" });
          continue;
        }
        groupId = group.id;
      }
    }

    const existing = await lookup.findAccount(email);
    const matchesExisting =
      existing !== null &&
      existing.role === role &&
      existing.assignedCityId === cityId &&
      existing.assignedParkId === parkId &&
      existing.assignedGroupId === groupId;
    if (existing && !matchesExisting) {
      refusals.push({ ref: row.ref, code: "existing_account_conflict" });
      continue;
    }

    const entry: AccessPlanEntry = {
      ref: row.ref,
      email,
      role,
      cityId,
      parkId,
      groupId,
      groupUndecided: rule.allowsGroup && groupId === null,
      assistsRef: row.assistsRef?.trim() || null,
      outcome: matchesExisting ? "already-configured" : "create-active",
    };
    entries.push(entry);
    acceptedRefs.set(row.ref, entry);
  }

  // Assistance targets must be accepted rows in the same park, eligible to assist.
  const filtered: AccessPlanEntry[] = [];
  for (const entry of entries) {
    if (entry.role !== "muawin" || !entry.assistsRef) {
      filtered.push(entry);
      continue;
    }
    const target = acceptedRefs.get(entry.assistsRef);
    const eligible =
      target !== undefined &&
      target.parkId === entry.parkId &&
      (target.role === "murabbi" || (target.role === "park_lead" && target.groupId !== null));
    if (!eligible) {
      refusals.push({ ref: entry.ref, code: "assistance_target_invalid" });
      continue;
    }
    filtered.push(entry);
  }

  return { entries: filtered, refusals };
}

export interface AccessDryRunSummary {
  readonly mode: "dry-run";
  readonly writesPerformed: false;
  readonly total: number;
  readonly planned: number;
  readonly alreadyConfigured: number;
  readonly refused: number;
  readonly countsByRole: Readonly<Record<string, number>>;
  readonly refusalCodes: Readonly<Record<string, number>>;
  readonly requiresProtectedHandoff: boolean;
}

/** Aggregate-only projection. No ref, email, scope value or credential appears. */
export function summarizeAccessPlan(plan: AccessPlan): AccessDryRunSummary {
  const countsByRole: Record<string, number> = {};
  let alreadyConfigured = 0;
  for (const entry of plan.entries) {
    if (entry.outcome === "already-configured") alreadyConfigured += 1;
    else countsByRole[entry.role] = (countsByRole[entry.role] ?? 0) + 1;
  }
  const refusalCodes: Record<string, number> = {};
  for (const refusal of plan.refusals) refusalCodes[refusal.code] = (refusalCodes[refusal.code] ?? 0) + 1;

  return {
    mode: "dry-run",
    writesPerformed: false,
    total: plan.entries.length + plan.refusals.length,
    planned: plan.entries.length - alreadyConfigured,
    alreadyConfigured,
    refused: plan.refusals.length,
    countsByRole,
    refusalCodes,
    requiresProtectedHandoff: plan.entries.length - alreadyConfigured > 0,
  };
}

/** The exact acknowledgement an operator must supply for a live run. */
export const ACCESS_EXECUTION_CONFIRMATION = "CONFIRM-PRODUCTION-TEAM-ACCESS";

export interface AccessExecutionRequest {
  readonly execute: boolean;
  readonly confirmation: string | null;
  readonly target: "postgres" | null;
}

/** Execution is opt-in, explicitly confirmed and provider-limited. */
export function assertAccessExecutionAuthorized(request: AccessExecutionRequest): void {
  if (!request.execute) return;
  if (request.confirmation !== ACCESS_EXECUTION_CONFIRMATION) {
    throw new AccessRefusedError(
      "Refusing production provisioning without --confirm-production-team-access"
    );
  }
  if (request.target !== "postgres") {
    throw new AccessRefusedError("Production provisioning requires an explicit --target postgres");
  }
}

export interface AccessCredential {
  readonly email: string;
  readonly password: string;
}

/** Ports a later reviewed writer must supply. Tests supply fakes. */
export interface AccessWritePorts {
  /** Must protect every credential before any activation runs. */
  readonly writeProtectedHandoff: (credentials: readonly AccessCredential[]) => Promise<void>;
  readonly applyActivation: (entry: AccessPlanEntry, passwordHash: string) => Promise<void>;
}

export interface AccessApplySummary {
  readonly mode: "execute";
  readonly writesPerformed: true;
  readonly activated: number;
  readonly alreadyConfigured: number;
}

function generatePassword(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/**
 * Applies a plan through injected ports. It fails closed on any refusal in the plan,
 * writes the protected handoff **before** the first activation, and never returns or
 * logs a password.
 */
export async function applyAccessPlan(
  plan: AccessPlan,
  ports: AccessWritePorts
): Promise<AccessApplySummary> {
  if (plan.refusals.length > 0) {
    throw new AccessRefusedError(`Refusing to apply: the plan contains ${plan.refusals.length} refusal(s)`);
  }
  const pending = plan.entries.filter((entry) => entry.outcome === "create-active");
  const alreadyConfigured = plan.entries.length - pending.length;
  if (pending.length === 0) {
    return { mode: "execute", writesPerformed: true, activated: 0, alreadyConfigured };
  }

  const credentials: AccessCredential[] = pending.map((entry) => ({
    email: entry.email,
    password: generatePassword(),
  }));
  const hashes = await Promise.all(credentials.map((credential) => bcrypt.hash(credential.password, 12)));

  // Protected handoff first: a failure here must leave every account untouched.
  await ports.writeProtectedHandoff(credentials);

  for (let index = 0; index < pending.length; index += 1) {
    await ports.applyActivation(pending[index], hashes[index]);
  }

  return { mode: "execute", writesPerformed: true, activated: pending.length, alreadyConfigured };
}
