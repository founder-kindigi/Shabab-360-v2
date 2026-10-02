export type MuawinAssistanceTarget = {
  id: string;
  role: string;
  isActive: boolean;
  assignedParkId: string | null;
  assignedGroupId: string | null;
  user: { isActive: boolean };
  assignedGroup: { parkId: string | null } | null;
};

export type MuawinAssistanceReader = {
  findUnique(args: {
    where: { id: string };
    select: Record<string, unknown>;
  }): Promise<MuawinAssistanceTarget | null>;
};

/**
 * This relationship is organisational information only. It never contributes
 * to hierarchy scope or effective capabilities.
 */
export async function validateMuawinAssistance({
  role,
  assignedParkId,
  assistsMurabbiId,
  staffMetaId,
  staffMeta,
}: {
  role: string | undefined;
  assignedParkId: string | null;
  assistsMurabbiId: string | null;
  staffMetaId?: string;
  staffMeta: MuawinAssistanceReader;
}): Promise<string | null> {
  if (assistsMurabbiId === null) return null;

  if (role !== "muawin") {
    return "Only Muawin staff can be linked to an assisting Murabbi";
  }
  if (!assignedParkId) {
    return "Muawin must have a park assignment before assigning an assisting Murabbi";
  }
  if (staffMetaId === assistsMurabbiId) {
    return "A Muawin cannot assist themselves";
  }

  const target = await staffMeta.findUnique({
    where: { id: assistsMurabbiId },
    select: {
      id: true,
      role: true,
      isActive: true,
      assignedParkId: true,
      assignedGroupId: true,
      user: { select: { isActive: true } },
      assignedGroup: { select: { parkId: true } },
    },
  });

  const isMurabbi = target?.role === "murabbi";
  const isTeachingParkLead =
    target?.role === "park_lead" &&
    Boolean(target.assignedGroupId) &&
    target.assignedGroup?.parkId === assignedParkId;
  if (
    !target ||
    !target.isActive ||
    !target.user.isActive ||
    target.assignedParkId !== assignedParkId ||
    (!isMurabbi && !isTeachingParkLead)
  ) {
    return "Selected staff member must be an active Murabbi or teaching Park Lead in the assigned park";
  }

  return null;
}
