import { redirect } from "next/navigation";
import type { JSX } from "react";

export default async function MashwaraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const { id } = await params;
  redirect(
    `/?page=admin-mashwara-detail&id=${encodeURIComponent(id)}`
  );
}
