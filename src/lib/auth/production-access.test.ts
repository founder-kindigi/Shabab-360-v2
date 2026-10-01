import { describe, expect, it, vi } from "vitest";
import {
  ACCESS_EXECUTION_CONFIRMATION,
  AccessRefusedError,
  applyAccessPlan,
  assertAccessExecutionAuthorized,
  buildAccessPlan,
  summarizeAccessPlan,
  type AccessCredential,
  type AccessLookupPort,
  type AccessRequestRow,
} from "./production-access";

const CITY = { id: "city-lhr", isActive: true };
const PARK = { id: "park-gulberg", isActive: true };
const GROUP = { id: "group-1", isActive: true };

function lookup(overrides: Partial<AccessLookupPort> = {}): AccessLookupPort {
  return {
    findCity: vi.fn(async (code: string) => (code === "LHR" ? CITY : null)),
    findPark: vi.fn(async (cityId: string, name: string) =>
      cityId === CITY.id && name === "Gulberg" ? PARK : null
    ),
    findGroup: vi.fn(async (parkId: string, code: string) =>
      parkId === PARK.id && code === "Group 1" ? GROUP : null
    ),
    findAccount: vi.fn(async () => null),
    ...overrides,
  };
}

const cityHead: AccessRequestRow = {
  ref: "row-1",
  email: "head@example.invalid",
  role: "City Head",
  cityCode: "LHR",
};
const murabbi: AccessRequestRow = {
  ref: "row-2",
  email: "murabbi@example.invalid",
  role: "murabbi",
  cityCode: "LHR",
  parkName: "Gulberg",
  groupCode: "Group 1",
};

describe("access planning (dry run)", () => {
  it("produces a plan with no writes and an aggregate-only summary", async () => {
    const plan = await buildAccessPlan([cityHead, murabbi], lookup());

    expect(plan.refusals).toEqual([]);
    expect(plan.entries.map((entry) => entry.role)).toEqual(["city_head", "murabbi"]);
    expect(plan.entries[1].groupId).toBe(GROUP.id);

    const summary = summarizeAccessPlan(plan);
    expect(summary.writesPerformed).toBe(false);
    expect(summary.planned).toBe(2);
    expect(summary.requiresProtectedHandoff).toBe(true);
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("example.invalid");
    expect(serialized).not.toContain("city-lhr");
  });

  it("keeps the plan free of passwords and reports no credential field", async () => {
    const plan = await buildAccessPlan([cityHead], lookup());
    expect(JSON.stringify(plan)).not.toMatch(/password/i);
  });
});

describe("execution gating", () => {
  it("does nothing when execute is not requested", () => {
    expect(() =>
      assertAccessExecutionAuthorized({ execute: false, confirmation: null, target: null })
    ).not.toThrow();
  });

  it("refuses execution without the exact confirmation and postgres target", () => {
    expect(() =>
      assertAccessExecutionAuthorized({ execute: true, confirmation: null, target: "postgres" })
    ).toThrow(AccessRefusedError);
    expect(() =>
      assertAccessExecutionAuthorized({ execute: true, confirmation: "yes", target: "postgres" })
    ).toThrow(/confirm-production-team-access/);
    expect(() =>
      assertAccessExecutionAuthorized({
        execute: true,
        confirmation: ACCESS_EXECUTION_CONFIRMATION,
        target: null,
      })
    ).toThrow(/target postgres/);
    expect(() =>
      assertAccessExecutionAuthorized({
        execute: true,
        confirmation: ACCESS_EXECUTION_CONFIRMATION,
        target: "postgres",
      })
    ).not.toThrow();
  });

  it("refuses to apply any plan that still contains a refusal", async () => {
    const plan = await buildAccessPlan([{ ...cityHead, cityCode: null }], lookup());
    const writeProtectedHandoff = vi.fn(async () => {});
    const applyActivation = vi.fn(async () => {});

    await expect(applyAccessPlan(plan, { writeProtectedHandoff, applyActivation })).rejects.toThrow(
      /refusal/
    );
    expect(writeProtectedHandoff).not.toHaveBeenCalled();
    expect(applyActivation).not.toHaveBeenCalled();
  });
});

