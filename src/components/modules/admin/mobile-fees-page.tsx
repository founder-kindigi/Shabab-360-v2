"use client";
import { useSession } from "next-auth/react";
import { FeesPage } from "./fees-page";
import { GuardianFeesPage } from "@/components/modules/guardian/guardian-fees-page";
import { StudentFeesPage } from "@/components/modules/student/student-fees-page";
export function MobileFeesPage({ onBack }: { onBack?: () => void }) { const { data: session } = useSession(); const role = session?.user?.role; return <section className="p-4 pb-28"><button onClick={onBack}>Back</button>{role === "guardian" ? <GuardianFeesPage /> : role === "student" ? <StudentFeesPage /> : <FeesPage key={session?.user?.id} />}</section>; }
