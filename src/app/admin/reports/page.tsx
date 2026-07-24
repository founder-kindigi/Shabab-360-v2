export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const ReportsClient = nextDynamic(() => import("./_client"));

export default function ReportsPage() {
  return <ReportsClient />;
}
