import { redirect } from "next/navigation";

export default async function MashwaraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/?page=admin-mashwara-detail&id=${encodeURIComponent(id)}`);
}
