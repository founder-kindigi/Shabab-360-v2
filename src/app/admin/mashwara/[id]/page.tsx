export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const MashwaraDetailClient = nextDynamic(() => import("./_client"));

export default function MashwaraDetailPage() {
  return <MashwaraDetailClient />;
}
