export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const ContentPlannerClient = nextDynamic(() => import("./_client"));

export default function ContentPlannerPage() {
  return <ContentPlannerClient />;
}
