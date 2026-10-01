import { unavailableWorkflow } from "@/lib/api/unavailable";
export async function GET(_request: Request) { return unavailableWorkflow("Leave requests"); }
export async function POST(_request: Request) { return unavailableWorkflow("Leave requests"); }