describe("protected handoff ordering", () => {
  it("prevents every activation when handoff protection fails", async () => {
    const plan = await buildAccessPlan([cityHead], lookup());
    const writeProtectedHandoff = vi.fn(async () => {
      throw new Error("DPAPI encryption failed");
    });
    const applyActivation = vi.fn(async () => {});

    await expect(applyAccessPlan(plan, { writeProtectedHandoff, applyActivation })).rejects.toThrow(
      /DPAPI/
    );
    expect(writeProtectedHandoff).toHaveBeenCalledTimes(1);
    expect(applyActivation).not.toHaveBeenCalled();
  });

  it("writes the protected handoff before the first activation and never returns a password", async () => {
    const plan = await buildAccessPlan([cityHead], lookup());
    const captured: AccessCredential[][] = [];
    const order: string[] = [];
    const ports = {
      writeProtectedHandoff: vi.fn(async (credentials: readonly AccessCredential[]) => {
        captured.push([...credentials]);
        order.push("handoff");
      }),
      applyActivation: vi.fn(async () => {
        order.push("activate");
      }),
    };

    const result = await applyAccessPlan(plan, ports);

    expect(order).toEqual(["handoff", "activate"]);
    expect(result).toMatchObject({ mode: "execute", writesPerformed: true, activated: 1 });
    const summary = JSON.stringify(result);
    for (const credential of captured[0]) {
      expect(summary).not.toContain(credential.password);
      expect(summary).not.toContain(credential.email);
    }
    expect(ports.applyActivation).toHaveBeenCalledWith(
      expect.objectContaining({ role: "city_head", cityId: CITY.id, parkId: null }),
      expect.stringMatching(/^\$2/)
    );
  });
});

describe("scope validation", () => {
  it("denies a City Head with no city, an unknown city or an inactive city", async () => {
    const missing = await buildAccessPlan([{ ...cityHead, cityCode: null }], lookup());
    expect(missing.refusals).toEqual([{ ref: "row-1", code: "city_required" }]);

    const unknown = await buildAccessPlan([{ ...cityHead, cityCode: "KHI" }], lookup());
    expect(unknown.refusals).toEqual([{ ref: "row-1", code: "city_not_found" }]);

    const inactive = await buildAccessPlan(
      [cityHead],
      lookup({ findCity: vi.fn(async () => ({ id: CITY.id, isActive: false })) })
    );
    expect(inactive.refusals).toEqual([{ ref: "row-1", code: "city_inactive" }]);
    expect(inactive.entries).toEqual([]);
  });

  it("requires park scope for park roles and a resolvable group when one is given", async () => {
    const noPark = await buildAccessPlan(
      [{ ref: "r", email: "lead@example.invalid", role: "Park Lead", cityCode: "LHR" }],
      lookup()
    );
    expect(noPark.refusals).toEqual([{ ref: "r", code: "park_required" }]);

    const badPark = await buildAccessPlan(
      [{ ref: "r", email: "lead@example.invalid", role: "Park Lead", cityCode: "LHR", parkName: "Other" }],
      lookup()
    );
    expect(badPark.refusals).toEqual([{ ref: "r", code: "park_not_found" }]);

    const badGroup = await buildAccessPlan(
      [{ ...murabbi, groupCode: "Group 9" }],
      lookup()
    );
    expect(badGroup.refusals).toEqual([{ ref: "row-2", code: "group_not_found" }]);
  });

  it("lets a Murabbi be active without a group and marks the group undecided", async () => {
    const plan = await buildAccessPlan(
      [{ ref: "r", email: "m@example.invalid", role: "murabbi", cityCode: "LHR", parkName: "Gulberg" }],
      lookup()
    );
    expect(plan.refusals).toEqual([]);
    expect(plan.entries[0]).toMatchObject({ groupId: null, groupUndecided: true, parkId: PARK.id });
  });

  it("never assigns a group to a Muawin and requires same-park assistance", async () => {
    const withGroup = await buildAccessPlan(
      [
        {
          ref: "mu",
          email: "mu@example.invalid",
          role: "Muawin",
          cityCode: "LHR",
          parkName: "Gulberg",
          groupCode: "Group 1",
        },
      ],
      lookup()
    );
    expect(withGroup.refusals).toEqual([{ ref: "mu", code: "group_not_allowed" }]);

    const samePark = await buildAccessPlan(
      [
        murabbi,
        {
          ref: "mu",
          email: "mu@example.invalid",
          role: "Muawin",
          cityCode: "LHR",
          parkName: "Gulberg",
          assistsRef: "row-2",
        },
      ],
      lookup()
    );
    expect(samePark.refusals).toEqual([]);
    const muawin = samePark.entries.find((entry) => entry.role === "muawin");
    expect(muawin).toMatchObject({ groupId: null, assistsRef: "row-2" });

    const crossPark = await buildAccessPlan(
      [
        {
          ref: "mu",
          email: "mu@example.invalid",
          role: "Muawin",
          cityCode: "LHR",
          parkName: "Gulberg",
          assistsRef: "row-1",
        },
        cityHead,
      ],
      lookup()
    );
    expect(crossPark.refusals).toEqual([{ ref: "mu", code: "assistance_target_invalid" }]);
  });
});

