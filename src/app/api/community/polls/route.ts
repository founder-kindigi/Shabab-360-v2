import { unavailableWorkflow } from "@/lib/api/unavailable";
export async function GET(_request: Request) { return unavailableWorkflow("Community polls"); }
export async function POST(_request: Request) { return unavailableWorkflow("Community polls"); }
