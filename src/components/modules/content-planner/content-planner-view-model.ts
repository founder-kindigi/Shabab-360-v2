export function buildContentPlansUrl(input: {
  isHq: boolean;
  cityId: string;
  status: string;
}) {
  const params = new URLSearchParams();
  if (input.isHq && input.cityId) params.set("cityId", input.cityId);
  if (input.status !== "all") params.set("status", input.status);
  params.set("pageSize", "50");
  return `/api/admin/content-planner/plans?${params.toString()}`;
}

export function choosePreferredPlan<T extends { status: string }>(plans: T[]) {
  return plans.find((plan) => plan.status === "published") ?? plans[0] ?? null;
}

export function choosePreferredSession<
  T extends { isOffDay: boolean; status: string },
>(sessions: T[]) {
  return (
    sessions.find(
      (session) => !session.isOffDay && session.status !== "cancelled"
    ) ?? sessions[0] ?? null
  );
}

export function blocksForCategory<T extends { category: string }>(
  blocks: T[],
  category: string
) {
  return blocks.filter((block) => block.category === category);
}
