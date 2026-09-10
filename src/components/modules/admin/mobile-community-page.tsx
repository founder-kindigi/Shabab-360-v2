"use client";
import { UnavailableWorkflow } from "@/components/ui/unavailable-workflow";
export function MobileCommunityPage({ onBack }: { onBack?: () => void } = {}) {
 return <UnavailableWorkflow title="Community" onBack={onBack} />;
}
