export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const TemplatesClient = nextDynamic(() => import("./_client"));

export default function TemplatesPage() {
  return <TemplatesClient />;
}
