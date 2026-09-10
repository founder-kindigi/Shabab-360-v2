import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveCityParkScope } from "@/lib/auth/hierarchy";

type SessionUser = {
  id?: string;
  role?: string;
};

export async function GET(request: Request) {
  const auth = await requireCapability("organisation.view");
  if (auth instanceof NextResponse) return auth;
  const scope = await resolveCityParkScope(auth.user);
  if (scope instanceof NextResponse) return scope;
  try {
    const items = await db.procurementItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    const parkStocksRaw = await db.parkStock.findMany({
      where: { ...(scope.parkId ? { parkId: scope.parkId } : {}), ...(scope.cityId ? { park: { cityId: scope.cityId } } : {}) },
      include: {
        park: { select: { id: true, name: true } },
      },
    });

    // Group by park
    const parkStocksMap = new Map<string, { parkId: string; parkName: string; items: any[] }>();
    for (const ps of parkStocksRaw) {
      if (!parkStocksMap.has(ps.parkId)) {
        parkStocksMap.set(ps.parkId, {
          parkId: ps.parkId,
          parkName: ps.park.name,
          items: [],
        });
      }
      parkStocksMap.get(ps.parkId)!.items.push({
        id: ps.id,
        itemId: ps.itemId,
        quantity: ps.quantity,
        minThreshold: ps.minThreshold,
        updatedAt: ps.updatedAt,
      });
    }

    const parkStocks = Array.from(parkStocksMap.values());

    return NextResponse.json({ items, parkStocks });
  } catch (error) {
    console.error("GET /api/inventory/central error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
