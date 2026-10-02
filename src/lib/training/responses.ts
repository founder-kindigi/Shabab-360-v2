import { NextResponse } from "next/server";

export const privateHeaders = { "Cache-Control": "private, no-store" };
export const publicHeaders = { "Cache-Control": "public, max-age=30" };

export function trainingError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: privateHeaders });
}

export async function readBoundedJson(request: Request, maxBytes = 16 * 1024): Promise<unknown> {
  const size = Number(request.headers.get("content-length"));
  if (Number.isFinite(size) && size > maxBytes) throw new Error("Body too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new Error("Body too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
