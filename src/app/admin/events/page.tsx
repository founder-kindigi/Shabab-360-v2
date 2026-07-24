export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";

const EventsClient = nextDynamic(() => import("./_client"));

export default function EventsPage() {
  return <EventsClient />;
}
