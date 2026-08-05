import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const categoryFilter = url.searchParams.get("category");

  const where: any = { isPublished: true };
  if (categoryFilter) where.category = categoryFilter;

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { content: { contains: query } },
      { tags: { contains: query } },
    ];
  }

  const articles = await db.knowledgeArticle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(articles);
}
