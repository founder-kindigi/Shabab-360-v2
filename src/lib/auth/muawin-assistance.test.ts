import { describe, expect, it, vi } from "vitest";
import { validateMuawinAssistance } from "./muawin-assistance";

const target = {
  id: "murabbi-1",
  role: "murabbi",
  isActive: true,
  assignedParkId: "park-1",
  assignedGroupId: null,
  user: { isActive: true },
  assignedGroup: null,
};

describe("validateMuawinAssistance", () => {
  it("allows a same-park active Murabbi without giving the Muawin group scope", async () => {
    const findUnique = vi.fn().mockResolvedValue(target);
    await expect(validateMuawinAssistance({
      role: "muawin", assignedParkId: "park-1", assistsMurabbiId: "murabbi-1", staffMeta: { findUnique },
    })).resolves.toBeNull();
  });

  it("allows a teaching Park Lead only when their group belongs to the Muawin park", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      ...target, role: "park_lead", assignedGroupId: "group-1", assignedGroup: { parkId: "park-1" },
    });
    await expect(validateMuawinAssistance({
      role: "muawin", assignedParkId: "park-1", assistsMurabbiId: "lead-1", staffMeta: { findUnique },
    })).resolves.toBeNull();
  });

  it("rejects inactive, cross-park, and non-teaching targets", async () => {
    for (const invalid of [
      { ...target, isActive: false },
      { ...target, assignedParkId: "park-2" },
      { ...target, role: "park_lead" },
    ]) {
      const findUnique = vi.fn().mockResolvedValue(invalid);
      await expect(validateMuawinAssistance({
        role: "muawin", assignedParkId: "park-1", assistsMurabbiId: "target", staffMeta: { findUnique },
      })).resolves.toBe("Selected staff member must be an active Murabbi or teaching Park Lead in the assigned park");
    }
  });

  it("rejects a link for another role and clears an omitted link", async () => {
    const findUnique = vi.fn();
    await expect(validateMuawinAssistance({
      role: "park_lead", assignedParkId: "park-1", assistsMurabbiId: "murabbi-1", staffMeta: { findUnique },
    })).resolves.toBe("Only Muawin staff can be linked to an assisting Murabbi");
    await expect(validateMuawinAssistance({
      role: "muawin", assignedParkId: "park-1", assistsMurabbiId: null, staffMeta: { findUnique },
    })).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
