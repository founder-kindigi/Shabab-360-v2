"use client";

import { useParams, useSearchParams } from "next/navigation";
import { StudentProfilePage } from "@/components/modules/student-profile/profile-page";

export default function ExtendedProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const participantId = (params?.participantId as string) || searchParams.get("participantId");
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
