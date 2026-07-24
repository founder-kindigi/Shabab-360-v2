export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const CallingClient = nextDynamic(() => import("./_client"));

export default function CallingPage() {
  return <CallingClient />;
}
