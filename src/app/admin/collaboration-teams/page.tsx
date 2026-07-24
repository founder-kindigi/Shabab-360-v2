export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const TeamsContent = nextDynamic(() => import("@/components/modules/admin/collaboration-teams-page").then(m => ({ default: m.CollaborationTeamsPage })));

export default function CollaborationTeamsPageRoute() {
  return <TeamsContent />;
}
