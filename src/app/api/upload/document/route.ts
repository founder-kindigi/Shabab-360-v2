import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorize";
import { writeFile, mkdir, readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const ALLOWED_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface DocumentMeta {
  files: {
    name: string;
    originalName: string;
    url: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
  }[];
}

function readMeta(metaPath: string): DocumentMeta {
  if (existsSync(metaPath)) {
    try {
      return JSON.parse(readFileSync(metaPath, "utf-8"));
    } catch {
      // corrupted, start fresh
    }
  }
  return { files: [] };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function POST(request: NextRequest) {
  // Auth check
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const userId = authResult.user.id!;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const entityId = formData.get("entityId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG are allowed." },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const ext = ALLOWED_EXTENSIONS[file.type] || "bin";
    const timestamp = Date.now();
    const filename = `${entityId}-${timestamp}.${ext}`;

    // Ensure directory exists
    const uploadDir = join(process.cwd(), "public", "uploads", "documents", entityType);
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

    const url = `/uploads/documents/${entityType}/${filename}`;

    // Update metadata
    const metaPath = join(uploadDir, `${entityId}-meta.json`);
    const meta = readMeta(metaPath);
    meta.files.push({
      name: filename,
      originalName: file.name,
      url,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId,
    });

    await new Promise<void>((resolve, reject) => {
      writeFile(metaPath, JSON.stringify(meta, null, 2), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return NextResponse.json({
      url,
      name: file.name,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

// GET documents metadata for an entity
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  const metaPath = join(
    process.cwd(),
    "public",
    "uploads",
    "documents",
    entityType,
    `${entityId}-meta.json`
  );

  const meta = readMeta(metaPath);
  return NextResponse.json(meta);
}

// DELETE a document
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const userId = authResult.user.id!;

  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const fileName = searchParams.get("fileName");

    if (!entityType || !entityId || !fileName) {
      return NextResponse.json(
        { error: "entityType, entityId, and fileName are required" },
        { status: 400 }
      );
    }

    const dirPath = join(process.cwd(), "public", "uploads", "documents", entityType);
    const filePath = join(dirPath, fileName);
    const metaPath = join(dirPath, `${entityId}-meta.json`);

    // Remove the physical file
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    // Update metadata
    const meta = readMeta(metaPath);
    meta.files = meta.files.filter((f) => f.name !== fileName);

    await new Promise<void>((resolve, reject) => {
      writeFile(metaPath, JSON.stringify(meta, null, 2), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Document delete error:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}