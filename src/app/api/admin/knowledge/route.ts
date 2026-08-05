import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireCapability } from "@/lib/auth/authorize";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createArticleSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(200),
  slug: z.string().trim().min(3, "Slug must be at least 3 characters").max(100),
  content: z.string().trim().min(20, "Content must be at least 20 characters"),
  category: z.enum(["best_practices", "operational_guide", "faq", "training"]),
  tags: z.string().trim().optional(),
  isPublished: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const capAuth = await requireCapability("settings.manage");
  if (capAuth instanceof NextResponse) return capAuth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existingSlug = await db.knowledgeArticle.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existingSlug) {
    return NextResponse.json({ error: "Article slug already exists" }, { status: 409 });
  }

  const article = await db.knowledgeArticle.create({
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      content: parsed.data.content,
      category: parsed.data.category,
      tags: parsed.data.tags || null,
      isPublished: parsed.data.isPublished,
      authorId: user.id!,
    },
  });

  logAudit({
    userId: user.id!,
    action: "knowledge.article.create",
    entityType: "knowledge_article",
    entityId: article.id,
    newValues: {
      title: article.title,
      slug: article.slug,
      category: article.category,
      isPublished: article.isPublished,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
