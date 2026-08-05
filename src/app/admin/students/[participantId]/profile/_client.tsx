"use client";

import { useSearchParams } from "next/navigation";
import { StudentProfilePage } from "@/components/modules/student-profile/profile-page";

export default function ExtendedProfilePage() {
  const searchParams = useSearchParams();
  const participantId = searchParams.get("participantId");
  if (!participantId) {
    return <div className="p-4 text-muted-foreground">No participant selected.</div>;
  }
  const capabilities = {
    canView: true,
    canEdit: true,
    canManage: true,
    canViewSensitive: true,
    canManageSensitive: true,
    isGuardian: false,
    isSelf: false,
  };
  return <StudentProfilePage participantId={participantId} capabilities={capabilities} />;
}
