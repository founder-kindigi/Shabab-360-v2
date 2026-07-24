export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const ProfileClient = nextDynamic(() => import("./_client"));

export default function ExtendedProfilePage() {
  return <ProfileClient />;
}
