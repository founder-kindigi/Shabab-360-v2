"use client";
import { MobileAttendancePage } from "@/components/modules/park/mobile-attendance-page";
export function AttendanceTab({ parkId }: { parkId: string }) {
  return <MobileAttendancePage key={parkId} parkId={parkId} />;
}
