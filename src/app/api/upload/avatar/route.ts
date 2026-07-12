import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { writeFile, mkdir, readFileSync, existsSync } from "fs";
import { join } from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    default: return "jpg";
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const userId = authResult.user.id!;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    const ext = getExtension(file.type);
    const timestamp = Date.now();
    const filename = `${userId}-${timestamp}.${ext}`;

    // Ensure directory exists
    const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
    try {
      await new Promise<void>((resolve, reject) => {
        mkdir(uploadDir, { recursive: true }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch {
      // Directory already exists or created
    }

    // Save file
    const filePath = join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await new Promise<void>((resolve, reject) => {
      writeFile(filePath, buffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const url = `/uploads/avatars/${filename}`;

    // Store avatar path in JSON metadata
    const metaPath = join(uploadDir, `${userId}.json`);
    const meta = { path: url, updatedAt: new Date().toISOString() };
    await new Promise<void>((resolve, reject) => {
      writeFile(metaPath, JSON.stringify(meta, null, 2), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}

// GET avatar metadata for a user
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const userId = authResult.user.id!;
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId") || userId;

  const metaPath = join(process.cwd(), "public", "uploads", "avatars", `${targetUserId}.json`);

  if (!existsSync(metaPath)) {
    return NextResponse.json({ url: null });
  }

  try {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    return NextResponse.json(meta);
  } catch {
    return NextResponse.json({ url: null });
  }
}