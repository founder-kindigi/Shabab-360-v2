import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { z } from "zod";

const createPostSchema = z.object({
  content: z.string().min(1, "Post content is required").max(3000, "Content too long"),
  category: z.enum(["karguzari", "inspiration", "question", "announcement"]).default("karguzari"),
  tags: z.array(z.string()).optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth || auth instanceof NextResponse) return auth as NextResponse;

  return NextResponse.json({
    success: true,
    data: [
      {
        id: "post-1",
        authorName: "Hanzala Tauseef",
        authorRole: "Murabbi & Tadreeb Lead",
        category: "announcement",
        content: "Assalamu Alaikum Shabab team! Super excited for this Saturday's sports gala at Gulberg Park. Please ensure all Group 1 & 2 participants arrive by 7:45 AM sharply.",
        likes: 34,
        commentsCount: 5,
        isPinned: true,
        tags: ["#SportsGala", "#GulbergPark", "#Shabab360"],
        createdAt: "2 hours ago",
      },
    ],
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth || auth instanceof NextResponse) return auth as NextResponse;

  try {
    const body = await req.json();
    const parsed = createPostSchema.parse(body);

    const user = auth.user as { name?: string; role?: string };

    const newPost = {
      id: `post-${Date.now()}`,
      authorName: user.name || "Shabab Member",
      authorRole: user.role?.replace(/_/g, " ") || "Member",
      category: parsed.category,
      content: parsed.content,
      likes: 0,
      commentsCount: 0,
      tags: parsed.tags || ["#Shabab360"],
      createdAt: "Just now",
    };

    return NextResponse.json({ success: true, data: newPost }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
