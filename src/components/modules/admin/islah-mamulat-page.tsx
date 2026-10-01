"use client";
import { UnavailableWorkflow } from "@/components/ui/unavailable-workflow";
export function IslahMamulatPage({ onBack }: { onBack?: () => void } = {}) {
 return <UnavailableWorkflow title="Islah-i-Mamulat" onBack={onBack} />;
}
