import { redirect } from "next/navigation";
import type { JSX } from "react";

export default async function MashwaraDetailPage({
  params,
}: {
  params?: Promise<{ id: string }>;
} = {}): Promise<JSX.Element> {
  const resolvedParams = params ? await params : { id: "" };
  redirect(
    `/?page=admin-mashwara-detail${
      resolvedParams.id ? `&id=${encodeURIComponent(resolvedParams.id)}` : ""
    }`
  );
}
