import { NextRequest } from "next/server";
import { GET as getMembers, POST as addMember } from "@/app/api/admin/teams/[id]/members/route";

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { teamId } = await params;
  return getMembers(request, { params: Promise.resolve({ id: teamId }) });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { teamId } = await params;
  return addMember(request, { params: Promise.resolve({ id: teamId }) });
}
