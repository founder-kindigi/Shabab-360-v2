export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const EventDetailClient = nextDynamic(() => import("./_client"));

export default function EventDetailPage() {
  return <EventDetailClient />;
}