describe("duplicates and idempotency", () => {
  it("refuses a repeated email in the same request", async () => {
    const plan = await buildAccessPlan([cityHead, { ...cityHead, ref: "row-9" }], lookup());
    expect(plan.refusals).toEqual([{ ref: "row-9", code: "duplicate_email" }]);
    expect(plan.entries).toHaveLength(1);
  });

  it("treats an identical existing account as already configured", async () => {
    const plan = await buildAccessPlan(
      [cityHead],
      lookup({
        findAccount: vi.fn(async () => ({
          userId: "u1",
          role: "city_head",
          isActive: true,
          assignedCityId: CITY.id,
          assignedParkId: null,
          assignedGroupId: null,
        })),
      })
    );
    expect(plan.refusals).toEqual([]);
    expect(plan.entries[0].outcome).toBe("already-configured");
    const summary = summarizeAccessPlan(plan);
    expect(summary).toMatchObject({ planned: 0, alreadyConfigured: 1, requiresProtectedHandoff: false });
  });

  it("refuses an existing account whose role or scope differs", async () => {
    const plan = await buildAccessPlan(
      [cityHead],
      lookup({
        findAccount: vi.fn(async () => ({
          userId: "u1",
          role: "park_lead",
          isActive: true,
          assignedCityId: CITY.id,
          assignedParkId: PARK.id,
          assignedGroupId: null,
        })),
      })
    );
    expect(plan.refusals).toEqual([{ ref: "row-1", code: "existing_account_conflict" }]);
    expect(plan.entries).toEqual([]);
  });
});

describe("role authorization", () => {
  it("refuses the system-owner identity, non-staff roles and unknown roles", async () => {
    const plan = await buildAccessPlan(
      [
        { ref: "a", email: "a@example.invalid", role: "System Owner", cityCode: "LHR" },
        { ref: "b", email: "b@example.invalid", role: "Shabab", cityCode: "LHR", parkName: "Gulberg" },
        { ref: "c", email: "c@example.invalid", role: "Guardian", cityCode: "LHR" },
        { ref: "d", email: "d@example.invalid", role: "super_admin" },
        { ref: "e", email: "e@example.invalid", role: "not-a-role", cityCode: "LHR" },
        { ref: "f", email: "not-an-email", role: "City Head", cityCode: "LHR" },
      ],
      lookup()
    );
    expect(plan.entries).toEqual([]);
    expect(plan.refusals).toEqual([
      { ref: "a", code: "system_owner_role" },
      { ref: "b", code: "non_staff_role" },
      { ref: "c", code: "non_staff_role" },
      { ref: "d", code: "system_owner_role" },
      { ref: "e", code: "unknown_role" },
      { ref: "f", code: "missing_work_email" },
    ]);
  });
});
