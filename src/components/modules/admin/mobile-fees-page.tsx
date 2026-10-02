"use client";
import { useSession } from "next-auth/react";
import { FeesPage } from "./fees-page";
import { GuardianFeesPage } from "@/components/modules/guardian/guardian-fees-page";
import { StudentFeesPage } from "@/components/modules/student/student-fees-page";
export function MobileFeesPage({ onBack }: { onBack?: () => void }) {
  const { data: session } = useSession(); const role = session?.user?.role;
  if (role !== "guardian" && role !== "student") return <FeesPage key={session?.user?.id} mobile onBack={onBack} />;
  return <section className="max-w-[460px] mx-auto p-4 pb-28"><button className="rounded-full px-3 py-2 bg-slate-100 dark:bg-white/10 text-xs font-bold mb-4" onClick={onBack}>Back</button>{role === "guardian" ? <GuardianFeesPage /> : <StudentFeesPage />}</section>;
}
