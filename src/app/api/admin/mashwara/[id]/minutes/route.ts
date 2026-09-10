import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth/authorize";
import { resolveMashwaraAccess } from "@/lib/auth/mashwara-scope";
import { db } from "@/lib/db";
import {
  generateMashwaraMinutes,
  MashwaraMeetingData,
} from "@/lib/mashwara/export-minutes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCapability("mashwara.view");
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

  const { id: meetingId } = await params;

  const meeting = await db.mashwaraMeeting.findUnique({
    where: { id: meetingId },
    include: {
      city: { select: { name: true } },
      attendees: {
        include: {
          staffMeta: {
            select: { user: { select: { name: true } } },
          },
        },
      },
      decisions: true,
      actionItems: {
        include: {
          assignedTo: {
            select: { user: { select: { name: true } } },
          },
          team: { select: { name: true } },
        },
      },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Mashwara meeting not found" }, { status: 404 });
  }

  const access = await resolveMashwaraAccess(user, meeting);
  if (!access) {
    return NextResponse.json(
      { error: "Access denied: meeting is outside assigned scope" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const formatParam = (url.searchParams.get("format") || "html").toLowerCase();
  const langParam = (url.searchParams.get("lang") || "en").toLowerCase();
  if (!["html", "markdown", "json"].includes(formatParam) || !["en", "ur"].includes(langParam)) return NextResponse.json({ error: "Unsupported export format or language" }, { status: 400 });

  const meetingData: MashwaraMeetingData = {
    id: meeting.id,
    title: meeting.title,
    meetingDate: meeting.scheduledAt,
    cityName: meeting.city.name,
    notes: meeting.minutesSummary,
    status: meeting.status,
    attendees: meeting.attendees.map((a) => ({
      name: a.staffMeta.user.name || "Unknown",
      isPresent: a.attendanceStatus === "present",
    })),
    decisions: meeting.decisions.map((d) => ({
      title: d.decision,
      category: d.category || undefined,
    })),
    actionItems: meeting.actionItems.map((item) => ({
      title: item.description,
      assigneeName: item.assignedTo?.user.name || undefined,
      teamName: item.team?.name,
      dueDate: item.dueDate,
      status: item.status,
    })),
  };

  const result = generateMashwaraMinutes(meetingData, {
    format: formatParam === "markdown" ? "markdown" : "html",
    lang: langParam === "ur" ? "ur" : "en",
  });

  if (formatParam === "json") {
    return NextResponse.json(meetingData, { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }

  return new NextResponse(result.content, {
    status: 200,
    headers: {
      "Content-Type": `${result.mimeType}; charset=utf-8`,
      "Content-Disposition": `${formatParam === "html" ? "inline" : "attachment"}; filename="mashwara-minutes.${formatParam === "html" ? "html" : "md"}"`,
      "Content-Security-Policy": "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
