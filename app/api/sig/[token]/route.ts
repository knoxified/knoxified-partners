import { NextResponse, type NextRequest } from "next/server";
import { putHandoffImage } from "@/lib/handoff";
import { sanitizePhotoDataUrl } from "@/lib/signature";
import { rateAllowed } from "@/lib/otp";

export const dynamic = "force-dynamic";

// Receives the photographed signature from the affiliate's phone.
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = request.headers.get("cf-connecting-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!(await rateAllowed(`sigup:ip:${ip}`, 30, 3600))) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  if (Number(request.headers.get("content-length") || 0) > 300_000) return NextResponse.json({ error: "That image is too large." }, { status: 413 });
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
