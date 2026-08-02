import { redirect } from "next/navigation";
import type { JSX } from "react";

export default function MashwaraPage(): JSX.Element {
  redirect("/?page=admin-mashwara");
}
