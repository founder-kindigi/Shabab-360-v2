"use client";
import { UnavailableWorkflow } from "@/components/ui/unavailable-workflow";
export function CommunityPage({ onBack }: { onBack?: () => void } = {}) {
 return <UnavailableWorkflow title="Community" onBack={onBack} />;
}
