export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isHqRole } from "@/lib/auth/scope";
import { resolveActorCity } from "@/lib/auth/events-scope";
import { redirect } from "next/navigation";

const MashwaraDetailClient = nextDynamic<any>(() => import("./_client"));

export default async function MashwaraDetailPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = session.user as any;
  const [canView, canManage] = await Promise.all([
    userHasCapability(user, "mashwara.view"),
    userHasCapability(user, "mashwara.manage"),
  ]);

  if (!canView) {
    redirect("/admin");
  }

  const isHq = isHqRole(user.role);
  let actorCityId: string | null = null;

  if (!isHq) {
    const actorCityResult = await resolveActorCity(user);
    if (!actorCityResult.error && actorCityResult.cityId) {
      actorCityId = actorCityResult.cityId;
    }
  }

  return (
    <MashwaraDetailClient
      canView={canView}
      canManage={canManage}
      isHq={isHq}
      actorCityId={actorCityId}
    />
  );
}
