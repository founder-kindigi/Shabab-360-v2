import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const m = vi.hoisted(() => ({
  user: {} as any,
  park: vi.fn(), group: vi.fn(), payments: vi.fn(), orders: vi.fn(), adjustments: vi.fn(), donations: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  park: { findUnique: m.park }, group: { findUnique: m.group },
  payment: { findMany: m.payments }, purchaseOrder: { findMany: m.orders },
  financialAdjustment: { findMany: m.adjustments }, feeDonation: { findMany: m.donations },
} }));
vi.mock("@/lib/auth/authorize", async (original) => ({
  ...await original<typeof import("@/lib/auth/authorize")>(),
  requireAuth: async () => ({ user: m.user }), requireCapability: async () => ({ user: m.user }),
}));
import { groupResourceScope, resolveCityParkScope, resolveRequestedHierarchy } from "./hierarchy";
import { GET as orders } from "@/app/api/admin/procurement/orders/route";
import { GET as adjustments } from "@/app/api/admin/finance/adjustments/route";
import { GET as reconciliation } from "@/app/api/admin/finance/reconciliation/route";
describe("validated hierarchy and finance consumers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.user = { id: "actor", role: "park_admin", assignedParkId: "park-a" };
    m.park.mockImplementation(async ({ where }) => ({ id: where.id, cityId: where.id === "park-c" ? "city-b" : "city-a", isActive: true }));
    for (const fn of [m.orders, m.adjustments, m.payments, m.donations]) fn.mockResolvedValue([]);
  });
  it("derives city for park-only users and retains their park", async () => {
    expect(await resolveCityParkScope(m.user)).toEqual({ kind: "park", cityId: "city-a", parkId: "park-a", groupId: null });
  });
  it.each(["park-b", "park-c"])("denies foreign park %s even with a capability grant", async (parkId) => {
    const result = await adjustments(new NextRequest(`http://localhost?parkId=${parkId}`));
    expect(result.status).toBe(403);
    expect(m.adjustments).not.toHaveBeenCalled();
  });
  it("restricts omitted order filters to the actor park", async () => {
    expect((await orders(new NextRequest("http://localhost"))).status).toBe(200);
    expect(m.orders).toHaveBeenCalledWith(expect.objectContaining({ where: { cityId: "city-a", parkId: "park-a" } }));
  });
  it("rejects foreign reconciliation park without a city query", async () => {
    m.user = { id: "actor", role: "city_head", assignedCityId: "city-a" };
    expect((await reconciliation(new NextRequest("http://localhost?parkId=park-c"))).status).toBe(403);
    expect(m.payments).not.toHaveBeenCalled();
  });
  it("keeps city and group-park predicates conjunctive for all payments", async () => {
    expect((await reconciliation(new NextRequest("http://localhost"))).status).toBe(200);
    const query = m.payments.mock.calls[0][0].where;
    expect(query.participant.group.AND).toHaveLength(2);
    expect(JSON.stringify(query)).toContain("city-a");
    expect(JSON.stringify(query)).toContain("park-a");
  });
  it.each(["city_head", "park_lead", "park_admin", "murabbi", "student", "unknown"])("denies missing assignment for %s", async (role) => {
    expect(await resolveRequestedHierarchy({ id: "actor", role })).toBeInstanceOf(NextResponse);
  });
  it("never replaces a present group park with its batch anchor", () => {
    const group = { id: "group", parkId: "park-b", park: { cityId: "city-a" }, batch: { cityId: "city-a", parkId: "park-a", park: { cityId: "city-a" } } };
    expect(groupResourceScope(group)?.parkId).toBe("park-b");
    expect(groupResourceScope({ ...group, park: { cityId: "city-b" } })).toBeNull();
    expect(groupResourceScope({ ...group, parkId: null, park: null })?.parkId).toBe("park-a");
  });
  it("denies group-scoped actors city/park finance even if granted the capability", async () => {
    m.user = { id: "actor", role: "murabbi", assignedGroupId: "group" };
    m.group.mockResolvedValue({ id: "group", parkId: "park-a", park: { cityId: "city-a" }, batch: { cityId: "city-a" } });
    expect(await resolveCityParkScope(m.user)).toBeInstanceOf(NextResponse);
  });
});
