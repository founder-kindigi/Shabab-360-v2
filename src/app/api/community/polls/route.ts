import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { z } from "zod";

const createPollSchema = z.object({
  title: z.string().min(3, "Title is required").max(300),
  description: z.string().optional(),
  type: z.enum(["quiz", "survey"]).default("quiz"),
  category: z.string().default("Weekly Quiz"),
  options: z.array(z.string().min(1)).min(2, "At least 2 options required"),
  correctOptionIndex: z.number().optional(),
});

const voteSchema = z.object({
  pollId: z.string(),
  optionId: z.string(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth || auth instanceof NextResponse) return auth as NextResponse;

  return NextResponse.json({
    success: true,
    data: [
      {
        id: "poll-1",
        title: "Weekly Tarbiyah Quiz: What is the primary focus of Shabab Leadership Ethics?",
        description: "Select the most accurate principle discussed in Week 3 Tadreeb session.",
        type: "quiz",
        authorName: "Hanzala Tauseef (Tadreeb Lead)",
        category: "Tarbiyah Quiz",
        expiresIn: "Ends in 2 days",
        totalVotes: 142,
        options: [
          { id: "opt-1", text: "Personal dominance and control", votes: 8, isCorrect: false },
          { id: "opt-2", text: "Servant leadership and humility", votes: 118, isCorrect: true },
          { id: "opt-3", text: "Individual competition above team", votes: 10, isCorrect: false },
          { id: "opt-4", text: "Task execution without consultation", votes: 6, isCorrect: false },
        ],
      },
    ],
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth || auth instanceof NextResponse) return auth as NextResponse;

  try {
    const body = await req.json();

    // Check if voting
    if (body.pollId && body.optionId) {
      const parsedVote = voteSchema.parse(body);
      return NextResponse.json({
        success: true,
        message: "Vote recorded",
        pollId: parsedVote.pollId,
        optionId: parsedVote.optionId,
      });
    }

    // Otherwise create poll
    const parsed = createPollSchema.parse(body);
    const user = auth.user as { name?: string };

    const newPoll = {
      id: `poll-${Date.now()}`,
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      authorName: user.name || "Murabbi Lead",
      category: parsed.category,
      expiresIn: "Ends in 7 days",
      totalVotes: 0,
      options: parsed.options.map((optText, idx) => ({
        id: `opt-${idx + 1}`,
        text: optText,
        votes: 0,
        isCorrect: parsed.type === "quiz" && parsed.correctOptionIndex === idx,
      })),
    };

    return NextResponse.json({ success: true, data: newPoll }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
