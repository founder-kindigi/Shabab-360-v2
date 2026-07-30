import { redirect } from "next/navigation";

export default function MashwaraDetailPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/?page=admin-mashwara-detail&id=${params.id}`);
}
