import { NextResponse, type NextRequest } from "next/server";
import { putHandoffImage } from "@/lib/handoff";
import { sanitizePhotoDataUrl } from "@/lib/signature";

export const dynamic = "force-dynamic";

// Receives the photographed signature from the affiliate's phone. No rate-limit lookup here on
// purpose: the link token is random, single-use and short-lived, and the free plan has a tiny CPU budget.
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (Number(request.headers.get("content-length") || 0) > 120_000) return NextResponse.json({ error: "That image is too large." }, { status: 413 });
  let body: { png?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const b64 = sanitizePhotoDataUrl(body.png);
  if (!b64) return NextResponse.json({ error: "We could not read that image. Please retake it." }, { status: 400 });
  const result = await putHandoffImage(token, b64);
  if (result === "ok") return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "This link has expired or was already used. Go back to your computer and refresh the QR code." }, { status: 410 });
}
