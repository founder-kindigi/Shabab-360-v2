import { db } from "@/lib/db";
import { isStaffRole } from "./scope";

/** Refresh roles and assignments from durable records, never from an old JWT. */
export async function resolveActiveIdentity(userId: string) {
  const staff = await db.staffMeta.findUnique({
    where: { userId },
    include: { assignedCity: true, assignedPark: true, assignedGroup: { include: { park: true, batch: { include: { park: true } } } } },
  });
  if (staff) {
    if (!staff.isActive || !isStaffRole(staff.role)) return null;
    let cityId = staff.assignedCityId;
    let parkId = staff.assignedParkId;
    if (staff.role === "city_head" && (!cityId || !staff.assignedCity?.isActive)) return null;
    if (["park_admin", "park_lead"].includes(staff.role)) {
      if (!parkId || !staff.assignedPark?.isActive || (cityId && cityId !== staff.assignedPark.cityId)) return null;
      cityId = staff.assignedPark.cityId;
    }
    if (staff.role === "murabbi") {
      const group = staff.assignedGroup;
      const park = group?.parkId ? group.park : group?.batch.park;
      if (!group?.isActive || !group.batch.isActive || !park?.isActive || (group.batch.cityId && group.batch.cityId !== park.cityId) || (cityId && cityId !== park.cityId) || (parkId && parkId !== park.id)) return null;
      cityId = park.cityId;
      parkId = park.id;
    }
    return { role: staff.role, assignedCityId: cityId, assignedParkId: parkId, assignedGroupId: staff.assignedGroupId };
  }
  const guardian = await db.guardian.findUnique({ where: { userId }, select: { id: true, isActive: true, children: { select: { id: true }, take: 1 } } });
  if (guardian?.isActive && guardian.children.length) return { role: "guardian", assignedCityId: null, assignedParkId: null, assignedGroupId: null };
  const participant = await db.participant.findUnique({ where: { userId }, select: { id: true, state: true } });
  if (participant && participant.state !== "inactive") return { role: "student", assignedCityId: null, assignedParkId: null, assignedGroupId: null };
  return null;
}
