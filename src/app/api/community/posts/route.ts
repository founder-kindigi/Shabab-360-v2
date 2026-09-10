import { unavailableWorkflow } from "@/lib/api/unavailable";
export function GET(): ReturnType<typeof unavailableWorkflow>;
export function GET(request: Request): ReturnType<typeof unavailableWorkflow>;
export async function GET(_request?: Request) { return unavailableWorkflow("Community posts"); }
export async function POST(_request: Request) { return unavailableWorkflow("Community posts"); }
