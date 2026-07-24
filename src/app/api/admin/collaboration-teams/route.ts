import { NextRequest, NextResponse } from "next/server";
import { GET as getTeams } from "@/app/api/admin/teams/route";

export async function GET(request: NextRequest) {
  return getTeams(request);
}
