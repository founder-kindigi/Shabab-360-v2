"use client";
import { CommunityPage } from "./community-page";
export function MobileCommunityPage({ onBack }: { onBack?: () => void } = {}) {
 return <CommunityPage mobile onBack={onBack} />;
}
