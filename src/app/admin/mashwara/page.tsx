export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const MashwaraDashboardClient = nextDynamic(() => import("./_client"));

export default function MashwaraPage() {
  return <MashwaraDashboardClient />;
}
