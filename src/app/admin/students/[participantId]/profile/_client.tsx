"use client";

import { StudentProfilePage, ProfileCapabilities } from "@/components/modules/student-profile/profile-page";

export default function ExtendedProfilePage({
  participantId,
  capabilities,
  isHqRole,
  cityId,
}: {
  participantId: string;
  capabilities: ProfileCapabilities;
  isHqRole: boolean;
  cityId?: string;
}) {
  if (!participantId) {
    return <div className="p-4 text-muted-foreground">No participant selected.</div>;
  }

  if (isHqRole && !cityId) {
    return (
      <div className="p-4 text-muted-foreground">
        Please select a city context (add ?cityId=... to the URL) to view this profile.
      </div>
    );
  }

  return (
    <StudentProfilePage
      participantId={participantId}
      capabilities={capabilities}
      cityId={cityId}
    />
  );
}
